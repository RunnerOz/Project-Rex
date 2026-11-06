/* Project Rex Center V13.6.0 · Home and Dashboard layout, and "recent pages" for the Launchpad.
   Only moves existing cards into two tidy columns and adds section titles. Nothing is removed and no data is touched. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const MAIN = ['#rexToday', '.home-info-grid', '.home-actions-card'];
  const SIDE = ['#rexDayCard', '#holidayBanner', '#rexEvCard', '#rexIntelligencePanel', '.home-bottom', '#rmHome'];
  const FULL = ['#msHome', '#nuHome', '#wzHome', '.home-welcome', '#botAlert'];

  function layoutHome() {
    const v = $('view-home'); if (!v) return;
    let main = v.querySelector(':scope > .hm-main'), side = v.querySelector(':scope > .hm-side');
    if (!main) { main = document.createElement('div'); main.className = 'hm-main'; side = document.createElement('div'); side.className = 'hm-side'; v.appendChild(main); v.appendChild(side); }
    v.classList.add('hm-grid');
    const put = (sels, box) => {
      const els = sels.map(sel => v.querySelector(':scope > ' + sel) || v.querySelector(sel)).filter(e => e && (e.parentElement === v || e.parentElement === main || e.parentElement === side));
      const cur = Array.from(box.children).filter(c => els.indexOf(c) >= 0);
      const ok = els.length === cur.length && els.every((e, i) => e === cur[i]) && els.every(e => e.parentElement === box);
      if (!ok) els.forEach(e => box.appendChild(e));   /* appending in list order also sorts them */
    };
    put(MAIN, main); put(SIDE, side);
    /* anything else a feature adds later stays full width above the columns */
    Array.from(v.children).forEach(c => { if (c === main || c === side) return; if (main.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) v.insertBefore(c, main); });
    /* keep the greeting hero first among full-width items */
  }
  function layoutDash() {
    const v = $('view-dashboard'); if (!v || v.classList.contains('dh-grid')) return;
    v.classList.add('dh-grid');
    const head = (txt, before) => { if (!before || v.querySelector('[data-dh="' + txt + '"]')) return; const h = document.createElement('h2'); h.className = 'dh-title'; h.dataset.dh = txt; h.textContent = txt; v.insertBefore(h, before); };
    const kids = Array.from(v.children);
    const stats = kids.find(k => k.classList.contains('stats')), wx = $('dashWeatherCard');
    const quick = kids.find(k => /Rex Quick Actions/.test(k.textContent || '') && k.classList.contains('card'));
    const g2 = kids.find(k => k.classList.contains('grid-2')), g3 = kids.find(k => k.classList.contains('grid-3'));
    if (quick) quick.classList.add('dh-qa'); if (wx) wx.classList.add('dh-wx');
    head('Your numbers', stats); head('Weather and shortcuts', wx || quick); head('Your things', g2);
  }
  function relayout() { try { layoutHome(); } catch (e) { console.warn('Home layout', e); } try { layoutDash(); } catch (e) { console.warn('Dashboard layout', e); } }

  /* recent pages for the Launchpad: remember the page names you open */
  const RK = 'rex2100_lp_recent';
  function noteView(name) {
    try {
      if (!name || name === 'home') return; const nav = document.querySelector('.sb12 .nav-item[data-view="' + name + '"]'); if (!nav) return;
      const label = (nav.dataset.lp || (nav.querySelector('.nv-t') || {}).textContent || '').trim(); if (!label) return;
      let a = []; try { a = JSON.parse(localStorage.getItem(RK) || '[]'); } catch (e) { a = []; } if (!Array.isArray(a)) a = [];
      a = a.filter(x => x !== label); a.unshift(label); localStorage.setItem(RK, JSON.stringify(a.slice(0, 8)));
    } catch (e) { /* ignore */ }
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { noteView(n); if (n === 'home' || n === 'dashboard') relayout(); } catch (e) { /* ignore */ } return r; };
  /* other features re-insert their cards when they repaint; put them back in their column */
  let queued = false;
  function watch() {
    const v = $('view-home'); if (!v || v.dataset.hmWatch) return; v.dataset.hmWatch = '1';
    new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { layoutHome(); } catch (e) { /* ignore */ } }); }).observe(v, { childList: true });
  }
  const start = () => { try { relayout(); watch(); } catch (e) { /* ignore */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 500)); else setTimeout(start, 500);
  window.RexLayout = { relayout };
})();
