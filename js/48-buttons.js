/* Project Rex Center V13.6.1 · Buttons that actually reach Discord.
   Discord ignores "components" on a normal webhook unless the URL has ?with_components=true, and a normal (non-app) webhook
   may still have its buttons dropped. So: ask for buttons properly, check what Discord really posted, and if the buttons are
   missing add them as clickable links under the message instead. Nothing is sent anywhere except the webhook you chose. */
(function () {
  'use strict';
  const HOOK = /^https:\/\/(?:[a-z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\//i;
  const orig = window.fetch.bind(window);
  const links = comps => (comps || []).flatMap(r => r.components || []).filter(c => c && c.url && c.label).map(c => '[' + String(c.label).replace(/[\[\]]/g, '') + '](<' + c.url + '>)');
  const withLinks = (payload, list) => { const p = Object.assign({}, payload); delete p.components; const add = list.join('  •  '); p.content = ((p.content ? p.content + '\n\n' : '') + add).slice(0, 2000); return p; };
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
          const fixed = withLinks({ content: msg.content || payload.content || '' }, links(payload.components));
          const r2 = await orig(base.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: fixed.content }) });
          info(r2.ok ? NOTE : 'Sent, but Discord did not show the buttons and the links could not be added.');
        } catch (e) { info('Sent, but Discord did not show the buttons.'); }
      }
      return res;
    }
    if (res.status === 400) {   /* Discord refused the buttons: send again with links instead */
      const p2 = withLinks(payload, links(payload.components));
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
  window.RexButtons = { links };
})();
