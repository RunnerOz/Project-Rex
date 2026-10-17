/* Project Rex Center 12.7.0 - Full backup & restore (free, local, no account, nothing is uploaded).
   Settings -> Data gets a "Full backup & restore" card:
   - Download one file with everything Rex keeps in this browser (grouped into sections you can tick on or off).
   - Restore from such a file: the file is checked first, you see a preview and choose which sections to restore.
   - A safety copy of what is about to be replaced is kept, so "Undo last restore" works.
   Rules it follows: it only writes the keys that are in the file and ticked (it never deletes anything), it never touches
   the update machinery (rex115_*), and it stops the page's own auto-save from overwriting a restore (window.__rexResetting).
   Storage it adds: rex127_lastbackup, rex127_prerestore (undo copy), rex127_restored (one-time "restore finished" note). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const FORMAT = 'project-rex-full-backup', FV = 1;
  const MAX_FILE = 25 * 1024 * 1024, MAX_VALUE = 12 * 1024 * 1024;
  const K_LAST = 'rex127_lastbackup', K_UNDO = 'rex127_prerestore', K_DONE = 'rex127_restored';
  const ALLOWED = /^(rex|projectRex)/;
  const EXCLUDED = k => /^rex115_/.test(k) || k === K_UNDO || k === K_DONE || ['rex110_last_download', 'rex110_first_seen', 'rex110_last_reminder'].indexOf(k) >= 0;
  const SECTIONS = [
    { id: 'main', icon: '📡', label: 'Webhooks, templates, history, schedule & profile', keys: ['projectRexV42'], secret: true },
    { id: 'look', icon: '🎨', label: 'Appearance, layout & favorites', keys: ['projectRexAppearanceV6', 'projectRexEffectLab_v1', 'rex_theme_studio_presets', 'rex12_nav', 'rex12_compact', 'rex121_favs', 'rex126_calev', 'rex111_settings_tab'] },
    { id: 'studio', icon: '🧩', label: 'Rex Studio: projects, notes, tasks & workflows', keys: ['rex101_projects', 'rex101_notes', 'rex101_tasks', 'rex101_workflows', 'rex101_activity'] },
    { id: 'time', icon: '⏱️', label: 'Dev Clock & Pomodoro', keys: ['rex_dev_clock_data', 'rex110_pomodoro'] },
    { id: 'events', icon: '🎃', label: 'Live Events progress, rewards & skins', keys: ['rexev1_progress', 'rexev1_config', 'rexev1_prefs', 'rex128_evrem'] },
    { id: 'ach', icon: '🏆', label: 'Achievements', keys: ['rex110_achievements', 'rex163_ach'] },
    { id: 'friends', icon: '🧑‍🤝‍🧑', label: 'Friends', keys: ['rex_friends'] },
    { id: 'misc', icon: '⚙️', label: 'Other Rex settings (custom pings, Rex pets, read markers…)', keys: [] },
    { id: 'points', icon: '🗂️', label: 'Restore points (large; contain webhook URLs)', keys: ['rex101_restore_points'], optional: true, secret: true }
  ];
  const ARRAY_KEYS = ['rex101_projects', 'rex101_notes', 'rex101_tasks', 'rex101_workflows', 'rex101_activity', 'rex121_favs', 'rex_friends', 'rex101_restore_points'];
  const OBJECT_KEYS = ['projectRexV42', 'projectRexAppearanceV6', 'projectRexEffectLab_v1', 'rex_dev_clock_data', 'rex110_pomodoro', 'rexev1_progress', 'rexev1_config', 'rexev1_prefs', 'rex128_evrem', 'rex110_achievements', 'rex163_ach'];
  const sectionOf = k => { for (let i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].keys.indexOf(k) >= 0) return SECTIONS[i].id; return 'misc'; };
  const URL_RX = /https:\/\/(?:[a-z]+\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/[^\s"'\\<>]+/gi;
  const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const toast_ = (m, t) => { try { if (typeof toast === 'function') toast(m, t || 'info'); } catch (e) {} };
  const appV = () => (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown');
  const cmpV = (a, b) => { const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  const when = ts => { try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } };

  /* ---------- reading the current browser data ---------- */
  function currentKeys() {
    const out = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && ALLOWED.test(k) && !EXCLUDED(k)) { const v = localStorage.getItem(k); if (typeof v === 'string') out[k] = v; } } } catch (e) {}
    return out;
  }
  function bySection(data) {
    const m = {}; SECTIONS.forEach(s => { m[s.id] = { keys: [], bytes: 0 }; });
    Object.keys(data).forEach(k => { const s = m[sectionOf(k)]; s.keys.push(k); s.bytes += k.length + data[k].length; });
    return m;
  }
  function stripUrls(key, val) {
    let v = val;
    if (key === 'projectRexV42') {
      try { const o = JSON.parse(v); (o.workspaces || []).forEach(w => (w.webhooks || []).forEach(h => { if (h && typeof h === 'object') h.url = ''; })); v = JSON.stringify(o); } catch (e) {}
    }
    return v.replace(URL_RX, '');
  }

  /* ---------- export ---------- */
  function buildExport(ids, includeUrls) {
    const cur = currentKeys(), data = {}; let n = 0;
    Object.keys(cur).forEach(k => { if (ids.indexOf(sectionOf(k)) < 0) return; data[k] = includeUrls ? cur[k] : stripUrls(k, cur[k]); n++; });
    return { format: FORMAT, formatVersion: FV, app: appV(), created: new Date().toISOString(), webhookUrlsIncluded: !!includeUrls, sections: ids.slice(), keyCount: n, data };
  }
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function chosen() { return [].slice.call(document.querySelectorAll('#fbCard input[data-fbsec]:checked')).map(i => i.dataset.fbsec); }
  function doExport() {
    const ids = chosen(); if (!ids.length) { toast_('Tick at least one section to back up.', 'error'); return; }
    const urls = $('fbUrls') ? $('fbUrls').checked : true, file = buildExport(ids, urls);
    if (!file.keyCount) { toast_('There is nothing saved in those sections yet.', 'error'); return; }
    const text = JSON.stringify(file, null, 2);
    download('project-rex-full-backup-' + new Date().toISOString().slice(0, 10) + '.json', text);
    try { localStorage.setItem(K_LAST, JSON.stringify({ at: Date.now(), keys: file.keyCount, bytes: text.length, urls })); localStorage.setItem('rex110_last_download', String(Date.now())); } catch (e) {}
    toast_('Backup downloaded (' + file.keyCount + ' items, ' + kb(text.length) + '). Keep the file somewhere safe.', 'success');
    paint();
  }

  /* ---------- checking a backup file ---------- */
  function validate(text, size) {
    const res = { ok: false, error: '', warnings: [], data: {}, ignored: 0, meta: {} };
    if (size > MAX_FILE) { res.error = 'That file is too large to be a Rex backup.'; return res; }
    let o; try { o = JSON.parse(text); } catch (e) { res.error = 'That file is not valid JSON, so it cannot be a Rex backup.'; return res; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) { res.error = 'That file does not look like a Rex backup.'; return res; }
    if (o.format === 'project-rex-restore-point' && o.storage && typeof o.storage === 'object') { o = { format: FORMAT, formatVersion: FV, app: o.appVersion, created: o.created ? new Date(o.created).toISOString() : '', webhookUrlsIncluded: true, data: o.storage, legacy: true }; }
    if (o.format !== FORMAT) { res.error = 'This is not a Project Rex full backup file.'; return res; }
    if (o.formatVersion !== FV) { res.error = 'This backup was made by a different backup format version (' + o.formatVersion + '). Update Rex and try again.'; return res; }
    if (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)) { res.error = 'The backup has no data inside.'; return res; }
    let total = 0;
    Object.keys(o.data).forEach(k => {
      const v = o.data[k];
      if (typeof v !== 'string' || !ALLOWED.test(k) || EXCLUDED(k)) { res.ignored++; return; }
      if (v.length > MAX_VALUE) { res.ignored++; res.warnings.push('“' + k + '” is too large and was skipped.'); return; }
      if (ARRAY_KEYS.indexOf(k) >= 0 || OBJECT_KEYS.indexOf(k) >= 0) {
        let p; try { p = JSON.parse(v); } catch (e) { res.ignored++; res.warnings.push('“' + k + '” is damaged and was skipped.'); return; }
        if (ARRAY_KEYS.indexOf(k) >= 0 && !Array.isArray(p)) { res.ignored++; res.warnings.push('“' + k + '” has the wrong shape and was skipped.'); return; }
        if (OBJECT_KEYS.indexOf(k) >= 0 && (!p || typeof p !== 'object' || Array.isArray(p))) { res.ignored++; res.warnings.push('“' + k + '” has the wrong shape and was skipped.'); return; }
        if (k === 'projectRexV42' && !Array.isArray(p.workspaces)) { res.ignored++; res.warnings.push('The main data has no workspaces and was skipped.'); return; }
      }
      total += v.length; res.data[k] = v;
    });
    if (total > MAX_FILE) { res.error = 'The backup contains too much data.'; res.data = {}; return res; }
    if (!Object.keys(res.data).length) { res.error = 'Nothing in this file can be restored.'; return res; }
    res.ok = true; res.meta = { app: o.app || 'unknown', created: o.created || '', urls: o.webhookUrlsIncluded !== false, legacy: !!o.legacy };
    if (o.app && /^\d+\.\d+\.\d+$/.test(o.app) && cmpV(o.app, appV()) > 0) res.warnings.push('This backup was made by a newer Rex (' + o.app + ') than the one running (' + appV() + '). Update Rex first, then restore, so nothing is misread.');
    if (!res.meta.urls) res.warnings.push('This backup has no webhook URLs. Webhooks with the same id keep the URL they have now; new ones will need their URL added.');
    return res;
  }
  /* when the file has no webhook URLs, keep the URLs that exist right now (matched by webhook id) */
  function mergeUrls(incoming) {
    try {
      const cur = JSON.parse(localStorage.getItem('projectRexV42') || 'null'), inc = JSON.parse(incoming); if (!cur || !inc) return incoming;
      const keep = {}; (cur.workspaces || []).forEach(w => (w.webhooks || []).forEach(h => { if (h && h.id && h.url) keep[w.id + '|' + h.id] = h.url; }));
      (inc.workspaces || []).forEach(w => (w.webhooks || []).forEach(h => { if (h && !h.url && keep[w.id + '|' + h.id]) h.url = keep[w.id + '|' + h.id]; }));
      return JSON.stringify(inc);
    } catch (e) { return incoming; }
  }

  /* ---------- applying a restore ---------- */
  let pending = null;
  function applyKeys(map, absent) {
    window.__rexResetting = true; // the page's own auto-save must not write the old in-memory data back over the restore
    Object.keys(map).forEach(k => { try { localStorage.setItem(k, map[k]); } catch (e) { throw new Error('Browser storage is full or blocked while writing “' + k + '”.'); } });
    (absent || []).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
  }
  function doRestore() {
    if (!pending) return;
    const ids = [].slice.call(document.querySelectorAll('#fbPrev input[data-fbrs]:checked')).map(i => i.dataset.fbrs);
    if (!ids.length) { toast_('Tick at least one section to restore.', 'error'); return; }
    const writes = {}; Object.keys(pending.data).forEach(k => { if (ids.indexOf(sectionOf(k)) >= 0) writes[k] = pending.data[k]; });
    if (!pending.meta.urls && writes.projectRexV42) writes.projectRexV42 = mergeUrls(writes.projectRexV42);
    const cur = currentKeys(), undo = { at: Date.now(), app: appV(), data: {}, absent: [] };
    Object.keys(writes).forEach(k => { if (k in cur) undo.data[k] = cur[k]; else undo.absent.push(k); });
    let kept = true;
    try { localStorage.setItem(K_UNDO, JSON.stringify(undo)); } catch (e) { kept = false; }
    if (!kept && !confirm('Rex could not keep an undo copy (browser storage is nearly full). Restore anyway?\n\nTip: download a backup of your current data first.')) return;
    try {
      applyKeys(writes);
      localStorage.setItem(K_DONE, JSON.stringify({ at: Date.now(), keys: Object.keys(writes).length, undo: kept }));
    } catch (e) { window.__rexResetting = false; toast_('Restore stopped: ' + e.message, 'error'); return; }
    const m = $('fbRestoreModal'); if (m) m.classList.remove('show');
    location.reload();
  }
  function doUndo() {
    let u = null; try { u = JSON.parse(localStorage.getItem(K_UNDO) || 'null'); } catch (e) {}
    if (!u || !u.data) { toast_('There is no restore to undo.', 'error'); return; }
    if (!confirm('Undo the last restore? Your data goes back to how it was on ' + when(u.at) + '.')) return;
    try { applyKeys(u.data, u.absent); localStorage.removeItem(K_UNDO); localStorage.setItem(K_DONE, JSON.stringify({ at: Date.now(), undone: true })); }
    catch (e) { window.__rexResetting = false; toast_('Undo stopped: ' + e.message, 'error'); return; }
    location.reload();
  }

  /* ---------- UI ---------- */
  function modal() {
    let m = $('fbRestoreModal'); if (m) return m;
    m = document.createElement('div'); m.className = 'modal-bg'; m.id = 'fbRestoreModal';
    m.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fbPrevT"><div class="modal-h"><h3 id="fbPrevT">⬆ Restore from backup</h3><button class="close" type="button" aria-label="Close" data-fbclose>×</button></div><div id="fbPrev"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-fbclose]')) { m.classList.remove('show'); pending = null; } else if (e.target.closest('[data-fbgo]')) doRestore(); });
    return m;
  }
  function showPreview(v, fileName) {
    const m = modal(), cur = currentKeys(), now = bySection(cur), inc = bySection(v.data), meta = v.meta;
    const rows = SECTIONS.filter(s => inc[s.id].keys.length).map(s => '<label class="fb-row"><input type="checkbox" data-fbrs="' + s.id + '"' + (s.optional ? '' : ' checked') + '><span class="fb-i">' + s.icon + '</span><span class="fb-t"><b>' + E(s.label) + '</b><small>In the file: ' + inc[s.id].keys.length + ' item' + (inc[s.id].keys.length === 1 ? '' : 's') + ' (' + kb(inc[s.id].bytes) + ') · In this browser now: ' + now[s.id].keys.length + '</small></span></label>').join('');
    $('fbPrev').innerHTML = '<p class="fb-note"><b>' + E(fileName) + '</b><br>Made ' + E(meta.created ? when(meta.created) : 'at an unknown time') + ' by Rex ' + E(meta.app) + '. Checked: it is a valid Rex backup.</p>' +
      (v.warnings.length ? '<ul class="fb-warn">' + v.warnings.map(w => '<li>' + E(w) + '</li>').join('') + '</ul>' : '') + (v.ignored ? '<p class="fb-note">' + v.ignored + ' entr' + (v.ignored === 1 ? 'y' : 'ies') + ' in the file were ignored because they are not Rex data or were unsafe.</p>' : '') +
      '<p class="fb-note">Choose what to restore. Ticked sections are <b>replaced</b> with the file’s version. Anything not ticked, and anything not in the file, stays exactly as it is. A safety copy of what gets replaced is kept so you can undo.</p>' + rows +
      '<div class="fb-actions"><button type="button" class="btn" data-fbclose>Cancel</button><button type="button" class="btn btn-primary" data-fbgo>Restore selected</button></div>';
    pending = v; m.classList.add('show'); const f = m.querySelector('input'); if (f) f.focus();
  }
  function onFile(input) {
    const f = input.files && input.files[0]; input.value = ''; if (!f) return;
    const r = new FileReader();
    r.onerror = () => toast_('Could not read that file.', 'error');
    r.onload = () => { const v = validate(String(r.result), f.size); if (!v.ok) { toast_(v.error, 'error'); showError(v.error, f.name); return; } showPreview(v, f.name); };
    r.readAsText(f);
  }
  function showError(msg, name) { const m = modal(); $('fbPrev').innerHTML = '<p class="fb-note"><b>' + E(name) + '</b></p><ul class="fb-warn"><li>' + E(msg) + '</li></ul><p class="fb-note">Nothing was changed.</p><div class="fb-actions"><button type="button" class="btn" data-fbclose>Close</button></div>'; pending = null; m.classList.add('show'); }

  function paint() {
    const card = $('fbCard'); if (!card) return;
    const cur = currentKeys(), s = bySection(cur);
    let last = null, undo = null; try { last = JSON.parse(localStorage.getItem(K_LAST) || 'null'); } catch (e) {} try { undo = JSON.parse(localStorage.getItem(K_UNDO) || 'null'); } catch (e) {}
    const keep = {}; card.querySelectorAll('input[data-fbsec]').forEach(i => { keep[i.dataset.fbsec] = i.checked; });
    const urlKeep = $('fbUrls') ? $('fbUrls').checked : true;
    $('fbSecs').innerHTML = SECTIONS.map(x => { const n = s[x.id].keys.length; const on = x.id in keep ? keep[x.id] : !x.optional; return '<label class="fb-row' + (n ? '' : ' fb-empty') + '"><input type="checkbox" data-fbsec="' + x.id + '"' + (on ? ' checked' : '') + (n ? '' : ' disabled') + '><span class="fb-i">' + x.icon + '</span><span class="fb-t"><b>' + E(x.label) + '</b><small>' + (n ? n + ' item' + (n === 1 ? '' : 's') + ' · ' + kb(s[x.id].bytes) : 'Nothing saved yet') + '</small></span></label>'; }).join('');
    $('fbUrls').checked = urlKeep;
    $('fbLast').textContent = last && last.at ? 'Last full backup downloaded: ' + when(last.at) + ' (' + last.keys + ' items).' : 'You have not downloaded a full backup yet.';
    $('fbUndo').hidden = !(undo && undo.at); if (undo && undo.at) $('fbUndoT').textContent = 'You restored a backup. Your data from ' + when(undo.at) + ' is kept so you can go back.';
  }
  function build() {
    const settings = $('view-settings'); if (!settings || $('fbCard')) return;
    const dataCard = settings.querySelector(':scope > .card[data-sec="data"]'); if (!dataCard) return;
    const c = document.createElement('div'); c.className = 'card'; c.id = 'fbCard'; c.dataset.sec = 'data'; c.style.display = dataCard.style.display;
    c.innerHTML = '<div class="card-title"><h3>🧳 Full backup &amp; restore</h3></div>' +
      '<p class="set-note">Save everything Rex keeps in this browser in one file, and bring it back later or on another device. It is free, needs no account, and nothing is uploaded anywhere.</p>' +
      '<div id="fbSecs" class="fb-secs"></div>' +
      '<label class="fb-url"><input type="checkbox" id="fbUrls" checked> <span>Include my Discord webhook URLs <small>They work like passwords: keep the file private. Untick to leave them out.</small></span></label>' +
      '<div class="fb-actions"><button type="button" class="btn btn-primary" id="fbDl">⬇ Download full backup</button><button type="button" class="btn btn-secondary" id="fbUp">⬆ Restore from a backup file…</button><input type="file" id="fbFile" accept="application/json,.json" hidden></div>' +
      '<p class="fb-note" id="fbLast"></p>' +
      '<div id="fbUndo" class="fb-undo" hidden><span id="fbUndoT"></span> <button type="button" class="btn btn-sm" id="fbUndoBtn">↩ Undo last restore</button></div>' +
      '<p class="fb-note">Restoring only writes what is in the file and ticked: it never deletes anything else, and it never touches your app version or update settings. Rex reloads when a restore finishes.</p>';
    dataCard.insertAdjacentElement('afterend', c);
    $('fbDl').addEventListener('click', doExport); $('fbUp').addEventListener('click', () => $('fbFile').click()); $('fbFile').addEventListener('change', e => onFile(e.target)); $('fbUndoBtn').addEventListener('click', doUndo);
    paint();
  }

  /* one-time note after a restore reloaded the page */
  function afterReload() {
    let d = null; try { d = JSON.parse(localStorage.getItem(K_DONE) || 'null'); localStorage.removeItem(K_DONE); } catch (e) {}
    if (d && d.at) setTimeout(() => toast_(d.undone ? 'Restore undone. Your earlier data is back.' : 'Restore complete: ' + d.keys + ' item' + (d.keys === 1 ? '' : 's') + ' restored.' + (d.undo ? ' You can undo it in Settings → Data.' : ''), 'success'), 600);
  }

  build(); afterReload();
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'settings') { build(); paint(); } } catch (e) {} return r; };
  window.RexBackup = { build: () => buildExport(SECTIONS.filter(s => !s.optional).map(s => s.id), true), validate, sections: () => bySection(currentKeys()), paint };
})();
