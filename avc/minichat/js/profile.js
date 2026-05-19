/**
 * MiniChat — Profil oldal (US-008)
 *
 * Page bootstrap:
 *   1) GET api/auth.php?action=session — ha logged_in:false → redirect index.html.
 *   2) GET api/auth.php?action=csrf_token — token a két POST formhoz.
 *   3) GET api/users.php?action=me — saját adatok kitöltése (username, email, bio, avatar_url).
 *
 * Profil mentés (#profileForm):
 *   POST api/users.php?action=update_profile {csrf_token, email, bio, avatar_url}
 *   Sikerre zöld 'Profil frissítve!' üzenet.
 *
 * Jelszó módosítás (#passwordForm):
 *   POST api/users.php?action=change_password {csrf_token, old_password, new_password, new_password_confirm}
 *   Sikerre zöld inline üzenet, mezők ürítése.
 *
 * Avatar URL preview:
 *   onInput → ha üres → default avatar (CSS kör + kezdőbetű).
 *             ha kitöltve → <img src=URL>; onerror visszavált a default-ra.
 */
(function () {
    'use strict';

    var BIO_MAX_LENGTH = 200;

    var $ = function (id) { return document.getElementById(id); };

    // ----- DOM hivatkozások -------------------------------------------------
    var errorBanner    = $('errorBanner');
    var successBanner  = $('successBanner');

    var avatarWrap     = $('avatarWrap');
    var avatarDefault  = $('avatarDefault');
    var avatarPreview  = $('avatarPreview');
    var usernameDisp   = $('usernameDisplay');

    var profileForm    = $('profileForm');
    var profileUser    = $('profileUsername');
    var profileEmail   = $('profileEmail');
    var profileBio     = $('profileBio');
    var profileAvatar  = $('profileAvatar');
    var profileSubmit  = $('profileSubmit');
    var bioCounter     = $('bioCounter');

    var passwordForm    = $('passwordForm');
    var oldPasswordInp  = $('oldPassword');
    var newPasswordInp  = $('newPassword');
    var newPasswordConf = $('newPasswordConfirm');
    var passwordSubmit  = $('passwordSubmit');
    var passwordError   = $('passwordError');
    var passwordSuccess = $('passwordSuccess');

    // US-013: téma váltó (világos ↔ sötét).
    var themeToggleBtn  = $('themeToggleBtn');
    var themeToggleIcon = $('themeToggleIcon');

    // ----- Állapot ----------------------------------------------------------
    var state = {
        csrfToken: '',
        currentUser: null  // {id, username, email, bio, avatar_url}
    };

    // ----- Util-ok ----------------------------------------------------------
    function showError(msg) {
        errorBanner.textContent = msg;
        errorBanner.classList.add('visible');
        successBanner.classList.remove('visible');
    }
    function clearError() {
        errorBanner.textContent = '';
        errorBanner.classList.remove('visible');
    }
    function showSuccess(msg) {
        successBanner.textContent = msg;
        successBanner.classList.add('visible');
        errorBanner.classList.remove('visible');
    }
    function clearSuccess() {
        successBanner.textContent = '';
        successBanner.classList.remove('visible');
    }
    function showPasswordError(msg) {
        passwordError.textContent = msg;
        passwordError.classList.add('visible');
        passwordSuccess.classList.remove('visible');
    }
    function clearPasswordError() {
        passwordError.textContent = '';
        passwordError.classList.remove('visible');
    }
    function showPasswordSuccess(msg) {
        passwordSuccess.textContent = msg;
        passwordSuccess.classList.add('visible');
        passwordError.classList.remove('visible');
    }

    function redirectToLogin() {
        window.location.href = 'index.html';
    }

    // ----- US-013: téma váltás (megosztott logika a chat.js-szel) -----------
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
        var root = document.documentElement;
        root.classList.add('theme-transitioning');
        applyTheme(next);
        window.setTimeout(function () {
            root.classList.remove('theme-transitioning');
        }, 350);
    }

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

    // ----- Bootstrap láncolat -----------------------------------------------
    function checkSession() {
        return jsonFetch('api/auth.php?action=session').then(function (res) {
            if (!res.body || !res.body.success || !res.body.logged_in) {
                redirectToLogin();
                return null;
            }
            return res.body.user || null;
        }).catch(function () {
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

    function loadProfile() {
        return jsonFetch('api/users.php?action=me').then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return null;
            }
            if (!res.body || !res.body.success || !res.body.user) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Profil betöltése sikertelen.';
                throw new Error(msg);
            }
            state.currentUser = res.body.user;
            fillProfileForm(res.body.user);
            return res.body.user;
        });
    }

    function fillProfileForm(user) {
        if (usernameDisp) { usernameDisp.textContent = user.username || ''; }
        if (profileUser)  { profileUser.value  = user.username || ''; }
        if (profileEmail) { profileEmail.value = user.email    || ''; }
        if (profileBio)   { profileBio.value   = user.bio      || ''; }
        if (profileAvatar){ profileAvatar.value = user.avatar_url || ''; }
        updateAvatarPreview();
        updateBioCounter();
    }

    // ----- Avatar preview ---------------------------------------------------
    function updateAvatarPreview() {
        var url  = (profileAvatar && profileAvatar.value || '').trim();
        var name = (state.currentUser && state.currentUser.username) || '?';
        // A default avatar mindig a felhasználónév első karaktere (CSS kör).
        if (avatarDefault) {
            avatarDefault.textContent = name.charAt(0).toUpperCase() || '?';
        }
        if (!url) {
            // Üres URL → default avatar.
            if (avatarPreview) {
                avatarPreview.hidden = true;
                avatarPreview.removeAttribute('src');
            }
            return;
        }
        if (avatarPreview) {
            avatarPreview.alt = (state.currentUser && state.currentUser.username) || '';
            avatarPreview.hidden = false;
            // onerror: ha nem tölthető be a kép, vissza a default-ra.
            avatarPreview.onerror = function () {
                avatarPreview.hidden = true;
                avatarPreview.removeAttribute('src');
                avatarPreview.onerror = null;
            };
            avatarPreview.src = url;
        }
    }

    // ----- Bio karakter számláló --------------------------------------------
    function updateBioCounter() {
        var len = (profileBio && profileBio.value || '').length;
        if (bioCounter) {
            bioCounter.textContent = len + '/' + BIO_MAX_LENGTH;
        }
    }

    // ----- Profil mentés ----------------------------------------------------
    function onProfileSubmit(ev) {
        if (ev) { ev.preventDefault(); }
        if (!state.csrfToken) {
            showError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        clearError();
        clearSuccess();

        var email     = (profileEmail.value  || '').trim();
        var bio       = (profileBio.value    || '').trim();
        var avatarUrl = (profileAvatar.value || '').trim();

        // Kliens-validáció (UX gyors visszajelzés). A server az autoritatív.
        if (email === '') {
            showError('Az email cím megadása kötelező.');
            return;
        }
        // Egyszerű email regex — csak nyilvánvaló typokat fog meg.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Érvénytelen email formátum.');
            return;
        }
        if (bio.length > BIO_MAX_LENGTH) {
            showError('A bemutatkozás legfeljebb ' + BIO_MAX_LENGTH + ' karakter lehet.');
            return;
        }
        if (avatarUrl !== '' && avatarUrl.toLowerCase().indexOf('https://') !== 0) {
            showError('Az avatar URL-nek https:// -vel kell kezdődnie.');
            return;
        }

        profileSubmit.disabled = true;
        profileSubmit.textContent = 'Mentés…';

        jsonFetch('api/users.php?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token: state.csrfToken,
                email:      email,
                bio:        bio,
                avatar_url: avatarUrl
            })
        }).then(function (res) {
            if (res.status === 401) {
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Profil mentése sikertelen.';
                showError(msg);
                return;
            }
            // Sikeres mentés — frissítsük a state-et és a username preview-t (ha kell).
            if (res.body.user) {
                state.currentUser = res.body.user;
                updateAvatarPreview();
            }
            showSuccess(res.body.message || 'Profil frissítve!');
            // Auto-hide a success banner-t pár másodperc után.
            window.setTimeout(clearSuccess, 4000);
        }).catch(function (err) {
            showError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
        }).then(function () {
            profileSubmit.disabled = false;
            profileSubmit.textContent = 'Mentés';
            updateProfileSubmitState();
        });
    }

    // ----- Jelszó módosítás -------------------------------------------------
    function onPasswordSubmit(ev) {
        if (ev) { ev.preventDefault(); }
        if (!state.csrfToken) {
            showPasswordError('Hiányzó CSRF token — frissítsd az oldalt.');
            return;
        }
        clearPasswordError();

        var oldP  = oldPasswordInp.value || '';
        var newP  = newPasswordInp.value || '';
        var newP2 = newPasswordConf.value || '';

        if (oldP === '' || newP === '' || newP2 === '') {
            showPasswordError('Minden jelszó mező kitöltése kötelező.');
            return;
        }
        if (newP.length < 6) {
            showPasswordError('Az új jelszó legalább 6 karakter legyen.');
            return;
        }
        if (newP !== newP2) {
            showPasswordError('A két új jelszó nem egyezik.');
            return;
        }

        passwordSubmit.disabled = true;
        passwordSubmit.textContent = 'Mentés…';

        jsonFetch('api/users.php?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csrf_token:           state.csrfToken,
                old_password:         oldP,
                new_password:         newP,
                new_password_confirm: newP2
            })
        }).then(function (res) {
            if (res.status === 401 && res.body && res.body.error
                && res.body.error.indexOf('Bejelentkezés') === 0) {
                // Auth-szintű 401 — session lejárt.
                redirectToLogin();
                return;
            }
            if (!res.body || !res.body.success) {
                var msg = (res.body && res.body.error) ? res.body.error
                                                       : 'Jelszó módosítás sikertelen.';
                showPasswordError(msg);
                return;
            }
            // Sikeres — ürítjük a mezőket és zöld inline üzenet.
            oldPasswordInp.value  = '';
            newPasswordInp.value  = '';
            newPasswordConf.value = '';
            showPasswordSuccess(res.body.message || 'Jelszó sikeresen módosítva!');
            window.setTimeout(function () {
                passwordSuccess.classList.remove('visible');
            }, 4000);
        }).catch(function (err) {
            showPasswordError('Hálózati hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
        }).then(function () {
            passwordSubmit.disabled = false;
            passwordSubmit.textContent = 'Jelszó módosítás';
            updatePasswordSubmitState();
        });
    }

    // ----- Submit gomb enable/disable (csak akkor aktív, ha minden mezőt kitöltött) -
    function updateProfileSubmitState() {
        if (!profileSubmit) { return; }
        var emailFilled = (profileEmail.value || '').trim().length > 0;
        // Bio és avatar opcionális — csak email kötelező.
        profileSubmit.disabled = !emailFilled;
    }

    function updatePasswordSubmitState() {
        if (!passwordSubmit) { return; }
        var allFilled = (oldPasswordInp.value || '').length > 0
                     && (newPasswordInp.value || '').length > 0
                     && (newPasswordConf.value || '').length > 0;
        passwordSubmit.disabled = !allFilled;
    }

    // ----- Page bootstrap ---------------------------------------------------
    function init() {
        // US-013: téma érvényesítése + click handler.
        applyTheme(getStoredTheme());
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        }

        // Esemény-figyelők.
        if (profileForm) { profileForm.addEventListener('submit', onProfileSubmit); }
        if (passwordForm) { passwordForm.addEventListener('submit', onPasswordSubmit); }

        if (profileBio) {
            profileBio.addEventListener('input', updateBioCounter);
        }
        if (profileAvatar) {
            profileAvatar.addEventListener('input', updateAvatarPreview);
        }
        if (profileEmail) {
            profileEmail.addEventListener('input', updateProfileSubmitState);
        }
        // Jelszó form mezők → submit gomb enable/disable.
        [oldPasswordInp, newPasswordInp, newPasswordConf].forEach(function (el) {
            if (el) { el.addEventListener('input', updatePasswordSubmitState); }
        });

        // Bootstrap láncolat: session → CSRF → profile load.
        checkSession().then(function (user) {
            if (!user) { return; }   // checkSession már átirányított.
            return loadCsrfToken().then(function () {
                return loadProfile();
            }).then(function () {
                updateProfileSubmitState();
                updatePasswordSubmitState();
            });
        }).catch(function (err) {
            showError('Inicializációs hiba: ' + (err && err.message ? err.message : 'ismeretlen'));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
