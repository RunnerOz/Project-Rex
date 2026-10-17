/* Project Rex Center 12.7.0 - First-run tour + searchable shortcuts list (free, local).
   Tour: a short spotlight walkthrough (sidebar, Favorites, search, Live Events, manual updates, shortcuts). It starts by itself only
   on a brand-new install (never for someone who already has Rex data), can be skipped with Esc, and can be replayed any time from the
   shortcuts list or the command palette ("Take the tour"). Its only saved data is rex127_tour. It does not start in automated
   browsers (navigator.webdriver) so test tools are never blocked by it.
   Shortcuts: the ? list now has a search box, groups, and also lists every command in the Ctrl/Cmd+K palette. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex127_tour';
  const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  const MOD = mac ? '⌘' : 'Ctrl';
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const read = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} };

  /* ================= shortcuts ================= */
  const SHORT = [
    { g: 'Everywhere', k: [MOD + ' + K'], d: 'Open the command palette: run commands and search your pages, notes, tasks, projects and more' },
    { g: 'Everywhere', k: ['?'], d: 'Show this shortcuts list (when you are not typing in a box)' },
    { g: 'Everywhere', k: ['Esc'], d: 'Close the open dialog, the palette or the tour' },
    { g: 'Command palette', k: ['↑', '↓'], d: 'Move through the results' },
    { g: 'Command palette', k: ['Enter'], d: 'Run the highlighted command, or open the highlighted result' },
    { g: 'Command palette', k: ['Esc'], d: 'Close the palette' },
    { g: 'Pages', k: ['Alt + 1 … 8'], d: 'Open your first eight pinned Favorites (pin a page with its ★ in the sidebar)' },
    { g: 'Capture', k: ['Alt + N'], d: 'Quick note, saved to your Knowledge Base' },
    { g: 'Capture', k: [MOD + ' + Enter'], d: 'Save the note while the Quick note box is open' },
    { g: 'Help', k: [MOD + ' + K', 'then type “tour”'], d: 'Take the tour again' },
    { g: 'Help', k: [MOD + ' + K', 'then type “focus”'], d: 'Start or stop a focus sound' }
  ];
  function cmdRows() { try { return (typeof COMMANDS !== 'undefined' ? COMMANDS : []).map(c => ({ g: 'Palette commands', k: [MOD + ' + K', '“' + c.name + '”'], d: c.name, cmd: true })); } catch (e) { return []; } }
  function renderShort(q) {
    const list = $('scList'); if (!list) return;
    q = (q || '').trim().toLowerCase();
    const all = SHORT.concat(cmdRows()), hit = all.filter(r => !q || (r.g + ' ' + r.d + ' ' + r.k.join(' ')).toLowerCase().indexOf(q) >= 0);
    const groups = []; hit.forEach(r => { let g = groups.find(x => x.g === r.g); if (!g) groups.push(g = { g: r.g, rows: [] }); g.rows.push(r); });
    list.innerHTML = groups.length ? groups.map(g => '<div class="sc-g"><h4>' + E(g.g) + '</h4>' + g.rows.map(r => '<div class="sc-r"><span class="sc-d">' + E(r.d) + '</span><span class="sc-k">' + r.k.map(x => '<kbd>' + E(x) + '</kbd>').join(' ') + '</span></div>').join('') + '</div>').join('') : '<p class="sc-none">No shortcut matches “' + E(q) + '”. Try a different word.</p>';
    const c = $('scCount'); if (c) c.textContent = hit.length + (hit.length === 1 ? ' shortcut' : ' shortcuts');
  }
  function buildShort() {
    const m = $('shortcutsModal'); if (!m || m.dataset.sc) return; m.dataset.sc = '1';
    const box = m.querySelector('.modal'); if (!box) return;
    box.innerHTML = '<div class="modal-h"><h3>⌨️ Keyboard Shortcuts</h3><button class="close" type="button" aria-label="Close" onclick="closeModal(\'shortcutsModal\')">×</button></div>' +
      '<div class="sc-top"><input id="scQ" type="search" placeholder="Search shortcuts and commands…" aria-label="Search shortcuts" autocomplete="off"><span id="scCount" class="sc-count"></span></div>' +
      '<div id="scList" class="sc-list"></div>' +
      '<div class="sc-foot"><button type="button" class="btn btn-sm" id="scTour">🧭 Take the tour</button><span>On a phone, use the ⌘K button or the bottom bar.</span></div>';
    $('scQ').addEventListener('input', e => renderShort(e.target.value));
    $('scTour').addEventListener('click', () => { m.classList.remove('show'); start(); });
  }
  const origOpen = window.openShortcutsModal;
  window.openShortcutsModal = function () { buildShort(); const q = $('scQ'); if (q) q.value = ''; renderShort(''); if (typeof origOpen === 'function') origOpen.apply(this, arguments); else { const m = $('shortcutsModal'); if (m) m.classList.add('show'); } if (q) setTimeout(() => q.focus(), 30); };

  /* ================= tour ================= */
  const STEPS = [
    { t: 'Welcome to Project Rex Center 🦖', x: 'A one-minute tour of the main places. Everything stays in this browser: no account, nothing is uploaded, and it is all free. You can skip any time with Esc.', sel: null },
    { t: 'Your sidebar', x: 'Pages are grouped: create webhook messages, Rex Studio for projects and notes, news and events, tools, and system pages. The arrow beside a group name collapses it, and the small button at the top makes the sidebar compact.', sel: '#rexSidebar' },
    { t: 'Pin your favorites ⭐', x: 'Hover a page and press its ★ to pin it. Pinned pages move to a Favorites group at the top, and Alt + 1 to Alt + 8 open them instantly.', sel: '.nav-groups' },
    { t: 'Search everything', x: 'Press ' + MOD + ' + K (or this button) and start typing. Rex finds pages, projects, tasks, notes, templates, webhook names and Live Events, and also runs commands.', sel: '.topbar [onclick="openPalette()"], .topbar .icon-btn' },
    { t: 'Live Events 🎃', x: 'Seasonal and silly holiday events with hidden collectibles, rewards and Rex skins. They start by themselves from your device’s calendar, and the Holiday Center calendar shows them too.', sel: '.nav-item[data-view="events"]' },
    { t: 'Updates are always your choice', x: 'Rex never updates by itself. Refreshing or reopening it will not install anything. When you want a new version, open Update Center and press Update Now.', sel: '.nav-item[data-act="updates"]' },
    { t: 'Shortcuts and help', x: 'Press ? any time for a searchable list of shortcuts and commands. You can replay this tour from there, or with ' + MOD + ' + K and “tour”. Enjoy!', sel: '.topbar [onclick="openShortcutsModal()"]' }
  ];
  let T = null; // { i, ov, spot, card, onKey, onResize }

  function visible(el) { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; }
  function target(sel) { if (!sel) return null; const els = document.querySelectorAll(sel); for (let i = 0; i < els.length; i++) if (visible(els[i])) return els[i]; return null; }
  function place() {
    if (!T) return; const s = STEPS[T.i], el = target(s.sel), sp = T.spot, card = T.card, vw = innerWidth, vh = innerHeight, pad = 6;
    if (!el) { sp.style.display = 'none'; T.ov.classList.add('tour-dim'); card.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%)'; return; }
    T.ov.classList.remove('tour-dim');
    const r = el.getBoundingClientRect(); sp.style.display = 'block';
    sp.style.left = (r.left - pad) + 'px'; sp.style.top = (r.top - pad) + 'px'; sp.style.width = (r.width + pad * 2) + 'px'; sp.style.height = (r.height + pad * 2) + 'px';
    const cw = Math.min(340, vw - 24); card.style.width = cw + 'px'; card.style.transform = 'none';
    const ch = card.offsetHeight || 190; let left, top;
    if (r.right + 16 + cw <= vw) { left = r.right + 16; top = Math.max(12, Math.min(r.top, vh - ch - 12)); }              // to the right
    else if (r.bottom + 14 + ch <= vh) { left = Math.max(12, Math.min(r.left, vw - cw - 12)); top = r.bottom + 14; }    // below
    else if (r.top - 14 - ch >= 0) { left = Math.max(12, Math.min(r.left, vw - cw - 12)); top = r.top - 14 - ch; }      // above
    else { left = (vw - cw) / 2; top = Math.max(12, (vh - ch) / 2); }
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function show(i) {
    if (!T) return; T.i = i; const s = STEPS[i], last = i === STEPS.length - 1, el = target(s.sel);
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
    T.card.innerHTML = '<div class="tour-step">Step ' + (i + 1) + ' of ' + STEPS.length + '</div><h3 id="tourT">' + E(s.t) + '</h3><p>' + E(s.x) + '</p>' +
      '<div class="tour-dots" aria-hidden="true">' + STEPS.map((_, j) => '<i class="' + (j === i ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<div class="tour-btns"><button type="button" class="btn btn-sm" data-t="skip">' + (last ? 'Close' : 'Skip tour') + '</button><span style="flex:1"></span>' + (i ? '<button type="button" class="btn btn-sm" data-t="back">Back</button>' : '') + '<button type="button" class="btn btn-sm btn-primary" data-t="next">' + (last ? 'Finish' : (i ? 'Next' : 'Start')) + '</button></div>';
    place(); const n = T.card.querySelector('[data-t="next"]'); if (n) n.focus({ preventScroll: true });
  }
  function end(done) { if (!T) return; document.removeEventListener('keydown', T.onKey, true); removeEventListener('resize', T.onResize); removeEventListener('scroll', T.onResize, true); T.ov.remove(); T = null; write({ v: 1, at: Date.now(), done: !!done, skipped: !done }); }
  function start() {
    if (T) return;
    document.querySelectorAll('.modal-bg.show').forEach(m => m.classList.remove('show'));
    try { if ($('palette')) $('palette').classList.remove('show'); } catch (e) {}
    try { if (typeof showView === 'function') showView('home'); } catch (e) {}
    const ov = document.createElement('div'); ov.className = 'tour-ov' + (reduced() ? ' tour-still' : ''); ov.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourT"></div>';
    document.body.appendChild(ov);
    T = { i: 0, ov, spot: ov.querySelector('.tour-spot'), card: ov.querySelector('.tour-card') };
    T.onKey = e => {
      if (!T) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); step(-1); }
      else if (e.key === 'Tab') { const b = [].slice.call(T.card.querySelectorAll('button')); if (!b.length) return; const f = b.indexOf(document.activeElement); e.preventDefault(); b[(f + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus(); }
      else if (e.key.length === 1 || e.key === 'Enter') { if (e.key === 'Enter' && document.activeElement && document.activeElement.closest('.tour-card')) return; e.stopPropagation(); if (e.key !== 'Enter') e.preventDefault(); }
    };
    T.onResize = () => place();
    document.addEventListener('keydown', T.onKey, true); addEventListener('resize', T.onResize); addEventListener('scroll', T.onResize, true);
    ov.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; const a = b.dataset.t; if (a === 'next') step(1); else if (a === 'back') step(-1); else end(false); });
    show(0);
  }
  function step(d) { if (!T) return; const n = T.i + d; if (n >= STEPS.length) { end(true); return; } if (n < 0) return; show(n); }

  /* palette command */
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Take the tour')) COMMANDS.push({ name: 'Take the tour', run: () => start() }, { name: 'Keyboard shortcuts', run: () => window.openShortcutsModal() }); } catch (e) {}

  /* start by itself ONLY on a brand-new install (no Rex data yet and no tour record), and never in automated browsers */
  function maybeAuto() {
    try {
      if (navigator.webdriver) return;
      if (read()) return;
      const fresh = localStorage.getItem('rex110_first_seen') === null && localStorage.getItem('projectRexAppearanceV6') === null;
      if (!fresh) return;
      setTimeout(() => { if (!T && !document.querySelector('.modal-bg.show, .uc-modal-bg')) start(); }, 1600);
    } catch (e) {}
  }
  maybeAuto();
  window.RexTour = { start, end: () => end(false), state: () => (T ? { open: true, step: T.i } : { open: false }), steps: STEPS.length, saved: read };
})();
