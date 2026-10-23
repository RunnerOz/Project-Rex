/* Project Rex Center 12.12.3 - Update timeline (free, local).
   A visual list of the updates you have installed on this device, newest first: version and name, date and time, what it came from, how big it was,
   and what changed. It only READS data Rex already keeps (rex115_installs, written by the Update Center, plus the built-in release notes).
   Nothing is stored by this file and nothing is sent anywhere. Only installs Rex recorded appear, so it never invents history. */
(function () {
  'use strict';
  const P = window.RexLogParts; if (!P) return;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SHOW = 6; let all = false; const open = new Set();
  const nameOf = v => { try { return releaseName(v) || ''; } catch (e) { return ''; } };
  const rel = v => P.CHANGELOG.find(r => r.version === v) || null;
  const dShort = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const tShort = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const month = t => new Date(t).toLocaleDateString([], { month: 'long', year: 'numeric' });
  function ago(t) { const m = Math.round((Date.now() - t) / 60000); if (m < 2) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); if (d < 31) return d + (d === 1 ? ' day ago' : ' days ago'); const mo = Math.round(d / 30.4); return mo < 12 ? mo + (mo === 1 ? ' month ago' : ' months ago') : Math.round(d / 365 * 10) / 10 + ' years ago'; }
  function installs() {
    let a = []; try { a = JSON.parse(localStorage.getItem('rex115_installs') || '[]'); } catch (e) {} if (!Array.isArray(a)) a = [];
    const out = []; a.forEach(x => { if (!x || typeof x !== 'object' || !/^\d+\.\d+\.\d+$/.test(String(x.version)) || !(+x.at > 0)) return; out.push({ version: String(x.version), from: /^\d+\.\d+\.\d+$/.test(String(x.from || '')) ? String(x.from) : '', at: +x.at, secs: Math.max(0, Math.round(+x.secs || 0)), count: Math.max(1, Math.min(99, Math.round(+x.count || 1))), back: x.how === 'goback' }); });
    out.sort((p, q) => q.at - p.at); return out.filter((x, i) => !i || !(x.version === out[i - 1].version && x.at === out[i - 1].at));
  }
  function firstSeen() { try { const t = +localStorage.getItem('rex110_first_seen'); return t > 0 && t < Date.now() + 864e5 ? t : 0; } catch (e) { return 0; } }
  const TAG = { feature: ['✨', 'New'], improve: ['🎨', 'Improved'], fix: ['🛠️', 'Fixed'], removed: ['🗑️', 'Removed'] };
  function details(v) {
    const r = rel(v); if (!r) return '<p class="utl-none">The notes for this version are not stored in this copy of Rex.</p>';
    const items = (r.items || []).filter(i => i && i.text).slice(0, 8);
    return (r.summary ? '<p class="utl-sum">' + E(r.summary) + '</p>' : '') + '<ul class="utl-ch">' + items.map(i => { const t = TAG[i.type] || TAG.improve; return '<li><span class="utl-tag t-' + E(i.type) + '">' + t[0] + ' ' + t[1] + '</span> ' + E(i.text) + '</li>'; }).join('') + '</ul>' + ((r.items || []).length > 8 ? '<p class="utl-none">+ ' + ((r.items || []).length - 8) + ' more in the Update Log</p>' : '');
  }
  function entry(x, i, cur) {
    const r = rel(x.version), nm = nameOf(x.version), big = r && (r.size === 'big' || r.size === 'major'), isOpen = open.has(x.version + '@' + x.at);
    const meta = [dShort(x.at) + ' · ' + tShort(x.at), ago(x.at)]; if (x.from) meta.push((x.back ? 'back from' : 'from') + ' v' + x.from);
    return '<li class="utl-it' + (cur ? ' now' : '') + (x.back ? ' back' : '') + '"><span class="utl-dot" aria-hidden="true">' + (x.back ? '↩' : cur ? '★' : '') + '</span><div class="utl-body">' +
      '<div class="utl-h"><b>v' + E(x.version) + '</b>' + (nm ? '<span class="utl-nm">' + E(nm) + '</span>' : '') + (cur ? '<span class="utl-bd you">YOU ARE HERE</span>' : '') + (x.back ? '<span class="utl-bd warn">WENT BACK</span>' : '') + (big ? '<span class="utl-bd big">BIG UPDATE</span>' : '') + (x.count > 1 ? '<span class="utl-bd">' + x.count + ' UPDATES AT ONCE</span>' : '') + '</div>' +
      '<div class="utl-m">' + meta.map(E).join(' · ') + (x.secs ? ' · took ' + (x.secs < 60 ? x.secs + 's' : Math.floor(x.secs / 60) + 'm ' + (x.secs % 60) + 's') : '') + '</div>' +
      (r && r.summary && !isOpen ? '<div class="utl-s">' + E(r.summary) + '</div>' : '') +
      '<div class="utl-a"><button type="button" class="sbtn" data-utl="toggle" data-k="' + E(x.version + '@' + x.at) + '" aria-expanded="' + isOpen + '">' + (isOpen ? 'Hide changes' : 'What changed') + '</button>' + (r ? '<button type="button" class="sbtn" data-utl="trailer" data-v="' + E(x.version) + '">▶ Trailer</button>' : '') + '</div>' +
      (isOpen ? '<div class="utl-d">' + details(x.version) + '</div>' : '') + '</div></li>';
  }
  function build() {
    const list = installs(), first = firstSeen(), cur = list.findIndex(x => x.version === APP_VERSION);
    const rows = list.slice(); let ghost = null;
    if (cur < 0) { const r = rel(APP_VERSION); ghost = { version: APP_VERSION, from: '', at: r && Date.parse(r.date) > 0 ? Date.parse(r.date) : Date.now(), secs: 0, count: 1, back: false, ghost: true }; }
    const shown = all ? rows : rows.slice(0, SHOW);
    let html = '<div class="card-title"><h3>🕘 Update timeline</h3></div><p class="set-note">Every update you installed on this device, newest first. Only installs Rex recorded are listed, and nothing is invented.</p>';
    html += '<div class="utl-stats"><div><b>' + list.length + '</b><small>updates installed here</small></div><div><b>' + (first ? dShort(first) : (list.length ? dShort(list[list.length - 1].at) : '—')) + '</b><small>' + (first ? 'with Rex since' : 'first recorded install') + '</small></div><div><b>v' + E(APP_VERSION) + '</b><small>' + E(nameOf(APP_VERSION) || 'running now') + '</small></div></div>';
    if (!rows.length) html += '<ol class="utl">' + entry(ghost, 0, true).replace('utl-it now', 'utl-it now ghost') + '</ol><p class="utl-empty">Your timeline starts here. Each update you install from the Update Center will be added with its date and what changed.</p>';
    else {
      html += '<ol class="utl">'; let lastM = '';
      if (ghost) html += entry(ghost, 0, true);
      shown.forEach((x, i) => { const m = month(x.at); if (m !== lastM) { html += '<li class="utl-mo" aria-hidden="true">' + E(m) + '</li>'; lastM = m; } html += entry(x, i, cur >= 0 && i === cur); });
      html += '</ol>';
      if (rows.length > SHOW) html += '<div class="utl-more"><button type="button" class="btn btn-sm" data-utl="all">' + (all ? 'Show fewer' : 'Show all ' + rows.length + ' updates') + '</button></div>';
      if (rows.length >= 30) html += '<p class="utl-empty">Rex keeps the 30 most recent installs.</p>';
    }
    return html;
  }
  function card() {
    const st = $('view-settings'); if (!st) return null; const base = st.querySelector(':scope > .card[data-sec="app"]'); if (!base) return null;
    let c = $('utlCard'); if (!c) { c = document.createElement('div'); c.className = 'card'; c.id = 'utlCard'; c.dataset.sec = 'app'; c.style.display = base.style.display; c.addEventListener('click', onClick); }
    const anchor = $('trCard') || $('rexUpdateCard'); if (anchor && anchor.parentNode === st && c.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', c); else if (!c.parentNode) base.insertAdjacentElement('afterend', c);
    return c;
  }
  function paint() { try { const c = card(); if (c) c.innerHTML = build(); } catch (e) { console.error('Update timeline', e); } }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-utl]'); if (!b) return; const a = b.dataset.utl;
    if (a === 'toggle') { const k = b.dataset.k; if (open.has(k)) open.delete(k); else open.add(k); paint(); }
    else if (a === 'all') { all = !all; paint(); }
    else if (a === 'trailer') { try { if (window.RexTrailer) RexTrailer.play(b.dataset.v, 1); } catch (er) {} }
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'settings') { paint(); setTimeout(paint, 900); } } catch (e) { console.error('Update timeline', e); } return r; };
  setTimeout(paint, 3300);
  window.RexTimeline = { installs, paint, state: () => ({ shown: all, open: [...open] }) };
})();
