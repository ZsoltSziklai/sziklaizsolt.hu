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

$projectTitle = htmlspecialchars(ucfirst(str_replace('-', ' ', $p)));
$pe = htmlspecialchars($p);
?><!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PRD — <?= $projectTitle ?> · AvC</title>
  <meta name="description" content="<?= $projectTitle ?> — Product Requirements Document. User story-k, elfogadási kritériumok. avc Agentic Vibe Coding projekt." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://sziklaizsolt.hu/avc/prd-viewer.php?p=<?= $pe ?>" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />

  <meta property="og:title" content="PRD — <?= $projectTitle ?> · AvC" />
  <meta property="og:description" content="<?= $projectTitle ?> user story-k és elfogadási kritériumok · avc" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="viewer.css?v=<?= is_file(__DIR__.'/viewer.css') ? filemtime(__DIR__.'/viewer.css') : '1' ?>" />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="c087626e-16ed-4ddf-ae66-d6de1ec5a588"></script>
</head>
<body>
  <main class="viewer">
    <div class="viewer__kicker">Product Requirements Document</div>
    <h1 class="viewer__title" id="pname">PRD betöltése…</h1>
    <p class="viewer__sub" id="pdesc"></p>
    <div class="viewer__meta" id="pmeta"></div>

    <div class="sec-label">User Stories</div>
    <div id="us-list"></div>
    <div class="sec-label" id="bug-label" style="display:none">Bugok</div>
    <div id="bug-list"></div>

    <div class="v-footer">
      <span id="ftcount"></span>
      <span id="ftdate"></span>
    </div>
  </main>

  <script src="viewer.js?v=<?= is_file(__DIR__.'/viewer.js') ? filemtime(__DIR__.'/viewer.js') : '1' ?>"></script>
  <script>
    AVCViewer.initTheme();
    var P = <?= json_encode($p) ?>;
    fetch(P + "/prd.json?v=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("PRD nem található"); return r.json(); })
      .then(function (data) { renderPrd(data, P); })
      .catch(function (err) {
        document.getElementById("pname").textContent = "PRD betöltési hiba";
        document.getElementById("pdesc").textContent = String(err);
      });

    function renderStory(s, container) {
      var esc = AVCViewer.esc;
      var isBug = s.type === "bug";
      var div = document.createElement("div");
      div.className = "story";
      var ac = (s.acceptanceCriteria || []).map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("");
      var deps = (s.dependsOn || []);
      var depsHtml = deps.length
        ? '<div class="deps"><span class="dep-label">függ:</span>' +
          deps.map(function (d) { return '<span class="dep-badge">' + esc(d) + "</span>"; }).join("") + "</div>"
        : "";
      var notesHtml = s.notes ? '<div class="s-notes">' + esc(s.notes) + "</div>" : "";
      var verified = (s.verified || s.passes) ? '<span class="s-ok">✓ verified</span>' : "";
      div.innerHTML =
        '<div class="story-head">' +
          '<span class="s-id ' + (isBug ? "bug" : "us") + '">' + esc(s.id) + "</span>" +
          '<span class="s-title">' + esc(s.title) + "</span>" +
          verified +
          '<span class="chevron">▶</span>' +
        "</div>" +
        '<div class="story-body">' +
          (s.description ? '<div class="s-desc">' + esc(s.description) + "</div>" : "") +
          (ac ? '<div class="ac-title">Elfogadási kritériumok</div><ul class="ac-list">' + ac + "</ul>" : "") +
          depsHtml + notesHtml +
        "</div>";
      div.querySelector(".story-head").addEventListener("click", function () { div.classList.toggle("open"); });
      container.appendChild(div);
    }

    function renderPrd(prd, p) {
      document.title = "PRD — " + (prd.name || p) + " · AvC";
      var nameEl = document.getElementById("pname");
      var descEl = document.getElementById("pdesc");
      var metaEl = document.getElementById("pmeta");
      var usList = document.getElementById("us-list");
      var bugList = document.getElementById("bug-list");
      var bugLabel = document.getElementById("bug-label");
      var ftCount = document.getElementById("ftcount");
      var ftDate = document.getElementById("ftdate");

      nameEl.textContent = prd.name || p;
      descEl.textContent = prd.description || "";

      var us = (prd.userStories || []).filter(function (s) { return (s.type || "US") !== "bug"; });
      var bugs = (prd.userStories || []).filter(function (s) { return s.type === "bug"; });
      var updatedAt = prd.metadata && prd.metadata.updatedAt ? prd.metadata.updatedAt.slice(0, 10) : "";

      var passes = us.filter(function (s) { return s.verified || s.passes; }).length;
      metaEl.innerHTML =
        "<span><strong>" + us.length + "</strong> user story</span>" +
        "<span><strong>" + passes + "</strong> verifikált</span>" +
        "<span><strong>" + bugs.length + "</strong> bug</span>" +
        (updatedAt ? "<span>frissítve <strong>" + updatedAt + "</strong></span>" : "") +
        (prd.branchName ? "<span>branch <strong>" + AVCViewer.esc(prd.branchName) + "</strong></span>" : "");

      us.forEach(function (s) { renderStory(s, usList); });
      bugs.forEach(function (s) { renderStory(s, bugList); });
      if (bugs.length) bugLabel.style.display = "";

      ftCount.textContent = (us.length + bugs.length) + " tétel";
      ftDate.textContent = updatedAt;
    }
  </script>

  <script>(function(){function t(){if(window.umami){umami.track('prd-viewer: '+<?= json_encode($p) ?>,{project:<?= json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
