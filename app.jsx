/* =========================================================
   App — v2
   ========================================================= */

const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [lang, setLang] = useStateApp(() => {
    try { return localStorage.getItem("sz_lang") || "hu"; } catch (_) { return "hu"; }
  });
  const [theme, setTheme] = useStateApp(() => {
    try { return localStorage.getItem("sz_theme") || "dark"; } catch (_) { return "dark"; }
  });
  const [activeId, setActiveId] = useStateApp("home");
  const navLockRef = React.useRef(0);

  useEffectApp(() => {
    try { localStorage.setItem("sz_lang", lang); } catch (_) {}
    document.documentElement.lang = lang;
  }, [lang]);

  useEffectApp(() => {
    try { localStorage.setItem("sz_theme", theme); } catch (_) {}
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // scroll-spy + smooth mood crossfade based on scroll position
  useEffectApp(() => {
    const ids = window.SITE_CONTENT.NAV[lang].map((n) => n.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    // Active section detection (highlight nav)
    const io = new IntersectionObserver(
      (entries) => {
        // Honor nav lock — when user just clicked, give the smooth scroll time
        if (Date.now() < navLockRef.current) return;
        let best = null;
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (!best || e.intersectionRatio > best.intersectionRatio) {
              best = e;
            }
          }
        });
        if (best && best.target && best.target.id) {
          setActiveId(best.target.id);
        }
      },
      {
        rootMargin: "-40% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );
    sections.forEach((s) => io.observe(s));

    // Smooth mood crossfade — compute t between current & next section
    let raf = 0;
    let mounted = true;
    function updateMood() {
      if (!mounted) return;
      const viewportY = window.innerHeight * 0.45; // probe line
      let prev = sections[0], next = sections[0], t = 0;
      for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= viewportY) {
          prev = sections[i];
          next = sections[i + 1] || sections[i];
        } else {
          // first section past probe; compute t
          const prevR = prev.getBoundingClientRect();
          const span = sections[i].getBoundingClientRect().top - prevR.top;
          if (span > 0) {
            t = Math.max(0, Math.min(1, (viewportY - prevR.top) / span));
          }
          break;
        }
      }
      const ev = new CustomEvent("bg-mood", {
        detail: { id: prev.id, next: next.id, t }
      });
      window.dispatchEvent(ev);
      raf = requestAnimationFrame(updateMood);
    }
    raf = requestAnimationFrame(updateMood);

    return () => {
      io.disconnect();
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [lang]);

  // initial hash scroll
  useEffectApp(() => {
    const id = (window.location.hash || "").replace("#", "");
    if (id) {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }
  }, []);

  const handleNav = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    // Lock scroll-spy while smooth scroll is in flight
    navLockRef.current = Date.now() + 3000; // hard cap
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    // Release lock once scroll settles (or after the cap)
    let last = -1, idle = 0;
    const tick = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 1) {
        idle++;
        if (idle >= 6) {              // ~100ms of no motion
          navLockRef.current = 0;
          return;
        }
      } else {
        idle = 0;
      }
      last = y;
      if (Date.now() < navLockRef.current) requestAnimationFrame(tick);
      else navLockRef.current = 0;
    };
    requestAnimationFrame(tick);
  };

  // Global cursor spotlight — viewport coords on <html>
  useEffectApp(() => {
    let raf = 0, pending = false;
    const onMove = (e) => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty("--cur-x", `${x}%`);
        document.documentElement.style.setProperty("--cur-y", `${y}%`);
        pending = false;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const C = window.SITE_CONTENT;

  return (
    <>
      <BackgroundField />
      <div className="cursor-spot" aria-hidden="true"></div>
      <div className="app">
        <Sidebar
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          activeId={activeId}
          content={C}
          onNav={handleNav}
        />
        <main className="main">
          <Hero       data={C.HERO[lang]}       lang={lang} />
          <Ticker     items={C.HERO[lang].marquee} />
          <About      data={C.ABOUT[lang]}      lang={lang} />
          <Experience data={C.EXPERIENCE[lang]} lang={lang} />
          <Education  data={C.EDUCATION[lang]}  lang={lang} />
          <Teaching   data={C.TEACHING[lang]}   lang={lang} />
          <Projects   data={C.PROJECTS[lang]}   lang={lang} />
          <Contact    data={C.CONTACT[lang]}    lang={lang} />
          <Footer     data={C.FOOTER[lang]}     lang={lang} />
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
