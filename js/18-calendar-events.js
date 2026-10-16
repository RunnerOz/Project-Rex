/* Project Rex Center 12.6.0 - Live Events on the Holiday Calendar.
   Shows every Live Event on the Holiday Center calendar: a small coloured bar on each day an event runs, the event's emoji
   on its first day, a "Live Events this month" list under the calendar, and event details when you pick a day.
   It only READS the Live Events calendar and your event progress; it never changes them. The one setting it saves is
   the show/hide switch, in its own key (rex126_calev). Dates follow this device's clock, like Live Events itself. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const K = 'rex126_calev';
  const grid = $('holCal'); if (!grid || !window.RexEvents) return;
  const on = () => { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } };
  const setOn = v => { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) {} };
  const p2 = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const fd = d => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function instances(y) { try { return RexEvents.allInst(new Date(y, 6, 1)).filter(i => !i.def.hidden); } catch (e) { return []; } }
  function statusOf(i) { const n = Date.now(); return n < i.start.getTime() ? 'Upcoming' : n <= i.end.getTime() ? 'Live now' : 'Ended'; }
  function onDay(list, d) { const a = sod(d).getTime(), b = a + 86400000 - 1; return list.filter(i => i.start.getTime() <= b && i.end.getTime() >= a); }
  function progress(i) { try { const h = i.def.hunt; if (!h) return ''; const f = ((RexEvents._state().P.items[i.id]) || []).length; return f ? 'Found ' + f + ' of ' + h.n + ' ' + h.many : ''; } catch (e) { return ''; } }

  function shownMonth() { const b = grid.querySelector('.hol-day[data-date]'); if (!b) return null; const [y, m] = b.dataset.date.split('-').map(Number); return { y, m: m - 1 }; }

  function toggle() {
    if ($('holEvToggle')) { $('holEvToggle').querySelector('input').checked = on(); return; }
    const leg = $('holLegend'); if (!leg) return;
    const l = document.createElement('label'); l.id = 'holEvToggle'; l.className = 'hol-evtoggle';
    l.innerHTML = '<input type="checkbox"> <span>Show Live Events on the calendar</span>';
    l.querySelector('input').checked = on();
    l.querySelector('input').addEventListener('change', e => { setOn(e.target.checked); decorate(); });
    leg.parentNode.insertBefore(l, leg);
  }

  function decorate() {
    try {
      toggle();
      const mm = shownMonth(); if (!mm) return;
      const show = on();
      grid.querySelectorAll('.hol-evs').forEach(n => n.remove());
      const leg = $('holLegend'); document.querySelectorAll('.hol-evlist').forEach(n => n.remove());
      if (!show) { document.querySelectorAll('#holCalSelected .hol-evsel').forEach(n => n.remove()); return; }
      const list = instances(mm.y);
      grid.querySelectorAll('.hol-day[data-date]').forEach(btn => {
        const [y, m, d] = btn.dataset.date.split('-').map(Number), date = new Date(y, m - 1, d), evs = onDay(list, date);
        if (!evs.length) return;
        const row = document.createElement('span'); row.className = 'hol-evs'; row.setAttribute('aria-hidden', 'true');
        evs.slice(0, 3).forEach(i => {
          const first = sod(i.start).getTime() === date.getTime(), c = (i.def.c && i.def.c[1]) || '#8b5cf6', it = document.createElement('i');
          if (first) { it.className = 'hol-evm'; it.textContent = i.def.emoji; } else { it.className = 'hol-evb'; }
          it.style.setProperty('--c', c); row.appendChild(it);
        });
        if (evs.length > 3) { const more = document.createElement('i'); more.className = 'hol-evmore'; more.textContent = '+' + (evs.length - 3); row.appendChild(more); }
        btn.appendChild(row);
        btn.classList.add('has-ev');
        btn.setAttribute('aria-label', (btn.getAttribute('aria-label') || '') + '. Live Events: ' + evs.map(i => i.def.name).join(', '));
      });
      // list under the calendar
      const first = new Date(mm.y, mm.m, 1), last = new Date(mm.y, mm.m + 1, 0, 23, 59, 59);
      const month = list.filter(i => i.start <= last && i.end >= first).sort((a, b) => a.start - b.start);
      if (leg) {
        const box = document.createElement('div'); box.className = 'hol-evlist'; box.id = 'holEvList';
        box.innerHTML = '<strong>🎟️ Live Events this month</strong>' + (month.length ? month.map(i => {
          const jump = i.start < first ? first : sod(i.start), st = statusOf(i);
          return '<button type="button" class="hol-legend-item hol-evitem" data-evday="' + key(jump) + '"><span>' + E(i.def.emoji) + '</span><span><b>' + E(i.def.name) + '</b><small>' + E(fd(i.start) + ' – ' + fd(i.end)) + ' · ' + st + '</small></span><span aria-hidden="true">›</span></button>';
        }).join('') : '<div class="hol-legend-empty">No Live Events this month.</div>');
        leg.insertAdjacentElement('afterend', box);
      }
      decorateSelected();
    } catch (e) { console.warn('Calendar events skipped:', e); }
  }

  function decorateSelected() {
    const sel = $('holCalSelected'); if (!sel) return;
    sel.querySelectorAll('.hol-evsel').forEach(n => n.remove());
    if (!on() || !sel.dataset.date) return;
    const [y, m, d] = sel.dataset.date.split('-').map(Number); if (!y) return;
    const evs = onDay(instances(y), new Date(y, m - 1, d));
    if (!evs.length) return;
    const wrap = document.createElement('div'); wrap.className = 'hol-evsel';
    wrap.innerHTML = '<div class="hol-evsel-h">🎟️ Live Events on this day</div>' + evs.map(i => {
      const st = statusOf(i), pr = progress(i);
      return '<article class="hol-selected-item hol-evcard" style="--c:' + E((i.def.c && i.def.c[1]) || '#8b5cf6') + '"><span class="hol-selected-emoji">' + E(i.def.emoji) + '</span><div class="hol-selected-copy"><strong>' + E(i.def.name) + '</strong>' +
        '<small>' + E(i.def.tag || 'Live Event') + ' · ' + E(fd(i.start) + ' – ' + fd(i.end)) + ' · <b class="hol-evst ' + (st === 'Live now' ? 'live' : '') + '">' + st + '</b></small>' +
        '<p>' + E(i.def.desc || '') + '</p>' + (pr ? '<p class="hol-evpr">' + E(pr) + '</p>' : '') +
        '<div class="hol-selected-actions"><button type="button" class="sbtn" data-evopen="' + E(i.id) + '">Open in Live Events</button></div></div></article>';
    }).join('');
    sel.appendChild(wrap);
  }

  /* day list refresh whenever the calendar grid is redrawn (month change, Today, settings, first open) */
  new MutationObserver(() => decorate()).observe(grid, { childList: true });
  const origDay = window.holCalendarDay;
  if (typeof origDay === 'function') window.holCalendarDay = function () { const r = origDay.apply(this, arguments); try { decorateSelected(); } catch (e) {} return r; };

  document.addEventListener('click', e => {
    const o = e.target.closest && e.target.closest('[data-evopen]');
    if (o) { RexEvents.open(o.dataset.evopen); return; }
    const j = e.target.closest && e.target.closest('[data-evday]');
    if (j && typeof window.holCalendarDay === 'function') window.holCalendarDay(j.dataset.evday);
  });
  decorate();
  window.RexCalEvents = { decorate };
})();
