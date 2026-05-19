(function(){
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderStory(s, container) {
    var isBug = s.type === 'bug';
    var div = document.createElement('div');
    div.className = 'story';

    var ac = (s.acceptanceCriteria || []).map(function(c){ return '<li>' + esc(c) + '</li>'; }).join('');
    var deps = (s.dependsOn || []);
    var depsHtml = deps.length
      ? '<div class="deps"><span class="dep-label">függ:</span>' +
        deps.map(function(d){ return '<span class="dep-badge">' + esc(d) + '</span>'; }).join('') + '</div>'
      : '';
    var notesHtml = s.notes ? '<div class="s-notes">' + esc(s.notes) + '</div>' : '';
    var verified = (s.verified || s.passes) ? '<span class="s-ok">✓ verified</span>' : '';

    div.innerHTML = '<div class="story-head">' +
      '<span class="s-id ' + (isBug ? 'bug' : 'us') + '">' + esc(s.id) + '</span>' +
      '<span class="s-title">' + esc(s.title) + '</span>' +
      verified +
      '<span class="chevron">▶</span>' +
      '</div>' +
      '<div class="story-body">' +
      (s.description ? '<div class="s-desc">' + esc(s.description) + '</div>' : '') +
      (ac ? '<div class="ac-title">Elfogadási kritériumok</div><ul class="ac-list">' + ac + '</ul>' : '') +
      depsHtml + notesHtml +
      '</div>';

    div.querySelector('.story-head').addEventListener('click', function(){ div.classList.toggle('open'); });
    container.appendChild(div);
  }

  window.renderPrd = function(prd) {
    var nameEl = document.getElementById('pname');
    var descEl = document.getElementById('pdesc');
    var metaEl = document.getElementById('pmeta');
    var usList = document.getElementById('us-list');
    var bugList = document.getElementById('bug-list');
    var ftCount = document.getElementById('ftcount');
    var ftDate = document.getElementById('ftdate');

    if (nameEl) nameEl.textContent = prd.name || '';
    if (descEl) descEl.textContent = prd.description || '';

    var us = (prd.userStories || []).filter(function(s){ return (s.type || 'US') !== 'bug'; });
    var bugs = (prd.userStories || []).filter(function(s){ return s.type === 'bug'; });

    var updatedAt = prd.metadata && prd.metadata.updatedAt ? prd.metadata.updatedAt.slice(0, 10) : '';
    if (metaEl) {
      metaEl.innerHTML =
        '<div>' + us.length + ' user story &nbsp;·&nbsp; <span>' + bugs.length + ' bug</span></div>' +
        (updatedAt ? '<div>frissítve: <span>' + updatedAt + '</span></div>' : '');
    }
    if (ftCount) ftCount.textContent = (us.length + bugs.length) + ' tétel';
    if (ftDate) ftDate.textContent = updatedAt;

    if (usList) us.forEach(function(s){ renderStory(s, usList); });
    if (bugList) bugs.forEach(function(s){ renderStory(s, bugList); });
  };
})();
