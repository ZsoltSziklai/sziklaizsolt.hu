<?php
header('Content-Type: text/html; charset=UTF-8');

$p = $_GET['p'] ?? '';
if (!preg_match('/^[a-z0-9_-]+$/', $p)) {
    http_response_code(400);
    echo 'Invalid project identifier.';
    exit;
}

$jsonPath = __DIR__ . '/' . $p . '/token-report.json';
$projectTitle = htmlspecialchars(ucfirst(str_replace('-', ' ', $p)));
$pe = htmlspecialchars($p);
$available = is_file($jsonPath);
?><!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Token-statisztika — <?= $projectTitle ?> · AvC</title>
  <meta name="description" content="<?= $projectTitle ?> — AI token és költségbontás ágensenként. avc Agentic Vibe Coding projekt." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://sziklaizsolt.hu/avc/token-report-viewer.php?p=<?= $pe ?>" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />

  <meta property="og:title" content="Token-statisztika — <?= $projectTitle ?> · AvC" />
  <meta property="og:type" content="article" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="viewer.css?v=<?= is_file(__DIR__.'/viewer.css') ? filemtime(__DIR__.'/viewer.css') : '1' ?>" />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="c087626e-16ed-4ddf-ae66-d6de1ec5a588"></script>
</head>
<body>
  <main class="viewer">
    <div class="viewer__kicker">Token-statisztika · AI költségriport</div>
    <h1 class="viewer__title"><?= $projectTitle ?></h1>
    <p class="viewer__sub">Ágens-onkénti token- és költségbontás a <code><?= $pe ?></code> run-hoz.</p>

    <div id="token-mount">
      <?php if (!$available): ?>
        <div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>
      <?php endif; ?>
    </div>

    <div class="v-footer">
      <span>A költségek az Anthropic Sonnet 4.6 / Opus 4.7 hivatalos token-árazása alapján kerültek kiszámításra.</span>
      <span></span>
    </div>
  </main>

  <script src="viewer.js?v=<?= is_file(__DIR__.'/viewer.js') ? filemtime(__DIR__.'/viewer.js') : '1' ?>"></script>
  <?php if ($available): ?>
  <script>
    AVCViewer.initTheme();
    var P = <?= json_encode($p) ?>;
    fetch(P + "/token-report.json?v=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { renderToken(data, P); })
      .catch(function () {
        document.getElementById("token-mount").innerHTML =
          '<div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>';
      });

    function renderToken(data, p) {
      var fmt = AVCViewer.fmt, money = AVCViewer.money, esc = AVCViewer.esc;
      var mount = document.getElementById("token-mount");
      if (!data || !data.agents) {
        mount.innerHTML = '<div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>';
        return;
      }
      var sub = data.pipeline_subtotal || data.grand_total || {};
      var agents = data.agents || {};
      var totalCost = sub.cost != null ? sub.cost : Object.keys(agents).reduce(function (a, k) { return a + (Number(agents[k].cost) || 0); }, 0);
      var totalMessages = sub.messages != null ? sub.messages : Object.keys(agents).reduce(function (a, k) { return a + (Number(agents[k].messages) || 0); }, 0);
      var totalOutput = (sub.output_tokens || sub.output) != null ? (sub.output_tokens || sub.output) : Object.keys(agents).reduce(function (a, k) { return a + (Number(agents[k].output_tokens) || 0); }, 0);

      var hero =
        '<div class="cost-hero">' +
          '<div class="cost-hero-label">Teljes pipeline költség</div>' +
          '<div class="cost-hero-value">' + money(totalCost) + ' <span>USD</span></div>' +
          '<div class="cost-hero-sub">' + fmt(totalMessages) + ' üzenet · ' + fmt(totalOutput) + ' output token</div>' +
        '</div>';

      var order = ["aiO", "Ralph", "aiQAO", "planner"];
      var rowsSource = order.filter(function (k) { return agents[k]; });
      Object.keys(agents).forEach(function (k) { if (rowsSource.indexOf(k) === -1) rowsSource.push(k); });

      var rows = rowsSource.map(function (name) {
        var a = agents[name];
        return '<tr>' +
          '<td class="agent-name">' + esc(name) + '</td>' +
          '<td class="model">' + esc(a.model || "") + '</td>' +
          '<td class="num">' + fmt(a.messages) + '</td>' +
          '<td class="num">' + fmt(a.output_tokens) + '</td>' +
          '<td class="num">' + fmt(a.cache_read_tokens) + '</td>' +
          '<td class="num">' + fmt(a.cache_create_tokens) + '</td>' +
          '<td class="num cost">' + money(a.cost) + '</td>' +
          '</tr>';
      }).join("");

      mount.innerHTML = hero +
        '<table class="token-table"><thead><tr>' +
          '<th>Ágens</th><th>Modell</th>' +
          '<th class="num">Üzenet</th><th class="num">Output token</th>' +
          '<th class="num">Cache read</th><th class="num">Cache create</th>' +
          '<th class="cost">Költség</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
    }
  </script>
  <?php else: ?>
  <script>AVCViewer.initTheme();</script>
  <?php endif; ?>
  <script>(function(){function t(){if(window.umami){umami.track('token-report-viewer: '+<?= json_encode($p) ?>,{project:<?= json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
