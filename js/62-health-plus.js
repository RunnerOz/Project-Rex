/* Project Rex Center V14.0.0 · Data Health 2.0 (free, local).
   Adds to the Data Health page: a 0-100 health score with a plain checklist, real storage numbers, "Protect my data" (asks the browser not to clear it),
   backup status with one-tap backup and the automatic-backup switch, what takes up space by section, and safe cleanup tools.
   Nothing here deletes your projects, notes, settings or webhooks. Cleanup only touches old copies, logs and unused files, and asks first. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rdJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const kb = n => n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(n ? 1 : 0, Math.round(n / 1024)) + ' KB';
  const say = (m, t) => { try { toast(m, t || 'success'); } catch (e) { /* ignore */ } };
  const RP = 'rex101_restore_points', QK = 'rex1903_quarantine', EK = 'rex1905_errors';
  const KEEP = 3;
  let est = null, files = null, persisted = null, host = null, lastScan = null, note = '';

  async function gather() {
    est = null; files = null; persisted = null;
    try { if (navigator.storage && navigator.storage.estimate) est = await navigator.storage.estimate(); } catch (e) { /* ignore */ }
    try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) { /* ignore */ }
    try { if (window.RexCutscenes && RexCutscenes.files) files = await RexCutscenes.files(); } catch (e) { /* ignore */ }
  }
  function backup() { try { return window.RexV110 && RexV110.backupStatus ? RexV110.backupStatus() : null; } catch (e) { return null; } }
  function lsBytes() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (e) { /* ignore */ } return n; }

  /* the score and the checklist behind it */
  function checks() {
    const out = [], bk = backup(), sc = lastScan || { issues: [] };
    const bad = sc.issues.filter(i => i.sev === 'bad').length, warn = sc.issues.filter(i => i.sev === 'warn').length;
    out.push({ id: 'data', pts: Math.min(40, bad * 20 + warn * 6), ok: !bad && !warn, t: bad ? bad + ' damaged item' + (bad > 1 ? 's' : '') : warn ? warn + ' item' + (warn > 1 ? 's' : '') + ' to look at' : 'Saved data is readable', d: bad || warn ? 'Use Repair below. A safety backup is saved first.' : 'Every saved item passed the scan.' });
    if (bk) {
      const s = bk.state, pts = s === 'ok' ? 0 : s === 'overdue' ? 15 : 25;
      out.push({ id: 'backup', pts, ok: s === 'ok', t: s === 'ok' ? 'Backup is fresh' : s === 'overdue' ? 'Backup is getting old' : s === 'failed' ? 'Last backup failed' : 'No backup yet', d: bk.lastOk ? 'Last good backup: ' + new Date(bk.lastOk).toLocaleString() : 'Tap “Back up now”.', fix: s === 'ok' ? '' : 'backup' });
      out.push({ id: 'auto', pts: bk.auto ? 0 : 5, ok: !!bk.auto, t: bk.auto ? 'Automatic backups are on' : 'Automatic backups are off', d: bk.auto ? 'Rex keeps a fresh copy for you.' : 'Turn them on so you never forget.', fix: bk.auto ? '' : 'auto' });
    }
    let pct = null;
    if (est && est.quota) pct = Math.round((est.usage || 0) / est.quota * 100);
    else pct = Math.round(lsBytes() / (5 * 1048576) * 100);
    out.push({ id: 'space', pts: pct > 85 ? 20 : pct > 60 ? 8 : 0, ok: pct <= 60, t: pct > 85 ? 'Storage is almost full' : pct > 60 ? 'Storage is getting full' : 'Plenty of storage space', d: pct + '% of the space this browser gives Rex is used.', fix: pct > 60 ? 'clean' : '' });
    if (persisted !== null) out.push({ id: 'persist', pts: persisted ? 0 : 5, ok: !!persisted, t: persisted ? 'Data is protected' : 'Data is not protected yet', d: persisted ? 'The browser will not clear it to free space.' : 'Ask the browser to keep it even when space is low.', fix: persisted ? '' : 'persist' });
    const score = Math.max(0, 100 - out.reduce((n, c) => n + c.pts, 0));
    return { out, score };
  }

  function sectionsHTML() {
    let sec = {}; try { sec = RexBackup.sections(); } catch (e) { return ''; }
    const lab = {}; try { RexBackup.labels().forEach(l => { lab[l.id] = l; }); } catch (e) { /* ignore */ }
    const rows = Object.keys(sec).map(id => ({ id, n: sec[id].keys.length, b: sec[id].bytes * 2 })).filter(r => r.n).sort((a, b) => b.b - a.b);
    if (!rows.length) return '';
    const mx = rows[0].b || 1;
    return '<details class="dhp-sec"><summary>What takes up space</summary>' + rows.map(r => { const l = lab[r.id] || {}; return '<div class="dhp-row"><span>' + esc((l.icon || '📦') + ' ' + String(l.label || r.id).replace(/\s*\(.*$/, '')) + '</span><i style="--w:' + Math.max(3, Math.round(r.b / mx * 100)) + '%"></i><b>' + kb(r.b) + '</b></div>'; }).join('') + '</details>';
  }

  function cleanupHTML() {
    const pts = rdJ(RP, []), np = Array.isArray(pts) ? pts.length : 0, q = rdJ(QK, []), nq = Array.isArray(q) ? q.length : 0, er = rdJ(EK, []), ne = Array.isArray(er) ? er.length : 0;
    const old = Math.max(0, np - KEEP), unused = files && files.unused ? files.unused : [], ub = unused.reduce((n, i) => n + i.size, 0);
    const row = (id, ico, t, d, n, btn) => '<div class="dhp-tool"><span class="dhp-ico">' + ico + '</span><div><b>' + t + '</b><small>' + d + '</small></div><button class="sbtn" id="' + id + '"' + (n ? '' : ' disabled') + '>' + btn + '</button></div>';
    return '<div class="dhp-clean"><h4>🧹 Safe cleanup</h4><p class="r11-muted">Only old copies, logs and unused files. Your projects, notes, settings and webhooks are never touched.</p>' +
      row('dhpPts', '🗂️', 'Old restore points', np ? 'You have ' + np + '. Keeps the newest ' + KEEP + ', a fresh backup is made first.' : 'None saved yet.', old, old ? 'Trim ' + old : 'Nothing to trim') +
      row('dhpQ', '📦', 'Quarantine box', nq ? nq + ' copy' + (nq > 1 ? ' copies' : '') + ' of things a repair changed.' : 'Empty.', nq, nq ? 'Empty it' : 'Empty') +
      row('dhpErr', '📝', 'Problem log', ne ? ne + ' recorded message' + (ne > 1 ? 's' : '') + '.' : 'Empty.', ne, ne ? 'Clear' : 'Clear') +
      (files ? row('dhpFiles', '🎞️', 'Cutscene files', files.items.length ? files.items.length + ' file' + (files.items.length > 1 ? 's' : '') + ' (' + kb(files.total) + '), ' + unused.length + ' not used by any cutscene.' : 'No songs or fonts saved.', unused.length, unused.length ? 'Remove ' + kb(ub) : 'Nothing unused') : '') + '</div>';
  }

  function html() {
    const c = checks(), s = c.score, cls = s >= 85 ? 'good' : s >= 60 ? 'warn' : 'bad', bk = backup();
    const real = est && est.quota ? kb(est.usage || 0) + ' of about ' + kb(est.quota) + ' (all of Rex, including files)' : kb(lsBytes()) + ' of about 5 MB';
    const deg = Math.round(s * 3.6);
    return '<div class="card dhp"><div class="card-title"><h3>💚 Health score</h3></div>' +
      '<div class="dhp-top"><div class="dhp-ring ' + cls + '" role="img" aria-label="Health score ' + s + ' out of 100" style="--deg:' + deg + 'deg"><b id="dhpScore">' + s + '</b><small>/100</small></div>' +
      '<div class="dhp-list">' + c.out.map(x => '<div class="dhp-chk ' + (x.ok ? 'ok' : 'no') + '"><span>' + (x.ok ? '✅' : '⚠️') + '</span><div><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></div>' + (x.fix ? '<button class="sbtn dhp-fix" data-fix="' + x.fix + '">' + ({ backup: 'Back up now', auto: 'Turn on', persist: 'Protect', clean: 'Clean up' }[x.fix]) + '</button>' : '') + '</div>').join('') + '</div></div>' +
      '<p class="r11-muted dhp-real">Storage used: <b id="dhpReal">' + esc(real) + '</b>.' + (bk && bk.count ? ' ' + bk.count + ' restore point' + (bk.count > 1 ? 's' : '') + ' kept.' : '') + '</p>' +
      (note ? '<p class="dh-msg" role="status" id="dhpNote">' + esc(note) + '</p>' : '') +
      sectionsHTML() + cleanupHTML() + '</div>';
  }

  function ensureBackup() { try { if (window.RexV110) { RexV110.silentBackup('Before cleanup'); const st = RexV110.backupStatus(); return st.state !== 'failed' && st.state !== 'none'; } } catch (e) { /* ignore */ } return false; }
  const setNote = m => { note = m; draw(); };

  async function act(k) {
    if (k === 'backup') { try { RexV110.silentBackup('Manual'); const st = RexV110.backupStatus(); setNote(st.state === 'failed' ? 'Backup failed: ' + (st.error || 'storage may be full') : 'Backup saved in this browser.'); } catch (e) { setNote('Backup failed.'); } }
    else if (k === 'auto') { try { RexV110.setAutoBackup(true); setNote('Automatic backups turned on.'); } catch (e) { /* ignore */ } }
    else if (k === 'persist') { let ok = false; try { ok = await navigator.storage.persist(); } catch (e) { /* ignore */ } await gather(); setNote(ok ? 'Done. The browser will keep your data even when space is low.' : 'The browser said no this time. It often agrees once you use the app regularly or add it to your home screen.'); }
    else if (k === 'clean') { host && host.querySelector('.dhp-clean').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (k === 'pts') {
      const pts = rdJ(RP, []); if (!Array.isArray(pts) || pts.length <= KEEP) return;
      if (!confirm('Remove the ' + (pts.length - KEEP) + ' oldest restore points and keep the newest ' + KEEP + '?\n\nA fresh backup is saved first.')) return;
      if (!ensureBackup()) { setNote('Nothing was removed: a fresh backup could not be saved.'); return; }
      const cur = rdJ(RP, []), keep = cur.slice(0, KEEP); /* newest first */
      try { localStorage.setItem(RP, JSON.stringify(keep)); await gather(); setNote('Trimmed. Kept the newest ' + keep.length + '.'); } catch (e) { setNote('Could not trim.'); }
    }
    else if (k === 'q') {
      if (!confirm('Empty the quarantine box? It only holds copies of things a repair already changed.')) return;
      if (!ensureBackup()) { setNote('Nothing was removed: a fresh backup could not be saved.'); return; }
      try { localStorage.removeItem(QK); await gather(); setNote('Quarantine box emptied.'); } catch (e) { /* ignore */ }
    }
    else if (k === 'err') { try { localStorage.removeItem(EK); } catch (e) { /* ignore */ } setNote('Problem log cleared.'); }
    else if (k === 'files') {
      const u = files && files.unused ? files.unused.length : 0; if (!u) return;
      if (!confirm('Remove ' + u + ' song/font file' + (u > 1 ? 's' : '') + ' that no saved cutscene uses?\n\nCutscenes that use a file keep it.')) return;
      const r = await RexCutscenes.pruneFiles(); await gather(); setNote('Removed ' + r.removed + ' unused file' + (r.removed === 1 ? '' : 's') + ' (' + kb(r.bytes) + ' freed).');
    }
  }

  function draw() {
    if (!host) return;
    host.innerHTML = html();
    host.querySelectorAll('.dhp-fix').forEach(b => { b.onclick = () => act(b.dataset.fix); });
    const m = { dhpPts: 'pts', dhpQ: 'q', dhpErr: 'err', dhpFiles: 'files' };
    Object.keys(m).forEach(id => { const b = host.querySelector('#' + id); if (b) b.onclick = () => act(m[id]); });
  }

  /* called by the Data Health page every time it paints */
  function mount(view, scan) {
    lastScan = scan || lastScan;
    if (!host || !host.isConnected) { host = document.createElement('div'); host.id = 'dhpHost'; }
    view.insertBefore(host, view.firstChild);
    draw();
    gather().then(draw);
  }
  window.RexHealthPlus = { mount, score: () => checks().score, checks: () => checks().out, gather };
})();
