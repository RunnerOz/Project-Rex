/* Project Rex Center 12.9.9 - Missed-message report (free, local).
   Scheduled messages only go out while Rex is open. If a message was due while Rex was closed or the device slept, it used to be sent late
   the moment you opened Rex. Now a message that is overdue by more than a grace period (default 10 minutes) is held, and Home and Schedule show
   a report: for each one you choose Send now or Skip. Nothing is sent unless you choose (or you pick "send late automatically" in Settings ->
   Alerts, which is the old behaviour). It reads and updates the same scheduled-message list as before (a skipped message becomes "cancelled",
   exactly like Cancel). Own data: rex1299_missed = { mode, grace, log, notified }. Nothing is sent anywhere except the webhook you pick. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'rex1299_missed', MODES = [['ask', 'Ask me first (recommended)'], ['send', 'Send them late automatically (the old behaviour)'], ['skip', 'Skip them automatically']], GRACES = [5, 10, 30, 60];
  const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
  function load() {
    let o = {}; try { o = JSON.parse(localStorage.getItem(K) || 'null') || {}; } catch (e) {}
    return { mode: MODES.some(m => m[0] === o.mode) ? o.mode : 'ask', grace: GRACES.includes(+o.grace) ? +o.grace : 10, log: Array.isArray(o.log) ? o.log.slice(0, 30) : [], notified: typeof o.notified === 'string' ? o.notified : '' };
  }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} }
  const noteOf = s => s.note || s.webhookName || 'Scheduled message';
  function logIt(s, W, action) { const o = load(); o.log.unshift({ id: s.id, note: noteOf(s), wh: s.webhookName || '', due: s.when, action, at: Date.now() }); o.log = o.log.slice(0, 30); save(o); }
  const late = ms => { const m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); if (h < 48) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); return Math.floor(h / 24) + ' days'; };
  const preview = s => { const p = s.payload || {}, e = (p.embeds && p.embeds[0]) || {}; return clip(p.content || e.title || e.description || '', 140); };

  /* called by the scheduler for every due message: true = do not send it now */
  function hold(s, W, now) {
    if (s.release) return false;
    const o = load(); if (s.when > now - o.grace * 60000) return false;
    if (o.mode === 'send') return false;
    if (o.mode === 'skip') { s.status = 'cancelled'; try { addTL('cancel', 'Skipped a missed scheduled message'); } catch (e) {} logIt(s, W, 'auto-skipped'); return true; }
    return true;
  }
  function list(now) {
    now = now || Date.now(); const o = load(), out = [];
    try { state.workspaces.forEach(W => (W.scheduled || []).forEach(s => { if (s.status === 'pending' && !s.release && s.when <= now - o.grace * 60000) out.push({ W, s }); })); } catch (e) {}
    return out.sort((a, b) => a.s.when - b.s.when);
  }
  const find = (wid, id) => { const W = state.workspaces.find(w => w.id === wid); const s = W && W.scheduled.find(x => x.id === id); return s ? { W, s } : null; };

  /* ---- the report ---- */
  function cardHTML(items, many) {
    const now = Date.now(), n = items.length;
    return '<div class="ms-h"><span aria-hidden="true">⏰</span><div><b>' + n + ' scheduled message' + (n === 1 ? ' was' : 's were') + ' missed</b><small>Rex was closed or asleep when ' + (n === 1 ? 'it was' : 'these were') + ' due, so ' + (n === 1 ? 'it was' : 'they were') + ' not sent. Nothing goes out unless you choose.</small></div></div><ul class="ms-list">' +
      items.map(({ W, s }) => { const gone = !W.webhooks.some(x => x.id === s.webhookId), p = preview(s);
        return '<li data-w="' + E(W.id) + '" data-i="' + E(s.id) + '"><div class="ms-t"><b>' + E(noteOf(s)) + '</b><small>' + E((s.webhookName || 'webhook') + (many ? ' · ' + W.name : '') + ' · was due ' + new Date(s.when).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + late(now - s.when) + ' late') + '</small></div>' +
          (p ? '<p class="ms-p">' + E(p) + '</p>' : '') + (gone ? '<p class="ms-warn">Its webhook was deleted, so it cannot be sent.</p>' : '') +
          '<div class="ms-a"><button type="button" class="btn btn-sm btn-primary" data-ms="send"' + (gone ? ' disabled' : '') + '>Send now</button><button type="button" class="btn btn-sm" data-ms="skip">Skip</button></div></li>'; }).join('') + '</ul>' +
      (n > 1 ? '<div class="ms-f"><button type="button" class="btn btn-sm" data-ms="sendall">Send all now</button><button type="button" class="btn btn-sm" data-ms="skipall">Skip all</button></div>' : '');
  }
  function host(id, parent) {
    let n = $(id); if (n) return n; if (!parent) return null;
    n = document.createElement('div'); n.id = id; n.className = 'ms-card'; n.hidden = true; n.setAttribute('role', 'region'); n.setAttribute('aria-label', 'Missed scheduled messages');
    parent.insertBefore(n, parent.firstElementChild); n.addEventListener('click', onClick); return n;
  }
  function paint() {
    try {
      const items = list(), many = (state.workspaces || []).length > 1;
      ['msHome:view-home', 'msSched:view-schedule'].forEach(x => { const [id, pid] = x.split(':'), n = host(id, $(pid)); if (!n) return; n.hidden = !items.length; if (items.length) n.innerHTML = cardHTML(items, many); });
      const o = load(), sig = items.map(x => x.s.id).join(',');
      if (sig && sig !== o.notified) { o.notified = sig; save(o); try { toast('⏰ ' + items.length + ' scheduled message' + (items.length === 1 ? ' was' : 's were') + ' missed while Rex was closed. Review ' + (items.length === 1 ? 'it' : 'them') + ' on Home.', 'warn'); } catch (e) {} try { notify(items.length + ' missed scheduled message' + (items.length === 1 ? '' : 's') + ': open Home to send or skip', 'warn'); } catch (e) {} }
      else if (!sig && o.notified) { o.notified = ''; save(o); }
      paintCard();
    } catch (e) { console.error('Missed messages', e); }
  }
  async function sendNow(W, s) {
    if (state.settings.schedulingPaused) { try { toast('Scheduling is paused. Resume it on the Schedule page first.', 'warn'); } catch (e) {} return; }
    s.release = true; save2();
    for (let i = 0; i < 12 && s.status === 'pending'; i++) { await tickSchedule(); if (s.status === 'pending') await new Promise(r => setTimeout(r, 400)); }
    logIt(s, W, s.status === 'sent' ? 'sent' : s.status === 'failed' ? 'failed' : 'sent'); try { toast(s.status === 'sent' ? 'Sent ✓' : s.status === 'failed' ? 'Could not send it (Discord refused or the webhook is gone)' : 'Still waiting to send', s.status === 'failed' ? 'error' : 'success'); } catch (e) {}
    try { renderSchedule(); renderDashboard(); updateSchedUI(); } catch (e) {} paint();
  }
  const save2 = () => { try { window.save(); } catch (e) {} };   // the app's own save (this file's local save() is only for its own settings)
  function skip(W, s, quiet) { s.status = 'cancelled'; try { addTL('cancel', 'Skipped a missed scheduled message'); } catch (e) {} logIt(s, W, 'skipped'); save2(); if (!quiet) { try { renderSchedule(); renderDashboard(); updateSchedUI(); toast('Skipped', 'success'); } catch (e) {} paint(); } }
  async function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-ms]'); if (!b) return; const a = b.dataset.ms;
    if (a === 'send' || a === 'skip') { const li = b.closest('li'), f = li && find(li.dataset.w, li.dataset.i); if (!f) { paint(); return; } b.disabled = true; if (a === 'send') await sendNow(f.W, f.s); else skip(f.W, f.s); }
    else if (a === 'sendall' || a === 'skipall') {
      const items = list(); if (!items.length) return;
      if (!confirm((a === 'sendall' ? 'Send all ' : 'Skip all ') + items.length + ' missed messages' + (a === 'sendall' ? ' now' : '') + '?')) return;
      if (a === 'skipall') { items.forEach(x => skip(x.W, x.s, true)); try { renderSchedule(); renderDashboard(); updateSchedUI(); toast('Skipped ' + items.length, 'success'); } catch (er) {} paint(); }
      else { for (const x of items) await sendNow(x.W, x.s); }
    }
  }

  /* ---- Settings -> Alerts card ---- */
  function buildCard() {
    if ($('msCard')) return; const settings = $('view-settings'); if (!settings) return;
    const base = settings.querySelector(':scope > .card[data-sec="alerts"]'); if (!base) return;
    const anchor = $('evrCard') || base, c = document.createElement('div'); c.className = 'card'; c.id = 'msCard'; c.dataset.sec = 'alerts'; c.style.display = base.style.display;
    c.innerHTML = '<div class="card-title"><h3>⏰ Missed scheduled messages</h3></div><p class="set-note">Scheduled messages only go out while Rex is open. If one is due while Rex is closed or your device sleeps, this decides what happens when you come back.</p>' +
      '<div class="set-row"><div class="set-info"><b>When a message was missed</b></div><div class="set-ctl"><select id="msMode" aria-label="What to do with missed messages">' + MODES.map(m => '<option value="' + m[0] + '">' + m[1] + '</option>').join('') + '</select></div></div>' +
      '<div class="set-row"><div class="set-info"><b>Count it as missed after</b><small>A short delay is normal (a busy or background tab). Longer than this counts as missed.</small></div><div class="set-ctl"><select id="msGrace" aria-label="Minutes before a message counts as missed">' + GRACES.map(g => '<option value="' + g + '">' + g + ' minutes</option>').join('') + '</select></div></div>' +
      '<div id="msLog" class="ms-log"></div><div class="evr-set-actions"><button type="button" class="btn btn-secondary" id="msClear">Clear this list</button></div>';
    anchor.insertAdjacentElement('afterend', c);
    const upd = () => { const o = load(); o.mode = $('msMode').value; o.grace = +$('msGrace').value; save(o); paint(); };
    $('msMode').addEventListener('change', upd); $('msGrace').addEventListener('change', upd);
    $('msClear').addEventListener('click', () => { const o = load(); o.log = []; save(o); paintCard(); });
  }
  function paintCard() {
    if (!$('msCard')) return; const o = load(); $('msMode').value = o.mode; $('msGrace').value = String(o.grace);
    $('msLog').innerHTML = o.log.length ? '<b>Recently handled</b><ul>' + o.log.slice(0, 6).map(l => '<li>' + E(({ sent: '✅ Sent', failed: '⚠️ Could not send', skipped: '⏭ Skipped', 'auto-skipped': '⏭ Skipped automatically' })[l.action] || l.action) + ' · ' + E(l.note) + ' <small>(was due ' + E(new Date(l.due).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ')</small></li>').join('') + '</ul>' : '<small>Nothing handled yet.</small>';
  }

  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) { const r = prevShow.apply(this, arguments); try { if (n === 'home' || n === 'schedule') paint(); if (n === 'settings') { buildCard(); paintCard(); } } catch (e) {} return r; };
  setTimeout(() => { paint(); buildCard(); }, 2600);
  setInterval(() => { if (!document.hidden) paint(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { try { tickSchedule(); } catch (e) {} setTimeout(paint, 300); } });
  window.RexMissed = { hold, list, paint, load, find, sendNow: (w, i) => { const f = find(w, i); return f && sendNow(f.W, f.s); }, skip: (w, i) => { const f = find(w, i); if (f) skip(f.W, f.s); } };
})();
