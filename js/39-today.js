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
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>', note: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6"/>', grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'
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
    const hr = new Date().getHours();
    return { next, queued: sched.length, fm, q, coins, hello: hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening' };
  }
  function tile(ic, label, big, sub, view, extra) { return '<button type="button" class="td-tile" data-td="' + view + '"' + (extra || '') + '><span class="td-ic">' + svg(ic) + '</span><span class="td-l">' + label + '</span><b>' + big + '</b><small>' + sub + '</small></button>'; }
  function paint() {
    let el = $('rexToday');
    if (!el) { el = document.createElement('section'); el.id = 'rexToday'; el.className = 'td'; el.setAttribute('aria-label', 'Today'); }
    const w = home.querySelector('.home-welcome'); if (w && el.previousElementSibling !== w) w.insertAdjacentElement('afterend', el); else if (!w && !el.parentNode) home.insertBefore(el, home.firstElementChild);
    const d = data(), now = new Date();
    el.innerHTML = '<div class="td-head"><div><span class="td-kick">TODAY</span><h3>' + E(d.hello) + '</h3></div><time datetime="' + now.toISOString() + '">' + E(now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) + '</time></div>' +
      '<div class="td-tiles">' +
      tile('cal', 'Next message', d.next ? E(until(+d.next.when)) : 'Nothing queued', d.next ? E(new Date(+d.next.when).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + (d.queued > 1 ? ' · +' + (d.queued - 1) + ' more' : '') : 'Open Schedule to add one', 'schedule') +
      tile('clock', 'Focus today', E(fmtMin(d.fm)), d.fm ? 'Nice. Keep it going' : 'Start a quiet 25 minutes', 'focusrooms') +
      (d.q ? tile('flag', 'Quests', d.q.done + ' of ' + d.q.total, d.q.streak ? '🔥 ' + d.q.streak + '-day streak' : 'Finish them for a bonus', 'quests') : '') +
      (d.coins != null ? tile('coin', 'Coins', String(d.coins), 'Spend them in Rex\'s Room', 'room') : '') + '</div>' +
      '<div class="td-actions" role="group" aria-label="Quick actions"><button type="button" class="btn btn-primary" data-td="builder">' + svg('send') + 'New message</button><button type="button" class="btn btn-secondary" data-td="#focus">' + svg('clock') + 'Focus 25 min</button><button type="button" class="btn btn-secondary" data-td="#note">' + svg('note') + 'Quick note</button><button type="button" class="btn btn-secondary" data-td="#apps">' + svg('grid') + 'All pages</button></div>';
  }
  home.addEventListener('click', e => {
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
  window.RexToday = { paint, data };
})();
