/* Project Rex Center V13.10.0 · Story Mode seasons: Season Two (The Frostline) and Season Three (The Starfall Isles).
   Each new season is a separate trail with its own 12 places, scenes, choices and keepsakes. A season unlocks only when you FINISH the one before it
   (Season Two needs Season One's Summit, Season Three needs Season Two's Aurora Crown). Anyone who already began a season keeps it.
   A season counts the focus time and daily bonus miles earned AFTER you press its Begin button, so seasons can be played together.
   Free and local. Stored in the same small key as the Daily Trail (rex2103_story2, under "s2", "s3" and "season"). Nothing is sent anywhere. */
(function () {
  'use strict';
  const BK = 'rex2103_story2', DONE_H = 100;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;
  const hm = ms => { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  const HOURS = [0, 1, 3, 6, 10, 15, 22, 30, 40, 55, 75, 100];
  const PTS = [[120, 100], [370, 100], [620, 100], [870, 100], [870, 290], [620, 290], [370, 290], [120, 290], [120, 480], [370, 480], [620, 480], [870, 480]];
  const mkPlaces = rows => rows.map((r, i) => ({ id: r[0], h: HOURS[i], e: r[1], n: r[2], t: r[3] }));

  /* ================= Season Two ================= */
  const SEASON2 = {
    n: 2, key: 's2', prev: 1, name: 'The Frostline', tag: 'Rex\'s winter expedition', band: 'st-bw', deco: [['🌨️', 245, 48], ['🌲', 495, 48], ['⛄', 745, 48], ['🎐', 245, 238], ['🌌', 495, 238], ['🐳', 745, 238], ['🧊', 245, 430], ['❄️', 495, 430], ['✨', 745, 430]],
    prevName: 'Season One', prevGoal: 'reach The Summit in Season One', kick: 'SEASON TWO',
    intro: 'Far to the north, the sky is lit with moving colors, and a village has hung a lamp in every window for travelers. Rex packed a scarf and set out again. Twelve new places, twelve new scenes, twelve new keepsakes.',
    finale: 'You crossed the Frostline', finaleLine: 'We crossed the whole Frostline. Look at those lights!', beginToast: 'Season Two has begun. Rex packed a scarf.', pack: 'Winter keepsakes', journal: 'The Frostline so far', done: 'Season Two complete', doneSub: 'You made it to the top of the sky',
    say: ['The snow is quiet and the trail is long. I like it.', 'Every hour is another bell in the meadow.', 'I wore two scarves. Do not tell anyone.', 'Cocoa tastes better when you have earned it.', 'Whenever you are ready, so am I.'],
    places: mkPlaces([
    ['frost', '🏘️', 'Frostgate Village', 'A snowy village with a lamp in every window. Every Season Two trail starts with a warm welcome.'],
    ['pine', '🌲', 'Pine Hollow Pass', 'Tall pines lean together like friends. The snow is deep, and the first hour is behind you.'],
    ['glimmer', '🧊', 'Glimmer Lake', 'A frozen lake clear as glass. Rex crosses carefully, one focused step at a time.'],
    ['lodge', '🛖', 'Hearthstone Lodge', 'A stone hearth, a pot of stew and a seat for every traveler.'],
    ['meadow', '🔔', 'Snowbell Meadow', 'Ten hours in, and the whole meadow rings softly in the wind.'],
    ['aurora', '🌌', 'Aurora Ridge', 'The sky ripples green and pink. It was worth the climb.'],
    ['fjord', '🐋', 'Whalesong Fjord', 'Deep water between white cliffs, and a song rolling across it.'],
    ['market', '🏮', 'Lantern Market', 'Paper lanterns, hot cocoa and the happy noise of a night market.'],
    ['library', '📚', 'Ice Library', 'Shelves carved from ice, and a very sleepy owl keeping watch.'],
    ['glacier', '⚡', 'Thunder Glacier', 'Blue sparks jump between the ice towers. Stay calm and keep walking.'],
    ['observ', '🔭', 'Observatory of Lights', 'A glass dome on the roof of the world, pointed at every color in the sky.'],
    ['crown', '🌟', 'The Aurora Crown', 'One hundred hours of Season Two. The lights gather above you like a crown.']
    ]),
    chapters: [
    { n: 'The Frozen Road', e: '🏘️', from: 0, to: 3, t: 'Snow, pines and a long walk north.' },
    { n: 'The Aurora Highlands', e: '🌌', from: 4, to: 7, t: 'Bells, lights, whales and lanterns.' },
    { n: 'The Far North', e: '🌟', from: 8, to: 11, t: 'Ice, thunder and the top of the sky.' }
  ],
    scenes: {
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
  }
  };

  /* ================= Season Three ================= */
  const SEASON3 = {
    n: 3, key: 's3', prev: 2, name: 'The Starfall Isles', tag: 'Rex\'s sky voyage', band: 'st-bx', deco: [['☁️', 245, 48], ['🌤️', 495, 48], ['🎈', 745, 48], ['🌊', 245, 238], ['🐠', 495, 238], ['✨', 745, 238], ['🌌', 245, 430], ['⭐', 495, 430], ['🌙', 745, 430]],
    prevName: 'Season Two', prevGoal: 'reach The Aurora Crown in Season Two', kick: 'SEASON THREE',
    intro: 'The airships have been waiting. Above the clouds, floating islands drift in a slow parade, and far past them a forge makes stars. Rex climbed aboard with a spyglass and a good feeling. Twelve more places, twelve more scenes, twelve more keepsakes.',
    finale: 'You reached the Starforge', finaleLine: 'We made it to the Starforge. Look at all those stars!', beginToast: 'Season Three has begun. The airship is rising.', pack: 'Sky keepsakes', journal: 'The Starfall Isles so far', done: 'Season Three complete', doneSub: 'You lit a star of your own',
    say: ['The clouds look different from up here.', 'The goose says hi. I think.', 'Do you hear the engines? They sound like purring.', 'I packed snacks for the whole sky.', 'Whenever you are ready, so am I.'],
    places: mkPlaces([
      ['skyport', '⚓', 'Skyport Dock', 'Airships bob at their moorings, and the whole sky smells like warm bread. Every Season Three voyage starts here.'],
      ['cloudberry', '🍓', 'Cloudberry Farm', 'A farm on a cloud, with puffy sweet berries and a very polite scarecrow goose.'],
      ['windmill', '🌀', 'Windmill Isle', 'A great windmill that spins without any wind. Three hours of focus keep it turning.'],
      ['rainbow', '🌈', 'Rainbow Falls', 'Water falls upward here, catching the light in seven colors.'],
      ['coral', '🪸', 'Coral Canopy', 'A floating reef drifts through the clouds, with fish made of mist.'],
      ['bazaar', '🎪', 'Starlight Bazaar', 'Tents lit by floating stars, selling everything from bottled thunder to spare dreams.'],
      ['grotto', '🐛', 'Glowworm Grotto', 'Glowworms stitch the cave ceiling with blue light, like a sleeping sky.'],
      ['clock', '🕰️', 'Copper Clocktower', 'A tower that ticks in time with your heartbeat, with brass birds that announce each hour.'],
      ['lagoon', '🌙', 'Moonlit Lagoon', 'A still lagoon mirroring every star. Two skies, one trail.'],
      ['orchard', '☄️', 'Meteor Orchard', 'Meteors hang from the branches like glowing fruit. Pick one, leave one.'],
      ['harbor', '🚀', 'Comet Harbor', 'Rocketships dock beside sailing ships, and everything smells like sparks and sea salt.'],
      ['forge', '💫', 'The Starforge', 'A great anvil of light where new stars are hammered out. One hundred hours of patience brought you here.']
    ]),
    chapters: [
      { n: 'The Sky Lanes', e: '⚓', from: 0, to: 3, t: 'Airships, farms and a windmill that never stops.' },
      { n: 'The Floating Gardens', e: '🪸', from: 4, to: 7, t: 'Reefs, bazaars, glowworms and clocks.' },
      { n: 'The Starforge Deep', e: '💫', from: 8, to: 11, t: 'Moonlight, meteors and a forge for stars.' }
    ],
    scenes: {
      skyport: { s: 'Airships bob at their moorings and the sky smells like warm bread. The harbourmaster hands Rex a ticket and a choice.', q: 'What does Rex bring aboard?', a: { l: 'A brass spyglass', o: 'Rex scans the horizon and spots tiny islands floating like toys.', i: ['🔭', 'Brass Spyglass'] }, b: { l: 'A kite for luck', o: 'The streamer flaps proudly from the mast. Good luck, probably.', i: ['🎏', 'Lucky Streamer'] } },
      cloudberry: { s: 'A farm on a cloud! The berries are puffy and sweet, and the scarecrow is a very polite goose.', q: 'What does Rex do?', a: { l: 'Pick berries', o: 'Rex fills a basket and the goose salutes.', i: ['🧺', 'Cloudberry Basket'] }, b: { l: 'Chat with the goose', o: 'The goose shares gossip about every island, and a map smudged with jam.', i: ['🗺️', 'Jam-Stained Map'] } },
      windmill: { s: 'A great windmill spins without any wind. Gears the size of wagon wheels hum inside.', q: 'How does Rex help?', a: { l: 'Oil the gears', o: 'The windmill purrs, and a grateful gear drops into Rex\'s pack.', i: ['⚙️', 'Brass Gear'] }, b: { l: 'Ride the blades', o: 'Whoosh! Round and round. Rex lands dizzy and delighted.', i: ['🎟️', 'Ride Ticket'] } },
      rainbow: { s: 'Water falls upward here, catching the light in seven colors. Rex\'s fur tingles with rainbow static.', q: 'What does Rex do?', a: { l: 'Catch some in a vial', o: 'It sloshes around, glowing brightly.', i: ['🧪', 'Rainbow Vial'] }, b: { l: 'Slide down the arc', o: 'Weeeee! The rainbow is slippery and wonderful.', i: ['🎨', 'Prism Chip'] } },
      coral: { s: 'A floating reef drifts through the clouds, with fish made of mist swimming between the corals.', q: 'How does Rex explore?', a: { l: 'Swim with the mist fish', o: 'They swirl around Rex like a friendly scarf.', i: ['🐠', 'Mist Fish Charm'] }, b: { l: 'Sit and sketch', o: 'Rex draws the reef, and the drawing hums with colors.', i: ['🖍️', 'Humming Sketch'] } },
      bazaar: { s: 'A bazaar of tents lit by floating stars. Sellers trade everything from bottled thunder to second-hand dreams.', q: 'What does Rex trade for?', a: { l: 'Bottled thunder', o: 'It grumbles in the bottle, ready for a rainy day.', i: ['⛈️', 'Bottled Thunder'] }, b: { l: 'A second-hand dream', o: 'Rex tucks it away. It smells like pancakes.', i: ['💭', 'Spare Dream'] } },
      grotto: { s: 'Glowworms stitch the cave ceiling with blue light. It feels like walking under a sleeping sky.', q: 'What does Rex do?', a: { l: 'Follow the brightest glow', o: 'It leads to a pearl as big as Rex\'s fist.', i: ['🦪', 'Glow Pearl'] }, b: { l: 'Walk in the dark', o: 'Rex trusts its feet and finds a quiet glowing mushroom.', i: ['🍄', 'Lamp Mushroom'] } },
      clock: { s: 'The Copper Clocktower ticks in rhythm with Rex\'s heartbeat. Tiny brass birds pop out to announce each hour.', q: 'What does Rex wish for?', a: { l: 'More time', o: 'The clock chimes, and the next hour feels a little longer.', i: ['⏳', 'Hourglass'] }, b: { l: 'A steady rhythm', o: 'Rex falls into a calm tick-tock, and work feels lighter.', i: ['⌚', 'Tick-Tock Charm'] } },
      lagoon: { s: 'A moonlit lagoon sits perfectly still, mirroring every star. Rex sees two skies.', q: 'How does Rex cross?', a: { l: 'Row a little boat', o: 'Each stroke sends ripples of starlight outward.', i: ['🚣', 'Moon Oar'] }, b: { l: 'Walk on the reflection', o: 'Impossible, but Rex does it anyway, one silver step at a time.', i: ['🪞', 'Mirror Shard'] } },
      orchard: { s: 'Meteors hang from the branches like glowing fruit. A sign says: "Pick one, leave one."', q: 'Which does Rex pick?', a: { l: 'The smallest', o: 'Small, but the brightest of all. It fits in Rex\'s pocket.', i: ['🪙', 'Pocket Meteor'] }, b: { l: 'The warm one', o: 'It hums like a cat. Rex carries it carefully.', i: ['🧡', 'Warm Starfruit'] } },
      harbor: { s: 'Comet Harbor, where rocketships dock beside sailing ships. Everything smells like sparks and sea salt.', q: 'How does Rex travel on?', a: { l: 'By rocket', o: 'A short, dramatic hop across the dark. Rex\'s ears flap beautifully.', i: ['🪖', 'Tiny Flight Helmet'] }, b: { l: 'By sail', o: 'Slow and calm, with starlight in the sails.', i: ['⛵', 'Starsail Patch'] } },
      forge: { s: 'The Starforge: a great anvil of light where new stars are hammered out. It has been waiting for someone patient.', q: 'What does Rex forge?', a: { l: 'A new star', o: 'It rises into the dark and takes its place. Everyone below can see it.', i: ['✨', 'Rex\'s Star'] }, b: { l: 'A lamp for travelers', o: 'A small light for whoever walks the trail next.', i: ['🕯️', 'Traveler\'s Lamp'] } }
    }
  };
  const SEASONS = { 2: SEASON2, 3: SEASON3 };

  /* ================= shared engine ================= */
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(BK) || 'null'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(BK, JSON.stringify(o)); return true; } catch (e) { return false; } };
  function sof(S, o) {
    const s = o[S.key] && typeof o[S.key] === 'object' && !Array.isArray(o[S.key]) ? o[S.key] : {};
    s.choices = s.choices && typeof s.choices === 'object' && !Array.isArray(s.choices) ? s.choices : {};
    s.journal = Array.isArray(s.journal) ? s.journal : [];
    s.startH = (typeof s.startH === 'number' && isFinite(s.startH) && s.startH >= 0) ? s.startH : null;
    s.ack = num(s.ack); s.toasted = num(s.toasted); s.began = num(s.began);
    return s;
  }
  /* real Dev Clock time + bonus miles right now. (Season One keeps a high-water mark so places are never lost; seasons use the real, live number so they always keep counting.) */
  const total = () => { try { const st = window.RexStory.state(); return num(typeof st.actual === 'number' ? st.actual : st.hours); } catch (e) { return 0; } };
  const total1 = () => { try { return num(window.RexStory.state().hours); } catch (e) { return 0; } };
  const started = S => sof(S, rd()).startH != null;
  /* hours since this season began. If the clock total ever sits below what we already counted (for example after sessions were deleted), the start point slides down so counting resumes instead of freezing. */
  const hours = S => {
    const o = rd(), s = sof(S, o); if (s.startH == null) return 0;
    if (typeof s.seen !== 'number') { s.seen = Math.max(0, total1() - s.startH); } /* older save: keep what the screen was showing */
    const t = total(), seen = num(s.seen); let h = t - s.startH;
    if (h < seen - 1e-6) { s.startH = Math.max(0, t - seen); h = t - s.startH; o[S.key] = s; wr(o); }
    if (h > seen + 1 / 120) { s.seen = h; o[S.key] = s; wr(o); }
    return Math.max(0, h);
  };
  /* has the person finished the season before this one? (Season One counts its own total, later seasons count time since they began) */
  const prevDone = S => S.prev === 1 ? total1() >= DONE_H : (started(SEASONS[S.prev]) && hours(SEASONS[S.prev]) >= DONE_H);
  const unlocked = S => started(S) || prevDone(S);
  const prevProgress = S => { const h = S.prev === 1 ? total1() : hours(SEASONS[S.prev]); return Math.min(12, HOURS.filter(x => h >= x).length); };
  function where(S, h) {
    let idx = 0; S.places.forEach((p, i) => { if (h >= p.h) idx = i; });
    const next = S.places[idx + 1] || null, frac = next ? Math.min(1, (h - S.places[idx].h) / (next.h - S.places[idx].h)) : 1;
    return { idx, next, frac };
  }
  const pointAt = w => { const a = PTS[w.idx], b = PTS[Math.min(w.idx + 1, PTS.length - 1)]; return [a[0] + (b[0] - a[0]) * w.frac, a[1] + (b[1] - a[1]) * w.frac]; };
  const pending = (S, h) => { const c = sof(S, rd()).choices; return S.places.filter(p => h >= p.h && !c[p.id]).map(p => p.id); };
  function begin(S) { const o = rd(), s = sof(S, o); if (s.startH != null || !unlocked(S)) return false; s.startH = total(); s.began = Date.now(); s.ack = 0; s.toasted = 0; o[S.key] = s; o.season = S.n; return wr(o); }
  function choose(S, id, opt) {
    if (!S.scenes[id] || (opt !== 'a' && opt !== 'b')) return false;
    const o = rd(), s = sof(S, o); if (s.startH == null || s.choices[id]) return false;
    const pl = S.places.find(p => p.id === id); if (!pl || hours(S) < pl.h) return false;
    s.choices[id] = opt; s.journal.push({ id, o: opt, t: Date.now() }); o[S.key] = s; return wr(o);
  }
  function setSeason(n) { const o = rd(); o.season = (n === 2 || n === 3) ? n : 1; return wr(o); }
  const act = n => (n === 1 ? 'season' : 'x');
  const attr = S => ({ a: 'data-s' + S.n, p: 'data-p' + S.n, d: 'stDetail' + S.n });

  /* ---------- drawing ---------- */
  function tabs(cur) {
    const t = n => {
      if (n === 1) return '<button type="button" role="tab" class="stp-sn' + (cur === 1 ? ' on' : '') + '" aria-selected="' + (cur === 1) + '" data-s2="season" data-s="1"><b>Season One</b><small>Rex\'s Adventure</small></button>';
      const S = SEASONS[n], un = unlocked(S), st = started(S);
      return '<button type="button" role="tab" class="stp-sn' + (cur === n ? ' on' : '') + (un ? '' : ' lock') + '" aria-selected="' + (cur === n) + '"' + (un ? '' : ' aria-disabled="true"') + ' data-s2="season" data-s="' + n + '"><b>' + (un ? '' : '🔒 ') + 'Season ' + (n === 2 ? 'Two' : 'Three') + '</b><small>' + (un ? (st ? S.name : 'New! ' + S.name) : 'Finish ' + S.prevName) + '</small></button>';
    };
    return '<div class="stp-seasons" role="tablist" aria-label="Seasons">' + t(1) + t(2) + t(3) + '</div>';
  }
  function mapSVG(S, h, w, sel) {
    const P = S.places, on = i => h >= P[i].h, cur = pointAt(w), A = attr(S);
    const done = PTS.slice(0, w.idx + 1).concat([cur]).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const all = PTS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const bands = '<rect class="st-b ' + S.band + '1" x="0" y="0" width="1000" height="195"/><rect class="st-b ' + S.band + '2" x="0" y="195" width="1000" height="195"/><rect class="st-b ' + S.band + '3" x="0" y="390" width="1000" height="170"/>' +
      S.deco.map(d => '<text class="st-deco" x="' + d[1] + '" y="' + d[2] + '" text-anchor="middle" aria-hidden="true">' + d[0] + '</text>').join('');
    const nodes = P.map((p, i) => { const [x, y] = PTS[i], o = on(i);
      return '<g class="st-n' + (o ? ' on' : ' lock') + (sel === p.id ? ' sel' : '') + '" ' + A.p + '="' + p.id + '" tabindex="0" role="button" aria-label="' + E(p.n + (o ? ', reached' : ', locked, unlocks at ' + p.h + ' hours')) + '" transform="translate(' + x + ' ' + y + ')"><circle r="38"/><text class="st-e" y="12" text-anchor="middle">' + p.e + '</text>' + (o ? '' : '<text class="st-k" x="24" y="-22" text-anchor="middle">🔒</text>') +
        '<text class="st-l" y="68" text-anchor="middle">' + E(p.n) + '</text><text class="st-h" y="86" text-anchor="middle">' + (p.h ? p.h + ' h' : 'Start') + '</text></g>'; }).join('');
    const me = '<g transform="translate(' + (cur[0] - 26).toFixed(1) + ' ' + (cur[1] - 98).toFixed(1) + ')"><g class="st-me"><image href="icons/rex-mascot.svg" width="52" height="58"/><path d="M26 62 l-8 -10 h16z" class="st-pin"/></g></g>';
    return '<svg class="st-map" viewBox="0 0 1000 560" role="group" aria-label="' + E(S.kick.charAt(0) + S.kick.slice(1).toLowerCase()) + ' trail map">' + bands + '<path class="st-road" d="' + all + '"/><path class="st-trav" d="' + done + '"/>' + nodes + me + '</svg>';
  }
  const UI = { sel: {}, all: {} };
  function listHTML(S, h, w) {
    const A = attr(S), sel = UI.sel[S.n];
    return '<ol class="st-list">' + S.places.map((p, i) => { const o = h >= p.h;
      return '<li><button type="button" class="st-li' + (o ? ' on' : ' lock') + (i === w.idx ? ' here' : '') + (sel === p.id ? ' sel' : '') + '" ' + A.p + '="' + p.id + '"><span class="st-li-e" aria-hidden="true">' + (o ? p.e : '🔒') + '</span><span class="st-li-t"><b>' + E(p.n) + '</b><small>' + (o ? 'Reached' : 'Unlocks at ' + p.h + ' h') + '</small></span>' + (i === w.idx ? '<span class="st-li-me" aria-hidden="true">🦖</span>' : '') + '</button></li>'; }).join('') + '</ol>';
  }
  function detailHTML(S, h, w) {
    const p = S.places.find(x => x.id === UI.sel[S.n]) || S.places[w.idx], o = h >= p.h, c = sof(S, rd()).choices[p.id], sc = S.scenes[p.id];
    return '<div class="st-d-e" aria-hidden="true">' + p.e + '</div><div><h3>' + E(p.n) + '</h3><p>' + E(p.t) + '</p><small>' + (o ? (p.h === 0 ? 'Where ' + S.kick.charAt(0) + S.kick.slice(1).toLowerCase() + ' begins.' : '✅ Reached') + (c ? ' · Rex chose <b>' + E(sc[c].l) + '</b> and got ' + sc[c].i[0] + ' ' + E(sc[c].i[1]) : ' · A scene is waiting above') : 'Locked · ' + hm(Math.max(0, (p.h - h) * 3600000)) + ' to go') + '</small></div>';
  }
  function chaptersHTML(S, h, w) {
    return '<div class="stp-chaps" role="list" aria-label="' + E(S.name) + ' chapters">' + S.chapters.map((c, i) => {
      const n = c.to - c.from + 1, got = S.places.slice(c.from, c.to + 1).filter(p => h >= p.h).length, here = w.idx >= c.from && w.idx <= c.to, done = got === n;
      return '<div class="stp-chap s2 s' + S.n + (here ? ' here' : '') + (done ? ' done' : '') + (got === 0 ? ' lock' : '') + '" role="listitem"><span class="stp-ce" aria-hidden="true">' + (got === 0 ? '🔒' : c.e) + '</span><div><small>CHAPTER ' + (i + 1) + (done ? ' · COMPLETE' : here ? ' · YOU ARE HERE' : '') + '</small><b>' + E(c.n) + '</b><span>' + E(c.t) + '</span><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + got + '" aria-label="' + E(c.n) + ' progress"><i style="width:' + Math.round(got / n * 100) + '%"></i></div><em>' + got + ' of ' + n + ' places</em></div></div>';
    }).join('') + '</div>';
  }
  function sceneHTML(S, h) {
    const p = pending(S, h); if (!p.length) return '';
    const pl = S.places.find(x => x.id === p[0]), sc = S.scenes[pl.id], A = attr(S);
    return '<div class="stp-scene s2 s' + S.n + '" role="group" aria-label="New scene at ' + E(pl.n) + '"><div class="stp-scene-h"><span aria-hidden="true">' + pl.e + '</span><div><small>NEW SCENE' + (p.length > 1 ? ' · ' + (p.length - 1) + ' more waiting' : '') + '</small><b>' + E(pl.n) + '</b></div></div><p class="stp-story">' + E(sc.s) + '</p><p class="stp-q">' + E(sc.q) + '</p><div class="stp-opts"><button type="button" class="btn btn-secondary" ' + A.a + '="choose" data-id="' + pl.id + '" data-o="a">' + E(sc.a.l) + '</button><button type="button" class="btn btn-secondary" ' + A.a + '="choose" data-id="' + pl.id + '" data-o="b">' + E(sc.b.l) + '</button></div></div>';
  }
  function packHTML(S, s) {
    const P = S.places, got = P.filter(p => s.choices[p.id]).length;
    return '<section class="stp-card" aria-label="' + E(S.name) + ' backpack"><div class="stp-ch"><div><span class="st-kicker">BACKPACK · ' + S.kick + '</span><h3>' + E(S.pack) + '</h3></div><span class="stp-count">' + got + ' / ' + P.length + '</span></div><ul class="stp-pack">' + P.map(p => {
      const c = s.choices[p.id], it = c ? S.scenes[p.id][c].i : null;
      return '<li class="' + (it ? 'has' : 'no') + '" title="' + E(it ? it[1] + ' · from ' + p.n : 'Reach ' + p.n + ' and make your choice') + '"><span aria-hidden="true">' + (it ? it[0] : '❔') + '</span><small>' + E(it ? it[1] : '???') + '</small></li>'; }).join('') + '</ul></section>';
  }
  function journalHTML(S, s) {
    const A = attr(S), all = UI.all[S.n], items = s.journal.filter(j => S.scenes[j.id] && S.scenes[j.id][j.o]).slice().reverse(), shown = all ? items : items.slice(0, 3);
    return '<section class="stp-card" aria-label="' + E(S.name) + ' journal"><div class="stp-ch"><div><span class="st-kicker">JOURNAL · ' + S.kick + '</span><h3>' + E(S.journal) + '</h3></div><span class="stp-count">' + items.length + ' scene' + (items.length === 1 ? '' : 's') + '</span></div>' +
      (items.length ? '<ol class="stp-jr">' + shown.map(j => { const p = S.places.find(x => x.id === j.id), sc = S.scenes[j.id], ch = sc[j.o];
        return '<li><span class="stp-je" aria-hidden="true">' + p.e + '</span><div><b>' + E(p.n) + '</b><small>' + E(new Date(j.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</small><p>' + E(sc.s) + '</p><p class="stp-pick">Rex chose <b>' + E(ch.l) + '</b>. ' + E(ch.o) + ' <span class="stp-got">' + ch.i[0] + ' ' + E(ch.i[1]) + '</span></p></div></li>'; }).join('') + '</ol>' + (items.length > 3 ? '<button type="button" class="btn btn-sm" ' + A.a + '="jall">' + (all ? 'Show fewer' : 'Show all ' + items.length) + '</button>' : '')
        : '<p class="st-note">Nothing yet. When Rex reaches a place, a scene appears here for you to choose what happens.</p>') + '</section>';
  }
  const say = (S, h, w) => { const pend = pending(S, h); if (!w.next) return S.finaleLine; if (pend.length) return 'I found something at ' + S.places.find(p => p.id === pend[0]).n + '. Come and see!'; return S.say[Math.floor(Date.now() / 864e5) % S.say.length]; };
  const intro = S => '<section class="stp-begin s' + S.n + '"><span class="st-kicker">' + S.kick + ' · NEW</span><h2>' + E(S.name) + '</h2><p>' + E(S.intro) + '</p><ul><li>Counts the focus time and daily bonus miles you earn <b>from now on</b>, so you can keep playing the other seasons at the same time.</li><li>Starts fresh. Your earlier seasons keep all of their progress.</li><li>Nothing to buy, nothing to wait for.</li></ul><button type="button" class="btn btn-primary" ' + attr(S).a + '="begin">Begin ' + (S.n === 2 ? 'Season Two' : 'Season Three') + '</button></section>';
  const locked = S => '<section class="stp-begin lock s' + S.n + '"><span class="st-kicker">' + S.kick + '</span><h2>🔒 ' + E(S.name) + '</h2><p>Season ' + (S.n === 2 ? 'Two' : 'Three') + ' unlocks when you <b>finish ' + S.prevName + '</b>: ' + S.prevGoal + '. You have reached <b>' + prevProgress(S) + ' of 12</b> places so far.</p><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="12" aria-valuenow="' + prevProgress(S) + '" aria-label="' + S.prevName + ' progress"><i style="width:' + Math.round(prevProgress(S) / 12 * 100) + '%"></i></div></section>';
  const promo = S => '<div class="stp-promo" role="note"><span aria-hidden="true">' + (S.n === 2 ? '❄️' : '🌌') + '</span><div><b>Season ' + (S.n === 2 ? 'Two' : 'Three') + ' is ready</b><small>' + E(S.name) + ': 12 new places and scenes.</small></div><button type="button" class="btn btn-sm btn-primary" data-s2="season" data-s="' + S.n + '">Take a look</button></div>';
  function seasonHTML(S) {
    const A = attr(S), s = sof(S, rd()), h = hours(S), w = where(S, h), P = S.places, pct = Math.round(w.frac * 100), remain = w.next ? Math.max(0, (w.next.h - h) * 3600000) : 0;
    const news = w.idx > s.ack && w.idx > 0, got = P.filter(p => s.choices[p.id]).length;
    return '<header class="st-hero s2 s' + S.n + '"><div><span class="st-kicker">STORY MODE · ' + S.kick + '</span><h2>' + E(S.name) + '</h2><p>' + E(S.tag) + '. It counts the focus time and daily bonus miles you earn from the day you began, and your other seasons keep moving too.</p></div><div class="st-hero-r"><button type="button" class="btn btn-primary" ' + A.a + '="clock">⏱ Start a Dev Clock session</button></div></header>' +
      (news ? '<div class="st-news" role="status"><span>🎉 Rex reached <b>' + E(P[w.idx].e + ' ' + P[w.idx].n) + '</b>!</span><button type="button" class="btn btn-sm" ' + A.a + '="ok">Nice!</button></div>' : '') +
      '<div class="st-stats"><div><b>' + hm(h * 3600000) + '</b><small>' + (S.n === 2 ? 'Season Two' : 'Season Three') + ' time</small></div><div><b>' + got + '</b><small>Keepsakes</small></div><div><b>' + (w.idx + 1) + ' / ' + P.length + '</b><small>Places reached</small></div>' +
      '<div class="st-next"><b>' + (w.next ? E(w.next.e + ' ' + w.next.n) : '🌟 ' + S.done) + '</b><small>' + (w.next ? hm(remain) + ' to go' : S.doneSub) + '</small><div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (w.next ? pct : 100) + '" aria-label="Progress to the next place"><i style="width:' + (w.next ? pct : 100) + '%"></i></div></div></div>' +
      '<section class="stp-top"><div class="stp-say"><img src="icons/rex-mascot.svg" alt="" width="44" height="48"><p><b>Rex says</b>' + E(say(S, h, w)) + '</p></div>' + chaptersHTML(S, h, w) + sceneHTML(S, h) + '</section>' +
      mapSVG(S, h, w, UI.sel[S.n]) + listHTML(S, h, w) + '<div class="st-detail" id="' + A.d + '" aria-live="polite">' + detailHTML(S, h, w) + '</div>' +
      '<div class="stp-grid">' + packHTML(S, s) + (!w.next ? '<section class="stp-card stp-fin"><span class="st-kicker">FINALE</span><h3>🌟 ' + E(S.finale) + '</h3><p>' + hm(h * 3600000) + ' of focus time and ' + got + ' of ' + P.length + ' keepsakes. Rex is very proud of you.</p></section>' : '<section class="stp-card"><span class="st-kicker">GOOD TO KNOW</span><h3>All trails move together</h3><p class="st-note">Focus time and the Daily Trail bonuses in Season One also move Rex here. Use the Season One tab to claim them.</p></section>') + '</div>' +
      journalHTML(S, s) + '<p class="st-note">' + (S.n === 2 ? 'Season Two' : 'Season Three') + ' time is your Dev Clock time and bonus miles since you began. Places you reached and choices you made stay saved on this device.</p>';
  }
  function seasonView(S) { return started(S) ? seasonHTML(S) : (unlocked(S) ? intro(S) : locked(S)); }
  const base = window.RexStoryPlus && window.RexStoryPlus.paint;
  const pref = () => { const n = rd().season; const S = SEASONS[n]; return S && unlocked(S) ? n : 1; };
  function paint(root, S1, w1) {
    const n = pref();
    if (n > 1) {
      const S = SEASONS[n], nx = SEASONS[n + 1];
      root.innerHTML = tabs(n) + seasonView(S) + (nx && unlocked(nx) && !started(nx) ? promo(nx) : '');
      return;
    }
    if (base) base.call(window.RexStoryPlus, root, S1, w1);
    root.insertAdjacentHTML('afterbegin', tabs(1) + (unlocked(SEASON2) && !started(SEASON2) ? promo(SEASON2) : ''));
  }
  if (window.RexStoryPlus) window.RexStoryPlus.paint = paint;

  const redraw = () => { try { window.RexStory.render(); } catch (e) { /* ignore */ } };
  const say1 = (t, k) => { try { if (typeof toast === 'function') toast(t, k || 'info'); } catch (e) { /* ignore */ } };
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#view-story [data-s2], #view-story [data-s3], #view-story [data-p2], #view-story [data-p3]'); if (!t || t.disabled) return;
    const S = (t.dataset.p3 !== undefined || t.dataset.s3 !== undefined) ? SEASON3 : SEASON2;
    if (t.dataset['p' + S.n]) { UI.sel[S.n] = t.dataset['p' + S.n]; const h = hours(S), d = $('stDetail' + S.n); if (d) d.innerHTML = detailHTML(S, h, where(S, h)); document.querySelectorAll('#view-story [data-p' + S.n + ']').forEach(n => n.classList.toggle('sel', n.dataset['p' + S.n] === UI.sel[S.n])); return; }
    const a = t.dataset['s' + S.n];
    if (a === 'season') { const n = +t.dataset.s; if (n > 1 && !unlocked(SEASONS[n])) { say1('Finish ' + SEASONS[n].prevName + ' first: ' + SEASONS[n].prevGoal + '.'); return; } setSeason(n); UI.sel = {}; redraw(); }
    else if (a === 'begin') { if (begin(S)) say1(S.beginToast, 'success'); redraw(); }
    else if (a === 'choose') { if (choose(S, t.dataset.id, t.dataset.o)) { const it = S.scenes[t.dataset.id][t.dataset.o]; say1(it.i[0] + ' ' + it.i[1] + ' added to the backpack', 'success'); } redraw(); }
    else if (a === 'jall') { UI.all[S.n] = !UI.all[S.n]; redraw(); }
    else if (a === 'ok') { const o = rd(), s = sof(S, o); s.ack = where(S, hours(S)).idx; o[S.key] = s; wr(o); redraw(); }
    else if (a === 'clock') { try { showView('clock'); } catch (er) { /* ignore */ } }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('#view-story g[data-p2], #view-story g[data-p3]')) { e.preventDefault(); e.target.closest('g[data-p2], g[data-p3]').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

  /* tell the person when a started season reaches a new place while the app is open */
  setInterval(() => { try { if (document.hidden) return; [SEASON2, SEASON3].forEach(S => { if (!started(S)) return; const o = rd(), s = sof(S, o), idx = where(S, hours(S)).idx; if (idx > s.toasted) { s.toasted = idx; o[S.key] = s; wr(o); if (idx > 0) say1('Season ' + (S.n === 2 ? 'Two' : 'Three') + ': Rex reached ' + S.places[idx].n + '!', 'success'); const v = $('view-story'); if (v && v.classList.contains('active')) redraw(); } }); } catch (e) { /* ignore */ } }, 30000);

  const api = S => ({ places: S.places, scenes: S.scenes, chapters: S.chapters, unlocked: () => unlocked(S), started: () => started(S), hours: () => hours(S), begin: () => begin(S), choose: (id, o) => choose(S, id, o), state: () => sof(S, rd()), pending: () => pending(S, hours(S)), where: () => where(S, hours(S)), setSeason });
  window.RexSeason2 = api(SEASON2); window.RexSeason3 = api(SEASON3);
})();
