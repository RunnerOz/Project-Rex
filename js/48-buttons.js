/* Project Rex Center V13.6.1 · Buttons that actually reach Discord.
   Discord ignores "components" on a normal webhook unless the URL has ?with_components=true, and a normal (non-app) webhook
   may still have its buttons dropped. So: ask for buttons properly, check what Discord really posted, and if the buttons are
   missing add them as clickable links under the message instead. Nothing is sent anywhere except the webhook you chose. */
(function () {
  'use strict';
  const HOOK = /^https:\/\/(?:[a-z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\//i;
  const orig = window.fetch.bind(window);
    const SK = 'rex2102_btnstyle';
  const style = () => { try { const v = localStorage.getItem(SK); return ['row', 'list', 'embed'].indexOf(v) >= 0 ? v : 'row'; } catch (e) { return 'row'; } };
  const mk = (label, url) => '🔗 [' + String(label).replace(/[\[\]]/g, '') + '](<' + url + '>)';
  const flat = comps => (comps || []).flatMap(r => r.components || []).filter(c => c && c.url && c.label);
  /* turn the buttons into links in the chosen look: one row, a list, or their own small embed */
  function withLinks(payload) {
    const p = Object.assign({}, payload), items = flat(payload.components).map(c => mk(c.label, c.url)), st = style(); delete p.components;
    if (st === 'embed') {
      const first = (p.embeds && p.embeds[0] && p.embeds[0].color) || 0x5865f2;
      p.embeds = (p.embeds || []).concat([{ description: items.join('\n'), color: first }]).slice(0, 10);
    } else {
      const add = items.join(st === 'list' ? '\n' : '   •   ');
      p.content = ((p.content ? p.content + '\n\n' : '') + add).slice(0, 2000);
    }
    return p;
  }
  const info = t => { setTimeout(() => { try { if (typeof toast === 'function') toast(t, 'info'); } catch (e) { /* ignore */ } }, 900); };   /* after the normal "Sent" toast, so it is not overwritten */
  const NOTE = 'Discord does not show buttons on regular webhooks, so your buttons were added as links under the message.';

  function rebuildBody(init, payload) {
    if (init.body instanceof FormData) {
      const f = new FormData(); init.body.forEach((v, k) => { if (k !== 'payload_json') f.append(k, v); }); f.append('payload_json', JSON.stringify(payload)); return f;
    }
    return JSON.stringify(payload);
  }
  function read(init) {
    try {
      if (typeof init.body === 'string') return JSON.parse(init.body);
      if (init.body instanceof FormData) { const pj = init.body.get('payload_json'); return pj ? JSON.parse(pj) : null; }
    } catch (e) { /* not JSON */ }
    return null;
  }
  async function sendWithButtons(url, init, payload) {
    const u = new URL(url); u.searchParams.set('with_components', 'true'); u.searchParams.set('wait', 'true');
    const res = await orig(u.toString(), init);
    if (res.ok) {
      let msg = null; try { msg = await res.clone().json(); } catch (e) { /* no body */ }
      const shown = msg && Array.isArray(msg.components) && msg.components.length;
      if (msg && msg.id && !shown) {
        /* posted without buttons: add them as links by editing the message we just posted */
        try {
          const base = new URL(url); base.search = ''; base.pathname = base.pathname.replace(/\/$/, '') + '/messages/' + msg.id;
          const fixed = withLinks(payload);
          const patch = style() === 'embed' ? { embeds: fixed.embeds } : { content: fixed.content };
          const r2 = await orig(base.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
          info(r2.ok ? NOTE : 'Sent, but Discord did not show the buttons and the links could not be added.');
        } catch (e) { info('Sent, but Discord did not show the buttons.'); }
      }
      return res;
    }
    if (res.status === 400) {   /* Discord refused the buttons: send again with links instead */
      const p2 = withLinks(payload);
      const r3 = await orig(url, Object.assign({}, init, { body: rebuildBody(init, p2) }));
      if (r3.ok) info(NOTE);
      return r3;
    }
    return res;
  }
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url);
      if (url && HOOK.test(url) && init && init.method === 'POST' && !/with_components=/.test(url)) {
        const payload = read(init);
        if (payload && Array.isArray(payload.components) && payload.components.length) return sendWithButtons(url, init, payload);
      }
    } catch (e) { /* fall through to a normal send */ }
    return orig(input, init);
  };

  /* say it plainly in the preview so nothing is a surprise */
  function note() {
    const pb = document.getElementById('pBtns'); if (!pb) return;
    let n = document.getElementById('dpvBtnNote');
    if (!pb.children.length) { if (n) n.remove(); return; }
    if (!n) { n = document.createElement('p'); n.id = 'dpvBtnNote'; n.className = 'dpv-note'; pb.insertAdjacentElement('afterend', n); }
    n.textContent = 'Buttons show on Discord only for some webhooks. If yours does not show them, Rex adds them as links under the message.';
  }
  const prevUp = window.updatePreview;
  if (typeof prevUp === 'function') window.updatePreview = function () { const r = prevUp.apply(this, arguments); try { note(); } catch (e) { /* ignore */ } return r; };
  window.RexButtons = { links: flat, style, setStyle: v => { try { localStorage.setItem(SK, v); } catch (e) { /* ignore */ } }, withLinks };

  /* choose how links look, and a plain-words guide to real buttons */
  const E = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function controls() {
    const list = document.getElementById('buttonList'); if (!list || document.getElementById('btnOpts')) return;
    const d = document.createElement('div'); d.id = 'btnOpts'; d.className = 'btn-opts';
    d.innerHTML = '<label for="btnStyle">If Discord can\'t show buttons, show them as</label><select id="btnStyle" aria-label="How to show buttons as links"><option value="row">One row of links</option><option value="list">A list of links</option><option value="embed">A small box (embed)</option></select><button type="button" class="btn btn-secondary" id="btnReal">Get real buttons</button>';
    list.parentElement.appendChild(d);
    const sel = d.querySelector('select'); sel.value = style();
    sel.addEventListener('change', () => { window.RexButtons.setStyle(sel.value); try { updatePreview(); } catch (e) { /* ignore */ } });
    d.querySelector('#btnReal').addEventListener('click', guide);
  }
  function guide() {
    if (document.getElementById('btnGuide')) return;
    const o = document.createElement('div'); o.id = 'btnGuide'; o.className = 'bg-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Get real Discord buttons');
    const cmd = "curl -s -X POST https://discord.com/api/oauth2/token \\\n  -d client_id=YOUR_APPLICATION_ID \\\n  -d client_secret=YOUR_CLIENT_SECRET \\\n  -d grant_type=authorization_code \\\n  -d code=THE_CODE_FROM_THE_ADDRESS \\\n  -d redirect_uri=https://discord.com/oauth2/authorized";
    o.innerHTML = '<div class="bg-card"><h3>Get real Discord buttons</h3>' +
      '<p>Discord only shows real buttons on a webhook that belongs to a Discord <b>application</b>. A webhook made from Channel Settings does not. Making one is free. It takes a few minutes and one Terminal command, and you only do it once per channel.</p>' +
      '<p class="bg-warn">I have not been able to try this on a real Discord account, so if a step looks different on your screen, trust Discord\'s screen. Your normal webhooks keep working either way.</p>' +
      '<ol><li>Open <b>discord.com/developers/applications</b> and press <b>New Application</b>. Give it any name.</li>' +
      '<li>Go to <b>OAuth2</b>. Under <b>Redirects</b> add <code>https://discord.com/oauth2/authorized</code> and save. Copy the <b>Client ID</b>, and press <b>Reset Secret</b> to copy the <b>Client Secret</b>. Keep the secret private.</li>' +
      '<li>Open this address in your browser (put your Client ID in): <code>https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&amp;response_type=code&amp;scope=webhook.incoming&amp;redirect_uri=https%3A%2F%2Fdiscord.com%2Foauth2%2Fauthorized</code></li>' +
      '<li>Pick your server and channel, then press <b>Authorize</b>. The page may look blank. Copy the <b>code=…</b> part from the address bar.</li>' +
      '<li>In Terminal, run this with your three values filled in. It must run within a few minutes of step 4:<pre>' + E(cmd) + '</pre></li>' +
      '<li>The reply contains a <b>"webhook"</b> with a <b>"url"</b>. Copy that URL into Rex as a new webhook. Buttons sent to it should now show as real buttons.</li></ol>' +
      '<div class="bg-row"><button type="button" class="btn btn-secondary" id="bgCopy">Copy the Terminal command</button><button type="button" class="btn btn-primary" id="bgClose">Done</button></div></div>';
    document.body.appendChild(o);
    const close = () => { o.remove(); document.removeEventListener('keydown', esc); }; const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    o.addEventListener('click', e => { if (e.target === o) close(); });
    o.querySelector('#bgClose').addEventListener('click', close);
    o.querySelector('#bgCopy').addEventListener('click', () => { try { navigator.clipboard.writeText(cmd); toast('Command copied', 'success'); } catch (e) { toast('Could not copy. Select the command and copy it.', 'error'); } });
    o.querySelector('#bgClose').focus();
  }
  const prevUp2 = window.updatePreview;
  if (typeof prevUp2 === 'function') window.updatePreview = function () { const r = prevUp2.apply(this, arguments); try { controls(); } catch (e) { /* ignore */ } return r; };
  setTimeout(() => { try { controls(); } catch (e) { /* ignore */ } }, 600);
  window.RexButtons.guide = guide;
})();
