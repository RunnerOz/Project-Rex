/* Project Rex Center V13.2.0 · Data Health: storage used, a scan for damaged items, and a safe one-tap repair.
   Free and local. A repair always makes a safety backup first, keeps a copy of anything it changes in a quarantine box, and never deletes your data. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), view = $('view-datahealth'); if (!view) return;
  const QK = 'rex1903_quarantine', LK = 'rex1902_repairlog', RP = 'rex101_restore_points', MAIN = 'projectRexV42';
  const ARR = { rex101_projects: 'projects', rex101_notes: 'notes', rex101_workflows: 'workflows', rex101_tasks: 'tasks' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const raw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const parse = s => { try { return { ok: true, v: JSON.parse(s) }; } catch (e) { return { ok: false }; } };
  const keys = () => { const a = []; try { for (let i = 0; i < localStorage.length; i++) a.push(localStorage.key(i)); } catch (e) { /* ignore */ } return a; };
  const bytes = () => { let n = 0; keys().forEach(k => { n += (k.length + (raw(k) || '').length) * 2; }); return n; };
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const QUOTA = 5 * 1024 * 1024; // typical browser limit for this kind of storage
  const rdJ = (k, d) => { const p = parse(raw(k)); return p.ok && p.v != null ? p.v : d; };
  const wrJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const validPoint = p => !!(p && typeof p === 'object' && p.storage && typeof p.storage === 'object' && Object.keys(p.storage).length > 0 && Number(p.created) > 0);
  const nice = k => ARR[k] ? ARR[k] : k === MAIN ? 'main settings and webhooks' : k === RP ? 'restore points' : k;

  /* ---- scan ---- */
  function backupCopy(k) { // newest backup whose copy of this key is readable
    const list = rdJ(RP, []); if (!Array.isArray(list)) return null;
    const sorted = list.filter(validPoint).sort((a, b) => b.created - a.created);
    for (const p of sorted) { const s = p.storage[k]; if (typeof s === 'string' && parse(s).ok) return { text: s, when: p.created }; }
    return null;
  }
  function scan() {
    const issues = [], ks = keys().filter(k => k !== QK && k !== LK);
    let checked = 0;
    ks.forEach(k => {
      const r = raw(k); checked++;
      if (r == null || r === '' || !/^\s*[\[{"]/.test(r) && !/^(true|false|null|-?\d)/.test(r)) return; // plain text values are fine
      if (!/^\s*[\[{]/.test(r)) return;
      const p = parse(r);
      if (!p.ok) { issues.push({ id: 'bad:' + k, key: k, sev: 'bad', title: 'Unreadable data in “' + nice(k) + '”', detail: 'The saved text is damaged and cannot be read.', fix: 'badjson' }); return; }
      if (ARR[k] && !Array.isArray(p.v)) issues.push({ id: 'shape:' + k, key: k, sev: 'bad', title: 'Wrong shape in “' + nice(k) + '”', detail: 'This should be a list but is not.', fix: 'badjson' });
      else if (ARR[k]) { const n = p.v.filter(x => !x || typeof x !== 'object').length; if (n) issues.push({ id: 'items:' + k, key: k, sev: 'warn', title: n + ' broken item' + (n === 1 ? '' : 's') + ' in your ' + nice(k), detail: 'Empty or damaged entries. They will be moved to the quarantine box, not deleted.', fix: 'items' }); }
    });
    const m = parse(raw(MAIN)); if (m.ok && m.v && typeof m.v === 'object') {
      if (!Array.isArray(m.v.workspaces) || !m.v.workspaces.length) issues.push({ id: 'ws', key: MAIN, sev: 'bad', title: 'Workspaces missing from the main data', detail: 'Webhooks and history are stored in workspaces.', fix: 'badjson' });
      else { let noUrl = 0; m.v.workspaces.forEach(w => (w && w.webhooks || []).forEach(h => { if (!h || !h.url || !h.id) noUrl++; })); if (noUrl) issues.push({ id: 'whs', key: MAIN, sev: 'warn', title: noUrl + ' webhook' + (noUrl === 1 ? '' : 's') + ' missing a link or id', detail: 'Open the Webhook builder and press Edit to fix the link. Rex will not change these for you.', fix: null }); }
    }
    const pts = rdJ(RP, []);
    if (Array.isArray(pts)) { const junk = pts.filter(p => !validPoint(p)).length, good = pts.filter(validPoint).length;
      if (junk) issues.push({ id: 'pts', key: RP, sev: 'warn', title: junk + ' empty or damaged restore point' + (junk === 1 ? '' : 's'), detail: good ? 'Your ' + good + ' good backup' + (good === 1 ? ' is' : 's are') + ' safe. The damaged ones will be moved to the quarantine box.' : 'You have no good backup yet. Press “Back up now” in Rex Backup.', fix: good ? 'points' : null });
      if (!good && !junk) issues.push({ id: 'nobk', key: RP, sev: 'info', title: 'No backup yet', detail: 'Press “Back up now” so you can recover if something goes wrong.', fix: 'backup' }); }
    const used = bytes(); if (used > QUOTA * 0.8) issues.push({ id: 'full', key: '', sev: 'warn', title: 'Browser storage is ' + Math.round(used / QUOTA * 100) + '% full', detail: 'Download a backup file, then remove things you no longer need. Rex never deletes your data on its own.', fix: null });
    return { issues, checked, used, at: Date.now() };
  }

  /* ---- repair ---- */
  function quarantine(key, what, text) {
    const q = rdJ(QK, []); const list = Array.isArray(q) ? q : [];
    list.unshift({ at: Date.now(), key, what, text: String(text).slice(0, 200000) }); // keep the damaged text so nothing is lost
    return wrJ(QK, list.slice(0, 30)) || wrJ(QK, list.slice(0, 5));
  }
  function repairOne(i) {
    const r = raw(i.key);
    if (i.fix === 'badjson') {
      if (!quarantine(i.key, i.title, r || '')) return { done: false, note: 'storage is full; nothing was changed' };
      const b = backupCopy(i.key);
      if (b) { localStorage.setItem(i.key, b.text); return { done: true, note: 'restored from your backup of ' + new Date(b.when).toLocaleDateString() }; }
      if (ARR[i.key]) { localStorage.setItem(i.key, '[]'); return { done: true, note: 'started a fresh empty list (the damaged text is kept in the quarantine box)' }; }
      return { done: false, note: 'no good backup copy found, so it was left as it is (a copy is in the quarantine box)' };
    }
    if (i.fix === 'items') { const a = rdJ(i.key, []); const bad = a.filter(x => !x || typeof x !== 'object'); quarantine(i.key, i.title, JSON.stringify(bad)); wrJ(i.key, a.filter(x => x && typeof x === 'object')); return { done: true, note: 'moved ' + bad.length + ' broken item' + (bad.length === 1 ? '' : 's') + ' to the quarantine box' }; }
    if (i.fix === 'points') { const a = rdJ(RP, []); const bad = a.filter(p => !validPoint(p)); quarantine(RP, i.title, JSON.stringify(bad)); wrJ(RP, a.filter(validPoint)); return { done: true, note: 'moved ' + bad.length + ' to the quarantine box; good backups untouched' }; }
    if (i.fix === 'backup') { const ok = window.RexV110 && RexV110.silentBackup('Backup · ' + new Date().toLocaleString()); return { done: !!ok, note: ok ? 'backup saved' : 'could not save the backup' }; }
    return { done: false, note: 'needs you to fix it by hand' };
  }
  function repairAll() {
    const s = scan(), fixable = s.issues.filter(i => i.fix);
    if (!fixable.length) { say('Nothing to repair', 'success'); return { fixed: 0, notes: [] }; }
    /* 1. Protect existing data first. If that fails, change nothing. */
    let safe = false; try { safe = !!(window.RexV110 && RexV110.silentBackup('Safety backup before Data Health repair · ' + new Date().toLocaleString())); } catch (e) { safe = false; }
    if (!safe) { say('Could not make a safety backup first, so nothing was changed. Download a backup file, free some space, then try again.', 'error'); return { fixed: 0, notes: [], blocked: true }; }
    const notes = []; let fixed = 0;
    fixable.forEach(i => { if (i.fix === 'backup') return; let r; try { r = repairOne(i); } catch (e) { r = { done: false, note: 'skipped because of an error' }; } if (r.done) fixed++; notes.push({ title: i.title, ok: r.done, note: r.note }); });
    const log = rdJ(LK, []); (Array.isArray(log) ? log : []).unshift({ at: Date.now(), fixed, notes }); wrJ(LK, (Array.isArray(log) ? log : []).slice(0, 30));
    return { fixed, notes };
  }
  function say(m, t) { try { toast(m, t || 'info'); } catch (e) { /* ignore */ } }

  /* ---- recent app errors: kept only on this device so a problem can be copied and shared ---- */
  const EK = 'rex1905_errors';
  function logErr(msg, where) {
    try { if (/ResizeObserver|Script error\.?$/.test(String(msg))) return; const a = rdJ(EK, []); const list = Array.isArray(a) ? a : []; const m = String(msg).slice(0, 300);
      if (list[0] && list[0].m === m) { list[0].n = (list[0].n || 1) + 1; list[0].at = Date.now(); } else list.unshift({ at: Date.now(), m, w: String(where || '').slice(0, 120), n: 1 });
      wrJ(EK, list.slice(0, 20)); } catch (e) { /* never let logging cause an error */ }
  }
  window.addEventListener('error', e => logErr(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', e => logErr(e.reason && e.reason.message ? e.reason.message : e.reason, 'promise'));

  /* ---- page ---- */
  let last = null;
  function top(used) {
    const pct = Math.min(100, Math.round(used / QUOTA * 100)), cls = pct > 85 ? 'bad' : pct > 60 ? 'warn' : 'good';
    const per = keys().map(k => [k, (k.length + (raw(k) || '').length) * 2]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return '<div class="dh-store"><div class="dh-bar ' + cls + '" role="img" aria-label="Storage ' + pct + ' percent used"><i style="width:' + Math.max(2, pct) + '%"></i></div><p><b id="dhUsed">' + kb(used) + '</b> used of about ' + kb(QUOTA) + ' (' + pct + '%) · ' + keys().length + ' saved items</p>' +
      '<details><summary>Biggest items</summary>' + per.map(p => '<div class="dh-per"><span>' + esc(nice(p[0])) + '</span><b>' + kb(p[1]) + '</b></div>').join('') + '</details></div>';
  }
  function paint(msg) {
    last = last || scan();
    const bad = last.issues.filter(i => i.sev === 'bad').length, warn = last.issues.filter(i => i.sev === 'warn').length, fix = last.issues.filter(i => i.fix && i.fix !== 'backup').length;
    const pill = !last.issues.length ? ['good', '✅ Everything looks healthy'] : bad ? ['bad', '🔴 ' + bad + ' damaged'] : ['warn', '🟡 ' + (warn || last.issues.length) + ' to look at'];
    const q = rdJ(QK, []), qn = Array.isArray(q) ? q.length : 0, log = rdJ(LK, []);
    view.innerHTML = '<div class="card dh"><div class="card-title"><h3>🩺 Data Health</h3><span class="r11-pill ' + pill[0] + '" id="dhPill">' + pill[1] + '</span></div>' +
      '<p class="r11-muted">Checks your saved data for damage. It never deletes your projects, notes, settings or files. Before any repair Rex saves a safety backup, and anything it changes is kept in a quarantine box.</p>' +
      top(last.used) +
      '<div class="r11-actions"><button class="sbtn primary" id="dhScan">🔍 Scan now</button>' + (fix ? '<button class="sbtn" id="dhFix">🛠️ Repair (' + fix + ')</button>' : '') + '<button class="sbtn" onclick="RexV101.exportBackup()">⇩ Download backup file</button></div>' +
      (msg ? '<p class="dh-msg" role="status">' + esc(msg) + '</p>' : '') +
      '<p class="r11-muted">Checked ' + last.checked + ' saved items at ' + new Date(last.at).toLocaleTimeString() + '.</p>' +
      '<div id="dhList">' + (last.issues.length ? last.issues.map(i => '<div class="dh-item ' + i.sev + '"><b>' + (i.sev === 'bad' ? '🔴' : i.sev === 'warn' ? '🟡' : 'ℹ️') + ' ' + esc(i.title) + '</b><span>' + esc(i.detail) + '</span></div>').join('') : '<div class="dh-item ok"><b>✅ No problems found</b><span>Every saved item can be read.</span></div>') + '</div>' +
      (function () { const er = rdJ(EK, []); return Array.isArray(er) && er.length ? '<details class="dh-q"><summary>Recent app problems (' + er.length + ')</summary><p class="r11-muted">Things that went wrong inside Rex on this device. Nothing leaves your browser. Copy this if you ever need help.</p>' + er.slice(0, 8).map(x => '<div class="dh-err">' + new Date(x.at).toLocaleString() + (x.n > 1 ? ' ×' + x.n : '') + ' · ' + esc(x.m) + (x.w ? ' (' + esc(x.w) + ')' : '') + '</div>').join('') + '<div class="r11-actions"><button class="sbtn" id="dhCopyErr">Copy</button><button class="sbtn" id="dhClearErr">Clear this list</button></div></details>' : ''; })() +
      (qn ? '<details class="dh-q"><summary>Quarantine box (' + qn + ')</summary><p class="r11-muted">Copies of anything a repair changed. Nothing here is ever removed automatically.</p></details>' : '') +
      (Array.isArray(log) && log.length ? '<details class="dh-q"><summary>Repair history (' + log.length + ')</summary>' + log.slice(0, 5).map(l => '<p class="r11-muted">' + new Date(l.at).toLocaleString() + ' · ' + l.fixed + ' fixed</p>').join('') + '</details>' : '') + '</div>';
    $('dhScan').onclick = () => { last = scan(); paint('Scan finished. ' + (last.issues.length ? last.issues.length + ' item' + (last.issues.length === 1 ? '' : 's') + ' found.' : 'No problems found.')); };
    const ce = $('dhCopyErr'); if (ce) ce.onclick = () => { const t = rdJ(EK, []).map(x => new Date(x.at).toISOString() + ' ' + x.m + ' (' + x.w + ')').join('\n'); try { navigator.clipboard.writeText(t); say('Copied', 'success'); } catch (e) { say('Could not copy', 'error'); } };
    const cl = $('dhClearErr'); if (cl) cl.onclick = () => { try { localStorage.removeItem(EK); } catch (e) { /* ignore */ } paint('Problem list cleared.'); };
    const f = $('dhFix'); if (f) f.onclick = () => { const r = repairAll(); if (r.blocked) { paint('Nothing was changed: a safety backup could not be saved.'); return; } last = scan(); paint('Repair finished: ' + r.fixed + ' fixed. ' + r.notes.map(n => n.note).join('; ')); if (r.fixed) { window.__rexResetting = true; setTimeout(() => location.reload(), 1800); } };
  }
  try { if (typeof views === 'object') views.datahealth = ['Data Health', 'Scan, protect and repair saved data']; } catch (e) { /* ignore */ }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); if (n === 'datahealth') { try { last = scan(); paint(); } catch (e) { console.error('Data Health', e); } } return r; };
  try { if (typeof COMMANDS !== 'undefined' && !COMMANDS.some(c => c.name === 'Open Data Health')) COMMANDS.push({ name: 'Open Data Health', run: () => showView('datahealth') }, { name: 'Scan my data for problems', run: () => showView('datahealth') }); } catch (e) { /* ignore */ }
  window.RexHealth = { logErr, errors: () => rdJ(EK, []), scan, repairAll, quarantine: () => rdJ(QK, []), log: () => rdJ(LK, []) };
})();
