/* Project Rex Center 13.16.0 - Link your phone (free, no account, no server, nothing is uploaded).
   Like pairing a new Apple Watch: one device shows an animated cloud with a stream of codes, the other device points its camera at it.
   - Send: your Rex data (the same sections as Settings -> Data backup) is packed, squeezed (gzip), cut into small pieces and
     shown as a looping stream of QR codes. Every piece says which piece it is, so the phone can catch them in any order.
   - Receive: the camera reads the stream, fills a progress ring, checks the whole thing (checksum), then hands it to the normal
     backup preview, where you choose what to restore. A safety copy is kept so Settings -> Data -> Undo works.
   Safety: the data only travels as light between the two screens. Everything received is validated by the same checks as a backup file.
   Libraries (bundled in js/57 and js/58, loaded only when needed): qrcode-generator (MIT), jsQR (Apache-2.0). */
(function () {
  'use strict';
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (e) { /* ignore */ } };
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const phone = () => { try { return typeof isPhoneView === 'function' ? !!isPhoneView() : innerWidth < 760; } catch (e) { return false; } };
  const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const MAXPACK = 600000, VER = (() => { try { return APP_VERSION; } catch (e) { return ''; } })();
  const SPEEDS = { easy: { fps: 4, ch: 200, name: 'Easy', d: 'Bigger, simpler codes. Best for older phones.' }, normal: { fps: 6, ch: 270, name: 'Normal', d: 'Good for most phones.' }, fast: { fps: 9, ch: 340, name: 'Fast', d: 'Quicker, denser codes. Needs a steady hand.' } };

  /* ---------- small helpers ---------- */
  const loaded = {};
  function loadScript(name, check) {
    if (check()) return Promise.resolve();
    if (loaded[name]) return loaded[name];
    return loaded[name] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/' + name + '?v=' + VER; s.onload = () => (check() ? ok() : no(new Error('lib'))); s.onerror = () => no(new Error('lib')); document.head.appendChild(s); });
  }
  const needEnc = () => loadScript('57-qr-encoder.js', () => typeof window.qrcode === 'function');
  const needDec = () => loadScript('58-qr-decoder.js', () => typeof window.jsQR === 'function');
  const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = t => { const s = atob(String(t).replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 255] ^ (c >>> 8); return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0'); }; })();
  async function pipe(u8, T, kind) { const s = new Blob([u8]).stream().pipeThrough(new T(kind)); return new Uint8Array(await new Response(s).arrayBuffer()); }
  const gzip = u8 => pipe(u8, window.CompressionStream, 'gzip'), gunzip = u8 => pipe(u8, window.DecompressionStream, 'gzip');
  const hasZ = () => typeof window.CompressionStream === 'function' && typeof window.DecompressionStream === 'function';

  /* ---------- packing and framing ---------- */
  async function pack(ids, urls) {
    const B = window.RexBackup; if (!B || !B.buildFor) throw new Error('Backup tools are not ready yet.');
    const file = B.buildFor(ids, urls); if (!file.keyCount) throw new Error('There is nothing saved in those sections yet.');
    let u8 = new TextEncoder().encode(JSON.stringify(file)), z = '0'; const raw = u8.length;
    if (hasZ()) { try { const g = await gzip(u8); if (g.length < u8.length) { u8 = g; z = '1'; } } catch (e) { /* send uncompressed */ } }
    if (u8.length > MAXPACK) throw new Error('That is a lot of data (' + kb(u8.length) + ' squeezed). Untick a section, for example restore points, and try again.');
    return { u8, z, raw, crc: CRC(u8), keys: file.keyCount };
  }
  const sidNew = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  function frames(pk, ch, sid) {
    const n = Math.max(1, Math.ceil(pk.u8.length / ch)), out = [];
    for (let i = 0; i < n; i++) out.push(['RX1', pk.z, sid, n, i, pk.crc, b64u(pk.u8.subarray(i * ch, (i + 1) * ch))].join('.'));
    return out;
  }
  function parseFrame(t) {
    const p = String(t || '').split('.'); if (p.length !== 7 || p[0] !== 'RX1') return null;
    const n = +p[3], i = +p[4]; if (!/^[01]$/.test(p[1]) || !/^[a-z0-9]{4}$/.test(p[2]) || !(n >= 1 && n <= 5000) || !(i >= 0 && i < n) || !/^[0-9a-f]{8}$/.test(p[5]) || !/^[A-Za-z0-9_-]*$/.test(p[6])) return null;
    return { z: p[1], sid: p[2], n, i, crc: p[5], data: p[6] };
  }
  function newRx() { return { sid: '', n: 0, z: '0', crc: '', parts: [], got: 0 }; }
  /* returns 'new' | 'dup' | 'reset' | 'bad' */
  function feed(rx, f) {
    if (!f) return 'bad'; let r = 'new';
    if (rx.sid !== f.sid || rx.n !== f.n || rx.crc !== f.crc) { const had = rx.got > 0; rx.sid = f.sid; rx.n = f.n; rx.z = f.z; rx.crc = f.crc; rx.parts = new Array(f.n).fill(null); rx.got = 0; if (had) r = 'reset'; }
    if (rx.parts[f.i] != null) return 'dup'; rx.parts[f.i] = f.data; rx.got++; return r;
  }
  async function finish(rx) {
    const chunks = rx.parts.map(unb64u); let len = 0; chunks.forEach(c => { len += c.length; }); let u8 = new Uint8Array(len), o = 0; chunks.forEach(c => { u8.set(c, o); o += c.length; });
    if (CRC(u8) !== rx.crc) throw new Error('The pieces did not add up (checksum mismatch). Try again, and hold the phone steady.');
    if (rx.z === '1') { if (!hasZ()) throw new Error('This browser cannot unpack the data. Update your browser and try again.'); u8 = await gunzip(u8); }
    return new TextDecoder().decode(u8);
  }

  /* ---------- drawing the QR itself ---------- */
  const qrCache = new Map();
  function qrMatrix(text) {
    let m = qrCache.get(text); if (m) return m;
    const q = window.qrcode(0, 'L'); q.addData(text); q.make(); const c = q.getModuleCount(), a = new Uint8Array(c * c);
    for (let r = 0; r < c; r++) for (let k = 0; k < c; k++) a[r * c + k] = q.isDark(r, k) ? 1 : 0;
    m = { c, a }; qrCache.set(text, m); if (qrCache.size > 40) qrCache.delete(qrCache.keys().next().value); return m;
  }
  function paintQR(g, x, y, size, m, dpr) {
    dpr = dpr || 1; const quiet = 4, cd = Math.max(1, Math.floor(size * dpr / (m.c + quiet * 2))), cell = cd / dpr, qs = cell * (m.c + quiet * 2), off = (size - qs) / 2, x0 = Math.round((x + off + cell * quiet) * dpr) / dpr, y0 = Math.round((y + off + cell * quiet) * dpr) / dpr;
    g.fillStyle = '#fff'; rrect(g, x, y, size, size, size * .045); g.fill(); g.fillStyle = '#05060c';
    for (let r = 0; r < m.c; r++) for (let k = 0; k < m.c; k++) if (m.a[r * m.c + k]) g.fillRect(x0 + k * cell, y0 + r * cell, cell, cell);
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- the swirling cloud (sender) ---------- */
  function cloud(canvas, api) {
    const g = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1); let W = 0, raf = 0, dead = false, t0 = performance.now(), lastIdx = -1, cur = null;
    const P = []; for (let i = 0; i < 150; i++) { const a = Math.random() * 6.283; P.push({ a, r: .56 + Math.random() * .3, sp: (.15 + Math.random() * .5) * (Math.random() < .5 ? 1 : -1), s: .6 + Math.random() * 1.8, h: Math.random() * 70, w: Math.random() * 6.283, ell: .78 + Math.random() * .22, tilt: Math.random() * 6.283 }); }
    const size = () => { const r = canvas.getBoundingClientRect(); W = Math.max(240, Math.round(r.width)); canvas.width = W * dpr; canvas.height = W * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(canvas);
    function draw(now) {
      if (dead) return; raf = requestAnimationFrame(draw); const st = api.state(), t = (now - t0) / 1000, still = reduced(); if (!st || !st.frames) return;
      const n = st.frames.length, idx = Math.floor(t * st.fps) % n, c = W / 2, hue = st.hue + (still ? 0 : (t * 16) % 360);
      if (idx !== lastIdx) { lastIdx = idx; cur = qrMatrix(st.frames[idx]); api.onFrame && api.onFrame(idx, n, Math.floor(t * st.fps / n)); }
      g.clearRect(0, 0, W, W);
      const card = W * .68, cx = c - card / 2;
      /* glow behind the card */
      const gl = g.createRadialGradient(c, c, card * .3, c, c, W * .52); gl.addColorStop(0, 'hsla(' + hue + ',95%,60%,.30)'); gl.addColorStop(1, 'hsla(' + hue + ',95%,60%,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, W);
      /* pulse waves */
      if (!still) for (let k = 0; k < 3; k++) { const ph = ((t * .55) + k / 3) % 1; g.strokeStyle = 'hsla(' + (hue + 40 * ph) + ',95%,65%,' + (.42 * (1 - ph)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, card * .55 + ph * W * .2, 0, 6.283); g.stroke(); }
      /* particle swirl: behind the card first */
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < P.length; i++) {
        const p = P[i], a = p.a + (still ? 0 : t * p.sp), rr = p.r * W * .5 * (1 + (still ? 0 : Math.sin(t * .9 + p.w) * .05)), x = c + Math.cos(a) * rr, y = c + Math.sin(a + p.tilt * .0) * rr * p.ell, tw = still ? .8 : .55 + .45 * Math.sin(t * 2.2 + p.w);
        g.fillStyle = 'hsla(' + (hue + p.h) + ',95%,' + (60 + tw * 15) + '%,' + (.18 + .5 * tw) + ')'; g.beginPath(); g.arc(x, y, p.s * (1 + tw * .6), 0, 6.283); g.fill();
        if (!still && p.s > 1.8) { g.fillStyle = 'hsla(' + (hue + p.h) + ',95%,70%,.08)'; g.beginPath(); g.arc(x, y, p.s * 3.4, 0, 6.283); g.fill(); }
      }
      g.globalCompositeOperation = 'source-over';
      /* progress ring of ticks */
      const T = 60, rad = W * .485, pr = (idx + 1) / n;
      for (let i = 0; i < T; i++) { const a = -Math.PI / 2 + i / T * 6.283, on = i / T <= pr, lead = Math.abs(i / T - pr) < 1.2 / T; g.strokeStyle = on ? 'hsla(' + (hue + i * .8) + ',95%,' + (lead ? 85 : 62) + '%,' + (lead ? 1 : .85) + ')' : 'rgba(255,255,255,.14)'; g.lineWidth = lead ? 4 : 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(c + Math.cos(a) * (rad - 7), c + Math.sin(a) * (rad - 7)); g.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad); g.stroke(); }
      /* the code */
      g.save(); g.shadowColor = 'hsla(' + hue + ',95%,60%,.55)'; g.shadowBlur = 24; if (cur) paintQR(g, cx, cx, card, cur, dpr); g.restore();
      /* corner brackets that breathe */
      const br = card * .14, gap = 10 + (still ? 0 : Math.sin(t * 3) * 3); g.strokeStyle = 'hsl(' + hue + ',95%,68%)'; g.lineWidth = 4; g.lineCap = 'round';
      [[cx - gap, cx - gap, 1, 1], [cx + card + gap, cx - gap, -1, 1], [cx - gap, cx + card + gap, 1, -1], [cx + card + gap, cx + card + gap, -1, -1]].forEach(q => { g.beginPath(); g.moveTo(q[0] + q[2] * br, q[1]); g.lineTo(q[0], q[1]); g.lineTo(q[0], q[1] + q[3] * br); g.stroke(); });
    }
    raf = requestAnimationFrame(draw);
    return { stop() { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); }, restart() { t0 = performance.now(); lastIdx = -1; } };
  }

  /* ---------- confetti / sparks (both sides) ---------- */
  function burst(canvas, hue, big) {
    if (!canvas || reduced()) return; const g = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect(); canvas.width = r.width * dpr; canvas.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const N = big ? 140 : 24, P = []; for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, v = (big ? 3 : 1.5) + Math.random() * (big ? 9 : 4); P.push({ x: r.width / 2, y: r.height * (big ? .45 : .5), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (big ? 4 : 0), s: 3 + Math.random() * 5, h: hue + Math.random() * 160 - 40, l: 1, rot: Math.random() * 6, vr: (Math.random() - .5) * .4 }); }
    let f = 0; (function step() { g.clearRect(0, 0, r.width, r.height); let alive = false; P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += big ? .22 : .05; p.vx *= .985; p.l -= big ? .009 : .03; p.rot += p.vr; if (p.l > 0) { alive = true; g.save(); g.globalAlpha = Math.max(0, p.l); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = 'hsl(' + p.h + ',92%,62%)'; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); } }); if (alive && f++ < 240) requestAnimationFrame(step); else g.clearRect(0, 0, r.width, r.height); })();
  }

  /* ---------- the window ---------- */
  let OV = null, CLEAN = [];
  const clean = () => { CLEAN.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); CLEAN = []; };
  function shell(inner, cls) {
    if (!OV) {
      OV = document.createElement('div'); OV.className = 'lk-ov'; OV.setAttribute('role', 'dialog'); OV.setAttribute('aria-modal', 'true'); OV.setAttribute('aria-label', 'Link your phone');
      OV.addEventListener('click', e => { if (e.target === OV) close(); const a = e.target.closest('[data-lk]'); if (a) act(a.dataset.lk, a); });
      OV.addEventListener('change', e => { if (e.target.closest('[data-lkopt]')) sendPick(true); });
      document.body.appendChild(OV); document.addEventListener('keydown', onKey, true); document.body.classList.add('lk-open');
    }
    OV.className = 'lk-ov ' + (cls || ''); OV.innerHTML = inner; const f = OV.querySelector('[data-lkfocus]'); if (f) setTimeout(() => f.focus(), 40);
  }
  function onKey(e) { if (OV && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
  function close() { clean(); stopCam(); if (wake) { try { wake.release(); } catch (e) { /* ignore */ } wake = null; } if (OV) { OV.remove(); OV = null; document.removeEventListener('keydown', onKey, true); document.body.classList.remove('lk-open'); } }
  let wake = null; const keepAwake = () => { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (e) { /* ignore */ } };
  const hueNow = () => 215;

  function home() {
    clean(); stopCam(); const p = phone();
    shell('<div class="lk-card lk-home"><button type="button" class="lk-x" data-lk="close" aria-label="Close">✕</button>' +
      '<div class="lk-hero" aria-hidden="true"><span class="lk-dev lk-pc">🖥️</span><span class="lk-beam"><i></i><i></i><i></i><i></i><i></i></span><span class="lk-dev lk-ph">📱</span></div>' +
      '<h2>Link your phone</h2><p class="lk-sub">Move your Rex stuff from one device to another. Like setting up a new Apple Watch: one screen shows a glowing cloud, the other points its camera at it. <b>Free. No account. Nothing is uploaded.</b></p>' +
      '<div class="lk-two"><button type="button" class="lk-big' + (p ? '' : ' rec') + '" data-lk="send" data-lkfocus><span>🖥️</span><b>Send from this device</b><small>Show the cloud. Use this on the device that has your stuff.</small>' + (p ? '' : '<em>Most likely</em>') + '</button>' +
      '<button type="button" class="lk-big' + (p ? ' rec' : '') + '" data-lk="recv"><span>📷</span><b>Receive on this device</b><small>Open the camera and point it at the other screen.</small>' + (p ? '<em>Most likely</em>' : '') + '</button></div>' +
      '<p class="lk-note">No camera or no luck? Use Settings → Data → backup file instead. Receiving always shows a preview first, and keeps a safety copy so you can undo.</p></div>');
  }

  /* ----- send ----- */
  let SD = null;
  function sendPick(keep) {
    const B = window.RexBackup; if (!B) { say('Backup tools are not ready yet. Try again in a moment.', 'warn'); return; }
    const labels = B.labels(), sec = B.sections(); let prev = null;
    if (keep && OV) prev = { ids: [].slice.call(OV.querySelectorAll('[data-lkopt="sec"]:checked')).map(i => i.value), urls: !!(OV.querySelector('[data-lkopt="urls"]') || {}).checked, speed: (OV.querySelector('[data-lkopt="speed"]:checked') || {}).value };
    clean(); const ids = prev ? prev.ids : labels.filter(l => !l.optional && sec[l.id] && sec[l.id].keys.length).map(l => l.id), urls = prev ? prev.urls : true, speed = prev && prev.speed ? prev.speed : 'normal';
    shell('<div class="lk-card"><button type="button" class="lk-x" data-lk="close" aria-label="Close">✕</button><button type="button" class="lk-back" data-lk="home">← Back</button><h2>What should go to the phone?</h2>' +
      '<div class="lk-secs">' + labels.filter(l => sec[l.id] && sec[l.id].keys.length).map(l => '<label class="lk-row"><input type="checkbox" data-lkopt="sec" value="' + l.id + '"' + (ids.indexOf(l.id) >= 0 ? ' checked' : '') + '><span class="lk-i">' + l.icon + '</span><span class="lk-t"><b>' + E(l.label) + '</b><small>' + sec[l.id].keys.length + ' item' + (sec[l.id].keys.length === 1 ? '' : 's') + ' · ' + kb(sec[l.id].bytes) + '</small></span></label>').join('') + '</div>' +
      '<label class="lk-row lk-warn"><input type="checkbox" data-lkopt="urls"' + (urls ? ' checked' : '') + '><span class="lk-i">🔑</span><span class="lk-t"><b>Include my webhook links</b><small>Webhook links are secrets. They are only shown as codes on this screen, so make sure only your own phone is looking.</small></span></label>' +
      '<div class="lk-speed" role="radiogroup" aria-label="Speed">' + Object.keys(SPEEDS).map(k => '<label><input type="radio" name="lkspd" data-lkopt="speed" value="' + k + '"' + (speed === k ? ' checked' : '') + '><span><b>' + SPEEDS[k].name + '</b><small>' + SPEEDS[k].d + '</small></span></label>').join('') + '</div>' +
      '<p class="lk-est" id="lkEst" role="status">Working out the size…</p><div class="lk-row2"><button type="button" class="btn btn-primary lk-go" data-lk="beam" data-lkfocus disabled>✨ Start the cloud</button></div></div>');
    estimate();
  }
  let estTok = 0;
  async function estimate() {
    const tok = ++estTok, ids = [].slice.call(OV.querySelectorAll('[data-lkopt="sec"]:checked')).map(i => i.value), urls = OV.querySelector('[data-lkopt="urls"]').checked, sp = SPEEDS[(OV.querySelector('[data-lkopt="speed"]:checked') || {}).value || 'normal'], go = OV.querySelector('.lk-go'), est = OV.querySelector('#lkEst');
    go.disabled = true; if (!ids.length) { est.textContent = 'Tick at least one thing to send.'; return; }
    try { const pk = await pack(ids, urls); if (tok !== estTok || !OV) return; const n = Math.ceil(pk.u8.length / sp.ch), sec = Math.ceil(n / sp.fps); SD = { pk, ids, urls, speed: sp, n }; est.innerHTML = '<b>' + kb(pk.raw) + '</b> squeezed to <b>' + kb(pk.u8.length) + '</b> · <b>' + n + '</b> codes · about <b>' + (sec < 90 ? sec + (sec === 1 ? ' second' : ' seconds') : Math.round(sec / 6) / 10 + ' minutes') + '</b> for one round' + (sec > 90 ? '. That is long: untick the big sections for a faster link.' : '.'); go.disabled = false; }
    catch (e) { if (tok === estTok && OV) est.textContent = e.message || 'Could not pack your data.'; }
  }
  async function beam() {
    if (!SD) return; const sd = SD; try { await needEnc(); } catch (e) { say('Could not load the code maker.', 'error'); return; }
    clean(); keepAwake(); const sid = sidNew(), fr = frames(sd.pk, sd.speed.ch, sid), hue = hueNow();
    shell('<div class="lk-card lk-beam-card"><button type="button" class="lk-x" data-lk="close" aria-label="Close">✕</button><h2>Point your phone at this</h2>' +
      '<ol class="lk-steps"><li>On the phone open Rex (same website) → <b>Link your phone</b> → <b>Receive</b></li><li>Aim the camera at the glowing code</li><li>Watch the ring fill up</li></ol>' +
      '<div class="lk-stage"><canvas id="lkCloud" aria-label="Animated stream of codes for your phone to scan"></canvas><canvas id="lkBurstS" class="lk-burst" aria-hidden="true"></canvas><img class="lk-rex" src="icons/rex-mascot.svg" alt="" width="64" height="70"></div>' +
      '<p class="lk-live" id="lkLive" role="status">Code 1 of ' + fr.length + ' · round 1</p><div class="lk-row2"><button type="button" class="btn" data-lk="send">⚙️ Change what is sent</button><button type="button" class="btn btn-primary" data-lk="gotit" data-lkfocus>✅ My phone got it</button></div>' +
      '<p class="lk-note">Keep this screen bright and the phone about a hand-span away. If the phone misses a piece, it just waits for it to come around again.</p></div>', 'lk-beaming');
    const live = OV.querySelector('#lkLive'); const c = cloud(OV.querySelector('#lkCloud'), { state: () => ({ frames: fr, fps: sd.speed.fps, hue }), onFrame: (i, n, round) => { live.textContent = 'Code ' + (i + 1) + ' of ' + n + ' · round ' + (round + 1); } }); CLEAN.push(() => c.stop());
    SD.cloud = c;
  }

  /* ----- receive ----- */
  let CAM = null;
  function stopCam() { if (CAM) { CAM.dead = true; clearTimeout(CAM.tm); try { CAM.stream && CAM.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ } CAM = null; } }
  async function recv() {
    clean(); stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { notice('📷', 'The camera is not available here', 'This needs a secure page (https) and a browser that lets sites use the camera. Rex on GitHub Pages is secure. If you opened the file straight from your computer, open the website instead. You can always use Settings → Data → backup file.'); return; }
    shell('<div class="lk-cam"><video id="lkVid" playsinline muted autoplay></video><div class="lk-shade"></div><div class="lk-vf" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="lk-scan"></b></div><canvas id="lkBurstR" class="lk-burst" aria-hidden="true"></canvas>' +
      '<button type="button" class="lk-x lk-xcam" data-lk="close" aria-label="Close">✕</button><div class="lk-hud"><p class="lk-hint" id="lkHint" role="status">Starting the camera…</p><div class="lk-pills" id="lkPills" aria-hidden="true"></div><p class="lk-cnt" id="lkCnt">&nbsp;</p></div></div>', 'lk-camov');
    let stream; try { await needDec(); } catch (e) { notice('⚠️', 'Could not load the code reader', 'Try again, or use the backup file in Settings → Data.'); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
    catch (e) { notice('🚫', e && e.name === 'NotAllowedError' ? 'Camera is blocked' : 'No camera found', e && e.name === 'NotAllowedError' ? 'Allow the camera for this site in your browser settings, then try again. Nothing is recorded or uploaded; the camera is only used to read the codes.' : 'This device has no camera Rex can use. Use Settings → Data → backup file instead.'); return; }
    const vid = OV && OV.querySelector('#lkVid'); if (!vid) { stream.getTracks().forEach(t => t.stop()); return; }
    vid.srcObject = stream; try { await vid.play(); } catch (e) { /* autoplay */ } keepAwake();
    const rx = newRx(), cv = document.createElement('canvas'), cg = cv.getContext('2d', { willReadFrequently: true }); let det = null; try { if (window.BarcodeDetector) det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; }
    CAM = { stream, dead: false, tm: 0, rx, done: false }; const me = CAM, hint = OV.querySelector('#lkHint'), pills = OV.querySelector('#lkPills'), cnt = OV.querySelector('#lkCnt'), hue = hueNow(); let lastSeen = 0, miss = 0;
    const paintPills = () => { const N = Math.min(60, rx.n || 0); if (!N) { pills.innerHTML = ''; return; } if (pills.children.length !== N) pills.innerHTML = '<i></i>'.repeat(N); for (let j = 0; j < N; j++) { const a = Math.floor(j * rx.n / N), b = Math.max(a + 1, Math.floor((j + 1) * rx.n / N)); let all = true; for (let q = a; q < b; q++) if (rx.parts[q] == null) { all = false; break; } pills.children[j].className = all ? 'on' : ''; } cnt.textContent = rx.got + ' of ' + rx.n + ' pieces · ' + Math.round(rx.got * 100 / rx.n) + '%'; };
    async function tick() {
      if (me.dead || me.done) return; let text = '';
      try {
        if (vid.readyState >= 2 && vid.videoWidth) {
          if (det) { try { const r = await det.detect(vid); if (r && r[0]) text = r[0].rawValue || ''; } catch (e) { det = null; } }
          if (!text) { const sc = Math.min(1, 960 / Math.max(vid.videoWidth, vid.videoHeight)), w = Math.round(vid.videoWidth * sc), h = Math.round(vid.videoHeight * sc); if (cv.width !== w) { cv.width = w; cv.height = h; } cg.drawImage(vid, 0, 0, w, h); const im = cg.getImageData(0, 0, w, h), q = window.jsQR(im.data, w, h, { inversionAttempts: 'dontInvert' }); if (q) text = q.data; }
        }
      } catch (e) { /* keep trying */ }
      const f = parseFrame(text), now = Date.now();
      if (f) { miss = 0; lastSeen = now; const r = feed(rx, f); if (r === 'new' || r === 'reset') { burst(OV && OV.querySelector('#lkBurstR'), hue, false); paintPills(); if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* ignore */ } } if (OV) OV.classList.add('lk-lock'); hint.textContent = rx.got < rx.n ? 'Got it! Keep pointing at the cloud…' : 'All pieces caught!'; }
        if (rx.n && rx.got === rx.n) { me.done = true; return complete(rx); } }
      else if (OV) { miss++; if (now - lastSeen > 1500) { if (OV) OV.classList.remove('lk-lock'); hint.textContent = rx.got ? 'Lost the code. Aim at the cloud again.' : 'Aim the camera at the glowing code on the other screen.'; } }
      me.tm = setTimeout(tick, 60);
    }
    hint.textContent = 'Aim the camera at the glowing code on the other screen.'; tick();
    CLEAN.push(() => { me.dead = true; });
    window.__lkRx = rx;
  }
  async function complete(rx) {
    const burstEl = OV && OV.querySelector('#lkBurstR'); stopCam();
    if (OV) { OV.classList.add('lk-done'); OV.querySelector('.lk-hint').textContent = 'Checking everything…'; }
    let text; try { text = await finish(rx); } catch (e) { notice('⚠️', 'That did not work', e.message || 'The data could not be read.', true); return; }
    if (navigator.vibrate) { try { navigator.vibrate([40, 40, 80]); } catch (e) { /* ignore */ } }
    if (OV) { OV.innerHTML = '<div class="lk-card lk-ok"><canvas id="lkBurstR" class="lk-burst" aria-hidden="true"></canvas><svg class="lk-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h2>It all arrived!</h2><p class="lk-sub">' + kb(text.length) + ' of your Rex stuff came across. Next you will see a preview and choose what to restore.</p><div class="lk-row2"><button type="button" class="btn btn-primary" data-lk="review" data-lkfocus>See what came across</button></div></div>'; burst(OV.querySelector('#lkBurstR'), hueNow(), true); }
    void burstEl; RX_TEXT = text;
  }
  let RX_TEXT = '';
  function notice(ico, title, msg, retry) {
    clean(); stopCam(); shell('<div class="lk-card lk-msg"><button type="button" class="lk-x" data-lk="close" aria-label="Close">✕</button><div class="lk-big-ico">' + ico + '</div><h2>' + E(title) + '</h2><p class="lk-sub">' + E(msg) + '</p><div class="lk-row2">' + (retry ? '<button type="button" class="btn btn-primary" data-lk="recv" data-lkfocus>Try again</button>' : '') + '<button type="button" class="btn" data-lk="home">Back</button></div></div>');
  }
  function act(k) {
    if (k === 'close') close(); else if (k === 'home') home(); else if (k === 'send') sendPick(false); else if (k === 'recv') recv(); else if (k === 'beam') beam();
    else if (k === 'gotit') { const el = OV && OV.querySelector('#lkBurstS'); burst(el, hueNow(), true); setTimeout(close, reduced() ? 100 : 1300); say('Nice! Your phone is linked ✓', 'success'); }
    else if (k === 'review') { const t = RX_TEXT; RX_TEXT = ''; close(); if (window.RexBackup && RexBackup.preview) RexBackup.preview(t, 'From your other device'); }
  }
  function open(mode) { if (OV) close(); if (mode === 'send') sendPick(false); else if (mode === 'receive') recv(); else home(); }

  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Link your phone')) COMMANDS.push({ name: 'Link your phone', run: () => open() }); } catch (e) { /* ignore */ }
  window.RexLink = { open, close, state: () => ({ open: !!OV }), _t: { pack, frames, parseFrame, newRx, feed, finish, qrMatrix, paintQR, needEnc, needDec, CRC } };
})();
