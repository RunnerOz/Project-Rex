/* Project Rex Center 12.9.8 - Story Mode (free, local).
   An adventure map for Rex. Your real Dev Clock time is the distance: every focus session moves Rex further along the trail and unlocks new places.
   It only READS the Dev Clock data (rex_dev_clock_data) and writes its own small key, rex1298_story (places reached, furthest point, pending "arrived" notes).
   Nothing is sent anywhere. Places stay reached even if Dev Clock sessions are deleted later. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rex1298_story', CLOCK = 'rex_dev_clock_data';
  const PLACES = [
    { id: 'hollow', h: 0, e: '🥚', n: 'Hatchling Hollow', t: 'Every Rex starts in a warm little nest. Today the whole trail is still ahead.' },
    { id: 'fern', h: 1, e: '🌿', n: 'Fernwood Trail', t: 'Soft ferns and the first real steps. One focused hour and you are already on the road.' },
    { id: 'creek', h: 3, e: '🏞️', n: 'Mossy Creek', t: 'A quiet creek to cross. Rex hops the stones and keeps going.' },
    { id: 'camp', h: 6, e: '⛺', n: 'Ember Camp', t: 'A crackling fire and a place to plan the next stretch of the trail.' },
    { id: 'bridge', h: 10, e: '🌉', n: 'Old Stone Bridge', t: 'Ten hours of work built this bridge. It holds, and so do you.' },
    { id: 'mines', h: 15, e: '⛏️', n: 'Crystal Mines', t: 'Glittering tunnels. Deep work is where the good stuff is found.' },
    { id: 'peaks', h: 22, e: '🏔️', n: 'Cloudspine Peaks', t: 'The air is thin and the view is huge. You can see how far you have come.' },
    { id: 'bay', h: 30, e: '⚓', n: 'Starlit Bay', t: 'Thirty hours in. The harbour lights flicker on and the water is calm.' },
    { id: 'ruins', h: 40, e: '🏛️', n: 'Sunken Ruins', t: 'Old halls under the waves. Someone worked here long ago, just like you.' },
    { id: 'volcano', h: 55, e: '🌋', n: 'Ashfall Volcano', t: 'Hot ground and a steady rumble. Momentum is a real thing.' },
    { id: 'castle', h: 75, e: '🏰', n: 'Skyhold Castle', t: 'A castle above the clouds. The gates open for those who keep showing up.' },
    { id: 'summit', h: 100, e: '👑', n: 'The Summit of Rex', t: 'One hundred hours. The top of the world, and a very proud Rex.' }
  ];
  /* the trail: three rows that snake across a 1000 x 560 map */
  const PTS = [[120, 100], [370, 100], [620, 100], [870, 100], [870, 290], [620, 290], [370, 290], [120, 290], [120, 480], [370, 480], [620, 480], [870, 480]];
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;

  function clock() {
    let d = null; try { d = JSON.parse(localStorage.getItem(CLOCK) || 'null'); } catch (e) {}
    d = d && typeof d === 'object' ? d : {};
    const list = Array.isArray(d.sessions) ? d.sessions : [];
    let ms = 0; list.forEach(s => { ms += num(s && s.duration); });
    const live = num(d.activeStart) ? Math.max(0, Date.now() - d.activeStart) : 0;
    return { ms: ms + live, sessions: list.length + (live ? 1 : 0), live: !!live, today: 0 };
  }
  const hm = ms => { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  const hoursOf = ms => ms / 3600000;

  /* where is Rex? idx = last place reached, frac = how far toward the next one */
  function where(h) {
    let idx = 0; PLACES.forEach((p, i) => { if (h >= p.h) idx = i; });
    const next = PLACES[idx + 1] || null, frac = next ? Math.min(1, (h - PLACES[idx].h) / (next.h - PLACES[idx].h)) : 1;
    return { idx, next, frac };
  }
  const pointAt = w => { const a = PTS[w.idx], b = PTS[Math.min(w.idx + 1, PTS.length - 1)]; return [a[0] + (b[0] - a[0]) * w.frac, a[1] + (b[1] - a[1]) * w.frac]; };

  /* record places reached; returns the ones that are new since last time (not on the very first run, so nothing is "celebrated" for old work) */
  function sync(c) {
    const r = rd(), first = !r.seen, h = Math.max(hoursOf(c.ms), num(r.maxH) || 0), reached = [];
    r.visited = r.visited && typeof r.visited === 'object' ? r.visited : {};
    PLACES.forEach(p => { if (h >= p.h && !r.visited[p.id]) { r.visited[p.id] = Date.now(); reached.push(p); } });
    r.news = Array.isArray(r.news) ? r.news : [];
    if (!first) reached.forEach(p => { if (p.h > 0) r.news.push(p.id); });
    r.seen = true; r.maxH = Math.max(num(r.maxH), hoursOf(c.ms)); wr(r);
    return { rec: r, h, fresh: first ? [] : reached.filter(p => p.h > 0) };
  }

  let sel = null, root = null;
  function mapSVG(S, w) {
    const reached = i => S.h >= PLACES[i].h, cur = pointAt(w);
    const done = PTS.slice(0, w.idx + 1).concat([cur]).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const all = PTS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const nodes = PLACES.map((p, i) => { const [x, y] = PTS[i], on = reached(i), here = i === w.idx && w.frac === 0 || (i === w.idx && !w.next);
      return '<g class="st-n' + (on ? ' on' : ' lock') + (sel === p.id ? ' sel' : '') + '" data-pl="' + p.id + '" tabindex="0" role="button" aria-label="' + E(p.n + (on ? ', reached' : ', locked, unlocks at ' + p.h + ' hours')) + '" transform="translate(' + x + ' ' + y + ')">' +
        '<circle r="38"/><text class="st-e" y="12" text-anchor="middle">' + p.e + '</text>' + (on ? '' : '<text class="st-k" x="24" y="-22" text-anchor="middle">🔒</text>') +
        '<text class="st-l" y="68" text-anchor="middle">' + E(p.n) + '</text><text class="st-h" y="86" text-anchor="middle">' + (p.h ? p.h + ' h' : 'Start') + '</text></g>'; }).join('');
    const me = '<g transform="translate(' + (cur[0] - 26).toFixed(1) + ' ' + (cur[1] - 98).toFixed(1) + ')"><g class="st-me"><image href="icons/rex-mascot.svg" width="52" height="58"/><path d="M26 62 l-8 -10 h16z" class="st-pin"/></g></g>';   /* the bobbing animation sits on the inner group so it cannot replace the position */
    return '<svg class="st-map" viewBox="0 0 1000 560" role="group" aria-label="Story Mode trail map"><path class="st-road" d="' + all + '"/><path class="st-trav" d="' + done + '"/>' + nodes + me + '</svg>';
  }
  function listHTML(S, w) {
    return '<ol class="st-list">' + PLACES.map((p, i) => { const on = S.h >= p.h, here = i === w.idx;
      return '<li><button type="button" class="st-li' + (on ? ' on' : ' lock') + (here ? ' here' : '') + (sel === p.id ? ' sel' : '') + '" data-pl="' + p.id + '"><span class="st-li-e" aria-hidden="true">' + (on ? p.e : '🔒') + '</span><span class="st-li-t"><b>' + E(p.n) + '</b><small>' + (on ? (here ? 'Rex is here' : 'Reached') : 'Unlocks at ' + p.h + ' h') + '</small></span>' + (here ? '<span class="st-li-me" aria-hidden="true">🦖</span>' : '') + '</button></li>'; }).join('') + '</ol>';
  }
  function detailHTML(S, w) {
    const p = PLACES.find(x => x.id === sel) || PLACES[w.idx], i = PLACES.indexOf(p), on = S.h >= p.h, at = S.rec.visited && S.rec.visited[p.id];
    const togo = Math.max(0, (p.h - S.h) * 3600000);
    return '<div class="st-d-e" aria-hidden="true">' + p.e + '</div><div><h3>' + E(p.n) + '</h3><p>' + E(p.t) + '</p><small>' + (on ? (p.h === 0 ? 'Where the trail begins.' : '✅ Reached' + (at ? ' on ' + E(new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })) : '')) : '🔒 Unlocks after ' + p.h + ' hours of Dev Clock time · ' + hm(togo) + ' to go') + ' · place ' + (i + 1) + ' of ' + PLACES.length + '</small></div>';
  }
  function render() {
    root = $('view-story'); if (!root) return;
    const c = clock(), S = sync(c); S.h = Math.max(hoursOf(c.ms), num(S.rec.maxH)); const w = where(S.h);
    const eff = S.h, pct = Math.round(w.frac * 100), remain = w.next ? Math.max(0, (w.next.h - eff) * 3600000) : 0;
    const news = (S.rec.news || []).map(id => PLACES.find(p => p.id === id)).filter(Boolean);
    root.innerHTML =
      '<header class="st-hero"><div><span class="st-kicker">STORY MODE</span><h2>Rex’s Adventure</h2><p>Every Dev Clock session moves Rex further along the trail. Real focus time is the only fuel: no shortcuts, nothing to buy.</p></div><div class="st-hero-r"><button type="button" class="btn btn-primary" data-st="clock">' + (c.live ? '⏱ Session running' : '⏱ Start a Dev Clock session') + '</button></div></header>' +
      (news.length ? '<div class="st-news" role="status"><span>🎉 Rex reached <b>' + news.map(p => E(p.e + ' ' + p.n)).join(', ') + '</b>!</span><button type="button" class="btn btn-sm" data-st="ok">Nice!</button></div>' : '') +
      '<div class="st-stats"><div><b>' + hm(eff * 3600000) + '</b><small>Total focus time</small></div><div><b>' + c.sessions + '</b><small>Sessions</small></div><div><b>' + (w.idx + 1) + ' / ' + PLACES.length + '</b><small>Places reached</small></div>' +
      '<div class="st-next"><b>' + (w.next ? E(w.next.e + ' ' + w.next.n) : '👑 Trail complete') + '</b><small>' + (w.next ? hm(remain) + ' to go' : 'You made it to the top') + '</small><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (w.next ? pct : 100) + '" aria-label="Progress to the next place"><i style="width:' + (w.next ? pct : 100) + '%"></i></div></div></div>' +
      mapSVG(S, w) + listHTML(S, w) + '<div class="st-detail" id="stDetail" aria-live="polite">' + detailHTML(S, w) + '</div>' +
      '<p class="st-note">Progress is your total Dev Clock time on this device. Places you have reached stay reached, even if you delete sessions later. Clearing your browser data starts a new trail.</p>';
  }
  function pick(id) { sel = id; if (!root) return; const c = clock(), S = sync(c); S.h = Math.max(hoursOf(c.ms), num(S.rec.maxH)); const w = where(S.h); const d = $('stDetail'); if (d) d.innerHTML = detailHTML(S, w); root.querySelectorAll('[data-pl]').forEach(n => n.classList.toggle('sel', n.dataset.pl === id)); }

  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#view-story [data-pl], #view-story [data-st]'); if (!t) return;
    if (t.dataset.pl) pick(t.dataset.pl);
    else if (t.dataset.st === 'clock') { try { showView('clock'); } catch (er) {} }
    else if (t.dataset.st === 'ok') { const r = rd(); r.news = []; wr(r); render(); }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('#view-story g[data-pl]')) { e.preventDefault(); pick(e.target.closest('g[data-pl]').dataset.pl); } });

  /* while Rex is open, notice a place being reached (for example during a long session) */
  function watch() {
    try {
      if (document.hidden) return;
      const c = clock(), S = sync(c);
      S.fresh.forEach(p => { try { if (typeof toast === 'function') toast('🗺️ Rex reached ' + p.n + '!', 'success'); } catch (e) {} });
      const v = $('view-story'); if (v && v.classList.contains('active') && (S.fresh.length || c.live)) render();
    } catch (e) { console.error('Story Mode:', e); }
  }
  setInterval(watch, 30000); setTimeout(watch, 2500);

  try { if (typeof views === 'object') views.story = ['Story Mode', 'Your Dev Clock adventure']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Story Mode')) COMMANDS.push({ name: 'Open Story Mode', run: () => showView('story') }); } catch (e) {}
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'story') render(); } catch (e) { console.error('Story Mode:', e); const v = $('view-story'); if (v) v.innerHTML = '<div class="st-note">Story Mode could not be drawn on this device. Reload and try again.</div>'; } return r; };
  window.RexStory = { render, places: PLACES, where, state: () => { const c = clock(), r = rd(); const h = Math.max(hoursOf(c.ms), num(r.maxH)); return { hours: h, where: where(h), rec: r }; } };
})();
