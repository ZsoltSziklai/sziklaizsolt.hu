/* =========================================================
   AVC app
   ========================================================= */

const { useState: useStateApp2, useEffect: useEffectApp2 } = React;

function AvApp() {
  const [lang, setLang] = useStateApp2(() => {
    try { return localStorage.getItem("sz_lang") || "hu"; } catch (_) { return "hu"; }
  });
  const [theme, setTheme] = useStateApp2(() => {
    try { return localStorage.getItem("sz_theme") || "dark"; } catch (_) { return "dark"; }
  });
  const [activeId, setActiveId] = useStateApp2("home");
  const navLockRefAv = React.useRef(0);

  useEffectApp2(() => {
    try { localStorage.setItem("sz_lang", lang); } catch (_) {}
    document.documentElement.lang = lang;
  }, [lang]);

  useEffectApp2(() => {
    try { localStorage.setItem("sz_theme", theme); } catch (_) {}
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffectApp2(() => {
    const ids = window.AVC_CONTENT.AVC_NAV[lang]
      .map((n) => n.id)
      .filter((id) => id !== "back");
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < navLockRefAv.current) return;
        let best = null;
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
          }
        });
        if (best && best.target?.id) setActiveId(best.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => io.observe(s));

    // Smooth mood crossfade
    let raf = 0, mounted = true;
    const MOOD_IDS = ["home", "what", "pipeline", "projects", "thanks"];
    // Map AVC sections to main-site mood names so the BackgroundField has presets to work with
    const MOOD_MAP = {
      home:     "home",
      what:     "about",
      pipeline: "experience",
      projects: "projects",
      thanks:   "contact",
    };
    function updateMood() {
      if (!mounted) return;
      const viewportY = window.innerHeight * 0.45;
      let prev = sections[0], next = sections[0], t = 0;
      for (let i = 0; i < sections.length; i++) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= viewportY) {
          prev = sections[i];
          next = sections[i + 1] || sections[i];
        } else {
          const prevR = prev.getBoundingClientRect();
          const span = sections[i].getBoundingClientRect().top - prevR.top;
          if (span > 0) t = Math.max(0, Math.min(1, (viewportY - prevR.top) / span));
          break;
        }
      }
      const ev = new CustomEvent("bg-mood", {
        detail: { id: MOOD_MAP[prev.id] || "home", next: MOOD_MAP[next.id] || "home", t },
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

  // Cursor spotlight
  useEffectApp2(() => {
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

  // Restore scroll to project card on return from viewer
  useEffectApp2(() => {
    let pid = null;
    try { pid = sessionStorage.getItem("avc-return-to"); } catch (_) {}
    if (!pid) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById(`proj-${pid}`);
      if (el) {
        clearInterval(t);
        try { sessionStorage.removeItem("avc-return-to"); } catch (_) {}
        el.scrollIntoView({ behavior: "auto", block: "center" });
      } else if (++tries > 30) {
        clearInterval(t);
        try { sessionStorage.removeItem("avc-return-to"); } catch (_) {}
      }
    }, 40);
    return () => clearInterval(t);
  }, []);

  const handleNav = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    navLockRefAv.current = Date.now() + 3000;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    let last = -1, idle = 0;
    const tick = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 1) {
        idle++;
        if (idle >= 6) { navLockRefAv.current = 0; return; }
      } else { idle = 0; }
      last = y;
      if (Date.now() < navLockRefAv.current) requestAnimationFrame(tick);
      else navLockRefAv.current = 0;
    };
    requestAnimationFrame(tick);
  };

  const C = window.AVC_CONTENT;
  const projData = lang === "hu" ? C.AVC_PROJECTS.hu : { ...C.AVC_PROJECTS.en, items: C.AVC_PROJECTS.hu.items };
  const meta = { ...C.AVC_META[lang], builtNote: C.AVC_META[lang].builtNote };

  return (
    <>
      <BackgroundField />
      <div className="cursor-spot" aria-hidden="true"></div>
      <div className="app">
        <AvSidebar
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          activeId={activeId}
          content={C}
          onNav={handleNav}
        />
        <main className="main">
          <AvHero     data={C.AVC_HERO[lang]}     lang={lang} />
          <AvWhat     data={C.AVC_WHAT[lang]}     lang={lang} />
          <AvPipeline data={C.AVC_PIPELINE[lang]} lang={lang} />
          <AvProjects data={projData} dataHu={C.AVC_PROJECTS.hu} lang={lang} />
          <AvThanks   data={C.AVC_THANKS[lang]}   lang={lang} />
          <AvFooter   data={meta}                 lang={lang} />
        </main>
      </div>
    </>
  );
}

const root2 = ReactDOM.createRoot(document.getElementById("root"));
root2.render(<AvApp />);
