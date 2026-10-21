/* Project Rex Center 12.11.0 - Rex Arcade (free, local, no ads, no accounts).
   Three small games: Memory Match, Reaction Test and Rex Runner. Each one unlocks with your real Dev Clock time (it only READS that data, via Story Mode).
   Wins earn coins for Rex's Room, up to 100 coins per day so the games stay a treat. High scores and coins are saved on this device only.
   Own data: rex1311_play = { coins, total, day:{d,c}, hs:{memory,reaction,runner}, plays:{...}, owned:[ids], placed:{slot:id}, seen, lastOpen }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-arcade'); if (!view) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'rex1311_play', CAP = 100;
  const GAMES = [
    { id: 'memory', e: '🃏', n: 'Memory Match', h: 0.25, t: 'Find all 8 pairs in as few moves as you can.', best: 'fewest moves' },
    { id: 'reaction', e: '⚡', n: 'Reaction Test', h: 1, t: 'Click the moment the box turns green. Three rounds.', best: 'fastest average' },
    { id: 'runner', e: '🦖', n: 'Rex Runner', h: 3, t: 'Jump over the cacti. Space, arrow up, or tap.', best: 'longest run' }
  ];
  function load() { let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {} o = o && typeof o === 'object' ? o : {};
    const n = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : 0;
    return { coins: n(o.coins), total: n(o.total), day: o.day && typeof o.day === 'object' ? { d: String(o.day.d || ''), c: n(o.day.c) } : { d: '', c: 0 }, hs: o.hs && typeof o.hs === 'object' ? o.hs : {}, plays: o.plays && typeof o.plays === 'object' ? o.plays : {}, owned: Array.isArray(o.owned) ? o.owned.filter(x => typeof x === 'string').slice(0, 200) : [], placed: o.placed && typeof o.placed === 'object' ? o.placed : {}, seen: n(o.seen), lastOpen: n(o.lastOpen), ver: 1 }; }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function mutate(fn) { const o = load(); fn(o); save(o); fire(); return o; }
  function fire() { try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (e) {} paintCoins(); }
  function award(n, game) {
    n = Math.max(0, Math.floor(n)); let got = 0;
    mutate(o => { if (o.day.d !== today()) o.day = { d: today(), c: 0 }; got = Math.max(0, Math.min(n, CAP - o.day.c)); o.day.c += got; o.coins += got; o.total += got; o.plays[game] = (o.plays[game] || 0) + 1; });
    return got;
  }
  function spend(n) { let ok = false; mutate(o => { if (o.coins >= n) { o.coins -= n; ok = true; } }); return ok; }
  function hours() { try { return window.RexStory ? RexStory.state().hours : 0; } catch (e) { return 0; } }
  const unlocked = g => hours() >= g.h;
  const leftToday = () => { const o = load(); return o.day.d === today() ? Math.max(0, CAP - o.day.c) : CAP; };
  function best(game, val, lowerBetter) { let isNew = false; mutate(o => { const b = o.hs[game]; if (b == null || (lowerBetter ? val < b : val > b)) { o.hs[game] = val; isNew = true; } }); return isNew; }
  const say = (t, type) => { try { toast(t, type || 'success'); } catch (e) {} };
  const fmtH = h => h >= 1 ? (Math.round(h * 10) / 10) + ' h' : Math.round(h * 60) + ' min';

  /* ---------- page ---------- */
  let cur = null, stop = null;
  function paintCoins() { document.querySelectorAll('[data-rexcoins]').forEach(n => { n.textContent = load().coins; }); }
  function build() {
    if (view.dataset.ar) return; view.dataset.ar = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">PLAY</span><h2>Rex Arcade</h2><p>Small games that unlock with your Dev Clock time. Wins earn coins for <a href="#" data-arroom>Rex\'s Room</a>.</p></div><div class="ar-bank" aria-live="polite"><b>🪙 <span data-rexcoins>0</span></b><small id="arToday"></small></div></header><div class="ar-grid" id="arGrid"></div><section class="card ar-stage" id="arStage" hidden aria-live="polite"></section><p class="ar-note">Coins from games are capped at ' + CAP + ' a day. Everything is saved on this device only, and nothing is sent anywhere.</p>';
    view.addEventListener('click', e => { if (e.target.closest('[data-arroom]')) { e.preventDefault(); showView('room'); return; } const b = e.target.closest('[data-argame]'); if (b) open(b.dataset.argame); const c = e.target.closest('[data-arclock]'); if (c) showView('clock'); });
  }
  function paint() {
    build(); const o = load(), h = hours(), g = $('arGrid'); if (!g) return; g.innerHTML = '';
    GAMES.forEach(x => { const on = h >= x.h, c = document.createElement('div'); c.className = 'card ar-card' + (on ? '' : ' lock'); const hs = o.hs[x.id];
      const sc = hs == null ? 'No score yet' : x.id === 'memory' ? 'Best: ' + hs + ' moves' : x.id === 'reaction' ? 'Best: ' + hs + ' ms' : 'Best: ' + hs;
      c.innerHTML = '<div class="ar-e" aria-hidden="true">' + (on ? x.e : '🔒') + '</div><h3>' + E(x.n) + '</h3><p>' + E(x.t) + '</p><small>' + (on ? E(sc) : 'Unlocks at ' + fmtH(x.h) + ' of Dev Clock time. You have ' + fmtH(h) + '.') + '</small>' +
        (on ? '<button type="button" class="btn btn-primary" data-argame="' + x.id + '">Play</button>' : '<div class="ar-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(Math.min(1, h / x.h) * 100) + '"><i style="width:' + Math.round(Math.min(1, h / x.h) * 100) + '%"></i></div><button type="button" class="btn" data-arclock>Open the Dev Clock</button>');
      g.appendChild(c); });
    const t = $('arToday'); if (t) t.textContent = 'Left to earn today: ' + leftToday(); paintCoins();
  }
  function open(id) {
    const g = GAMES.find(x => x.id === id); if (!g || !unlocked(g)) return; closeGame(); cur = id; const st = $('arStage'); st.hidden = false; st.innerHTML = '<div class="ar-sh"><h3>' + g.e + ' ' + E(g.n) + '</h3><button type="button" class="sbtn" data-arclose>Close</button></div><div id="arGame"></div>';
    st.querySelector('[data-arclose]').onclick = () => { closeGame(); };
    ({ memory, reaction, runner })[id]($('arGame')); st.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function closeGame() { if (stop) { try { stop(); } catch (e) {} stop = null; } cur = null; const st = $('arStage'); if (st) { st.hidden = true; st.innerHTML = ''; } paint(); }
  function result(host, html) { const r = document.createElement('div'); r.className = 'ar-res'; r.innerHTML = html; host.appendChild(r); return r; }
  const coinLine = got => got > 0 ? '<b>+' + got + ' 🪙</b>' : '<span>No coins this time: you hit today\'s ' + CAP + ' coin limit.</span>';

  /* ---------- Memory Match ---------- */
  function memory(host) {
    const EM = ['🦖', '🌵', '🔥', '⭐', '🍕', '🎧', '🌙', '💎'], deck = EM.concat(EM).map((e, i) => ({ e, i, id: Math.random() })).sort((a, b) => a.id - b.id);
    let open1 = null, lock = false, moves = 0, found = 0;
    host.innerHTML = '<p class="ar-stat">Moves: <b id="arMv">0</b> · Pairs: <b id="arPr">0</b> / 8</p><div class="ar-mem" role="group" aria-label="Memory cards"></div>';
    const grid = host.querySelector('.ar-mem');
    deck.forEach((c, n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ar-cardb'; b.setAttribute('aria-label', 'Card ' + (n + 1) + ', face down'); b.dataset.n = n; grid.appendChild(b); });
    grid.addEventListener('click', e => {
      const b = e.target.closest('.ar-cardb'); if (!b || lock || b.classList.contains('up') || b.classList.contains('done')) return; const c = deck[+b.dataset.n];
      b.classList.add('up'); b.textContent = c.e; b.setAttribute('aria-label', 'Card ' + (+b.dataset.n + 1) + ', ' + c.e);
      if (!open1) { open1 = b; return; }
      moves++; $('arMv').textContent = moves; const a = open1; open1 = null;
      if (deck[+a.dataset.n].e === c.e) { a.classList.add('done'); b.classList.add('done'); found++; $('arPr').textContent = found; if (found === 8) finish(); }
      else { lock = true; setTimeout(() => { [a, b].forEach(x => { x.classList.remove('up'); x.textContent = ''; x.setAttribute('aria-label', 'Card ' + (+x.dataset.n + 1) + ', face down'); }); lock = false; }, 750); }
    });
    function finish() { const got = award(Math.max(5, Math.min(24, 32 - moves)), 'memory'), nb = best('memory', moves, true); result(host, '<h4>You did it in ' + moves + ' moves! ' + (nb ? '🏆 New best' : '') + '</h4><p>' + coinLine(got) + '</p><button type="button" class="btn btn-primary" data-again>Play again</button>').querySelector('[data-again]').onclick = () => open('memory'); say('Memory Match complete: ' + moves + ' moves'); paint0(); }
  }
  const paint0 = () => { const t = $('arToday'); if (t) t.textContent = 'Left to earn today: ' + leftToday(); };

  /* ---------- Reaction Test ---------- */
  function reaction(host) {
    let round = 0, times = [], state = 'idle', timer = 0, t0 = 0;
    host.innerHTML = '<p class="ar-stat">Round <b id="arRd">1</b> of 3</p><button type="button" class="ar-react" id="arBox" aria-live="assertive">Click to start</button>';
    const box = $('arBox');
    function set(cls, text) { box.className = 'ar-react ' + cls; box.textContent = text; }
    box.addEventListener('click', () => {
      if (state === 'idle') { state = 'wait'; set('wait', 'Wait for green…'); timer = setTimeout(() => { state = 'go'; t0 = performance.now(); set('go', 'CLICK NOW!'); }, 1500 + Math.random() * 2500); }
      else if (state === 'wait') { clearTimeout(timer); state = 'idle'; set('early', 'Too early! Click to try this round again.'); }
      else if (state === 'go') { const ms = Math.round(performance.now() - t0); times.push(ms); round++; if (round < 3) { state = 'idle'; $('arRd').textContent = round + 1; set('idle', ms + ' ms. Click for the next round.'); } else { state = 'done'; finish(); } }
    });
    stop = () => clearTimeout(timer);
    function finish() { const avg = Math.round(times.reduce((a, b) => a + b, 0) / 3), c = avg < 250 ? 25 : avg < 350 ? 15 : avg < 500 ? 8 : 3, got = award(c, 'reaction'), nb = best('reaction', avg, true); set('idle', 'Average ' + avg + ' ms'); result(host, '<h4>' + times.join(' ms, ') + ' ms ' + (nb ? '🏆 New best' : '') + '</h4><p>' + coinLine(got) + '</p><button type="button" class="btn btn-primary" data-again>Play again</button>').querySelector('[data-again]').onclick = () => open('reaction'); say('Reaction Test: ' + avg + ' ms average'); paint0(); }
  }

  /* ---------- Rex Runner ---------- */
  function runner(host) {
    host.innerHTML = '<p class="ar-stat">Score: <b id="arSc">0</b></p><canvas id="arCv" width="640" height="200" tabindex="0" role="img" aria-label="Rex Runner game. Press space or tap to jump."></canvas><p class="ar-hint">Press Space or Arrow Up, or tap the game, to jump.</p><div><button type="button" class="btn btn-primary" id="arGo">Start</button></div>';
    const cv = $('arCv'), cx = cv.getContext('2d'), GY = 160; let y = 0, vy = 0, obs = [], dist = 0, speed = 280, running = false, raf = 0, last = 0, spawnIn = 400, over = false;
    function jump() { if (!running) return; if (y <= 0) vy = 780; }
    function draw() {
      cx.clearRect(0, 0, 640, 200); cx.fillStyle = 'rgba(128,128,160,.25)'; cx.fillRect(0, GY + 4, 640, 2);
      cx.font = '34px serif'; cx.textBaseline = 'alphabetic'; cx.fillText('🦖', 50, GY - y);
      obs.forEach(o => { cx.font = o.h + 'px serif'; cx.fillText('🌵', o.x, GY); });
    }
    function frame(t) {
      raf = requestAnimationFrame(frame); const active = view.classList.contains('active') && !document.hidden; if (!active) { last = 0; return; }
      if (!last) { last = t; return; } const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!running) return;
      vy -= 2300 * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
      speed = 280 + dist / 14; dist += speed * dt; spawnIn -= speed * dt;
      if (spawnIn <= 0) { const h = 28 + Math.floor(Math.random() * 14); obs.push({ x: 650, h }); spawnIn = 260 + Math.random() * 280 + speed * 0.35; }
      obs.forEach(o => { o.x -= speed * dt; }); obs = obs.filter(o => o.x > -40);
      const hit = obs.some(o => o.x < 50 + 26 && o.x + o.h * 0.55 > 50 + 8 && y < o.h * 0.7);
      $('arSc').textContent = Math.floor(dist / 10); draw();
      if (hit) end();
    }
    function end() { running = false; over = true; const sc = Math.floor(dist / 10), got = sc >= 40 ? award(Math.min(25, Math.floor(sc / 40)), 'runner') : (award(0, 'runner'), 0), nb = best('runner', sc, false); $('arGo').textContent = 'Run again'; $('arGo').hidden = false; result(host, '<h4>Game over: ' + sc + ' ' + (nb ? '🏆 New best' : '') + '</h4><p>' + (sc >= 40 ? coinLine(got) : '<span>Reach 40 to earn coins.</span>') + '</p>'); say('Rex Runner: ' + sc); paint0(); }
    function start() { host.querySelectorAll('.ar-res').forEach(n => n.remove()); y = 0; vy = 0; obs = []; dist = 0; speed = 280; spawnIn = 400; over = false; running = true; $('arGo').hidden = true; $('arSc').textContent = '0'; cv.focus({ preventScroll: true }); }
    $('arGo').onclick = start; cv.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
    const key = e => { if (!view.classList.contains('active') || !running) return; if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    document.addEventListener('keydown', key); raf = requestAnimationFrame(frame); draw();
    stop = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); };
    window.__arDebug = { get: () => ({ running, over, dist: Math.floor(dist / 10) }), hit: () => { dist = Math.max(dist, 500); end(); } };
  }

  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'arcade') paint(); else if (cur) closeGame(); } catch (e) { console.error('Arcade', e); } return r; };
  try { if (typeof views === 'object') views.arcade = ['Rex Arcade', 'Small games that unlock with your Dev Clock time']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Rex Arcade')) COMMANDS.push({ name: 'Open Rex Arcade', run: () => showView('arcade') }); } catch (e) {}
  window.RexPlay = { load, mutate, award, spend, hours, unlocked, games: GAMES, cap: CAP, leftToday, paint, open, today };
})();
