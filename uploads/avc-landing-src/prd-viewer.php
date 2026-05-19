<?php
header('Content-Type: text/html; charset=UTF-8');

$p = $_GET['p'] ?? '';
if (!preg_match('/^[a-z0-9_-]+$/', $p)) {
    http_response_code(400);
    echo 'Invalid project identifier.';
    exit;
}

$prdPath = __DIR__ . '/' . $p . '/prd.json';
if (!is_file($prdPath)) {
    http_response_code(404);
    echo 'PRD not found for project: ' . htmlspecialchars($p);
    exit;
}

$projectTitle = htmlspecialchars(ucfirst($p));
?><!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PRD — <?= $projectTitle ?></title>
<meta name="description" content="<?= $projectTitle ?> — Product Requirements Document: user story-k, elfogadási kritériumok és bug bejegyzések. avc Agentic Vibe Coding projekt.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://sziklaizsolt.hu/avc/prd-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="alternate" hreflang="hu" href="https://sziklaizsolt.hu/avc/prd-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="alternate" hreflang="x-default" href="https://sziklaizsolt.hu/avc/prd-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css?v=<?= filemtime(__DIR__.'/assets/style.css') ?>">
<meta property="og:title" content="PRD — <?= $projectTitle ?>" />
<meta property="og:description" content="<?= $projectTitle ?> user story-k és elfogadási kritériumok · avc" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary" />
<script defer src="https://cloud.umami.is/script.js" data-website-id="c087626e-16ed-4ddf-ae66-d6de1ec5a588" data-auto-track="false"></script>
</head>
<body>
<canvas id="bg-canvas"></canvas>
<div class="wrap">
  <a class="back" href="./">
    <svg viewBox="0 0 14 14"><path d="M10 7H2M5 3 1 7l4 4"/></svg>
    avc
  </a>
  <h1 class="title" id="pname"></h1>
  <p class="proj-desc" id="pdesc"></p>
  <div class="meta" id="pmeta"></div>

  <div class="sec-label">User Stories</div>
  <div id="us-list"></div>
  <div class="sec-label">Bugok</div>
  <div id="bug-list"></div>

  <div class="v-footer">
    <span id="ftcount"></span>
    <span id="ftdate"></span>
  </div>
</div>

<script src="assets/prd-renderer.js?v=<?= filemtime(__DIR__.'/assets/prd-renderer.js') ?>"></script>
<script>
  fetch(<?= json_encode($p . '/prd.json', JSON_UNESCAPED_SLASHES) ?> + '?v=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(data){ window.renderPrd(data); })
    .catch(function(err){
      document.getElementById('pname').textContent = 'PRD betöltési hiba';
      document.getElementById('pdesc').textContent = String(err);
    });
</script>
<script src="assets/bg-canvas.js?v=<?= filemtime(__DIR__.'/assets/bg-canvas.js') ?>"></script>

<script>(function(){function t(){if(window.umami){umami.track('prd-viewer: '+<?php echo json_encode($p) ?>,{project:<?php echo json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
