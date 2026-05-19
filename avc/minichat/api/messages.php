<?php
/**
 * MiniChat — Messages endpoint
 *
 * Actions:
 *   GET  ?action=poll&room_id=<id>[&after=<last_msg_id>]
 *        → { success: true, messages: [{id, room_id, user_id, username, content,
 *                                        created_at, created_ts, is_self}, ...],
 *            typing: [username1, username2, ...] }
 *   POST ?action=send  (JSON body: { csrf_token, room_id, content })
 *        → { success: true, message: { id, room_id, user_id, username, content,
 *                                       created_at, created_ts, is_self: true } }
 *   GET  ?action=search&room_id=<id>&q=<term>  (US-012)
 *        → { success: true, query, room, messages: [...] }
 *   POST ?action=typing  (JSON body: { csrf_token, room_id })   (US-014)
 *        → { success: true } — bumpolja a hívó user `room_members.typing_at`-jét.
 *
 * Hozzáférés: bejelentkezés szükséges (require_login). Privát szobához tagság.
 * Minden poll/send hívás frissíti a hívó user.last_seen mezőjét → online presence (US-007).
 *
 * PHP 7.3 kompatibilis.
 */

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

try {
    switch ($action) {
        case 'poll':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_poll();
            break;
        case 'send':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_send();
            break;
        case 'search':
            if ($method !== 'GET') {
                json_error('Method Not Allowed — GET szükséges', 405);
            }
            handle_search();
            break;
        case 'typing':
            if ($method !== 'POST') {
                json_error('Method Not Allowed — POST szükséges', 405);
            }
            handle_typing();
            break;
        default:
            json_error('Ismeretlen vagy hiányzó action paraméter.', 400);
    }
} catch (Throwable $e) {
    json_error('Szerver hiba: ' . $e->getMessage(), 500);
}

// ---------------------------------------------------------------------------
// Üzenetek lekérése — kezdeti betöltés (utolsó 50) vagy inkrementális (after).
// ---------------------------------------------------------------------------
function handle_poll() {
    require_login();
    $userId = current_user_id();

    $roomId = isset($_GET['room_id']) ? (int)$_GET['room_id'] : 0;
    $after  = isset($_GET['after'])   ? (int)$_GET['after']   : 0;

    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $pdo = db();

    // Szoba létezés + hozzáférés ellenőrzés.
    $stmt = $pdo->prepare("SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1");
    $stmt->execute(array(':rid' => $roomId));
    $room = $stmt->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] === 1) {
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->execute(array(':rid' => $roomId, ':uid' => $userId));
        if (!$check->fetch()) {
            json_error('Nincs jogod ehhez a szobához.', 403);
        }
    }

    // last_seen frissítés — online jelenlét (US-007). A poll a 3mp-es ütemű frissítő.
    try {
        $upd = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = :uid");
        $upd->execute(array(':uid' => $userId));
    } catch (Throwable $e) {
        // last_seen frissítés hibája ne akassza meg a poll válaszát.
    }

    if ($after > 0) {
        // Inkrementális: minden $after fölötti üzenet, sorrendben.
        $sql = "SELECT m.id, m.room_id, m.user_id, m.content,
                       m.created_at, UNIX_TIMESTAMP(m.created_at) AS created_ts,
                       u.username
                FROM messages m
                JOIN users u ON u.id = m.user_id
                WHERE m.room_id = :rid AND m.id > :after
                ORDER BY m.id ASC
                LIMIT 200";
        $st = $pdo->prepare($sql);
        $st->bindValue(':rid',   $roomId, PDO::PARAM_INT);
        $st->bindValue(':after', $after,  PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll();
    } else {
        // Kezdeti: utolsó 50 üzenet, kronologikusan vissza.
        $sql = "SELECT m.id, m.room_id, m.user_id, m.content,
                       m.created_at, UNIX_TIMESTAMP(m.created_at) AS created_ts,
                       u.username
                FROM messages m
                JOIN users u ON u.id = m.user_id
                WHERE m.room_id = :rid
                ORDER BY m.id DESC
                LIMIT 50";
        $st = $pdo->prepare($sql);
        $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $st->execute();
        $rows = array_reverse($st->fetchAll());
    }

    $messages = array();
    $maxIdInBatch = 0;
    foreach ($rows as $r) {
        $mid = (int)$r['id'];
        if ($mid > $maxIdInBatch) { $maxIdInBatch = $mid; }
        $messages[] = array(
            'id'         => $mid,
            'room_id'    => (int)$r['room_id'],
            'user_id'    => (int)$r['user_id'],
            'username'   => (string)$r['username'],
            'content'    => (string)$r['content'],
            'created_at' => (string)$r['created_at'],
            'created_ts' => (int)$r['created_ts'],
            'is_self'    => ((int)$r['user_id'] === $userId),
        );
    }

    // US-009: a poll-tick szinkronizálja a `room_members.last_read_message_id`-t a
    // hívó user-re — ezzel az unread badge automatikusan nullázódik abban a
    // szobában, amelyet a felhasználó épp néz. Ha az aktuális poll nem hozott új
    // üzenetet (after-csurog), a kezdeti betöltésnél (after=0) a szoba MAX(id)-t
    // használjuk — különben a végtelenig 0 maradna a last_read.
    try {
        $bumpTo = $maxIdInBatch;
        if ($bumpTo === 0 && $after === 0) {
            $stMax = $pdo->prepare("SELECT MAX(id) FROM messages WHERE room_id = :rid");
            $stMax->bindValue(':rid', $roomId, PDO::PARAM_INT);
            $stMax->execute();
            $bumpTo = (int)$stMax->fetchColumn();
        }
        if ($bumpTo > 0) {
            $upd = $pdo->prepare(
                "UPDATE room_members
                 SET last_read_message_id = GREATEST(last_read_message_id, :mid)
                 WHERE room_id = :rid AND user_id = :uid"
            );
            $upd->bindValue(':mid', $bumpTo, PDO::PARAM_INT);
            $upd->bindValue(':rid', $roomId, PDO::PARAM_INT);
            $upd->bindValue(':uid', $userId, PDO::PARAM_INT);
            $upd->execute();
        }
    } catch (Throwable $e) {
        // last_read frissítés hibája ne akassza meg a poll-választ.
    }

    // US-014: gépelés jelző — az aktuális szobában az utolsó TYPING_TIMEOUT_SEC
    // (3 mp) belül `typing` action-t küldött user-ek (saját kihagyva). A polling
    // rétegben olvassuk, így nincs külön endpoint a kliensnek.
    $typing = array();
    try {
        $sqlT = "SELECT u.username
                 FROM room_members rm
                 JOIN users u ON u.id = rm.user_id
                 WHERE rm.room_id = :rid
                   AND rm.user_id <> :uid
                   AND rm.typing_at IS NOT NULL
                   AND rm.typing_at >= NOW() - INTERVAL :sec SECOND
                 ORDER BY rm.typing_at DESC
                 LIMIT 10";
        $stT = $pdo->prepare($sqlT);
        $stT->bindValue(':rid', $roomId,             PDO::PARAM_INT);
        $stT->bindValue(':uid', $userId,             PDO::PARAM_INT);
        $stT->bindValue(':sec', TYPING_TIMEOUT_SEC,  PDO::PARAM_INT);
        $stT->execute();
        $rowsT = $stT->fetchAll();
        foreach ($rowsT as $rt) {
            $typing[] = (string)$rt['username'];
        }
    } catch (Throwable $e) {
        // Csendes degradálódás — typing nem kritikus.
    }

    json_response(array(
        'success'  => true,
        'room'     => array(
            'id'         => (int)$room['id'],
            'name'       => (string)$room['name'],
            'is_private' => (int)$room['is_private'] === 1,
        ),
        'messages' => $messages,
        'typing'   => $typing,
    ));
}

// ---------------------------------------------------------------------------
// Üzenet küldése — CSRF + tartalom validáció + hozzáférés-ellenőrzés + INSERT.
// Visszaadja a szerver-kanonikus üzenetet (id, created_ts) — a kliens ezzel
// reconcile-li az optimistic UI placeholder-t.
// ---------------------------------------------------------------------------
function handle_send() {
    require_login();
    $userId = current_user_id();

    $body = read_json_body();
    if (empty($body) && !empty($_POST)) {
        $body = $_POST;
    }

    $token   = isset($body['csrf_token']) ? (string)$body['csrf_token'] : '';
    $roomId  = isset($body['room_id'])    ? (int)$body['room_id']       : 0;
    $content = isset($body['content'])    ? (string)$body['content']    : '';

    if (!csrf_verify($token)) {
        json_error('Érvénytelen CSRF token. Frissítsd az oldalt és próbáld újra.', 403);
    }

    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $contentTrim = trim($content);
    if ($contentTrim === '') {
        json_error('Az üzenet nem lehet üres.', 400);
    }

    $contentLen = function_exists('mb_strlen')
        ? mb_strlen($contentTrim, 'UTF-8')
        : strlen($contentTrim);
    if ($contentLen > MESSAGE_MAX_LENGTH) {
        json_error('Az üzenet legfeljebb ' . MESSAGE_MAX_LENGTH . ' karakter lehet.', 400);
    }

    $pdo = db();

    // Szoba létezés + access (azonos a poll-éval).
    $stmt = $pdo->prepare("SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1");
    $stmt->execute(array(':rid' => $roomId));
    $room = $stmt->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] === 1) {
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->execute(array(':rid' => $roomId, ':uid' => $userId));
        if (!$check->fetch()) {
            json_error('Nincs jogod ehhez a szobához.', 403);
        }
    }

    // US-015: Rate limiting — max MESSAGE_RATE_LIMIT_PER_MINUTE üzenet/perc/user
    // szobától függetlenül. A messages tábla create_at oszlopát kérdezzük le —
    // nincs külön rate-tábla. Az index (room_id, created_at) nem segít itt, de
    // az 1 perces ablak tipikusan néhány tucat sor, prepared scan elég gyors.
    // Pontosan a küszöbnél (count == LIMIT) MÉG engedjük az üzenetet, csak
    // a (LIMIT+1)-ediket utasítjuk vissza 429-cel.
    $rl = $pdo->prepare(
        "SELECT COUNT(*) FROM messages
         WHERE user_id = :uid
           AND created_at > (NOW() - INTERVAL 1 MINUTE)"
    );
    $rl->bindValue(':uid', $userId, PDO::PARAM_INT);
    $rl->execute();
    $recentCount = (int)$rl->fetchColumn();
    if ($recentCount >= MESSAGE_RATE_LIMIT_PER_MINUTE) {
        if (!headers_sent()) {
            header('Retry-After: 60');
        }
        json_error(
            'Túl sok üzenet rövid idő alatt. Maximum '
            . MESSAGE_RATE_LIMIT_PER_MINUTE
            . ' üzenet / perc — várj egy percet és próbáld újra.',
            429
        );
    }

    // INSERT
    $ins = $pdo->prepare(
        "INSERT INTO messages (room_id, user_id, content, created_at)
         VALUES (:rid, :uid, :content, NOW())"
    );
    $ins->bindValue(':rid',     $roomId,      PDO::PARAM_INT);
    $ins->bindValue(':uid',     $userId,      PDO::PARAM_INT);
    $ins->bindValue(':content', $contentTrim, PDO::PARAM_STR);
    $ins->execute();
    $messageId = (int)$pdo->lastInsertId();

    // Visszaolvasás username-mel és UNIX_TIMESTAMP-pel — egységes a poll alakkal.
    $sel = $pdo->prepare(
        "SELECT m.id, m.room_id, m.user_id, m.content,
                m.created_at, UNIX_TIMESTAMP(m.created_at) AS created_ts,
                u.username
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = :mid LIMIT 1"
    );
    $sel->bindValue(':mid', $messageId, PDO::PARAM_INT);
    $sel->execute();
    $row = $sel->fetch();
    if (!$row) {
        json_error('Az üzenet INSERT után nem található. Próbáld újra.', 500);
    }

    // last_seen frissítés (online presence). Csendes failure.
    try {
        $upd = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = :uid");
        $upd->execute(array(':uid' => $userId));
    } catch (Throwable $e) {
        // ignore
    }

    // US-009: küldő user `last_read_message_id`-jét bumpoljuk a frissen INSERT-elt
    // üzenetre — különben a saját üzenete "unread"-ként jelenne meg neki, amíg a
    // következő poll be nem érkezik. (A küldés "implicit olvasás" a saját szempontból.)
    try {
        $upd = $pdo->prepare(
            "UPDATE room_members
             SET last_read_message_id = GREATEST(last_read_message_id, :mid)
             WHERE room_id = :rid AND user_id = :uid"
        );
        $upd->bindValue(':mid', $messageId, PDO::PARAM_INT);
        $upd->bindValue(':rid', $roomId,    PDO::PARAM_INT);
        $upd->bindValue(':uid', $userId,    PDO::PARAM_INT);
        $upd->execute();
    } catch (Throwable $e) {
        // ignore
    }

    json_response(array(
        'success' => true,
        'message' => array(
            'id'         => (int)$row['id'],
            'room_id'    => (int)$row['room_id'],
            'user_id'    => (int)$row['user_id'],
            'username'   => (string)$row['username'],
            'content'    => (string)$row['content'],
            'created_at' => (string)$row['created_at'],
            'created_ts' => (int)$row['created_ts'],
            'is_self'    => true,
        ),
    ));
}

// ---------------------------------------------------------------------------
// US-012: Üzenet keresés az aktuális szobában. LIKE '%term%' prepared
// statement-tel — a wildcard % és _ karaktereket a felhasználói input-ból
// escape-eljük (ESCAPE '|'), hogy a felhasználó pl. literális '50%'-jelet is
// kereshessen. SQL injection ellen védve a bind-paraméter.
// ---------------------------------------------------------------------------
function handle_search() {
    require_login();
    $userId = current_user_id();

    $roomId = isset($_GET['room_id']) ? (int)$_GET['room_id'] : 0;
    $query  = isset($_GET['q'])       ? (string)$_GET['q']    : '';
    $query  = trim($query);

    if ($roomId <= 0) {
        json_error('Érvénytelen vagy hiányzó room_id.', 400);
    }

    $qLen = function_exists('mb_strlen')
        ? mb_strlen($query, 'UTF-8')
        : strlen($query);
    if ($qLen < 3) {
        json_error('A kereséshez legalább 3 karakter szükséges.', 400);
    }
    if ($qLen > 100) {
        json_error('A keresőszó legfeljebb 100 karakter lehet.', 400);
    }

    $pdo = db();

    // Szoba létezés + access (azonos minta a poll/send-ből).
    $stmt = $pdo->prepare("SELECT id, name, is_private FROM rooms WHERE id = :rid LIMIT 1");
    $stmt->execute(array(':rid' => $roomId));
    $room = $stmt->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] === 1) {
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->execute(array(':rid' => $roomId, ':uid' => $userId));
        if (!$check->fetch()) {
            json_error('Nincs jogod ehhez a szobához.', 403);
        }
    }

    // LIKE-wildcard escape: '|' az escape karakter, hogy a literális '%'/'_'
    // jeleket a felhasználó kereshesse. Sorrend kötelezően a '|'-vel kezdődik
    // (különben kétszer escape-elnénk).
    $escaped = str_replace(
        array('|', '%', '_'),
        array('||', '|%', '|_'),
        $query
    );
    $like = '%' . $escaped . '%';

    $sql = "SELECT m.id, m.room_id, m.user_id, m.content,
                   m.created_at, UNIX_TIMESTAMP(m.created_at) AS created_ts,
                   u.username
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.room_id = :rid AND m.content LIKE :q ESCAPE '|'
            ORDER BY m.id DESC
            LIMIT 50";
    $st = $pdo->prepare($sql);
    $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
    $st->bindValue(':q',   $like,   PDO::PARAM_STR);
    $st->execute();
    $rows = $st->fetchAll();

    $messages = array();
    foreach ($rows as $r) {
        $messages[] = array(
            'id'         => (int)$r['id'],
            'room_id'    => (int)$r['room_id'],
            'user_id'    => (int)$r['user_id'],
            'username'   => (string)$r['username'],
            'content'    => (string)$r['content'],
            'created_at' => (string)$r['created_at'],
            'created_ts' => (int)$r['created_ts'],
            'is_self'    => ((int)$r['user_id'] === $userId),
        );
    }

    json_response(array(
        'success'  => true,
        'query'    => $query,
        'room'     => array(
            'id'         => (int)$room['id'],
            'name'       => (string)$room['name'],
            'is_private' => (int)$room['is_private'] === 1,
        ),
        'messages' => $messages,
    ));
}

// ---------------------------------------------------------------------------
// US-014: Gépelés jelző — bumpolja a hívó user `room_members.typing_at` mezőjét.
// A poll-tick-en a többi user részére visszaadjuk azon felhasználók nevét,
// akik az utolsó TYPING_TIMEOUT_SEC (3 mp) belül küldtek typing-jelet.  Inaktív
// üzenet-mezőkben a kliens egyszerűen NEM küld typing-et — a server timestamp
// természetesen kifut a 3 mp-es ablakból, és a többi user-nél eltűnik a jelző.
// ---------------------------------------------------------------------------
function handle_typing() {
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

    // Szoba létezés + access (azonos a poll/send-éval).
    $stmt = $pdo->prepare("SELECT id, is_private FROM rooms WHERE id = :rid LIMIT 1");
    $stmt->execute(array(':rid' => $roomId));
    $room = $stmt->fetch();
    if (!$room) {
        json_error('Nincs ilyen szoba.', 404);
    }
    if ((int)$room['is_private'] === 1) {
        $check = $pdo->prepare(
            "SELECT 1 FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1"
        );
        $check->execute(array(':rid' => $roomId, ':uid' => $userId));
        if (!$check->fetch()) {
            json_error('Nincs jogod ehhez a szobához.', 403);
        }
    }

    // UPSERT: ha a publikus szoba auto-join-ja még nem futott le, akkor sincs
    // tag-rekord — INSERT ... ON DUPLICATE KEY UPDATE-szel idempotensen kezeljük.
    try {
        $sql = "INSERT INTO room_members (room_id, user_id, typing_at)
                VALUES (:rid, :uid, NOW())
                ON DUPLICATE KEY UPDATE typing_at = NOW()";
        $st = $pdo->prepare($sql);
        $st->bindValue(':rid', $roomId, PDO::PARAM_INT);
        $st->bindValue(':uid', $userId, PDO::PARAM_INT);
        $st->execute();
    } catch (Throwable $e) {
        // Csendes degradálódás — typing nem kritikus.
    }

    // last_seen frissítés (online presence) — itt is naprakészen tartjuk.
    try {
        $upd = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = :uid");
        $upd->execute(array(':uid' => $userId));
    } catch (Throwable $e) {
        // ignore
    }

    json_response(array('success' => true));
}
