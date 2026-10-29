/* Project Rex Center 12.17.0 - "Today" card at the top of Home.
   Reads numbers Rex already keeps (scheduled messages, Focus Rooms, Rex Quests, coins). It never writes anything and sends nothing.
   It sits above the existing Home cards; nothing on Home was removed or renamed. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), home = $('view-home'); if (!home) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dk = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const IC = {
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 3h6"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>', note: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6"/>', book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 4v13"/>', leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-5 6-8 9-10"/>', grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
  const until = t => { const m = Math.round((t - Date.now()) / 60000); if (m < 1) return 'any moment'; if (m < 60) return 'in ' + m + ' min'; const h = Math.floor(m / 60); if (h < 24) return 'in ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); const d = Math.floor(h / 24); return 'in ' + d + (d === 1 ? ' day' : ' days'); };
  const fmtMin = m => m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';

  function data() {
    const sched = safe(() => (ws().scheduled || []).filter(s => s && s.status === 'pending' && +s.when > Date.now() - 60000).sort((a, b) => a.when - b.when), []);
    const next = sched[0] || null;
    const fm = safe(() => { const o = JSON.parse(localStorage.getItem('rex1600_focus') || '{}'); return (Array.isArray(o.sessions) ? o.sessions : []).filter(s => s && dk(s.t) === dk()).reduce((a, s) => a + (+s.min || 0), 0); }, 0);
    const q = safe(() => { const o = RexQuests.ensure(), ids = o.day.ids, done = ids.filter(id => o.day.claimed.indexOf(id) >= 0 || RexQuests.progress('day', id).done).length; return { done, total: ids.length, streak: o.streak.last === dk() || o.streak.last === dk(Date.now() - 864e5) ? o.streak.cur : 0 }; }, null);
    const coins = safe(() => RexPlay.load().coins, null);
    const jr = safe(() => RexJournal.state(), null), gd = safe(() => RexGarden.state(), null);
    const hr = new Date().getHours();
    return { next, queued: sched.length, fm, q, coins, jr, gd, hello: hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening' };
  }
  function tile(ic, label, big, sub, view, extra) { return '<button type="button" class="td-tile" data-td="' + view + '"' + (extra || '') + '><span class="td-ic">' + svg(ic) + '</span><span class="td-l">' + label + '</span><b>' + big + '</b><small>' + sub + '</small></button>'; }
  /* ---------- Daily Plan: your top 3 for today (own data rex2002_plan = { d:{ "Y-M-D":[{id,t,x}] } }) ---------- */
  const PK = 'rex2002_plan', PMAX = 3, dkey = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function pload() { let o = null; try { o = JSON.parse(localStorage.getItem(PK) || 'null'); } catch (e) { /* ignore */ } const src = o && o.d && typeof o.d === 'object' && !Array.isArray(o.d) ? o.d : {}, d = {};
    Object.keys(src).forEach(k => { if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(k) && Array.isArray(src[k])) d[k] = src[k].filter(i => i && typeof i === 'object' && i.t).slice(0, PMAX).map((i, n) => ({ id: String(i.id || 'p' + n).slice(0, 20), t: String(i.t).slice(0, 120), x: !!i.x })); }); return { d }; }
  function psave(o) { const keep = {}; Object.keys(o.d).sort().slice(-30).forEach(k => { if (o.d[k].length) keep[k] = o.d[k]; }); try { localStorage.setItem(PK, JSON.stringify({ d: keep })); return true; } catch (e) { return false; } }
  function pmut(fn) { const o = pload(); fn(o, dkey()); psave(o); paint(true); }
  function planHtml() {
    const o = pload(), td = dkey(), items = o.d[td] || [], y = o.d[dkey(Date.now() - 864e5)] || [], undone = y.filter(i => !i.x), done = items.filter(i => i.x).length;
    return '<div class="td-plan"><div class="td-plan-h"><h4>Top 3 for today</h4><small id="tpCount">' + (items.length ? (done === items.length && items.length === PMAX ? 'All done 🎉' : done + ' of ' + items.length + ' done') : 'Pick up to 3') + '</small></div>' +
      (items.length ? '<ul class="td-plan-l">' + items.map(i => '<li class="' + (i.x ? 'x' : '') + '"><label><input type="checkbox" data-tp="tog" data-id="' + E(i.id) + '"' + (i.x ? ' checked' : '') + '><span>' + E(i.t) + '</span></label><button type="button" class="td-del" data-tp="del" data-id="' + E(i.id) + '" aria-label="Remove ' + E(i.t) + '">×</button></li>').join('') + '</ul>' : '') +
      (items.length < PMAX ? '<form class="td-plan-f" data-tp="add"><input type="text" id="tpNew" maxlength="120" placeholder="What matters today?" aria-label="Add something to today\'s top 3"><button type="submit" class="btn btn-secondary">Add</button></form>' : '') +
      (undone.length && items.length < PMAX ? '<button type="button" class="td-roll" data-tp="roll">↪ Bring ' + Math.min(undone.length, PMAX - items.length) + ' unfinished from yesterday</button>' : '') + '</div>';
  }
  function paint(force) {
    let el = $('rexToday');
    if (!el) { el = document.createElement('section'); el.id = 'rexToday'; el.className = 'td'; el.setAttribute('aria-label', 'Today'); }
    const w = home.querySelector('.home-welcome'); if (w && el.previousElementSibling !== w) w.insertAdjacentElement('afterend', el); else if (!w && !el.parentNode) home.insertBefore(el, home.firstElementChild);
    if (!force && el.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') return;   // never wipe what you are typing
    const had = document.activeElement && document.activeElement.id, d = data(), now = new Date();
    el.innerHTML = '<div class="td-head"><div><span class="td-kick">TODAY</span><h3>' + E(d.hello) + '</h3></div><time datetime="' + now.toISOString() + '">' + E(now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) + '</time></div>' +
      '<div class="td-tiles">' +
      tile('cal', 'Next message', d.next ? E(until(+d.next.when)) : 'Nothing queued', d.next ? E(new Date(+d.next.when).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + (d.queued > 1 ? ' · +' + (d.queued - 1) + ' more' : '') : 'Open Schedule to add one', 'schedule') +
      tile('clock', 'Focus today', E(fmtMin(d.fm)), d.fm ? 'Nice. Keep it going' : 'Start a quiet 25 minutes', 'focusrooms') +
      (d.q ? tile('flag', 'Quests', d.q.done + ' of ' + d.q.total, d.q.streak ? '🔥 ' + d.q.streak + '-day streak' : 'Finish them for a bonus', 'quests') : '') +
      (d.coins != null ? tile('coin', 'Coins', String(d.coins), 'Spend them in Rex\'s Room', 'room') : '') +
      (d.jr ? tile('book', 'Journal', d.jr.today ? 'Written ✓' : 'Not yet', d.jr.streak ? '🔥 ' + d.jr.streak + '-day streak' : '30 seconds, today', 'journal') : '') +
      (d.gd ? tile('leaf', 'Garden', d.gd.total ? d.gd.watered + ' of ' + d.gd.total : 'Empty', d.gd.total ? 'Plants watered today' : 'Plant your first habit', 'garden') : '') + '</div>' + planHtml() +
      '<div class="td-actions" role="group" aria-label="Quick actions"><button type="button" class="btn btn-primary" data-td="builder">' + svg('send') + 'New message</button><button type="button" class="btn btn-secondary" data-td="#focus">' + svg('clock') + 'Focus 25 min</button><button type="button" class="btn btn-secondary" data-td="#note">' + svg('note') + 'Quick note</button><button type="button" class="btn btn-secondary" data-td="#apps">' + svg('grid') + 'All pages</button></div>';
    if (force && had === 'tpNew') { const n = $('tpNew'); if (n) n.focus(); }
  }
  home.addEventListener('submit', e => { const f = e.target.closest('[data-tp=add]'); if (!f) return; e.preventDefault(); const v = $('tpNew').value.trim(); if (!v) return; pmut((o, td) => { const a = o.d[td] || (o.d[td] = []); if (a.length < PMAX) a.push({ id: 'p' + Date.now().toString(36), t: v.slice(0, 120), x: false }); }); });
  home.addEventListener('change', e => { const c = e.target.closest('[data-tp=tog]'); if (!c) return; pmut((o, td) => { const it = (o.d[td] || []).find(i => i.id === c.dataset.id); if (it) it.x = c.checked; }); try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (er) { /* ignore */ } });
  home.addEventListener('click', e => {
    const tp = e.target.closest('[data-tp]');
    if (tp && tp.closest('#rexToday')) {
      if (tp.dataset.tp === 'del') pmut((o, td) => { o.d[td] = (o.d[td] || []).filter(i => i.id !== tp.dataset.id); });
      else if (tp.dataset.tp === 'roll') pmut((o, td) => { const a = o.d[td] || (o.d[td] = []), y = (o.d[dkey(Date.now() - 864e5)] || []).filter(i => !i.x); y.forEach(i => { if (a.length < PMAX && !a.some(z => z.t === i.t)) a.push({ id: 'p' + Date.now().toString(36) + a.length, t: i.t, x: false }); }); });
      return;
    }
    const b = e.target.closest('[data-td]'); if (!b || !b.closest('#rexToday')) return; const v = b.dataset.td;
    if (v === '#note') { safe(() => RexQuick.open()); } else if (v === '#focus') { if (window.RexFocus) { showView('focusrooms'); if (!RexFocus.state().running) RexFocus.start(RexFocus.load().scene, 25); } else showView('focusrooms'); }
    else if (v === '#apps') { if (window.RexOS && RexOS.openLaunchpad) RexOS.openLaunchpad(); else if (typeof openPalette === 'function') openPalette(); }
    else showView(v);
  });
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'home') paint(); } catch (e) { console.error('Today', e); } return r; };
  setInterval(() => { try { if (home.classList.contains('active') && !document.hidden) paint(); } catch (e) { /* ignore */ } }, 60000);
  document.addEventListener('rexplay', () => { try { if (home.classList.contains('active')) paint(); } catch (e) { /* ignore */ } });
  setTimeout(() => { try { paint(); } catch (e) { console.error('Today', e); } }, 800);
  setTimeout(() => { try { paint(); } catch (e) { /* ignore */ } }, 2800);   // other cards add themselves after Rex; this keeps Today right under the welcome
  window.RexToday = { paint, data, plan: () => pload().d[dkey()] || [] };
})();
