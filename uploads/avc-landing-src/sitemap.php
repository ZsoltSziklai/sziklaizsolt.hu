<?php
header('Content-Type: application/xml; charset=UTF-8');

$base = 'https://sziklaizsolt.hu/avc';
$today = date('Y-m-d');

$registryFile = __DIR__ . '/projects.json';
$projects = [];
if (is_file($registryFile)) {
    $decoded = json_decode(file_get_contents($registryFile), true);
    $projects = $decoded['projects'] ?? [];
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><?= $base ?>/</loc>
    <lastmod><?= $today ?></lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
<?php foreach ($projects as $p):
  $slug = $p['name'] ?? '';
  $date = $p['deployed_at'] ?? $today;
  if (!$slug) continue;
?>
  <url>
    <loc><?= $base ?>/<?= htmlspecialchars($slug) ?>/</loc>
    <lastmod><?= htmlspecialchars($date) ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
<?php if (!empty($p['has_prd'])): ?>
  <url>
    <loc><?= $base ?>/prd-viewer.php?p=<?= htmlspecialchars($slug) ?></loc>
    <lastmod><?= htmlspecialchars($date) ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
<?php endif; ?>
<?php if (!empty($p['has_programterv'])): ?>
  <url>
    <loc><?= $base ?>/programterv-viewer.php?p=<?= htmlspecialchars($slug) ?></loc>
    <lastmod><?= htmlspecialchars($date) ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
<?php endif; ?>
<?php if (!empty($p['has_token_report'])): ?>
  <url>
    <loc><?= $base ?>/token-report-viewer.php?p=<?= htmlspecialchars($slug) ?></loc>
    <lastmod><?= htmlspecialchars($date) ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
<?php endif; ?>
<?php endforeach; ?>
</urlset>
