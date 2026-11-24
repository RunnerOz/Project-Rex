/* Project Rex Center 14.0.0 - Find anything + your own phone bar.
   1. "Everything" page: one searchable list of every page and tool (including the ones tucked inside other pages), with Favorites and bottom-bar pins.
   2. The sidebar now shows every page by default (switch back to the compact grouped sidebar any time on the Everything page).
   3. The phone bottom bar is yours: pick up to 4 tabs and their order. "More" always stays last.
   Free and local. Writes only: rex1400_tabbar (your tabs), rex1400_recent (last pages you opened), rex1400_compact (sidebar style), rex1400_tblabels. Never touches app data. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const say = (m, t) => { try { toast(m, t || 'info'); } catch (e) { /* ignore */ } };
  const KT = 'rex1400_tabbar', KR = 'rex1400_recent', KC = 'rex1400_compact', KL = 'rex1400_tblabels';
  const DEF_TABS = ['home', 'builder', 'holidays', 'clock'], MAXT = 4, MINT = 2;
  const side = $('rexSidebar'), tabbar = $('rexTabbar'); if (!side || !tabbar) return;

  /* ---------- the catalog: built from the real sidebar, so nothing can be missing ---------- */
  const EXTRA = { // short words people may type for a page
    builder: 'send message discord compose embed', templates: 'saved library', drafts: 'unsent saved', history: 'sent log past', schedule: 'later timer cron', worldclock: 'time zone clocks',
    studio: 'projects ideas', 'project-notebook': 'notes journal log', knowledge: 'wiki notes search', automation: 'workflows rules', tasks: 'todo to-do list', arcade: 'games play fun', room: 'pet decorate', pals: 'friends buddies',
    story: 'adventure chapters', focusrooms: 'pomodoro focus timer study', reminders: 'alarm alerts', journal: 'diary write', garden: 'habits streak plants', quests: 'seasons missions', insider: 'news tips', events: 'live event rewards',
    holidays: 'seasons countdown greetings', analytics: 'stats charts numbers', weather: 'forecast', notifications: 'alerts inbox', testing: 'beta testers', timeline: 'activity log', clock: 'dev time tracker pomodoro',
    rollback: 'backup restore recover undo', monitor: 'performance system', datahealth: 'repair storage damage scan health', changelog: 'whats new updates log', achievements: 'badges trophies', profile: 'me account name', plugins: 'addons extensions', settings: 'options preferences theme dark'
  };
  let CAT = null;
  function groupName(btn) { const g = btn.closest('.nav-group'); const h = g && g.querySelector('.nav-group-h span'); return h ? h.textContent.trim() : 'Pages'; }
  function build() {
    const list = [], seen = new Set();
    side.querySelectorAll('.nav-item').forEach(b => {
      const lab = (b.querySelector('.nv-t') || b).textContent.trim(), ico = (b.querySelector('.nav-ico') || {}).innerHTML || '';
      if (b.dataset.view) {
        const v = b.dataset.view; if (seen.has(v) || b.hasAttribute('data-fav')) return; seen.add(v);
        const name = b.dataset.lp || (typeof views === 'object' && views[v] ? views[v][0] : lab), desc = typeof views === 'object' && views[v] ? views[v][1] : '';
        list.push({ id: v, label: name, short: (typeof views === 'object' && views[v] ? lab : name), desc, group: groupName(b), ico, run: () => showView(v), key: (name + ' ' + lab + ' ' + desc + ' ' + (EXTRA[v] || '')).toLowerCase() });
      } else if (b.dataset.act) {
        const a = b.dataset.act; if (seen.has('act:' + a)) return; seen.add('act:' + a);
        list.push({ id: 'act:' + a, label: lab, short: { cutscene: 'Cutscene', linkphone: 'Link phone', updates: 'Updates' }[a] || lab, desc: { cutscene: 'Make your own cutscene movie', linkphone: 'Move your stuff to your phone with a scan', updates: 'Check for and install updates' }[a] || '', group: groupName(b), ico, run: () => b.click(), key: (lab + ' ' + a + ' cutscene movie video trailer link phone transfer scan qr update upgrade').toLowerCase() });
      }
    });
    /* tools that live inside other pages: now one tap away */
    const sets = [['appearance', 'Appearance & themes', 'Colors, dark mode, looks'], ['general', 'General settings', 'Confirmations, language, behavior'], ['alerts', 'Alert settings', 'Reminders and notifications'], ['weather', 'Weather settings', 'Units and location'], ['data', 'Data & backups', 'Backup, restore points, export, import, reset'], ['app', 'App & updates', 'Updates, install as an app, about']];
    sets.forEach(s => list.push({ id: 'set:' + s[0], label: s[1], short: 'Settings', desc: s[2], group: 'Settings', ico: (list.find(x => x.id === 'settings') || {}).ico || '', run: () => { showView('settings'); try { RexV111.settingsTab(s[0]); } catch (e) { /* ignore */ } }, key: (s[1] + ' ' + s[2] + ' settings').toLowerCase() }));
    const tools = [['New message', 'Open the webhook builder', 'builder', 'new message send write', () => showView('builder')], ['Add a webhook', 'Save a Discord webhook', 'builder', 'add webhook url connect', () => { if (typeof openWebhookModal === 'function') openWebhookModal(); }], ['Quick note', 'Jot something down (Alt+N)', 'studio', 'note capture jot', () => { if (window.RexQuick) RexQuick.open(); }], ['Search everything', 'Search your notes, projects, tasks and more (Ctrl+K)', 'home', 'find palette command', () => { if (typeof openPalette === 'function') openPalette(); }], ['Download a backup file', 'Save all your data as a file', 'rollback', 'export save download', () => { if (window.RexV101 && RexV101.exportBackup) RexV101.exportBackup(); }]];
    tools.forEach(t => list.push({ id: 'tool:' + t[0], label: t[0], short: t[0], desc: t[1], group: 'Quick actions', ico: (list.find(x => x.id === t[2]) || {}).ico || '', run: t[4], key: (t[0] + ' ' + t[1] + ' ' + t[3]).toLowerCase() }));
    return list;
  }
  const cat = () => CAT || (CAT = build());
  const byId = id => cat().find(x => x.id === id);
  const pinnable = x => !x.id.startsWith('tool:') && !x.id.startsWith('set:');

  /* ---------- recent pages ---------- */
  function noteRecent(v) { if (!v || v === 'everything') return; const l = rd(KR, []); const a = (Array.isArray(l) ? l : []).filter(x => x !== v); a.unshift(v); wr(KR, a.slice(0, 8)); }

  /* ---------- the Everything page ---------- */
  let view = $('view-everything'), q = '', grp = 'all';
  if (!view) { const m = document.querySelector('main.main'); if (m) { view = document.createElement('section'); view.className = 'view'; view.id = 'view-everything'; view.setAttribute('aria-label', 'Everything'); const last = m.querySelector('.view:last-of-type'); (last ? last.insertAdjacentElement('afterend', view) : m.appendChild(view)); } }
  const favHas = v => { try { return window.RexFav && RexFav.list().indexOf(v) >= 0; } catch (e) { return false; } };
  const barHas = v => tabs().indexOf(v) >= 0;
  function match(x) { if (grp !== 'all' && x.group !== grp) return false; if (!q) return true; return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => x.key.indexOf(w) >= 0); }
  function card(x) {
    const f = pinnable(x) && x.id.indexOf(':') < 0 && x.id !== 'everything', fav = f && favHas(x.id), bar = f && barHas(x.id);
    return '<div class="ev-card"><button type="button" class="ev-open" data-ev="' + E(x.id) + '"><span class="ev-ico" aria-hidden="true">' + x.ico + '</span><span class="ev-t"><b>' + E(x.label) + '</b><small>' + E(x.desc || x.group) + '</small></span></button>' +
      (f ? '<span class="ev-pins"><button type="button" class="ev-pin' + (fav ? ' on' : '') + '" data-evfav="' + E(x.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove ' : 'Add ') + E(x.label) + (fav ? ' from Favorites' : ' to Favorites') + '" title="Favorites (top of the sidebar)">★</button><button type="button" class="ev-pin ev-barpin' + (bar ? ' on' : '') + '" data-evbar="' + E(x.id) + '" aria-pressed="' + bar + '" aria-label="' + (bar ? 'Remove ' : 'Add ') + E(x.label) + (bar ? ' from the phone bar' : ' to the phone bar') + '" title="Phone bottom bar">▭</button></span>' : '') + '</div>';
  }
  function paint(keepFocus) {
    if (!view) return; const all = cat(), groups = ['all'].concat(all.map(x => x.group).filter((g, i, a) => a.indexOf(g) === i)), shown = all.filter(match), rec = rd(KR, []).map(byId).filter(Boolean).slice(0, 6), compact = !!rd(KC, false);
    const body = !shown.length ? '<p class="ev-none">Nothing matches “' + E(q) + '”. Try a shorter word, or press <kbd>Ctrl</kbd>+<kbd>K</kbd> to also search your notes, projects and tasks.</p>' :
      (q || grp !== 'all' ? '<div class="ev-grid">' + shown.map(card).join('') + '</div>' : groups.slice(1).map(g => { const l = shown.filter(x => x.group === g); return l.length ? '<h4 class="ev-h">' + E(g) + ' <small>' + l.length + '</small></h4><div class="ev-grid">' + l.map(card).join('') + '</div>' : ''; }).join(''));
    view.innerHTML = '<div class="card ev"><div class="card-title"><h3>🔎 Find anything</h3><span class="r11-pill good">' + all.length + ' places</span></div>' +
      '<label class="ev-search"><span class="sr-only">Search pages and tools</span><input id="evQ" type="search" placeholder="Type what you are looking for… (try: backup, timer, weather, notes)" value="' + E(q) + '" autocomplete="off" spellcheck="false" aria-label="Search pages and tools"></label>' +
      '<div class="ev-chips" role="group" aria-label="Filter by group">' + groups.map(g => '<button type="button" class="ev-chip' + (grp === g ? ' on' : '') + '" data-evg="' + E(g) + '" aria-pressed="' + (grp === g) + '">' + (g === 'all' ? 'All' : E(g)) + '</button>').join('') + '</div>' +
      (!q && grp === 'all' && rec.length ? '<h4 class="ev-h">Recently opened</h4><div class="ev-recent">' + rec.map(x => '<button type="button" class="ev-rc" data-ev="' + E(x.id) + '"><span aria-hidden="true">' + x.ico + '</span>' + E(x.label) + '</button>').join('') + '</div>' : '') +
      body +
      '<div class="ev-foot"><p class="r11-muted">★ puts a page at the top of your sidebar. ▭ puts it on your phone’s bottom bar.</p><div class="r11-actions"><button type="button" class="sbtn" data-evx="bar">📱 Customize phone bar</button><button type="button" class="sbtn" data-evx="compact" aria-pressed="' + compact + '">' + (compact ? '☰ Show every page in the sidebar' : '🗂 Use the compact sidebar') + '</button></div></div></div>';
    const inp = $('evQ'); if (inp && keepFocus) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* ignore */ } }
  }
  function openCard(id) { const x = byId(id); if (!x) return; try { x.run(); } catch (e) { console.error('Everything', e); } }
  if (view) {
    view.addEventListener('input', e => { if (e.target.id === 'evQ') { q = e.target.value.trim(); paint(true); } });
    view.addEventListener('keydown', e => { if (e.target.id === 'evQ' && e.key === 'Enter') { const f = cat().filter(match)[0]; if (f) openCard(f.id); } if (e.target.id === 'evQ' && e.key === 'Escape' && q) { q = ''; paint(true); } });
    view.addEventListener('click', e => {
      const t = e.target, o = t.closest('[data-ev]'); if (o) { openCard(o.dataset.ev); return; }
      const g = t.closest('[data-evg]'); if (g) { grp = g.dataset.evg; paint(); return; }
      const f = t.closest('[data-evfav]'); if (f) { if (window.RexFav) RexFav.toggle(f.dataset.evfav); paint(); return; }
      const b = t.closest('[data-evbar]'); if (b) { toggleTab(b.dataset.evbar); paint(); return; }
      const x = t.closest('[data-evx]'); if (x) { if (x.dataset.evx === 'bar') openSheet(); else { wr(KC, !rd(KC, false)); applySidebar(); paint(); say(rd(KC, false) ? 'Compact sidebar on' : 'Every page is now in the sidebar', 'success'); } }
    });
  }

  /* ---------- sidebar: show every page (or the compact grouped one) ---------- */
  const hubLead = {}; side.querySelectorAll('.nav-item[data-lp]').forEach(b => { const t = b.querySelector('.nv-t'); hubLead[b.dataset.view] = { el: t, compact: t ? t.textContent : '', full: b.dataset.lp }; });
  function applySidebar() {
    const compact = !!rd(KC, false);
    side.querySelectorAll('.nav-item.hub-hide, .nav-item[data-hubshown]').forEach(b => { if (compact) { b.classList.add('hub-hide'); b.removeAttribute('data-hubshown'); } else { b.classList.remove('hub-hide'); b.setAttribute('data-hubshown', '1'); } });
    Object.keys(hubLead).forEach(v => { const h = hubLead[v]; if (h.el) h.el.textContent = compact ? h.compact : h.full; });
    CAT = null;
  }

  /* ---------- the "Find anything" button on top of the sidebar ---------- */
  (function () {
    const ws = side.querySelector('.ws-switch'); if (!ws || $('findBtn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'findBtn'; b.className = 'find-btn'; b.setAttribute('aria-label', 'Find anything'); b.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Find anything</span><kbd>/</kbd>';
    ws.insertAdjacentElement('beforebegin', b); b.addEventListener('click', () => { go(true); });
  })();
  /* a nav item too, so it also appears in lists and on phones */
  (function () {
    const g = side.querySelector('.nav-group[data-g="overview"] .nav-group-b'); if (!g || g.querySelector('[data-view="everything"]')) return;
    const b = document.createElement('button'); b.className = 'nav-item'; b.type = 'button'; b.dataset.view = 'everything'; b.title = 'Everything'; b.innerHTML = '<span class="nav-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 13.5v7M13.5 17h7"/></svg></span><span class="nv-t">All Features</span>';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); window.__rexEvGo && window.__rexEvGo(); });
    g.appendChild(b);
  })();
  try { if (typeof views === 'object') views.everything = ['All Features', 'Find any page or tool fast']; } catch (e) { /* ignore */ }
  function go(focus) { showView('everything'); q = ''; grp = 'all'; paint(); const i = $('evQ'); if (i && focus) setTimeout(() => i.focus(), 60); try { if (typeof RexV111 === 'object') RexV111.closeDrawer(); } catch (e) { /* ignore */ } }
  window.__rexEvGo = () => go(false);
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (document.querySelector('.modal-bg.open, .modal-bg.show, .lk-ov, .cm-ov, .palette.show')) return; e.preventDefault(); go(true);
  });

  /* ---------- the phone bottom bar ---------- */
  const tabs = () => { const a = rd(KT, null); if (!Array.isArray(a)) return DEF_TABS.slice(); const ok = a.filter((x, i) => typeof x === 'string' && a.indexOf(x) === i && byId(x) && x !== 'everything_').slice(0, MAXT); return ok.length >= MINT ? ok : DEF_TABS.slice(); };
  const saveTabs = a => wr(KT, a.slice(0, MAXT));
  const labels = () => rd(KL, true) !== false;
  function renderBar() {
    const t = tabs(), lab = labels();
    tabbar.classList.toggle('tb-nolabels', !lab); tabbar.style.setProperty('--tbn', String(t.length + 1));
    tabbar.innerHTML = t.map(id => { const x = byId(id); if (!x) return ''; const sh = id === 'everything' ? 'Features' : x.short, nm = sh.length > 11 ? sh.slice(0, 11) : sh; return '<button type="button" data-tb="' + E(id) + '"' + (id.startsWith('act:') ? '' : ' data-view="' + E(id) + '"') + ' aria-label="' + E(x.label) + '"><span class="ti" aria-hidden="true">' + x.ico + '</span><span class="tl">' + E(nm) + '</span></button>'; }).join('') +
      '<button type="button" data-view="__more" data-tb="__more" aria-label="More"><span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg></span><span class="tl">More</span></button>';
    sync();
  }
  function sync() { const a = document.querySelector('.view.active'), v = a ? a.id.replace('view-', '') : ''; let hit = false; tabbar.querySelectorAll('button[data-tb]').forEach(b => { const on = b.dataset.tb === v; if (on) hit = true; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); const more = tabbar.querySelector('[data-tb="__more"]'); if (more) more.classList.toggle('active', !hit); }
  function toggleTab(id) { const t = tabs(), i = t.indexOf(id); if (i >= 0) { if (t.length <= MINT) { say('Keep at least ' + MINT + ' tabs on the bar.', 'info'); return false; } t.splice(i, 1); } else { if (t.length >= MAXT) { say('The bar holds ' + MAXT + ' tabs. Remove one first.', 'info'); return false; } t.push(id); } saveTabs(t); renderBar(); return true; }
  tabbar.addEventListener('click', e => {
    const b = e.target.closest('button[data-tb]'); if (!b) return; e.preventDefault(); e.stopImmediatePropagation();
    if (pressed) { pressed = false; return; } const id = b.dataset.tb;
    if (id === '__more') { try { RexV111.openDrawer(); } catch (er) { /* ignore */ } return; }
    const x = byId(id); if (x) { try { RexV111.closeDrawer(); } catch (er) { /* ignore */ } x.run(); }
  }, true);
  /* press and hold any tab to customize */
  let pt = 0, pressed = false;
  tabbar.addEventListener('pointerdown', e => { if (!e.target.closest('button')) return; clearTimeout(pt); pt = setTimeout(() => { pressed = true; document.addEventListener('pointerup', () => setTimeout(() => { pressed = false; }, 80), { once: true, capture: true }); document.addEventListener('pointercancel', () => { pressed = false; }, { once: true, capture: true }); try { navigator.vibrate && navigator.vibrate(15); } catch (er) { /* ignore */ } openSheet(); }, 650); });
  ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(ev => tabbar.addEventListener(ev, () => clearTimeout(pt)));
  tabbar.addEventListener('contextmenu', e => { if (e.target.closest('button')) { e.preventDefault(); } });

  /* ---------- customize sheet ---------- */
  let sh = null, sq = '';
  function openSheet() { if (sh) return; sh = document.createElement('div'); sh.className = 'tb-ov'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Customize the bottom bar'); document.body.appendChild(sh); document.body.classList.add('tb-open'); try { RexV111.closeDrawer(); } catch (e) { /* ignore */ } paintSheet(); sh.addEventListener('click', sheetClick); sh.addEventListener('input', e => { if (e.target.id === 'tbQ') { sq = e.target.value.trim().toLowerCase(); paintSheet(true); } }); document.addEventListener('keydown', escSheet, true); }
  function closeSheet() { if (!sh) return; sh.remove(); sh = null; sq = ''; document.body.classList.remove('tb-open'); document.removeEventListener('keydown', escSheet, true); }
  function escSheet(e) { if (e.key === 'Escape' && sh) { e.preventDefault(); e.stopPropagation(); closeSheet(); } }
  function paintSheet(keep) {
    if (!sh) return; const t = tabs(), full = t.length >= MAXT, avail = cat().filter(x => x.id.indexOf(':') < 0 || x.id.startsWith('act:')).filter(x => t.indexOf(x.id) < 0).filter(x => !sq || x.key.indexOf(sq) >= 0);
    sh.innerHTML = '<div class="tb-sheet"><div class="tb-h"><h3>📱 Your bottom bar</h3><button type="button" class="tb-x" data-tb2="done" aria-label="Done">Done</button></div>' +
      '<p class="tb-sub">Pick up to ' + MAXT + ' tabs. “More” always stays last. This is saved on this device only.</p>' +
      '<div class="tb-prev" aria-label="Preview of your bar">' + t.map(id => { const x = byId(id); return '<span class="tb-pv"><span class="ti">' + x.ico + '</span><i>' + E(x.short.slice(0, 11)) + '</i></span>'; }).join('') + '<span class="tb-pv"><span class="ti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg></span><i>More</i></span></div>' +
      '<ul class="tb-slots">' + t.map((id, i) => { const x = byId(id); return '<li><span class="tb-sico" aria-hidden="true">' + x.ico + '</span><b>' + E(x.label) + '</b><span class="tb-mv"><button type="button" data-tb2="up" data-i="' + i + '" aria-label="Move ' + E(x.label) + ' left"' + (i === 0 ? ' disabled' : '') + '>◀</button><button type="button" data-tb2="down" data-i="' + i + '" aria-label="Move ' + E(x.label) + ' right"' + (i === t.length - 1 ? ' disabled' : '') + '>▶</button><button type="button" data-tb2="rm" data-i="' + i + '" aria-label="Remove ' + E(x.label) + '"' + (t.length <= MINT ? ' disabled' : '') + '>✕</button></span></li>'; }).join('') + '</ul>' +
      '<label class="tb-lab"><input type="checkbox" data-tb2="labels"' + (labels() ? ' checked' : '') + '> Show names under the icons</label>' +
      '<h4>Add a tab' + (full ? ' <small>(bar is full, remove one first)</small>' : '') + '</h4><input id="tbQ" type="search" class="tb-q" placeholder="Search pages…" value="' + E(sq) + '" aria-label="Search pages to add" autocomplete="off">' +
      '<div class="tb-list">' + (avail.length ? avail.map(x => '<button type="button" data-tb2="add" data-id="' + E(x.id) + '"' + (full ? ' disabled' : '') + '><span class="tb-sico" aria-hidden="true">' + x.ico + '</span><span><b>' + E(x.label) + '</b><small>' + E(x.desc || x.group) + '</small></span><em>+</em></button>').join('') : '<p class="tb-none">Nothing matches.</p>') + '</div>' +
      '<div class="tb-foot"><button type="button" class="btn" data-tb2="reset">↺ Reset to default</button><button type="button" class="btn btn-primary" data-tb2="done">Done</button></div></div>';
    if (keep) { const i = $('tbQ'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* ignore */ } } }
  }
  function sheetClick(e) {
    if (e.target === sh) { closeSheet(); return; } const b = e.target.closest('[data-tb2]'); if (!b) return; const a = b.dataset.tb2, t = tabs(), i = +b.dataset.i;
    if (a === 'done') closeSheet();
    else if (a === 'up' && i > 0) { t.splice(i - 1, 0, t.splice(i, 1)[0]); saveTabs(t); renderBar(); paintSheet(); }
    else if (a === 'down' && i < t.length - 1) { t.splice(i + 1, 0, t.splice(i, 1)[0]); saveTabs(t); renderBar(); paintSheet(); }
    else if (a === 'rm') { if (t.length > MINT) { t.splice(i, 1); saveTabs(t); renderBar(); paintSheet(); } }
    else if (a === 'add') { if (t.length < MAXT && t.indexOf(b.dataset.id) < 0) { t.push(b.dataset.id); saveTabs(t); renderBar(); paintSheet(); } }
    else if (a === 'labels') { wr(KL, b.checked); renderBar(); }
    else if (a === 'reset') { try { localStorage.removeItem(KT); localStorage.removeItem(KL); } catch (er) { /* ignore */ } renderBar(); paintSheet(); say('Bar reset to the default', 'success'); }
  }
  /* a Customize button inside the phone drawer */
  (function () { const nav = side.querySelector('.nav-groups'); if (!nav || $('tbCustomBtn')) return; const b = document.createElement('button'); b.type = 'button'; b.id = 'tbCustomBtn'; b.className = 'tb-custom'; b.innerHTML = '📱 Customize bottom bar'; b.addEventListener('click', openSheet); nav.insertAdjacentElement('afterend', b); })();

  /* ---------- wire up ---------- */
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { noteRecent(n); if (n === 'everything') { paint(); } sync(); } catch (e) { console.error('Navigator', e); } return r; };
  try { if (typeof COMMANDS !== 'undefined') { ['Find anything', 'Customize phone bottom bar'].forEach(n => { if (!COMMANDS.some(c => c.name === n)) COMMANDS.push({ name: n, run: () => (n === 'Find anything' ? go(true) : openSheet()) }); }); } } catch (e) { /* ignore */ }
  if (rd(KC, null) === null) wr(KC, false);
  applySidebar(); renderBar();
  window.RexNav = { quick: () => { const out = [], seen = {}, add = id => { const x = byId(id); if (!x || seen[id] || id === 'home' || id === 'everything') return; seen[id] = 1; out.push({ id, label: x.label, short: x.short, ico: x.ico, fav: favHas(id), run: x.run }); }; try { (window.RexFav ? RexFav.list() : []).forEach(add); } catch (e) { /* ignore */ } rd(KR, []).forEach(add); return out.slice(0, 8); }, catalog: () => cat().map(x => ({ id: x.id, label: x.label, group: x.group })), tabs, setTabs: a => { saveTabs(a); renderBar(); }, openSheet, closeSheet, sync, find: go, compact: v => { wr(KC, !!v); applySidebar(); } };
})();
