/* Project Rex Center V11.5.2 — "Rex's day": a Home card where Rex's mood follows what you actually did today.
   Reads only data already in this browser (Dev Clock sessions, sent messages, tasks). Nothing leaves the browser. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const PET_KEY = 'rex1152_pets';
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const PEP = ['Good human. Keep going. 🐾', 'Woof! Webhooks fear you. 📡', 'Tail wag level: maximum.', 'You are doing better than you think.', 'Treat break? Deserved.', 'Rex believes in your next commit.', 'Bark bark. (That means ship it.)', 'Nap soon, build first. 😴'];

function today() {
    const now = new Date(); let focus = 0, sent = 0, open = 0, high = 0;
    const clock = lsJSON('rex_dev_clock_data', { sessions: [], activeStart: null, goalHours: 4 });
    (clock.sessions || []).forEach(s => { if (s && sameDay(new Date(s.start), now)) focus += +s.duration || 0; });
    if (clock.activeStart && sameDay(new Date(clock.activeStart), now)) focus += Date.now() - clock.activeStart;
    try { (state.workspaces || []).forEach(w => (w.history || []).forEach(h => { const t = Number(h && h.id); if (isFinite(t) && t > 1e12 && sameDay(new Date(t), now)) sent++; })); } catch (e) { /* ignore */ }
    const tasks = lsJSON('rex101_tasks', []); if (Array.isArray(tasks)) tasks.forEach(t => { if (t && !t.done) { open++; if (t.priority === 'High') high++; } });
    return { focus, sent, open, high, goal: Math.max(0.5, +clock.goalHours || 4) };
}
function mood(t) {
    const hrs = t.focus / 3600000;
    const score = Math.min(hrs / t.goal, 1) * 60 + Math.min(t.sent, 5) * 8;
    if (score >= 70) return { face: '🔥', name: 'On fire', line: 'Big day. Rex is proud.' };
    if (score >= 35) return { face: '🤩', name: 'Happy', line: 'Nice pace today.' };
    if (score > 0) return { face: '🐶', name: 'Awake', line: 'Warming up. Every bit counts.' };
    return { face: '😴', name: 'Sleepy', line: 'Quiet so far. Start the Dev Clock or send something!' };
}
const fmt = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };

function render() {
    const home = $('view-home'); if (!home) return;
    let c = $('rexDayCard');
    if (!c) { c = document.createElement('section'); c.id = 'rexDayCard'; c.className = 'rexday'; const w = home.querySelector('.home-welcome'); if (w && w.nextSibling) home.insertBefore(c, w.nextSibling); else home.appendChild(c); }
    const t = today(), m = mood(t), pct = Math.min(100, Math.round(t.focus / 3600000 / t.goal * 100)), pets = parseInt(localStorage.getItem(PET_KEY) || '0', 10) || 0;
    c.innerHTML = '<div class="rexday-face" id="rexDayFace" aria-hidden="true">' + m.face + '</div>' +
        '<div class="rexday-main"><div class="rexday-h"><b>Rex is ' + esc(m.name.toLowerCase()) + '</b><span>' + esc(m.line) + '</span></div>' +
        '<div class="rexday-bar" role="img" aria-label="Focus today ' + pct + ' percent of goal"><i style="width:' + pct + '%"></i></div>' +
        '<div class="rexday-stats"><span>⏱ ' + esc(fmt(t.focus)) + ' of ' + esc(t.goal) + 'h focus</span><span>📡 ' + t.sent + ' sent today</span><span>✅ ' + t.open + ' open task' + (t.open === 1 ? '' : 's') + (t.high ? ' (' + t.high + ' high)' : '') + '</span></div></div>' +
        '<button class="btn btn-secondary rexday-pet" id="rexDayPet" type="button">🐾 Pet Rex' + (pets ? ' · ' + pets : '') + '</button>';
    const b = $('rexDayPet');
    if (b) b.onclick = () => {
        const n = (parseInt(localStorage.getItem(PET_KEY) || '0', 10) || 0) + 1; try { localStorage.setItem(PET_KEY, String(n)); } catch (e) { /* ignore */ }
        const f = $('rexDayFace'); if (f) { f.classList.remove('bounce'); void f.offsetWidth; f.classList.add('bounce'); }
        try { toast(PEP[n % PEP.length], 'success'); } catch (e) { /* ignore */ }
        b.textContent = '🐾 Pet Rex · ' + n;
    };
}
function boot() {
    try { render(); } catch (e) { console.warn('Rex: day card skipped', e); }
    const home = $('view-home');
    if (home) new MutationObserver(() => { if (home.classList.contains('active')) { try { render(); } catch (e) { /* ignore */ } } }).observe(home, { attributes: true, attributeFilter: ['class'] });
    setInterval(() => { if (home && home.classList.contains('active') && document.visibilityState === 'visible') { try { render(); } catch (e) { /* ignore */ } } }, 60000);
}
window.RexDay = { render, today, mood };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
