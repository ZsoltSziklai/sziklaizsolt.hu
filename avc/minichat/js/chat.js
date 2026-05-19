/**
 * MiniChat — chat felület logika
 *
 * US-004 hatókör:
 *   - Page bootstrap: session check → CSRF token → szobalista → Lobby utolsó 50 üzenet.
 *   - Render: szobalista (Lobby aktív), üzenet buborékok, online sáv placeholder.
 *   - Logout (US-003-ból átemelve a nézetbe).
 *   - Mobil hamburger gombok (bal: szobák, jobb: online).
 *   - Üzenet input UX: karakter számláló (0/1000), gomb enable/disable.
 *
 * US-005 hatókör:
 *   - Üzenet POST (api/messages.php?action=send) optimistic UI-jal: a saját
 *     üzenet azonnal megjelenik (.is-pending), majd a szerver válaszával
 *     reconcile-ljük a placeholder-t (real id, server-canonical timestamp).
 *   - 3 mp-es polling: GET ?action=poll&room_id=X&after=lastMessageId; csak
 *     az új üzeneteket adja vissza. Dedupelünk: a már látott id-ket átugorjuk,
 *     az is_self üzenetnél tartalom-egyezésen reconcile-lünk a placeholder-rel.
 *
 * US-006 hatókör:
 *   - Új szoba létrehozás modal (név, leírás, privát) → POST rooms.php?action=create.
 *   - Szoba listából bármelyikre kattintás → szobaváltás (loadAndRenderMessages +
 *     polling restart). Publikus szobához fire-and-forget auto-join (rooms.php?action=join)
 *     → a `room_members` tábla naprakész marad a badge-számláláshoz.
 *
 * US-007 hatókör:
 *   - Online lista 15 mp-es polling (api/users.php?action=online&room_id=X).
 *   - Render: avatar (kör + initial), username, status dot (zöld online / szürke offline).
 *   - Saját user félkövér + "(Te)" tag. Offline user-ek a lista alján.
 *   - Logout-kor a server last_seen-t múltba állítja → max 15 mp-en belül offline a többieknek.
 *
 * US-009 hatókör:
 *   - DM (privát üzenet) indítás: online users listában klikk → "Privát üzenet"
 *     popover → POST rooms.php?action=start_dm. A szoba kanonikus neve
 *     `dm_<smallerId>_<largerId>`, mindkét fél tag a `room_members`-ben.
 *   - DM lista a sidebar tetején, "Privát" fejléccel — peer username alapján
 *     "DM: <peer>" formátumban. Üres állapot placeholder-rel.
 *   - Unread badge minden szobához (room_members.last_read_message_id alapján
 *     a szerver számolja). Csak akkor mutatjuk, ha unread_count > 0 ÉS nem az
 *     aktuálisan nyitott szoba. A poll-tick automatikusan bumpolja a last_read-et.
 *   - Periodikus DM lista frissítés: a 15 mp-es users-poll callback-jében hívjuk
 *     a loadRooms()-t — különben max 15 mp késleltetéssel jelenik meg új DM
 *     üzenet badge a szobalistában.
 *
 * US-011 hatókör:
 *   - Tab cím összesített olvasatlan számmal: '(N) MiniChat' (aktív szoba
 *     kihagyva). Frissül minden loadRooms után + szobaváltáskor (optimistic).
 *   - Új üzenet detektálás más szobában: per-szoba unread_count snapshot
 *     összehasonlítás (state.lastUnreadByRoom) — minden loadRooms-on detektál.
 *     Nem-aktív szobában növekvő unread → új-üzenet esemény.
 *   - Notification API: első új-üzenet eseménynél requestPermission (egyszer);
 *     ha document.hidden + permission='granted' → desktop notification.
 *   - Hang értesítés (Web Audio sine beep) minden új-üzenet eseménynél, lazy
 *     audioCtx-szel; első user-gesture után engedélyezett.
 *
 * US-012 hatókör:
 *   - Keresés ikon a fejlécben (🔍) → keresőpanel slide-down a chat-main tetején.
 *   - Min. 3 karakter input → debounced GET api/messages.php?action=search&q=&room_id=.
 *   - Eredmény-kártyák: feladó + szoba + dátum + snippet (találat <mark>-elve sárga
 *     háttérrel). Kattintásra a panel becsukódik és a buborékra görget (smooth),
 *     2.6s sárga pulse highlight. Kereszt-szoba keresés NINCS — csak az aktuális
 *     szobában. SQL injection ellen prepared statement + ESCAPE '|' a wildcardokhoz.
 *
 * US-014 hatókör:
 *   - Gépelés jelző: input event-en throttled POST api/messages.php?action=typing.
 *     A 3 mp-es polling response `typing` mezője adja vissza a jelenleg gépelő
 *     user-eket (saját kihagyva, server-szűréssel). 1 név → 'X gépel', 2 név →
 *     'X és Y gépelnek', 3 név → 'X, Y és Z gépelnek', 4+ → 'N felhasználó gépel'.
 *     A pontok (...) animációja PURE CSS keyframes — nincs JS timer.
 *
 * US-016 hatókör:
 *   - '+ Meghívás' gomb a fejlécben — csak privát, NEM-DM aktív szobánál.
 *   - Meghívó modal: keresőmező (autocomplete 2+ karakter, debounced) + 'Már tag'
 *     lista (GET rooms.php?action=members) + Meghívás gomb (POST
 *     rooms.php?action=invite). User-search GET users.php?action=search.
 *   - Sikeres meghívásra zöld banner a modal-on belül + a 'Már tag' lista frissül.
 */
(function () {
    'use strict';

    // ----- Konstansok -------------------------------------------------------
    var MAX_MESSAGE_LENGTH = 1000;
    var POLL_INTERVAL_MS       = 3000;
    var USERS_POLL_INTERVAL_MS = 15000; // US-007: online lista 15 mp-enként frissül
    var BASE_TITLE             = 'MiniChat'; // US-011: tab cím alapja
    var NOTIFICATION_AUTOCLOSE_MS = 5000;    // US-011: native notification auto-close
    var SEARCH_MIN_LENGTH      = 3;          // US-012: min. keresőszó hossz
    var SEARCH_DEBOUNCE_MS     = 350;        // US-012: gépelés-szünet a kérés előtt
    var SEARCH_SNIPPET_RADIUS  = 60;         // US-012: kontextus a találat körül (chars)
    var TYPING_THROTTLE_MS     = 2000;       // US-014: max 1 typing-POST 2 mp-enként
    var INVITE_SEARCH_MIN_LENGTH = 2;        // US-016: autocomplete min karakter
    var INVITE_SEARCH_DEBOUNCE_MS = 250;     // US-016: gépelés-szünet a fetch előtt

    // ----- DOM hivatkozások ------------------------------------------------
    var $ = function (id) { return document.getElementById(id); };

    var usernameLabel    = $('usernameLabel');
    var currentRoomName  = $('currentRoomName');
    var logoutBtn        = $('logoutBtn');
    var errorBanner      = $('errorBanner');

    var roomsList        = $('roomsList');
    var dmRoomsList      = $('dmRoomsList');     // US-009: DM lista a sidebar tetején
    var messagesList     = $('messagesList');
    var messagesEmpty    = $('messagesEmpty');
    var usersList        = $('usersList');

    var messageForm      = $('messageForm');
    var messageInput     = $('messageInput');
    var sendBtn          = $('sendBtn');
    var charCounter      = $('charCounter');

    var toggleRoomsBtn   = $('toggleRooms');
    var toggleUsersBtn   = $('toggleUsers');
    var sidebarRooms     = $('sidebarRooms');
    var sidebarUsers     = $('sidebarUsers');
    var sidebarBackdrop  = $('sidebarBackdrop');

    // US-013: téma váltó (világos ↔ sötét).
    var themeToggleBtn   = $('themeToggleBtn');
    var themeToggleIcon  = $('themeToggleIcon');

    // US-012: keresés DOM ref-ek.
    var searchBtn        = $('searchBtn');
    var searchPanel      = $('searchPanel');
    var searchForm       = $('searchForm');
    var searchInput      = $('searchInput');
    var searchCloseBtn   = $('searchClose');
    var searchStatus     = $('searchStatus');
    var searchResults    = $('searchResults');

    // US-014: gépelés jelző DOM ref-ek.
    var typingIndicator  = $('typingIndicator');
    var typingText       = $('typingText');

    // US-006: új szoba modal.
    var newRoomBtn        = $('newRoomBtn');
    var newRoomModal      = $('newRoomModal');
    var newRoomCloseBtn   = $('newRoomClose');
    var newRoomCancelBtn  = $('newRoomCancel');
    var newRoomForm       = $('newRoomForm');
    var newRoomSubmitBtn  = $('newRoomSubmit');
    var newRoomNameInput  = $('newRoomName');
    var newRoomDescInput  = $('newRoomDescription');
    var newRoomPrivateInp = $('newRoomPrivate');
    var newRoomError      = $('newRoomError');

    // US-016: meghívó modal DOM ref-ek.
    var inviteBtn              = $('inviteBtn');
    var inviteModal            = $('inviteModal');
    var inviteCloseBtn         = $('inviteClose');
    var inviteCancelBtn        = $('inviteCancel');
    var inviteForm             = $('inviteForm');
    var inviteSubmitBtn        = $('inviteSubmit');
    var inviteSearchInput      = $('inviteSearchInput');
    var inviteSuggestions      = $('inviteSuggestions');
    var inviteSelected         = $('inviteSelected');
    var inviteSelectedName     = $('inviteSelectedName');
    var inviteSelectedClearBtn = $('inviteSelectedClear');
    var inviteMembersList      = $('inviteMembersList');
    var inviteRoomNameEl       = $('inviteRoomName');
    var inviteError            = $('inviteError');
    var inviteSuccess          = $('inviteSuccess');

    // ----- Állapot ----------------------------------------------------------
    var state = {
        currentUser: null,    // {id, username}
        csrfToken:   '',
        rooms:       [],      // publikus + tagolt privát
        dmRooms:     [],
        currentRoom: null,    // aktív szoba {id, name, is_private, ...}
        lastMessageId: 0,     // utolsó látott msg id (polling cursor; messages.id globális AUTO_INCREMENT)
        pollIntervalId: null, // setInterval handle a 3mp pollinghoz
        pollInFlight: false,  // poll-torlódás védelem lassú hálózaton
        pendingOptimistic: [], // { tempId, content } — még nem reconciled saját üzenetek
        usersPollIntervalId: null, // US-007: setInterval handle az online lista 15mp pollinghoz
        usersPollInFlight: false,  // US-007: torlódás-védelem
        userPopover: null,         // US-009: aktív DM popover DOM elem (vagy null)
        // US-011: olvasatlan tracking + értesítések
        lastUnreadByRoom: null,           // { [roomId]: count } snapshot — null = még nem volt loadRooms
        notificationPermissionAsked: false, // requestPermission egyszer hívható
        audioCtx: null,                   // lazy Web Audio context a beep-hez
        // US-012: keresés
        searchOpen: false,
        searchDebounceId: null,
        searchInFlight: false,
        searchSeq: 0,                     // monoton szekvencia a stale-válasz dropoláshoz
        // US-014: gépelés jelző
        lastTypingPostAt: 0,              // utolsó typing POST timestamp (ms) — throttle
        typingUsers: [],                  // legutóbbi poll-tól kapott gépelő username-ek
        // US-016: meghívó modal állapot
        inviteOpen: false,
        inviteRoomId: 0,                  // melyik szobához nyitottuk a modal-t
        inviteSelectedUser: null,         // {id, username} kiválasztott meghívandó
        inviteMemberIds: {},              // { [userId]: true } — már tag, hogy a suggestion-ben kiszürkítsük
        inviteSearchDebounceId: null,
        inviteSearchSeq: 0                // monoton seq a stale-fetch dropoláshoz
    };

    // ----- Apró util-ok -----------------------------------------------------
    function showError(msg) {
        errorBanner.textContent = msg;
        errorBanner.classList.add('visible');
    }
    function clearError() {
        errorBanner.textContent = '';
        errorBanner.classList.remove('visible');
    }
    function redirectToLogin() {
        window.location.href = 'index.html';
    }

    // ----- US-013: téma váltás (világos ↔ sötét) ---------------------------
    // localStorage-ban perzisztál, FOUC ellen `<head>`-ben inline boot script
    // állítja a `data-theme` attribútumot a CSS betöltése előtt.
    var THEME_STORAGE_KEY = 'minichat_theme';
    function getStoredTheme() {
        try {
            var v = localStorage.getItem(THEME_STORAGE_KEY);
            return (v === 'dark') ? 'dark' : 'light';
        } catch (e) { return 'light'; }
    }
    function setStoredTheme(t) {
        try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch (e) {}
    }
    function applyTheme(theme) {
        var t = (theme === 'dark') ? 'dark' : 'light';
        if (t === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        if (themeToggleIcon) {
            // Az ikon a KÖVETKEZŐ témára utal (kattintásra mit kapnánk):
            // sötét aktív → ☀️ a világosra váltáshoz; világos aktív → 🌙 a sötétre.
            themeToggleIcon.textContent = (t === 'dark') ? '☀️' : '🌙';
        }
        if (themeToggleBtn) {
            var label = (t === 'dark') ? 'Világos téma' : 'Sötét téma';
            themeToggleBtn.setAttribute('aria-label', label);
            themeToggleBtn.title = label;
        }
    }
    function toggleTheme() {
        var current = getStoredTheme();
        var next = (current === 'dark') ? 'light' : 'dark';
        setStoredTheme(next);
        // Rövid (350ms) ablakra blanket-transition az `<html>`-en — minden
        // elem fade-elve repaint-eli a témát; utána visszaesnek a saját
        // hover/focus transition-jeikre.
        var root = document.documentElement;
        root.classList.add('theme-transitioning');
        applyTheme(next);
        window.setTimeout(function () {
            root.classList.remove('theme-transitioning');
        }, 350);
    }
    function escapeHtml(s) {
        // XSS védelem: szövegként rakjuk be (.textContent), ezért technikailag nem
        // muszáj escape-elni. Ezt akkor használjuk, ha innerHTML-be kell írni.
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // US-010: Markdown-szerű formázás üzenetbuborékokhoz.
    // SORREND KRITIKUS biztonsági okból: 1) HTML escape ELŐSZÖR (nyers `<script>` soha
    // nem jut be), 2) code-blokk és inline-kód placeholder-be kivonva (a tartalmuk NE
    // kapjon további markdown-konverziót), 3) URL auto-link, 4) **bold** (lazy),
    // 5) *italic* (lazy), 6) placeholder-ek visszahelyettesítése.  A regex-ek mind
    // non-greedy (lazy) — különben több bekezdést átkötnének.
    // Egyedi placeholder-bound: NUL byte (\x00) — felhasználói nyers szövegben
    // gyakorlatilag soha nem fordul elő, így biztosan nem ütközik markdown-renderelt
    // tartalom közbeni helyettesítéssel. String.fromCharCode(0)-val gyártjuk hogy
    // a forráskód plain ASCII maradjon.
    var MD_BOUND = String.fromCharCode(0);

    function formatMarkdown(s) {
        var escaped = escapeHtml(s);
        var stash = [];
        function reserve(html) {
            stash.push(html);
            return MD_BOUND + 'MD' + (stash.length - 1) + MD_BOUND;
        }

        // 1) Triple-backtick kódblokk — több sort átfoghat ([\s\S]+?), lazy.
        escaped = escaped.replace(/```([\s\S]+?)```/g, function (_, code) {
            return reserve('<pre><code>' + code + '</code></pre>');
        });

        // 2) Inline kód `…` — egysoros, NEM léphet sortörést, lazy.
        escaped = escaped.replace(/`([^`\n]+?)`/g, function (_, code) {
            return reserve('<code>' + code + '</code>');
        });

        // 3) URL auto-link — https?:// scheme, whitespace/escaped < lezárja.
        //    Trailing írásjelek (.,;:!?)] az utolsó kar.) NEM részei a linknek.
        escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
            var trailing = '';
            var m = url.match(/[.,;:!?)\]]+$/);
            if (m) {
                trailing = m[0];
                url = url.slice(0, url.length - trailing.length);
            }
            return reserve(
                '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
                url + '</a>'
            ) + trailing;
        });

        // 4) Bold **…** — KÖTELEZŐEN italic ELŐTT (különben az italic regex
        //    `**bold**` közepén `*bold*`-ra match-elne és `*<em>bold</em>*`-ot adna).
        //    Flanking szabály: a delimiter MELLETT nem lehet whitespace.
        //    Negatív lookahead `(?!\*\*)`: a tartalmon belül NEM jelenhet meg újabb
        //    `**` — különben `**a** b **c**` egy span-be ragadna a lazy-optional
        //    extensionja miatt.
        escaped = escaped.replace(
            /\*\*(\S(?:(?!\*\*)[\s\S])*?\S|\S)\*\*/g, '<strong>$1</strong>'
        );

        // 5) Italic *…* — egysoros, asterisk NE legyen a tartalomban.
        //    Flanking szabály: pl. `5 * 3 = 15`-ből ne legyen italic.
        escaped = escaped.replace(
            /\*(\S(?:(?!\*)[^\n])*?\S|\S)\*/g, '<em>$1</em>'
        );

        // 6) Placeholder-ek vissza. Function-callback kell — különben a stash-ben
        //    levő `$&`/`$1`-szerű substring az injektálás során speciális karaktert
        //    jelentene a String.replace-nek.
        for (var i = 0; i < stash.length; i++) {
            (function (idx) {
                var key = MD_BOUND + 'MD' + idx + MD_BOUND;
                escaped = escaped.replace(key, function () { return stash[idx]; });
            })(i);
        }
        return escaped;
    }
    function formatTime(ts) {
        // ts = unix másodperc; HH:MM helyi idő szerint.
        if (!ts || isNaN(ts)) { return ''; }
        var d = new Date(ts * 1000);
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return hh + ':' + mm;
    }

    // ----- Fetch helperek ---------------------------------------------------
    function jsonFetch(url, opts) {
        var defaults = {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        };
        var merged = Object.assign({}, defaults, opts || {});
        if (merged.headers && opts && opts.headers) {
            merged.headers = Object.assign({}, defaults.headers, opts.headers);
        }
        return fetch(url, merged).then(function (r) {
            return r.json().then(function (data) {
                return { status: r.status, ok: r.ok, body: data };
            });
        });
    }

    function checkSession() {
        return jsonFetch('api/auth.php?action=session').then(function (res) {
            if (!res.body || !res.body.success || !res.body.logged_in) {
                redirectToLogin();
                return null;
            }
            return res.body.user || null;
        }).catch(function () {
            // Hálózati hiba → biztonságosabb a login oldalra dobni.
            redirectToLogin();
            return null;
        });
    }

    function loadCsrfToken() {
        return jsonFetch('api/auth.php?action=csrf_token').then(function (res) {
            if (res.body && res.body.success && res.body.token) {
                state.csrfToken = res.body.token;
                return res.body.token;
            }
            throw new Error('Nem sikerült CSRF tokent szerezni.');
        });
    }

    function loadRooms() {
        return jsonFetch('api/rooms.php?action=list').then(function (res) {
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Szobalista lekérése sikertelen.';
                throw new Error(msg);
            }
            state.rooms   = Array.isArray(res.body.rooms)    ? res.body.rooms    : [];
            state.dmRooms = Array.isArray(res.body.dm_rooms) ? res.body.dm_rooms : [];
            return state.rooms;
        });
    }

    function loadMessages(roomId) {
        var url = 'api/messages.php?action=poll&room_id=' + encodeURIComponent(roomId);
        return jsonFetch(url).then(function (res) {
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Üzenetek lekérése sikertelen.';
                throw new Error(msg);
            }
            return res.body;
        });
    }

    function submitLogout() {
        return jsonFetch('api/auth.php?action=logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csrf_token: state.csrfToken })
        });
    }

    // ----- Render: szobalista -----------------------------------------------
    function renderRooms() {
        // Publikus + tag-olt privát szobák a fő listában.
        roomsList.innerHTML = '';
        if (state.rooms.length === 0) {
            var li0 = document.createElement('li');
            li0.className = 'rooms-list-loading';
            li0.textContent = 'Nincs elérhető szoba.';
            roomsList.appendChild(li0);
        } else {
            state.rooms.forEach(function (room) {
                roomsList.appendChild(createRoomItem(room));
            });
        }

        // US-009: DM lista a sidebar tetején, "Privát" szekcióban.
        renderDmRooms();
    }

    function renderDmRooms() {
        if (!dmRoomsList) { return; }
        dmRoomsList.innerHTML = '';
        if (!state.dmRooms || state.dmRooms.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'dm-rooms-empty';
            empty.textContent = 'Még nincs privát beszélgetés.';
            dmRoomsList.appendChild(empty);
            return;
        }
        state.dmRooms.forEach(function (room) {
            dmRoomsList.appendChild(createRoomItem(room));
        });
    }

    // ----- US-011: olvasatlan tracking + tab cím + értesítések -------------
    // Snapshot a jelenlegi unread_count-okból szobánként — delta-detektáláshoz.
    function computeUnreadSnapshot(rooms, dmRooms) {
        var snap = {};
        var addOne = function (r) { snap[r.id] = (r.unread_count|0); };
        if (rooms)   { rooms.forEach(addOne); }
        if (dmRooms) { dmRooms.forEach(addOne); }
        return snap;
    }

    // Tab cím frissítés: '(N) MiniChat' ha N>0, különben 'MiniChat'.
    // Az aktív szobát SOSEM számoljuk be (a felhasználó épp olvassa).
    function updateTabTitle() {
        var total = 0;
        var activeId = state.currentRoom ? state.currentRoom.id : 0;
        var addOne = function (r) {
            if (r && r.id !== activeId) {
                total += (r.unread_count|0);
            }
        };
        (state.rooms   || []).forEach(addOne);
        (state.dmRooms || []).forEach(addOne);
        document.title = total > 0 ? ('(' + total + ') ' + BASE_TITLE) : BASE_TITLE;
    }

    // A loadRooms után minden esetben ezt hívjuk: snapshot frissítés, render,
    // tab cím + új-üzenet delták detektálása. Az init-béli első hívásnál
    // prevSnap === null → csak baseline-t veszünk fel, notif/sound nem fut.
    function applyLoadedRooms() {
        var prevSnap = state.lastUnreadByRoom;
        var newSnap  = computeUnreadSnapshot(state.rooms, state.dmRooms);
        state.lastUnreadByRoom = newSnap;

        renderRooms();
        updateTabTitle();

        if (prevSnap === null) {
            return; // első loadRooms — csak baseline, ne fakeoljunk értesítést.
        }

        // Új üzenet = növekvő unread_count egy NEM-aktív szobában.
        var increased = [];
        var allRooms  = (state.rooms || []).concat(state.dmRooms || []);
        for (var i = 0; i < allRooms.length; i++) {
            var r       = allRooms[i];
            var prev    = (prevSnap[r.id]|0);
            var curr    = (r.unread_count|0);
            var isActive = state.currentRoom && state.currentRoom.id === r.id;
            if (curr > prev && !isActive) {
                increased.push(r);
            }
        }
        if (increased.length > 0) {
            onNewMessagesInOtherRooms(increased);
        }
    }

    // Új üzenet eseményre: permission kérés (első alkalommal), beep, és
    // ha a tab nem aktív, native notification.
    function onNewMessagesInOtherRooms(rooms) {
        requestNotificationPermissionIfNeeded();
        playNotificationBeep();
        if (!document.hidden) { return; }
        if (typeof Notification === 'undefined') { return; }
        if (Notification.permission !== 'granted') { return; }

        var first  = rooms[0];
        var title  = BASE_TITLE + ' — új üzenet';
        var body;
        if (first.is_dm) {
            body = (first.peer && first.peer.username)
                ? ('DM: ' + first.peer.username)
                : 'Privát beszélgetés';
        } else {
            body = first.name || 'Új üzenet';
        }
        if (rooms.length > 1) {
            body += ' (és ' + (rooms.length - 1) + ' másik szoba)';
        }
        try {
            var n = new Notification(title, {
                body:   body,
                tag:    'minichat-room-' + first.id, // ugyanarra a szobára felülírja a régit
                silent: true                          // a beep már szól
            });
            n.onclick = function () {
                try { window.focus(); } catch (e) { /* ignore */ }
                try { n.close(); }      catch (e) { /* ignore */ }
            };
            window.setTimeout(function () {
                try { n.close(); } catch (e) { /* ignore */ }
            }, NOTIFICATION_AUTOCLOSE_MS);
        } catch (e) {
            // Notification konstruktor failed (pl. iOS Safari) — silent degrade.
        }
    }

    // Engedély kérés EGYSZER, az első új-üzenet eseménynél (PRD: "első üzenetnél").
    function requestNotificationPermissionIfNeeded() {
        if (state.notificationPermissionAsked) { return; }
        state.notificationPermissionAsked = true;
        if (typeof Notification === 'undefined') { return; }
        if (Notification.permission !== 'default') { return; } // 'granted' / 'denied' → nincs mit kérni
        try {
            var maybePromise = Notification.requestPermission(function () { /* legacy callback */ });
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(function () { /* result ignored */ },
                                  function () { /* ignore */ });
            }
        } catch (e) {
            // Régi böngésző / blokkolt API — silent.
        }
    }

    // Egyszerű ~880Hz sine-beep ~0.18s, lazy AudioContext-szel. iOS Safari sok
    // helyen blokkolja az AudioContext-et user-gesture nélkül; try/catch-csel
    // némán degradálódunk.
    function playNotificationBeep() {
        try {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) { return; }
            if (!state.audioCtx) { state.audioCtx = new Ctx(); }
            var ctx = state.audioCtx;
            // iOS: ha suspended, próbáljuk resume-olni (csendben failel ha nem lehet).
            if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
                try { ctx.resume(); } catch (e) { /* ignore */ }
            }
            var t    = ctx.currentTime;
            var osc  = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880; // A5
            // Rövid attack/release, hogy ne pattanjon (clicking).
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
            gain.gain.linearRampToValueAtTime(0,    t + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {
            // Web Audio nem elérhető vagy blokkolva — silent.
        }
    }

    function dmDisplayName(room) {
        // 'DM: <peer username>' — mindkét oldalon a másik felhasználó látszik.
        var peer = (room && room.peer && room.peer.username) ? room.peer.username : '';
        if (peer) { return 'DM: ' + peer; }
        // Fallback ha a peer feloldása sikertelen volt (pl. törölt user).
        return 'Privát beszélgetés';
    }

    function createRoomItem(room) {
        var li = document.createElement('li');
        li.className = 'room-item';
        if (room.is_dm) { li.classList.add('is-dm'); }
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.dataset.roomId = String(room.id);
        if (state.currentRoom && state.currentRoom.id === room.id) {
            li.classList.add('active');
        }

        if (room.is_private && !room.is_dm) {
            var lock = document.createElement('span');
            lock.className = 'room-item-private-icon';
            lock.setAttribute('aria-hidden', 'true');
            lock.textContent = '🔒';
            li.appendChild(lock);
        }
        if (room.is_dm) {
            var dmIcon = document.createElement('span');
            dmIcon.className = 'room-item-dm-icon';
            dmIcon.setAttribute('aria-hidden', 'true');
            dmIcon.textContent = '💬';
            li.appendChild(dmIcon);
        }

        var name = document.createElement('span');
        name.className = 'room-item-name';
        name.textContent = room.is_dm ? dmDisplayName(room) : room.name;
        li.appendChild(name);

        // US-009: unread badge — csak ha > 0 ÉS nem az aktuális szoba.
        var unread = (room.unread_count|0);
        var isActive = state.currentRoom && state.currentRoom.id === room.id;
        if (unread > 0 && !isActive) {
            var ub = document.createElement('span');
            ub.className = 'room-item-unread';
            ub.textContent = unread > 99 ? '99+' : String(unread);
            ub.title = unread + ' olvasatlan üzenet';
            li.appendChild(ub);
        } else if (!room.is_dm) {
            // DM szobához nincs member_count badge (mindig 2), publikusnak van.
            var badge = document.createElement('span');
            badge.className = 'room-item-badge';
            badge.textContent = String(room.member_count || 0);
            li.appendChild(badge);
        }

        li.addEventListener('click', function () { onRoomClick(room); });
        li.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRoomClick(room);
            }
        });

        return li;
    }

    function onRoomClick(room) {
        if (state.currentRoom && state.currentRoom.id === room.id) {
            // Ugyanaz a szoba — mobilon csak csukjuk be a sidebar-t.
            closeSidebars();
            return;
        }
        closeSidebars();
        switchToRoom(room);
        // Publikus szobához fire-and-forget auto-join — a `room_members` tükrözze
        // a "ki látogatta már" számlálót. Privát szobához join nem szükséges:
        // a list-be amúgy is csak akkor került, ha a user tag (rooms.php?action=list).
        if (!room.is_private) {
            joinRoom(room.id);
        }
    }

    function joinRoom(roomId) {
        if (!state.csrfToken) { return; }
        jsonFetch('api/rooms.php?action=join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token: state.csrfToken,
                room_id:    roomId
            })
        }).then(function (res) {
            if (!res || !res.body || !res.body.success) { return; }
            // Friss member_count tükröztetése a listában — egy plusz fetch a listára
            // egyszerűbb, mint az item lokális update-elése (a jövőben többen is
            // joinolhatnak párhuzamosan, így a server-szám az autoritatív).
            return loadRooms().then(applyLoadedRooms).catch(function () { /* ignore */ });
        }).catch(function () {
            // Csendben — a szoba-váltás független a join sikerétől.
        });
    }

    function switchToRoom(room) {
        // Más szoba → álljon le a poll, hogy egy in-flight válasz ne render-elje
        // a régi szobába az új üzeneteket. US-007: online polling is restartolva,
        // különben a régi szoba member-listáját pollozná tovább.
        stopPolling();
        stopUsersPolling();
        // US-012: ha nyitva van a keresőpanel, csukjuk be — a régi szoba
        // találatai már nem relevánsak. A keresési szekvencia bumpolása ledropolja
        // az esetleges in-flight választ.
        if (state.searchOpen) { closeSearchPanel(); }
        state.searchSeq++;
        if (searchInput) { searchInput.value = ''; }
        clearSearchResults();
        renderSearchStatus('');
        // US-014: a régi szoba typing-állapota nem releváns az újra; a következő
        // poll a friss listát hozza vissza. Throttle reset, hogy az új szobába
        // azonnal mehessen a typing POST.
        clearTypingIndicator();
        state.lastTypingPostAt = 0;
        state.currentRoom = room;
        // US-009: DM szobánál a header-ben a peer-alapú barátságos név látszik
        // ('DM: <peer>'), nem a kanonikus 'dm_<a>_<b>'.
        currentRoomName.textContent = room.is_dm ? dmDisplayName(room) : room.name;
        // US-016: meghívó gomb láthatósága a szoba típusa szerint.
        applyInviteButtonVisibility(room);
        // Ha a meghívó modal nyitva volt egy másik szobához, csukjuk be
        // — különben a most-aktív szobához tartozó gomb-szemantika és a modal
        // tartalma (másik szoba tagjai) elválna.
        if (state.inviteOpen) { closeInviteModal(); }
        // US-009: az új szoba unread_count-ját optimistikusan 0-ra tesszük lokál,
        // így az aktív szoba badge azonnal eltűnik a listából (a szerver a következő
        // polltól fogja a last_read_message_id-t bumpolni).
        if (room.unread_count) { room.unread_count = 0; }
        // Aktív kiemelés frissítése — egyszerre a sidebar fő listájában és a DM listában.
        applyActiveRoomHighlight(room.id);
        // US-011: tab cím azonnal frissül (új aktív szobának nem számolódik az
        // unread-je). A delta-snapshotot is rögzítjük, hogy a következő loadRooms
        // (15 mp piggyback) a most-épp látott állapothoz képest detektáljon
        // — különben az "olvasottá tétel" vissza-pumpálná a listába a régi unread-et
        // mint új-üzenet eseményt.
        if (state.lastUnreadByRoom !== null) {
            state.lastUnreadByRoom[room.id] = 0;
        }
        updateTabTitle();
        // Üzenetek újratöltése — a sikeres betöltés után indul a polling.
        loadAndRenderMessages(room.id);
    }

    function applyActiveRoomHighlight(roomId) {
        var setActive = function (li) {
            if (parseInt(li.dataset.roomId, 10) === roomId) {
                li.classList.add('active');
                // Ha az aktív szobának volt unread badge-e, vegyük le azonnal.
                var ub = li.querySelector('.room-item-unread');
                if (ub) { ub.remove(); }
            } else {
                li.classList.remove('active');
            }
        };
        if (roomsList) {
            roomsList.querySelectorAll('.room-item').forEach(setActive);
        }
        if (dmRoomsList) {
            dmRoomsList.querySelectorAll('.room-item').forEach(setActive);
        }
    }

    // ----- Render: üzenetek -------------------------------------------------
    function loadAndRenderMessages(roomId) {
        clearMessages();
        showMessagesPlaceholder('Üzenetek betöltése…');

        return loadMessages(roomId).then(function (data) {
            var messages = Array.isArray(data.messages) ? data.messages : [];
            renderMessages(messages, /*append*/ false);
            if (messages.length === 0) {
                showMessagesPlaceholder('Még nincs üzenet ebben a szobában. Légy te az első!');
            }
            // US-014: kezdeti betöltéskor is renderelhetjük a friss typing állapotot.
            renderTypingIndicator(data.typing);
            // Sikeres kezdeti load → indítsuk el a 3 mp-es pollingot.
            startPolling();
            // US-007: online lista 15 mp-es polling — azonnali fetch + interval.
            startUsersPolling();
        }).catch(function (err) {
            showError('Üzenetek betöltése sikertelen: ' + (err && err.message ? err.message : 'ismeretlen hiba'));
            showMessagesPlaceholder('Nem sikerült betölteni az üzeneteket.');
        });
    }

    function clearMessages() {
        // Az #messagesEmpty placeholder-t megőrizzük, csak a buborékokat töröljük.
        var nodes = messagesList.querySelectorAll('.message');
        nodes.forEach(function (n) { n.remove(); });
        if (messagesEmpty) {
            messagesEmpty.style.display = 'none';
        }
    }

    function showMessagesPlaceholder(text) {
        if (!messagesEmpty) { return; }
        messagesEmpty.textContent = text;
        messagesEmpty.style.display = '';
    }

    function hideMessagesPlaceholder() {
        if (messagesEmpty) {
            messagesEmpty.style.display = 'none';
        }
    }

    function renderMessages(messages, append) {
        if (!append) {
            // (clearMessages már lefutott, csak emiatt ne dupláznánk meg.)
        }
        if (messages.length > 0) {
            hideMessagesPlaceholder();
        }
        var appendedAny = false;
        messages.forEach(function (m) {
            // Dedup valós id-ra (send response + poll race esetén ne dupláznánk).
            var existing = (m.id > 0)
                ? messagesList.querySelector('[data-message-id="' + m.id + '"]')
                : null;
            if (existing) {
                // Már megjelenítve — skipping.
            } else if (m.is_self && reconcilePendingByContent(m)) {
                // Optimistic placeholder reconcile-lódott — nem appendelünk újat.
                appendedAny = true;
            } else {
                messagesList.appendChild(createMessageBubble(m));
                appendedAny = true;
            }
            if (m.id > state.lastMessageId) {
                state.lastMessageId = m.id;
            }
        });
        if (appendedAny) {
            scrollMessagesToBottom();
        }
    }

    // Optimistic placeholder reconcile — tartalom-egyezésre keres pending elemet,
    // a placeholder DOM-ját átírja a szerver-kanonikus adatokra (id, ts).
    function reconcilePendingByContent(serverMsg) {
        if (!state.pendingOptimistic || state.pendingOptimistic.length === 0) {
            return false;
        }
        for (var i = 0; i < state.pendingOptimistic.length; i++) {
            var p = state.pendingOptimistic[i];
            if (p.content !== serverMsg.content) { continue; }
            var node = messagesList.querySelector('[data-temp-id="' + p.tempId + '"]');
            if (node) {
                node.classList.remove('is-pending');
                node.dataset.messageId = String(serverMsg.id);
                delete node.dataset.tempId;
                var timeEl = node.querySelector('.message-time');
                if (timeEl) { timeEl.textContent = formatTime(serverMsg.created_ts); }
            }
            state.pendingOptimistic.splice(i, 1);
            return true;
        }
        return false;
    }

    function createMessageBubble(m) {
        var wrap = document.createElement('div');
        wrap.className = 'message' + (m.is_self ? ' is-self' : '');
        wrap.dataset.messageId = String(m.id);

        var meta = document.createElement('div');
        meta.className = 'message-meta';

        var who = document.createElement('span');
        who.className = 'message-username';
        who.textContent = m.is_self ? '(Te)' : (m.username || 'ismeretlen');
        meta.appendChild(who);

        var time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTime(m.created_ts);
        meta.appendChild(time);

        var bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        // US-010: markdown formázás — formatMarkdown ELŐSZÖR HTML-escape-eli a
        // tartalmat, csak utána konvertálja a szintaxist <strong>/<em>/<code>/<a>-vé.
        // A nyers <script> beleírást az escape védi ki, az innerHTML csak a sterilizált
        // markdown HTML-t kapja.
        bubble.innerHTML = formatMarkdown(m.content);

        wrap.appendChild(meta);
        wrap.appendChild(bubble);
        return wrap;
    }

    function scrollMessagesToBottom() {
        // requestAnimationFrame: a layout után fusson, hogy a magasság már ki legyen számolva.
        window.requestAnimationFrame(function () {
            messagesList.scrollTop = messagesList.scrollHeight;
        });
    }

    // ----- US-005: Üzenet küldés (POST + optimistic UI) --------------------
    function onSendMessage() {
        if (!state.currentRoom) { return; }
        if (sendBtn.disabled) { return; }

        var raw     = messageInput.value;
        var trimmed = raw.trim();
        if (trimmed === '') { return; }
        if (trimmed.length > MAX_MESSAGE_LENGTH) {
            showError('Az üzenet legfeljebb ' + MAX_MESSAGE_LENGTH + ' karakter lehet.');
            return;
        }
        if (!state.csrfToken) {
            showError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        clearError();

        var savedRoomId = state.currentRoom.id;
        var savedRaw    = raw;

        // Optimistic placeholder: temp-id a DOM-ban, .is-pending opacity, kliens-idővel.
        var tempId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        var optimisticMsg = {
            id:         0,
            room_id:    savedRoomId,
            user_id:    state.currentUser ? state.currentUser.id : 0,
            username:   state.currentUser ? state.currentUser.username : '',
            content:    trimmed,
            created_at: '',
            created_ts: Math.floor(Date.now() / 1000),
            is_self:    true
        };
        var bubble = createMessageBubble(optimisticMsg);
        bubble.classList.add('is-pending');
        bubble.dataset.tempId = tempId;
        // A data-message-id-t SZÁNDÉKOSAN nem set-eljük 0-ra (különben a dedup
        // selector match-elne; reconcile-kor írjuk be a valós id-t).
        if (bubble.dataset.messageId) { delete bubble.dataset.messageId; }
        hideMessagesPlaceholder();
        messagesList.appendChild(bubble);
        scrollMessagesToBottom();
        state.pendingOptimistic.push({ tempId: tempId, content: trimmed });

        // Input ürítése + küldő gomb tiltása amíg a request fut.
        messageInput.value = '';
        autoGrowInput();
        updateCharCounter();
        sendBtn.disabled = true;

        jsonFetch('api/messages.php?action=send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token: state.csrfToken,
                room_id:    savedRoomId,
                content:    trimmed
            })
        }).then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success || !res.body.message) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Üzenet küldése sikertelen.';
                handleSendFailure(tempId, savedRaw, msg);
                return;
            }
            reconcileFromSendResponse(tempId, res.body.message);
        }).catch(function (err) {
            handleSendFailure(
                tempId, savedRaw,
                'Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen')
            );
        });
    }

    // A send POST válaszával update-eljük a placeholder-t (vagy ha a polling
    // már reconcile-lta, csak frissítjük a lastMessageId-t).
    function reconcileFromSendResponse(tempId, serverMsg) {
        var node = messagesList.querySelector('[data-temp-id="' + tempId + '"]');
        if (node) {
            node.classList.remove('is-pending');
            node.dataset.messageId = String(serverMsg.id);
            delete node.dataset.tempId;
            var timeEl = node.querySelector('.message-time');
            if (timeEl) { timeEl.textContent = formatTime(serverMsg.created_ts); }
        } else {
            // A placeholder már nincs (polling reconcile-lta) — biztos, ami biztos:
            // ha a real id-vel nincs DOM elem, append-eljünk.
            var existing = messagesList.querySelector('[data-message-id="' + serverMsg.id + '"]');
            if (!existing) {
                messagesList.appendChild(createMessageBubble(serverMsg));
                scrollMessagesToBottom();
            }
        }
        state.pendingOptimistic = state.pendingOptimistic.filter(function (p) {
            return p.tempId !== tempId;
        });
        if (serverMsg.id > state.lastMessageId) {
            state.lastMessageId = serverMsg.id;
        }
        updateCharCounter();
    }

    function handleSendFailure(tempId, savedRaw, errorMsg) {
        var node = messagesList.querySelector('[data-temp-id="' + tempId + '"]');
        if (node) { node.remove(); }
        state.pendingOptimistic = state.pendingOptimistic.filter(function (p) {
            return p.tempId !== tempId;
        });
        // Ha a felhasználó még nem írt új tartalmat, töltsük vissza az eredetit
        // — ne vesszen el amit gépelt.
        if (messageInput.value === '') {
            messageInput.value = savedRaw;
            autoGrowInput();
        }
        updateCharCounter();
        showError(errorMsg);
        // Ha minden buborék eltűnt (üres szoba volt), tegyük vissza a placeholder-t.
        if (!messagesList.querySelector('.message')) {
            showMessagesPlaceholder('Még nincs üzenet ebben a szobában. Légy te az első!');
        }
    }

    // ----- US-005: 3mp polling --------------------------------------------
    function startPolling() {
        stopPolling();
        state.pollIntervalId = window.setInterval(pollNewMessages, POLL_INTERVAL_MS);
    }

    function stopPolling() {
        if (state.pollIntervalId) {
            window.clearInterval(state.pollIntervalId);
            state.pollIntervalId = null;
        }
        state.pollInFlight = false;
    }

    function pollNewMessages() {
        if (!state.currentRoom) { return; }
        if (state.pollInFlight) { return; } // ne torlódjanak lassú hálózaton
        state.pollInFlight = true;
        var roomId = state.currentRoom.id;
        var url = 'api/messages.php?action=poll'
                + '&room_id=' + encodeURIComponent(roomId)
                + '&after='   + encodeURIComponent(state.lastMessageId);
        jsonFetch(url).then(function (res) {
            state.pollInFlight = false;
            if (res.status === 401) {
                stopPolling();
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) { return; }
            // Ha közben szobát váltottunk, ne keverjük össze a render-t.
            if (!state.currentRoom || state.currentRoom.id !== roomId) { return; }
            var msgs = Array.isArray(res.body.messages) ? res.body.messages : [];
            if (msgs.length > 0) {
                renderMessages(msgs, /*append*/ true);
            }
            // US-014: minden 3 mp-es poll-tickkor frissül a gépelés jelző —
            // a server szűri a 3 mp-nél régebbieket, így a leállt user automatikusan
            // eltűnik (worst case 3-6 mp késleltetéssel).
            renderTypingIndicator(res.body.typing);
        }).catch(function () {
            state.pollInFlight = false;
            // Csendes — a következő tick majd újrapróbálja.
        });
    }

    // ----- US-007: Online lista (15 mp polling + render) ------------------
    function startUsersPolling() {
        stopUsersPolling();
        // Azonnali frissítés szobaváltáskor — különben max 15 mp-ig a régi lista látszik.
        pollOnlineUsers();
        state.usersPollIntervalId = window.setInterval(pollOnlineUsers, USERS_POLL_INTERVAL_MS);
    }

    function stopUsersPolling() {
        if (state.usersPollIntervalId) {
            window.clearInterval(state.usersPollIntervalId);
            state.usersPollIntervalId = null;
        }
        state.usersPollInFlight = false;
    }

    function pollOnlineUsers() {
        if (!state.currentRoom) { return; }
        if (state.usersPollInFlight) { return; }
        state.usersPollInFlight = true;
        var roomId = state.currentRoom.id;
        var url = 'api/users.php?action=online&room_id=' + encodeURIComponent(roomId);
        jsonFetch(url).then(function (res) {
            state.usersPollInFlight = false;
            if (res.status === 401) {
                stopUsersPolling();
                stopPolling();
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) { return; }
            // Stale válasz védelme: szobát váltottunk közben — ne render-eljük a régit.
            if (!state.currentRoom || state.currentRoom.id !== roomId) { return; }
            var users = Array.isArray(res.body.users) ? res.body.users : [];
            renderOnlineUsers(users);
            // US-009: piggyback — a 15 mp-es users-poll alkalmával frissítjük a
            // szobalistát is, hogy az új DM üzenetek unread badge-e megjelenjen
            // a sidebar-ban, és új DM-ek (amelyeket egy másik user indított felénk)
            // is feltűnjenek a "Privát" szekcióban.  US-011: ez a hívás detektálja
            // az új-üzenet eseményeket (delta a state.lastUnreadByRoom-hoz képest)
            // — applyLoadedRooms kezeli a tab cím + notification + sound logikát.
            loadRooms().then(applyLoadedRooms).catch(function () { /* ignore */ });
        }).catch(function () {
            state.usersPollInFlight = false;
            // Csendes — a következő tick majd újrapróbálja.
        });
    }

    function renderOnlineUsers(users) {
        if (!usersList) { return; }
        usersList.innerHTML = '';

        if (!users || users.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'users-list-empty';
            empty.textContent = 'Nincs felhasználó.';
            usersList.appendChild(empty);
            return;
        }

        users.forEach(function (u) {
            usersList.appendChild(createUserItem(u));
        });
    }

    function createUserItem(u) {
        var li = document.createElement('li');
        li.className = 'user-item';
        if (!u.is_online) { li.classList.add('is-offline'); }
        if (u.is_self)    { li.classList.add('is-self'); }
        li.dataset.userId = String(u.id);
        // US-009: saját magunkkal nem indíthatunk DM-et — saját rowra ne jelezzünk
        // klikkelhetőséget. Másra igen.
        if (!u.is_self) {
            li.classList.add('is-clickable');
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');
            li.title = 'Privát üzenet ' + (u.username || '?') + ' felé';
            li.addEventListener('click', function (ev) { onUserClick(ev, u); });
            li.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    onUserClick(ev, u);
                }
            });
        }

        // Avatar — kör + felhasználónév első karaktere (default; US-013 cseréli képre).
        var avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.setAttribute('aria-hidden', 'true');
        var uname = (u.username || '?');
        avatar.textContent = uname.charAt(0).toUpperCase();
        li.appendChild(avatar);

        // Felhasználónév — saját user félkövér (CSS) + "(Te)" tag.
        var nameWrap = document.createElement('span');
        nameWrap.className = 'user-item-name';
        nameWrap.textContent = uname;
        if (u.is_self) {
            var tag = document.createElement('span');
            tag.className = 'user-item-self-tag';
            tag.textContent = ' (Te)';
            nameWrap.appendChild(tag);
        }
        li.appendChild(nameWrap);

        // Status pötty — zöld online / szürke offline (CSS .is-offline).
        var dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.title = u.is_online ? 'Online' : 'Offline';
        li.appendChild(dot);

        return li;
    }

    // ----- US-009: User-click → DM popover ---------------------------------
    function onUserClick(ev, u) {
        if (ev) { ev.stopPropagation(); }
        if (!u || u.is_self) { return; }
        var anchor = ev && ev.currentTarget ? ev.currentTarget : null;
        showUserPopover(u, anchor);
    }

    function showUserPopover(u, anchor) {
        closeUserPopover(); // előző bezárása

        var pop = document.createElement('div');
        pop.className = 'user-popover';
        pop.setAttribute('role', 'menu');
        pop.dataset.userId = String(u.id);

        var hdr = document.createElement('div');
        hdr.className = 'user-popover-header';
        hdr.textContent = u.username || '';
        pop.appendChild(hdr);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'user-popover-item';
        btn.setAttribute('role', 'menuitem');
        btn.textContent = '💬 Privát üzenet';
        btn.addEventListener('click', function (ev) {
            if (ev) { ev.stopPropagation(); }
            closeUserPopover();
            startDm(u);
        });
        pop.appendChild(btn);

        document.body.appendChild(pop);
        state.userPopover = pop;

        // Pozíció: az anchor mellett (jobbra), kicsit lejjebb. Ha a viewport-ból
        // kilóg (pl. mobil portrait), igazítsuk vissza a jobb szélhez.
        if (anchor) {
            var rect = anchor.getBoundingClientRect();
            var top = rect.bottom + 4;
            var left = rect.left;
            // Kis korrekció: jobb szélen ne lógjon ki.
            var pw = pop.offsetWidth || 200;
            if (left + pw > window.innerWidth - 8) {
                left = Math.max(8, window.innerWidth - pw - 8);
            }
            pop.style.top  = top + 'px';
            pop.style.left = left + 'px';
        } else {
            // Fallback: viewport középre.
            pop.style.top = '40%';
            pop.style.left = '50%';
            pop.style.transform = 'translate(-50%, -50%)';
        }

        // Kívülre kattintás → bezárás. setTimeout 0, hogy a klikk-event ami
        // megnyitotta, ne triggerelje azonnal a bezárást.
        window.setTimeout(function () {
            document.addEventListener('click', onDocClickClosePopover, true);
            document.addEventListener('keydown', onDocKeyClosePopover);
        }, 0);
    }

    function closeUserPopover() {
        if (state.userPopover && state.userPopover.parentNode) {
            state.userPopover.parentNode.removeChild(state.userPopover);
        }
        state.userPopover = null;
        document.removeEventListener('click', onDocClickClosePopover, true);
        document.removeEventListener('keydown', onDocKeyClosePopover);
    }

    function onDocClickClosePopover(ev) {
        if (!state.userPopover) { return; }
        if (state.userPopover.contains(ev.target)) { return; }
        closeUserPopover();
    }

    function onDocKeyClosePopover(ev) {
        if (ev.key === 'Escape') { closeUserPopover(); }
    }

    function startDm(peer) {
        if (!peer || !peer.id) { return; }
        if (!state.csrfToken) {
            showError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        clearError();
        jsonFetch('api/rooms.php?action=start_dm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token: state.csrfToken,
                peer_id:    peer.id
            })
        }).then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success || !res.body.room) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Privát üzenet indítása sikertelen.';
                showError(msg);
                return;
            }
            var dmRoom = res.body.room;
            // Frissítsük a szobalistát (új DM jelenjen meg) majd váltsunk át rá.
            return loadRooms().then(function () {
                applyLoadedRooms();
                // Próbáljuk megtalálni a friss listából (peer + unread mezőkkel),
                // különben fallback a server response-ra.
                var found = null;
                for (var i = 0; i < state.dmRooms.length; i++) {
                    if (state.dmRooms[i].id === dmRoom.id) { found = state.dmRooms[i]; break; }
                }
                closeSidebars();
                switchToRoom(found || dmRoom);
            }).catch(function () {
                // List-fetch elszállt — még mindig át tudunk váltani a szoba response-ra.
                closeSidebars();
                switchToRoom(dmRoom);
            });
        }).catch(function (err) {
            showError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
        });
    }

    // ----- Üzenetküldő input UX --------------------------------------------
    function updateCharCounter() {
        var len = messageInput.value.length;
        charCounter.textContent = len + '/' + MAX_MESSAGE_LENGTH;
        charCounter.classList.toggle('warning', len >= MAX_MESSAGE_LENGTH * 0.9 && len < MAX_MESSAGE_LENGTH);
        charCounter.classList.toggle('error',   len >= MAX_MESSAGE_LENGTH);

        var trimmed = messageInput.value.trim();
        sendBtn.disabled = (trimmed.length === 0 || len > MAX_MESSAGE_LENGTH);
    }

    function autoGrowInput() {
        // Egyszerű auto-grow: állítsa át a height-et a scrollHeight-re, capped a CSS max-height-tel.
        messageInput.style.height = 'auto';
        var newH = Math.min(messageInput.scrollHeight, 120);
        messageInput.style.height = newH + 'px';
    }

    // ----- Mobil sidebar toggle --------------------------------------------
    function openSidebar(which) {
        closeSidebars();
        if (which === 'left' && sidebarRooms) {
            sidebarRooms.classList.add('open');
            sidebarBackdrop.classList.add('visible');
            sidebarBackdrop.hidden = false;
        } else if (which === 'right' && sidebarUsers) {
            sidebarUsers.classList.add('open');
            sidebarBackdrop.classList.add('visible');
            sidebarBackdrop.hidden = false;
        }
    }

    function closeSidebars() {
        if (sidebarRooms) { sidebarRooms.classList.remove('open'); }
        if (sidebarUsers) { sidebarUsers.classList.remove('open'); }
        if (sidebarBackdrop) {
            sidebarBackdrop.classList.remove('visible');
            sidebarBackdrop.hidden = true;
        }
        // US-009: ha a felhasználó becsukja a sidebart, a popover is csukódjon.
        closeUserPopover();
    }

    function toggleSidebar(which) {
        var el = (which === 'left') ? sidebarRooms : sidebarUsers;
        if (!el) { return; }
        if (el.classList.contains('open')) {
            closeSidebars();
        } else {
            openSidebar(which);
        }
    }

    // ----- US-006: új szoba modal ------------------------------------------
    function openNewRoomModal() {
        if (!newRoomModal) { return; }
        clearNewRoomError();
        if (newRoomForm) { newRoomForm.reset(); }
        newRoomModal.hidden = false;
        // Mobilon a sidebar nyitva volt — csukjuk be a háttérben, hogy a modal egyértelmű legyen.
        closeSidebars();
        // Fókusz a név mezőre — kis késleltetés, hogy a megjelenés után tegye.
        window.setTimeout(function () {
            if (newRoomNameInput) { newRoomNameInput.focus(); }
        }, 30);
    }

    function closeNewRoomModal() {
        if (!newRoomModal) { return; }
        newRoomModal.hidden = true;
        clearNewRoomError();
        if (newRoomSubmitBtn) {
            newRoomSubmitBtn.disabled = false;
            newRoomSubmitBtn.textContent = 'Létrehozás';
        }
    }

    function showNewRoomError(msg) {
        if (!newRoomError) { return; }
        newRoomError.textContent = msg;
        newRoomError.classList.add('visible');
    }
    function clearNewRoomError() {
        if (!newRoomError) { return; }
        newRoomError.textContent = '';
        newRoomError.classList.remove('visible');
    }

    function onNewRoomSubmit(ev) {
        if (ev) { ev.preventDefault(); }
        if (!state.csrfToken) {
            showNewRoomError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }

        var name = (newRoomNameInput && newRoomNameInput.value || '').trim();
        var desc = (newRoomDescInput && newRoomDescInput.value || '').trim();
        var isPrivate = !!(newRoomPrivateInp && newRoomPrivateInp.checked);

        // Kliens-validáció (a server az autoritatív, de gyors UX-feedback).
        if (name.length < 2 || name.length > 30) {
            showNewRoomError('A szoba neve 2–30 karakter lehet.');
            return;
        }
        if (desc.length > 200) {
            showNewRoomError('A leírás legfeljebb 200 karakter lehet.');
            return;
        }
        clearNewRoomError();

        if (newRoomSubmitBtn) {
            newRoomSubmitBtn.disabled = true;
            newRoomSubmitBtn.textContent = 'Létrehozás…';
        }

        jsonFetch('api/rooms.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token:  state.csrfToken,
                name:        name,
                description: desc,
                is_private:  isPrivate
            })
        }).then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success || !res.body.room) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Szoba létrehozása sikertelen.';
                showNewRoomError(msg);
                if (newRoomSubmitBtn) {
                    newRoomSubmitBtn.disabled = false;
                    newRoomSubmitBtn.textContent = 'Létrehozás';
                }
                return;
            }
            var newRoom = res.body.room;
            // Reload + render, majd váltás az új szobára.
            loadRooms().then(function () {
                applyLoadedRooms();
                // Találjuk meg a frissen letöltött room-objektumot (member_count
                // már a server szerinti).
                var found = null;
                for (var i = 0; i < state.rooms.length; i++) {
                    if (state.rooms[i].id === newRoom.id) { found = state.rooms[i]; break; }
                }
                closeNewRoomModal();
                switchToRoom(found || newRoom);
            }).catch(function (err) {
                // A létrehozás sikerült, de a list-fetch elszállt — ne nyeljük el.
                showError('Szoba létrejött, de a lista frissítése sikertelen: '
                          + (err && err.message ? err.message : 'ismeretlen hiba'));
                closeNewRoomModal();
            });
        }).catch(function (err) {
            showNewRoomError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
            if (newRoomSubmitBtn) {
                newRoomSubmitBtn.disabled = false;
                newRoomSubmitBtn.textContent = 'Létrehozás';
            }
        });
    }

    // ----- US-017: visualViewport finomhangolás (iOS Safari keyboard) ------
    function attachVisualViewport() {
        if (!('visualViewport' in window) || !window.visualViewport) {
            return; // 100dvh fallback amúgy is működik.
        }
        var vv = window.visualViewport;
        var apply = function () {
            // Body magasságát a visible viewport-höz igazítjuk — keyboard-nál nem fut le az input.
            document.body.style.height = vv.height + 'px';
        };
        vv.addEventListener('resize', apply);
        vv.addEventListener('scroll', apply);
        apply();
    }

    function attachInputFocusReset() {
        // US-017: iOS Safari keyboard fókuszon a body scrollTop felfelé csúszhat.
        var resetScroll = function () {
            window.scrollTo(0, 0);
            if (document.body) { document.body.scrollTop = 0; }
            // Görgessük az üzenet listát is az aljához, hogy az utolsó üzenet látszódjon.
            scrollMessagesToBottom();
        };
        if (messageInput) {
            messageInput.addEventListener('focus', resetScroll);
        }
    }

    // US-011: AudioContext priming — Safari/Chrome user-gesture nélkül blokkolja
    // a hangot. Az első user-gesture-en (input focus, click) létrehozzuk és
    // resume-oljuk, hogy a későbbi (polling-tick-ből triggerelt) beep szóljon.
    function attachAudioPriming() {
        var primed = false;
        var prime = function () {
            if (primed) { return; }
            primed = true;
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) { return; }
                if (!state.audioCtx) { state.audioCtx = new Ctx(); }
                if (state.audioCtx.state === 'suspended'
                    && typeof state.audioCtx.resume === 'function') {
                    state.audioCtx.resume();
                }
            } catch (e) { /* silent */ }
        };
        // Egyszer kell csak primelni — { once: true } ha támogatja, különben
        // a `primed` flag védi a duplikációt.
        document.addEventListener('click',    prime, true);
        document.addEventListener('keydown',  prime, true);
        document.addEventListener('touchend', prime, true);
    }

    // ----- US-012: Üzenet keresés -----------------------------------------
    function openSearchPanel() {
        if (!searchPanel) { return; }
        state.searchOpen = true;
        searchPanel.classList.add('open');
        searchPanel.setAttribute('aria-hidden', 'false');
        if (searchBtn) { searchBtn.setAttribute('aria-expanded', 'true'); }
        // Mobilon a sidebar nyitva lehet — csukjuk be, hogy a search panel látszódjon.
        closeSidebars();
        // Fókusz a kis késleltetés után, hogy a CSS transition már elkezdődött legyen.
        window.setTimeout(function () {
            if (searchInput) { searchInput.focus(); }
        }, 30);
        renderSearchStatus(); // friss állapot ('Írj legalább 3 karaktert…')
    }

    function closeSearchPanel() {
        if (!searchPanel) { return; }
        state.searchOpen = false;
        searchPanel.classList.remove('open');
        searchPanel.setAttribute('aria-hidden', 'true');
        if (searchBtn) { searchBtn.setAttribute('aria-expanded', 'false'); }
        if (state.searchDebounceId) {
            window.clearTimeout(state.searchDebounceId);
            state.searchDebounceId = null;
        }
    }

    function toggleSearchPanel() {
        if (state.searchOpen) {
            closeSearchPanel();
        } else {
            openSearchPanel();
        }
    }

    function renderSearchStatus(text) {
        if (!searchStatus) { return; }
        if (typeof text === 'undefined' || text === null) {
            var raw = searchInput ? searchInput.value.trim() : '';
            if (raw.length === 0) {
                text = '';
            } else if (raw.length < SEARCH_MIN_LENGTH) {
                text = 'Írj legalább ' + SEARCH_MIN_LENGTH + ' karaktert a kereséshez.';
            } else {
                text = '';
            }
        }
        searchStatus.textContent = text || '';
    }

    function clearSearchResults() {
        if (searchResults) { searchResults.innerHTML = ''; }
    }

    function onSearchInput() {
        if (state.searchDebounceId) {
            window.clearTimeout(state.searchDebounceId);
            state.searchDebounceId = null;
        }
        var raw = searchInput ? searchInput.value.trim() : '';
        if (raw.length < SEARCH_MIN_LENGTH) {
            // Kevés karakter — eredmények ürítése + hint a státuszban.
            clearSearchResults();
            renderSearchStatus();
            return;
        }
        renderSearchStatus('Keresés…');
        state.searchDebounceId = window.setTimeout(function () {
            state.searchDebounceId = null;
            doSearch(raw);
        }, SEARCH_DEBOUNCE_MS);
    }

    function onSearchSubmit(ev) {
        if (ev) { ev.preventDefault(); }
        if (state.searchDebounceId) {
            window.clearTimeout(state.searchDebounceId);
            state.searchDebounceId = null;
        }
        var raw = searchInput ? searchInput.value.trim() : '';
        if (raw.length < SEARCH_MIN_LENGTH) {
            renderSearchStatus();
            return;
        }
        doSearch(raw);
    }

    function doSearch(rawQuery) {
        if (!state.currentRoom) { return; }
        var roomId = state.currentRoom.id;
        var seq    = ++state.searchSeq;
        state.searchInFlight = true;
        renderSearchStatus('Keresés…');

        var url = 'api/messages.php?action=search'
                + '&room_id=' + encodeURIComponent(roomId)
                + '&q='       + encodeURIComponent(rawQuery);

        jsonFetch(url).then(function (res) {
            // Stale válasz dropolás (ha közben új keresés indult, vagy szobát váltottunk).
            if (seq !== state.searchSeq) { return; }
            if (!state.currentRoom || state.currentRoom.id !== roomId) { return; }
            state.searchInFlight = false;

            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'A keresés sikertelen.';
                renderSearchStatus(msg);
                clearSearchResults();
                return;
            }

            var msgs = Array.isArray(res.body.messages) ? res.body.messages : [];
            var roomName = (res.body.room && res.body.room.name)
                ? res.body.room.name
                : (state.currentRoom.is_dm ? dmDisplayName(state.currentRoom) : state.currentRoom.name);
            renderSearchResults(msgs, rawQuery, roomName);
        }).catch(function () {
            if (seq !== state.searchSeq) { return; }
            state.searchInFlight = false;
            renderSearchStatus('Hálózati hiba a keresés közben.');
            clearSearchResults();
        });
    }

    function renderSearchResults(messages, query, roomName) {
        clearSearchResults();
        if (!messages || messages.length === 0) {
            renderSearchStatus('Nincs találat.');
            return;
        }
        renderSearchStatus(messages.length + ' találat.');
        messages.forEach(function (m) {
            searchResults.appendChild(createSearchResultItem(m, query, roomName));
        });
    }

    function createSearchResultItem(m, query, roomName) {
        var item = document.createElement('div');
        item.className = 'search-result';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.dataset.messageId = String(m.id);

        var meta = document.createElement('div');
        meta.className = 'search-result-meta';

        var who = document.createElement('span');
        who.className = 'search-result-username';
        who.textContent = m.is_self ? '(Te)' : (m.username || 'ismeretlen');
        meta.appendChild(who);

        var room = document.createElement('span');
        room.className = 'search-result-room';
        room.textContent = roomName || '';
        meta.appendChild(room);

        var time = document.createElement('span');
        time.className = 'search-result-time';
        time.textContent = formatSearchDate(m.created_ts);
        meta.appendChild(time);

        var snippet = document.createElement('div');
        snippet.className = 'search-result-snippet';
        snippet.innerHTML = buildHighlightedSnippet(m.content, query);
        item.appendChild(meta);
        item.appendChild(snippet);

        item.addEventListener('click', function () { jumpToSearchResult(m.id); });
        item.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                jumpToSearchResult(m.id);
            }
        });
        return item;
    }

    function formatSearchDate(ts) {
        if (!ts || isNaN(ts)) { return ''; }
        var d = new Date(ts * 1000);
        var y = d.getFullYear();
        var mo = String(d.getMonth() + 1).padStart(2, '0');
        var da = String(d.getDate()).padStart(2, '0');
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return y + '-' + mo + '-' + da + ' ' + hh + ':' + mm;
    }

    // Snippet készítése: ha a tartalom hosszú, a találat köré szűkítjük (radius-os ablak).
    // A query előfordulásait <mark>-kal körbeszedjük. XSS-védelem: minden szegmens
    // (match és nem-match egyaránt) escapeHtml-en megy át — a <mark> tag az ÖSSZE-
    // állítás során kerül be sterilizált tartalom köré, így soha nem jut nyers
    // HTML a kimenetbe. NEM regex-elünk az escape-elt szövegen, mert akkor pl. egy
    // `<` betűt tartalmazó query nem matchelne (escape után `&lt;` lenne) — helyette
    // a NYERS szövegben keresünk indexOf-fel, és aztán csak a kimenetet escape-eljük.
    function buildHighlightedSnippet(content, query) {
        var raw = String(content || '');
        var q   = String(query   || '');
        if (q === '') { return escapeHtml(raw); }

        var lcRaw = raw.toLowerCase();
        var lcQ   = q.toLowerCase();
        var first = lcRaw.indexOf(lcQ);
        var prefix = '', suffix = '';
        var windowed = raw;

        // Ha hosszú a tartalom, vágjunk a találat köré egy ablakot.
        if (first >= 0 && raw.length > SEARCH_SNIPPET_RADIUS * 2 + q.length) {
            var start = Math.max(0, first - SEARCH_SNIPPET_RADIUS);
            var end   = Math.min(raw.length, first + q.length + SEARCH_SNIPPET_RADIUS);
            if (start > 0) { prefix = '… '; }
            if (end < raw.length) { suffix = ' …'; }
            windowed = raw.substring(start, end);
        }

        var lcWindowed = windowed.toLowerCase();
        var qLen = q.length;
        var out = '';
        var i = 0;
        while (i < windowed.length) {
            var idx = lcWindowed.indexOf(lcQ, i);
            if (idx < 0) {
                out += escapeHtml(windowed.substring(i));
                break;
            }
            if (idx > i) {
                out += escapeHtml(windowed.substring(i, idx));
            }
            out += '<mark>' + escapeHtml(windowed.substring(idx, idx + qLen)) + '</mark>';
            i = idx + qLen;
        }
        return escapeHtml(prefix) + out + escapeHtml(suffix);
    }

    function jumpToSearchResult(messageId) {
        closeSearchPanel();
        var el = messagesList.querySelector('[data-message-id="' + messageId + '"]');
        if (!el) {
            // Az üzenet nincs a látható listában (pl. utolsó 50-en kívül régi).
            // A kliens nem tölti most vissza a régebbi üzeneteket — szóljunk a usernek.
            showError('Az üzenet túl régi a jelenlegi nézethez. Görgess vissza, vagy frissítsd az oldalt.');
            return;
        }
        clearError();
        try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            // Régi böngészők — fallback discrete scrollIntoView opciók nélkül.
            el.scrollIntoView();
        }
        // Vizuális kiemelés — sárga pulse a megnyitott találaton.
        el.classList.remove('is-search-target'); // restart, ha újra kattintottak
        // Force reflow, hogy az animáció újrainduljon.
        void el.offsetWidth; // eslint-disable-line no-void
        el.classList.add('is-search-target');
        window.setTimeout(function () {
            el.classList.remove('is-search-target');
        }, 2600);
    }

    // ----- US-014: Gépelés jelző (typing indicator) ------------------------
    // Szerver-felé: throttled POST minden tényleges input-eseménynél, de max
    // 1 / TYPING_THROTTLE_MS (2 mp). A server timestamp természetesen kifut
    // a 3 mp-es ablakból, ha a felhasználó leáll — nincs külön "leállt"-jelzés.
    function maybeSendTyping() {
        if (!state.currentRoom) { return; }
        if (!state.csrfToken)   { return; }
        // Üres mezőre / csak whitespace-re NE küldjünk typing-jelet.
        if (messageInput.value.trim() === '') { return; }

        var now = Date.now();
        if ((now - state.lastTypingPostAt) < TYPING_THROTTLE_MS) {
            return;
        }
        state.lastTypingPostAt = now;

        var roomId = state.currentRoom.id;
        jsonFetch('api/messages.php?action=typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token: state.csrfToken,
                room_id:    roomId
            })
        }).then(function (res) {
            if (res && res.status === 401) {
                stopPolling();
                stopUsersPolling();
                redirectToLogin();
            }
            // Egyéb hibára csendben — typing nem kritikus.
        }).catch(function () {
            // Hálózati hiba → következő input-event majd újrapróbálkozik.
        });
    }

    // Render: a server által küldött `typing` username-listából formázzuk a
    // látható szöveget. AC szerint: 1 név → 'X gépel', 2 név → 'X és Y gépelnek',
    // 3 név → 'X, Y és Z gépelnek', 4+ név → 'N felhasználó gépel'. Az animált
    // pontokat (`...`) PURE CSS oldja meg, csak a szöveg-részt állítjuk JS-ből.
    function renderTypingIndicator(typing) {
        if (!typingIndicator || !typingText) { return; }
        var list = Array.isArray(typing) ? typing : [];
        // Defenzív dedup (ha valaha mégis duplikálnánk a listán).
        var seen = {};
        var names = [];
        for (var i = 0; i < list.length; i++) {
            var n = String(list[i] || '').trim();
            if (n === '' || seen[n]) { continue; }
            seen[n] = true;
            names.push(n);
        }
        state.typingUsers = names;

        if (names.length === 0) {
            typingIndicator.hidden = true;
            typingText.textContent = '';
            return;
        }

        var msg;
        if (names.length === 1) {
            msg = names[0] + ' gépel';
        } else if (names.length === 2) {
            msg = names[0] + ' és ' + names[1] + ' gépelnek';
        } else if (names.length === 3) {
            msg = names[0] + ', ' + names[1] + ' és ' + names[2] + ' gépelnek';
        } else {
            // AC: max 3 név, fölötte 'N felhasználó gépel...'
            msg = names.length + ' felhasználó gépel';
        }
        typingText.textContent = msg;
        typingIndicator.hidden = false;
    }

    function clearTypingIndicator() {
        renderTypingIndicator([]);
    }

    // ----- US-016: Privát szoba meghívás -----------------------------------
    // A '+ Meghívás' gomb csak privát, NEM-DM aktív szobánál látszik. DM-nél
    // értelmetlen (mindig 2 fős), publikusnál bárki csatlakozhat (US-006), így
    // ott is elrejtjük a gombot. A láthatóságot a switchToRoom hívja minden
    // szobaváltásnál — a kezdeti load (Lobby) ezzel automatikusan rejtett.
    function applyInviteButtonVisibility(room) {
        if (!inviteBtn) { return; }
        var show = !!(room && room.is_private && !room.is_dm);
        inviteBtn.hidden = !show;
    }

    function showInviteError(msg) {
        if (!inviteError) { return; }
        inviteError.textContent = msg;
        inviteError.classList.add('visible');
    }
    function clearInviteError() {
        if (!inviteError) { return; }
        inviteError.textContent = '';
        inviteError.classList.remove('visible');
    }
    function showInviteSuccess(msg) {
        if (!inviteSuccess) { return; }
        inviteSuccess.textContent = msg;
        inviteSuccess.hidden = false;
        inviteSuccess.classList.add('visible');
    }
    function clearInviteSuccess() {
        if (!inviteSuccess) { return; }
        inviteSuccess.textContent = '';
        inviteSuccess.hidden = true;
        inviteSuccess.classList.remove('visible');
    }

    function openInviteModal() {
        if (!inviteModal) { return; }
        var room = state.currentRoom;
        if (!room || !room.is_private || room.is_dm) {
            // Védő — a gomb amúgy is rejtett ezekben az esetekben.
            return;
        }
        clearInviteError();
        clearInviteSuccess();
        clearInviteSuggestions();
        clearInviteSelected();
        if (inviteSearchInput) { inviteSearchInput.value = ''; }
        if (inviteSubmitBtn)   { inviteSubmitBtn.disabled = true; }
        state.inviteOpen   = true;
        state.inviteRoomId = room.id;
        state.inviteMemberIds = {};
        if (inviteRoomNameEl) {
            inviteRoomNameEl.textContent = '🔒 ' + room.name;
        }
        renderInviteMembersLoading();
        inviteModal.hidden = false;
        closeSidebars();
        // Töltsük le a tagokat — a modal-ban kiszürkítjük őket az autocomplete-ben
        // és listában megjelenítjük.
        loadInviteMembers(room.id);
        window.setTimeout(function () {
            if (inviteSearchInput) { inviteSearchInput.focus(); }
        }, 30);
    }

    function closeInviteModal() {
        if (!inviteModal) { return; }
        inviteModal.hidden = true;
        state.inviteOpen = false;
        state.inviteRoomId = 0;
        state.inviteSelectedUser = null;
        state.inviteMemberIds = {};
        if (state.inviteSearchDebounceId) {
            window.clearTimeout(state.inviteSearchDebounceId);
            state.inviteSearchDebounceId = null;
        }
        state.inviteSearchSeq++; // dropoljon le minden in-flight választ
        clearInviteSuggestions();
        clearInviteSelected();
        clearInviteError();
        clearInviteSuccess();
        if (inviteSubmitBtn) {
            inviteSubmitBtn.disabled = true;
            inviteSubmitBtn.textContent = 'Meghívás';
        }
    }

    function renderInviteMembersLoading() {
        if (!inviteMembersList) { return; }
        inviteMembersList.innerHTML = '';
        var li = document.createElement('li');
        li.className = 'invite-members-loading';
        li.textContent = 'Betöltés…';
        inviteMembersList.appendChild(li);
    }

    function renderInviteMembers(users) {
        if (!inviteMembersList) { return; }
        inviteMembersList.innerHTML = '';
        if (!users || users.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'invite-members-empty';
            empty.textContent = 'Még nincsenek tagok.';
            inviteMembersList.appendChild(empty);
            return;
        }
        users.forEach(function (u) {
            var li = document.createElement('li');
            li.textContent = u.username;
            inviteMembersList.appendChild(li);
        });
    }

    function loadInviteMembers(roomId) {
        if (!roomId) { return; }
        var url = 'api/rooms.php?action=members&room_id=' + encodeURIComponent(roomId);
        jsonFetch(url).then(function (res) {
            if (state.inviteRoomId !== roomId) { return; } // modal időközben becsukva / másik szoba
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'A tagok lekérdezése sikertelen.';
                showInviteError(msg);
                renderInviteMembers([]);
                return;
            }
            var users = Array.isArray(res.body.users) ? res.body.users : [];
            // Index a member id-k gyors lookup-jához az autocomplete-ben.
            state.inviteMemberIds = {};
            users.forEach(function (u) { state.inviteMemberIds[u.id] = true; });
            renderInviteMembers(users);
        }).catch(function () {
            if (state.inviteRoomId !== roomId) { return; }
            showInviteError('Hálózati hiba a tagok lekérdezésekor.');
            renderInviteMembers([]);
        });
    }

    function clearInviteSuggestions() {
        if (!inviteSuggestions) { return; }
        inviteSuggestions.innerHTML = '';
        inviteSuggestions.hidden = true;
    }

    function renderInviteSuggestionEmpty(text) {
        if (!inviteSuggestions) { return; }
        inviteSuggestions.innerHTML = '';
        var li = document.createElement('li');
        li.className = 'invite-suggestion-empty';
        li.textContent = text;
        inviteSuggestions.appendChild(li);
        inviteSuggestions.hidden = false;
    }

    function renderInviteSuggestions(users) {
        if (!inviteSuggestions) { return; }
        inviteSuggestions.innerHTML = '';
        if (!users || users.length === 0) {
            renderInviteSuggestionEmpty('Nincs találat.');
            return;
        }
        users.forEach(function (u) {
            var li = document.createElement('li');
            li.className = 'invite-suggestion';
            li.dataset.userId = String(u.id);
            li.dataset.username = u.username;
            li.setAttribute('role', 'option');

            var name = document.createElement('span');
            name.className = 'invite-suggestion-name';
            name.textContent = u.username;
            li.appendChild(name);

            if (state.inviteMemberIds[u.id]) {
                li.classList.add('is-member');
                var tag = document.createElement('span');
                tag.className = 'invite-suggestion-tag';
                tag.textContent = '(már tag)';
                li.appendChild(tag);
            } else {
                li.addEventListener('click', function () {
                    setInviteSelected({ id: u.id, username: u.username });
                });
            }
            inviteSuggestions.appendChild(li);
        });
        inviteSuggestions.hidden = false;
    }

    function setInviteSelected(user) {
        state.inviteSelectedUser = user;
        if (inviteSelectedName) { inviteSelectedName.textContent = user.username; }
        if (inviteSelected) {
            inviteSelected.hidden = false;
        }
        if (inviteSubmitBtn) { inviteSubmitBtn.disabled = false; }
        if (inviteSearchInput) { inviteSearchInput.value = ''; }
        clearInviteSuggestions();
        clearInviteError();
    }

    function clearInviteSelected() {
        state.inviteSelectedUser = null;
        if (inviteSelected) { inviteSelected.hidden = true; }
        if (inviteSelectedName) { inviteSelectedName.textContent = ''; }
        if (inviteSubmitBtn) { inviteSubmitBtn.disabled = true; }
    }

    function onInviteSearchInput() {
        if (state.inviteSearchDebounceId) {
            window.clearTimeout(state.inviteSearchDebounceId);
            state.inviteSearchDebounceId = null;
        }
        var raw = inviteSearchInput ? inviteSearchInput.value.trim() : '';
        if (raw.length < INVITE_SEARCH_MIN_LENGTH) {
            clearInviteSuggestions();
            return;
        }
        state.inviteSearchDebounceId = window.setTimeout(function () {
            state.inviteSearchDebounceId = null;
            doInviteSearch(raw);
        }, INVITE_SEARCH_DEBOUNCE_MS);
    }

    function doInviteSearch(query) {
        var seq = ++state.inviteSearchSeq;
        var url = 'api/users.php?action=search&q=' + encodeURIComponent(query);
        jsonFetch(url).then(function (res) {
            if (seq !== state.inviteSearchSeq) { return; } // stale drop
            if (!state.inviteOpen) { return; }
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                renderInviteSuggestionEmpty('A keresés sikertelen.');
                return;
            }
            renderInviteSuggestions(res.body.users || []);
        }).catch(function () {
            if (seq !== state.inviteSearchSeq) { return; }
            renderInviteSuggestionEmpty('Hálózati hiba.');
        });
    }

    function onInviteSubmit(ev) {
        if (ev) { ev.preventDefault(); }
        if (!state.csrfToken) {
            showInviteError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        var roomId = state.inviteRoomId;
        var user   = state.inviteSelectedUser;
        if (!roomId || !user) {
            showInviteError('Válassz ki egy felhasználót a kereséssel.');
            return;
        }
        clearInviteError();
        clearInviteSuccess();
        if (inviteSubmitBtn) {
            inviteSubmitBtn.disabled = true;
            inviteSubmitBtn.textContent = 'Meghívás…';
        }

        jsonFetch('api/rooms.php?action=invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token:      state.csrfToken,
                room_id:         roomId,
                invited_user_id: user.id
            })
        }).then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'A meghívás sikertelen.';
                showInviteError(msg);
                if (inviteSubmitBtn) {
                    inviteSubmitBtn.disabled = false;
                    inviteSubmitBtn.textContent = 'Meghívás';
                }
                return;
            }
            var invitedName = (res.body.invited && res.body.invited.username)
                ? res.body.invited.username : user.username;
            showInviteSuccess(invitedName + ' meghívása sikeres.');
            // Frissítsük a 'Már tag' listát + a member-id indexet, hogy a
            // következő autocomplete-keresés ne ajánlja fel ugyanezt a user-t újra.
            clearInviteSelected();
            if (inviteSubmitBtn) { inviteSubmitBtn.textContent = 'Meghívás'; }
            loadInviteMembers(roomId);
            // Sidebar member_count badge frissítés (a következő users-poll piggyback
            // amúgy is megtenné, de optimistikusan most rögtön).
            loadRooms().then(applyLoadedRooms).catch(function () { /* ignore */ });
        }).catch(function (err) {
            showInviteError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
            if (inviteSubmitBtn) {
                inviteSubmitBtn.disabled = false;
                inviteSubmitBtn.textContent = 'Meghívás';
            }
        });
    }

    // ----- Logout flow (US-003-ból, fenntartva) -----------------------------
    function onLogoutClick() {
        if (!state.csrfToken) {
            showError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        // Logout alatt ne pollozzunk tovább — különben a logout-fetch közben
        // egy 401-es poll-válasz pre-emptíven redirect-elhetne. US-007: az online
        // lista pollját is leállítjuk, hogy a server által beállított múltbéli
        // last_seen-t ne írja vissza egy hosszan futó messages-poll.
        stopPolling();
        stopUsersPolling();
        closeUserPopover(); // US-009: ne maradjon nyitott popover a logout után
        if (state.searchOpen) { closeSearchPanel(); } // US-012
        clearTypingIndicator(); // US-014: ne maradjon stale "X gépel..." a logout után
        if (state.inviteOpen) { closeInviteModal(); } // US-016
        logoutBtn.disabled = true;
        var textNode = logoutBtn.querySelector('.btn-logout-text');
        if (textNode) { textNode.textContent = 'Kijelentkezés…'; }

        submitLogout().then(function (res) {
            if (res.body && res.body.success) {
                var target = res.body.redirect ? res.body.redirect : 'index.html';
                window.location.href = target;
                return;
            }
            var msg = (res.body && res.body.error) ? res.body.error : 'Kijelentkezés sikertelen.';
            showError(msg);
            logoutBtn.disabled = false;
            if (textNode) { textNode.textContent = 'Kijelentkezés'; }
        }).catch(function (err) {
            showError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
            logoutBtn.disabled = false;
            if (textNode) { textNode.textContent = 'Kijelentkezés'; }
        });
    }

    // ----- Page bootstrap ---------------------------------------------------
    function init() {
        // UI tiltás amíg a session check + CSRF + szobák be nem jönnek.
        logoutBtn.disabled = true;
        sendBtn.disabled = true;
        messageInput.disabled = true;

        attachVisualViewport();
        attachInputFocusReset();
        attachAudioPriming();

        // US-013: téma — érvényesítsük a perzisztált beállítást (a head-béli boot
        // script már átállította a html data-theme-jét, itt csak az ikon/ARIA
        // szinkron + click handler).
        applyTheme(getStoredTheme());
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        }

        // Hamburger gombok (mindig aktívak).
        if (toggleRoomsBtn) {
            toggleRoomsBtn.addEventListener('click', function () { toggleSidebar('left'); });
        }
        if (toggleUsersBtn) {
            toggleUsersBtn.addEventListener('click', function () { toggleSidebar('right'); });
        }
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', closeSidebars);
        }

        // Input UX.
        messageInput.addEventListener('input', function () {
            updateCharCounter();
            autoGrowInput();
            // US-014: gépelés jelző — throttled POST (max 1 / 2 mp).
            maybeSendTyping();
        });
        // Enter küld, Shift+Enter sort tör.
        messageInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    if (typeof messageForm.requestSubmit === 'function') {
                        messageForm.requestSubmit();
                    } else {
                        messageForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                }
            }
        });
        messageForm.addEventListener('submit', function (ev) {
            ev.preventDefault();
            onSendMessage();
        });

        logoutBtn.addEventListener('click', onLogoutClick);

        // US-006: új szoba modal események.
        if (newRoomBtn) {
            newRoomBtn.addEventListener('click', openNewRoomModal);
        }
        if (newRoomCloseBtn) {
            newRoomCloseBtn.addEventListener('click', closeNewRoomModal);
        }
        if (newRoomCancelBtn) {
            newRoomCancelBtn.addEventListener('click', closeNewRoomModal);
        }
        if (newRoomForm) {
            newRoomForm.addEventListener('submit', onNewRoomSubmit);
        }
        if (newRoomModal) {
            // Backdrop kattintás → bezárás (a tartalmon belül NE).
            newRoomModal.addEventListener('click', function (ev) {
                if (ev.target === newRoomModal) {
                    closeNewRoomModal();
                }
            });
        }
        // Esc → modal close.
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && newRoomModal && !newRoomModal.hidden) {
                closeNewRoomModal();
            }
        });

        // US-016: meghívó modal események.
        if (inviteBtn) {
            inviteBtn.addEventListener('click', openInviteModal);
        }
        if (inviteCloseBtn) {
            inviteCloseBtn.addEventListener('click', closeInviteModal);
        }
        if (inviteCancelBtn) {
            inviteCancelBtn.addEventListener('click', closeInviteModal);
        }
        if (inviteForm) {
            inviteForm.addEventListener('submit', onInviteSubmit);
        }
        if (inviteSearchInput) {
            inviteSearchInput.addEventListener('input', onInviteSearchInput);
            // Esc fókuszálva törli a kiválasztást ha van, különben becsukja a modal-t.
            inviteSearchInput.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape') {
                    if (state.inviteSelectedUser) {
                        ev.preventDefault();
                        clearInviteSelected();
                        return;
                    }
                    ev.preventDefault();
                    closeInviteModal();
                }
            });
        }
        if (inviteSelectedClearBtn) {
            inviteSelectedClearBtn.addEventListener('click', function () {
                clearInviteSelected();
                if (inviteSearchInput) { inviteSearchInput.focus(); }
            });
        }
        if (inviteModal) {
            // Backdrop kattintás (a tartalmon kívül) → bezárás.
            inviteModal.addEventListener('click', function (ev) {
                if (ev.target === inviteModal) { closeInviteModal(); }
            });
        }
        // Esc → invite modal close (a newRoomModal kezelője külön).
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && inviteModal && !inviteModal.hidden) {
                closeInviteModal();
            }
        });

        // US-012: keresés események.
        if (searchBtn) {
            searchBtn.addEventListener('click', toggleSearchPanel);
        }
        if (searchCloseBtn) {
            searchCloseBtn.addEventListener('click', closeSearchPanel);
        }
        if (searchInput) {
            searchInput.addEventListener('input', onSearchInput);
            searchInput.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    closeSearchPanel();
                }
            });
        }
        if (searchForm) {
            searchForm.addEventListener('submit', onSearchSubmit);
        }
        // Esc globálisan (akkor is csukódjon, ha a fókusz nem az inputon van).
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && state.searchOpen) {
                closeSearchPanel();
            }
        });

        // Bootstrap láncolat.
        checkSession().then(function (user) {
            if (!user) { return; }              // checkSession már átirányított.
            state.currentUser = user;
            usernameLabel.textContent = user.username;

            return loadCsrfToken().then(function () {
                return loadRooms();
            }).then(function (rooms) {
                // Lobby keresése — alapértelmezett aktív szoba.
                var lobby = null;
                for (var i = 0; i < rooms.length; i++) {
                    if (rooms[i].name === 'Lobby') { lobby = rooms[i]; break; }
                }
                if (!lobby && rooms.length > 0) {
                    lobby = rooms[0]; // fallback
                }
                if (!lobby) {
                    showError('Nincs elérhető szoba — a Lobby hiányzik. Futtasd újra az init_db.php-t.');
                    return;
                }
                state.currentRoom = lobby;
                currentRoomName.textContent = lobby.name;
                applyInviteButtonVisibility(lobby); // US-016: bootstrap láthatóság (Lobby publikus → rejtett)
                applyLoadedRooms(); // US-011: első loadRooms — baseline snapshot + tab cím
                logoutBtn.disabled = false;
                messageInput.disabled = false;
                updateCharCounter();
                // Lobby is publikus → auto-join silent, hogy a member_count badge
                // a tényleges látogatókat tükrözze (idempotens INSERT IGNORE).
                if (!lobby.is_private) {
                    joinRoom(lobby.id);
                }
                return loadAndRenderMessages(lobby.id);
            });
        }).catch(function (err) {
            showError('Inicializációs hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
        });
    }

    // DOM kész? — a script a body végén van, de védjük magunkat.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
