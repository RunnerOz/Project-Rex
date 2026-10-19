/* Project Rex Center 12.9.8 - Update Trailer (free, local).
   The first time you open a newer version, Rex plays a short animated intro: Rex waves, the version name flies in, and the changes roll by like movie credits.
   It is skippable at any time (Skip button, Esc or a click), respects "reduce motion" (then it is a still card), never plays in automated browsers or on a brand-new
   install, never delays Rex (it appears after the page is ready) and can be turned off in Settings → App & Updates. It reads the built-in release history only.
   Own key: rex1298_trailer { last: last version it has seen, off: true when turned off }. Nothing is sent anywhere. */
(function () {
  'use strict';
  const P = window.RexLogParts; if (!P) return;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rex1298_trailer';
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const TAGS = [['feature', 'NEW'], ['improve', 'IMPROVED'], ['fix', 'FIXED'], ['removed', 'REMOVED']];
  const nameOf = v => { try { return releaseName(v) || ''; } catch (e) { return ''; } };
  let T = null;

  function entry(v) { return P.CHANGELOG.find(r => r.version === v) || null; }
  function creditsHTML(r, missed) {
    const items = (r.items || []).filter(i => i && i.text && !/^Updates still only install/i.test(i.text));
    const groups = TAGS.map(t => { const a = items.filter(i => i.type === t[0]); return a.length ? '<div class="tr-g t-' + t[0] + '"><h4>' + t[1] + '</h4>' + a.map(i => '<p>' + E(i.text) + '</p>').join('') + '</div>' : ''; }).join('');
    return (r.summary ? '<p class="tr-sum">' + E(r.summary) + '</p>' : '') + groups + (missed > 1 ? '<p class="tr-more">…and ' + (missed - 1) + ' earlier release' + (missed - 1 === 1 ? '' : 's') + ' while you were away. See them all in the Update Log.</p>' : '') + '<p class="tr-sum tr-end">Runner Oz Studio</p>';
  }
  function stop(markSeen) {
    if (!T) return; T.timers.forEach(clearTimeout); document.removeEventListener('keydown', T.onKey, true); T.ov.remove();
    const f = T.prev; T = null; try { if (f && f.focus && f.isConnected) f.focus(); } catch (e) {}
  }
  function play(version, missed, manual) {
    if (T) return; const r = entry(version); if (!r) return;
    const phone = (typeof isPhoneView === 'function') && isPhoneView(), nm = nameOf(version), still = reduced();
    const n = (r.items || []).length, roll = Math.min(24, Math.max(8, 4 + n * 1.7));
    const ov = document.createElement('div'); ov.className = 'tr-ov' + (still ? ' tr-still' : '') + (phone ? ' tr-phone' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Update trailer for version ' + version);
    ov.innerHTML = '<div class="tr-stars" aria-hidden="true"></div><button type="button" class="tr-skip" data-tr="skip">Skip ▸</button>' +
      (still
        ? '<div class="tr-card"><img src="icons/rex-mascot.svg" alt="" width="84" height="94"><h2>Project Rex Center</h2><div class="tr-ver">v' + E(version) + '</div>' + (nm ? '<div class="tr-name">' + E(nm) + '</div>' : '') + '<div class="tr-list">' + creditsHTML(r, missed) + '</div><button type="button" class="btn btn-primary" data-tr="done">Continue</button></div>'
        : '<div class="tr-scene tr-s1"><img class="tr-rex" src="icons/rex-mascot.svg" alt="" width="120" height="134"><h2>Project Rex Center</h2><p>' + (manual ? 'Trailer' : 'A new update is here') + '</p></div>' +
          '<div class="tr-scene tr-s2"><div class="tr-ver">v' + E(version) + '</div>' + (nm ? '<div class="tr-name">' + E(nm) + '</div>' : '') + '<p>' + E(r.date || '') + '</p></div>' +
          '<div class="tr-scene tr-s3"><div class="tr-roll" style="animation-duration:' + roll + 's">' + creditsHTML(r, missed) + '</div></div>' +
          '<div class="tr-scene tr-s4"><img class="tr-rex" src="icons/rex-mascot.svg" alt="" width="96" height="108"><h2>Thanks for updating!</h2><div class="tr-btns"><button type="button" class="btn btn-primary" data-tr="done">Continue</button><button type="button" class="btn btn-sm" data-tr="off">Don’t show trailers again</button></div></div>');
    document.body.appendChild(ov);
    T = { ov, timers: [], prev: document.activeElement };
    T.onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); } };
    document.addEventListener('keydown', T.onKey, true);
    ov.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-tr]'); if (b) { if (b.dataset.tr === 'off') { const s = rd(); s.off = true; wr(s); try { sync(); } catch (er) {} } stop(); } });
    if (!still) {
      const show = (cls, ms) => T && T.timers.push(setTimeout(() => { if (!T) return; T.ov.querySelectorAll('.tr-scene').forEach(s => s.classList.remove('on')); const el = T.ov.querySelector('.' + cls); if (el) el.classList.add('on'); }, ms));
      show('tr-s1', 50); show('tr-s2', 2700); show('tr-s3', 5900); show('tr-s4', 5900 + roll * 1000 + 300);
      T.timers.push(setTimeout(() => stop(), 5900 + roll * 1000 + 300 + 9000));
    }
    setTimeout(() => { try { const b = ov.querySelector('.tr-skip'); b && b.focus(); } catch (e) {} }, 60);
  }

  /* first run of a newer version -> play once. Fresh installs and automated browsers: never. */
  function maybe(tries) {
    try {
      const s = rd(), cur = APP_VERSION;
      if (s.last === cur) return;
      if (s.last && P.cmp(s.last, cur) > 0) { s.last = cur; wr(s); return; }
      if (!s.last && window.__rexFreshInstall) { s.last = cur; wr(s); return; }
      if (navigator.webdriver) return;
      if (s.off) { s.last = cur; wr(s); return; }
      if (document.querySelector('.modal-bg.show, .uc-modal-bg, .tour-ov, .wz-bg, .tr-ov')) { if ((tries || 0) < 12) setTimeout(() => maybe((tries || 0) + 1), 1500); return; }
      const missed = s.last ? P.CHANGELOG.filter(r => P.cmp(r.version, s.last) > 0 && P.cmp(r.version, cur) <= 0).length : 1;
      s.last = cur; wr(s); play(cur, Math.max(1, missed), false);
    } catch (e) { console.error('Update Trailer:', e); }
  }
  setTimeout(() => maybe(0), 1800);

  /* Settings -> App & Updates card */
  function sync() { const c = $('trOn'); if (c) c.checked = !rd().off; }
  function card() {
    if ($('trCard')) return; const st = $('view-settings'); if (!st) return;
    const base = st.querySelector(':scope > .card[data-sec="app"]'); if (!base) return;
    const c = document.createElement('div'); c.className = 'card'; c.id = 'trCard'; c.dataset.sec = 'app'; c.style.display = base.style.display;
    c.innerHTML = '<div class="card-title"><h3>🎬 Update trailer</h3></div><p class="set-note">The first time you open a newer version, Rex plays a short animated intro of what changed. You can skip it any time with Esc. Nothing is sent anywhere.</p>' +
      '<div class="set-row"><div class="set-info"><b>Play the trailer after an update</b></div><div class="set-ctl"><label class="switch"><input type="checkbox" id="trOn"><span class="slider"></span></label></div></div>' +
      '<div class="set-row"><div class="set-info"><b>Watch it again</b><small>Replays the trailer for this version.</small></div><div class="set-ctl"><button type="button" class="btn btn-sm" id="trReplay">▶ Watch trailer</button></div></div>';
    const ref = $('rexUpdateCard'); if (ref && ref.parentNode === st) ref.insertAdjacentElement('afterend', c); else base.insertAdjacentElement('afterend', c);
    $('trOn').addEventListener('change', e => { const s = rd(); s.off = !e.target.checked; wr(s); });
    $('trReplay').addEventListener('click', () => { play(APP_VERSION, 1, true); });
    sync();
  }
  setTimeout(card, 600); setTimeout(card, 3000);
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Watch the update trailer')) COMMANDS.push({ name: 'Watch the update trailer', run: () => play(APP_VERSION, 1, true) }); } catch (e) {}
  window.RexTrailer = { play: (v, m) => play(v || APP_VERSION, m || 1, true), stop: () => stop(), state: () => ({ open: !!T, saved: rd() }), maybe: () => maybe(0) };
})();
