/* =========================================================
   App — wires it all together
   ========================================================= */

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  const [lang, setLang] = useStateApp(() => {
    try { return localStorage.getItem("sz_lang") || "hu"; } catch (_) { return "hu"; }
  });
  const [theme, setTheme] = useStateApp(() => {
    try { return localStorage.getItem("sz_theme") || "dark"; } catch (_) { return "dark"; }
  });
  const [activeId, setActiveId] = useStateApp("home");

  // persist lang
  useEffectApp(() => {
    try { localStorage.setItem("sz_lang", lang); } catch (_) {}
    document.documentElement.lang = lang;
  }, [lang]);

  // persist theme + apply
  useEffectApp(() => {
    try { localStorage.setItem("sz_theme", theme); } catch (_) {}
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // scroll-spy
  useEffectApp(() => {
    const ids = window.SITE_CONTENT.NAV[lang].map((n) => n.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Find the most-intersecting entry in view
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
    return () => io.disconnect();
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
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  const C = window.SITE_CONTENT;

  return (
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
        <About      data={C.ABOUT[lang]}      lang={lang} />
        <Experience data={C.EXPERIENCE[lang]} lang={lang} />
        <Education  data={C.EDUCATION[lang]}  />
        <Teaching   data={C.TEACHING[lang]}   />
        <Projects   data={C.PROJECTS[lang]}   lang={lang} />
        <Contact    data={C.CONTACT[lang]}    />
        <Footer     data={C.FOOTER[lang]}     />
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
