// MiniChat — téma váltás (US-013).
// Sötét/világos téma `data-theme` attribútumot tesz a <html>-re.
// A kezdő applyTheme() szinkronban fut (ez a script head-ben van <script src>),
// így az első festéskor már a helyes téma van érvényben — nincs FOUC.

(function () {
    'use strict';

    var STORAGE_KEY = 'minichat.theme';
    var DARK = 'dark';
    var LIGHT = 'light';

    function readStoredTheme() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === DARK ? DARK : LIGHT;
        } catch (e) {
            return LIGHT;
        }
    }

    function storeTheme(theme) {
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) { /* private mode — ignorálunk */ }
    }

    function applyTheme(theme) {
        var root = document.documentElement;
        if (theme === DARK) {
            root.setAttribute('data-theme', DARK);
        } else {
            root.removeAttribute('data-theme');
        }
        var btn = document.getElementById('theme-toggle');
        if (!btn) return;
        var isDark = theme === DARK;
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.setAttribute('title', isDark ? 'Váltás világos témára' : 'Váltás sötét témára');
        var icon = btn.querySelector('.theme-toggle__icon');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        var label = btn.querySelector('.theme-toggle__label');
        if (label) label.textContent = isDark ? 'Világos téma' : 'Sötét téma';
    }

    var current = readStoredTheme();
    applyTheme(current);

    function toggle() {
        current = (current === DARK) ? LIGHT : DARK;
        storeTheme(current);
        applyTheme(current);
    }

    function wireUp() {
        // Újra applyTheme, hogy a gomb UI-ja szinkronban legyen a DOM-mal.
        applyTheme(current);
        var btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', toggle);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireUp);
    } else {
        wireUp();
    }
})();
