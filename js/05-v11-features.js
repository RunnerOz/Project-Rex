/* Project Rex Center V11.0.0 — Rex Backup, Achievements, Pomodoro, installable app.
   Loaded last. Uses globals from 01-main.js (state, toast, getFriends, APP_VERSION) and 04-studio-and-restore.js (RexV101). */
(function () {
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = { cfg: 'rex110_settings', ach: 'rex110_achievements', pomo: 'rex110_pomodoro', dl: 'rex110_last_download', first: 'rex110_first_seen', remind: 'rex110_last_reminder' };
const RP = 'rex101_restore_points';
const DAY = 86400000;

const readJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.error('Rex: could not save ' + k, e); return false; } };
const say = (m, t) => { try { if (typeof toast === 'function') toast(m, t || 'info'); } catch (e) { /* toast is optional */ } };
const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
const appVer = () => (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown');
const ago = ts => {
    if (!ts) return 'never';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 48) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
};
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ---------- small settings store ---------- */
const CFG_DEFAULTS = { autoBackup: true, keepAuto: 5, remindDays: 14, installed: false };
const getCfg = () => Object.assign({}, CFG_DEFAULTS, readJSON(KEY.cfg, {}));
const setCfg = patch => writeJSON(KEY.cfg, Object.assign(getCfg(), patch));

/* =====================================================================
   REX BACKUP
   ===================================================================== */
const SKIP = new Set([RP, KEY.dl, KEY.first, KEY.remind]);

function snapshotStorage() {
    const s = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!SKIP.has(k)) s[k] = localStorage.getItem(k);
    }
    return s;
}
function makePoint(label, auto) {
    return { format: 'project-rex-restore-point', formatVersion: 1, appVersion: appVer(), created: Date.now(), storage: snapshotStorage(), id: uid(), label, auto: !!auto };
}
function points() { const a = readJSON(RP, []); return Array.isArray(a) ? a : []; }

/* Older restore points embedded a copy of every earlier restore point inside themselves, which made them
   grow very large. Strip those nested copies once. */
function migratePoints() {
    const list = points(); let changed = false;
    list.forEach(p => { if (p && p.storage && Object.prototype.hasOwnProperty.call(p.storage, RP)) { delete p.storage[RP]; changed = true; } });
    if (changed) writeJSON(RP, list);
}

function autoBackup(force) {
    const cfg = getCfg();
    if (!force && !cfg.autoBackup) return false;
    const list = points();
    const last = list.find(p => p.auto);
    if (!force && last && Date.now() - (last.checked || last.created) < DAY) return false;
    const p = makePoint('Automatic backup', true);
    if (last && JSON.stringify(last.storage) === JSON.stringify(p.storage)) {
        last.checked = Date.now();           // nothing changed since the last automatic backup
        writeJSON(RP, list);
        return false;
    }
    list.unshift(p);
    let n = 0;
    const kept = list.filter(x => { if (!x.auto) return true; n++; return n <= cfg.keepAuto; }).slice(0, 20);
    if (!writeJSON(RP, kept)) { say('Could not save the automatic backup — browser storage may be full. Download a backup file instead.', 'error'); return false; }
    return true;
}

function backupNow() {
    const list = points();
    list.unshift(makePoint('Backup · ' + new Date().toLocaleString(), false));
    if (!writeJSON(RP, list.slice(0, 20))) { say('Could not save the backup — browser storage may be full. Download a backup file instead.', 'error'); return; }
    say('💾 Backup saved in this browser', 'success');
    refreshBackupViews();
}

function markDownloaded() { try { localStorage.setItem(KEY.dl, String(Date.now())); } catch (e) { /* ignore */ } renderBackup(); }

function refreshBackupViews() {
    if (window.RexV101 && RexV101.renderRestorePoints) RexV101.renderRestorePoints();
    renderBackup();
}

function maybeRemind() {
    const cfg = getCfg();
    if (!cfg.remindDays) return;
    if (!localStorage.getItem(KEY.first)) { try { localStorage.setItem(KEY.first, String(Date.now())); } catch (e) { /* ignore */ } return; }
    const first = Number(localStorage.getItem(KEY.first)) || Date.now();
    const base = Number(localStorage.getItem(KEY.dl)) || first;
    const lastReminder = Number(localStorage.getItem(KEY.remind)) || 0;
    if (Date.now() - base > cfg.remindDays * DAY && Date.now() - lastReminder > DAY) {
        try { localStorage.setItem(KEY.remind, String(Date.now())); } catch (e) { /* ignore */ }
        say('💾 It has been ' + Math.round((Date.now() - base) / DAY) + ' days since your last backup file. Open Rex Backup to download one.', 'info');
    }
}

function renderBackup() {
    const host = $('rexBackupCard'); if (!host) return;
    const cfg = getCfg(), list = points(), autos = list.filter(p => p.auto), last = autos[0];
    const dl = Number(localStorage.getItem(KEY.dl)) || 0;
    const lastAuto = last ? (last.checked || last.created) : 0;
    const st = snapshotStorage(); let bytes = 0; Object.keys(st).forEach(k => { bytes += (k.length + (st[k] || '').length) * 2; });
    const autoFresh = !!lastAuto && Date.now() - lastAuto < 2 * DAY;
    const dlFresh = !!dl && (!cfg.remindDays || Date.now() - dl < cfg.remindDays * DAY);
    let tone = 'bad', headline = '⚠️ No backups yet', tip = 'Press “Download backup file” to save a copy of everything.';
    if (dlFresh && (autoFresh || !cfg.autoBackup)) { tone = 'good'; headline = '✅ Your data is backed up'; tip = 'A recent backup file exists and automatic backups are running.'; }
    else if (lastAuto || dl) { tone = 'warn'; headline = '🟡 Download a backup file soon'; tip = 'Automatic backups live inside this browser. If you clear site data they disappear, so a downloaded file is your real safety copy.'; }
    host.innerHTML =
        '<div class="card-title"><h3>🛡️ Rex Backup</h3><span class="r11-pill ' + tone + '">' + headline + '</span></div>' +
        '<p class="r11-muted">' + esc(tip) + '</p>' +
        '<div class="r11-backup-grid">' +
            '<div class="r11-mini"><b>' + esc(lastAuto ? ago(lastAuto) : 'not yet') + '</b><span>Last automatic backup</span></div>' +
            '<div class="r11-mini"><b>' + esc(dl ? ago(dl) : 'never') + '</b><span>Last downloaded file</span></div>' +
            '<div class="r11-mini"><b>' + list.length + '</b><span>Backups kept in this browser</span></div>' +
            '<div class="r11-mini"><b>' + (bytes / 1024).toFixed(0) + ' KB</b><span>Your data (' + Object.keys(st).length + ' items)</span></div>' +
        '</div>' +
        '<div class="r11-actions">' +
            '<button class="sbtn primary" onclick="RexV101.exportBackup()">⇩ Download backup file</button>' +
            '<button class="sbtn" onclick="RexV110.backupNow()">＋ Back up now</button>' +
            '<label class="sbtn" style="cursor:pointer">⇧ Restore from a file<input type="file" accept="application/json,.json" hidden onchange="RexV101.importBackup(event)"></label>' +
        '</div>' +
        '<div class="r11-settings-row">' +
            '<label class="r11-switch-row"><span>Automatic daily backup <small>keeps the newest ' + cfg.keepAuto + '</small></span><label class="switch"><input type="checkbox" ' + (cfg.autoBackup ? 'checked' : '') + ' onchange="RexV110.setAutoBackup(this.checked)"><span class="slider"></span></label></label>' +
            '<label class="r11-switch-row"><span>Remind me to download a file</span><select onchange="RexV110.setRemind(this.value)" aria-label="Backup reminder">' +
                [[0, 'Never'], [7, 'Every 7 days'], [14, 'Every 14 days'], [30, 'Every 30 days']].map(o => '<option value="' + o[0] + '"' + (cfg.remindDays === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
            '</select></label>' +
        '</div>' +
        '<p class="r11-muted" style="margin-top:10px">After you restore from a file it appears in the list below as a restore point. Press <b>Restore</b> on it to bring that data back.</p>';
}

/* =====================================================================
   ACHIEVEMENTS
   ===================================================================== */
const TIER_NAMES = ['Bronze', 'Silver', 'Gold'];
const ACH = [
    { id: 'sender', icon: '📡', title: 'Message Sender', desc: 'Send webhook messages.', key: 'sent', tiers: [1, 25, 100], unit: 'sent' },
    { id: 'templates', icon: '📝', title: 'Template Maker', desc: 'Create your own message templates.', key: 'templates', tiers: [1, 5, 15], unit: 'templates' },
    { id: 'events', icon: '🧪', title: 'Event Host', desc: 'Create testing events.', key: 'events', tiers: [1, 5, 15], unit: 'events' },
    { id: 'hours', icon: '⏱️', title: 'Time Keeper', desc: 'Log time with the Dev Clock.', key: 'hours', tiers: [1, 10, 50], unit: 'hours', decimals: 1 },
    { id: 'streak', icon: '🔥', title: 'On a Roll', desc: 'Log Dev Clock time on consecutive days.', key: 'streak', tiers: [3, 7, 30], unit: 'days' },
    { id: 'focus', icon: '🍅', title: 'Focus Master', desc: 'Finish Pomodoro focus sessions.', key: 'pomodoros', tiers: [1, 25, 100], unit: 'sessions' },
    { id: 'holidayfan', icon: '⭐', title: 'Holiday Fan', desc: 'Favorite holidays in the Holiday Center.', key: 'favs', tiers: [1, 5, 10], unit: 'favorites' },
    { id: 'party', icon: '🎉', title: 'Party Planner', desc: 'Add your own custom holidays.', key: 'customHol', tiers: [1, 3, 10], unit: 'holidays' },
    { id: 'projects', icon: '🧩', title: 'Project Starter', desc: 'Create projects in Rex Studio.', key: 'projects', tiers: [1, 3, 10], unit: 'projects' },
    { id: 'finisher', icon: '✅', title: 'Finisher', desc: 'Complete tasks in projects and the Task Center.', key: 'tasksDone', tiers: [1, 10, 50], unit: 'tasks' },
    { id: 'notes', icon: '📓', title: 'Note Taker', desc: 'Write notebook entries and Knowledge Base notes.', key: 'notes', tiers: [1, 10, 30], unit: 'notes' },
    { id: 'planner', icon: '🔗', title: 'Workflow Planner', desc: 'Plan workflows in the Automation Lab.', key: 'workflows', tiers: [1, 5, 10], unit: 'workflows' },
    { id: 'safety', icon: '🛡️', title: 'Safety Net', desc: 'Keep backups of your data.', key: 'backups', tiers: [1, 3, 10], unit: 'backups' },
    { id: 'backupfile', icon: '💾', title: 'Backup File', desc: 'Download a backup file at least once.', key: 'backupFile', tiers: [1], unit: '' },
    { id: 'friends', icon: '🧑‍🤝‍🧑', title: 'Social Rex', desc: 'Add friends from their share codes.', key: 'friends', tiers: [1, 3, 10], unit: 'friends' },
    { id: 'installed', icon: '📲', title: 'Installed', desc: 'Install Rex as an app.', key: 'installed', tiers: [1], unit: '' }
];

const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

function bestStreak(sessions) {
    const days = [...new Set(sessions.map(s => { const d = new Date(s.start); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }))].sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    days.forEach(t => { run = (prev !== null && Math.round((t - prev) / DAY) === 1) ? run + 1 : 1; if (run > best) best = run; prev = t; });
    return best;
}

function metrics() {
    const m = {};
    const W = (typeof state !== 'undefined' && state && state.workspaces) || [];
    m.sent = W.reduce((n, w) => n + (w.history || []).length, 0);
    m.templates = W.reduce((n, w) => n + (w.templates || []).length, 0);
    m.events = W.reduce((n, w) => n + (w.testingEvents || []).length, 0);
    const clock = readJSON('rex_dev_clock_data', {}) || {};
    const sessions = Array.isArray(clock.sessions) ? clock.sessions : [];
    let ms = sessions.reduce((n, s) => n + (s.duration || 0), 0);
    if (clock.activeStart) ms += Date.now() - clock.activeStart;
    m.hours = ms / 3600000;
    m.streak = bestStreak(sessions);
    const pomo = readJSON(KEY.pomo, {}) || {};
    m.pomodoros = Array.isArray(pomo.log) ? pomo.log.length : 0;
    const hs = (typeof state !== 'undefined' && state && state.holidays) || {};
    m.favs = Array.isArray(hs.favs) ? hs.favs.length : 0;
    m.customHol = Array.isArray(hs.custom) ? hs.custom.length : 0;
    const projects = readJSON('rex101_projects', []);
    m.projects = projects.length;
    m.tasksDone = projects.reduce((n, p) => n + (p.tasks || []).filter(t => t.done).length, 0) + readJSON('rex101_tasks', []).filter(t => t.done).length;
    m.notes = projects.reduce((n, p) => n + (p.notebook || []).length, 0) + readJSON('rex101_notes', []).length;
    m.workflows = readJSON('rex101_workflows', []).length;
    m.backups = points().length;
    m.backupFile = localStorage.getItem(KEY.dl) ? 1 : 0;
    try { m.friends = typeof getFriends === 'function' ? getFriends().length : 0; } catch (e) { m.friends = 0; }
    m.installed = (getCfg().installed || isStandalone()) ? 1 : 0;
    return m;
}

function evaluateAchievements() {
    const m = metrics();
    const seededBefore = localStorage.getItem(KEY.ach) !== null;
    const store = readJSON(KEY.ach, null) || { seeded: Date.now(), items: {} };
    if (!store.items) store.items = {};
    let changed = !seededBefore;
    ACH.forEach(a => {
        const reached = a.tiers.filter(t => (m[a.key] || 0) >= t).length;
        const have = (store.items[a.id] || []).length;
        if (reached > have) {
            const stamps = (store.items[a.id] || []).slice();
            for (let i = have; i < reached; i++) {
                stamps.push(Date.now());
                if (seededBefore) say('🏆 Achievement unlocked: ' + a.title + (a.tiers.length > 1 ? ' · ' + TIER_NAMES[i] : ''), 'success');
            }
            store.items[a.id] = stamps; changed = true;
        }
    });
    if (changed) writeJSON(KEY.ach, store);
    return { m, store };
}

let achFilter = 'all';
function setAchFilter(f) { achFilter = f; renderAchievements(); }

function renderAchievements() {
    const grid = $('rexAchGrid'); if (!grid) return;
    const { m, store } = evaluateAchievements();
    let totalTiers = 0, doneTiers = 0;
    const cards = ACH.map(a => {
        const reached = a.tiers.filter(t => (m[a.key] || 0) >= t).length;
        totalTiers += a.tiers.length; doneTiers += reached;
        return { a, reached, val: m[a.key] || 0, stamps: store.items[a.id] || [] };
    });
    const pct = totalTiers ? Math.round(doneTiers / totalTiers * 100) : 0;
    const level = pct >= 100 ? 'Legend' : pct >= 70 ? 'Expert' : pct >= 45 ? 'Pro' : pct >= 20 ? 'Builder' : 'Rookie';
    const sum = $('rexAchSummary');
    if (sum) sum.innerHTML =
        '<div class="r11-mini"><b>' + esc(level) + '</b><span>Rex rank</span></div>' +
        '<div class="r11-mini"><b>' + doneTiers + ' / ' + totalTiers + '</b><span>Badges unlocked</span></div>' +
        '<div class="r11-mini"><b>' + cards.filter(c => c.reached === c.a.tiers.length).length + ' / ' + ACH.length + '</b><span>Achievements complete</span></div>' +
        '<div class="r11-bar big"><span style="width:' + pct + '%"></span></div>';
    const chips = $('rexAchFilters');
    if (chips) chips.innerHTML = [['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'In progress']].map(f => '<button type="button" class="appearance-tab' + (achFilter === f[0] ? ' active' : '') + '" onclick="RexV110.setAchFilter(\'' + f[0] + '\')">' + f[1] + '</button>').join('');
    const shown = cards.filter(c => achFilter === 'all' || (achFilter === 'unlocked' ? c.reached > 0 : c.reached < c.a.tiers.length));
    grid.innerHTML = shown.length ? shown.map(c => {
        const a = c.a, complete = c.reached >= a.tiers.length;
        const next = complete ? a.tiers[a.tiers.length - 1] : a.tiers[c.reached];
        const pctBar = Math.min(100, Math.round(Math.min(c.val, next) / next * 100));
        const fmt = v => (a.decimals ? Number(v).toFixed(a.decimals) : String(Math.floor(v)));
        const tierLabel = a.tiers.length === 1 ? (c.reached ? 'Unlocked' : 'Locked') : (c.reached ? TIER_NAMES[c.reached - 1] : 'Locked');
        const when = c.stamps.length ? 'Unlocked ' + fmtDate(c.stamps[c.stamps.length - 1]) : '';
        return '<article class="r11-ach t' + c.reached + (c.reached ? ' on' : '') + '">' +
            '<div class="r11-ach-icon" aria-hidden="true">' + a.icon + '</div>' +
            '<div class="r11-ach-body"><div class="r11-ach-top"><strong>' + esc(a.title) + '</strong><span class="r11-tier t' + c.reached + '">' + tierLabel + '</span></div>' +
            '<p>' + esc(a.desc) + '</p>' +
            (a.tiers.length > 1 || !c.reached ? '<div class="r11-bar"><span style="width:' + pctBar + '%"></span></div><small>' + fmt(c.val) + ' / ' + next + (a.unit ? ' ' + esc(next === 1 ? a.unit.replace(/s$/, '') : a.unit) : '') + (complete ? ' · maxed out 🎉' : '') + '</small>' : '<small>Done ✓</small>') +
            (when ? '<small class="r11-when">' + esc(when) + '</small>' : '') +
            '</div></article>';
    }).join('') : '<div class="studio-empty">Nothing here yet — use Rex a little and badges will appear.</div>';
}

/* =====================================================================
   POMODORO (Dev Clock page)
   ===================================================================== */
const PD = { cfg: { focus: 25, short: 5, long: 15, every: 4, auto: false, notify: true, sound: true }, mode: 'focus', cycle: 0, running: false, endAt: 0, remain: 25 * 60000, log: [] };
let P = null, pTimer = null, baseTitle = '';
const MODE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const clampMin = (v, lo, hi, fb) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; };
const dur = mode => P.cfg[mode] * 60000;

function loadPomo() {
    const s = readJSON(KEY.pomo, {}) || {};
    P = Object.assign({}, PD, s, { cfg: Object.assign({}, PD.cfg, s.cfg || {}) });
    P.log = Array.isArray(P.log) ? P.log.filter(x => x && isFinite(x.t)) : [];
    if (!MODE_LABEL[P.mode]) P.mode = 'focus';
    if (!(P.remain > 0)) P.remain = dur(P.mode);
}
function savePomo() { P.log = P.log.slice(-600); writeJSON(KEY.pomo, P); }

function beep() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const ctx = new AC();
        [0, 0.25, 0.5].forEach((d, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = i === 2 ? 880 : 660; o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.0001, ctx.currentTime + d);
            g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + d + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.2);
            o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.22);
        });
        setTimeout(() => { try { ctx.close(); } catch (e) { /* ignore */ } }, 1200);
    } catch (e) { /* audio is optional */ }
}

const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const nextModeAfter = mode => (mode === 'focus' ? (P.cycle % P.cfg.every === 0 ? 'long' : 'short') : 'focus');

function pStart() {
    if (P.running) return;
    if (!(P.remain > 0)) P.remain = dur(P.mode);
    P.endAt = Date.now() + P.remain; P.running = true;
    if (P.cfg.notify && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* ignore */ } }
    savePomo(); ensureTicker(); renderPomodoro();
}
function pPause() {
    if (!P.running) return;
    P.remain = Math.max(0, P.endAt - Date.now()); P.running = false;
    stopTicker(); savePomo(); renderPomodoro();
}
function pReset() { P.running = false; P.remain = dur(P.mode); stopTicker(); savePomo(); renderPomodoro(); }
function pSetMode(mode) { if (!MODE_LABEL[mode]) return; P.mode = mode; P.running = false; P.remain = dur(mode); stopTicker(); savePomo(); renderPomodoro(); }
function pSkip() { const nxt = P.mode === 'focus' ? 'short' : 'focus'; pSetMode(nxt); }
function pCfg(key, value) {
    if (key === 'auto' || key === 'notify' || key === 'sound') P.cfg[key] = !!value;
    else if (key === 'every') P.cfg.every = clampMin(value, 2, 10, 4);
    else P.cfg[key] = clampMin(value, 1, 180, PD.cfg[key]);
    if (!P.running) P.remain = dur(P.mode);
    savePomo(); renderPomodoro();
}

function pComplete() {
    const finished = P.mode;
    if (finished === 'focus') { P.log.push({ t: Date.now(), min: P.cfg.focus }); P.cycle++; }
    const nxt = nextModeAfter(finished);
    P.mode = nxt; P.remain = dur(nxt); P.running = false; P.endAt = 0;
    stopTicker();
    const msg = finished === 'focus' ? '🍅 Focus session done! Time for a ' + (nxt === 'long' ? 'long' : 'short') + ' break.' : '⏰ Break over — ready to focus?';
    say(msg, 'success');
    if (P.cfg.sound) beep();
    if (P.cfg.notify && 'Notification' in window && Notification.permission === 'granted') { try { new Notification('Project Rex · Pomodoro', { body: msg }); } catch (e) { /* ignore */ } }
    savePomo();
    if (P.cfg.auto) { pStart(); } else { renderPomodoro(); }
    evaluateAchievements();
}

function ensureTicker() { if (!pTimer) pTimer = setInterval(pTick, 250); if (!baseTitle) baseTitle = document.title; }
function stopTicker() { if (pTimer) { clearInterval(pTimer); pTimer = null; } if (baseTitle) { document.title = baseTitle; baseTitle = ''; } }
function pTick() {
    if (!P.running) { stopTicker(); return; }
    const left = P.endAt - Date.now();
    if (left <= 0) { pComplete(); return; }
    document.title = '🍅 ' + fmtClock(left) + ' · ' + MODE_LABEL[P.mode];
    pUpdateDisplay(left);
}

const RING_R = 88, RING_C = 2 * Math.PI * RING_R;
function pUpdateDisplay(left) {
    const t = $('pomoTime'), ring = $('pomoRing');
    const total = dur(P.mode);
    const remain = left != null ? left : P.remain;
    if (t) t.textContent = fmtClock(remain);
    if (ring) ring.style.strokeDashoffset = String(RING_C * (1 - Math.min(1, Math.max(0, 1 - remain / total))));
}

function pStats() {
    const now = new Date();
    const ws = new Date(now.getFullYear(), now.getMonth(), now.getDate()); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
    let today = 0, weekMin = 0; const perDay = [0, 0, 0, 0, 0, 0, 0];
    P.log.forEach(x => {
        const d = new Date(x.t);
        if (sameDay(d, now)) today++;
        if (d >= ws) { weekMin += x.min || 0; const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - ws) / DAY); if (idx >= 0 && idx < 7) perDay[idx]++; }
    });
    return { today, weekMin, perDay, total: P.log.length };
}

function renderPomodoro() {
    const host = $('pomoCard'); if (!host || !P) return;
    const s = pStats();
    const inSet = P.cycle % P.cfg.every;
    const dots = Array.from({ length: P.cfg.every }, (_, i) => '<span class="r11-dot' + (i < inSet ? ' on' : '') + '"></span>').join('');
    const maxDay = Math.max(1, ...s.perDay);
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIdx = (new Date().getDay() + 6) % 7;
    const bars = s.perDay.map((n, i) => '<div class="r11-pbar" title="' + n + ' session' + (n === 1 ? '' : 's') + '"><i style="height:' + Math.max(4, Math.round(n / maxDay * 100)) + '%" class="' + (i === todayIdx ? 'today' : '') + '"></i><span>' + labels[i] + '</span></div>').join('');
    const num = (key, label, min, max) => '<label class="r11-field"><span>' + label + '</span><input type="number" min="' + min + '" max="' + max + '" value="' + P.cfg[key] + '" onchange="RexV110.pomoCfg(\'' + key + '\', this.value)"></label>';
    const sw = (key, label) => '<label class="r11-switch-row"><span>' + label + '</span><label class="switch"><input type="checkbox" ' + (P.cfg[key] ? 'checked' : '') + ' onchange="RexV110.pomoCfg(\'' + key + '\', this.checked)"><span class="slider"></span></label></label>';
    host.innerHTML =
        '<div class="card-title"><h3>🍅 Pomodoro</h3><span class="r11-muted">' + s.today + ' focus session' + (s.today === 1 ? '' : 's') + ' today</span></div>' +
        '<div class="r11-pomo-body">' +
            '<div class="r11-pomo-timer">' +
                '<svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true"><circle cx="100" cy="100" r="' + RING_R + '" fill="none" stroke="var(--border)" stroke-width="10"/><circle id="pomoRing" cx="100" cy="100" r="' + RING_R + '" fill="none" stroke="' + (P.mode === 'focus' ? 'var(--rex-accent,var(--blue))' : 'var(--green)') + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + RING_C.toFixed(2) + '" style="stroke-dashoffset:' + RING_C.toFixed(2) + ';transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .25s linear"/></svg>' +
                '<div class="r11-pomo-center"><div id="pomoTime" aria-live="off">' + fmtClock(P.remain) + '</div><small>' + MODE_LABEL[P.mode] + '</small></div>' +
            '</div>' +
            '<div class="r11-pomo-side">' +
                '<div class="r11-modes" role="tablist">' + ['focus', 'short', 'long'].map(m => '<button type="button" role="tab" aria-selected="' + (P.mode === m) + '" class="appearance-tab' + (P.mode === m ? ' active' : '') + '" onclick="RexV110.pomoMode(\'' + m + '\')">' + MODE_LABEL[m] + '</button>').join('') + '</div>' +
                '<div class="r11-actions">' +
                    (P.running ? '<button class="sbtn primary" onclick="RexV110.pomoPause()">⏸ Pause</button>' : '<button class="sbtn primary" onclick="RexV110.pomoStart()">▶ ' + (P.remain < dur(P.mode) ? 'Resume' : 'Start') + '</button>') +
                    '<button class="sbtn" onclick="RexV110.pomoSkip()" title="Skip to the next phase">⏭ Skip</button>' +
                    '<button class="sbtn" onclick="RexV110.pomoReset()">↺ Reset</button>' +
                '</div>' +
                '<div class="r11-cycle"><span>Session ' + (inSet + 1) + ' of ' + P.cfg.every + '</span>' + dots + '</div>' +
                '<div class="r11-backup-grid">' +
                    '<div class="r11-mini"><b>' + s.today + '</b><span>Today</span></div>' +
                    '<div class="r11-mini"><b>' + Math.floor(s.weekMin / 60) + 'h ' + (s.weekMin % 60) + 'm</b><span>Focus this week</span></div>' +
                    '<div class="r11-mini"><b>' + s.total + '</b><span>All-time sessions</span></div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="r11-pbars" aria-label="Focus sessions this week">' + bars + '</div>' +
        '<details class="r11-details"><summary>⚙️ Pomodoro settings</summary><div class="r11-settings-grid">' +
            num('focus', 'Focus (min)', 1, 180) + num('short', 'Short break (min)', 1, 60) + num('long', 'Long break (min)', 1, 120) + num('every', 'Long break every', 2, 10) +
            sw('auto', 'Start the next phase automatically') + sw('sound', 'Play a sound when a phase ends') + sw('notify', 'Show a desktop notification') +
        '</div><p class="r11-muted">Focus sessions are counted separately from the Dev Clock above. The timer keeps running when you switch pages.</p></details>';
    pUpdateDisplay();
}

/* =====================================================================
   INSTALLABLE APP (PWA)
   ===================================================================== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; setCfg({ installed: true }); renderInstall(); say('📲 Rex is installed!', 'success'); evaluateAchievements(); });

function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    Promise.resolve(deferredPrompt.userChoice).catch(() => {}).then(() => { deferredPrompt = null; renderInstall(); });
}
function renderInstall() {
    const host = $('rexInstallCard'); if (!host) return;
    const web = /^https?:$/.test(location.protocol);
    let body;
    if (isStandalone()) body = '<p>✅ Rex is running as an installed app.</p>';
    else if (deferredPrompt) body = '<p class="r11-muted">Install Rex to open it from your desktop, dock, or home screen in its own window. It also keeps working offline.</p><div class="r11-actions"><button class="sbtn primary" onclick="RexV110.installApp()">📲 Install Rex</button></div>';
    else if (!web) body = '<p class="r11-muted">Installing works on the hosted website (the GitHub Pages address), not when this page is opened straight from a file.</p>';
    else body = '<p class="r11-muted"><b>Chrome / Edge:</b> click the install icon in the address bar, or open the browser menu and choose <i>Install Project Rex</i>.<br><b>iPhone / iPad (Safari):</b> tap Share, then <i>Add to Home Screen</i>.<br><b>Android (Chrome):</b> menu, then <i>Install app</i>.</p>';
    host.innerHTML = '<div class="card-title"><h3>📲 Install Rex as an app</h3></div>' + body;
}
function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
            const nw = reg.installing; if (!nw) return;
            nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) say('⬇️ A new version of Rex was downloaded. Reload the page to use it.', 'info'); });
        });
    }).catch(err => console.warn('Rex: service worker not registered', err));
}

/* =====================================================================
   public API + start-up
   ===================================================================== */
window.RexV110 = {
    renderBackup, backupNow,
    setAutoBackup: v => { setCfg({ autoBackup: !!v }); renderBackup(); if (v) { autoBackup(false); refreshBackupViews(); } },
    setRemind: v => { setCfg({ remindDays: Number(v) || 0 }); renderBackup(); },
    renderAchievements, setAchFilter,
    renderPomodoro, pomoStart: pStart, pomoPause: pPause, pomoReset: pReset, pomoSkip: pSkip, pomoMode: pSetMode, pomoCfg: pCfg,
    installApp, renderInstall
};

function boot() {
    try { migratePoints(); } catch (e) { console.warn('Rex: restore point cleanup skipped', e); }
    try {
        if (window.RexV101 && typeof RexV101.exportBackup === 'function' && !RexV101.__v110wrapped) {
            const orig = RexV101.exportBackup;
            RexV101.exportBackup = function () { const r = orig.apply(this, arguments); markDownloaded(); return r; };
            RexV101.__v110wrapped = true;
        }
    } catch (e) { console.warn('Rex: export hook skipped', e); }
    try { loadPomo(); if (P.running) { if (P.endAt - Date.now() <= 0) pComplete(); else ensureTicker(); } renderPomodoro(); } catch (e) { console.warn('Rex: Pomodoro failed to start', e); }
    try { renderInstall(); registerServiceWorker(); } catch (e) { console.warn('Rex: install card skipped', e); }
    try { evaluateAchievements(); } catch (e) { console.warn('Rex: achievements skipped', e); }
    setTimeout(() => { try { if (autoBackup(false)) refreshBackupViews(); else renderBackup(); maybeRemind(); } catch (e) { console.warn('Rex: backup check skipped', e); } }, 4000);
    setInterval(() => { try { if (autoBackup(false)) refreshBackupViews(); evaluateAchievements(); } catch (e) { /* keep running */ } }, 5 * 60000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
