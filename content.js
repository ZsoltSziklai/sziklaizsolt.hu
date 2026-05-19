/* =========================================================
   Content: HU + EN
   ========================================================= */

const NAV = {
  hu: [
    { id: "home",       label: "Címlap" },
    { id: "about",      label: "Rólam" },
    { id: "experience", label: "Tapasztalat" },
    { id: "education",  label: "Tanulmányok" },
    { id: "teaching",   label: "Oktatás" },
    { id: "projects",   label: "Projektek" },
    { id: "contact",    label: "Kapcsolat" },
  ],
  en: [
    { id: "home",       label: "Home" },
    { id: "about",      label: "About" },
    { id: "experience", label: "Experience" },
    { id: "education",  label: "Education" },
    { id: "teaching",   label: "Teaching" },
    { id: "projects",   label: "Projects" },
    { id: "contact",    label: "Contact" },
  ],
};

const HERO = {
  hu: {
    kicker: "Informatikus",
    pill: "elérhető · 2026",
    nameFirst: "Zsolt",
    nameLast: "SZIKLAI",
    nameOrder: "lastFirst",
    roleEm: "Vezető Rendszerintegrációs Szakértő",
    badgeLine1: "Mestertanár",
    badgeLine2: "Óbudai Egyetem · NIK · 22+ év",
    sub: "Vezető Rendszerintegrációs Szakértő és a Kubernetes Technology Support Matrix Team szakmai vezetője az <strong>Alfa Vienna Insurance Group</strong>-nál. 2004 óta mestertanár az <strong>Óbudai Egyetem</strong> Neumann János Informatikai Karán.",
    stats: [
      { k: "22", sup: "év", v: "egyetemi oktatás" },
      { k: "3,99",  sup: "",   v: "diploma · MSc / MA / BSc" },
      { k: "6",  sup: "",   v: "szakmai állomás" },
      { k: "1",  sup: "",   v: "élő AVC kísérlet" },
    ],
    ctaPrimary: "Beszélgessünk",
    ctaSecondary: "LinkedIn",
    marquee: ["Kubernetes", "Enterprise IT", "Mestertanár", "Intelligens rendszerek", "Adatbázis HA", "Agentic Vibe Coding", "Budapest", "Óbudai Egyetem · NIK", "Alfa VIG"],
  },
  en: {
    kicker: "Computer Scientist",
    pill: "available · 2026",
    nameFirst: "Zsolt",
    nameLast: "SZIKLAI",
    nameOrder: "firstLast",
    roleEm: "Lead Systems Integration Expert",
    badgeLine1: "Senior Lecturer",
    badgeLine2: "Óbuda University · NIK · 22+ yrs",
    sub: "Lead Systems Integration Expert and professional lead of the Kubernetes Technology Support Matrix Team at <strong>Alfa Vienna Insurance Group</strong>. Senior lecturer at <strong>Óbuda University</strong>, John von Neumann Faculty of Informatics since 2004.",
    stats: [
      { k: "22", sup: "yrs", v: "university teaching" },
      { k: "3.99",  sup: "",    v: "degrees · MSc / MA / BSc" },
      { k: "6",  sup: "",    v: "professional roles" },
      { k: "1",  sup: "",    v: "live AVC experiment" },
    ],
    ctaPrimary: "Let's talk",
    ctaSecondary: "LinkedIn",
    marquee: ["Kubernetes", "Enterprise IT", "Senior Lecturer", "Intelligent systems", "Database HA", "Agentic Vibe Coding", "Budapest", "Óbuda University · NIK", "Alfa VIG"],
  },
};

const ABOUT = {
  hu: {
    title: "Rólam",
    lead: "Ki vagyok és mit hiszek.",
    pull: "Szeretem a tudományokat, szeretek tanulni és tanítani. <em>Az élethosszig tartó tanulás híve vagyok.</em>",
    paragraphs: [
      "Szeretem a tudományokat, szeretek tanulni és tanítani. <em>Az élethosszig tartó tanulás híve vagyok.</em> Szeretem együtt látni az információs technológia területeit. A társadalmi szerepvállalás nagyon fontos számomra.",
      "Jelenleg az <strong>Alfa Vienna Insurance Group Biztosító Zrt.</strong>-nél dolgozom Vezető Rendszerintegrációs Szakértőként, ahol a Kubernetes Technology Support Matrix Team szakmai vezetője vagyok. Ezzel párhuzamosan az <strong>Óbudai Egyetem Neumann János Informatikai Karán</strong> mestertanár vagyok, 2004 óta tanítok.",
      "Tapasztalatom van alkalmazásfejlesztésben, egyetemi oktatásban, rendszer­elemzésben, tervezésben, tesztelésben és menedzsmentben. Publikus és privát szektorban egyaránt dolgoztam.",
    ],
    factsTitle: "Tények",
    facts: [
      { k: "Név",     v: "Sziklai Zsolt" },
      { k: "Email",   v: "info@sziklaizsolt.hu", href: "mailto:info@sziklaizsolt.hu" },
      { k: "Telefon", v: "+36 70 332 2198", href: "tel:+36703322198" },
      { k: "Hely",    v: "Budapest, Magyarország" },
      { k: "Nyelvek", v: "Magyar (anyanyelv) · Angol (B2)" },
      { k: "Iparág",  v: "IT Services & IT Consulting" },
    ],
    interestsTitle: "Érdeklődési körök",
    interests: ["Ejtőernyőzés", "Búvárkodás", "Utazás", "Tanulás"],
  },
  en: {
    title: "About",
    lead: "Who I am and what I believe.",
    pull: "I love the sciences and I love learning and teaching. <em>I'm a believer in life-long learning.</em>",
    paragraphs: [
      "I love the sciences and I love learning and teaching. <em>I'm a believer in life-long learning.</em> I like seeing the fields of information technology together. Social engagement matters a lot to me.",
      "I currently work at <strong>Alfa Vienna Insurance Group</strong> as Lead Systems Integration Expert and professional lead of the Kubernetes Technology Support Matrix Team. In parallel I've been a senior lecturer at <strong>Óbuda University, John von Neumann Faculty of Informatics</strong> since 2004.",
      "I have experience in application development, university teaching, system analysis, design, testing and management. I've worked across both the public and private sectors.",
    ],
    factsTitle: "Facts",
    facts: [
      { k: "Name",     v: "Zsolt Sziklai" },
      { k: "Email",    v: "info@sziklaizsolt.hu", href: "mailto:info@sziklaizsolt.hu" },
      { k: "Phone",    v: "+36 70 332 2198", href: "tel:+36703322198" },
      { k: "Location", v: "Budapest, Hungary" },
      { k: "Languages",v: "Hungarian (native) · English (B2)" },
      { k: "Industry", v: "IT Services & IT Consulting" },
    ],
    interestsTitle: "Interests",
    interests: ["Skydiving", "Scuba diving", "Travel", "Learning"],
  },
};

const EXPERIENCE = {
  hu: {
    title: "Munkatapasztalat",
    lead: "Szakmai pályafutásom főbb állomásai.",
    items: [
      {
        period: "2023 — jelen",
        current: true,
        role: "Vezető Rendszerintegrációs Szakértő",
        roleNote: "Professional Lead, K8s Technology Support Matrix Team",
        company: "Alfa Vienna Insurance Group Biztosító Zrt.",
        desc: "Nagyvállalati IT integrációs rendszerek tervezése és üzemeltetése. A Kubernetes Technology Support Matrix Team szakmai vezetője. Konténerizált platformok, magas rendelkezésre állású rendszerek, hibrid felhő-architektúrák.",
        stack: ["Kubernetes", "OpenShift", "Rancher", "Linux", "Bash/Perl", "HA Systems", "Enterprise Integration"],
      },
      {
        period: "2004 — jelen",
        current: true,
        role: "Mestertanár",
        company: "Óbudai Egyetem · Neumann János Informatikai Kar",
        desc: "Egyetemi oktatás és oktatási labor üzemeltetése (50 kliens, 3 Linux szerver). Architektúrák (assembly, gépi kódú programozás), Intelligens rendszerek (genetikus algoritmusok, neurális hálózatok). Fejlesztői környezetek: Delphi, .NET C#, MathWorks.",
        stack: ["Assembly", "Neural Networks", "Genetic Algorithms", "C#/.NET", "MATLAB", "Delphi", "Linux Lab"],
      },
      {
        period: "2017 — 2023",
        role: "Megoldásmérnök · Rendszer- és adatbázisüzemeltető",
        company: "Deutsche Telekom IT Solutions (IT Services Hungary)",
        desc: "Kubernetes és OpenShift cluster-ek üzemeltetése (T-Mobile AT, PBS/BGT). MySQL, MariaDB, PostgreSQL, Cassandra (NoSQL) redundáns rendszerek. Magas rendelkezésre állású (HA) rendszerek (Huawei/EMUI, Aspiegel, Open Telekom Cloud / OpenStack). Üzemeltetési és installációs automatizálások sh/bash, Perl nyelven.",
        stack: ["Kubernetes", "OpenShift", "Rancher", "MySQL/MariaDB", "PostgreSQL", "Cassandra", "OpenStack", "Bash/Perl"],
      },
      {
        period: "1996 — 2022",
        role: "Ügyvezető igazgató és fejlesztő",
        company: "Sze-Ke-Szo Kft.",
        desc: "Integrált számviteli rendszer tervezése, fejlesztése és üzemeltetése. Cégvezetés, ügyfélkapcsolatok, terméktámogatás. Teljes szoftver-életciklus.",
        stack: ["Delphi", "MySQL", "Management", "Integrált rendszerek"],
      },
      {
        period: "2014 — 2016",
        role: "Fejlesztő",
        company: "Refurbish IT Kft. (Nextcomp)",
        desc: "Komplex audit rendszer tervezése és fejlesztése a refurbish folyamatokhoz. Full-stack webfejlesztés.",
        stack: ["jQuery", "PHP", "MySQL"],
      },
      {
        period: "2006 — 2010",
        role: "Fejlesztő",
        roleNote: "Együttműködés az Óbudai Egyetemmel",
        company: "Nokia Siemens Networks",
        desc: "Automatikus tesztelő rendszer fejlesztése telekommunikációs szoftverekhez. Programozás, tervezés, üzemeltetés.",
        stack: ["Java", "PostgreSQL", "Test Automation"],
      },
    ],
  },
  en: {
    title: "Experience",
    lead: "Highlights of my professional journey.",
    items: [
      {
        period: "2023 — present",
        current: true,
        role: "Lead Systems Integration Expert",
        roleNote: "Professional Lead, K8s Technology Support Matrix Team",
        company: "Alfa Vienna Insurance Group",
        desc: "Designing and operating enterprise IT integration systems. Professional lead of the Kubernetes Technology Support Matrix Team. Containerized platforms, high-availability systems, hybrid cloud architectures.",
        stack: ["Kubernetes", "OpenShift", "Rancher", "Linux", "Bash/Perl", "HA Systems", "Enterprise Integration"],
      },
      {
        period: "2004 — present",
        current: true,
        role: "Senior Lecturer",
        company: "Óbuda University · John von Neumann Faculty of Informatics",
        desc: "University teaching and operating the educational lab (50 clients, 3 Linux servers). Computer architectures (assembly, machine code), intelligent systems (genetic algorithms, neural networks). Dev environments: Delphi, .NET C#, MathWorks.",
        stack: ["Assembly", "Neural Networks", "Genetic Algorithms", "C#/.NET", "MATLAB", "Delphi", "Linux Lab"],
      },
      {
        period: "2017 — 2023",
        role: "Solution Engineer · System & Database Administrator",
        company: "Deutsche Telekom IT Solutions (IT Services Hungary)",
        desc: "Operating Kubernetes and OpenShift clusters (T-Mobile AT, PBS/BGT). MySQL, MariaDB, PostgreSQL, Cassandra (NoSQL) redundant systems. HA systems (Huawei/EMUI, Aspiegel, Open Telekom Cloud / OpenStack). Ops and install automation in sh/bash and Perl.",
        stack: ["Kubernetes", "OpenShift", "Rancher", "MySQL/MariaDB", "PostgreSQL", "Cassandra", "OpenStack", "Bash/Perl"],
      },
      {
        period: "1996 — 2022",
        role: "Managing Director & Developer",
        company: "Sze-Ke-Szo Ltd.",
        desc: "Design, development and operation of an integrated accounting system. Company leadership, customer relations, product support. Full software life cycle.",
        stack: ["Delphi", "MySQL", "Management", "Integrated systems"],
      },
      {
        period: "2014 — 2016",
        role: "Developer",
        company: "Refurbish IT Ltd. (Nextcomp)",
        desc: "Design and development of a complex audit system for refurbish processes. Full-stack web development.",
        stack: ["jQuery", "PHP", "MySQL"],
      },
      {
        period: "2006 — 2010",
        role: "Developer",
        roleNote: "Collaboration with Óbuda University",
        company: "Nokia Siemens Networks",
        desc: "Development of an automated testing system for telecommunications software. Programming, design, operations.",
        stack: ["Java", "PostgreSQL", "Test Automation"],
      },
    ],
  },
};

const EDUCATION = {
  hu: {
    title: "Tanulmányok",
    lead: "Diplomáim és minősítéseim.",
    items: [
      { period: "2013 — 2015", degree: "Alkalmazott matematikus",       inst: "Óbudai Egyetem",                     meta: "MSc · mesterfokozat · jó minősítés" },
      { period: "2009 — 2014", degree: "Okleveles mérnöktanár (mérnök informatikus)", inst: "Óbudai Egyetem",      meta: "MA · mesterfokozat · kitűnő minősítés" },
      { period: "2001 — 2004", degree: "Programtervező matematikus",    inst: "Szegedi Tudományegyetem",            meta: "MSc · abszolutórium" },
      { period: "1996 — 2001", degree: "Mérnök informatikus",            inst: "Budapesti Műszaki Főiskola",         meta: "BSc · főiskolai oklevél · kiváló minősítés" },
    ],
  },
  en: {
    title: "Education",
    lead: "Degrees and qualifications.",
    items: [
      { period: "2013 — 2015", degree: "Applied Mathematician",                inst: "Óbuda University",         meta: "MSc · master's degree · good" },
      { period: "2009 — 2014", degree: "Engineer-Teacher (Computer Engineer)", inst: "Óbuda University",         meta: "MA · master's degree · excellent" },
      { period: "2001 — 2004", degree: "Software Engineer (Mathematician)",    inst: "University of Szeged",     meta: "MSc · absolutorium" },
      { period: "1996 — 2001", degree: "Computer Engineer",                    inst: "Budapest Polytechnic",     meta: "BSc · college degree · excellent" },
    ],
  },
};

const TEACHING = {
  hu: {
    title: "Oktatás",
    lead: "Egyetemi oktatói munka — Óbudai Egyetem, Neumann János Informatikai Kar.",
    intro: "2004 óta oktatok az Óbudai Egyetemen (korábban Budapesti Műszaki Főiskola) mestertanárként. Az oktatási laboratórium üzemeltetését (50 kliens, 3 Linux szerver) is végzem. Szakmai területeim a számítógép-architektúrák és az intelligens rendszerek.",
    items: [
      { title: "Architektúrák",              desc: "Számítógép-architektúrák, assembly programozás, gépi kódú programozás. Alacsony szintű rendszerfejlesztés alapjai, regiszterek, memória-modell, megszakítás-kezelés." },
      { title: "Intelligens rendszerek",     desc: "Genetikus algoritmusok, neurális hálózatok, machine learning alapok. Gyakorlati implementációk Delphi, .NET C# és MathWorks (MATLAB) környezetben." },
      { title: "Oktatási labor üzemeltetés", desc: "50 kliensgéppel és 3 Linux szerverrel működő oktatási labor üzemeltetése: rendszer­telepítés, automatizálás, hallgatói környezetek karbantartása." },
      { title: "Hallgatói mentorálás",       desc: "Szakdolgozati és diplomamunka témavezetés, projekt-mentorálás, hallgatói kutatómunka támogatása. 20+ év egyetemi tapasztalat." },
    ],
  },
  en: {
    title: "Teaching",
    lead: "University teaching — Óbuda University, John von Neumann Faculty of Informatics.",
    intro: "Senior lecturer since 2004 at Óbuda University (formerly Budapest Polytechnic). I also operate the educational lab (50 clients, 3 Linux servers). My main areas are computer architectures and intelligent systems.",
    items: [
      { title: "Architectures",            desc: "Computer architectures, assembly programming, machine-code programming. Low-level system fundamentals: registers, memory model, interrupt handling." },
      { title: "Intelligent systems",      desc: "Genetic algorithms, neural networks, machine-learning foundations. Practical implementations in Delphi, .NET C# and MathWorks (MATLAB)." },
      { title: "Educational lab ops",      desc: "Operating an educational lab with 50 client machines and 3 Linux servers: system deployment, automation, student environment maintenance." },
      { title: "Student mentoring",        desc: "Supervising theses and diploma works, project mentoring, supporting student research. 20+ years of university experience." },
    ],
  },
};

const PROJECTS = {
  hu: {
    title: "Projektek",
    lead: "Kiemelt szakmai munkák.",
    featured: {
      kicker: "Élő kísérlet · most",
      title: "Agentic Vibe Coding",
      titleEm: "kísérlet.",
      url: "sziklaizsolt.hu/avc",
      desc: "AI-asszisztált fejlesztési kísérlet: Claude Code, Ralph TUI, valamint az Opus és Sonnet modellek vegyes felhasználása. Az emberi és az ágens szerepköreinek vizsgálata szoftverfejlesztésben.",
      tags: ["Agentic Vibe Coding", "Claude Code", "Ralph TUI", "Opus / Sonnet"],
    },
    items: [
      { title: "Kubernetes klaszterek üzemeltetése", desc: "Nagyvállalati Kubernetes és OpenShift klaszterek tervezése, üzemeltetése (Alfa VIG, korábban T-Mobile AT és PBS/BGT a DTITS-nél).", stack: ["Kubernetes", "OpenShift", "Rancher", "HA"] },
      { title: "Intelligens rendszerek oktatás",   desc: "Egyetemi kurzus: neurális hálózatok és genetikus algoritmusok elmélete és gyakorlati implementációja.",                                  stack: ["Neural Networks", "Genetic Algorithms", "MATLAB"] },
      { title: "Adatbázis HA-rendszerek",           desc: "MySQL, MariaDB, PostgreSQL és Cassandra (NoSQL) magas rendelkezésre állású, redundáns klaszterek tervezése, üzemeltetése. Replikáció, failover, monitorozás.", stack: ["MySQL", "MariaDB", "PostgreSQL", "Cassandra", "HA"] },
      { title: "Integrált számviteli rendszer",     desc: "A Sze-Ke-Szo Kft. integrált számviteli rendszerének teljes szoftver-életciklusa (1996–2022): tervezés, fejlesztés, ügyféltámogatás.",       stack: ["Delphi", "MySQL", "Vállalati szoftver"] },
    ],
  },
  en: {
    title: "Projects",
    lead: "Selected professional work.",
    featured: {
      kicker: "Live experiment · now",
      title: "Agentic Vibe Coding",
      titleEm: "experiment.",
      url: "sziklaizsolt.hu/avc",
      desc: "An AI-assisted development experiment: mixed use of Claude Code, the Ralph TUI, and the Opus and Sonnet models. Studying the roles of humans and agents in software development.",
      tags: ["Agentic Vibe Coding", "Claude Code", "Ralph TUI", "Opus / Sonnet"],
    },
    items: [
      { title: "Kubernetes cluster operations",  desc: "Designing and operating enterprise Kubernetes and OpenShift clusters (Alfa VIG; previously T-Mobile AT and PBS/BGT at DTITS).", stack: ["Kubernetes", "OpenShift", "Rancher", "HA"] },
      { title: "Intelligent systems course",     desc: "University course: theory and practical implementation of neural networks and genetic algorithms.",                                stack: ["Neural Networks", "Genetic Algorithms", "MATLAB"] },
      { title: "Database HA systems",            desc: "Designing and operating MySQL, MariaDB, PostgreSQL and Cassandra (NoSQL) high-availability redundant clusters. Replication, failover, monitoring.", stack: ["MySQL", "MariaDB", "PostgreSQL", "Cassandra", "HA"] },
      { title: "Integrated accounting system",    desc: "Full software life cycle of the Sze-Ke-Szo integrated accounting system (1996–2022): design, development, customer support.",     stack: ["Delphi", "MySQL", "Enterprise software"] },
    ],
  },
};

const CONTACT = {
  hu: {
    title: "Kapcsolat",
    lead: "Keress bátran — szakmai együttműködés, oktatás, kutatás.",
    bigA: "Beszéljünk",
    bigB: "egy kávé mellett.",
    bigSub: "Szakmai együttműködés, vendég előadás, témavezetés, vagy csak egy jó beszélgetés — írj nyugodtan.",
    cards: [
      { label: "Email",    value: "info@sziklaizsolt.hu",     href: "mailto:info@sziklaizsolt.hu" },
      { label: "Telefon",  value: "+36 70 332 2198",          href: "tel:+36703322198" },
      { label: "LinkedIn", value: "/in/zsoltsziklai",         href: "https://hu.linkedin.com/in/zsoltsziklai" },
      { label: "Credly",   value: "zsolt-sziklai",            href: "https://www.credly.com/users/zsolt-sziklai.5e9dfd84/badges#credly" },
    ],
    affilTitle: "Affiliáció",
    affil: [
      { label: "Munkahely", value: "Alfa Vienna Insurance Group Biztosító Zrt." },
      { label: "Egyetem",   value: "Óbudai Egyetem · NIK" },
      { label: "Hely",      value: "Budapest, Magyarország" },
    ],
  },
  en: {
    title: "Contact",
    lead: "Reach out — professional collaboration, teaching, research.",
    bigA: "Let's talk",
    bigB: "over coffee.",
    bigSub: "Collaboration, a guest lecture, thesis supervision, or just a good conversation — drop me a line.",
    cards: [
      { label: "Email",    value: "info@sziklaizsolt.hu",     href: "mailto:info@sziklaizsolt.hu" },
      { label: "Phone",    value: "+36 70 332 2198",          href: "tel:+36703322198" },
      { label: "LinkedIn", value: "/in/zsoltsziklai",         href: "https://hu.linkedin.com/in/zsoltsziklai" },
      { label: "Credly",   value: "zsolt-sziklai",            href: "https://www.credly.com/users/zsolt-sziklai.5e9dfd84/badges#credly" },
    ],
    affilTitle: "Affiliation",
    affil: [
      { label: "Employer",   value: "Alfa Vienna Insurance Group" },
      { label: "University", value: "Óbuda University · NIK" },
      { label: "Location",   value: "Budapest, Hungary" },
    ],
  },
};

const FOOTER = {
  hu: { rights: "készült Claude Design-nal együttműködve", built: "// készült saját kézzel, sok kávéval" },
  en: { rights: "made in collaboration with Claude Design",   built: "// hand-built, plenty of coffee" },
};

window.SITE_CONTENT = { NAV, HERO, ABOUT, EXPERIENCE, EDUCATION, TEACHING, PROJECTS, CONTACT, FOOTER };
