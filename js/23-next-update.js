/* Project Rex Center 12.9.0 - "Next update" countdown.
   If the site publishes a tiny file called next-update.json ({"version","at",...}), Rex shows a live countdown to that release time on Home and
   in the Update Log. When the time arrives it says the update should be out and points you to the Update Center.
   It NEVER installs or downloads an update: only pressing Update Now does that. With no file (the normal case) nothing is shown.
   The only network call is one small same-site GET (no cookies, nothing sent), at most every 20 minutes, and not at all if you turned off
   automatic update checks. The last good answer is kept in rex129_nextupd so the countdown still runs offline. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex129_nextupd', EVERY = 20 * 60000, GRACE = 3 * 86400000;
  const load = () => { try { const o = JSON.parse(localStorage.getItem(K) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const save = o => { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
  const clean = (d, n) => String(d == null ? '' : d).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

  function valid(d) {
    if (!d || typeof d !== 'object') return null;
    const v = clean(d.version, 20), at = typeof d.at === 'number' ? d.at : Date.parse(d.at); if (!/^\d+\.\d+\.\d+$/.test(v) || !Number.isFinite(at)) return null;
    const nm = d.name && typeof d.name === 'object' ? { computer: clean(d.name.computer, 24), phone: clean(d.name.phone, 24) } : { computer: '', phone: '' };
    return { version: v, at, name: nm, title: clean(d.title, 80), teaser: clean(d.teaser, 220) };
  }
  function current() { // what should be shown right now, or null
    const s = load(), d = s.data && valid(s.data); if (!d) return null;
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
      const s = load();
      if (r.status === 404) { delete s.data; save(s); }
      else if (r.ok) { const d = valid(await r.json()); if (d) { s.data = d; s.checked = Date.now(); } else delete s.data; save(s); }
    } catch (e) { /* offline or blocked: keep the last good answer */ }
    busy = false; paint();
  }
  const autoOn = () => { try { const p = JSON.parse(localStorage.getItem('rex115_prefs') || 'null'); return !(p && p.autoCheck === false); } catch (e) { return true; } };

  /* when the announced time arrives, do ONE ordinary update check (it only looks at version.json; it never downloads or installs) */
  function autoCheck(d) {
    try {
      const s = load(), tag = d.version + '@' + d.at; if (s.checkedFor === tag || !autoOn()) return;
      s.checkedFor = tag; save(s);
      if (window.RexUpd && typeof RexUpd.check === 'function') setTimeout(() => { try { RexUpd.check(false); } catch (e) {} }, 4000);
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
      (live ? '<p class="nu-t">It should be out now (' + E(when(d.at)) + '). Open the Update Center and check for updates. Nothing installs until you press Update Now.</p>'
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
    if (log) { log.hidden = !d; if (d) log.innerHTML = html(d, false); }
    if (home) { const show = d && !dismissed(d); home.hidden = !show; if (show) home.innerHTML = html(d, true); }
  }
  function tick() {
    const d = current(); if (!d) return;
    if (Date.now() >= d.at && document.querySelector('.nu-cd')) { paint(); return; } // the moment it arrives, switch to the "it is out" message
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
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { paint(); if (autoOn()) fetchIt(false); } });
  setTimeout(() => { paint(); if (autoOn()) fetchIt(false); }, 1500);
  window.RexNextUpdate = { current, fetch: fetchIt, paint, key: K };
})();
