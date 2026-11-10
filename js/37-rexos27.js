/* Project Rex Center 12.15.0 - RexOS 27 (free, local). The new look is a design layer (css/rexos27.css) plus this small helper:
   the Launchpad (every page as an app on one screen), the tab bar icons, the RexOS wordmark and the Look switch in Settings -> Appearance.
   It never touches your data. Switching to Classic only removes the html.os27 class.
   Own data: rex1500_look = "os27" (default) or "classic". */
(function () {
  'use strict';
  const K = 'rex1500_look', $ = id => document.getElementById(id), html = document.documentElement;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = () => { try { return localStorage.getItem(K) === 'classic' ? 'classic' : 'os27'; } catch (e) { return 'os27'; } };
  /* ----- looks: RexOS (layout) + optional colour skin. Own data: rex2103_skin = "" (default) or one of the ids below. Classic never uses a skin. ----- */
  const SK = 'rex2103_skin';
  const LOOKS = [
    { id: 'os27', name: null, tag: 'Auto', d: 'Glass, a floating dock and a capsule tab bar. Follows your light or dark setting.', pv: ['#0b0c10', '#1a1c25', '#f5a24b', '#f3f4f7'] },
    { id: 'classic', name: 'Classic', tag: 'Auto', d: 'The earlier layout and colors.', pv: ['#101522', '#1a2133', '#5b9fff', '#e8ecf5'] },
    { id: 'y1900', name: '1900', tag: 'Light', d: 'Parchment paper, ink-brown serif type, double-ruled cards and brass.', pv: ['#e9dcc0', '#f7efd8', '#8b2e1f', '#2b1d10'] },
    { id: 'neon', name: 'Midnight Neon', tag: 'Dark', d: 'Deep violet night with hot pink and electric cyan glow.', pv: ['#07050f', '#1a1038', '#ff2bd6', '#f1eaff'] },
    { id: 'ocean', name: 'Ocean', tag: 'Dark', d: 'Deep sea blues with aqua highlights and calm glass.', pv: ['#061a26', '#0f3447', '#2ed3c6', '#e6f7fb'] },
    { id: 'forest', name: 'Forest', tag: 'Dark', d: 'Mossy greens, warm gold and a quiet woodland feel.', pv: ['#0e1a12', '#1d3626', '#8bd450', '#eef3e4'] },
    { id: 'sakura', name: 'Sakura', tag: 'Light', d: 'Soft blossom pink, big round corners and a gentle mood.', pv: ['#fbe8ee', '#ffffff', '#e5578a', '#3a1e2b'] },
    { id: 'terminal', name: 'Terminal', tag: 'Dark', d: 'Green on black, monospace type and sharp edges.', pv: ['#020b04', '#06240f', '#3dff7a', '#b8ffc9'] }
  ];
  const skinOf = () => { try { const v = localStorage.getItem(SK) || ''; return LOOKS.some(l => l.id === v && v !== 'os27' && v !== 'classic') ? v : ''; } catch (e) { return ''; } };
  const current = () => get() === 'classic' ? 'classic' : (skinOf() || 'os27');
  const nameOf = l => l.name || ('RexOS ' + shownNum());
  const say = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) { /* ignore */ } };
  const I = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const TAB = {
    home: I('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>'),
    builder: I('<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/>'),
    holidays: I('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>'),
    clock: I('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.6 1.6M9.5 3h5"/>'),
    __more: I('<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>')
  };

  /* ----- look: wordmark and tab icons follow the chosen look ----- */
  const shownNum = () => { try { return SHOWN_VERSION[APP_VERSION] || '27'; } catch (e) { return '27'; } };
  function skin() {
    const on = get() === 'os27';
    html.classList.toggle('os27', on);
    const sk = on ? skinOf() : ''; if (sk) html.setAttribute('data-look', sk); else html.removeAttribute('data-look');
    const h = document.querySelector('.sb12 .brand-text h2');
    if (h) { if (!h.dataset.orig) h.dataset.orig = h.innerHTML; h.innerHTML = on ? 'Rex<b>OS</b> ' + shownNum() : h.dataset.orig; }
    document.querySelectorAll('#rexTabbar button').forEach(b => {
      const ti = b.querySelector('.ti'); if (!ti) return; if (!ti.dataset.orig) ti.dataset.orig = ti.innerHTML;
      ti.innerHTML = on && TAB[b.dataset.view] ? TAB[b.dataset.view] : ti.dataset.orig;
    });
    const set = $('osLookCard'); if (set) set.querySelectorAll('[data-look]').forEach(b => { const o = b.dataset.look === current(); b.classList.toggle('on', o); b.setAttribute('aria-pressed', o ? 'true' : 'false'); });
  }
  function setLook(v) {
    const l = LOOKS.find(x => x.id === v) || LOOKS[0];
    try { localStorage.setItem(K, l.id === 'classic' ? 'classic' : 'os27'); localStorage.setItem(SK, (l.id === 'os27' || l.id === 'classic') ? '' : l.id); } catch (e) { /* ignore */ }
    skin(); say(l.id === 'classic' ? 'Classic look is on.' : nameOf(l) + ' is on.');
  }

  /* ----- Launchpad ----- */
  let ov = null, opener = null;
  function apps() {
    const out = [];
    document.querySelectorAll('.sb12 .nav-group').forEach(g => g.querySelectorAll('.nav-item').forEach(b => {
      const label = (b.dataset.lp || (b.querySelector('.nv-t') || {}).textContent || b.getAttribute('title') || '').trim(), ico = b.querySelector('.nav-ico svg');
      if (!label || !ico) return; out.push({ label, g: g.dataset.g || 'system', svg: ico.outerHTML, btn: b });
    }));
    return out;
  }
  const GROUPS = { overview: ['Overview', 'Home and your numbers'], create: ['Create', 'Write and send messages'], studio: ['Rex Studio', 'Projects, notes and tools'], seasons: ['Seasons and Quests', 'Events, holidays and rewards'], monitor: ['Monitor', 'Health, backups and safety'], system: ['System', 'Settings and help'] };
  const RK = 'rex2100_lp_recent';
  const recent = () => { try { const a = JSON.parse(localStorage.getItem(RK) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 8) : []; } catch (e) { return []; } };
  function noteRecent(label) { try { const a = recent().filter(x => x !== label); a.unshift(label); localStorage.setItem(RK, JSON.stringify(a.slice(0, 8))); } catch (e) { /* ignore */ } }
  const hi = (label, q) => { const i = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1; return i < 0 ? E(label) : E(label.slice(0, i)) + '<mark>' + E(label.slice(i, i + q.length)) + '</mark>' + E(label.slice(i + q.length)); };
  function paint(q) {
    const grid = ov.querySelector('.lp-grid'), all = apps(), list = all.filter(a => !q || a.label.toLowerCase().indexOf(q.toLowerCase()) >= 0);
    grid.innerHTML = '';
    const tile = a => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lp-app'; b.innerHTML = '<span class="lp-tile lp-g-' + E(a.g) + '">' + a.svg + '</span><span class="lp-n">' + hi(a.label, q) + '</span>'; b.onclick = () => { noteRecent(a.label); close(true); a.btn.click(); }; return b; };
    const section = (title, sub, items, cls) => { if (!items.length) return; const sec = document.createElement('section'); sec.className = 'lp-sec' + (cls ? ' ' + cls : ''); sec.innerHTML = '<h3>' + E(title) + (sub ? '<small>' + E(sub) + '</small>' : '') + '</h3><div class="lp-row"></div>'; const row = sec.lastChild; items.forEach(a => row.appendChild(tile(a))); grid.appendChild(sec); };
    if (!q) { const r = recent().map(l => all.find(a => a.label === l)).filter(Boolean); section('Recent', 'Where you were last', r, 'lp-recent'); }
    Object.keys(GROUPS).forEach(g => section(GROUPS[g][0], q ? '' : GROUPS[g][1], list.filter(a => a.g === g)));
    section('Other', '', list.filter(a => !GROUPS[a.g]));
    const n = ov.querySelector('.lp-count'); if (n) n.textContent = q ? list.length + ' of ' + all.length + ' pages' : all.length + ' pages';
    ov.querySelector('.lp-empty').hidden = list.length > 0;
  }
  function moveFocus(dir) {
    const t = Array.from(ov.querySelectorAll('.lp-app')); if (!t.length) return; const cur = t.indexOf(document.activeElement);
    if (cur < 0) { t[dir > 0 ? 0 : t.length - 1].focus(); return; }
    let nx = cur;
    if (dir === 1 || dir === -1) nx = cur + dir;
    else { const r = t[cur].getBoundingClientRect(); const cand = t.filter(b => { const q = b.getBoundingClientRect(); return dir > 0 ? q.top > r.bottom - 4 : q.bottom < r.top + 4; }); if (cand.length) { nx = t.indexOf(cand.sort((x, y) => { const a = x.getBoundingClientRect(), b2 = y.getBoundingClientRect(); return (Math.abs(a.left - r.left) + Math.abs(a.top - r.top) * 3) - (Math.abs(b2.left - r.left) + Math.abs(b2.top - r.top) * 3); })[0]); } }
    if (nx < 0) { $('lpSearch').focus(); return; } if (t[nx]) t[nx].focus();
  }
  function build() {
    if (ov) return; ov = document.createElement('div'); ov.className = 'lp-ov'; ov.id = 'rexLaunchpad'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Launchpad');
    ov.innerHTML = '<div class="lp-top"><input type="search" id="lpSearch" placeholder="Search pages" aria-label="Search pages" autocomplete="off"><button type="button" id="lpClose" aria-label="Close Launchpad">✕</button></div><p class="lp-count" aria-live="polite"></p><div class="lp-grid"></div><p class="lp-empty" hidden>No page matches that. Try another word.</p>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) close(); }); $('lpClose').onclick = () => close();
    $('lpSearch').addEventListener('input', e => paint(e.target.value));
    $('lpSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = ov.querySelector('.lp-sec:not(.lp-recent) .lp-app') || ov.querySelector('.lp-app'); if (f) f.click(); } else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); } });
    ov.querySelector('.lp-grid').addEventListener('keydown', e => { const k = e.key; if (k === 'ArrowRight') { e.preventDefault(); moveFocus(1); } else if (k === 'ArrowLeft') { e.preventDefault(); moveFocus(-1); } else if (k === 'ArrowDown') { e.preventDefault(); moveFocus(2); } else if (k === 'ArrowUp') { e.preventDefault(); moveFocus(-2); } });
  }
  function open() { build(); opener = document.activeElement; $('lpSearch').value = ''; paint(''); ov.classList.add('show'); setTimeout(() => { try { $('lpSearch').focus(); } catch (e) { /* ignore */ } }, 30); }
  function close(skipFocus) { if (!ov || !ov.classList.contains('show')) return; ov.classList.remove('show'); if (!skipFocus && opener && opener.focus) { try { opener.focus(); } catch (e) { /* ignore */ } } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov && ov.classList.contains('show')) { e.preventDefault(); e.stopPropagation(); close(); } }, true);

  /* ----- pieces added to the page ----- */
  function addButton() {
    const bar = document.querySelector('.top-actions'); if (!bar || $('rexAppsBtn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.id = 'rexAppsBtn'; b.title = 'Launchpad: every page'; b.setAttribute('aria-label', 'Open Launchpad');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>';
    b.onclick = open; bar.insertBefore(b, bar.firstChild);
  }
  function addLookCard() {
    const pane = $('ap-appearance'); if (!pane || $('osLookCard')) return;
    const c = document.createElement('div'); c.className = 'card os-look-card'; c.id = 'osLookCard';
    const card = l => '<button type="button" class="os-opt" data-look="' + l.id + '" aria-pressed="false"><span class="lk-pv" aria-hidden="true" style="--pb:' + l.pv[0] + ';--pc:' + l.pv[1] + ';--pa:' + l.pv[2] + ';--pt:' + l.pv[3] + '"><i class="lk-top"></i><i class="lk-card"></i><i class="lk-line"></i><i class="lk-pill"></i><i class="lk-dock"></i></span><span class="lk-meta"><b>' + E(nameOf(l)) + '</b><em class="lk-tag">' + l.tag + '</em></span><small>' + E(l.d) + '</small><span class="lk-check" aria-hidden="true">✓</span></button>';
    c.innerHTML = '<div class="card-title"><h3>Look</h3></div><p class="ar-hint">Pick how Rex looks. Every look shows the same pages and keeps all your data. The six themed looks bring their own colors, so the Light/Dark switch below only changes RexOS 28 and Classic. A custom accent color from Theme Studio still wins over a look\'s own accent.</p><div class="os-look" role="group" aria-label="Looks">' + LOOKS.map(card).join('') + '</div>';
    pane.insertBefore(c, pane.firstChild);
    c.addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) setLook(b.dataset.look); });
    skin();
  }
  try { if (typeof COMMANDS !== 'undefined') { if (!COMMANDS.some(c => c.name === 'Open Launchpad')) COMMANDS.push({ name: 'Open Launchpad', run: open }); if (!COMMANDS.some(c => c.name === 'Look: Classic')) LOOKS.forEach(l => COMMANDS.push({ name: 'Look: ' + (l.id === 'os27' ? 'RexOS 27' : nameOf(l)), run: () => setLook(l.id) })); } } catch (e) { /* ignore */ }
  const prev = window.showView; if (typeof prev === 'function') window.showView = function () { const r = prev.apply(this, arguments); try { addLookCard(); } catch (e) { /* ignore */ } return r; };
  /* a custom accent picked in Theme Studio still wins; the default blue is replaced by RexOS amber */
  function accent() {
    try { const a = typeof rexAp !== 'undefined' ? rexAp : null, custom = a && a.accent && a.accent.toLowerCase() !== '#5b9fff';
      if (custom) { html.style.setProperty('--os-accent', a.accent); html.style.setProperty('--os-accent-2', a.accent2 || a.accent); } else { html.style.removeProperty('--os-accent'); html.style.removeProperty('--os-accent-2'); } } catch (e) { /* ignore */ }
  }
  const prevAp = window.applyAppearance; if (typeof prevAp === 'function') window.applyAppearance = function () { const r = prevAp.apply(this, arguments); accent(); return r; };
  addButton(); addLookCard(); skin(); accent();
  window.RexOS = { look: get, skin: current, looks: () => LOOKS.map(l => l.id), setLook, openLaunchpad: open, closeLaunchpad: close, apps };
})();
