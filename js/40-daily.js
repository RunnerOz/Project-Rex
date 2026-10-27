/* Project Rex Center 12.18.0 - Making it easy to open: Daily Reminders, quick-open links and an install nudge.
   Free and local. Nothing is sent anywhere. Reminders only fire while Rex is open (in a tab or an installed window), because a static site cannot
   send push messages when it is fully closed. Own data: rex1800_remind = { on, items:[{id,e,label,time,days[7],go,on}], sys, last:{id:day}, nudge:ms }.
   Quick-open links: ?go=<page> opens that page; ?go=focus25 starts a 25-minute Focus Room. The installed app also gets these as icon shortcuts. */
(function () {
  'use strict';
  const K = 'rex1800_remind', $ = id => document.getElementById(id), view = $('view-reminders'); if (!view) return;
  const GO = { home: 'Home', focusrooms: 'Focus Rooms', quests: 'Rex Quests', builder: 'Webhooks', clock: 'Dev Clock', schedule: 'Schedule', room: "Rex's Room", dashboard: 'Dashboard' };
  const WINDOW = 45 * 60000, NUDGE_GAP = 14 * 864e5, MAXN = 6;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const dk = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const ALL = [true, true, true, true, true, true, true];
  const PRESETS = () => [
    { id: 'am', e: '🌅', label: 'Morning check-in', time: '09:00', days: ALL.slice(), go: 'home', on: false },
    { id: 'focus', e: '🌧️', label: 'Focus time', time: '14:00', days: [false, true, true, true, true, true, false], go: 'focus25', on: false },
    { id: 'pm', e: '🌙', label: 'Evening wrap-up', time: '20:30', days: ALL.slice(), go: 'quests', on: false }
  ];
  const GOK = Object.assign({ focus25: 'Start a 25-minute focus' }, GO);

  /* ---------- saved data ---------- */
  function load() {
    let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { /* ignore */ }
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    const items = o && Array.isArray(o.items) ? o.items.filter(i => i && typeof i === 'object' && /^\d\d:\d\d$/.test(String(i.time)) && +String(i.time).slice(0, 2) < 24 && +String(i.time).slice(3) < 60).slice(0, MAXN).map((i, n) => ({
      id: String(i.id || 'r' + n).slice(0, 20), e: String(i.e || '⏰').slice(0, 4), label: String(i.label || 'Reminder').slice(0, 40), time: String(i.time), days: Array.isArray(i.days) && i.days.length === 7 ? i.days.map(Boolean) : ALL.slice(), go: GOK[i.go] ? i.go : 'home', on: !!i.on })) : PRESETS();
    const last = o && o.last && typeof o.last === 'object' ? o.last : {};
    return { on: o ? o.on !== false : true, items, sys: !!(o && o.sys), last, nudge: o && typeof o.nudge === 'number' ? o.nudge : 0 };
  }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function mut(fn) { const o = load(); fn(o); save(o); return o; }

  /* ---------- deciding what is due ---------- */
  const snooze = {};   // id -> time to show again (this session only)
  function due(o, nowMs) {
    const now = new Date(nowMs), key = dk(nowMs), out = [];
    o.items.forEach(it => {
      if (!it.on) return;
      if (snooze[it.id]) { if (nowMs >= snooze[it.id]) out.push(it); return; }
      if (!it.days[now.getDay()]) return;
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +it.time.slice(0, 2), +it.time.slice(3)).getTime();
      if (nowMs >= t && nowMs - t <= WINDOW && o.last[it.id] !== key) out.push(it);
    });
    return out;
  }
  function nextOne(o, nowMs) {
    let best = null;
    o.items.forEach(it => { if (!it.on) return; for (let d = 0; d < 8; d++) { const base = new Date(nowMs + d * 864e5); if (!it.days[base.getDay()]) continue; const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), +it.time.slice(0, 2), +it.time.slice(3)).getTime(); if (t > nowMs) { if (!best || t < best.t) best = { it, t }; break; } } });
    return best;
  }

  /* ---------- showing a reminder ---------- */
  let banner = null, shownId = null;
  function go(where) {
    if (where === 'focus25') { try { showView('focusrooms'); if (window.RexFocus && !RexFocus.state().running) RexFocus.start(RexFocus.load().scene, 25); } catch (e) { /* ignore */ } return; }
    try { showView(where); } catch (e) { /* ignore */ }
  }
  function hideBanner() { if (banner) banner.classList.remove('show'); shownId = null; }
  function showBanner(it) {
    if (!banner) {
      banner = document.createElement('div'); banner.id = 'rmBanner'; banner.className = 'rm-banner'; banner.setAttribute('role', 'status'); banner.setAttribute('aria-live', 'polite');
      banner.innerHTML = '<div class="rm-t"><b id="rmTitle"></b><small id="rmSub"></small></div><div class="rm-b"><button type="button" class="btn btn-primary" data-rm="open">Open</button><button type="button" class="btn btn-secondary" data-rm="snooze">Snooze 10 min</button><button type="button" class="btn btn-secondary" data-rm="dismiss" aria-label="Dismiss reminder">Dismiss</button></div>';
      document.body.appendChild(banner);
      banner.addEventListener('click', e => {
        const b = e.target.closest('[data-rm]'); if (!b || !shownId) return; const it2 = load().items.find(x => x.id === shownId), id = shownId; hideBanner();
        if (b.dataset.rm === 'open' && it2) go(it2.go); else if (b.dataset.rm === 'snooze') snooze[id] = Date.now() + 10 * 60000;
      });
    }
    shownId = it.id; $('rmTitle').textContent = it.e + ' ' + it.label; $('rmSub').textContent = 'Daily reminder · ' + it.time; banner.classList.add('show');
  }
  function sysNote(it) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !load().sys) return;
    const opt = { body: 'Tap to open Rex', tag: 'rex-' + it.id, icon: 'icons/icon-192.png' };
    try { const n = new Notification(it.label, opt); n.onclick = () => { try { window.focus(); } catch (e) { /* ignore */ } go(it.go); n.close(); }; }
    catch (e) { try { navigator.serviceWorker.getRegistration().then(r => { if (r && r.showNotification) r.showNotification(it.label, opt); }); } catch (e2) { /* ignore */ } }
  }
  function fire(it, real) {
    if (real) mut(o => { o.last[it.id] = dk(); });
    delete snooze[it.id]; showBanner(it); sysNote(it);
    try { if (typeof notify === 'function') notify(it.e + ' ' + it.label, 'info', 'reminder'); } catch (e) { /* ignore */ }
  }
  function check(nowMs) {
    nowMs = nowMs || Date.now(); const o = load(); if (!o.on || shownId) return 0;
    if (safe(() => window.RexFocus && RexFocus.state().running, false)) return 0;   // never interrupt a focus session; it fires after, inside the 45-minute window
    const list = due(o, nowMs); if (!list.length) return 0; fire(list[0], true); return 1;
  }

  /* ---------- quick-open links ---------- */
  function deep() {
    try {
      const u = new URL(location.href), q = u.searchParams.get('go'); if (!q) return;
      u.searchParams.delete('go'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      if (GOK[q]) go(q);
    } catch (e) { /* ignore */ }
  }

  /* ---------- install nudge on Home ---------- */
  // Shown only when it can help: the browser says Rex is installable (beforeinstallprompt, which only fires when it is not installed), or on iPhone/iPad where
  // installing is done by hand from the Share menu. Never shown inside the installed app.
  let offer = null, installed = false;
  const stand = () => safe(() => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true, false);
  const ua = () => navigator.userAgent || '', ios = () => /iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && (navigator.maxTouchPoints || 0) > 1);
  const safari = () => /Safari/.test(ua()) && !/Chrome|CriOS|FxiOS|Edg\//.test(ua());
  function paintNudge() {
    const home = $('view-home'); if (!home) return; let el = $('rexInstallNudge'); const o = load(), can = !!offer, isIos = ios();
    const show = !stand() && !installed && (can || isIos) && Date.now() - o.nudge > NUDGE_GAP;
    if (!show) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('section'); el.id = 'rexInstallNudge'; el.className = 'rm-nudge'; el.setAttribute('aria-label', 'Install Rex'); }
    const anchor = $('rexToday') || home.querySelector('.home-welcome'); if (anchor && el.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', el); else if (!anchor && !el.parentNode) home.insertBefore(el, home.firstElementChild);
    const tip = can ? '' : safari() ? 'Tap the Share button, then Add to Home Screen.' : 'Open this page in Safari, tap Share, then Add to Home Screen.';
    el.innerHTML = '<div class="rm-n-ic" aria-hidden="true">📲</div><div class="rm-n-t"><b>Keep Rex one tap away</b><small>Installed, it opens in its own window, and holding the icon gives shortcuts for Focus, Webhooks and Quests.' + (tip ? ' ' + E(tip) : '') + '</small></div><div class="rm-n-b">' + (can ? '<button type="button" class="btn btn-primary" data-nudge="install">Install</button>' : '') + '<button type="button" class="btn btn-secondary" data-nudge="later">Not now</button></div>';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-nudge]'); if (!b || !b.closest('#rexInstallNudge')) return;
    if (b.dataset.nudge === 'install') { try { if (offer) { const e2 = offer; offer = null; e2.prompt(); Promise.resolve(e2.userChoice).catch(() => null).then(() => paintNudge()); } } catch (er) { /* ignore */ } } else { mut(o => { o.nudge = Date.now(); }); const n = $('rexInstallNudge'); if (n) n.remove(); }
  });
  window.addEventListener('beforeinstallprompt', e => { offer = e; setTimeout(paintNudge, 50); });
  window.addEventListener('appinstalled', () => { installed = true; offer = null; setTimeout(paintNudge, 50); });

  /* ---------- the page ---------- */
  function build() {
    if (view.dataset.rm) return; view.dataset.rm = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">DAILY</span><h2>Daily Reminders</h2><p>Gentle nudges at the times you choose, plus quick ways to open Rex. Everything stays on this device.</p></div></header>' +
      '<section class="card"><div class="card-title"><h3>Reminders</h3><label class="rm-sw"><input type="checkbox" id="rmMaster"> On</label></div><p class="ar-hint" id="rmNext"></p><div id="rmList" class="rm-list"></div><div class="rm-row"><button type="button" class="btn btn-secondary" id="rmAdd">Add a reminder</button><button type="button" class="btn btn-secondary" id="rmReset">Reset to defaults</button></div></section>' +
      '<section class="card"><div class="card-title"><h3>Notifications</h3></div><label class="rm-sw"><input type="checkbox" id="rmSys"> Also show a system notification</label><p class="ar-hint" id="rmSysNote"></p><div class="rm-row"><button type="button" class="btn btn-secondary" id="rmTest">Send a test reminder</button></div>' +
      '<p class="ar-note">Rex is a static web app, so it cannot wake itself up when it is fully closed. Reminders appear while Rex is open in a tab or an installed window (a background tab works). If Rex was closed at the time, the reminder shows when you open it, for up to 45 minutes afterward.</p></section>' +
      '<section class="card"><div class="card-title"><h3>Open Rex faster</h3></div><p id="rmInstall"></p><p class="ar-hint">Bookmark these links, or add them to your home screen, to jump straight in:</p><ul class="rm-links" id="rmLinks"></ul></section>';
    $('rmMaster').addEventListener('change', e => { mut(o => { o.on = e.target.checked; }); paint(); });
    $('rmSys').addEventListener('change', e => {
      const on = e.target.checked;
      if (on && 'Notification' in window && Notification.permission === 'default') { try { Promise.resolve(Notification.requestPermission()).then(() => { mut(o => { o.sys = Notification.permission === 'granted'; }); paint(); }); } catch (er) { /* ignore */ } return; }
      mut(o => { o.sys = on && 'Notification' in window && Notification.permission === 'granted'; }); paint();
    });
    $('rmAdd').onclick = () => { const o = load(); if (o.items.length >= MAXN) return; mut(x => { x.items.push({ id: 'c' + Date.now().toString(36), e: '⏰', label: 'Reminder', time: '12:00', days: ALL.slice(), go: 'home', on: true }); }); paint(); };
    $('rmReset').onclick = () => { mut(o => { o.items = PRESETS(); o.last = {}; }); paint(); };
    $('rmTest').onclick = () => { fire({ id: 'test', e: '🔔', label: 'Test reminder', time: 'now', go: 'home', days: ALL, on: true }, false); };
    view.addEventListener('change', e => {
      const row = e.target.closest('[data-id]'); if (!row) return; const id = row.dataset.id, f = e.target.dataset.f; if (!f) return;
      mut(o => { const it = o.items.find(x => x.id === id); if (!it) return;
        if (f === 'on') it.on = e.target.checked; else if (f === 'label') it.label = String(e.target.value).trim().slice(0, 40) || 'Reminder'; else if (f === 'time' && /^\d\d:\d\d$/.test(e.target.value)) { it.time = e.target.value; delete o.last[id]; } else if (f === 'go' && GOK[e.target.value]) it.go = e.target.value;
        if (f === 'time' || f === 'on') delete snooze[id]; }); paint();
    });
    view.addEventListener('click', e => {
      const d = e.target.closest('[data-day]'), x = e.target.closest('[data-del]'), row = e.target.closest('[data-id]');
      if (d && row) { mut(o => { const it = o.items.find(v => v.id === row.dataset.id); if (it) it.days[+d.dataset.day] = !it.days[+d.dataset.day]; }); paint(); }
      if (x && row) { mut(o => { o.items = o.items.filter(v => v.id !== row.dataset.id); }); paint(); }
    });
  }
  function paint() {
    build(); const o = load();
    $('rmMaster').checked = o.on; $('rmAdd').disabled = o.items.length >= MAXN;
    const nx = nextOne(o, Date.now()); $('rmNext').textContent = !o.on ? 'Reminders are off.' : nx ? 'Next: ' + nx.it.label + ' at ' + nx.it.time + (dk(nx.t) === dk() ? ' today' : ' on ' + new Date(nx.t).toLocaleDateString(undefined, { weekday: 'long' })) : 'No reminders are switched on yet. Turn one on below.';
    $('rmList').innerHTML = o.items.length ? o.items.map(it => '<div class="rm-item" data-id="' + E(it.id) + '"><div class="rm-i-top"><label class="rm-sw"><input type="checkbox" data-f="on"' + (it.on ? ' checked' : '') + ' aria-label="Switch ' + E(it.label) + ' on"></label><input type="text" class="rm-label" data-f="label" value="' + E(it.label) + '" maxlength="40" aria-label="Reminder name"><input type="time" class="rm-time" data-f="time" value="' + E(it.time) + '" aria-label="Time"><button type="button" class="btn btn-secondary rm-del" data-del="1" aria-label="Delete ' + E(it.label) + '">Delete</button></div>' +
      '<div class="rm-i-bot"><div class="rm-days" role="group" aria-label="Days">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((n, i) => '<button type="button" class="rm-day' + (it.days[i] ? ' on' : '') + '" data-day="' + i + '" aria-pressed="' + (it.days[i] ? 'true' : 'false') + '" aria-label="' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i] + '">' + n + '</button>').join('') + '</div><label class="rm-go">Opens <select data-f="go">' + Object.keys(GOK).map(k => '<option value="' + k + '"' + (k === it.go ? ' selected' : '') + '>' + E(GOK[k]) + '</option>').join('') + '</select></label></div></div>').join('') : '<p class="fr-none">No reminders. Add one, or reset to the defaults.</p>';
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    $('rmSys').checked = o.sys && perm === 'granted'; $('rmSys').disabled = perm === 'unsupported' || perm === 'denied';
    $('rmSysNote').textContent = perm === 'unsupported' ? 'This browser does not support system notifications. The in-app reminder still works.' : perm === 'denied' ? 'Notifications are blocked for this site in your browser settings. The in-app reminder still works.' : 'Optional. The reminder always shows inside Rex; this also shows a system notification while Rex is open.';
    const isIn = stand() || installed;
    $('rmInstall').textContent = isIn ? 'Rex is installed. Hold its icon to see shortcuts for Focus, Webhooks and Quests.' : 'Install Rex from your browser (look for Install in the address bar or menu, or Add to Home Screen on iPhone and iPad). Then holding the icon shows shortcuts.';
    $('rmLinks').innerHTML = ['home', 'focus25', 'quests', 'builder'].map(k => '<li><a href="?go=' + k + '">' + E(GOK[k]) + '</a></li>').join('');
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'reminders') paint(); if (n === 'home') paintNudge(); } catch (e) { console.error('Daily', e); } return r; };
  try { if (typeof views === 'object') views.reminders = ['Reminders', 'Daily nudges']; } catch (e) { /* ignore */ }
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Daily Reminders')) COMMANDS.push({ name: 'Open Daily Reminders', run: () => showView('reminders') }, { name: 'Send a test reminder', run: () => fire({ id: 'test', e: '🔔', label: 'Test reminder', time: 'now', go: 'home', days: ALL, on: true }, false) }); } catch (e) { /* ignore */ }
  setInterval(() => { try { check(); } catch (e) { /* ignore */ } }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { try { check(); } catch (e) { /* ignore */ } } });
  window.addEventListener('focus', () => { try { check(); } catch (e) { /* ignore */ } });
  setTimeout(() => { try { deep(); } catch (e) { /* ignore */ } }, 1100);
  setTimeout(() => { try { check(); paintNudge(); } catch (e) { console.error('Daily', e); } }, 2200);
  window.RexRemind = { load, check, due, nextOne, fire: it => fire(it, false), paintNudge, state: () => ({ showing: shownId }), hide: hideBanner };
})();
