/* Project Rex Center 12.4.0 - Global search in the command palette (Ctrl/Cmd+K).
   Type in the palette and Rex also searches your pages, projects, project tasks and notebook entries,
   Knowledge Base notes, tasks, workflows, templates, drafts, webhook NAMES (never the URLs) and Live Events.
   Pressing Enter opens the page and highlights the match. It only READS saved data and never writes to it.
   Everything stays in this browser. */
(function () {
  'use strict';
  if (typeof filterPalette !== 'function' || typeof renderPaletteList !== 'function') return;
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const txt = v => (v == null ? '' : String(v));
  const PER_GROUP = 5, MAX = 24;

  function score(q, text) {
    const t = txt(text).toLowerCase(); if (!t) return 0;
    if (t === q) return 100; if (t.startsWith(q)) return 80;
    if (new RegExp('(^|[\\s\\-_/·:])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)) return 60;
    return t.includes(q) ? 40 : 0;
  }
  const best = (q, arr) => Math.max.apply(null, arr.map(x => score(q, x)).concat([0]));

  /* open a page, optionally fill a search box / select, then flash the match */
  function flash(label) {
    setTimeout(() => {
      try {
        const v = document.querySelector('.view.active'); if (!v || !label) return;
        const needle = label.toLowerCase(); let hit = null, size = Infinity;
        v.querySelectorAll('article, .studio-row, .card, tr, li, .tpl, .task-row').forEach(el => {
          const t = el.textContent.toLowerCase(); if (t.includes(needle) && t.length < size && el.offsetParent !== null) { hit = el; size = t.length; }
        });
        if (hit) { hit.scrollIntoView({ block: 'center', behavior: 'smooth' }); hit.classList.add('gs-flash'); setTimeout(() => hit.classList.remove('gs-flash'), 2400); }
      } catch (e) {}
    }, 160);
  }
  function go(view, opts) {
    opts = opts || {};
    showView(view);
    setTimeout(() => {
      try {
        if (opts.search) { const i = $(opts.search[0]); if (i) { i.value = opts.search[1]; i.dispatchEvent(new Event('input', { bubbles: true })); } }
        if (opts.select) { const s = $(opts.select[0]); if (s) { s.value = opts.select[1]; s.dispatchEvent(new Event('change', { bubbles: true })); } }
      } catch (e) {}
      flash(opts.flash);
    }, 60);
  }

  function collect(q) {
    const g = [];
    const push = (kind, icon, rows) => { rows = rows.filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, PER_GROUP); if (rows.length) g.push({ kind, icon, rows }); };

    // pages (read from the real sidebar so names always match what you see)
    const cmdNames = (typeof COMMANDS !== 'undefined' ? COMMANDS : []).map(c => c.name.toLowerCase());
    const pages = []; document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(b => {
      const nm = (b.querySelector('.nv-t') || b).textContent.trim(); if (!nm || cmdNames.includes('open ' + nm.toLowerCase())) return;
      pages.push({ s: score(q, nm), name: nm, sub: 'Page', run: () => showView(b.dataset.view) });
    });
    push('Pages', '📄', pages);
    if (q.length < 2) return g;

    const projects = read('rex101_projects');
    push('Projects', '🧩', projects.map(p => ({ s: best(q, [p.name, p.status]), name: txt(p.name), sub: txt(p.status) || 'Project', run: () => go('studio', { search: ['studioProjectSearch', txt(p.name)], flash: txt(p.name) }) })));
    const pt = []; projects.forEach(p => { (p.tasks || []).forEach(t => pt.push({ s: score(q, t.title), name: txt(t.title), sub: 'Task in ' + txt(p.name) + (t.done ? ' · done' : ''), run: () => go('studio', { search: ['studioProjectSearch', txt(p.name)], flash: txt(t.title) }) })); });
    push('Project tasks', '✅', pt);
    const nb = []; projects.forEach(p => { (p.notebook || []).forEach(n => nb.push({ s: best(q, [n.title, n.body]) * (score(q, n.title) ? 1 : .8), name: txt(n.title) || txt(n.type) || 'Notebook entry', sub: 'Notebook · ' + txt(p.name), run: () => go('project-notebook', { select: ['projectNotebookSelect', p.id], flash: txt(n.title) }) })); });
    push('Notebook', '📓', nb);
    push('Knowledge Base', '📚', read('rex101_notes').map(n => ({ s: Math.max(score(q, n.title), score(q, n.tags) * .9, score(q, n.cat) * .8, score(q, n.body) * .7), name: txt(n.title) || 'Untitled', sub: txt(n.cat) || 'Note', run: () => go('knowledge', { search: ['kbSearch', txt(n.title)], flash: txt(n.title) }) })));
    push('Tasks', '☑️', read('rex101_tasks').map(t => ({ s: score(q, t.title), name: txt(t.title), sub: (t.done ? 'Done' : 'Open') + (t.priority ? ' · ' + t.priority : '') + (t.due ? ' · due ' + t.due : ''), run: () => go('tasks', { flash: txt(t.title) }) })));
    push('Workflows', '🔗', read('rex101_workflows').map(w => ({ s: score(q, w.name), name: txt(w.name), sub: txt(w.status) || 'Workflow', run: () => go('automation', { flash: txt(w.name) }) })));
    let W = {}; try { W = ws() || {}; } catch (e) {}
    push('Templates', '📝', (W.templates || []).map(t => ({ s: best(q, [t.name, t.cat]), name: txt(t.name), sub: txt(t.cat) || 'Template', run: () => go('templates', { flash: txt(t.name) }) })));
    push('Drafts', '✏️', (W.drafts || []).map(d => ({ s: score(q, d.name || d.title), name: txt(d.name || d.title) || 'Draft', sub: 'Draft', run: () => go('drafts', { flash: txt(d.name || d.title) }) })));
    push('Webhooks', '📡', (W.webhooks || []).map(h => ({ s: score(q, h.name), name: txt(h.name), sub: 'Webhook (name only)', run: () => showView('builder') })));
    try { push('Live Events', '🎃', RexEvents.EV.map(d => ({ s: score(q, d.name), name: txt(d.name), sub: 'Live Event', run: () => RexEvents.open() }))); } catch (e) {}
    return g;
  }

  /* palette hooks (the palette's own list / keyboard code keeps working) */
  window.filterPalette = function () {
    const raw = $('paletteInput').value, q = raw.trim().toLowerCase();
    const cmds = COMMANDS.filter(c => c.name.toLowerCase().includes(q));
    let flat = cmds.map(c => ({ name: c.name, run: c.run, cmd: true }));
    window.__gsGroups = [];
    if (q) {
      const groups = collect(q); let n = 0;
      groups.forEach(gr => { gr.rows = gr.rows.slice(0, Math.max(0, MAX - n)); n += gr.rows.length; });
      window.__gsGroups = groups.filter(gr => gr.rows.length);
      window.__gsGroups.forEach(gr => gr.rows.forEach(r => { r.group = gr; flat.push(r); }));
    }
    paletteFiltered = flat; paletteIdx = 0; renderPaletteList();
  };
  window.renderPaletteList = function () {
    const list = $('paletteList'); list.innerHTML = '';
    let lastGroup = null, sawCmd = false;
    paletteFiltered.forEach((c, i) => {
      if (c.group && c.group !== lastGroup) { lastGroup = c.group; const h = document.createElement('div'); h.className = 'gs-head'; h.textContent = c.group.icon + ' ' + c.group.kind; list.appendChild(h); }
      else if (c.cmd && !sawCmd && $('paletteInput').value.trim()) { sawCmd = true; const h = document.createElement('div'); h.className = 'gs-head'; h.textContent = '⌘ Commands'; list.appendChild(h); }
      const d = document.createElement('div'); d.className = 'palette-item' + (i === paletteIdx ? ' active' : ''); d.dataset.i = i;
      d.innerHTML = '<span class="gs-name">' + E(c.name) + '</span>' + (c.sub ? '<kbd>' + E(c.sub) + '</kbd>' : '');
      d.onclick = () => { closePalette(); c.run(); };
      list.appendChild(d);
    });
    if (!paletteFiltered.length) list.innerHTML = '<div class="palette-item">No matches. Try a different word.</div>';
    const a = list.querySelector('.palette-item.active'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
  };
  const inp = $('paletteInput'); if (inp) inp.placeholder = 'Type a command, or search pages, notes, tasks, projects…';
})();
