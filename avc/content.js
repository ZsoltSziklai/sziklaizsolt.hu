/* =========================================================
   AVC content — HU + EN
   ========================================================= */

const AVC_NAV = {
  hu: [
    { id: "home",     label: "Címlap" },
    { id: "what",     label: "Mi az AvC?" },
    { id: "pipeline", label: "A folyamat" },
    { id: "projects", label: "Projektek" },
    { id: "thanks",   label: "Köszönet" },
    { id: "back",     label: "← vissza" },
  ],
  en: [
    { id: "home",     label: "Title" },
    { id: "what",     label: "What is AvC?" },
    { id: "pipeline", label: "The process" },
    { id: "projects", label: "Projects" },
    { id: "thanks",   label: "Acknowledgements" },
    { id: "back",     label: "← back" },
  ],
};

const AVC_HERO = {
  hu: {
    kicker: "Kutatási projekt · 2026",
    pill: "folyamatban",
    titleA: "Agentic",
    titleB: "VIBE",
    titleC: "Coding.",
    sub: "Teljesen autonóm AI ágensek fejlesztenek, tesztelnek és deployolnak szoftvert <strong>emberi beavatkozás nélkül</strong>. Egyetlen magas szintű követelményből.",
    tagline: "vibe coding = co-pilot · AvC = autonomous pilot",
    stats: [
      { k: "3",   sup: "",   v: "deployolt projekt" },
      { k: "$200", sup: "/h\u00f3",  v: "AI költség havonta" },
      { k: "0",   sup: "",   v: "emberi kódsor" },
      { k: "1",   sup: "",   v: "magas szintű követelmény" },
    ],
    ctaPrimary: "Projektek",
    ctaSecondary: "Mi az AvC?",
  },
  en: {
    kicker: "Research project · 2026",
    pill: "in progress",
    titleA: "Agentic",
    titleB: "VIBE",
    titleC: "Coding.",
    sub: "Fully autonomous AI agents develop, test and deploy software <strong>without human intervention</strong>. From a single high-level requirement.",
    tagline: "vibe coding = co-pilot · AvC = autonomous pilot",
    stats: [
      { k: "3",    sup: "", v: "deployed projects" },
      { k: "$200", sup: "/mo", v: "monthly AI cost" },
      { k: "0",    sup: "", v: "lines of human code" },
      { k: "1",    sup: "", v: "high-level requirement" },
    ],
    ctaPrimary: "Projects",
    ctaSecondary: "What is AvC?",
  },
};

const AVC_WHAT = {
  hu: {
    title: "Mi az",
    titleEm: "Agentic Vibe Coding?",
    paragraphs: [
      "Az <strong>Agentic Vibe Coding (AvC)</strong> az AI-segített fejlesztés következő evolúciós lépcsője. Míg a klasszikus vibe coding ember-vezérelt — minden lépéshez külön prompt kell —, az AvC <em>autonóm AI ágensekből álló pipeline-t</em> használ.",
      "<strong>Orchestrátor, QA tervező, tesztelő workerek, fejlesztő ágens.</strong> Egyetlen magas szintű követelményből az ágensek önállóan terveznek, kódolnak, tesztelnek és iterálnak.",
      "Az ember elindítja és ellenőrzi az eredményt — a folyamatot az ágensek viszik végig egymással kommunikálva.",
    ],
    pull: "<span class=\"pq-line\"><strong>vibe coding</strong> = <em>co-pilot</em></span><span class=\"pq-arrow\" aria-hidden=\"true\">↓</span><span class=\"pq-line\"><strong>AvC</strong> = <em>autonomous pilot</em></span>",
  },
  en: {
    title: "What is",
    titleEm: "Agentic Vibe Coding?",
    paragraphs: [
      "<strong>Agentic Vibe Coding (AvC)</strong> is the next evolutionary step in AI-assisted development. While classic vibe coding is human-driven — each step needs its own prompt — AvC uses a <em>pipeline of autonomous AI agents</em>.",
      "<strong>Orchestrator, QA planner, testing workers, developer agent.</strong> From a single high-level requirement, the agents independently plan, code, test, and iterate.",
      "Humans launch and verify the result — the agents drive the process, communicating with each other.",
    ],
    pull: "<span class=\"pq-line\"><strong>vibe coding</strong> = <em>co-pilot</em></span><span class=\"pq-arrow\" aria-hidden=\"true\">↓</span><span class=\"pq-line\"><strong>AvC</strong> = <em>autonomous pilot</em></span>",
  },
};

const AVC_PIPELINE = {
  hu: {
    title: "A folyamat.",
    lead: "Hogyan dolgoznak az ágensek egymással.",
    steps: [
      { id: 1, name: "Követelmény",   en: "Requirement",   desc: "Ember által megfogalmazott magas szintű feladat — pl. \"Készíts egy időjárás dashboardot városkereséssel.\"" },
      { id: 2, name: "Orchestrátor",  en: "Orchestrator",  desc: "A pipeline karmestere. Feladatokra bont, ütemez, monitoroz, állapotot tart." },
      { id: 3, name: "QA tervező",    en: "QA planner",    desc: "Teszttervet készít a követelmények alapján: edge case-ek, acceptance kritériumok, tesztelési stratégia." },
      { id: 4, name: "Fejlesztő ágens", en: "Developer",   desc: "Megírja a kódot, refaktorál, fix-eli a tesztek által jelzett hibákat. Iterál a QA visszajelzésekre." },
      { id: 5, name: "Tesztelő workerek", en: "QA workers", desc: "Párhuzamosan futtatják a teszteket, jelentenek vissza az orchestrátornak." },
      { id: 6, name: "Deploy",        en: "Deploy",        desc: "Sikeres QA után az ágens deployolja a végterméket — forráskód, PRD, technikai terv, token-stat csomagolva." },
    ],
  },
  en: {
    title: "The process.",
    lead: "How the agents work with each other.",
    steps: [
      { id: 1, name: "Requirement",  en: "",  desc: "A human-authored high-level task — e.g. \"Build a weather dashboard with city search.\"" },
      { id: 2, name: "Orchestrator", en: "",  desc: "The pipeline conductor. Decomposes into tasks, schedules, monitors, keeps state." },
      { id: 3, name: "QA planner",   en: "",  desc: "Builds a test plan from the requirements: edge cases, acceptance criteria, testing strategy." },
      { id: 4, name: "Developer",    en: "",  desc: "Writes the code, refactors, fixes bugs flagged by tests. Iterates on QA feedback." },
      { id: 5, name: "QA workers",   en: "",  desc: "Run tests in parallel and report back to the orchestrator." },
      { id: 6, name: "Deploy",       en: "",  desc: "After QA passes, the agent deploys the artifact — source, PRD, tech plan, token stats packaged." },
    ],
  },
};

const AVC_PROJECTS = {
  hu: {
    title: "Elkészült",
    titleEm: "projektek.",
    lead: "Három, az AvC pipeline által végigvitt valós alkalmazás.",
    items: [
      {
        id: "minichat",
        name: "MiniChat",
        desc: "Valós idejű csevegőalkalmazás szobákkal, privát üzenetekkel és keresővel.",
        descEn: "Real-time chat app with rooms, DMs and search.",
        cost: "$482.63",
        stack: ["PHP", "MySQL", "AJAX", "CSS"],
        open: "minichat/index.html",
        source: "minichat/download/minichat_source.zip",
        prd: "prd-viewer.php?p=minichat",
        plan: "programterv-viewer.php?p=minichat",
        tokens: "token-report-viewer.php?p=minichat",
      },
      {
        id: "todo-app",
        name: "Todo App",
        desc: "Feladatkezelő határidőkkel, keresővel, naptár nézettel és fájl csatolással.",
        descEn: "Task manager with due dates, search, calendar view and file attachments.",
        cost: "$126.14",
        stack: ["HTML", "CSS", "JavaScript", "localStorage"],
        open: "todo-app/index.html",
        source: "todo-app/download/todo-app_source.zip",
        prd: "prd-viewer.php?p=todo-app",
        plan: "programterv-viewer.php?p=todo-app",
        tokens: "token-report-viewer.php?p=todo-app",
      },
      {
        id: "weather-dashboard",
        name: "Weather Dashboard",
        desc: "Időjárás dashboard városkereséssel, előrejelzéssel, grafikonnal és sötét témával.",
        descEn: "Weather dashboard with city search, forecast, chart and dark theme.",
        cost: "$172.10",
        stack: ["HTML", "CSS", "JavaScript", "Open-Meteo API"],
        open: "weather-dashboard/index.html",
        source: "weather-dashboard/download/weather-dashboard_source.zip",
        prd: "prd-viewer.php?p=weather-dashboard",
        plan: "programterv-viewer.php?p=weather-dashboard",
        tokens: "token-report-viewer.php?p=weather-dashboard",
      },
    ],
    labels: {
      cost: "AI költség",
      costNote: "közvetlen API használatával",
      open: "megnyitás",
      source: "forrás .zip",
      prd: "PRD",
      plan: "tech terv",
      tokens: "token stat",
    },
  },
  en: {
    title: "Deployed",
    titleEm: "projects.",
    lead: "Three real apps shipped end-to-end by the AvC pipeline.",
    items: null, // reuse items from hu (identical structure, only descriptions differ — we'll switch via lang)
    labels: {
      cost: "AI cost",
      costNote: "estimated direct API cost",
      open: "open",
      source: "source .zip",
      prd: "PRD",
      plan: "tech plan",
      tokens: "token stats",
    },
  },
};

const AVC_THANKS = {
  hu: {
    title: "Köszönet",
    titleEm: "nyilvánítás.",
    paragraphs: [
      "Kutatásomat az <strong>Óbudai Egyetem</strong> és a <strong>VIG Csoport — Alfa Vienna Insurance Group Biztosító Zrt.</strong> támogatása tette lehetővé.",
      "Külön hálával tartozom kollégáimnak, <strong>Karajos János Zsoltnak</strong> és <strong>Kozák Cecíliának</strong> — a téma iránti elhivatottságuk és gondolatébresztő közös beszélgetéseink maradandó hatással voltak a gondolkodásomra.",
      "Külön köszönet <strong>Fehér Ernő</strong> kollégámnak, aki támogatott, amikor elmélyedtem a gondolataimban, és odafigyelt arra, hogy a cégnél semmi se essen le az asztalról.",
      "<a href=\"https://www.youtube.com/channel/UCwLS7bYBo_CmmIixxFJSS7Q\" target=\"_blank\" rel=\"noreferrer\">Szota Szabolcs</a> <em>„AI a mindennapokban\"</em> csatornája megmutatta, hogy ezt a technológiát nem csak programozói szemszögből lehet — és kell — megközelíteni: az AI mindenkié, aki nyitott rá.",
      "Köszönöm mindazoknak is, akik meghallgattak — visszajelzéseik és figyelmük nélkülözhetetlen volt szakmai fejlődésemhez.",
      "Hálával tartozom az <a href=\"https://www.anthropic.com/claude-code\" target=\"_blank\" rel=\"noreferrer\"><strong>Anthropic Claude Code</strong></a>, a <a href=\"https://www.cowork.ai\" target=\"_blank\" rel=\"noreferrer\"><strong>Cowork</strong></a> és a <a href=\"https://ralph-tui.com\" target=\"_blank\" rel=\"noreferrer\"><strong>Ralph TUI</strong></a> csapatának is, akiknek eszközei nélkül ez a projekt nem létezhetne ebben a formában.",
      "És végül a családomnak — feleségemnek, <strong>Barbarának</strong>, és lányomnak, <strong>Zselykének</strong> — köszönöm, hogy elviselték megszállottságomat.",
    ],
    supportTitle: "Támogatók",
    support: [
      { name: "Óbudai Egyetem", url: "https://uni-obuda.hu", logo: "assets/logo-oe.png", logoAlt: "Óbudai Egyetem" },
      { name: "Alfa Vienna Insurance Group", url: "https://www.alfa.hu", logo: "assets/logo-alfa.svg", logoAlt: "Alfa VIG" },
    ],
  },
  en: {
    title: "Acknowledge",
    titleEm: "ments.",
    paragraphs: [
      "This research was made possible through the support of <strong>Óbuda University</strong> and the <strong>VIG Group — Alfa Vienna Insurance Group Biztosító Zrt.</strong>",
      "Special thanks to my colleagues, <strong>János Zsolt Karajos</strong> and <strong>Cecília Kozák</strong> — their dedication to the field and our many thought-provoking conversations have had a lasting influence on my thinking.",
      "I'm also grateful to my colleague <strong>Ernő Fehér</strong>, who supported me when I dove deep into my thoughts and made sure that nothing slipped through the cracks at the company.",
      "<a href=\"https://www.youtube.com/channel/UCwLS7bYBo_CmmIixxFJSS7Q\" target=\"_blank\" rel=\"noreferrer\">Szabolcs Szota</a>'s <em>AI a mindennapokban</em> (AI in Everyday Life) channel showed that this technology shouldn't be confined to a programmer's lens — AI belongs to anyone willing to engage with it.",
      "I'm also grateful to everyone who took the time to listen — their feedback and attention were an invaluable driving force behind my growth.",
      "I'm also thankful to the teams behind <a href=\"https://www.anthropic.com/claude-code\" target=\"_blank\" rel=\"noreferrer\"><strong>Anthropic Claude Code</strong></a>, <a href=\"https://www.cowork.ai\" target=\"_blank\" rel=\"noreferrer\"><strong>Cowork</strong></a>, and <a href=\"https://ralph-tui.com\" target=\"_blank\" rel=\"noreferrer\"><strong>Ralph TUI</strong></a> — without their tools, this project could not exist in its current form.",
      "And finally, my deepest thanks to my family — my wife <strong>Barbara</strong> and my daughter <strong>Zselyke</strong> — for putting up with my obsession.",
    ],
    supportTitle: "Supporters",
    support: [
      { name: "Óbuda University", url: "https://uni-obuda.hu", logo: "assets/logo-oe.png", logoAlt: "Óbuda University" },
      { name: "Alfa Vienna Insurance Group", url: "https://www.alfa.hu", logo: "assets/logo-alfa.svg", logoAlt: "Alfa VIG" },
    ],
  },
};

const AVC_META = {
  hu: { builtNote: "E weboldal standard vibe coding technológiával készült.", model: "claude-sonnet-4-6", updated: "2026-04-29", reviewer: "Sziklai Zsolt" },
  en: { builtNote: "This website was built using standard vibe coding technology.",  model: "claude-sonnet-4-6", updated: "2026-04-29", reviewer: "Sziklai Zsolt" },
};

window.AVC_CONTENT = {
  AVC_NAV, AVC_HERO, AVC_WHAT, AVC_PIPELINE, AVC_PROJECTS, AVC_THANKS, AVC_META,
};
