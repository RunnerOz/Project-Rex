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
const U = { checking: false, latest: null, notes: '', date: '', error: '', checkedAt: 0 };
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

async function applyUpdate() {
    say('Updating Rex… your data is not touched.', 'info');
    const btns = document.querySelectorAll('.upd-actions .btn, #rexUpdBanner .btn'); btns.forEach(b => { b.disabled = true; });
    try {
        // 1. pull fresh copies of every file past the browser's own cache
        await Promise.all(CORE.map(f => fetch(f + '?r=' + Date.now(), { cache: 'reload' }).catch(() => null)));
        await Promise.all(CORE.map(f => fetch(f, { cache: 'reload' }).catch(() => null)));
        // 2. clear the offline copies and ask the service worker to update itself
        if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
        if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update().catch(() => null))); }
    } catch (e) { /* reload anyway */ }
    location.reload();
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
    if (newer() && U.notes) html += '<div class="upd-notes">' + esc2(U.notes) + '</div>';
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
    if (hosted()) setTimeout(() => check(false), 2500);
}

window.RexV111 = { openDrawer, closeDrawer, go, settingsTab, check, applyUpdate, renderUpdateCard };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
