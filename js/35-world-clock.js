/* Project Rex Center 12.13.0 - World Clock (free, local, works offline).
   Pin up to 4 teammates' time zones to see who is awake before you send something. Everything comes from the browser's own
   Intl time zone data (including daylight saving), so there is no network, no account and no tracking. Nothing is sent anywhere.
   Own data: rex1313_wclock = { zones:[{id,label,tz}], h24:bool|null, ws:0-23 (work start), we:1-24 (work end) }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-worldclock'); if (!view) return;
  const K = 'rex1313_wclock', MAX = 4, HR = 3600e3;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CITIES = [['Honolulu', 'Pacific/Honolulu'], ['Anchorage', 'America/Anchorage'], ['Los Angeles', 'America/Los_Angeles'], ['San Francisco', 'America/Los_Angeles'], ['Seattle', 'America/Los_Angeles'], ['Vancouver', 'America/Vancouver'], ['Phoenix', 'America/Phoenix'], ['Denver', 'America/Denver'], ['Chicago', 'America/Chicago'], ['Dallas', 'America/Chicago'], ['Mexico City', 'America/Mexico_City'], ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'], ['Miami', 'America/New_York'], ['Boston', 'America/New_York'], ['Bogota', 'America/Bogota'], ['Lima', 'America/Lima'], ['Santiago', 'America/Santiago'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Sao Paulo', 'America/Sao_Paulo'], ['Reykjavik', 'Atlantic/Reykjavik'], ['London', 'Europe/London'], ['Dublin', 'Europe/Dublin'], ['Lisbon', 'Europe/Lisbon'], ['Madrid', 'Europe/Madrid'], ['Paris', 'Europe/Paris'], ['Berlin', 'Europe/Berlin'], ['Amsterdam', 'Europe/Amsterdam'], ['Rome', 'Europe/Rome'], ['Stockholm', 'Europe/Stockholm'], ['Warsaw', 'Europe/Warsaw'], ['Athens', 'Europe/Athens'], ['Helsinki', 'Europe/Helsinki'], ['Istanbul', 'Europe/Istanbul'], ['Kyiv', 'Europe/Kyiv'], ['Moscow', 'Europe/Moscow'], ['Cairo', 'Africa/Cairo'], ['Lagos', 'Africa/Lagos'], ['Nairobi', 'Africa/Nairobi'], ['Johannesburg', 'Africa/Johannesburg'], ['Dubai', 'Asia/Dubai'], ['Tehran', 'Asia/Tehran'], ['Karachi', 'Asia/Karachi'], ['Delhi', 'Asia/Kolkata'], ['Mumbai', 'Asia/Kolkata'], ['Kathmandu', 'Asia/Kathmandu'], ['Dhaka', 'Asia/Dhaka'], ['Bangkok', 'Asia/Bangkok'], ['Jakarta', 'Asia/Jakarta'], ['Singapore', 'Asia/Singapore'], ['Hong Kong', 'Asia/Hong_Kong'], ['Manila', 'Asia/Manila'], ['Shanghai', 'Asia/Shanghai'], ['Taipei', 'Asia/Taipei'], ['Seoul', 'Asia/Seoul'], ['Tokyo', 'Asia/Tokyo'], ['Perth', 'Australia/Perth'], ['Adelaide', 'Australia/Adelaide'], ['Sydney', 'Australia/Sydney'], ['Melbourne', 'Australia/Melbourne'], ['Brisbane', 'Australia/Brisbane'], ['Auckland', 'Pacific/Auckland']];
  const validTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return typeof tz === 'string' && tz.length < 60; } catch (e) { return false; } };
  const myTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
  const nice = tz => String(tz).split('/').pop().replace(/_/g, ' ');

  function load() { let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {} o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const zones = (Array.isArray(o.zones) ? o.zones : []).filter(z => z && typeof z === 'object' && typeof z.tz === 'string' && validTz(z.tz)).slice(0, MAX).map(z => ({ id: String(z.id || z.tz + Math.random()).slice(0, 40), label: String(z.label || '').slice(0, 40), tz: z.tz }));
    let ws = Number.isInteger(o.ws) ? o.ws : 9, we = Number.isInteger(o.we) ? o.we : 17; if (ws < 0 || ws > 23) ws = 9; if (we < 1 || we > 24 || we <= ws) we = Math.max(ws + 1, 17 > ws ? 17 : ws + 1); if (we > 24) we = 24;
    return { zones, h24: typeof o.h24 === 'boolean' ? o.h24 : null, ws, we }; }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }
  const use24 = o => o.h24 != null ? o.h24 : (() => { try { return !Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12; } catch (e) { return false; } })();

  /* ---------- time math (all from Intl) ---------- */
  const fmtCache = {};
  function parts(ms, tz) { const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' }));
    const r = {}; f.formatToParts(new Date(ms)).forEach(p => { r[p.type] = p.value; }); return { y: +r.year, mo: +r.month, d: +r.day, h: +r.hour % 24, mi: +r.minute, wd: r.weekday }; }
  const offMin = (ms, tz) => { const p = parts(ms, tz); return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000) / 60000); };
  const dayNum = p => Math.floor(Date.UTC(p.y, p.mo - 1, p.d) / 864e5);
  function clockText(ms, tz, h24) { try { return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: !h24 }).format(new Date(ms)); } catch (e) { return '--:--'; } }
  function status(ms, tz, o) { const p = parts(ms, tz), h = p.h + p.mi / 60; return h >= o.ws && h < o.we ? 'work' : (h >= 7 && h < 22 ? 'awake' : 'asleep'); }
  const SL = { work: 'Working hours', awake: 'Awake, off hours', asleep: 'Probably asleep' }, SE = { work: '🟢', awake: '🟡', asleep: '🌙' };
  function rel(ms, tz) { const me = dayNum(parts(ms, myTz())), th = dayNum(parts(ms, tz)); return th === me ? 'Same day' : th > me ? 'Tomorrow' : 'Yesterday'; }
  function diffText(ms, tz) { const d = offMin(ms, tz) - offMin(ms, myTz()); if (!d) return 'Same time as you'; const a = Math.abs(d), h = Math.floor(a / 60), m = a % 60; return (h ? h + 'h' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : '') + (d > 0 ? ' ahead of you' : ' behind you'); }

  /* the best time to reach everyone: first stretch in the next 48 hours when every pinned person is in working hours (or at least awake) */
  function bestWindow(o, from) {
    if (!o.zones.length) return null;
    const step = 15 * 60e3, first = Math.ceil(from / step) * step, times = [from]; for (let i = 0; i < 192; i++) times.push(first + i * step);
    for (const level of ['work', 'awake']) {
      const ok = ms => o.zones.every(z => { const s = status(ms, z.tz, o); return level === 'work' ? s === 'work' : s !== 'asleep'; });
      let s0 = null;
      for (const ms of times) { if (ok(ms)) { if (s0 === null) s0 = ms; } else if (s0 !== null) return { level, a: s0, b: ms }; }
      if (s0 !== null) return { level, a: s0, b: times[times.length - 1] };
    }
    return null;
  }
  function whenText(ms, h24) { const me = myTz(), n = Date.now(), dd = dayNum(parts(ms, me)) - dayNum(parts(n, me)); return (dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : parts(ms, me).wd) + ' ' + clockText(ms, me, h24); }

  /* ---------- view ---------- */
  let scrub = 0, timer = null, msg = '';
  const active = () => view.classList.contains('active');
  function build() {
    if (view.dataset.wc) return; view.dataset.wc = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">TEAM TIME</span><h2>World Clock</h2><p>Pin up to 4 teammates and see who is awake before you send something. It uses your browser\'s built-in time zone data, so it works offline and follows daylight saving.</p></div><div class="ar-bank"><b id="wcMe">--</b><small id="wcMeS"></small></div></header>' +
      '<section class="card"><div class="card-title"><h3>📌 Pin a teammate</h3><small id="wcCount"></small></div>' +
      '<div class="wc-add"><input id="wcName" type="text" maxlength="30" placeholder="Name (optional)" aria-label="Teammate name"><input id="wcCity" type="text" list="wcCities" placeholder="City, or a zone like Europe/Paris" aria-label="City or time zone" autocomplete="off"><datalist id="wcCities"></datalist><button type="button" class="btn btn-primary" id="wcAdd">Pin</button></div><p class="ar-hint" id="wcMsg" role="status" aria-live="polite"></p></section>' +
      '<section class="card" id="wcPlan"><div class="card-title"><h3>🔎 When should I send it?</h3></div><div class="wc-slide"><label for="wcRange">Look ahead</label><input id="wcRange" type="range" min="0" max="23" step="0.5" value="0"><button type="button" class="btn btn-ghost" id="wcNow">Now</button></div><p id="wcWhen" class="wc-when"></p><p id="wcBest" class="wc-best" role="status" aria-live="polite"></p><div id="wcBars" class="wc-bars"></div><div class="wc-legend"><span><i class="w"></i> Working hours</span><span><i class="a"></i> Awake</span><span><i class="s"></i> Asleep</span></div></section>' +
      '<div id="wcCards" class="wc-cards"></div>' +
      '<section class="card"><div class="card-title"><h3>⚙️ Settings</h3></div><div class="wc-set"><label>Working hours <select id="wcWs" aria-label="Working hours start"></select> to <select id="wcWe" aria-label="Working hours end"></select></label><label>Clock <select id="wcFmt" aria-label="Clock format"><option value="auto">Match my device</option><option value="12">12-hour</option><option value="24">24-hour</option></select></label></div><p class="ar-note">Awake means 7:00 to 22:00 in their time. Working hours apply to everyone you pin. Nothing leaves this device.</p></section>';
    $('wcCities').innerHTML = CITIES.map(c => '<option value="' + E(c[0]) + '"></option>').join('');
    const hs = i => { const d = new Date(Date.UTC(2020, 0, 1, i % 24)); return i === 24 ? '24:00' : (i < 10 ? '0' : '') + i + ':00'; };
    $('wcWs').innerHTML = Array.from({ length: 24 }, (_, i) => '<option value="' + i + '">' + hs(i) + '</option>').join(''); $('wcWe').innerHTML = Array.from({ length: 24 }, (_, i) => '<option value="' + (i + 1) + '">' + hs(i + 1) + '</option>').join('');
    $('wcAdd').addEventListener('click', add); $('wcCity').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    $('wcRange').addEventListener('input', () => { scrub = +$('wcRange').value; paint(); }); $('wcNow').addEventListener('click', () => { scrub = 0; $('wcRange').value = 0; paint(); });
    $('wcWs').addEventListener('change', () => setHours()); $('wcWe').addEventListener('change', () => setHours());
    $('wcFmt').addEventListener('change', () => { const o = load(), v = $('wcFmt').value; o.h24 = v === 'auto' ? null : v === '24'; save(o); paint(); });
    $('wcCards').addEventListener('click', e => { const b = e.target.closest('[data-wcdel]'); if (!b) return; const o = load(); o.zones = o.zones.filter(z => z.id !== b.dataset.wcdel); save(o); msg = 'Removed.'; paint(); });
  }
  function setHours() { const o = load(); let ws = +$('wcWs').value, we = +$('wcWe').value; if (we <= ws) { msg = 'Working hours must end after they start.'; } else { o.ws = ws; o.we = we; save(o); msg = ''; } paint(); }
  function resolve(txt) { const t = txt.trim(); if (!t) return null; const c = CITIES.find(x => x[0].toLowerCase() === t.toLowerCase()); if (c) return { tz: c[1], city: c[0] };
    const guess = t.replace(/\s+/g, '_'); try { const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []; const m = all.find(z => z.toLowerCase() === guess.toLowerCase()) || all.find(z => z.split('/').pop().toLowerCase() === guess.toLowerCase()); if (m) return { tz: m, city: nice(m) }; } catch (e) {}
    const direct = t.includes('/') ? guess : null; if (direct && validTz(direct)) return { tz: direct, city: nice(direct) };
    const part = CITIES.filter(x => x[0].toLowerCase().startsWith(t.toLowerCase())); return part.length === 1 ? { tz: part[0][1], city: part[0][0] } : null; }
  function add() { const o = load(), r = resolve($('wcCity').value);
    if (o.zones.length >= MAX) { msg = 'You can pin up to ' + MAX + '. Remove one first.'; return paint(); }
    if (!r) { msg = 'I do not know that place. Pick one from the list, or type a zone like Asia/Tokyo.'; return paint(); }
    o.zones.push({ id: 'z' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), label: $('wcName').value.trim().slice(0, 30), tz: r.tz }); save(o); $('wcName').value = ''; $('wcCity').value = ''; msg = 'Pinned ' + r.city + '.'; paint(); }

  function paint() {
    build(); const o = load(), h24 = use24(o), now = Date.now(), t = now + scrub * HR, me = myTz();
    $('wcMe').textContent = clockText(now, me, h24); $('wcMeS').textContent = 'You · ' + nice(me);
    $('wcCount').textContent = o.zones.length + ' of ' + MAX + ' pinned'; $('wcMsg').textContent = msg;
    $('wcWs').value = o.ws; $('wcWe').value = o.we; $('wcFmt').value = o.h24 == null ? 'auto' : o.h24 ? '24' : '12';
    $('wcWhen').textContent = scrub === 0 ? 'Showing right now.' : 'Showing ' + whenText(t, h24) + ' your time (' + (scrub % 1 ? Math.floor(scrub) + 'h 30m' : scrub + 'h') + ' from now).';
    const bw = bestWindow(o, now);
    $('wcBest').textContent = !o.zones.length ? 'Pin someone to find a good time to reach them.' : bw ? (bw.level === 'work' ? 'Everyone is in working hours ' : 'Everyone is awake (but not everyone is working) ') + (bw.a <= now + 60e3 ? 'right now' : 'from ' + whenText(bw.a, h24)) + ' until ' + whenText(bw.b, h24) + ' your time.' : 'There is no time in the next 2 days when everyone you pinned is awake. Consider a message they can read later.';
    const startH = Math.floor(now / HR) * HR, rows = [{ label: 'You', sub: nice(me), tz: me }].concat(o.zones.map(z => ({ label: z.label || nice(z.tz), sub: nice(z.tz), tz: z.tz })));
    const pos = Math.max(0, Math.min(1, (t - startH) / (24 * HR))) * 100;
    const axis = '<div class="wc-axis">' + [0, 6, 12, 18].map(i => '<span style="left:' + (i / 24 * 100) + '%">' + clockText(startH + i * HR, me, h24).replace(':00', '') + '</span>').join('') + '</div>';
    $('wcBars').innerHTML = axis + rows.map(r => '<div class="wc-row"><div class="wc-rl"><b>' + E(r.label) + '</b></div><div class="wc-strip" role="img" aria-label="' + E(r.label) + ' availability over the next 24 hours">' + Array.from({ length: 24 }, (_, i) => { const ms = startH + i * HR + HR / 2, s = status(ms, r.tz, o); return '<i class="' + s[0] + '" title="' + E(whenText(ms - HR / 2, h24) + ' your time: ' + SL[s]) + '"></i>'; }).join('') + '<u style="left:' + pos + '%"></u></div></div>').join('');
    const box = $('wcCards'); if (!o.zones.length) { box.innerHTML = '<section class="card wc-empty"><div class="wc-big">🌍</div><p>No one is pinned yet. Add a name and a city above to start.</p></section>'; }
    else box.innerHTML = o.zones.map(z => { const s = status(t, z.tz, o), p = parts(t, z.tz);
      return '<section class="card wc-card ' + s + '"><div class="wc-top"><div><b class="wc-name">' + E(z.label || nice(z.tz)) + '</b><small>' + E(nice(z.tz)) + ' · ' + E(diffText(t, z.tz)) + '</small></div><button type="button" class="btn btn-ghost wc-x" data-wcdel="' + E(z.id) + '" aria-label="Remove ' + E(z.label || nice(z.tz)) + '">✕</button></div>' +
        '<div class="wc-time">' + E(clockText(t, z.tz, h24)) + '</div><div class="wc-meta"><span class="wc-chip ' + s + '">' + SE[s] + ' ' + SL[s] + '</span><span>' + E(p.wd) + ' · ' + E(rel(t, z.tz)) + '</span></div></section>'; }).join('');
  }
  function tick() { if (!active()) { clearInterval(timer); timer = null; return; } if (document.activeElement && document.activeElement.id === 'wcRange') return; paint(); }
  function start() { paint(); clearInterval(timer); timer = setInterval(tick, 20000); }

  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'worldclock') { scrub = 0; start(); } else { clearInterval(timer); timer = null; } } catch (e) { console.error('WorldClock', e); } return r; };
  try { if (typeof views === 'object') views.worldclock = ['World Clock', 'Time zones of the people you work with']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open World Clock')) COMMANDS.push({ name: 'Open World Clock', run: () => showView('worldclock') }); } catch (e) {}
  window.RexWorldClock = { load, bestWindow: (o, f) => bestWindow(o || load(), f == null ? Date.now() : f), status: (ms, tz, o) => status(ms, tz, o || load()), resolve };
})();
