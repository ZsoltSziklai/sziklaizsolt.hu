# ADVC-Test Weather Dashboard — Rendszerterv (PRD)

## Projekt célja

Időjárás dashboard alkalmazás, amelynek **elsődleges célja az AI Vibe-Coding Ecosystem tesztelése**. A három autonóm agent (aiO, Ralph, aiQA) teljes munkafolyamatát validáljuk ezen a projekten keresztül: automatikus fejlesztés, deployment, QA tesztelés, bug fix ciklus. Az alkalmazás az Open-Meteo ingyenes API-t használja, nincs szükség API kulcsra.

## Tech Stack

- **Frontend:** Vanilla HTML + CSS + JavaScript (egyetlen `index.html` fájl, inline CSS és JS)
- **Backend:** Nincs (kliens oldali localStorage + Open-Meteo API)
- **API:** Open-Meteo (https://open-meteo.com/) — ingyenes, kulcs nélküli
- **Build step:** Nincs szükséges
- **Szerver:** cPanel (sziklaizsolt.hu), statikus fájl kiszolgálás

## Környezetek

- **Pre-production:** `sziklaizsolt.hu/avc-test` — ide deployol aiO minden implementáció után
- **Deploy módszer:** SSH + fájlmásolás a `website` Claude Code skill használatával
- **Mappastruktúra a szerveren:** `/home/user/public_html/avc-test/`

## Elérhető Claude Code Skillek

- **website** — sziklaizsolt.hu szerver elérés (SSH, fájlkezelés, deployment)

## API Referencia — Open-Meteo

### Geocoding (városkeresés)
```
GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=hu
```
Válasz: `{ "results": [{ "name": "Budapest", "latitude": 47.4984, "longitude": 19.0404, "country": "Magyarország", ... }] }`

### Aktuális időjárás + Előrejelzés
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,weather_code
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max
  &hourly=temperature_2m,wind_speed_10m,precipitation_probability,weather_code
  &timezone=auto
  &forecast_days=5
```

### WMO Weather Codes (időjárás kódok)
- 0: Tiszta ég
- 1, 2, 3: Főként tiszta, részben felhős, borult
- 45, 48: Köd, zúzmarás köd
- 51, 53, 55: Szitálás (enyhe, mérsékelt, sűrű)
- 61, 63, 65: Eső (enyhe, mérsékelt, erős)
- 71, 73, 75: Havazás (enyhe, mérsékelt, erős)
- 77: Hószemcse
- 80, 81, 82: Zápor (enyhe, mérsékelt, heves)
- 85, 86: Hózápor (enyhe, erős)
- 95: Zivatar
- 96, 99: Jégesővel kísért zivatar

## Funkcionális követelmények

### Alapfunkciók (US-001..005)
- Városkeresés név alapján (geocoding)
- Aktuális időjárás megjelenítése: hőmérséklet, szél, páratartalom, felhőzet, WMO ikon
- 5 napos előrejelzés kártyákon: min/max hőmérséklet, csapadék valószínűség, ikon
- Kedvenc városok mentése localStorage-ba (max 8)
- Mértékegység váltás: °C/°F és km/h/mph

### Bővített funkciók (US-006..010)
- **Hőmérséklet grafikon:** Vonal grafikon (Canvas vagy SVG) a 5 napos max/min hőmérsékletekkel. Tooltip hover-re. Jelmagyarázat. Egységváltással szinkronban.
- **Sötét/világos téma:** Két téma CSS custom properties alapon. Átmenet animálva. localStorage-ba mentve.
- **Óránkénti részletes nézet:** Nap kártyára kattintás → 24 órás bontás (hőmérséklet, szél, csapadék, ikon). Vissza gomb az áttekintéshez.
- **Napfelkelte/napnyugta és UV index:** Nappali óra kijelzés, UV kategória szín kódolással, vizuális nappali ív.
- **Keresési előzmények:** Utolsó 10 keresés localStorage-ban, legördülő listában, törölhető egyenként.

### UI követelmények
- Reszponzív, mobilbarát design
- Tiszta, modern megjelenés — időjárás alkalmazás vizuális stílus
- Loading indikátor API hívások közben
- Felhasználóbarát hibaüzenetek (hálózati hiba, nincs találat)
- WMO kód alapú ikonok (emoji vagy SVG)

### Adat kezelés
- localStorage: kedvenc városok, egységbeállítás, téma, keresési előzmények
- API cache: nincs (minden városváltásnál friss adat)
- Hálózati hiba: felhasználóbarát üzenet, újrapróbálás gomb

## Fejlesztési elvek

- **Egyetlen fájl:** Minden (HTML, CSS, JS) egyetlen `index.html` fájlban
- **Szemantikus HTML:** Megfelelő elemek használata (form, input, button, section, article)
- **Akadálymentesség:** ARIA labelek, billentyűzet-navigáció
- **Nincsenek külső függőségek:** Semmi CDN, semmi framework, semmi Chart.js
- **Inkrementális fejlesztés:** Az új funkciók nem törhetik el a meglévőket

## Regressziós tesztelés

A regressziós szcenáriókat az `aiqa-planner` (Opus modell, dedikált scheduled task) tervezi meg dinamikusan a User Stories, AC-k és fejlesztés közbeni tapasztalatok alapján. **Ebben a PRD-ben szándékosan NINCS előre megírt szcenárió lista** — a regresszió kreatív, cross-funkcionális. A planner output-ja a `quality/REGRESSION.json`-ba kerül; az aiqa-w-XX worker pool (Sonnet) párhuzamosan futtatja a `dependsOn` gráf alapján.

Lásd: `agents/rules-aiqa-planner.md` (output schema, minőségi követelmények) és `agents/aiqa-planner-init-prompt.md` (folyamat).

## User Stories

Lásd: `prd.json`

## Mappastruktúra (projekt gyökér)

```
avc-test/
├── prd.md              # Ez a fájl
├── prd.json            # Task tracker (Ralph olvassa)
├── agents/             # Agent init promptok
│   ├── aio-init-prompt.md
│   └── aiqa-init-prompt.md
├── quality/            # QA bridge fájlok
├── control/            # Vezérlő fájlok (STOP, COMPLETED)
├── logs/               # Agent logfájlok (aio.log, aiqa.log)
└── src/
    └── index.html      # Az időjárás dashboard (egyetlen fájl)
```
