/* Project Rex Center 12.16.0 - Focus Rooms (free, local, no accounts, nothing is sent anywhere).
   Pick an ambient room (rain on a window, fireplace, night sky, aurora), set a timer and settle in. The scenes are drawn live in a canvas.
   A finished session earns a few coins for Rex's Room (1 coin per 5 minutes, up to 12 a session and 40 a day) and counts toward Rex Quests.
   Sound is optional and OFF by default: it is a soft noise made in your browser, there are no audio files.
   Own data: rex1600_focus = { sessions:[{t,min,scene,full}], coins:{d,c}, scene, min, snd, run:{scene,min,startAt,endAt,left} }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-focusrooms'); if (!view) return;
  const K = 'rex1600_focus', P = window.RexPlay, MINS = [15, 25, 45, 60], DAYCAP = 40, SESSCAP = 12;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) { /* ignore */ } };
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const dayKey = (t) => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  /* ---------- saved data ---------- */
  function load() {
    let o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { /* ignore */ }
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const n = (v, d) => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : d;
    const sessions = (Array.isArray(o.sessions) ? o.sessions : []).filter(s => s && typeof s === 'object' && n(s.t, -1) >= 0 && n(s.min, -1) >= 1).slice(-300).map(s => ({ t: s.t, min: Math.min(600, Math.floor(s.min)), scene: SC[s.scene] ? s.scene : 'rain', full: !!s.full }));
    const r = o.run && typeof o.run === 'object' && SC[o.run.scene] && n(o.run.endAt, 0) > 0 && n(o.run.min, 0) >= 1 ? { scene: o.run.scene, min: Math.floor(o.run.min), startAt: n(o.run.startAt, 0), endAt: o.run.endAt, left: typeof o.run.left === 'number' && o.run.left >= 0 ? o.run.left : null } : null;
    return { sessions, coins: o.coins && typeof o.coins === 'object' ? { d: String(o.coins.d || ''), c: Math.floor(n(o.coins.c, 0)) } : { d: '', c: 0 }, scene: SC[o.scene] ? o.scene : 'rain', min: MINS.indexOf(o.min) >= 0 ? o.min : 25, snd: !!o.snd, run: r };
  }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function mut(fn) { const o = load(); fn(o); save(o); try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (e) { /* ignore */ } return o; }

  /* ---------- scenes: each one draws a frame into a 2D canvas ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SC = {
    rain: { n: 'Rain window', e: '🌧️', d: 'Rain on a dark window, with warm lights blurred behind it.',
      init(w, h, st) { st.drops = Array.from({ length: Math.round(w * h / 7000) }, () => ({ x: rnd(0, w), y: rnd(0, h), v: rnd(520, 980), l: rnd(14, 46), a: rnd(.12, .4) })); st.beads = Array.from({ length: 14 }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(2, 5), v: rnd(4, 18) })); st.bok = Array.from({ length: 7 }, (_, i) => ({ x: rnd(.05, .95) * w, y: rnd(.45, .92) * h, r: rnd(.05, .12) * Math.min(w, h), c: ['255,190,110', '255,150,90', '150,190,255'][i % 3], p: rnd(0, 6) })); },
      draw(c, w, h, t, dt, st) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b111c'); g.addColorStop(1, '#1b2a3f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        st.bok.forEach(b => { const a = .1 + .05 * Math.sin(t * .6 + b.p), r = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); r.addColorStop(0, 'rgba(' + b.c + ',' + a * 2 + ')'); r.addColorStop(1, 'rgba(' + b.c + ',0)'); c.fillStyle = r; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); });
        c.lineWidth = 1.2; st.drops.forEach(d => { d.y += d.v * dt; d.x -= d.v * dt * .08; if (d.y > h + 40) { d.y = -d.l; d.x = rnd(0, w + 80); } c.strokeStyle = 'rgba(190,210,240,' + d.a + ')'; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * .08, d.y - d.l); c.stroke(); });
        st.beads.forEach(b => { b.y += b.v * dt; if (b.y > h + 10) { b.y = -10; b.x = rnd(0, w); } c.fillStyle = 'rgba(210,225,250,.22)'; c.beginPath(); c.ellipse(b.x, b.y, b.r * .8, b.r * 1.3, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(b.x - b.r * .25, b.y - b.r * .4, b.r * .25, 0, 7); c.fill(); }); } },
    fire: { n: 'Fireplace', e: '🔥', d: 'A small fire in a dark room. Sparks drift up.',
      init(w, h, st) { st.p = []; st.acc = 0; },
      draw(c, w, h, t, dt, st) { c.fillStyle = '#0d0907'; c.fillRect(0, 0, w, h); const cx = w / 2, by = h * .78, fl = 1 + .06 * Math.sin(t * 7) + .04 * Math.sin(t * 13.3);
        const g = c.createRadialGradient(cx, by, 0, cx, by, Math.max(w, h) * .6 * fl); g.addColorStop(0, 'rgba(255,140,50,.38)'); g.addColorStop(.4, 'rgba(200,70,20,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        st.acc += dt * 110; while (st.acc >= 1 && st.p.length < 260) { st.acc--; st.p.push({ x: cx + (Math.random() + Math.random() - 1) * 46, y: by, vx: rnd(-14, 14), vy: -rnd(70, 170), life: 0, max: rnd(.8, 1.9), r: rnd(7, 17), ember: Math.random() < .12 }); } st.acc %= 1;
        c.globalCompositeOperation = 'lighter'; st.p = st.p.filter(p => { p.life += dt; if (p.life >= p.max) return false; p.x += (p.vx + Math.sin(t * 3 + p.y * .02) * 12) * dt; p.y += p.vy * dt; const k = p.life / p.max, a = (1 - k) * (p.ember ? .9 : .5), r = p.ember ? 1.6 : p.r * (1 - k * .6);
          const rg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); rg.addColorStop(0, p.ember ? 'rgba(255,220,150,' + a + ')' : (k < .4 ? 'rgba(255,215,120,' + a + ')' : 'rgba(255,90,25,' + a + ')')); rg.addColorStop(1, 'rgba(120,20,0,0)'); c.fillStyle = rg; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); return true; });
        c.globalCompositeOperation = 'source-over'; c.fillStyle = '#1a100b'; c.beginPath(); c.roundRect ? c.roundRect(cx - 90, by + 2, 180, 26, 12) : c.rect(cx - 90, by + 2, 180, 26); c.fill(); c.fillStyle = '#2a1a10'; c.beginPath(); c.roundRect ? c.roundRect(cx - 70, by - 10, 140, 22, 10) : c.rect(cx - 70, by - 10, 140, 22); c.fill(); } },
    night: { n: 'Night sky', e: '🌙', d: 'Stars, a quiet moon and the odd shooting star.',
      init(w, h, st) { st.stars = Array.from({ length: Math.round(w * h / 4200) }, () => ({ x: rnd(0, w), y: rnd(0, h * .8), r: rnd(.4, 1.5), p: rnd(0, 6), s: rnd(.6, 2.2) })); st.shoot = null; st.next = rnd(4, 9); },
      draw(c, w, h, t, dt, st) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05081a'); g.addColorStop(.7, '#121c3d'); g.addColorStop(1, '#1e2a52'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        st.stars.forEach(s => { c.fillStyle = 'rgba(255,255,255,' + (.35 + .55 * (.5 + .5 * Math.sin(t * s.s + s.p))) + ')'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); });
        const mx = w * .78, my = h * .22, mr = Math.min(w, h) * .055, mg = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,245,215,.35)'); mg.addColorStop(1, 'rgba(255,245,215,0)'); c.fillStyle = mg; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8); c.fillStyle = '#fbf3da'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
        st.next -= dt; if (st.next <= 0 && !st.shoot) { st.shoot = { x: rnd(.1, .6) * w, y: rnd(.05, .3) * h, t: 0 }; st.next = rnd(9, 16); }
        if (st.shoot) { const s = st.shoot; s.t += dt; const k = s.t / .9, x = s.x + k * w * .25, y = s.y + k * h * .18, sg = c.createLinearGradient(x, y, x - 90, y - 60); sg.addColorStop(0, 'rgba(255,255,255,' + (1 - k) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = sg; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 90, y - 60); c.stroke(); if (k >= 1) st.shoot = null; }
        [['#0a1020', .78, .05, 90], ['#070b16', .88, .035, 60]].forEach((l, i) => { c.fillStyle = l[0]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 12) c.lineTo(x, h * l[1] + Math.sin(x * l[2] / 6 + i * 2) * l[3] * .25 + Math.sin(x * .004 + i) * 18); c.lineTo(w, h); c.fill(); }); } },
    aurora: { n: 'Aurora', e: '🌌', d: 'Slow green and violet curtains of light.',
      init(w, h, st) { st.stars = Array.from({ length: Math.round(w * h / 9000) }, () => ({ x: rnd(0, w), y: rnd(0, h * .7), r: rnd(.4, 1.2), p: rnd(0, 6) })); },
      draw(c, w, h, t, dt, st) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#030712'); g.addColorStop(1, '#0a1a22'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        st.stars.forEach(s => { c.fillStyle = 'rgba(255,255,255,' + (.25 + .4 * (.5 + .5 * Math.sin(t * 1.3 + s.p))) + ')'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); });
        c.globalCompositeOperation = 'lighter'; [['80,255,170', .34, 150, .0055, .16], ['120,200,255', .42, 120, .0042, .22], ['190,120,255', .5, 100, .0065, .3]].forEach((r, i) => {
          c.beginPath(); const top = []; for (let x = 0; x <= w + 12; x += 12) top.push([x, h * r[1] + Math.sin(x * r[3] + t * .35 * (i + 1) * .6 + i * 2) * r[2] * .6 + Math.sin(x * r[3] * 2.3 - t * .2) * 26]);
          c.moveTo(top[0][0], top[0][1]); top.forEach(p => c.lineTo(p[0], p[1])); for (let k = top.length - 1; k >= 0; k--) c.lineTo(top[k][0], top[k][1] + r[2] * (1.1 + .3 * Math.sin(top[k][0] * .01 + t * .5)));
          const ag = c.createLinearGradient(0, h * (r[1] - .2), 0, h * (r[1] + .45)); ag.addColorStop(0, 'rgba(' + r[0] + ',0)'); ag.addColorStop(.3, 'rgba(' + r[0] + ',' + r[4] + ')'); ag.addColorStop(1, 'rgba(' + r[0] + ',0)'); c.fillStyle = ag; c.fill(); });
        c.globalCompositeOperation = 'source-over'; c.fillStyle = '#04080c'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 14) c.lineTo(x, h * .9 + Math.sin(x * .006) * 14 + Math.sin(x * .021) * 6); c.lineTo(w, h); c.fill(); } }
  };
  const SCENES = Object.keys(SC);
  function paintScene(canvas, id, t, frames) { const w = canvas.width, h = canvas.height, c = canvas.getContext('2d'), st = {}; SC[id].init(w, h, st); for (let i = 0; i < (frames || 1); i++) SC[id].draw(c, w, h, t + i / 30, 1 / 30, st); }

  /* ---------- optional soft sound: noise made in the browser ---------- */
  let au = null;
  function soundOn(scene) {
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; au = au || { ctx: new AC() }; if (au.src) return true;
      const ctx = au.ctx, len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { const wn = Math.random() * 2 - 1; last = scene === 'fire' || scene === 'night' ? (last + .02 * wn) / 1.02 : wn; d[i] = scene === 'fire' || scene === 'night' ? last * 3.2 : wn * .5; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = scene === 'rain' ? 'highpass' : 'lowpass'; f.frequency.value = scene === 'rain' ? 1400 : scene === 'aurora' ? 380 : 700;
      const gn = ctx.createGain(); gn.gain.value = scene === 'rain' ? .07 : .12; src.connect(f); f.connect(gn); gn.connect(ctx.destination); src.start(); au.src = src; au.gn = gn; if (ctx.state === 'suspended') ctx.resume(); return true; } catch (e) { return false; }
  }
  function soundOff() { try { if (au && au.src) { au.src.stop(); au.src.disconnect(); au.src = null; } } catch (e) { /* ignore */ } }

  /* ---------- the session overlay ---------- */
  let ov = null, raf = 0, timer = 0, run = null, st = null, lastT = 0, t0 = 0, animating = false, wake = null, title0 = '';
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };
  const left = () => run ? (run.left != null ? run.left : Math.max(0, run.endAt - Date.now())) : 0;
  function buildOv() {
    if (ov) return; ov = document.createElement('div'); ov.className = 'fr-ov'; ov.id = 'frOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Focus session');
    ov.innerHTML = '<canvas id="frCv" aria-hidden="true"></canvas><div class="fr-ui"><div class="fr-top"><span id="frName"></span><button type="button" class="fr-btn" id="frSnd" aria-pressed="false">Sound off</button></div>' +
      '<div class="fr-mid"><div class="fr-clock" id="frClock" aria-hidden="true">25:00</div><p class="fr-sub" id="frSub">One thing at a time.</p><span class="fr-sr" id="frSr" role="status" aria-live="polite"></span>' +
      '<div class="fr-ctl" id="frCtl"><button type="button" class="fr-btn fr-main" id="frPause">Pause</button><button type="button" class="fr-btn" id="frEnd">End session</button></div>' +
      '<div class="fr-box" id="frConfirm" hidden><p id="frConfirmT"></p><div class="fr-ctl"><button type="button" class="fr-btn fr-main" id="frKeep">Keep going</button><button type="button" class="fr-btn" id="frYes">End now</button></div></div>' +
      '<div class="fr-box" id="frDone" hidden><h3 id="frDoneH"></h3><p id="frDoneP"></p><div class="fr-ctl"><button type="button" class="fr-btn fr-main" id="frAgain">Another round</button><button type="button" class="fr-btn" id="frBack">Back to Rex</button></div></div></div>' +
      '<img class="fr-rex" src="icons/rex-mascot.svg" alt="" width="54" height="60"></div>';
    document.body.appendChild(ov);
    $('frPause').onclick = () => togglePause(); $('frEnd').onclick = askEnd; $('frKeep').onclick = () => { $('frConfirm').hidden = true; $('frCtl').hidden = false; if (run && run.wasRunning) togglePause(); $('frPause').focus(); };
    $('frYes').onclick = () => finish(false); $('frBack').onclick = closeOv; $('frAgain').onclick = () => { const o = load(); closeOv(true); start(o.scene, o.min); };
    $('frSnd').onclick = () => { const o = mut(x => { x.snd = !x.snd; }); applySound(o); };
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!$('frDone').hidden) closeOv(); else if ($('frConfirm').hidden) askEnd(); else $('frKeep').click(); } });
    window.addEventListener('resize', fit);
  }
  function fit() { const cv = $('frCv'); if (!cv || !ov) return; const dpr = Math.min(window.devicePixelRatio || 1, 1.5); cv.width = Math.round(window.innerWidth * dpr * .75); cv.height = Math.round(window.innerHeight * dpr * .75); cv.style.width = '100%'; cv.style.height = '100%'; if (run) { st = {}; SC[run.scene].init(cv.width, cv.height, st); if (!animating) drawFrame(0); } }
  function drawFrame(dt) { const cv = $('frCv'); if (!cv || !run) return; SC[run.scene].draw(cv.getContext('2d'), cv.width, cv.height, (Date.now() - t0) / 1000, dt, st); }
  function loop(now) { if (!animating) return; const dt = Math.min(.1, (now - lastT) / 1000 || .016); lastT = now; try { drawFrame(dt); } catch (e) { /* keep going */ } raf = requestAnimationFrame(loop); }
  function startAnim() { stopAnim(); if (reduced()) { animating = false; drawFrame(0); return; } animating = true; lastT = performance.now(); raf = requestAnimationFrame(loop); }
  function stopAnim() { animating = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function applySound(o) { const b = $('frSnd'); if (!b) return; let on = !!o.snd && !!run && run.left == null; if (on) on = soundOn(run.scene); else soundOff(); b.textContent = on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function paintClock() { if (!run) return; const l = left(); $('frClock').textContent = mmss(l); document.title = mmss(l) + ' · Focus'; const mins = Math.ceil(l / 60000); if ($('frSr') && mins !== run.lastMin) { run.lastMin = mins; $('frSr').textContent = mins > 0 ? mins + ' minutes left' : ''; } }
  function tick() { if (!run || run.left != null) return; paintClock(); if (Date.now() >= run.endAt) finish(true); }
  function persist() { if (!run) return; mut(o => { o.run = { scene: run.scene, min: run.min, startAt: run.startAt, endAt: run.endAt, left: run.left }; }); }
  function begin(sc, min, startAt, endAt, leftMs) {
    buildOv(); run = { scene: sc, min, startAt, endAt, left: leftMs, lastMin: -1 }; st = {}; t0 = Date.now(); title0 = title0 || document.title;
    ov.classList.add('show'); $('frName').textContent = SC[sc].e + ' ' + SC[sc].n + ' · ' + min + ' min'; $('frConfirm').hidden = true; $('frDone').hidden = true; $('frCtl').hidden = false; $('frPause').textContent = leftMs != null ? 'Resume' : 'Pause';
    fit(); startAnim(); paintClock(); clearInterval(timer); timer = setInterval(tick, 500); applySound(load());
    try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => null); } catch (e) { /* optional */ }
    setTimeout(() => { try { $('frPause').focus(); } catch (e) { /* ignore */ } }, 30);
  }
  function start(sc, min) { if (run) return false; sc = SC[sc] ? sc : 'rain'; min = Math.max(1, Math.min(180, Math.floor(min) || 25)); const now = Date.now(); mut(o => { o.scene = sc; if (MINS.indexOf(min) >= 0) o.min = min; }); begin(sc, min, now, now + min * 60000, null); persist(); return true; }
  function togglePause() { if (!run) return; if (run.left == null) { run.left = Math.max(0, run.endAt - Date.now()); run.wasRunning = true; $('frPause').textContent = 'Resume'; $('frSub').textContent = 'Paused. Take your time.'; soundOff(); $('frSnd').textContent = 'Sound off'; } else { run.endAt = Date.now() + run.left; run.left = null; run.wasRunning = false; $('frPause').textContent = 'Pause'; $('frSub').textContent = 'One thing at a time.'; applySound(load()); } persist(); paintClock(); }
  function askEnd() { if (!run) return; if (run.left == null) togglePause(); run.wasRunning = true; const done = Math.floor((run.min * 60000 - left()) / 60000); $('frConfirmT').textContent = done >= 5 ? 'End now? Your ' + done + ' minutes so far still count.' : 'End now? Sessions under 5 minutes are not counted.'; $('frConfirm').hidden = false; $('frCtl').hidden = true; $('frKeep').focus(); }
  function reward(min) { let got = 0; mut(o => { if (o.coins.d !== dayKey()) o.coins = { d: dayKey(), c: 0 }; got = Math.max(0, Math.min(Math.floor(min / 5), SESSCAP, DAYCAP - o.coins.c)); o.coins.c += got; }); if (got && P) { try { P.mutate(c => { c.coins += got; c.total += got; }); } catch (e) { /* ignore */ } } return got; }
  function finish(full) {
    if (!run) return; const r = run, planned = r.min, elapsedMin = full ? planned : Math.min(planned, Math.floor((planned * 60000 - left()) / 60000)); run = null; clearInterval(timer); stopAnim(); soundOff(); try { if (wake) wake.release(); } catch (e) { /* ignore */ } wake = null; document.title = title0 || document.title; title0 = '';
    mut(o => { o.run = null; }); let got = 0, counted = elapsedMin >= 5 || full;
    if (counted) { mut(o => { o.sessions.push({ t: Date.now(), min: Math.max(1, elapsedMin), scene: r.scene, full: !!full }); o.sessions = o.sessions.slice(-300); }); got = reward(elapsedMin); try { if (full) notify('Focus session complete: ' + planned + ' min', 'success', 'focus'); } catch (e) { /* ignore */ } }
    $('frConfirm').hidden = true; $('frCtl').hidden = true; $('frDone').hidden = false; $('frClock').textContent = full ? '🎉' : '👋'; const today = load().sessions.filter(s => dayKey(s.t) === dayKey()).length;
    $('frDoneH').textContent = !counted ? 'Session ended' : full ? 'Session complete' : 'Session saved'; $('frDoneP').textContent = !counted ? 'It was under 5 minutes, so it was not counted. Try again when you are ready.' : elapsedMin + ' minutes in ' + SC[r.scene].n + (got ? ', +' + got + ' 🪙' : ', no coins (daily limit reached)') + '. That is session ' + today + ' today.';
    $('frSub').textContent = ''; $('frAgain').focus(); paint(); try { if (window.RexQuests) { RexQuests.check(); } } catch (e) { /* ignore */ }
  }
  function closeOv(keep) { if (!ov) return; ov.classList.remove('show'); stopAnim(); if (run) { /* closing during a run keeps it saved */ } if (!keep) { try { $('frDone').hidden = true; } catch (e) { /* ignore */ } } document.title = title0 || document.title; paint(); }

  /* ---------- the page ---------- */
  const sum = (arr, f) => arr.reduce((a, s) => a + f(s), 0);
  function stats() {
    const o = load(), now = Date.now(), td = dayKey(), wk = []; for (let i = 6; i >= 0; i--) { const d = new Date(now - i * 864e5); wk.push({ k: dayKey(d.getTime()), l: d.toLocaleDateString(undefined, { weekday: 'narrow' }), m: 0 }); }
    o.sessions.forEach(s => { const x = wk.find(w => w.k === dayKey(s.t)); if (x) x.m += s.min; });
    const byDay = {}; o.sessions.forEach(s => { const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min; });
    return { today: byDay[td] || 0, week: sum(wk, w => w.m), total: sum(o.sessions, s => s.min), count: o.sessions.length, best: Math.max(0, ...Object.values(byDay)), wk, recent: o.sessions.slice(-5).reverse(), o };
  }
  const fmtM = m => m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? m % 60 + ' min' : '') : m + ' min';
  function build() {
    if (view.dataset.fr) return; view.dataset.fr = '1';
    view.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">FOCUS</span><h2>Focus Rooms</h2><p>Pick a room, set a timer and settle in. A finished session earns a few coins and counts toward <a href="#" data-frq>Rex Quests</a>. Sound is optional and off by default.</p></div><div class="ar-bank"><b>🪙 <span data-rexcoins>0</span></b><small id="frCoinNote"></small></div></header>' +
      '<section class="card"><div class="card-title"><h3>Choose a room</h3></div><div class="fr-grid" id="frGrid" role="radiogroup" aria-label="Room"></div>' +
      '<div class="fr-set"><div class="fr-mins" id="frMins" role="radiogroup" aria-label="Length"></div><label class="fr-snd"><input type="checkbox" id="frSndPref"> Play soft sound</label><button type="button" class="btn btn-primary" id="frStart">Start focusing</button></div><p class="ar-hint" id="frHint"></p></section>' +
      '<section class="card"><div class="card-title"><h3>Your focus</h3></div><div class="fr-stats" id="frStats"></div><div class="fr-wk" id="frWk" role="img"></div><ul class="fr-recent" id="frRecent"></ul></section>' +
      '<p class="ar-note">Coins: 1 for every 5 minutes, up to 12 a session and 40 a day. A session needs at least 5 minutes to count. Everything stays on this device.</p>';
    const grid = $('frGrid'); SCENES.forEach(id => { const b = document.createElement('button'); b.type = 'button'; b.className = 'fr-room'; b.dataset.room = id; b.setAttribute('role', 'radio'); b.innerHTML = '<canvas width="240" height="130" aria-hidden="true"></canvas><b>' + SC[id].e + ' ' + E(SC[id].n) + '</b><small>' + E(SC[id].d) + '</small>'; grid.appendChild(b); try { paintScene(b.querySelector('canvas'), id, 2, 40); } catch (e) { /* ignore */ } });
    $('frMins').innerHTML = MINS.map(m => '<button type="button" class="set-chip" role="radio" data-min="' + m + '">' + m + ' min</button>').join('');
    view.addEventListener('click', e => {
      if (e.target.closest('[data-frq]')) { e.preventDefault(); showView('quests'); return; }
      const r = e.target.closest('[data-room]'); if (r) { mut(o => { o.scene = r.dataset.room; }); paint(); return; }
      const m = e.target.closest('[data-min]'); if (m) { mut(o => { o.min = +m.dataset.min; }); paint(); return; }
      if (e.target.closest('#frStart')) start(load().scene, load().min);
    });
    $('frSndPref').addEventListener('change', e => { mut(o => { o.snd = e.target.checked; }); });
  }
  function paint() {
    build(); const s = stats(), o = s.o;
    view.querySelectorAll('[data-room]').forEach(b => { const on = b.dataset.room === o.scene; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    view.querySelectorAll('[data-min]').forEach(b => { const on = +b.dataset.min === o.min; b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    $('frSndPref').checked = !!o.snd; $('frStart').textContent = run ? 'Session running' : 'Start ' + o.min + ' minutes'; $('frStart').disabled = !!run;
    const left2 = o.coins.d === dayKey() ? Math.max(0, DAYCAP - o.coins.c) : DAYCAP; $('frCoinNote').textContent = 'Left to earn today: ' + left2; $('frHint').textContent = reduced() ? 'Reduced motion is on, so rooms are shown as still pictures.' : 'Rooms are drawn live. Press Esc during a session to end it.';
    $('frStats').innerHTML = [['Today', fmtM(s.today)], ['This week', fmtM(s.week)], ['All time', fmtM(s.total)], ['Sessions', String(s.count)], ['Best day', fmtM(s.best)]].map(x => '<div><b>' + E(x[1]) + '</b><small>' + x[0] + '</small></div>').join('');
    const mx = Math.max(30, ...s.wk.map(w => w.m)); $('frWk').setAttribute('aria-label', 'Minutes focused in the last 7 days: ' + s.wk.map(w => w.m).join(', '));
    $('frWk').innerHTML = s.wk.map(w => '<div title="' + w.m + ' min"><i style="height:' + Math.max(3, Math.round(w.m / mx * 100)) + '%"></i><span>' + E(w.l) + '</span></div>').join('');
    $('frRecent').innerHTML = s.recent.length ? s.recent.map(x => '<li>' + SC[x.scene].e + ' ' + x.min + ' min <small>' + E(new Date(x.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + (x.full ? '' : ' · ended early') + '</small></li>').join('') : '<li class="fr-none">No sessions yet. Pick a room above and start one.</li>';
    try { document.querySelectorAll('[data-rexcoins]').forEach(n => { n.textContent = P ? P.load().coins : 0; }); } catch (e) { /* ignore */ }
  }
  function resume() {
    const o = load(); if (!o.run || run) return; const r = o.run;
    if (r.left != null) begin(r.scene, r.min, r.startAt, r.endAt, r.left);
    else if (r.endAt > Date.now()) begin(r.scene, r.min, r.startAt, r.endAt, null);
    else { begin(r.scene, r.min, r.startAt, r.endAt, null); finish(true); }
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'focusrooms') paint(); } catch (e) { console.error('Focus', e); } return r; };
  try { if (typeof views === 'object') views.focusrooms = ['Focus Rooms', 'Ambient rooms with a timer']; } catch (e) { /* ignore */ }
  try { if (typeof COMMANDS !== 'undefined') { if (!COMMANDS.some(c => c.name === 'Open Focus Rooms')) COMMANDS.push({ name: 'Open Focus Rooms', run: () => showView('focusrooms') }, { name: 'Start a 25-minute focus session', run: () => start(load().scene, 25) }); } } catch (e) { /* ignore */ }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && run) { tick(); if (animating) { lastT = performance.now(); } } });
  setTimeout(() => { try { resume(); } catch (e) { console.error('Focus', e); } }, 600);
  window.RexFocus = { load, start, finish, stats, scenes: SCENES, state: () => ({ running: !!run, paused: !!run && run.left != null, animating, left: left(), scene: run && run.scene }), tick, togglePause, close: closeOv };
})();
