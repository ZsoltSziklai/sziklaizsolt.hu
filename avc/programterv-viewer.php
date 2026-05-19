<?php
header('Content-Type: text/html; charset=UTF-8');

$p = $_GET['p'] ?? '';
if (!preg_match('/^[a-z0-9_-]+$/', $p)) {
    http_response_code(400);
    echo 'Invalid project identifier.';
    exit;
}

$mdPath = __DIR__ . '/' . $p . '/programterv.md';
if (!is_file($mdPath)) {
    http_response_code(404);
    echo 'Programterv not found for project: ' . htmlspecialchars($p);
    exit;
}
$md = file_get_contents($mdPath);

function inlineFormat($text) {
    $text = preg_replace('/\*\*(.+?)\*\*/u', '<strong>$1</strong>', $text);
    $text = preg_replace('/\*(.+?)\*/u', '<em>$1</em>', $text);
    $text = preg_replace('/`([^`]+)`/u', '<code>$1</code>', $text);
    $text = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/u', '<a href="$2" target="_blank" rel="noopener">$1</a>', $text);
    return $text;
}

function markdownToHtml($text) {
    $lines = explode("\n", str_replace("\r\n", "\n", $text));
    $out = [];
    $i = 0;
    $n = count($lines);

    while ($i < $n) {
        $line = $lines[$i];

        if (preg_match('/^```(\w*)/', $line, $m)) {
            $lang = $m[1];
            $code = [];
            $i++;
            while ($i < $n && !preg_match('/^```/', $lines[$i])) {
                $code[] = htmlspecialchars($lines[$i], ENT_QUOTES, 'UTF-8');
                $i++;
            }
            $langAttr = $lang ? ' class="lang-' . htmlspecialchars($lang, ENT_QUOTES, 'UTF-8') . '"' : '';
            $out[] = '<pre><code' . $langAttr . '>' . implode("\n", $code) . '</code></pre>';
            $i++;
            continue;
        }

        if (preg_match('/^\|/', $line)) {
            $tableLines = [];
            while ($i < $n && preg_match('/^\|/', $lines[$i])) {
                $tableLines[] = $lines[$i];
                $i++;
            }
            $html = '<table>';
            $inHead = true;
            $tbodyOpen = false;
            foreach ($tableLines as $tl) {
                if (preg_match('/^\|[\s\-:|]+\|$/', trim($tl))) {
                    if ($inHead) { $html .= '</thead><tbody>'; $tbodyOpen = true; }
                    $inHead = false;
                    continue;
                }
                $parts = explode('|', $tl);
                array_shift($parts);
                array_pop($parts);
                $cells = array_map('trim', $parts);
                if ($inHead) {
                    $html .= '<thead><tr>';
                    foreach ($cells as $c) $html .= '<th>' . inlineFormat(htmlspecialchars($c, ENT_QUOTES, 'UTF-8')) . '</th>';
                    $html .= '</tr>';
                } else {
                    $html .= '<tr>';
                    foreach ($cells as $c) $html .= '<td>' . inlineFormat(htmlspecialchars($c, ENT_QUOTES, 'UTF-8')) . '</td>';
                    $html .= '</tr>';
                }
            }
            $html .= $tbodyOpen ? '</tbody>' : '';
            $html .= '</table>';
            $out[] = $html;
            continue;
        }

        if (preg_match('/^(#{1,6})\s+(.+)/u', $line, $m)) {
            $lvl = strlen($m[1]);
            $htxt = inlineFormat(htmlspecialchars($m[2], ENT_QUOTES, 'UTF-8'));
            $out[] = "<h{$lvl}>{$htxt}</h{$lvl}>";
            $i++;
            continue;
        }

        if (preg_match('/^[-*_]{3,}\s*$/', $line)) {
            $out[] = '<hr>';
            $i++;
            continue;
        }

        if (preg_match('/^[-*]\s+(.+)/u', $line, $m)) {
            $out[] = '<ul>';
            while ($i < $n && preg_match('/^[-*]\s+(.+)/u', $lines[$i], $m)) {
                $out[] = '<li>' . inlineFormat(htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8')) . '</li>';
                $i++;
            }
            $out[] = '</ul>';
            continue;
        }

        if (preg_match('/^\d+\.\s+(.+)/u', $line, $m)) {
            $out[] = '<ol>';
            while ($i < $n && preg_match('/^\d+\.\s+(.+)/u', $lines[$i], $m)) {
                $out[] = '<li>' . inlineFormat(htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8')) . '</li>';
                $i++;
            }
            $out[] = '</ol>';
            continue;
        }

        if (preg_match('/^>\s?(.*)/', $line, $m)) {
            $qLines = [];
            while ($i < $n && preg_match('/^>\s?(.*)/', $lines[$i], $m)) {
                $qLines[] = inlineFormat(htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8'));
                $i++;
            }
            $out[] = '<blockquote>' . implode('<br/>', $qLines) . '</blockquote>';
            continue;
        }

        if (trim($line) === '') { $i++; continue; }

        $para = [];
        while ($i < $n) {
            $l = $lines[$i];
            if (trim($l) === '') break;
            if (preg_match('/^[#|`>]/', $l)) break;
            if (preg_match('/^[-*]\s/', $l)) break;
            if (preg_match('/^\d+\.\s/', $l)) break;
            if (preg_match('/^[-*_]{3,}\s*$/', $l)) break;
            $para[] = htmlspecialchars($l, ENT_QUOTES, 'UTF-8');
            $i++;
        }
        if ($para) $out[] = '<p>' . inlineFormat(implode(' ', $para)) . '</p>';
    }
    return implode("\n", $out);
}

$html = markdownToHtml($md);
$projectTitle = htmlspecialchars(ucfirst(str_replace('-', ' ', $p)));
$pe = htmlspecialchars($p);
?><!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Programterv — <?= $projectTitle ?> · AvC</title>
  <meta name="description" content="<?= $projectTitle ?> — technikai programterv. avc Agentic Vibe Coding projekt." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://sziklaizsolt.hu/avc/programterv-viewer.php?p=<?= $pe ?>" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />

  <meta property="og:title" content="Programterv — <?= $projectTitle ?> · AvC" />
  <meta property="og:type" content="article" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="viewer.css?v=<?= is_file(__DIR__.'/viewer.css') ? filemtime(__DIR__.'/viewer.css') : '1' ?>" />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="c087626e-16ed-4ddf-ae66-d6de1ec5a588"></script>
</head>
<body>
  <main class="viewer">
    <div class="viewer__topbar">
      <a class="back-link" href="index.html#projects" id="back-link">
        <svg viewBox="0 0 16 16" fill="none"><path d="M13 8H3M3 8l4-4M3 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        avc
      </a>
      <button class="theme-toggle" data-theme-toggle aria-label="Theme"></button>
    </div>

    <div class="viewer__kicker">Technikai terv · Programterv</div>

    <article class="md">
      <?= $html ?>
    </article>
  </main>

  <script src="viewer.js?v=<?= is_file(__DIR__.'/viewer.js') ? filemtime(__DIR__.'/viewer.js') : '1' ?>"></script>
  <script>
    AVCViewer.initTheme();
    AVCViewer.initBackLink();
    var h1 = document.querySelector(".md h1");
    if (h1) document.title = h1.textContent + " · AvC";
  </script>
  <script>(function(){function t(){if(window.umami){umami.track('programterv-viewer: '+<?= json_encode($p) ?>,{project:<?= json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
