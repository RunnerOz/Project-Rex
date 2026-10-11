/* Project Rex Center V11.1.0 — phone drawer + tab bar, Settings sections, and the "Check for updates" button.
   Loaded last. Uses globals from 01-main.js (showView, toast, APP_VERSION, cmpVer). */
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
    new MutationObserver(() => { syncTabbar(); if (isPhone()) window.scrollTo(0, 0); }).observe(sb, { subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    window.matchMedia('(min-width: 821px)').addEventListener('change', e => { if (e.matches) closeDrawer(); });
    syncTabbar();
}

/* ---------- Settings sections ---------- */
function settingsTab(sec) {
    const view = $('view-settings'); if (!view) return;
    if (!['appearance', 'general', 'alerts', 'weather', 'data', 'app'].includes(sec)) sec = 'appearance';
    view.querySelectorAll(':scope > .card[data-sec]').forEach(c => { c.style.display = c.dataset.sec === sec ? '' : 'none'; });
    document.querySelectorAll('#setNav .set-chip').forEach(b => {
        const on = b.dataset.sec === sec; b.classList.toggle('active', on);
        if (on) { try { b.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ignore */ } }
    });
    lsSet('rex111_settings_tab', sec);
    if (sec === 'app') renderUpdateCard();
}

/* ---------- updates ---------- */
const U = { checking: false, latest: null, notes: '', changes: [], date: '', size: 'small', error: '', checkedAt: 0 };
const R = { target: null, pinned: null };            // rollback state
const CORE = ['index.html', 'css/v11-1.css', 'js/01-main.js', 'js/02-clock-and-changelog.js', 'js/03-holidays.js', 'js/04-studio-and-restore.js', 'js/05-v11-features.js', 'js/06-v11-1-mobile-update.js', 'manifest.webmanifest', 'sw.js'];
const SNAP_FILES = ['index.html', 'css/v11-1.css', 'js/01-main.js', 'js/02-clock-and-changelog.js', 'js/03-holidays.js', 'js/04-studio-and-restore.js', 'js/05-v11-features.js', 'js/06-v11-1-mobile-update.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const BIG_MS = 180000, SMALL_MS = 60000;               // 3 minutes for big releases, 1 minute for small ones
const hosted = () => /^https?:$/.test(location.protocol);
const newer = () => !!U.latest && cmpVer(U.latest, APP_VERSION) > 0;
const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const fmtDur = sec => sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* A release is "big" when the major or minor number changes (11.1.x -> 11.2.0, 12.0.0). version.json can force it with "size". */
function sizeOf(latest, size) {
    if (size === 'big' || size === 'small') return size;
    const a = String(latest).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const b = String(APP_VERSION).split('.').map(n => parseInt(n, 10) || 0);
    return (a[0] !== b[0] || a[1] !== b[1]) ? 'big' : 'small';
}

async function check(manual) {
    if (U.checking) return;
    if (!hosted()) {
        U.error = 'Update checking works on the hosted website. This copy was opened straight from a file.';
        renderUpdateCard(); if (manual) say(U.error, 'info'); return;
    }
    U.checking = true; U.error = ''; renderUpdateCard();
    try {
        const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const d = await res.json();
        const v = String(d.version || '').trim();
        if (!v) throw new Error('version.json has no version');
        U.latest = v; U.notes = String(d.notes || d.changelog || '').trim(); U.date = String(d.date || '').trim();
        U.changes = Array.isArray(d.changes) ? d.changes.map(String).filter(Boolean) : U.notes.split(/\n+/).map(x => x.replace(/^[-•*\s]+/, '').trim()).filter(Boolean);
        U.size = sizeOf(v, d.size);
        U.checkedAt = Date.now();
        lsSet('rex111_last_check', String(U.checkedAt));
        lsSet('rex111_latest', JSON.stringify({ v: v, size: U.size, changes: U.changes, date: U.date }));
        if (manual) say(newer() ? '⬆️ Update available: v' + v : '✅ You are on the latest version', newer() ? 'info' : 'success');
    } catch (e) {
        U.error = 'Could not check for updates (' + (e.message || 'offline') + '). Try again when you are online.';
        if (manual) say('Update check failed', 'error');
    }
    U.checking = false;
    paintDot(); renderUpdateCard(); renderBanner();
}

/* red dots: Settings chip, ☰ menu button, bottom "More" tab, and Settings in the menu */
function paintDot() {
    const on = newer() && !R.pinned;
    const d = $('setUpdDot'); if (d) d.classList.toggle('hidden', !on);
    ['rexMenuBtn'].forEach(id => { const e = $(id); if (e) e.classList.toggle('has-upd', on); });
    const more = document.querySelector('#rexTabbar button[data-view="__more"]'); if (more) more.classList.toggle('has-upd', on);
    const st = document.querySelector('#rexSidebar .nav-item[data-view="settings"]'); if (st) st.classList.toggle('has-upd', on);
}

function renderBanner() {
    const host = $('view-home'); if (!host) return;
    let b = $('rexUpdBanner');
    if (!newer() || R.pinned) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'rexUpdBanner'; b.className = 'upd-banner'; host.insertBefore(b, host.firstChild); }
    b.innerHTML = '<span>⬆️ Rex v' + esc2(U.latest) + ' is ready (you have v' + esc2(APP_VERSION) + ').</span><button class="btn btn-primary" onclick="RexV111.applyUpdate()">Update now</button>';
}

/* ---------- saved copies of earlier versions (for Go back) ---------- */
async function snapshotSelf() {
    if (!hosted() || !('caches' in window)) return;
    const name = 'rex-snap-' + APP_VERSION;
    if (await caches.has(name)) return;
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const d = await r.json(); if (cmpVer(d.version, APP_VERSION) !== 0) return; // server already has something newer: these files would be the wrong ones
    const c = await caches.open(name); let bad = false;
    await Promise.all(SNAP_FILES.map(async f => {
        try { const res = await fetch(f, { cache: 'no-cache' }); if (!res.ok) { bad = true; return; } await c.put(new Request(new URL(f, location.href).href), res); } catch (e) { bad = true; }
    }));
    if (bad) { await caches.delete(name); return; }
    const snaps = (await caches.keys()).filter(k => k.startsWith('rex-snap-')).sort((a, b) => cmpVer(b.slice(9), a.slice(9)));
    await Promise.all(snaps.slice(2).map(k => caches.delete(k)));
}
async function refreshRollback() {
    R.target = null; R.pinned = null;
    if (!('caches' in window)) return;
    try {
        const meta = await caches.open('rex-meta'); const pin = await meta.match('__rex_pin');
        if (pin) R.pinned = (await pin.text()) || null;
        const vs = (await caches.keys()).filter(k => k.startsWith('rex-snap-')).map(k => k.slice(9)).filter(v => cmpVer(v, APP_VERSION) < 0).sort((a, b) => cmpVer(b, a));
        R.target = vs[0] || null;
    } catch (e) { /* ignore */ }
    paintDot(); renderUpdateCard(); renderBanner();
}

/* ---------- the full-screen Apple-style screen ---------- */
function overlay() {
    let o = $('rexUpdOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'rexUpdOverlay'; o.className = 'upd-overlay'; document.body.appendChild(o); }
    return o;
}
const STAGES = [[0, 'Preparing…'], [6, 'Downloading new files…'], [30, 'Verifying files…'], [50, 'Installing…'], [72, 'Optimizing…'], [88, 'Cleaning up…'], [95, 'Finishing up…']];
function buildApple(o, title) {
    o.className = 'upd-overlay apple show';
    o.innerHTML = '<div class="ap-wrap"><img class="ap-logo" src="icons/icon-192.png" alt="" draggable="false">' +
        '<div class="ap-title">' + esc2(title) + '</div>' +
        '<div class="ap-bar"><i id="apFill"></i></div>' +
        '<div class="ap-stage" id="apStage">Preparing…</div>' +
        '<div class="ap-eta" id="apEta">Estimating time remaining…</div>' +
        '<div class="ap-times"><span id="apNow"></span><span id="apEnd"></span></div></div>' +
        '<div class="ap-foot">Keep this page open. Your data is safe.</div>';
}
let busy = false;
/* work(): the real job (runs while the bar fills); progress(): 0..1 of real work; the screen lasts at least `ms` */
async function runScreen(o2) {
    if (busy) return false; busy = true;
    closeDrawer();
    let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    const o = overlay(); buildApple(o, o2.title);
    const t0 = Date.now(), endAt = t0 + o2.ms; let real = 0, finished = false;
    const fill = $('apFill'), stage = $('apStage'), eta = $('apEta'), now = $('apNow'), end = $('apEnd');
    end.textContent = 'Done around ' + clock(endAt);
    (function frame() {
        const timePct = Math.min(100, (Date.now() - t0) / o2.ms * 100);
        const pct = finished ? timePct : Math.min(timePct, Math.max(real * 100, 4) + 4);
        fill.style.width = pct.toFixed(1) + '%';
        let label = STAGES[0][1]; STAGES.forEach(st => { if (pct >= st[0]) label = st[1]; });
        stage.textContent = label;
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        eta.textContent = left > 90 ? 'About ' + Math.ceil(left / 60) + ' minutes remaining' : left > 60 ? 'About 1 minute 30 seconds remaining' : left > 1 ? 'About ' + left + ' seconds remaining' : 'Almost done';
        now.textContent = clock(Date.now());
        if (!finished || pct < 100) requestAnimationFrame(frame);
    })();
    try { await o2.work(f => { real = f; }); } catch (err) { console.warn('Rex update step failed', err); }
    real = 1; finished = true;
    const wait = endAt - Date.now(); if (wait > 0) await sleep(wait);
    fill.style.width = '100%'; stage.textContent = o2.doneText || 'Update complete'; eta.textContent = 'Restarting…'; end.textContent = 'Finished ' + clock(Date.now());
    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    if (o2.after) o2.after(secs);
    await sleep(1500);
    o.classList.add('fade'); await sleep(500);
    try { if (wake) wake.release(); } catch (e) { /* ignore */ }
    location.reload();
    return true;
}

async function applyUpdate() {
    const big = U.latest ? U.size === 'big' : false;
    const ms = big ? BIG_MS : SMALL_MS;
    await runScreen({
        title: 'Updating Project Rex', ms: ms, doneText: 'Update complete',
        work: async prog => {
            // 0. leave a rolled-back version first so the downloads below come from the website
            if ('caches' in window) { try { await caches.delete('rex-meta'); } catch (e) { /* ignore */ } }
            try { await snapshotSelf(); } catch (e) { /* ignore */ }
            for (let i = 0; i < CORE.length; i++) {
                try { await fetch(CORE[i] + '?r=' + Date.now(), { cache: 'reload' }); await fetch(CORE[i], { cache: 'reload' }); } catch (e) { /* keep going */ }
                prog((i + 1) / (CORE.length + 1));
            }
            if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.filter(k => !k.startsWith('rex-snap-')).map(k => caches.delete(k))); }
            if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update().catch(() => null))); }
        },
        after: secs => { if (U.latest) lsSet('rex111_whatsnew', JSON.stringify({ version: U.latest, changes: U.changes, date: U.date, secs: secs, at: Date.now() })); }
    });
}

async function rollback() {
    if (!R.target) { say('No earlier version is saved yet.', 'info'); return; }
    const v = R.target;
    if (!confirm('Go back to Rex v' + v + '?\n\nYour webhooks, settings and backups are kept. You can update to the newest version again any time.')) return;
    await runScreen({
        title: 'Going back to v' + v, ms: 12000, doneText: 'Previous version restored',
        work: async prog => {
            const meta = await caches.open('rex-meta'); await meta.put('__rex_pin', new Response(v)); prog(1);
        },
        after: secs => { lsSet('rex111_rolled', JSON.stringify({ to: v, from: APP_VERSION, at: Date.now() })); }
    });
}

function showWhatsNew() {
    let w = null;
    try { w = JSON.parse(lsGet('rex111_whatsnew') || 'null'); } catch (e) { w = null; }
    if (w) {
        try { localStorage.removeItem('rex111_whatsnew'); } catch (e) { /* ignore */ }
        if (cmpVer(APP_VERSION, w.version) < 0) return; // update did not land yet
        const o = overlay(); o.className = 'upd-overlay show';
        const list = (w.changes || []).length ? '<ul>' + w.changes.map(c => '<li>' + esc2(c) + '</li>').join('') + '</ul>' : '<p>Enjoy the newest version.</p>';
        o.innerHTML = '<div class="upd-box"><div class="upd-spin">🎉</div><h3>Rex is now v' + esc2(APP_VERSION) + '</h3><p>Updated at ' + clock(w.at || Date.now()) + (w.secs ? ' · took ' + fmtDur(w.secs) : '') + '</p><div class="upd-new"><b>✨ What\'s new</b>' + list + '</div><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="document.getElementById(\'rexUpdOverlay\').classList.remove(\'show\')">Got it</button></div>';
        return;
    }
    let r = null;
    try { r = JSON.parse(lsGet('rex111_rolled') || 'null'); } catch (e) { r = null; }
    if (r) {
        try { localStorage.removeItem('rex111_rolled'); } catch (e) { /* ignore */ }
        say('↩️ Back on Rex v' + APP_VERSION + '. Update again whenever you are ready.', 'info');
    }
}

function when(ts) { if (!ts) return 'never'; const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : new Date(ts).toLocaleString(); }

function renderUpdateCard() {
    const host = $('rexUpdateCard'); if (!host) return;
    let cls = '', icon = '🔄', title, sub;
    if (U.checking) { title = 'Checking…'; sub = 'Looking for a newer version.'; }
    else if (R.pinned) { cls = 'new'; icon = '↩️'; title = 'Running an earlier version'; sub = 'You went back to v' + esc2(APP_VERSION) + '. Press Update now to return to the newest version.'; }
    else if (newer()) { cls = 'new'; icon = '⬆️'; title = 'Update available — v' + esc2(U.latest); sub = 'You have v' + esc2(APP_VERSION) + (U.date ? ' · released ' + esc2(U.date) : '') + '. ' + (U.size === 'big' ? 'Big update: takes about 3 minutes.' : 'Small update: takes about 1 minute.'); }
    else if (U.latest) { cls = 'ok'; icon = '✅'; title = "You're up to date"; sub = 'Running v' + esc2(APP_VERSION) + '. Last checked ' + when(U.checkedAt) + '.'; }
    else if (U.error) { title = 'Not checked'; sub = esc2(U.error); }
    else { title = 'Version ' + esc2(APP_VERSION); sub = 'Press the button to see if a newer one is out.'; }
    let html = '<div class="card-title"><h3>⬆️ Updates</h3></div><div class="upd-top"><div class="upd-badge ' + cls + '">' + icon + '</div><div class="upd-meta"><b>' + title + '</b><small>' + sub + '</small></div></div>';
    if (U.error && U.latest) html += '<p class="upd-foot">' + esc2(U.error) + '</p>';
    if ((newer() || R.pinned) && U.changes.length) html += '<div class="upd-notes"><b>What\'s new in v' + esc2(U.latest) + '</b><ul>' + U.changes.map(c => '<li>' + esc2(c) + '</li>').join('') + '</ul></div>';
    html += '<div class="upd-actions">';
    if (newer() || R.pinned) html += '<button class="btn btn-primary" onclick="RexV111.applyUpdate()">⬇️ Update now</button>';
    html += '<button class="btn btn-secondary" ' + (U.checking ? 'disabled ' : '') + 'onclick="RexV111.check(true)">🔄 Check for updates</button>';
    html += '<button class="btn btn-neutral" onclick="RexV111.applyUpdate()" title="Reload with the newest files">♻️ Force refresh</button>';
    if (R.target && !R.pinned) html += '<button class="btn btn-danger" onclick="RexV111.rollback()">↩️ Go back to v' + esc2(R.target) + '</button>';
    html += '</div>';
    html += '<p class="upd-foot">Big updates (new features) take about 3 minutes and small fixes about 1 minute, so nothing is rushed. Your webhooks, settings and backups stay safe in this browser.' + (R.target ? '' : ' Rex keeps a copy of your earlier version so you can go back; it appears here after the next update.') + '</p>';
    host.innerHTML = html;
}

function boot() {
    try { initNav(); } catch (e) { console.warn('Rex: nav setup skipped', e); }
    try { settingsTab(lsGet('rex111_settings_tab') || 'appearance'); } catch (e) { console.warn('Rex: settings tabs skipped', e); }
    try { // show the red dot right away from the last check
        const l = JSON.parse(lsGet('rex111_latest') || 'null');
        if (l && l.v) { U.latest = l.v; U.size = l.size || 'small'; U.changes = l.changes || []; U.date = l.date || ''; }
    } catch (e) { /* ignore */ }
    try { renderUpdateCard(); paintDot(); } catch (e) { /* ignore */ }
    try { showWhatsNew(); } catch (e) { /* ignore */ }
    if (hosted()) {
        refreshRollback();
        setTimeout(() => check(false), 2500);
        setTimeout(() => { snapshotSelf().then(refreshRollback).catch(() => null); }, 6000);
    }
}

window.RexV111 = { openDrawer, closeDrawer, go, settingsTab, check, applyUpdate, rollback, renderUpdateCard };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
