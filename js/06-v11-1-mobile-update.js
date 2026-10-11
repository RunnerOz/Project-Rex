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
const U = { checking: false, latest: null, notes: '', changes: [], date: '', error: '', checkedAt: 0 };
const CORE = ['index.html', 'css/v11-1.css', 'js/01-main.js', 'js/02-clock-and-changelog.js', 'js/03-holidays.js', 'js/04-studio-and-restore.js', 'js/05-v11-features.js', 'js/06-v11-1-mobile-update.js', 'manifest.webmanifest', 'sw.js'];
const hosted = () => /^https?:$/.test(location.protocol);
const newer = () => !!U.latest && cmpVer(U.latest, APP_VERSION) > 0;

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
        U.checkedAt = Date.now();
        lsSet('rex111_last_check', String(U.checkedAt));
        if (manual) say(newer() ? '⬆️ Update available: v' + v : '✅ You are on the latest version', newer() ? 'info' : 'success');
    } catch (e) {
        U.error = 'Could not check for updates (' + (e.message || 'offline') + '). Try again when you are online.';
        if (manual) say('Update check failed', 'error');
    }
    U.checking = false;
    paintDot(); renderUpdateCard(); renderBanner();
}

function paintDot() { const d = $('setUpdDot'); if (d) d.classList.toggle('hidden', !newer()); }

function renderBanner() {
    const host = $('view-home'); if (!host) return;
    let b = $('rexUpdBanner');
    if (!newer()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'rexUpdBanner'; b.className = 'upd-banner'; host.insertBefore(b, host.firstChild); }
    b.innerHTML = '<span>⬆️ Rex v' + esc2(U.latest) + ' is ready (you have v' + esc2(APP_VERSION) + ').</span><button class="btn btn-primary" onclick="RexV111.applyUpdate()">Update now</button>';
}

const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const fmtDur = sec => sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's';
function overlay() {
    let o = $('rexUpdOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'rexUpdOverlay'; o.className = 'upd-overlay'; document.body.appendChild(o); }
    return o;
}
const TARGET_MS = 22000; // the update screen stays up at least this long so it feels like a real install
const STAGES = [[0, 'Preparing update…'], [12, 'Downloading new files…'], [55, 'Installing…'], [82, 'Cleaning up…'], [94, 'Finishing up…']];
let updating = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function buildApple(o) {
    o.className = 'upd-overlay apple show';
    o.innerHTML = '<div class="ap-wrap"><img class="ap-logo" src="icons/icon-192.png" alt="" draggable="false">' +
        '<div class="ap-title">Updating Project Rex</div>' +
        '<div class="ap-bar"><i id="apFill"></i></div>' +
        '<div class="ap-stage" id="apStage">Preparing update…</div>' +
        '<div class="ap-eta" id="apEta">Estimating time remaining…</div>' +
        '<div class="ap-times"><span id="apNow"></span><span id="apEnd"></span></div></div>' +
        '<div class="ap-foot">Do not close this page. Your data is safe.</div>';
}
async function applyUpdate() {
    if (updating) return; updating = true;
    closeDrawer();
    const o = overlay(); buildApple(o);
    const t0 = Date.now(), endAt = t0 + TARGET_MS, total = CORE.length;
    let realDone = 0, finished = false;
    const fill = $('apFill'), stage = $('apStage'), eta = $('apEta'), now = $('apNow'), end = $('apEnd');
    end.textContent = 'Done around ' + clock(endAt);
    function frame() {
        const timePct = Math.min(100, (Date.now() - t0) / TARGET_MS * 100);
        const realPct = realDone / (total + 1) * 100;
        // progress never runs ahead of the real work, and never lags behind the clock by much
        const pct = finished ? Math.min(100, timePct) : Math.min(timePct, Math.max(realPct, 4) + 3);
        fill.style.width = pct.toFixed(1) + '%';
        let label = STAGES[0][1]; STAGES.forEach(st => { if (pct >= st[0]) label = st[1]; });
        stage.textContent = label;
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        eta.textContent = left > 60 ? 'About ' + Math.ceil(left / 60) + ' minutes remaining' : left > 1 ? 'About ' + left + ' seconds remaining' : 'Almost done';
        now.textContent = clock(Date.now());
        if (!finished || pct < 100) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    for (let i = 0; i < total; i++) {
        try { await fetch(CORE[i] + '?r=' + Date.now(), { cache: 'reload' }); await fetch(CORE[i], { cache: 'reload' }); } catch (err) { /* keep going */ }
        realDone++;
    }
    try {
        if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
        if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update().catch(() => null))); }
    } catch (err) { /* reload anyway */ }
    realDone = total + 1; finished = true;
    const wait = endAt - Date.now(); if (wait > 0) await sleep(wait);
    fill.style.width = '100%'; stage.textContent = 'Update complete'; eta.textContent = 'Restarting…'; end.textContent = 'Finished ' + clock(Date.now());
    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    if (U.latest) lsSet('rex111_whatsnew', JSON.stringify({ version: U.latest, changes: U.changes, date: U.date, secs: secs, at: Date.now() }));
    await sleep(1500);
    o.classList.add('fade');
    await sleep(500);
    location.reload();
}

function showWhatsNew() {
    let w = null;
    try { w = JSON.parse(lsGet('rex111_whatsnew') || 'null'); } catch (e) { w = null; }
    if (!w) return;
    try { localStorage.removeItem('rex111_whatsnew'); } catch (e) { /* ignore */ }
    if (cmpVer(APP_VERSION, w.version) < 0) return; // update did not land yet
    const o = overlay(); o.className = 'upd-overlay show';
    const list = (w.changes || []).length ? '<ul>' + w.changes.map(c => '<li>' + esc2(c) + '</li>').join('') + '</ul>' : '<p>Enjoy the newest version.</p>';
    o.innerHTML = '<div class="upd-box"><div class="upd-spin">🎉</div><h3>Rex is now v' + esc2(APP_VERSION) + '</h3><p>Updated at ' + clock(w.at || Date.now()) + (w.secs ? ' · took ' + fmtDur(w.secs) : '') + '</p><div class="upd-new"><b>✨ What\'s new</b>' + list + '</div><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="document.getElementById(\'rexUpdOverlay\').classList.remove(\'show\')">Got it</button></div>';
}

function when(ts) { if (!ts) return 'never'; const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : new Date(ts).toLocaleString(); }

function renderUpdateCard() {
    const host = $('rexUpdateCard'); if (!host) return;
    let cls = '', icon = '🔄', title, sub;
    if (U.checking) { title = 'Checking…'; sub = 'Looking for a newer version.'; }
    else if (newer()) { cls = 'new'; icon = '⬆️'; title = 'Update available — v' + esc2(U.latest); sub = 'You have v' + esc2(APP_VERSION) + (U.date ? ' · released ' + esc2(U.date) : '') + '.'; }
    else if (U.latest) { cls = 'ok'; icon = '✅'; title = "You're up to date"; sub = 'Running v' + esc2(APP_VERSION) + '. Last checked ' + when(U.checkedAt) + '.'; }
    else if (U.error) { title = 'Not checked'; sub = esc2(U.error); }
    else { title = 'Version ' + esc2(APP_VERSION); sub = 'Press the button to see if a newer one is out.'; }
    let html = '<div class="card-title"><h3>⬆️ Updates</h3></div><div class="upd-top"><div class="upd-badge ' + cls + '">' + icon + '</div><div class="upd-meta"><b>' + title + '</b><small>' + sub + '</small></div></div>';
    if (U.error && U.latest) html += '<p class="upd-foot">' + esc2(U.error) + '</p>';
    if (newer() && U.changes.length) html += '<div class="upd-notes"><b>What\'s new in v' + esc2(U.latest) + '</b><ul>' + U.changes.map(c => '<li>' + esc2(c) + '</li>').join('') + '</ul></div>';
    html += '<div class="upd-actions">';
    if (newer()) html += '<button class="btn btn-primary" onclick="RexV111.applyUpdate()">⬇️ Update now</button>';
    html += '<button class="btn btn-secondary" ' + (U.checking ? 'disabled ' : '') + 'onclick="RexV111.check(true)">🔄 Check for updates</button>';
    html += '<button class="btn btn-neutral" onclick="RexV111.applyUpdate()" title="Reload with the newest files">♻️ Force refresh</button></div>';
    html += '<p class="upd-foot">Updating reloads Rex with the newest files. Your webhooks, settings and backups stay safe in this browser. Rex also checks quietly each time you open it.</p>';
    host.innerHTML = html;
}

function boot() {
    try { initNav(); } catch (e) { console.warn('Rex: nav setup skipped', e); }
    try { settingsTab(lsGet('rex111_settings_tab') || 'appearance'); } catch (e) { console.warn('Rex: settings tabs skipped', e); }
    try { renderUpdateCard(); } catch (e) { /* ignore */ }
    try { showWhatsNew(); } catch (e) { /* ignore */ }
    if (hosted()) setTimeout(() => check(false), 2500);
}

window.RexV111 = { openDrawer, closeDrawer, go, settingsTab, check, applyUpdate, renderUpdateCard };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
