/* =========================================================
   Components
   ========================================================= */

const { useState, useEffect, useRef, useMemo } = React;

/* ---------- Icons (small, original) ---------- */
function Icon({ name, size = 14 }) {
  const s = size;
  const stroke = "currentColor";
  const sw = 1.5;
  switch (name) {
    case "arrow":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3 13L13 3M13 3H6M13 3V10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mail":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke={stroke} strokeWidth={sw} />
          <path d="M3 5l5 4 5-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke={stroke} strokeWidth={sw} />
          <circle cx="5" cy="5.5" r="0.8" fill={stroke} />
          <path d="M5 7.5v4M8 7.5v4M11 11.5v-2c0-1.1-.9-2-2-2s-2 .9-2 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "sun":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth={sw} />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case "pin":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5c2.5 0 4.5 2 4.5 4.5 0 3.5-4.5 8.5-4.5 8.5S3.5 9.5 3.5 6c0-2.5 2-4.5 4.5-4.5z" stroke={stroke} strokeWidth={sw} />
          <circle cx="8" cy="6" r="1.7" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "phone":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M3 3c0 6 4 10 10 10l1.5-2.5-3-1.5-1 1c-1.5-.5-3-2-3.5-3.5l1-1L6.5 2.5 4 3z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------- Sidebar ---------- */
function Sidebar({ lang, setLang, theme, setTheme, activeId, content, onNav }) {
  const C = content;
  return (
    <aside className="sidebar">
      <div className="sidebar__portrait">
        <div className="portrait-slot">
          <span className="portrait-slot__corner portrait-slot__corner--tl">
            [ portrait — drop here ]
          </span>
          <span className="portrait-slot__corner">1080×1080</span>
          <span className="portrait-slot__corner">.jpg</span>
        </div>
      </div>

      <div className="sidebar__id">
        <div className="sidebar__kicker">
          <span className="dot" aria-hidden="true"></span>
          <span>{lang === "hu" ? "elérhető · konzultáció" : "available · consulting"}</span>
        </div>
        <h1 className="sidebar__name">Sziklai Zsolt</h1>
        <div className="sidebar__role">Computer Scientist · Mestertanár</div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {C.NAV[lang].map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`navlink${activeId === item.id ? " navlink--active" : ""}`}
            onClick={(e) => { e.preventDefault(); onNav(item.id); }}
          >
            <span className="navlink__num">{String(i).padStart(2, "0")}</span>
            <span className="navlink__bar" aria-hidden="true"></span>
            <span className="navlink__label">{item.label}</span>
          </a>
        ))}
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
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={13} />
          </button>
          <a className="icon-btn" href="https://hu.linkedin.com/in/zsoltsziklai" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <Icon name="linkedin" size={13} />
          </a>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Reveal-on-scroll wrapper ---------- */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "reveal--in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- Section head ---------- */
function SectionHead({ num, title, lead }) {
  return (
    <Reveal className="section__head-wrap">
      <div className="section__head">
        <span className="section__num">// {num}</span>
        <h2 className="section__title">{title}.</h2>
      </div>
      {lead && <p className="section__lead">{lead}</p>}
    </Reveal>
  );
}

/* ---------- Hero ---------- */
function Hero({ data, lang }) {
  const fullName = `${data.titleA} ${data.titleB}`;
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setDone(false);
    let i = 0;
    const speed = 55;
    const id = setInterval(() => {
      i++;
      setTyped(fullName.slice(0, i));
      if (i >= fullName.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [fullName]);

  return (
    <section id="home" className="section hero">
      <div className="hero__inner">
        <div className="hero__kicker">{data.kicker}</div>
        <h1 className="hero__title">
          {typed}
          {!done && <span className="cursor" aria-hidden="true"></span>}
          {done && (
            <>
              <br />
              <em>{data.titleEm}</em>
            </>
          )}
        </h1>
        <p className="hero__sub" dangerouslySetInnerHTML={{ __html: data.sub }} />
        <div className="hero__tags">
          {data.tags.map((t, i) => (
            <span key={i} className={`tag${i === 0 ? " tag--accent" : ""}`}>{t}</span>
          ))}
        </div>
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

        <div className="now">
          <span className="now__label">{data.nowLabel}</span>
          <span className="now__sep" aria-hidden="true"></span>
          <span className="now__text">{data.nowText}</span>
          <a className="now__link" href="https://sziklaizsolt.hu/avc" target="_blank" rel="noreferrer">
            {data.nowLink}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- About ---------- */
function About({ data, lang }) {
  return (
    <section id="about" className="section">
      <SectionHead num="01" title={data.title} lead={data.lead} />
      <div className="about-grid">
        <Reveal>
          <div className="prose">
            {data.paragraphs.map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="factsheet">
            <div className="sidebar__kicker" style={{ marginBottom: 14 }}>
              <span className="dot" style={{ animation: "none" }}></span>
              <span>{data.factsTitle}</span>
            </div>
            {data.facts.map((f, i) => (
              <div className="factsheet__row" key={i}>
                <div className="factsheet__key">{f.k}</div>
                <div className="factsheet__val">
                  {f.href ? <a href={f.href}>{f.v}</a> : f.v}
                </div>
              </div>
            ))}
            <div className="interests">
              {data.interests.map((it, i) => (
                <span className="chip" key={i}>{it}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Experience ---------- */
function ExperienceItem({ item, lang }) {
  return (
    <Reveal>
      <article className="exp">
        <div className={`exp__period${item.current ? " exp__period--current" : ""}`}>
          {item.period}
        </div>
        <div>
          <h3 className="exp__role">
            {item.role}
            {item.roleNote && <span>· {item.roleNote}</span>}
          </h3>
          <div className="exp__company">{item.company}</div>
          <p className="exp__desc">{item.desc}</p>
          <div className="exp__stack">
            {item.stack.map((s, i) => <span key={i} className="chip">{s}</span>)}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function Experience({ data, lang }) {
  return (
    <section id="experience" className="section">
      <SectionHead num="02" title={data.title} lead={data.lead} />
      <div className="timeline">
        {data.items.map((it, i) => <ExperienceItem key={i} item={it} lang={lang} />)}
      </div>
    </section>
  );
}

/* ---------- Education ---------- */
function Education({ data }) {
  return (
    <section id="education" className="section">
      <SectionHead num="03" title={data.title} lead={data.lead} />
      <div className="edu-grid">
        {data.items.map((it, i) => (
          <Reveal key={i} delay={i * 60}>
            <article className="edu">
              <div className="edu__period">{it.period}</div>
              <h3 className="edu__degree">{it.degree}</h3>
              <div className="edu__inst">{it.inst}</div>
              <div className="edu__meta">{it.meta}</div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Teaching ---------- */
function Teaching({ data }) {
  return (
    <section id="teaching" className="section">
      <SectionHead num="04" title={data.title} lead={data.lead} />
      <Reveal><p className="section__lead">{data.intro}</p></Reveal>
      <div className="teach-grid">
        {data.items.map((it, i) => (
          <Reveal key={i} delay={i * 60}>
            <article className="teach">
              <div className="teach__num">T·{String(i + 1).padStart(2, "0")}</div>
              <h3 className="teach__title">{it.title}</h3>
              <p className="teach__desc">{it.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Featured AVC ---------- */
function FeaturedAVC({ data, lang }) {
  return (
    <Reveal>
      <article className="featured">
        <div>
          <div className="featured__kicker">
            <span className="live" aria-hidden="true"></span>
            <span>{data.kicker}</span>
          </div>
          <h3 className="featured__title">
            {data.title} <em>{data.titleEm}</em>
          </h3>
          <a className="featured__url" href="https://sziklaizsolt.hu/avc" target="_blank" rel="noreferrer">
            <Icon name="arrow" size={12} /> {data.url}
          </a>
          <p className="featured__desc">{data.desc}</p>
          <div className="featured__tags">
            {data.tags.map((t, i) => <span key={i} className="chip">{t}</span>)}
          </div>
        </div>
        <div className="featured__viz" aria-hidden="true">
          <span className="term-line"><span className="term-prompt">$</span> ralph spawn --model=opus --task="refactor"</span>
          <span className="term-line"><span className="term-out">→ agent 01: planning…</span></span>
          <span className="term-line"><span className="term-out">→ agent 02: editing 14 files…</span></span>
          <span className="term-line"><span className="term-out">→ tests: <span className="term-em">passing</span></span></span>
          <span className="term-line"><span className="term-prompt">$</span> human: <span className="term-em">approve</span> ✓</span>
          <span className="term-line"><span className="term-prompt">$</span> <span className="cursor" style={{ background: "currentColor" }}></span></span>
        </div>
      </article>
    </Reveal>
  );
}

/* ---------- Projects ---------- */
function Projects({ data, lang }) {
  return (
    <section id="projects" className="section">
      <SectionHead num="05" title={data.title} lead={data.lead} />
      <FeaturedAVC data={data.featured} lang={lang} />
      <div className="projects-grid">
        {data.items.map((it, i) => (
          <Reveal key={i} delay={i * 50}>
            <article className="project">
              <div className="project__num">P·{String(i + 1).padStart(2, "0")}</div>
              <h3 className="project__title">{it.title}</h3>
              <p className="project__desc">{it.desc}</p>
              <div className="project__stack">
                {it.stack.map((s, j) => <span key={j} className="chip">{s}</span>)}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Contact ---------- */
function Contact({ data }) {
  return (
    <section id="contact" className="section">
      <SectionHead num="06" title={data.title} lead={data.lead} />
      <div className="contact-grid">
        {data.cards.map((c, i) => (
          <Reveal key={i} delay={i * 50}>
            <a className="contact-card" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <div>
                <div className="contact-card__label">{c.label}</div>
                <div className="contact-card__value">{c.value}</div>
              </div>
              <span className="contact-card__arrow"><Icon name="arrow" /></span>
            </a>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <div className="sidebar__kicker" style={{ marginBottom: 12 }}>
          <span className="dot" style={{ animation: "none" }}></span>
          <span>{data.affilTitle}</span>
        </div>
      </Reveal>
      <div className="affil-grid">
        {data.affil.map((a, i) => (
          <Reveal key={i} delay={i * 50}>
            <div className="affil">
              <div className="affil__label">{a.label}</div>
              <div className="affil__value">{a.value}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer({ data }) {
  return (
    <footer className="footer">
      <div>{data.rights}</div>
      <div>{data.built}</div>
    </footer>
  );
}

Object.assign(window, {
  Sidebar, Hero, About, Experience, Education, Teaching, Projects, Contact, Footer, Reveal, Icon,
});
