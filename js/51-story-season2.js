/* Project Rex Center V13.9.0 · Story Mode, Season Two: The Frostline.
   A second trail with its own 12 places, scenes, choices and keepsakes. It unlocks when Rex reaches Mossy Creek (3 hours) in Season One,
   then counts the focus time (and daily bonus miles) earned AFTER you press "Begin Season Two", so both seasons can be played together.
   Free and local. Stored inside the same small key as the Daily Trail (rex2103_story2, under "s2" and "season"). Nothing is sent anywhere. */
(function () {
  'use strict';
  const BK = 'rex2103_story2', UNLOCK_H = 3;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;
  const hm = ms => { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };

  const P = [
    { id: 'frost', h: 0, e: '🏘️', n: 'Frostgate Village', t: 'A snowy village with a lamp in every window. Every Season Two trail starts with a warm welcome.' },
    { id: 'pine', h: 1, e: '🌲', n: 'Pine Hollow Pass', t: 'Tall pines lean together like friends. The snow is deep, and the first hour is behind you.' },
    { id: 'glimmer', h: 3, e: '🧊', n: 'Glimmer Lake', t: 'A frozen lake clear as glass. Rex crosses carefully, one focused step at a time.' },
    { id: 'lodge', h: 6, e: '🛖', n: 'Hearthstone Lodge', t: 'A stone hearth, a pot of stew and a seat for every traveler.' },
    { id: 'meadow', h: 10, e: '🔔', n: 'Snowbell Meadow', t: 'Ten hours in, and the whole meadow rings softly in the wind.' },
    { id: 'aurora', h: 15, e: '🌌', n: 'Aurora Ridge', t: 'The sky ripples green and pink. It was worth the climb.' },
    { id: 'fjord', h: 22, e: '🐋', n: 'Whalesong Fjord', t: 'Deep water between white cliffs, and a song rolling across it.' },
    { id: 'market', h: 30, e: '🏮', n: 'Lantern Market', t: 'Paper lanterns, hot cocoa and the happy noise of a night market.' },
    { id: 'library', h: 40, e: '📚', n: 'Ice Library', t: 'Shelves carved from ice, and a very sleepy owl keeping watch.' },
    { id: 'glacier', h: 55, e: '⚡', n: 'Thunder Glacier', t: 'Blue sparks jump between the ice towers. Stay calm and keep walking.' },
    { id: 'observ', h: 75, e: '🔭', n: 'Observatory of Lights', t: 'A glass dome on the roof of the world, pointed at every color in the sky.' },
    { id: 'crown', h: 100, e: '🌟', n: 'The Aurora Crown', t: 'One hundred hours of Season Two. The lights gather above you like a crown.' }
  ];
  const CH = [
    { n: 'The Frozen Road', e: '🏘️', from: 0, to: 3, t: 'Snow, pines and a long walk north.' },
    { n: 'The Aurora Highlands', e: '🌌', from: 4, to: 7, t: 'Bells, lights, whales and lanterns.' },
    { n: 'The Far North', e: '🌟', from: 8, to: 11, t: 'Ice, thunder and the top of the sky.' }
  ];
  const SC = {
    frost: { s: 'Snow squeaks under Rex\'s boots. The village lamps glow gold, and a knitted scarf hangs on every door.', q: 'What does Rex borrow?', a: { l: 'A warm scarf', o: 'Rex wraps up and feels ready for anything.', i: ['🧣', 'Wool Scarf'] }, b: { l: 'Snowshoes', o: 'Flat and wide, they make deep snow feel like a sidewalk.', i: ['🥾', 'Snowshoes'] } },
    pine: { s: 'Tall pines lean together like friends sharing a secret. A tiny sled track winds between them.', q: 'Which way?', a: { l: 'Follow the sled track', o: 'It ends at an old sled with a note that says "Take me!"', i: ['🛷', 'Little Sled'] }, b: { l: 'Climb the old pine', o: 'From the top Rex spots the whole valley, and drops a pine cone in surprise.', i: ['🌰', 'Pine Cone Charm'] } },
    glimmer: { s: 'The lake is frozen clear as glass. Far below the ice, something silver swims slowly.', q: 'What does Rex do?', a: { l: 'Skate across', o: 'Whoosh! Rex glides to the far shore with a spin.', i: ['⛸️', 'Rex\'s Skates'] }, b: { l: 'Listen to the ice', o: 'The ice hums a low note. Rex hums along and a crystal pings loose.', i: ['🎐', 'Ice Chime'] } },
    lodge: { s: 'A cabin with a stone hearth and a pot of something warm. A sign reads: "Everyone gets a bowl."', q: 'What does Rex do?', a: { l: 'Help cook', o: 'Rex stirs the pot and earns the recipe.', i: ['🍲', 'Winter Stew Recipe'] }, b: { l: 'Read by the fire', o: 'Tucked beside the chair, Rex finds a worn book of trail rhymes.', i: ['📕', 'Book of Trail Rhymes'] } },
    meadow: { s: 'Tiny bells of frost ring in the wind across the whole meadow.', q: 'How does Rex cross?', a: { l: 'Tiptoe quietly', o: 'Not a single bell rings, and one blooms as a thank-you.', i: ['🌸', 'Snowbell Flower'] }, b: { l: 'Run through!', o: 'Chime, chime, chime! A whole symphony. Rex laughs out loud.', i: ['🔔', 'Frost Bell'] } },
    aurora: { s: 'The sky ripples green and pink above the ridge. It feels like the sky is breathing.', q: 'What does Rex do?', a: { l: 'Make a wish', o: 'A ribbon of light drifts down and curls around Rex\'s paw.', i: ['🎀', 'Light Ribbon'] }, b: { l: 'Just watch', o: 'Rex memorizes every color and keeps them as a feeling.', i: ['🖼️', 'Painted Memory'] } },
    fjord: { s: 'Deep blue water between white cliffs. A long, low song rolls across the fjord.', q: 'Answer the song?', a: { l: 'Sing back', o: 'A great shape surfaces and sprays a happy rainbow.', i: ['🎵', 'Whale Song Note'] }, b: { l: 'Just listen', o: 'Rex listens until the song ends. A smooth blue stone washes up.', i: ['🔷', 'Fjord Stone'] } },
    market: { s: 'A night market glows with paper lanterns. Stalls sell everything from kites to cocoa.', q: 'What does Rex buy?', a: { l: 'Hot cocoa', o: 'The seller adds extra marshmallows "for the traveler."', i: ['☕', 'Cocoa Mug'] }, b: { l: 'A kite', o: 'Rex flies it above the market, and it dances in the aurora.', i: ['🪁', 'Aurora Kite'] } },
    library: { s: 'Shelves carved from ice hold books that never melt. The librarian is a very sleepy owl.', q: 'What does Rex ask for?', a: { l: 'A map', o: 'The owl blinks and hands Rex a chart of the far north.', i: ['📜', 'Northern Chart'] }, b: { l: 'A story', o: 'The owl tells of a Rex who once walked this very trail.', i: ['🦉', 'Owl Feather'] } },
    glacier: { s: 'The glacier groans and crackles with static. Blue sparks jump between the ice towers.', q: 'How does Rex pass?', a: { l: 'Slow and steady', o: 'Rex\'s calm makes the sparks settle into a gentle glow.', i: ['💠', 'Calm Spark'] }, b: { l: 'Dash between sparks', o: 'Zip! Zap! Rex arrives tingling, holding a little lightning in a jar.', i: ['🫙', 'Jar of Lightning'] } },
    observ: { s: 'A glass dome on the roof of the world. Brass telescopes point at every color in the sky.', q: 'What does Rex look for?', a: { l: 'The brightest star', o: 'It turns out to be named after hard workers. Rex grins.', i: ['⭐', 'Star Token'] }, b: { l: 'A shooting star', o: 'One streaks by right on cue. Rex catches its light in a bottle.', i: ['🌠', 'Wishing Light'] } },
    crown: { s: 'At the very top, the lights gather into a ring above a snowy stone. A crown has been waiting there for someone who kept walking.', q: 'What does Rex do with the crown?', a: { l: 'Wear it proudly', o: 'The aurora flares bright, and the whole north cheers.', i: ['🏆', 'Aurora Crown'] }, b: { l: 'Share it', o: 'Rex lets everyone it met on the trail try it on. It fits them all.', i: ['🤝', 'Shared Crown'] } }
  };
  const PTS = [[120, 100], [370, 100], [620, 100], [870, 100], [870, 290], [620, 290], [370, 290], [120, 290], [120, 480], [370, 480], [620, 480], [870, 480]];

  const rd = () => { try { const o = JSON.parse(localStorage.getItem(BK) || 'null'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(BK, JSON.stringify(o)); return true; } catch (e) { return false; } };
  function s2of(o) {
    const s = o.s2 && typeof o.s2 === 'object' && !Array.isArray(o.s2) ? o.s2 : {};
    s.choices = s.choices && typeof s.choices === 'object' && !Array.isArray(s.choices) ? s.choices : {};
    s.journal = Array.isArray(s.journal) ? s.journal : [];
    s.startH = (typeof s.startH === 'number' && isFinite(s.startH) && s.startH >= 0) ? s.startH : null;
    s.ack = num(s.ack); s.toasted = num(s.toasted); s.began = num(s.began);
    return s;
  }
  const total = () => { try { return num(window.RexStory.state().hours); } catch (e) { return 0; } };
  const unlocked = () => total() >= UNLOCK_H;
  const started = () => s2of(rd()).startH != null;
  const hours = () => { const s = s2of(rd()); return s.startH == null ? 0 : Math.max(0, total() - s.startH); };
  function where(h) {
    let idx = 0; P.forEach((p, i) => { if (h >= p.h) idx = i; });
    const next = P[idx + 1] || null, frac = next ? Math.min(1, (h - P[idx].h) / (next.h - P[idx].h)) : 1;
    return { idx, next, frac };
  }
  const pointAt = w => { const a = PTS[w.idx], b = PTS[Math.min(w.idx + 1, PTS.length - 1)]; return [a[0] + (b[0] - a[0]) * w.frac, a[1] + (b[1] - a[1]) * w.frac]; };
  const pending = h => P.filter(p => h >= p.h && !s2of(rd()).choices[p.id]).map(p => p.id);

  function begin() { const o = rd(), s = s2of(o); if (s.startH != null || !unlocked()) return false; s.startH = total(); s.began = Date.now(); s.ack = 0; s.toasted = 0; o.s2 = s; o.season = 2; return wr(o); }
  function choose(id, opt) {
    if (!SC[id] || (opt !== 'a' && opt !== 'b')) return false;
    const o = rd(), s = s2of(o); if (s.startH == null || s.choices[id]) return false;
    const h = hours(); const pl = P.find(p => p.id === id); if (!pl || h < pl.h) return false;
    s.choices[id] = opt; s.journal.push({ id, o: opt, t: Date.now() }); o.s2 = s; return wr(o);
  }
  function setSeason(n) { const o = rd(); o.season = n === 2 ? 2 : 1; return wr(o); }

  /* ---------- drawing ---------- */
  function tabs(cur) {
    const un = unlocked(), s = s2of(rd());
    return '<div class="stp-seasons" role="tablist" aria-label="Seasons"><button type="button" role="tab" class="stp-sn' + (cur === 1 ? ' on' : '') + '" aria-selected="' + (cur === 1) + '" data-s2="season" data-s="1"><b>Season One</b><small>Rex\'s Adventure</small></button>' +
      '<button type="button" role="tab" class="stp-sn' + (cur === 2 ? ' on' : '') + (un ? '' : ' lock') + '" aria-selected="' + (cur === 2) + '"' + (un ? '' : ' aria-disabled="true"') + ' data-s2="season" data-s="2"><b>' + (un ? '' : '🔒 ') + 'Season Two</b><small>' + (un ? (s.startH != null ? 'The Frostline' : 'New! The Frostline') : 'Unlocks at Mossy Creek (3 h)') + '</small></button></div>';
  }
  function mapSVG(h, w, sel) {
    const on = i => h >= P[i].h, cur = pointAt(w);
    const done = PTS.slice(0, w.idx + 1).concat([cur]).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const all = PTS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const bands = '<rect class="st-b st-bw1" x="0" y="0" width="1000" height="195"/><rect class="st-b st-bw2" x="0" y="195" width="1000" height="195"/><rect class="st-b st-bw3" x="0" y="390" width="1000" height="170"/>' +
      [['🌨️', 245, 48], ['🌲', 495, 48], ['⛄', 745, 48], ['🎐', 245, 238], ['🌌', 495, 238], ['🐳', 745, 238], ['🧊', 245, 430], ['❄️', 495, 430], ['✨', 745, 430]].map(d => '<text class="st-deco" x="' + d[1] + '" y="' + d[2] + '" text-anchor="middle" aria-hidden="true">' + d[0] + '</text>').join('');
    const nodes = P.map((p, i) => { const [x, y] = PTS[i], o = on(i);
      return '<g class="st-n' + (o ? ' on' : ' lock') + (sel === p.id ? ' sel' : '') + '" data-p2="' + p.id + '" tabindex="0" role="button" aria-label="' + E(p.n + (o ? ', reached' : ', locked, unlocks at ' + p.h + ' hours')) + '" transform="translate(' + x + ' ' + y + ')"><circle r="38"/><text class="st-e" y="12" text-anchor="middle">' + p.e + '</text>' + (o ? '' : '<text class="st-k" x="24" y="-22" text-anchor="middle">🔒</text>') +
        '<text class="st-l" y="68" text-anchor="middle">' + E(p.n) + '</text><text class="st-h" y="86" text-anchor="middle">' + (p.h ? p.h + ' h' : 'Start') + '</text></g>'; }).join('');
    const me = '<g transform="translate(' + (cur[0] - 26).toFixed(1) + ' ' + (cur[1] - 98).toFixed(1) + ')"><g class="st-me"><image href="icons/rex-mascot.svg" width="52" height="58"/><path d="M26 62 l-8 -10 h16z" class="st-pin"/></g></g>';
    return '<svg class="st-map" viewBox="0 0 1000 560" role="group" aria-label="Season Two trail map">' + bands + '<path class="st-road" d="' + all + '"/><path class="st-trav" d="' + done + '"/>' + nodes + me + '</svg>';
  }
  let sel = null, all = false;
  function listHTML(h, w) {
    return '<ol class="st-list">' + P.map((p, i) => { const o = h >= p.h;
      return '<li><button type="button" class="st-li' + (o ? ' on' : ' lock') + (i === w.idx ? ' here' : '') + (sel === p.id ? ' sel' : '') + '" data-p2="' + p.id + '"><span class="st-li-e" aria-hidden="true">' + (o ? p.e : '🔒') + '</span><span class="st-li-t"><b>' + E(p.n) + '</b><small>' + (o ? 'Reached' : 'Unlocks at ' + p.h + ' h') + '</small></span>' + (i === w.idx ? '<span class="st-li-me" aria-hidden="true">🦖</span>' : '') + '</button></li>'; }).join('') + '</ol>';
  }
  function detailHTML(h, w) {
    const p = P.find(x => x.id === sel) || P[w.idx], o = h >= p.h, c = s2of(rd()).choices[p.id], sc = SC[p.id];
    return '<div class="st-d-e" aria-hidden="true">' + p.e + '</div><div><h3>' + E(p.n) + '</h3><p>' + E(p.t) + '</p><small>' + (o ? (p.h === 0 ? 'Where Season Two begins.' : '✅ Reached') + (c ? ' · Rex chose <b>' + E(sc[c].l) + '</b> and got ' + sc[c].i[0] + ' ' + E(sc[c].i[1]) : ' · A scene is waiting above') : 'Locked · ' + hm(Math.max(0, (p.h - h) * 3600000)) + ' to go') + '</small></div>';
  }
  function chaptersHTML(h, w) {
    return '<div class="stp-chaps" role="list" aria-label="Season Two chapters">' + CH.map((c, i) => {
      const n = c.to - c.from + 1, got = P.slice(c.from, c.to + 1).filter(p => h >= p.h).length, here = w.idx >= c.from && w.idx <= c.to, done = got === n;
      return '<div class="stp-chap s2' + (here ? ' here' : '') + (done ? ' done' : '') + (got === 0 ? ' lock' : '') + '" role="listitem"><span class="stp-ce" aria-hidden="true">' + (got === 0 ? '🔒' : c.e) + '</span><div><small>CHAPTER ' + (i + 1) + (done ? ' · COMPLETE' : here ? ' · YOU ARE HERE' : '') + '</small><b>' + E(c.n) + '</b><span>' + E(c.t) + '</span><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + got + '" aria-label="' + E(c.n) + ' progress"><i style="width:' + Math.round(got / n * 100) + '%"></i></div><em>' + got + ' of ' + n + ' places</em></div></div>';
    }).join('') + '</div>';
  }
  function sceneHTML(h) {
    const p = pending(h); if (!p.length) return '';
    const pl = P.find(x => x.id === p[0]), sc = SC[pl.id];
    return '<div class="stp-scene s2" role="group" aria-label="New scene at ' + E(pl.n) + '"><div class="stp-scene-h"><span aria-hidden="true">' + pl.e + '</span><div><small>NEW SCENE' + (p.length > 1 ? ' · ' + (p.length - 1) + ' more waiting' : '') + '</small><b>' + E(pl.n) + '</b></div></div><p class="stp-story">' + E(sc.s) + '</p><p class="stp-q">' + E(sc.q) + '</p><div class="stp-opts"><button type="button" class="btn btn-secondary" data-s2="choose" data-id="' + pl.id + '" data-o="a">' + E(sc.a.l) + '</button><button type="button" class="btn btn-secondary" data-s2="choose" data-id="' + pl.id + '" data-o="b">' + E(sc.b.l) + '</button></div></div>';
  }
  function packHTML(s) {
    const got = P.filter(p => s.choices[p.id]).length;
    return '<section class="stp-card" aria-label="Season Two backpack"><div class="stp-ch"><div><span class="st-kicker">BACKPACK · SEASON TWO</span><h3>Winter keepsakes</h3></div><span class="stp-count">' + got + ' / ' + P.length + '</span></div><ul class="stp-pack">' + P.map(p => {
      const c = s.choices[p.id], it = c ? SC[p.id][c].i : null;
      return '<li class="' + (it ? 'has' : 'no') + '" title="' + E(it ? it[1] + ' · from ' + p.n : 'Reach ' + p.n + ' and make your choice') + '"><span aria-hidden="true">' + (it ? it[0] : '❔') + '</span><small>' + E(it ? it[1] : '???') + '</small></li>'; }).join('') + '</ul></section>';
  }
  function journalHTML(s) {
    const items = s.journal.filter(j => SC[j.id] && SC[j.id][j.o]).slice().reverse(), shown = all ? items : items.slice(0, 3);
    return '<section class="stp-card" aria-label="Season Two journal"><div class="stp-ch"><div><span class="st-kicker">JOURNAL · SEASON TWO</span><h3>The Frostline so far</h3></div><span class="stp-count">' + items.length + ' scene' + (items.length === 1 ? '' : 's') + '</span></div>' +
      (items.length ? '<ol class="stp-jr">' + shown.map(j => { const p = P.find(x => x.id === j.id), sc = SC[j.id], ch = sc[j.o];
        return '<li><span class="stp-je" aria-hidden="true">' + p.e + '</span><div><b>' + E(p.n) + '</b><small>' + E(new Date(j.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</small><p>' + E(sc.s) + '</p><p class="stp-pick">Rex chose <b>' + E(ch.l) + '</b>. ' + E(ch.o) + ' <span class="stp-got">' + ch.i[0] + ' ' + E(ch.i[1]) + '</span></p></div></li>'; }).join('') + '</ol>' + (items.length > 3 ? '<button type="button" class="btn btn-sm" data-s2="jall">' + (all ? 'Show fewer' : 'Show all ' + items.length) + '</button>' : '')
        : '<p class="st-note">Nothing yet. When Rex reaches a place, a scene appears here for you to choose what happens.</p>') + '</section>';
  }
  function say(h, w, s) {
    const pend = pending(h), pool = ['The snow is quiet and the trail is long. I like it.', 'Every hour is another bell in the meadow.', 'I wore two scarves. Do not tell anyone.', 'Cocoa tastes better when you have earned it.', 'Whenever you are ready, so am I.'];
    if (!w.next) return 'We crossed the whole Frostline. Look at those lights!';
    if (pend.length) return 'I found something at ' + P.find(p => p.id === pend[0]).n + '. Come and see!';
    return pool[Math.floor(Date.now() / 864e5) % pool.length];
  }
  function intro() {
    return '<section class="stp-begin"><span class="st-kicker">SEASON TWO · NEW</span><h2>The Frostline</h2><p>Far to the north, the sky is lit with moving colors, and a village has hung a lamp in every window for travelers. Rex packed a scarf and set out again. Twelve new places, twelve new scenes, twelve new keepsakes.</p>' +
      '<ul><li>Counts the focus time and daily bonus miles you earn <b>from now on</b>, so you can play Season One at the same time.</li><li>Starts fresh. Season One keeps all of its progress.</li><li>Nothing to buy, nothing to wait for.</li></ul><button type="button" class="btn btn-primary" data-s2="begin">Begin Season Two</button></section>';
  }
  function locked() {
    return '<section class="stp-begin lock"><span class="st-kicker">SEASON TWO</span><h2>🔒 The Frostline</h2><p>Season Two unlocks when Rex reaches <b>Mossy Creek</b> in Season One (3 hours of focus time). You have <b>' + hm(total() * 3600000) + '</b> so far.</p></section>';
  }
  function s2HTML() {
    const s = s2of(rd()), h = hours(), w = where(h), pct = Math.round(w.frac * 100), remain = w.next ? Math.max(0, (w.next.h - h) * 3600000) : 0;
    const news = w.idx > s.ack && w.idx > 0;
    return '<header class="st-hero s2"><div><span class="st-kicker">STORY MODE · SEASON TWO</span><h2>The Frostline</h2><p>Rex\'s winter expedition. It counts the focus time and daily bonus miles you earn from the day you began, and Season One keeps moving too.</p></div><div class="st-hero-r"><button type="button" class="btn btn-primary" data-s2="clock">⏱ Start a Dev Clock session</button></div></header>' +
      (news ? '<div class="st-news" role="status"><span>🎉 Rex reached <b>' + E(P[w.idx].e + ' ' + P[w.idx].n) + '</b>!</span><button type="button" class="btn btn-sm" data-s2="ok">Nice!</button></div>' : '') +
      '<div class="st-stats"><div><b>' + hm(h * 3600000) + '</b><small>Season Two time</small></div><div><b>' + P.filter(p => s.choices[p.id]).length + '</b><small>Keepsakes</small></div><div><b>' + (w.idx + 1) + ' / ' + P.length + '</b><small>Places reached</small></div>' +
      '<div class="st-next"><b>' + (w.next ? E(w.next.e + ' ' + w.next.n) : '🌟 Season Two complete') + '</b><small>' + (w.next ? hm(remain) + ' to go' : 'You made it to the top of the sky') + '</small><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (w.next ? pct : 100) + '" aria-label="Progress to the next place"><i style="width:' + (w.next ? pct : 100) + '%"></i></div></div></div>' +
      '<section class="stp-top"><div class="stp-say"><img src="icons/rex-mascot.svg" alt="" width="44" height="48"><p><b>Rex says</b>' + E(say(h, w, s)) + '</p></div>' + chaptersHTML(h, w) + sceneHTML(h) + '</section>' +
      mapSVG(h, w, sel) + listHTML(h, w) + '<div class="st-detail" id="stDetail2" aria-live="polite">' + detailHTML(h, w) + '</div>' +
      '<div class="stp-grid">' + packHTML(s) + (!w.next ? '<section class="stp-card stp-fin"><span class="st-kicker">FINALE</span><h3>🌟 You crossed the Frostline</h3><p>' + hm(h * 3600000) + ' of focus time and ' + P.filter(p => s.choices[p.id]).length + ' of ' + P.length + ' keepsakes. Rex is very proud of you.</p></section>' : '<section class="stp-card"><span class="st-kicker">GOOD TO KNOW</span><h3>Both trails move together</h3><p class="st-note">Focus time and the Daily Trail bonuses in Season One also move Rex here. Use the Season One tab to claim them.</p></section>') + '</div>' +
      journalHTML(s) + '<p class="st-note">Season Two time is your Dev Clock time and bonus miles since you began. Places you reached and choices you made stay saved on this device.</p>';
  }
  const base = window.RexStoryPlus && window.RexStoryPlus.paint;
  function paint(root, S, w) {
    const o = rd(), season = (o.season === 2 && unlocked()) ? 2 : 1;
    if (season === 2) { root.innerHTML = tabs(2) + (started() ? s2HTML() : intro()); return; }
    if (base) base.call(window.RexStoryPlus, root, S, w);
    root.insertAdjacentHTML('afterbegin', tabs(1) + (unlocked() && !started() ? '<div class="stp-promo" role="note"><span aria-hidden="true">❄️</span><div><b>Season Two is ready</b><small>A new winter trail with 12 new places and scenes.</small></div><button type="button" class="btn btn-sm btn-primary" data-s2="season" data-s="2">Take a look</button></div>' : ''));
  }
  if (window.RexStoryPlus) window.RexStoryPlus.paint = paint;

  const redraw = () => { try { window.RexStory.render(); } catch (e) { /* ignore */ } };
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#view-story [data-s2], #view-story [data-p2]'); if (!t || t.disabled) return;
    if (t.dataset.p2) { sel = t.dataset.p2; const h = hours(); const d = $('stDetail2'); if (d) d.innerHTML = detailHTML(h, where(h)); document.querySelectorAll('#view-story [data-p2]').forEach(n => n.classList.toggle('sel', n.dataset.p2 === sel)); return; }
    const a = t.dataset.s2;
    if (a === 'season') { const n = +t.dataset.s; if (n === 2 && !unlocked()) { try { if (typeof toast === 'function') toast('Season Two unlocks at Mossy Creek (3 hours).', 'info'); } catch (er) { /* ignore */ } return; } setSeason(n); sel = null; redraw(); }
    else if (a === 'begin') { if (begin()) { try { if (typeof toast === 'function') toast('Season Two has begun. Rex packed a scarf.', 'success'); } catch (er) { /* ignore */ } } redraw(); }
    else if (a === 'choose') { if (choose(t.dataset.id, t.dataset.o)) { const it = SC[t.dataset.id][t.dataset.o]; try { if (typeof toast === 'function') toast(it.i[0] + ' ' + it.i[1] + ' added to the backpack', 'success'); } catch (er) { /* ignore */ } } redraw(); }
    else if (a === 'jall') { all = !all; redraw(); }
    else if (a === 'ok') { const o = rd(), s = s2of(o); s.ack = where(hours()).idx; o.s2 = s; wr(o); redraw(); }
    else if (a === 'clock') { try { showView('clock'); } catch (er) { /* ignore */ } }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('#view-story g[data-p2]')) { e.preventDefault(); e.target.closest('g[data-p2]').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

  /* tell the person when Season Two reaches a new place while the app is open */
  setInterval(() => { try { if (document.hidden || !started()) return; const o = rd(), s = s2of(o), idx = where(hours()).idx; if (idx > s.toasted) { s.toasted = idx; o.s2 = s; wr(o); if (idx > 0 && typeof toast === 'function') toast('❄️ Season Two: Rex reached ' + P[idx].n + '!', 'success'); const v = $('view-story'); if (v && v.classList.contains('active')) redraw(); } } catch (e) { /* ignore */ } }, 30000);

  window.RexSeason2 = { places: P, scenes: SC, chapters: CH, unlocked, started, hours, begin, choose, setSeason, state: () => s2of(rd()), pending: () => pending(hours()), where: () => where(hours()) };
})();
