/* Project Rex Center 12.3.0 - Achievements 2.0.
   Builds on the existing Achievements (Bronze/Silver/Gold from real usage) and adds:
   a Platinum tier, 4 new achievements, 6 secret achievements, categories, points + levels,
   "Next up" and "Recent unlocks". Everything comes from data already in this browser.
   Storage: reads the old key rex110_achievements (never changed) and keeps its own new
   unlocks in rex163_ach. "Rarity" here means how hard a tier is, NOT a ranking against other
   people: Rex has no server, so there are no global statistics. */
(function () {
  'use strict';
  const V = window.RexV110; if (!V || !Array.isArray(V.ACH)) return;
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex163_ach';
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const say = (m) => { try { if (typeof toast === 'function') toast(m, 'success'); } catch (e) {} };

  const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'], RARITY = ['Common', 'Uncommon', 'Rare', 'Epic'], PTS = [10, 25, 50, 100];
  const CATS = [['all', 'All'], ['build', '🧱 Build'], ['time', '⏱️ Time'], ['studio', '🧩 Rex Studio'], ['safety', '🛡️ Safety'], ['social', '🧑‍🤝‍🧑 Social'], ['events', '🎃 Events'], ['custom', '🎨 Customize'], ['secret', '🕵️ Secrets']];
  const CAT = { sender: 'build', templates: 'build', events: 'build', hours: 'time', streak: 'time', focus: 'time', holidayfan: 'events', party: 'events', projects: 'studio', finisher: 'studio', notes: 'studio', workflows: 'studio', safety: 'safety', backupfile: 'safety', friends: 'social', installed: 'custom' };
  const PLAT = { sender: 500, templates: 30, events: 40, hours: 150, streak: 60, focus: 300, holidayfan: 20, party: 20, projects: 25, finisher: 200, notes: 100, workflows: 25, safety: 25, friends: 25 };

  /* ---------- extra real metrics ---------- */
  function sessions() { const c = read('rex_dev_clock_data', {}) || {}; return Array.isArray(c.sessions) ? c.sessions.filter(s => s && isFinite(s.start)) : []; }
  function eventStats() {
    let rewards = 0, skins = 0, events = new Set();
    try {
      const s = RexEvents._state(), BY = {}; RexEvents.EV.forEach(d => { BY[d.key] = d; });
      Object.keys(s.P.claimed).forEach(k => {
        const iid = k.split(':')[0], rid = k.slice(iid.length + 1), key = iid.replace(/-\d+$/, ''), d = BY[key];
        const r = d && RexEvents.rewardsOf(d).find(x => x.id === rid); if (!r) return;
        rewards++; events.add(iid); if (r.kind === 'skin') skins++;
      });
    } catch (e) {}
    return { rewards, skins, events: events.size };
  }
  function extra() {
    const m = {}, ev = eventStats(), ss = sessions();
    m.liveRewards = ev.rewards; m.skinsOwned = ev.skins; m.eventsJoined = ev.events;
    try { m.pins = window.RexFav ? RexFav.list().length : 0; } catch (e) { m.pins = 0; }
    try { m.profileDone = window.RexProfilePlus ? RexProfilePlus.score().done : 0; } catch (e) { m.profileDone = 0; }
    const hr = s => new Date(s.start).getHours(), dy = s => new Date(s.start).getDay();
    m.night = ss.some(s => hr(s) < 5) ? 1 : 0;
    m.early = ss.some(s => hr(s) >= 5 && hr(s) < 8) ? 1 : 0;
    m.weekend = (ss.some(s => dy(s) === 6) && ss.some(s => dy(s) === 0)) ? 1 : 0;
    m.marathon = ss.some(s => (s.duration || 0) >= 4 * 3600000) ? 1 : 0;
    m.perfect = m.profileDone >= 10 ? 1 : 0;
    m.collector = ev.events >= 3 ? 1 : 0;
    return m;
  }
  const NEW = [
    { id: 'rewards', icon: '🎁', title: 'Reward Collector', desc: 'Earn rewards in holiday Live Events.', key: 'liveRewards', tiers: [1, 5, 15, 30], unit: 'rewards', cat: 'events' },
    { id: 'wardrobe', icon: '🎭', title: 'Wardrobe', desc: 'Unlock Rex skins from Live Events.', key: 'skinsOwned', tiers: [1, 3, 6, 10], unit: 'skins', cat: 'events' },
    { id: 'pins', icon: '⭐', title: 'Pin Master', desc: 'Pin pages as Favorites in the sidebar.', key: 'pins', tiers: [1, 3, 5, 8], unit: 'pins', cat: 'custom' },
    { id: 'profilepro', icon: '👤', title: 'Profile Pro', desc: 'Fill in your profile details.', key: 'profileDone', tiers: [3, 6, 8, 10], unit: 'details', cat: 'custom' }
  ];
  const SECRET = [
    { id: 's-night', icon: '🦉', title: 'Night Owl', desc: 'Start a Dev Clock session between midnight and 5 AM.', hint: 'Some people build while the world sleeps.', key: 'night' },
    { id: 's-early', icon: '🐓', title: 'Early Bird', desc: 'Start a Dev Clock session between 5 and 8 AM.', hint: 'The morning has its own kind of quiet.', key: 'early' },
    { id: 's-weekend', icon: '🏕️', title: 'Weekend Warrior', desc: 'Log Dev Clock time on a Saturday and on a Sunday.', hint: 'Days off are for something.', key: 'weekend' },
    { id: 's-marathon', icon: '🏃', title: 'Marathon Session', desc: 'Run a single Dev Clock session of 4 hours or more.', hint: 'One long stretch, no breaks.', key: 'marathon' },
    { id: 's-perfect', icon: '💎', title: 'Perfectionist', desc: 'Complete every detail in Profile strength (10 of 10).', hint: 'Leave no field empty.', key: 'perfect' },
    { id: 's-collector', icon: '🗝️', title: 'Seasoned Collector', desc: 'Earn rewards from 3 different Live Event seasons.', hint: 'Variety is the spice of the calendar.', key: 'collector' }
  ];

  /* ---------- unified list ---------- */
  function build() {
    const base = V.metrics(), m = Object.assign({}, base, extra()), old = read('rex110_achievements', {}) || {}, oldItems = old.items || {};
    const mine = read(K, null) || { items: {} }; mine.items = mine.items || {};
    const list = [];
    V.ACH.forEach(a => {
      const plat = PLAT[a.id]; const tiers = plat ? a.tiers.concat([plat]) : a.tiers.slice();
      const live = tiers.filter(t => (m[a.key] || 0) >= t).length;
      const stamps = (oldItems[a.id] || []).slice(); const ps = mine.items['p:' + a.id]; if (ps && ps.length) stamps[3] = ps[0];
      list.push({ id: a.id, icon: a.icon, title: a.title, desc: a.desc, key: a.key, tiers, unit: a.unit, decimals: a.decimals, cat: CAT[a.id] || 'build', val: m[a.key] || 0, live, stamps, secret: false, store: 'old' });
    });
    NEW.forEach(a => {
      const live = a.tiers.filter(t => (m[a.key] || 0) >= t).length;
      list.push(Object.assign({}, a, { val: m[a.key] || 0, live, stamps: (mine.items[a.id] || []).slice(), secret: false, store: 'new' }));
    });
    SECRET.forEach(a => {
      list.push({ id: a.id, icon: a.icon, title: a.title, desc: a.desc, hint: a.hint, key: a.key, tiers: [1], unit: '', cat: 'secret', val: m[a.key] || 0, live: m[a.key] ? 1 : 0, stamps: (mine.items[a.id] || []).slice(), secret: true, store: 'new' });
    });
    const maxed = V.ACH.filter(a => (oldItems[a.id] || []).length >= a.tiers.length).length;
    m.maxed = maxed;
    list.forEach(c => { c.earned = Math.max(c.live, c.stamps.filter(Boolean).length); c.done = c.earned >= c.tiers.length; });
    return { list, m, mine };
  }
  const pointsOf = c => c.secret ? (c.earned ? 100 : 0) : (c.tiers.length === 1 ? (c.earned ? 20 : 0) : PTS.slice(0, c.earned).reduce((a, b) => a + b, 0));
  const maxPoints = c => c.secret ? 100 : (c.tiers.length === 1 ? 20 : PTS.slice(0, c.tiers.length).reduce((a, b) => a + b, 0));
  const levelOf = xp => { const lv = Math.floor(Math.sqrt(xp / 40)) + 1; return { lv, base: 40 * (lv - 1) * (lv - 1), next: 40 * lv * lv }; };
  const TITLES = [[10, 'Legend'], [8, 'Master'], [6, 'Expert'], [4, 'Pro'], [2, 'Builder'], [1, 'Rookie']];
  const titleOf = lv => (TITLES.find(t => lv >= t[0]) || TITLES[TITLES.length - 1])[1];

  /* record Platinum + new unlocks (silent the very first time so nobody gets a flood of toasts) */
  function evaluate() {
    try { V.evaluateAchievements(); } catch (e) {}
    const { list } = build();
    const first = localStorage.getItem(K) === null;
    const mine = read(K, null) || { seeded: Date.now(), items: {} }; mine.items = mine.items || {};
    let changed = first;
    list.forEach(c => {
      if (c.store === 'old') {
        if (c.tiers.length > 3 && c.live >= 4 && !(mine.items['p:' + c.id] || []).length) { mine.items['p:' + c.id] = [Date.now()]; changed = true; if (!first) say('🏆 Achievement unlocked: ' + c.title + ' · Platinum'); }
      } else {
        const have = (mine.items[c.id] || []).length;
        if (c.live > have) {
          const st = (mine.items[c.id] || []).slice();
          for (let i = have; i < c.live; i++) { st.push(Date.now()); if (!first) say(c.secret ? '🕵️ Secret achievement found: ' + c.title : '🏆 Achievement unlocked: ' + c.title + (c.tiers.length > 1 ? ' · ' + TIERS[i] : '')); }
          mine.items[c.id] = st; changed = true;
        }
      }
    });
    if (changed) write(K, mine);
  }

  /* ---------- UI ---------- */
  const ui = { cat: 'all', st: 'all' };
  function pct(c) { if (c.done) return 100; const next = c.tiers[c.earned]; const prev = c.earned ? c.tiers[c.earned - 1] : 0; return Math.max(0, Math.min(100, Math.round(((Math.min(c.val, next) - prev) / (next - prev)) * 100))); }
  const fmt = (c, v) => c.decimals ? Number(v).toFixed(c.decimals) : String(Math.floor(v));
  const when = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  function pips(c) { if (c.secret || c.tiers.length === 1) return ''; return '<div class="a2-pips" aria-hidden="true">' + c.tiers.map((t, i) => '<i class="' + (i < c.earned ? 'on t' + i : '') + '" title="' + TIERS[i] + ' · ' + t + '"></i>').join('') + '</div>'; }

  function card(c) {
    const locked = c.secret && !c.earned;
    const tier = c.secret ? (c.earned ? 'Secret · Legendary' : 'Secret') : (c.tiers.length === 1 ? (c.earned ? 'Unlocked' : 'Locked') : (c.earned ? TIERS[c.earned - 1] : 'Locked'));
    const rar = c.secret ? 'legend' : (c.tiers.length === 1 ? (c.earned ? 'common' : '') : (c.earned ? 'r' + (c.earned - 1) : ''));
    const next = c.done ? c.tiers[c.tiers.length - 1] : c.tiers[c.earned];
    const bar = locked ? '' : (c.secret || (c.tiers.length === 1 && c.earned)) ? '' : '<div class="a2-bar"><span style="width:' + pct(c) + '%"></span></div><small>' + fmt(c, c.val) + ' / ' + next + (c.unit ? ' ' + E(next === 1 ? c.unit.replace(/s$/, '') : c.unit) : '') + (c.done ? ' · maxed out 🎉' : ' · next: ' + (c.tiers.length > 1 ? TIERS[c.earned] : 'unlock')) + '</small>';
    const stamp = c.stamps.filter(Boolean).slice(-1)[0];
    return '<article class="a2-card ' + (c.earned ? 'on ' : '') + rar + (locked ? ' secret' : '') + '" data-ach="' + E(c.id) + '">' +
      '<div class="a2-ico" aria-hidden="true">' + (locked ? '❓' : c.icon) + '</div>' +
      '<div class="a2-body"><div class="a2-top"><strong>' + (locked ? 'Secret achievement' : E(c.title)) + '</strong><span class="a2-tag ' + rar + '">' + E(tier) + '</span></div>' +
      '<p>' + (locked ? E(c.hint) : E(c.desc)) + '</p>' + pips(c) + bar +
      '<div class="a2-foot"><small>' + pointsOf(c) + ' / ' + maxPoints(c) + ' pts</small>' + (stamp && c.earned ? '<small class="a2-when">Unlocked ' + E(when(stamp)) + '</small>' : '') + '</div></div></article>';
  }

  function render() {
    const grid = $('rexAchGrid'); if (!grid) return;
    evaluate();
    const { list } = build();
    const xp = list.reduce((n, c) => n + pointsOf(c), 0), xpMax = list.reduce((n, c) => n + maxPoints(c), 0), L = levelOf(xp);
    const secrets = list.filter(c => c.secret), found = secrets.filter(c => c.earned).length;
    const badgesDone = list.reduce((n, c) => n + (c.secret ? 0 : c.earned), 0), badgesAll = list.reduce((n, c) => n + (c.secret ? 0 : c.tiers.length), 0);
    const into = Math.round(((xp - L.base) / (L.next - L.base)) * 100);
    const sum = $('rexAchSummary');
    if (sum) sum.innerHTML = '<div class="a2-level"><div class="a2-lv"><b>' + L.lv + '</b><span>LEVEL</span></div><div class="a2-lvx"><strong>' + E(titleOf(L.lv)) + '</strong><div class="a2-bar big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + into + '" aria-label="Progress to next level"><span style="width:' + into + '%"></span></div><small>' + xp + ' pts · ' + (L.next - xp) + ' more for level ' + (L.lv + 1) + '</small></div></div>' +
      '<div class="r11-mini"><b>' + badgesDone + ' / ' + badgesAll + '</b><span>Tier badges</span></div>' +
      '<div class="r11-mini"><b>' + found + ' / ' + secrets.length + '</b><span>Secrets found</span></div>' +
      '<div class="r11-mini"><b>' + list.filter(c => c.done).length + ' / ' + list.length + '</b><span>Fully complete</span></div>';
    // next up + recent
    let ex = $('a2Extra'); if (!ex) { ex = document.createElement('div'); ex.id = 'a2Extra'; ex.className = 'a2-extra'; $('rexAchFilters').insertAdjacentElement('beforebegin', ex); }
    const nextUp = list.filter(c => !c.done && !c.secret && c.val > 0).sort((a, b) => pct(b) - pct(a)).slice(0, 3);
    const recent = []; list.forEach(c => c.stamps.forEach((t, i) => { if (t) recent.push({ c, t, i }); })); recent.sort((a, b) => b.t - a.t);
    ex.innerHTML = '<div class="a2-box"><h4>🎯 Next up</h4>' + (nextUp.length ? nextUp.map(c => '<div class="a2-row"><span>' + c.icon + '</span><div><b>' + E(c.title) + '</b><div class="a2-bar"><span style="width:' + pct(c) + '%"></span></div></div><small>' + fmt(c, c.val) + '/' + c.tiers[c.earned] + '</small></div>').join('') : '<p class="a2-empty">Use Rex a little and your closest goals show up here.</p>') + '</div>' +
      '<div class="a2-box"><h4>🕒 Recent unlocks</h4>' + (recent.length ? recent.slice(0, 4).map(r => '<div class="a2-row"><span>' + r.c.icon + '</span><div><b>' + E(r.c.title) + '</b><small>' + (r.c.secret ? 'Secret' : (r.c.tiers.length > 1 ? TIERS[r.i] : 'Unlocked')) + ' · ' + E(when(r.t)) + '</small></div></div>').join('') : '<p class="a2-empty">Nothing unlocked yet.</p>') + '</div>';
    // filters
    const f = $('rexAchFilters');
    f.innerHTML = '<div class="a2-chips" role="group" aria-label="Category">' + CATS.map(c => '<button type="button" class="appearance-tab' + (ui.cat === c[0] ? ' active' : '') + '" data-a2cat="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>' +
      '<div class="a2-chips" role="group" aria-label="Status">' + [['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'In progress']].map(s => '<button type="button" class="appearance-tab' + (ui.st === s[0] ? ' active' : '') + '" data-a2st="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>';
    const shown = list.filter(c => (ui.cat === 'all' || c.cat === ui.cat) && (ui.st === 'all' || (ui.st === 'unlocked' ? c.earned > 0 : !c.done)));
    grid.className = 'a2-grid';
    grid.innerHTML = shown.length ? shown.map(card).join('') : '<div class="studio-empty">Nothing matches that filter yet.</div>';
    if (!$('a2Note')) { const n = document.createElement('p'); n.id = 'a2Note'; n.className = 'a2-note'; n.textContent = 'Tier rarity shows how hard a tier is. Rex has no server, so it never compares you with other people. Points and levels are calculated from your own data on this device.'; grid.insertAdjacentElement('afterend', n); }
  }

  const root = $('view-achievements');
  if (root) root.addEventListener('click', e => {
    const c = e.target.closest('[data-a2cat]'), s = e.target.closest('[data-a2st]');
    if (c) { ui.cat = c.dataset.a2cat; render(); } else if (s) { ui.st = s.dataset.a2st; render(); }
  });

  V.renderAchievements = render;
  V.setAchFilter = f => { ui.st = f === 'locked' ? 'locked' : f === 'unlocked' ? 'unlocked' : 'all'; render(); };
  setInterval(() => { try { evaluate(); } catch (e) {} }, 60000);
  setTimeout(() => { try { evaluate(); } catch (e) {} }, 2500);
  window.RexAch2 = { list: () => build().list, xp: () => build().list.reduce((n, c) => n + pointsOf(c), 0), level: () => levelOf(build().list.reduce((n, c) => n + pointsOf(c), 0)).lv, evaluate, render };
})();
