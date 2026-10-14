/* Project Rex Center 11.7.0 — Rex Insider (news room).
   Reads: js/insider-data.js (announcements), RexReleases (the existing Update Log) and RexEvents (event schedule, read-only).
   Writes: only its own key rexins1_seen (which Featured items you have already looked at). It never touches other data,
   never fetches anything, and does not offer event participation (that stays in Holiday Live Events). */
(function () {
  'use strict';
  const K_SEEN = 'rexins1_seen';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABS = [['featured', '📡', 'Featured'], ['soon', '🛰️', 'Coming Soon'], ['dev', '🧪', 'Development'], ['history', '📜', 'Release History'], ['holiday', '🎟️', 'Event Previews']];
  const ui = { tab: 'featured', all: false, q: '' };
  const seen = (() => { try { const v = JSON.parse(localStorage.getItem(K_SEEN)); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch (_) { return []; } })();
  const saveSeen = () => { try { localStorage.setItem(K_SEEN, JSON.stringify(seen.slice(-200))); } catch (_) {} };

  function data() {
    const d = window.REX_INSIDER && typeof window.REX_INSIDER === 'object' ? window.REX_INSIDER : {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const keep = x => x && typeof x === 'object' && x.id && x.title && !x.draft && !(x.hideAfter && new Date(x.hideAfter + 'T23:59:59') < today);
    const arr = a => (Array.isArray(a) ? a : []).filter(keep);
    return { featured: arr(d.featured).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date || '').localeCompare(String(a.date || ''))),
      coming: arr(d.coming), dev: arr(d.dev).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), holiday: Object.assign({ show: 4, notes: {} }, d.holiday || {}) };
  }
  const fmtDate = s => { const d = /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(s + 'T12:00:00') : null; return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  function linkBtn(l) {
    if (!l || !l.label) return '';
    if (l.view && $('view-' + l.view)) return '<button class="ins-btn" data-ia="go" data-v="' + esc(l.view) + '">' + esc(l.label) + ' →</button>';
    if (l.url && /^https:\/\//i.test(l.url)) return '<a class="ins-btn" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + ' ↗</a>';
    return '';
  }

  function tFeatured(D) {
    if (!D.featured.length) return '<div class="ins-empty">No announcements right now.</div>';
    const [first, ...rest] = D.featured;
    const card = (x, big) => '<article class="ins-card' + (big ? ' big' : '') + '"><div class="ins-meta"><span class="ins-tag">' + esc(x.tag || 'News') + '</span>' + (x.pinned ? '<span class="ins-tag pin">PINNED</span>' : '') + (isNew(x) ? '<span class="ins-tag new">NEW</span>' : '') + '<time>' + esc(fmtDate(x.date)) + '</time></div><h3>' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p>' + linkBtn(x.link) + '</article>';
    return card(first, true) + (rest.length ? '<div class="ins-grid">' + rest.map(x => card(x, false)).join('') + '</div>' : '');
  }
  const isNew = x => seen.indexOf(x.id) < 0 && !ui.markedNow;
  function tSoon(D) {
    if (!D.coming.length) return '<div class="ins-empty">Nothing announced yet.</div>';
    return '<div class="ins-grid">' + D.coming.map(x => '<article class="ins-card"><div class="ins-meta"><span class="ins-tag st-' + esc(String(x.status || 'Planned').toLowerCase().replace(/[^a-z]/g, '')) + '">' + esc(x.status || 'Planned') + '</span><time>' + esc(x.eta || '') + '</time></div><h3><span aria-hidden="true">' + esc(x.emoji || '✨') + '</span> ' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p></article>').join('') + '</div>' +
      '<p class="ins-note">Dates are plans, not promises. Nothing here is a paid or online service.</p>';
  }
  function tDev(D) {
    if (!D.dev.length) return '<div class="ins-empty">No development notes yet.</div>';
    return '<div class="ins-log">' + D.dev.map(x => { const p = Math.max(0, Math.min(100, Number(x.progress))); return '<article class="ins-entry"><div class="ins-dot" aria-hidden="true"></div><div><div class="ins-meta"><time>' + esc(fmtDate(x.date)) + '</time>' + (isFinite(p) && x.progress != null ? '<span class="ins-tag">' + p + '%</span>' : '') + '</div><h3>' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p>' + (isFinite(p) && x.progress != null ? '<div class="ins-bar" role="img" aria-label="' + p + ' percent"><i style="width:' + p + '%"></i></div>' : '') + '</div></article>'; }).join('') + '</div>';
  }
  const TYPE = { feature: 'New', improve: 'Improved', fix: 'Fixed', removed: 'Removed' };
  function tHistory() {
    const list = window.RexReleases ? RexReleases.list() : [];
    const q = ui.q.trim().toLowerCase();
    const f = q ? list.filter(r => (r.version + ' ' + r.summary + ' ' + r.items.map(i => i.text).join(' ')).toLowerCase().indexOf(q) >= 0) : list;
    const shown = ui.all || q ? f : f.slice(0, 8);
    let h = '<div class="ins-tools"><input id="insQ" type="search" placeholder="Search releases…" value="' + esc(ui.q) + '" aria-label="Search release history"><span>' + f.length + ' of ' + list.length + ' releases</span><button class="ins-btn ghost" data-ia="go" data-v="changelog">Open full Update Log →</button></div>';
    if (!shown.length) return h + '<div class="ins-empty">No releases match.</div>';
    h += '<div class="ins-log">' + shown.map((r, i) => '<details class="ins-entry rel"' + (i === 0 && !q ? ' open' : '') + '><summary><span class="ins-dot" aria-hidden="true"></span><span><b>v' + esc(r.version) + '</b> <time>' + esc(r.date) + '</time><em>' + esc(r.summary) + '</em></span></summary><ul>' +
      r.items.map(it => '<li><span class="ins-tag t-' + esc(it.type) + '">' + esc(TYPE[it.type] || it.type) + '</span> ' + esc(it.text) + '</li>').join('') + '</ul></details>').join('') + '</div>';
    if (!ui.all && !q && f.length > shown.length) h += '<button class="ins-btn" data-ia="all">Show all ' + f.length + ' releases</button>';
    return h;
  }
  function cd(ms) { if (ms <= 0) return '0:00:00'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400); return (d ? d + 'd ' : '') + String(Math.floor(s % 86400 / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function tHoliday(D) {
    if (!window.RexEvents) return '<div class="ins-empty">Event schedule is not available.</div>';
    const L = RexEvents.lists(), live = L.active.filter(i => !i.def.solemn), up = L.upcoming.slice(0, Math.max(1, Math.min(8, Number(D.holiday.show) || 4)));
    const fD = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const card = i => { const d = i.def, act = i.status === 'active', t = act ? i.end.getTime() + 1 : i.start.getTime(); const rw = RexEvents.rewardsOf(d).filter(r => r.id !== 'first' && r.id !== 'half').slice(0, 3).map(r => r.id === 'portal' ? 'Mystery reward' : r.name);
      const note = D.holiday.notes && D.holiday.notes[d.key];
      return '<article class="ins-card ev" style="--ev1:' + d.c[0] + ';--ev2:' + d.c[1] + '"><div class="ins-meta"><span class="ins-tag ' + (act ? 'live' : '') + '">' + (act ? '● LIVE NOW' : 'UPCOMING') + '</span><time>' + esc(fD(i.start) + ' – ' + fD(new Date(i.end.getTime() - 1)) + ', ' + i.end.getFullYear()) + '</time></div><h3><span aria-hidden="true">' + d.emoji + '</span> ' + esc(d.name) + '</h3><p>' + esc(d.desc) + '</p>' +
        '<div class="ins-cd">' + (act ? 'Ends in' : 'Starts in') + ' <b data-ins-cd="' + t + '">' + cd(t - Date.now()) + '</b></div>' + (rw.length ? '<div class="ins-rw">Rewards: ' + rw.map(esc).join(' · ') + '</div>' : '') + (note ? '<p class="ins-tip">' + esc(note) + '</p>' : '') +
        '<button class="ins-btn" data-ia="ev" data-id="' + i.id + '">' + (act ? 'Join in Holiday Live Events' : 'View in Holiday Live Events') + ' →</button></article>'; };
    let h = '<p class="ins-note top">This is a preview only. To take part, open <b>Holiday Live Events</b>. Times follow your device’s clock and time zone.</p>';
    if (live.length) h += '<h4 class="ins-h">Live now</h4><div class="ins-grid">' + live.map(card).join('') + '</div>';
    h += '<h4 class="ins-h">Coming up</h4><div class="ins-grid">' + up.map(card).join('') + '</div>';
    return h;
  }

  function badge() {
    const n = data().featured.filter(x => seen.indexOf(x.id) < 0).length;
    document.querySelectorAll('[data-view="insider"] .ins-badge').forEach(e => e.remove());
    if (n > 0) document.querySelectorAll('.nav-item[data-view="insider"]').forEach(b => { const e = document.createElement('em'); e.className = 'ins-badge'; e.textContent = n; e.setAttribute('aria-label', n + ' unread announcements'); b.appendChild(e); });
  }
  function render() {
    const root = $('rexInsRoot'); if (!root) return; const D = data();
    ui.markedNow = false;
    let h = '<section class="ins-hero"><div><span class="ins-eyebrow"><i></i> REX INSIDER · SIGNAL ONLINE</span><h2>News from inside Project Rex</h2><p>Announcements, what is coming, build notes and every release, all stored in the app. No accounts, no tracking, no servers.</p></div><div class="ins-ver">v' + esc(typeof APP_VERSION === 'string' ? APP_VERSION : '') + '</div></section>';
    h += '<div class="ins-tabs" role="tablist">' + TABS.map(t => '<button role="tab" aria-selected="' + (ui.tab === t[0]) + '" class="' + (ui.tab === t[0] ? 'on' : '') + '" data-ia="tab" data-t="' + t[0] + '"><span aria-hidden="true">' + t[1] + '</span> ' + t[2] + '</button>').join('') + '</div>';
    const body = { featured: tFeatured, soon: tSoon, dev: tDev, history: tHistory, holiday: tHoliday }[ui.tab](D);
    root.innerHTML = '<div class="ins">' + h + '<div class="ins-body">' + body + '</div></div>';
    if (ui.tab === 'featured') { let ch = false; D.featured.forEach(x => { if (seen.indexOf(x.id) < 0) { seen.push(x.id); ch = true; } }); if (ch) { saveSeen(); badge(); } }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#rexInsRoot [data-ia]'); if (!t) return; const a = t.dataset.ia;
    if (a === 'tab') { ui.tab = t.dataset.t; render(); }
    else if (a === 'all') { ui.all = true; render(); }
    else if (a === 'go') showView(t.dataset.v);
    else if (a === 'ev') { if (window.RexEvents) RexEvents.open(t.dataset.id); }
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'insQ') { ui.q = e.target.value; const pos = e.target.selectionStart; render(); const n = $('insQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } } });
  setInterval(() => { document.querySelectorAll('[data-ins-cd]').forEach(el => { el.textContent = cd(+el.dataset.insCd - Date.now()); }); }, 1000);

  try { if (typeof views === 'object') views.insider = ['Rex Insider', 'News, roadmap & release history']; } catch (_) {}
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (name) { const r = prev.apply(this, arguments); try { if (name === 'insider') render(); } catch (e) { console.error('Rex Insider:', e); } return r; };
  badge();
  window.RexInsider = { render, data, open: tab => { if (tab) ui.tab = tab; showView('insider'); } };
})();
