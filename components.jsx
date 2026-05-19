/* =========================================================
   Components — v2 editorial layout
   ========================================================= */

const { useState, useEffect, useRef, useMemo } = React;

/* ---------- Icons ---------- */
function Icon({ name, size = 14 }) {
  const s = size;
  const stroke = "currentColor";
  const sw = 1.5;
  switch (name) {
    case "arrow":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3 13L13 3M13 3H6M13 3V10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>);

    case "mail":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke={stroke} strokeWidth={sw} />
          <path d="M3 5l5 4 5-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>);

    case "linkedin":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke={stroke} strokeWidth={sw} />
          <circle cx="5" cy="5.5" r="0.8" fill={stroke} />
          <path d="M5 7.5v4M8 7.5v4M11 11.5v-2c0-1.1-.9-2-2-2s-2 .9-2 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>);

    case "sun":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth={sw} />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>);

    case "moon":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>);

    case "pin":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5c2.5 0 4.5 2 4.5 4.5 0 3.5-4.5 8.5-4.5 8.5S3.5 9.5 3.5 6c0-2.5 2-4.5 4.5-4.5z" stroke={stroke} strokeWidth={sw} />
          <circle cx="8" cy="6" r="1.7" stroke={stroke} strokeWidth={sw} />
        </svg>);

    case "phone":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3 3c0 6 4 10 10 10l1.5-2.5-3-1.5-1 1c-1.5-.5-3-2-3.5-3.5l1-1L6.5 2.5 4 3z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>);

    case "menu":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>);

    case "close":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>);

    default:
      return null;
  }
}

/* ---------- Sidebar ---------- */
function Sidebar({ lang, setLang, theme, setTheme, activeId, content, onNav }) {
  const C = content;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close drawer on Esc and lock body scroll while open
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const navClick = (id) => {
    setMobileOpen(false);
    onNav(id);
  };

  return (
    <>
      {/* Mobile top bar — only visible at narrow widths */}
      <div className={`mobile-bar${mobileOpen ? " mobile-bar--open" : ""}`}>
        <a href="#home" onClick={(e) => { e.preventDefault(); navClick("home"); }} className="mobile-bar__brand">
          <span className="mobile-bar__name">{lang === "hu" ? "Sziklai Zsolt" : "Zsolt Sziklai"}</span>
          <span className="mobile-bar__role">{lang === "hu" ? "Informatikus · Mestertanár" : "Computer Scientist · Senior Lecturer"}</span>
        </a>
        <button
          className="mobile-bar__toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}>
          <Icon name={mobileOpen ? "close" : "menu"} size={16} />
        </button>
      </div>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true"></div>}

      <aside className={`sidebar${mobileOpen ? " sidebar--mobile-open" : ""}`}>
      <div className="portrait" aria-label="Sziklai Zsolt portrait">
        <img className="portrait__img" src="portrait.png" alt="Sziklai Zsolt" />
        <div className="portrait__noise" aria-hidden="true"></div>
        <div className="portrait__label">
          <span>{lang === "hu" ? "SZIKLAI Zsolt" : "Zsolt Sziklai"}</span>
          <span>BUDAPEST · HU</span>
        </div>
      </div>

      <div className="sidebar__id">
        <div className="sidebar__kicker">
          <span className="dot" aria-hidden="true"></span>
          <span>{lang === "hu" ? "elérhető · konzultáció" : "available · consulting"}</span>
        </div>
        <h1 className="sidebar__name">{lang === "hu" ? "Sziklai Zsolt" : "Zsolt Sziklai"}</h1>
        <div className="sidebar__role">{lang === "hu" ? "Informatikus · Mestertanár" : "Computer Scientist · Senior Lecturer"}</div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {C.NAV[lang].map((item, i) =>
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`navlink${activeId === item.id ? " navlink--active" : ""}`}
          onClick={(e) => { e.preventDefault(); navClick(item.id); }}>
          
            <span className="navlink__num">{String(i).padStart(2, "0")}</span>
            <span className="navlink__bar" aria-hidden="true"></span>
            <span className="navlink__label">{item.label}</span>
          </a>
        )}
      </nav>

      <div className="sidebar__footer">
        <div className="contact-line">
          <span className="contact-line__label"><Icon name="mail" size={12} /></span>
          <a href="mailto:info@sziklaizsolt.hu">info@sziklaizsolt.hu</a>
        </div>
        <div className="contact-line">
          <span className="contact-line__label"><Icon name="phone" size={12} /></span>
          <a href="tel:+36703322198">+36 70 332 2198</a>
        </div>
        <div className="contact-line">
          <span className="contact-line__label"><Icon name="pin" size={12} /></span>
          <span>Budapest, HU</span>
        </div>

        <div className="sidebar__controls">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button aria-pressed={lang === "hu"} onClick={() => setLang("hu")}>HU</button>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}>
            
            <Icon name={theme === "dark" ? "sun" : "moon"} size={13} />
          </button>
          <a className="icon-btn" href="https://hu.linkedin.com/in/zsoltsziklai" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <Icon name="linkedin" size={13} />
          </a>
        </div>
      </div>
    </aside>
    </>);

}

/* ---------- Section head with ghost number ---------- */
function SectionHead({ num, title, titleBold, lead, ghost }) {
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
    </>);

}

/* ---------- Hero ---------- */
function Hero({ data, lang }) {
  const innerRef = useRef(null);
  const sectionRef = useRef(null);
  const lastNameRef = useRef(null);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  // Type the surname
  useEffect(() => {
    const target = data.nameLast;
    setTyped("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 70);
    return () => clearInterval(id);
  }, [data.nameLast]);

  // Cursor spotlight tracking
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const onMove = (e) => {
      const r = sec.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 100;
      const y = (e.clientY - r.top) / r.height * 100;
      sec.style.setProperty("--mx", `${x}%`);
      sec.style.setProperty("--my", `${y}%`);
    };
    sec.addEventListener("pointermove", onMove);
    return () => sec.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <section id="home" className="section hero" ref={sectionRef}>
      <div className="hero__spot" aria-hidden="true"></div>
      <div className="hero__grid" aria-hidden="true"></div>

      <div className="hero__inner" ref={innerRef}>
        <Reveal>
          <div className="hero__kicker">
            <span>{data.kicker}</span>
            <span className="pill">{data.pill}</span>
          </div>
        </Reveal>

        <Reveal variant="up" delay={100}>
          <h1 className="hero__name">
            {data.nameOrder === "lastFirst" ?
            <>
                <span ref={lastNameRef}>
                  {typed}
                  {!done && <span className="cursor" aria-hidden="true"></span>}
                </span>
                <span className="first first--right">{data.nameFirst}</span>
              </> :

            <>
                <span className="first">{data.nameFirst}</span>
                <span ref={lastNameRef}>
                  {typed}
                  {!done && <span className="cursor" aria-hidden="true"></span>}
                </span>
              </>
            }
          </h1>
        </Reveal>

        <Reveal variant="up" delay={200}>
          <div className="hero__role-line">
            <span className="em">{data.roleEm}.</span>
            <span className="rule" aria-hidden="true"></span>
            <span className="badge">
              <strong>{data.badgeLine1}</strong>
              <span>{data.badgeLine2}</span>
            </span>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <p className="hero__sub" dangerouslySetInnerHTML={{ __html: data.sub }} />
        </Reveal>

        <Reveal delay={340}>
          <div className="hero__stats">
            {data.stats.map((s, i) =>
            <div className="stat" key={i}>
                <div className="stat__k">{s.k}{s.sup && <sup>{s.sup}</sup>}</div>
                <div className="stat__v">{s.v}</div>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={420}>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#contact">
              {data.ctaPrimary}
              <span className="btn__arrow"><Icon name="arrow" /></span>
            </a>
            <a className="btn" href="https://hu.linkedin.com/in/zsoltsziklai" target="_blank" rel="noreferrer">
              {data.ctaSecondary}
              <span className="btn__arrow"><Icon name="arrow" /></span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>);

}

/* ---------- Marquee ticker ---------- */
function Ticker({ items }) {
  // duplicate so loop is seamless
  const stream = [...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {stream.map((t, i) =>
        <span key={i}>
            <span className={i % items.length === 0 ? "em" : ""}>{t}</span>
            <span className="sep">✦</span>
          </span>
        )}
      </div>
    </div>);

}

/* ---------- About ---------- */
function About({ data, lang }) {
  return (
    <section id="about" className="section">
      <SectionHead num="01" title={lang === "hu" ? "Rólam" : "About"} lead={data.lead} ghost="01" />
      <div className="about-grid">
        <Reveal>
          <blockquote className="pullquote" dangerouslySetInnerHTML={{ __html: data.pull }} />
          <div className="prose">
            {data.paragraphs.map((p, i) =>
            <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="factsheet">
            <div className="factsheet__head">
              <h4>{data.factsTitle}</h4>
              <span className="ref">/ ref · cv-2026</span>
            </div>
            {data.facts.map((f, i) => <div className="factsheet__row" key={i}>
                <div className="factsheet__key">{f.k}</div>
                <div className="factsheet__val">
                  {f.href ? <a href={f.href}>{f.v}</a> : f.v}
                </div>
              </div>)}
            <div className="interests">
              <div className="interests__label">{data.interestsTitle}</div>
              <div className="interests__items">
                {data.interests.map((it, i) =>
                <span className="chip" key={i}>{it}</span>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>);

}

/* ---------- Experience ---------- */
function ExperienceItem({ item }) {
  return (
    <Reveal>
      <article className={`exp${item.current ? " exp--current" : ""}`}>
        <div className={`exp__period${item.current ? " exp__period--current" : ""}`}>
          {item.period}
        </div>
        <div>
          <h3 className="exp__role">
            {item.role}
            {item.roleNote && <span className="role-note">{item.roleNote}</span>}
          </h3>
          <div className="exp__company">{item.company}</div>
          <p className="exp__desc">{item.desc}</p>
          <div className="exp__stack">
            {item.stack.map((s, i) => <span key={i} className="chip">{s}</span>)}
          </div>
        </div>
      </article>
    </Reveal>);

}

function Experience({ data, lang }) {
  const tlRef = useRef(null);

  useEffect(() => {
    const el = tlRef.current;
    if (!el) return;

    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress from when the timeline top hits 70% of viewport
      // to when timeline bottom passes 30% of viewport
      const start = vh * 0.7;
      const end = vh * 0.3;
      const span = r.height + (start - end);
      const passed = start - r.top;
      const ratio = Math.max(0, Math.min(1, passed / span));
      el.style.setProperty("--tl-progress", `${ratio * r.height}px`);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="experience" className="section">
      <SectionHead num="02" title={lang === "hu" ? "Pálya" : "Career"} titleBold={lang === "hu" ? "ívek." : "arc."} lead={data.lead} ghost="02" />
      <div className="timeline" ref={tlRef}>
        <div className="timeline__progress" aria-hidden="true"></div>
        {data.items.map((it, i) => <ExperienceItem key={i} item={it} />)}
      </div>
    </section>);

}

/* ---------- Education ---------- */
function Education({ data, lang }) {
  return (
    <section id="education" className="section">
      <SectionHead num="03" title={lang === "hu" ? "Tanulmányok" : "Education"} lead={data.lead} ghost="03" />
      <div className="edu-grid">
        {data.items.map((it, i) =>
        <Reveal key={i} delay={i * 60}>
            <article className="edu">
              <div className="edu__period">{it.period}</div>
              <h3 className="edu__degree">{it.degree}</h3>
              <div className="edu__inst">{it.inst}</div>
              <div className="edu__meta">{it.meta}</div>
            </article>
          </Reveal>
        )}
      </div>
    </section>);

}

/* ---------- Teaching ---------- */
function Teaching({ data, lang }) {
  return (
    <section id="teaching" className="section">
      <SectionHead num="04" title={lang === "hu" ? "Oktatás" : "Teaching"} lead={data.lead} ghost="04" />
      <Reveal><p className="teach-intro">{data.intro}</p></Reveal>
      <Reveal delay={80}>
        <div className="teach-grid">
          {data.items.map((it, i) =>
          <article className="teach" key={i}>
              <div className="teach__num">T·{String(i + 1).padStart(2, "0")}</div>
              <h3 className="teach__title">{it.title}</h3>
              <p className="teach__desc">{it.desc}</p>
            </article>
          )}
        </div>
      </Reveal>
    </section>);

}

/* ---------- Featured AVC ---------- */
function FeaturedAVC({ data, lang }) {
  return (
    <Reveal>
      <a className="featured" href="./avc/index.html">
        <div>
          <div className="featured__kicker">
            <span className="live" aria-hidden="true"></span>
            <span>{data.kicker}</span>
          </div>
          <h3 className="featured__title">
            {data.title} <b>{data.titleEm}</b>
          </h3>
          <span className="featured__url">
            <Icon name="arrow" size={12} /> {data.url}
          </span>
          <p className="featured__desc">{data.desc}</p>
          <div className="featured__tags">
            {data.tags.map((t, i) => <span key={i} className={i === 0 ? "chip chip--accent" : "chip"}>{t}</span>)}
          </div>
        </div>
        <AVCTerminal lang={lang} />
      </a>
    </Reveal>);

}

/* ---------- Projects ---------- */
function Projects({ data, lang }) {
  return (
    <section id="projects" className="section">
      <SectionHead num="05" title={lang === "hu" ? "Projektek" : "Projects"} lead={data.lead} ghost="05" />
      <FeaturedAVC data={data.featured} lang={lang} />
      <Reveal delay={80}>
        <div className="projects-grid">
          {data.items.map((it, i) =>
          <article className="project" key={i}>
              <div className="project__num">P·{String(i + 1).padStart(2, "0")}</div>
              <h3 className="project__title">{it.title}</h3>
              <p className="project__desc">{it.desc}</p>
              <div className="project__stack">
                {it.stack.map((s, j) => <span key={j} className="chip">{s}</span>)}
              </div>
            </article>
          )}
        </div>
      </Reveal>
    </section>);

}

/* ---------- Contact ---------- */
function Contact({ data, lang }) {
  return (
    <section id="contact" className="section">
      <SectionHead num="06" title={lang === "hu" ? "Kapcsolat" : "Contact"} lead={data.lead} ghost="06" />
      <div className="contact-big">
        <Reveal variant="up">
          <h3 className="contact-big__lead">
            {data.bigA} <b>{data.bigB}</b>
          </h3>
        </Reveal>
        <Reveal delay={120}>
          <p className="contact-big__sub">{data.bigSub}</p>
        </Reveal>
      </div>
      <div className="contact-grid">
        {data.cards.map((c, i) =>
        <Reveal key={i} delay={i * 60}>
            <a className="contact-card" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <div>
                <div className="contact-card__label">/ {String(i + 1).padStart(2, "0")} · {c.label}</div>
                <div className="contact-card__value">{c.value}</div>
              </div>
              <span className="contact-card__arrow"><Icon name="arrow" /></span>
            </a>
          </Reveal>
        )}
      </div>
      <div className="affil-grid">
        {data.affil.map((a, i) =>
        <Reveal key={i} delay={i * 60}>
            <div className="affil">
              <div className="affil__label">{a.label}</div>
              <div className="affil__value">{a.value}</div>
            </div>
          </Reveal>
        )}
      </div>
    </section>);

}

/* ---------- Footer ---------- */
function Footer({ data, lang }) {
  const [lastMod, setLastMod] = React.useState("");
  React.useEffect(() => {
    try {
      const d = new Date(document.lastModified);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        const stamp = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setLastMod(stamp);
      }
    } catch (_) {}
  }, []);
  const updatedLabel = lang === "hu" ? "utolsó módosítás" : "last update";
  return (
    <footer className="footer">
      <Reveal variant="up">
        <h2 className="footer__mark">{lang === "hu" ? "SZIKLAI Zsolt" : "Zsolt Sziklai"}<span>.</span></h2>
      </Reveal>
      <div className="footer__row">
        <div>{data.rights}</div>
        {lastMod && <div className="footer__updated">{updatedLabel} · {lastMod}</div>}
      </div>
    </footer>);

}

Object.assign(window, {
  Sidebar, Hero, About, Experience, Education, Teaching, Projects, Contact, Footer, Icon, Ticker
});