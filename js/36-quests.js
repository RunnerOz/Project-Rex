/* Project Rex Center 12.14.0 - Rex Quests (free, local, no accounts, nothing is sent anywhere).
   Three small goals each day and two each week, worth coins for Rex's Room. Progress is only counted from numbers Rex already keeps
   (messages sent, arcade plays, eggs hatched, Dev Clock hours, pages you open). Each goal is measured from when that day or week began on this device,
   so old activity never counts. There is no penalty for skipping a day: the streak simply starts again.
   Own data: rex1400_quests = { day:{d,base,ids,claimed,notified,views,bonus}, week:{w,base,ids,claimed,notified,days}, streak:{cur,best,last}, earned, done }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-quests'); if (!view || !window.RexPlay) return;
  const P = window.RexPlay, K = 'rex1400_quests', DAY = 864e5;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) { /* ignore */ } };

  /* ---------- quest lists ---------- */
  const DAILY = [
    { id: 'send1', e: '✉️', t: 'Send a message', m: 'sent', n: 1, r: 15, go: 'builder', g: 'send' },
    { id: 'send3', e: '📨', t: 'Send 3 messages', m: 'sent', n: 3, r: 30, go: 'builder', g: 'send' },
    { id: 'play1', e: '🎮', t: 'Play a Rex Arcade game', m: 'plays', n: 1, r: 15, go: 'arcade', g: 'play', need: 'arcade' },
    { id: 'play2', e: '🕹️', t: 'Play 2 arcade games', m: 'plays', n: 2, r: 25, go: 'arcade', g: 'play', need: 'arcade' },
    { id: 'egg', e: '🥚', t: 'Hatch today\'s egg', m: 'hatched', n: 1, r: 10, go: 'pals', need: 'egg' },
    { id: 'jrn', e: '📓', t: 'Write today\'s journal entry', m: 'jrn', n: 1, r: 15, go: 'journal' },
    { id: 'hab', e: '💧', t: 'Water a plant in your Habit Garden', m: 'hab', n: 1, r: 15, go: 'garden' },
    { id: 'fsess', e: '🌧️', t: 'Finish a Focus Room session', m: 'fsess', n: 1, r: 25, go: 'focusrooms' },
    { id: 'focus', e: '⏱️', t: 'Log 30 minutes on the Dev Clock', m: 'hours', n: 0.5, r: 25, go: 'clock' },
    { id: 'explore', e: '🧭', t: 'Visit 4 different pages', m: 'views', n: 4, r: 10 },
    { id: 'wclock', e: '🌍', t: 'Open the World Clock', m: 'seen:worldclock', n: 1, r: 10, go: 'worldclock' }
  ];
  const WEEKLY = [
    { id: 'wdays', e: '📅', t: 'Open Rex on 4 different days', m: 'days', n: 4, r: 60 },
    { id: 'wsend', e: '📬', t: 'Send 10 messages', m: 'sent', n: 10, r: 80, go: 'builder' },
    { id: 'wfocus', e: '🔥', t: 'Log 3 hours on the Dev Clock', m: 'hours', n: 3, r: 100, go: 'clock' },
    { id: 'wjrn', e: '📖', t: 'Write in your journal on 4 days', m: 'jrn', n: 4, r: 60, go: 'journal' },
    { id: 'whab', e: '🌿', t: 'Water your garden 10 times', m: 'hab', n: 10, r: 70, go: 'garden' },
    { id: 'wfs', e: '🌌', t: 'Spend 2 hours in Focus Rooms', m: 'fmin', n: 120, r: 90, go: 'focusrooms' },
    { id: 'wplay', e: '🏆', t: 'Play 5 arcade games', m: 'plays', n: 5, r: 70, go: 'arcade', need: 'arcade' },
    { id: 'wegg', e: '🐣', t: 'Hatch 3 eggs', m: 'hatched', n: 3, r: 60, go: 'pals' }
  ];
  const byId = id => DAILY.concat(WEEKLY).find(q => q.id === id);

  /* ---------- time keys ---------- */
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
  const weekKey = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); };   // Monday of this week
  function rng(seed) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }

  /* ---------- reading the numbers Rex already keeps ---------- */
  function snap() {
    let sent = 0; try { if (typeof state !== 'undefined' && Array.isArray(state.workspaces)) state.workspaces.forEach(w => { sent += Math.max(0, +w.sent || 0); }); } catch (e) { /* ignore */ }
    let plays = 0; try { Object.values(P.load().plays || {}).forEach(v => { plays += Math.max(0, +v || 0); }); } catch (e) { /* ignore */ }
    let hatched = 0; try { hatched = Math.max(0, +(JSON.parse(localStorage.getItem('rex1312_pals') || '{}').hatched) || 0); } catch (e) { /* ignore */ }
    let hours = 0; try { hours = Math.max(0, +P.hours() || 0); } catch (e) { /* ignore */ }
    let fsess = 0, fmin = 0; try { const f = JSON.parse(localStorage.getItem('rex1600_focus') || '{}'); (f.sessions || []).forEach(x => { fsess++; fmin += Math.max(0, +x.min || 0); }); } catch (e) { /* ignore */ }
    let jrn = 0, hab = 0; try { jrn = Object.keys(JSON.parse(localStorage.getItem('rex2000_journal') || '{}').e || {}).length; } catch (e) { /* ignore */ } try { const d = JSON.parse(localStorage.getItem('rex2001_garden') || '{}').d || {}; Object.keys(d).forEach(k => { hab += Array.isArray(d[k]) ? d[k].length : 0; }); } catch (e) { /* ignore */ }
    return { sent, plays, hatched, hours, fsess, fmin, jrn, hab };
  }
  const arcadeOpen = () => { try { return P.unlocked(P.games[0]); } catch (e) { return false; } };
  const eggOpen = () => { try { return (JSON.parse(localStorage.getItem('rex1312_pals') || '{}').egg || {}).d !== P.today(); } catch (e) { return true; } };
  const okFor = q => !q.need || (q.need === 'arcade' ? arcadeOpen() : eggOpen());

  /* ---------- saved data ---------- */
  function load() {
    let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { /* ignore */ }
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const arr = v => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 40) : [];
    const baseOf = b => { const s = snap(), r = {}; Object.keys(s).forEach(k => { r[k] = b && typeof b[k] === 'number' && isFinite(b[k]) ? b[k] : s[k]; }); return r; };
    const per = (x, key) => x && typeof x === 'object' && typeof x[key] === 'string' ? { [key]: x[key], base: baseOf(x.base), ids: arr(x.ids).filter(id => byId(id)), claimed: arr(x.claimed), notified: arr(x.notified), views: arr(x.views), days: arr(x.days), bonus: !!x.bonus } : null;
    const st = o.streak && typeof o.streak === 'object' ? o.streak : {}, n = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : 0;
    return { day: per(o.day, 'd'), week: per(o.week, 'w'), streak: { cur: n(st.cur), best: n(st.best), last: typeof st.last === 'string' ? st.last : '' }, earned: n(o.earned), done: n(o.done) };
  }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }

  function pick(list, count, seed, pool) {
    const r = rng(seed), ok = list.filter(q => okFor(q)), out = [], used = {};
    for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
    if (pool === 'week') { const d = ok.findIndex(q => q.id === 'wdays'); if (d > 0) { const x = ok.splice(d, 1)[0]; ok.unshift(x); } }
    for (const q of ok) { if (out.length >= count) break; if (q.g && used[q.g]) continue; if (q.g) used[q.g] = 1; out.push(q.id); }
    return out;
  }
  /* make sure today's and this week's quests exist; a new day/week starts counting from right now */
  function ensure() {
    const o = load(), d = dayKey(), w = weekKey(); let changed = false;
    if (!o.day || o.day.d !== d) { o.day = { d, base: snap(), ids: pick(DAILY, 3, 'd' + d, 'day'), claimed: [], notified: [], views: [], days: [], bonus: false }; changed = true; }
    if (!o.week || o.week.w !== w) { o.week = { w, base: snap(), ids: pick(WEEKLY, 2, 'w' + w, 'week'), claimed: [], notified: [], views: [], days: [], bonus: false }; changed = true; }
    if (o.week.days.indexOf(d) < 0) { o.week.days.push(d); changed = true; }
    if (changed) save(o);
    return o;
  }
  const progress = (q, per, o) => {
    const s = snap(); let cur;
    if (q.m === 'views') cur = per.views.length; else if (q.m === 'days') cur = per.days.length; else if (q.m.indexOf('seen:') === 0) cur = per.views.indexOf(q.m.slice(5)) >= 0 ? 1 : 0;
    else cur = Math.max(0, s[q.m] - per.base[q.m]);
    return { cur: Math.min(cur, q.n), done: cur >= q.n - 1e-9 };
  };
  const fmt = (q, v) => q.m === 'hours' ? Math.round(v * 60) + ' min' : (Math.round(v * 100) / 100) + '';
  const tgt = q => q.m === 'hours' ? Math.round(q.n * 60) + ' min' : String(q.n);

  /* ---------- actions ---------- */
  function claim(scope, id) {
    const o = ensure(), per = scope === 'week' ? o.week : o.day, q = byId(id); if (!q || per.ids.indexOf(id) < 0 || per.claimed.indexOf(id) >= 0) return 0;
    if (!progress(q, per, o).done) return 0;
    per.claimed.push(id); o.earned += q.r; o.done++;
    if (scope === 'day' && per.ids.every(x => per.claimed.indexOf(x) >= 0)) {
      const y = yesterdayKey(), d = per.d;
      if (o.streak.last !== d) { o.streak.cur = o.streak.last === y ? o.streak.cur + 1 : 1; o.streak.last = d; o.streak.best = Math.max(o.streak.best, o.streak.cur); }
    }
    save(o); try { P.mutate(c => { c.coins += q.r; c.total += q.r; }); } catch (e) { /* ignore */ }
    say('🎯 Quest done: +' + q.r + ' 🪙'); paint(); return q.r;
  }
  const bonusAmt = o => 15 + Math.min(20, 5 * Math.max(0, o.streak.cur - 1));
  function claimBonus() {
    const o = ensure(), per = o.day; if (per.bonus || !per.ids.length || !per.ids.every(x => per.claimed.indexOf(x) >= 0)) return 0;
    const n = bonusAmt(o); per.bonus = true; o.earned += n; save(o); try { P.mutate(c => { c.coins += n; c.total += n; }); } catch (e) { /* ignore */ }
    say('🌟 Daily bonus: +' + n + ' 🪙'); paint(); return n;
  }
  function noteViews(name) {
    if (!name) return; const o = ensure(); let ch = false;
    if (o.day.views.indexOf(name) < 0 && o.day.views.length < 40) { o.day.views.push(name); ch = true; }
    if (ch) save(o);
  }
  /* tell the person once when a goal becomes ready to claim */
  function check() {
    const o = ensure(); let ch = false;
    [o.day, o.week].forEach(per => per.ids.forEach(id => { const q = byId(id); if (q && per.claimed.indexOf(id) < 0 && per.notified.indexOf(id) < 0 && progress(q, per, o).done) { per.notified.push(id); ch = true; say('🎯 Quest ready to claim: ' + q.t, 'info'); } }));
    if (ch) save(o);
  }

  /* ---------- page ---------- */
  function row(scope, q, per, o) {
    const p = progress(q, per, o), cl = per.claimed.indexOf(q.id) >= 0, pct = Math.round(p.cur / q.n * 100);
    return '<li class="qs-q' + (cl ? ' done' : p.done ? ' ready' : '') + '"><span class="qs-e" aria-hidden="true">' + q.e + '</span><div class="qs-b"><b>' + E(q.t) + '</b><div class="qs-bar" role="progressbar" aria-label="' + E(q.t) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div><small>' + E(fmt(q, p.cur)) + ' of ' + E(tgt(q)) + '</small></div>' +
      '<div class="qs-a">' + (cl ? '<span class="qs-ok">Claimed ✓</span>' : p.done ? '<button type="button" class="btn btn-primary" data-qclaim="' + scope + ':' + q.id + '">Claim +' + q.r + ' 🪙</button>' : '<span class="qs-r">+' + q.r + ' 🪙</span>' + (q.go ? '<button type="button" class="btn btn-ghost" data-qgo="' + q.go + '">Go</button>' : '')) + '</div></li>';
  }
  function build() {
    if (view.dataset.qs) return; view.dataset.qs = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">GOALS</span><h2>Rex Quests</h2><p>Three small goals a day and two a week. Rewards are coins for <a href="#" data-qroom>Rex\'s Room</a>. Rex counts from when each day or week started on this device.</p></div><div class="ar-bank"><b>🪙 <span data-rexcoins>0</span></b><small id="qsStreak"></small></div></header>' +
      '<section class="card"><div class="card-title"><h3>☀️ Today</h3><small id="qsDayT"></small></div><ul class="qs-list" id="qsDay"></ul><div class="qs-bonus" id="qsBonus"></div></section>' +
      '<section class="card"><div class="card-title"><h3>📅 This week</h3><small id="qsWeekT"></small></div><ul class="qs-list" id="qsWeek"></ul></section>' +
      '<p class="ar-note">There is no penalty for skipping a day: a missed streak just starts again. Everything is counted on this device from numbers Rex already keeps. Nothing is sent anywhere.</p>';
    view.addEventListener('click', e => {
      if (e.target.closest('[data-qroom]')) { e.preventDefault(); showView('room'); return; }
      const c = e.target.closest('[data-qclaim]'); if (c) { const [s, id] = c.dataset.qclaim.split(':'); claim(s, id); return; }
      const g = e.target.closest('[data-qgo]'); if (g) { showView(g.dataset.qgo); return; }
      if (e.target.closest('[data-qbonus]')) claimBonus();
    });
  }
  function paint() {
    build(); const o = ensure(), d = $('qsDay'); if (!d) return;
    d.innerHTML = o.day.ids.map(id => row('day', byId(id), o.day, o)).join(''); $('qsWeek').innerHTML = o.week.ids.map(id => row('week', byId(id), o.week, o)).join('');
    const left = o.day.ids.filter(id => o.day.claimed.indexOf(id) < 0).length, wl = o.week.ids.filter(id => o.week.claimed.indexOf(id) < 0).length;
    $('qsDayT').textContent = left ? left + ' left today' : 'All done today 🎉'; $('qsWeekT').textContent = wl ? wl + ' left this week' : 'All done this week 🎉';
    const all = o.day.ids.length > 0 && !left, live = o.streak.last === dayKey() || o.streak.last === yesterdayKey() ? o.streak.cur : 0;
    $('qsStreak').textContent = (live ? '🔥 ' + live + '-day streak' : 'No streak yet') + ' · best ' + o.streak.best;
    $('qsBonus').innerHTML = !all ? '<small>Finish all three to unlock a daily bonus.</small>' : o.day.bonus ? '<span class="qs-ok">Daily bonus claimed ✓</span>' : '<button type="button" class="btn btn-primary" data-qbonus="1">🌟 Claim daily bonus +' + bonusAmt(o) + ' 🪙</button>';
    try { P.paint && document.querySelectorAll('[data-rexcoins]').forEach(n => { n.textContent = P.load().coins; }); } catch (e) { /* ignore */ }
  }
  let timer = null;
  const active = () => view.classList.contains('active');
  function tick() { try { ensure(); check(); if (active()) paint(); } catch (e) { console.error('Quests', e); } }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { noteViews(n); if (n === 'quests') paint(); check(); } catch (e) { console.error('Quests', e); } return r; };
  try { if (typeof views === 'object') views.quests = ['Rex Quests', 'Daily and weekly goals for coins']; } catch (e) { /* ignore */ }
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Rex Quests')) COMMANDS.push({ name: 'Open Rex Quests', run: () => showView('quests') }); } catch (e) { /* ignore */ }
  document.addEventListener('rexplay', () => { try { check(); if (active()) paint(); } catch (e) { /* ignore */ } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  ensure(); timer = setInterval(tick, 30000);
  window.RexQuests = { load, ensure, snap, claim, claimBonus, daily: DAILY, weekly: WEEKLY, progress: (scope, id) => { const o = ensure(), per = scope === 'week' ? o.week : o.day; return progress(byId(id), per, o); }, check };
})();
