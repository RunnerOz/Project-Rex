/* Project Rex Center V13.2.0 · Webhook upgrades: template variables, clear error messages, embed helpers, Test All.
   Free and local. Never changes saved webhooks; results live in their own key. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const VK = 'rex1904_vars', HK = 'rex1901_whhealth';
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- Template variables ---------- */
  const BUILTIN = [
    ['date', 'Today’s date', d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate())],
    ['time', 'Time now', d => p2(d.getHours()) + ':' + p2(d.getMinutes())],
    ['datetime', 'Date and time', d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes())],
    ['weekday', 'Day of the week', d => DAYS[d.getDay()]],
    ['day', 'Day number', d => String(d.getDate())],
    ['month', 'Month name', d => MONTHS[d.getMonth()]],
    ['year', 'Year', d => String(d.getFullYear())],
    ['unix', 'Unix time', d => String(Math.floor(d.getTime() / 1000))],
    ['random', 'Random 1–100', () => String(1 + Math.floor(Math.random() * 100))],
    ['webhook', 'Webhook name', () => { try { const w = getWH(); return w ? w.name : ''; } catch (e) { return ''; } }],
    ['workspace', 'Workspace name', () => { try { return ws().name || ''; } catch (e) { return ''; } }]
  ];
  const customVars = () => { const v = rd(VK, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
  function apply(str, now) {
    if (typeof str !== 'string' || str.indexOf('{') < 0) return str;
    const d = now || new Date(), cv = customVars();
    return str.replace(/\{([a-zA-Z][a-zA-Z0-9_]{0,31})\}/g, (m, name) => {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(cv, name)) return String(cv[name]);
      const b = BUILTIN.find(x => x[0] === key);
      return b ? b[2](d) : m; // unknown {words} are left exactly as typed
    });
  }
  function applyDeep(v, now) {
    if (typeof v === 'string') return apply(v, now);
    if (Array.isArray(v)) return v.map(x => applyDeep(x, now));
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { o[k] = (k === 'url' || k === 'icon_url' || k === 'avatar_url') ? v[k] : applyDeep(v[k], now); }); return o; }
    return v;
  }
  const applyPayload = (p, now) => { try { return applyDeep(p, now); } catch (e) { return p; } };

  /* ---------- Clear error messages ---------- */
  function explain(status, body, wh) {
    let msg = '';
    try { const j = JSON.parse(body); if (j && j.message) msg = j.message; } catch (e) { /* not JSON */ }
    const s = Number(status) || 0, name = wh && wh.name ? ' “' + wh.name + '”' : '';
    if (s === 404 || /unknown webhook/i.test(msg)) return 'This webhook' + name + ' no longer exists on Discord. It was probably deleted. Make a new one in Discord (Channel settings → Integrations) and paste the new link.';
    if (s === 401 || /invalid webhook token/i.test(msg)) return 'Discord does not accept this webhook' + name + '. The link looks incomplete or has been reset. Copy the full link again from Discord.';
    if (s === 429) return 'Discord says slow down. Too many messages were sent too quickly. Wait a few seconds and try again.';
    if (s === 413) return 'The message or files are too big for Discord. Remove an attachment or shorten the text.';
    if (s >= 500) return 'Discord is having trouble right now (error ' + s + '). Nothing is wrong with your webhook. Try again in a minute.';
    if (/component|button/i.test(body || '')) return 'A button was rejected. Check each button has a label and a link starting with https://.';
    if (s === 400) return 'Discord did not accept this message' + (msg ? ': ' + msg : '') + '. Check embed sizes (see the limits card) and that links start with https://.';
    if (s === 403) return 'Discord blocked this webhook' + name + '. It may not be allowed to post in that channel.';
    return (msg || 'Discord rejected the request') + (s ? ' (error ' + s + ')' : '') + '.';
  }
  function errText(e) {
    const m = e && e.message ? String(e.message) : '';
    if (!navigator.onLine) return 'You look offline. Connect to the internet and try again.';
    if (/failed to fetch|networkerror|load failed|network request/i.test(m) || (e && e.name === 'TypeError')) return 'Could not reach Discord. Check your internet connection, and that the webhook link is complete and starts with https://discord.com/api/webhooks/.';
    return m || 'Something went wrong while sending.';
  }
  function urlProblem(url) {
    if (!url) return 'The webhook link is empty.';
    if (!/^https:\/\/(?:[a-z]+\.)?(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+/i.test(String(url).trim())) return 'This does not look like a Discord webhook link. It should start with https://discord.com/api/webhooks/.';
    return '';
  }

  /* ---------- Test All ---------- */
  const results = () => { const r = rd(HK, {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; };
  async function testOne(wh) {
    const bad = urlProblem(wh.url), t0 = Date.now();
    if (bad) return { ok: false, msg: bad, ms: 0 };
    try {
      /* ?wait=false and no message: GET on a webhook URL only reads its info, so nothing is posted to the channel. */
      const res = await fetch(String(wh.url).trim(), { method: 'GET' });
      const txt = res.ok ? '' : await res.text().catch(() => '');
      return res.ok ? { ok: true, msg: 'Working', ms: Date.now() - t0 } : { ok: false, msg: explain(res.status, txt, wh), ms: Date.now() - t0 };
    } catch (e) { return { ok: false, msg: errText(e), ms: Date.now() - t0 }; }
  }
  let running = false;
  async function testAll() {
    if (running) return; running = true;
    const list = (ws().webhooks || []).slice(), box = $('whAllBody');
    const rec = results(), now = Date.now();
    if (!list.length) { if (box) box.innerHTML = '<p class="r11-muted">You have no webhooks yet. Press + in the Webhook card to add one.</p>'; running = false; return; }
    const rows = list.map(w => ({ w, r: null }));
    const paint = () => { if (!box) return; const okN = rows.filter(x => x.r && x.r.ok).length, bad = rows.filter(x => x.r && !x.r.ok).length;
      box.innerHTML = '<p class="wh-sum" role="status">' + (rows.every(x => x.r) ? '<b>' + okN + ' working</b> · <b>' + bad + ' failing</b>' : 'Checking ' + rows.length + ' webhook' + (rows.length === 1 ? '' : 's') + '…') + '</p>' +
        rows.map(x => '<div class="wh-row ' + (x.r ? (x.r.ok ? 'ok' : 'bad') : '') + '"><b>' + (x.r ? (x.r.ok ? '✅' : '❌') : '⏳') + ' ' + esc(x.w.name) + '</b><span>' + (x.r ? esc(x.r.msg) : 'Checking…') + '</span></div>').join('') +
        '<p class="r11-muted">This only checks that each webhook exists. It does not post anything to your channels.</p>'; };
    paint();
    for (const row of rows) { row.r = await testOne(row.w); rec[row.w.id] = { ok: row.r.ok, msg: row.r.msg, at: Date.now(), name: row.w.name }; paint(); }
    wr(HK, rec); running = false; try { paintBadges(); } catch (e) { /* ignore */ }
    const bad = rows.filter(x => !x.r.ok).length;
    try { if (typeof notify === 'function') notify(bad ? bad + ' webhook' + (bad === 1 ? '' : 's') + ' failing' : 'All webhooks working', bad ? 'error' : 'success', 'webhook'); } catch (e) { /* ignore */ }
    return rows.map(x => ({ id: x.w.id, name: x.w.name, ok: x.r.ok, msg: x.r.msg }));
  }
  function openTestAll() {
    let m = $('whAllModal');
    if (!m) { m = document.createElement('div'); m.id = 'whAllModal'; m.className = 'wh-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Test all webhooks');
      m.innerHTML = '<div class="wh-box"><div class="card-title"><h3>🧪 Test all webhooks</h3><button class="btn btn-neutral" id="whAllClose" aria-label="Close">✕</button></div><div id="whAllBody"></div></div>'; document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.id === 'whAllClose') m.classList.remove('show'); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') m.classList.remove('show'); }); }
    m.classList.add('show'); return testAll();
  }
  function paintBadges() {
    const sel = $('webhookSelect'); if (!sel) return; const rec = results();
    Array.from(sel.options).forEach(o => { const r = rec[o.value]; const base = o.textContent.replace(/^[✅❌] /, ''); o.textContent = r ? (r.ok ? '✅ ' : '❌ ') + base : base; });
  }

  /* ---------- Builder panels ---------- */
  let lastField = 'message';
  function build() {
    if (!$('view-builder') || $('whVarsCard')) return;
    const anchor = $('builderTpls') && $('builderTpls').closest('.card'); if (!anchor) return;
    const card = document.createElement('div'); card.className = 'card'; card.id = 'whVarsCard';
    card.innerHTML = '<div class="card-title"><h3>🔤 Variables</h3><span class="r11-muted">fills in when you send</span></div>' +
      '<div class="wh-chips" id="whChips">' + BUILTIN.map(b => '<button type="button" class="wh-chip" data-v="' + b[0] + '" title="' + esc(b[1]) + '">{' + b[0] + '}</button>').join('') + '</div>' +
      '<div class="wh-chips" id="whCustomChips"></div>' +
      '<div class="wh-add"><input id="whVarName" placeholder="name (letters)" maxlength="31" aria-label="New variable name"><input id="whVarVal" placeholder="value" maxlength="200" aria-label="New variable value"><button type="button" class="btn btn-secondary" id="whVarAdd">Add</button></div>' +
      '<div class="wh-resolved" id="whResolved" aria-live="polite"></div>' +
      '<div class="wh-limits" id="whLimits"></div>';
    anchor.insertAdjacentElement('beforebegin', card);
    ['message', 'eTitle', 'eDesc', 'eFooter', 'eAuthor'].forEach(id => { const el = $(id); if (el) { el.addEventListener('focus', () => { lastField = id; }); el.addEventListener('input', refresh); } });
    $('whChips').addEventListener('click', e => { const b = e.target.closest('.wh-chip'); if (b) insert('{' + b.dataset.v + '}'); });
    $('whCustomChips').addEventListener('click', e => { const b = e.target.closest('.wh-chip'); if (!b) return; if (e.target.closest('.wh-x')) { const v = customVars(); delete v[b.dataset.v]; wr(VK, v); paintCustom(); refresh(); } else insert('{' + b.dataset.v + '}'); });
    $('whVarAdd').addEventListener('click', () => { const n = $('whVarName').value.trim(), val = $('whVarVal').value; if (!/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(n)) { toast('Use letters, numbers or _ and start with a letter', 'error'); return; } if (BUILTIN.some(b => b[0] === n.toLowerCase())) { toast('That name is already built in', 'error'); return; } const v = customVars(); v[n] = val; wr(VK, v); $('whVarName').value = ''; $('whVarVal').value = ''; paintCustom(); refresh(); toast('Variable {' + n + '} saved', 'success'); });
    paintCustom(); refresh();
    /* Embed colour starters */
    const ed = $('embedEd');
    if (ed && !$('whStarters')) { const row = document.createElement('div'); row.id = 'whStarters'; row.className = 'wh-chips';
      row.innerHTML = '<span class="r11-muted">Starter looks:</span>' + [['Info', '#43a9ff'], ['Success', '#2ecc71'], ['Warning', '#f1c40f'], ['Alert', '#e74c3c'], ['Purple', '#9b59b6']].map(c => '<button type="button" class="wh-chip" data-c="' + c[1] + '"><i style="background:' + c[1] + '"></i>' + c[0] + '</button>').join('');
      ed.insertAdjacentElement('afterbegin', row);
      row.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; $('eColor').value = b.dataset.c; if ($('eColorT')) $('eColorT').value = b.dataset.c; try { updatePreview(); } catch (x) { /* ignore */ } refresh(); }); }
    paintBadges();
    /* Test All button */
    const acts = $('webhookSelect') && $('webhookSelect').closest('.card') && $('webhookSelect').closest('.card').querySelector('.actions');
    if (acts && !$('whTestAll')) { const b = document.createElement('button'); b.id = 'whTestAll'; b.className = 'btn btn-secondary'; b.textContent = '🧪 Test all'; b.addEventListener('click', openTestAll); acts.appendChild(b); }
  }
  function insert(tok) {
    const el = $(lastField) || $('message'); if (!el) return;
    const a = el.selectionStart == null ? el.value.length : el.selectionStart, b = el.selectionEnd == null ? a : el.selectionEnd;
    el.value = el.value.slice(0, a) + tok + el.value.slice(b); el.focus(); const pos = a + tok.length; try { el.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
    el.dispatchEvent(new Event('input', { bubbles: true })); try { updatePreview(); } catch (e) { /* ignore */ }
  }
  function paintCustom() { const h = $('whCustomChips'); if (!h) return; const v = customVars(); h.innerHTML = Object.keys(v).map(k => '<button type="button" class="wh-chip" data-v="' + esc(k) + '" title="' + esc(v[k]) + '">{' + esc(k) + '} <span class="wh-x" role="button" aria-label="Remove ' + esc(k) + '">✕</span></button>').join(''); }
  function limits() {
    const g = id => ($(id) ? $(id).value : ''), on = $('embedOn') && $('embedOn').checked, out = [];
    if (g('message').length > 2000) out.push('Message is over 2000 characters.');
    if (on) {
      const fields = $('embedFields') ? $('embedFields').children.length : 0; let total = g('eTitle').length + g('eDesc').length + g('eFooter').length + g('eAuthor').length;
      if (g('eTitle').length > 256) out.push('Embed title is over 256 characters.');
      if (g('eDesc').length > 4096) out.push('Embed description is over 4096 characters.');
      if (fields > 25) out.push('An embed can have at most 25 fields.');
      if (g('eFooter').length > 2048) out.push('Embed footer is over 2048 characters.');
      if (g('eAuthor').length > 256) out.push('Embed author is over 256 characters.');
      if ($('embedFields')) Array.from($('embedFields').querySelectorAll('input,textarea')).forEach(x => { total += x.value.length; });
      if (total > 6000) out.push('The embed has ' + total + ' characters in total. Discord allows 6000.');
      ['eUrl', 'eImage', 'eThumb', 'eAuthorUrl', 'eFooterIcon'].forEach(id => { const v = g(id).trim(); if (v && !/^https?:\/\//i.test(v)) out.push('A link in the embed does not start with https://.'); });
    }
    return Array.from(new Set(out));
  }
  function refresh() {
    const r = $('whResolved'), l = $('whLimits'); if (!r) return;
    const parts = ['message', 'eTitle', 'eDesc'].map(id => $(id) ? $(id).value : '').filter(v => v && v.indexOf('{') >= 0);
    r.innerHTML = parts.length ? '<b>Preview with variables filled in:</b> ' + esc(apply(parts[0]).slice(0, 200)) : '<span class="r11-muted">Type {date} or press a chip to add a variable.</span>';
    const o = limits(); l.innerHTML = o.length ? o.map(x => '<div class="wh-warn">⚠️ ' + esc(x) + '</div>').join('') : '';
  }

  window.RexVars = { apply, applyPayload, list: () => BUILTIN.map(b => b[0]), custom: customVars };
  window.RexWH = { explain, errText, urlProblem, testAll, testOne, results, limits, openTestAll };
  const start = () => { try { build(); } catch (e) { console.warn('Rex: webhook tools skipped', e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 300)); else setTimeout(start, 300);
  document.addEventListener('change', e => { if (e.target && e.target.id === 'embedOn') setTimeout(refresh, 50); });
})();
