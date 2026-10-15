/* Project Rex Center V12.1.0 — Favorites: pin your most-used pages to the top of the sidebar.
   Only writes rex121_favs (a list of page names). Pinning never changes the pages themselves. Alt+1 … Alt+8 open the first eight favorites. */
(function () {
  'use strict';
  const K = 'rex121_favs', MAX = 8;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const items = () => Array.from(document.querySelectorAll('.nav-groups .nav-group[data-g]:not([data-g="favs"]) .nav-item[data-view]'));
  const info = {}; items().forEach(b => { info[b.dataset.view] = { label: (b.querySelector('.nv-t') || b).textContent.trim(), icon: (b.querySelector('.nav-ico') || {}).innerHTML || '' }; });
  let favs = (() => { try { const v = JSON.parse(localStorage.getItem(K)); return Array.isArray(v) ? v.filter((x, i, a) => typeof x === 'string' && info[x] && a.indexOf(x) === i).slice(0, MAX) : []; } catch (_) { return []; } })();
  const save = () => { try { localStorage.setItem(K, JSON.stringify(favs)); } catch (_) {} };

  const STAR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z"/></svg>';
  // wrap each real nav item in a row so a pin button can sit beside it (never inside another button)
  items().forEach(b => {
    const row = document.createElement('div'); row.className = 'nav-row'; b.parentNode.insertBefore(row, b); row.appendChild(b);
    const pin = document.createElement('button'); pin.type = 'button'; pin.className = 'nav-pin'; pin.dataset.pin = b.dataset.view; pin.innerHTML = STAR; row.appendChild(pin);
  });
  const nav = document.querySelector('.nav-groups');
  let group = null;
  function ensureGroup() {
    if (group) return group;
    group = document.createElement('div'); group.className = 'nav-group'; group.dataset.g = 'favs';
    group.innerHTML = '<button class="nav-group-h" type="button" aria-expanded="true" aria-controls="ng-favs"><span>Favorites</span><svg class="chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="nav-group-b" id="ng-favs"></div>';
    nav.insertBefore(group, nav.firstChild); return group;
  }
  function paint() {
    document.querySelectorAll('.nav-pin').forEach(p => {
      const on = favs.indexOf(p.dataset.pin) >= 0, name = (info[p.dataset.pin] || {}).label || p.dataset.pin;
      p.classList.toggle('on', on); p.setAttribute('aria-pressed', String(on)); p.setAttribute('aria-label', (on ? 'Unpin ' : 'Pin ') + name + (on ? ' from Favorites' : ' to Favorites')); p.title = on ? 'Unpin from Favorites' : 'Pin to Favorites';
    });
    if (!favs.length) { if (group) group.hidden = true; return; }
    const g = ensureGroup(); g.hidden = false;
    const cur = (document.querySelector('.view.active') || {}).id; const curName = cur ? cur.replace('view-', '') : '';
    $('ng-favs').innerHTML = favs.map((v, i) => '<div class="nav-row"><button class="nav-item' + (v === curName ? ' active' : '') + '" type="button" data-view="' + esc(v) + '" data-fav="1" title="' + esc(info[v].label) + (i < 8 ? ' (Alt+' + (i + 1) + ')' : '') + '"><span class="nav-ico">' + info[v].icon + '</span><span class="nv-t">' + esc(info[v].label) + '</span></button><button type="button" class="nav-pin on" data-pin="' + esc(v) + '" aria-pressed="true" aria-label="Unpin ' + esc(info[v].label) + ' from Favorites" title="Unpin from Favorites">' + STAR + '</button></div>').join('');
  }
  function toggle(v) {
    if (!info[v]) return false; const i = favs.indexOf(v);
    if (i >= 0) favs.splice(i, 1); else { if (favs.length >= MAX) { try { toast('You can pin up to ' + MAX + ' favorites. Unpin one first.', 'info'); } catch (_) {} return false; } favs.push(v); }
    save(); paint(); return true;
  }
  document.addEventListener('click', e => {
    const p = e.target.closest && e.target.closest('.nav-pin'); if (p) { e.preventDefault(); e.stopPropagation(); toggle(p.dataset.pin); return; }
    const f = e.target.closest && e.target.closest('.nav-item[data-fav]'); if (f) { showView(f.dataset.view); }
  }, true);
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return; const m = /^Digit([1-8])$/.exec(e.code); if (!m) return;
    const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (document.querySelector('.uc-modal-bg, .modal-bg.open, .modal-bg.show')) return;
    const v = favs[+m[1] - 1]; if (v) { e.preventDefault(); showView(v); }
  });
  function current() { const c = (document.querySelector('.view.active') || {}).id; return c ? c.replace('view-', '') : ''; }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function () { const r = prev.apply(this, arguments); try { document.querySelectorAll('#ng-favs .nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === current())); } catch (_) {} return r; };
  paint();
  window.RexFav = { list: () => favs.slice(), toggle, toggleCurrent: () => { const v = current(); if (!info[v]) { try { toast('This page cannot be pinned.', 'info'); } catch (_) {} return false; } const r = toggle(v); try { toast((favs.indexOf(v) >= 0 ? 'Pinned ' : 'Unpinned ') + info[v].label, 'success'); } catch (_) {} return r; } };
})();
