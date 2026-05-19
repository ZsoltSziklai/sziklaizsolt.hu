<?php
/**
 * MiniChat — közös konfiguráció
 *
 * Tartalmazza a DB connection adatokat, a PDO példány factory-t,
 * a session indítást, közös JSON helper-eket és az ADMIN_SECRET-et.
 *
 * PHP 7.3 kompatibilis. Minden API végpont ezt include-olja.
 */

// ---- DB connection adatok (sziklaizsolt.hu / cPanel MySQL) -----------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'sziklaiz_minichatprod');
define('DB_USER', 'sziklaiz_mcprod');
define('DB_PASS', '1U8qyapjdWYyxp8zEYXe');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

// ---- Admin secret a init_db.php?reset=1 endpointhoz -----------------------
// Hardcoded — csak DB resetet tesz lehetővé, nincs hitelesítés megkerülés.
define('ADMIN_SECRET', 'advc-test-reset-2026');

// ---- Üzleti konstansok (US-007 időzítés, US-008 rate limit) ---------------
define('LAST_SEEN_TIMEOUT_SEC', 45);
define('MESSAGE_RATE_LIMIT_PER_MINUTE', 30);
define('MESSAGE_MAX_LENGTH', 1000);
define('USERNAME_MIN_LENGTH', 3);
define('USERNAME_MAX_LENGTH', 50);
define('ROOM_NAME_MIN_LENGTH', 2);
define('ROOM_NAME_MAX_LENGTH', 30);
define('BIO_MAX_LENGTH', 200);
// US-014: gépelés jelző inaktivitás-küszöb. Ha typing_at ennél régebbi, NEM gépel.
define('TYPING_TIMEOUT_SEC', 3);

// ---------------------------------------------------------------------------
// PDO példány — singleton-szerű, lazy. Hibánál JSON-t küld és kilép.
// ---------------------------------------------------------------------------
function db() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $dsn = 'mysql:host=' . DB_HOST
        . ';port=' . DB_PORT
        . ';dbname=' . DB_NAME
        . ';charset=' . DB_CHARSET;
    $opts = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
        $pdo->exec("SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci");
    } catch (PDOException $e) {
        json_error('DB connection failed: ' . $e->getMessage(), 500);
    }
    return $pdo;
}

// ---------------------------------------------------------------------------
// JSON helper-ek
// ---------------------------------------------------------------------------
function json_response($data, $status = 200) {
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error($message, $status = 400, $extra = array()) {
    $body = array('success' => false, 'error' => $message);
    if (!empty($extra)) {
        $body = array_merge($body, $extra);
    }
    json_response($body, $status);
}

function json_success($extra = array()) {
    $body = array('success' => true);
    if (!empty($extra)) {
        $body = array_merge($body, $extra);
    }
    json_response($body, 200);
}

// ---------------------------------------------------------------------------
// Session bootstrap — a config.php include-olásakor automatikusan fut.
// HTTP-only cookie, samesite=Lax. Az init_db.php-nak nem kell session,
// de ártani sem árt — egyetlen pontból kezeljük.
// ---------------------------------------------------------------------------
function start_session_if_needed() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    // US-015: explicit ini-szintű hardening a session_set_cookie_params elé.
    // - cookie_httponly: a session cookie-t JS-ből ne lehessen olvasni (XSS védelem).
    // - use_only_cookies: SOSE fogadjunk session id-t URL-ből (?PHPSESSID=...).
    // - use_strict_mode: csak szerver által generált session id-t fogadunk el
    //   (session fixation ellen kiegészítés a session_regenerate_id mellé — egy
    //   böngészőből pre-set-elt random cookie-t a PHP eldob és új id-t generál).
    @ini_set('session.cookie_httponly',  '1');
    @ini_set('session.use_only_cookies', '1');
    @ini_set('session.use_strict_mode',  '1');
    if (!empty($_SERVER['HTTPS'])) {
        @ini_set('session.cookie_secure', '1');
    }
    $params = array(
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,
    );
    if (PHP_VERSION_ID >= 70300) {
        $params['samesite'] = 'Lax';
        session_set_cookie_params($params);
    } else {
        session_set_cookie_params(
            $params['lifetime'],
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_name('MINICHAT_SESS');
    @session_start();
}

// ---------------------------------------------------------------------------
// CSRF helper-ek (auth.php és minden POST endpoint használja)
// ---------------------------------------------------------------------------
function csrf_token() {
    start_session_if_needed();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_verify($token) {
    start_session_if_needed();
    if (empty($_SESSION['csrf_token']) || !is_string($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

// ---------------------------------------------------------------------------
// Kis kényelmi util-ok
// ---------------------------------------------------------------------------
function current_user_id() {
    start_session_if_needed();
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
}

function require_login() {
    if (current_user_id() <= 0) {
        json_error('Bejelentkezés szükséges', 401);
    }
}

function read_json_body() {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return array();
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

// Default headers minden API válaszhoz
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// Session induljon el azonnal — az auth.php és társai erre számítanak.
start_session_if_needed();
