/* Project Rex Center 12.8.1 - Live Event reminders.
   A dismissible banner at the top of the page when a Live Event has just started, and again when one is about to end.
   It uses only this device's clock and only works while Rex is open: no push notifications, no servers, no tracking.
   It READS the Live Events calendar and your progress; the only thing it saves is its own settings and the list of
   reminders you already saw, in one key (rex128_evrem). */
(function () {
  'use strict';
  if (!window.RexEvents) return;
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex128_evrem', H = 3600000, MAX_SHOWN = 2, FRESH = 24 * H;
  const LEADS = [3, 12, 24, 48];

  function load() {
    let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {}
    if (!o || typeof o !== 'object') o = {};
    return { v: 1, on: o.on !== false, start: o.start !== false, ending: o.ending !== false, leadH: LEADS.indexOf(o.leadH) >= 0 ? o.leadH : 24, seen: (o.seen && typeof o.seen === 'object' && !Array.isArray(o.seen)) ? o.seen : {} };
  }
  function save(c) { try { localStorage.setItem(K, JSON.stringify(c)); return true; } catch (e) { return false; } }

  /* ---------- what is due right now ---------- */
  function due(c, now) {
    const out = [];
    if (!c.on) return out;
    let list = []; try { list = RexEvents.allInst(new Date(now)).filter(i => !i.def.hidden); } catch (e) { return out; }
    list.forEach(i => {
      const s = i.start.getTime(), e = i.end.getTime(); if (now < s || now > e) return;
      const sk = i.id + ':start', ek = i.id + ':end';
      // "started": only for events that began within the last 24 hours, so opening Rex mid-event does not announce old news
      if (c.start && !c.seen[sk] && now - s <= FRESH) out.push({ key: sk, kind: 'start', i, at: s });
      // "ending soon": the lead time is shortened for short events so a one-day event is not "ending soon" the moment it begins
      const lead = Math.min(c.leadH * H, (e - s) / 2);
      if (c.ending && !c.seen[ek] && e - now <= lead) out.push({ key: ek, kind: 'end', i, at: e });
    });
    return out.sort((a, b) => (a.kind === b.kind ? a.at - b.at : (a.kind === 'end' ? -1 : 1)));
  }

  function left(ms) {
    const m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d >= 1 ? d + 'd ' + (h % 24) + 'h' : h >= 1 ? h + 'h ' + (m % 60) + 'm' : m + ' min';
  }
  function progress(i) { try { const h = i.def.hunt; if (!h) return ''; const f = ((RexEvents._state().P.items[i.id]) || []).length; return 'You have found ' + f + ' of ' + h.n + ' ' + h.many + '.'; } catch (e) { return ''; } }

  /* ---------- banner ---------- */
  function box() {
    let b = $('evRemBox'); if (b) return b;
    const main = document.querySelector('main.main'), top = main && main.querySelector('.topbar'); if (!main) return null;
    b = document.createElement('div'); b.id = 'evRemBox'; b.className = 'evr-box'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Live Event reminders');
    if (top && top.nextSibling) main.insertBefore(b, top.nextSibling); else main.appendChild(b);
    b.addEventListener('click', onClick);
    return b;
  }
  function card(r, now, preview) {
    const d = r.i.def, c = (d.c && d.c[1]) || '#8b5cf6', ends = r.kind === 'end';
    const title = ends ? d.emoji + ' ' + d.name + ' ends in ' + left(r.i.end.getTime() - now) : d.emoji + ' ' + d.name + ' has started';
    const sub = ends ? (progress(r.i) || 'Last chance to collect what is left.') : (d.tag || 'Live Event') + ' · open it to see what you can collect.';
    return '<div class="evr-card ' + (ends ? 'is-end' : 'is-start') + '" style="--c:' + E(c) + '" role="status" data-evr="' + E(r.key) + '"' + (ends ? ' data-evr-end="' + r.i.end.getTime() + '" data-evr-name="' + E(d.emoji + ' ' + d.name) + '"' : '') + '>' +
      '<div class="evr-b"><strong>' + E(title) + '</strong><small>' + E(preview ? 'Preview only: this is what a reminder looks like. ' + sub : sub) + '</small></div>' +
      '<div class="evr-a"><button type="button" class="sbtn primary" data-evr-open="' + E(r.i.id) + '">Open</button><button type="button" class="sbtn" data-evr-x="' + E(r.key) + '" aria-label="Dismiss reminder">Dismiss</button></div></div>';
  }
  let shown = [];
  function render() {
    try {
      const b = box(); if (!b) return;
      const now = Date.now(), c = load(), list = due(c, now);
      if (window.RexTour && document.querySelector('.tour-ov')) { return; } // never on top of the tour
      shown = list;
      if (!list.length) { b.innerHTML = ''; b.classList.remove('has'); return; }
      const vis = list.slice(0, MAX_SHOWN), more = list.length - vis.length;
      b.innerHTML = vis.map(r => card(r, now)).join('') + (more > 0 ? '<button type="button" class="evr-more" data-evr-all="1">+' + more + ' more Live Event reminder' + (more === 1 ? '' : 's') + '</button>' : '');
      b.classList.add('has');
    } catch (e) { console.warn('Event reminders skipped:', e); }
  }
  function tickText() { // keep "ends in" fresh without redrawing
    document.querySelectorAll('#evRemBox [data-evr-end]').forEach(el => { const t = el.querySelector('strong'); if (t) t.textContent = el.dataset.evrName + ' ends in ' + left(+el.dataset.evrEnd - Date.now()); });
  }
  function mark(keys) {
    const c = load(), now = Date.now(); keys.forEach(k => { c.seen[k] = now; });
    // keep the list small: drop entries older than 400 days
    Object.keys(c.seen).forEach(k => { if (now - c.seen[k] > 400 * 86400000) delete c.seen[k]; });
    save(c);
  }
  function onClick(e) {
    const t = e.target.closest && e.target.closest('button'); if (!t) return;
    if (t.dataset.evrX) { mark([t.dataset.evrX]); render(); return; }
    if (t.dataset.evrOpen) { const card = t.closest('[data-evr]'); if (card && card.dataset.evr) mark([card.dataset.evr]); RexEvents.open(t.dataset.evrOpen); render(); return; }
    if (t.dataset.evrAll) { mark(shown.map(r => r.key)); RexEvents.open(); render(); }
  }

  /* opening the Live Events page counts as having seen the reminders for events that are running */
  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) {
    const r = prevShow.apply(this, arguments);
    try {
      if (n === 'events') { const k = shown.map(x => x.key); if (k.length) { mark(k); render(); } }
      if (n === 'settings') { buildCard(); paintCard(); }
    } catch (e) {}
    return r;
  };

  /* ---------- Settings → Alerts card ---------- */
  function buildCard() {
    if ($('evrCard')) return;
    const settings = $('view-settings'); if (!settings) return;
    const base = settings.querySelector(':scope > .card[data-sec="alerts"]'); if (!base) return;
    const c = document.createElement('div'); c.className = 'card'; c.id = 'evrCard'; c.dataset.sec = 'alerts'; c.style.display = base.style.display;
    c.innerHTML = '<div class="card-title"><h3>🎟️ Live Event reminders</h3></div>' +
      '<p class="set-note">A banner at the top of Rex when a Live Event starts and when one is about to end. It uses this device’s clock and only appears while Rex is open. No push notifications, nothing is sent anywhere.</p>' +
      '<div class="set-row"><div class="set-info"><b>Show Live Event reminders</b></div><div class="set-ctl"><label class="switch"><input type="checkbox" id="evrOn"><span class="slider"></span></label></div></div>' +
      '<div class="set-row"><div class="set-info"><b>When an event starts</b><small>Shown for the first 24 hours of an event.</small></div><div class="set-ctl"><label class="switch"><input type="checkbox" id="evrStart"><span class="slider"></span></label></div></div>' +
      '<div class="set-row"><div class="set-info"><b>When an event is about to end</b><small>Short events use half their length, so a one-day event is not “ending soon” as it begins.</small></div><div class="set-ctl"><label class="switch"><input type="checkbox" id="evrEnding"><span class="slider"></span></label></div></div>' +
      '<div class="set-row"><div class="set-info"><b>“About to end” means</b></div><div class="set-ctl"><select id="evrLead" aria-label="How long before an event ends">' + LEADS.map(h => '<option value="' + h + '">' + (h < 24 ? h + ' hours' : (h / 24) + (h === 24 ? ' day' : ' days')) + ' before</option>').join('') + '</select></div></div>' +
      '<div class="evr-set-actions"><button type="button" class="btn btn-secondary" id="evrPrev">Show a preview</button><button type="button" class="btn btn-secondary" id="evrReset">Show dismissed reminders again</button></div><p class="set-note" id="evrNote"></p>';
    base.insertAdjacentElement('afterend', c);
    const upd = () => { const o = load(); o.on = $('evrOn').checked; o.start = $('evrStart').checked; o.ending = $('evrEnding').checked; o.leadH = +$('evrLead').value; save(o); paintCard(); render(); };
    ['evrOn', 'evrStart', 'evrEnding', 'evrLead'].forEach(id => $(id).addEventListener('change', upd));
    $('evrPrev').addEventListener('click', preview);
    $('evrReset').addEventListener('click', () => { const o = load(); o.seen = {}; save(o); paintCard(); render(); if (typeof toast === 'function') toast('Dismissed reminders will show again if they still apply.'); });
  }
  function paintCard() {
    if (!$('evrCard')) return;
    const o = load(); $('evrOn').checked = o.on; $('evrStart').checked = o.start; $('evrEnding').checked = o.ending; $('evrLead').value = String(o.leadH);
    ['evrStart', 'evrEnding', 'evrLead'].forEach(id => { $(id).disabled = !o.on; });
    const n = due(o, Date.now()).length, seen = Object.keys(o.seen).length;
    $('evrNote').textContent = !o.on ? 'Reminders are off.' : (n ? n + ' reminder' + (n === 1 ? ' is' : 's are') + ' showing right now.' : 'No reminders are due right now.') + (seen ? ' ' + seen + ' dismissed.' : '');
  }
  function preview() {
    const b = box(); if (!b) return;
    let i = null; try { i = RexEvents.lists().active[0] || RexEvents.lists().upcoming[0]; } catch (e) {}
    if (!i) { if (typeof toast === 'function') toast('No Live Event to preview right now.', 'error'); return; }
    const now = Date.now(), end = i.end.getTime() > now;
    b.innerHTML = card({ key: '__preview', kind: end && i.status === 'active' ? 'end' : 'start', i }, now, true); b.classList.add('has');
    const x = b.querySelector('[data-evr-x]'); if (x) x.addEventListener('click', ev => { ev.stopPropagation(); setTimeout(render, 0); }, true);
  }

  /* ---------- timers: re-check every 30 seconds, and when the tab comes back ---------- */
  setInterval(() => { if (document.hidden) return; render(); tickText(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('focus', render);
  setTimeout(render, 1500);
  window.RexEvReminders = { render, due: () => due(load(), Date.now()), settings: load, key: K };
})();
