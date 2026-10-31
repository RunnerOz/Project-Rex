/* Project Rex Center 13.1.0 - Hubs: three sidebar entries (Seasons & Quests, Play, Daily) instead of twelve. Every page still exists and opens exactly as before
   (showView, search, palette, Launchpad, links). A bar of tabs above the page lets you move between the pages of a hub. Nothing was removed or renamed in your data. */
(function () {
  'use strict';
  const HUBS = {
    sq: { name: 'Seasons & Quests', home: 'quests', tabs: [['quests', 'Quests'], ['events', 'Live Events'], ['holidays', 'Holidays'], ['insider', 'Insider']] },
    play: { name: 'Play', home: 'arcade', tabs: [['arcade', 'Arcade'], ['room', "Rex's Room"], ['pals', 'Pals'], ['story', 'Story']] },
    daily: { name: 'Daily', home: 'focusrooms', tabs: [['focusrooms', 'Focus Rooms'], ['reminders', 'Reminders'], ['journal', 'Journal'], ['garden', 'Habit Garden']] }
  };
  const hubOf = {}; Object.keys(HUBS).forEach(h => HUBS[h].tabs.forEach(t => { hubOf[t[0]] = h; }));
  const main = document.querySelector('main.main'), top = main && main.querySelector('.topbar'); if (!main || !top) return;
  const bar = document.createElement('nav'); bar.id = 'hubBar'; bar.className = 'hub-bar'; bar.hidden = true; top.insertAdjacentElement('afterend', bar);
  let cur = '';
  function paint(view) {
    const h = hubOf[view]; document.querySelectorAll('.nav-item[data-hub]:not(.hub-hide)').forEach(b => { const on = !!h && b.dataset.hub === h; if (on) b.classList.add('active'); b.toggleAttribute('data-hubon', on); });
    if (!h) { bar.hidden = true; cur = ''; return; }
    bar.hidden = false; bar.setAttribute('aria-label', HUBS[h].name + ' pages');
    if (cur !== h) { cur = h; bar.innerHTML = '<span class="hub-name">' + HUBS[h].name.replace('&', '&amp;') + '</span>' + HUBS[h].tabs.map(t => '<button type="button" class="hub-tab" data-hv="' + t[0] + '">' + t[1].replace('&', '&amp;') + '</button>').join(''); }
    bar.querySelectorAll('.hub-tab').forEach(b => { const on = b.dataset.hv === view; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  bar.addEventListener('click', e => { const b = e.target.closest('[data-hv]'); if (b) showView(b.dataset.hv); });
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { paint(n); } catch (e) { console.error('Hubs', e); } return r; };
  window.RexHubs = { hubs: HUBS, hubOf: v => hubOf[v] || '', paint };
})();
