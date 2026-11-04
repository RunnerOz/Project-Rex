/* Project Rex Center V13.4.0 · Send history: status, plain-language reasons, Resend, filters, Retry all failed.
   Uses the history list Rex already keeps. Free and local. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let mode = 'all', busy = false;

  function ensureUI() {
    if ($('histMode')) return;
    const f = document.querySelector('#view-history .filters'); if (!f) return;
    const bar = document.createElement('div'); bar.id = 'histMode'; bar.className = 'hp-bar';
    bar.innerHTML = '<div class="hp-tabs" role="tablist" aria-label="Show">' + [['all', 'All'], ['failed', 'Failed'], ['sent', 'Sent']].map(t => '<button type="button" role="tab" data-m="' + t[0] + '" aria-selected="false">' + t[1] + ' <i data-c="' + t[0] + '"></i></button>').join('') + '</div><button type="button" class="sbtn" id="histRetryAll" hidden>↻ Retry all failed</button><span class="hp-note" id="histNote" role="status"></span>';
    f.insertAdjacentElement('afterend', bar);
    bar.addEventListener('click', e => {
      const t = e.target.closest('[data-m]'); if (t) { mode = t.dataset.m; render(); return; }
      if (e.target.id === 'histRetryAll') retryAll();
    });
    $('histList').addEventListener('click', e => { const b = e.target.closest('[data-resend]'); if (b) resend(b.dataset.resend); });
  }
  const whFor = h => { const L = ws().webhooks || []; return L.find(w => w.id === h.whId) || L.find(w => w.name === h.webhookName); };
  const canResend = h => !!(h && h.payload && whFor(h));
  function render() {
    ensureUI();
    const W = ws(), all = W.history || [];
    const q = (($('histSearch') || {}).value || '').toLowerCase(), fw = ($('histWh') || {}).value || '';
    const sel = $('histWh'); if (sel) { const cur = sel.value, names = Array.from(new Set(all.map(h => h.webhookName))); sel.innerHTML = '<option value="">All webhooks</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join(''); if (names.indexOf(cur) >= 0) sel.value = cur; }
    const failed = all.filter(h => h.ok === false), pending = failed.filter(h => !h.resentAt);
    const cnt = { all: all.length, failed: failed.length, sent: all.length - failed.length };
    document.querySelectorAll('#histMode [data-m]').forEach(b => { b.setAttribute('aria-selected', b.dataset.m === mode ? 'true' : 'false'); b.classList.toggle('on', b.dataset.m === mode); });
    document.querySelectorAll('#histMode i[data-c]').forEach(i => { i.textContent = cnt[i.dataset.c]; });
    const ra = $('histRetryAll'); if (ra) { const n = pending.filter(canResend).length; ra.hidden = !n; ra.textContent = '↻ Retry all failed (' + n + ')'; ra.disabled = busy; }
    let items = all.filter(h => (mode === 'all' || (mode === 'failed' ? h.ok === false : h.ok !== false)) && (!q || (h.message || '').toLowerCase().includes(q) || (h.webhookName || '').toLowerCase().includes(q) || (h.err || '').toLowerCase().includes(q)) && (!fw || h.webhookName === fw));
    const list = $('histList');
    if (!items.length) { list.innerHTML = '<div class="empty">' + (all.length ? 'Nothing matches' : 'No history') + '</div>'; return; }
    list.innerHTML = items.map(h => {
      const bad = h.ok === false, fixed = bad && h.resentAt;
      const icon = fixed ? '✅' : bad ? '⚠️' : h.resent ? '🔁' : '🚀';
      const status = fixed ? '<span class="hp-tag ok">Sent again</span>' : bad ? '<span class="hp-tag bad">Failed</span>' : h.resent ? '<span class="hp-tag">Resent</span>' : '';
      const btn = canResend(h) && (bad ? !h.resentAt : true) ? '<button type="button" class="sbtn hp-re" data-resend="' + esc(h.id) + '" ' + (busy ? 'disabled' : '') + '>' + (bad ? '↻ Resend' : 'Send again') + '</button>' : (bad && !h.resentAt ? '<small class="hp-why">' + (h.files ? 'Had files attached, so it cannot be resent here.' : 'The webhook was removed or the message was too large to keep.') + '</small>' : '');
      return '<div class="row-item hp-row' + (bad && !fixed ? ' bad' : '') + '"><div class="icon-box">' + icon + '</div><div class="info"><strong>' + esc(h.message) + '</strong><small>' + esc(h.webhookName) + ' · ' + esc(h.time) + '</small>' + (bad && h.err && !fixed ? '<small class="hp-err">' + esc(h.err) + '</small>' : '') + '</div>' + status + btn + '</div>';
    }).join('');
  }
  async function post(h) {
    const wh = whFor(h); if (!wh) throw new Error('This webhook no longer exists. Add it again in the Webhook builder.');
    let pl; try { pl = JSON.parse(h.payload); } catch (e) { throw new Error('The saved message could not be read.'); }
    if (window.RexVars) pl = RexVars.applyPayload(pl);
    let res;
    try { res = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl) }); }
    catch (e) { throw new Error(window.RexWH ? RexWH.errText(e) : 'Could not reach Discord.'); }
    if (!res.ok) { const t = await res.text().catch(() => ''); const err = new Error(window.RexWH ? RexWH.explain(res.status, t, wh) : 'Discord rejected the message (' + res.status + ').'); err.status = res.status; throw err; }
    return { wh, pl };
  }
  async function resend(id, quiet) {
    if (busy && !quiet) return false;
    const W = ws(), h = (W.history || []).find(x => x.id === id); if (!h) return false;
    if (!quiet) { busy = true; render(); }
    let ok = false;
    try {
      const r = await post(h); ok = true;
      W.sent++; try { trackDay(); } catch (e) { /* ignore */ }
      if (h.ok === false) h.resentAt = Date.now(); else h.resent = true;
      W.history.unshift({ id: String(Date.now()) + 'r', message: h.message, webhookName: r.wh.name, time: new Date().toLocaleString(), ok: true, resent: true, whId: r.wh.id, payload: h.payload });
      if (!quiet) toast('Sent again 🚀', 'success');
    } catch (e) {
      W.failed++; h.err = String(e.message || 'Send failed').slice(0, 300);
      if (!quiet) toast(h.err, 'error');
      resend.lastStatus = e.status;
    }
    try { save(); updateAll(); } catch (e) { /* ignore */ }
    if (!quiet) { busy = false; render(); }
    return ok;
  }
  async function retryAll() {
    if (busy) return;
    const todo = (ws().history || []).filter(h => h.ok === false && !h.resentAt && canResend(h));
    if (!todo.length) return;
    if (!confirm('Send ' + todo.length + ' failed message' + (todo.length === 1 ? '' : 's') + ' again now?')) return;
    busy = true; render(); let okN = 0, badN = 0; const note = $('histNote');
    for (let i = 0; i < todo.length; i++) {
      if (note) note.textContent = 'Sending ' + (i + 1) + ' of ' + todo.length + '…';
      resend.lastStatus = 0;
      if (await resend(todo[i].id, true)) okN++; else { badN++; if (resend.lastStatus === 429) { if (note) note.textContent = 'Discord asked to slow down. Stopped. Try again in a minute.'; break; } }
      await new Promise(r => setTimeout(r, 700));
    }
    busy = false; render();
    const msg = okN + ' sent' + (badN ? ', ' + badN + ' still failing' : '');
    if (note && !/slow down/.test(note.textContent)) note.textContent = msg;
    try { toast(msg, badN ? 'error' : 'success'); notify('Retry finished: ' + msg, badN ? 'error' : 'success', 'webhook'); } catch (e) { /* ignore */ }
  }
  window.RexHist = { render, resend, retryAll, mode: () => mode };
  setTimeout(() => { try { ensureUI(); } catch (e) { /* ignore */ } }, 400);
})();
