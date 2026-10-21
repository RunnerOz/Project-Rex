/* Project Rex Center 12.12.0 - Rex Pals and the Daily Mystery Egg (free, local).
   Little creature friends you collect. Some arrive as gifts for real progress (Dev Clock time, sessions, achievements, Story Mode places),
   the rest hatch from one free egg a day. Up to 3 pals can visit Rex's Room. There is no penalty for skipping a day, and nothing is sent anywhere.
   The egg is a plain random draw on your device (about half coins, a quarter room items, a quarter pals).
   Own data: rex1312_pals = { pals:{id:{name,at}}, visiting:[ids], egg:{d}, hatched, seen }. Coins and room items go through Rex's Arcade/Room data. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-pals'); if (!view || !window.RexPlay) return;
  const P = window.RexPlay, K = 'rex1312_pals', E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PALS = [
    { id: 'sloth', e: '🦥', n: 'Sloth', r: 'rare', ach: 3, t: 'Earn 3 achievements' },
    { id: 'fox', e: '🦊', n: 'Fox', r: 'common', hrs: 2, t: 'Reach 2 hours on the Dev Clock' },
    { id: 'turtle', e: '🐢', n: 'Turtle', r: 'common', sess: 5, t: 'Finish 5 Dev Clock sessions' },
    { id: 'penguin', e: '🐧', n: 'Penguin', r: 'rare', hrs: 30, t: 'Reach 30 hours on the Dev Clock' },
    { id: 'owl', e: '🦉', n: 'Owl', r: 'rare', sess: 20, t: 'Finish 20 Dev Clock sessions' },
    { id: 'dragon', e: '🐉', n: 'Dragon', r: 'legendary', hrs: 55, t: 'Reach Ashfall Volcano in Story Mode (55 hours)' },
    { id: 'cat', e: '🐱', n: 'Cat', r: 'common', egg: 1 }, { id: 'rabbit', e: '🐰', n: 'Rabbit', r: 'common', egg: 1 }, { id: 'frog', e: '🐸', n: 'Frog', r: 'common', egg: 1 }, { id: 'duck', e: '🦆', n: 'Duck', r: 'common', egg: 1 }, { id: 'chick', e: '🐥', n: 'Chick', r: 'common', egg: 1 },
    { id: 'bee', e: '🐝', n: 'Bee', r: 'common', egg: 1 }, { id: 'butterfly', e: '🦋', n: 'Butterfly', r: 'rare', egg: 1 }, { id: 'panda', e: '🐼', n: 'Panda', r: 'rare', egg: 1 }, { id: 'octopus', e: '🐙', n: 'Octopus', r: 'rare', egg: 1 }, { id: 'unicorn', e: '🦄', n: 'Unicorn', r: 'legendary', egg: 1 }
  ];
  const byId = id => PALS.find(p => p.id === id);
  function load() { let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {} o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const pals = {}; if (o.pals && typeof o.pals === 'object') Object.keys(o.pals).forEach(id => { if (byId(id) && o.pals[id] && typeof o.pals[id] === 'object') pals[id] = { name: String(o.pals[id].name || '').slice(0, 20), at: +o.pals[id].at || 0 }; });
    return { pals, visiting: (Array.isArray(o.visiting) ? o.visiting : []).filter(id => pals[id]).slice(0, 3), egg: { d: o.egg && typeof o.egg.d === 'string' ? o.egg.d : '' }, hatched: Math.max(0, Math.floor(+o.hatched || 0)), seen: o.seen ? 1 : 0 }; }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function mut(fn) { const o = load(); fn(o); save(o); try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (e) {} return o; }
  const ready = () => load().egg.d !== P.today();
  const sessN = () => { try { const d = JSON.parse(localStorage.getItem('rex_dev_clock_data') || 'null'); return d && Array.isArray(d.sessions) ? d.sessions.length : 0; } catch (e) { return 0; } };
  const achN = () => { try { return window.RexAch2 ? RexAch2.list().filter(c => c.earned > 0).length : 0; } catch (e) { return 0; } };
  const earned = p => (p.ach ? achN() >= p.ach : p.hrs ? P.hours() >= p.hrs : p.sess ? sessN() >= p.sess : false);
  const toastN = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) {} };

  function sync(quiet) {
    const o = load(), got = PALS.filter(p => !p.egg && !o.pals[p.id] && earned(p));
    if (got.length || !o.seen) mut(x => { got.forEach(p => { x.pals[p.id] = { name: '', at: Date.now() }; }); if (!x.visiting.length && got.length) x.visiting = got.slice(0, 1).map(p => p.id); x.seen = 1; });
    if (o.seen && !quiet) got.slice(0, 3).forEach(p => toastN('🎁 A new pal arrived: ' + p.e + ' ' + p.n + '!'));
    return got;
  }

  /* ---------- the daily egg ---------- */
  function roll() {
    const o = load(), r = Math.random(), freePals = PALS.filter(p => p.egg && !o.pals[p.id]), have = P.load().owned;
    const items = (window.RexRoom ? RexRoom.items : []).filter(it => it.cost && it.cost <= 40 && !have.includes(it.id));
    const w = []; w.push(['coins', 50]); if (items.length) w.push(['item', 25]); if (freePals.length) w.push(['pal', 25]);
    const sum = w.reduce((a, b) => a + b[1], 0); let x = r * sum, kind = 'coins'; for (const [k, v] of w) { if (x < v) { kind = k; break; } x -= v; }
    if (kind === 'pal') { const rare = freePals.filter(p => p.r === 'legendary'), pool = rare.length && Math.random() < 0.08 ? rare : freePals.filter(p => p.r !== 'legendary').concat(freePals.filter(p => p.r === 'legendary' && Math.random() < 0.1)); const pick = (pool.length ? pool : freePals)[Math.floor(Math.random() * (pool.length ? pool.length : freePals.length))]; return { kind, pal: pick }; }
    if (kind === 'item') return { kind, item: items[Math.floor(Math.random() * items.length)] };
    return { kind: 'coins', coins: 5 + Math.floor(Math.random() * 11) };
  }
  let busy = false;
  function claim() {
    if (busy || !ready()) return; busy = true; const res = roll();
    mut(o => { o.egg.d = P.today(); o.hatched++; if (res.kind === 'pal') { o.pals[res.pal.id] = { name: '', at: Date.now() }; if (o.visiting.length < 3) o.visiting.push(res.pal.id); } });
    if (res.kind === 'coins') P.mutate(o => { o.coins += res.coins; o.total += res.coins; });
    else if (res.kind === 'item') P.mutate(o => { if (!o.owned.includes(res.item.id)) o.owned.push(res.item.id); });
    const box = $('plEgg'); if (box) { box.classList.add('hatching'); }
    const done = () => { busy = false; reveal(res); paint(); };
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) done(); else setTimeout(done, 1500);
  }
  function reveal(res) {
    const r = $('plReveal'); if (!r) return; let h;
    if (res.kind === 'coins') h = '<div class="pl2-big">🪙</div><b>+' + res.coins + ' coins!</b><small>Spend them in Rex\'s Room.</small>';
    else if (res.kind === 'item') h = '<div class="pl2-big">' + (res.item.e || '🎨') + '</div><b>A new room item: ' + E(res.item.n) + '</b><small>It is waiting in Rex\'s Room. Place it when you like.</small>';
    else h = '<div class="pl2-big">' + res.pal.e + '</div><b>A new pal hatched: ' + E(res.pal.n) + '!</b><small>' + (res.pal.r === 'legendary' ? '✨ Legendary! ✨ ' : res.pal.r === 'rare' ? 'A rare one. ' : '') + 'Give it a name below.</small>';
    r.innerHTML = h; r.hidden = false; r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop');
  }

  /* ---------- page ---------- */
  function build() {
    if (view.dataset.pl2) return; view.dataset.pl2 = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">FRIENDS</span><h2>Rex Pals</h2><p>Collect little friends. Some arrive for real progress, the rest hatch from a free egg each day. Up to 3 can visit <a href="#" data-pl2room>Rex\'s Room</a>.</p></div><div class="ar-bank"><b>🪙 <span data-rexcoins>0</span></b><small id="plCount"></small></div></header>' +
      '<section class="card pl2-eggc"><div class="pl2-egg" id="plEgg" aria-hidden="true">🥚</div><div class="pl2-egt"><h3>Daily Mystery Egg</h3><p id="plEggT"></p><button type="button" class="btn btn-primary" id="plClaim">Hatch today\'s egg</button><div class="pl2-rev" id="plReveal" role="status" aria-live="polite" hidden></div></div></section>' +
      '<section class="card"><div class="card-title"><h3>📖 Pal book</h3></div><div class="pl2-grid" id="plBook"></div></section><p class="ar-note">There is no penalty for skipping a day. The egg is a simple random draw on your device, and nothing leaves it.</p>';
    view.addEventListener('click', e => {
      if (e.target.closest('[data-pl2room]')) { e.preventDefault(); showView('room'); return; }
      if (e.target.closest('#plClaim')) { claim(); return; }
      const v = e.target.closest('[data-pl2visit]'); if (v) { const id = v.dataset.pl2visit; const o = load(); if (o.visiting.includes(id)) mut(x => { x.visiting = x.visiting.filter(y => y !== id); }); else if (o.visiting.length >= 3) toastN('Up to 3 pals can visit at once. Send one home first.', 'warn'); else mut(x => { x.visiting.push(id); }); paint(); }
    });
    view.addEventListener('change', e => { const n = e.target.closest('[data-pl2name]'); if (!n) return; const id = n.dataset.pl2name; mut(x => { if (x.pals[id]) x.pals[id].name = n.value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20); }); paint(); });
  }
  function paint() {
    build(); const o = load(), rd = ready();
    const eg = $('plEgg'), t = $('plEggT'), b = $('plClaim'); if (!eg) return; if (!busy) eg.classList.remove('hatching'); eg.classList.toggle('ready', rd);
    t.textContent = rd ? 'A fresh egg is waiting. What will hatch? Coins, a room item, or a new pal.' : 'Today\'s egg is hatched. A new one will be ready tomorrow.'; b.disabled = !rd || busy; b.textContent = rd ? 'Hatch today\'s egg' : 'Come back tomorrow';
    const have = PALS.filter(p => o.pals[p.id]).length; $('plCount').textContent = have + ' of ' + PALS.length + ' pals · ' + o.hatched + ' eggs hatched';
    const g = $('plBook'); g.innerHTML = '';
    PALS.forEach(p => { const own = o.pals[p.id], c = document.createElement('div'); c.className = 'pl2-pal ' + p.r + (own ? '' : ' lock');
      if (own) { const vis = o.visiting.includes(p.id); c.innerHTML = '<div class="pl2-pe" aria-hidden="true">' + p.e + '</div><b>' + E(own.name || p.n) + '</b><small>' + E(p.n) + ' · ' + p.r + '</small><input type="text" maxlength="20" data-pl2name="' + p.id + '" value="' + E(own.name) + '" placeholder="Give it a name" aria-label="Name for your ' + E(p.n) + '"><button type="button" class="sbtn' + (vis ? '' : ' primary') + '" data-pl2visit="' + p.id + '" aria-pressed="' + vis + '">' + (vis ? 'Visiting ✓ (send home)' : 'Invite to the room') + '</button>'; }
      else c.innerHTML = '<div class="pl2-pe" aria-hidden="true">❓</div><b>???</b><small>' + p.r + '</small><small>' + E(p.t || 'Hatches from the daily egg') + '</small>';
      g.appendChild(c); });
    document.querySelectorAll('[data-rexcoins]').forEach(n => { n.textContent = P.load().coins; });
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'pals') { sync(); paint(); } else if (n === 'home' || n === 'room') sync(); } catch (e) { console.error('Pals', e); } return r; };
  try { if (typeof views === 'object') views.pals = ['Rex Pals', 'Collect pals and hatch a daily egg']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Rex Pals')) COMMANDS.push({ name: 'Open Rex Pals', run: () => showView('pals') }); } catch (e) {}
  setTimeout(() => { try { sync(); } catch (e) {} }, 1500);
  window.RexPals = { load, sync, ready, claim, roll, pals: PALS, visiting: () => load().visiting.map(id => { const p = byId(id), o = load().pals[id]; return p && o ? { id, e: p.e, n: o.name || p.n } : null; }).filter(Boolean) };
})();
