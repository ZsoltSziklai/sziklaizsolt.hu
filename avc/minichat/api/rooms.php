<?php
/**
 * MiniChat — Rooms endpoint
 *
 * Actions:
 *   GET  ?action=list
 *        → { success: true,
 *            rooms:    [{id, name, description, is_private, member_count, unread_count}, ...],
 *            dm_rooms: [{id, name, description, is_private, member_count, unread_count,
 *                        is_dm:true, peer:{id, username}}, ...] }
 *   POST ?action=create   (JSON body: { csrf_token, name, description?, is_private? })
 *        → { success: true, room: {id, name, description, is_private, member_count: 1} }
 *   POST ?action=join     (JSON body: { csrf_token, room_id })
 *        → { success: true, room: {id, name, description, is_private, member_count} }
 *   POST ?action=start_dm (JSON body: { csrf_token, peer_id })  US-009
 *        → { success: true, room: {id, name, is_private:true, is_dm:true,
 *                                  peer:{id, username}, member_count:2} }
 *   GET  ?action=members&room_id=X   US-016
 *        → { success: true, room: {id, name, is_private}, users: [{id, username}, ...] }
 *   POST ?action=invite              US-016 (JSON body: { csrf_token, room_id,
 *                                                        invited_user_id|invited_username })
 *        → { success: true, room: {...}, invited: {id, username} }
 *
 * Hozzáférés: bejelentkezés szükséges. A list publikus szobákat ad vissza
 * mindenkinek, privát szobákat csak a tagjainak. DM szobák (`name LIKE 'dm\_%'`)
 * külön `dm_rooms` listában — peer info-val (a másik felhasználó user-objektuma)
 * és unread_count-tal (room_members.last_read_message_id alapján).
 *
 * PHP 7.3 kompatibilis.
 */

require_once __DIR__ . '/config.php';

// Szoba leírás max — `description TEXT NULL` a sémában, de UX-szempontból
// rövidebbet kérünk (űrlap textarea + listán esetleges előnézet).
if (!defined('ROOM_DESCRIPTION_MAX_LENGTH')) {
    define('ROOM_DESCRIPTION_MAX_LENGTH', 200);
}

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
    switch ($action) {
        case 'list':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_list();
            break;
        case 'create':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_create();
            break;
        case 'join':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_join();
            break;
        case 'start_dm':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_start_dm();
            break;
        case 'members':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_members();
            break;
        case 'invite':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_invite();
            break;
        default:
            json_error('Ismeretlen vagy hiányzó action paraméter.', 400);
    }
} catch (Throwable $e) {
    json_error('Szerver hiba: ' . $e->getMessage(), 500);
}

// ---------------------------------------------------------------------------
// Szobalista — publikus szobák mindenkinek + privát szobák a tagjainak.
// US-009: minden szobához unread_count (room_members.last_read_message_id alapján,
// csak mások által küldött üzenetekből), DM szobákhoz peer info (másik fél).
// ---------------------------------------------------------------------------
function handle_list() {
    require_login();
    $userId = current_user_id();
    $pdo = db();

    // Lobby legyen mindig az első, utána ABC sorrendben a többi.
    // Unread_count: ha a user nem tag a szobában (publikus szoba, amelyhez még
    // nem joinolt), 0-t adunk vissza — különben a teljes szoba-history "unread"-ként
    // mutatkozna addig, amíg auto-join meg nem történik. Tag user-eknél a saját
    // last_read_message_id-jét használjuk; kisebb-és-egyenlő üzeneteket szűrjük.
    $sql = "SELECT r.id, r.name, r.description, r.is_private,
                   (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) AS member_count,
                   COALESCE(my_rm.last_read_message_id, 0) AS my_last_read,
                   CASE WHEN my_rm.user_id IS NULL THEN 0 ELSE
                        (SELECT COUNT(*) FROM messages m
                         WHERE m.room_id = r.id
                           AND m.user_id <> :uid_unread
                           AND m.id > my_rm.last_read_message_id)
                   END AS unread_count
            FROM rooms r
            LEFT JOIN room_members my_rm
              ON my_rm.room_id = r.id AND my_rm.user_id = :uid_join
            WHERE r.is_private = 0
               OR r.id IN (SELECT rm2.room_id FROM room_members rm2 WHERE rm2.user_id = :uid_member)
            ORDER BY (r.name = 'Lobby') DESC, r.name ASC";
    $st = $pdo->prepare($sql);
    $st->bindValue(':uid_unread', $userId, PDO::PARAM_INT);
    $st->bindValue(':uid_join',   $userId, PDO::PARAM_INT);
    $st->bindValue(':uid_member', $userId, PDO::PARAM_INT);
    $st->execute();
    $rows = $st->fetchAll();

    // DM szobák peer-jeit egyetlen tömeges lekérdezéssel oldjuk fel — minden
    // DM-hez a 'dm_<a>_<b>' nevet parsoljuk és a nem-saját id-t keressük ki.
    $peerIds = array();
    foreach ($rows as $r) {
        if ((int)$r['is_private'] !== 1) { continue; }
        $name = (string)$r['name'];
        if (strpos($name, 'dm_') !== 0) { continue; }
        $parts = explode('_', $name);
        if (count($parts) !== 3) { continue; }
        $a = (int)$parts[1];
        $b = (int)$parts[2];
        $pid = ($a === $userId) ? $b : (($b === $userId) ? $a : 0);
        if ($pid > 0) { $peerIds[$pid] = true; }
    }
    $peerMap = array();
    if (!empty($peerIds)) {
        $idsList      = array_keys($peerIds);
        $placeholders = implode(',', array_fill(0, count($idsList), '?'));
        $stp = $pdo->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
        $stp->execute($idsList);
        foreach ($stp->fetchAll() as $u) {
            $peerMap[(int)$u['id']] = (string)$u['username'];
        }
    }

    $rooms = array();
    $dms   = array();
    foreach ($rows as $r) {
        $isDm = ((int)$r['is_private'] === 1 && strpos((string)$r['name'], 'dm_') === 0);
        $entry = array(
            'id'           => (int)$r['id'],
            'name'         => (string)$r['name'],
            'description'  => isset($r['description']) ? (string)$r['description'] : '',
            'is_private'   => (int)$r['is_private'] === 1,
            'member_count' => (int)$r['member_count'],
            'unread_count' => (int)$r['unread_count'],
        );
        if ($isDm) {
            $parts  = explode('_', (string)$r['name']);
            $peerId = 0;
            if (count($parts) === 3) {
                $a = (int)$parts[1];
                $b = (int)$parts[2];
                $peerId = ($a === $userId) ? $b : (($b === $userId) ? $a : 0);
            }
            $entry['is_dm'] = true;
            $entry['peer']  = array(
                'id'       => $peerId,
                'username' => isset($peerMap[$peerId]) ? $peerMap[$peerId] : '',
            );
            $dms[] = $entry;
        } else {
            $rooms[] = $entry;
        }
    }

    json_response(array(
        'success'  => true,
        'rooms'    => $rooms,
        'dm_rooms' => $dms,
    ));
}

// ---------------------------------------------------------------------------
// Szoba létrehozás — name (kötelező, 2..30), description (opcionális, max 200),
// is_private (boolean). A létrehozó automatikusan tag (room_members).
// ---------------------------------------------------------------------------
function handle_create() {
    require_login();
    $userId = current_user_id();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $token       = isset($body['csrf_token'])  ? (string)$body['csrf_token']  : '';
    $rawName     = isset($body['name'])        ? (string)$body['name']        : '';
    $rawDesc     = isset($body['description']) ? (string)$body['description'] : '';
    $isPrivate   = !empty($body['is_private']) ? 1 : 0;

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    $name = trim($rawName);
    $desc = trim($rawDesc);

    $nameLen = function_exists('mb_strlen')
        ? mb_strlen($name, 'UTF-8')
        : strlen($name);
    if ($nameLen < ROOM_NAME_MIN_LENGTH || $nameLen > ROOM_NAME_MAX_LENGTH) {
        json_error('A szoba neve ' . ROOM_NAME_MIN_LENGTH . '–' . ROOM_NAME_MAX_LENGTH . ' karakter lehet.', 400);
    }

    // Foglalt nevek: 'Lobby' (csak az init_db hozza létre) és 'dm_' prefix (US-009 DM szobáknak).
    if (strcasecmp($name, 'Lobby') === 0) {
        json_error('A „Lobby" név foglalt.', 409);
    }
    if (stripos($name, 'dm_') === 0) {
        json_error('A „dm_" prefix foglalt a privát üzenetekhez.', 400);
    }

    $descLen = function_exists('mb_strlen')
        ? mb_strlen($desc, 'UTF-8')
        : strlen($desc);
    if ($descLen > ROOM_DESCRIPTION_MAX_LENGTH) {
        json_error('A leírás legfeljebb ' . ROOM_DESCRIPTION_MAX_LENGTH . ' karakter lehet.', 400);
    }

    $pdo = db();

    // Pre-check: usernév-uniqueness mintával — pontos hibaüzenet egy SELECT-ből.
    $st = $pdo->prepare("SELECT id FROM rooms WHERE name = :name LIMIT 1");
    $st->execute(array(':name' => $name));
    if ($st->fetch()) {
        json_error('Ezzel a névvel már létezik szoba.', 409);
    }

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare(
            "INSERT INTO rooms (name, description, created_by, is_private)
             VALUES (:name, :desc, :uid, :priv)"
        );
        $ins->bindValue(':name', $name,                     PDO::PARAM_STR);
        $ins->bindValue(':desc', $desc === '' ? null : $desc, $desc === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $ins->bindValue(':uid',  $userId,                   PDO::PARAM_INT);
        $ins->bindValue(':priv', $isPrivate,                PDO::PARAM_INT);
        $ins->execute();
        $roomId = (int)$pdo->lastInsertId();

        // A létrehozó azonnal tag — privát szobánál ez kötelező a hozzáféréshez,
        // publikusnál a member_count badge accuracy miatt.
        $mem = $pdo->prepare(
            "INSERT INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
        );
        $mem->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $mem->bindValue(':uid', $userId, PDO::PARAM_INT);
        $mem->execute();

        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        // Race-condition: két concurrent INSERT azonos névvel — UNIQUE constraint dobja az 1062-t.
        $info = $e->errorInfo;
        if (isset($info[1]) && (int)$info[1] === 1062) {
            json_error('Ezzel a névvel már létezik szoba.', 409);
        }
        throw $e;
    }

    json_response(array(
        'success' => true,
        'room'    => array(
            'id'           => $roomId,
            'name'         => $name,
            'description'  => $desc,
            'is_private'   => $isPrivate === 1,
            'member_count' => 1,
        ),
    ));
}

// ---------------------------------------------------------------------------
// Auto-csatlakozás publikus szobához — a kliens a kattintáskor hívja, hogy a
// `room_members` tükrözze a "ki látogatta már a szobát" számlálót. Privát
// szobához ez az endpoint NEM ad jogosultságot — meghívás US-016 hatóköre.
// Idempotens: már-tagra `INSERT IGNORE` no-op, válasz mindkét esetben sikeres.
// ---------------------------------------------------------------------------
function handle_join() {
    require_login();
    $userId = current_user_id();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $token  = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';
    $roomId = isset($body['room_id'])    ? (int)$body['room_id']       : 0;

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }
    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $pdo = db();

    $st = $pdo->prepare(
        "SELECT id, name, description, is_private FROM rooms WHERE id = :rid LIMIT 1"
    );
    $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $st->execute();
    $room = $st->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }

    // US-009: DM szobához harmadik személyt nem lehet meghívni / nem lehet
    // közönségesen csatlakozni. A 2 résztvevő a `start_dm` action-ben kerül be.
    if (strpos((string)$room['name'], 'dm_') === 0) {
        json_error('A privát üzenet szobához nem lehet csatlakozni — csak a 2 résztvevőé.', 403);
    }

    if ((int)$room['is_private'] === 1) {
        // Már tag-e? Ha nem, NEM joinolunk auto-magától privát szobához.
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $check->bindValue(':uid', $userId, PDO::PARAM_INT);
        $check->execute();
        if (!$check->fetch()) {
            json_error('A privát szobához meghívás szükséges.', 403);
        }
    } else {
        // Publikus szoba — INSERT IGNORE: idempotens, már-tagra no-op.
        $ins = $pdo->prepare(
            "INSERT IGNORE INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
        );
        $ins->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $ins->bindValue(':uid', $userId, PDO::PARAM_INT);
        $ins->execute();
    }

    // Friss member_count visszaadása.
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM room_members WHERE room_id = :rid");
    $cnt->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $cnt->execute();
    $memberCount = (int)$cnt->fetchColumn();

    json_response(array(
        'success' => true,
        'room'    => array(
            'id'           => (int)$room['id'],
            'name'         => (string)$room['name'],
            'description'  => isset($room['description']) ? (string)$room['description'] : '',
            'is_private'   => (int)$room['is_private'] === 1,
            'member_count' => $memberCount,
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-009: DM (privát üzenet) szoba indítása — két felhasználó között.
// Idempotens: ha a szoba már létezik (kanonikus 'dm_<smaller>_<larger>' név
// alapján), a meglévőt adja vissza. Különben létrehoz egyet és mindkét usert
// felveszi `room_members`-be. Harmadik fél NEM hívható meg (a szobához csak
// `start_dm` adhat tagot, a `join` action explicit blokkolja a `dm_*` szobákat).
// ---------------------------------------------------------------------------
function handle_start_dm() {
    require_login();
    $userId = current_user_id();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $token  = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';
    $peerId = isset($body['peer_id'])    ? (int)$body['peer_id']       : 0;

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }
    if ($peerId <= 0) {
        json_error('Érvénytelen vagy hiányzó peer_id.', 400);
    }
    if ($peerId === $userId) {
        json_error('Saját magaddal nem indíthatsz privát üzenetet.', 400);
    }

    $pdo = db();

    // Peer létezés-ellenőrzés.
    $st = $pdo->prepare("SELECT id, username FROM users WHERE id = :pid LIMIT 1");
    $st->bindValue(':pid', $peerId, PDO::PARAM_INT);
    $st->execute();
    $peer = $st->fetch();
    if (!$peer) {
        json_error('A megadott felhasználó nem létezik.', 404);
    }

    // Kanonikus DM név: kisebb id előre — így mindkét fél ugyanazt a szobanevet
    // generálja, a UNIQUE constraint pedig megakadályozza a duplikátumot.
    $a = min($userId, $peerId);
    $b = max($userId, $peerId);
    $dmName = 'dm_' . $a . '_' . $b;

    // Létezik-e már a szoba?
    $st = $pdo->prepare(
        "SELECT id, name, description, is_private FROM rooms WHERE name = :n LIMIT 1"
    );
    $st->bindValue(':n', $dmName);
    $st->execute();
    $room = $st->fetch();

    if (!$room) {
        try {
            $pdo->beginTransaction();

            $ins = $pdo->prepare(
                "INSERT INTO rooms (name, description, created_by, is_private)
                 VALUES (:n, NULL, :uid, 1)"
            );
            $ins->bindValue(':n',   $dmName);
            $ins->bindValue(':uid', $userId, PDO::PARAM_INT);
            $ins->execute();
            $roomId = (int)$pdo->lastInsertId();

            // Mindkét felhasználó tag — a privát hozzáférés-checkelés ezen alapul.
            $mem = $pdo->prepare(
                "INSERT INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
            );
            $mem->bindValue(':rid', $roomId, PDO::PARAM_INT);
            $mem->bindValue(':uid', $userId, PDO::PARAM_INT);
            $mem->execute();

            $mem2 = $pdo->prepare(
                "INSERT INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
            );
            $mem2->bindValue(':rid', $roomId, PDO::PARAM_INT);
            $mem2->bindValue(':uid', $peerId, PDO::PARAM_INT);
            $mem2->execute();

            $pdo->commit();
            $room = array(
                'id'          => $roomId,
                'name'        => $dmName,
                'description' => null,
                'is_private'  => 1,
            );
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            // Race-condition: két concurrent start_dm ugyanazon dm_<a>_<b>-re —
            // UNIQUE rooms.name 1062 → re-fetch a meglévőt.
            $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
            if ($code === 1062) {
                $st = $pdo->prepare(
                    "SELECT id, name, description, is_private FROM rooms WHERE name = :n LIMIT 1"
                );
                $st->bindValue(':n', $dmName);
                $st->execute();
                $room = $st->fetch();
                if (!$room) { throw $e; }
            } else {
                throw $e;
            }
        }
    } else {
        // A szoba létezik — defenzíven biztosítsuk, hogy mindkét fél tag legyen
        // (idempotens INSERT IGNORE; normálisan már mindketten benne vannak).
        $rid = (int)$room['id'];
        $ins = $pdo->prepare(
            "INSERT IGNORE INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
        );
        $ins->bindValue(':rid', $rid, PDO::PARAM_INT);
        $ins->bindValue(':uid', $userId, PDO::PARAM_INT);
        $ins->execute();

        $ins2 = $pdo->prepare(
            "INSERT IGNORE INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
        );
        $ins2->bindValue(':rid', $rid, PDO::PARAM_INT);
        $ins2->bindValue(':uid', $peerId, PDO::PARAM_INT);
        $ins2->execute();
    }

    json_response(array(
        'success' => true,
        'room'    => array(
            'id'           => (int)$room['id'],
            'name'         => (string)$room['name'],
            'description'  => '',
            'is_private'   => true,
            'is_dm'        => true,
            'member_count' => 2,
            'peer'         => array(
                'id'       => (int)$peer['id'],
                'username' => (string)$peer['username'],
            ),
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-016: Szoba tagjainak lekérdezése — a meghívó modal "már tag" listájához.
// Csak a szoba tagjai kérdezhetik le (a privát szoba tagjainak listája magán-
// információ; a publikus szobánál is konzisztens a viselkedés). DM szobákhoz
// nincs értelme (mindig 2 fős, NEM bővíthető) — a kliens nem hívja, de a
// server is védekezik.
// ---------------------------------------------------------------------------
function handle_members() {
    require_login();
    $userId = current_user_id();

    $roomId = isset($_GET['room_id']) ? (int)$_GET['room_id'] : 0;
    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $pdo = db();

    $st = $pdo->prepare(
        "SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1"
    );
    $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $st->execute();
    $room = $st->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }

    // A hívó legyen tag a szobában (privát szobánál hozzáférés-védelem; publikus
    // szobánál is — egységes szemantika a tag-listához). Ha nem tag, 403.
    $check = $pdo->prepare(
        "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
    );
    $check->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $check->bindValue(':uid', $userId, PDO::PARAM_INT);
    $check->execute();
    if (!$check->fetch()) {
        json_error('Nincs jogod a szoba tagjainak lekérdezéséhez.', 403);
    }

    // Tagok ABC-rendben — a meghívó UI a "már tag" listát ezzel rendezi.
    $st = $pdo->prepare(
        "SELECT u.id, u.username
         FROM room_members rm
         JOIN users u ON u.id = rm.user_id
         WHERE rm.room_id = :rid
         ORDER BY u.username ASC"
    );
    $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
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
        'room'    => array(
            'id'         => (int)$room['id'],
            'name'       => (string)$room['name'],
            'is_private' => (int)$room['is_private'] === 1,
        ),
        'users'   => $users,
    ));
}

// ---------------------------------------------------------------------------
// US-016: Privát szobához felhasználó meghívása. A hívó tag legyen, a szoba
// privát ÉS NEM DM, a meghívott létezzen és még NE legyen tag — INSERT, vagy
// barátságos hibaüzenet. CSRF kötelező. A meghívó body-ban `invited_user_id`
// VAGY `invited_username` (egyik elég) — a kliens autocomplete-tel megtalálja
// a username-et, és az id-vel POSToljuk általában; a username-fallback olyan
// esetre van, ahol a kliensnek csak a név áll rendelkezésére.
// ---------------------------------------------------------------------------
function handle_invite() {
    require_login();
    $userId = current_user_id();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $token       = isset($body['csrf_token'])         ? (string)$body['csrf_token']         : '';
    $roomId      = isset($body['room_id'])            ? (int)$body['room_id']               : 0;
    $invitedId   = isset($body['invited_user_id'])    ? (int)$body['invited_user_id']       : 0;
    $invitedName = isset($body['invited_username'])   ? trim((string)$body['invited_username']) : '';

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }
    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }
    if ($invitedId <= 0 && $invitedName === '') {
        json_error('Add meg a meghívandó felhasználót (invited_user_id vagy invited_username).', 400);
    }

    $pdo = db();

    // (a) A szoba létezik, privát, NEM DM, ÉS a meghívó tag-e?
    $st = $pdo->prepare(
        "SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1"
    );
    $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $st->execute();
    $room = $st->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] !== 1) {
        json_error('Csak privát szobához lehet meghívni — publikus szobához bárki csatlakozhat.', 400);
    }
    // DM szobák a `dm_*` prefix-szel: nem bővíthetőek (mindig 2 fős).
    if (strpos((string)$room['name'], 'dm_') === 0) {
        json_error('Privát üzenet szobához nem lehet harmadik felet meghívni.', 400);
    }

    $check = $pdo->prepare(
        "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
    );
    $check->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $check->bindValue(':uid', $userId, PDO::PARAM_INT);
    $check->execute();
    if (!$check->fetch()) {
        json_error('Nincs jogod meghívni a szobába.', 403);
    }

    // (c) A meghívott felhasználó létezik?
    if ($invitedId > 0) {
        $st = $pdo->prepare("SELECT id, username FROM users WHERE id = :uid LIMIT 1");
        $st->bindValue(':uid', $invitedId, PDO::PARAM_INT);
    } else {
        $st = $pdo->prepare("SELECT id, username FROM users WHERE username = :name LIMIT 1");
        $st->bindValue(':name', $invitedName, PDO::PARAM_STR);
    }
    $st->execute();
    $invited = $st->fetch();
    if (!$invited) {
        json_error('Nincs ilyen felhasználó.', 404);
    }
    $invitedUid  = (int)$invited['id'];
    $invitedUser = (string)$invited['username'];

    // Saját magunkat nem hívhatjuk meg — a hívó már tag (lásd fentebb).
    if ($invitedUid === $userId) {
        json_error('Saját magadat nem hívhatod meg.', 400);
    }

    // (d) Még NEM tag?
    $checkInvited = $pdo->prepare(
        "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
    );
    $checkInvited->bindValue(':rid', $roomId,     PDO::PARAM_INT);
    $checkInvited->bindValue(':uid', $invitedUid, PDO::PARAM_INT);
    $checkInvited->execute();
    if ($checkInvited->fetch()) {
        json_error('A felhasználó már tag a szobában.', 409);
    }

    // INSERT — defenzíven INSERT IGNORE, hogy egy versengő második meghívás
    // (két admin egyszerre) ne crash-eljen 1062-vel. Az affected_rows-szal
    // megnézzük, de mivel a fenti pre-check már lefutott, normál esetben 1.
    try {
        $ins = $pdo->prepare(
            "INSERT IGNORE INTO room_members (room_id, user_id) VALUES (:rid, :uid)"
        );
        $ins->bindValue(':rid', $roomId,     PDO::PARAM_INT);
        $ins->bindValue(':uid', $invitedUid, PDO::PARAM_INT);
        $ins->execute();
    } catch (PDOException $e) {
        $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        if ($code === 1062) {
            json_error('A felhasználó már tag a szobában.', 409);
        }
        throw $e;
    }

    // Friss member_count visszaadása.
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM room_members WHERE room_id = :rid");
    $cnt->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $cnt->execute();
    $memberCount = (int)$cnt->fetchColumn();

    json_response(array(
        'success' => true,
        'room'    => array(
            'id'           => (int)$room['id'],
            'name'         => (string)$room['name'],
            'is_private'   => true,
            'member_count' => $memberCount,
        ),
        'invited' => array(
            'id'       => $invitedUid,
            'username' => $invitedUser,
        ),
    ));
}
