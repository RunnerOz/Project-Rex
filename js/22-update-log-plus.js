/* Project Rex Center 12.9.0 - Update Log redesign.
   A featured latest-release card, real totals, filters with counts, releases grouped by month, collapsible release cards with
   highlighted search matches, and a calmer look that is light enough for phones (no per-card banners, no blur layers).
   It only READS the built-in release history and the "seen releases" list; the one thing it writes is that same seen list when you open a release,
   exactly as the old log did. Nothing is sent anywhere. */
(function () {
  'use strict';
  const P = window.RexLogParts, view = document.getElementById('view-changelog');
  if (!P || !view) return;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOG = P.CHANGELOG, BATCH = 8;
  const TYPES = [['feature', '✨', 'New'], ['improve', '🎨', 'Improved'], ['fix', '🛠️', 'Fixed'], ['removed', '↘️', 'Removed']];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const st = { type: 'all', unseen: false, limit: BATCH, open: {}, sig: '' };
  /* crash guard (12.9.6): a flag is set while the log is being drawn and cleared a moment later. If the page was killed in between (some phones do that),
     the next visit starts in light mode with fewer releases and no extras. The flag is its own small key and holds no user data. */
  const GUARD = 'rex1296_ulguard'; let lite = false, drawing = false, autoOpen = 0;
  try { lite = !!localStorage.getItem(GUARD); } catch (e) {}
  const batch = () => lite ? 4 : BATCH;
  const guardOn = () => { try { localStorage.setItem(GUARD, String(Date.now())); } catch (e) {} };
  const guardOff = () => { try { localStorage.removeItem(GUARD); } catch (e) {} };
  const nameOf = v => { try { const n = RELEASE_NAMES[v]; return n ? (isPhoneView() ? n.phone : n.computer) : ''; } catch (e) { return ''; } };
  const monthOf = r => { const d = Date.parse(r.date || ''); if (!Number.isFinite(d)) return null; const x = new Date(d); return { k: x.getFullYear() * 12 + x.getMonth(), t: MONTHS[x.getMonth()] + ' ' + x.getFullYear() }; };
  const anchor = v => 'update-' + String(v).replace(/[^a-zA-Z0-9.-]/g, '');
  const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const s = t.slice(0, n); let dot = -1; const re = /[.!?](\s|$)/g; let m; while ((m = re.exec(s))) dot = m.index; if (dot > 40) return s.slice(0, dot + 1); return s.replace(/[\s,;:.\-\u2013]+\S*$/, '') + '\u2026'; };

  /* a brand-new visitor has an empty seen-list: do not flag all 70+ old releases as NEW (display only, nothing is written) */
  function seenSet() { const s = new Set(P.getSeen()); if (!s.size) LOG.slice(3).forEach(r => s.add(r.version)); return s; }

  function build() {
    if (view.dataset.ul) return; view.dataset.ul = '1'; view.classList.add('ul');
    view.innerHTML =
      '<header class="ul-hero"><div class="ul-hero-t"><span class="ul-kicker">RUNNER OZ STUDIO · RELEASE NOTES</span><h2>Update Log <span id="rexUpdateLogVersion" class="ul-vnum"></span></h2><p>Everything that changed in Project Rex Center: new features, improvements and fixes.</p></div>' +
      '<div class="ul-run"><span class="ul-dot" aria-hidden="true"></span><div><strong id="rexUpdateLogCurrent">V</strong><small id="rexUpdateLogStatus"></small></div><button type="button" class="btn btn-sm" id="ulUpd">Update Center</button></div></header>' +
      '<div class="ul-stats" role="list"><div class="ul-stat" role="listitem"><b id="ulN">0</b><small>Releases</small></div>' +
      TYPES.slice(0, 3).map(t => '<div class="ul-stat t-' + t[0] + '" role="listitem"><b data-update-count="' + t[0] + '">0</b><small>' + t[1] + ' ' + (t[0] === 'fix' ? 'Fixes' : t[0] === 'feature' ? 'New features' : 'Improvements') + '</small></div>').join('') + '</div>' +
      '<div id="rexFeaturedRelease" class="ul-latest"></div>' +
      '<div class="ul-bar"><div class="ul-search"><span aria-hidden="true">🔍</span><input id="changelogSearch" type="search" placeholder="Search updates, e.g. backup, tour, 12.7…" aria-label="Search updates" autocomplete="off"></div>' +
      '<div id="changelogFilters" class="ul-chips" role="group" aria-label="Filter by type"></div>' +
      '<div class="ul-tools"><button type="button" class="ul-chip" id="rexUnseenFilter" aria-pressed="false">✦ Since my last visit</button><button type="button" class="ul-chip" id="ulAll">Expand all</button><button type="button" class="ul-chip" id="rexRefreshUpdateLog" title="Rebuild the release list from the bundled release history">↻ Refresh</button></div></div>' +
      '<p class="ul-count" id="ulCount" aria-live="polite"></p><div id="changelogTimeline" class="ul-tl"></div>' +
      '<details class="ul-ach" id="ulAch"><summary>🏆 Update Achievements <span id="rexAchievementProgress"></span></summary><div id="rexAchievementsGrid" class="rex-achievements-grid" aria-live="polite"></div></details>';
    $('ulUpd').onclick = () => { try { showView('settings'); RexV111.settingsTab('app'); } catch (e) {} };
    $('changelogSearch').addEventListener('input', () => window.renderChangelogSoon());
    $('rexUnseenFilter').onclick = () => { st.unseen = !st.unseen; window.renderChangelog(); };
    $('rexRefreshUpdateLog').onclick = e => { window.renderChangelog(); const b = e.currentTarget; b.textContent = '✓ Refreshed'; setTimeout(() => { if (b.isConnected) b.textContent = '↻ Refresh'; }, 1200); };
    $('ulAll').onclick = e => { const some = e.currentTarget.dataset.mode !== 'collapse'; document.querySelectorAll('#changelogTimeline .ul-rel').forEach(a => setOpen(a, some)); syncAll(); };
    view.addEventListener('click', onClick);
  }

  function setOpen(art, open) {
    const body = art.querySelector('.ul-body'), btn = art.querySelector('.ul-head'); if (!body) return;
    body.hidden = !open; btn.setAttribute('aria-expanded', String(open)); art.classList.toggle('is-open', open); st.open[art.dataset.releaseVersion] = open;
    if (open) { fillBody(art); P.markSeen(art.dataset.releaseVersion); art.querySelectorAll('.ul-new').forEach(n => n.remove()); }
  }
  /* release details are only built when a card is opened, so a long list stays light on phones */
  function fillBody(art) {
    const body = art.querySelector('.ul-body'); if (!body || !body.hasAttribute('data-lazy')) return;
    body.removeAttribute('data-lazy'); const r = LOG.find(x => x.version === art.dataset.releaseVersion); if (!r) return;
    const q = (($('changelogSearch') || {}).value || '').toLowerCase().trim();
    body.insertAdjacentHTML('afterbegin', mkGroups(visibleItems(r, q), q));
  }
  function syncAll() { const b = $('ulAll'); if (!b) return; const arts = document.querySelectorAll('#changelogTimeline .ul-rel'), all = arts.length && [...arts].every(a => a.classList.contains('is-open')); b.textContent = all ? 'Collapse all' : 'Expand all'; b.dataset.mode = all ? 'collapse' : 'expand'; }

  function onClick(e) {
    const t = e.target.closest && e.target.closest('button, a'); if (!t) return;
    const art = t.closest('.ul-rel'), ver = (art && art.dataset.releaseVersion) || t.dataset.ver, idx = LOG.findIndex(r => r.version === ver);
    if (t.classList.contains('ul-head')) { setOpen(art, art.querySelector('.ul-body').hidden); syncAll(); }
    else if (t.dataset.ulAct === 'detail' && idx >= 0) P.openReleaseDetails(LOG[idx], LOG.length - idx, LOG[idx].items);
    else if (t.dataset.ulAct === 'copy' && ver) P.copyReleaseLink(ver);
    else if (t.dataset.ulAct === 'full') { lite = false; st.limit = BATCH; window.renderChangelog(); }
    else if (t.dataset.ulAct === 'more') { st.limit += batch(); window.renderChangelog(); }
    else if (t.dataset.ulAct === 'rest') { st.limit = 9999; window.renderChangelog(); }
    else if (t.dataset.ulAct === 'clear') { $('changelogSearch').value = ''; st.type = 'all'; st.unseen = false; window.renderChangelog(); }
    else if (t.dataset.ulAct === 'latest') { const a = document.querySelector('#changelogTimeline .ul-rel.is-latest') || document.querySelector('#changelogTimeline .ul-rel'); if (a) { setOpen(a, true); a.scrollIntoView({ behavior: 'smooth', block: 'start' }); syncAll(); } }
  }

  const visibleItems = (r, q) => r.items.filter(i => (st.type === 'all' || i.type === st.type) && (!q || i.text.toLowerCase().includes(q) || r.version.includes(q) || (r.summary || '').toLowerCase().includes(q) || nameOf(r.version).toLowerCase().includes(q)));
  const mkGroups = (items, q) => TYPES.map(t => { const a = items.filter(i => i.type === t[0]); return a.length ? '<section class="ul-g t-' + t[0] + '"><h4><span aria-hidden="true">' + t[1] + '</span> ' + t[2] + ' <small>' + a.length + '</small></h4><ul>' + a.map(i => '<li>' + hl(i.text, q) + '</li>').join('') + '</ul></section>' : ''; }).join('');
  const hl = (text, q) => { const s = E(text); if (!q) return s; const re = new RegExp('(' + E(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); return s.replace(re, '<mark>$1</mark>'); };

  function featured(seen) {
    const host = $('rexFeaturedRelease'), r = LOG[0]; if (!host || !r) return;
    const nm = nameOf(r.version), feats = r.items.filter(i => i.type === 'feature').slice(0, 3);
    let pub = null; try { const l = JSON.parse(localStorage.getItem('rex115_latest') || 'null'); if (l && l.version && P.cmp(l.version, APP_VERSION) > 0) pub = l.version; } catch (e) {}
    host.innerHTML = '<div class="ul-lat-i" aria-hidden="true">' + E(r.icon || '📝') + '</div><div class="ul-lat-b"><span class="ul-kicker">LATEST RELEASE' + (r.version === APP_VERSION ? ' · YOU ARE RUNNING IT' : '') + '</span>' +
      '<h3>v' + E(r.version) + (nm ? ' <span class="ul-name">' + E(nm) + '</span>' : '') + '</h3><small>' + E((r.date || 'Date not recorded') + (r.time ? ' · ' + r.time : '')) + ' · ' + r.items.length + ' change' + (r.items.length === 1 ? '' : 's') + '</small>' +
      (r.summary ? '<p>' + E(r.summary) + '</p>' : '') + (feats.length ? '<ul>' + feats.map(f => '<li>' + E(clip(f.text, isPhoneView() ? 110 : 170)) + '</li>').join('') + '</ul>' : '') +
      (pub ? '<p class="ul-pub">⬆ v' + E(pub) + ' is published. Open the Update Center to install it when you are ready.</p>' : '') +
      '<div class="ul-act"><button type="button" class="btn btn-primary btn-sm" data-ul-act="latest">Read the notes</button><button type="button" class="btn btn-sm" data-ul-act="detail" data-ver="' + E(r.version) + '">Full release page</button><button type="button" class="btn btn-sm" data-ul-act="copy" data-ver="' + E(r.version) + '">Copy link</button></div></div>';
  }

  function release(r, idx, q, seen) {
    const items = r.items.filter(i => (st.type === 'all' || i.type === st.type) && (!q || i.text.toLowerCase().includes(q) || r.version.includes(q) || (r.summary || '').toLowerCase().includes(q) || nameOf(r.version).toLowerCase().includes(q)));
    if (!items.length) return null;
    const nm = nameOf(r.version), isNew = idx > 0 && !seen.has(r.version), open = st.open[r.version] != null ? st.open[r.version] : (!!q && autoOpen++ < 3);
    const counts = TYPES.map(t => [t, r.items.filter(i => i.type === t[0]).length]).filter(x => x[1]);
    const head = r.summary || clip((r.items.find(i => i.type === 'feature') || r.items[0] || {}).text, 120);
    const groups = open ? mkGroups(items, q) : '';
    const art = document.createElement('article');
    art.className = 'ul-rel rex-update-version-card' + (open ? ' is-open' : '') + (idx === 0 ? ' is-latest' : ''); art.dataset.releaseVersion = r.version; art.id = anchor(r.version);
    const bid = 'ulb-' + anchor(r.version);
    art.innerHTML = '<button type="button" class="ul-head" aria-expanded="' + open + '" aria-controls="' + bid + '"><span class="ul-ic" aria-hidden="true">' + E(r.icon || '📝') + '</span><span class="ul-ht"><span class="ul-t"><b>v' + E(r.version) + '</b>' + (nm ? ' <span class="ul-name">' + E(nm) + '</span>' : '') +
      (idx === 0 ? ' <span class="ul-badge latest">LATEST</span>' : '') + (isNew ? ' <span class="ul-badge ul-new">NEW</span>' : '') + (r.size === 'major' ? ' <span class="ul-badge major">MAJOR</span>' : r.size === 'big' ? ' <span class="ul-badge big">BIG</span>' : '') + '</span>' +
      '<small class="ul-d">' + E((r.date || 'Date not recorded') + (r.time ? ' · ' + r.time : '')) + '</small></span>' +
      '<span class="ul-cn" aria-label="' + counts.map(c => c[1] + ' ' + c[0][2]).join(', ') + '">' + counts.map(c => '<span class="t-' + c[0][0] + '">' + c[0][1] + ' ' + c[1] + '</span>').join('') + '</span><span class="ul-chev" aria-hidden="true">▾</span></button>' +
      '<p class="ul-sum">' + hl(head, q) + '</p>' +
      '<div class="ul-body" id="' + bid + '"' + (open ? '' : ' hidden data-lazy="1"') + '>' + groups + '<div class="ul-act"><button type="button" class="btn btn-sm" data-ul-act="detail">Full release page</button><button type="button" class="btn btn-sm" data-ul-act="copy">🔗 Copy link</button></div></div>';
    return art;
  }

  function draw() {
    build();
    const tl = $('changelogTimeline'); if (!tl) return;
    const q = ($('changelogSearch').value || '').toLowerCase().trim(), seen = seenSet();
    // header + totals (real data)
    const running = typeof APP_VERSION !== 'undefined' ? APP_VERSION : LOG[0].version, rr = LOG.find(r => r.version === running) || LOG[0];
    $('rexUpdateLogVersion').textContent = running; $('rexUpdateLogCurrent').textContent = releaseLabel(running);
    let pub = ''; try { const l = JSON.parse(localStorage.getItem('rex115_latest') || 'null'); if (l && l.version && P.cmp(l.version, running) > 0) pub = ' · v' + l.version + ' is published'; } catch (e) {}
    $('rexUpdateLogStatus').textContent = 'Running release' + (rr.date ? ' · ' + rr.date + (rr.time ? ' · ' + rr.time : '') : '') + pub;
    const tot = { feature: 0, improve: 0, fix: 0, removed: 0 }; LOG.forEach(r => r.items.forEach(i => { if (i.type in tot) tot[i.type]++; }));
    $('ulN').textContent = LOG.length; document.querySelectorAll('[data-update-count]').forEach(n => { n.textContent = tot[n.dataset.updateCount] || 0; });
    featured(seen); const fh = $('rexFeaturedRelease'); if (fh) fh.hidden = !!(q || st.type !== 'all' || st.unseen);
    // filter chips with the number of matching changes (given the search text)
    const base = LOG.flatMap(r => r.items.filter(i => !q || i.text.toLowerCase().includes(q) || r.version.includes(q) || (r.summary || '').toLowerCase().includes(q)));
    const cf = $('changelogFilters'); cf.innerHTML = '';
    [['all', '', 'All', base.length]].concat(TYPES.map(t => [t[0], t[1] + ' ', t[2], base.filter(i => i.type === t[0]).length])).forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ul-chip' + (st.type === c[0] ? ' on' : ''); b.dataset.filter = c[0]; b.setAttribute('aria-pressed', String(st.type === c[0]));
      b.innerHTML = c[1] + c[2] + ' <small>' + c[3] + '</small>'; b.onclick = () => { st.type = c[0]; window.renderChangelog(); }; cf.appendChild(b);
    });
    const nUnseen = LOG.filter(r => !seen.has(r.version)).length, ub = $('rexUnseenFilter');
    ub.classList.toggle('on', st.unseen); ub.setAttribute('aria-pressed', String(st.unseen)); ub.innerHTML = '✦ Since my last visit' + (nUnseen ? ' <small>' + nUnseen + '</small>' : '');
    const sig = st.type + '|' + q + '|' + st.unseen; if (sig !== st.sig) { st.sig = sig; st.limit = batch(); st.open = {}; }
    try { const m = /^#update-(.+)$/.exec(location.hash || ''); if (m) { const di = LOG.findIndex(r => anchor(r.version) === 'update-' + m[1]); if (di >= st.limit) st.limit = di + 1; if (di >= 0 && st.open[LOG[di].version] == null) st.open[LOG[di].version] = true; } } catch (e) {}
    // releases, grouped by month
    tl.innerHTML = ''; autoOpen = 0; let matched = 0, drawn = 0, hidden = 0, lastMonth = undefined, group = null;
    const frag = document.createDocumentFragment();
    LOG.forEach((r, idx) => {
      if (st.unseen && seen.has(r.version)) return;
      const hasHit = r.items.some(i => (st.type === 'all' || i.type === st.type) && (!q || i.text.toLowerCase().includes(q) || r.version.includes(q) || (r.summary || '').toLowerCase().includes(q) || nameOf(r.version).toLowerCase().includes(q)));
      if (!hasHit) return; matched++;
      if (drawn >= st.limit) { hidden++; return; }
      const el = release(r, idx, q, seen); if (!el) return; drawn++;
      const mo = monthOf(r), key = mo ? mo.k : 'old';
      if (key !== lastMonth) { lastMonth = key; group = document.createElement('section'); group.className = 'ul-month'; group.innerHTML = '<h3>' + E(mo ? mo.t : 'Earlier releases') + '</h3>'; frag.appendChild(group); }
      group.appendChild(el);
    });
    if (lite) { const ln = document.createElement('div'); ln.className = 'ul-lite'; ln.innerHTML = '<span>Light view: Rex had trouble drawing this page last time, so it shows fewer releases.</span><button type="button" class="btn btn-sm" data-ul-act="full">Use full view</button>'; tl.appendChild(ln); }
    tl.appendChild(frag);
    if (hidden > 0) {
      const w = document.createElement('div'); w.className = 'ul-more';
      w.innerHTML = '<button type="button" class="btn" id="rexLogMore" data-ul-act="more">Show ' + Math.min(batch(), hidden) + ' older releases (' + hidden + ' more)</button>' + (hidden > batch() ? '<button type="button" class="btn btn-sm" data-ul-act="rest">Show all</button>' : ''); tl.appendChild(w);
    }
    if (!matched) tl.innerHTML = '<div class="ul-empty"><div aria-hidden="true">🔎</div><b>No updates match</b><p>' + (q ? 'Nothing found for “' + E(q) + '”. ' : '') + (st.unseen ? 'You have already seen every release. ' : '') + 'Try another word or clear the filters.</p><button type="button" class="btn btn-sm" data-ul-act="clear">Clear search and filters</button></div>';
    $('ulCount').textContent = matched ? (q || st.type !== 'all' || st.unseen ? matched + ' release' + (matched === 1 ? ' matches' : 's match') : LOG.length + ' releases, newest first') : '';
    syncAll(); if (!lite) { try { P.achievements(); } catch (e) {} }
  }

  let timer = null;
  const plain = () => '<ul class="ul-plain">' + LOG.slice(0, 12).map(r => '<li><b>v' + E(r.version) + '</b> ' + E(r.date || '') + ' ' + E(clip(r.summary || (r.items[0] || {}).text, 140)) + '</li>').join('') + '</ul>';
  window.renderChangelog = function () {
    if (drawing) return; drawing = true; guardOn();
    try { draw(); }
    catch (err) { console.error('Update Log failed to draw', err); const t = $('changelogTimeline'); if (t) t.innerHTML = '<div class="ul-empty"><b>The full Update Log could not be drawn on this device.</b><p>Here are the latest releases in a simple list.</p><button type="button" class="btn btn-sm" id="rexLogRetry">Try again</button></div>' + plain(); const b = $('rexLogRetry'); if (b) b.onclick = () => { st.limit = batch(); window.renderChangelog(); }; }
    finally { drawing = false; setTimeout(guardOff, 2500); }
  };
  window.renderChangelogSoon = function () { clearTimeout(timer); timer = setTimeout(() => window.renderChangelog(), 180); };
  const v = document.getElementById('view-changelog'); if (v && v.classList.contains('active')) window.renderChangelog();
  window.RexUpdateLog = { render: () => window.renderChangelog(), state: () => Object.assign({}, st, { open: Object.assign({}, st.open) }) };
})();
