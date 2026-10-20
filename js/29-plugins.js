/* Project Rex Center 12.10.0 - Plugins and mini-apps (free, local, and safe by design).
   A plugin is a small JSON file that describes blocks to show: text, links, a checklist, a countdown, a counter, a daily quote, real Rex stats,
   or a button that posts a message to one of YOUR webhooks. Plugins are DATA, not code: Rex never runs anything from them, never loads anything
   from the internet for them (no images, no scripts, no fonts), and a plugin button can only send after you press it AND confirm.
   Every piece of text is shown as plain text. Import is checked and previewed before anything is saved.
   Own data: rex1300_plugins = { items: [ {id, name, icon, description, author, version, where, enabled, blocks, state} ] }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-plugins'); if (!view) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'rex1300_plugins', MAX_PLUGINS = 20, MAX_BLOCKS = 30, MAX_BYTES = 100 * 1024;
  const WHERE = { page: 'Plugins page only', home: 'Home only', both: 'Plugins page and Home' };
  const BLOCKS = { text: 'Text', links: 'Links', checklist: 'Checklist', countdown: 'Countdown', counter: 'Counter', quote: 'Daily quote', button: 'Webhook button', stats: 'Rex stats' };
  function read() { let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {} return o && Array.isArray(o.items) ? o : { items: [] }; }
  function write(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { try { toast('Could not save (browser storage is full or blocked).', 'error'); } catch (er) {} return false; } }

  /* ---------- checking a plugin file: everything is validated and clipped, nothing is trusted ---------- */
  const str = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
  function url(u) { try { const x = new URL(String(u || '').trim()); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href.slice(0, 500) : ''; } catch (e) { return ''; } }
  function validate(raw) {
    const err = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['This is not a plugin file (it should be a JSON object).'] };
    if (raw.rexPlugin !== 1) err.push('Missing "rexPlugin": 1 (this marks the file as a Rex plugin).');
    const id = String(raw.id || '').toLowerCase(); if (!/^[a-z0-9][a-z0-9_-]{1,40}$/.test(id)) err.push('"id" must be 2 to 41 characters: lowercase letters, numbers, - or _.');
    const name = str(raw.name, 40).trim(); if (!name) err.push('"name" is required (up to 40 characters).');
    const where = raw.where == null ? 'page' : raw.where; if (!WHERE[where]) err.push('"where" must be "page", "home" or "both".');
    if (!Array.isArray(raw.blocks) || !raw.blocks.length) err.push('"blocks" must be a list with at least one block.');
    else if (raw.blocks.length > MAX_BLOCKS) err.push('A plugin can have up to ' + MAX_BLOCKS + ' blocks.');
    const blocks = [];
    (Array.isArray(raw.blocks) ? raw.blocks.slice(0, MAX_BLOCKS) : []).forEach((b, i) => {
      const at = 'Block ' + (i + 1) + ': ';
      if (!b || typeof b !== 'object' || !BLOCKS[b.type]) { err.push(at + 'type must be one of ' + Object.keys(BLOCKS).join(', ') + '.'); return; }
      const o = { type: b.type, title: str(b.title, 80) };
      if (b.type === 'text') { o.text = str(b.text, 2000); if (!o.text.trim()) err.push(at + 'text needs "text".'); }
      else if (b.type === 'links') { o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 20).map(x => ({ label: str(x && x.label, 80), url: url(x && x.url) })).filter(x => x.label && x.url); if (!o.items.length) err.push(at + 'links needs "items" with a "label" and an http(s) "url".'); }
      else if (b.type === 'checklist') { o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map(x => str(x, 120)).filter(Boolean); if (!o.items.length) err.push(at + 'checklist needs "items" (a list of text).'); }
      else if (b.type === 'countdown') { const t = Date.parse(String(b.to || '')); if (!isFinite(t)) err.push(at + 'countdown needs "to" as a date, like "2026-12-25T00:00:00".'); o.to = String(b.to || '').slice(0, 40); o.label = str(b.label, 80); }
      else if (b.type === 'counter') { o.start = Number.isFinite(+b.start) ? Math.max(-1e6, Math.min(1e6, Math.trunc(+b.start))) : 0; o.step = Number.isFinite(+b.step) && +b.step !== 0 ? Math.max(1, Math.min(1000, Math.abs(Math.trunc(+b.step)))) : 1; o.label = str(b.label, 40); }
      else if (b.type === 'quote') { o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map(x => str(x, 300)).filter(Boolean); if (!o.items.length) err.push(at + 'quote needs "items" (a list of text).'); }
      else if (b.type === 'button') { o.label = str(b.label, 40).trim(); o.content = str(b.content, 1900); o.webhook = str(b.webhook, 60); if (!o.label || !o.content.trim()) err.push(at + 'button needs "label" and "content".'); }
      else if (b.type === 'stats') { const ok = ['sent', 'webhooks', 'scheduled', 'failed']; o.show = (Array.isArray(b.show) ? b.show : ok).filter(x => ok.includes(x)); if (!o.show.length) o.show = ok; }
      blocks.push(o);
    });
    if (err.length) return { ok: false, errors: err.slice(0, 8) };
    return { ok: true, plugin: { id, name, icon: str(raw.icon, 8) || '🧩', description: str(raw.description, 240), author: str(raw.author, 40), version: str(raw.version, 20), where, enabled: true, blocks, state: {} } };
  }
  const caps = p => { const c = []; if (p.blocks.some(b => b.type === 'button')) c.push('Has a button that can post to Discord. It only sends when you press it and then confirm.'); if (p.blocks.some(b => b.type === 'links')) c.push('Shows links that open only when you click them.'); if (p.blocks.some(b => b.type === 'stats')) c.push('Reads your Rex totals (messages sent, webhooks, scheduled) to display them. Nothing is shared.'); c.push('Cannot run code, load anything from the internet, or read your webhook links.'); return c; };

  /* ---------- storage helpers ---------- */
  const find = id => read().items.find(p => p.id === id);
  function update(id, fn) { const o = read(), p = o.items.find(x => x.id === id); if (!p) return; fn(p); write(o); }
  function install(p) { const o = read(), i = o.items.findIndex(x => x.id === p.id); if (i < 0 && o.items.length >= MAX_PLUGINS) { toast('You can have up to ' + MAX_PLUGINS + ' plugins. Remove one first.', 'error'); return false; } if (i >= 0) { p.state = o.items[i].state || {}; p.enabled = o.items[i].enabled !== false; o.items[i] = p; } else o.items.push(p); return write(o); }

  /* ---------- rendering the blocks (plain text only, built with the DOM) ---------- */
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  function cd(ms) { if (ms <= 0) return 'It is here! 🎉'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + (d === 1 ? ' day ' : ' days ') : '') + h + ' h ' + m + ' min ' + (s % 60) + ' s'; }
  function statsNow() { try { const W = ws(); return { sent: W.sent || 0, failed: W.failed || 0, webhooks: W.webhooks.length, scheduled: W.scheduled.filter(s => s.status === 'pending').length }; } catch (e) { return { sent: 0, failed: 0, webhooks: 0, scheduled: 0 }; } }
  function renderBlocks(p, host) {
    p.blocks.forEach((b, bi) => {
      const box = el('div', 'pl-b pl-' + b.type); if (b.title) box.appendChild(el('h4', null, b.title));
      const st = (p.state && p.state[bi]) || {};
      if (b.type === 'text') box.appendChild(el('p', 'pl-text', b.text));
      else if (b.type === 'links') { const ul = el('ul', 'pl-links'); b.items.forEach(x => { const li = el('li'), a = el('a', null, x.label); a.href = x.url; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; li.appendChild(a); li.appendChild(el('small', null, ' ' + (function () { try { return new URL(x.url).host; } catch (e) { return ''; } })())); ul.appendChild(li); }); box.appendChild(ul); }
      else if (b.type === 'checklist') { const ul = el('ul', 'pl-check'); b.items.forEach((t, i) => { const li = el('li'), lab = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!(st.done && st.done[i]); cb.dataset.pl = p.id; cb.dataset.b = bi; cb.dataset.i = i; lab.appendChild(cb); lab.appendChild(el('span', null, ' ' + t)); li.appendChild(lab); ul.appendChild(li); }); box.appendChild(ul); const n = (st.done || []).filter(Boolean).length; box.appendChild(el('small', 'pl-prog', n + ' of ' + b.items.length + ' done')); const r = el('button', 'sbtn', 'Reset'); r.type = 'button'; r.dataset.plact = 'reset'; r.dataset.pl = p.id; r.dataset.b = bi; box.appendChild(r); }
      else if (b.type === 'countdown') { const big = el('div', 'pl-big', cd(Date.parse(b.to) - Date.now())); big.dataset.plcd = Date.parse(b.to); box.appendChild(big); if (b.label) box.appendChild(el('small', null, b.label)); }
      else if (b.type === 'counter') { const v = st.v != null ? st.v : b.start; const big = el('div', 'pl-big', String(v)); box.appendChild(big); if (b.label) box.appendChild(el('small', null, b.label)); const row = el('div', 'pl-row'); [['−', 'dec'], ['+', 'inc'], ['Reset', 'zero']].forEach(([t, a]) => { const x = el('button', 'sbtn', t); x.type = 'button'; x.dataset.plact = a; x.dataset.pl = p.id; x.dataset.b = bi; x.setAttribute('aria-label', a === 'inc' ? 'Add' : a === 'dec' ? 'Subtract' : 'Reset counter'); row.appendChild(x); }); box.appendChild(row); }
      else if (b.type === 'quote') { const day = Math.floor(Date.now() / 864e5), i = st.q != null ? st.q % b.items.length : day % b.items.length; box.appendChild(el('blockquote', 'pl-quote', '“' + b.items[i] + '”')); const x = el('button', 'sbtn', 'Another'); x.type = 'button'; x.dataset.plact = 'quote'; x.dataset.pl = p.id; x.dataset.b = bi; box.appendChild(x); }
      else if (b.type === 'button') { const x = el('button', 'btn btn-primary', b.label); x.type = 'button'; x.dataset.plact = 'send'; x.dataset.pl = p.id; x.dataset.b = bi; box.appendChild(x); box.appendChild(el('small', 'pl-hint', 'Posts to ' + (b.webhook ? 'the webhook named “' + b.webhook + '”' : 'a webhook you choose') + ' only after you confirm.')); }
      else if (b.type === 'stats') { const s = statsNow(), g = el('div', 'pl-stats'); b.show.forEach(k => { const c = el('div', 'pl-stat'); c.appendChild(el('b', null, String(s[k]))); c.appendChild(el('small', null, { sent: 'Messages sent', webhooks: 'Webhooks', scheduled: 'Scheduled', failed: 'Failed sends' }[k])); g.appendChild(c); }); box.appendChild(g); }
      host.appendChild(box);
    });
  }
  function card(p, forHome) {
    const c = el('section', 'pl-card' + (p.enabled ? '' : ' off')); c.dataset.plid = p.id;
    const h = el('header', 'pl-h'); h.appendChild(el('span', 'pl-ic', p.icon)); const t = el('div', 'pl-ht'); t.appendChild(el('b', null, p.name)); t.appendChild(el('small', null, [p.version && 'v' + p.version, p.author && 'by ' + p.author].filter(Boolean).join(' · ') || 'Local plugin')); h.appendChild(t);
    if (!forHome) { const tg = el('label', 'switch'), cb = el('input'); cb.type = 'checkbox'; cb.checked = p.enabled; cb.dataset.plen = p.id; cb.setAttribute('aria-label', 'Turn ' + p.name + ' on or off'); tg.appendChild(cb); tg.appendChild(el('span', 'slider')); h.appendChild(tg); }
    c.appendChild(h); if (p.description && !forHome) c.appendChild(el('p', 'pl-desc', p.description));
    if (p.enabled) { const body = el('div', 'pl-body'); renderBlocks(p, body); c.appendChild(body); } else if (!forHome) c.appendChild(el('p', 'pl-desc', 'Turned off. Nothing from this plugin is shown or can run.'));
    if (!forHome) { const f = el('div', 'pl-f'); const sel = el('select'); sel.dataset.plwhere = p.id; sel.setAttribute('aria-label', 'Where to show ' + p.name); Object.keys(WHERE).forEach(k => { const o = el('option', null, WHERE[k]); o.value = k; if (k === p.where) o.selected = true; sel.appendChild(o); }); f.appendChild(sel);
      [['Export', 'export'], ['Remove', 'remove']].forEach(([tx, a]) => { const x = el('button', 'sbtn' + (a === 'remove' ? ' danger' : ''), tx); x.type = 'button'; x.dataset.plact = a; x.dataset.pl = p.id; f.appendChild(x); }); c.appendChild(f); }
    return c;
  }

  /* ---------- samples ---------- */
  const SAMPLES = [
    { rexPlugin: 1, id: 'launch-countdown', name: 'Launch countdown', icon: '🚀', version: '1.0.0', author: 'Rex samples', description: 'A big countdown plus a note for your next launch. Change the date in the file.', where: 'both', blocks: [{ type: 'countdown', title: 'Launch day', to: '2027-01-01T00:00:00', label: 'until the new year launch' }, { type: 'text', text: 'Edit this file to set your own date and message.' }] },
    { rexPlugin: 1, id: 'daily-checklist', name: 'Daily checklist', icon: '✅', version: '1.0.0', author: 'Rex samples', description: 'Tick things off as you go.', where: 'both', blocks: [{ type: 'checklist', title: 'Today', items: ['Check messages', 'Post an update', 'Back up Rex', 'Take a break'] }, { type: 'counter', title: 'Water glasses', start: 0, label: 'glasses today' }] },
    { rexPlugin: 1, id: 'quick-links', name: 'Quick links', icon: '🔗', version: '1.0.0', author: 'Rex samples', description: 'Your favorite places in one spot.', where: 'page', blocks: [{ type: 'links', title: 'Handy sites', items: [{ label: 'Discord', url: 'https://discord.com' }, { label: 'Discord developer docs', url: 'https://discord.com/developers/docs' }] }, { type: 'quote', title: 'Daily boost', items: ['Small steps every day.', 'Ship it, then improve it.', 'Done is better than perfect.'] }] },
    { rexPlugin: 1, id: 'hype-button', name: 'Hype button', icon: '📣', version: '1.0.0', author: 'Rex samples', description: 'One button that posts a cheerful message to a webhook you pick, after you confirm.', where: 'page', blocks: [{ type: 'button', label: 'Send some hype', content: '🎉 Big things are coming. Stay tuned!' }, { type: 'stats', title: 'Your totals' }] }
  ];

  /* ---------- the page ---------- */
  let note = '';
  function buildPage() {
    if (view.dataset.pl) return; view.dataset.pl = '1';
    view.innerHTML = '<header class="pl-hero"><div><span class="st-kicker">EXTEND REX</span><h2>Plugins &amp; mini-apps</h2><p>Add small cards and tools from a JSON file. Plugins are only data: they cannot run code or reach the internet, and a Discord button always asks first.</p></div></header>' +
      '<section class="card pl-add"><div class="card-title"><h3>➕ Add a plugin</h3></div><div class="pl-addrow"><label class="btn btn-primary pl-file">📂 Choose a .json file<input type="file" id="plFile" accept=".json,application/json" hidden></label><button type="button" class="btn" data-plact="samples">✨ Add the sample plugins</button><button type="button" class="btn" data-plact="paste">📋 Paste JSON</button></div>' +
      '<div class="pl-paste" id="plPaste" hidden><textarea id="plText" rows="8" spellcheck="false" placeholder="Paste a plugin file here…" aria-label="Plugin JSON"></textarea><div class="pl-row"><button type="button" class="btn btn-primary" data-plact="pasteok">Check and preview</button><button type="button" class="btn" data-plact="pastex">Cancel</button></div></div><p class="pl-msg" id="plMsg" role="status" aria-live="polite"></p></section>' +
      '<div id="plList"></div>' +
      '<details class="card pl-guide"><summary>📖 How to write a plugin</summary><p>A plugin file looks like this. Save it as <code>my-plugin.json</code> and add it above.</p><pre id="plEx"></pre><p><b>Blocks you can use:</b> <code>text</code>, <code>links</code>, <code>checklist</code>, <code>countdown</code>, <code>counter</code>, <code>quote</code>, <code>button</code> (posts to Discord after you confirm) and <code>stats</code>. Limits: 100 KB per file, 30 blocks, 20 plugins. Links must start with http or https. Images and scripts are not allowed, on purpose.</p></details>';
    $('plEx').textContent = JSON.stringify({ rexPlugin: 1, id: 'my-plugin', name: 'My plugin', icon: '🧩', version: '1.0.0', where: 'both', blocks: [{ type: 'text', title: 'Hello', text: 'Any plain text.' }, { type: 'checklist', items: ['One', 'Two'] }] }, null, 2);
    $('plFile').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > MAX_BYTES) { say('That file is bigger than 100 KB, so it was not opened.', true); return; } try { handleText(await f.text(), f.name); } catch (er) { say('Could not read that file.', true); } });
    view.addEventListener('click', onClick); view.addEventListener('change', onChange);
  }
  function say(t, bad) { note = t; const m = $('plMsg'); if (m) { m.textContent = t; m.className = 'pl-msg' + (bad ? ' bad' : ''); } }
  function paint() {
    buildPage(); const o = read(), host = $('plList'); if (!host) return; host.innerHTML = '';
    if (!o.items.length) { const e = el('div', 'empty', 'No plugins yet. Add a file, or try the sample plugins.'); host.appendChild(e); }
    o.items.forEach(p => host.appendChild(card(p, false)));
    paintHome();
  }
  function paintHome() {
    const home = $('view-home'); if (!home) return; let h = $('plHome'); const on = read().items.filter(p => p.enabled && (p.where === 'home' || p.where === 'both'));
    if (!on.length) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('div'); h.id = 'plHome'; h.className = 'pl-home'; home.appendChild(h); h.addEventListener('click', onClick); h.addEventListener('change', onChange); }
    h.innerHTML = ''; const t = el('h3', 'pl-hh', '🧩 My plugins'); h.appendChild(t); on.forEach(p => h.appendChild(card(p, true)));
  }
  function handleText(text, name) {
    let raw; try { raw = JSON.parse(text); } catch (e) { say('That is not valid JSON' + (name ? ' (' + name + ')' : '') + ': ' + String(e.message).slice(0, 80), true); return; }
    const list = Array.isArray(raw) ? raw : [raw], ok = [], bad = [];
    list.slice(0, 10).forEach(r => { const v = validate(r); (v.ok ? ok : bad).push(v); });
    if (bad.length && !ok.length) { say('This plugin has a problem: ' + bad[0].errors.join(' '), true); return; }
    if (bad.length) say(bad.length + ' of the plugins in that file were skipped because of problems: ' + bad[0].errors[0], true); else say('');
    preview(ok.map(x => x.plugin));
  }
  function preview(plugins) {
    const ov = document.createElement('div'); ov.className = 'wz-bg'; const c = document.createElement('div'); c.className = 'wz-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', 'Install plugin'); ov.appendChild(c);
    c.appendChild(el('h2', null, plugins.length === 1 ? 'Add “' + plugins[0].name + '”?' : 'Add ' + plugins.length + ' plugins?'));
    plugins.forEach(p => { const b = el('div', 'pl-prev'); b.appendChild(el('b', null, p.icon + ' ' + p.name + (p.version ? ' v' + p.version : '') + (p.author ? ' by ' + p.author : ''))); if (p.description) b.appendChild(el('p', null, p.description)); b.appendChild(el('small', null, p.blocks.length + ' block' + (p.blocks.length === 1 ? '' : 's') + ': ' + p.blocks.map(x => BLOCKS[x.type]).join(', ') + ' · shown on: ' + WHERE[p.where])); const ul = el('ul', 'pl-caps'); caps(p).forEach(t => ul.appendChild(el('li', null, t))); b.appendChild(ul); if (find(p.id)) b.appendChild(el('p', 'pl-warn', 'A plugin with this id is already installed. It will be replaced (its saved ticks and counters are kept).')); c.appendChild(b); });
    const act = el('div', 'wz-act'), no = el('button', 'btn', 'Cancel'), yes = el('button', 'btn btn-primary', 'Add'); no.type = yes.type = 'button'; act.appendChild(no); act.appendChild(yes); c.appendChild(act); document.body.appendChild(ov);
    const close = () => { document.removeEventListener('keydown', key, true); ov.remove(); }, key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true); no.onclick = close; yes.onclick = () => { let n = 0; plugins.forEach(p => { if (install(p)) n++; }); close(); paint(); say(n ? 'Added ' + n + ' plugin' + (n === 1 ? '' : 's') + '.' : ''); try { if (n) toast('Added ' + n + ' plugin' + (n === 1 ? '' : 's'), 'success'); } catch (e) {} }; setTimeout(() => yes.focus(), 30);
  }
  async function sendButton(p, b) {
    const hooks = (() => { try { return ws().webhooks; } catch (e) { return []; } })(); if (!hooks.length) { toast('Add a webhook first (Webhooks page).', 'error'); return; }
    let wh = b.webhook && hooks.find(h => h.name.toLowerCase() === b.webhook.toLowerCase());
    if (!wh) { const names = hooks.map((h, i) => (i + 1) + ') ' + h.name).join('\n'); const a = prompt('Which webhook should this go to?\n' + names + '\n\nType the number:', '1'); if (a === null) return; wh = hooks[(parseInt(a, 10) || 0) - 1]; if (!wh) { toast('That is not one of the choices.', 'error'); return; } }
    if (!confirm('The plugin “' + p.name + '” wants to send this message to “' + wh.name + '”:\n\n' + b.content.slice(0, 400) + (b.content.length > 400 ? '…' : '') + '\n\nSend it?')) return;
    try { const res = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: b.content }) }); if (!res.ok) throw new Error('HTTP ' + res.status); try { ws().sent++; trackDay(); addTL('sent', 'Plugin “' + p.name + '” sent a message to ' + wh.name); save(); updateAll(); } catch (e) {} toast('Sent ✓', 'success'); }
    catch (e) { try { ws().failed++; save(); } catch (er) {} toast('Could not send: ' + (e.message || 'error'), 'error'); }
  }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-plact]'); if (!b) return; const a = b.dataset.plact, id = b.dataset.pl, bi = +b.dataset.b;
    if (a === 'samples') preview(SAMPLES.map(s => validate(s).plugin));
    else if (a === 'paste') { $('plPaste').hidden = false; $('plText').focus(); } else if (a === 'pastex') { $('plPaste').hidden = true; } else if (a === 'pasteok') { handleText($('plText').value); }
    else if (a === 'remove') { const p = find(id); if (p && confirm('Remove the plugin “' + p.name + '”? Its saved ticks and counters are deleted too.')) { const o = read(); o.items = o.items.filter(x => x.id !== id); write(o); paint(); } }
    else if (a === 'export') { const p = find(id); if (!p) return; const out = { rexPlugin: 1, id: p.id, name: p.name, icon: p.icon, description: p.description, author: p.author, version: p.version, where: p.where, blocks: p.blocks }; const u = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })), l = document.createElement('a'); l.href = u; l.download = 'rex-plugin-' + p.id + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
    else if (a === 'send') { const p = find(id); if (p && p.blocks[bi]) sendButton(p, p.blocks[bi]); }
    else if (a === 'inc' || a === 'dec' || a === 'zero') { const p = find(id); if (!p) return; update(id, q => { q.state = q.state || {}; const s = q.state[bi] = q.state[bi] || {}, blk = q.blocks[bi], v = s.v != null ? s.v : blk.start; s.v = a === 'zero' ? blk.start : Math.max(-1e6, Math.min(1e6, v + (a === 'inc' ? blk.step : -blk.step))); }); paint(); }
    else if (a === 'reset') { update(id, q => { if (q.state) delete q.state[bi]; }); paint(); }
    else if (a === 'quote') { update(id, q => { q.state = q.state || {}; const s = q.state[bi] = q.state[bi] || {}, n = q.blocks[bi].items.length; s.q = n > 1 ? (((s.q != null ? s.q : Math.floor(Date.now() / 864e5)) + 1 + Math.floor(Math.random() * (n - 1))) % n) : 0; }); paint(); }
  }
  function onChange(e) {
    const t = e.target; if (t.dataset && t.dataset.pl && t.type === 'checkbox') { update(t.dataset.pl, q => { q.state = q.state || {}; const s = q.state[+t.dataset.b] = q.state[+t.dataset.b] || {}; s.done = s.done || []; s.done[+t.dataset.i] = t.checked; }); paint(); }
    else if (t.dataset && t.dataset.plen) { update(t.dataset.plen, q => { q.enabled = t.checked; }); paint(); }
    else if (t.dataset && t.dataset.plwhere) { update(t.dataset.plwhere, q => { q.where = t.value; }); paint(); }
  }
  setInterval(() => { if (document.hidden) return; document.querySelectorAll('[data-plcd]').forEach(n => { n.textContent = cd(+n.dataset.plcd - Date.now()); }); }, 1000);
  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) { const r = prevShow.apply(this, arguments); try { if (n === 'plugins') paint(); else if (n === 'home') paintHome(); } catch (e) { console.error('Plugins', e); } return r; };
  try { if (typeof views === 'object') views.plugins = ['Plugins', 'Add small tools from a JSON file']; } catch (e) {}
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Plugins')) COMMANDS.push({ name: 'Open Plugins', run: () => showView('plugins') }); } catch (e) {}
  setTimeout(paintHome, 900);
  window.RexPlugins = { validate, install, read, samples: SAMPLES, paint, send: sendButton, state: () => ({ n: read().items.length }) };
})();
