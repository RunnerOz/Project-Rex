/* Project Rex Center V13.13.0 · Cutscene Maker (free, local).
   Build your own little movie from shots (opening card, title slam, Rex talking, headline, big text), pick colors and tempo, preview it, then:
   download it as a .rexcut.json file (anyone can import it), record it as a video (made in your browser, optional music), or send the video / file to a Discord webhook.
   Nothing is uploaded anywhere except the webhook you choose. Saved cutscenes live in this browser only. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rex1312_cutscenes', TYPES = { open: 'Opening card', title: 'Title slam', say: 'Rex says', feat: 'Headline', big: 'Big text' }, LEN = { 1: 'Short', 2: 'Normal', 3: 'Long', 4: 'Epic' };
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.list) ? o : { list: [], cur: '' }; } catch (e) { return { list: [], cur: '' }; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const uid = () => 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const cap = (v, n) => Array.from(String(v == null ? '' : v)).slice(0, n).join('');
  const clean = o => {
    if (!o || typeof o !== 'object' || !Array.isArray(o.shots)) return null;
    const shots = o.shots.slice(0, 24).filter(s => s && TYPES[s.type]).map(s => ({ type: s.type, text: cap(s.text, s.type === 'say' ? 240 : 80), sub: cap(s.sub, 140), icon: cap(s.icon || '✨', 4), tag: cap(s.tag || 'NEW', 10), bars: Math.max(1, Math.min(4, Math.round(+s.bars || 2))) }));
    if (!shots.length) return null;
    return { id: uid(), name: cap(o.name || 'Imported cutscene', 40), hue: Math.max(0, Math.min(359, Math.round(+o.hue || 0))), tempo: ['chill', 'normal', 'fast'].includes(o.tempo) ? o.tempo : 'normal', endTitle: cap(o.endTitle || 'Thanks for watching!', 60), endSub: cap(o.endSub, 80), shots };
  };
  const fresh = () => ({ id: uid(), name: 'My first cutscene', hue: 200, tempo: 'normal', endTitle: 'Thanks for watching!', endSub: 'Made with Project Rex Center', shots: [
    { type: 'open', text: 'MY STUDIO', sub: 'presents', icon: '✨', tag: 'NEW', bars: 2 }, { type: 'title', text: 'MY BIG\nIDEA', sub: 'A tiny movie', icon: '✨', tag: 'NEW', bars: 2 },
    { type: 'say', text: 'Hey! It\'s Rex.\nI have big news.', sub: '', icon: '✨', tag: 'NEW', bars: 3 }, { type: 'feat', text: 'The first big thing', sub: 'Tell people why it is cool.', icon: '🚀', tag: 'NEW', bars: 2 }, { type: 'big', text: 'COMING SOON', sub: '', icon: '✨', tag: 'NEW', bars: 2 }] });
  const toCustom = c => ({ name: c.name, hue: c.hue, tempo: c.tempo, endTitle: c.endTitle, endSub: c.endSub, shots: c.shots });
  const slug = s => (String(s || 'cutscene').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cutscene').slice(0, 40);
  const phone = () => (typeof isPhoneView === 'function') && isPhoneView();
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (e) { /* ignore */ } };
  const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000); };
  let M = null, X = null;

  /* ---------- export / share dialog (works for trailers and for cutscenes) ---------- */
  function share(po, meta) {
    if (X) return; meta = meta || {}; const isCut = !!po.custom, name = (po.custom && po.custom.name) || ('Project Rex Center v' + (po.version || ''));
    const whs = (typeof state !== 'undefined' && state.webhooks) ? state.webhooks.filter(w => w && w.url) : [];
    const ov = document.createElement('div'); ov.className = 'cm-ov cm-x'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Save video or send to Discord');
    ov.innerHTML = '<div class="cm-card cm-xc"><div class="cm-h"><div><small>EXPORT</small><h3>📤 Save video / Send to Discord</h3></div><button type="button" class="btn btn-sm" data-x="close">✕ Close</button></div>' +
      '<p class="cm-note">Your video is made right here in your browser (about ' + Math.round((window.RexCinema.timeline(po).total) / 1000) + ' seconds long). Keep this tab open while it records. Nothing is uploaded except what you send to your own webhook.</p>' +
      '<label class="cm-chk"><input type="checkbox" id="xSnd" checked> Include the music</label>' +
      '<div class="cm-row"><button type="button" class="btn btn-primary" data-x="make">🎞️ Make the video</button><button type="button" class="btn btn-sm" data-x="cancel" hidden>Stop</button></div>' +
      '<div class="cm-prog" hidden><i></i></div><div class="cm-status" id="xSt" role="status" aria-live="polite"></div><div id="xOut"></div>' +
      '<h4>Send to Discord</h4>' + (whs.length ? '<label class="cm-l">Webhook<select id="xWh">' + whs.map((w, i) => '<option value="' + i + '">' + E(w.name || ('Webhook ' + (i + 1))) + '</option>').join('') + '</select></label>' +
        '<label class="cm-l">Message<input id="xMsg" maxlength="300" value="' + E('🎬 ' + name) + '"></label>' +
        '<label class="cm-chk"><input type="checkbox" id="xVid" checked> Attach the video (makes it first if needed)</label>' + (isCut ? '<label class="cm-chk"><input type="checkbox" id="xFile"> Attach the .rexcut.json file so others can import and remix it</label>' : '') +
        '<div class="cm-row"><button type="button" class="btn btn-primary" data-x="send">📤 Send to Discord</button></div>' : '<p class="cm-note">No webhook saved yet. Add one on the Webhooks page, then come back.</p>') + '</div>';
    document.body.appendChild(ov); X = { ov, video: null, job: null, prev: document.activeElement };
    const $x = id => ov.querySelector('#' + id), st = t => { $x('xSt').textContent = t; };
    function close() { if (X.job) X.job.cancel(); document.removeEventListener('keydown', onKey, true); ov.remove(); const pv = X.prev; X = null; try { pv && pv.focus && pv.isConnected && pv.focus(); } catch (e) { /* ignore */ } }
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    async function make() {
      if (X.video) return X.video; const pr = ov.querySelector('.cm-prog'), bar = pr.firstChild, mk = ov.querySelector('[data-x="make"]'), cn = ov.querySelector('[data-x="cancel"]'); mk.disabled = true; cn.hidden = false; pr.hidden = false; st('Recording… keep this tab open.');
      try {
        X.job = window.RexCinema.record(po, { sound: $x('xSnd').checked, onProgress: f => { bar.style.width = Math.round(f * 100) + '%'; } }); const v = await X.job; X.job = null; X.video = v;
        const url = URL.createObjectURL(v.blob), mb = (v.blob.size / 1048576).toFixed(1); $x('xOut').innerHTML = '<video controls playsinline src="' + url + '" class="cm-vid"></video><div class="cm-row"><a class="btn btn-sm" download="' + E(slug(name)) + '.' + v.ext + '" href="' + url + '">⬇ Download video (' + mb + ' MB)</a></div>' + (v.blob.size > 9.5 * 1048576 ? '<p class="cm-note warn">This video is over Discord\'s upload limit (about 10 MB), so it can\'t be attached. Download it, or make a shorter cutscene.</p>' : '');
        st('Done. ' + (v.ext === 'mp4' ? '' : 'Saved as WebM, which plays in Discord, Chrome, Firefox and most players.')); return v;
      } catch (e) { X && st(e && e.message === 'cancelled' ? 'Stopped.' : 'Could not make the video: ' + (e && e.message || e)); return null; }
      finally { if (X) { mk.disabled = false; cn.hidden = true; pr.hidden = true; X.job = null; } }
    }
    ov.addEventListener('click', async e => {
      const b = e.target.closest('[data-x]'); if (!b) { if (e.target === ov) close(); return; } const a = b.dataset.x;
      if (a === 'close') close(); else if (a === 'cancel') { if (X.job) X.job.cancel(); }
      else if (a === 'make') { X.video = null; $x('xOut').innerHTML = ''; await make(); }
      else if (a === 'send') {
        const wh = whs[+$x('xWh').value]; if (!wh) return; b.disabled = true;
        try {
          const form = new FormData(), pl = { content: ($x('xMsg').value || name).slice(0, 1900), allowed_mentions: { parse: [] } }; let n = 0, skipped = '';
          if ($x('xVid').checked) { const v = X.video || await make(); if (v) { if (v.blob.size > 9.5 * 1048576) skipped = ' The video was too big to attach.'; else form.append('files[' + (n++) + ']', v.blob, slug(name) + '.' + v.ext); } else { b.disabled = false; return; } }
          if (isCut && $x('xFile') && $x('xFile').checked) { const cu = po.custom; form.append('files[' + (n++) + ']', new Blob([JSON.stringify(Object.assign({ rexCutscene: 1 }, cu), null, 2)], { type: 'application/json' }), slug(name) + '.rexcut.json'); }
          form.append('payload_json', JSON.stringify(pl)); st('Sending…');
          const res = await fetch(wh.url, { method: 'POST', body: form }); if (res.ok || res.status === 204) { st('Sent to Discord ✓' + skipped); say('Cutscene sent to Discord ✓', 'success'); } else st('Discord said no (' + res.status + ').' + (res.status === 413 ? ' The file is too big.' : ' Check that the webhook still exists.'));
        } catch (er) { st('Could not send: ' + (er && er.message || er)); }
        b.disabled = false;
      }
    });
    setTimeout(() => { const f = ov.querySelector('[data-x="make"]'); f && f.focus(); }, 40);
  }

  /* ---------- the maker ---------- */
  function shotHTML(s, i, n) {
    const t = s.type, f = [];
    f.push('<label class="cm-l">' + (t === 'say' ? 'What Rex says (one line each)' : t === 'title' ? 'Title (one line each, up to 4)' : 'Text') + (t === 'say' || t === 'title' ? '<textarea data-f="text" rows="3" maxlength="' + (t === 'say' ? 240 : 80) + '">' + E(s.text) + '</textarea>' : '<input data-f="text" maxlength="80" value="' + E(s.text) + '">') + '</label>');
    if (t !== 'say') f.push('<label class="cm-l">Small line under it<input data-f="sub" maxlength="140" value="' + E(s.sub) + '"></label>');
    if (t === 'feat') f.push('<div class="cm-2"><label class="cm-l">Icon (an emoji)<input data-f="icon" maxlength="4" value="' + E(s.icon) + '"></label><label class="cm-l">Tag<input data-f="tag" maxlength="10" value="' + E(s.tag) + '"></label></div>');
    return '<li class="cm-shot" data-i="' + i + '"><div class="cm-sh"><b>' + (i + 1) + '. ' + E(TYPES[t]) + '</b><span><label class="cm-len">Length <select data-f="bars">' + [1, 2, 3, 4].map(k => '<option value="' + k + '"' + (+s.bars === k ? ' selected' : '') + '>' + LEN[k] + '</option>').join('') + '</select></label>' +
      '<button type="button" class="btn btn-sm" data-m="up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="btn btn-sm" data-m="down" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>↓</button><button type="button" class="btn btn-sm" data-m="del" aria-label="Remove shot">🗑</button></span></div>' + f.join('') + '</li>';
  }
  function open() {
    if (M) return; if (window.RexCinema && window.RexCinema.open()) window.RexCinema.stop();
    const db = rd(); let cur = db.list.find(c => c.id === db.cur) || db.list[0]; if (!cur) { cur = fresh(); db.list.push(cur); db.cur = cur.id; wr(db); }
    const ov = document.createElement('div'); ov.className = 'cm-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Cutscene Maker');
    document.body.appendChild(ov); M = { ov, db, prev: document.activeElement };
    const save = () => { M.db.cur = cur.id; if (!wr(M.db)) say('Could not save (browser storage is full or blocked). Download the file to keep it.', 'warn'); };
    function paint(keepScroll) {
      const sc = ov.querySelector('.cm-card') ? ov.querySelector('.cm-card').scrollTop : 0;
      ov.innerHTML = '<div class="cm-card" id="cmCard"><div class="cm-h"><div><small>FREE · MADE IN YOUR BROWSER</small><h3>🎬 Cutscene Maker</h3></div><button type="button" class="btn btn-sm" data-c="close">✕ Close</button></div>' +
        '<div class="cm-row"><label class="cm-l cm-grow">My cutscenes<select id="cmSel">' + M.db.list.map(c => '<option value="' + c.id + '"' + (c.id === cur.id ? ' selected' : '') + '>' + E(c.name) + '</option>').join('') + '</select></label><button type="button" class="btn btn-sm" data-c="new">＋ New</button><button type="button" class="btn btn-sm" data-c="dup">Duplicate</button><button type="button" class="btn btn-sm" data-c="rm">Delete</button></div>' +
        '<div class="cm-2"><label class="cm-l">Name<input id="cmName" maxlength="40" value="' + E(cur.name) + '"></label><label class="cm-l">Tempo<select id="cmTempo">' + [['chill', 'Chill'], ['normal', 'Normal'], ['fast', 'Fast']].map(t => '<option value="' + t[0] + '"' + (cur.tempo === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select></label></div>' +
        '<label class="cm-l">Color <span class="cm-sw" style="background:hsl(' + cur.hue + ',85%,55%)"></span><input id="cmHue" type="range" min="0" max="359" value="' + cur.hue + '"></label>' +
        '<h4>Shots</h4><ol class="cm-shots">' + cur.shots.map((s, i) => shotHTML(s, i, cur.shots.length)).join('') + '</ol>' +
        '<div class="cm-add" role="group" aria-label="Add a shot">' + Object.keys(TYPES).map(k => '<button type="button" class="btn btn-sm" data-a="' + k + '">＋ ' + TYPES[k] + '</button>').join('') + '</div>' +
        '<h4>Last screen</h4><div class="cm-2"><label class="cm-l">Big line<input id="cmEt" maxlength="60" value="' + E(cur.endTitle) + '"></label><label class="cm-l">Small line<input id="cmEs" maxlength="80" value="' + E(cur.endSub) + '"></label></div>' +
        '<div class="cm-foot"><button type="button" class="btn btn-primary" data-c="play">▶ Play it</button><button type="button" class="btn" data-c="share">📤 Save video / Send to Discord</button><button type="button" class="btn btn-sm" data-c="file">⬇ Download file</button><button type="button" class="btn btn-sm" data-c="imp">📂 Import file</button><input type="file" id="cmFile" accept=".json,.rexcut,application/json" hidden></div>' +
        '<p class="cm-note">Saves automatically in this browser. Download the file to keep a backup or share it: anyone can import it into their own Rex. Shots play one after another, then your last screen.</p></div>';
      const card = ov.querySelector('.cm-card'); if (keepScroll) card.scrollTop = sc;
    }
    paint();
    const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.cm-x') && !(window.RexCinema && window.RexCinema.open())) { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey, true);
    function close() { document.removeEventListener('keydown', onKey, true); ov.remove(); const pv = M.prev; M = null; try { pv && pv.focus && pv.isConnected && pv.focus(); } catch (e) { /* ignore */ } }
    const pl = () => window.RexCinema.play({ custom: toCustom(cur), phone: phone(), manual: true, onClose: () => { if (!M) open(); } });
    ov.addEventListener('input', e => {
      const t = e.target, li = t.closest && t.closest('.cm-shot');
      if (li) { const s = cur.shots[+li.dataset.i], f = t.dataset.f; if (s && f) { s[f] = f === 'bars' ? +t.value : t.value; save(); } return; }
      if (t.id === 'cmName') { cur.name = cap(t.value, 40) || 'Untitled'; const o = ov.querySelector('#cmSel option:checked'); if (o) o.textContent = cur.name; save(); }
      else if (t.id === 'cmHue') { cur.hue = +t.value; ov.querySelector('.cm-sw').style.background = 'hsl(' + cur.hue + ',85%,55%)'; save(); }
      else if (t.id === 'cmTempo') { cur.tempo = t.value; save(); } else if (t.id === 'cmEt') { cur.endTitle = t.value; save(); } else if (t.id === 'cmEs') { cur.endSub = t.value; save(); }
    });
    ov.addEventListener('change', e => {
      const t = e.target; if (t.id === 'cmSel') { cur = M.db.list.find(c => c.id === t.value) || cur; save(); paint(); }
      else if (t.id === 'cmFile' && t.files && t.files[0]) { const f = t.files[0]; if (f.size > 200000) { say('That file is too big to be a cutscene.', 'warn'); return; } const fr = new FileReader(); fr.onload = () => { let c = null; try { c = clean(JSON.parse(String(fr.result))); } catch (er) { c = null; } if (!c) { say('That file is not a Rex cutscene.', 'error'); return; } M.db.list.push(c); cur = c; save(); paint(); say('Imported "' + c.name + '" ✓', 'success'); }; fr.readAsText(f); }
    });
    ov.addEventListener('click', e => {
      if (e.target === ov) { close(); return; }
      const m = e.target.closest('[data-m]'), a = e.target.closest('[data-a]'), c = e.target.closest('[data-c]');
      if (m) { const i = +m.closest('.cm-shot').dataset.i, k = m.dataset.m; if (k === 'del') { if (cur.shots.length > 1) cur.shots.splice(i, 1); else { say('A cutscene needs at least one shot.', 'warn'); return; } } else { const j = k === 'up' ? i - 1 : i + 1; if (j < 0 || j >= cur.shots.length) return; const tmp = cur.shots[i]; cur.shots[i] = cur.shots[j]; cur.shots[j] = tmp; } save(); paint(true); return; }
      if (a) { if (cur.shots.length >= 24) { say('That is the most shots in one cutscene (24).', 'warn'); return; } const k = a.dataset.a; cur.shots.push({ type: k, text: k === 'say' ? 'Hello!' : k === 'title' ? 'NEW TITLE' : k === 'big' ? 'BIG NEWS' : k === 'open' ? 'PRESENTS' : 'A new headline', sub: '', icon: '✨', tag: 'NEW', bars: 2 }); save(); paint(true); const card = ov.querySelector('.cm-card'); card.scrollTop = card.scrollHeight; return; }
      if (!c) return; const k = c.dataset.c;
      if (k === 'close') close();
      else if (k === 'new') { cur = fresh(); cur.name = 'Cutscene ' + (M.db.list.length + 1); M.db.list.push(cur); save(); paint(); }
      else if (k === 'dup') { const d = JSON.parse(JSON.stringify(cur)); d.id = uid(); d.name = cap(cur.name + ' copy', 40); M.db.list.push(d); cur = d; save(); paint(); }
      else if (k === 'rm') { if (!confirm('Delete "' + cur.name + '"? This cannot be undone (download the file first if you want a copy).')) return; M.db.list = M.db.list.filter(x => x.id !== cur.id); if (!M.db.list.length) M.db.list.push(fresh()); cur = M.db.list[0]; save(); paint(); }
      else if (k === 'play') { const pv = M; document.removeEventListener('keydown', onKey, true); ov.remove(); M = null; pl(); void pv; }
      else if (k === 'share') share({ custom: toCustom(cur), phone: phone(), manual: true });
      else if (k === 'file') dl(new Blob([JSON.stringify(Object.assign({ rexCutscene: 1 }, toCustom(cur)), null, 2)], { type: 'application/json' }), slug(cur.name) + '.rexcut.json');
      else if (k === 'imp') ov.querySelector('#cmFile').click();
    });
    setTimeout(() => { const f = ov.querySelector('[data-c="play"]'); f && f.focus(); }, 50);
  }
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Cutscene Maker')) COMMANDS.push({ name: 'Open Cutscene Maker', run: () => open() }); } catch (e) { /* ignore */ }
  window.RexCutscenes = { open, share, clean, state: () => ({ open: !!M, saved: rd().list.length }), close: () => { const o = document.querySelector('.cm-ov'); if (o) o.remove(); M = null; X = null; } };
})();
