/* Project Rex Center V13.12.0 · Update Trailer, the cinematic cut (free, local).
   Every update gets its own trailer, made on the spot from that release's notes: a starfield warp, a title slam, an odometer version number, kinetic headlines
   that land on the beat, a stats montage and a fireworks finale. Colors, tempo and chord progression come from the version number, so no two trailers look or sound alike.
   The soundtrack is synthesized in the browser (no audio files). Sound is OFF until you tap it, so nothing ever plays out loud by surprise.
   A release can bring its own director's cut: CHANGELOG entry { trailer: { tagline, hue, scenes: [{ icon, title, sub, tag }] } }.
   Skip with Esc / Skip, pause, jump between scenes. Reduced-motion users get the still card from 26-update-trailer.js. Nothing is sent anywhere. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rex1298_trailer';
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  let C = null;

  const ICONS = [[/look|theme|color|colour|design|style|skin|neon|dark|light/i, '🎨'], [/discord|webhook|message|send|post|embed|button|broadcast/i, '💬'], [/story|season|trail|keepsake|journal|rex says|map/i, '🗺️'],
    [/clock|timer|time|session|goal|streak|pomodoro/i, '⏱️'], [/analytic|chart|graph|stat|report|insight|data/i, '📊'], [/update|install|version|download|trailer|release/i, '🚀'], [/fix|bug|crash|broken|stuck|wrong/i, '🛠️'],
    [/holiday|calendar|date|schedule/i, '📅'], [/phone|mobile|touch|tap/i, '📱'], [/sound|music|audio/i, '🎵'], [/game|bones|play|arcade/i, '🎮'], [/backup|restore|save|safe|privacy|local/i, '🛡️'], [/search|find|command|⌘/i, '🔎']];
  const TYPEI = { feature: '✨', improve: '⚡', fix: '🛠️', removed: '🧹' }, TAG = { feature: 'NEW', improve: 'IMPROVED', fix: 'FIXED', removed: 'REMOVED' };
  const iconFor = i => { for (const a of ICONS) if (a[0].test(i.text || '')) return a[1]; return TYPEI[i.type] || '✨'; };

  /* ---------- sound: tiny synth ---------- */
  function mkAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ac = new AC(), master = ac.createGain(), comp = ac.createDynamicsCompressor(); master.gain.value = 0.7; master.connect(comp); comp.connect(ac.destination);
    const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const env = (g, t, a, dur, peak) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
    const noise = (t, dur, type, f, peak) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nb; fl.type = type; fl.frequency.value = f; env(g, t, 0.002, dur, peak); s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); };
    const osc = (t, type, f0, f1, dur, peak, lp) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8); env(g, t, 0.004, dur, peak); let n = o; if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; } n.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); };
    return { ac, master,
      kick: t => { osc(t, 'sine', 160, 42, 0.38, 0.95); noise(t, 0.03, 'highpass', 4000, 0.18); },
      snare: t => { noise(t, 0.18, 'bandpass', 1900, 0.5); osc(t, 'triangle', 220, 150, 0.12, 0.3); },
      hat: (t, open) => noise(t, open ? 0.14 : 0.04, 'highpass', 7000, open ? 0.16 : 0.12),
      bass: (t, f, dur) => osc(t, 'sawtooth', f, 0, dur, 0.34, 520),
      pluck: (t, f) => osc(t, 'triangle', f, 0, 0.22, 0.16),
      pad: (t, fs, dur) => fs.forEach((f, k) => { const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (k - 1) * 9; fl.type = 'lowpass'; fl.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); }),
      boom: t => { osc(t, 'sine', 90, 34, 1.1, 1); noise(t, 0.6, 'lowpass', 600, 0.4); },
      riser: (t, dur) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nb; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(7000, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04); s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.1); },
      sweep: t => noise(t, 0.35, 'highpass', 2500, 0.22) };
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- build the script (scenes) from the release ---------- */
  function headline(t) {
    t = String(t || '').trim().replace(/\s+/g, ' ');
    let m = /^(.{4,44}?):\s+(\S.*)$/.exec(t); if (m && !/[.!?]/.test(m[1])) return [m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)];
    m = /^(.{12,120}?[.!?])\s+(\S.*)$/.exec(t); if (m) return [m[1].replace(/\.$/, ''), m[2]];
    if (t.length <= 110) return [t.replace(/\.$/, ''), '']; const cut = t.lastIndexOf(' ', 100); return [t.slice(0, cut > 50 ? cut : 100), t.slice(cut > 50 ? cut + 1 : 100)];
  }
  function plan(o) {
    const r = o.r, items = o.pk.all, dc = r.trailer && typeof r.trailer === 'object' ? r.trailer : null;
    const order = ['feature', 'improve', 'fix', 'removed'], feats = [];
    if (dc && Array.isArray(dc.scenes) && dc.scenes.length) dc.scenes.slice(0, 6).forEach(s => feats.push({ icon: String(s.icon || '✨').slice(0, 4), title: String(s.title || '').slice(0, 70), sub: String(s.sub || '').slice(0, 140), tag: String(s.tag || 'NEW').toUpperCase().slice(0, 10) }));
    else order.forEach(t => items.filter(i => i.type === t).forEach(i => { if (feats.length < 5) { const h = headline(i.text); feats.push({ icon: iconFor(i), title: h[0], sub: h[1], tag: TAG[i.type] || 'NEW' }); } }));
    const cnt = t => items.filter(i => i.type === t).length;
    return { feats, rest: Math.max(0, items.length - feats.length), counts: [['✨', cnt('feature'), 'new'], ['⚡', cnt('improve'), 'improved'], ['🛠️', cnt('fix'), 'fixed'], ['🧹', cnt('removed'), 'removed']].filter(c => c[1]), tagline: String((dc && dc.tagline) || r.summary || 'A fresh update is here.'), hue: dc && isFinite(dc.hue) ? +dc.hue : null };
  }

  function play(o) {
    if (C) return; const r = o.r, version = o.version, phone = !!o.phone, P = plan(o), R = rng(hash(version));
    const hue = P.hue != null ? P.hue : hash(version) % 360, bpm = 116 + Math.floor(R() * 15), beat = 60000 / bpm, bar = beat * 4, step = beat / 4;
    const prog = [[0, -4, -7, -2], [0, -2, -5, -7], [0, 3, -4, -2], [0, -5, -2, -4]][Math.floor(R() * 4)], root = 45 + Math.floor(R() * 5);
    const S = [];
    const add = (id, bars, inten, build) => S.push({ id, ms: Math.round(bars * bar), inten, build });
    add('open', 2, 0, () => '<div class="cx-open"><small>RUNNER OZ STUDIO</small><b>presents</b></div>');
    add('title', 2, 2, () => '<div class="cx-title"><h1 class="cx-glitch"><span style="--d:0">PROJECT</span><span style="--d:1">REX</span><span style="--d:2">CENTER</span></h1><img class="cx-rex" src="icons/rex-mascot.svg" alt="" width="120" height="134" style="--d:3"></div>');
    add('version', 2, 2, () => '<div class="cx-ver"><small>VERSION</small><div class="cx-odo" aria-label="' + E(version) + '">' + version.split('').map((ch, i) => /\d/.test(ch) ? '<span class="cx-dg" style="--n:' + ch + ';--i:' + i + '"><i>' + '0123456789'.split('').map(d => '<u>' + d + '</u>').join('') + '</i></span>' : '<span class="cx-dot">' + E(ch) + '</span>').join('') + '</div>' + (o.nm ? '<em class="cx-nm">' + E(o.nm) + '</em>' : '') + (r.date ? '<small class="cx-date">' + E(r.date) + '</small>' : '') + '</div>');
    add('tag', 2, 2, () => '<div class="cx-tag"><div class="cx-k">THE UPDATE</div><p>' + String(P.tagline).replace(/\.$/, '').split(' ').map((w, i) => '<span style="--d:' + (i * 0.5).toFixed(1) + '">' + E(w) + '</span>').join(' ') + '</p></div>');
    P.feats.forEach((f, n) => add('feat', 2, 3, () => '<div class="cx-feat v' + (n % 3) + '"><div class="cx-bignum" aria-hidden="true">' + String(n + 1).padStart(2, '0') + '</div><div class="cx-fi" aria-hidden="true">' + E(f.icon) + '</div><div class="cx-ft"><span class="cx-chip">' + E(f.tag) + ' · ' + (n + 1) + '/' + P.feats.length + '</span><h2>' + f.title.split(' ').map((w, i) => '<span style="--d:' + (i * 0.5).toFixed(1) + '">' + E(w) + '</span>').join(' ') + '</h2>' + (f.sub ? '<p>' + E(f.sub) + '</p>' : '') + '</div></div>'));
    add('stats', 1.5, 3, () => '<div class="cx-stats">' + P.counts.map((c, i) => '<div class="cx-st" style="--d:' + (i * 0.5) + '"><span aria-hidden="true">' + c[0] + '</span><b data-to="' + c[1] + '">0</b><small>' + c[2] + '</small></div>').join('') + (P.rest ? '<p class="cx-more">+ ' + P.rest + ' more in the Update Log</p>' : '') + (o.missed > 1 ? '<p class="cx-more">…and ' + (o.missed - 1) + ' earlier release' + (o.missed - 1 === 1 ? '' : 's') + ' while you were away</p>' : '') + '</div>');
    if (o.nx) add('next', 2, 2, () => '<div class="cx-next"><div class="cx-k">COMING NEXT</div><b>v' + E(o.nx.v) + '</b>' + (o.nx.name ? '<em>' + E(o.nx.name) + '</em>' : '') + (o.nx.title ? '<h3>' + E(o.nx.title) + '</h3>' : '') + (o.nx.teaser ? '<p>' + E(o.nx.teaser) + '</p>' : '') + '<small>' + E(new Date(o.nx.at).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</small></div>');
    add('end', 3, 1, () => '<div class="cx-end"><img class="cx-rex cx-hop" src="icons/rex-mascot.svg" alt="" width="104" height="116"><h2>Thanks for updating!</h2><p>Runner Oz Studio</p><div class="cx-btns"><button type="button" class="btn btn-primary" data-tr="done">Continue</button><button type="button" class="btn btn-sm" data-cx="replay">↻ Replay</button><button type="button" class="btn btn-sm" data-cx="copy">📋 Copy update note</button><button type="button" class="btn btn-sm" data-tr="off">Don\'t show again</button></div></div>');
    let acc = 0; S.forEach(s => { s.at = acc; acc += s.ms; }); const total = acc;

    /* DOM */
    const ov = document.createElement('div'); ov.className = 'cx-ov' + (phone ? ' cx-phone' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Update trailer for version ' + version);
    ov.style.setProperty('--h', hue); ov.style.setProperty('--beat', beat + 'ms');
    const sr = (r.summary ? r.summary + ' ' : '') + o.pk.all.map(i => i.text).join(' ');
    ov.innerHTML = '<canvas class="cx-cv" aria-hidden="true"></canvas><div class="cx-lb t" aria-hidden="true"></div><div class="cx-lb b" aria-hidden="true"></div><div class="cx-flash" aria-hidden="true"></div><div class="cx-stage"></div><div class="cx-sr">' + E(sr) + '</div>' +
      '<button type="button" class="cx-skip" data-tr="skip">Skip ▸</button><button type="button" class="cx-snd" data-cx="snd" aria-pressed="false">🔇 Tap for sound</button>' +
      '<div class="cx-prog" role="group" aria-label="Trailer progress">' + S.map((s, i) => '<button type="button" class="cx-seg" data-cx-go="' + i + '" aria-label="Go to part ' + (i + 1) + ' of ' + S.length + '"><i></i></button>').join('') + '</div>' +
      '<div class="cx-ctl"><button type="button" class="cx-cb" data-cx="prev" aria-label="Previous">◀</button><button type="button" class="cx-cb" data-cx="pause" aria-label="Pause">❚❚</button><button type="button" class="cx-cb" data-cx="next" aria-label="Next">▶</button></div>';
    document.body.appendChild(ov);
    C = { ov, o, S, total, t: 0, last: 0, paused: false, i: -1, raf: 0, au: null, nextStep: 0, beat, bar, step, bpm, hue, prog, root, rings: [], parts: [], stars: [], shake: 0, prev: document.activeElement, beatIdx: -1, rmv: [], R };
    const cv = ov.querySelector('.cx-cv'), g = cv.getContext('2d'), stage = ov.querySelector('.cx-stage'), flash = ov.querySelector('.cx-flash');
    const NS = phone ? 120 : 220; for (let i = 0; i < NS; i++) C.stars.push({ x: R() * 2 - 1, y: R() * 2 - 1, z: R() });
    function size() { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(ov.clientWidth * dpr); cv.height = Math.round(ov.clientHeight * dpr); cv.style.width = ov.clientWidth + 'px'; cv.style.height = ov.clientHeight + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); const onRs = () => size(); window.addEventListener('resize', onRs);
    const col = (dh, l, a) => 'hsla(' + ((hue + dh) % 360) + ',92%,' + (l || 62) + '%,' + (a == null ? 1 : a) + ')';
    const segs = () => Array.from(ov.querySelectorAll('.cx-seg'));
    const sceneAt = t => { let k = 0; S.forEach((s, n) => { if (t >= s.at) k = n; }); return k; };

    function burst(n, x, y, kind) { for (let k = 0; k < n; k++) { const a = R() * 6.283, sp = (kind === 'fw' ? 2 + R() * 4 : 1 + R() * 3.5); C.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'fw' ? 1 : 0), life: 1, d: 0.012 + R() * 0.012, h: (R() * 120) | 0, s: 1.5 + R() * 2.5, g: kind === 'fw' ? 0.05 : 0.01 }); } }
    function enter(i) {
      C.i = i; const s = S[i]; stage.innerHTML = '<div class="cx-sc cx-' + s.id + '">' + s.build() + '</div>'; ov.dataset.scene = s.id;
      ov.style.setProperty('--sh', (hue + (i % 4) * 22) % 360);
      segs().forEach((b, n) => { b.classList.toggle('done', n < i); b.classList.toggle('cur', n === i); const f = b.firstChild; f.style.backgroundSize = n < i ? '100% 100%' : '0 100%'; });
      if (s.id === 'stats') { C.cnt = Array.from(stage.querySelectorAll('[data-to]')); } else C.cnt = null;
      if (s.id === 'end') { const w = ov.clientWidth, h = ov.clientHeight; [[.25, .3], [.75, .28], [.5, .2]].forEach((p, k) => setTimeout(() => { if (C) { burst(70, w * p[0], h * p[1], 'fw'); C.shake = 5; } }, 200 + k * 380)); }
      if (s.id === 'title') C.shake = 9;
      ov.classList.toggle('cx-last', s.id === 'end'); kick(s);
    }
    const kick = s => { flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); C.rings.push({ r: 0, a: 1, big: 1 }); if (C.au && C.snd) C.au.boom(C.au.ac.currentTime + 0.01); };

    /* music: scheduled slightly ahead from the same clock the picture uses */
    function schedule() {
      if (!C || !C.au || !C.snd || C.paused) return; const au = C.au, ac = au.ac, now = liveT(), horizon = now + 160;
      while (C.nextStep * step < horizon) {
        const stp = C.nextStep, tt = stp * step; C.nextStep++; if (tt < now - 30) continue; const when = ac.currentTime + Math.max(0, (tt - now) / 1000), sc = S[sceneAt(tt)], inten = sc ? sc.inten : 0, bs = stp % 16, barN = Math.floor(stp / 16), ch = prog[barN % 4], rf = root + ch;
        if (inten >= 1 && bs === 0) au.pad(when, [mtof(rf + 12), mtof(rf + 15), mtof(rf + 19)], bar / 1000 * 1.1);
        if (inten >= 2) { if (bs % 4 === 0) au.kick(when); if (bs % 8 === 4) au.snare(when); if (bs % 2 === 0) au.hat(when, bs % 8 === 6); }
        if (inten >= 3) { if (bs % 4 === 2 || bs % 8 === 0) au.bass(when, mtof(rf - 12), step * 3 / 1000); if (bs % 2 === 1) au.pluck(when, mtof(rf + 24 + [0, 3, 7, 10][(bs >> 1) % 4])); if (bs % 4 === 3) au.hat(when, true); }
        if (inten === 0 && bs === 0 && barN % 2 === 1) au.riser(when, bar / 1000);
        if (sc && sc.id === 'end' && bs === 0 && tt === sc.at) au.sweep(when);
      }
    }
    function liveT() { return C.paused ? C.t : C.t + Math.min(100, performance.now() - C.last); }
    function seek(i) { i = Math.max(0, Math.min(S.length - 1, i)); C.t = S[i].at + 1; C.last = performance.now(); C.nextStep = Math.ceil(C.t / step); enter(i); }

    /* frame */
    function frame(ts) {
      if (!C) return; C.raf = requestAnimationFrame(frame);
      const dt = Math.min(100, ts - (C.fts || ts)); C.fts = ts; if (!C.paused) { C.t += dt; C.last = performance.now(); }
      const i = sceneAt(C.t); if (C.t >= total) C.t = total - 1; else if (i !== C.i) enter(i);
      const sc = S[C.i] || S[0], local = C.t - sc.at, w = ov.clientWidth, h = ov.clientHeight;
      const f = segs()[C.i]; if (f) f.firstChild.style.backgroundSize = Math.min(100, local / sc.ms * 100) + '% 100%';
      const b = Math.floor(C.t / beat); if (b !== C.beatIdx) { C.beatIdx = b; if (sc.inten >= 2) { C.rings.push({ r: 0, a: .7, big: 0 }); ov.style.setProperty('--pu', '1'); setTimeout(() => ov.style.setProperty('--pu', '0'), 90); } if (sc.id === 'feat' && b % 2 === 0) burst(10, w * (.2 + C.R() * .6), h * (.25 + C.R() * .4), 'p'); }
      if (C.cnt) C.cnt.forEach((el, k) => { const to = +el.dataset.to, p = Math.max(0, Math.min(1, (local - k * beat * .5) / (beat * 1.4))); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); });
      /* canvas */
      const speed = sc.id === 'title' ? 0.06 : sc.id === 'open' ? 0.012 + Math.min(.05, local / sc.ms * .05) : sc.id === 'end' ? 0.006 : 0.014 + (sc.inten * 0.004);
      const bg = g.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .45, Math.max(w, h) * .8); bg.addColorStop(0, col(0, 14, 1)); bg.addColorStop(1, col(-20, 3, 1)); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (C.shake > .2) { g.save(); g.translate((Math.random() - .5) * C.shake, (Math.random() - .5) * C.shake); C.shake *= .88; } else { C.shake = 0; g.save(); }
      const cx0 = w / 2, cy0 = h * .46, sp = speed * (dt / 16);
      C.stars.forEach(st => { const z0 = st.z; st.z -= sp; if (st.z <= 0.02) { st.x = C.R() * 2 - 1; st.y = C.R() * 2 - 1; st.z = 1; return; } const k = 1 / st.z, x = cx0 + st.x * k * w * .3, y = cy0 + st.y * k * h * .3; if (x < -50 || x > w + 50 || y < -50 || y > h + 50) { st.z = 1; return; } const a = Math.min(1, (1 - st.z) * 1.6), sz = Math.max(.6, (1 - st.z) * 2.6);
        if (speed > .03) { const k0 = 1 / Math.min(1, z0 + sp * 6); g.strokeStyle = col(st.x > 0 ? 40 : 160, 80, a * .85); g.lineWidth = sz; g.beginPath(); g.moveTo(cx0 + st.x * k0 * w * .3, cy0 + st.y * k0 * h * .3); g.lineTo(x, y); g.stroke(); } else { g.fillStyle = col(st.x > 0 ? 40 : 160, 85, a); g.fillRect(x, y, sz, sz); } });
      C.rings = C.rings.filter(rg => rg.a > .02); C.rings.forEach(rg => { rg.r += (rg.big ? 16 : 8) * (dt / 16); rg.a *= rg.big ? .955 : .93; g.strokeStyle = col(rg.big ? 30 : 0, 70, rg.a); g.lineWidth = rg.big ? 4 : 2; g.beginPath(); g.arc(cx0, cy0, rg.r, 0, 6.283); g.stroke(); });
      C.parts = C.parts.filter(p => p.life > 0); C.parts.forEach(p => { p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16); p.vy += p.g; p.life -= p.d * (dt / 16); g.fillStyle = col(p.h, 68, Math.max(0, p.life)); g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.fill(); });
      g.restore(); const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      schedule();
    }
    const sndBtn = ov.querySelector('.cx-snd');
    function setSnd(on) { C.snd = on; sndBtn.textContent = on ? '🔊 Sound on' : '🔇 Tap for sound'; sndBtn.setAttribute('aria-pressed', String(on)); const s = rd(); s.snd = on; wr(s); if (C.au) { try { on && !C.paused ? C.au.ac.resume() : C.au.ac.suspend(); } catch (e) { /* ignore */ } } }
    function startAudio() { if (C.au) return true; try { C.au = mkAudio(); } catch (e) { C.au = null; } if (!C.au) { sndBtn.hidden = true; return false; } C.nextStep = Math.ceil(liveT() / step); return true; }
    function pause(on) { C.paused = on; ov.classList.toggle('paused', on); const b = ov.querySelector('[data-cx="pause"]'); b.textContent = on ? '▶' : '❚❚'; b.setAttribute('aria-label', on ? 'Play' : 'Pause'); if (C.au && C.snd) { try { on ? C.au.ac.suspend() : C.au.ac.resume(); } catch (e) { /* ignore */ } } if (!on) { C.nextStep = Math.ceil(C.t / step); C.last = performance.now(); } }
    C.onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(C.i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(C.i - 1); } else if ((e.key === ' ' || e.code === 'Space') && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); pause(!C.paused); }
    };
    document.addEventListener('keydown', C.onKey, true);
    ov.addEventListener('click', e => {
      const go = e.target.closest && e.target.closest('[data-cx-go]'); if (go) { seek(+go.dataset.cxGo); return; }
      const bt = e.target.closest && e.target.closest('[data-cx],[data-tr]');
      if (bt) { const a = bt.dataset.cx || bt.dataset.tr;
        if (a === 'prev') seek(C.i - 1); else if (a === 'next') seek(C.i + 1); else if (a === 'pause') pause(!C.paused);
        else if (a === 'snd') { if (!startAudio()) return; setSnd(!C.snd); }
        else if (a === 'replay') { const op = C.o; stop(true); play(op); }
        else if (a === 'copy') { const t = 'Project Rex Center v' + version + (o.nm ? ' ' + o.nm : '') + (r.date ? ' (' + r.date + ')' : '') + '\n' + (r.summary || '') + '\n' + o.pk.all.map(i => '• ' + i.text).join('\n'); const ok = () => { bt.textContent = '✅ Copied'; }; try { navigator.clipboard.writeText(t).then(ok, () => { bt.textContent = 'Copy not allowed here'; }); } catch (er) { bt.textContent = 'Copy not allowed here'; } }
        else { if (a === 'off' && o.off) o.off(); stop(); }
        return; }
      if (!(e.target.closest && e.target.closest('button'))) { const x = e.clientX / innerWidth; if (x > .72) seek(C.i + 1); else if (x < .28) seek(C.i - 1); }
    });
    C.rm = () => window.removeEventListener('resize', onRs);
    document.addEventListener('visibilitychange', C.vis = () => { if (document.hidden && C && !C.paused) pause(true); });
    C.stop = stop; C.seek = seek; C.setSnd = setSnd; C.startAudio = startAudio;
    /* a manual replay came from a click, so sound may start right away if the person left it on */
    if (o.manual && rd().snd === true && startAudio()) setSnd(true);
    seek(0); C.t = 0; C.last = performance.now(); C.raf = requestAnimationFrame(frame);
    setTimeout(() => { try { const b = ov.querySelector('.cx-skip'); b && b.focus(); } catch (e) { /* ignore */ } }, 60);
    function stop(keep) {
      if (!C) return; cancelAnimationFrame(C.raf); document.removeEventListener('keydown', C.onKey, true); document.removeEventListener('visibilitychange', C.vis); C.rm();
      try { if (C.au) C.au.ac.close(); } catch (e) { /* ignore */ } ov.remove(); const f = C.prev, cb = o.onClose; C = null; try { if (!keep && f && f.focus && f.isConnected) f.focus(); } catch (e) { /* ignore */ } try { cb && cb(); } catch (e) { /* ignore */ }
    }
  }
  window.RexCinema = { play, stop: () => { if (C) C.stop(); }, open: () => !!C, state: () => C ? { scene: C.S[C.i].id, i: C.i, scenes: C.S.map(s => s.id), t: Math.round(C.t), total: C.total, paused: C.paused, bpm: C.bpm, hue: C.hue, snd: !!C.snd } : null, seek: i => { if (C) C.seek(i); }, plan };
})();
