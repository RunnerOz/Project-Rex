/* Project Rex Center V13.13.0 · Keepsake Collection.
   One page that shows every keepsake from Season One, Two and Three: the ones you found, and silhouettes for the ones still waiting.
   It only reads the Story Mode data that is already on this device. Nothing is written, nothing is sent anywhere. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let filter = 'all', prevFocus = null;

  /* Build the list of seasons with 12 slots each. Never throws: a broken season is just empty. */
  function seasons() {
    const out = [];
    try {
      const P = window.RexStory.places, SC = window.RexStoryPlus.scenes, ch = window.RexStoryPlus.state().choices || {};
      out.push({ n: 1, name: 'Rex\'s Adventure', open: true, slots: P.map(p => { const c = ch[p.id], sc = SC[p.id], it = c && sc && sc[c] ? sc[c].i : null; return { id: p.id, place: p.n, at: p.h, e: p.e, found: !!it, icon: it && it[0], name: it && it[1], pick: it && sc[c].l }; }) });
    } catch (e) { /* ignore */ }
    [[2, window.RexSeason2, 'The Frostline', 'Season One'], [3, window.RexSeason3, 'The Starfall Isles', 'Season Two']].forEach(a => {
      try {
        const A = a[1], ch = A.state().choices || {}, un = A.unlocked();
        out.push({ n: a[0], name: a[2], open: un, need: a[3], slots: A.places.map(p => { const c = ch[p.id], sc = A.scenes[p.id], it = c && sc && sc[c] ? sc[c].i : null; return { id: p.id, place: p.n, at: p.h, e: p.e, found: !!it, icon: it && it[0], name: it && it[1], pick: it && sc[c].l }; }) });
      } catch (e) { /* ignore */ }
    });
    return out;
  }
  const totals = S => { let f = 0, t = 0; S.forEach(s => s.slots.forEach(x => { t++; if (x.found) f++; })); return { f, t }; };

  function html() {
    const S = seasons(), T = totals(S), pct = T.t ? Math.round(T.f / T.t * 100) : 0;
    const chip = (k, l) => '<button type="button" class="kp-chip' + (filter === k ? ' on' : '') + '" data-kp-f="' + k + '" aria-pressed="' + (filter === k) + '">' + l + '</button>';
    const sec = s => {
      const got = s.slots.filter(x => x.found).length, rows = s.slots.filter(x => filter === 'all' || (filter === 'found') === x.found);
      let body;
      if (!s.open) body = '<p class="kp-lock">🔒 Finish ' + E(s.need) + ' to unlock this season\'s keepsakes.</p>';
      else if (!rows.length) body = '<p class="kp-lock">' + (filter === 'found' ? 'Nothing found in this season yet.' : 'You found everything here. 🎉') + '</p>';
      else body = '<ul class="kp-grid">' + rows.map(x => x.found
        ? '<li class="kp-it has" title="' + E(x.name + ' · from ' + x.place) + '"><span class="kp-ic" aria-hidden="true">' + x.icon + '</span><b>' + E(x.name) + '</b><small>' + E(x.e + ' ' + x.place) + '</small><em>' + E(x.pick) + '</em></li>'
        : '<li class="kp-it no" title="' + E('Reach ' + x.place + ' to find this one') + '"><span class="kp-ic" aria-hidden="true">❔</span><b>???</b><small>' + E(x.e + ' ' + x.place) + '</small><em>' + (x.at ? 'Reach ' + x.at + ' h' : 'Start here') + '</em></li>').join('') + '</ul>';
      return '<section class="kp-sec" aria-label="Season ' + s.n + ' keepsakes"><div class="kp-sh"><div><span class="kp-k">SEASON ' + ['', 'ONE', 'TWO', 'THREE'][s.n] + '</span><h3>' + E(s.name) + '</h3></div><span class="kp-ct">' + got + ' / ' + s.slots.length + '</span></div>' +
        '<div class="kp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + s.slots.length + '" aria-valuenow="' + got + '" aria-label="Season ' + s.n + ' keepsakes found"><i style="width:' + Math.round(got / Math.max(1, s.slots.length) * 100) + '%"></i></div>' + body + '</section>';
    };
    return '<div class="kp-head"><div><span class="kp-k">COLLECTION</span><h2 id="kpTitle">🎒 Keepsakes</h2><p>' + T.f + ' of ' + T.t + ' found · ' + pct + '%</p></div><button type="button" class="btn btn-sm" data-kp="close" aria-label="Close keepsakes">✕ Close</button></div>' +
      '<div class="kp-tools" role="group" aria-label="Filter">' + chip('all', 'All') + chip('found', 'Found') + chip('missing', 'Missing') + '<button type="button" class="btn btn-sm kp-copy" data-kp="copy">📋 Copy list</button></div>' + S.map(sec).join('');
  }
  function text() {
    const S = seasons(), T = totals(S); let t = 'My Rex keepsakes: ' + T.f + ' of ' + T.t + '\n';
    S.forEach(s => { t += '\nSeason ' + s.n + ' · ' + s.name + ' (' + s.slots.filter(x => x.found).length + '/' + s.slots.length + ')\n'; s.slots.forEach(x => { t += (x.found ? '  ' + x.icon + ' ' + x.name + ' (' + x.place + ')' : '  ❔ ???') + '\n'; }); });
    return t;
  }
  function open() {
    if ($('kpOv')) return; prevFocus = document.activeElement;
    const ov = document.createElement('div'); ov.id = 'kpOv'; ov.className = 'kp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'kpTitle');
    ov.innerHTML = '<div class="kp-card" id="kpCard">' + html() + '</div>'; document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) return close(); const b = e.target.closest('[data-kp],[data-kp-f]'); if (!b) return;
      if (b.dataset.kpF) { filter = b.dataset.kpF; refresh(); const n = ov.querySelector('[data-kp-f="' + filter + '"]'); n && n.focus(); }
      else if (b.dataset.kp === 'close') close();
      else if (b.dataset.kp === 'copy') { const t = text(); const done = () => { b.textContent = '✅ Copied'; setTimeout(() => { b.textContent = '📋 Copy list'; }, 1600); }; try { navigator.clipboard.writeText(t).then(done, () => { b.textContent = 'Copy not allowed here'; }); } catch (er) { b.textContent = 'Copy not allowed here'; } } });
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => { const c = ov.querySelector('[data-kp="close"]'); c && c.focus(); }, 30);
  }
  const refresh = () => { const c = $('kpCard'); if (c) c.innerHTML = html(); };
  function onKey(e) {
    const ov = $('kpOv'); if (!ov) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') { const f = Array.from(ov.querySelectorAll('button')).filter(b => !b.disabled && b.offsetParent !== null); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  }
  function close() { const ov = $('kpOv'); if (!ov) return; ov.remove(); document.removeEventListener('keydown', onKey, true); try { prevFocus && prevFocus.isConnected && prevFocus.focus(); } catch (e) { /* ignore */ } }

  /* a small button above the season tabs in Story Mode */
  const base = window.RexStoryPlus && window.RexStoryPlus.paint;
  function wrap(root, S1, w1) {
    if (base) base.call(window.RexStoryPlus, root, S1, w1);
    try { const T = totals(seasons()); root.insertAdjacentHTML('afterbegin', '<div class="kp-entry"><button type="button" class="btn btn-sm" data-kp-open="1">🎒 Keepsake collection <b>' + T.f + ' / ' + T.t + '</b></button></div>'); } catch (e) { /* ignore */ }
  }
  if (window.RexStoryPlus) window.RexStoryPlus.paint = wrap;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#view-story [data-kp-open]')) open(); });
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open keepsake collection')) COMMANDS.push({ name: 'Open keepsake collection', run: () => { try { showView('story'); } catch (e) { /* ignore */ } setTimeout(open, 250); } }); } catch (e) { /* ignore */ }
  window.RexKeepsakes = { open, close, seasons, totals, text };
})();
