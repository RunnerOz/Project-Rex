/* Project Rex Center V14.1.0 · Home "Jump back in" row (free, local).
   Shows your pinned pages first, then the pages you opened most recently, as big tap targets on Home. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let host = null;
  function paint() {
    const home = document.getElementById('view-home'); if (!home || !window.RexNav || !RexNav.quick) return;
    const items = RexNav.quick();
    if (!host || !host.isConnected) { host = document.createElement('section'); host.id = 'quickAccess'; host.className = 'qa'; host.setAttribute('aria-label', 'Jump back in'); const w = home.querySelector('.home-welcome'); if (w) w.insertAdjacentElement('afterend', host); else home.insertBefore(host, home.firstChild); }
    if (!items.length) { host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML = '<div class="qa-h"><b>Jump back in</b><small>Your pinned and recent pages</small><button type="button" class="qa-all" data-qa="all">All features</button></div><div class="qa-row" role="list">' +
      items.map(x => '<button type="button" role="listitem" class="qa-i" data-qa="' + E(x.id) + '"><span class="qa-ico" aria-hidden="true">' + x.ico + '</span><span class="qa-t">' + E(x.short.length > 14 ? x.label.slice(0, 14) : x.short) + '</span>' + (x.fav ? '<span class="qa-pin" title="Pinned" aria-hidden="true">📌</span>' : '') + '</button>').join('') + '</div>';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#quickAccess [data-qa]'); if (!b) return; e.preventDefault();
    if (b.dataset.qa === 'all') { try { RexNav.find(false); } catch (er) { /* ignore */ } return; }
    const x = RexNav.quick().find(i => i.id === b.dataset.qa); if (x) { try { x.run(); } catch (er) { /* ignore */ } }
  });
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'home') setTimeout(paint, 0); } catch (e) { /* ignore */ } return r; };
  setTimeout(paint, 400); window.addEventListener('load', () => setTimeout(paint, 900));
  window.RexQuick = { paint };
})();
