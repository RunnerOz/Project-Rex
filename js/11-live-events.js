/* Project Rex Center 11.6.0 — Holiday Live Events.
   One shared engine, 16 data-driven events (the 14 requested holidays + 2 bonus days; Memorial Day is kept quiet).

   HOW IT WORKS (and what it does NOT do)
   - Every event has a date rule (movable holidays such as Easter and Thanksgiving are calculated for any year).
     The status (upcoming / active / archived) is recalculated from THIS DEVICE'S clock and time zone every time. Nothing is
     downloaded, so an event that is already in the app starts by itself without an app update.
   - It is NOT a global live event: there is no server. Two devices in different time zones start/end at their own local midnight,
     and progress is saved only in this browser (localStorage keys that start with "rexev1_"). It never syncs between devices.
   - This file only reads/writes its own keys: rexev1_progress, rexev1_config, rexev1_prefs. It never edits the main Project Rex
     data, never installs updates, and never changes Effect Lab or holiday-theme settings.
   - Hidden collectibles are appended as the LAST element of a few approved pages (never over buttons, inputs or the webhook
     builder), so they cannot cover or block existing controls. */
(function () {
  'use strict';
  const K_PROG = 'rexev1_progress', K_CFG = 'rexev1_config', K_PREF = 'rexev1_prefs';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  let warned = false;
  function load(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' && !Array.isArray(v) ? v : def; } catch (_) { return def; } }
  function put(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (_) { if (!warned) { warned = true; try { toast('Could not save Live Events progress (browser storage is full or blocked).', 'error'); } catch (__) {} } return false; }
  }
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {};
  const P = load(K_PROG, {}); ['items', 'claimed', 'flags', 'advent', 'gratitude'].forEach(k => { P[k] = obj(P[k]); }); P.v = 1;
  const CFG = load(K_CFG, {}); CFG.over = obj(CFG.over);
  const PREF = load(K_PREF, {}); PREF.fx = obj(PREF.fx); if (PREF.nests !== false) PREF.nests = true; if (PREF.fxOn !== false) PREF.fxOn = true;
  const saveP = () => put(K_PROG, P), saveC = () => put(K_CFG, CFG), saveF = () => put(K_PREF, PREF);

  /* ---------------- dates (all LOCAL time) ---------------- */
  const D = (y, m, d, h, mi, s, ms) => new Date(y, m, d, h || 0, mi || 0, s || 0, ms || 0);
  const eod = (y, m, d) => D(y, m, d, 23, 59, 59, 999);
  const addDays = (d, n) => D(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const ymdStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function easter(y) { // anonymous Gregorian algorithm
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return D(y, mo - 1, da);
  }
  function nthWd(y, m, wd, n) { const first = D(y, m, 1).getDay(); return D(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7); }
  function lastWd(y, m, wd) { const last = D(y, m + 1, 0); return D(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7)); }
  const endOf = d => eod(d.getFullYear(), d.getMonth(), d.getDate());

  /* ---------------- hidden places (fixed list, shuffled per event with a seed) ---------------- */
  const POOL = ['home', 'dashboard', 'templates', 'drafts', 'schedule', 'history', 'timeline', 'analytics', 'weather', 'notifications', 'clock',
    'achievements', 'holidays', 'changelog', 'profile', 'studio', 'knowledge', 'tasks', 'automation', 'project-notebook'];
  const HINT = { home: "near Rex's front door", dashboard: 'down among the numbers', templates: 'tucked between the templates', drafts: 'where half-finished ideas wait',
    schedule: 'beside the ticking schedule', history: 'in the dusty history', timeline: 'along the timeline', analytics: 'beneath the charts', weather: 'under the clouds',
    notifications: 'behind the bell', clock: "by the clock's hands", achievements: 'near the trophies', holidays: 'in the holiday decorations', changelog: 'in the old release notes',
    profile: "near Rex's profile", studio: 'in the project studio', knowledge: 'among the notes', tasks: 'by the to-do list', automation: 'near the workflows', 'project-notebook': 'between notebook pages' };
  const PLACE = { home: 'Home', dashboard: 'Dashboard', templates: 'Templates', drafts: 'Drafts', schedule: 'Schedule', history: 'History', timeline: 'Timeline', analytics: 'Analytics', weather: 'Weather',
    notifications: 'Notifications', clock: 'Clock', achievements: 'Achievements', holidays: 'Holidays', changelog: 'Update Log', profile: 'Profile', studio: 'Project Studio', knowledge: 'Knowledge', tasks: 'Tasks',
    automation: 'Automation', 'project-notebook': 'Project Notebook' };

  /* ---------------- event definitions ---------------- */
  const H = (n, emoji, one, many, allName, extra) => Object.assign({ n, emoji, one, many, allName }, extra || {});
  const EV = [
    { key: 'newyear', name: "New Year's Day", emoji: '🎆', c: ['#0b1440', '#f5c542', '#8b5cf6'], tag: 'Count down to midnight',
      desc: 'Count down to midnight, launch fireworks and confetti, and collect five sparklers hidden around Rex.',
      win: y => [D(y - 1, 11, 29), eod(y, 0, 2)], target: y => D(y, 0, 1), special: 'countdown',
      hunt: H(5, '✨', 'Sparkler', 'sparklers', 'Sparkler Collector'),
      layers: [{ id: 'fw', label: 'Fireworks', fx: 'fireworks' }, { id: 'conf', label: 'Confetti', fx: 'confetti' }],
      extra: [{ id: 'celebrate', name: 'Midnight Watcher', emoji: '🕛', how: 'Press "Celebrate" after midnight on New Year\'s Day', req: c => !!c.flags.celebrated }],
      skin: { emoji: '🎆', name: 'Fireworks Rex', from: 'celebrate' } },
    { key: 'winter', name: 'Winter Season', emoji: '❄️', c: ['#0d2a4a', '#5ec8ff', '#c9ecff'], tag: 'Cozy snowflake hunt',
      desc: 'A calm, snowy stretch of the year. Find ten snowflakes and cozy up with some falling snow.',
      win: y => [D(y, 0, 3), eod(y, 1, 6)], hunt: H(10, '❄️', 'Snowflake', 'snowflakes', 'Snowflake Keeper'),
      layers: [{ id: 'snow', label: 'Falling snow', fx: 'snow' }], skin: { emoji: '☃️', name: 'Snowy Rex', from: 'all' } },
    { key: 'valentine', name: "Valentine's Day", emoji: '💘', c: ['#4a0d2e', '#ff4d8d', '#ffc2d9'], tag: 'Hidden hearts',
      desc: 'Ten hearts are hiding across Project Rex. Gather them all for a sweet reward.',
      win: y => [D(y, 1, 7), eod(y, 1, 15)], hunt: H(10, '💗', 'Heart', 'hearts', 'Heart Collector', { emojis: ['💗', '💘', '💖', '💝'] }),
      layers: [{ id: 'hearts', label: 'Floating hearts', fx: 'hearts' }], skin: { emoji: '💘', name: 'Sweetheart Rex', from: 'all' } },
    { key: 'stpat', name: "St. Patrick's Day", emoji: '☘️', c: ['#062e1b', '#22c55e', '#ffd54a'], tag: 'Shamrocks & a pot of gold',
      desc: 'Find eight shamrocks. Half-way through, a pot of gold starts to glimmer somewhere in the app.',
      win: y => [D(y, 2, 10), eod(y, 2, 17)], hunt: H(8, '☘️', 'Shamrock', 'shamrocks', 'Lucky Clover', { golden: { name: 'Pot of Gold', emoji: '💰' } }),
      layers: [{ id: 'clover', label: 'Falling shamrocks', fx: 'shamrocks' }], skin: { emoji: '🍀', name: 'Lucky Rex', from: 'all' } },
    { key: 'easter', name: 'Easter', emoji: '🐣', c: ['#3b2a6b', '#b794f6', '#ffe08a'], tag: 'Egg hunt & the Golden Egg',
      desc: 'Twelve eggs are hidden around the app, and once you have found half a rare Golden Egg appears.',
      win: y => { const e = easter(y); return [addDays(e, -9), endOf(addDays(e, 1))]; },
      hunt: H(12, '🥚', 'Egg', 'eggs', 'Egg Hunter', { emojis: ['🥚', '🐣', '🐰', '🌷'], golden: { name: 'Golden Egg', emoji: '🥚' } }),
      layers: [{ id: 'eggs', label: 'Spring eggs', fx: 'eggs' }, { id: 'flowers', label: 'Flower petals', fx: 'flowers' }], skin: { emoji: '🐰', name: 'Bunny Rex', from: 'all' } },
    { key: 'petday', name: 'National Pet Day', emoji: '🐾', c: ['#4a2a0d', '#f59e0b', '#fde68a'], tag: 'Bonus day',
      desc: 'A tiny bonus event: five paw prints are hiding for the best boy, Rex.',
      win: y => [D(y, 3, 9), eod(y, 3, 11)], bonus: true, hunt: H(5, '🐾', 'Paw print', 'paw prints', 'Pet Pal'),
      layers: [{ id: 'paws', label: 'Paw prints', fx: 'paws' }], skin: { emoji: '🐾', name: 'Pet Pal Rex', from: 'all' } },
    { key: 'earth', name: 'Earth Day', emoji: '🌍', c: ['#063a2a', '#34d399', '#7dd3fc'], tag: 'Nature collectibles',
      desc: 'Collect eight nature finds around the app to become an Earth Protector.',
      win: y => [D(y, 3, 15), eod(y, 3, 22)], hunt: H(8, '🌱', 'Nature find', 'nature finds', 'Earth Protector', { emojis: ['🌱', '🌳', '🌻', '🐝', '🦋', '🌊', '♻️', '🍃'] }),
      layers: [{ id: 'nature', label: 'Drifting nature', fx: 'nature' }], skin: { emoji: '🌍', name: 'Earth Protector Rex', from: 'all' } },
    { key: 'memorial', name: 'Memorial Day', emoji: '🇺🇸', c: ['#1b2a4a', '#6b84c4', '#d9e2f7'], tag: 'A quiet day of remembrance', solemn: true,
      desc: 'Memorial Day honours the people who died while serving in the U.S. military. Project Rex keeps this one quiet: no hunt, no effects and no rewards.',
      win: y => { const m = lastWd(y, 4, 1); return [addDays(m, -3), endOf(m)]; } },
    { key: 'summer', name: 'First Day of Summer', emoji: '☀️', c: ['#7a3a00', '#ffb020', '#7dd3fc'], tag: 'Sunny summer hunt',
      desc: 'Eight sunny things are hiding around the app. (Dates follow the usual June 19–23 solstice window.)',
      win: y => [D(y, 5, 19), eod(y, 5, 23)], hunt: H(8, '☀️', 'Sunbeam', 'sunbeams', 'Sun Seeker', { emojis: ['☀️', '🌴', '🍉', '🕶️', '🍦', '🏖️', '🌊', '🐚'] }),
      layers: [{ id: 'sun', label: 'Summer drift', fx: 'sun' }], skin: { emoji: '😎', name: 'Sunny Rex', from: 'all' } },
    { key: 'july4', name: 'Independence Day', emoji: '🎇', c: ['#0b1f5c', '#ef4444', '#e5eaff'], tag: 'Fireworks & hidden stars',
      desc: 'Fireworks over Rex and eight hidden stars to find.',
      win: y => [D(y, 6, 1), eod(y, 6, 5)], hunt: H(8, '⭐', 'Star', 'stars', 'Star Gatherer'),
      layers: [{ id: 'fw', label: 'Fireworks', fx: 'fireworks' }, { id: 'stars', label: 'Twinkling stars', fx: 'stars' }], skin: { emoji: '🎇', name: 'Star-Spangled Rex', from: 'all' } },
    { key: 'school', name: 'Back-to-School Season', emoji: '🎒', c: ['#1d3557', '#f59e0b', '#a8dadc'], tag: 'Supplies on the loose',
      desc: 'Eight school supplies have gone missing. Find them before the bell rings.',
      win: y => [D(y, 7, 15), eod(y, 8, 5)], hunt: H(8, '✏️', 'Supply', 'supplies', 'Straight-A Rex', { emojis: ['✏️', '📚', '🎒', '📐', '🖍️', '📏', '🔬', '🍎'] }),
      layers: [{ id: 'school', label: 'Floating supplies', fx: 'school' }], skin: { emoji: '🎓', name: 'Scholar Rex', from: 'all' } },
    { key: 'vgday', name: 'National Video Games Day', emoji: '🎮', c: ['#1b1040', '#a855f7', '#22d3ee'], tag: 'Bonus day',
      desc: 'A tiny bonus event: five arcade tokens are hidden. Press start!',
      win: y => [D(y, 8, 10), eod(y, 8, 12)], bonus: true, hunt: H(5, '🎮', 'Token', 'tokens', 'Player One', { emojis: ['🎮', '👾', '🕹️', '🪙', '⭐'] }),
      layers: [{ id: 'arcade', label: 'Arcade drift', fx: 'arcade' }], skin: { emoji: '🎮', name: 'Player One Rex', from: 'all' } },
    { key: 'fall', name: 'First Day of Fall', emoji: '🍁', c: ['#4a1d05', '#f97316', '#fcd34d'], tag: 'Collectible leaves',
      desc: 'Ten colourful leaves have blown into Project Rex. Gather them before they drift away.',
      win: y => [D(y, 8, 21), eod(y, 8, 24)], hunt: H(10, '🍁', 'Leaf', 'leaves', 'Leaf Collector', { emojis: ['🍁', '🍂', '🍃'] }),
      layers: [{ id: 'leaves', label: 'Falling leaves', fx: 'leaves' }], skin: { emoji: '🍁', name: 'Leafy Rex', from: 'all' } },
    { key: 'halloween', name: 'Halloween Haunt', emoji: '🎃', c: ['#1a0b2e', '#7c3aed', '#ff8a1f'], tag: 'Pumpkins, a ghost story and a Haunted Portal', flagship: true,
      desc: 'Thirteen friendly pumpkins are hiding across Project Rex. Follow the clues, uncover the secret story, find the rare Golden Pumpkin and open the Haunted Portal.',
      win: y => [D(y, 9, 24), eod(y, 9, 31)], special: 'portal',
      hunt: H(13, '🎃', 'Pumpkin', 'pumpkins', 'Patch Complete', { golden: { name: 'Golden Pumpkin', emoji: '🎃' }, hunter: 'Pumpkin Picker' }),
      layers: [{ id: 'ghosts', label: 'Friendly ghosts', fx: 'ghosts' }, { id: 'bats', label: 'Bats', fx: 'bats' }, { id: 'fog', label: 'Soft fog', fog: true },
        { id: 'leaves', label: 'Falling leaves', fx: 'leaves' }, { id: 'sparks', label: 'Orange sparks', fx: 'sparks' }],
      story: [
        { at: 1, title: 'The Lantern Keeper', text: "Every October, Rex's old lantern flickers. Someone has scattered thirteen pumpkins around the app, and each one glows with a tiny piece of a story. The first one whispers: \"Keep looking, friend.\"" },
        { at: 4, title: 'The Friendly Ghost', text: "A shy ghost named Boo-ker guards the pumpkin patch. He is not scary, just lonely, and he drifts through the app when nobody is watching, nudging pumpkins into new hiding spots." },
        { at: 7, title: 'The Golden Glow', text: "Seven pumpkins glow together, and something shimmers far away: one pumpkin is made of pure gold. It hides in a place that is not like the others. Look closely, it is rarer than all the rest." },
        { at: 10, title: 'Midnight Whispers', text: "The bats flutter in a circle. \"Thirteen pumpkins make a key,\" they squeak. \"Bring them all together and the Haunted Portal will open.\"" },
        { at: 13, title: 'The Portal Appears', text: "The thirteenth pumpkin clicks into place. A purple door appears on this page, humming softly. It is time to step through." }],
      finale: "Behind the door is a candlelit pumpkin patch. Boo-ker is waiting, holding a tiny crown. \"We needed someone brave,\" he says, \"and kind. You found every pumpkin and listened to every whisper.\" He sets the crown on Rex. \"Happy Halloween, Pumpkin King.\"",
      extra: [{ id: 'portal', name: 'Pumpkin King Rex', emoji: '👑', how: 'Find all 13 pumpkins, then step through the Haunted Portal (the mystery reward)', req: c => c.all && !!c.flags.portal }],
      skin: { emoji: '🎃', name: 'Pumpkin King Rex', from: 'portal' } },
    { key: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', c: ['#4a2a0d', '#d97706', '#fde68a'], tag: 'Gratitude & cozy autumn',
      desc: 'A cozy, thankful week. Write down what you are grateful for (kept only on this device) and find six autumn treats.',
      win: y => { const t = nthWd(y, 10, 4, 4); return [addDays(t, -3), endOf(addDays(t, 3))]; }, special: 'gratitude',
      hunt: H(6, '🥧', 'Treat', 'treats', 'Cozy Collector', { emojis: ['🥧', '🌽', '🦃', '🍠', '🍂', '🧣'] }),
      layers: [{ id: 'pie', label: 'Cozy autumn drift', fx: 'pie' }],
      extra: [{ id: 'g3', name: 'Grateful Heart', emoji: '🧡', how: 'Write 3 gratitude notes', req: c => c.notes >= 3 }, { id: 'g5', name: 'Cozy Table', emoji: '🍽️', how: 'Write 5 gratitude notes', req: c => c.notes >= 5 }],
      skin: { emoji: '🦃', name: 'Cozy Rex', from: 'g5' } },
    { key: 'christmas', name: 'Christmas', emoji: '🎄', c: ['#0b3d2e', '#dc2626', '#fde68a'], tag: '25-day Advent calendar & hidden presents', special: 'advent',
      desc: 'Open one Advent door every day from December 1. Twelve presents are hidden around the app, and opening door 25 on Christmas Day unlocks a special reward.',
      win: y => [D(y, 11, 1), eod(y, 11, 26)], hunt: H(12, '🎁', 'Present', 'presents', 'Gift Finder', { golden: { name: 'Golden Present', emoji: '🎁' } }),
      layers: [{ id: 'snow', label: 'Snowfall', fx: 'snow' }, { id: 'presents', label: 'Floating presents', fx: 'presents' }],
      extra: [{ id: 'adv12', name: 'Advent Explorer', emoji: '🕯️', how: 'Open 12 Advent doors', req: c => c.doors >= 12 },
        { id: 'adv25', name: 'Advent Master', emoji: '📅', how: 'Open all 25 Advent doors', req: c => c.doors >= 25 },
        { id: 'xmas', name: 'Christmas Day Gift', emoji: '🎅', how: 'Open door 25 on December 25', req: c => c.xmas }],
      skin: { emoji: '🎅', name: 'Santa Rex', from: 'xmas' } }
  ];
  const ADVENT = ['Welcome to December! Warm drinks, soft lights.', 'Do something kind for someone today.', 'Snowflakes are all different, and so are you.', 'Hum your favourite winter song.',
    'Tidy one tiny corner. Future you says thanks.', 'Send a cheerful message to a friend.', 'Hot chocolate counts as a productivity tool.', 'Look for a star tonight.', 'Wrap something, even if it is small.',
    'Take a short walk and notice the cold air.', 'Write down one good thing from this week.', 'Halfway to a dozen! Doors 1 to 12 explorer unlocked at 12.', 'Light a candle or a lamp and take a breath.',
    'Learn one tiny new thing.', 'Share a cookie. Or the last bit of the idea.', 'Thank someone who helps you.', 'Make a playlist that feels like snow.', 'Give yourself a quiet ten minutes.',
    'Compliment a stranger, or a teammate.', 'The longest nights are close. Be gentle with yourself.', 'Look back at a project you finished this year.', 'Plan something small to look forward to.',
    'Almost there: tidy up, rest up.', 'Tomorrow is the big day. Today, just be cozy.', 'Merry Christmas! Thank you for spending the year with Rex. 🎄'];
  const BYKEY = {}; EV.forEach(d => { BYKEY[d.key] = d; });

  /* rewards: standard ones for every hunt, plus the event's own */
  const rewardCache = {};
  function rewardsOf(d) {
    if (rewardCache[d.key]) return rewardCache[d.key];
    const r = [], h = d.hunt;
    if (h) {
      const half = Math.ceil(h.n / 2);
      r.push({ id: 'first', name: 'First ' + h.one, emoji: h.emoji, how: 'Find your first ' + h.one.toLowerCase(), req: c => c.found >= 1 });
      r.push({ id: 'half', name: h.hunter || ('Halfway ' + h.one + ' Hunter'), emoji: '🥈', how: 'Find ' + half + ' of ' + h.n + ' ' + h.many, req: c => c.found >= half });
      r.push({ id: 'all', name: h.allName, emoji: '🏅', how: 'Find all ' + h.n + ' ' + h.many, req: c => c.all });
      if (h.golden) r.push({ id: 'golden', name: h.golden.name, emoji: '🌟', how: 'Find the rare ' + h.golden.name, req: c => c.golden });
    }
    (d.extra || []).forEach(e => r.push(e));
    r.forEach(x => { x.kind = 'badge'; });
    if (d.skin) { const t = r.find(x => x.id === d.skin.from); if (t) { t.kind = 'skin'; t.skin = d.skin.emoji; t.name = d.skin.name; t.emoji = d.skin.emoji; } }
    return (rewardCache[d.key] = r);
  }

  /* ---------------- scheduling ---------------- */
  function parseYmd(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = D(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 ? d : null; }
  function inst(d, y) {
    const w = d.win(y); let start = w[0], end = w[1], custom = false;
    // Event dates are fixed. Any custom dates saved by an older version in rexev1_config are ignored (and left untouched).
    return { id: d.key + '-' + y, def: d, year: y, start, end, custom, defStart: w[0], defEnd: w[1] };
  }
  const statusAt = (i, n) => n < i.start ? 'upcoming' : (n <= i.end ? 'active' : 'archived');
  function allInst(n) {
    n = n || new Date(); const Y = n.getFullYear(), out = [];
    EV.forEach(d => [Y - 1, Y, Y + 1].forEach(y => { const i = inst(d, y); i.status = statusAt(i, n); out.push(i); }));
    return out.sort((a, b) => a.start - b.start);
  }
  const hasProgress = i => (P.items[i.id] || []).length > 0 || Object.keys(P.advent[i.id] || {}).length > 0 || (P.gratitude[i.id] || []).length > 0 || Object.keys(P.claimed).some(k => k.indexOf(i.id + ':') === 0);
  function lists(n) {
    const a = allInst(n), Y = (n || new Date()).getFullYear();
    return {
      all: a, active: a.filter(i => i.status === 'active'), upcoming: a.filter(i => i.status === 'upcoming'),
      archived: a.filter(i => i.status === 'archived' && (i.year === Y || hasProgress(i))).sort((x, y) => y.end - x.end)
    };
  }
  function currentOf(key) { // the instance to show for an event: active > next upcoming > most recent ended
    const a = allInst().filter(i => i.def.key === key);
    return a.find(i => i.status === 'active') || a.find(i => i.status === 'upcoming') || a.filter(i => i.status === 'archived').pop();
  }
  function cdText(ms) {
    if (ms <= 0) return '0:00:00';
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (d ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(x);
  }
  const fD = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fRange = i => { const s = fD(i.start), e = fD(new Date(i.end.getTime() - 1)); return s === e ? s + ', ' + i.end.getFullYear() : s + ' – ' + e + ', ' + i.end.getFullYear(); };

  /* ---------------- hidden places ---------------- */
  function rng(seed) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  const poolCache = {};
  function pool(id) {
    if (poolCache[id]) return poolCache[id];
    const r = rng('rexev|' + id), a = POOL.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return (poolCache[id] = a);
  }
  const itemIds = d => { const a = []; for (let k = 1; k <= d.hunt.n; k++) a.push('i' + k); if (d.hunt.golden) a.push('g'); return a; };
  function placeOf(i, id) { const k = id === 'g' ? i.def.hunt.n : (+id.slice(1) - 1); return pool(i.id)[k % POOL.length]; }
  function offsetOf(i, id) { return 4 + Math.floor(rng('off|' + i.id + id)() * 86); }
  function emojiOf(d, id) { const h = d.hunt; if (id === 'g') return h.golden.emoji; const k = +id.slice(1) - 1; return h.emojis ? h.emojis[k % h.emojis.length] : h.emoji; }

  /* ---------------- progress & rewards ---------------- */
  const foundList = i => (P.items[i.id] || (P.items[i.id] = []));
  function ctxOf(i) {
    const d = i.def, f = P.items[i.id] || [], n = d.hunt ? d.hunt.n : 0, reg = f.filter(x => x !== 'g').length, adv = obj(P.advent[i.id]);
    return { found: reg, n, golden: f.indexOf('g') >= 0, all: n > 0 && reg >= n, flags: obj(P.flags[i.id]), doors: Object.keys(adv).length,
      xmas: adv['25'] === ymdStr(D(i.year, 11, 25)), notes: (P.gratitude[i.id] || []).length };
  }
  const goldenOpen = i => !!(i.def.hunt && i.def.hunt.golden && ctxOf(i).found >= Math.ceil(i.def.hunt.n / 2));
  function evaluate(i) {
    const fresh = [];
    rewardsOf(i.def).forEach(r => {
      const key = i.id + ':' + r.id; if (P.claimed[key]) return;
      let ok = false; try { ok = !!r.req(ctxOf(i)); } catch (_) { ok = false; }
      if (ok) { P.claimed[key] = { at: Date.now() }; fresh.push(r); }
    });
    if (fresh.length) saveP();
    fresh.forEach(r => safeToast('🏆 Reward unlocked: ' + r.name + (r.kind === 'skin' ? ' (equip it in Live Events → Rewards)' : ''), 'success'));
    return fresh;
  }
  function safeToast(m, t) { try { toast(m, t); } catch (_) {} }
  function chaptersOf(i) { const f = ctxOf(i).found; return (i.def.story || []).filter(s => f >= s.at); }
  function collect(i, id) {
    if (!i || i.status !== 'active' || !i.def.hunt) return false;
    if (itemIds(i.def).indexOf(id) < 0) return false;
    if (id === 'g' && !goldenOpen(i)) return false;
    const arr = foundList(i); if (arr.indexOf(id) >= 0) return false;
    const before = chaptersOf(i).length;
    arr.push(id); saveP();
    const c = ctxOf(i), h = i.def.hunt;
    if (id === 'g') safeToast('🌟 You found the ' + h.golden.name + '! Very rare.', 'success');
    else safeToast(emojiOf(i.def, id) + ' ' + h.one + ' found! ' + c.found + ' of ' + h.n, 'success');
    if (chaptersOf(i).length > before) safeToast('📖 A new story chapter is unlocked on the ' + i.def.name + ' page.', 'info');
    if (id !== 'g' && h.golden && c.found === Math.ceil(h.n / 2)) safeToast('✨ Something golden is glowing somewhere...', 'info');
    if (i.def.special === 'portal' && c.all) safeToast('🚪 The Haunted Portal is open on the event page.', 'info');
    evaluate(i);
    return true;
  }

  /* ---------------- nests (the hidden items) ---------------- */
  function activeHunts() { if (!PREF.nests) return []; return lists().active.filter(i => i.def.hunt && !i.def.solemn); }
  function mountNests(view) {
    const v = $('view-' + view); if (!v) return;
    v.querySelectorAll('.rev-nest').forEach(e => e.remove());
    if (view === 'events') return;
    activeHunts().forEach(i => {
      const got = P.items[i.id] || [];
      itemIds(i.def).forEach(id => {
        if (got.indexOf(id) >= 0 || placeOf(i, id) !== view) return;
        if (id === 'g' && !goldenOpen(i)) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rev-nest' + (id === 'g' ? ' gold' : ''); b.dataset.inst = i.id; b.dataset.item = id;
        b.style.marginLeft = offsetOf(i, id) + '%';
        b.setAttribute('aria-label', 'Hidden ' + (id === 'g' ? i.def.hunt.golden.name : i.def.hunt.one.toLowerCase()) + ' from ' + i.def.name + ' — activate to collect');
        b.title = id === 'g' ? 'Something golden!' : 'Psst... found one!';
        b.innerHTML = '<span aria-hidden="true">' + emojiOf(i.def, id) + '</span>';
        v.appendChild(b);
      });
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.rev-nest'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const i = allInst().find(x => x.id === b.dataset.inst);
    if (collect(i, b.dataset.item)) {
      const reduce = typeof window.rexFxReduced === 'function' && window.rexFxReduced();
      if (reduce) b.remove(); else { b.classList.add('pop'); setTimeout(() => b.remove(), 380); }
      if (ui.sel === i.id) renderPage();
      homeCard();
      const act = (document.querySelector('.view.active') || {}).id; if (act) mountNests(act.replace('view-', ''));
    } else b.remove();
  }, true);

  /* ---------------- effects hook (read by 03-holidays applySeason) ---------------- */
  const fxPref = (key, id) => !!obj(PREF.fx[key])[id];
  window.__rexEventFx = function () {
    if (!PREF.fxOn || !window.RexFxPresets) return null;
    const spec = [], sig = [];
    lists().active.forEach(i => (i.def.layers || []).forEach(l => {
      if (l.fog || !fxPref(i.def.key, l.id)) return;
      const m = window.RexFxPresets.make(l.fx, l.fx === 'fireworks' || l.fx === 'sparks' ? 0 : 22, .8); if (m) { spec.push(m); sig.push(i.def.key + ':' + l.id); }
    }));
    return spec.length ? { spec, sig: sig.join(',') } : null;
  };
  function syncFog() {
    let fog = $('revFog'); let on = false;
    if (PREF.fxOn) lists().active.forEach(i => (i.def.layers || []).forEach(l => { if (l.fog && fxPref(i.def.key, l.id)) on = true; }));
    if (on && !fog) { fog = document.createElement('div'); fog.id = 'revFog'; fog.setAttribute('aria-hidden', 'true'); document.body.appendChild(fog); }
    if (fog) fog.style.display = on ? '' : 'none';
  }
  const applyFx = () => { syncFog(); try { if (window.rexApplySeason) window.rexApplySeason(); } catch (_) {} };

  /* ---------------- skins ---------------- */
  function skinEmoji() {
    const s = PREF.skin; if (!s || !s.id) return null;
    const [ik, rid] = String(s.id).split(':'); // "<instId>:<rewardId>"
    return P.claimed[s.id] && s.emoji ? s.emoji : null;
  }
  function applySkin() { const el = document.querySelector('#view-home .home-rex'); if (!el) return; const e = skinEmoji(); el.textContent = e || '🐶'; el.title = e ? 'Reward skin equipped' : ''; }

  /* ---------------- UI ---------------- */
  const ui = { tab: 'now', sel: null, hints: {}, msg: null };
  const TABS = [['now', 'Happening now'], ['upcoming', 'Upcoming'], ['archive', 'Archive'], ['rewards', 'Rewards'], ['settings', 'Settings']];
  const themeStyle = d => '--ev1:' + d.c[0] + ';--ev2:' + d.c[1] + ';--ev3:' + d.c[2];
  const chip = s => '<span class="rev-chip ' + s + '">' + ({ active: '● Live now', upcoming: 'Upcoming', archived: 'Archived' }[s]) + '</span>';
  function progLine(i) {
    const d = i.def; if (!d.hunt) return '';
    const c = ctxOf(i), tot = d.hunt.n, pct = Math.round(c.found / tot * 100);
    return '<div class="rev-bar" role="img" aria-label="' + c.found + ' of ' + tot + ' found"><i style="width:' + pct + '%"></i></div><small>' + c.found + ' / ' + tot + ' ' + esc(d.hunt.many) + (c.golden ? ' · 🌟 golden' : '') + '</small>';
  }
  function cdSpan(i) {
    if (i.status === 'upcoming') return 'Starts in <b data-cd="' + i.start.getTime() + '">' + cdText(i.start - Date.now()) + '</b>';
    if (i.status === 'active') return 'Ends in <b data-cd="' + (i.end.getTime() + 1) + '">' + cdText(i.end.getTime() + 1 - Date.now()) + '</b>';
    return 'Ended ' + fD(new Date(i.end.getTime() - 1));
  }
  function tile(i) {
    const d = i.def;
    return '<button class="rev-tile" style="' + themeStyle(d) + '" data-a="open" data-id="' + i.id + '"><span class="rev-tile-e" aria-hidden="true">' + d.emoji + '</span>' +
      '<span class="rev-tile-b"><span class="rev-tile-h"><b>' + esc(d.name) + '</b> ' + chip(i.status) + (d.bonus ? ' <span class="rev-chip">Bonus</span>' : '') + '</span>' +
      '<span class="rev-tile-s">' + esc(d.tag) + ' · ' + esc(fRange(i)) + '</span><span class="rev-tile-s">' + cdSpan(i) + '</span>' + (d.hunt && i.status !== 'upcoming' ? progLine(i) : '') + '</span></button>';
  }
  function tabNow(L) {
    let h = '';
    if (L.active.length) h += '<div class="rev-grid">' + L.active.map(tile).join('') + '</div>';
    else h += '<div class="rev-empty">Nothing is live today. Here is what comes next:</div>';
    const nxt = L.upcoming.slice(0, 3);
    h += '<h3 class="rev-h">Coming up next</h3><div class="rev-grid">' + nxt.map(tile).join('') + '</div>';
    return h;
  }
  function tabUpcoming(L) {
    const Y = new Date().getFullYear();
    return '<p class="rev-note">Every event is already inside the app, so it starts on its own at 00:00 on its first day, no update needed. Movable holidays are calculated for the year shown.</p><div class="rev-grid">' + L.upcoming.slice(0, 18).map(tile).join('') + '</div>';
  }
  function tabArchive(L) {
    if (!L.archived.length) return '<div class="rev-empty">No archived events yet. Past events (and your rewards from them) will appear here.</div>';
    return '<p class="rev-note">Archived events keep your progress and rewards. Hidden items stay hidden once an event is over, but you can re-read stories and see what you earned.</p><div class="rev-grid">' + L.archived.map(tile).join('') + '</div>';
  }
  function tabRewards() {
    const rows = Object.keys(P.claimed).map(k => { const [iid, rid] = k.split(':'); const key = iid.replace(/-\d+$/, ''), yr = iid.slice(key.length + 1); const d = BYKEY[key]; const r = d && rewardsOf(d).find(x => x.id === rid); return r ? { k, d, r, yr, at: P.claimed[k].at || 0 } : null; })
      .filter(Boolean).sort((a, b) => b.at - a.at);
    const eq = PREF.skin && PREF.skin.id;
    let h = '<p class="rev-note">Rewards are permanent and stay on this device. Skins only change Rex\'s face on the Home page, and only when you equip one.</p>';
    if (!rows.length) return h + '<div class="rev-empty">No rewards yet. Join an event to earn your first one.</div>';
    h += '<div class="rev-rewards">' + rows.map(x => '<div class="rev-reward"><span class="rev-reward-e">' + x.r.emoji + '</span><div><b>' + esc(x.r.name) + '</b><small>' + esc(x.d.name) + ' ' + esc(x.yr) + ' · ' + (x.r.kind === 'skin' ? 'Rex skin' : 'Badge') + '</small></div>' +
      (x.r.kind === 'skin' ? (eq === x.k ? '<button class="sbtn" data-a="unequip">Unequip</button>' : '<button class="sbtn" data-a="equip" data-k="' + esc(x.k) + '" data-e="' + esc(x.r.skin) + '">Equip</button>') : '') + '</div>').join('') + '</div>';
    return h;
  }
  function tabSettings() {
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'this device'; } })();
    let h = '<div class="rev-card"><h3>How timing works</h3><p>Events start and end at midnight in <b>' + esc(tz) + '</b>, using this device\'s clock. This is not a global live event: there is no server, so different time zones start at different moments and progress is <b>stored only in this browser</b> (it does not sync between devices).</p></div>';
    h += '<div class="rev-card"><h3>Preferences</h3><label class="rev-sw"><input type="checkbox" data-a="pref" data-k="nests" ' + (PREF.nests ? 'checked' : '') + '> Show hidden collectibles around the app</label>' +
      '<label class="rev-sw"><input type="checkbox" data-a="pref" data-k="fxOn" ' + (PREF.fxOn ? 'checked' : '') + '> Allow event effects (each effect is still off until you switch it on)</label>' +
      '<p class="rev-note">Reduced-motion and “animations off” settings always turn animated effects off. These switches never change your Effect Lab or holiday theme settings.</p></div>';
    h += '<div class="rev-card"><h3>Your data</h3><p class="rev-note">Live Events uses only the keys <code>rexev1_progress</code>, <code>rexev1_config</code> and <code>rexev1_prefs</code>. They are not part of the normal data export and are removed by “Reset all data”. Updating the app never touches them.</p><button class="sbtn" data-a="export">Download my event progress</button></div>';
    return h;
  }

  function detail(i) {
    const d = i.def, c = ctxOf(i), act = i.status === 'active';
    let h = '<button class="sbtn rev-back" data-a="back">← All events</button>';
    h += '<section class="rev-hero" style="' + themeStyle(d) + '"><div class="rev-hero-e" aria-hidden="true">' + d.emoji + '</div><div><div>' + chip(i.status) + (d.bonus ? ' <span class="rev-chip">Bonus</span>' : '') + '</div>' +
      '<h2>' + esc(d.name) + ' ' + i.year + '</h2><p>' + esc(d.desc) + '</p><p class="rev-hero-s">' + esc(fRange(i)) + ' · ' + cdSpan(i) + (i.custom ? ' · custom dates' : '') + '</p></div></section>';
    if (d.solemn) return h + '<div class="rev-card"><h3>A quiet day</h3><p>' + esc(d.desc) + '</p></div>';
    if (d.hunt) {
      const done = c.all, ids = itemIds(d);
      h += '<div class="rev-card" style="' + themeStyle(d) + '"><h3>' + (d.hunt.emoji) + ' The hunt <small>' + c.found + ' / ' + d.hunt.n + (c.golden ? ' + 🌟' : '') + '</small></h3>' + progLine(i);
      h += act ? '<p class="rev-note">Hidden ' + esc(d.hunt.many) + ' are tucked at the bottom of some pages (not over any buttons). Use the clues below if you get stuck.</p>' :
        (i.status === 'upcoming' ? '<p class="rev-note">The hunt opens ' + esc(fD(i.start)) + '. Nothing is collectible until then.</p>' : '<p class="rev-note">This hunt has ended, so nothing new can be collected. Your finds are kept.</p>');
      h += '<div class="rev-slots">';
      ids.forEach(id => {
        const got = (P.items[i.id] || []).indexOf(id) >= 0, gold = id === 'g', k = i.id + id;
        const lock = gold && !goldenOpen(i) && !got;
        let tx;
        if (got) tx = '<b>' + esc(gold ? d.hunt.golden.name : d.hunt.one + ' ' + id.slice(1)) + '</b><small>Found</small>';
        else if (lock) tx = '<b>' + esc(d.hunt.golden.name) + '</b><small>Appears after ' + Math.ceil(d.hunt.n / 2) + ' ' + esc(d.hunt.many) + '</small>';
        else if (!act) tx = '<b>' + esc(gold ? d.hunt.golden.name : d.hunt.one + ' ' + id.slice(1)) + '</b><small>' + (i.status === 'upcoming' ? 'Hidden' : 'Missed') + '</small>';
        else tx = '<b>' + esc(gold ? d.hunt.golden.name : d.hunt.one + ' ' + id.slice(1)) + '</b>' + (ui.hints[k] ? '<small>Look ' + esc(HINT[placeOf(i, id)]) + ' (' + esc(PLACE[placeOf(i, id)]) + ')</small>' : '<button class="rev-hint" data-a="hint" data-k="' + k + '">Show clue</button>');
        h += '<div class="rev-slot ' + (got ? 'got ' : '') + (gold ? 'gold' : '') + '"><span class="rev-slot-e" aria-hidden="true">' + (got ? emojiOf(d, id) : (lock ? '🔒' : '❔')) + '</span><div>' + tx + '</div></div>';
      });
      h += '</div></div>';
    }
    if (d.special === 'portal') h += portalPanel(i, c);
    if (d.story) {
      const f = c.found;
      h += '<div class="rev-card" style="' + themeStyle(d) + '"><h3>📖 The secret story</h3>' + d.story.map(s => f >= s.at ? '<div class="rev-chap"><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div>' : '<div class="rev-chap lock"><b>🔒 Chapter locked</b><small>Find ' + s.at + ' ' + esc(d.hunt.many) + ' to read this</small></div>').join('') + '</div>';
    }
    if (d.special === 'countdown') h += countdownPanel(i, c);
    if (d.special === 'advent') h += adventPanel(i, c);
    if (d.special === 'gratitude') h += gratitudePanel(i, c);
    // rewards
    h += '<div class="rev-card"><h3>🏆 Rewards <small>kept forever once earned</small></h3><div class="rev-rewards">' + rewardsOf(d).map(r => {
      const got = !!P.claimed[i.id + ':' + r.id];
      return '<div class="rev-reward' + (got ? '' : ' lock') + '"><span class="rev-reward-e">' + (got ? r.emoji : '🔒') + '</span><div><b>' + (got || r.id !== 'portal' ? esc(r.name) : 'Mystery reward') + '</b><small>' + esc(r.how) + (r.kind === 'skin' ? ' · Rex skin' : '') + '</small></div></div>';
    }).join('') + '</div></div>';
    // effects
    if (d.layers && d.layers.length) {
      const reduce = typeof window.rexFxReduced === 'function' && window.rexFxReduced();
      h += '<div class="rev-card"><h3>✨ Effects <small>optional</small></h3>';
      if (!act) h += '<p class="rev-note">Effects can be switched on while the event is live.</p>';
      else if (reduce) h += '<p class="rev-note">Reduced motion (or “animations off”) is on, so animated effects stay off.</p>';
      else if (!PREF.fxOn) h += '<p class="rev-note">Event effects are switched off in Live Events → Settings.</p>';
      h += '<div class="rev-fx">' + d.layers.map(l => '<label class="rev-sw"><input type="checkbox" data-a="fx" data-ev="' + d.key + '" data-l="' + l.id + '" ' + (fxPref(d.key, l.id) ? 'checked' : '') + ' ' + (act ? '' : 'disabled') + '> ' + esc(l.label) + '</label>').join('') + '</div>' +
        '<p class="rev-note">These reuse the Effect Lab engine and never change your saved Effect Lab or theme settings. Effect Lab itself stays in charge if it is turned on. <a href="#" data-a="lab">Open Effect Lab</a></p></div>';
    }
    return h;
  }
  function portalPanel(i, c) {
    const d = i.def, open = c.all && i.status !== 'upcoming';
    let h = '<div class="rev-card rev-portal" style="' + themeStyle(d) + '"><h3>🚪 The Haunted Portal</h3>';
    if (!open) return h + '<p>The portal is sealed. It opens when all ' + d.hunt.n + ' pumpkins are found (' + c.found + ' / ' + d.hunt.n + ').</p></div>';
    return h + '<button class="rev-door" data-a="portal" data-id="' + i.id + '"><span aria-hidden="true">🚪</span><b>' + (c.flags.portal ? 'Step through again' : 'Step through the portal') + '</b></button></div>';
  }
  function countdownPanel(i, c) {
    const t = i.def.target(i.year), over = Date.now() >= t.getTime();
    let h = '<div class="rev-card rev-cd" style="' + themeStyle(i.def) + '"><h3>🕛 Midnight countdown</h3>';
    h += over ? '<p class="rev-big">🎉 Happy New Year ' + i.year + '!</p>' : '<p class="rev-big"><b data-cd="' + t.getTime() + '">' + cdText(t - Date.now()) + '</b></p><p class="rev-note">until January 1, ' + i.year + ' at midnight (this device\'s time).</p>';
    h += '<div class="rev-btns"><button class="sbtn" data-a="fireworks">🎆 Fireworks</button><button class="sbtn" data-a="confetti">🎊 Confetti</button>' +
      (i.status === 'active' ? '<button class="sbtn" data-a="celebrate" data-id="' + i.id + '" ' + (over ? '' : 'disabled title="Available after midnight"') + '>🥳 Celebrate' + (c.flags.celebrated ? ' ✓' : '') + '</button>' : '') + '</div></div>';
    return h;
  }
  function adventPanel(i, c) {
    const adv = obj(P.advent[i.id]), act = i.status === 'active', now = new Date();
    let h = '<div class="rev-card" style="' + themeStyle(i.def) + '"><h3>📅 Advent calendar <small>' + c.doors + ' / 25 opened</small></h3><div class="rev-doors">';
    for (let n = 1; n <= 25; n++) {
      const date = D(i.year, 11, n), opened = !!adv[n], can = act && now >= date && !opened;
      h += '<button class="rev-adoor' + (opened ? ' open' : '') + '" data-a="door" data-id="' + i.id + '" data-n="' + n + '" ' + (opened || can ? '' : 'disabled') + ' aria-label="Door ' + n + (opened ? ' (opened)' : now >= date ? '' : ' (opens ' + fD(date) + ')') + '">' + (opened ? '🎁<small>' + n + '</small>' : (now >= date && act ? n : '🔒<small>' + n + '</small>')) + '</button>';
    }
    h += '</div>' + (ui.msg && ui.msg.id === i.id ? '<p class="rev-msg"><b>Door ' + ui.msg.n + ':</b> ' + esc(ADVENT[ui.msg.n - 1]) + '</p>' : '<p class="rev-note">Tap an opened door to read its message again. Door 25 opened on December 25 unlocks a special reward.</p>') + '</div>';
    return h;
  }
  function gratitudePanel(i, c) {
    const notes = P.gratitude[i.id] || [], act = i.status === 'active';
    let h = '<div class="rev-card" style="' + themeStyle(i.def) + '"><h3>🧡 Gratitude table <small>' + notes.length + ' / 12</small></h3><p class="rev-note">These notes stay on this device only. Write 3 for Grateful Heart, 5 for Cozy Table.</p>';
    if (act) h += '<div class="rev-grat"><input id="revGrat" maxlength="140" placeholder="Today I am thankful for…" aria-label="Gratitude note"><button class="sbtn" data-a="grat-add" data-id="' + i.id + '">Add</button></div>';
    h += '<ul class="rev-notes">' + notes.map((n, k) => '<li><span>' + esc(n.t) + '</span>' + (act ? '<button class="rev-x" data-a="grat-del" data-id="' + i.id + '" data-n="' + k + '" aria-label="Remove note">×</button>' : '') + '</li>').join('') + '</ul></div>';
    return h;
  }

  function renderPage() {
    const root = $('rexEvRoot'); if (!root) return;
    const L = lists(), sel = ui.sel && L.all.find(i => i.id === ui.sel);
    let h = '<div class="rev-top"><div class="rev-chips"><span class="rev-pill">🕒 Uses this device\'s clock &amp; time zone</span><span class="rev-pill">💾 Progress is saved only in this browser</span></div></div>';
    if (sel) h += detail(sel);
    else {
      h += '<div class="rev-tabs" role="tablist">' + TABS.map(t => '<button role="tab" class="' + (ui.tab === t[0] ? 'on' : '') + '" aria-selected="' + (ui.tab === t[0]) + '" data-a="tab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
      h += ({ now: tabNow, upcoming: tabUpcoming, archive: tabArchive, rewards: tabRewards, settings: tabSettings }[ui.tab] || tabNow)(L);
    }
    root.innerHTML = h;
  }

  /* modal for the portal finale */
  function modal(html) {
    const bg = document.createElement('div'); bg.className = 'rev-modal-bg'; bg.innerHTML = '<div class="rev-modal" role="dialog" aria-modal="true">' + html + '<button class="btn rev-close">Close</button></div>';
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') close(); };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.classList.contains('rev-close')) close(); });
    document.addEventListener('keydown', esc_); document.body.appendChild(bg); const cb = bg.querySelector('.rev-close'); if (cb) cb.focus();
  }

  /* ---------------- actions ---------------- */
  const instById = id => allInst().find(i => i.id === id);
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#rexEvRoot [data-a], #rexEvCard [data-a]'); if (!t) return;
    const a = t.dataset.a; if (t.tagName === 'A') e.preventDefault();
    if (t.type === 'checkbox') return; // handled on change
    if (a === 'open') { ui.sel = t.dataset.id; if (!$('view-events').classList.contains('active')) showView('events'); else renderPage(); window.scrollTo(0, 0); }
    else if (a === 'back') { ui.sel = null; renderPage(); }
    else if (a === 'tab') { ui.tab = t.dataset.t; renderPage(); }
    else if (a === 'hint') { ui.hints[t.dataset.k] = 1; renderPage(); }
    else if (a === 'lab') { showView('holidays'); setTimeout(() => { const el = $('rexFxStyle'); if (el) el.scrollIntoView({ block: 'center' }); }, 50); }
    else if (a === 'equip') { PREF.skin = { id: t.dataset.k, emoji: t.dataset.e }; saveF(); applySkin(); renderPage(); safeToast('Skin equipped. Look at Rex on the Home page.', 'success'); }
    else if (a === 'unequip') { delete PREF.skin; saveF(); applySkin(); renderPage(); }
    else if (a === 'portal') { const i = instById(t.dataset.id); if (!i || !ctxOf(i).all || i.status === 'upcoming') return; (P.flags[i.id] = obj(P.flags[i.id])).portal = 1; saveP(); evaluate(i); modal('<div class="rev-fin"><div class="rev-fin-e" aria-hidden="true">🚪🎃👻</div><h2>The Haunted Portal</h2><p>' + esc(i.def.finale) + '</p></div>'); renderPage(); homeCard(); }
    else if (a === 'door') { const i = instById(t.dataset.id), n = +t.dataset.n; if (!i) return; const adv = (P.advent[i.id] = obj(P.advent[i.id]));
      if (adv[n]) { ui.msg = { id: i.id, n }; renderPage(); return; }
      if (i.status !== 'active' || new Date() < D(i.year, 11, n)) return;
      adv[n] = ymdStr(new Date()); saveP(); ui.msg = { id: i.id, n }; safeToast('🎁 Door ' + n + ' opened', 'success'); evaluate(i); renderPage(); homeCard(); }
    else if (a === 'grat-add') { const i = instById(t.dataset.id), inp = $('revGrat'); if (!i || i.status !== 'active' || !inp) return; const v = inp.value.trim().slice(0, 140); if (!v) return;
      const arr = (P.gratitude[i.id] = P.gratitude[i.id] || []); if (arr.length >= 12) { safeToast('That is 12 notes, a full table!', 'info'); return; }
      if (arr.some(x => x.t.toLowerCase() === v.toLowerCase())) { safeToast('You already wrote that one.', 'info'); return; }
      arr.push({ t: v, at: Date.now() }); saveP(); evaluate(i); renderPage(); homeCard(); }
    else if (a === 'grat-del') { const i = instById(t.dataset.id); if (!i || i.status !== 'active') return; (P.gratitude[i.id] || []).splice(+t.dataset.n, 1); saveP(); renderPage(); }
    else if (a === 'fireworks') { if (window.rexFxReduced && window.rexFxReduced()) { safeToast('Reduced motion is on, so effects are off.', 'info'); return; } for (let k = 0; k < 5; k++) setTimeout(() => window.rexFxFirework && window.rexFxFirework(), k * 260); }
    else if (a === 'confetti') { if (window.rexFxReduced && window.rexFxReduced()) { safeToast('Reduced motion is on, so effects are off.', 'info'); return; } window.rexFxBurst && window.rexFxBurst(); }
    else if (a === 'celebrate') { const i = instById(t.dataset.id); if (!i || i.status !== 'active' || Date.now() < i.def.target(i.year).getTime()) return; (P.flags[i.id] = obj(P.flags[i.id])).celebrated = 1; saveP(); evaluate(i);
      if (!(window.rexFxReduced && window.rexFxReduced())) { window.rexFxBurst && window.rexFxBurst(); for (let k = 0; k < 4; k++) setTimeout(() => window.rexFxFirework && window.rexFxFirework(), k * 300); } renderPage(); }
    else if (a === 'export') { try { const blob = new Blob([JSON.stringify({ app: 'Project Rex Live Events', exported: new Date().toISOString(), progress: P, config: CFG, prefs: PREF }, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'project-rex-live-events-progress.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); } catch (_) { safeToast('Could not create the download.', 'error'); } }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset || !t.dataset.a || !t.closest('#rexEvRoot')) return;
    if (t.dataset.a === 'fx') { const o = (PREF.fx[t.dataset.ev] = obj(PREF.fx[t.dataset.ev])); o[t.dataset.l] = !!t.checked; saveF(); applyFx(); }
    else if (t.dataset.a === 'pref') { PREF[t.dataset.k] = !!t.checked; saveF(); applyFx(); const act = (document.querySelector('.view.active') || {}).id; if (act) mountNests(act.replace('view-', '')); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'revGrat') { const b = document.querySelector('#rexEvRoot [data-a="grat-add"]'); if (b) b.click(); } });

  /* ---------------- Home card ---------------- */
  function homeCard() {
    const home = $('view-home'); if (!home) return;
    let c = $('rexEvCard');
    if (!c) { c = document.createElement('section'); c.id = 'rexEvCard'; c.className = 'rev-home'; const b = $('holidayBanner'); if (b && b.parentNode) b.parentNode.insertBefore(c, b.nextSibling); else home.appendChild(c); }
    const L = lists(), a = L.active[0], i = a || L.upcoming[0]; if (!i) { c.style.display = 'none'; return; }
    c.style.display = ''; const d = i.def;
    c.setAttribute('style', themeStyle(d));
    c.innerHTML = '<span class="rev-home-e" aria-hidden="true">' + d.emoji + '</span><div class="rev-home-b"><b>' + esc(d.name) + '</b> ' + chip(i.status) + '<small>' + (a ? esc(d.tag) : esc('Next live event · ' + fRange(i))) + ' · ' + cdSpan(i) + '</small>' + (a && d.hunt ? progLine(i) : '') + '</div><button class="sbtn" data-a="open" data-id="' + i.id + '">' + (a ? 'Open' : 'Preview') + '</button>';
  }

  /* ---------------- refresh & ticking ---------------- */
  const curView = () => { const v = document.querySelector('.view.active'); return v ? v.id.replace('view-', '') : ''; };
  function refreshAll() { renderPage(); homeCard(); const v = curView(); if (v) mountNests(v); applyFx(); }
  let lastSig = '';
  const sigNow = () => lists().all.map(i => i.id + ':' + i.status).join('|');
  let tickN = 0;
  setInterval(() => {
    tickN++;
    document.querySelectorAll('[data-cd]').forEach(el => { el.textContent = cdText(+el.dataset.cd - Date.now()); });
    if (tickN % 5 === 0) { const s = sigNow(); if (s !== lastSig) { lastSig = s; refreshAll(); } }
  }, 1000);

  /* ---------------- hook into navigation ---------------- */
  try { if (typeof views === 'object') views.events = ['Live Events', 'Holiday events, hunts & rewards']; } catch (_) {}
  const origShow = window.showView;
  if (typeof origShow === 'function') {
    window.showView = function (name) {
      const r = origShow.apply(this, arguments);
      try {
        if (name === 'events') { renderPage(); }
        if (name === 'home') { homeCard(); applySkin(); }
        mountNests(name);
      } catch (e) { console.error('Live Events:', e); }
      return r;
    };
  }
  lastSig = sigNow();
  applySkin(); homeCard(); applyFx();
  const first = curView(); if (first) mountNests(first);
  window.RexEvents = { lists, allInst, inst, rewardsOf, collect: (id, item) => collect(instById(id), item), status: () => sigNow(), placeOf: (id, item) => placeOf(instById(id), item), open: id => { ui.sel = id || null; showView('events'); },
    _state: () => ({ P, CFG, PREF }), easter, nthWd, EV };
})();
