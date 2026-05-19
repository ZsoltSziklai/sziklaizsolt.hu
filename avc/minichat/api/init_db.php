<?php
/**
 * MiniChat — DB séma inicializáló (admin endpoint)
 *
 * Használat:
 *   GET init_db.php                      → CREATE TABLE IF NOT EXISTS, Lobby seed
 *   GET init_db.php?reset=1&secret=XXX   → RESET mód (lásd config ADMIN_SECRET)
 *
 * Idempotens — többszöri hívás esetén jelzi, hogy a táblák már léteznek.
 * Az aiO deploy után egyszer hívja, valamint a regresszió végén ?reset=1-gyel
 * tabula rasát csinál a manuális teszthez.
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');

$pdo = db();

$isReset = isset($_GET['reset']) && $_GET['reset'] === '1';

try {
    if ($isReset) {
        do_reset($pdo);
    } else {
        do_init($pdo);
    }
} catch (Throwable $e) {
    json_error('Init/reset failed: ' . $e->getMessage(), 500);
}

// ---------------------------------------------------------------------------
// Schema init — CREATE TABLE IF NOT EXISTS minden táblára, Lobby seed.
// ---------------------------------------------------------------------------
function do_init(PDO $pdo) {
    $existedBefore = tables_exist($pdo, array('users', 'rooms', 'messages', 'room_members'));

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        username       VARCHAR(50)  NOT NULL UNIQUE,
        email          VARCHAR(100) NOT NULL UNIQUE,
        password_hash  VARCHAR(255) NOT NULL,
        bio            TEXT         NULL,
        avatar_url     VARCHAR(500) NULL,
        created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen      DATETIME     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rooms (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(50)  NOT NULL UNIQUE,
        description  TEXT         NULL,
        created_by   INT          NULL,
        is_private   TINYINT(1)   NOT NULL DEFAULT 0,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_rooms_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        room_id     INT       NOT NULL,
        user_id     INT       NOT NULL,
        content     TEXT      NOT NULL,
        created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_messages_room_created (room_id, created_at),
        CONSTRAINT fk_messages_room
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS room_members (
        room_id              INT       NOT NULL,
        user_id              INT       NOT NULL,
        joined_at            DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_read_message_id INT       NOT NULL DEFAULT 0,
        typing_at            DATETIME  NULL,
        PRIMARY KEY (room_id, user_id),
        CONSTRAINT fk_rm_room
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        CONSTRAINT fk_rm_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // US-009: meglévő DB-hez idempotens migráció — ha már volt room_members, az
    // új last_read_message_id oszlopot ALTER TABLE-lel adjuk hozzá. 1060 = oszlop
    // már létezik → no-op. Bármi más hibát továbbdobunk.
    try {
        $pdo->exec("ALTER TABLE room_members
                    ADD COLUMN last_read_message_id INT NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
        $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        if ($code !== 1060) {
            throw $e;
        }
    }

    // US-014: typing_at oszlop régi DB-hez — ugyanaz az idempotens minta.
    try {
        $pdo->exec("ALTER TABLE room_members
                    ADD COLUMN typing_at DATETIME NULL");
    } catch (PDOException $e) {
        $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        if ($code !== 1060) {
            throw $e;
        }
    }

    $lobbyId = ensure_lobby($pdo);

    $tables  = list_tables($pdo);

    json_response(array(
        'success'         => true,
        'mode'            => 'init',
        'already_existed' => $existedBefore,
        'message'         => $existedBefore
            ? 'A táblák már léteztek — séma rendben (idempotens futás).'
            : 'Séma létrehozva, Lobby szoba seedelve.',
        'tables'          => $tables,
        'lobby_id'        => $lobbyId,
    ), 200);
}

// ---------------------------------------------------------------------------
// RESET mód — secret check, TRUNCATE/DELETE, AUTO_INCREMENT reset, Lobby seed.
// ---------------------------------------------------------------------------
function do_reset(PDO $pdo) {
    $secret = isset($_GET['secret']) ? (string)$_GET['secret'] : '';
    if (!hash_equals(ADMIN_SECRET, $secret)) {
        json_error('Forbidden — invalid or missing secret', 403);
    }

    if (!tables_exist($pdo, array('users', 'rooms', 'messages', 'room_members'))) {
        do_init($pdo);
        return;
    }

    $userCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $roomCount = (int)$pdo->query("SELECT COUNT(*) FROM rooms WHERE name <> 'Lobby'")->fetchColumn();
    $msgCount  = (int)$pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn();

    // FK check ki — TRUNCATE-hez és tisztításhoz kell.
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    try {
        $pdo->exec("TRUNCATE TABLE messages");
        $pdo->exec("TRUNCATE TABLE room_members");
        $pdo->exec("DELETE FROM rooms WHERE name <> 'Lobby'");
        $pdo->exec("DELETE FROM users");

        $pdo->exec("ALTER TABLE users     AUTO_INCREMENT = 1");
        $pdo->exec("ALTER TABLE messages  AUTO_INCREMENT = 1");
        // rooms AUTO_INCREMENT-et nem reseteljük 1-re, mert ott marad a Lobby (id=1).
        // Ha a Lobby-t újraseedeltük, az lett az 1-es id.
    } finally {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    }

    $lobbyId = ensure_lobby($pdo);

    json_response(array(
        'success'  => true,
        'mode'     => 'reset',
        'message'  => 'DB reset: ' . $userCount . ' user, ' . $roomCount . ' room, ' . $msgCount . ' msg törölve',
        'deleted'  => array(
            'users'    => $userCount,
            'rooms'    => $roomCount,
            'messages' => $msgCount,
        ),
        'lobby_id' => $lobbyId,
    ), 200);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensure_lobby(PDO $pdo) {
    $stmt = $pdo->prepare("SELECT id FROM rooms WHERE name = 'Lobby' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();
    if ($row && !empty($row['id'])) {
        return (int)$row['id'];
    }
    $ins = $pdo->prepare(
        "INSERT INTO rooms (name, description, created_by, is_private)
         VALUES ('Lobby', 'Alapértelmezett nyilvános szoba — mindenki ide kerül belépés után.', NULL, 0)"
    );
    $ins->execute();
    return (int)$pdo->lastInsertId();
}

function tables_exist(PDO $pdo, array $names) {
    $existing = list_tables($pdo);
    foreach ($names as $n) {
        if (!in_array($n, $existing, true)) {
            return false;
        }
    }
    return true;
}

function list_tables(PDO $pdo) {
    $stmt = $pdo->query("SHOW TABLES");
    $rows = $stmt->fetchAll(PDO::FETCH_NUM);
    $out = array();
    foreach ($rows as $r) {
        $out[] = $r[0];
    }
    return $out;
}
