/* =========================================================
   Effects: animated bg, reveal, terminal
   ========================================================= */

const { useEffect: useEffectFx, useRef: useRefFx, useState: useStateFx } = React;

/* ---------- Per-section background "moods" ---------- */
// Each mood controls: star density, drift speed, network connections,
// grid visibility, scanline strength, accent color shift, hue.
const MOODS = {
  home: {
    stars: 260,
    starSpeed: 0.08,
    network: { count: 40, dist: 180, opacity: 0.45 },
    grid:    { size: 96, opacity: 0.12 },
    scan:    { strength: 0.10, speed: 10 },
    hueShift: 0,
    pulse:   { count: 4, speed: 1.2 },
    accentMix: 1.0,
  },
  about: {
    stars: 140,
    starSpeed: 0.05,
    network: { count: 10, dist: 200, opacity: 0.22 },
    grid:    { size: 64, opacity: 0.08 },
    scan:    { strength: 0.06, speed: 6 },
    hueShift: 35,
    pulse:   { count: 1, speed: 0.4 },
    accentMix: 0.55,
  },
  experience: {
    stars: 320,
    starSpeed: 0.12,
    network: { count: 75, dist: 220, opacity: 0.60 },
    grid:    { size: 0, opacity: 0 },
    scan:    { strength: 0.05, speed: 14 },
    hueShift: -25,
    pulse:   { count: 6, speed: 0.9 },
    accentMix: 0.9,
  },
  education: {
    stars: 110,
    starSpeed: 0.04,
    network: { count: 18, dist: 240, opacity: 0.32 },
    grid:    { size: 128, opacity: 0.16 },
    scan:    { strength: 0.03, speed: 4 },
    hueShift: 60,
    pulse:   { count: 1, speed: 0.4 },
    accentMix: 0.5,
  },
  teaching: {
    stars: 170,
    starSpeed: 0.06,
    network: { count: 32, dist: 200, opacity: 0.40 },
    grid:    { size: 72, opacity: 0.14 },
    scan:    { strength: 0.07, speed: 7 },
    hueShift: 80,
    pulse:   { count: 3, speed: 0.9 },
    accentMix: 0.65,
  },
  projects: {
    stars: 360,
    starSpeed: 0.14,
    network: { count: 90, dist: 200, opacity: 0.70 },
    grid:    { size: 48, opacity: 0.14 },
    scan:    { strength: 0.14, speed: 22 },
    hueShift: -90,
    pulse:   { count: 8, speed: 1.8 },
    accentMix: 1.0,
  },
  contact: {
    stars: 200,
    starSpeed: 0.04,
    network: { count: 26, dist: 240, opacity: 0.42 },
    grid:    { size: 80, opacity: 0.10 },
    scan:    { strength: 0.06, speed: 5 },
    hueShift: 10,
    pulse:   { count: 4, speed: 0.8 },
    accentMix: 0.8,
  },
};

const MOOD_ORDER = ["home", "about", "experience", "education", "teaching", "projects", "contact"];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpMood(A, B, t) {
  return {
    stars:     lerp(A.stars, B.stars, t),
    starSpeed: lerp(A.starSpeed, B.starSpeed, t),
    network: {
      count:   lerp(A.network.count, B.network.count, t),
      dist:    lerp(A.network.dist, B.network.dist, t),
      opacity: lerp(A.network.opacity, B.network.opacity, t),
    },
    grid: {
      size:    lerp(A.grid.size || B.grid.size, B.grid.size || A.grid.size, t),
      opacity: lerp(A.grid.opacity, B.grid.opacity, t),
    },
    scan: {
      strength: lerp(A.scan.strength, B.scan.strength, t),
      speed:    lerp(A.scan.speed, B.scan.speed, t),
    },
    hueShift:  lerp(A.hueShift, B.hueShift, t),
    pulse: {
      count: lerp(A.pulse.count, B.pulse.count, t),
      speed: lerp(A.pulse.speed, B.pulse.speed, t),
    },
    accentMix: lerp(A.accentMix, B.accentMix, t),
  };
}

/* ---------- The big canvas ---------- */
function BackgroundField() {
  const ref = useRefFx(null);
  const moodRef = useRefFx({ id: "home", next: "home", t: 0 });

  // Listen for section change events
  useEffectFx(() => {
    const handler = (e) => {
      const { id, next, t } = e.detail;
      moodRef.current = { id, next: next || id, t: t || 0 };
    };
    window.addEventListener("bg-mood", handler);
    return () => window.removeEventListener("bg-mood", handler);
  }, []);

  useEffectFx(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let stars = [];
    let nodes = [];   // network nodes
    let pulses = [];  // expanding rings
    let raf = 0;
    let t0 = performance.now();
    let mounted = true;
    let prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readPalette() {
      const cs = getComputedStyle(document.documentElement);
      const accent = cs.getPropertyValue("--accent").trim() || "oklch(0.86 0.14 155)";
      const fgDim  = cs.getPropertyValue("--fg-dim").trim() || "rgba(180,180,180,0.6)";
      const fgMute = cs.getPropertyValue("--fg-mute").trim() || "rgba(140,140,140,0.5)";
      const isLight = document.documentElement.dataset.theme === "light";
      return { accent, fgDim, fgMute, isLight };
    }

    function rebuild() {
      const maxStars = 480;
      const maxNodes = 130;
      stars = new Array(maxStars).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.3 + Math.random() * 0.9,
        r: Math.random() * 1.4 + 0.4,
        ph: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 1.0,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.10,
      }));
      nodes = new Array(maxNodes).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
      }));
    }

    function resize() {
      // Read viewport size directly to avoid feedback loops with the canvas itself.
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }

    function spawnPulse(mood, pal) {
      pulses.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: 0,
        max: 180 + Math.random() * 220,
        life: 0,
        ttl: 2.8 + Math.random() * 1.6,
        accent: Math.random() < mood.accentMix,
      });
    }

    let lastPulse = 0;

    function tick(now) {
      if (!mounted) return;
      const t = (now - t0) / 1000;
      const dt = Math.min(0.06, (now - (tick._last || now)) / 1000);
      tick._last = now;

      // Resolve current mood
      const m = moodRef.current;
      const A = MOODS[m.id] || MOODS.home;
      const B = MOODS[m.next] || A;
      const mood = lerpMood(A, B, m.t);

      const pal = readPalette();

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // ===== GRID =====
      if (mood.grid.opacity > 0.005 && mood.grid.size > 4) {
        ctx.save();
        ctx.globalAlpha = mood.grid.opacity * (pal.isLight ? 1.4 : 1);
        ctx.strokeStyle = pal.fgMute;
        ctx.lineWidth = 1;
        const ox = (t * 8) % mood.grid.size;
        const oy = (t * 5) % mood.grid.size;
        ctx.beginPath();
        for (let x = -ox; x < w; x += mood.grid.size) {
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = -oy; y < h; y += mood.grid.size) {
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // ===== STARS =====
      const vibeMult = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vibe-mult")) || 1;
      const starCount = Math.round(mood.stars * vibeMult);
      for (let i = 0; i < starCount; i++) {
        const s = stars[i % stars.length];
        s.x += s.vx * mood.starSpeed * 20 * (s.z);
        s.y += s.vy * mood.starSpeed * 20 * (s.z);
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        const twinkle = 0.55 + 0.45 * (Math.sin(t * s.sp + s.ph) * 0.5 + 0.5);
        const useAccent = (i % 13 === 0) && Math.random() < 0.5 + mood.accentMix * 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        if (useAccent || (i % 7 === 0 && mood.accentMix > 0.5)) {
          ctx.fillStyle = pal.accent;
          ctx.globalAlpha = (pal.isLight ? 0.75 : 0.65) * twinkle * s.z;
        } else {
          ctx.fillStyle = pal.fgDim;
          ctx.globalAlpha = (pal.isLight ? 0.55 : 0.35) * twinkle * s.z;
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ===== NETWORK =====
      const nodeCount = Math.round(mood.network.count * vibeMult);
      const linkDist  = mood.network.dist;
      const linkOpac  = mood.network.opacity;
      if (nodeCount > 0 && linkOpac > 0.01) {
        for (let i = 0; i < nodeCount; i++) {
          const n = nodes[i];
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        ctx.save();
        ctx.lineWidth = 1;
        for (let i = 0; i < nodeCount; i++) {
          for (let j = i + 1; j < nodeCount; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < linkDist * linkDist) {
              const d = Math.sqrt(d2);
              const k = 1 - d / linkDist;
              ctx.strokeStyle = ((i+j) % 9 === 0) ? pal.accent : pal.fgMute;
              ctx.globalAlpha = linkOpac * k * (pal.isLight ? 1.3 : 1);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = linkOpac * 1.6 * (pal.isLight ? 1.2 : 1);
        for (let i = 0; i < nodeCount; i++) {
          const n = nodes[i];
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = (i % 5 === 0) ? pal.accent : pal.fgDim;
          ctx.fill();
        }
        ctx.restore();
      }

      // ===== PULSES =====
      if (mood.pulse.count > 0 && mood.pulse.speed > 0) {
        const interval = 2.5 / Math.max(0.1, mood.pulse.speed);
        if (t - lastPulse > interval && pulses.length < Math.ceil(mood.pulse.count)) {
          spawnPulse(mood, pal);
          lastPulse = t;
        }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.life += dt;
        p.r = (p.life / p.ttl) * p.max;
        const a = (1 - p.life / p.ttl);
        if (a <= 0) { pulses.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = p.accent ? pal.accent : pal.fgDim;
        ctx.globalAlpha = a * 0.5 * (pal.isLight ? 1.1 : 1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ===== SCANLINES =====
      if (mood.scan.strength > 0.005) {
        const speed = mood.scan.speed || 8;
        const offset = (t * speed * 12) % h;
        ctx.save();
        ctx.globalAlpha = mood.scan.strength * (pal.isLight ? 1.0 : 1);
        ctx.fillStyle = pal.accent;
        ctx.fillRect(0, offset, w, 1.5);
        // soft bloom strip
        ctx.globalAlpha = mood.scan.strength * 0.25 * (pal.isLight ? 0.9 : 1);
        ctx.fillRect(0, offset - 24, w, 48);
        ctx.restore();
      }

      // ===== HUE TINT OVERLAY =====
      if (Math.abs(mood.hueShift) > 0.5) {
        ctx.save();
        const grad = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h));
        const hue = mood.hueShift;
        const baseHue = 220 + hue;
        grad.addColorStop(0,   `hsla(${baseHue}, 70%, 60%, ${pal.isLight ? 0.07 : 0.12})`);
        grad.addColorStop(0.6, `hsla(${baseHue}, 60%, 50%, ${pal.isLight ? 0.03 : 0.05})`);
        grad.addColorStop(1,   `hsla(${baseHue}, 60%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    resize();

    if (!prefersReduced) {
      raf = requestAnimationFrame(tick);
    } else {
      // Static one-shot render
      tick(performance.now());
    }

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas className="bg-canvas" ref={ref} aria-hidden="true" />;
}

/* ---------- Reveal-on-scroll ---------- */
function Reveal({ children, delay = 0, className = "", variant = "" }) {
  const ref = useRefFx(null);
  const [seen, setSeen] = useStateFx(false);

  useEffectFx(() => {
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

  const base = variant === "up" ? "reveal-up" : "reveal";
  return (
    <div
      ref={ref}
      className={`${base} ${seen ? "reveal--in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- Animated AVC terminal ---------- */
function AVCTerminal({ lang }) {
  const lines = [
    { kind: "cmd",  text: "ralph spawn --model=opus --task=\"refactor sidebar\"" },
    { kind: "out",  text: "→ agent.01  planning…" },
    { kind: "out",  text: "→ agent.02  editing 14 files…" },
    { kind: "out",  text: "→ agent.03  running test suite…" },
    { kind: "ok",   text: "✓ tests passing (118 / 118)" },
    { kind: "cmd",  text: "claude code: review diff" },
    { kind: "out",  text: "→ suggestion: extract <Sidebar/>" },
    { kind: "em",   text: "human (Zsolt): approve ✓" },
    { kind: "ok",   text: "✓ merged · 2.3s · sonnet-4" },
    { kind: "cmd",  text: "" },
  ];

  const [step, setStep] = useStateFx(0);
  const [partial, setPartial] = useStateFx("");
  const ref = useRefFx(null);
  const [active, setActive] = useStateFx(false);

  useEffectFx(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(true)),
      { threshold: 0.25 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffectFx(() => {
    if (!active) return;
    let cancelled = false;

    function runStep(i) {
      if (cancelled) return;
      if (i >= lines.length) {
        setTimeout(() => {
          if (cancelled) return;
          setStep(0); setPartial("");
        }, 2200);
        return;
      }
      const line = lines[i];
      setPartial("");
      let j = 0;
      const total = line.text.length;
      const tickL = () => {
        if (cancelled) return;
        j++;
        setPartial(line.text.slice(0, j));
        if (j < total) setTimeout(tickL, line.kind === "cmd" ? 28 : 18);
        else { setStep(i + 1); setTimeout(() => runStep(i + 1), line.kind === "ok" ? 420 : 260); }
      };
      tickL();
    }
    runStep(0);
    return () => { cancelled = true; };
  }, [active, lang]);

  function renderLine(line, text, isCurrent) {
    if (line.kind === "cmd") {
      return (
        <span className="term-line">
          <span className="term-prompt">$</span>
          <span className="term-em">{text}</span>
          {isCurrent && <span className="term__cursor" />}
        </span>
      );
    }
    if (line.kind === "ok") return <span className="term-line"><span className="term-ok">{text}</span></span>;
    if (line.kind === "em") return <span className="term-line"><span className="term-em">{text}</span></span>;
    return <span className="term-line"><span className="term-out">{text}</span></span>;
  }

  return (
    <div className="term" ref={ref}>
      <div className="term__bar">
        <span className="dot r"></span>
        <span className="dot y"></span>
        <span className="dot g"></span>
        <span className="ttl">avc · sziklaizsolt.hu/avc · zsh</span>
      </div>
      <div className="term__body">
        {lines.map((line, i) => {
          if (i < step) return <React.Fragment key={i}>{renderLine(line, line.text, false)}</React.Fragment>;
          if (i === step) return <React.Fragment key={i}>{renderLine(line, partial, true)}</React.Fragment>;
          return <span className="term-line" key={i}>&nbsp;</span>;
        })}
      </div>
    </div>
  );
}

Object.assign(window, { BackgroundField, Reveal, AVCTerminal, MOOD_ORDER });
