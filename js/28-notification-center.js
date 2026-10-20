/* Project Rex Center 12.10.0 - Notification center upgrade (free, local).
   The Notifications page now has search, topic and type filters with counts, grouping (by day, by topic or none), a per-notification delete,
   Mark all read, and "snooze a topic": new notifications of a snoozed topic are still saved (marked with a 🔕) but never add to the unread badge.
   It reads and updates the same notifications list as before (state.notifications). Topics are worked out from the message text.
   Own data: rex1300_notif = { snooze, group, keepUnread }. Nothing is sent anywhere. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-notifications'); if (!view) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'rex1300_notif';
  const TOPICS = [
    ['schedule', '⏰', 'Schedule', /schedul|missed/i], ['updates', '🚀', 'Updates', /update|install|release|version/i], ['achievements', '🏆', 'Achievements', /achievement|unlocked|badge/i],
    ['webhooks', '📡', 'Webhooks', /webhook/i], ['weather', '🌤️', 'Weather', /weather|forecast|temperature/i], ['events', '🎉', 'Events', /event|holiday|collectible|reward/i],
    ['backups', '💾', 'Backups', /backup|restore|export|import/i], ['messages', '💬', 'Messages', /sent|send|test|message|announcement|greeting|digest|poll|giveaway/i], ['other', '🔔', 'Other', /./]
  ];
  const TYPES = [['all', 'All'], ['success', '✅ Success'], ['error', '❌ Errors'], ['warn', '⚠️ Warnings'], ['info', 'ℹ️ Info']];
  const ICON = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const SNOOZES = [['', 'Not snoozed'], ['3600000', 'For 1 hour'], ['28800000', 'For 8 hours'], ['tomorrow', 'Until tomorrow 9 AM'], ['forever', 'Until I turn it back on']];
  function load() { let o = {}; try { o = JSON.parse(localStorage.getItem(K) || 'null') || {}; } catch (e) {} return { snooze: o.snooze && typeof o.snooze === 'object' ? o.snooze : {}, group: ['day', 'topic', 'none'].includes(o.group) ? o.group : 'day', keepUnread: !!o.keepUnread }; }
  function put(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} }
  const topicOf = n => { if (n.cat === 'weather') return 'weather'; const m = String(n.msg || ''); return (TOPICS.find(t => t[3].test(m)) || TOPICS[TOPICS.length - 1])[0]; };
  const until = (o, t) => { const u = o.snooze[t]; return u === 0 ? 0 : (+u > Date.now() ? +u : null); };    // 0 = until turned back on, number = until then, null = not snoozed
  const snoozed = t => until(load(), t) !== null;
  const when = n => { const t = +n.id; return isFinite(t) && t > 1e12 ? t : (Date.parse(n.time) || 0); };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const dayLabel = t => { const d = new Date(t), n = new Date(), k = x => x.getFullYear() * 10000 + x.getMonth() * 100 + x.getDate(), y = new Date(); y.setDate(n.getDate() - 1); return k(d) === k(n) ? 'Today' : k(d) === k(y) ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }); };
  const ui = { q: '', topic: 'all', type: 'all', panel: false };

  /* new notifications of a snoozed topic are kept but never count as unread */
  const origNotify = window.notify;
  if (typeof origNotify === 'function') window.notify = function () {
    const r = origNotify.apply(this, arguments);
    try { const n = state.notifications[0]; if (n && n.msg === arguments[0]) { n.topic = topicOf(n); if (snoozed(n.topic)) { n.read = true; n.snoozed = true; save(); updateBadge(); } } } catch (e) { console.error('Notification center', e); }
    return r;
  };

  function build() {
    if (view.dataset.nc) return; view.dataset.nc = '1';
    const card = view.querySelector('.card'); if (!card) return;
    card.innerHTML = '<div class="card-title"><h3>🔔 Smart Notifications</h3><div class="actions"><button class="sbtn" onclick="markAllRead()">Mark all read</button><button class="sbtn danger" onclick="clearNotifs()">Clear</button></div></div>' +
      '<div class="nc-tools"><input id="ncQ" type="search" placeholder="Search notifications…" aria-label="Search notifications" autocomplete="off">' +
      '<div class="nc-chips" id="ncTopics" role="group" aria-label="Filter by topic"></div><div class="nc-chips" id="ncTypes" role="group" aria-label="Filter by type"></div>' +
      '<div class="nc-row"><label>Group by <select id="ncGroup" aria-label="Group notifications by"><option value="day">Day</option><option value="topic">Topic</option><option value="none">Nothing (one list)</option></select></label>' +
      '<button type="button" class="sbtn" id="ncSnz" aria-expanded="false">🔕 Snooze topics</button><label class="nc-keep"><input type="checkbox" id="ncKeep"> Keep unread until I mark them</label></div></div>' +
      '<div class="nc-snooze" id="ncPanel" hidden></div><div class="nc-count" id="ncCount" aria-live="polite"></div><div class="list" id="notifList"></div>';
    $('ncQ').addEventListener('input', e => { ui.q = e.target.value.trim().toLowerCase(); draw(false); });
    $('ncGroup').addEventListener('change', e => { const o = load(); o.group = e.target.value; put(o); draw(false); });
    $('ncKeep').addEventListener('change', e => { const o = load(); o.keepUnread = e.target.checked; put(o); });
    $('ncSnz').addEventListener('click', () => { ui.panel = !ui.panel; panel(); });
    view.addEventListener('click', onClick);
    view.addEventListener('change', e => { const s = e.target.closest && e.target.closest('[data-snz]'); if (!s) return; const o = load(), t = s.dataset.snz, v = s.value; delete o.snooze[t]; if (v === 'forever') o.snooze[t] = 0; else if (v === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); o.snooze[t] = d.getTime(); } else if (v) o.snooze[t] = Date.now() + +v; put(o); panel(); draw(false); try { toast(v ? '🔕 ' + TOPICS.find(x => x[0] === t)[2] + ' snoozed' : 'Snooze removed', 'info'); } catch (er) {} });
  }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-nc]'); if (!b) return; const a = b.dataset.nc;
    if (a === 'topic') { ui.topic = b.dataset.v; draw(false); } else if (a === 'type') { ui.type = b.dataset.v; draw(false); }
    else if (a === 'del') { state.notifications = state.notifications.filter(n => n.id !== b.dataset.id); save(); updateBadge(); draw(false); }
    else if (a === 'read') { const n = state.notifications.find(x => x.id === b.dataset.id); if (n) { n.read = true; save(); updateBadge(); draw(false); } }
    else if (a === 'clearf') { const ids = new Set(filtered().map(n => n.id)); if (ids.size && confirm('Delete ' + ids.size + ' notification' + (ids.size === 1 ? '' : 's') + ' shown here?')) { state.notifications = state.notifications.filter(n => !ids.has(n.id)); save(); updateBadge(); draw(false); } }
    else if (a === 'reset') { ui.q = ''; ui.topic = 'all'; ui.type = 'all'; $('ncQ').value = ''; draw(false); }
  }
  function panel() {
    const p = $('ncPanel'), b = $('ncSnz'); if (!p) return; p.hidden = !ui.panel; b.setAttribute('aria-expanded', String(ui.panel)); if (!ui.panel) return; const o = load();
    p.innerHTML = '<p class="nc-note">A snoozed topic still collects notifications, but they never add to the red unread count. You will find them here, marked 🔕.</p>' + TOPICS.slice(0, -1).concat([TOPICS[TOPICS.length - 1]]).map(t => {
      const u = until(o, t[0]), cur = u === null ? '' : u === 0 ? 'forever' : 'custom';
      return '<div class="nc-srow"><span>' + t[1] + ' ' + t[2] + '</span><select data-snz="' + t[0] + '" aria-label="Snooze ' + t[2] + '">' + SNOOZES.map(s => '<option value="' + s[0] + '"' + (s[0] === cur ? ' selected' : '') + '>' + s[1] + '</option>').join('') + (cur === 'custom' ? '<option value="custom" selected>Until ' + E(new Date(u).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })) + '</option>' : '') + '</select></div>'; }).join('');
  }
  function filtered() {
    return state.notifications.filter(n => (ui.topic === 'all' || (n.topic || topicOf(n)) === ui.topic) && (ui.type === 'all' || (n.type || 'info') === ui.type) && (!ui.q || String(n.msg).toLowerCase().includes(ui.q)));
  }
  function item(n, unread) {
    const t = TOPICS.find(x => x[0] === (n.topic || topicOf(n))) || TOPICS[TOPICS.length - 1], w = when(n);
    return '<div class="row-item nc-item' + (unread ? ' unread' : '') + '"><div class="icon-box">' + (ICON[n.type] || 'ℹ️') + '</div><div class="info"><strong>' + E(n.msg) + '</strong><small title="' + E(n.time || '') + '">' + E(w ? ago(w) : (n.time || '')) + (unread ? ' · unread' : '') + (n.snoozed ? ' · 🔕 snoozed topic' : '') + '</small></div>' +
      '<span class="notif-cat info nc-topic">' + t[1] + ' ' + t[2] + '</span><div class="nc-act">' + (unread ? '<button type="button" class="sbtn" data-nc="read" data-id="' + E(n.id) + '" aria-label="Mark as read">✓</button>' : '') + '<button type="button" class="sbtn danger" data-nc="del" data-id="' + E(n.id) + '" aria-label="Delete this notification">✕</button></div></div>';
  }
  function draw(markRead) {
    build(); const list = $('notifList'); if (!list) return; const o = load();
    $('ncGroup').value = o.group; $('ncKeep').checked = o.keepUnread;
    const all = state.notifications, unreadIds = new Set(all.filter(n => !n.read).map(n => n.id));
    const cnt = (f) => all.filter(n => f(n) && (!ui.q || String(n.msg).toLowerCase().includes(ui.q))).length;
    $('ncTopics').innerHTML = [['all', '', 'All topics', cnt(() => true)]].concat(TOPICS.map(t => [t[0], t[1] + ' ', t[2], cnt(n => (n.topic || topicOf(n)) === t[0])]).filter(x => x[3] || ui.topic === x[0])).map(c => '<button type="button" class="ul-chip' + (ui.topic === c[0] ? ' on' : '') + '" data-nc="topic" data-v="' + c[0] + '" aria-pressed="' + (ui.topic === c[0]) + '">' + c[1] + c[2] + ' <small>' + c[3] + '</small></button>').join('');
    $('ncTypes').innerHTML = TYPES.map(t => '<button type="button" class="ul-chip' + (ui.type === t[0] ? ' on' : '') + '" data-nc="type" data-v="' + t[0] + '" aria-pressed="' + (ui.type === t[0]) + '">' + t[1] + ' <small>' + (t[0] === 'all' ? cnt(() => true) : cnt(n => (n.type || 'info') === t[0])) + '</small></button>').join('');
    const f = filtered(), nu = f.filter(n => unreadIds.has(n.id)).length;
    $('ncCount').innerHTML = all.length ? (f.length === all.length ? all.length + ' notification' + (all.length === 1 ? '' : 's') : f.length + ' of ' + all.length + ' shown · <button type="button" class="ul-chip" data-nc="reset">Clear filters</button> <button type="button" class="ul-chip" data-nc="clearf">Delete these</button>') + (nu ? ' · ' + nu + ' unread' : '') : '';
    if (!all.length) { list.innerHTML = '<div class="empty">No notifications</div>'; }
    else if (!f.length) { list.innerHTML = '<div class="empty">Nothing matches those filters.</div>'; }
    else {
      const groups = []; f.sort((a, b) => when(b) - when(a)).forEach(n => { const key = o.group === 'day' ? dayLabel(when(n) || Date.now()) : o.group === 'topic' ? ((TOPICS.find(x => x[0] === (n.topic || topicOf(n))) || TOPICS[8])[1] + ' ' + (TOPICS.find(x => x[0] === (n.topic || topicOf(n))) || TOPICS[8])[2]) : ''; let g = groups.find(x => x.k === key); if (!g) groups.push(g = { k: key, a: [] }); g.a.push(n); });
      list.innerHTML = groups.map(g => (g.k ? '<h4 class="nc-gh">' + E(g.k) + ' <small>' + g.a.length + '</small></h4>' : '') + g.a.map(n => item(n, unreadIds.has(n.id))).join('')).join('');
    }
    if (markRead && !o.keepUnread) { all.forEach(n => { n.read = true; }); save(); updateBadge(); }
  }
  window.renderNotifs = function () { try { draw(true); } catch (e) { console.error('Notification center', e); const l = $('notifList'); if (l) l.innerHTML = '<div class="empty">The notification list could not be drawn. Reload the page.</div>'; } };
  window.RexNotifs = { topicOf, topics: TOPICS, snoozed, load, render: () => draw(false), state: () => Object.assign({}, ui) };
  if (view.classList.contains('active')) window.renderNotifs();
})();
