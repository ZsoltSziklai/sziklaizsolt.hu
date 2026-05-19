(function(){
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    var v = Number(n);
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(v));
  }

  function money(v) {
    if (v == null || isNaN(v)) return '—';
    return '$' + Number(v).toFixed(2);
  }

  function pct(v) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toFixed(1) + '%';
  }

  window.renderTokenReport = function(data) {
    var mount = document.getElementById('token-mount');
    if (!mount) return;

    if (!data || !data.agents) {
      mount.innerHTML = '<div class="unavailable">A token statisztika nem elérhető ehhez a projekthez.</div>';
      return;
    }

    var sub = (data.pipeline_subtotal || data.grand_total || {});
    var totalCost = sub.cost;

    var hero =
      '<div class="cost-hero">' +
        '<div class="cost-hero-label">Teljes pipeline költség</div>' +
        '<div class="cost-hero-value">' + money(totalCost) + ' <span style="font-size:.55em; color: var(--muted); font-weight:600;">USD</span></div>' +
        (sub.messages ? '<div class="cost-hero-sub">' + fmt(sub.messages) + ' üzenet · ' + fmt(sub.output) + ' output token</div>' : '') +
      '</div>';

    var order = ['aiO', 'Ralph', 'aiQA'];
    var agents = data.agents || {};
    var knownKeys = Object.keys(agents);
    var rowsSource = order.filter(function(k){ return agents[k]; });
    knownKeys.forEach(function(k){ if (rowsSource.indexOf(k) === -1) rowsSource.push(k); });

    var rows = rowsSource.map(function(name){
      var a = agents[name];
      return '<tr>' +
        '<td class="agent-name">' + esc(name) + '</td>' +
        '<td class="model">' + esc(a.model || '') + '</td>' +
        '<td class="num">' + fmt(a.messages) + '</td>' +
        '<td class="num">' + fmt(a.output_tokens) + '</td>' +
        '<td class="num">' + fmt(a.cache_read_tokens) + '</td>' +
        '<td class="num">' + fmt(a.cache_create_tokens) + '</td>' +
        '<td class="num cost">' + money(a.cost) + '</td>' +
      '</tr>';
    }).join('');

    var totalRow = '<tr class="total">' +
      '<td class="agent-name">Pipeline</td>' +
      '<td class="model">—</td>' +
      '<td class="num">' + fmt(sub.messages) + '</td>' +
      '<td class="num">' + fmt(sub.output) + '</td>' +
      '<td class="num">' + fmt(sub.cache_read) + '</td>' +
      '<td class="num">' + fmt(sub.cache_create) + '</td>' +
      '<td class="num cost">' + money(sub.cost) + '</td>' +
    '</tr>';

    var table =
      '<div class="token-table-wrap"><table class="token-table">' +
        '<thead><tr>' +
          '<th>Agent</th><th>Modell</th>' +
          '<th>Üzenet</th><th>Output</th>' +
          '<th>Cache&nbsp;R</th><th>Cache&nbsp;W</th>' +
          '<th>Költség</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + totalRow + '</tbody>' +
      '</table></div>';

    var pricing =
      '<div class="pricing-box">' +
        '<div class="pricing-title">Árazás referencia (Anthropic API, $/M token)</div>' +
        '<div><b>Opus 4</b>: input <code>$15</code> · output <code>$75</code> · cache read <code>$1.5</code> · cache write <code>$18.75</code></div>' +
        '<div><b>Sonnet 4</b>: input <code>$3</code> · output <code>$15</code> · cache read <code>$0.3</code> · cache write <code>$3.75</code></div>' +
      '</div>';

    mount.innerHTML = hero + table + pricing;

    var genEl = document.getElementById('ftgen');
    if (genEl) genEl.textContent = data.generated_at || '—';
  };
})();
