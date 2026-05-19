<?php
header('Content-Type: text/html; charset=UTF-8');

$p = $_GET['p'] ?? '';
if (!preg_match('/^[a-z0-9_-]+$/', $p)) {
    http_response_code(400);
    echo 'Invalid project identifier.';
    exit;
}

$jsonPath = __DIR__ . '/' . $p . '/token-report.json';
$projectTitle = htmlspecialchars(ucfirst($p));
$available = is_file($jsonPath);
?><!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Token statisztika — <?= $projectTitle ?></title>
<meta name="description" content="<?= $projectTitle ?> — AI token és költségbontás agentenként: aiO, Ralph, aiQA workerek. avc Agentic Vibe Coding projekt.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://sziklaizsolt.hu/avc/token-report-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css?v=<?= filemtime(__DIR__.'/assets/style.css') ?>">
<meta property="og:title" content="Token statisztika — <?= $projectTitle ?>" />
<meta property="og:description" content="<?= $projectTitle ?> agent-onkénti token- és költségbontás · avc" />
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
  <h1 class="title">Token statisztika — <?= $projectTitle ?></h1>
  <p class="proj-desc">Agent-onkénti token- és költségbontás a <code><?= htmlspecialchars($p) ?></code> run-hoz.</p>

  <div id="token-mount">
    <?php if (!$available): ?>
      <div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>
    <?php endif; ?>
  </div>

  <div class="v-footer">
    <span>Generálva: <span id="ftgen">—</span></span>
    <a class="back" href="./" style="margin: 0;">
      <svg viewBox="0 0 14 14"><path d="M10 7H2M5 3 1 7l4 4"/></svg>
      vissza
    </a>
  </div>
</div>

<?php if ($available): ?>
<script src="assets/token-renderer.js?v=<?= filemtime(__DIR__.'/assets/token-renderer.js') ?>"></script>
<script>
  fetch(<?= json_encode($p . '/token-report.json', JSON_UNESCAPED_SLASHES) ?> + '?v=' + Date.now())
    .then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data){ window.renderTokenReport(data); })
    .catch(function(err){
      document.getElementById('token-mount').innerHTML =
        '<div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>';
    });
</script>
<?php endif; ?>
<script src="assets/bg-canvas.js?v=<?= filemtime(__DIR__.'/assets/bg-canvas.js') ?>"></script>

<script>(function(){function t(){if(window.umami){umami.track('token-report-viewer: '+<?php echo json_encode($p) ?>,{project:<?php echo json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
