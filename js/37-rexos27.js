/* Project Rex Center 12.15.0 - RexOS 27 (free, local). The new look is a design layer (css/rexos27.css) plus this small helper:
   the Launchpad (every page as an app on one screen), the tab bar icons, the RexOS wordmark and the Look switch in Settings -> Appearance.
   It never touches your data. Switching to Classic only removes the html.os27 class.
   Own data: rex1500_look = "os27" (default) or "classic". */
(function () {
  'use strict';
  const K = 'rex1500_look', $ = id => document.getElementById(id), html = document.documentElement;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = () => { try { return localStorage.getItem(K) === 'classic' ? 'classic' : 'os27'; } catch (e) { return 'os27'; } };
  const say = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) { /* ignore */ } };
  const I = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const TAB = {
    home: I('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>'),
    builder: I('<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/>'),
    holidays: I('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>'),
    clock: I('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.6 1.6M9.5 3h5"/>'),
    __more: I('<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>')
  };

  /* ----- look: wordmark and tab icons follow the chosen look ----- */
  const shownNum = () => { try { return SHOWN_VERSION[APP_VERSION] || '27'; } catch (e) { return '27'; } };
  function skin() {
    const on = get() === 'os27';
    html.classList.toggle('os27', on);
    const h = document.querySelector('.sb12 .brand-text h2');
    if (h) { if (!h.dataset.orig) h.dataset.orig = h.innerHTML; h.innerHTML = on ? 'Rex<b>OS</b> ' + shownNum() : h.dataset.orig; }
    document.querySelectorAll('#rexTabbar button').forEach(b => {
      const ti = b.querySelector('.ti'); if (!ti) return; if (!ti.dataset.orig) ti.dataset.orig = ti.innerHTML;
      ti.innerHTML = on && TAB[b.dataset.view] ? TAB[b.dataset.view] : ti.dataset.orig;
    });
    const set = $('osLookCard'); if (set) set.querySelectorAll('[data-look]').forEach(b => { const o = b.dataset.look === get(); b.classList.toggle('on', o); b.setAttribute('aria-pressed', o ? 'true' : 'false'); });
  }
  function setLook(v) { try { localStorage.setItem(K, v === 'classic' ? 'classic' : 'os27'); } catch (e) { /* ignore */ } skin(); say(v === 'classic' ? 'Classic look is on.' : 'RexOS ' + shownNum() + ' is on.'); }

  /* ----- Launchpad ----- */
  let ov = null, opener = null;
  function apps() {
    const out = [];
    document.querySelectorAll('.sb12 .nav-group').forEach(g => g.querySelectorAll('.nav-item').forEach(b => {
      const label = ((b.querySelector('.nv-t') || {}).textContent || b.getAttribute('title') || '').trim(), ico = b.querySelector('.nav-ico svg');
      if (!label || !ico) return; out.push({ label, g: g.dataset.g || 'system', svg: ico.outerHTML, btn: b });
    }));
    return out;
  }
  function paint(q) {
    const grid = ov.querySelector('.lp-grid'), list = apps().filter(a => !q || a.label.toLowerCase().indexOf(q.toLowerCase()) >= 0);
    grid.innerHTML = '';
    list.forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lp-app'; b.innerHTML = '<span class="lp-tile lp-g-' + E(a.g) + '">' + a.svg + '</span><span class="lp-n">' + E(a.label) + '</span>'; b.onclick = () => { close(true); a.btn.click(); }; grid.appendChild(b); });
    ov.querySelector('.lp-empty').hidden = list.length > 0;
  }
  function build() {
    if (ov) return; ov = document.createElement('div'); ov.className = 'lp-ov'; ov.id = 'rexLaunchpad'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Launchpad');
    ov.innerHTML = '<div class="lp-top"><input type="search" id="lpSearch" placeholder="Search pages" aria-label="Search pages" autocomplete="off"><button type="button" id="lpClose" aria-label="Close Launchpad">✕</button></div><div class="lp-grid"></div><p class="lp-empty" hidden>No page matches that. Try another word.</p>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) close(); }); $('lpClose').onclick = () => close();
    $('lpSearch').addEventListener('input', e => paint(e.target.value));
    $('lpSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = ov.querySelector('.lp-app'); if (f) f.click(); } });
  }
  function open() { build(); opener = document.activeElement; $('lpSearch').value = ''; paint(''); ov.classList.add('show'); setTimeout(() => { try { $('lpSearch').focus(); } catch (e) { /* ignore */ } }, 30); }
  function close(skipFocus) { if (!ov || !ov.classList.contains('show')) return; ov.classList.remove('show'); if (!skipFocus && opener && opener.focus) { try { opener.focus(); } catch (e) { /* ignore */ } } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov && ov.classList.contains('show')) { e.preventDefault(); e.stopPropagation(); close(); } }, true);

  /* ----- pieces added to the page ----- */
  function addButton() {
    const bar = document.querySelector('.top-actions'); if (!bar || $('rexAppsBtn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.id = 'rexAppsBtn'; b.title = 'Launchpad: every page'; b.setAttribute('aria-label', 'Open Launchpad');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>';
    b.onclick = open; bar.insertBefore(b, bar.firstChild);
  }
  function addLookCard() {
    const pane = $('ap-appearance'); if (!pane || $('osLookCard')) return;
    const c = document.createElement('div'); c.className = 'card os-look-card'; c.id = 'osLookCard';
    c.innerHTML = '<div class="card-title"><h3>Look</h3></div><p class="ar-hint">Pick how Rex looks. Both show the same pages and keep all your data. In RexOS ' + shownNum() + ' the default accent swatch means amber; any other swatch you pick is used as is.</p><div class="os-look"><button type="button" class="os-opt" data-look="os27"><b>RexOS ' + shownNum() + '</b><small>Glass, a floating dock and a capsule tab bar. Launchpad shows every page.</small></button><button type="button" class="os-opt" data-look="classic"><b>Classic</b><small>The earlier layout and colors.</small></button></div>';
    pane.insertBefore(c, pane.firstChild);
    c.addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) setLook(b.dataset.look); });
    skin();
  }
  try { if (typeof COMMANDS !== 'undefined') { if (!COMMANDS.some(c => c.name === 'Open Launchpad')) COMMANDS.push({ name: 'Open Launchpad', run: open }); if (!COMMANDS.some(c => c.name === 'Look: Classic')) COMMANDS.push({ name: 'Look: Classic', run: () => setLook('classic') }, { name: 'Look: RexOS 27', run: () => setLook('os27') }); } } catch (e) { /* ignore */ }
  const prev = window.showView; if (typeof prev === 'function') window.showView = function () { const r = prev.apply(this, arguments); try { addLookCard(); } catch (e) { /* ignore */ } return r; };
  /* a custom accent picked in Theme Studio still wins; the default blue is replaced by RexOS amber */
  function accent() {
    try { const a = typeof rexAp !== 'undefined' ? rexAp : null, custom = a && a.accent && a.accent.toLowerCase() !== '#5b9fff';
      if (custom) { html.style.setProperty('--os-accent', a.accent); html.style.setProperty('--os-accent-2', a.accent2 || a.accent); } else { html.style.removeProperty('--os-accent'); html.style.removeProperty('--os-accent-2'); } } catch (e) { /* ignore */ }
  }
  const prevAp = window.applyAppearance; if (typeof prevAp === 'function') window.applyAppearance = function () { const r = prevAp.apply(this, arguments); accent(); return r; };
  addButton(); addLookCard(); skin(); accent();
  window.RexOS = { look: get, setLook, openLaunchpad: open, closeLaunchpad: close, apps };
})();
