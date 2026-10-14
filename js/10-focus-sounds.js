/* Project Rex Center V11.5.4 — Focus Sounds: calm background noise made in your browser (Web Audio). No files, no downloads,
   works offline. Nothing plays until you press a button (browsers require that), and a sleep timer can stop it for you. */
(function () {
'use strict';
const KEY = 'rex1154_sound';
const $ = id => document.getElementById(id);
const KINDS = { rain: ['🌧️', 'Rain'], brown: ['🟤', 'Brown noise'], white: ['⚪', 'White noise'], wind: ['🌬️', 'Wind'] };
const TIMERS = [[0, 'No timer'], [15, '15 min'], [30, '30 min'], [60, '1 hour']];
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { kind: KINDS[o.kind] ? o.kind : 'rain', vol: Math.min(1, Math.max(0, +o.vol >= 0 ? +o.vol : 0.4)), timer: TIMERS.some(t => t[0] === +o.timer) ? +o.timer : 0 }; } catch (e) { return { kind: 'rain', vol: 0.4, timer: 0 }; } };
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } };
const P = load();
let ctx = null, master = null, analyser = null, nodes = [], playing = false, endAt = 0, tick = null, stopTimer = null;

function buffer(kind) {
    const rate = ctx.sampleRate, len = rate * 6, b = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c); let last = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5;
        }
        // fade the loop seam so it never clicks
        const f = Math.floor(rate * 0.05); for (let i = 0; i < f; i++) { const g = i / f; d[i] *= g; d[len - 1 - i] *= g; }
    }
    return b;
}
function build(kind) {
    const src = ctx.createBufferSource(); src.buffer = buffer(kind === 'brown' ? 'brown' : 'white'); src.loop = true;
    const out = ctx.createGain(); out.gain.value = 1; const keep = [src, out];
    if (kind === 'rain') {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
        const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 7500;
        src.connect(hp); hp.connect(bp); bp.connect(out); out.gain.value = 0.55; keep.push(hp, bp);
    } else if (kind === 'wind') {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 320; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
        src.connect(lp); lp.connect(out); out.gain.value = 1.2; keep.push(lp, lfo, lg);
    } else { src.connect(out); out.gain.value = kind === 'brown' ? 0.9 : 0.35; }
    out.connect(master); src.start(); return keep;
}
function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = P.vol * P.vol;
    analyser = ctx.createAnalyser(); analyser.fftSize = 512; master.connect(analyser); analyser.connect(ctx.destination); return true;
}
async function play(kind) {
    if (kind) P.kind = kind; store();
    if (!ensure()) { try { toast('This browser cannot play Focus Sounds.', 'error'); } catch (e) { /* ignore */ } return false; }
    try { await ctx.resume(); } catch (e) { /* ignore */ }
    clear(); nodes = build(P.kind); playing = true; arm(); paint(); return true;
}
function clear() {
    nodes.forEach(n => { try { if (n.stop) n.stop(); } catch (e) { /* ignore */ } try { n.disconnect(); } catch (e) { /* ignore */ } }); nodes = [];
}
function stop() {
    clear(); playing = false; endAt = 0; clearTimeout(stopTimer); clearInterval(tick); tick = null; stopTimer = null;
    try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) { /* ignore */ }
    paint();
}
function arm() {
    clearTimeout(stopTimer); clearInterval(tick); endAt = 0;
    if (P.timer > 0 && playing) {
        endAt = Date.now() + P.timer * 60000; stopTimer = setTimeout(() => { stop(); try { toast('😴 Focus sound stopped (timer)', 'info'); } catch (e) { /* ignore */ } }, P.timer * 60000);
        tick = setInterval(paintLeft, 1000);
    }
}
function setVol(v) { P.vol = Math.min(1, Math.max(0, +v || 0)); store(); if (master) master.gain.value = P.vol * P.vol; }
function setTimer(m) { P.timer = +m || 0; store(); arm(); paint(); }
const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function paintLeft() { const e = $('fsLeft'); if (e) e.textContent = endAt ? mmss(endAt - Date.now()) + ' left' : ''; }
function paint() {
    const host = $('rexSoundCard'); if (!host) return;
    host.innerHTML = '<div class="card-title"><h3>🎧 Focus sounds</h3><span class="fs-status" id="fsStatus">' + (playing ? '▶ ' + KINDS[P.kind][1] + ' · <b id="fsLeft"></b>' : 'Off') + '</span></div>' +
        '<p class="set-note">Soft background sound made right in your browser. It never plays until you press a button.</p>' +
        '<div class="fs-kinds" role="group" aria-label="Sound">' + Object.keys(KINDS).map(k => '<button type="button" class="btn ' + (playing && P.kind === k ? 'btn-primary' : 'btn-secondary') + '" data-k="' + k + '" aria-pressed="' + (playing && P.kind === k) + '">' + KINDS[k][0] + ' ' + KINDS[k][1] + '</button>').join('') + '</div>' +
        '<div class="fs-row"><label for="fsVol">Volume</label><input id="fsVol" type="range" min="0" max="1" step="0.01" value="' + P.vol + '" aria-label="Volume"><label for="fsTimer">Stop after</label><select id="fsTimer">' + TIMERS.map(t => '<option value="' + t[0] + '"' + (t[0] === P.timer ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select><button type="button" class="btn btn-neutral" id="fsStop"' + (playing ? '' : ' disabled') + '>⏹ Stop</button></div>';
    host.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { if (playing && P.kind === b.dataset.k) stop(); else play(b.dataset.k); }; });
    $('fsVol').oninput = e => setVol(e.target.value); $('fsTimer').onchange = e => setTimer(e.target.value); $('fsStop').onclick = stop;
    paintLeft();
}
function mount() {
    const v = $('view-clock'); if (!v) return;
    let c = $('rexSoundCard'); if (!c) { c = document.createElement('div'); c.id = 'rexSoundCard'; c.className = 'card fs-card'; v.appendChild(c); }
    paint();
}
function level() { if (!analyser) return 0; const d = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(d); let s = 0; for (let i = 0; i < d.length; i++) { const x = (d[i] - 128) / 128; s += x * x; } return Math.sqrt(s / d.length); }
function boot() { try { mount(); } catch (e) { console.warn('Rex: focus sounds skipped', e); } }
window.RexSound = { play, stop, setVol, setTimer, level, toggle: () => (playing ? stop() : play()), state: () => ({ playing, kind: P.kind, vol: P.vol, timer: P.timer, ctx: ctx ? ctx.state : 'none', endAt }) };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
