# MiniChat — Többfelhasználós chat alkalmazás — Rendszerterv (PRD)

## Projekt célja

Többfelhasználós valós idejű chat alkalmazás, amelynek **elsődleges célja az AI Vibe-Coding Ecosystem tesztelése összetett, backend-es feladaton**. PHP 7.3 + MySQL + vanilla JS. Ez az eddigi legösszetettebb teszt: több fájl, szerver oldali logika, adatbázis, session kezelés, biztonsági követelmények.

## Tech Stack

- **Backend:** PHP 7.3.33 (LiteSpeed SAPI, Apache szerver)
- **Adatbázis:** MySQL/MariaDB (mysqlnd driver, PDO)
- **Frontend:** Vanilla HTML + CSS + JavaScript (több fájl, elkülönített struktúra)
- **Build step:** Nincs szükséges
- **Szerver:** cPanel (sziklaizsolt.hu), mod_rewrite elérhető
- **Valós idejű kommunikáció:** AJAX polling (messages: 3 másodpercenként, online lista: 15 másodpercenként)

## Időzítési konstansok (US-007)

Az online jelenlét detektálásának paraméterei a teszt alkalmazáshoz arányos B szint szerint:

| Paraméter | Érték | Megjegyzés |
|---|---|---|
| `last_seen` timeout | 45 mp | user offline-nak minősül |
| Online-lista polling | 15 mp | `users.php?action=online` GET gyakoriság |
| Messages polling | 3 mp | `messages.php?action=poll` GET gyakoriság (ez frissíti a `last_seen`-t) |
| Explicit logout → offline | max 15 mp | logout-kor `last_seen = NOW() - INTERVAL 60 SECOND` vagy `is_logged_out=1` |
| Tab close → offline | max 60 mp | 45 mp timeout + 15 mp polling |

Ezek az aiQA regresszió szigorú SLA-jához kötöttek — az online lista időzítését stopperrel kell mérni, és 15/60 mp felett FAILED.

## Szerver környezet

```
PHP 7.3.33 (LiteSpeed SAPI)
Apache + mod_rewrite
MySQL (mysqlnd 5.0.12-dev)
PDO drivers: mysql, odbc, pgsql, sqlite
Extensions: mysqli, pdo_mysql, session, json, mbstring, openssl, curl, gd, fileinfo
upload_max_filesize: 60M
post_max_size: 128M
memory_limit: 512M
max_execution_time: 90s
```

## Környezetek

- **Pre-production:** `sziklaizsolt.hu/advc-test/` — ide deployol aiO minden implementáció után
- **Deploy módszer:** SSH + fájlmásolás a `website` Claude Code skill használatával
- **Szerver path:** `/home/sziklaiz/public_html/advc-test/`
- **MySQL:** A connection adatokat a `website` skill-lel kérdezd le a szerverről (cpanel config, .my.cnf, vagy kérdezd meg az operátort)

## Elérhető Claude Code Skillek

- **website** — sziklaizsolt.hu szerver elérés (SSH, fájlkezelés, deployment, MySQL konfig lekérdezés)

## Mappastruktúra

```
src/
├── index.html              ← Login oldal (belépő pont)
├── register.html           ← Regisztrációs oldal
├── chat.html               ← Fő chat felület (bejelentkezés szükséges)
├── profile.html            ← Profil szerkesztés
├── css/
│   └── style.css           ← Globális stílusok, téma változók
├── js/
│   ├── app.js              ← Közös logika (auth check, CSRF, téma, utils)
│   ├── chat.js             ← Chat logika (polling, küldés, szobák, értesítések)
│   └── profile.js          ← Profil oldal logika
├── api/
│   ├── config.php          ← DB connection, session beállítás, CORS, közös funkciók
│   ├── init_db.php         ← Séma inicializáló (egyszer futtatandó)
│   ├── auth.php            ← ?action=register|login|logout|csrf_token
│   ├── messages.php        ← ?action=send|poll|search|typing
│   ├── rooms.php           ← ?action=create|list|join
│   └── users.php           ← ?action=online|update_profile|get_profile
└── .htaccess               ← PHP session beállítások, biztonsági fejlécek
```

## Adatbázis séma

### users
| Oszlop | Típus | Megjegyzés |
|--------|-------|------------|
| id | INT AUTO_INCREMENT | PK |
| username | VARCHAR(50) UNIQUE | min 3 karakter |
| email | VARCHAR(100) UNIQUE | validált |
| password_hash | VARCHAR(255) | password_hash() |
| bio | TEXT | max 200 karakter (app szinten) |
| avatar_url | VARCHAR(500) | NULL engedélyezett |
| created_at | DATETIME DEFAULT NOW() | |
| last_seen | DATETIME | polling frissíti |

### rooms
| Oszlop | Típus | Megjegyzés |
|--------|-------|------------|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(50) UNIQUE | min 2, max 30 |
| description | TEXT | opcionális |
| created_by | INT | FK → users(id) |
| is_private | TINYINT(1) DEFAULT 0 | DM szobák: 1 |
| created_at | DATETIME DEFAULT NOW() | |

### messages
| Oszlop | Típus | Megjegyzés |
|--------|-------|------------|
| id | INT AUTO_INCREMENT | PK |
| room_id | INT | FK → rooms(id) |
| user_id | INT | FK → users(id) |
| content | TEXT | max 1000 karakter (app szinten) |
| created_at | DATETIME DEFAULT NOW() | |
| INDEX | (room_id, created_at) | polling gyorsítás |

### room_members
| Oszlop | Típus | Megjegyzés |
|--------|-------|------------|
| room_id | INT | FK → rooms(id) |
| user_id | INT | FK → users(id) |
| joined_at | DATETIME DEFAULT NOW() | |
| PRIMARY KEY | (room_id, user_id) | |

## API Végpontok

### auth.php
```
POST ?action=register  — body: {username, email, password, password_confirm, csrf_token}
                        → {success: true, user: {id, username}} | {success: false, error: "..."}

POST ?action=login     — body: {email, password, csrf_token}
                        → {success: true, user: {id, username}} | {success: false, error: "Hibás email vagy jelszó"}

POST ?action=logout    → {success: true}

GET  ?action=csrf_token → {token: "abc123..."}
```

### messages.php
```
POST ?action=send      — body: {room_id, content, csrf_token}
                        → {success: true, message: {id, content, created_at}} | {success: false, error: "..."}

GET  ?action=poll      — params: room_id, after (last_msg_id)
                        → {messages: [...], typing: ["Anna", "Béla"]}

GET  ?action=search    — params: q (min 3 karakter), room_id
                        → {results: [{id, content, username, created_at}]}

POST ?action=typing    — body: {room_id}
                        → {success: true}
```

### rooms.php
```
POST ?action=create    — body: {name, description, is_private, csrf_token}
                        → {success: true, room: {id, name}}

GET  ?action=list      → {rooms: [{id, name, description, member_count, is_private}], dm_rooms: [{id, name, other_user}]}

POST ?action=join      — body: {room_id}
                        → {success: true}

POST ?action=invite    — body: {room_id, invited_user_id VAGY invited_username, csrf_token}
                        → {success: true, user: {id, username}} | {success: false, error: "..."}
                        Csak privát (NEM DM) szoba tagja hívhat meg. Hibák: 403 (nem tag), 404 (nincs ilyen user), 409 (már tag).

GET  ?action=members   — params: room_id
                        → {users: [{id, username, avatar_url}]}
                        Csak tag kérheti le. Az invite modal használja a 'már tag' lista kitöltéséhez.
```

### users.php
```
GET  ?action=online    — params: room_id
                        → {users: [{id, username, avatar_url, is_online}]}

POST ?action=update_profile — body: {email, bio, avatar_url, csrf_token}
                             → {success: true}

POST ?action=change_password — body: {old_password, new_password, new_password_confirm, csrf_token}
                              → {success: true} | {success: false, error: "Hibás régi jelszó"}

GET  ?action=get_profile    → {user: {id, username, email, bio, avatar_url, created_at}}
```

### init_db.php (admin endpoint)
```
GET  (paraméter nélkül)     → séma inicializálás (CREATE TABLE IF NOT EXISTS), Lobby seed
GET  ?reset=1&secret=<S>    → RESET mód: TRUNCATE messages, room_members; DELETE rooms WHERE name!='Lobby';
                              DELETE users; AUTO_INCREMENT reset; Lobby újra-seedelés ha hiányzik
                              Secret egyezés kötelező (config.php ADMIN_SECRET) — hibás → 403
                              → {success: true, deleted: {users: N, rooms: M, messages: K}, lobby_id: <id>}
```

## Biztonsági követelmények

1. **SQL Injection:** MINDEN query prepared statement-tel (PDO). Nincs string concatenáció SQL-ben.
2. **XSS:** htmlspecialchars($str, ENT_QUOTES, 'UTF-8') minden kimenetre. Kliens oldalon is escape.
3. **CSRF:** Minden POST kéréshez token. Token generálás: bin2hex(random_bytes(32)), session-ben tárolva.
4. **Session:** session_start() minden API hívás elején. session_regenerate_id(true) login után. HTTP-only cookie.
5. **Jelszó:** password_hash(PASSWORD_DEFAULT) + password_verify(). Soha nem plain text.
6. **Rate limiting:** Max 30 üzenet/perc/user. SQL: COUNT(*) WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE).

## Regressziós tesztelés

A regressziós szcenáriókat az `aiqa-planner` (Opus modell, dedikált scheduled task) tervezi meg dinamikusan a User Stories, AC-k, fejlesztés közbeni BUG-ok és a fenti üzleti logika alapján. **Ebben a PRD-ben szándékosan NINCS előre megírt szcenárió lista** — a regresszió kreatív, cross-funkcionális, a tényleges futás kontextusához igazodik. A planner output-ja a `quality/REGRESSION.json` fájlba kerül; a 5 aiqa-w-XX worker (Sonnet) párhuzamosan futtatja a `dependsOn` gráf alapján.

Lásd: `agents/rules-aiqa-planner.md` (output schema, minőségi követelmények) és `agents/aiqa-planner-init-prompt.md` (folyamat).

## Fontos megjegyzések a fejlesztőnek (Ralph)

- **PHP 7.3 kompatibilitás!** Van `??` operator, nincs typed properties (PHP 7.4), nincs match expression (PHP 8.0)
- **Több fájl:** Ez NEM egyetlen index.html! Tartsd be a mappastruktúrát.
- **init_db.php:** Az aiO fogja egyszer futtatni deploy után. Legyen idempotens (CREATE TABLE IF NOT EXISTS).
- **AJAX polling:** NEM WebSocket. Egyszerű setInterval + fetch. A szerver nem tart nyitva kapcsolatot.
- **Karakter kódolás:** Mindenhol UTF-8 (HTML meta, PHP header, MySQL charset, PDO DSN).
- **Hibakezelés:** Minden API végpont try-catch, JSON válasz. Soha ne jelenjen meg PHP hiba a felhasználónak.
- **Default avatar:** CSS-sel generált kör a felhasználónév kezdőbetűjével (nem kép feltöltés).
- **init_db.php?reset=1 scope:** Az aiO a regresszió után automatikusan meghívja, hogy a manuális teszthez tiszta DB legyen. FONTOS, hogy a reset csak a test data-t törölje (users, custom rooms, messages, room_members), és a Lobby szoba MARADJON (vagy újra seedelődjön). Az ADMIN_SECRET konstans legyen a config.php-ben, ne hardkódolva init_db.php-ban.
