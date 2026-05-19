<?php
/**
 * MiniChat — Authentication endpoint
 *
 * Actions:
 *   GET  ?action=csrf_token  → { success: true, token: "..." }
 *   GET  ?action=session     → { success: true, logged_in: bool, user: {id, username} | null }
 *   POST ?action=register    → { success: true, user: {id, username}, redirect: "chat.html" }
 *   POST ?action=login       → { success: true, user: {id, username}, redirect: "chat.html" }
 *   POST ?action=logout      → { success: true, redirect: "index.html" }
 *
 * PHP 7.3 kompatibilis. JSON request body-t vár (Content-Type: application/json).
 */

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
    switch ($action) {
        case 'csrf_token':
            handle_csrf_token();
            break;
        case 'session':
            handle_session();
            break;
        case 'register':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_register();
            break;
        case 'login':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_login();
            break;
        case 'logout':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_logout();
            break;
        default:
            json_error('Ismeretlen vagy hiányzó action paraméter.', 400);
    }
} catch (Throwable $e) {
    json_error('Szerver hiba: ' . $e->getMessage(), 500);
}

// ---------------------------------------------------------------------------
// CSRF token kiadása — a kliens regisztráció előtt ezt kéri le.
// ---------------------------------------------------------------------------
function handle_csrf_token() {
    json_response(array(
        'success' => true,
        'token'   => csrf_token(),
    ));
}

// ---------------------------------------------------------------------------
// Regisztráció: validáció → uniqueness check → INSERT → auto session login.
// ---------------------------------------------------------------------------
function handle_register() {
    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        // Fallback: form-encoded body (a kliens JSON-t küld, de védelemből kezeljük).
        $body = $_POST;
    }

    $username        = isset($body['username'])         ? trim((string)$body['username'])         : '';
    $email           = isset($body['email'])            ? trim((string)$body['email'])            : '';
    $password        = isset($body['password'])         ? (string)$body['password']               : '';
    $passwordConfirm = isset($body['password_confirm']) ? (string)$body['password_confirm']       : '';
    $token           = isset($body['csrf_token'])       ? (string)$body['csrf_token']             : '';

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    if ($username === '' || $email === '' || $password === '' || $passwordConfirm === '') {
        json_error('Minden mező kitöltése kötelező.', 400);
    }

    $usernameLen = function_exists('mb_strlen') ? mb_strlen($username, 'UTF-8') : strlen($username);
    if ($usernameLen < USERNAME_MIN_LENGTH) {
        json_error('A felhasználónév legalább ' . USERNAME_MIN_LENGTH . ' karakter legyen.', 400);
    }
    if ($usernameLen > USERNAME_MAX_LENGTH) {
        json_error('A felhasználónév legfeljebb ' . USERNAME_MAX_LENGTH . ' karakter lehet.', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Érvénytelen email formátum.', 400);
    }
    if (strlen($email) > 100) {
        json_error('Az email legfeljebb 100 karakter lehet.', 400);
    }

    if (strlen($password) < 6) {
        json_error('A jelszó legalább 6 karakter legyen.', 400);
    }

    if ($password !== $passwordConfirm) {
        json_error('A két jelszó nem egyezik.', 400);
    }

    $pdo = db();

    // Uniqueness — egy lekérdezés mindkét oszlopra; case-insensitive üzenet.
    $stmt = $pdo->prepare(
        "SELECT id, username, email FROM users
         WHERE username = :u OR email = :e
         LIMIT 1"
    );
    $stmt->execute(array(':u' => $username, ':e' => $email));
    $existing = $stmt->fetch();
    if ($existing) {
        if (strcasecmp($existing['username'], $username) === 0) {
            json_error('Ez a felhasználónév már foglalt.', 409);
        }
        if (strcasecmp($existing['email'], $email) === 0) {
            json_error('Ez az email cím már regisztrálva van.', 409);
        }
        // Elvileg ide nem juthatunk (MySQL collation eltérés esetén ide eshet).
        json_error('Ez a felhasználónév vagy email már foglalt.', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if ($hash === false) {
        json_error('A jelszó tárolása sikertelen.', 500);
    }

    try {
        $ins = $pdo->prepare(
            "INSERT INTO users (username, email, password_hash, last_seen)
             VALUES (:u, :e, :h, NOW())"
        );
        $ins->execute(array(':u' => $username, ':e' => $email, ':h' => $hash));
    } catch (PDOException $e) {
        // Race condition: két párhuzamos regisztráció ugyanazzal a usernév/emaillel.
        // MySQL duplicate key error code: 1062.
        $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        if ($code === 1062) {
            json_error('Ez a felhasználónév vagy email már foglalt.', 409);
        }
        throw $e;
    }
    $userId = (int)$pdo->lastInsertId();

    // Auto login: session fixation védelem + user_id beírás.
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
    $_SESSION['user_id']  = $userId;
    $_SESSION['username'] = $username;

    json_response(array(
        'success'  => true,
        'user'     => array(
            'id'       => $userId,
            'username' => $username,
        ),
        'redirect' => 'chat.html',
    ), 200);
}

// ---------------------------------------------------------------------------
// Bejelentkezés: CSRF → email/jelszó ellenőrzés → session regenerate → last_seen.
// ---------------------------------------------------------------------------
function handle_login() {
    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $email    = isset($body['email'])      ? trim((string)$body['email']) : '';
    $password = isset($body['password'])   ? (string)$body['password']    : '';
    $token    = isset($body['csrf_token']) ? (string)$body['csrf_token']  : '';

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    if ($email === '' || $password === '') {
        // Egységes hibaüzenet — nem áruljuk el, melyik mező hibás.
        json_error('Hibás email vagy jelszó.', 401);
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        "SELECT id, username, password_hash FROM users WHERE email = :e LIMIT 1"
    );
    $stmt->execute(array(':e' => $email));
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, (string)$row['password_hash'])) {
        // Ugyanaz az üzenet hibás email és hibás jelszó esetén — user enumeration védelem.
        json_error('Hibás email vagy jelszó.', 401);
    }

    $userId   = (int)$row['id'];
    $username = (string)$row['username'];

    // Ha a PHP defaultja időközben erősebb hash-re vált, transzparensen frissítjük.
    if (password_needs_rehash((string)$row['password_hash'], PASSWORD_DEFAULT)) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        if ($newHash !== false) {
            $upd = $pdo->prepare("UPDATE users SET password_hash = :h WHERE id = :i");
            $upd->execute(array(':h' => $newHash, ':i' => $userId));
        }
    }

    // last_seen frissítés — online jelzéshez (US-007).
    $upd = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = :i");
    $upd->execute(array(':i' => $userId));

    // Session fixation védelem — új session id minden auth state változáskor.
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
    $_SESSION['user_id']  = $userId;
    $_SESSION['username'] = $username;

    json_response(array(
        'success'  => true,
        'user'     => array(
            'id'       => $userId,
            'username' => $username,
        ),
        'redirect' => 'chat.html',
    ), 200);
}

// ---------------------------------------------------------------------------
// Kijelentkezés: CSRF → last_seen offline múltba → session destroy + cookie clear.
// ---------------------------------------------------------------------------
function handle_logout() {
    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }
    $token = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    $userId = current_user_id();
    if ($userId > 0) {
        // last_seen-t múltba állítjuk → azonnal offline-ként látszódjon a többi felhasználónak.
        try {
            $pdo = db();
            $upd = $pdo->prepare(
                "UPDATE users SET last_seen = (NOW() - INTERVAL 60 SECOND) WHERE id = :i"
            );
            $upd->execute(array(':i' => $userId));
        } catch (Throwable $e) {
            // A logout nem fog hibára futni, ha a last_seen frissítés sikertelen.
        }
    }

    // Session bontás: $_SESSION ürítés + cookie lejáratása + session_destroy.
    $_SESSION = array();
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            isset($params['path'])     ? $params['path']     : '/',
            isset($params['domain'])   ? $params['domain']   : '',
            !empty($params['secure']),
            !empty($params['httponly'])
        );
    }
    @session_destroy();

    json_response(array(
        'success'  => true,
        'redirect' => 'index.html',
    ), 200);
}

// ---------------------------------------------------------------------------
// Session lekérdezés — chat.html és minden auth-protected oldal page load-kor hívja.
// Sosem 401-et ad, hanem logged_in:false-t — a kliens dönti el, mit csinál.
// ---------------------------------------------------------------------------
function handle_session() {
    $userId = current_user_id();
    if ($userId <= 0) {
        json_response(array(
            'success'   => true,
            'logged_in' => false,
            'user'      => null,
        ));
    }
    $username = isset($_SESSION['username']) ? (string)$_SESSION['username'] : '';
    json_response(array(
        'success'   => true,
        'logged_in' => true,
        'user'      => array(
            'id'       => $userId,
            'username' => $username,
        ),
    ));
}
