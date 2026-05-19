<?php
/**
 * MiniChat — Users / online presence + profil endpoint
 *
 * Actions:
 *   GET  ?action=online&room_id=<id>
 *        → { success: true,
 *            users:  [{id, username, is_online, is_self, last_seen, last_seen_ts}, ...],
 *            current_user_id: <int>,
 *            room: {id, name, is_private} }
 *
 *   GET  ?action=me  (US-008)
 *        → { success: true, user: {id, username, email, bio, avatar_url} }
 *
 *   POST ?action=update_profile  (US-008)
 *        body: {csrf_token, email, bio?, avatar_url?}
 *        → { success: true, message: "Profil frissítve!", user: {...} }
 *
 *   POST ?action=change_password  (US-008)
 *        body: {csrf_token, old_password, new_password, new_password_confirm}
 *        → { success: true, message: "Jelszó sikeresen módosítva!" }
 *
 *   GET  ?action=search&q=<min 2 chars>  (US-016)
 *        → { success: true, users: [{id, username}, ...] } — max 10 találat,
 *          a saját user kihagyva. Username LIKE '<q>%' ESCAPE '|' (prefix-keresés).
 *
 * Online = last_seen NEM NULL és NOW() - INTERVAL 45 SECOND-en belüli (LAST_SEEN_TIMEOUT_SEC).
 * A `messages.php?action=poll` minden 3 mp-es hívásánál frissíti a hívó user
 * `last_seen` mezőjét — így a kliens-oldali polling tartja életben az online jelzést.
 *
 * Rendezés: online első (utolsó látott szerint csökkenőben), offline második
 * (utolsó látott szerint csökkenőben, NULL last). Saját user `is_self:true`-val
 * jelölve — a kliens félkövér + "(Te)" tag-gel renderálja.
 *
 * Lobby (`name='Lobby'`) különleges: a teljes `users` táblát adja vissza,
 * nem csak a `room_members` rekordokat — így új-regisztrált, még chat-be nem
 * lépett user is megjelenik (offline-ként). Egyéb (publikus + privát) szobánál
 * csak a `room_members`-ben szereplő tagok jelennek meg.
 *
 * Hozzáférés: bejelentkezés szükséges (require_login). Privát szobához tagság.
 *
 * PHP 7.3 kompatibilis.
 */

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
    switch ($action) {
        case 'online':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_online();
            break;
        case 'me':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_me();
            break;
        case 'update_profile':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_update_profile();
            break;
        case 'change_password':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_change_password();
            break;
        case 'search':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_user_search();
            break;
        default:
            json_error('Ismeretlen vagy hiányzó action paraméter.', 400);
    }
} catch (Throwable $e) {
    json_error('Szerver hiba: ' . $e->getMessage(), 500);
}

// ---------------------------------------------------------------------------
// Online lista — szoba-specifikus (Lobby = mindenki, többi = room_members).
// ---------------------------------------------------------------------------
function handle_online() {
    require_login();
    $userId = current_user_id();

    $roomId = isset($_GET['room_id']) ? (int)$_GET['room_id'] : 0;
    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $pdo = db();

    // Szoba létezés + access check (azonos minta a messages.php-vel).
    $stmt = $pdo->prepare("SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1");
    $stmt->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $stmt->execute();
    $room = $stmt->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] === 1) {
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $check->bindValue(':uid', $userId, PDO::PARAM_INT);
        $check->execute();
        if (!$check->fetch()) {
            json_error('Nincs jogod ehhez a szobához.', 403);
        }
    }

    // Lobby-nál mindenki, egyéb szobánál csak a tagok. A 45 mp-es küszöböt a
    // LAST_SEEN_TIMEOUT_SEC konstans adja (config.php-ben).
    $isLobby = (strcasecmp((string)$room['name'], 'Lobby') === 0);

    if ($isLobby) {
        $sql = "SELECT u.id, u.username,
                       u.last_seen,
                       UNIX_TIMESTAMP(u.last_seen) AS last_seen_ts,
                       (u.last_seen IS NOT NULL AND u.last_seen >= (NOW() - INTERVAL :sec SECOND)) AS is_online
                FROM users u
                ORDER BY is_online DESC,
                         (u.last_seen IS NULL) ASC,
                         u.last_seen DESC,
                         u.username ASC";
        $st = $pdo->prepare($sql);
        $st->bindValue(':sec', LAST_SEEN_TIMEOUT_SEC, PDO::PARAM_INT);
        $st->execute();
    } else {
        $sql = "SELECT u.id, u.username,
                       u.last_seen,
                       UNIX_TIMESTAMP(u.last_seen) AS last_seen_ts,
                       (u.last_seen IS NOT NULL AND u.last_seen >= (NOW() - INTERVAL :sec SECOND)) AS is_online
                FROM users u
                JOIN room_members rm ON rm.user_id = u.id
                WHERE rm.room_id = :rid
                ORDER BY is_online DESC,
                         (u.last_seen IS NULL) ASC,
                         u.last_seen DESC,
                         u.username ASC";
        $st = $pdo->prepare($sql);
        $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $st->bindValue(':sec', LAST_SEEN_TIMEOUT_SEC, PDO::PARAM_INT);
        $st->execute();
    }

    $rows = $st->fetchAll();
    $users = array();
    foreach ($rows as $r) {
        $uid = (int)$r['id'];
        $users[] = array(
            'id'           => $uid,
            'username'     => (string)$r['username'],
            'is_online'    => ((int)$r['is_online'] === 1),
            'is_self'      => ($uid === $userId),
            'last_seen'    => isset($r['last_seen']) ? (string)$r['last_seen'] : '',
            'last_seen_ts' => isset($r['last_seen_ts']) ? (int)$r['last_seen_ts'] : 0,
        );
    }

    json_response(array(
        'success'         => true,
        'users'           => $users,
        'current_user_id' => $userId,
        'room'            => array(
            'id'         => (int)$room['id'],
            'name'       => (string)$room['name'],
            'is_private' => (int)$room['is_private'] === 1,
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-008: Saját profil lekérdezése (page load-on a profile.html hívja).
// ---------------------------------------------------------------------------
function handle_me() {
    require_login();
    $userId = current_user_id();

    $pdo  = db();
    $stmt = $pdo->prepare(
        "SELECT id, username, email, bio, avatar_url FROM users WHERE id = :uid LIMIT 1"
    );
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Felhasználó nem található.', 404);
    }

    json_response(array(
        'success' => true,
        'user'    => array(
            'id'         => (int)$row['id'],
            'username'   => (string)$row['username'],
            'email'      => (string)$row['email'],
            'bio'        => isset($row['bio'])        ? (string)$row['bio']        : '',
            'avatar_url' => isset($row['avatar_url']) ? (string)$row['avatar_url'] : '',
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-008: Profil mentése — email + bio + avatar_url. Username NEM módosítható.
// CSRF kötelező. Email uniqueness check (saját rekord kihagyva).
// ---------------------------------------------------------------------------
function handle_update_profile() {
    require_login();

    $body  = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }
    $token = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';
    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    $userId    = current_user_id();
    $email     = isset($body['email'])      ? trim((string)$body['email'])      : '';
    $bio       = isset($body['bio'])        ? trim((string)$body['bio'])        : '';
    $avatarUrl = isset($body['avatar_url']) ? trim((string)$body['avatar_url']) : '';

    // Email validáció
    if ($email === '') {
        json_error('Az email cím megadása kötelező.', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Érvénytelen email formátum.', 400);
    }
    if (strlen($email) > 100) {
        json_error('Az email legfeljebb 100 karakter lehet.', 400);
    }

    // Bio validáció — multi-byte safe (mb_strlen) a 200 karakter limithez.
    $bioLen = function_exists('mb_strlen') ? mb_strlen($bio, 'UTF-8') : strlen($bio);
    if ($bioLen > BIO_MAX_LENGTH) {
        json_error('A bemutatkozás legfeljebb ' . BIO_MAX_LENGTH . ' karakter lehet.', 400);
    }

    // Avatar URL validáció — opcionális; ha kitöltött, https:// kezdetű.
    if ($avatarUrl !== '') {
        if (strlen($avatarUrl) > 500) {
            json_error('Az avatar URL legfeljebb 500 karakter lehet.', 400);
        }
        if (stripos($avatarUrl, 'https://') !== 0) {
            json_error('Az avatar URL-nek https:// -vel kell kezdődnie.', 400);
        }
    }

    $pdo = db();

    // Email uniqueness — más user már használja-e? Saját rekordot kihagyjuk.
    $check = $pdo->prepare(
        "SELECT id FROM users WHERE email = :e AND id <> :uid LIMIT 1"
    );
    $check->bindValue(':e',   $email);
    $check->bindValue(':uid', $userId, PDO::PARAM_INT);
    $check->execute();
    if ($check->fetch()) {
        json_error('Ez az email cím már regisztrálva van más fiókhoz.', 409);
    }

    try {
        $upd = $pdo->prepare(
            "UPDATE users SET email = :e, bio = :b, avatar_url = :a WHERE id = :uid"
        );
        $upd->bindValue(':e', $email);
        $upd->bindValue(
            ':b',
            $bio === '' ? null : $bio,
            $bio === '' ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $upd->bindValue(
            ':a',
            $avatarUrl === '' ? null : $avatarUrl,
            $avatarUrl === '' ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $upd->bindValue(':uid', $userId, PDO::PARAM_INT);
        $upd->execute();
    } catch (PDOException $e) {
        // Race condition: két párhuzamos update ugyanazzal az email-lel.
        $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        if ($code === 1062) {
            json_error('Ez az email cím már regisztrálva van más fiókhoz.', 409);
        }
        throw $e;
    }

    $username = isset($_SESSION['username']) ? (string)$_SESSION['username'] : '';

    json_response(array(
        'success' => true,
        'message' => 'Profil frissítve!',
        'user'    => array(
            'id'         => $userId,
            'username'   => $username,
            'email'      => $email,
            'bio'        => $bio,
            'avatar_url' => $avatarUrl,
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-008: Jelszó módosítás — régi jelszó password_verify, új jelszó hash.
// CSRF kötelező. Hibás régi jelszóra 401.
// ---------------------------------------------------------------------------
function handle_change_password() {
    require_login();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }
    $token = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';
    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    $userId             = current_user_id();
    $oldPassword        = isset($body['old_password'])         ? (string)$body['old_password']         : '';
    $newPassword        = isset($body['new_password'])         ? (string)$body['new_password']         : '';
    $newPasswordConfirm = isset($body['new_password_confirm']) ? (string)$body['new_password_confirm'] : '';

    if ($oldPassword === '' || $newPassword === '' || $newPasswordConfirm === '') {
        json_error('Minden jelszó mező kitöltése kötelező.', 400);
    }
    if (strlen($newPassword) < 6) {
        json_error('Az új jelszó legalább 6 karakter legyen.', 400);
    }
    if ($newPassword !== $newPasswordConfirm) {
        json_error('A két új jelszó nem egyezik.', 400);
    }

    $pdo  = db();
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = :uid LIMIT 1");
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Felhasználó nem található.', 404);
    }

    if (!password_verify($oldPassword, (string)$row['password_hash'])) {
        json_error('A régi jelszó hibás.', 401);
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    if ($newHash === false) {
        json_error('Az új jelszó tárolása sikertelen.', 500);
    }

    $upd = $pdo->prepare("UPDATE users SET password_hash = :h WHERE id = :uid");
    $upd->bindValue(':h',   $newHash);
    $upd->bindValue(':uid', $userId, PDO::PARAM_INT);
    $upd->execute();

    json_response(array(
        'success' => true,
        'message' => 'Jelszó sikeresen módosítva!',
    ));
}

// ---------------------------------------------------------------------------
// US-016: Felhasználó kereső autocomplete-hez. Prefix-LIKE 2+ karakteren.
// A saját user kihagyva (önmagát nem hívhatja meg). Max 10 találat, ABC-rendben.
// SQL injection ellen: prepared statement + LIKE wildcards (%, _) escape '|'-vel
// (azonos minta a messages.php?action=search-csel).
// ---------------------------------------------------------------------------
function handle_user_search() {
    require_login();
    $userId = current_user_id();

    $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
    $qLen = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);
    if ($qLen < 2) {
        json_error('A keresőszó legalább 2 karakter legyen.', 400);
    }
    if ($qLen > 50) {
        json_error('A keresőszó legfeljebb 50 karakter lehet.', 400);
    }

    // Wildcard escape: |, %, _ — sorrend FONTOS, a | először (különben az utána
    // beillesztett |%-eket újra escape-elnénk). Prefix match: 'q%'.
    $escaped = str_replace(array('|', '%', '_'), array('||', '|%', '|_'), $q);
    $like    = $escaped . '%';

    $pdo = db();
    $st  = $pdo->prepare(
        "SELECT id, username
         FROM users
         WHERE username LIKE :q ESCAPE '|' AND id <> :uid
         ORDER BY username ASC
         LIMIT 10"
    );
    $st->bindValue(':q',   $like, PDO::PARAM_STR);
    $st->bindValue(':uid', $userId, PDO::PARAM_INT);
    $st->execute();
    $rows = $st->fetchAll();

    $users = array();
    foreach ($rows as $r) {
        $users[] = array(
            'id'       => (int)$r['id'],
            'username' => (string)$r['username'],
        );
    }

    json_response(array(
        'success' => true,
        'users'   => $users,
    ));
}
