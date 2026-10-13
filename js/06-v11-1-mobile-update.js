/* Project Rex Center V11.5.0 — phone drawer + tab bar, Settings section tabs, and the full-screen progress screen.
   (The update engine and Update Center now live in 07-update-center.js.) Uses globals from 01-main.js. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const say = (m, t) => { try { toast(m, t || 'info'); } catch (e) { /* ignore */ } };
const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const isPhone = () => window.matchMedia('(max-width: 820px)').matches;

/* ---------- drawer + tab bar ---------- */
function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }
function go(view) { closeDrawer(); showView(view); }
function syncTabbar() {
    const active = document.querySelector('.nav-item.active');
    const v = active ? active.dataset.view : '';
    const tabs = document.querySelectorAll('#rexTabbar button');
    let hit = false;
    tabs.forEach(b => { const on = b.dataset.view === v; if (on) hit = true; b.classList.toggle('active', on); });
    const more = document.querySelector('#rexTabbar button[data-view="__more"]');
    if (more && !hit) more.classList.add('active');
}
function initNav() {
    const sb = $('rexSidebar'); if (!sb) return;
    sb.addEventListener('click', e => { if (e.target.closest('.nav-item') && isPhone()) closeDrawer(); });
    new MutationObserver(() => { syncTabbar(); if (window.RexUpd) RexUpd.paintDot(); if (isPhone()) window.scrollTo(0, 0); }).observe(sb, { subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    window.matchMedia('(min-width: 821px)').addEventListener('change', e => { if (e.matches) closeDrawer(); });
    syncTabbar();
}

/* ---------- Settings sections ---------- */
const SET_SECTIONS = ['appearance', 'general', 'alerts', 'weather', 'data', 'app'];
function settingsTab(sec) {
    const view = $('view-settings'); if (!view) return;
    if (!SET_SECTIONS.includes(sec)) sec = 'appearance';
    const q = $('setSearch') ? $('setSearch').value.trim() : '';
    if (q) { const s = $('setSearch'); s.value = ''; if (window.RexUpd) RexUpd.settingsSearch(''); }
    view.querySelectorAll(':scope > .card[data-sec]').forEach(c => { c.style.display = c.dataset.sec === sec ? '' : 'none'; });
    document.querySelectorAll('#setNav .set-chip').forEach(b => {
        const on = b.dataset.sec === sec; b.classList.toggle('active', on);
        if (on) { try { b.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ignore */ } }
    });
    lsSet('rex111_settings_tab', sec);
    if (window.RexUpd) RexUpd.renderSettingsUpdates();
}

/* ---------- the full-screen Apple-style screen ---------- */
function overlay() {
    let o = $('rexUpdOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'rexUpdOverlay'; o.className = 'upd-overlay'; document.body.appendChild(o); }
    return o;
}
const STAGES = [[0, 'Preparing…'], [6, 'Downloading new files…'], [30, 'Verifying files…'], [50, 'Installing…'], [72, 'Optimizing…'], [88, 'Cleaning up…'], [95, 'Finishing up…']];
const TIPS = [
    '💡 Press Ctrl/⌘ + K anywhere to jump to any page.',
    '🛡️ Rex Backup saves your data every day. Download a file now and then for a real safety copy.',
    '🎉 Tap ☆ on a holiday to add it to your favorites.',
    '⏱ Pomodoro mode on the Dev Clock page keeps you focused.',
    '📲 Add Rex to your home screen to open it like a real app.',
    '🏆 Achievements unlock from what you really do in Rex.',
    '↩️ If an update ever breaks something, Settings → App & Updates → Go back.',
    '📡 Webhook URLs stay in your browser. They are never uploaded anywhere.'
];
const CHECKS = [[0, 'Preparing'], [6, 'Downloading new files'], [30, 'Verifying files'], [50, 'Installing'], [72, 'Optimizing'], [88, 'Cleaning up'], [95, 'Finishing up']];
let screenTimers = [], screenCards = [];
function buildApple(o, title) {
    o.className = 'upd-overlay apple show';
    const checks = CHECKS.map((c, i) => '<li data-i="' + i + '"><span class="ck"></span>' + c[1] + '</li>').join('');
    o.innerHTML = '<div class="ap-aurora"><i></i><i></i><i></i></div>' +
        '<div class="ap-wrap">' +
        '<div class="ap-ringbox"><svg class="ap-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="ap-ring-bg"/><circle cx="60" cy="60" r="54" class="ap-ring-fg" id="apRing"/></svg>' +
        '<img class="ap-logo" src="icons/icon-192.png" alt="" draggable="false"><div class="ap-pct" id="apPct">0%</div></div>' +
        '<div class="ap-title">' + esc2(title) + '</div>' +
        '<div class="ap-bar"><i id="apFill"></i></div>' +
        '<div class="ap-stage" id="apStage">Preparing…</div>' +
        '<div class="ap-eta" id="apEta">Estimating time remaining…</div>' +
        '<div class="ap-times"><span id="apNow"></span><span id="apEnd"></span></div>' +
        '<ul class="ap-checks" id="apChecks">' + checks + '</ul>' +
        '<div class="ap-card" id="apCard"><div class="ap-card-k" id="apCardK"></div><div class="ap-card-t" id="apCardT"></div></div>' +
        '<div class="ap-game"><div class="ap-game-bar"><span>🦴 Catch the bones while you wait</span><b>Score <i id="apScore">0</i> · Best <i id="apBest">0</i></b></div><div class="ap-arena" id="apArena"></div></div>' +
        '</div><div class="ap-foot">Keep this page open. Your data is safe.</div>';
    startExtras(title);
}
function startExtras(title) {
    screenTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); screenTimers = [];
    // rotating card: what's new first, then tips
    const items = screenCards.slice(); if (!items.length) items.push(['✨ PROJECT REX', 'Getting things ready.']);
    TIPS.forEach(t => items.push(['TIP', t]));
    let i = 0;
    const card = $('apCard'), k = $('apCardK'), t = $('apCardT');
    const show = () => { if (!card) return; card.classList.remove('in'); setTimeout(() => { const it = items[i % items.length]; k.textContent = it[0]; t.textContent = it[1]; card.classList.add('in'); i++; }, 350); };
    show(); screenTimers.push(setInterval(show, 6500));
    // mini game: tap the bones
    const arena = $('apArena'); if (!arena) return;
    let score = 0, best = parseInt(lsGet('rex111_bones_best') || '0', 10) || 0;
    $('apBest').textContent = best;
    const spawn = () => {
        if (!arena.isConnected) return;
        const e = document.createElement('button');
        const lucky = Math.random() < 0.12;
        e.className = 'ap-bone' + (lucky ? ' gold' : ''); e.textContent = lucky ? '🌟' : '🦴';
        e.style.left = (6 + Math.random() * 82) + '%'; e.style.animationDuration = (3.2 + Math.random() * 2) + 's';
        const hit = ev => {
            ev.preventDefault(); if (e.dataset.hit) return; e.dataset.hit = 1;
            score += lucky ? 5 : 1; $('apScore').textContent = score;
            if (score > best) { best = score; $('apBest').textContent = best; lsSet('rex111_bones_best', String(best)); }
            e.classList.add('pop'); setTimeout(() => e.remove(), 220);
        };
        e.addEventListener('pointerdown', hit);
        e.addEventListener('animationend', () => e.remove());
        arena.appendChild(e);
        while (arena.children.length > 14) arena.firstChild.remove();
    };
    screenTimers.push(setInterval(spawn, 650)); spawn();
}
function stopExtras() { screenTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); screenTimers = []; }

let busy = false;
/* runScreen(): shows the full-screen progress screen while work() really runs.
   o2 = { title, ms (minimum length), work(progress) , cards:[[kicker,text]], doneText, after(secs), reload:true }
   Resolves { ok:true } after a successful run (and reloads), or { ok:false, error } when work() throws. The screen stays up on failure
   with a Close button, and NOTHING is reloaded or switched. */
async function runScreen(o2) {
    if (busy) return { ok: false, error: 'Another update screen is already open.' }; busy = true;
    closeDrawer();
    let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    screenCards = o2.cards || [];
    const o = overlay(); buildApple(o, o2.title);
    const t0 = Date.now(), endAt = t0 + o2.ms; let real = 0, finished = false, failed = false;
    const fill = $('apFill'), stage = $('apStage'), eta = $('apEta'), now = $('apNow'), end = $('apEnd');
    end.textContent = 'Done around ' + clock(endAt);
    (function frame() {
        if (failed) return;
        const timePct = Math.min(100, (Date.now() - t0) / o2.ms * 100);
        const pct = finished ? timePct : Math.min(timePct, Math.max(real * 100, 4) + 4);
        fill.style.width = pct.toFixed(1) + '%';
        let label = STAGES[0][1]; STAGES.forEach(st => { if (pct >= st[0]) label = st[1]; });
        stage.textContent = label;
        const ring = $('apRing'), pc = $('apPct');
        if (ring) ring.style.strokeDashoffset = (339.3 * (1 - pct / 100)).toFixed(1);
        if (pc) pc.textContent = Math.floor(pct) + '%';
        document.querySelectorAll('#apChecks li').forEach(li => { const idx = +li.dataset.i, at = CHECKS[idx][0], nx = CHECKS[idx + 1] ? CHECKS[idx + 1][0] : 101; li.className = pct >= nx ? 'done' : pct >= at ? 'now' : ''; });
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        eta.textContent = left > 90 ? 'About ' + Math.ceil(left / 60) + ' minutes remaining' : left > 60 ? 'About 1 minute 30 seconds remaining' : left > 1 ? 'About ' + left + ' seconds remaining' : 'Almost done';
        now.textContent = clock(Date.now());
        if (!finished || pct < 100) requestAnimationFrame(frame);
    })();
    let err = null;
    try { await o2.work(f => { real = f; }); } catch (e) { err = e; }
    if (err) {
        failed = true; stopExtras(); busy = false;
        try { if (wake) wake.release(); } catch (e) { /* ignore */ }
        const msg = (err && err.message) || String(err);
        o.className = 'upd-overlay show';
        o.innerHTML = '<div class="upd-box"><div class="upd-spin">⚠️</div><h3>' + esc2(o2.failTitle || 'Update did not finish') + '</h3><p>' + esc2(msg) + '</p><p class="upd-safe">Nothing was changed. You are still on v' + esc2(APP_VERSION) + ' and your data is untouched.</p><button class="btn btn-primary" style="width:100%;margin-top:14px" id="rexUpdFailClose">Close</button></div>';
        const c = $('rexUpdFailClose'); if (c) c.onclick = () => { o.classList.remove('show'); o.className = 'upd-overlay'; };
        return { ok: false, error: msg };
    }
    real = 1; finished = true;
    const wait = endAt - Date.now(); if (wait > 0) await sleep(wait);
    fill.style.width = '100%'; const rg = $('apRing'); if (rg) rg.style.strokeDashoffset = 0; const pc2 = $('apPct'); if (pc2) pc2.textContent = '100%'; document.querySelectorAll('#apChecks li').forEach(li => { li.className = 'done'; }); stopExtras(); stage.textContent = o2.doneText || 'Update complete'; eta.textContent = 'Restarting…'; end.textContent = 'Finished ' + clock(Date.now());
    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    if (o2.after) o2.after(secs);
    await sleep(1500);
    o.classList.add('fade'); await sleep(500);
    try { if (wake) wake.release(); } catch (e) { /* ignore */ }
    busy = false;
    location.reload();
    return { ok: true };
}

function overlayEl() { return overlay(); }
const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function boot() {
    try { initNav(); } catch (e) { console.warn('Rex: nav setup skipped', e); }
    try { settingsTab(lsGet('rex111_settings_tab') || 'appearance'); } catch (e) { console.warn('Rex: settings tabs skipped', e); }
}

/* Old names stay as thin aliases so older buttons and the command palette keep working. */
window.RexV111 = { openDrawer, closeDrawer, go, settingsTab, runScreen, overlay: overlayEl,
    check: m => window.RexUpd && RexUpd.check(!!m), applyUpdate: () => window.RexUpd && RexUpd.installNow(), rollback: () => window.RexUpd && RexUpd.goBack(), renderUpdateCard: () => window.RexUpd && RexUpd.renderSettingsUpdates() };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
