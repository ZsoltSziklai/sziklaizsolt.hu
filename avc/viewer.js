/* =========================================================
   Shared viewer utilities (vanilla JS)
   ========================================================= */

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) {
    if (n == null || isNaN(n)) return "—";
    var v = Number(n);
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(v));
  }

  function money(v) {
    if (v == null || isNaN(v)) return "—";
    return "$" + Number(v).toFixed(2);
  }

  // ---------- Project param ----------
  function getProject() {
    var p = new URLSearchParams(window.location.search).get("p") || "";
    if (!/^[a-z0-9_-]+$/i.test(p)) return null;
    return p;
  }

  // ---------- Theme handling ----------
  function initTheme() {
    var theme = "dark";
    try { theme = localStorage.getItem("sz_theme") || "dark"; } catch (_) {}
    document.documentElement.dataset.theme = theme;

    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      btn.addEventListener("click", function () {
        var cur = document.documentElement.dataset.theme;
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("sz_theme", next); } catch (_) {}
        renderThemeIcon(btn);
      });
      renderThemeIcon(btn);
    }
  }

  function renderThemeIcon(btn) {
    var t = document.documentElement.dataset.theme;
    btn.innerHTML = t === "dark"
      ? '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  }

  // ---------- Markdown to HTML (minimal, no external deps) ----------
  function inlineFormat(s) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return s;
  }

  function mdToHtml(md) {
    md = md.replace(/\r\n/g, "\n");
    var lines = md.split("\n");
    var out = [];
    var i = 0, n = lines.length;

    while (i < n) {
      var line = lines[i];

      // Code fences
      var mfence = line.match(/^```(\w*)/);
      if (mfence) {
        var lang = mfence[1];
        var code = [];
        i++;
        while (i < n && !/^```/.test(lines[i])) {
          code.push(esc(lines[i]));
          i++;
        }
        i++;
        out.push('<pre><code' + (lang ? ' class="lang-' + esc(lang) + '"' : '') + '>' + code.join("\n") + "</code></pre>");
        continue;
      }

      // Tables
      if (/^\|/.test(line) && i + 1 < n && /^\|[\s:|-]+\|/.test(lines[i + 1])) {
        var headerCells = line.split("|").slice(1, -1).map(function (c) { return c.trim(); });
        var rows = [];
        i += 2; // skip separator
        while (i < n && /^\|/.test(lines[i])) {
          rows.push(lines[i].split("|").slice(1, -1).map(function (c) { return c.trim(); }));
          i++;
        }
        var html = "<table><thead><tr>" +
          headerCells.map(function (c) { return "<th>" + inlineFormat(esc(c)) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          rows.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + inlineFormat(esc(c)) + "</td>"; }).join("") + "</tr>";
          }).join("") +
          "</tbody></table>";
        out.push(html);
        continue;
      }

      // Headings
      var mh = line.match(/^(#{1,6})\s+(.*)$/);
      if (mh) {
        var lvl = mh[1].length;
        out.push("<h" + lvl + ">" + inlineFormat(esc(mh[2])) + "</h" + lvl + ">");
        i++;
        continue;
      }

      // Blockquote
      if (/^>\s/.test(line)) {
        var qLines = [];
        while (i < n && /^>\s?/.test(lines[i])) {
          qLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + qLines.map(function (l) { return inlineFormat(esc(l)); }).join("<br/>") + "</blockquote>");
        continue;
      }

      // Lists (- or * or 1.)
      if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        var ordered = /^\d+\.\s+/.test(line);
        var items = [];
        while (i < n && (ordered ? /^\d+\.\s+/.test(lines[i]) : /^[-*]\s+/.test(lines[i]))) {
          var raw = lines[i].replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, "");
          items.push("<li>" + inlineFormat(esc(raw)) + "</li>");
          i++;
        }
        out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }

      // Blank line — paragraph break
      if (/^\s*$/.test(line)) { i++; continue; }

      // Paragraph (collect until blank/special)
      var para = [line];
      i++;
      while (i < n && lines[i].trim() !== "" && !/^(#|>|```|[-*]\s|\d+\.\s|\|)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + inlineFormat(esc(para.join(" "))) + "</p>");
    }

    return out.join("\n");
  }

  // Public API
  window.AVCViewer = {
    esc: esc,
    fmt: fmt,
    money: money,
    getProject: getProject,
    initTheme: initTheme,
    mdToHtml: mdToHtml,
    initBackLink: function () {
      var link = document.getElementById("back-link");
      if (!link) return;
      // Use history.back() if we came from /avc/index.html — preserves scroll.
      // Else fall back to /avc/index.html#projects.
      try {
        var ref = document.referrer || "";
        if (ref && /\/avc\/(index\.html)?(\?|#|$)/.test(ref) && window.history.length > 1) {
          link.addEventListener("click", function (e) {
            e.preventDefault();
            window.history.back();
          });
        }
      } catch (_) {}
    },
  };
})();
