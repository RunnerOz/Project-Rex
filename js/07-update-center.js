/* Project Rex Center V11.5.1 — safe update engine (Settings → App & Updates), Settings helpers.
   Loaded after 06. Uses globals from 01-main.js (APP_VERSION, cmpVer, showView, toast, state) and RexV111.runScreen.

   THREE SEPARATE STEPS (they never run together by themselves):
     1. CHECK    fetches version.json from the website (never installs anything).
     2. DETECT   compares the published version with the version saved on this device ("installed").
     3. INSTALL  only when you press Update now and confirm: downloads the whole release, verifies it, then switches.
   "Running" = the version this tab is executing (APP_VERSION). "Installed/active" = the saved copy the service worker serves.
   "Latest published" = what version.json on the website says right now (from the last successful check). */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsJSON = (k, d) => { try { const v = JSON.parse(lsGet(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const say = (m, t) => { try { toast(m, t || 'info'); } catch (e) { /* ignore */ } };
const cmp = (a, b) => cmpVer(a, b);
const hosted = () => /^https?:$/.test(location.protocol);
const canSave = () => hosted() && 'caches' in window && 'serviceWorker' in navigator;

const K = { prefs: 'rex115_prefs', latest: 'rex115_latest', ok: 'rex115_last_ok', installs: 'rex115_installs', whatsnew: 'rex115_whatsnew', rolled: 'rex115_rolled' };
const DEFAULTS = { autoCheck: true, interval: 60, badge: true, restorePoint: true };
const CONTROL = 'rex-control', RP = 'rex-release-';
const BIG_MS = 180000, SMALL_MS = 60000;
const FALLBACK_FILES = ['index.html', 'manifest.webmanifest', 'css/v11-1.css', 'css/v11-5.css', 'js/01-main.js', 'js/02-clock-and-changelog.js', 'js/03-holidays.js', 'js/04-studio-and-restore.js', 'js/05-v11-features.js', 'js/06-v11-1-mobile-update.js', 'js/07-update-center.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/rex-icon.svg'];

/* ---------- state ---------- */
const S = { status: 'idle', error: '', latest: null, attemptAt: 0, okAt: 0, pointer: null, saved: [], busy: false };
function getPrefs() { return Object.assign({}, DEFAULTS, lsJSON(K.prefs, {})); }
function setPref(k, v) {
    const p = getPrefs(); p[k] = v;
    if (!lsSet(K.prefs, JSON.stringify(p))) { say('Could not save (browser storage is full or blocked).', 'error'); return; }
    flashSaved(); schedule(); paintDot(); renderAll();
}
const dateKey = d => { const t = Date.parse(d); return isNaN(t) ? 0 : t; };

/* ---------- saved copies (service worker caches) ---------- */
const base = () => new URL('./', location.href).href;
const fileUrl = f => new URL(f, base()).href;
const ctlKey = () => fileUrl('__rex_control');
const markKey = () => fileUrl('__complete');
const withLock = fn => (navigator.locks && navigator.locks.request) ? navigator.locks.request('rex-update', fn) : fn();   // one install/baseline/go-back/repair at a time across tabs
async function isComplete(v) { try { if (!(await caches.has(RP + v))) return false; const c = await caches.open(RP + v); return !!(await c.match(markKey())); } catch (e) { return false; } }
async function readPointer() {
    if (!canSave()) return null;
    try { const c = await caches.open(CONTROL); const h = await c.match(ctlKey()); if (!h) return null; const p = await h.json(); return p && p.active ? p : null; } catch (e) { return null; }
}
async function writePointer(p) { const c = await caches.open(CONTROL); await c.put(ctlKey(), new Response(JSON.stringify(p), { headers: { 'Content-Type': 'application/json' } })); }
async function listSaved() {
    if (!canSave()) return [];
    try {
        const vs = (await caches.keys()).filter(k => k.startsWith(RP)).map(k => k.slice(RP.length));
        const good = []; for (const v of vs) if (await isComplete(v)) good.push(v);     // half-downloaded copies (no completion marker) never count
        return good.sort((a, b) => cmp(b, a));
    } catch (e) { return []; }
}
async function prune(keep) {
    try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith(RP) && !keep.includes(k.slice(RP.length))).map(k => caches.delete(k))); } catch (e) { /* ignore */ }
}
async function refreshLocal() {
    S.pointer = await readPointer();
    if (S.pointer && !(await isComplete(S.pointer.active))) S.pointer = null;   // the browser cleared the saved copy
    S.saved = await listSaved();
}

/* sha-256 fingerprint of the release files (same as tools/make-version.js), first 16 hex chars */
async function fingerprint(buffers) {
    if (!(window.crypto && crypto.subtle)) return null;
    let n = 0; buffers.forEach(b => { n += b.byteLength; });
    const all = new Uint8Array(n); let o = 0; buffers.forEach(b => { all.set(new Uint8Array(b), o); o += b.byteLength; });
    const h = await crypto.subtle.digest('SHA-256', all);
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
async function fetchManifest() {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('The website answered HTTP ' + res.status + ' for version.json.');
    const d = await res.json();
    const v = String(d.version || '').trim();
    if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error('version.json has no valid version.');
    return d;
}
/* Download every release file into rex-release-<version>, check it, and return. Does NOT change the active pointer. */
async function savedBuild(v) { try { const c = await caches.open(RP + v), m = await c.match(markKey()); return m ? (await m.text()) : ''; } catch (e) { return ''; } }
async function downloadRelease(info, prog, opt) {
    opt = opt || {};
    const name = RP + info.version;
    const cur = await readPointer();
    if (cur && (cur.active === info.version || cur.previous === info.version) && await isComplete(info.version)) return;   // already saved: never delete a copy that is in use
    if (info.build && await isComplete(info.version) && (await savedBuild(info.version)) === info.build) return;   // prepared earlier from this exact build: nothing to download again
    await caches.delete(name);
    const cache = await caches.open(name);
    const files = Array.isArray(info.files) && info.files.length ? info.files : FALLBACK_FILES;
    const bufs = [];
    try {
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (opt.signal && opt.signal.aborted) throw new Error('Canceled.');
            const res = await fetch(fileUrl(f) + '?__rexnet=' + encodeURIComponent(info.build || Date.now()), { cache: 'no-store', signal: opt.signal });
            if (!res.ok) throw new Error('Could not download ' + f + ' (HTTP ' + res.status + ').');
            const buf = await res.arrayBuffer();
            if (!buf.byteLength) throw new Error(f + ' came back empty.');
            bufs.push(buf);
            await cache.put(new Request(fileUrl(f)), new Response(buf, { status: 200, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' } }));
            prog((i + 1) / (files.length + 2));
            if (opt.onFile) opt.onFile(i + 1, files.length, f);
        }
        if (opt.onStage) opt.onStage('verify');
        const mi = files.indexOf('js/01-main.js');
        if (mi >= 0 && new TextDecoder().decode(bufs[mi]).indexOf('APP_VERSION = "' + info.version + '"') < 0) throw new Error('The downloaded app does not identify as v' + info.version + '.');
        if (info.build) { const fp = await fingerprint(bufs); if (fp && fp !== info.build) throw new Error('The downloaded files did not match the published fingerprint (a new deploy may have just happened).'); }
        const again = await fetchManifest();
        if (again.version !== info.version || (info.build && again.build && again.build !== info.build)) throw new Error('The published release changed during the download. Check for updates again.');
        await cache.put(markKey(), new Response(info.build || 'complete', { headers: { 'Content-Type': 'text/plain' } }));      // written last: only now does this copy count as saved
        prog((files.length + 1) / (files.length + 2));
    } catch (e) { await caches.delete(name); throw e; }
}

/* On first run (or after the browser cleared its saved copy) remember the release that is running right now, so a refresh keeps it. */
let baselineRunning = false;
const ensureBaseline = () => withLock(baselineInner);
async function baselineInner() {
    if (!canSave() || baselineRunning) return;
    baselineRunning = true;
    try {
        await refreshLocal();
        if (S.pointer) return;
        const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 4000))]).catch(() => null); if (!reg) return;   // never wait forever when no service worker is active (private windows, blocked workers)
        const m = await fetchManifest();
        if (m.version !== APP_VERSION) return;               // the site moved on: these running files can't be saved reliably, try again next load
        await migrateLegacy();
        await downloadRelease(m, () => null);
        if (await readPointer()) return;                      // another tab saved a release in the meantime: leave it alone
        const older = (await listSaved()).filter(v => cmp(v, APP_VERSION) < 0)[0] || null;
        await writePointer({ active: APP_VERSION, previous: older, at: Date.now(), via: 'baseline' });
        await prune([APP_VERSION].concat(older ? [older] : []));
        await refreshLocal(); renderAll();
    } catch (e) { console.warn('Rex: could not save a copy of this version yet', e); }
    finally { baselineRunning = false; }
}
/* 11.4.0 kept a "Go back" copy in rex-snap-<version>; carry it over once so Go back keeps working. */
async function migrateLegacy() {
    try {
        const keys = await caches.keys();
        for (const k of keys.filter(x => x.startsWith('rex-snap-'))) {
            const v = k.slice(9);
            if (cmp(v, APP_VERSION) < 0) {
                if (await isComplete(v)) { await caches.delete(k); continue; }
                await caches.delete(RP + v);
                const src = await caches.open(k), dst = await caches.open(RP + v), reqs = await src.keys();
                for (const r of reqs) { const res = await src.match(r); if (res) await dst.put(r, res); }
                await dst.put(markKey(), new Response('complete', { headers: { 'Content-Type': 'text/plain' } }));
            }
            await caches.delete(k);
        }
    } catch (e) { /* optional */ }
}

/* ---------- derived values ---------- */
const installedVersion = () => (S.pointer && S.pointer.active) || APP_VERSION;
const latestVersion = () => (S.latest && S.latest.version) || '';
const updateAvailable = () => !!latestVersion() && cmp(latestVersion(), installedVersion()) > 0;
const missedList = () => {
    if (!updateAvailable()) return [];
    const h = (S.latest.history || []).filter(r => r && r.version && cmp(r.version, installedVersion()) > 0 && cmp(r.version, latestVersion()) <= 0);
    return h.length ? h : [{ version: latestVersion() }];
};
function sizeOf() {
    if (S.latest && (S.latest.size === 'big' || S.latest.size === 'small')) return S.latest.size;
    const a = latestVersion().split('.').map(n => parseInt(n, 10) || 0), b = installedVersion().split('.').map(n => parseInt(n, 10) || 0);
    return (a[0] !== b[0] || a[1] !== b[1]) ? 'big' : 'small';
}
function statusInfo() {
    if (S.status === 'checking') return { key: 'checking', label: 'Checking…', cls: 'info' };
    if (S.status === 'failed') return { key: 'failed', label: 'Check failed', cls: 'bad' };
    if (!S.okAt) return { key: 'never', label: 'Not checked yet', cls: 'mute' };
    return updateAvailable() ? { key: 'available', label: 'Update available', cls: 'new' } : { key: 'ok', label: 'Up to date', cls: 'good' };
}
const fmtDate = t => t ? new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const ago = t => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : fmtDate(t); };
const fmtDur = sec => sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's';

/* ---------- 1. CHECK (never installs) ---------- */
async function check(manual) {
    if (S.status === 'checking') return;
    if (!hosted()) {
        S.status = 'failed'; S.error = 'Update checking works on the hosted website. This copy was opened straight from a file.';
        renderAll(); if (manual) say(S.error, 'info'); return;
    }
    S.status = 'checking'; S.error = ''; S.attemptAt = Date.now(); renderAll();
    try {
        const d = await fetchManifest();
        /* scheduled release: version.json may say "releaseAt". Until that time this device treats the new version as ANNOUNCED, not published:
           it shows the countdown and does not offer the update. (It uses this device's clock, and only versions 12.9.3 and newer hold back.) */
        const relRaw = d.releaseAt, relAt = typeof relRaw === 'number' ? relRaw : (relRaw ? (window.RexNextUpdate ? RexNextUpdate.parseAt(relRaw) : Date.parse(relRaw)) : NaN);
        if (Number.isFinite(relAt) && relAt > Date.now() && cmp(String(d.version).trim(), installedVersion()) > 0) {
            S.okAt = Date.now(); S.status = 'done'; lsSet(K.ok, String(S.okAt));
            try { if (window.RexNextUpdate) RexNextUpdate.announce({ version: String(d.version).trim(), at: relAt, name: d.names, title: d.title || '', teaser: d.summary || '' }); } catch (e) { /* ignore */ }
            if (manual) say('⏳ v' + String(d.version).trim() + ' is scheduled for ' + new Date(relAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '. It is not available yet.', 'info');
        } else {
        S.latest = {
            version: String(d.version).trim(), date: String(d.date || ''), summary: String(d.summary || d.notes || ''), build: String(d.build || ''), size: d.size || '',
            names: (d.names && typeof d.names === 'object') ? { computer: String(d.names.computer || '').slice(0, 24), phone: String(d.names.phone || '').slice(0, 24) } : null,
            files: Array.isArray(d.files) ? d.files.map(String) : null,
            changes: Array.isArray(d.changes) ? d.changes.map(String).filter(Boolean) : [],
            history: (Array.isArray(d.history) ? d.history : []).filter(h => h && /^\d+\.\d+\.\d+$/.test(String(h.version))).map(h => ({ version: String(h.version), date: String(h.date || ''), summary: String(h.summary || ''), items: (Array.isArray(h.items) ? h.items : []).filter(i => i && (typeof i === 'string' || i.text)).map(i => ({ type: String(i.type || 'improve'), text: String(i.text || i) })) }))
        };
        S.okAt = Date.now(); S.status = 'done';
        lsSet(K.latest, JSON.stringify(Object.assign({}, S.latest, { okAt: S.okAt })));
        lsSet(K.ok, String(S.okAt));
        try { if (updateAvailable() && lsGet('rex115_notified') !== S.latest.version) { lsSet('rex115_notified', S.latest.version); if (typeof state !== 'undefined' && state.notifPrefs && state.notifPrefs.updates !== false) notify('Update available: v' + S.latest.version + ' (not installed yet)', 'info', 'update'); } } catch (e) { /* ignore */ }
        if (manual) say(updateAvailable() ? '⬆️ Update available: v' + S.latest.version + ' (not installed yet)' : '✅ You are up to date', updateAvailable() ? 'info' : 'success');
        }
    } catch (e) {
        S.status = 'failed'; S.error = 'Could not check for updates (' + (e.message || 'offline') + '). Your current version is unchanged.';
        if (manual) say('Update check failed', 'error');
    }
    await refreshLocal().catch(() => null);
    paintDot(); renderAll();
}

/* auto check: only ever CHECKS. Never installs. */
let timer = null;
function schedule() {
    clearInterval(timer); timer = null;
    const p = getPrefs(); if (!p.autoCheck || !hosted()) return;
    timer = setInterval(() => { const q = getPrefs(); if (q.autoCheck && q.interval > 0 && document.visibilityState === 'visible' && Date.now() - S.attemptAt >= q.interval * 60000) check(false); }, 60000);
}

/* ---------- red dot / banner ---------- */
function paintDot() {
    const on = updateAvailable() && getPrefs().badge && !remindInfo();
    const n = on ? Math.max(1, missedList().length) : 0, label = n > 1 ? (n > 9 ? '9+' : String(n)) : '';
    const mark = e => { if (!e) return; e.classList.toggle('has-upd', on); if (label) e.setAttribute('data-upd', label); else e.removeAttribute('data-upd'); };
    const d = $('setUpdDot'); if (d) { d.classList.toggle('hidden', !on); d.textContent = label; d.classList.toggle('num', !!label); }
    mark($('rexMenuBtn')); mark(document.querySelector('#rexTabbar button[data-view="__more"]'));
    mark(document.querySelector('#rexSidebar .nav-item[data-view="settings"]'));
    try { const b0 = document.title.replace(/^(•|\(\d+\+?\))\s*/, ''); document.title = on ? (n > 1 ? '(' + label + ') ' : '• ') + b0 : b0; } catch (e) { /* ignore */ }
    try { if (on && navigator.setAppBadge) navigator.setAppBadge(n).catch(() => null); else if (!on && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => null); } catch (e) { /* ignore */ }
    paintHomeCard();
}

/* ---------- Home card: release notes first, then the install window (V12.9.6) ---------- */
const REMIND_KEY = 'rex130_remind';       // { version, until } : only hides the Home card and the red dot for a while. Never installs anything.
function remindInfo() { const r = lsJSON(REMIND_KEY, null); return r && r.version === (S.latest && S.latest.version) && +r.until > Date.now() ? r : null; }
function remindLater(ms) {
    if (!updateAvailable()) return;
    const until = ms === 'tomorrow' ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); })() : Date.now() + ms;
    if (!lsSet(REMIND_KEY, JSON.stringify({ version: latestVersion(), until }))) { say('Could not save the reminder (browser storage is full or blocked).', 'error'); return; }
    say('⏰ OK, Rex will remind you ' + new Date(until).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '. Nothing is installed.', 'info');
    paintDot(); armRemind();
}
function remindNow() { try { localStorage.removeItem(REMIND_KEY); } catch (e) { /* ignore */ } paintDot(); }
let remindTimer = null;
function armRemind() {
    clearTimeout(remindTimer); remindTimer = null;
    const r = lsJSON(REMIND_KEY, null); if (!r || !(+r.until > Date.now())) return;
    remindTimer = setTimeout(() => { remindTimer = null; paintDot(); }, Math.min(+r.until - Date.now() + 500, 2147000000));
}
function paintHomeCard() {
    const host = $('view-home'); if (!host) return;
    let b = $('rexUpdBanner');
    if (!updateAvailable()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'rexUpdBanner'; b.className = 'upd-banner'; host.insertBefore(b, host.firstChild); b.addEventListener('click', onHomeCard); }
    const snooze = remindInfo();
    if (snooze) {
        b.className = 'upd-banner upd-snoozed';
        b.innerHTML = '<span>⏰ Update v' + esc(latestVersion()) + ' is on hold until ' + esc(new Date(snooze.until).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + '. Nothing is installed.</span><button type="button" class="btn" data-uh="show">Show it now</button>';
        return;
    }
    b.className = 'upd-banner upd-card';
    const v = latestVersion(), from = installedVersion(), phone = (typeof isPhoneView === 'function') && isPhoneView();
    const nm = S.latest && S.latest.names ? ((phone ? S.latest.names.phone : S.latest.names.computer) || '') : '';
    const rel = findRelease(v) || { items: [], summary: '', date: '' };
    const order = { feature: 0, improve: 1, fix: 2, removed: 3 }, tag = { feature: 'New', improve: 'Improved', fix: 'Fixed', removed: 'Removed' };
    const items = (rel.items || []).filter(i => i && i.text && !/^Updates still only install/i.test(i.text)).slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
    const clip = t => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > 120 ? t.slice(0, 119).replace(/\s+\S*$/, '') + '…' : t; };
    const shown = items.slice(0, 3), more = items.length - shown.length, n = missedList().length;
    b.innerHTML = '<div class="uh-top"><span class="uh-ic" aria-hidden="true">⬆️</span><div class="uh-t"><b>Rex v' + esc(v) + (nm ? ' ' + esc(nm) : '') + ' is published</b>' +
        '<small>You have v' + esc(from) + '. Nothing is installed until you choose.' + (n > 1 ? ' ' + n + ' updates are waiting.' : '') + '</small></div></div>' +
        (rel.summary ? '<p class="uh-sum">' + esc(rel.summary) + '</p>' : '') +
        (shown.length ? '<ul class="uh-list">' + shown.map(i => '<li><span class="ucx-t t-' + esc(i.type) + '">' + esc(tag[i.type] || 'Changed') + '</span> ' + esc(clip(i.text)) + '</li>').join('') + '</ul>' + (more > 0 ? '<div class="uh-more">+ ' + more + ' more in the Update Log</div>' : '') : '') +
        '<div class="uh-act"><button type="button" class="btn btn-primary" data-uh="install">Install…</button><button type="button" class="btn" data-uh="log">Read all notes</button>' +
        '<span class="uh-rem"><button type="button" class="btn" data-uh="remind" aria-haspopup="true" aria-expanded="false">⏰ Remind me later ▾</button><span class="uh-menu" hidden role="menu">' +
        '<button type="button" role="menuitem" data-uh-ms="3600000">In 1 hour</button><button type="button" role="menuitem" data-uh-ms="14400000">In 4 hours</button><button type="button" role="menuitem" data-uh-ms="tomorrow">Tomorrow morning</button></span></span></div>';
}
function onHomeCard(e) {
    const t = e.target.closest('[data-uh],[data-uh-ms]'); if (!t) return;
    const card = $('rexUpdBanner');
    if (t.dataset.uhMs) { remindLater(t.dataset.uhMs === 'tomorrow' ? 'tomorrow' : +t.dataset.uhMs); return; }
    const a = t.dataset.uh;
    if (a === 'remind') { const m = card.querySelector('.uh-menu'); m.hidden = !m.hidden; t.setAttribute('aria-expanded', String(!m.hidden)); }
    else if (a === 'show') remindNow();
    else if (a === 'install') installNow();
    else if (a === 'log') { try { showView('changelog'); } catch (er) { /* ignore */ } }
}
document.addEventListener('click', e => { const m = document.querySelector('#rexUpdBanner .uh-menu'); if (m && !m.hidden && !e.target.closest('.uh-rem')) { m.hidden = true; const bt = m.parentNode.querySelector('[data-uh="remind"]'); if (bt) bt.setAttribute('aria-expanded', 'false'); } });

/* ---------- modals ---------- */
function modal(html, onClose) {
    const bg = document.createElement('div'); bg.className = 'uc-modal-bg';
    bg.innerHTML = '<div class="uc-modal" role="dialog" aria-modal="true">' + html + '</div>';
    const close = v => { bg.remove(); document.removeEventListener('keydown', onKey); if (onClose) onClose(v); };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    bg.addEventListener('click', e => { if (e.target === bg) close(null); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    const f = bg.querySelector('[data-autofocus]'); if (f) f.focus();
    return { el: bg, close };
}
function notesModal(ver) {
    const rel = findRelease(ver); if (!rel) { say('No release notes found for v' + ver + '.', 'info'); return; }
    const groups = { feature: 'New', improve: 'Improved', fix: 'Fixed', removed: 'Removed' };
    const body = Object.keys(groups).map(t => { const its = rel.items.filter(i => i.type === t); return its.length ? '<h4>' + groups[t] + '</h4><ul>' + its.map(i => '<li>' + esc(i.text) + '</li>').join('') + '</ul>' : ''; }).join('') || '<p>No notes recorded.</p>';
    const m = modal('<div class="uc-mh"><h3>v' + esc(rel.version) + ' release notes</h3><span>' + esc(rel.date || '') + '</span></div>' + (rel.summary ? '<p class="uc-lead">' + esc(rel.summary) + '</p>' : '') + '<div class="uc-notes">' + body + '</div><div class="uc-mf"><button class="btn btn-primary" data-autofocus data-x>Close</button></div>');
    m.el.querySelector('[data-x]').onclick = () => m.close();
}
function confirmModal(o) {      // resolves {ok, checked}
    return new Promise(res => {
        const chk = !o.check ? '' : o.check.sub
            ? '<label class="ucx-opt"><span class="ucx-ot"><b>' + esc(o.check.label) + '</b><small>' + esc(o.check.sub) + '</small></span><span class="switch"><input type="checkbox" id="ucChk" ' + (o.check.on ? 'checked' : '') + '><span class="slider"></span></span></label>'
            : '<label class="uc-check"><input type="checkbox" id="ucChk" ' + (o.check.on ? 'checked' : '') + '> ' + esc(o.check.label) + '</label>';
        const m = modal((o.head || '<div class="uc-mh"><h3>' + esc(o.title) + '</h3></div>') + '<div class="uc-body">' + o.html + '</div>' + chk +
            '<div class="uc-mf"><button class="btn btn-neutral" data-no>Cancel</button>' + (o.later ? '<button class="btn" data-later>⏰ Remind me later</button>' : '') + '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-success') + '" data-yes data-autofocus>' + esc(o.yes) + '</button></div>', v => res(v || { ok: false }));
        m.el.querySelector('[data-no]').onclick = () => m.close({ ok: false });
        const lb = m.el.querySelector('[data-later]'); if (lb) lb.onclick = () => m.close({ ok: false, later: true });
        m.el.querySelector('[data-yes]').onclick = () => m.close({ ok: true, checked: !!(m.el.querySelector('#ucChk') || {}).checked });
    });
}

/* what the "Install?" window shows: the two versions with their names, what is new, and what will happen */
function installDialog(target, n, big) {
    const from = installedVersion(), phone = (typeof isPhoneView === 'function') && isPhoneView();
    const pick = o => o ? ((phone ? o.phone : o.computer) || '') : '';
    const nameFrom = (typeof releaseName === 'function') ? releaseName(from) : '', nameTo = pick(S.latest && S.latest.names);
    const rel = findRelease(target) || { items: [], summary: '', date: '' };
    const order = { feature: 0, improve: 1, fix: 2, removed: 3 }, tag = { feature: 'New', improve: 'Improved', fix: 'Fixed', removed: 'Removed' };
    const items = (rel.items || []).filter(i => i && i.text && !/^Updates still only install/i.test(i.text)).slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
    const clip = t => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > 150 ? t.slice(0, 149).replace(/\s+\S*$/, '') + '…' : t; };
    const shown = items.slice(0, 4), more = items.length - shown.length;
    const chip = (v, nm) => '<span class="ucx-v"><b>v' + esc(v) + '</b>' + (nm ? '<small>' + esc(nm) + '</small>' : '') + '</span>';
    const head = '<div class="ucx-head"><span class="ucx-ic" aria-hidden="true">🚀</span><div><h3>Install v' + esc(target) + (nameTo ? ' ' + esc(nameTo) : '') + '?</h3>' +
        '<div class="ucx-path" aria-label="From version ' + esc(from) + ' to ' + esc(target) + '">' + chip(from, nameFrom) + '<span class="ucx-ar" aria-hidden="true">→</span>' + chip(target, nameTo) +
        (big ? '<span class="ucx-badge">BIG UPDATE</span>' : '') + (n > 1 ? '<span class="ucx-badge">' + n + ' UPDATES IN ONE GO</span>' : '') + '</div></div></div>';
    const html = (rel.summary ? '<p class="ucx-sum">' + esc(rel.summary) + '</p>' : '') +
        (shown.length ? '<div class="ucx-new"><div class="ucx-k">WHAT’S NEW' + (rel.date ? ' · ' + esc(rel.date) : '') + '</div><ul>' + shown.map(i => '<li><span class="ucx-t t-' + esc(i.type) + '">' + esc(tag[i.type] || 'Changed') + '</span>' + esc(clip(i.text)) + '</li>').join('') + '</ul>' + (more > 0 ? '<div class="ucx-more">+ ' + more + ' more in the Update Log</div>' : '') + '</div>' : '') +
        '<ol class="ucx-steps"><li><span aria-hidden="true">⬇️</span><div><b>Download and check</b><small>Rex downloads the new version and checks every file first.</small></div></li>' +
        '<li><span aria-hidden="true">🔁</span><div><b>Switch and restart</b><small>Only if everything checks out. The page restarts (about ' + (big ? '3 minutes' : '1 minute') + ').</small></div></li>' +
        '<li><span aria-hidden="true">🛡️</span><div><b>Your data stays</b><small>Webhooks, profile, projects, settings and backups are not erased. If anything fails you stay on v' + esc(from) + '.</small></div></li></ol>';
    return { head, html };
}


/* ---------- 3a. PREPARE (starts only after you confirm Update Now; nothing is switched here) ----------
   Like a phone's "Preparing..." step: Rex saves a restore point, downloads every file of the new version into its own saved copy,
   and checks them. The progress bar is the real download. The screen stays up for at least 6 seconds so the steps can be read.
   Cancel is safe at any point: the half-saved copy is deleted and your current version is untouched. */
function prepareRelease(target, rel, restore, from) {
    return new Promise(resolve => {
        const o = document.getElementById('rexPrep') || (() => { const d = document.createElement('div'); d.id = 'rexPrep'; document.body.appendChild(d); return d; })();
        const phone = (typeof isPhoneView === 'function') && isPhoneView(), names = S.latest && S.latest.names, nm = names ? ((phone ? names.phone : names.computer) || '') : '';
        const r0 = rel.find(x => x.version === target) || { items: [], summary: '' }, items = r0.items || [];
        const cnt = t => items.filter(i => i && i.type === t).length, nf = cnt('feature'), ni = cnt('improve'), nx = cnt('fix');
        const bits = []; if (nf) bits.push(nf + ' new ' + (nf === 1 ? 'feature' : 'features')); if (ni) bits.push(ni + ' ' + (ni === 1 ? 'improvement' : 'improvements')); if (nx) bits.push(nx + ' bug ' + (nx === 1 ? 'fix' : 'fixes'));
        const sum = String(r0.summary || (S.latest && S.latest.summary) || '').trim().replace(/[.\s]+$/, '');
        const desc = (sum ? esc(sum) + '. ' : '') + (bits.length ? 'This update includes ' + esc(bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0]) + '.' : '');
        const STEPS = [['rp', 'Saving a restore point'], ['dl', 'Downloading the new files'], ['vf', 'Checking every file'], ['rd', 'Ready to install']];
        if (!restore) STEPS.shift();
        o.className = 'upd-overlay show pr-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'prTitle');
        o.innerHTML = '<div class="pr-box"><div class="pr-top"><span class="pr-ic" aria-hidden="true">🦖</span><div><h3 id="prTitle">Project Rex v' + esc(target) + (nm ? ' ' + esc(nm) : '') + '</h3><div class="pr-st" id="prSt" role="status" aria-live="polite">Preparing…</div></div></div>' +
            '<div class="pr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="prBar"><i id="prFill"></i></div><div class="pr-sub" id="prSub">Starting…</div>' +
            (desc ? '<p class="pr-desc">' + desc + '</p>' : '') +
            '<ul class="pr-steps">' + STEPS.map(x => '<li data-s="' + x[0] + '"><span class="pr-dot" aria-hidden="true"></span>' + x[1] + '</li>').join('') + '</ul>' +
            '<div class="pr-need"><b>To install the update, make sure Rex is:</b><ul><li>Open in this tab (do not close or refresh it)</li><li>Online while the files download</li><li id="prBat" hidden></li></ul><p>Installation starts as soon as every file is checked. Rex keeps a copy of your current version, so if anything goes wrong you stay on v' + esc(from) + '.</p></div>' +
            '<button type="button" class="btn btn-ghost pr-cancel" id="prCancel">Cancel</button></div>';
        const $p = id => document.getElementById(id), t0 = Date.now(), ac = (typeof AbortController === 'function') ? new AbortController() : null;
        let pct = 0, done = false, canceled = false;
        const setStep = id => { let hit = false; STEPS.forEach(x => { const li = o.querySelector('[data-s="' + x[0] + '"]'); if (!li) return; if (x[0] === id) { hit = true; li.className = 'now'; } else li.className = hit ? '' : 'done'; }); };
        const setPct = (v, sub) => { pct = Math.max(pct, Math.min(100, v)); $p('prFill').style.width = pct.toFixed(1) + '%'; $p('prBar').setAttribute('aria-valuenow', String(Math.floor(pct))); if (sub) $p('prSub').textContent = sub; };
        try { if (navigator.getBattery) navigator.getBattery().then(b => { const el = $p('prBat'); if (!el || b.charging || b.level >= 0.2) return; el.hidden = false; el.textContent = 'Battery is at ' + Math.round(b.level * 100) + '%. Plug in if you can, to be safe.'; }).catch(() => null); } catch (e) { /* optional */ }
        const close = () => { o.className = ''; o.innerHTML = ''; document.removeEventListener('keydown', onKey, true); };
        const onKey = e => { if (e.key === 'Escape' && !done && $p('prCancel') && !$p('prCancel').disabled) { e.preventDefault(); e.stopPropagation(); $p('prCancel').click(); } };
        document.addEventListener('keydown', onKey, true); try { $p('prCancel').focus(); } catch (e) { /* ignore */ }
        $p('prCancel').onclick = () => { if (done) return; canceled = true; if (ac) ac.abort(); $p('prSt').textContent = 'Canceling…'; $p('prCancel').disabled = true; };
        const fail = msg => { o.className = 'upd-overlay show pr-ov'; o.innerHTML = '<div class="pr-box"><div class="pr-top"><span class="pr-ic" aria-hidden="true">⚠️</span><div><h3>' + (canceled ? 'Update canceled' : 'Update not prepared') + '</h3></div></div><p class="pr-desc">' + esc(msg) + '</p><p class="pr-desc">Nothing was changed. You are still on v' + esc(from) + ' and your data is untouched.</p><button type="button" class="btn btn-primary" id="prClose" style="width:100%">Close</button></div>'; const c = document.getElementById('prClose'); if (c) { c.onclick = () => { close(); resolve({ ok: false }); }; c.focus(); } };
        setPct(1, 'Checking the release…');
        (async () => {
            try {
                await withLock(async () => {
                    await refreshLocal();
                    if (S.pointer && cmp(S.pointer.active, target) >= 0) throw new Error('v' + S.pointer.active + ' is already installed (maybe from another Rex tab). Nothing to do.');
                    const m = await fetchManifest();
                    if (m.version !== target) throw new Error('The published version changed to v' + m.version + ' while you were confirming. Press Check for Updates and try again.');
                    if (restore) { setStep('rp'); setPct(2, 'Saving a restore point…'); if (window.RexV110 && RexV110.silentBackup) RexV110.silentBackup('Before update to v' + target + ' · ' + new Date().toLocaleString()); }
                    await baselineInner();
                    if (canceled) throw new Error('Canceled.');
                    setStep('dl'); setPct(6, 'Downloading…');
                    await downloadRelease(m, f => setPct(6 + f * 86), { signal: ac && ac.signal,
                        onFile: (i, n) => { $p('prSub').textContent = 'Downloading file ' + i + ' of ' + n; },
                        onStage: st => { if (st === 'verify') { setStep('vf'); $p('prSub').textContent = 'Checking every file…'; $p('prSt').textContent = 'Verifying…'; } } });
                    if (canceled) throw new Error('Canceled.');
                    const wait = 6000 - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
                    if (!(await isComplete(target))) throw new Error('The prepared files could not be saved on this device.');
                });
                done = true; setStep('rd'); o.querySelectorAll('.pr-steps li').forEach(li => { li.className = 'done'; }); setPct(100, 'All files checked'); $p('prSt').textContent = 'Ready to install'; $p('prCancel').hidden = true;
                await new Promise(r => setTimeout(r, 1400)); close(); resolve({ ok: true });
            } catch (e) { try { await caches.delete(RP + target); } catch (x) { /* ignore */ } await refreshLocal().catch(() => null); fail(canceled || /abort|cancel/i.test(String(e && (e.name + e.message))) ? 'You canceled the update.' : ((e && e.message) || String(e))); }
        })();
    });
}

/* ---------- 3. INSTALL (only from the button, only after confirming) ---------- */
async function installNow() {
    if (S.busy) return;
    if (!updateAvailable()) { say('You already have the latest published version.', 'info'); return; }
    const target = latestVersion(), big = sizeOf() === 'big', n = missedList().length;
    if (!canSave()) {
        const r = await confirmModal({ title: 'Load the newest version?', html: '<p>This browser cannot keep a saved copy of Rex, so it simply loads whatever the website has. Reloading will show v' + esc(target) + '. Your data in this browser is not touched.</p>', yes: 'Reload now' });
        if (r.ok) location.reload(); return;
    }
    const prefs = getPrefs();
    const dlg = installDialog(target, n, big);
    const r = await confirmModal({
        title: 'Install v' + target + '?', head: dlg.head, html: dlg.html,
        check: { label: 'Save a restore point first', sub: 'Keeps a copy of your data in this browser just before the update. Recommended.', on: prefs.restorePoint }, yes: 'Install v' + target, later: true
    });
    if (r.later) { remindLater(3600000); return; }
    if (!r.ok) return;
    if (r.checked !== prefs.restorePoint) { const p = getPrefs(); p.restorePoint = r.checked; lsSet(K.prefs, JSON.stringify(p)); }
    S.busy = true; renderAll();
    const cards = []; const rel = missedList().slice().sort((a, b) => cmp(b.version, a.version));
    const from = installedVersion();
    const prep = await prepareRelease(target, rel, r.checked, from);
    if (!prep.ok) { S.busy = false; await refreshLocal().catch(() => null); renderAll(); return; }
    if (rel.length > 1) cards.push(['📦 INSTALLING ' + rel.length + ' UPDATES AT ONCE', rel.map(x => 'v' + x.version).join(' + ')]);
    rel.forEach(x => ((x.items && x.items.length) ? x.items.map(i => i.text) : (x.version === target ? S.latest.changes : [])).forEach(t => cards.push(['✨ NEW IN v' + x.version, t])));
    TIPS.forEach(t => cards.push(['TIP', t]));
    let manifest = null;
    const res = await window.RexV111.runScreen({
        title: n > 1 ? 'Installing ' + n + ' updates' : 'Updating Project Rex', ms: big ? BIG_MS : SMALL_MS, doneText: 'Update complete', failTitle: 'Update not installed', cards,
        work: prog => withLock(async () => {
            await refreshLocal();
            if (S.pointer && cmp(S.pointer.active, target) >= 0) throw new Error('v' + S.pointer.active + ' is already installed (maybe from another Rex tab). Nothing to do.');
            manifest = await fetchManifest();
            if (manifest.version !== target) throw new Error('The published version changed to v' + manifest.version + ' while you were confirming. Press Check for Updates and try again.');
            prog(0.05);
            await baselineInner();       // make sure the version you are leaving can be restored with Go back (the restore point and download already ran in the Prepare step)
            await downloadRelease(manifest, f => prog(0.05 + f * 0.9));   // skips the download when Prepare already saved this exact build
            await writePointer({ active: target, previous: S.pointer && S.pointer.active !== target ? S.pointer.active : (from !== target ? from : null), at: Date.now(), via: 'update' });
            const p = await readPointer(); if (!p || p.active !== target) throw new Error('Could not switch to the new version.');
            await prune([target, p.previous].filter(Boolean));
            prog(1);
        }),
        after: secs => { lsSet(K.whatsnew, JSON.stringify({ version: target, from, changes: S.latest.changes, missed: rel, date: S.latest.date, secs, at: Date.now() })); }
    });
    S.busy = false;
    if (!res.ok) { await refreshLocal().catch(() => null); renderAll(); }
}
const TIPS = ['💡 Press Ctrl/⌘ + K anywhere to jump to any page.', '🛡️ Rex Backup saves your data every day. Download a file now and then for a real safety copy.', '↩️ If an update ever breaks something, Settings → App & Updates → Go back.', '📡 Webhook URLs stay in your browser. They are never uploaded anywhere.'];

async function goBack() {
    await refreshLocal();
    const prev = S.pointer && S.pointer.previous;
    if (!prev || !S.saved.includes(prev)) { say('No earlier saved version is available on this device.', 'info'); return; }
    const cur = S.pointer.active;
    const r = await confirmModal({ title: 'Go back to v' + prev + '?', html: '<p>Rex will switch to the saved copy of v' + esc(prev) + ' and restart. Your data and settings are kept. You can install v' + esc(cur) + ' (or newer) again from Settings → App & Updates.</p>', yes: 'Go back to v' + prev });
    if (!r.ok) return;
    await window.RexV111.runScreen({
        title: 'Going back to v' + prev, ms: 12000, doneText: 'Previous version restored', failTitle: 'Could not go back',
        work: prog => withLock(async () => { if (!(await isComplete(prev))) throw new Error('The saved copy of v' + prev + ' is gone or incomplete.'); await writePointer({ active: prev, previous: cur, at: Date.now(), via: 'goback' }); prog(1); }),
        after: () => { lsSet(K.rolled, JSON.stringify({ to: prev, from: cur, at: Date.now() })); }
    });
}
async function repair() {
    if (!canSave()) { say('Saved copies are not available in this browser.', 'info'); return; }
    const r = await confirmModal({ title: 'Repair saved copy?', html: '<p>Rex checks that its saved copy of v' + esc(installedVersion()) + ' is complete. If files are missing, it downloads the <b>currently published</b> version and saves that instead (this can be newer than what you have).</p><p>You must be online. Nothing is deleted until the new copy is fully downloaded and checked. Your webhooks, settings, profile, projects and backups are <b>not</b> touched.</p>', yes: 'Check and repair' });
    if (!r.ok) return;
    await window.RexV111.runScreen({
        title: 'Repairing', ms: 8000, doneText: 'Saved copy is healthy', failTitle: 'Repair did not finish',
        work: prog => withLock(async () => {
            await refreshLocal();
            if (S.pointer) {
                const c = await caches.open(RP + S.pointer.active); const need = FALLBACK_FILES.filter(f => f !== 'icons/rex-icon.svg');
                const have = await Promise.all(need.map(async f => !!(await c.match(fileUrl(f)))));
                if (have.every(Boolean)) { prog(1); return; }
            }
            const m = await fetchManifest();            // offline -> throws here, before anything is changed
            const old = S.pointer && S.pointer.active;
            if (old === m.version) await caches.delete(RP + old);    // the saved copy is already broken, so replacing it is safe
            await downloadRelease(m, f => prog(f * 0.95));
            await writePointer({ active: m.version, previous: null, at: Date.now(), via: 'repair' });
            await prune([m.version]); prog(1);
        })
    });
}

/* ---------- what's new after an install ---------- */
function showWhatsNew() {
    const w = lsJSON(K.whatsnew, null);
    if (w) {
        try { localStorage.removeItem(K.whatsnew); } catch (e) { /* ignore */ }
        if (cmp(APP_VERSION, w.version) < 0) { say('The update to v' + w.version + ' did not finish. You are still on v' + APP_VERSION + '.', 'error'); return; }   // never record an install that did not land
        const h = lsJSON(K.installs, []); h.unshift({ version: w.version, from: w.from || '', at: w.at || Date.now(), secs: w.secs || 0, count: (w.missed || []).length || 1 }); lsSet(K.installs, JSON.stringify(h.slice(0, 30)));
        const groups = (w.missed && w.missed.length > 1) ? w.missed.slice() : [{ version: w.version, items: (function () { try { const rr = findRelease(w.version); if (rr && rr.items && rr.items.length) return rr.items; } catch (e) { /* ignore */ } return (w.changes || []).map(t => ({ text: t })); })() }];
        const TG = { feature: ['✨', 'NEW'], improve: ['🎨', 'IMPROVED'], fix: ['🛠️', 'FIXED'], removed: ['🗑️', 'REMOVED'] };
        const nm = v => { try { return (typeof releaseName === 'function' && releaseName(v)) || ''; } catch (e) { return ''; } };
        const chip = (lab, v) => '<span class="ucd-chip"><small>' + lab + '</small><b>v' + esc(v) + (nm(v) ? ' ' + esc(nm(v)) : '') + '</b></span>';
        const list = groups.map(g => { const its = (g.items || []).filter(c => c && (c.text || typeof c === 'string')); return '<div class="ucd-g"><div class="ucd-gh">v' + esc(g.version) + (nm(g.version) ? ' · ' + esc(nm(g.version)) : '') + '</div><ul>' + (its.length ? its.slice(0, 6).map(c => { const t = TG[c.type]; return '<li>' + (t ? '<span class="ucd-tag">' + t[0] + ' ' + t[1] + '</span> ' : '') + esc(c.text || c) + '</li>'; }).join('') + (its.length > 6 ? '<li class="ucd-more">+ ' + (its.length - 6) + ' more in the Update Log</li>' : '') : '<li>Improvements</li>') + '</ul></div>'; }).join('');
        let conf = ''; for (let k = 0; k < 14; k++) conf += '<i style="left:' + (3 + k * 7) + '%;animation-delay:' + ((k * 0.31) % 1.8).toFixed(2) + 's">' + ['🎉', '✨', '🎊', '⭐'][k % 4] + '</i>';
        const o = window.RexV111.overlay(); o.className = 'upd-overlay show';
        o.innerHTML = '<div class="upd-box ucd-box" role="dialog" aria-modal="true" aria-label="Update complete"><div class="ucd-conf" aria-hidden="true">' + conf + '</div><div class="ucd-ic" aria-hidden="true">🎉</div><h3>Update complete</h3>' +
            '<div class="ucd-path">' + (w.from ? chip('Before', w.from) + '<span class="ucd-ar" aria-hidden="true">→</span>' : '') + chip('Now', APP_VERSION) + '</div>' +
            '<p class="ucd-meta">' + (groups.length > 1 ? groups.length + ' updates installed · ' : '') + 'Installed ' + new Date(w.at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + (w.secs ? ' · took ' + fmtDur(w.secs) : '') + '</p>' +
            '<div class="ucd-new"><b>What\'s new</b>' + list + '</div><div class="ucd-act"><button type="button" class="btn btn-primary" data-ucd="ok">Got it</button><button type="button" class="btn" data-ucd="trailer">▶ Watch trailer</button><button type="button" class="btn" data-ucd="log">📄 Update Log</button></div><small class="ucd-safe">Your data and settings were kept. Updates only install when you press Update Now.</small></div>';
        const closeIt = () => { o.classList.remove('show'); document.removeEventListener('keydown', onEsc, true); };
        const onEsc = e => { if (e.key === 'Escape' && o.classList.contains('show')) { e.preventDefault(); e.stopPropagation(); closeIt(); } };
        document.addEventListener('keydown', onEsc, true);
        o.onclick = e => { const bt = e.target.closest && e.target.closest('[data-ucd]'); if (!bt) { if (e.target === o) closeIt(); return; } const a = bt.dataset.ucd; closeIt(); if (a === 'trailer') { try { RexTrailer.play(APP_VERSION, 1); } catch (er) { /* ignore */ } } else if (a === 'log') { try { showView('changelog'); } catch (er) { /* ignore */ } } };
        setTimeout(() => { try { const g = o.querySelector('[data-ucd="ok"]'); g && g.focus(); } catch (e) { /* ignore */ } }, 80);
        return;
    }
    const r = lsJSON(K.rolled, null);
    if (r) { try { localStorage.removeItem(K.rolled); } catch (e) { /* ignore */ } if (APP_VERSION === r.to) { const h = lsJSON(K.installs, []); h.unshift({ version: r.to, from: r.from, at: r.at, secs: 0, count: 1, how: 'goback' }); lsSet(K.installs, JSON.stringify(h.slice(0, 30))); say('↩️ Back on Rex v' + APP_VERSION + '. Update again whenever you are ready.', 'info'); } }
}

/* ---------- release data for the Update Center ---------- */
function findRelease(ver) {
    const loc = (window.RexReleases ? RexReleases.list() : []).find(r => r.version === ver);
    const pub = S.latest && (S.latest.history || []).find(r => r.version === ver);
    const r = loc || pub; if (!r) return null;
    return { version: r.version, date: r.date || (pub && pub.date) || '', summary: r.summary || (pub && pub.summary) || '', items: (r.items && r.items.length ? r.items : (pub && pub.items) || []) };
}
function openSettings() {
    const p = getPrefs(), prev = S.pointer && S.pointer.previous && S.saved.includes(S.pointer.previous) ? S.pointer.previous : '';
    const m = modal('<div class="uc-mh"><h3>⚙️ Update Settings</h3></div><div class="uc-body">' + prefRows('m') + '<div class="uc-sec">Saved copies on this device</div><p class="uc-muted">' + (S.saved.length ? S.saved.map(v => 'v' + esc(v)).join(', ') + (S.pointer ? ' · active: v' + esc(S.pointer.active) : '') : 'None yet. Rex saves a copy of the running version the first time it loads on the website.') + '</p><div class="uc-row-btns"><button class="btn btn-secondary" data-back ' + (prev ? '' : 'disabled') + '>↩️ Go back' + (prev ? ' to v' + esc(prev) : '') + '</button><button class="btn btn-secondary" data-repair ' + (canSave() ? '' : 'disabled') + '>🛠️ Repair</button><button class="btn btn-secondary" data-diag>📋 Copy diagnostics</button></div><p class="uc-muted uc-small">Diagnostics contain versions and browser support only. Discord webhook links are never included.</p></div><div class="uc-mf"><button class="btn btn-primary" data-autofocus data-x>Done</button></div>', () => renderAll());
    wirePrefs(m.el, 'm');
    m.el.querySelector('[data-x]').onclick = () => m.close();
    m.el.querySelector('[data-back]').onclick = () => { m.close(); goBack(); };
    m.el.querySelector('[data-repair]').onclick = () => { m.close(); repair(); };
    m.el.querySelector('[data-diag]').onclick = copyDiagnostics;
}
function prefRows(pre) {
    const p = getPrefs();
    const sw = (id, on, label, sub) => '<div class="set-row"><div class="set-info"><b>' + label + '</b><small>' + sub + '</small></div><div class="set-ctl"><label class="switch"><input type="checkbox" id="' + pre + '_' + id + '" ' + (on ? 'checked' : '') + '><span class="slider"></span></label></div></div>';
    return sw('auto', p.autoCheck, 'Auto Check', 'Look for new versions in the background. It only checks; it never installs.') +
        '<div class="set-row"><div class="set-info"><b>How often</b><small>Used while Rex is open and Auto Check is on.</small></div><div class="set-ctl"><select id="' + pre + '_int">' + [[0, 'Only when Rex opens'], [15, 'Every 15 minutes'], [60, 'Every hour'], [360, 'Every 6 hours'], [1440, 'Once a day']].map(o => '<option value="' + o[0] + '" ' + (+p.interval === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div></div>' +
        sw('badge', p.badge, 'Show update dot', 'A red dot on the menu, Settings and the app icon when a new version is published.') +
        sw('rp', p.restorePoint, 'Save a restore point before installing', 'Keeps a copy of your data in this browser just before an update.');
}
function wirePrefs(root, pre) {
    const g = id => root.querySelector('#' + pre + '_' + id);
    const map = { auto: ['autoCheck', e => e.checked], badge: ['badge', e => e.checked], rp: ['restorePoint', e => e.checked], int: ['interval', e => parseInt(e.value, 10) || 0] };
    Object.keys(map).forEach(k => { const e = g(k); if (e) e.onchange = () => setPref(map[k][0], map[k][1](e)); });
}

/* ---------- Settings → App & Updates summary ---------- */
function renderSettingsUpdates() {
    const host = $('rexUpdateCard'); if (!host) return;
    const st = statusInfo(), avail = updateAvailable(), L = S.latest;
    const rel = L ? findRelease(L.version) : null;
    const row = (k, v) => '<div class="set-row"><div class="set-info"><b>' + k + '</b></div><div class="set-ctl uc-val">' + v + '</div></div>';
    let note = '';
    if (S.status === 'failed') note += '<div class="uc-alert bad">' + esc(S.error) + '</div>';
    if (S.pointer && S.pointer.active !== APP_VERSION) note += '<div class="uc-alert info">This tab runs v' + esc(APP_VERSION) + ' but the saved copy is v' + esc(S.pointer.active) + ' (a hard refresh skips saved copies). A normal reload returns to v' + esc(S.pointer.active) + '.</div>';
    if (!canSave()) note += '<div class="uc-alert info">' + (hosted() ? 'This browser cannot keep saved copies, so reloading loads whatever the website has.' : 'Opened from a file: updates only work on the hosted website.') + '</div>';
    const key = st.key, icon = key === 'available' ? '⬆️' : key === 'ok' ? '✅' : key === 'failed' ? '⚠️' : key === 'checking' ? '⏳' : '🔄';
    const lines = { ok: 'You have the newest version. There is nothing to install.', available: 'A newer version is published. Install it when you are ready: Rex never installs by itself.', never: 'Press Check for Updates to see if there is a newer version.', checking: 'Looking for a newer version…', failed: 'Rex could not reach the website. Your data is fine, and you can try again.' };
    const nmTo = (function () { try { const n = L && L.names; return n ? (isPhoneView() ? n.phone : n.computer) || '' : ''; } catch (e) { return ''; } })();
    const chip = (lab, v, nm) => '<span class="ucs-chip"><small>' + lab + '</small><b>v' + esc(v) + (nm ? ' ' + esc(nm) : '') + '</b></span>';
    const runDate = (function () { try { const r = RexLogParts.CHANGELOG.find(x => x.version === APP_VERSION); return r && r.date ? r.date + (r.time ? ' · ' + r.time : '') : ''; } catch (e) { return ''; } })();
    const tile = (ic, k, v, sub) => '<div class="ucs-tile"><span class="ucs-ti" aria-hidden="true">' + ic + '</span><small>' + k + '</small><b>' + v + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    host.innerHTML = '<div class="card-title ucs-vh"><h3>⬆️ Updates</h3></div><div class="ucs-hero ucs-' + key + '"><div class="ucs-ico" aria-hidden="true">' + icon + '</div><div class="ucs-tx"><span class="ucs-kicker">UPDATE CENTER</span><h3>' + esc(st.label) + (avail ? ' · v' + esc(latestVersion()) : '') + '</h3><p>' + esc(lines[key] || '') + '</p>' +
        '<div class="ucs-path">' + chip('Running', APP_VERSION, releaseName()) + (avail ? '<span class="ucs-ar" aria-hidden="true">→</span>' + chip('Available', latestVersion(), nmTo) : '') + '</div></div>' +
        '<div class="upd-actions ucs-act"><button class="btn ' + (avail ? 'btn-success' : 'btn-secondary') + '" id="ucInstall" ' + (avail && !S.busy ? '' : 'disabled') + ' title="Install v' + esc(latestVersion() || '') + ' (asks first)">⬇️ Update Now' + (avail ? ' · v' + esc(latestVersion()) : '') + '</button>' +
        '<button class="btn btn-secondary" id="ucCheck" ' + (S.status === 'checking' ? 'disabled' : '') + '>🔄 Check for Updates</button>' +
        (rel ? '<button class="btn btn-neutral" id="ucNotes">📄 Release notes</button>' : '') + '</div></div>' + note +
        (avail && rel ? '<div class="upd-notes"><b>What\'s new in v' + esc(rel.version) + '</b><ul>' + rel.items.slice(0, 4).map(i => '<li>' + esc(i.text) + '</li>').join('') + (rel.items.length > 4 ? '<li>+ ' + (rel.items.length - 4) + ' more</li>' : '') + '</ul></div>' : '') +
        '<div class="ucs-tiles">' + tile('📦', 'Running version', 'v' + esc(APP_VERSION), esc(runDate || (releaseName() || ''))) +
        tile('🌐', 'Latest published', L ? 'v' + esc(L.version) : '<span class="uc-muted">unknown</span>', L ? esc(L.date || '') : 'Check to find out') +
        tile('🕒', 'Last successful check', S.okAt ? esc(ago(S.okAt)) : '<span class="uc-muted">never</span>', S.okAt ? esc(fmtDate(S.okAt)) : '') + '</div>' +
        '<p class="ucs-safe">🛡️ Checking never installs anything. Refreshing or reopening Rex does not install updates or erase your data.</p>' +
        '<div class="set-sub">Update preferences</div>' + prefRows('s') +
        '<div class="upd-actions"><button class="btn btn-neutral" id="ucMore">⚙️ Go back, Repair &amp; diagnostics</button></div>';
    const q = (id, fn) => { const e = host.querySelector(id); if (e) e.onclick = fn; };
    q('#ucCheck', () => check(true)); q('#ucInstall', installNow); q('#ucMore', openSettings); q('#ucNotes', () => rel && notesModal(rel.version));
    wirePrefs(host, 's');
}
function renderAll() { try { renderSettingsUpdates(); } catch (e) { console.warn('Rex: update card render failed', e); } try { renderHomeVersion(); } catch (e) { /* ignore */ } }
function renderHomeVersion() {
    const sub = $('homeVersionSub'); if (!sub) return;
    sub.textContent = updateAvailable() ? 'v' + latestVersion() + ' is published · see Settings' : 'View latest release notes';
}

/* ---------- Settings: search, saved indicator, safer reset, redacted sharing ---------- */
function flashSaved() {
    let e = $('setSaved'); if (!e) return;
    e.classList.add('show'); clearTimeout(flashSaved.t); flashSaved.t = setTimeout(() => e.classList.remove('show'), 1800);
}
function settingsSearch(q) {
    const view = $('view-settings'); if (!view) return;
    q = String(q || '').toLowerCase().trim();
    const cards = Array.from(view.querySelectorAll(':scope > .card[data-sec]'));
    const none = $('setNone');
    if (!q) {
        view.classList.remove('searching'); view.querySelectorAll('.set-hide').forEach(e => e.classList.remove('set-hide'));
        const cur = lsGet('rex111_settings_tab') || 'appearance'; cards.forEach(c => { c.style.display = c.dataset.sec === cur ? '' : 'none'; }); if (none) none.hidden = true; return;
    }
    view.classList.add('searching'); let hits = 0;
    cards.forEach(c => {
        const rows = Array.from(c.querySelectorAll('.set-row, .field, .set-note'));
        let any = false;
        rows.forEach(r => { const m = r.textContent.toLowerCase().includes(q); r.classList.toggle('set-hide', !m); if (m) any = true; });
        const titleHit = (c.querySelector('.card-title') || {}).textContent && c.querySelector('.card-title').textContent.toLowerCase().includes(q);
        if (titleHit) { rows.forEach(r => r.classList.remove('set-hide')); any = true; }
        c.style.display = any ? '' : 'none'; if (any) hits++;
    });
    if (none) none.hidden = hits > 0;
}
const WEBHOOK = /https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+/gi;
const redact = s => String(s).replace(WEBHOOK, 'https://discord.com/api/webhooks/<removed>');
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function exportShareable() {
    try {
        const json = redact(JSON.stringify(Object.assign({}, state, { appVersion: APP_VERSION, note: 'Discord webhook links were removed from this file.' }), null, 2));
        download('project-rex-shareable-no-webhooks.json', json); say('Exported without webhook URLs', 'success');
    } catch (e) { say('Could not export', 'error'); }
}
async function copyDiagnostics() {
    await refreshLocal().catch(() => null);
    const d = { app: 'Project Rex Center', runningVersion: APP_VERSION, installedSavedVersion: S.pointer ? S.pointer.active : null, previousSaved: S.pointer ? S.pointer.previous : null, savedCopies: S.saved, latestPublished: latestVersion() || null, status: statusInfo().label, lastSuccessfulCheck: S.okAt ? new Date(S.okAt).toISOString() : null, autoCheck: getPrefs().autoCheck, hosted: hosted(), serviceWorkerSupported: 'serviceWorker' in navigator, controlledBySW: !!(navigator.serviceWorker && navigator.serviceWorker.controller), cacheStorage: 'caches' in window, standalone: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches), userAgent: navigator.userAgent, page: location.origin + location.pathname };
    const text = redact(JSON.stringify(d, null, 2));
    try { await navigator.clipboard.writeText(text); say('Diagnostics copied (no webhook links)', 'success'); } catch (e) { download('rex-diagnostics.json', text); }
}
async function confirmReset() {
    const m = modal('<div class="uc-mh"><h3>🗑️ Reset Rex data?</h3></div><div class="uc-body"><p>This erases your <b>webhooks, templates, drafts, history, schedule, settings and profile</b> from this browser.</p><p>A restore point is saved first, so you can bring it back from <b>Rex Backup</b>. Studio notes, tasks, projects and your restore points are kept unless you tick the box below.</p><label class="uc-check"><input type="checkbox" id="rsAll"> Also erase Studio data, restore points and backups (cannot be undone)</label><label class="uc-lbl">Type <b>RESET</b> to confirm</label><input id="rsText" class="uc-input" autocomplete="off" data-autofocus></div><div class="uc-mf"><button class="btn btn-neutral" data-no>Cancel</button><button class="btn btn-danger" data-yes disabled>Reset</button></div>');
    const t = m.el.querySelector('#rsText'), y = m.el.querySelector('[data-yes]');
    t.oninput = () => { y.disabled = t.value.trim() !== 'RESET'; };
    m.el.querySelector('[data-no]').onclick = () => m.close();
    y.onclick = () => {
        if (t.value.trim() !== 'RESET') return;
        const all = m.el.querySelector('#rsAll').checked;
        if (!all && window.RexV110 && RexV110.silentBackup && !RexV110.silentBackup('Before reset · ' + new Date().toLocaleString())) { say('Could not save a restore point first (storage may be full). Nothing was erased. Download a backup file, then try again.', 'error'); return; }
        window.__rexResetting = true;        // stop the page's save-on-close from writing the erased data back
        try {
            if (all) { Object.keys(localStorage).filter(k => /^(rex|projectRex)/i.test(k) || k === 'rex_friends' || k === 'rex_dev_clock_data').forEach(k => localStorage.removeItem(k)); }
            else localStorage.removeItem('projectRexV42');
        } catch (e) { say('Could not reset', 'error'); return; }
        location.reload();
    };
}

/* A small "Saved" flash whenever a Settings control changes (the page's own handlers do the saving). */
function wireSettingsFeedback() {
    const v = $('view-settings'); if (!v) return;
    v.addEventListener('change', e => { if (e.target.closest('#setSearch')) return; flashSaved(); });
    v.addEventListener('click', e => { if (e.target.closest('.mention-btn, .seg button, .wx-unit button, .swatch, [data-save-flash]')) flashSaved(); });
    const s = $('setSearch'); if (s) s.addEventListener('input', () => settingsSearch(s.value));
}

function open() { showView('settings'); window.RexV111.settingsTab('app'); }

/* ---------- start ---------- */
async function boot() {
    const l = lsJSON(K.latest, null);
    if (l && l.version) { S.latest = l; S.okAt = l.okAt || +lsGet(K.ok) || 0; S.status = 'done'; }   // last known result (clearly labelled with its time), not a fresh check
    try { wireSettingsFeedback(); } catch (e) { console.warn('Rex: settings helpers skipped', e); }
    renderAll(); paintDot(); armRemind();
    try { showWhatsNew(); } catch (e) { /* ignore */ }
    await refreshLocal().catch(() => null);
    renderAll(); paintDot();
    if (hosted()) {
        schedule();
        setTimeout(async () => { await ensureBaseline(); if (getPrefs().autoCheck) check(false); }, 2500);   // may check (never installs)
        document.addEventListener('visibilitychange', () => { const p = getPrefs(); if (document.visibilityState === 'visible' && p.autoCheck && p.interval > 0 && Date.now() - S.attemptAt > p.interval * 60000) check(false); });
        window.addEventListener('online', () => { if (getPrefs().autoCheck && Date.now() - S.attemptAt > 60000) check(false); });
    }
}

window.RexUpd = { check, installNow, remindLater, remindNow, goBack, repair, open, openSettings, paintDot, render: renderAll, renderSettingsUpdates, settingsSearch, exportShareable, copyDiagnostics, confirmReset, redact,
    state: () => ({ running: APP_VERSION, installed: installedVersion(), latest: latestVersion(), available: updateAvailable(), status: statusInfo().key, okAt: S.okAt, pointer: S.pointer, saved: S.saved.slice() }) };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
