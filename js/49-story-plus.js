/* Project Rex Center V13.7.0 · Story Mode, the bigger story.
   Adds to the trail map: three chapters, a short scene with a choice at every place, a backpack of keepsakes, a journal of your story,
   a Daily Trail with small bonus miles, and Rex talking to you. Free and local. Writes only its own key (rex2103_story2).
   Dev Clock time is still the main fuel; bonus miles are small (about 1 hour a day at most). Nothing is sent anywhere. */
(function () {
  'use strict';
  const BK = 'rex2103_story2', CLOCK = 'rex_dev_clock_data';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;

  const CHAPTERS = [
    { id: 'c1', n: 'The Nest Road', e: '🌲', from: 0, to: 3, t: 'Small steps. Big forest. Rex learns the trail.' },
    { id: 'c2', n: 'The Deep Country', e: '⛰️', from: 4, to: 7, t: 'Bridges, crystals, peaks and a quiet bay.' },
    { id: 'c3', n: 'The Old World', e: '🏰', from: 8, to: 11, t: 'Ruins, fire and the castle in the sky.' }
  ];
  const SC = {
    hollow: { s: 'Rex cracks the last bit of shell and blinks at the morning. The nest is warm, but a faint line of footprints leads out of the hollow.', q: 'What does Rex pack first?',
      a: { l: 'A scrap of map', o: 'Rex tucks the map into the nest moss. Now the road has a shape.', i: ['🗺️', 'Scrap of Map'] }, b: { l: 'A trail snack', o: 'Rex nibbles first and plans later. A full belly makes a brave start.', i: ['🥜', 'Trail Snack'] } },
    fern: { s: 'Ferns taller than Rex brush past on both sides. Somewhere ahead a bird sings the same three notes over and over.', q: 'Follow the bird?',
      a: { l: 'Follow the song', o: 'The bird leads Rex to a clearing and drops a shiny feather.', i: ['🪶', 'Lucky Feather'] }, b: { l: 'Stay on the path', o: 'Rex keeps steady and finds a smooth walking stick leaning on a tree.', i: ['🪵', 'Walking Stick'] } },
    creek: { s: 'The creek is wider than it looked. Flat stones shimmer under the water like a staircase made for someone small.', q: 'How does Rex cross?',
      a: { l: 'Hop the stones', o: 'Hop, hop, hop! Rex lands dry and finds a pebble that hums.', i: ['🪨', 'Humming Pebble'] }, b: { l: 'Wade through', o: 'Splash! Cold toes, but a tiny silver fish leaves a glittering scale behind.', i: ['🐟', 'Silver Scale'] } },
    camp: { s: 'A ring of stones, still warm, and a note: "Rest here. Plan well." Someone left a kettle on the coals.', q: 'What does Rex do at camp?',
      a: { l: 'Plan tomorrow', o: 'Rex draws tomorrow in the dirt. It looks very doable.', i: ['📝', 'Trail Notebook'] }, b: { l: 'Swap stories', o: 'A passing traveler tells Rex about a shortcut and leaves a compass.', i: ['🧭', 'Pocket Compass'] } },
    bridge: { s: 'The old stone bridge hums a sleepy tune. Carved into the rail: "Built one hour at a time."', q: 'Should Rex add something?',
      a: { l: 'Carve a tiny R', o: 'Rex scratches a little R into the rail. It is there for good.', i: ['🪧', 'Carved Stone'] }, b: { l: 'Fix a loose stone', o: 'A wobbly stone clicks into place. The bridge feels stronger.', i: ['🧱', 'Keystone'] } },
    mines: { s: 'Crystals light the tunnels in blue and pink. Rex\'s footsteps echo like applause.', q: 'Which tunnel?',
      a: { l: 'The bright one', o: 'Glittering walls, and a crystal that glows when Rex is focused.', i: ['💎', 'Focus Crystal'] }, b: { l: 'The quiet one', o: 'Hush. In the dark Rex finds a smooth warm stone that feels like calm.', i: ['🔮', 'Calm Stone'] } },
    peaks: { s: 'Wind tugs at Rex\'s scarf. From up here the whole trail looks like a ribbon someone dropped.', q: 'How does Rex celebrate?',
      a: { l: 'Shout hello', o: 'The echo shouts back twice as loud. A snowflake lands on Rex\'s nose.', i: ['❄️', 'Snowflake Charm'] }, b: { l: 'Sit and look', o: 'Rex watches the clouds in silence. Something small and shiny rolls to its feet.', i: ['🔭', 'Tiny Spyglass'] } },
    bay: { s: 'Boats rock on dark water and the harbour lights wink on one by one. A lighthouse keeper waves.', q: 'What does Rex ask the keeper for?',
      a: { l: 'A story', o: 'The keeper tells of a ship that never gave up, and gives Rex a shell to remember it.', i: ['🐚', 'Story Shell'] }, b: { l: 'A lantern', o: 'A lantern for the long dark ahead. It never seems to run out.', i: ['🏮', 'Starlit Lantern'] } },
    ruins: { s: 'Columns lean in the water like tired giants. On the floor, a mosaic of a very familiar dinosaur.', q: 'Study the mosaic or explore?',
      a: { l: 'Study the mosaic', o: 'A hidden tile slides aside and Rex finds a medal.', i: ['🏅', 'Old Medal'] }, b: { l: 'Explore the halls', o: 'Deep in an alcove sits a book whose pages are still dry.', i: ['📖', 'Dry Book'] } },
    volcano: { s: 'The ground rumbles like a big, slow purr. A little fire sprite peeks out of a crack.', q: 'Befriend the sprite?',
      a: { l: 'Say hi', o: 'The sprite giggles and hands Rex a warm ember that never burns.', i: ['🔥', 'Friendly Ember'] }, b: { l: 'Keep walking', o: 'Rex keeps its pace. A piece of cooled volcanic glass drops in its path.', i: ['🌑', 'Obsidian Shard'] } },
    castle: { s: 'Skyhold floats above the clouds and the gates stand open. Banners read: "For those who keep showing up."', q: 'Where does Rex go first?',
      a: { l: 'The great hall', o: 'A feast! There is a seat at the table with Rex\'s name on it.', i: ['🪑', 'Rex\'s Chair'] }, b: { l: 'The tower', o: 'Up a thousand steps to a window facing the Summit, and a key on the sill.', i: ['🗝️', 'Tower Key'] } },
    summit: { s: 'The top. Rex plants a tiny flag. The whole world is quiet and wide, and every hour on the trail was a step to here.', q: 'What does Rex write on the flag?',
      a: { l: '"Keep going"', o: 'The wind carries the words down the whole trail.', i: ['🚩', 'Flag of Persistence'] }, b: { l: '"Thank you"', o: 'Everyone who helped is in those two words. Rex smiles.', i: ['💌', 'Thank-you Note'] } }
  };
  const REWARD = { visit: 0.1, send: 0.25, clock: 0.25, set: 0.4 };

  const rd = () => { try { const o = JSON.parse(localStorage.getItem(BK) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(BK, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const norm = o => { o.choices = o.choices && typeof o.choices === 'object' ? o.choices : {}; o.claims = o.claims && typeof o.claims === 'object' ? o.claims : {}; o.journal = Array.isArray(o.journal) ? o.journal : []; o.streak = o.streak && typeof o.streak === 'object' ? o.streak : { last: '', count: 0, best: 0 }; o.bonusH = num(o.bonusH); return o; };
  const dayKey = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

  /* what has been done today (read only, from the app's own data) */
  function today() {
    const t0 = dayStart(); let sent = false, clock = false;
    try { const W = typeof ws === 'function' ? ws() : null; (W && W.history || []).slice(0, 60).forEach(h => { const id = String(h && h.id || ''); if (/^\d{13}$/.test(id) && +id >= t0 && h.ok !== false) sent = true; }); } catch (e) { /* ignore */ }
    try { const d = JSON.parse(localStorage.getItem(CLOCK) || 'null') || {}; (Array.isArray(d.sessions) ? d.sessions : []).forEach(s => { if (s && num(s.start) >= t0) clock = true; }); if (num(d.activeStart) >= t0) clock = true; } catch (e) { /* ignore */ }
    return { visit: true, send: sent, clock };
  }
  function claim(k) {
    const o = norm(rd()), key = dayKey(), c = o.claims[key] = o.claims[key] || {}, t = today();
    if (k === 'set') { if (c.set || !(c.visit && c.send && c.clock)) return false; }
    else if (c[k] || !t[k]) return false;
    c[k] = Date.now(); o.bonusH = +(o.bonusH + REWARD[k]).toFixed(3);
    const y = dayKey(Date.now() - 864e5);
    if (o.streak.last !== key) { o.streak.count = o.streak.last === y ? o.streak.count + 1 : 1; o.streak.last = key; o.streak.best = Math.max(o.streak.best || 0, o.streak.count); }
    /* keep only the last 30 days of claim records */
    Object.keys(o.claims).sort().slice(0, -30).forEach(d => delete o.claims[d]);
    return wr(o);
  }
  function choose(id, opt) {
    const sc = SC[id]; if (!sc || (opt !== 'a' && opt !== 'b')) return false;
    const o = norm(rd()); if (o.choices[id]) return false;
    o.choices[id] = opt; o.journal.push({ id, o: opt, t: Date.now() }); return wr(o);
  }

  function sayLine(S, w, o, t) {
    const pend = pending(S);
    const pool = ['Every hour counts. I am proud of this trail.', 'Small steps still go forward.', 'I packed snacks. Lots of snacks.', 'The best part of a long walk is company.', 'Whenever you are ready, so am I.'];
    const day = Math.floor(Date.now() / 864e5);
    if (!w.next) return 'We made it. Look at that view!';
    if (pend.length) return 'I found something at ' + (window.RexStory.places.find(p => p.id === pend[0]) || {}).n + '. Come and see!';
    if (o.streak && o.streak.last === dayKey() && o.streak.count >= 3) return o.streak.count + ' days in a row! My legs feel strong.';
    if (!t.clock && !t.send) return 'One focus session and we are moving again.';
    return pool[day % pool.length];
  }
  const pending = S => window.RexStory.places.filter(p => S.h >= p.h && SC[p.id] && !(norm(rd()).choices[p.id])).map(p => p.id);

  function chaptersHTML(S, w) {
    const P = window.RexStory.places;
    return '<div class="stp-chaps" role="list" aria-label="Chapters">' + CHAPTERS.map((c, i) => {
      const n = c.to - c.from + 1, got = P.slice(c.from, c.to + 1).filter(p => S.h >= p.h).length, here = w.idx >= c.from && w.idx <= c.to, done = got === n;
      return '<div class="stp-chap' + (here ? ' here' : '') + (done ? ' done' : '') + (got === 0 ? ' lock' : '') + '" role="listitem"><span class="stp-ce" aria-hidden="true">' + (got === 0 ? '🔒' : c.e) + '</span><div><small>CHAPTER ' + (i + 1) + (done ? ' · COMPLETE' : here ? ' · YOU ARE HERE' : '') + '</small><b>' + E(c.n) + '</b><span>' + E(c.t) + '</span>' +
        '<div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + got + '" aria-label="' + E(c.n) + ' progress"><i style="width:' + Math.round(got / n * 100) + '%"></i></div><em>' + got + ' of ' + n + ' places</em></div></div>';
    }).join('') + '</div>';
  }
  function sceneHTML(S) {
    const p = pending(S); if (!p.length) return '';
    const pl = window.RexStory.places.find(x => x.id === p[0]), sc = SC[pl.id];
    return '<div class="stp-scene" role="group" aria-label="New scene at ' + E(pl.n) + '"><div class="stp-scene-h"><span aria-hidden="true">' + pl.e + '</span><div><small>NEW SCENE' + (p.length > 1 ? ' · ' + (p.length - 1) + ' more waiting' : '') + '</small><b>' + E(pl.n) + '</b></div></div>' +
      '<p class="stp-story">' + E(sc.s) + '</p><p class="stp-q">' + E(sc.q) + '</p><div class="stp-opts"><button type="button" class="btn btn-secondary" data-sp="choose" data-id="' + pl.id + '" data-o="a">' + E(sc.a.l) + '</button><button type="button" class="btn btn-secondary" data-sp="choose" data-id="' + pl.id + '" data-o="b">' + E(sc.b.l) + '</button></div></div>';
  }
  function dailyHTML(o, t) {
    const key = dayKey(), c = (o.claims[key]) || {}, rows = [
      ['visit', '👋', 'Check in with Rex', 'You are here, so this one is ready.'], ['send', '📨', 'Send a message today', 'Send anything from the builder.'], ['clock', '⏱️', 'Do a Dev Clock session', 'Start the clock, even a short one.']];
    const all = c.visit && c.send && c.clock;
    const row = r => { const done = !!c[r[0]], ready = !done && t[r[0]];
      return '<li class="stp-q-i' + (done ? ' done' : ready ? ' ready' : '') + '"><span class="stp-qe" aria-hidden="true">' + (done ? '✅' : r[1]) + '</span><div><b>' + r[2] + '</b><small>' + (done ? 'Claimed +' + REWARD[r[0]] * 60 + ' min of trail' : ready ? 'Done. Claim your bonus.' : r[3]) + '</small></div>' +
        (done ? '' : '<button type="button" class="btn btn-sm' + (ready ? ' btn-primary' : '') + '" data-sp="claim" data-k="' + r[0] + '"' + (ready ? '' : ' disabled') + '>Claim +' + REWARD[r[0]] * 60 + ' min</button>') + '</li>'; };
    const bonus = '<li class="stp-q-i' + (c.set ? ' done' : all ? ' ready' : '') + '"><span class="stp-qe" aria-hidden="true">' + (c.set ? '✅' : '🎁') + '</span><div><b>Finish all three</b><small>' + (c.set ? 'Claimed +24 min of trail' : all ? 'Done. Claim the set bonus.' : 'Claim the three above first.') + '</small></div>' + (c.set ? '' : '<button type="button" class="btn btn-sm' + (all ? ' btn-primary' : '') + '" data-sp="claim" data-k="set"' + (all ? '' : ' disabled') + '>Claim +24 min</button>') + '</li>';
    const st = o.streak || {}, live = st.last === key || st.last === dayKey(Date.now() - 864e5) ? st.count || 0 : 0;
    return '<section class="stp-card" aria-label="Daily Trail"><div class="stp-ch"><div><span class="st-kicker">DAILY TRAIL</span><h3>Today\'s trail bonuses</h3></div><div class="stp-streak" title="Days in a row you claimed a bonus">🔥 <b>' + live + '</b> day' + (live === 1 ? '' : 's') + '<small>best ' + (st.best || 0) + '</small></div></div>' +
      '<ul class="stp-qs">' + rows.map(row).join('') + bonus + '</ul><p class="st-note">Bonuses add a little extra distance, up to about an hour a day. Real focus time is still the main way to move. They reset every day.</p></section>';
  }
  function packHTML(o) {
    const P = window.RexStory.places, got = P.filter(p => o.choices[p.id]).length;
    return '<section class="stp-card" aria-label="Backpack"><div class="stp-ch"><div><span class="st-kicker">BACKPACK</span><h3>Rex\'s keepsakes</h3></div><span class="stp-count">' + got + ' / ' + P.length + '</span></div><ul class="stp-pack">' + P.map(p => {
      const c = o.choices[p.id], it = c && SC[p.id] ? SC[p.id][c].i : null;
      return '<li class="' + (it ? 'has' : 'no') + '" title="' + E(it ? it[1] + ' · from ' + p.n : 'Reach ' + p.n + ' and make your choice') + '"><span aria-hidden="true">' + (it ? it[0] : '❔') + '</span><small>' + E(it ? it[1] : '???') + '</small></li>'; }).join('') + '</ul></section>';
  }
  let all = false;
  function journalHTML(o) {
    const P = window.RexStory.places, items = o.journal.filter(j => SC[j.id] && SC[j.id][j.o]).slice().reverse();
    const shown = all ? items : items.slice(0, 3);
    return '<section class="stp-card" aria-label="Journal"><div class="stp-ch"><div><span class="st-kicker">JOURNAL</span><h3>Your story so far</h3></div><span class="stp-count">' + items.length + ' scene' + (items.length === 1 ? '' : 's') + '</span></div>' +
      (items.length ? '<ol class="stp-jr">' + shown.map(j => { const p = P.find(x => x.id === j.id), sc = SC[j.id], ch = sc[j.o];
        return '<li><span class="stp-je" aria-hidden="true">' + p.e + '</span><div><b>' + E(p.n) + '</b><small>' + E(new Date(j.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</small><p>' + E(sc.s) + '</p><p class="stp-pick">Rex chose <b>' + E(ch.l) + '</b>. ' + E(ch.o) + ' <span class="stp-got">' + ch.i[0] + ' ' + E(ch.i[1]) + '</span></p></div></li>'; }).join('') + '</ol>' + (items.length > 3 ? '<button type="button" class="btn btn-sm" data-sp="jall">' + (all ? 'Show fewer' : 'Show all ' + items.length) + '</button>' : '')
        : '<p class="st-note">Nothing yet. When Rex reaches a place, a scene appears here for you to choose what happens.</p>') + '</section>';
  }

  function paint(root, S, w) {
    const o = norm(rd()), t = today();
    const top = '<section class="stp-top"><div class="stp-say"><img src="icons/rex-mascot.svg" alt="" width="44" height="48"><p><b>Rex says</b>' + E(sayLine(S, w, o, t)) + '</p></div>' + chaptersHTML(S, w) + sceneHTML(S) + '</section>';
    const bottom = '<div class="stp-grid">' + dailyHTML(o, t) + packHTML(o) + '</div>' + journalHTML(o);
    const map = root.querySelector('.st-map'), note = root.querySelector('.st-note');
    if (map) map.insertAdjacentHTML('beforebegin', top); else root.insertAdjacentHTML('beforeend', top);
    if (note) note.insertAdjacentHTML('beforebegin', bottom); else root.insertAdjacentHTML('beforeend', bottom);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#view-story [data-sp]'); if (!b || b.disabled) return;
    const k = b.dataset.sp;
    if (k === 'choose') {
      if (choose(b.dataset.id, b.dataset.o)) { const it = SC[b.dataset.id][b.dataset.o]; try { if (typeof toast === 'function') toast(it.i[0] + ' ' + it.i[1] + ' added to the backpack', 'success'); } catch (er) { /* ignore */ } }
    } else if (k === 'claim') {
      if (claim(b.dataset.k)) { try { if (typeof toast === 'function') toast('Bonus claimed. Rex moves a little further.', 'success'); } catch (er) { /* ignore */ } }
    } else if (k === 'jall') { all = !all; }
    try { window.RexStory.render(); } catch (er) { /* ignore */ }
    const f = document.querySelector('#view-story [data-sp="' + k + '"]'); if (f && k === 'jall') f.focus();
  });

  window.RexStoryPlus = { paint, scenes: SC, chapters: CHAPTERS, state: () => norm(rd()), claim, choose, today, pending: () => { const st = window.RexStory.state(); return pending({ h: st.hours }); } };
})();
