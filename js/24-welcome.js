/* Project Rex Center 12.9.7 - Welcome: "What should Rex call you?" + guided first webhook (free, local).
   On a brand-new install Rex opens a short welcome: 1) your name, 2) a guided first Discord webhook with a test message, 3) an offer to take the tour.
   Everything can be skipped (Esc or "Skip for now"). Existing users are never interrupted by a window; if they still have the default name or no webhook,
   a small dismissible card on Home offers the same steps. Own saved data: rex1297_welcome only. The name is saved into the normal profile and the
   webhook into the normal webhook list, exactly as the Edit Profile and Add Webhook windows do. The test message goes only to the webhook you paste. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'rex1297_welcome', DEFAULT = 'Rex Operator';
  const read = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} };
  const rec = () => { const r = read(); return r && typeof r === 'object' ? r : {}; };
  const nameSet = () => { try { const u = state.profile && state.profile.username; return !!u && u !== DEFAULT; } catch (e) { return false; } };
  const hookCount = () => { try { return ws().webhooks.length; } catch (e) { return 0; } };
  const myName = () => { try { return nameSet() ? state.profile.username : ''; } catch (e) { return ''; } };
  const cleanName = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32);

  /* ---- webhook link check, in plain words ---- */
  function check(raw) {
    const u = String(raw || '').trim();
    if (!u) return { kind: 'idle', msg: '' };
    if (/^http:\/\//i.test(u)) return { kind: 'bad', msg: 'The link must start with https:// (not http://).' };
    if (!/^https:\/\//i.test(u)) return { kind: 'bad', msg: 'A webhook link starts with https://discord.com/api/webhooks/' };
    if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(u)) {
      return { kind: 'bad', msg: /discord/i.test(u) ? 'That is a Discord link, but not a webhook link. In Discord choose “Copy Webhook URL”.' : 'That is not a Discord webhook link. It should start with https://discord.com/api/webhooks/' };
    }
    if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d{15,25}\/[\w-]{20,}\/?(\?.*)?$/.test(u)) return { kind: 'bad', msg: 'The link looks cut off: the long code at the end is missing. Copy it again from Discord.' };
    return { kind: 'ok', msg: 'This looks like a real webhook link ✓' };
  }
  const explain = status => status === 404 || status === 401 || status === 403 ? 'Discord says this webhook does not exist (it may have been deleted) or the link is wrong. Check the link, or make a new webhook.'
    : status === 429 ? 'Discord asked Rex to slow down. Wait a few seconds and press Try again.' : 'Discord answered with an error (code ' + status + '). Try again in a moment.';

  /* ---- the welcome window ---- */
  let W = null;
  function open(first) {
    if (W) return;
    const ov = document.createElement('div'); ov.className = 'wz-bg'; ov.innerHTML = '<div class="wz-card" role="dialog" aria-modal="true" aria-labelledby="wzT"></div>';
    document.body.appendChild(ov);
    W = { ov, card: ov.querySelector('.wz-card'), step: first || 'name', hookId: null, tested: false, busy: false, prevFocus: document.activeElement };
    W.onKey = e => { if (!W) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skip(); } };
    document.addEventListener('keydown', W.onKey, true);
    render();
  }
  function close() {
    if (!W) return; document.removeEventListener('keydown', W.onKey, true); W.ov.remove();
    const f = W.prevFocus; W = null; try { if (f && f.focus && f.isConnected) f.focus(); } catch (e) {}
    paintCard();
  }
  function remember(extra) { write(Object.assign(rec(), { done: true, at: Date.now() }, extra || {})); }
  function skip() { remember({ skipped: true }); close(); }
  const dots = n => '<div class="wz-dots" aria-hidden="true">' + [0, 1, 2].map(i => '<i class="' + (i === n ? 'on' : i < n ? 'done' : '') + '"></i>').join('') + '</div>';

  function render() {
    if (!W) return; const c = W.card;
    if (W.step === 'name') {
      c.innerHTML = dots(0) + '<div class="wz-ic" aria-hidden="true">🦖</div><h2 id="wzT">Welcome to Project Rex Center</h2>' +
        '<p class="wz-sub">Everything stays in this browser. No account, nothing is uploaded, and it is free.</p>' +
        '<label class="wz-l" for="wzName">What should Rex call you?</label><input id="wzName" class="wz-in" maxlength="32" autocomplete="nickname" placeholder="Your name or nickname" value="' + E(myName()) + '">' +
        '<p class="wz-hint" id="wzNameHint" role="status">You can change it any time in Profile.</p>' +
        '<div class="wz-act"><button type="button" class="btn" data-wz="skip">Skip for now</button><button type="button" class="btn btn-primary" data-wz="name">Continue</button></div>';
      const i = $('wzName'); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } }); setTimeout(() => { try { i.focus(); i.select(); } catch (e) {} }, 30);
    } else if (W.step === 'hook') {
      const nm = myName();
      c.innerHTML = dots(1) + '<div class="wz-ic" aria-hidden="true">🔗</div><h2 id="wzT">Connect Discord</h2>' +
        '<p class="wz-sub">' + (nm ? 'Nice to meet you, <b>' + E(nm) + '</b>! ' : '') + 'A webhook is a private link that lets Rex post to one Discord channel. You need permission to manage webhooks in that server.</p>' +
        '<ol class="wz-steps"><li>In Discord open your server, then <b>Server Settings → Integrations → Webhooks</b> (on a phone: tap the server name → Settings → Integrations).</li><li>Press <b>New Webhook</b> and pick the channel it should post in.</li><li>Press <b>Copy Webhook URL</b> and paste it below.</li></ol>' +
        '<label class="wz-l" for="wzHName">Give it a name</label><input id="wzHName" class="wz-in" maxlength="40" placeholder="My first webhook" value="My first webhook">' +
        '<label class="wz-l" for="wzUrl">Webhook link</label><input id="wzUrl" class="wz-in" type="password" autocomplete="off" spellcheck="false" placeholder="https://discord.com/api/webhooks/…">' +
        '<label class="wz-show"><input type="checkbox" id="wzShow"> Show the link</label>' +
        '<p class="wz-msg" id="wzMsg" role="status" aria-live="polite"></p>' +
        '<p class="wz-hint">Treat this link like a password: anyone who has it can post in that channel. Rex keeps it only in this browser.</p>' +
        '<div class="wz-act"><button type="button" class="btn" data-wz="skip">Skip for now</button><button type="button" class="btn btn-primary" id="wzGo" data-wz="hook" disabled>Save and send a test</button></div>';
      const u = $('wzUrl'); u.addEventListener('input', () => { W.tested = false; paintMsg(); }); u.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = $('wzGo'); if (b && !b.disabled) hook(); } });
      $('wzShow').addEventListener('change', e => { u.type = e.target.checked ? 'text' : 'password'; });
      setTimeout(() => { try { u.focus(); } catch (e) {} }, 30);
    } else {
      const nm = myName(), r = rec();
      c.innerHTML = dots(2) + '<div class="wz-ic" aria-hidden="true">🎉</div><h2 id="wzT">' + (nm ? 'You are all set, ' + E(nm) + '!' : 'You are all set!') + '</h2>' +
        '<ul class="wz-sum"><li>' + (nm ? '✅ Rex will call you <b>' + E(nm) + '</b>' : '⬜ Name not set (Profile → Edit Profile)') + '</li><li>' + (r.hookTested ? '✅ Your webhook works and a test message was sent' : hookCount() ? '✅ A webhook is saved' : '⬜ No webhook yet (open Webhooks and press Add, or use the card on Home)') + '</li></ul>' +
        '<p class="wz-sub">Want a one-minute tour of the main places?</p>' +
        '<div class="wz-act"><button type="button" class="btn" data-wz="finish">Start using Rex</button><button type="button" class="btn btn-primary" data-wz="tour">🧭 Take the quick tour</button></div>';
      setTimeout(() => { const b = c.querySelector('[data-wz="tour"]'); try { b && b.focus(); } catch (e) {} }, 30);
    }
  }
  function paintMsg(note) {
    const m = $('wzMsg'), b = $('wzGo'), u = $('wzUrl'); if (!m || !u) return;
    const r = check(u.value); m.className = 'wz-msg ' + (note ? note.kind : r.kind); m.textContent = note ? note.msg : r.msg;
    if (b && !W.busy) { b.disabled = r.kind !== 'ok'; b.textContent = W.tested ? 'Continue' : W.hookId ? 'Try again' : 'Save and send a test'; if (W.tested) b.disabled = false; }
  }
  function saveName() {
    const v = cleanName($('wzName').value), h = $('wzNameHint');
    if (!v) { if (h) { h.textContent = 'Type a name first, or press “Skip for now”.'; h.classList.add('bad'); } try { $('wzName').focus(); } catch (e) {} return; }
    try { if (!state.profile) state.profile = {}; state.profile.username = v; save(); try { renderProfile(); } catch (e) {} try { updateAll(); } catch (e) {} } catch (e) { console.error('welcome: could not save the name', e); }
    remember({ name: true }); W.step = 'hook'; render();
  }
  async function hook() {
    if (!W || W.busy) return;
    if (W.tested) { W.step = 'done'; render(); return; }
    const url = $('wzUrl').value.trim(), nm = ($('wzHName').value || '').trim().slice(0, 40) || 'My first webhook', r = check(url); if (r.kind !== 'ok') { paintMsg(); return; }
    W.busy = true; const b = $('wzGo'); b.disabled = true; b.textContent = '⏳ Sending…'; $('wzMsg').className = 'wz-msg idle'; $('wzMsg').textContent = 'Saving the webhook and sending a test message…';
    let list; try { list = ws().webhooks; } catch (e) { W.busy = false; paintMsg({ kind: 'bad', msg: 'Rex could not open its data. Reload the page and try again.' }); return; }
    let h = W.hookId && list.find(x => x.id === W.hookId);
    if (h) { h.name = nm; h.url = url; }
    else { h = { id: String(Date.now()), name: nm, url, locked: false, created: new Date().toISOString() }; list.push(h); W.hookId = h.id; try { addTL('webhook', 'Added webhook ' + nm); notify('Webhook added: ' + nm, 'success'); } catch (e) {} }
    try { save(); updateAll(); const sel = $('webhookSelect'); if (sel) sel.value = h.id; } catch (e) {}
    let note;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '👋 **Project Rex** is connected. This is a test message from the welcome setup.', username: 'Project Rex' }) });
      if (!res.ok) throw Object.assign(new Error('rejected'), { status: res.status });
      try { ws().sent++; trackDay(); addTL('sent', 'Test to ' + nm); save(); updateAll(); } catch (e) {}
      W.tested = true; remember({ hookTested: true }); note = { kind: 'ok', msg: '✅ Sent! Check your Discord channel: you should see a message from “Project Rex”.' };
    } catch (e) {
      try { ws().failed++; save(); } catch (e2) {}
      note = { kind: 'bad', msg: e && e.status ? explain(e.status) : 'Could not reach Discord. Check your internet connection (some networks or browser extensions block Discord). Your webhook is saved; press Try again.' };
    }
    W.busy = false; if (!W) return; paintMsg(note);
  }

  /* ---- a small card on Home for people who skipped, or who had Rex before this window existed ---- */
  function paintCard() {
    const home = $('view-home'); if (!home) return;
    const r = rec(); let n = $('wzHome');
    const need = []; if (!nameSet() && !(r.dismiss && r.dismiss.name)) need.push('name'); if (!hookCount() && !(r.dismiss && r.dismiss.hook)) need.push('hook');
    if (W || !need.length || window.__rexFreshInstall && !r.done) { if (n) n.hidden = true; return; }
    if (!n) { n = document.createElement('div'); n.id = 'wzHome'; n.className = 'wz-home'; home.insertBefore(n, home.firstElementChild); n.addEventListener('click', onCard); }
    n.hidden = false;
    n.innerHTML = '<div class="wz-home-t"><b>👋 Finish setting up Rex</b><small>Two quick things. You can skip them.</small></div>' + need.map(k => '<div class="wz-home-r"><span>' + (k === 'name' ? '🙂 Tell Rex what to call you' : '🔗 Connect your first Discord webhook') + '</span><span><button type="button" class="btn btn-sm btn-primary" data-wzc="' + k + '">' + (k === 'name' ? 'Set my name' : 'Guide me') + '</button> <button type="button" class="btn btn-sm" data-wzx="' + k + '">Not now</button></span></div>').join('');
  }
  function onCard(e) {
    const b = e.target.closest && e.target.closest('[data-wzc],[data-wzx]'); if (!b) return;
    if (b.dataset.wzx) { const r = rec(); r.dismiss = Object.assign({}, r.dismiss); r.dismiss[b.dataset.wzx] = Date.now(); write(r); paintCard(); }
    else if (b.dataset.wzc === 'name') open('name'); else open('hook');
  }

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-wz]'); if (!b || !W || !W.ov.contains(b)) return; const a = b.dataset.wz;
    if (a === 'skip') { if (W.step === 'hook' || W.step === 'name') { remember({ skipped: true }); W.step = 'done'; render(); } else skip(); }
    else if (a === 'name') saveName(); else if (a === 'hook') hook();
    else if (a === 'finish') { remember(); close(); }
    else if (a === 'tour') { remember(); close(); try { const c = (typeof COMMANDS !== 'undefined' ? COMMANDS : []).find(x => x.name === 'Take the tour'); if (c) c.run(); else if (window.RexTour) window.RexTour.start(); } catch (er) {} }
  });
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Guided first webhook')) COMMANDS.push({ name: 'Guided first webhook', run: () => open('hook') }, { name: 'Change what Rex calls me', run: () => open('name') }); } catch (e) {}
  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) { const r = prevShow.apply(this, arguments); try { if (n === 'home') paintCard(); } catch (e) {} return r; };

  /* a brand-new install on a real browser: ask first (the tour is offered at the end). Existing users only get the Home card. */
  setTimeout(() => {
    try {
      if (!navigator.webdriver && window.__rexFreshInstall && read() === null && !document.querySelector('.modal-bg.show, .uc-modal-bg, .tour-ov')) open('name');
      else paintCard();
    } catch (e) { console.error(e); }
  }, 1200);
  window.RexWelcome = { open, close: () => close(), state: () => (W ? { open: true, step: W.step } : { open: false }), check, saved: read };
})();
