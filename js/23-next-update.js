/* Project Rex Center 12.9.0 - "Next update" countdown.
   If the site publishes a tiny file called next-update.json ({"version","at",...}), Rex shows a live countdown to that release time on Home and
   in the Update Log. When the time arrives it says the update should be out and points you to the Update Center.
   It NEVER installs or downloads an update: only pressing Update Now does that. With no file (the normal case) nothing is shown.
   The only network call is one small same-site GET (no cookies, nothing sent), about every 3 minutes while Rex is open and visible, and not at all if you turned off
   automatic update checks. The last good answer is kept in rex129_nextupd so the countdown still runs offline. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex129_nextupd', EVERY = 3 * 60000, GRACE = 3 * 86400000;
  const load = () => { try { const o = JSON.parse(localStorage.getItem(K) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const save = o => { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
  const clean = (d, n) => String(d == null ? '' : d).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

  /* accepts ISO times with or without a zone, "2026-10-18 12:00" (read as this device's local time, which Safari's Date.parse refuses), and epoch milliseconds */
  function parseAt(x) {
    if (typeof x === 'number') return Number.isFinite(x) ? x : NaN;
    const t = String(x == null ? '' : x).trim(), m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(t);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
    const m2 = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)\s*(Z|[+-]\d{2}:?\d{2})$/i.exec(t);
    return Date.parse(m2 ? m2[1] + 'T' + m2[2] + (m2[3].toUpperCase() === 'Z' ? 'Z' : m2[3].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')) : t);
  }
  function valid(d) {
    if (!d || typeof d !== 'object') return null;
    const v = clean(d.version, 20), at = parseAt(d.at); if (!/^\d+\.\d+\.\d+$/.test(v) || !Number.isFinite(at)) return null;
    const nm = d.name && typeof d.name === 'object' ? { computer: clean(d.name.computer, 24), phone: clean(d.name.phone, 24) } : { computer: '', phone: '' };
    return { version: v, at, name: nm, title: clean(d.title, 80), teaser: clean(d.teaser, 220) };
  }
  function current() { // what should be shown right now, or null
    const s = load(), d = (s.data && valid(s.data)) || (s.held && valid(s.held)); if (!d) return null;
    try { if (cmp(d.version, APP_VERSION) <= 0) return null; } catch (e) {}
    if (Date.now() - d.at > GRACE) return null;
    return d;
  }
  const dismissed = d => load().dismissed === d.version + '@' + d.at;

  let last = 0, busy = false;
  async function fetchIt(force) {
    if (busy || (!force && Date.now() - last < EVERY)) return; busy = true; last = Date.now();
    try {
      const r = await fetch('next-update.json?__rexnet=1&t=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
      const s = load(); s.checked = Date.now();
      if (r.status === 404) { delete s.data; s.status = 'none'; }
      else if (r.ok) {
        let j = null; try { j = await r.json(); } catch (e) { j = null; }
        const d = valid(j); if (d) { s.data = d; s.status = 'ok'; } else { delete s.data; s.status = 'bad'; }
      } else { s.status = 'error'; s.reason = 'The website answered HTTP ' + r.status + '.'; }
      save(s);
    } catch (e) { /* offline or blocked: keep the last good countdown, but say the check failed */ const s = load(); s.status = 'error'; s.reason = 'Could not reach the website (offline?).'; s.checked = Date.now(); save(s); }
    busy = false; paint();
  }
  const autoOn = () => { try { const p = JSON.parse(localStorage.getItem('rex115_prefs') || 'null'); return !(p && p.autoCheck === false); } catch (e) { return true; } };

  /* called by the Update Center when version.json carries a future "releaseAt": the release is already uploaded but held back until that time */
  function announce(a) {
    const d = valid(a); if (!d) return; const s = load(); s.held = d; save(s); paint();
  }
  /* when the announced time arrives, do an ordinary update check (it only looks at version.json; it never downloads or installs).
     If that check does not find the update yet (slow website, offline), try again about once a minute, up to 8 times. */
  let tries = 0, lastTry = 0, lastAvail = false;
  function available() { try { return !!(window.RexUpd && RexUpd.state().available); } catch (e) { return false; } }
  function autoCheck(d) {
    try {
      if (!autoOn() || !window.RexUpd || typeof RexUpd.check !== 'function' || available()) return;
      const now = Date.now(), tag = d.version + '@' + d.at, s = load();
      if (s.checkedFor !== tag) { s.checkedFor = tag; save(s); tries = 0; lastTry = 0; }
      if (tries >= 8 || now - lastTry < 45000) return;
      tries++; lastTry = now; setTimeout(() => { try { RexUpd.check(false); } catch (e) {} }, tries === 1 ? 4000 : 0);
    } catch (e) {}
  }

  /* ---------- display ---------- */
  function left(ms) {
    const t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60, p = n => String(n).padStart(2, '0');
    return d ? d + 'd ' + p(h) + 'h ' + p(m) + 'm ' + p(s) + 's' : p(h) + ':' + p(m) + ':' + p(s);
  }
  const when = at => { const x = new Date(at); return x.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + x.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  const nameOf = d => { const p = (typeof isPhoneView === 'function' && isPhoneView()); return (p ? d.name.phone : d.name.computer) || ''; };

  function html(d, home) {
    const live = Date.now() >= d.at, nm = nameOf(d);
    return '<div class="nu-i" aria-hidden="true">' + (live ? '🎉' : '⏳') + '</div><div class="nu-b"><span class="nu-k">' + (live ? 'NEW UPDATE' : 'NEXT UPDATE') + '</span>' +
      '<h3>v' + E(d.version) + (nm ? ' <span class="ul-name">' + E(nm) + '</span>' : '') + (d.title ? ' · ' + E(d.title) : '') + '</h3>' +
      (live ? '<p class="nu-t">' + (available() ? '<b>The update is ready.</b> Open the Update Center and press Update Now when you want it.' : 'It should be out now (' + E(when(d.at)) + '). Rex is checking for it. You can also open the Update Center and press Check for Updates.') + ' Nothing installs until you press Update Now.</p>'
        : '<p class="nu-t"><b class="nu-cd" data-nu-cd>' + left(d.at - Date.now()) + '</b><span>arrives ' + E(when(d.at)) + ' (your time)</span></p>') +
      (d.teaser ? '<p class="nu-s">' + E(d.teaser) + '</p>' : '') +
      '<div class="nu-a">' + (live ? '<button type="button" class="btn btn-primary btn-sm" data-nu="open">Open Update Center</button>' : '') + (home ? '<button type="button" class="btn btn-sm" data-nu="x">Hide</button>' : '') + '</div></div>';
  }
  function slot(id, parent, before) {
    let n = $(id); if (n) return n; if (!parent) return null;
    n = document.createElement('div'); n.id = id; n.className = 'nu-card'; n.hidden = true; n.setAttribute('role', 'status');
    parent.insertBefore(n, before || parent.firstChild); n.addEventListener('click', onClick); return n;
  }
  function paint() {
    const d = current();
    const log = slot('nuLog', $('view-changelog'), $('rexFeaturedRelease'));
    const home = slot('nuHome', $('view-home'), $('view-home') && $('view-home').firstElementChild);
    if (d && Date.now() >= d.at) autoCheck(d);
    statusLine(d);
    if (log) { log.hidden = !d; if (d) log.innerHTML = html(d, false); }
    if (home) { const show = d && !dismissed(d); home.hidden = !show; if (show) home.innerHTML = html(d, true); }
  }
  /* a small line in the Update Log that always says what Rex knows, so a missing countdown is never a mystery */
  function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; }
  function statusLine(d) {
    const host = $('view-changelog'); if (!host) return;
    let n = $('nuLogStatus');
    if (!n) { const ref = $('nuLog'); if (!ref) return; n = document.createElement('p'); n.id = 'nuLogStatus'; n.className = 'nu-status'; ref.insertAdjacentElement('afterend', n); n.addEventListener('click', e => { if (e.target.closest('[data-nu="recheck"]')) { n.firstChild && (n.firstChild.textContent = 'Checking… '); fetchIt(true); } }); }
    const s = load(); let t;
    if (d) { n.hidden = true; return; }
    if (!autoOn() && !s.checked) t = 'Next update: automatic update checks are off, so Rex has not looked for an announcement.';
    else if (!s.checked) t = 'Next update: not checked yet.';
    else if (s.status === 'error') t = 'Next update: could not check (' + (s.reason || 'no answer') + ').';
    else if (s.status === 'bad') t = 'Next update: the announcement file is not valid (it needs a version like 12.10.0 and a time).';
    else if (s.data && valid(s.data) && cmp(valid(s.data).version, APP_VERSION) <= 0) t = 'Next update: v' + valid(s.data).version + ' was announced, and you already have it.';
    else if (s.data && valid(s.data)) t = 'Next update: the announced time has passed.';
    else t = 'Next update: nothing announced right now.';
    n.hidden = false; n.innerHTML = '<span>' + E(t + (s.checked ? ' Checked ' + ago(s.checked) + '. ' : ' ')) + '</span><button type="button" class="ul-chip" data-nu="recheck">↻ Check now</button>';
  }
  function tick() {
    const d = current(); if (!d) return;
    if (Date.now() >= d.at && document.querySelector('.nu-cd')) { paint(); return; } // the moment it arrives, switch to the "it is out" message
    if (Date.now() >= d.at) { autoCheck(d); const a = available(); if (a !== lastAvail) { lastAvail = a; paint(); } return; }
    document.querySelectorAll('[data-nu-cd]').forEach(n => { n.textContent = left(d.at - Date.now()); });
  }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-nu]'); if (!b) return; const d = current();
    if (b.dataset.nu === 'x' && d) { const s = load(); s.dismissed = d.version + '@' + d.at; save(s); paint(); }
    else if (b.dataset.nu === 'open') { try { showView('settings'); RexV111.settingsTab('app'); } catch (er) {} }
  }

  /* the Update Log redraws its markup once at build time, so paint again after it does */
  const prevLog = window.renderChangelog;
  if (typeof prevLog === 'function') window.renderChangelog = function () { const r = prevLog.apply(this, arguments); try { paint(); fetchIt(true); } catch (e) {} return r; };
  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) { const r = prevShow.apply(this, arguments); try { if (n === 'home') { paint(); if (autoOn()) fetchIt(false); } } catch (e) {} return r; };

  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  /* look again every few minutes while Rex is open and visible, so an announcement made after you opened Rex still shows up */
  setInterval(() => { if (!document.hidden && autoOn()) fetchIt(false); }, 30000);
  window.addEventListener('focus', () => { if (autoOn() && Date.now() - last > 30000) fetchIt(true); });
  try { if (window.RexUpd && typeof RexUpd.check === 'function') { const oc = RexUpd.check; RexUpd.check = function () { const r = oc.apply(this, arguments); try { fetchIt(true); } catch (e) {} return r; }; } } catch (e) {}
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { paint(); if (autoOn() && Date.now() - last > 30000) fetchIt(true); } });
  setTimeout(() => { paint(); if (autoOn()) fetchIt(false); }, 1500);
  window.RexNextUpdate = { current, fetch: fetchIt, paint, key: K, parseAt, announce };
})();
