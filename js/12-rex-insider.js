/* Project Rex Center 13.8.0 · Rex Insider, the newsroom (rebuilt).
   Reads: js/insider-data.js (announcements), RexReleases (the Update Log) and RexEvents (event schedule, read-only).
   Writes only its own keys: rexins1_seen (which Featured items you have looked at), rexins2_saved (items you starred),
   rexins2_last (the version you were on when you last pressed "Got it"). Never fetches anything, no accounts, no tracking. */
(function () {
  'use strict';
  const K_SEEN = 'rexins1_seen', K_SAVED = 'rexins2_saved', K_LAST = 'rexins2_last';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABS = [['featured', '📡', 'Featured'], ['soon', '🛰️', 'Coming Soon'], ['dev', '🧪', 'Development'], ['history', '📜', 'Release History'], ['holiday', '🎟️', 'Event Previews'], ['saved', '⭐', 'Saved']];
  const ui = { tab: 'featured', all: false, q: '', tag: '', unread: false, rtype: '', openAll: false, fresh: null };
  const arr = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch (_) { return []; } };
  const put = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a.slice(-300))); } catch (_) { /* ignore */ } };
  const seen = arr(K_SEEN), saved = arr(K_SAVED);
  const getLast = () => { try { return localStorage.getItem(K_LAST) || ''; } catch (_) { return ''; } };
  const setLast = v => { try { localStorage.setItem(K_LAST, v); } catch (_) { /* ignore */ } };
  const cur = () => (typeof APP_VERSION === 'string' ? APP_VERSION : '');

  function data() {
    const d = window.REX_INSIDER && typeof window.REX_INSIDER === 'object' ? window.REX_INSIDER : {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const keep = x => x && typeof x === 'object' && x.id && x.title && !x.draft && !(x.hideAfter && new Date(x.hideAfter + 'T23:59:59') < today);
    const a = v => (Array.isArray(v) ? v : []).filter(keep);
    return { featured: a(d.featured).sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || String(y.date || '').localeCompare(String(x.date || ''))),
      coming: a(d.coming), dev: a(d.dev).sort((x, y) => String(y.date || '').localeCompare(String(x.date || ''))), holiday: Object.assign({ show: 4, notes: {} }, d.holiday || {}) };
  }
  const fmtDate = s => { const d = /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(s + 'T12:00:00') : null; return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  const rels = () => (window.RexReleases ? RexReleases.list() : []);
  const monthOf = r => { const t = Date.parse(r.date); return isNaN(t) ? 'Earlier' : new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
  const TYPE = { feature: 'New', improve: 'Improved', fix: 'Fixed', removed: 'Removed' };
  const ICON = { 'new feature': '✨', announcement: '📣', 'good to know': '💡', fix: '🛠️', tip: '💡', event: '🎟️' };
  const slug = s => String(s || 'news').toLowerCase().replace(/[^a-z]+/g, '');
  const unreadIds = D => D.featured.filter(x => seen.indexOf(x.id) < 0).map(x => x.id);
  const isNew = x => (ui.fresh ? ui.fresh.indexOf(x.id) >= 0 : seen.indexOf(x.id) < 0);

  function linkBtn(l) {
    if (!l || !l.label) return '';
    if (l.view && $('view-' + l.view)) return '<button class="ins-btn" data-ia="go" data-v="' + esc(l.view) + '"' + (l.tab ? ' data-t="' + esc(l.tab) + '"' : '') + '>' + esc(l.label) + ' →</button>';
    if (l.url && /^https:\/\//i.test(l.url)) return '<a class="ins-btn" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + ' ↗</a>';
    return '';
  }
  const star = id => { const on = saved.indexOf(id) >= 0; return '<button type="button" class="ins-star' + (on ? ' on' : '') + '" data-ia="save" data-id="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from Saved' : 'Save for later') + '" title="' + (on ? 'Saved' : 'Save for later') + '">' + (on ? '★' : '☆') + '</button>'; };
  function card(x, big) {
    const tg = x.tag || 'News';
    return '<article class="ins-card tg-' + slug(tg) + (big ? ' big' : '') + '"><div class="ins-meta"><span class="ins-ic" aria-hidden="true">' + (ICON[tg.toLowerCase()] || '📰') + '</span><span class="ins-tag">' + esc(tg) + '</span>' + (x.pinned ? '<span class="ins-tag pin">PINNED</span>' : '') + (isNew(x) ? '<span class="ins-tag new">NEW</span>' : '') + '<time>' + esc(fmtDate(x.date)) + '</time>' + star(x.id) + '</div><h3>' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p>' + linkBtn(x.link) + '</article>';
  }
  function soonCard(x) {
    return '<article class="ins-card st"><div class="ins-meta"><span class="ins-tag st-' + slug(x.status || 'Planned') + '">' + esc(x.status || 'Planned') + '</span><time>' + esc(x.eta || '') + '</time>' + star(x.id) + '</div><h3><span aria-hidden="true">' + esc(x.emoji || '🛰️') + '</span> ' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p>' + linkBtn(x.link) + '</article>';
  }
  function devEntry(x) {
    const p = Math.max(0, Math.min(100, Number(x.progress)));
    return '<article class="ins-entry"><div class="ins-dot" aria-hidden="true"></div><div><div class="ins-meta"><time>' + esc(fmtDate(x.date)) + '</time>' + (isFinite(p) && x.progress != null ? '<span class="ins-tag' + (p >= 100 ? ' done' : '') + '">' + (p >= 100 ? 'DONE' : p + '%') + '</span>' : '') + star(x.id) + '</div><h3>' + esc(x.title) + '</h3><p>' + esc(x.body || '') + '</p>' +
      (isFinite(p) && x.progress != null ? '<div class="ins-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '" aria-label="' + esc(x.title) + ' progress"><i style="width:' + p + '%"></i></div>' : '') + linkBtn(x.link) + '</div></article>';
  }
  function relEntry(r, open) {
    return '<details class="ins-entry rel"' + (open ? ' open' : '') + '><summary><span class="ins-dot" aria-hidden="true"></span><span><b>v' + esc(r.version) + '</b> <time>' + esc(r.date) + '</time><em>' + esc(r.summary) + '</em></span></summary><ul>' +
      r.items.map(it => '<li><span class="ins-tag t-' + esc(it.type) + '">' + esc(TYPE[it.type] || it.type) + '</span> ' + esc(it.text) + '</li>').join('') + '</ul><button type="button" class="ins-btn ghost sm" data-ia="copy" data-v="' + esc(r.version) + '">Copy notes</button></details>';
  }

  /* ---- Featured ---- */
  function digest() {
    const last = getLast(), now = cur(); if (!last || last === now) return '';
    const L = rels(), i = L.findIndex(r => r.version === last), newer = i > 0 ? L.slice(0, i) : (i < 0 ? L.slice(0, 5) : []);
    if (!newer.length) return '';
    return '<div class="ins-digest" role="status"><span class="ins-dg-e" aria-hidden="true">🆕</span><div><b>Since your last visit</b><p>You went from v' + esc(last) + ' to v' + esc(now) + '. ' + newer.length + ' release' + (newer.length === 1 ? '' : 's') + ' landed: ' + newer.slice(0, 3).map(r => esc(r.summary)).join(' · ') + '</p></div><div class="ins-dg-b"><button class="ins-btn" data-ia="go" data-v="insider" data-t="history">Read the notes →</button><button class="ins-btn ghost" data-ia="gotit">Got it</button></div></div>';
  }
  function spotlight() {
    const r = rels()[0]; if (!r) return '';
    const pick = r.items.filter(i => i.type === 'feature').concat(r.items.filter(i => i.type !== 'feature')).slice(0, 4);
    return '<section class="ins-spot" aria-label="Latest release"><div class="ins-spot-h"><span class="ins-spot-v">v' + esc(r.version) + '</span><span class="ins-eyebrow"><i></i> LATEST RELEASE</span><time>' + esc(r.date) + '</time></div><h3>' + esc(r.summary) + '</h3><ul>' +
      pick.map(it => '<li><span class="ins-tag t-' + esc(it.type) + '">' + esc(TYPE[it.type] || it.type) + '</span> ' + esc(it.text) + '</li>').join('') + '</ul><div class="ins-spot-b"><button class="ins-btn" data-ia="go" data-v="insider" data-t="history">All release notes →</button>' + (window.RexTrailer ? '<button class="ins-btn ghost" data-ia="trailer">▶ Watch the trailer</button>' : '') + '</div></section>';
  }
  function tFeatured(D) {
    if (!D.featured.length) return digest() + spotlight() + '<div class="ins-empty">No announcements right now.</div>';
    const tags = Array.from(new Set(D.featured.map(x => x.tag || 'News')));
    let list = D.featured; if (ui.tag) list = list.filter(x => (x.tag || 'News') === ui.tag); if (ui.unread) list = list.filter(isNew);
    const un = D.featured.filter(isNew).length;
    const chips = '<div class="ins-chips" role="group" aria-label="Filter announcements"><button type="button" class="ins-chip' + (!ui.tag ? ' on' : '') + '" aria-pressed="' + !ui.tag + '" data-ia="tag" data-g="">All</button>' + tags.map(t => '<button type="button" class="ins-chip' + (ui.tag === t ? ' on' : '') + '" aria-pressed="' + (ui.tag === t) + '" data-ia="tag" data-g="' + esc(t) + '">' + esc(t) + '</button>').join('') +
      '<span class="ins-sp"></span><button type="button" class="ins-chip' + (ui.unread ? ' on' : '') + '" aria-pressed="' + ui.unread + '" data-ia="unread">Unread only' + (un ? ' (' + un + ')' : '') + '</button>' + (un ? '<button type="button" class="ins-chip" data-ia="readall">Mark all read</button>' : '') + '</div>';
    const body = list.length ? (() => { const [first, ...rest] = list; return (ui.tag || ui.unread ? '<div class="ins-grid">' + list.map(x => card(x, false)).join('') + '</div>' : card(first, true) + (rest.length ? '<div class="ins-grid">' + rest.map(x => card(x, false)).join('') + '</div>' : '')); })() : '<div class="ins-empty">Nothing matches. ' + (ui.unread ? 'You are all caught up. 🎉' : '') + '</div>';
    return digest() + spotlight() + '<h4 class="ins-h">Announcements</h4>' + chips + body;
  }
  /* ---- Coming Soon: a roadmap board ---- */
  function tSoon(D) {
    if (!D.coming.length) return '<div class="ins-empty">Nothing announced yet.</div>';
    const order = ['In progress', 'Testing', 'Scheduled', 'Planned', 'Idea'], by = {};
    D.coming.forEach(x => { const s = x.status || 'Planned'; (by[s] = by[s] || []).push(x); });
    const keys = order.filter(k => by[k]).concat(Object.keys(by).filter(k => order.indexOf(k) < 0));
    return '<div class="ins-board">' + keys.map(k => '<section class="ins-col"><h4><span class="ins-tag st-' + slug(k) + '">' + esc(k) + '</span><b>' + by[k].length + '</b></h4>' + by[k].map(soonCard).join('') + '</section>').join('') + '</div><p class="ins-note">Dates are plans, not promises. Nothing here is a paid or online service.</p>';
  }
  function tDev(D) {
    if (!D.dev.length) return '<div class="ins-empty">No development notes yet.</div>';
    let last = '', h = '<div class="ins-log">';
    D.dev.forEach(x => { const m = /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') ? new Date(x.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''; if (m && m !== last) { h += '<h4 class="ins-h">' + esc(m) + '</h4>'; last = m; } h += devEntry(x); });
    return h + '</div>';
  }
  /* ---- Release history ---- */
  function tHistory() {
    const list = rels(), t = ui.rtype, q = ui.q.trim().toLowerCase();
    let f = list; if (t) f = f.filter(r => r.items.some(i => i.type === t));
    const shown = ui.all || q || t ? f : f.slice(0, 10);
    const chips = '<div class="ins-chips" role="group" aria-label="Filter releases"><button type="button" class="ins-chip' + (!t ? ' on' : '') + '" aria-pressed="' + !t + '" data-ia="rtype" data-g="">All</button>' + Object.keys(TYPE).map(k => '<button type="button" class="ins-chip t-' + k + (t === k ? ' on' : '') + '" aria-pressed="' + (t === k) + '" data-ia="rtype" data-g="' + k + '">' + TYPE[k] + '</button>').join('') +
      '<span class="ins-sp"></span><button type="button" class="ins-chip" data-ia="expand">' + (ui.openAll ? 'Collapse all' : 'Expand all') + '</button></div>';
    let h = '<div class="ins-tools"><span>' + f.length + ' of ' + list.length + ' releases</span><button class="ins-btn ghost" data-ia="go" data-v="changelog">Open full Update Log →</button></div>' + chips;
    if (!shown.length) return h + '<div class="ins-empty">No releases match.</div>';
    let m = '';
    h += '<div class="ins-log">' + shown.map((r, i) => { const mm = monthOf(r), head = mm !== m ? '<h4 class="ins-h">' + esc(mm) + '</h4>' : ''; m = mm; return head + relEntry(r, ui.openAll || (i === 0 && !t)); }).join('') + '</div>';
    if (!ui.all && !t && f.length > shown.length) h += '<button class="ins-btn" data-ia="all">Show all ' + f.length + ' releases</button>';
    return h;
  }
  /* ---- Event previews (unchanged behavior) ---- */
  function cd(ms) { if (ms <= 0) return '0:00:00'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400); return (d ? d + 'd ' : '') + String(Math.floor(s % 86400 / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function tHoliday(D) {
    if (!window.RexEvents) return '<div class="ins-empty">Event schedule is not available.</div>';
    const L = RexEvents.lists(), live = L.active.filter(i => !i.def.solemn), up = L.upcoming.slice(0, Math.max(1, Math.min(8, Number(D.holiday.show) || 4)));
    const fD = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const evc = i => { const d = i.def, act = i.status === 'active', t = act ? i.end.getTime() + 1 : i.start.getTime(); const rw = RexEvents.rewardsOf(d).filter(r => r.id !== 'first' && r.id !== 'half').slice(0, 3).map(r => r.id === 'portal' ? 'Mystery reward' : r.name);
      const note = D.holiday.notes && D.holiday.notes[d.key];
      return '<article class="ins-card ev" style="--ev1:' + d.c[0] + ';--ev2:' + d.c[1] + '"><div class="ins-meta"><span class="ins-tag ' + (act ? 'live' : '') + '">' + (act ? '● LIVE NOW' : 'UPCOMING') + '</span><time>' + esc(fD(i.start) + ' – ' + fD(new Date(i.end.getTime() - 1)) + ', ' + i.end.getFullYear()) + '</time></div><h3><span aria-hidden="true">' + esc(d.emoji || '🎟️') + '</span> ' + esc(d.name) + '</h3>' +
        '<div class="ins-cd">' + (act ? 'Ends in' : 'Starts in') + ' <b data-ins-cd="' + t + '">' + cd(t - Date.now()) + '</b></div>' + (rw.length ? '<div class="ins-rw">Rewards: ' + rw.map(esc).join(' · ') + '</div>' : '') + (note ? '<p class="ins-tip">' + esc(note) + '</p>' : '') +
        '<button class="ins-btn" data-ia="ev" data-id="' + i.id + '">' + (act ? 'Join in Holiday Live Events' : 'View in Holiday Live Events') + ' →</button></article>'; };
    let h = '<p class="ins-note top">This is a preview only. To take part, open <b>Holiday Live Events</b>. Times follow your device’s clock and time zone.</p>';
    if (live.length) h += '<h4 class="ins-h">Live now</h4><div class="ins-grid">' + live.map(evc).join('') + '</div>';
    h += '<h4 class="ins-h">Coming up</h4><div class="ins-grid">' + up.map(evc).join('') + '</div>';
    return h;
  }
  /* ---- Saved + search ---- */
  const allItems = D => [].concat(D.featured.map(x => ['featured', x]), D.coming.map(x => ['soon', x]), D.dev.map(x => ['dev', x]));
  const render1 = (k, x) => k === 'featured' ? card(x, false) : k === 'soon' ? soonCard(x) : devEntry(x);
  function tSaved(D) {
    const items = allItems(D).filter(p => saved.indexOf(p[1].id) >= 0);
    if (!items.length) return '<div class="ins-empty">Nothing saved yet. Tap the ☆ on any announcement, roadmap item or dev note to keep it here.</div>';
    return '<div class="ins-grid">' + items.map(p => render1(p[0], p[1])).join('') + '</div>';
  }
  function tSearch(D) {
    const q = ui.q.trim().toLowerCase(), has = (...s) => s.join(' ').toLowerCase().indexOf(q) >= 0;
    const f = D.featured.filter(x => has(x.title, x.body, x.tag)), c = D.coming.filter(x => has(x.title, x.body, x.status)), d = D.dev.filter(x => has(x.title, x.body));
    const r = rels().filter(x => has(x.version, x.summary, x.items.map(i => i.text).join(' ')));
    const n = f.length + c.length + d.length + r.length;
    let h = '<div class="ins-tools"><span>' + n + ' result' + (n === 1 ? '' : 's') + ' for “' + esc(ui.q.trim()) + '”</span><button class="ins-btn ghost" data-ia="clearq">Clear search</button></div>';
    if (!n) return h + '<div class="ins-empty">Nothing found. Try a shorter word.</div>';
    if (f.length) h += '<h4 class="ins-h">Announcements · ' + f.length + '</h4><div class="ins-grid">' + f.map(x => card(x, false)).join('') + '</div>';
    if (c.length) h += '<h4 class="ins-h">Coming soon · ' + c.length + '</h4><div class="ins-grid">' + c.map(soonCard).join('') + '</div>';
    if (d.length) h += '<h4 class="ins-h">Development · ' + d.length + '</h4><div class="ins-log">' + d.map(devEntry).join('') + '</div>';
    if (r.length) h += '<h4 class="ins-h">Releases · ' + r.length + '</h4><div class="ins-log">' + r.slice(0, 25).map((x, i) => relEntry(x, r.length <= 3 && i === 0)).join('') + '</div>' + (r.length > 25 ? '<p class="ins-note">Showing the newest 25. Narrow your search to see more.</p>' : '');
    return h;
  }

  function badge() {
    const n = unreadIds(data()).length;
    document.querySelectorAll('[data-view="insider"] .ins-badge').forEach(e => e.remove());
    if (n > 0) document.querySelectorAll('.nav-item[data-view="insider"]').forEach(b => { const e = document.createElement('em'); e.className = 'ins-badge'; e.textContent = n; e.setAttribute('aria-label', n + ' unread announcements'); b.appendChild(e); });
  }
  function stats(D) {
    let live = 0; try { if (window.RexEvents) live = RexEvents.lists().active.filter(i => !i.def.solemn).length; } catch (_) { /* ignore */ }
    const s = [['📬', unreadIds(D).length, 'Unread', 'featured'], ['📜', rels().length, 'Releases', 'history'], ['🛰️', D.coming.length, 'Coming soon', 'soon'], ['🎟️', live, 'Events live', 'holiday'], ['⭐', saved.length, 'Saved', 'saved']];
    return '<div class="ins-stats">' + s.map(x => '<button type="button" class="ins-stat" data-ia="tab" data-t="' + x[3] + '"><span aria-hidden="true">' + x[0] + '</span><b>' + x[1] + '</b><small>' + x[2] + '</small></button>').join('') + '</div>';
  }
  function render() {
    const root = $('rexInsRoot'); if (!root) return; const D = data();
    if (!ui.fresh) ui.fresh = unreadIds(D);
    const searching = !!ui.q.trim();
    let h = '<section class="ins-hero"><div><span class="ins-eyebrow"><i></i> REX INSIDER · NEWSROOM</span><h2>News from inside Project Rex</h2><p>Announcements, the roadmap, build notes and every release, all stored in the app. No accounts, no tracking, no servers.</p></div><div class="ins-ver">v' + esc(cur()) + '</div></section>';
    h += stats(D);
    h += '<div class="ins-search"><span aria-hidden="true">🔎</span><input id="insQ" type="search" placeholder="Search news, roadmap, notes and releases…  ( / )" value="' + esc(ui.q) + '" aria-label="Search Rex Insider" autocomplete="off"></div>';
    h += '<div class="ins-tabs" role="tablist">' + TABS.map(t => '<button role="tab" aria-selected="' + (!searching && ui.tab === t[0]) + '" class="' + (!searching && ui.tab === t[0] ? 'on' : '') + '" data-ia="tab" data-t="' + t[0] + '"><span aria-hidden="true">' + t[1] + '</span> ' + t[2] + '</button>').join('') + '</div>';
    const body = searching ? tSearch(D) : { featured: tFeatured, soon: tSoon, dev: tDev, history: tHistory, holiday: tHoliday, saved: tSaved }[ui.tab](D);
    root.innerHTML = '<div class="ins">' + h + '<div class="ins-body">' + body + '</div></div>';
    if (ui.tab === 'featured' && !searching) { let ch = false; D.featured.forEach(x => { if (seen.indexOf(x.id) < 0) { seen.push(x.id); ch = true; } }); if (ch) { put(K_SEEN, seen); badge(); } }
    if (!getLast() && cur()) setLast(cur());
  }
  function keepFocus(fn) { fn(); const n = $('insQ'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (_) { /* ignore */ } } }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#rexInsRoot [data-ia]'); if (!t) return; const a = t.dataset.ia;
    if (a === 'tab') { ui.tab = t.dataset.t; ui.q = ''; render(); }
    else if (a === 'all') { ui.all = true; render(); }
    else if (a === 'tag') { ui.tag = t.dataset.g || ''; render(); }
    else if (a === 'unread') { ui.unread = !ui.unread; render(); }
    else if (a === 'readall') { const D = data(); unreadIds(D).forEach(i => seen.push(i)); ui.fresh = []; put(K_SEEN, seen); badge(); render(); }
    else if (a === 'rtype') { ui.rtype = t.dataset.g || ''; render(); }
    else if (a === 'expand') { ui.openAll = !ui.openAll; render(); }
    else if (a === 'clearq') { ui.q = ''; render(); }
    else if (a === 'gotit') { setLast(cur()); render(); }
    else if (a === 'trailer') { try { RexTrailer.play(); } catch (_) { /* ignore */ } }
    else if (a === 'save') { const id = t.dataset.id, i = saved.indexOf(id); if (i >= 0) saved.splice(i, 1); else saved.push(id); put(K_SAVED, saved); const top = window.scrollY; render(); try { window.scrollTo(0, top); } catch (_) { /* ignore */ } const b = document.querySelector('#rexInsRoot .ins-star[data-id="' + id + '"]'); if (b) b.focus({ preventScroll: true }); }
    else if (a === 'copy') { const r = rels().find(x => x.version === t.dataset.v); if (r) { const txt = 'Project Rex Center v' + r.version + ' (' + r.date + ')\n' + r.summary + '\n' + r.items.map(i => '- ' + (TYPE[i.type] || i.type) + ': ' + i.text).join('\n'); try { navigator.clipboard.writeText(txt).then(() => { if (typeof toast === 'function') toast('Release notes copied', 'success'); }, () => { if (typeof toast === 'function') toast('Could not copy', 'error'); }); } catch (_) { if (typeof toast === 'function') toast('Could not copy', 'error'); } } }
    else if (a === 'go') {
      // A link to an Insider tab (for example "See what is coming") switches tab even though we are already on this page.
      if (t.dataset.v === 'insider') { if (t.dataset.t && TABS.some(x => x[0] === t.dataset.t)) ui.tab = t.dataset.t; ui.q = ''; showView('insider'); render(); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { /* ignore */ } }
      else showView(t.dataset.v);
    }
    else if (a === 'ev') { if (window.RexEvents) RexEvents.open(t.dataset.id); }
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'insQ') { ui.q = e.target.value; keepFocus(render); } });
  document.addEventListener('keydown', e => {
    const v = $('view-insider'); if (e.key !== '/' || !v || !v.classList.contains('active')) return;
    const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    const n = $('insQ'); if (n) { e.preventDefault(); n.focus(); }
  });
  setInterval(() => { document.querySelectorAll('[data-ins-cd]').forEach(el => { el.textContent = cd(+el.dataset.insCd - Date.now()); }); }, 1000);

  try { if (typeof views === 'object') views.insider = ['Rex Insider', 'News, roadmap & release history']; } catch (_) { /* ignore */ }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (name) { const r = prev.apply(this, arguments); try { if (name === 'insider') { if (!ui.fresh) ui.fresh = unreadIds(data()); render(); } else if (ui.fresh && $('view-insider') && !$('view-insider').classList.contains('active')) { ui.fresh = null; } } catch (e) { console.error('Rex Insider:', e); } return r; };
  badge();
  window.RexInsider = { render, data, open: tab => { if (tab) ui.tab = tab; ui.q = ''; showView('insider'); }, saved: () => saved.slice() };
})();
