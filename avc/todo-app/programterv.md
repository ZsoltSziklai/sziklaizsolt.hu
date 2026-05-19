# ADVC-Test Todo App — Rendszerterv (PRD)

## Projekt célja

Todo alkalmazás, amelynek **elsődleges célja az AI Vibe-Coding Ecosystem tesztelése**. A három autonóm agent (aiO, Ralph, aiQA) teljes munkafolyamatát validáljuk ezen a projekten keresztül: automatikus fejlesztés, deployment, QA tesztelés, bug fix ciklus. Az alkalmazás tudatosan összetettebb egy minimál todo app-nál, hogy az agentek képességeit valódi komplex fejlesztésen tesztelhessük.

## Tech Stack

- **Frontend:** Vanilla HTML + CSS + JavaScript (egyetlen `index.html` fájl, inline CSS és JS)
- **Backend:** Nincs (kliens oldali localStorage)
- **Build step:** Nincs szükséges
- **Szerver:** cPanel (sziklaizsolt.hu), statikus fájl kiszolgálás

## Környezetek

- **Pre-production:** `sziklaizsolt.hu/advc-test` — ide deployol aiO minden implementáció után
- **Deploy módszer:** SSH + fájlmásolás a `website` Claude Code skill használatával
- **Mappastruktúra a szerveren:** `/home/user/public_html/advc-test/`

## Elérhető Claude Code Skillek

- **website** — sziklaizsolt.hu szerver elérés (SSH, fájlkezelés, deployment)

## Funkcionális követelmények

### Alapfunkciók (US-001..005, kész)
- Todo hozzáadása szöveges input mezőből
- Todo készre jelölése (checkbox)
- Todo törlése
- Todo szövegének szerkesztése (inline edit)
- Szűrés: összes / aktív / kész
- Aktív todók számláló
- Üres állapot kezelése
- localStorage perzisztencia

### Bővített funkciók (US-006..010, fejlesztendő)
- **Határidő (due date):** Minden todóhoz opcionálisan rendelhető dátum+idő. A lejárt határidejű todók vizuálisan megkülönböztetettek (piros kiemelés). A határidő szerkeszthető és törölhető.
- **Határidő szerinti rendezés:** A todók alapértelmezetten határidő szerint rendezettek (legkorábbi először). Határidő nélküli todók a lista végén. Kézi rendezés váltó gomb: határidő / létrehozás dátuma.
- **Naptár nézet:** Havi naptár megjelenítés a todók határidejével. A naptárban a napokra kattintva szűrhető a lista az adott nap todóira. Navigáció hónapok között (előre/hátra). Mai nap kiemelése.
- **Keresés:** Valós idejű (instant) szöveges keresés a todók között. A keresés a todo szövegére szűr. A keresőmező törlése visszaállítja a teljes listát. A keresés a szűrőkkel kombinálható (pl. keresés + csak aktív).
- **Fájl csatolás:** Minden todóhoz csatolható egy vagy több fájl (kép, PDF, szöveg). A csatolt fájlok base64 kódolással localStorage-ban tárolódnak. Maximum 2 MB fájlméret csatolásonként. A csatolmányok megtekinthetők (kép: előnézet, egyéb: letöltés link). Csatolmány törölhető.

### UI követelmények
- Reszponzív, mobilbarát design
- Tiszta, modern megjelenés
- Két nézet váltó: Lista nézet / Naptár nézet
- A hátralevő aktív todók száma látható
- Üres állapot kezelése (nincs todo → tájékoztató szöveg)

### Adat perzisztencia
- localStorage használata
- Oldal újratöltés után a todók, határidők, csatolmányok megmaradnak
- Ha a localStorage megtelik (5 MB limit közelében), figyelmeztető üzenet

## Fejlesztési elvek

- **Egyetlen fájl:** Minden (HTML, CSS, JS) egyetlen `index.html` fájlban
- **Szemantikus HTML:** Megfelelő elemek használata (form, input, button, ul/li)
- **Akadálymentesség:** ARIA labelek, billentyűzet-navigáció
- **Nincsenek külső függőségek:** Semmi CDN, semmi framework
- **Inkrementális fejlesztés:** Az új funkciók nem törhetik el a meglévőket

## Regressziós tesztelés

A regressziós szcenáriókat az `aiqa-planner` (Opus modell, dedikált scheduled task) tervezi meg dinamikusan a User Stories, AC-k és fejlesztés közbeni tapasztalatok alapján. **Ebben a PRD-ben szándékosan NINCS előre megírt szcenárió lista** — a regresszió kreatív, cross-funkcionális. A planner output-ja a `quality/REGRESSION.json`-ba kerül; a 5 aiqa-w-XX worker (Sonnet) párhuzamosan futtatja a `dependsOn` gráf alapján.

Lásd: `agents/rules-aiqa-planner.md` (output schema, minőségi követelmények) és `agents/aiqa-planner-init-prompt.md` (folyamat).

## User Stories

Lásd: `prd.json`

## Mappastruktúra (projekt gyökér)

```
advc-test/
├── prd.md              # Ez a fájl
├── prd.json            # Task tracker (Ralph olvassa)
├── agents/             # Agent init promptok
│   ├── aio-init-prompt.md
│   └── aiqa-init-prompt.md
├── quality/            # QA bridge fájlok
├── control/            # Vezérlő fájlok (STOP, COMPLETED)
├── logs/               # Agent logfájlok (aio.log, aiqa.log)
└── src/
    └── index.html      # A todo alkalmazás (egyetlen fájl)
```
