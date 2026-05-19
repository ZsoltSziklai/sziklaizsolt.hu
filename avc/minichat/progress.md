# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### CSS animation újraindítása el/megmutatott elemen

Ha egy elem `display:none` → visible váltáson megy keresztül (pl. `hidden` attribútum
levétele), a CSS `animation:` shorthand NEM minden böngészőben indul újra
megbízhatóan. A tünet: az animáció `from` keyframe-jénél fagy (opacity:0,
translateY frozen), `animationend` nem sül el.

**Megoldás**: az animációt külön CSS osztállyal (pl. `.is-opening`) tedd rá,
és a JS-ben a nyitáskor vedd le, erőltess reflow-t (`void el.offsetWidth`), majd
tedd vissza az osztályt. Így az animáció minden nyitáskor garantáltan 0-ról indul.
Példa: `src/js/chat.js` `openSearchPanel()` + `src/css/style.css` `.search-panel.is-opening`.

---

## 2026-04-22 - BUG-012-2

- CSS animation fix a keresőpanelre (US-012 AC1 retest FAIL)
- Files changed:
  - `src/css/style.css`: `animation:` property levéve a base `.search-panel` szabályról, áthelyezve új `.search-panel.is-opening` osztályra
  - `src/js/chat.js`: `openSearchPanel()` most levesz+reflow+hozzátesz `is-opening` osztályt; `closeSearchPanel()` leveszi az osztályt
- **Learnings:**
  - A `display:none` → `display:flex` váltás (pl. `hidden` attribútum toggle-lel) nem triggereli megbízhatóan a base szelektoron lévő CSS `animation:` szabályt — animation stuck a `from` keyframe-en, `animationend` nem sül el
  - A megbízható pattern: animáció osztály-alapú trigger + manuális reflow kikényszerítés (`void element.offsetWidth`), hogy a böngésző új animation run-t indítson
  - Natural state (opacity:1, transform:none) ugyanakkor azonnal látható, így ha az animáció fail-elne is, a panel használható marad
---

## 2026-04-22 - US-012 (already complete — verification)

- US-012 üzenet keresés már korábbi iterációkban implementálva lett; a mai átnézéskor minden AC (1–8) teljesül, kódváltozás nem szükséges.
- Érintett komponensek (ellenőrzés forrásai):
  - `src/api/messages.php` `case 'search'` (360–435) — prepared statement `WHERE m.room_id = :rid AND m.content LIKE :q`, LIKE wildcard (`%`, `_`, `\`) escape, room-access check, min 3 karakter szerveroldali validáció is.
  - `src/chat.html` 28–33 (search icon), 62–72 (search panel + results container).
  - `src/css/style.css` 735–868 (search panel + `.is-opening` slide-down, `.search-result` card, `mark` yellow highlight, `message--highlight` flash animáció).
  - `src/js/chat.js` 781–1014 (`highlightHtml`, `performSearch` debounce+seq, `buildSearchResult`, `jumpToMessage` scrollIntoView + kiemelés, `openSearchPanel`/`closeSearchPanel`, `setupSearch` input+Enter+Escape kezelés) + 1115 (szoba-váltáskor auto-close).
- **Learnings (megerősítve, nem új):**
  - A mark-kiemelést a query-n és a text-en is ugyanabban az escape-elt formában kell keresni, különben HTML-entitás-érintett kifejezésekre (`<script>` → `&lt;script&gt;`) nem lesz találat.
  - Search fetch-eknél seq-counter (`state.searchSeq`) megakadályozza, hogy egy lassabb korábbi válasz felülírja a legfrissebb találatlistát gyors gépeléskor.
  - LIKE-alapú keresésnél a user input `%`/`_`/`\` karaktereit literálként kell kezelni — prepared statement önmagában nem véd a pattern-injekciótól (bár SQLi ellen igen). A `\` escape-et muszáj elsőnek cserélni, különben a fresh backslash-ek újra-escape-elődnek.
---
