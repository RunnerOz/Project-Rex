/* Project Rex Center 12.11.0 - Rex's Room (free, local).
   A little room for your mascot. Decorate it with items you earn: coins from the Arcade, places reached in Story Mode, achievements, and finished focus sessions.
   Rex reacts to the time of day (asleep at night) and cheers after a real focus session. It only READS your Dev Clock, Story Mode and achievements.
   Own data lives in rex1311_play (shared with the Arcade): owned items and what is placed where. Nothing is sent anywhere. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-room'); if (!view || !window.RexPlay) return;
  const P = window.RexPlay, E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SLOTS = [['wall', 'Walls'], ['floor', 'Floor'], ['rug', 'Rug'], ['poster', 'Pictures'], ['plant', 'Plants'], ['lamp', 'Lights'], ['bed', 'Rex\'s bed'], ['shelf', 'Trophies'], ['desk', 'Desk'], ['toy', 'Toys']];
  const POS = { poster: [120, 105], plant: [572, 232], lamp: [62, 232], bed: [150, 312], shelf: [478, 108], desk: [520, 300], toy: [285, 322] };
  const IT = [
    { id: 'w-cream', s: 'wall', n: 'Warm cream', c: '#f3e3c3', free: 1 }, { id: 'w-sky', s: 'wall', n: 'Sky blue', c: '#bcdcf5', cost: 20 }, { id: 'w-mint', s: 'wall', n: 'Mint', c: '#c6ecd9', cost: 30 }, { id: 'w-sunset', s: 'wall', n: 'Sunset', c: '#f6b99a', cost: 50 }, { id: 'w-night', s: 'wall', n: 'Midnight', c: '#3b3f73', cost: 80 },
    { id: 'f-wood', s: 'floor', n: 'Wood', c: '#b98550', free: 1 }, { id: 'f-gray', s: 'floor', n: 'Stone', c: '#8d93a0', cost: 25 }, { id: 'f-tile', s: 'floor', n: 'Blue tiles', c: '#6f9bc4', cost: 40 }, { id: 'f-grass', s: 'floor', n: 'Grass', c: '#6dbb6a', cost: 60 },
    { id: 'r-red', s: 'rug', n: 'Red rug', c: '#d9534f', cost: 30 }, { id: 'r-blue', s: 'rug', n: 'Blue rug', c: '#4f7bd9', cost: 30 }, { id: 'r-rainbow', s: 'rug', n: 'Rainbow rug', c: 'rainbow', cost: 70 },
    { id: 'p-pic', s: 'poster', n: 'Picture', e: '🖼️', cost: 15 }, { id: 'p-map', s: 'poster', n: 'World map', e: '🗺️', cost: 30 }, { id: 'p-game', s: 'poster', n: 'Game poster', e: '🎮', cost: 40 }, { id: 'p-bridge', s: 'poster', n: 'Old Stone Bridge photo', e: '🌉', story: 'bridge' }, { id: 'p-peaks', s: 'poster', n: 'Cloudspine Peaks photo', e: '🏔️', story: 'peaks' },
    { id: 'pl-cactus', s: 'plant', n: 'Cactus', e: '🌵', cost: 15 }, { id: 'pl-pot', s: 'plant', n: 'Potted plant', e: '🪴', cost: 20 }, { id: 'pl-fern', s: 'plant', n: 'Fernwood fern', e: '🌿', story: 'fern' },
    { id: 'l-candle', s: 'lamp', n: 'Candle', e: '🕯️', cost: 15, glow: 1 }, { id: 'l-bulb', s: 'lamp', n: 'Desk lamp', e: '💡', cost: 25, glow: 1 }, { id: 'l-ember', s: 'lamp', n: 'Ember Camp fire', e: '🔥', story: 'camp', glow: 1 },
    { id: 'b-basket', s: 'bed', n: 'Cozy basket', e: '🧺', free: 1 }, { id: 'b-bed', s: 'bed', n: 'Little bed', e: '🛏️', cost: 50 }, { id: 'b-tent', s: 'bed', n: 'Camping tent', e: '⛺', cost: 70 },
    { id: 's-t1', s: 'shelf', n: 'First trophy', e: '🏆', ach: 1 }, { id: 's-t5', s: 'shelf', n: 'Gold medal', e: '🥇', ach: 5 }, { id: 's-t10', s: 'shelf', n: 'Sports medal', e: '🏅', ach: 10 }, { id: 's-t20', s: 'shelf', n: 'Honor ribbon', e: '🎖️', ach: 20 },
    { id: 'd-mug', s: 'desk', n: 'Coffee mug', e: '☕', sess: 3 }, { id: 'd-head', s: 'desk', n: 'Headphones', e: '🎧', sess: 10 }, { id: 'd-pc', s: 'desk', n: 'Computer', e: '🖥️', sess: 25 }, { id: 'd-books', s: 'desk', n: 'Stack of books', e: '📚', sess: 50 },
    { id: 't-ball', s: 'toy', n: 'Tennis ball', e: '🎾', cost: 10 }, { id: 't-bone', s: 'toy', n: 'Chew bone', e: '🦴', cost: 12 }, { id: 't-gem', s: 'toy', n: 'Crystal', e: '💎', story: 'mines' }, { id: 't-anchor', s: 'toy', n: 'Starlit anchor', e: '⚓', story: 'bay' }, { id: 't-castle', s: 'toy', n: 'Toy castle', e: '🏰', story: 'castle' }, { id: 't-crown', s: 'toy', n: 'Summit crown', e: '👑', story: 'summit' }
  ];
  const byId = id => IT.find(x => x.id === id);
  function placeH(id) { try { const pl = RexStory.places.find(p => p.id === id); return pl ? pl : null; } catch (e) { return null; } }
  function achCount() { try { return window.RexAch2 ? RexAch2.list().filter(c => c.earned > 0).length : 0; } catch (e) { return 0; } }
  function sessCount() { try { const d = JSON.parse(localStorage.getItem('rex_dev_clock_data') || 'null'); return d && Array.isArray(d.sessions) ? d.sessions.length : 0; } catch (e) { return 0; } }
  function req(it) { if (it.free) return 'Included'; if (it.cost) return it.cost + ' 🪙'; if (it.story) { const p = placeH(it.story); return 'Reach ' + (p ? p.n + ' in Story Mode' : 'a Story Mode place'); } if (it.ach) return 'Earn ' + it.ach + ' achievement' + (it.ach > 1 ? 's' : ''); if (it.sess) return 'Finish ' + it.sess + ' Dev Clock sessions'; return ''; }
  function earned(it) { if (it.free) return true; if (it.story) { const p = placeH(it.story); return !!p && P.hours() >= p.h; } if (it.ach) return achCount() >= it.ach; if (it.sess) return sessCount() >= it.sess; return false; }

  /* free and earned items are granted once and kept; the very first run is silent so old work does not flood you */
  function sync(quiet) {
    const o = P.load(), fresh = o.seen === 0, got = [];
    IT.forEach(it => { if (!o.owned.includes(it.id) && earned(it)) got.push(it); });
    if (got.length || fresh || !Object.keys(o.placed).length) P.mutate(x => {
      got.forEach(it => x.owned.push(it.id)); x.placed = x.placed || {};
      ['w-cream', 'f-wood', 'b-basket'].forEach(id => { const it = byId(id); if (!x.owned.includes(id)) x.owned.push(id); if (!x.placed[it.s]) x.placed[it.s] = id; });
      if (fresh) x.seen = 1;
    });
    if (!fresh && !quiet) got.filter(it => !it.free).slice(0, 3).forEach(it => { try { toast('🎁 New for Rex\'s Room: ' + it.e + ' ' + it.n, 'success'); } catch (e) {} });
    return got;
  }

  /* ---------- Rex's mood ---------- */
  function clockInfo() { let d = null; try { d = JSON.parse(localStorage.getItem('rex_dev_clock_data') || 'null'); } catch (e) {} d = d && typeof d === 'object' ? d : {}; const list = Array.isArray(d.sessions) ? d.sessions : []; let lastEnd = 0, lastDur = 0; list.forEach(s => { const e = (+s.start || 0) + (+s.duration || 0); if (e > lastEnd) { lastEnd = e; lastDur = +s.duration || 0; } }); const live = +d.activeStart > 0 ? Date.now() - d.activeStart : 0; return { lastEnd, lastDur, live }; }
  const welcomeBack = (() => { const o = P.load(), away = o.lastOpen ? Date.now() - o.lastOpen : 0; P.mutate(x => { x.lastOpen = Date.now(); }); return away > 20 * 3600000; })();
  function mood(now) {
    now = now || new Date(); const h = now.getHours(), c = clockInfo(), night = h >= 22 || h < 6;
    if (c.live >= 60000) return { k: 'work', say: c.live >= 25 * 60000 ? 'You have been focused for a while. I am proud of you!' : 'Focus time! I will sit quietly and cheer you on.' };
    if (c.lastEnd && Date.now() - c.lastEnd < 3 * 3600000 && c.lastDur >= 25 * 60000) return { k: 'cheer', say: 'That was a great focus session! 🎉' };
    if (night) return { k: 'sleep', say: 'Zzz… Rex is sleeping. It is late, so maybe you should rest too.' };
    if (welcomeBack) return { k: 'idle', say: 'You are back! I missed you.' };
    return { k: 'idle', say: h < 12 ? 'Good morning! Ready to work?' : h < 18 ? 'Good afternoon! What are we building?' : 'Good evening! A little more, then relax?' };
  }
  const TAPS = ['Woof!', 'Did you hear that? Good boy.', 'I love this room!', 'Can we go on a walk in Story Mode?', 'Play a game with me?', 'Snack time? 🦴'];

  /* ---------- the scene ---------- */
  function scene(m) {
    const o = P.load(), pl = s => byId(o.placed[s]), hour = new Date().getHours(), night = hour >= 22 || hour < 6;
    const sky = night ? ['#0b1030', '#1d2b6b'] : hour < 9 ? ['#ffb37a', '#ffe3b0'] : hour < 18 ? ['#6ec3ff', '#d6f0ff'] : ['#6d4b9a', '#f08c6b'];
    const wall = pl('wall') || byId('w-cream'), floor = pl('floor') || byId('f-wood'), rug = pl('rug'), lamp = pl('lamp');
    let s = '<svg viewBox="0 0 640 360" class="rm-svg" role="img" aria-label="Rex\'s Room. Rex is ' + (m.k === 'sleep' ? 'sleeping' : m.k === 'cheer' ? 'cheering' : 'relaxing') + '.">';
    s += '<defs><linearGradient id="rmSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient><radialGradient id="rmGlow"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="rmRb" x1="0" x2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".33" stop-color="#ffd93d"/><stop offset=".66" stop-color="#6bcf63"/><stop offset="1" stop-color="#4d8bff"/></linearGradient></defs>';
    s += '<rect width="640" height="250" fill="' + wall.c + '"/><rect y="250" width="640" height="110" fill="' + floor.c + '"/><rect y="246" width="640" height="8" fill="rgba(0,0,0,.18)"/>';
    s += '<g><rect x="262" y="40" width="116" height="96" rx="8" fill="url(#rmSky)" stroke="#6b4a2b" stroke-width="7"/>' + (night ? '<text x="330" y="82" font-size="26">🌙</text><text x="282" y="64" font-size="10">✨</text><text x="350" y="112" font-size="10">✨</text>' : hour >= 9 && hour < 18 ? '<text x="276" y="80" font-size="30">☀️</text>' : '<text x="300" y="110" font-size="28">🌅</text>') + '<path d="M320 40v96M262 88h116" stroke="#6b4a2b" stroke-width="4"/></g>';
    if (rug) s += rug.c === 'rainbow' ? '<ellipse cx="330" cy="318" rx="150" ry="30" fill="url(#rmRb)"/>' : '<ellipse cx="330" cy="318" rx="150" ry="30" fill="' + rug.c + '"/>';
    s += '<ellipse cx="330" cy="318" rx="120" ry="20" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>';
    ['poster', 'plant', 'lamp', 'shelf', 'desk', 'toy'].forEach(sl => { const it = pl(sl); if (!it) return; const p = POS[sl]; s += '<text x="' + p[0] + '" y="' + p[1] + '" font-size="' + (sl === 'poster' ? 58 : 50) + '" text-anchor="middle" class="rm-it" data-slot="' + sl + '">' + it.e + '</text>'; });
    const bed = pl('bed'); if (bed) s += '<text x="' + POS.bed[0] + '" y="' + POS.bed[1] + '" font-size="76" text-anchor="middle" class="rm-it" data-slot="bed">' + bed.e + '</text>';
    const img = 'icons/rex-mascot.svg';
    if (m.k === 'sleep') s += '<g transform="translate(150,292) rotate(-78)"><image href="' + img + '" x="-48" y="-54" width="96" height="108" class="rm-rex"/></g><text x="190" y="226" font-size="22" class="rm-z">💤</text>';
    else s += '<g class="rm-rexg ' + (m.k === 'cheer' ? 'rm-cheer' : m.k === 'work' ? 'rm-work' : 'rm-idle') + '" tabindex="0" role="button" aria-label="Pet Rex" id="rmRex"><image href="' + img + '" x="268" y="140" width="112" height="126" class="rm-rex"/></g>' + (m.k === 'cheer' ? '<text x="260" y="140" font-size="26" class="rm-conf">🎉</text><text x="380" y="150" font-size="22" class="rm-conf c2">✨</text><text x="330" y="120" font-size="24" class="rm-conf c3">🎊</text>' : '');
    if (night) { s += '<rect width="640" height="360" fill="#050722" opacity="' + (lamp && lamp.glow ? .32 : .5) + '"/>'; if (lamp && lamp.glow) s += '<circle cx="' + POS.lamp[0] + '" cy="' + (POS.lamp[1] - 15) + '" r="140" fill="url(#rmGlow)"/>'; }
    return s + '</svg>';
  }

  /* ---------- page ---------- */
  let tab = 'wall', bubble = '';
  function build() {
    if (view.dataset.rm) return; view.dataset.rm = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">HOME</span><h2>Rex\'s Room</h2><p>Decorate Rex\'s room with things you earn. Rex sleeps at night and cheers after a real focus session.</p></div><div class="ar-bank"><b>🪙 <span data-rexcoins>0</span></b><small><a href="#" data-rmplay>Earn more in the Arcade</a></small></div></header><div class="rm-wrap"><div class="rm-bubble" id="rmBub" role="status" aria-live="polite"></div><div id="rmScene" class="rm-scene"></div></div><section class="card"><div class="card-title"><h3>🎨 Decorate</h3></div><div class="nc-chips" id="rmTabs" role="group" aria-label="Item types"></div><div class="rm-items" id="rmItems"></div><p class="ar-note" id="rmCount"></p></section>';
    view.addEventListener('click', e => {
      if (e.target.closest('[data-rmplay]')) { e.preventDefault(); showView('arcade'); return; }
      if (e.target.closest('#rmRex')) { tap(); return; }
      const t = e.target.closest('[data-rmtab]'); if (t) { tab = t.dataset.rmtab; items(); tabs(); return; }
      const a = e.target.closest('[data-rmact]'); if (!a) return; const id = a.dataset.id, it = byId(id); if (!it) return;
      if (a.dataset.rmact === 'place') { P.mutate(o => { o.placed[it.s] = id; }); }
      else if (a.dataset.rmact === 'remove') { P.mutate(o => { delete o.placed[it.s]; }); }
      else if (a.dataset.rmact === 'buy') { if (P.spend(it.cost)) { P.mutate(o => { if (!o.owned.includes(id)) o.owned.push(id); o.placed[it.s] = id; }); try { toast('Bought ' + (it.e || '') + ' ' + it.n, 'success'); } catch (er) {} } else { try { toast('Not enough coins yet. Play the Arcade to earn more.', 'warn'); } catch (er) {} } }
      draw();
    });
    view.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'rmRex') { e.preventDefault(); tap(); } });
  }
  function tap() { const m = mood(); bubble = m.k === 'sleep' ? 'Zzz… 💤' : TAPS[Math.floor(Math.random() * TAPS.length)]; const b = $('rmBub'); if (b) b.textContent = '🐶 ' + bubble; const g = $('rmRex'); if (g) { g.classList.remove('rm-hop'); void g.getBoundingClientRect(); g.classList.add('rm-hop'); } }
  function tabs() { const h = $('rmTabs'); if (!h) return; h.innerHTML = ''; SLOTS.forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.rmtab = k; b.className = k === tab ? 'on' : ''; b.textContent = n; b.setAttribute('aria-pressed', String(k === tab)); h.appendChild(b); }); }
  function items() {
    const h = $('rmItems'); if (!h) return; const o = P.load(); h.innerHTML = ''; let have = 0, total = 0;
    IT.filter(x => x.s === tab).forEach(it => { total++; const own = o.owned.includes(it.id), on = o.placed[it.s] === it.id, c = document.createElement('div'); c.className = 'rm-item' + (own ? '' : ' lock') + (on ? ' on' : ''); if (own) have++;
      const sw = it.c ? '<span class="rm-sw" style="background:' + (it.c === 'rainbow' ? 'linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcf63,#4d8bff)' : it.c) + '"></span>' : '<span class="rm-em" aria-hidden="true">' + it.e + '</span>';
      let btn = ''; if (own) btn = on ? (it.s === 'wall' || it.s === 'floor' ? '<small>In use</small>' : '<button type="button" class="sbtn" data-rmact="remove" data-id="' + it.id + '">Remove</button>') : '<button type="button" class="sbtn primary" data-rmact="place" data-id="' + it.id + '">Place</button>';
      else if (it.cost) btn = '<button type="button" class="sbtn primary" data-rmact="buy" data-id="' + it.id + '"' + (o.coins < it.cost ? ' aria-disabled="true"' : '') + '>Buy · ' + it.cost + ' 🪙</button>'; else btn = '<small>🔒 ' + E(req(it)) + '</small>';
      c.innerHTML = sw + '<b>' + E(it.n) + '</b>' + btn; h.appendChild(c); });
    const n = $('rmCount'); if (n) n.textContent = have + ' of ' + total + ' owned in this group.';
  }
  function draw() {
    build(); const m = mood(), sc = $('rmScene'); if (sc) sc.innerHTML = scene(m); const b = $('rmBub'); if (b) b.textContent = '🐶 ' + (bubble || m.say); tabs(); items(); P.paint && 0; document.querySelectorAll('[data-rexcoins]').forEach(n => { n.textContent = P.load().coins; });
  }
  function home() {
    const hm = $('view-home'); if (!hm) return; let c = $('rmHome'); if (!c) { c = document.createElement('div'); c.id = 'rmHome'; c.className = 'card rm-home'; hm.appendChild(c); c.addEventListener('click', e => { const b = e.target.closest('[data-rmgo]'); if (b) showView(b.dataset.rmgo); }); }
    const m = mood(), o = P.load(); c.innerHTML = '<span class="rm-hemo" aria-hidden="true">' + (m.k === 'sleep' ? '😴' : m.k === 'cheer' ? '🥳' : '🐶') + '</span><div class="rm-htx"><b>Rex\'s Room</b><small>' + E(m.say) + '</small></div><div class="rm-hbt"><span class="rm-coin">🪙 ' + o.coins + '</span><button type="button" class="sbtn" data-rmgo="room">Visit</button><button type="button" class="sbtn" data-rmgo="arcade">Play</button></div>';
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'room') { bubble = ''; sync(); draw(); } else if (n === 'home') { sync(); home(); } } catch (e) { console.error('Room', e); } return r; };
  document.addEventListener('rexplay', () => { try { if (view.classList.contains('active')) draw(); } catch (e) {} });
  setInterval(() => { try { if (document.hidden) return; if (view.classList.contains('active')) { const m = mood(); if (!bubble) { const b = $('rmBub'); if (b) b.textContent = '🐶 ' + m.say; } const k = ($('rmScene') || {}).dataset; const s = $('rmScene'); if (s && s.dataset.k !== m.k) { s.dataset.k = m.k; draw(); } } else home(); } catch (e) {} }, 30000);
  try { if (typeof views === 'object') views.room = ['Rex\'s Room', 'Decorate Rex\'s room']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Rex\'s Room')) COMMANDS.push({ name: 'Open Rex\'s Room', run: () => showView('room') }); } catch (e) {}
  setTimeout(() => { try { sync(); home(); } catch (e) {} }, 1200);
  window.RexRoom = { items: IT, sync, mood, earned, draw, home, state: () => P.load() };
})();
