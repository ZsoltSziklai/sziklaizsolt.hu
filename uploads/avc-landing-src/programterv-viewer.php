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
            $html = '<div class="table-wrap"><table>';
            $inHead = true;
            $tbodyOpen = false;
            foreach ($tableLines as $tl) {
                if (preg_match('/^\|[\s\-:|]+\|$/', trim($tl))) {
                    if ($inHead) {
                        $html .= '</thead><tbody>';
                        $tbodyOpen = true;
                    }
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
            $html .= '</table></div>';
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

        if (trim($line) === '') {
            $i++;
            continue;
        }

        $para = [];
        while ($i < $n) {
            $l = $lines[$i];
            if (trim($l) === '') break;
            if (preg_match('/^[#|`]/', $l)) break;
            if (preg_match('/^[-*]\s/', $l)) break;
            if (preg_match('/^\d+\.\s/', $l)) break;
            if (preg_match('/^[-*_]{3,}\s*$/', $l)) break;
            $para[] = htmlspecialchars($l, ENT_QUOTES, 'UTF-8');
            $i++;
        }
        if ($para) {
            $out[] = '<p>' . inlineFormat(implode(' ', $para)) . '</p>';
        }
    }

    return implode("\n", $out);
}

$html = markdownToHtml($md);
$projectTitle = htmlspecialchars(ucfirst($p));
?><!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Programterv — <?= $projectTitle ?></title>
<meta name="description" content="<?= $projectTitle ?> — technikai programterv: architektúra, adatbázis séma, API végpontok. avc Agentic Vibe Coding projekt.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://sziklaizsolt.hu/avc/programterv-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="alternate" hreflang="en" href="https://sziklaizsolt.hu/avc/programterv-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="alternate" hreflang="x-default" href="https://sziklaizsolt.hu/avc/programterv-viewer.php?p=<?= htmlspecialchars($p) ?>">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css?v=<?= filemtime(__DIR__.'/assets/style.css') ?>">
<meta property="og:title" content="Programterv — <?= $projectTitle ?>" />
<meta property="og:description" content="<?= $projectTitle ?> technikai programterv · avc" />
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
  <div class="content">
    <?= $html ?>
  </div>
</div>
<script src="assets/bg-canvas.js?v=<?= filemtime(__DIR__.'/assets/bg-canvas.js') ?>"></script>

<script>(function(){function t(){if(window.umami){umami.track('programterv-viewer: '+<?php echo json_encode($p) ?>,{project:<?php echo json_encode($p) ?>});}else{setTimeout(t,200);}}t();})();</script>
</body>
</html>
