<?php
$registryFile = __DIR__ . '/projects.json';
$projects = [];
$generatedAt = null;
if (is_file($registryFile)) {
    $decoded = json_decode(file_get_contents($registryFile), true);
    if (is_array($decoded)) {
        $projects = $decoded['projects'] ?? [];
        $generatedAt = $decoded['generated_at'] ?? null;
    }
}

function icon_svg($name) {
    if ($name === 'chat') {
        return '<svg viewBox="0 0 24 24"><title>MiniChat icon</title><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 13h5"/></svg>';
    }
    if ($name === 'task') {
        return '<svg viewBox="0 0 24 24"><title>Todo App icon</title><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-5"/><path d="M8 7h4M8 17h3"/></svg>';
    }
    if ($name === 'weather') {
        return '<svg viewBox="0 0 24 24"><title>Weather Dashboard icon</title><circle cx="12" cy="9" r="3"/><path d="M12 2v1M12 16v1M4.22 4.22l.71.71M19.07 19.07l.71.71M2 9h1M21 9h1M4.22 13.78l.71-.71M19.07 4.93l.71-.71"/><path d="M5 17a4 4 0 0 1 0-8 6 6 0 0 1 11.31 2A4 4 0 0 1 17 17z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>';
}

function status_class($s) {
    $s = strtoupper((string)$s);
    if ($s === 'PASS' || $s === 'PASSED') return 'pass';
    if ($s === 'FAIL' || $s === 'FAILED') return 'fail';
    return 'unknown';
}

?><!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>avc — Agentic Vibe Coding</title>
<meta name="description" content="Agentic Vibe Coding (AvC): teljesen autonóm AI ágensek fejlesztenek, tesztelnek és deployolnak szoftvert emberi beavatkozás nélkül. Deployolt projektek PRD-vel, forráskóddal és token-statisztikával.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://sziklaizsolt.hu/avc/">
<link rel="alternate" hreflang="x-default" href="https://sziklaizsolt.hu/avc/">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css?v=<?= filemtime(__DIR__.'/assets/style.css') ?>">
<meta property="og:title" content="avc — Agentic Vibe Coding" />
<meta property="og:description" content="Autonóm AI pipeline: orchestrátor, fejlesztő és QA ágensek együtt. Vibe coding = co-pilot, AvC = autonomous pilot." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://sziklaizsolt.hu/avc/" />
<meta property="og:image" content="https://sziklaizsolt.hu/avc/assets/qr.svg" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="avc — Agentic Vibe Coding" />
<meta name="twitter:description" content="Autonóm AI pipeline: orchestrátor, fejlesztő és QA ágensek együtt." />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "avc — Agentic Vibe Coding",
  "url": "https://sziklaizsolt.hu/avc/",
  "description": "Agentic Vibe Coding: autonóm AI ágensek (orchestrátor, fejlesztő, QA) önállóan fejlesztenek és tesztelnek szoftvert egyetlen magas szintű követelményből.",
  "inLanguage": ["hu", "en"],
  "author": {
    "@type": "Person",
    "name": "Sziklai Zsolt",
    "url": "https://sziklaizsolt.hu"
  }
}
</script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="c087626e-16ed-4ddf-ae66-d6de1ec5a588"></script>
</head>
<body>

<canvas id="bg-canvas"></canvas>

<header>
  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
        <title>avc logo</title>
        <rect x="2" y="2" width="16" height="16" rx="3"/>
        <path d="M6 7h8M6 10h5"/>
      </svg>
    </div>
    <span class="logo-text">avc</span>
  </div>
  <h1>Agentic Vibe<br>Coding</h1>
  <p>/<span>avc</span> — projektek / projects</p>
</header>

<section class="ack">
  <div class="ack-logos">
    <a href="https://uni-obuda.hu" target="_blank" rel="noopener" class="ack-logo-link">
      <img src="assets/logo-oe.png" alt="Óbudai Egyetem" class="ack-logo">
    </a>
    <div class="ack-logo-sep" aria-hidden="true"></div>
    <a href="https://www.alfa.hu" target="_blank" rel="noopener" class="ack-logo-link">
      <img src="assets/logo-alfa.svg?v=<?= filemtime(__DIR__.'/assets/logo-alfa.svg') ?>" alt="Alfa Vienna Insurance Group Biztosító" class="ack-logo">
    </a>
  </div>
  <div class="ack-body">
    <div class="ack-hu" lang="hu">
      <h2 class="ack-title">Köszönetnyilvánítás</h2>
      <p>Kutatásomat az <strong>Óbudai Egyetem</strong> és a <strong>VIG Csoport – Alfa Vienna Insurance Group Biztosító Zrt.</strong> támogatása tette lehetővé.</p>
      <p>Külön hálával tartozom kollégáimnak, <strong>Karajos János Zsoltnak</strong> és <strong>Kozák Cecíliának</strong> — a téma iránti elhivatottságuk és gondolatébresztő közös beszélgetéseink maradandó hatással voltak a gondolkodásomra.</p>
      <p>Külön köszönet <strong>Fehér Ernő</strong> kollégámnak, aki támogatott, amikor elmélyedtem a gondolataimban, és odafigyelt arra, hogy a cégnél semmi se essen le az asztalról.</p>
      <p><a href="https://www.youtube.com/channel/UCwLS7bYBo_CmmIixxFJSS7Q" target="_blank" rel="noopener" class="ack-link">Szota Szabolcs</a> „AI a mindennapokban" csatornája megmutatta, hogy ezt a technológiát nem csak programozói szemszögből lehet — és kell — megközelíteni: az AI mindenkié, aki nyitott rá.</p>
      <p>Köszönöm mindazoknak is, akik meghallgattak — visszajelzéseik és figyelmük nélkülözhetetlen volt szakmai fejlődésemhez.</p>
      <p>Hálával tartozom az <a href="https://www.anthropic.com/claude-code" target="_blank" rel="noopener" class="ack-link"><strong>Anthropic Claude Code</strong></a>, a <a href="https://www.cowork.ai" target="_blank" rel="noopener" class="ack-link"><strong>Cowork</strong></a> és a <a href="https://ralph-tui.com" target="_blank" rel="noopener" class="ack-link"><strong>Ralph TUI</strong></a> csapatának is, akiknek eszközei nélkül ez a projekt nem létezhetne ebben a formában.</p>
      <p>És végül a családomnak — feleségemnek, <strong>Barbarának</strong>, és lányomnak, <strong>Zselykének</strong> — köszönöm, hogy elviselték megszállottságomat.</p>
    </div>
    <div class="ack-divider" aria-hidden="true"><span>· EN ·</span></div>
    <div class="ack-en" lang="en">
      <h2 class="ack-title">Acknowledgements</h2>
      <p>This research was made possible through the support of <strong>Óbuda University</strong> and <strong>VIG Group – Alfa Vienna Insurance Group Biztosító Zrt.</strong></p>
      <p>Special thanks to my colleagues, <strong>János Zsolt Karajos</strong> and <strong>Cecília Kozák</strong> — their dedication to the field and our many thought-provoking conversations have had a lasting influence on my thinking.</p>
      <p>I'm also grateful to my colleague <strong>Ernő Fehér</strong>, who supported me when I dove deep into my thoughts and made sure that nothing slipped through the cracks at the company.</p>
      <p><a href="https://www.youtube.com/channel/UCwLS7bYBo_CmmIixxFJSS7Q" target="_blank" rel="noopener" class="ack-link">Szabolcs Szota</a>'s <em>AI a mindennapokban</em> (AI in Everyday Life) channel showed that this technology shouldn't be confined to a programmer's lens — AI belongs to anyone willing to engage with it.</p>
      <p>I'm also grateful to everyone who took the time to listen — their feedback and attention were an invaluable driving force behind my growth.</p>
      <p>I'm also thankful to the teams behind <a href="https://www.anthropic.com/claude-code" target="_blank" rel="noopener" class="ack-link"><strong>Anthropic Claude Code</strong></a>, <a href="https://www.cowork.ai" target="_blank" rel="noopener" class="ack-link"><strong>Cowork</strong></a>, and <a href="https://ralph-tui.com" target="_blank" rel="noopener" class="ack-link"><strong>Ralph TUI</strong></a> — without their tools, this project could not exist in its current form.</p>
      <p>And finally, my deepest thanks to my family — my wife <strong>Barbara</strong> and my daughter <strong>Zselyke</strong> — for putting up with my obsession.</p>
    </div>
  </div>
</section>

<section class="about">
  <article class="about-hu" lang="hu">
    <h2>Mi az Agentic Vibe Coding?</h2>
    <p>Az Agentic Vibe Coding (AvC) az AI-segített fejlesztés következő evolúciós lépcsője. Míg a klasszikus vibe coding ember-vezérelt — minden lépéshez külön prompt kell —, az AvC autonóm AI ágensekből álló pipeline-t használ: orchestrátor, QA tervező, tesztelő workerek, fejlesztő ágens. Egyetlen magas szintű követelményből az ágensek önállóan terveznek, kódolnak, tesztelnek és iterálnak. Az ember elindítja és ellenőrzi az eredményt — a folyamatot az ágensek viszik végig egymással kommunikálva.</p>
    <p><em>Egy mondatban a különbség: vibe coding = co-pilot, AvC = autonomous pilot.</em></p>
  </article>
  <div class="about-divider" aria-hidden="true"><span>· EN ·</span></div>
  <article class="about-en" lang="en">
    <h2>What is Agentic Vibe Coding?</h2>
    <p>Agentic Vibe Coding (AvC) is the next evolutionary step in AI-assisted development. While classic vibe coding is human-driven — each step needs its own prompt — AvC uses a pipeline of autonomous AI agents: orchestrator, QA planner, testing workers, developer agent. From a single high-level requirement, the agents independently plan, code, test, and iterate. Humans launch and verify the result — the agents drive the process, communicating with each other.</p>
    <p><em>The difference in one sentence: vibe coding = co-pilot, AvC = autonomous pilot.</em></p>
  </article>
</section>

<section class="pipeline">
  <h2 class="pipeline-title"><span lang="hu">A folyamat</span> · <span lang="en">The process</span></h2>
  <div class="pipeline-wrap">
    <a href="assets/pipeline-diagram.svg" target="_blank" rel="noopener">
      <img src="assets/pipeline-diagram.svg" alt="Agentic Vibe Coding pipeline diagram" class="pipeline-svg">
    </a>
  </div>
</section>

<?php if (empty($projects)): ?>
<div class="empty-note">Még nincs deployolt projekt.</div>
<?php else: ?>
<div class="grid">
<div class="card qr-card">
  <div class="card-stripe"></div>
  <div class="qr-wrap">
    <img src="assets/qr.svg" alt="QR kód" class="qr-img">
    <div class="qr-robot">
      <svg class="robot-svg" viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">
        <title>Animated robot illustration / Animált robot illusztráció</title>
        <style>
          .rbt{animation:rfloat 3.2s ease-in-out infinite}
          @keyframes rfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          .reye{transform-box:fill-box;transform-origin:50% 50%;animation:rblink 5s ease-in-out infinite}
          .reye2{animation-delay:.06s}
          @keyframes rblink{0%,42%,58%,100%{transform:scaleY(1)}50%{transform:scaleY(0.07)}}
          .rant{animation:rpulse 2s ease-in-out infinite}
          @keyframes rpulse{0%,100%{r:3.5;fill:#a5b4fc}50%{r:5.2;fill:#e0e7ff}}
          .rchest{animation:rglow 2.4s ease-in-out infinite}
          @keyframes rglow{0%,100%{fill-opacity:.35;r:5}50%{fill-opacity:.95;r:6.5}}
          .rbar{transform-box:fill-box;transform-origin:50% 100%;animation:rspeak .38s ease-in-out infinite alternate}
          .rbar2{animation-delay:.13s}
          .rbar3{animation-delay:.26s}
          @keyframes rspeak{to{transform:scaleY(1.9)}}
          .rscan{animation:rscanline 2s linear infinite;opacity:0}
          @keyframes rscanline{0%{transform:translateY(-14px);opacity:.55}80%{opacity:.55}100%{transform:translateY(14px);opacity:0}}
        </style>
        <g class="rbt">
          <line x1="30" y1="3" x2="30" y2="16" stroke="rgba(129,140,248,.75)" stroke-width="2.2" stroke-linecap="round"/>
          <circle class="rant" cx="30" cy="3" r="3.5" fill="#a5b4fc"/>

          <rect x="7" y="16" width="46" height="34" rx="9" fill="rgba(79,70,229,.72)" stroke="rgba(165,180,252,.3)" stroke-width="1.3"/>
          <rect x="10" y="18" width="22" height="4" rx="2" fill="rgba(255,255,255,.07)"/>

          <clipPath id="hclip"><rect x="7" y="16" width="46" height="34" rx="9"/></clipPath>
          <rect class="rscan" x="7" y="16" width="46" height="4" rx="0" fill="rgba(165,180,252,.35)" clip-path="url(#hclip)"/>

          <rect class="reye"  x="13" y="26" width="13" height="10" rx="3.5" fill="#c7d2fe"/>
          <rect class="reye reye2" x="34" y="26" width="13" height="10" rx="3.5" fill="#c7d2fe"/>
          <circle cx="17" cy="29" r="2" fill="rgba(255,255,255,.45)"/>
          <circle cx="38" cy="29" r="2" fill="rgba(255,255,255,.45)"/>

          <rect x="17" y="40" width="5"   height="4.5" rx="1.5" fill="rgba(165,180,252,.7)"/>
          <rect class="rbar"  x="17"   y="40" width="5"   height="4.5" rx="1.5" fill="rgba(165,180,252,.75)"/>
          <rect class="rbar rbar2" x="27.5" y="40" width="5"   height="4.5" rx="1.5" fill="rgba(165,180,252,.75)"/>
          <rect class="rbar rbar3" x="38"   y="40" width="5"   height="4.5" rx="1.5" fill="rgba(165,180,252,.75)"/>

          <rect x="11" y="54" width="38" height="27" rx="8" fill="rgba(67,56,202,.65)" stroke="rgba(99,102,241,.28)" stroke-width="1.3"/>
          <circle class="rchest" cx="30" cy="67" r="5" fill="#818cf8" stroke="rgba(199,210,254,.55)" stroke-width="1.8"/>
          <rect x="11" y="60" width="5" height="3" rx="1.5" fill="rgba(129,140,248,.45)"/>
          <rect x="44" y="60" width="5" height="3" rx="1.5" fill="rgba(129,140,248,.45)"/>
          <rect x="14" y="72" width="9" height="2.5" rx="1.2" fill="rgba(129,140,248,.35)"/>
          <rect x="26" y="72" width="9" height="2.5" rx="1.2" fill="rgba(129,140,248,.35)"/>
          <rect x="38" y="72" width="9" height="2.5" rx="1.2" fill="rgba(129,140,248,.35)"/>
        </g>
      </svg>
    </div>
  </div>
</div>
<?php foreach ($projects as $p):
  $name       = $p['name']       ?? '';
  $title      = $p['title']      ?? ucfirst($name);
  $tagline    = $p['tagline']    ?? ($p['description'] ?? '');
  $tagline_en = $p['tagline_en'] ?? '';
  $icon       = $p['icon']       ?? 'generic';
  $color      = $p['color']      ?? '#6366f1';
  $tech       = $p['tech']       ?? [];
  $status     = $p['status']     ?? null;
  $hasZip     = !empty($p['has_source_zip']);
  $hasPrd     = !empty($p['has_prd']);
  $hasPlan    = !empty($p['has_programterv']);
  $hasToken   = !empty($p['has_token_report']);
  $cost       = $p['token_cost_usd'] ?? null;
  $href       = htmlspecialchars($name) . '/';
  $col        = htmlspecialchars($color);
  $slug       = htmlspecialchars($name);
?>
<div class="card" style="--c:<?= $col ?>">
  <div class="card-stripe"></div>

  <a class="card-main" href="<?= $href ?>" target="_blank" rel="noopener">
    <div class="card-head">
      <div class="card-icon"><?= icon_svg($icon) ?></div>
      <div class="card-title-row">
        <div class="card-title"><?= htmlspecialchars($title) ?></div>
        <?php if ($status !== null): ?>
          <span class="status-dot <?= status_class($status) ?>" title="<?= htmlspecialchars($status) ?>"></span>
        <?php endif; ?>
      </div>
    </div>

    <?php if ($tagline): ?>
      <div class="card-desc" lang="hu"><?= htmlspecialchars($tagline) ?></div>
    <?php endif; ?>
    <?php if ($tagline_en): ?>
      <div class="card-desc card-desc-en" lang="en"><?= htmlspecialchars($tagline_en) ?></div>
    <?php endif; ?>

    <?php if ($hasToken && $cost !== null): ?>
      <div class="card-cost">
        AI költség / AI cost: <b>$<?= number_format((float)$cost, 2, '.', '') ?></b>
        <span class="card-cost-note">közvetlen API használatával · estimated direct API cost</span>
      </div>
    <?php endif; ?>

    <?php if ($tech): ?>
    <div class="tech-list">
      <?php foreach ($tech as $t): ?>
        <span class="tech-pill"><?= htmlspecialchars($t) ?></span>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </a>

  <div class="card-actions">
    <a class="btn-open" href="<?= $href ?>" target="_blank" rel="noopener">
      <svg viewBox="0 0 14 14"><title>megnyitás / open</title><path d="M2 7h10M8 3l4 4-4 4"/></svg>
      megnyitás / open
    </a>
    <?php if ($hasZip): ?>
      <a class="btn-dl" href="<?= $slug ?>/download/<?= $slug ?>_source.zip" download target="_blank" rel="noopener">
        <svg viewBox="0 0 12 12"><title>source download</title><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1.5 10.5h9"/></svg>
        source .zip
      </a>
    <?php else: ?>
      <span class="btn-dl" aria-disabled="true">
        <svg viewBox="0 0 12 12"><title>source download</title><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1.5 10.5h9"/></svg>
        source .zip
      </span>
    <?php endif; ?>
  </div>

  <div class="card-docs">
    <?php if ($hasPrd): ?>
      <a class="btn-doc" href="prd-viewer.php?p=<?= $slug ?>" target="_blank" rel="noopener">
        <svg viewBox="0 0 12 12"><title>PRD document</title><path d="M2 1h6l3 3v7H2z"/><path d="M7 1v3h3"/><path d="M4 6h4M4 8h3"/></svg>
        PRD
      </a>
    <?php else: ?>
      <span class="btn-doc" aria-disabled="true">
        <svg viewBox="0 0 12 12"><title>PRD document</title><path d="M2 1h6l3 3v7H2z"/><path d="M7 1v3h3"/><path d="M4 6h4M4 8h3"/></svg>
        PRD
      </span>
    <?php endif; ?>

    <?php if ($hasPlan): ?>
      <a class="btn-doc" href="programterv-viewer.php?p=<?= $slug ?>" target="_blank" rel="noopener">
        <svg viewBox="0 0 12 12"><title>tech plan document</title><path d="M2 1h6l3 3v7H2z"/><path d="M7 1v3h3"/><path d="M4 6h4M4 8h3"/></svg>
        tech plan
      </a>
    <?php else: ?>
      <span class="btn-doc" aria-disabled="true">
        <svg viewBox="0 0 12 12"><title>tech plan document</title><path d="M2 1h6l3 3v7H2z"/><path d="M7 1v3h3"/><path d="M4 6h4M4 8h3"/></svg>
        tech plan
      </span>
    <?php endif; ?>

    <?php if ($hasToken): ?>
      <a class="btn-doc" href="token-report-viewer.php?p=<?= $slug ?>" target="_blank" rel="noopener">
        <svg viewBox="0 0 12 12"><title>token statistics</title><path d="M2 10V6M6 10V2M10 10V7"/></svg>
        token stats
      </a>
    <?php else: ?>
      <span class="btn-doc" aria-disabled="true">
        <svg viewBox="0 0 12 12"><title>token statistics</title><path d="M2 10V6M6 10V2M10 10V7"/></svg>
        token stats
      </span>
    <?php endif; ?>
  </div>
</div>
<?php endforeach; ?>
</div>
<?php endif; ?>

<footer>
  <div class="footer-built">
    <span class="lang-hu">E weboldal standard vibe coding technológiával készült.</span>
    <span class="lang-en">This website was built using standard vibe coding technology.</span>
  </div>
  <div class="footer-meta">
    <div class="footer-meta-item">
      <span class="label">Modell / Model</span>
      <span class="val">claude-sonnet-4-6</span>
    </div>
    <div class="footer-meta-item">
      <span class="label">Utolsó frissítés / Last updated</span>
      <span class="val">2026-04-29 · April 29, 2026</span>
    </div>
    <div class="footer-meta-item">
      <span class="label">Ellenőrizte / Reviewed by</span>
      <span class="val">Sziklai, Zsolt</span>
    </div>
    <div class="footer-meta-item" style="margin-left:auto; text-align:center">
      <span class="label">Projektek / Projects</span>
      <span class="val"><?= count($projects) ?></span>
    </div>
  </div>
</footer>

<script src="assets/bg-canvas.js?v=<?= filemtime(__DIR__.'/assets/bg-canvas.js') ?>"></script>

<div id="music-bar">
  <svg class="music-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <title>music</title>
    <path d="M6 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
    <path d="M8.5 10.5V3l5-1v7"/>
    <path d="M11 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" style="display:none"/>
    <path d="M6 8.5V3l7-1.5"/>
  </svg>
  <span class="music-label">soundtrack</span>
  <button id="music-play" class="music-btn" title="lejátszás / play">
    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>
  </button>
  <input type="range" id="music-vol" class="music-slider" min="0" max="100" value="30">
  <button id="music-mute" class="music-btn" title="némítás / mute">
    <svg id="icon-vol" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M2 5.5h2.5l3.5-3v11l-3.5-3H2z" fill="currentColor" stroke="none"/>
      <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5"/>
      <path d="M12.5 3.5a6 6 0 0 1 0 9"/>
    </svg>
  </button>
</div>

<div id="yt-wrap"><div id="yt-player"></div></div>

<script src="assets/music-player.js?v=1"></script>
</body>
</html>
