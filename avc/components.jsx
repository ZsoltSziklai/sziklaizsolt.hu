/* =========================================================
   AVC components
   ========================================================= */

const { useState: useStateAv, useEffect: useEffectAv, useRef: useRefAv } = React;

/* ---------- Icons ---------- */
function AvIcon({ name, size = 14 }) {
  const s = size, stroke = "currentColor", sw = 1.5;
  switch (name) {
    case "arrow":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M3 13L13 3M13 3H6M13 3V10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>);
    case "open":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 3h3v3M13 3L8 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>);
    case "zip":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M4 2h8l2 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h1z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M7 2v2h2V6h-2v2h2v2h-2v2" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>);
    case "doc":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M4 1.5h6l3 3V14a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 14V2a.5.5 0 0 1 .5-.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M10 1.5v3h3M5.5 8h5M5.5 10.5h5M5.5 6h2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>);
    case "chart":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M2 13h12M3 11V8M6 11V5M9 11V3M12 11V7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>);
    case "back":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M13 8H3M3 8l4-4M3 8l4 4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>);
    case "menu":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>);
    case "close":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>);
    case "sun":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth={sw} />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>);
    case "moon":
      return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none">
        <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>);
    default: return null;
  }
}

/* ---------- Sidebar ---------- */
function AvSidebar({ lang, setLang, theme, setTheme, activeId, content, onNav }) {
  const C = content;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const navClick = (id) => { setMobileOpen(false); onNav(id); };

  return (
    <>
      <div className={`mobile-bar${mobileOpen ? " mobile-bar--open" : ""}`}>
        <a href="#home" onClick={(e) => { e.preventDefault(); navClick("home"); }} className="mobile-bar__brand">
          <span className="mobile-bar__name">avc.</span>
          <span className="mobile-bar__role">Agentic Vibe Coding</span>
        </a>
        <button
          className="mobile-bar__toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}>
          <AvIcon name={mobileOpen ? "close" : "menu"} size={16} />
        </button>
      </div>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true"></div>}

    <aside className={`sidebar avc-sidebar${mobileOpen ? " sidebar--mobile-open" : ""}`}>
      <div className="avc-mark">
        <a href="../index.html" className="avc-mark__back" aria-label="back">
          <AvIcon name="back" size={14} />
          <span>{lang === "hu" ? "sziklaizsolt.hu" : "sziklaizsolt.hu"}</span>
        </a>
        <div className="avc-mark__logo">avc<span>.</span></div>
        <div className="avc-mark__tag">Agentic Vibe Coding</div>
        <div className="sidebar__kicker">
          <span className="dot" aria-hidden="true"></span>
          <span>{lang === "hu" ? "élő · futás közben" : "live · running"}</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {C.AVC_NAV[lang].filter((item) => item.id !== "back").map((item, i) => {
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`navlink${activeId === item.id ? " navlink--active" : ""}`}
              onClick={(e) => { e.preventDefault(); navClick(item.id); }}
            >
              <span className="navlink__num">{String(i).padStart(2, "0")}</span>
              <span className="navlink__bar" aria-hidden="true"></span>
              <span className="navlink__label">{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__controls">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button aria-pressed={lang === "hu"} onClick={() => setLang("hu")}>HU</button>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Light theme" : "Dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}>
            <AvIcon name={theme === "dark" ? "sun" : "moon"} size={13} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

/* ---------- Section head ---------- */
function AvSectionHead({ num, title, titleBold, lead, ghost }) {
  return (
    <>
      {ghost && <div className="section__ghost" aria-hidden="true">{ghost}</div>}
      <Reveal>
        <div className="section__head">
          <span className="section__num">/ {num}</span>
          <h2 className="section__title">
            {title}
            {titleBold && <> <b>{titleBold}</b></>}
            .
          </h2>
        </div>
      </Reveal>
      {lead && <Reveal delay={80}><p className="section__lead">{lead}</p></Reveal>}
    </>
  );
}

/* ---------- Hero ---------- */
function AvHero({ data, lang }) {
  return (
    <section id="home" className="section hero avc-hero">
      <div className="hero__grid" aria-hidden="true"></div>
      <div className="hero__inner">
        <Reveal>
          <div className="hero__kicker">
            <span>{data.kicker}</span>
            <span className="pill">{data.pill}</span>
          </div>
        </Reveal>

        <Reveal variant="up" delay={100}>
          <h1 className="avc-hero__title">
            <span className="avc-hero__first">{data.titleA}</span>
            <span className="avc-hero__big">{data.titleB}</span>
            <span className="avc-hero__last">{data.titleC}</span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="avc-hero__sub" dangerouslySetInnerHTML={{ __html: data.sub }} />
        </Reveal>

        <Reveal delay={260}>
          <div className="avc-hero__tagline">
            <code>{data.tagline}</code>
          </div>
        </Reveal>

        <Reveal delay={340}>
          <div className="hero__stats">
            {data.stats.map((s, i) => (
              <div className="stat" key={i}>
                <div className="stat__k">{s.k}{s.sup && <sup>{s.sup}</sup>}</div>
                <div className="stat__v">{s.v}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={420}>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#projects" onClick={(e) => { e.preventDefault(); document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}>
              {data.ctaPrimary}
              <span className="btn__arrow"><AvIcon name="arrow" /></span>
            </a>
            <a className="btn" href="#what" onClick={(e) => { e.preventDefault(); document.getElementById("what")?.scrollIntoView({ behavior: "smooth" }); }}>
              {data.ctaSecondary}
              <span className="btn__arrow"><AvIcon name="arrow" /></span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- What is AvC ---------- */
function AvWhat({ data, lang }) {
  return (
    <section id="what" className="section">
      <AvSectionHead num="01" title={data.title} titleBold={data.titleEm} ghost="01" />
      <div className="avc-what">
        <Reveal>
          <div className="prose avc-prose">
            {data.paragraphs.map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </div>
        </Reveal>
        <Reveal delay={120}>
          <blockquote className="pullquote avc-pullquote" dangerouslySetInnerHTML={{ __html: data.pull }}>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Pipeline ---------- */
function AvPipeline({ data, lang }) {
  return (
    <section id="pipeline" className="section">
      <AvSectionHead num="02" title={data.title.replace(/\.$/, "")} lead={data.lead} ghost="02" />

      <Reveal>
        <figure className="avc-diagram">
          <img
            className="avc-diagram__img"
            src="assets/pipeline-diagram.svg"
            alt="AvC pipeline — single run lifecycle: User PRD → aiO orchestrator → Ralph developer → git repo bridge → QA planner + workers → deployed app"
            loading="lazy"
          />
          <figcaption className="avc-diagram__cap">
            {lang === "hu"
              ? "AvC pipeline · egyetlen futás életciklusa — Claude Code CLI · Ralph TUI · ütemezett Claude Cowork ágensek · minden koordináció git-be commitolva."
              : "AvC pipeline · single run lifecycle — Claude Code CLI · Ralph TUI · scheduled Claude Cowork agents · all coordination committed to git."}
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}

/* ---------- Project card ---------- */
function AvProject({ item, labels, lang, index, descAlt }) {
  // Remember which project the user is opening, so /avc/ can scroll back here.
  const rememberReturn = () => {
    try { sessionStorage.setItem("avc-return-to", item.id); } catch (_) {}
  };
  return (
    <article id={`proj-${item.id}`} className={`avc-project avc-project--${item.id}`}>
      <div className="avc-project__hd">
        <div>
          <div className="avc-project__num">P·{String(index + 1).padStart(2, "0")}</div>
          <h3 className="avc-project__name">{item.name}</h3>
          <p className="avc-project__desc">{lang === "hu" ? item.desc : item.descEn}</p>
          {descAlt && <p className="avc-project__desc-alt">{descAlt}</p>}
        </div>
        <div className="avc-project__cost">
          <div className="avc-project__cost-label">{labels.cost}</div>
          <div className="avc-project__cost-value">{item.cost}</div>
          <div className="avc-project__cost-note">{labels.costNote}</div>
        </div>
      </div>

      <div className="avc-project__stack">
        {item.stack.map((s, i) => <span key={i} className="chip">{s}</span>)}
      </div>

      <div className="avc-project__actions">
        <a className="avc-action avc-action--primary" href={item.open} target="_blank" rel="noopener noreferrer">
          <AvIcon name="open" size={14} />
          <span>{labels.open}</span>
        </a>
        <a className="avc-action" href={item.source} target="_blank" rel="noopener noreferrer">
          <AvIcon name="zip" size={14} />
          <span>{labels.source}</span>
        </a>
        <a className="avc-action" href={item.prd} target="_blank" rel="noopener noreferrer">
          <AvIcon name="doc" size={14} />
          <span>{labels.prd}</span>
        </a>
        <a className="avc-action" href={item.plan} target="_blank" rel="noopener noreferrer">
          <AvIcon name="doc" size={14} />
          <span>{labels.plan}</span>
        </a>
        <a className="avc-action" href={item.tokens} target="_blank" rel="noopener noreferrer">
          <AvIcon name="chart" size={14} />
          <span>{labels.tokens}</span>
        </a>
      </div>
    </article>
  );
}

/* ---------- Projects ---------- */
function AvProjects({ data, lang, dataHu }) {
  // We always pull items from HU (they include both desc and descEn). The 'en' block only has labels.
  const items = dataHu.items;
  return (
    <section id="projects" className="section">
      <AvSectionHead num="03" title={data.title} titleBold={data.titleEm} lead={data.lead} ghost="03" />
      <div className="avc-projects">
        {items.map((it, i) => (
          <Reveal key={it.id} delay={i * 100}>
            <AvProject item={it} labels={data.labels} lang={lang} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Thanks ---------- */
function AvThanks({ data, lang }) {
  return (
    <section id="thanks" className="section">
      <AvSectionHead num="04" title={data.title} titleBold={data.titleEm} ghost="04" />
      <div className="avc-thanks">
        <Reveal>
          <div className="prose avc-prose">
            {data.paragraphs.map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="avc-support">
            <div className="avc-support__label">{data.supportTitle}</div>
            <div className="avc-support__grid">
              {data.support.map((s, i) => (
                <a key={i} className="avc-support__card" href={s.url} target="_blank" rel="noreferrer">
                  {s.logo && (
                    <img className="avc-support__logo" src={s.logo} alt={s.logoAlt || s.name} loading="lazy" />
                  )}
                  <span className="avc-support__name">{s.name}</span>
                  <span className="avc-support__arrow"><AvIcon name="arrow" size={12} /></span>
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function AvFooter({ data, lang }) {
  const [lastMod, setLastMod] = React.useState("");
  React.useEffect(() => {
    try {
      const d = new Date(document.lastModified);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        setLastMod(`${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    } catch (_) {}
  }, []);

  const rights = lang === "hu"
    ? "készült Claude Design-nal együttműködve"
    : "made in collaboration with Claude Design";
  const updatedLabel = lang === "hu" ? "utolsó módosítás" : "last update";
  const backLabel = lang === "hu" ? "← vissza a főoldalra" : "← back to main";

  return (
    <footer className="footer avc-footer">
      <Reveal variant="up">
        <h2 className="footer__mark">avc<span>.</span></h2>
      </Reveal>

      <div className="avc-footer-grid">
        <a className="avc-qr" href="https://sziklaizsolt.hu/avc/" target="_blank" rel="noreferrer" title="sziklaizsolt.hu/avc">
          <img src="assets/qr.svg" alt="QR — sziklaizsolt.hu/avc" />
          <span className="avc-qr__label">scan &amp; open<br/><code>sziklaizsolt.hu/avc</code></span>
        </a>
        <div className="avc-footer-meta">
          <div>{rights}</div>
          {lastMod && <div className="footer__updated">{updatedLabel} · {lastMod}</div>}
          <div><a href="../index.html">{backLabel}</a></div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  AvIcon, AvSidebar, AvSectionHead, AvHero, AvWhat, AvPipeline, AvProjects, AvProject, AvThanks, AvFooter,
});
