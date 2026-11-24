/* Project Rex Center V14.1.0 · Update Center extras (free, local).
   Added under the status banner in Settings → App & Updates:
   1. "Ready to update?" safety check: backup, saved-data check, free space and connection, with a one-tap backup. Rex also saves a restore point by itself right before any install.
   2. A live countdown to the next release when one has been announced (the same announcement Home shows).
   3. "Search every update": type a word and see which releases mentioned it.
   It only reads what Rex already keeps and never installs or downloads anything. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kb = n => n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n >= 1048576 ? Math.round(n / 1048576) + ' MB' : Math.round(n / 1024) + ' KB';
  let busy = false, free = null, q = '', tick = null;
  const card = () => document.getElementById('rexUpdateCard');
  const st = () => { try { return RexUpd.state(); } catch (e) { return {}; } };

  function checks() {
    const out = [], bk = (() => { try { return RexV110.backupStatus(); } catch (e) { return null; } })();
    if (bk) {
      const ok = bk.state === 'ok';
      out.push({ ok, t: ok ? 'Backup is fresh' : bk.state === 'overdue' ? 'Backup is getting old' : bk.state === 'failed' ? 'Last backup failed' : 'No backup yet', d: bk.lastOk ? 'Last good backup: ' + new Date(bk.lastOk).toLocaleString() : 'Back up before you update.', fix: ok ? '' : 'backup' });
    }
    let bad = 0;
    try { const s = RexHealth.scan(); bad = (s.issues || []).filter(i => i.sev === 'bad' || i.sev === 'warn').length; } catch (e) { /* ignore */ }
    out.push({ ok: !bad, t: bad ? bad + ' saved item' + (bad > 1 ? 's' : '') + ' need a look' : 'Saved data is readable', d: bad ? 'Open Data Health and press Repair first.' : 'Every saved item passed the scan.', fix: bad ? 'health' : '' });
    if (free != null) out.push({ ok: free > 30 * 1048576, t: free > 30 * 1048576 ? 'Enough free space' : 'Free space is low', d: kb(free) + ' available in this browser.', fix: '' });
    out.push({ ok: navigator.onLine !== false, t: navigator.onLine !== false ? 'Connected' : 'You are offline', d: navigator.onLine !== false ? 'Rex can reach the website.' : 'Connect to the internet to download an update.', fix: '' });
    return out;
  }
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + 'd ' : '') + h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s % 60).padStart(2, '0') + 's'; };

  function readyHTML() {
    const c = checks(), good = c.every(x => x.ok), s = st(), avail = !!s.available;
    return '<div class="up-card"><div class="up-h"><span aria-hidden="true">' + (good ? '🛡️' : '⚠️') + '</span><div><b>' + (good ? (avail ? 'Ready to update' : 'Everything looks healthy') : 'Take a minute before updating') + '</b><small>Rex saves a restore point by itself right before any install, and you can always go back.</small></div></div>' +
      '<div class="up-list">' + c.map(x => '<div class="up-r ' + (x.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (x.ok ? '✅' : '⚠️') + '</span><div><b>' + E(x.t) + '</b><small>' + E(x.d) + '</small></div>' + (x.fix ? '<button type="button" class="sbtn" data-up="' + x.fix + '">' + (x.fix === 'backup' ? (busy ? 'Saving…' : 'Back up now') : 'Open') + '</button>' : '') + '</div>').join('') + '</div></div>';
  }
  function nextHTML() {
    let n = null; try { n = window.RexNextUpdate && RexNextUpdate.current(); } catch (e) { /* ignore */ }
    const d = n && (n.data || n); if (!d || !d.at || !d.version) return '';
    const left = d.at - Date.now();
    return '<div class="up-card up-next"><div class="up-h"><span aria-hidden="true">⏳</span><div><b>' + (left > 0 ? 'Next update: v' + E(d.version) : 'v' + E(d.version) + ' should be out now') + '</b><small>' + E(d.title || d.teaser || '') + '</small></div></div>' +
      (left > 0 ? '<div class="up-cd" data-at="' + d.at + '" aria-live="off">' + clock(left) + '</div><small class="up-when">Arrives ' + E(new Date(d.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '. Rex never installs by itself.</small>' : '<small class="up-when">Press Check for Updates, then Update Now.</small>') + '</div>';
  }
  function searchHTML() {
    const P = window.RexLogParts; if (!P) return '';
    let res = '';
    if (q.length >= 2) {
      const t = q.toLowerCase(), hits = [];
      P.CHANGELOG.forEach(r => (r.items || []).forEach(i => { if (i && i.text && (i.text.toLowerCase().includes(t) || (r.summary || '').toLowerCase().includes(t) && false)) hits.push([r, i]); }));
      const ICO = { feature: '✨', improve: '⚡', fix: '🔧', removed: '🧹' };
      res = hits.length ? '<ol class="up-hits">' + hits.slice(0, 12).map(([r, i]) => '<li><span aria-hidden="true">' + (ICO[i.type] || '✨') + '</span><div><small>v' + E(r.version) + (r.date ? ' · ' + E(r.date) : '') + '</small><p>' + E(i.text.length > 200 ? i.text.slice(0, 199) + '…' : i.text) + '</p></div></li>').join('') + '</ol>' + (hits.length > 12 ? '<small class="up-more">Showing 12 of ' + hits.length + '. Try a more specific word.</small>' : '') : '<p class="up-none">Nothing mentions “' + E(q) + '”. Try another word.</p>';
    }
    return '<div class="up-card"><div class="up-h"><span aria-hidden="true">🔎</span><div><b>Search every update</b><small>Find when something was added or fixed.</small></div></div><input type="search" id="upQ" class="up-q" placeholder="Try “backup”, “season” or “phone”" value="' + E(q) + '" autocomplete="off" aria-label="Search all updates">' + res + '</div>';
  }

  let drawing = false;
  function draw() {
    const host = card(); if (!host || drawing) return; drawing = true;
    try {
      let box = document.getElementById('upPlus');
      const focused = document.activeElement && document.activeElement.id === 'upQ', pos = focused ? document.activeElement.selectionStart : 0;
      if (!box || !box.isConnected) { box = document.createElement('div'); box.id = 'upPlus'; const hero = host.querySelector('.ucs-hero'); if (hero) hero.insertAdjacentElement('afterend', box); else host.appendChild(box); }
      box.innerHTML = nextHTML() + readyHTML() + searchHTML();
      const inp = box.querySelector('#upQ'); if (inp) { inp.oninput = () => { q = inp.value.trim(); draw(); }; if (focused) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }
    } catch (e) { console.error('Update plus', e); }
    drawing = false;
  }
  async function getFree() { try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e.quota) free = Math.max(0, e.quota - (e.usage || 0)); } } catch (e) { /* ignore */ } }

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#upPlus [data-up]'); if (!b) return;
    if (b.dataset.up === 'backup') { if (busy) return; busy = true; draw(); setTimeout(() => { try { RexV110.silentBackup('Before update · ' + new Date().toLocaleString()); toast('Backup saved in this browser.', 'success'); } catch (er) { toast('Backup failed. Storage may be full.', 'error'); } busy = false; draw(); }, 50); }
    else if (b.dataset.up === 'health') { try { showView('datahealth'); } catch (er) { /* ignore */ } }
  });
  /* redraw whenever the Update Center redraws itself, and keep the countdown ticking */
  const watch = () => {
    const host = card(); if (!host) return;
    new MutationObserver(() => { if (!document.getElementById('upPlus')) draw(); }).observe(host, { childList: true });
    getFree().then(draw); draw();
  };
  setInterval(() => { const el = document.querySelector('#upPlus .up-cd'); if (!el || document.hidden) return; const left = (+el.dataset.at) - Date.now(); if (left <= 0) draw(); else el.textContent = clock(left); }, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(watch, 200)); else setTimeout(watch, 200);
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); if (n === 'settings') setTimeout(() => { getFree().then(draw); draw(); }, 80); return r; };
  window.RexUpdatePlus = { draw, checks };
})();
