/* Project Rex Center 12.2.0 - Profile upgrade.
   Adds a cleaner hero, a two-column layout, a Profile strength card, a Rewards shelf and a
   Workspace-at-a-glance card. Everything shown is real data from this browser.
   It never writes to the saved profile or any storage key; it only READS existing keys and
   re-arranges the existing cards (all original element ids and handlers are kept). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const DEFAULT_BIO = 'Building games, Project Rex, and random stuff.';

  /* ---------- one-time layout ---------- */
  function build() {
    const view = $('view-profile'); if (!view || view.dataset.pf12) return;
    const head = $('profileHeaderCard'), about = $('profileAboutCard'), spot = $('profileSpotlightCard'), snap = $('profileSnapshotGrid'),
      badges = $('profileBadgesCard'), stats = $('profileStatsCard'), links = $('profileLinksCard');
    if (!head || !about || !spot || !snap || !badges || !stats || !links) return; // markup changed: leave the page as it was
    view.dataset.pf12 = '1'; view.classList.add('pf12');

    // chips row inside the hero
    const pad = head.children[1];
    const chips = document.createElement('div'); chips.id = 'pf12Chips'; chips.className = 'pf12-chips';
    pad.insertBefore(chips, $('profileMemberSince'));

    const cols = document.createElement('div'); cols.className = 'pf12-cols';
    const main = document.createElement('div'); main.className = 'pf12-main';
    const side = document.createElement('div'); side.className = 'pf12-side';
    cols.appendChild(main); cols.appendChild(side);
    head.insertAdjacentElement('afterend', cols);

    const mk = (id, html) => { const d = document.createElement('div'); d.className = 'card pf12-card'; d.id = id; d.innerHTML = html; return d; };
    const strength = mk('pf12Strength', '');
    const rewards = mk('pf12Rewards', '');
    const glance = mk('pf12Glance', '');

    [about, spot, snap, links].forEach(n => main.appendChild(n));
    [strength, stats, badges, rewards, glance].forEach(n => side.appendChild(n));

    view.addEventListener('click', e => {
      const b = e.target.closest('[data-pf12]'); if (!b) return;
      const a = b.dataset.pf12;
      if (a === 'edit' && typeof openEditProfileModal === 'function') openEditProfileModal();
      else if (a === 'events' && window.RexEvents) RexEvents.open();
      else if (a === 'view' && b.dataset.v && typeof showView === 'function') showView(b.dataset.v);
    });
  }

  /* ---------- hero ---------- */
  const SKIN = () => { try { const s = RexEvents._state(); const id = s.PREF.skin && s.PREF.skin.id; return id && s.P.claimed[id] ? s.PREF.skin.emoji : null; } catch (e) { return null; } };
  function hero(p) {
    const ban = $('profileBanner'); if (ban) ban.style.height = '168px';
    const c = [];
    if (p.role) c.push('<span class="pf12-chip">🎯 ' + E(p.role) + '</span>');
    if (p.currentProject) c.push('<span class="pf12-chip">🧩 ' + E(p.currentProject) + '</span>');
    if (p.region) c.push('<span class="pf12-chip">📍 ' + E(p.region) + '</span>');
    if (p.privacy && p.privacy.showMemberSince) {
      const d = new Date(p.memberSince);
      if (Number.isFinite(d.getTime())) c.push('<span class="pf12-chip">📅 Member since ' + E(d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })) + '</span>');
    }
    const sk = SKIN(); if (sk) c.push('<span class="pf12-chip pf12-chip-a">' + E(sk) + ' Skin equipped</span>');
    $('pf12Chips').innerHTML = c.join('');
  }

  /* ---------- profile strength ---------- */
  function strengthItems(p) {
    const links = (p.links || []).filter(l => l && l.enabled !== false && l.url).length;
    const items = [
      ['Profile picture', !!p.avatar, 'Add an emoji or image'],
      ['About me', !!(p.bio && p.bio.trim() && p.bio.trim() !== DEFAULT_BIO), 'Write your own bio'],
      ['Role', !!(p.role && p.role.trim()), 'Add your role'],
      ['Current project', !!(p.currentProject && p.currentProject.trim()), 'Name your project'],
      ['Favorite tools', !!(p.favoriteTools && p.favoriteTools.trim()), 'List your tools'],
      ['Region', !!(p.region && p.region.trim()), 'Add your timezone or region'],
      ['Goal', !!(p.goal && p.goal.trim()), 'Set a goal'],
      ['Skills', !!(p.skills && p.skills.trim()), 'Add skills you are learning'],
      ['Interests', !!(p.interests && p.interests.trim()), 'Add your interests'],
      ['Links', links > 0, 'Add a link']
    ];
    return items;
  }
  function strength(p) {
    const items = strengthItems(p);
    const done = items.filter(i => i[1]).length, pct = Math.round(done / items.length * 100);
    const todo = items.filter(i => !i[1]);
    $('pf12Strength').innerHTML = '<div class="card-title"><h3>⚡ Profile strength</h3><span class="pf12-pct" id="pf12Pct">' + pct + '%</span></div>' +
      '<div class="pf12-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Profile strength"><i style="width:' + pct + '%"></i></div>' +
      '<p class="pf12-sub">' + done + ' of ' + items.length + ' details filled in.</p>' +
      (todo.length ? '<ul class="pf12-todo">' + todo.slice(0, 4).map(t => '<li><span>' + E(t[2]) + '</span><button type="button" class="btn btn-sm" data-pf12="edit">Add</button></li>').join('') + '</ul>' + (todo.length > 4 ? '<p class="pf12-sub">+' + (todo.length - 4) + ' more in Edit Profile.</p>' : '')
        : '<p class="pf12-ok">✅ Your profile is complete.</p>');
  }

  /* ---------- rewards shelf (real Live Events rewards) ---------- */
  function rewards() {
    let rows = [], eq = null;
    try {
      const s = RexEvents._state(), BY = {}; RexEvents.EV.forEach(d => { BY[d.key] = d; });
      eq = s.PREF.skin && s.PREF.skin.id;
      rows = Object.keys(s.P.claimed).map(k => {
        const iid = k.split(':')[0], rid = k.slice(iid.length + 1), key = iid.replace(/-\d+$/, ''), yr = iid.slice(key.length + 1), d = BY[key];
        const r = d && RexEvents.rewardsOf(d).find(x => x.id === rid);
        return r ? { k, d, r, yr, at: (s.P.claimed[k] && s.P.claimed[k].at) || 0 } : null;
      }).filter(Boolean).sort((a, b) => b.at - a.at);
    } catch (e) { rows = []; }
    const el = $('pf12Rewards');
    el.innerHTML = '<div class="card-title"><h3>🏆 Rewards shelf</h3><span class="pf12-sub" style="margin:0">' + rows.length + (rows.length === 1 ? ' reward' : ' rewards') + '</span></div>' +
      (rows.length ? '<div class="pf12-shelf">' + rows.slice(0, 12).map(x => '<div class="pf12-rw' + (eq === x.k ? ' eq' : '') + '" title="' + E(x.r.name + ' - ' + x.d.name + ' ' + x.yr) + '"><span>' + E(x.r.emoji) + '</span><b>' + E(x.r.name) + '</b><small>' + E(x.d.name) + ' ' + E(x.yr) + '</small></div>').join('') + '</div>' +
        (rows.length > 12 ? '<p class="pf12-sub">Showing the 12 newest.</p>' : '')
        : '<p class="pf12-empty">No rewards yet. Join a holiday Live Event to earn badges and Rex skins.</p>') +
      '<button type="button" class="btn btn-sm" data-pf12="events">Open Live Events</button>';
  }

  /* ---------- workspace at a glance (real counts) ---------- */
  function glance() {
    const arr = k => { const v = read(k, []); return Array.isArray(v) ? v : []; };
    const projects = arr('rex101_projects'), notes = arr('rex101_notes'), tasks = arr('rex101_tasks'), restore = arr('rex101_restore_points');
    const doneT = tasks.filter(t => t && (t.done || t.completed || t.status === 'done')).length;
    let favs = 0; try { favs = window.RexFav ? RexFav.list().length : 0; } catch (e) {}
    const cells = [['📁', projects.length, 'Projects', 'projects'], ['📝', notes.length, 'Notes', 'notes'], ['✅', doneT + '/' + tasks.length, 'Tasks done', 'tasks'], ['🛟', restore.length, 'Restore points', null], ['⭐', favs, 'Pinned pages', null]];
    const any = projects.length + notes.length + tasks.length + restore.length + favs > 0;
    $('pf12Glance').innerHTML = '<div class="card-title"><h3>🧰 Workspace at a glance</h3></div>' +
      (any ? '<div class="pf12-glance">' + cells.map(c => '<div class="pf12-g"' + (c[3] ? ' data-pf12="view" data-v="' + c[3] + '" role="button" tabindex="0"' : '') + '><span>' + c[0] + '</span><b>' + c[1] + '</b><small>' + c[2] + '</small></div>').join('') + '</div>'
        : '<p class="pf12-empty">Nothing here yet. Projects, notes, tasks and pinned pages will show up as you use Rex.</p>');
  }

  function render() {
    try {
      build();
      if (!$('view-profile') || !$('view-profile').dataset.pf12) return;
      const p = (typeof ensureProfileDefaults === 'function') ? ensureProfileDefaults() : (state.profile || {});
      hero(p); strength(p); rewards(); glance();
    } catch (e) { console.warn('Profile+ skipped:', e); }
  }

  /* wrap renderProfile (called by name from the view table, edit save and import) */
  const orig = window.renderProfile;
  if (typeof orig === 'function') {
    window.renderProfile = function () { const r = orig.apply(this, arguments); render(); return r; };
  }
  window.RexProfilePlus = { render, score: () => { const p = (typeof ensureProfileDefaults === 'function') ? ensureProfileDefaults() : (state.profile || {}); const it = strengthItems(p); return { done: it.filter(i => i[1]).length, total: it.length }; } };
})();
