/* Project Rex Center 13.0.0 (RexOS 28) - Rex Journal and Habit Garden. Free, local, nothing is sent anywhere.
   Journal: a 30-second daily check-in (mood, one win, something to remember), a streak, a month calendar and a "a week ago" look-back.
   Habit Garden: up to 5 daily habits. Each one grows a plant as its streak grows; a missed day only makes it thirsty, nothing is ever reset or deleted.
   Own data: rex2000_journal = { e:{ "Y-M-D": {m:1-5, w, n, t} } }, rex2001_garden = { h:[{id,n,e,c}], d:{ "Y-M-D":[habit ids] } }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), jv = $('view-journal'), gv = $('view-garden'); if (!jv || !gv) return;
  const KJ = 'rex2000_journal', KG = 'rex2001_garden', MOODS = ['😞', '😕', '😐', '🙂', '😄'], MOODN = ['Rough', 'Meh', 'Okay', 'Good', 'Great'], MAXH = 5;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const key = (d) => { d = d instanceof Date ? d : new Date(d == null ? Date.now() : d); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const addDays = (d, n) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + n); return x; };
  const KEYRE = /^\d{4}-\d{1,2}-\d{1,2}$/;
  const say = (t, ty) => { try { toast(t, ty || 'success'); } catch (e) { /* ignore */ } };
  const rd = k => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const wr = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const streakOf = (has, from) => { let d = new Date(from || Date.now()); d.setHours(12, 0, 0, 0); if (!has(key(d))) d = addDays(d, -1); let n = 0; while (has(key(d)) && n < 4000) { n++; d = addDays(d, -1); } return n; };
  const bestOf = keys => { const t = keys.map(k => { const [y, m, d] = k.split('-').map(Number); return Math.round(new Date(y, m - 1, d, 12).getTime() / 864e5); }).sort((a, b) => a - b); let best = 0, run = 0, prev = null; t.forEach(x => { run = prev !== null && x === prev + 1 ? run + 1 : (x === prev ? run : 1); prev = x; best = Math.max(best, run); }); return best; };

  /* ---------- Journal data ---------- */
  function jload() {
    const o = rd(KJ), src = o.e && typeof o.e === 'object' && !Array.isArray(o.e) ? o.e : {}, e = {};
    Object.keys(src).forEach(k => { const v = src[k]; if (KEYRE.test(k) && v && typeof v === 'object') { const m = Math.round(+v.m); e[k] = { m: m >= 1 && m <= 5 ? m : 3, w: String(v.w || '').slice(0, 200), n: String(v.n || '').slice(0, 1500), t: +v.t > 0 ? +v.t : 0 }; } });
    return { e };
  }
  const jsave = o => wr(KJ, { e: o.e });
  let mood = 0, calMonth = null, selDay = null, formDay = '';

  function jbuild() {
    if (jv.dataset.b) return; jv.dataset.b = '1';
    jv.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">JOURNAL</span><h2>Rex Journal</h2><p>A 30-second check-in. How was today, one win, and anything worth remembering. It stays on this device.</p></div><div class="ar-bank"><b id="jrStreak">0</b><small>day streak</small></div></header>' +
      '<section class="card"><div class="card-title"><h3 id="jrToday">Today</h3><span class="jr-saved" id="jrSaved" role="status" aria-live="polite"></span></div>' +
      '<div class="jr-moods" id="jrMoods" role="radiogroup" aria-label="How was today?">' + MOODS.map((m, i) => '<button type="button" class="jr-mood" role="radio" data-m="' + (i + 1) + '" aria-checked="false" aria-label="' + MOODN[i] + '"><span>' + m + '</span><small>' + MOODN[i] + '</small></button>').join('') + '</div>' +
      '<label class="jr-l" for="jrWin">One win today</label><input type="text" id="jrWin" maxlength="200" placeholder="Something that went well, big or small">' +
      '<label class="jr-l" for="jrNote">Anything to remember</label><textarea id="jrNote" rows="4" maxlength="1500" placeholder="Thoughts, ideas, things to do tomorrow"></textarea>' +
      '<div class="rm-row"><button type="button" class="btn btn-primary" id="jrSave">Save today</button><button type="button" class="btn btn-secondary" id="jrClear">Clear today</button></div></section>' +
      '<section class="card"><div class="card-title"><h3>A week ago</h3></div><div id="jrAgo"></div></section>' +
      '<section class="card"><div class="card-title"><h3>Calendar</h3><div class="jr-nav"><button type="button" class="btn btn-secondary" id="jrPrev" aria-label="Previous month">‹</button><b id="jrMonth"></b><button type="button" class="btn btn-secondary" id="jrNext" aria-label="Next month">›</button></div></div><div class="jr-cal" id="jrCal" role="grid"></div><div class="jr-detail" id="jrDetail" aria-live="polite"></div><div class="fr-stats" id="jrStats"></div></section>';
    $('jrMoods').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mood = +b.dataset.m; paintMood(); });
    $('jrSave').onclick = jsaveToday; $('jrClear').onclick = () => { const o = jload(); delete o.e[key()]; jsave(o); mood = 0; $('jrWin').value = ''; $('jrNote').value = ''; jpaint(true); $('jrSaved').textContent = 'Cleared'; };
    $('jrPrev').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); jcal(); };
    $('jrNext').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); jcal(); };
    $('jrCal').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; selDay = b.dataset.k; jcal(); });
    $('jrDetail').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; const o = jload(); delete o.e[b.dataset.del]; jsave(o); if (b.dataset.del === key()) { mood = 0; $('jrWin').value = ''; $('jrNote').value = ''; } selDay = null; jpaint(true); });
  }
  function paintMood() { jv.querySelectorAll('.jr-mood').forEach(b => { const on = +b.dataset.m === mood; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); }
  function jsaveToday() {
    if (!mood) { $('jrSaved').textContent = 'Pick a mood first'; return; }
    const o = jload(); o.e[key()] = { m: mood, w: $('jrWin').value.trim().slice(0, 200), n: $('jrNote').value.trim().slice(0, 1500), t: Date.now() };
    if (jsave(o)) { $('jrSaved').textContent = 'Saved ✓'; say('Journal saved', 'success'); try { window.RexQuests && RexQuests.check(); } catch (e) { /* ignore */ } try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (e) { /* ignore */ } } else $('jrSaved').textContent = 'Could not save (browser storage is full or blocked)';
    jpaint(true);
  }
  function entryHtml(k, v) { const [y, m, d] = k.split('-').map(Number); return '<div class="jr-entry"><b>' + MOODS[v.m - 1] + ' ' + E(new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) + '</b>' + (v.w ? '<p><em>Win:</em> ' + E(v.w) + '</p>' : '') + (v.n ? '<p class="jr-n">' + E(v.n) + '</p>' : '') + '</div>'; }
  function jcal() {
    const o = jload(), first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1), days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate(), td = key();
    $('jrMonth').textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    let h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => '<span class="jr-dn" aria-hidden="true">' + x + '</span>').join('') + '<span></span>'.repeat(first.getDay());
    for (let d = 1; d <= days; d++) { const k = first.getFullYear() + '-' + (first.getMonth() + 1) + '-' + d, v = o.e[k]; h += '<button type="button" class="jr-day' + (v ? ' has m' + v.m : '') + (k === td ? ' today' : '') + (k === selDay ? ' sel' : '') + '" data-k="' + k + '" aria-label="' + first.toLocaleDateString(undefined, { month: 'long' }) + ' ' + d + (v ? ', ' + MOODN[v.m - 1] : ', no entry') + '"' + (k === selDay ? ' aria-current="date"' : '') + '>' + d + (v ? '<i>' + MOODS[v.m - 1] + '</i>' : '') + '</button>'; }
    $('jrCal').innerHTML = h;
    const v = selDay && o.e[selDay]; $('jrDetail').innerHTML = selDay ? (v ? entryHtml(selDay, v) + '<button type="button" class="btn btn-secondary" data-del="' + E(selDay) + '">Delete this entry</button>' : '<p class="ar-hint">No entry for that day.</p>') : '<p class="ar-hint">Tap a day to read it.</p>';
  }
  function jpaint(keepForm) {
    jbuild(); const o = jload(), keys = Object.keys(o.e), td = key(), mine = o.e[td];
    if (formDay !== td) { formDay = td; mood = mine ? mine.m : 0; $('jrWin').value = mine ? mine.w : ''; $('jrNote').value = mine ? mine.n : ''; $('jrSaved').textContent = mine ? 'Saved earlier ✓' : ''; }
    paintMood();
    $('jrToday').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    $('jrStreak').textContent = streakOf(k => !!o.e[k]);
    const ago = o.e[key(addDays(new Date(), -7))]; $('jrAgo').innerHTML = ago ? entryHtml(key(addDays(new Date(), -7)), ago) : '<p class="ar-hint">Nothing from a week ago yet. Entries will show up here as you write them.</p>';
    if (!calMonth) calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); jcal();
    const avg = keys.length ? (keys.reduce((a, k) => a + o.e[k].m, 0) / keys.length) : 0;
    $('jrStats').innerHTML = [['Entries', String(keys.length)], ['Best streak', bestOf(keys) + ' days'], ['Average mood', keys.length ? MOODS[Math.round(avg) - 1] + ' ' + avg.toFixed(1) : '—']].map(x => '<div><b>' + E(x[1]) + '</b><small>' + x[0] + '</small></div>').join('');
  }

  /* ---------- Garden data ---------- */
  const PLANTS = [[30, '🌸', 'In full bloom'], [14, '🌳', 'A tree'], [7, '🪴', 'Growing strong'], [3, '🌿', 'Sprouting'], [1, '🌱', 'Just planted'], [0, '🌰', 'A seed']];
  const plantFor = n => PLANTS.find(p => n >= p[0]);
  const EMOJI = ['💧', '📖', '🏃', '🧘', '🍎', '😴', '✍️', '🎸'];
  function gload() {
    const o = rd(KG), h = (Array.isArray(o.h) ? o.h : []).filter(x => x && typeof x === 'object' && x.id).slice(0, MAXH).map(x => ({ id: String(x.id).slice(0, 20), n: String(x.n || 'Habit').slice(0, 30), e: EMOJI.indexOf(x.e) >= 0 ? x.e : '🌱', c: +x.c > 0 ? +x.c : 0 }));
    const d = {}, src = o.d && typeof o.d === 'object' && !Array.isArray(o.d) ? o.d : {}; Object.keys(src).forEach(k => { if (KEYRE.test(k) && Array.isArray(src[k])) d[k] = src[k].map(String); });
    return { h, d };
  }
  const gsave = o => { const keep = {}, cut = key(addDays(new Date(), -400)); Object.keys(o.d).sort().slice(-400).forEach(k => { keep[k] = o.d[k]; }); return wr(KG, { h: o.h, d: keep }); };
  let pick = EMOJI[0];
  function gbuild() {
    if (gv.dataset.b) return; gv.dataset.b = '1';
    gv.innerHTML = '<header class="ar-hero"><div><span class="st-kicker">GARDEN</span><h2>Habit Garden</h2><p>Pick up to five small daily habits. Water one each day and its plant grows. Miss a day and it just gets thirsty. Nothing is ever reset.</p></div><div class="ar-bank"><b id="gdToday">0/0</b><small>watered today</small></div></header>' +
      '<section class="card"><div class="card-title"><h3>Your plants</h3></div><div class="gd-grid" id="gdGrid"></div></section>' +
      '<section class="card" id="gdAddCard"><div class="card-title"><h3>Plant a new habit</h3></div><div class="gd-add"><input type="text" id="gdName" maxlength="30" placeholder="e.g. Drink water, Read 10 pages" aria-label="Habit name"><div class="gd-emoji" id="gdEmoji" role="radiogroup" aria-label="Icon"></div><button type="button" class="btn btn-primary" id="gdAddBtn">Plant it</button></div><p class="ar-hint" id="gdMsg"></p></section>' +
      '<p class="ar-note">Growth stages: seed, planted (1 day), sprouting (3), growing (7), tree (14), bloom (30). Everything stays on this device.</p>';
    $('gdEmoji').innerHTML = EMOJI.map(x => '<button type="button" class="gd-em" role="radio" data-e="' + x + '" aria-checked="false" aria-label="Icon ' + x + '">' + x + '</button>').join('');
    $('gdEmoji').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; pick = b.dataset.e; paintPick(); });
    const add = () => { const n = $('gdName').value.trim(); const o = gload(); if (!n) { $('gdMsg').textContent = 'Give the habit a name first.'; return; } if (o.h.length >= MAXH) { $('gdMsg').textContent = 'The garden is full (5). Remove one to plant another.'; return; } o.h.push({ id: 'h' + Date.now().toString(36), n, e: pick, c: Date.now() }); gsave(o); $('gdName').value = ''; $('gdMsg').textContent = ''; gpaint(); };
    $('gdAddBtn').onclick = add; $('gdName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    $('gdGrid').addEventListener('click', e => {
      const w = e.target.closest('[data-w]'), x = e.target.closest('[data-x]'); const o = gload(), td = key();
      if (w) { const id = w.dataset.w, set = o.d[td] || (o.d[td] = []), i = set.indexOf(id); if (i >= 0) set.splice(i, 1); else set.push(id); if (!set.length) delete o.d[td]; gsave(o); gpaint(); try { window.RexQuests && RexQuests.check(); } catch (er) { /* ignore */ } try { document.dispatchEvent(new CustomEvent('rexplay')); } catch (er) { /* ignore */ } }
      if (x) { const h = o.h.find(v => v.id === x.dataset.x); if (h && confirm('Remove "' + h.n + '" from the garden? Its history is kept in case you plant it again.')) { o.h = o.h.filter(v => v.id !== h.id); gsave(o); gpaint(); } }
    });
  }
  function paintPick() { gv.querySelectorAll('[data-e]').forEach(b => { const on = b.dataset.e === pick; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); }
  function gpaint() {
    gbuild(); const o = gload(), td = key(), yd = key(addDays(new Date(), -1)); paintPick();
    const done = h => k => (o.d[k] || []).indexOf(h.id) >= 0;
    let wat = 0;
    $('gdGrid').innerHTML = o.h.length ? o.h.map(h => {
      const has = done(h), n = streakOf(has), p = plantFor(n), today = has(td), everDone = Object.keys(o.d).some(k => o.d[k].indexOf(h.id) >= 0), thirsty = !today && !has(yd) && everDone; if (today) wat++;
      const dots = [6, 5, 4, 3, 2, 1, 0].map(i => { const k = key(addDays(new Date(), -i)); return '<i class="' + (has(k) ? 'on' : '') + '" title="' + k + '"></i>'; }).join('');
      return '<div class="gd-card' + (thirsty ? ' thirsty' : '') + '" data-id="' + E(h.id) + '"><div class="gd-plant" aria-hidden="true">' + (thirsty ? '🥀' : p[1]) + '</div><b>' + h.e + ' ' + E(h.n) + '</b><small>' + (thirsty ? 'Thirsty. A drink brings it back.' : p[2]) + ' · ' + n + (n === 1 ? ' day' : ' days') + '</small><div class="gd-dots" aria-label="Last 7 days">' + dots + '</div><div class="rm-row"><button type="button" class="btn ' + (today ? 'btn-secondary' : 'btn-primary') + '" data-w="' + E(h.id) + '" aria-pressed="' + (today ? 'true' : 'false') + '">' + (today ? 'Watered ✓ (undo)' : '💧 Water today') + '</button><button type="button" class="btn btn-secondary" data-x="' + E(h.id) + '" aria-label="Remove ' + E(h.n) + '">Remove</button></div></div>';
    }).join('') : '<p class="fr-none">Your garden is empty. Plant your first habit below.</p>';
    $('gdToday').textContent = wat + '/' + o.h.length; $('gdAddBtn').disabled = o.h.length >= MAXH; if (o.h.length >= MAXH) $('gdMsg').textContent = 'The garden is full (5).';
  }

  /* ---------- public numbers for Today / Quests ---------- */
  function jstate() { const o = jload(); return { today: !!o.e[key()], streak: streakOf(k => !!o.e[k]), count: Object.keys(o.e).length }; }
  function gstate() { const o = gload(), td = key(); return { total: o.h.length, watered: o.h.filter(h => (o.d[td] || []).indexOf(h.id) >= 0).length, checkins: Object.keys(o.d).reduce((a, k) => a + o.d[k].length, 0) }; }

  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'journal') jpaint(false); if (n === 'garden') gpaint(); } catch (e) { console.error('Journal/Garden', e); } return r; };
  try { if (typeof views === 'object') { views.journal = ['Journal', 'A 30-second daily check-in']; views.garden = ['Habit Garden', 'Small habits, growing plants']; } } catch (e) { /* ignore */ }
  try { if (typeof COMMANDS !== 'undefined') { if (!COMMANDS.some(c => c.name === 'Open Journal')) COMMANDS.push({ name: 'Open Journal', run: () => showView('journal') }, { name: 'Open Habit Garden', run: () => showView('garden') }); } } catch (e) { /* ignore */ }
  window.RexJournal = { load: jload, state: jstate, key, streakOf, bestOf };
  window.RexGarden = { load: gload, state: gstate, plantFor };
})();
