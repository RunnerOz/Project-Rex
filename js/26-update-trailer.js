/* Project Rex Center 12.9.8 - Update Trailer (free, local).
   The first time you open a newer version, Rex plays a short animated intro: Rex waves, the version name flies in, and the changes roll by like movie credits.
   It is skippable at any time (Skip button, Esc or a click), respects "reduce motion" (then it is a still card), never plays in automated browsers or on a brand-new
   install, never delays Rex (it appears after the page is ready) and can be turned off in Settings → App & Updates. It reads the built-in release history only.
   12.12.2: story-style parts (intro, version, up to 4 highlight cards, summary, an optional "coming next" teaser and a finale), pause / back / forward / jump, an optional soft sound (off by default, made in the browser).
   Own key: rex1298_trailer { last: last version it has seen, off: true when turned off, snd: sound on }. Nothing is sent anywhere. */
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
  function stop() {
    if (!T) return; T.timers.forEach(clearTimeout); clearTimeout(T.tm); document.removeEventListener('keydown', T.onKey, true);
    try { if (T.ac) T.ac.close(); } catch (e) {} T.ov.remove();
    const f = T.prev; T = null; try { if (f && f.focus && f.isConnected) f.focus(); } catch (e) {}
  }
  const TYPE = { feature: ['✨', 'NEW', 'f'], improve: ['🎨', 'IMPROVED', 'i'], fix: ['🛠️', 'FIXED', 'x'], removed: ['🗑️', 'REMOVED', 'r'] };
  function headline(t) {
    t = String(t || '').trim().replace(/\s+/g, ' ');
    let m = /^(.{4,44}?):\s+(\S.*)$/.exec(t); if (m && !/[.!?]/.test(m[1])) return [m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)];
    m = /^(.{12,120}?[.!?])\s+(\S.*)$/.exec(t); if (m) return [m[1].replace(/\.$/, ''), m[2]];
    if (t.length <= 110) return [t.replace(/\.$/, ''), '']; const cut = t.lastIndexOf(' ', 100); return [t.slice(0, cut > 50 ? cut : 100), t.slice(cut > 50 ? cut + 1 : 100)];
  }
  function picks(r) {
    const items = (r.items || []).filter(i => i && i.text && !/^Updates still only install/i.test(i.text) && !/^(Nothing here is paid|Everything is free|Plugins are still only data)/i.test(i.text));
    const out = []; ['feature', 'improve', 'fix', 'removed'].forEach(t => items.filter(i => i.type === t).forEach(i => { if (out.length < 4) out.push(i); }));
    return { show: out, all: items, rest: items.length - out.length };
  }
  function upNext() {
    try { const o = JSON.parse(localStorage.getItem('rex129_nextupd') || 'null'), d = o && (o.data || o); if (!d || !d.version || !d.at) return null; if (P.cmp(d.version, APP_VERSION) <= 0) return null; const at = Date.parse(d.at); if (!isFinite(at) || at < Date.now()) return null;
      const phone = (typeof isPhoneView === 'function') && isPhoneView(); return { v: String(d.version), name: String((d.name && (phone ? d.name.phone : d.name.computer)) || '').slice(0, 30), title: String(d.title || '').slice(0, 90), teaser: String(d.teaser || '').replace(/<[^>]*>/g, '').slice(0, 140), at }; } catch (e) { return null; }
  }
  function tone(T0, f, d, delay) { if (!T0 || !T0.ac || !rd().snd) return; try { const c = T0.ac, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05); } catch (e) {} }
  function play(version, missed, manual) {
    if (T) return; const r = entry(version); if (!r) return;
    const phone = (typeof isPhoneView === 'function') && isPhoneView(), nm = nameOf(version), still = reduced();
    const ov = document.createElement('div'); ov.className = 'tr-ov' + (still ? ' tr-still' : '') + (phone ? ' tr-phone' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Update trailer for version ' + version);
    const pk = picks(r), nx = upNext(), scenes = [];
    let html = '<div class="tr-stars" aria-hidden="true"></div><div class="tr-neb" aria-hidden="true"></div><div class="tr-bar tb1" aria-hidden="true"></div><div class="tr-bar tb2" aria-hidden="true"></div><button type="button" class="tr-skip" data-tr="skip">Skip ▸</button>';
    if (still) {
      html += '<div class="tr-card"><img src="icons/rex-mascot.svg" alt="" width="84" height="94"><h2>Project Rex Center</h2><div class="tr-ver">v' + E(version) + '</div>' + (nm ? '<div class="tr-name">' + E(nm) + '</div>' : '') + '<div class="tr-list">' + creditsHTML(r, missed) + '</div><button type="button" class="btn btn-primary" data-tr="done">Continue</button></div>';
    } else {
      scenes.push({ cls: 'tr-s1', ms: 2700, html: '<div class="tr-scene tr-s1"><img class="tr-rex" src="icons/rex-mascot.svg" alt="" width="120" height="134"><h2>Project Rex Center</h2><p>' + (manual ? 'Trailer' : 'A new update is here') + '</p></div>' });
      scenes.push({ cls: 'tr-s2', ms: 3300, html: '<div class="tr-scene tr-s2"><div class="tr-glow" aria-hidden="true"></div><div class="tr-ver">v' + E(version) + '</div>' + (nm ? '<div class="tr-name">' + E(nm) + '</div>' : '') + '<p>' + E(r.date || '') + '</p></div>' });
      pk.show.forEach((i, n) => { const ty = TYPE[i.type] || TYPE.improve, h = headline(i.text); scenes.push({ cls: 'tr-hl', ms: 3300, html: '<div class="tr-scene tr-s3 tr-hl ty-' + ty[2] + '"><div class="tr-hlc"><div class="tr-hli" aria-hidden="true">' + ty[0] + '</div><div class="tr-hlt">' + ty[1] + ' · ' + (n + 1) + ' of ' + pk.show.length + '</div><h3>' + E(h[0]) + '</h3>' + (h[1] ? '<p>' + E(h[1].length > 200 ? h[1].slice(0, 197).replace(/\s+\S*$/, '') + '…' : h[1]) + '</p>' : '') + '</div></div>' }); });
      const cnt = t => pk.all.filter(i => i.type === t).length, chips = [['feature', '✨', 'new'], ['improve', '🎨', 'improved'], ['fix', '🛠️', 'fixed'], ['removed', '🗑️', 'removed']].filter(c => cnt(c[0])).map(c => '<span class="tr-chip"><b>' + cnt(c[0]) + '</b> ' + c[1] + ' ' + c[2] + '</span>').join('');
      scenes.push({ cls: 'tr-sm', ms: 3600, html: '<div class="tr-scene tr-s5 tr-sm"><h2>' + (pk.rest > 0 ? 'Plus ' + pk.rest + ' more' : 'That is the update') + '</h2><div class="tr-chips">' + chips + '</div>' + (r.summary ? '<p class="tr-sumq">' + E(r.summary) + '</p>' : '') + (missed > 1 ? '<p class="tr-more">…and ' + (missed - 1) + ' earlier release' + (missed - 1 === 1 ? '' : 's') + ' while you were away. See them all in the Update Log.</p>' : '') + '</div>' });
      if (nx) scenes.push({ cls: 'tr-nx', ms: 3600, html: '<div class="tr-scene tr-s6 tr-nx"><div class="tr-k">COMING NEXT</div><div class="tr-ver tr-ver-s">v' + E(nx.v) + '</div>' + (nx.name ? '<div class="tr-name tr-name-s">' + E(nx.name) + '</div>' : '') + (nx.title ? '<h3>' + E(nx.title) + '</h3>' : '') + (nx.teaser ? '<p>' + E(nx.teaser) + '</p>' : '') + '<p class="tr-when">' + E(new Date(nx.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</p></div>' });
      let conf = ''; for (let k = 0; k < 16; k++) conf += '<i style="left:' + (4 + k * 6) + '%;animation-delay:' + ((k * 0.37) % 2.4).toFixed(2) + 's">' + ['🎉', '✨', '🎊', '⭐'][k % 4] + '</i>';
      scenes.push({ cls: 'tr-s4', ms: 9000, last: true, html: '<div class="tr-scene tr-s4"><div class="tr-conf" aria-hidden="true">' + conf + '</div><img class="tr-rex" src="icons/rex-mascot.svg" alt="" width="96" height="108"><h2>Thanks for updating!</h2><div class="tr-btns"><button type="button" class="btn btn-primary" data-tr="done">Continue</button><button type="button" class="btn btn-sm" data-tr="off">Don’t show trailers again</button></div></div>' });
      html += scenes.map(x => x.html).join('') +
        '<div class="tr-prog" role="group" aria-label="Trailer progress">' + scenes.map((x, i) => '<button type="button" class="tr-seg" data-tr-go="' + i + '" aria-label="Go to part ' + (i + 1) + ' of ' + scenes.length + '"><i></i></button>').join('') + '</div>' +
        '<div class="tr-ctl"><button type="button" class="tr-cb" data-tr="prev" aria-label="Previous">◀</button><button type="button" class="tr-cb" data-tr="pause" aria-label="Pause">❚❚</button><button type="button" class="tr-cb" data-tr="next" aria-label="Next">▶</button><button type="button" class="tr-cb" data-tr="snd" aria-pressed="' + !!rd().snd + '" aria-label="Sound">' + (rd().snd ? '🔊' : '🔇') + '</button></div><div class="tr-hint" aria-hidden="true">← → move · Space pause · Esc skip</div>';
    }
    ov.innerHTML = html; document.body.appendChild(ov);
    T = { ov, timers: [], prev: document.activeElement, i: -1, scenes, paused: false, left: 0, t0: 0, tm: 0, ac: null };
    const els = () => Array.from(T.ov.querySelectorAll('.tr-scene')), segs = () => Array.from(T.ov.querySelectorAll('.tr-seg'));
    function go(i) {
      if (!T || !scenes.length) return; i = Math.max(0, Math.min(scenes.length - 1, i)); clearTimeout(T.tm); T.i = i; const sc = scenes[i];
      els().forEach((e, n) => e.classList.toggle('on', n === i));
      segs().forEach((g, n) => { g.classList.toggle('done', n < i); g.classList.toggle('cur', n === i); const f = g.firstChild; f.style.transition = 'none'; f.style.width = n < i ? '100%' : '0'; if (n === i) { void f.offsetWidth; f.style.transition = 'width ' + sc.ms + 'ms linear'; f.style.width = '100%'; } });
      T.ov.classList.toggle('tr-lastscene', !!sc.last); T.left = sc.ms; T.t0 = Date.now(); tone(T, 520 + i * 60, 0.35); if (sc.last) { tone(T, 784, 0.4, 0.1); tone(T, 988, 0.5, 0.25); }
      if (!T.paused) arm();
    }
    function arm() { clearTimeout(T.tm); T.t0 = Date.now(); T.tm = setTimeout(() => { if (!T) return; if (T.i >= scenes.length - 1) stop(); else go(T.i + 1); }, T.left); }
    function pause(on) { if (!T) return; T.paused = on; T.ov.classList.toggle('paused', on); const b = T.ov.querySelector('[data-tr="pause"]'); if (b) { b.textContent = on ? '▶' : '❚❚'; b.setAttribute('aria-label', on ? 'Play' : 'Pause'); } const cur = segs()[T.i]; if (on) { clearTimeout(T.tm); T.left = Math.max(300, T.left - (Date.now() - T.t0)); if (cur) { const w = cur.firstChild.getBoundingClientRect().width / cur.getBoundingClientRect().width * 100; cur.firstChild.style.transition = 'none'; cur.firstChild.style.width = w + '%'; } } else { if (cur) { void cur.firstChild.offsetWidth; cur.firstChild.style.transition = 'width ' + T.left + 'ms linear'; cur.firstChild.style.width = '100%'; } arm(); } }
    T.onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); return; }
      if (still) return; if (e.key === 'ArrowRight') { e.preventDefault(); go(T.i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(T.i - 1); } else if ((e.key === ' ' || e.code === 'Space') && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); pause(!T.paused); }
    };
    document.addEventListener('keydown', T.onKey, true);
    ov.addEventListener('click', e => {
      const g = e.target.closest && e.target.closest('[data-tr-go]'); if (g) { go(+g.dataset.trGo); return; }
      const b = e.target.closest && e.target.closest('[data-tr]');
      if (b) { const a = b.dataset.tr;
        if (a === 'prev') go(T.i - 1); else if (a === 'next') go(T.i + 1); else if (a === 'pause') pause(!T.paused);
        else if (a === 'snd') { const s = rd(); s.snd = !s.snd; wr(s); b.textContent = s.snd ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(!!s.snd)); if (s.snd && !T.ac) { try { T.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (er) {} tone(T, 660, 0.3); } }
        else { if (a === 'off') { const s = rd(); s.off = true; wr(s); try { sync(); } catch (er) {} } stop(); }
        return; }
      if (!still && !(e.target.closest && e.target.closest('button'))) { const x = e.clientX / innerWidth; if (x > 0.7) go(T.i + 1); else if (x < 0.3) go(T.i - 1); }
    });
    if (!still) { const s0 = rd(); if (s0.snd) { try { T.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } T.timers.push(setTimeout(() => go(0), 50)); }
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
