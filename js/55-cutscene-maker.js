/* Project Rex Center V13.14.0 · Cutscene Maker (free, local).
   A visual editor: pick a shot on the left, edit it on the big preview, and add objects (your own pictures, emoji, text, Rex) that you drag, resize and rotate right on the screen.
   Undo/redo, quick-start templates, drag-and-drop or paste pictures. Music: built-in styles made in your browser (free, no files) or your own song (kept in this browser). Then play it, download it as a .rexcut.json file (anyone can import it), record it as a video (made in your browser, optional music)
   or send the video / file to a Discord webhook. Nothing is uploaded anywhere except the webhook you choose. Saved cutscenes live in this browser only. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rex1312_cutscenes', TIPKEY = 'rex1314_cm_tip', TYPES = { open: 'Opening card', title: 'Title slam', say: 'Rex says', feat: 'Headline', big: 'Big text' }, TICON = { open: '🎬', title: '💥', say: '💬', feat: '⭐', big: '🔠' }, LEN = { 1: 'Short', 2: 'Normal', 3: 'Long', 4: 'Epic' };
  const ANIMS = { pop: 'Pop in', fade: 'Fade in', slide: 'Slide up', spin: 'Spin in', none: 'Already there' };
  const EMOJI = '🔥 ⭐ ✨ 🎉 🎊 🚀 💥 ⚡ 💎 👑 🏆 🎮 🎵 🎧 📣 📢 💡 🔔 ❤️ 💙 💚 💛 🧡 💜 🖤 😀 😎 🤩 😍 🥳 😮 🤯 😂 👍 👏 🙌 💪 👀 🎯 🧠 🛠️ 🔒 🌟 🌈 ☀️ 🌙 ⏰ 📅 📦 🎁 🍕 🐶 🐱 🦖 🐉 👾 🤖 🛸 🌍 🏁 ➡️ ⬆️ ✅ ❌ ❓ ❗'.split(' ');
  const MSTYLES = [['epic', '🎬', 'Epic trailer', 'Big drums, rising beat'], ['hype', '🔥', 'Hype beat', 'Heavy kick, claps, bass'], ['arcade', '👾', 'Retro arcade', 'Chiptune beeps'], ['chill', '🌙', 'Chill lo-fi', 'Soft and sleepy'], ['warm', '🎹', 'Warm piano', 'Gentle plucked notes'], ['space', '🌌', 'Space ambient', 'Slow glowing pads'], ['none', '🔇', 'No music', 'Silent']];
  const STYLEIDS = MSTYLES.map(m => m[0]);
  /* your own songs live in this browser only (IndexedDB), never inside the cutscene file */
  const idb = () => new Promise((ok, no) => { try { const r = indexedDB.open('rex1314_music', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
  const idbDo = (mode, fn) => idb().then(db => new Promise((ok, no) => { const t = db.transaction('files', mode), st = t.objectStore('files'); const rq = fn(st); t.oncomplete = () => { db.close(); ok(rq && rq.result); }; t.onerror = () => { db.close(); no(t.error); }; t.onabort = () => { db.close(); no(t.error); }; }));
  const mStore = { put: (id, rec) => idbDo('readwrite', st => st.put(rec, id)), get: id => idbDo('readonly', st => st.get(id)), del: id => idbDo('readwrite', st => st.delete(id)), keys: () => idbDo('readonly', st => st.getAllKeys()) };
  const loadMusic = id => mStore.get(id).then(r => { if (!r || !r.blob) throw new Error('missing'); return r.blob.arrayBuffer(); });
  const fmtMB = n => (n / 1048576).toFixed(1) + ' MB';
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.list) ? o : { list: [], cur: '' }; } catch (e) { return { list: [], cur: '' }; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const uid = () => 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const oid = () => 'o' + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 1e5).toString(36);
  const cap = (v, n) => Array.from(String(v == null ? '' : v)).slice(0, n).join('');
  const num = (v, lo, hi, d) => { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  const IMGRE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, MAXASSET = 2800000;
  const cleanObj = (o, assets) => {
    if (!o || typeof o !== 'object') return null; const k = o.kind;
    if (!['img', 'emoji', 'text', 'rex'].includes(k)) return null; if (k === 'img' && !assets[o.asset]) return null;
    return { id: oid(), kind: k, asset: k === 'img' ? String(o.asset) : '', emoji: cap(o.emoji || '⭐', 4), text: cap(o.text || 'Text', 40), color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#ffffff', x: num(o.x, -.3, 1.3, .5), y: num(o.y, -.3, 1.3, .5), s: num(o.s, .03, 3, .2), r: num(o.r, -360, 360, 0), anim: ANIMS[o.anim] ? o.anim : 'pop', delay: num(o.delay, 0, 5, .4), bob: !!o.bob };
  };
  const clean = o => {
    if (!o || typeof o !== 'object' || !Array.isArray(o.shots)) return null;
    const assets = {}; let total = 0; if (o.assets && typeof o.assets === 'object') Object.keys(o.assets).slice(0, 16).forEach(id => { const d = o.assets[id]; if (typeof d === 'string' && IMGRE.test(d) && total + d.length <= MAXASSET) { assets[cap(id, 20).replace(/[^a-z0-9_-]/gi, '')] = d; total += d.length; } });
    const shots = o.shots.slice(0, 24).filter(s => s && TYPES[s.type]).map(s => ({ type: s.type, text: cap(s.text, s.type === 'say' ? 240 : 80), sub: cap(s.sub, 140), icon: cap(s.icon || '✨', 4), tag: cap(s.tag || 'NEW', 10), bars: Math.max(1, Math.min(4, Math.round(+s.bars || 2))), objs: (Array.isArray(s.objs) ? s.objs : []).slice(0, 14).map(x => cleanObj(x, assets)).filter(Boolean) }));
    if (!shots.length) return null;
    return { id: uid(), name: cap(o.name || 'Imported cutscene', 40), music: { style: STYLEIDS.includes(o.music && o.music.style) ? o.music.style : 'epic', vol: num(o.music && o.music.vol, 0, 1, .8) }, hue: Math.max(0, Math.min(359, Math.round(+o.hue || 0))), tempo: ['chill', 'normal', 'fast'].includes(o.tempo) ? o.tempo : 'normal', endTitle: cap(o.endTitle || 'Thanks for watching!', 60), endSub: cap(o.endSub, 80), shots, assets };
  };
  const shot = (type, text, sub, bars, objs, extra) => Object.assign({ type, text, sub: sub || '', icon: '✨', tag: 'NEW', bars: bars || 2, objs: objs || [] }, extra || {});
  const ob = (kind, x, y, s, extra) => Object.assign({ id: oid(), kind, asset: '', emoji: '⭐', text: 'Text', color: '#ffffff', x, y, s, r: 0, anim: 'pop', delay: .4, bob: false }, extra || {});
  const STARTS = {
    blank: { name: 'Blank', icon: '📄', d: 'Just one title shot', make: () => [shot('title', 'MY TITLE', '', 2)] },
    news: { name: 'Big news', icon: '📣', d: 'Title, Rex talks, headline, finale', make: () => [shot('open', 'MY STUDIO', 'presents', 2), shot('title', 'BIG\nNEWS', 'Something new is here', 2, [ob('emoji', .14, .5, .2, { emoji: '🎉', bob: true }), ob('emoji', .86, .5, .2, { emoji: '🎉', bob: true, delay: .6 })]), shot('say', 'Hey! It\'s Rex.\nI have something to show you.', '', 3), shot('feat', 'The first big thing', 'Tell people why it is cool.', 2, [], { icon: '🚀' }), shot('big', 'COMING SOON', '', 2, [ob('emoji', .5, .82, .14, { emoji: '⏰', bob: true })])] },
    story: { name: 'Story intro', icon: '📖', d: 'A short story opening', make: () => [shot('open', 'ONCE UPON A TIME', '', 2), shot('say', 'Long ago, a small dino\nset out on a big adventure.', '', 3), shot('title', 'THE\nADVENTURE', 'Begins now', 2, [ob('emoji', .85, .22, .16, { emoji: '✨', bob: true })])] },
    shout: { name: 'Shout-out', icon: '🏆', d: 'Thank someone or celebrate', make: () => [shot('big', 'THANK YOU', 'You are awesome', 2, [ob('emoji', .15, .3, .2, { emoji: '🏆', bob: true }), ob('emoji', .85, .3, .2, { emoji: '👏', bob: true, delay: .7 })]), shot('say', 'We could not do it\nwithout you!', '', 2)] }
  };
  const DEFMUSIC = { blank: 'epic', news: 'epic', story: 'warm', shout: 'hype' };
  const fresh = (kind) => { const st = STARTS[kind || 'news']; return { id: uid(), name: kind === 'blank' ? 'New cutscene' : 'My cutscene', hue: [200, 280, 20, 150, 330][Math.floor(Math.random() * 5)], tempo: 'normal', music: { style: DEFMUSIC[kind || 'news'] || 'epic', vol: .8 }, endTitle: 'Thanks for watching!', endSub: 'Made with Project Rex Center', shots: st.make(), assets: {} }; };
  const used = c => { const u = new Set(); c.shots.forEach(s => (s.objs || []).forEach(o => { if (o.kind === 'img') u.add(o.asset); })); return u; };
  const toCustom = c => { const u = used(c), assets = {}; Object.keys(c.assets || {}).forEach(k => { if (u.has(k)) assets[k] = c.assets[k]; }); return { name: c.name, hue: c.hue, tempo: c.tempo, music: c.music || { style: 'epic', vol: .8 }, endTitle: c.endTitle, endSub: c.endSub, shots: c.shots, assets }; };
  const portableOf = cu => { const o = Object.assign({}, cu); if (o.music && o.music.style === 'file') o.music = { style: 'epic', vol: o.music.vol }; return o; };
  const slug = s => (String(s || 'cutscene').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cutscene').slice(0, 40);
  const phone = () => (typeof isPhoneView === 'function') && isPhoneView();
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (e) { /* ignore */ } };
  const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000); };
  let M = null, X = null;

  /* ---------- export / share dialog (works for trailers and for cutscenes) ---------- */
  function share(po, meta) {
    if (X) return; meta = meta || {}; const isCut = !!po.custom, name = (po.custom && po.custom.name) || ('Project Rex Center v' + (po.version || ''));
    let whs = []; try { const W = (typeof ws === 'function' ? ws() : state.workspaces[0]); whs = ((W && W.webhooks) || []).filter(w => w && w.url); } catch (e) { whs = []; }
    const ov = document.createElement('div'); ov.className = 'cm-ov cm-x'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Save video or send to Discord');
    ov.innerHTML = '<div class="cm-card cm-xc"><div class="cm-h"><div><small>EXPORT</small><h3>📤 Save video / Send to Discord</h3></div><button type="button" class="btn btn-sm" data-x="close">✕ Close</button></div>' +
      '<p class="cm-note">Your video is made right here in your browser (about ' + Math.round((window.RexCinema.timeline(po).total) / 1000) + ' seconds long). Keep this tab open while it records. Nothing is uploaded except what you send to your own webhook.</p>' +
      '<label class="cm-chk"><input type="checkbox" id="xSnd" checked> Include the music</label>' + (po.custom && po.custom.music && po.custom.music.style === 'file' ? '<p class="cm-note">Your own song is in the video, but it is not saved inside the .rexcut.json file (the file uses Epic trailer music instead).</p>' : '') + +
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
          if (isCut && $x('xFile') && $x('xFile').checked) { const cu = po.custom; form.append('files[' + (n++) + ']', new Blob([JSON.stringify(Object.assign({ rexCutscene: 1 }, portableOf(cu)), null, 2)], { type: 'application/json' }), slug(name) + '.rexcut.json'); }
          form.append('payload_json', JSON.stringify(pl)); st('Sending…');
          const res = await fetch(wh.url, { method: 'POST', body: form }); if (res.ok || res.status === 204) { st('Sent to Discord ✓' + skipped); say('Cutscene sent to Discord ✓', 'success'); } else st('Discord said no (' + res.status + ').' + (res.status === 413 ? ' The file is too big.' : ' Check that the webhook still exists.'));
        } catch (er) { st('Could not send: ' + (er && er.message || er)); }
        b.disabled = false;
      }
    });
    setTimeout(() => { const f = ov.querySelector('[data-x="make"]'); f && f.focus(); }, 40);
  }

  /* ---------- the maker ---------- */
  let lastSel = 0;
  const HUES = [0, 25, 50, 140, 190, 215, 265, 320];
  function open(opt) {
    if (M) return; if (window.RexCinema && window.RexCinema.open()) window.RexCinema.stop();
    const db = rd(); let cur = db.list.find(c => c.id === db.cur) || db.list[0]; if (!cur) { cur = fresh('news'); db.list.push(cur); db.cur = cur.id; wr(db); }
    cur.assets = cur.assets || {}; cur.music = cur.music || { style: 'epic', vol: .8 }; cur.shots.forEach(s => { s.objs = Array.isArray(s.objs) ? s.objs : []; });
    const ov = document.createElement('div'); ov.className = 'cm-ov cm2'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Cutscene Maker');
    let tip = true; try { tip = localStorage.getItem(TIPKEY) !== '1'; } catch (e) { /* ignore */ }
    ov.innerHTML = '<div class="cm-app" id="cmApp" data-tab="shots"><header class="cm-top"><b class="cm-brand">🎬 Cutscene Maker</b><input id="cmName" class="cm-name" maxlength="40" aria-label="Cutscene name"><span class="cm-saved" id="cmSaved" role="status">Saved ✓</span><span class="cm-sp"></span>' +
      '<button type="button" class="cm-ib" data-c="undo" title="Undo (Ctrl+Z)" aria-label="Undo">↶</button><button type="button" class="cm-ib" data-c="redo" title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>' +
      '<button type="button" class="btn btn-sm" data-c="play">▶ Play</button><button type="button" class="btn btn-sm btn-primary" data-c="share">📤 Export</button><button type="button" class="cm-ib" data-c="menu" title="More" aria-label="More" aria-haspopup="true">⋯</button><button type="button" class="cm-ib" data-c="close" title="Close" aria-label="Close">✕</button></header>' +
      '<div class="cm-menu" id="cmMenu" hidden></div>' +
      (tip ? '<div class="cm-tip" id="cmTip"><span><b>Quick start:</b> ① pick a shot on the left ② change its words ③ add pictures, emoji or text and <b>drag them on the preview</b>. It saves by itself.</span><button type="button" class="btn btn-sm" data-c="tipx">Got it</button></div>' : '') +
      '<div class="cm-body"><aside class="cm-rail" id="cmRail" data-p="shots"></aside><main class="cm-center"><div class="cm-stagebox" id="cmBox"><canvas id="cmCv" width="960" height="540" aria-label="Preview of the selected shot"></canvas><div class="cm-hit" id="cmHit"></div><div class="cm-drop" id="cmDrop" hidden>Drop a picture to add it</div></div>' +
      '<div class="cm-objbar" id="cmObj" data-p="objects"></div></main><aside class="cm-side"><div id="cmProps" data-p="edit"></div><div id="cmMovie" data-p="movie"></div></aside></div>' +
      '<nav class="cm-tabs" aria-label="Sections"><button type="button" data-t="shots" aria-pressed="true">🎞️ Shots</button><button type="button" data-t="edit" aria-pressed="false">✏️ Edit</button><button type="button" data-t="objects" aria-pressed="false">🧩 Objects</button><button type="button" data-t="movie" aria-pressed="false">🎨 Movie</button></nav></div>' +
      '<input type="file" id="cmImg" accept="image/*" multiple hidden><input type="file" id="cmFile" accept=".json,.rexcut,application/json" hidden><input type="file" id="cmMus" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" hidden>';
    document.body.appendChild(ov);
    M = { ov, db, prev: document.activeElement, sel: Math.min((opt && opt.sel != null ? opt.sel : lastSel) | 0, cur.shots.length), so: null, hist: [], redo: [], tm: 0, rq: 0, TL: null, emo: false };
    const $ = id => ov.querySelector('#' + id), cv = $('cmCv'), g = cv.getContext('2d'), hit = $('cmHit');
    const rexImg = new Image(); rexImg.src = 'icons/rex-mascot.svg'; rexImg.onload = () => renderStage();
    const stars = []; for (let i = 0, a = 7; i < 200; i++) { a = (a * 1103515245 + 12345) % 2147483648; const x = a / 2147483648; a = (a * 1103515245 + 12345) % 2147483648; const y = a / 2147483648; a = (a * 1103515245 + 12345) % 2147483648; stars.push({ x: x * 2 - 1, y: y * 2 - 1, z: a / 2147483648 }); }
    const shots = () => cur.shots, curShot = () => cur.shots[M.sel] || null, objs = () => { const s = curShot(); return s ? s.objs : []; }, findObj = id => objs().find(o => o.id === id) || null;
    const snap = () => JSON.stringify(Object.assign({}, cur, { assets: undefined }));
    M.hist.push(snap());
    function persist() {
      M.db.cur = cur.id; const list = M.db.list.map(c => c === cur ? Object.assign({}, c, { assets: toCustom(c).assets }) : c); const ok = wr(Object.assign({}, M.db, { list }));
      const el = $('cmSaved'); if (el) { el.textContent = ok ? 'Saved ✓' : '⚠ Not saved (storage full)'; el.classList.toggle('bad', !ok); } if (!ok) say('Could not save. Download the file so you do not lose it.', 'warn'); return ok;
    }
    function commit() { clearTimeout(M.tm); const s = snap(); if (s !== M.hist[M.hist.length - 1]) { M.hist.push(s); if (M.hist.length > 60) M.hist.shift(); M.redo = []; } persist(); syncUndo(); }
    function commitSoon() { const el = $('cmSaved'); if (el) { el.textContent = 'Saving…'; el.classList.remove('bad'); } clearTimeout(M.tm); M.tm = setTimeout(commit, 450); }
    function syncUndo() { const u = ov.querySelector('[data-c="undo"]'), r = ov.querySelector('[data-c="redo"]'); if (u) u.disabled = M.hist.length < 2; if (r) r.disabled = !M.redo.length; }
    function restore(s) { const o = JSON.parse(s), idx = M.db.list.indexOf(cur); Object.assign(cur, o); void idx; M.sel = Math.min(M.sel, cur.shots.length); if (M.so && !findObj(M.so)) M.so = null; persist(); paintAll(); syncUndo(); }
    function undo() { clearTimeout(M.tm); commit(); if (M.hist.length < 2) return; M.redo.push(M.hist.pop()); restore(M.hist[M.hist.length - 1]); }
    function redo() { if (!M.redo.length) return; const s = M.redo.pop(); M.hist.push(s); restore(s); }
    const label = s => { const t = String(s.text || '').split('\n')[0].trim(); return t || TYPES[s.type]; };

    function paintRail() {
      const n = cur.shots.length;
      $('cmRail').innerHTML = '<div class="cm-rh"><b>Shots</b><span>' + n + ' · ≈' + Math.round((M.TL ? M.TL.total : 0) / 1000) + 's</span></div><ol class="cm-fl">' + cur.shots.map((s, i) => '<li class="cm-fs' + (i === M.sel ? ' on' : '') + '" draggable="true" data-i="' + i + '"' + (i === M.sel ? ' aria-current="true"' : '') + '><button type="button" class="cm-fb" data-r="sel" aria-label="Shot ' + (i + 1) + ': ' + E(label(s)) + '"><span class="cm-n">' + (i + 1) + '</span><span class="cm-t">' + TICON[s.type] + '</span><span class="cm-x">' + E(label(s)) + '<small>' + TYPES[s.type] + ' · ' + LEN[s.bars] + (s.objs.length ? ' · ' + s.objs.length + ' obj' : '') + '</small></span></button><span class="cm-fa"><button type="button" data-r="up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-r="down" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-r="dup" aria-label="Duplicate shot">⧉</button><button type="button" data-r="del" aria-label="Delete shot">🗑</button></span></li>').join('') +
        '<li class="cm-fs end' + (M.sel === n ? ' on' : '') + '" data-i="' + n + '"><button type="button" class="cm-fb" data-r="sel"><span class="cm-n">🏁</span><span class="cm-x">Last screen<small>' + E(cur.endTitle) + '</small></span></button></li></ol>' +
        '<div class="cm-al">Add a shot</div><div class="cm-ag">' + Object.keys(TYPES).map(k => '<button type="button" class="btn btn-sm" data-a="' + k + '">' + TICON[k] + ' ' + TYPES[k] + '</button>').join('') + '</div>';
    }
    function paintProps() {
      const s = curShot(), el = $('cmProps');
      if (!s) { el.innerHTML = '<h4>Last screen</h4><label class="cm-l">Big line<input data-e="endTitle" maxlength="60" value="' + E(cur.endTitle) + '"></label><label class="cm-l">Small line<input data-e="endSub" maxlength="80" value="' + E(cur.endSub) + '"></label><p class="cm-note">This is the final screen with the buttons. Objects can go on the other shots.</p>'; return; }
      const t = s.type;
      el.innerHTML = '<h4>Shot ' + (M.sel + 1) + '</h4><label class="cm-l">Kind of shot<select data-f="type">' + Object.keys(TYPES).map(k => '<option value="' + k + '"' + (k === t ? ' selected' : '') + '>' + TICON[k] + ' ' + TYPES[k] + '</option>').join('') + '</select></label>' +
        '<label class="cm-l">' + (t === 'say' ? 'What Rex says (one line per row)' : t === 'title' ? 'Title (one line per row, up to 4)' : 'Words') + (t === 'say' || t === 'title' ? '<textarea data-f="text" rows="3" maxlength="' + (t === 'say' ? 240 : 80) + '">' + E(s.text) + '</textarea>' : '<input data-f="text" maxlength="80" value="' + E(s.text) + '">') + '</label>' +
        (t !== 'say' ? '<label class="cm-l">Small line under it<input data-f="sub" maxlength="140" value="' + E(s.sub) + '"></label>' : '') +
        (t === 'feat' ? '<div class="cm-2"><label class="cm-l">Big icon (emoji)<input data-f="icon" maxlength="4" value="' + E(s.icon) + '"></label><label class="cm-l">Tag<input data-f="tag" maxlength="10" value="' + E(s.tag) + '"></label></div>' : '') +
        '<div class="cm-l">How long<div class="cm-seg" role="group" aria-label="How long">' + [1, 2, 3, 4].map(k => '<button type="button" data-len="' + k + '" aria-pressed="' + (+s.bars === k) + '">' + LEN[k] + '</button>').join('') + '</div></div>' +
        '<div class="cm-row"><button type="button" class="btn btn-sm" data-c="here">▶ Play from this shot</button></div>';
    }
    function paintMovie() {
      const mu = cur.music || (cur.music = { style: 'epic', vol: .8 }), isF = mu.style === 'file';
      $('cmMovie').innerHTML = '<h4>Music</h4><div class="cm-mus" role="radiogroup" aria-label="Music">' + MSTYLES.map(m => '<div class="cm-mr' + (mu.style === m[0] ? ' on' : '') + '"><button type="button" class="cm-mb" role="radio" aria-checked="' + (mu.style === m[0]) + '" data-mus="' + m[0] + '"><span>' + m[1] + '</span><b>' + m[2] + '</b><small>' + m[3] + '</small></button>' + (m[0] === 'none' ? '' : '<button type="button" class="cm-mp" data-musp="' + m[0] + '" aria-label="Try ' + m[2] + '">' + (M.prevId === m[0] ? '■' : '▶') + '</button>') + '</div>').join('') +
        '<div class="cm-mr' + (isF ? ' on' : '') + '"><button type="button" class="cm-mb" role="radio" aria-checked="' + isF + '" data-mus="file"><span>📂</span><b>' + (mu.fileId ? E(cap(mu.fileName || 'My song', 26)) : 'Use my own music') + '</b><small>' + (mu.fileId ? 'Your song · ' + fmtMB(mu.size || 0) : 'mp3, wav, m4a, ogg') + '</small></button>' + (mu.fileId ? '<button type="button" class="cm-mp" data-musp="file" aria-label="Try my song">' + (M.prevId === 'file' ? '■' : '▶') + '</button>' : '') + '</div></div>' +
        (mu.style !== 'none' ? '<label class="cm-l">Volume <output>' + Math.round((mu.vol == null ? .8 : mu.vol) * 100) + '%</output><input type="range" data-vol min="0" max="100" value="' + Math.round((mu.vol == null ? .8 : mu.vol) * 100) + '"></label>' : '') +
        (mu.fileId ? '<div class="cm-row"><button type="button" class="btn btn-sm" data-c="musrm">Remove my song</button></div>' : '') +
        '<p class="cm-note">Built-in music is made in your browser: free, no files, no licenses. Your own song stays in this browser (it is never uploaded) and plays under the whole movie. Only use songs you are allowed to use, especially before you send a video to Discord. Music speed below also changes how long shots last.</p>' +
        '<h4>Movie look</h4><div class="cm-l">Color<div class="cm-sws">' + HUES.map(h => '<button type="button" class="cm-swb' + (Math.abs(cur.hue - h) < 14 ? ' on' : '') + '" data-hue="' + h + '" style="background:hsl(' + h + ',85%,55%)" aria-label="Color ' + h + '"></button>').join('') + '</div><input id="cmHue" type="range" min="0" max="359" value="' + cur.hue + '" aria-label="Fine color"></div>' +
        '<div class="cm-l">Music speed<div class="cm-seg" role="group" aria-label="Music speed">' + [['chill', 'Chill'], ['normal', 'Normal'], ['fast', 'Fast']].map(t => '<button type="button" data-tempo="' + t[0] + '" aria-pressed="' + (cur.tempo === t[0]) + '">' + t[1] + '</button>').join('') + '</div></div>' +
        '<label class="cm-l">Last screen: big line<input data-e="endTitle" maxlength="60" value="' + E(cur.endTitle) + '"></label><label class="cm-l">Last screen: small line<input data-e="endSub" maxlength="80" value="' + E(cur.endSub) + '"></label>' +
        '<p class="cm-note">Length: about <b id="cmLen">' + Math.round((M.TL ? M.TL.total : 0) / 1000) + '</b> seconds. Export makes a video you can download or send to Discord.</p>';
    }
    const OLAB = o => o.kind === 'img' ? '🖼️ Picture' : o.kind === 'rex' ? '🦖 Rex' : o.kind === 'emoji' ? o.emoji + ' Emoji' : '🔤 ' + cap(o.text, 12);
    function paintObj() {
      const s = curShot(), el = $('cmObj'); if (!s) { el.innerHTML = '<p class="cm-note">Pick a shot to add objects to it.</p>'; return; }
      const so = findObj(M.so);
      el.innerHTML = '<div class="cm-oh"><b>Objects</b> <span>pictures, emoji, text</span></div><div class="cm-ao"><button type="button" class="btn btn-sm" data-o="img">🖼️ Add picture</button><button type="button" class="btn btn-sm" data-o="emoji" aria-expanded="' + M.emo + '">😀 Emoji</button><button type="button" class="btn btn-sm" data-o="text">🔤 Text</button><button type="button" class="btn btn-sm" data-o="rex">🦖 Rex</button></div>' +
        (M.emo ? '<div class="cm-emo" role="group" aria-label="Pick an emoji">' + EMOJI.map(e => '<button type="button" data-em="' + e + '" aria-label="' + e + '">' + e + '</button>').join('') + '</div>' : '') +
        (s.objs.length ? '<div class="cm-ol">' + s.objs.map(o => '<button type="button" class="cm-oc' + (o.id === M.so ? ' on' : '') + '" data-oid="' + o.id + '">' + E(OLAB(o)) + '</button>').join('') + '</div>' : '<p class="cm-note">No objects yet. Add a picture from your computer (you can also drop one on the preview or paste it), an emoji, some text, or Rex.</p>') +
        (so ? '<div class="cm-os"><div class="cm-2">' + (so.kind === 'emoji' ? '<label class="cm-l">Emoji<input data-o2="emoji" maxlength="4" value="' + E(so.emoji) + '"></label>' : so.kind === 'text' ? '<label class="cm-l">Words<input data-o2="text" maxlength="40" value="' + E(so.text) + '"></label>' : '') + (so.kind === 'text' ? '<label class="cm-l">Color<input type="color" data-o2="color" value="' + E(so.color) + '"></label>' : '') + '</div>' +
          '<label class="cm-l">Size <output id="oSzV">' + Math.round(so.s * 100) + '%</output><input type="range" id="oSz" data-o2="s" min="3" max="300" value="' + Math.round(so.s * 100) + '"></label>' +
          '<label class="cm-l">Turn <output id="oRtV">' + Math.round(so.r) + '°</output><input type="range" id="oRt" data-o2="r" min="-180" max="180" value="' + Math.round(so.r) + '"></label>' +
          '<div class="cm-2"><label class="cm-l">Appears<select data-o2="anim">' + Object.keys(ANIMS).map(k => '<option value="' + k + '"' + (so.anim === k ? ' selected' : '') + '>' + ANIMS[k] + '</option>').join('') + '</select></label><label class="cm-l">After <output id="oDlV">' + (+so.delay).toFixed(1) + 's</output><input type="range" data-o2="delay" min="0" max="30" value="' + Math.round(so.delay * 10) + '"></label></div>' +
          '<label class="cm-chk"><input type="checkbox" data-o2="bob"' + (so.bob ? ' checked' : '') + '> Floating (bobs up and down)</label>' +
          '<div class="cm-row"><button type="button" class="btn btn-sm" data-ob="dup">⧉ Duplicate</button><button type="button" class="btn btn-sm" data-ob="front">⬆ Front</button><button type="button" class="btn btn-sm" data-ob="back">⬇ Back</button><button type="button" class="btn btn-sm" data-ob="del">🗑 Delete</button></div></div>'
          : (s.objs.length ? '<p class="cm-note">Click an object (here or on the preview) to change it. Drag it to move. Drag the round handles to resize and turn.</p>' : ''));
    }
    function paintHit(boxes) {
      const sh = curShot(), list = sh ? sh.objs : []; let h = '';
      boxes.forEach((b, i) => { const o = list.find(x => x.id === b.id); if (!o) return; const on = o.id === M.so; h += '<div class="cm-ho' + (on ? ' on' : '') + '" data-oid="' + o.id + '" style="left:' + (b.cx / 9.6) + '%;top:' + (b.cy / 5.4) + '%;width:' + (b.W / 9.6) + '%;height:' + (b.H / 5.4) + '%;transform:translate(-50%,-50%) rotate(' + b.r + 'deg);z-index:' + (i + 1) + '" title="' + E(OLAB(o)) + '">' + (on ? '<i class="cm-hd rt" data-h="rt" title="Turn"></i><i class="cm-hd sc" data-h="sc" title="Resize"></i>' : '') + '</div>'; });
      if (hit.innerHTML !== h) hit.innerHTML = h;
    }
    function draw() {
      const TL = window.RexCinema.timeline({ custom: toCustom(cur), phone: false }); M.TL = TL; const i = Math.min(M.sel, TL.S.length - 1), sc = TL.S[i], t = sc.at + Math.max(0, Math.min(sc.ms - 80, 3200));
      window.RexCinema.drawFrame(g, 960, 540, TL, t, rexImg, stars); paintHit(M.sel < cur.shots.length ? (TL.boxes || []) : []);
      const r = ov.querySelector('.cm-rh span'); if (r) r.textContent = cur.shots.length + ' · ≈' + Math.round(TL.total / 1000) + 's'; const l = ov.querySelector('#cmLen'); if (l) l.textContent = Math.round(TL.total / 1000);
    }
    function renderStage() { if (M.rq) return; M.rq = requestAnimationFrame(() => { M.rq = 0; if (M) draw(); }); }
    window.RexCinema.onImg = () => { if (M) renderStage(); };
    function paintAll() { $('cmName').value = cur.name; draw(); paintRail(); paintProps(); paintMovie(); paintObj(); syncUndo(); }
    paintAll();

    /* ----- actions ----- */
    function selShot(i) { M.sel = Math.max(0, Math.min(cur.shots.length, i)); lastSel = M.sel; M.so = null; M.emo = false; paintRail(); paintProps(); paintObj(); renderStage(); }
    function selObj(id) { M.so = id; paintObj(); renderStage(); }
    function addObj(o) { const s = curShot(); if (!s) { say('Pick a shot first (not the last screen).', 'warn'); return null; } if (s.objs.length >= 14) { say('That is the most objects on one shot (14).', 'warn'); return null; } s.objs.push(o); M.so = o.id; M.emo = false; commit(); paintRail(); paintObj(); renderStage(); return o; }
    async function importImg(file) {
      if (!file || !/^image\//.test(file.type)) { say('That is not a picture.', 'warn'); return; } if (file.size > 12e6) { say('That picture is over 12 MB. Try a smaller one.', 'warn'); return; }
      const url = URL.createObjectURL(file); try {
        const im = new Image(); await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url; });
        const w0 = im.naturalWidth || 512, h0 = im.naturalHeight || 512; let mx = 560, d = '', w = 1, h = 1;
        for (let tries = 0; tries < 4; tries++) { const k = Math.min(1, mx / Math.max(w0, h0)); w = Math.max(1, Math.round(w0 * k)); h = Math.max(1, Math.round(h0 * k)); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
          d = file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', .86) : c.toDataURL('image/png'); if (d.length > 420000 && file.type !== 'image/jpeg') { const wp = c.toDataURL('image/webp', .85); if (/^data:image\/webp/.test(wp) && wp.length < d.length) d = wp; }
          if (d.length <= 700000) break; mx = Math.round(mx * .65); }
        if (d.length > 700000) { say('That picture is too detailed to store. Try a simpler one.', 'warn'); return; }
        const tot = Object.keys(cur.assets).reduce((a, k) => a + cur.assets[k].length, 0); if (tot + d.length > MAXASSET) { say('This cutscene has a lot of pictures already. Delete one first.', 'warn'); return; }
        const id = 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); cur.assets[id] = d; const ar = w / h;
        addObj(ob('img', .5, .5, Math.min(.42, 1.0 / ar), { asset: id }));
      } catch (e) { say('Could not read that picture.', 'warn'); } finally { URL.revokeObjectURL(url); }
    }
    const importMany = fs => { Array.from(fs || []).slice(0, 6).reduce((p, f) => p.then(() => importImg(f)), Promise.resolve()); };
    let prevH = null;
    function stopPrev() { if (prevH) { try { prevH.stop(); } catch (e) { /* ignore */ } prevH = null; } clearTimeout(M && M.prevTm); if (M) M.prevId = null; }
    async function tryMusic(id) {
      if (M.prevId === id) { stopPrev(); paintMovie(); return; } stopPrev(); const sty = cur.tempo;
      if (id === 'file') {
        try { const ab = await loadMusic(cur.music.fileId), au = new Audio(), url = URL.createObjectURL(new Blob([ab])); au.src = url; au.volume = cur.music.vol == null ? .8 : cur.music.vol; await au.play(); prevH = { stop: () => { au.pause(); URL.revokeObjectURL(url); } }; M.prevId = 'file'; M.prevTm = setTimeout(() => { if (M && M.prevId === 'file') { stopPrev(); paintMovie(); } }, 12000); }
        catch (e) { say('Could not play your song. Try adding it again.', 'warn'); }
      } else { const h = window.RexCinema.previewMusic(id, sty); if (!h) { say('This browser cannot play sound.', 'warn'); return; } prevH = h; M.prevId = id; M.prevTm = setTimeout(() => { if (M && M.prevId === id) { stopPrev(); paintMovie(); } }, 11500); }
      paintMovie();
    }
    async function importMusic(file) {
      if (!file) return; const okExt = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|weba|webm)$/i.test(file.name || '');
      if (!(/^audio\//.test(file.type) || okExt)) { say('That is not a music file. Try mp3, wav, m4a or ogg.', 'warn'); return; } if (file.size > 30e6) { say('That song is over 30 MB. Try a smaller one.', 'warn'); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(); let dur = 0; try { const buf = await ac.decodeAudioData(await file.arrayBuffer()); dur = buf.duration; } finally { try { ac.close(); } catch (e) { /* ignore */ } }
        stopPrev(); const old = cur.music && cur.music.fileId, id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        await mStore.put(id, { name: file.name, type: file.type, size: file.size, blob: file });
        cur.music = { style: 'file', fileId: id, fileName: cap(file.name.replace(/\.[^.]+$/, ''), 40), size: file.size, dur: Math.round(dur), vol: cur.music && cur.music.vol != null ? cur.music.vol : .8 };
        if (old && old !== id) { const stillUsed = M.db.list.some(c => c !== cur && c.music && c.music.fileId === old); if (!stillUsed) mStore.del(old).catch(() => {}); }
        commit(); paintMovie(); say('Using "' + cur.music.fileName + '" ✓' + (dur ? ' (' + Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0') + ')' : ''), 'success');
      } catch (e) { say('Could not use that song. This browser may not support that format; try mp3 or wav.', 'warn'); }
    }
    function addShot(type, at) {
      if (cur.shots.length >= 24) { say('That is the most shots in one cutscene (24).', 'warn'); return; }
      const ns = shot(type, type === 'say' ? 'Hello!' : type === 'title' ? 'NEW TITLE' : type === 'big' ? 'BIG NEWS' : type === 'open' ? 'PRESENTS' : 'A new headline', '', 2); const i = at == null ? cur.shots.length : at; cur.shots.splice(i, 0, ns); commit(); selShot(i);
      const ls = ov.querySelector('.cm-fl'); if (ls) ls.lastElementChild && ls.lastElementChild.previousElementSibling && ls.lastElementChild.previousElementSibling.scrollIntoView({ block: 'nearest' });
    }
    function delObj() { const s = curShot(); if (!s || !M.so) return; s.objs = s.objs.filter(o => o.id !== M.so); M.so = null; commit(); paintRail(); paintObj(); renderStage(); }
    function dupObj() { const o = findObj(M.so), s = curShot(); if (!o || s.objs.length >= 14) return; const c = Object.assign({}, o, { id: oid(), x: Math.min(1.1, o.x + .04), y: Math.min(1.1, o.y + .05) }); s.objs.push(c); M.so = c.id; commit(); paintRail(); paintObj(); renderStage(); }
    function closeAll() { stopPrev(); clearTimeout(M.tm); commit(); document.removeEventListener('keydown', onKey, true); document.removeEventListener('paste', onPaste); window.RexCinema.onImg = null; cancelAnimationFrame(M.rq); ov.remove(); const pv = M.prev; M = null; try { pv && pv.focus && pv.isConnected && pv.focus(); } catch (e) { /* ignore */ } }
    function playIt(from) { const co = toCustom(cur), sel = M.sel; lastSel = sel; closeAll(); window.RexCinema.play({ custom: co, phone: phone(), manual: true, startAt: from ? Math.min(sel, co.shots.length - 1) : 0, onClose: () => { if (!M) open({ sel }); } }); }
    function menu() {
      const m = $('cmMenu'); if (!m.hidden) { m.hidden = true; return; }
      m.innerHTML = '<label class="cm-l">My cutscenes<select id="cmSel">' + M.db.list.map(c => '<option value="' + c.id + '"' + (c.id === cur.id ? ' selected' : '') + '>' + E(c.name) + '</option>').join('') + '</select></label><div class="cm-al">Start a new one</div><div class="cm-st">' + Object.keys(STARTS).map(k => '<button type="button" data-new="' + k + '"><span>' + STARTS[k].icon + '</span><b>' + STARTS[k].name + '</b><small>' + STARTS[k].d + '</small></button>').join('') + '</div><div class="cm-row"><button type="button" class="btn btn-sm" data-c="dup">Duplicate this</button><button type="button" class="btn btn-sm" data-c="rm">Delete this</button></div><div class="cm-row"><button type="button" class="btn btn-sm" data-c="file">⬇ Download file</button><button type="button" class="btn btn-sm" data-c="imp">📂 Import file</button></div>'; m.hidden = false;
    }
    function switchTo(c) { stopPrev(); cur = c; cur.assets = cur.assets || {}; cur.music = cur.music || { style: 'epic', vol: .8 }; cur.shots.forEach(s => { s.objs = Array.isArray(s.objs) ? s.objs : []; }); M.sel = 0; M.so = null; M.hist = [snap()]; M.redo = []; M.db.cur = c.id; persist(); paintAll(); }

    /* ----- events ----- */
    const typing = e => { const t = e.target; return t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range' && t.type !== 'checkbox' && t.type !== 'color'; };
    function onKey(e) {
      if (!M || document.querySelector('.cm-x') || (window.RexCinema && window.RexCinema.open())) return; const k = e.key, mod = e.ctrlKey || e.metaKey;
      if (k === 'Escape') { e.preventDefault(); if (!$('cmMenu').hidden) $('cmMenu').hidden = true; else if (M.emo) { M.emo = false; paintObj(); } else if (M.so) selObj(null); else closeAll(); return; }
      if (mod && (k === 'z' || k === 'Z')) { if (typing(e)) return; e.preventDefault(); e.shiftKey ? redo() : undo(); return; } if (mod && (k === 'y' || k === 'Y')) { if (typing(e)) return; e.preventDefault(); redo(); return; }
      if (typing(e) || !M.so) return; const o = findObj(M.so); if (!o) return;
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); delObj(); }
      else if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); dupObj(); }
      else if (k.indexOf('Arrow') === 0) { e.preventDefault(); const st = e.shiftKey ? .02 : .005; if (k === 'ArrowLeft') o.x -= st; else if (k === 'ArrowRight') o.x += st; else if (k === 'ArrowUp') o.y -= st; else o.y += st; o.x = num(o.x, -.2, 1.2, .5); o.y = num(o.y, -.2, 1.2, .5); renderStage(); commitSoon(); }
    }
    document.addEventListener('keydown', onKey, true);
    function onPaste(e) { if (!M || document.querySelector('.cm-x') || typing(e)) return; const fs = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(f => /^image\//.test(f.type)); if (fs.length) { e.preventDefault(); importMany(fs); } }
    document.addEventListener('paste', onPaste);
    /* dragging objects on the preview */
    let drag = null;
    hit.addEventListener('pointerdown', e => {
      const hd = e.target.closest('[data-h]'), bx = e.target.closest('[data-oid]'); if (!bx) { if (M.so) selObj(null); return; } const o = findObj(bx.dataset.oid); if (!o) return;
      const r = hit.getBoundingClientRect(), cx = r.left + o.x * r.width, cy = r.top + o.y * r.height; e.preventDefault();
      if (M.so !== o.id) { M.so = o.id; paintObj(); }
      drag = { mode: hd ? hd.dataset.h : 'mv', sx: e.clientX, sy: e.clientY, o, ox: o.x, oy: o.y, os: o.s, or: o.r, cx, cy, d0: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), a0: Math.atan2(e.clientY - cy, e.clientX - cx), r, moved: false };
      try { hit.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } renderStage();
    });
    hit.addEventListener('pointermove', e => {
      if (!drag) return; const d = drag, o = d.o; d.moved = true;
      if (d.mode === 'mv') { o.x = num(d.ox + (e.clientX - d.sx) / d.r.width, -.2, 1.2, o.x); o.y = num(d.oy + (e.clientY - d.sy) / d.r.height, -.2, 1.2, o.y); if (Math.abs(o.x - .5) < .012) o.x = .5; if (Math.abs(o.y - .5) < .012) o.y = .5; }
      else if (d.mode === 'sc') o.s = num(d.os * Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0, .03, 3, o.s);
      else { let a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) - d.a0) * 180 / Math.PI + d.or; a = ((a + 540) % 360) - 180; if (e.shiftKey || Math.abs(a) < 4) a = e.shiftKey ? Math.round(a / 15) * 15 : 0; o.r = Math.round(a); }
      const sz = $('oSz'), rt = $('oRt'); if (sz) { sz.value = Math.round(o.s * 100); $('oSzV').textContent = Math.round(o.s * 100) + '%'; } if (rt) { rt.value = Math.round(o.r); $('oRtV').textContent = Math.round(o.r) + '°'; }
      renderStage();
    });
    const endDrag = () => { if (!drag) return; const mv = drag.moved; drag = null; if (mv) commit(); };
    hit.addEventListener('pointerup', endDrag); hit.addEventListener('pointercancel', endDrag);
    /* drag and drop pictures onto the preview */
    const box = $('cmBox'); ['dragenter', 'dragover'].forEach(n => box.addEventListener(n, e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); $('cmDrop').hidden = false; } }));
    ['dragleave', 'drop'].forEach(n => box.addEventListener(n, e => { if (n === 'drop') { e.preventDefault(); importMany(e.dataTransfer && e.dataTransfer.files); } $('cmDrop').hidden = true; }));
    /* rail: drag to reorder */
    let dragIdx = -1; const rail = $('cmRail');
    rail.addEventListener('dragstart', e => { const li = e.target.closest('.cm-fs'); if (!li || li.classList.contains('end')) { e.preventDefault(); return; } dragIdx = +li.dataset.i; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (er) { /* ignore */ } });
    rail.addEventListener('dragover', e => { if (dragIdx >= 0) e.preventDefault(); });
    rail.addEventListener('drop', e => { const li = e.target.closest('.cm-fs'); if (dragIdx < 0 || !li) return; e.preventDefault(); let to = +li.dataset.i; if (to >= cur.shots.length) to = cur.shots.length - 1; if (to !== dragIdx) { const [m] = cur.shots.splice(dragIdx, 1); cur.shots.splice(to, 0, m); M.sel = to; commit(); paintAll(); } dragIdx = -1; });
    rail.addEventListener('dragend', () => { dragIdx = -1; });
    ov.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'cmName') { cur.name = cap(t.value, 40) || 'Untitled'; commitSoon(); return; }
      if (t.id === 'cmHue') { cur.hue = +t.value; commitSoon(); renderStage(); ov.querySelectorAll('.cm-swb').forEach(b => b.classList.toggle('on', Math.abs(cur.hue - +b.dataset.hue) < 14)); return; }
      if (t.dataset.vol !== undefined) { cur.music.vol = num(t.value / 100, 0, 1, .8); const ou = t.parentNode.querySelector('output'); if (ou) ou.textContent = Math.round(cur.music.vol * 100) + '%'; commitSoon(); return; }
      if (t.dataset.e) { cur[t.dataset.e] = t.value; ov.querySelectorAll('[data-e="' + t.dataset.e + '"]').forEach(x => { if (x !== t) x.value = t.value; }); commitSoon(); renderStage(); const li = rail.querySelector('.cm-fs.end small'); if (li) li.textContent = cur.endTitle; return; }
      if (t.dataset.f) { const s = curShot(); if (!s) return; s[t.dataset.f] = t.value; commitSoon(); renderStage(); const li = rail.querySelector('.cm-fs.on .cm-x'); if (li) { li.firstChild.nodeValue = label(s); } return; }
      if (t.dataset.o2) { const o = findObj(M.so); if (!o) return; const k = t.dataset.o2, v = t.type === 'checkbox' ? t.checked : t.value;
        if (k === 's') { o.s = num(v / 100, .03, 3, o.s); $('oSzV').textContent = Math.round(o.s * 100) + '%'; } else if (k === 'r') { o.r = num(v, -180, 180, 0); $('oRtV').textContent = Math.round(o.r) + '°'; } else if (k === 'delay') { o.delay = num(v / 10, 0, 3, .4); $('oDlV').textContent = o.delay.toFixed(1) + 's'; } else if (k === 'bob') o.bob = !!v; else if (k === 'anim') o.anim = ANIMS[v] ? v : 'pop'; else if (k === 'emoji') o.emoji = cap(v, 4) || '⭐'; else if (k === 'text') o.text = cap(v, 40); else if (k === 'color') o.color = /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff';
        commitSoon(); renderStage(); if (k === 'text' || k === 'emoji') { const c = ov.querySelector('.cm-oc.on'); if (c) c.textContent = OLAB(o); } }
    });
    ov.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'cmSel') { const c = M.db.list.find(x => x.id === t.value); if (c) { commit(); switchTo(c); $('cmMenu').hidden = true; } }
      else if (t.id === 'cmMus') { importMusic(t.files && t.files[0]); t.value = ''; }
      else if (t.id === 'cmImg') { importMany(t.files); t.value = ''; }
      else if (t.id === 'cmFile' && t.files && t.files[0]) { const f = t.files[0]; if (f.size > 4e6) { say('That file is too big to be a cutscene.', 'warn'); return; } const fr = new FileReader(); fr.onload = () => { let c = null; try { c = clean(JSON.parse(String(fr.result))); } catch (er) { c = null; } if (!c) { say('That file is not a Rex cutscene.', 'error'); return; } M.db.list.push(c); switchTo(c); $('cmMenu').hidden = true; say('Imported "' + c.name + '" ✓', 'success'); }; fr.readAsText(f); t.value = ''; }
      else if (t.dataset.f === 'type') { const s = curShot(); if (s) { s.type = t.value; commit(); paintRail(); paintProps(); renderStage(); } }
      else if (t.dataset.o2 === 'anim' || t.dataset.o2 === 'bob') { commit(); }
    });
    ov.addEventListener('pointerup', e => { if (e.target && e.target.dataset && e.target.type === 'range') commit(); });
    ov.addEventListener('click', e => {
      const T = e.target;
      if (T === ov) { closeAll(); return; }
      const tab = T.closest('[data-t]'); if (tab) { const a = $('cmApp'); a.dataset.tab = tab.dataset.t; ov.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(b === tab))); return; }
      const rr = T.closest('[data-r]'); if (rr) { const i = +rr.closest('.cm-fs').dataset.i, k = rr.dataset.r;
        if (k === 'sel') selShot(i); else if (k === 'del') { if (cur.shots.length < 2) { say('A cutscene needs at least one shot.', 'warn'); return; } cur.shots.splice(i, 1); M.sel = Math.min(M.sel, cur.shots.length - 1); commit(); paintAll(); }
        else if (k === 'dup') { if (cur.shots.length >= 24) { say('That is the most shots (24).', 'warn'); return; } const c = JSON.parse(JSON.stringify(cur.shots[i])); c.objs.forEach(o => { o.id = oid(); }); cur.shots.splice(i + 1, 0, c); M.sel = i + 1; commit(); paintAll(); }
        else { const j = k === 'up' ? i - 1 : i + 1; if (j < 0 || j >= cur.shots.length) return; const tmp = cur.shots[i]; cur.shots[i] = cur.shots[j]; cur.shots[j] = tmp; M.sel = j; commit(); paintAll(); } return; }
      const ad = T.closest('[data-a]'); if (ad) { addShot(ad.dataset.a, M.sel < cur.shots.length ? M.sel + 1 : null); return; }
      const ln = T.closest('[data-len]'); if (ln) { const s = curShot(); if (s) { s.bars = +ln.dataset.len; commit(); paintProps(); paintRail(); renderStage(); } return; }
      const mb = T.closest('[data-mus]'); if (mb) { const k = mb.dataset.mus; if (k === 'file' && !cur.music.fileId) { $('cmMus').click(); return; } stopPrev(); cur.music.style = k; commit(); paintMovie(); renderStage(); return; }
      const mp = T.closest('[data-musp]'); if (mp) { tryMusic(mp.dataset.musp); return; }
      const tp = T.closest('[data-tempo]'); if (tp) { cur.tempo = tp.dataset.tempo; commit(); paintMovie(); renderStage(); return; }
      const hu = T.closest('[data-hue]'); if (hu) { cur.hue = +hu.dataset.hue; commit(); paintMovie(); renderStage(); return; }
      const oo = T.closest('[data-o]'); if (oo) { const k = oo.dataset.o; if (k === 'img') $('cmImg').click(); else if (k === 'emoji') { M.emo = !M.emo; paintObj(); } else if (k === 'text') { const o = addObj(ob('text', .5, .5, .12, { text: 'Your text' })); if (o) setTimeout(() => { const f = ov.querySelector('[data-o2="text"]'); if (f) { f.focus(); f.select(); } }, 30); } else if (k === 'rex') addObj(ob('rex', .78, .55, .4)); return; }
      const em = T.closest('[data-em]'); if (em) { addObj(ob('emoji', .5, .5, .2, { emoji: em.dataset.em })); return; }
      const oc = T.closest('.cm-oc[data-oid]'); if (oc) { selObj(oc.dataset.oid); return; }
      const obn = T.closest('[data-ob]'); if (obn) { const k = obn.dataset.ob, s = curShot(), o = findObj(M.so); if (!o) return; if (k === 'del') delObj(); else if (k === 'dup') dupObj(); else { s.objs = s.objs.filter(x => x !== o); k === 'front' ? s.objs.push(o) : s.objs.unshift(o); commit(); paintObj(); renderStage(); } return; }
      const nw = T.closest('[data-new]'); if (nw) { commit(); const c = fresh(nw.dataset.new); c.name = nw.dataset.new === 'blank' ? 'New cutscene' : STARTS[nw.dataset.new].name; M.db.list.push(c); switchTo(c); $('cmMenu').hidden = true; return; }
      const c = T.closest('[data-c]'); if (!c) { const mn = $('cmMenu'); if (mn && !mn.hidden && !T.closest('#cmMenu')) mn.hidden = true; return; } const k = c.dataset.c;
      if (k === 'close') closeAll(); else if (k === 'undo') undo(); else if (k === 'redo') redo(); else if (k === 'menu') menu();
      else if (k === 'play') playIt(false); else if (k === 'here') playIt(true);
      else if (k === 'share') { commit(); share({ custom: toCustom(cur), phone: phone(), manual: true }); }
      else if (k === 'tipx') { try { localStorage.setItem(TIPKEY, '1'); } catch (er) { /* ignore */ } const tp2 = $('cmTip'); if (tp2) tp2.remove(); }
      else if (k === 'dup') { commit(); const d = JSON.parse(JSON.stringify(cur)); d.assets = Object.assign({}, cur.assets); d.id = uid(); d.name = cap(cur.name + ' copy', 40); d.shots.forEach(s => s.objs.forEach(o => { o.id = oid(); })); if (d.music && d.music.fileId) { const nid = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); const oldId = d.music.fileId; d.music = Object.assign({}, d.music, { fileId: nid }); mStore.get(oldId).then(r => r && mStore.put(nid, r)).catch(() => {}); } M.db.list.push(d); switchTo(d); $('cmMenu').hidden = true; }
      else if (k === 'rm') { if (!confirm('Delete "' + cur.name + '"? This cannot be undone (download the file first if you want a copy).')) return; const gone = cur.music && cur.music.fileId; M.db.list = M.db.list.filter(x => x.id !== cur.id); if (!M.db.list.length) M.db.list.push(fresh('news')); if (gone && !M.db.list.some(c => c.music && c.music.fileId === gone)) mStore.del(gone).catch(() => {}); switchTo(M.db.list[0]); $('cmMenu').hidden = true; }
      else if (k === 'file') dl(new Blob([JSON.stringify(Object.assign({ rexCutscene: 1 }, portableOf(toCustom(cur))), null, 2)], { type: 'application/json' }), slug(cur.name) + '.rexcut.json');
      else if (k === 'imp') $('cmFile').click();
      else if (k === 'musrm') { const old = cur.music.fileId; stopPrev(); cur.music = { style: 'epic', vol: cur.music.vol }; if (old && !M.db.list.some(c => c !== cur && c.music && c.music.fileId === old)) mStore.del(old).catch(() => {}); commit(); paintMovie(); }
    });
    setTimeout(() => { const f = ov.querySelector('[data-c="play"]'); f && f.focus(); }, 50);
  }
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Cutscene Maker')) COMMANDS.push({ name: 'Open Cutscene Maker', run: () => open() }); } catch (e) { /* ignore */ }
  window.RexCutscenes = { open, share, clean, loadMusic, state: () => ({ open: !!M, saved: rd().list.length }), close: () => { const o = document.querySelector('.cm-ov'); if (o) o.remove(); M = null; X = null; } };
})();
