/* Project Rex Center V12.0.0 — shell: collapsible sidebar groups, compact sidebar, dashboard overview.
   Stores only two small UI preferences: rex12_nav (which groups are collapsed) and rex12_compact. Never touches app data. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };

  /* ---- sidebar groups ---- */
  const collapsed = new Set(Array.isArray(rd('rex12_nav', [])) ? rd('rex12_nav', []) : []);
  function paintGroups() {
    document.querySelectorAll('.nav-group').forEach(g => { const c = collapsed.has(g.dataset.g); g.classList.toggle('collapsed', c); const h = g.querySelector('.nav-group-h'); if (h) h.setAttribute('aria-expanded', String(!c)); });
  }
  function revealActive() { // never hide the page you are on
    const a = document.querySelector('.nav-item.active'); const g = a && a.closest('.nav-group');
    if (g && collapsed.has(g.dataset.g)) { collapsed.delete(g.dataset.g); paintGroups(); }
  }
  document.addEventListener('click', e => {
    const h = e.target.closest && e.target.closest('.nav-group-h'); if (!h) return;
    const id = h.parentNode.dataset.g; if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
    wr('rex12_nav', Array.from(collapsed)); paintGroups();
  });
  paintGroups();

  /* ---- compact sidebar ---- */
  const btn = $('sbCompactBtn');
  function paintCompact(on) { document.body.classList.toggle('sb-collapsed', on); if (btn) { btn.setAttribute('aria-pressed', String(on)); const t = on ? 'Expand sidebar' : 'Collapse sidebar'; btn.title = t; btn.setAttribute('aria-label', t); } }
  paintCompact(rd('rex12_compact', false) === true);
  if (btn) btn.addEventListener('click', () => { const on = !document.body.classList.contains('sb-collapsed'); wr('rex12_compact', on); paintCompact(on); });

  /* ---- Update Center dot (only shows that a newer version is published; never installs) ---- */
  function updDot() { const d = $('navUpdDot'); if (!d) return; let show = false; try { const s = window.RexUpd && RexUpd.state(); show = !!(s && s.available); } catch (_) {} d.hidden = !show; }
  setInterval(updDot, 5000);

  /* ---- dashboard overview: real data only ---- */
  const IC = { folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', note: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h4', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4', ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', check: 'M4 4h16v16H4zM8 12l3 3 5-6', clock: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l3 2M9 2h6', pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9' };
  const svg = (k, s) => '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + IC[k] + '"/></svg>';
  const arr = k => { const v = rd(k, []); return Array.isArray(v) ? v : []; };
  const ago = t => { const d = Date.now() - t; if (!(d >= 0)) return ''; const m = Math.floor(d / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.floor(m / 60); if (h < 24) return h + ' h ago'; return Math.floor(h / 24) + ' d ago'; };
  function overview() {
    const view = $('view-dashboard'); if (!view) return;
    let el = $('ov12'); if (!el) { el = document.createElement('section'); el.id = 'ov12'; el.className = 'ov12'; view.insertBefore(el, view.firstChild); }
    const projects = arr('rex101_projects'), notes = arr('rex101_notes'), pts = arr('rex101_restore_points'), tasks = arr('rex101_tasks');
    const openTasks = tasks.filter(t => t && !t.done && t.status !== 'Done' && t.status !== 'done').length;
    const lastBk = pts.length ? Math.max.apply(null, pts.map(p => Number(p.created || p.time || p.at || 0))) : 0;
    let ev = null; try { if (window.RexEvents) { const L = RexEvents.lists(); ev = L.active[0] || L.upcoming[0] || null; } } catch (_) {}
    const evLine = ev ? (ev.status === 'active' ? 'Live now · ends ' : 'Starts ') + (ev.status === 'active' ? new Date(ev.end.getTime() - 1) : ev.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No events scheduled';
    const acts = arr('rex101_activity').slice(0, 5).map(a => ({ t: Number(a.created) || 0, m: a.message }));
    let tl = []; try { tl = (state.timeline || []).slice(0, 5).map(x => ({ t: 0, m: x.text, w: x.time })); } catch (_) {}
    const recent = acts.length ? acts : tl;
    let news = null; try { news = window.RexInsider ? RexInsider.data().featured[0] : null; } catch (_) {}
    const wh = (() => { try { return (ws().webhooks || []).length; } catch (_) { return 0; } })();
    const card = (ic, n, label, sub, view) => '<button class="ov12-card" data-ov="' + view + '"><span class="ic">' + svg(ic) + '</span><b>' + n + '</b><span>' + label + '</span><small>' + esc(sub) + '</small></button>';
    el.innerHTML =
      '<div class="ov12-hero"><div><span class="ov12-eyebrow">PROJECT REX CENTER · V' + esc(typeof APP_VERSION === 'string' ? APP_VERSION : '') + '</span><h2>Welcome back</h2><p>Your local-only workspace for webhooks, projects, notes and seasonal events. Everything shown here is read from this browser.</p>' +
      '<form class="ov12-search" id="ov12Search" role="search"><input id="ov12Q" type="search" placeholder="Search everything…" aria-label="Search everything"><button class="btn btn-primary" type="submit">Search</button><button class="btn btn-secondary" type="button" data-ov-palette>⌘K</button></form></div><img src="icons/rex-mascot.svg" alt="" width="92" height="104"></div>' +
      '<div class="ov12-cards">' +
      card('cube', projects.length, 'Projects', projects.length ? 'in Rex Studio' : 'None yet — start one in Rex Studio', 'studio') +
      card('note', notes.length, 'Notes', notes.length ? 'in the Knowledge Base' : 'No notes yet', 'knowledge') +
      card('shield', pts.length, 'Backups', lastBk ? 'Last: ' + ago(lastBk) : 'No restore points yet', 'rollback') +
      card('ticket', ev ? ev.def.emoji : '—', 'Next event', ev ? ev.def.name + ' · ' + evLine : evLine, 'events') +
      card('send', wh, 'Webhooks', wh ? 'saved in this workspace' : 'None saved yet', 'builder') +
      card('check', openTasks, 'Open tasks', tasks.length ? 'of ' + tasks.length + ' in Task Center' : 'No tasks yet', 'tasks') + '</div>' +
      '<div class="ov12-cols"><div class="ov12-sec"><h3>Quick actions</h3><div class="ov12-qa">' +
      [['send', 'New webhook message', 'builder'], ['cube', 'Open Rex Studio', 'studio'], ['pen', 'Quick note (Alt+N)', '#note'], ['clock', 'Start Dev Clock', 'clock'], ['shield', 'Backup & Restore', 'rollback'], ['ticket', 'Holiday Live Events', 'events']].map(q => '<button type="button" data-ov="' + q[2] + '">' + svg(q[0], 18) + esc(q[1]) + '</button>').join('') + '</div></div>' +
      '<div class="ov12-sec"><h3>Rex Insider</h3>' + (news ? '<div class="ov12-news"><h4>' + esc(news.title) + '</h4><p>' + esc(String(news.body || '').slice(0, 160)) + (String(news.body || '').length > 160 ? '…' : '') + '</p></div>' : '<div class="empty12">No announcements right now.</div>') + '<button class="btn btn-secondary" type="button" data-ov="insider">Open Rex Insider</button></div></div>' +
      '<div class="ov12-cols"><div class="ov12-sec"><h3>Recent activity <button type="button" data-ov="timeline">Timeline</button></h3>' +
      (recent.length ? '<ul class="ov12-list">' + recent.map(a => '<li><i></i><span>' + esc(a.m) + '</span><time>' + esc(a.t ? ago(a.t) : (a.w || '')) + '</time></li>').join('') + '</ul>' : '<div class="empty12">Nothing yet. Your activity will appear here as you use Project Rex.</div>') + '</div>' +
      '<div class="ov12-sec"><h3>Quick links</h3><div class="ov12-links">' + [['Update Log', 'changelog'], ['Project Notebook', 'project-notebook'], ['Holiday Center', 'holidays'], ['Achievements', 'achievements'], ['Profile', 'profile'], ['Settings', 'settings']].map(l => '<button type="button" data-ov="' + l[1] + '">' + esc(l[0]) + '</button>').join('') + '<button type="button" data-ov="#updates">Check for updates</button></div></div></div>';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-ov],[data-ov-palette]'); if (!t || !t.closest('#ov12')) return;
    if (t.hasAttribute('data-ov-palette')) { if (typeof openPalette === 'function') openPalette(); return; }
    const v = t.dataset.ov;
    if (v === '#note') { if (window.RexQuick) RexQuick.open(); } else if (v === '#updates') { if (window.RexUpd) RexUpd.open(); } else showView(v);
  });
  document.addEventListener('submit', e => { if (e.target && e.target.id === 'ov12Search') { e.preventDefault(); const q = $('ov12Q').value.trim(); const g = $('globalSearch'); if (g && q) { g.value = q; if (typeof runGlobalSearch === 'function') runGlobalSearch(); } } });

  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (name) {
    const r = prev.apply(this, arguments);
    try { if (name === 'dashboard') overview(); revealActive(); } catch (e) { console.error('V12 shell:', e); }
    return r;
  };
  window.RexV12 = { overview, paintCompact };
})();
