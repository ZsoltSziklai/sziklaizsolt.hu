/* =========================================================
   AVC viewers — vanilla JS background field + cursor spotlight
   Port of effects.jsx BackgroundField + app.jsx cursor handler,
   stripped of React and section-based mood switching.
   Renders a single static mood (the AVC "projects" mood) so the
   viewer pages match the look of /avc/#projects.
   ========================================================= */

(function () {
  // Static mood — matches MOODS.projects in effects.jsx
  var MOOD = {
    stars: 360,
    starSpeed: 0.14,
    network: { count: 90, dist: 200, opacity: 0.70 },
    grid:    { size: 48, opacity: 0.14 },
    scan:    { strength: 0.14, speed: 22 },
    hueShift: -90,
    pulse:   { count: 8, speed: 1.8 },
    accentMix: 1.0,
  };

  function initBackgroundField(canvas) {
    if (!canvas) return function () {};
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var stars = [];
    var nodes = [];
    var pulses = [];
    var raf = 0;
    var t0 = performance.now();
    var mounted = true;
    var lastPulse = 0;
    var lastFrame = 0;
    var prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readPalette() {
      var cs = getComputedStyle(document.documentElement);
      var accent = cs.getPropertyValue("--accent").trim() || "oklch(0.70 0.11 245)";
      var fgDim  = cs.getPropertyValue("--fg-dim").trim()  || "rgba(180,180,180,0.6)";
      var fgMute = cs.getPropertyValue("--fg-mute").trim() || "rgba(140,140,140,0.5)";
      var isLight = document.documentElement.dataset.theme === "light";
      return { accent: accent, fgDim: fgDim, fgMute: fgMute, isLight: isLight };
    }

    function rebuild() {
      var maxStars = 480;
      var maxNodes = 130;
      stars = new Array(maxStars);
      for (var i = 0; i < maxStars; i++) {
        stars[i] = {
          x: Math.random() * w, y: Math.random() * h,
          z: 0.3 + Math.random() * 0.9,
          r: Math.random() * 1.4 + 0.4,
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.0,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.10,
        };
      }
      nodes = new Array(maxNodes);
      for (var j = 0; j < maxNodes; j++) {
        nodes[j] = {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
        };
      }
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }

    function spawnPulse() {
      pulses.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: 0,
        max: 180 + Math.random() * 220,
        life: 0,
        ttl: 2.8 + Math.random() * 1.6,
        accent: Math.random() < MOOD.accentMix,
      });
    }

    function tick(now) {
      if (!mounted) return;
      var t = (now - t0) / 1000;
      var dt = Math.min(0.06, (now - (lastFrame || now)) / 1000);
      lastFrame = now;

      var pal = readPalette();
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // GRID
      if (MOOD.grid.opacity > 0.005 && MOOD.grid.size > 4) {
        ctx.save();
        ctx.globalAlpha = MOOD.grid.opacity * (pal.isLight ? 1.4 : 1);
        ctx.strokeStyle = pal.fgMute;
        ctx.lineWidth = 1;
        var ox = (t * 8) % MOOD.grid.size;
        var oy = (t * 5) % MOOD.grid.size;
        ctx.beginPath();
        for (var gx = -ox; gx < w; gx += MOOD.grid.size) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
        for (var gy = -oy; gy < h; gy += MOOD.grid.size) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
        ctx.stroke();
        ctx.restore();
      }

      // STARS
      var starCount = MOOD.stars;
      for (var si = 0; si < starCount; si++) {
        var s = stars[si % stars.length];
        s.x += s.vx * MOOD.starSpeed * 20 * s.z;
        s.y += s.vy * MOOD.starSpeed * 20 * s.z;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;
        var twinkle = 0.55 + 0.45 * (Math.sin(t * s.sp + s.ph) * 0.5 + 0.5);
        var useAccent = (si % 13 === 0) && Math.random() < 0.5 + MOOD.accentMix * 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        if (useAccent || (si % 7 === 0 && MOOD.accentMix > 0.5)) {
          ctx.fillStyle = pal.accent;
          ctx.globalAlpha = (pal.isLight ? 0.75 : 0.65) * twinkle * s.z;
        } else {
          ctx.fillStyle = pal.fgDim;
          ctx.globalAlpha = (pal.isLight ? 0.55 : 0.35) * twinkle * s.z;
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // NETWORK
      var nodeCount = MOOD.network.count;
      var linkDist  = MOOD.network.dist;
      var linkOpac  = MOOD.network.opacity;
      if (nodeCount > 0 && linkOpac > 0.01) {
        for (var ni = 0; ni < nodeCount; ni++) {
          var n = nodes[ni];
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        ctx.save();
        ctx.lineWidth = 1;
        for (var ii = 0; ii < nodeCount; ii++) {
          for (var jj = ii + 1; jj < nodeCount; jj++) {
            var a = nodes[ii], b = nodes[jj];
            var dx = a.x - b.x, dy = a.y - b.y;
            var d2 = dx * dx + dy * dy;
            if (d2 < linkDist * linkDist) {
              var d = Math.sqrt(d2);
              var k = 1 - d / linkDist;
              ctx.strokeStyle = ((ii + jj) % 9 === 0) ? pal.accent : pal.fgMute;
              ctx.globalAlpha = linkOpac * k * (pal.isLight ? 1.3 : 1);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = linkOpac * 1.6 * (pal.isLight ? 1.2 : 1);
        for (var di = 0; di < nodeCount; di++) {
          var nd = nodes[di];
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = (di % 5 === 0) ? pal.accent : pal.fgDim;
          ctx.fill();
        }
        ctx.restore();
      }

      // PULSES
      if (MOOD.pulse.count > 0 && MOOD.pulse.speed > 0) {
        var interval = 2.5 / Math.max(0.1, MOOD.pulse.speed);
        if (t - lastPulse > interval && pulses.length < Math.ceil(MOOD.pulse.count)) {
          spawnPulse();
          lastPulse = t;
        }
      }
      for (var pi = pulses.length - 1; pi >= 0; pi--) {
        var p = pulses[pi];
        p.life += dt;
        p.r = (p.life / p.ttl) * p.max;
        var pa = 1 - p.life / p.ttl;
        if (pa <= 0) { pulses.splice(pi, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = p.accent ? pal.accent : pal.fgDim;
        ctx.globalAlpha = pa * 0.5 * (pal.isLight ? 1.1 : 1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // SCANLINES
      if (MOOD.scan.strength > 0.005) {
        var speed = MOOD.scan.speed || 8;
        var offset = (t * speed * 12) % h;
        ctx.save();
        ctx.globalAlpha = MOOD.scan.strength;
        ctx.fillStyle = pal.accent;
        ctx.fillRect(0, offset, w, 1.5);
        ctx.globalAlpha = MOOD.scan.strength * 0.25;
        ctx.fillRect(0, offset - 24, w, 48);
        ctx.restore();
      }

      // HUE TINT
      if (Math.abs(MOOD.hueShift) > 0.5) {
        ctx.save();
        var grad = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, Math.max(w, h));
        var baseHue = 220 + MOOD.hueShift;
        grad.addColorStop(0,   "hsla(" + baseHue + ", 70%, 60%, " + (pal.isLight ? 0.07 : 0.12) + ")");
        grad.addColorStop(0.6, "hsla(" + baseHue + ", 60%, 50%, " + (pal.isLight ? 0.03 : 0.05) + ")");
        grad.addColorStop(1,   "hsla(" + baseHue + ", 60%, 40%, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    }

    function onResize() { resize(); }
    window.addEventListener("resize", onResize);
    resize();

    if (!prefersReduced) {
      raf = requestAnimationFrame(tick);
    } else {
      tick(performance.now());
    }

    return function () {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }

  function initCursorSpot() {
    var raf = 0, pending = false;
    function onMove(e) {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(function () {
        var x = (e.clientX / window.innerWidth) * 100;
        var y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty("--cur-x", x + "%");
        document.documentElement.style.setProperty("--cur-y", y + "%");
        pending = false;
      });
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return function () {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }

  window.AVCFx = {
    initBackgroundField: initBackgroundField,
    initCursorSpot: initCursorSpot,
  };
})();
