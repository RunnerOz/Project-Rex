/* Project Rex Center 12.10.0 - Language support (free, offline, no services).
   Translates the interface by matching exact English strings against bundled files (js/i18n-data.js).
   Your own content (webhook names, messages, notes, notifications, plugins, the Update Log) is never touched.
   Switching back to English restores everything. Coverage is the main screens; the rest stays in English.
   Own data: rex1300_lang = {lang:'en'|'es'|'fr'|'pt'} */
(function () {
  'use strict';
  const K = 'rex1300_lang', D = window.RexI18nData; if (!D) return;
  const LANGS = { en: 'English', es: 'Español', fr: 'Français', pt: 'Português' }, IDX = { es: 1, fr: 2, pt: 3 };
  const LANG_HTML = { en: 'en', es: 'es', fr: 'fr', pt: 'pt' };
  let lang = 'en';
  try { const o = JSON.parse(localStorage.getItem(K) || 'null'); if (o && LANGS[o.lang]) lang = o.lang; } catch (e) {}
  const SKIP = 'input,textarea,select#webhookSelect,[data-no-i18n],script,style,code,pre,#notifList,#plList,#plHome,.pl-card,.ul,.ul *,#ulBody,.uc-notes,.cl-body,[contenteditable="true"],.msg-preview,#preview,.dc-embed,.wh-name,.tl-item';
  const map = new Map(); D.rows.forEach(r => map.set(r[0].toLowerCase(), r));
  const PRE = /^[^\p{L}\p{N}]+/u, SUF = /[\s:.…]+$/u;
  const textRec = new WeakMap(), attrRec = new WeakMap();
  function tr(s) {
    const i = IDX[lang]; if (!i || !s) return null;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2]; if (!core || core.length > 160) return null;
    let hit = map.get(core.toLowerCase()), pre = '', suf = '', body = core;
    if (!hit) { const p = PRE.exec(core); pre = p ? p[0] : ''; body = core.slice(pre.length); const q = SUF.exec(body); suf = q ? q[0] : ''; body = body.slice(0, body.length - suf.length); hit = body && map.get(body.toLowerCase()); }
    if (hit) { let out = hit[i]; if (body && body === body.toUpperCase() && /\p{L}/u.test(body)) out = out.toUpperCase(); return m[1] + pre + out + suf + m[3]; }
    for (const [re, outs] of D.patterns) { const x = re.exec(core); if (x) return m[1] + outs[i - 1].replace(/\$(\d)/g, (_, n) => x[+n] || '') + m[3]; }
    return null;
  }
  const skipped = n => { const e = n.nodeType === 1 ? n : n.parentElement; return !e || (e.closest && e.closest(SKIP)); };
  function doText(n) {
    let rec = textRec.get(n); const cur = n.data, orig = rec && cur === rec.out ? rec.orig : cur;
    if (lang === 'en') { if (rec && cur === rec.out) n.data = rec.orig; textRec.delete(n); return; }
    if (skipped(n)) return; const out = tr(orig);
    if (out != null && out !== cur) { n.data = out; textRec.set(n, { orig, out }); } else if (out == null) textRec.delete(n);
  }
  const ATTR = ['placeholder', 'title', 'aria-label'];
  function doEl(e) {
    if (e.nodeType !== 1) return; let rec = attrRec.get(e); if (!rec) { rec = {}; attrRec.set(e, rec); }
    ATTR.forEach(a => { if (!e.hasAttribute(a)) { delete rec[a]; return; } const cur = e.getAttribute(a), r = rec[a], orig = r && cur === r.out ? r.orig : cur;
      if (lang === 'en') { if (r && cur === r.out) e.setAttribute(a, r.orig); delete rec[a]; return; }
      if (skipped(e)) return; const out = tr(orig); if (out != null) { if (out !== cur) e.setAttribute(a, out); rec[a] = { orig, out }; } else delete rec[a]; });
  }
  function walk(root) {
    if (!root) return; if (root.nodeType === 3) { doText(root); return; } if (root.nodeType !== 1) return; if (root.closest && root.closest(SKIP) && lang !== 'en') return;
    doEl(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  let q = new Set(), raf = 0, obs = null;
  function flush() { raf = 0; if (!obs) return; obs.disconnect(); const items = [...q]; q = new Set(); try { items.forEach(walk); } catch (e) { console.error('i18n', e); } connect(); }
  function connect() { obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR }); }
  function start() {
    obs = new MutationObserver(ms => { if (lang === 'en') return; ms.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(n => q.add(n)); else q.add(m.target); }); if (!raf) raf = requestAnimationFrame(flush); });
    connect();
  }
  function apply() { if (!obs) return; obs.disconnect(); try { walk(document.body); } catch (e) { console.error('i18n', e); } connect(); document.documentElement.lang = LANG_HTML[lang] || 'en'; }
  function set(l, quiet) {
    if (!LANGS[l]) return; lang = l; try { localStorage.setItem(K, JSON.stringify({ lang: l })); } catch (e) {}
    apply(); paintPicker(); if (!quiet) { try { toast(l === 'en' ? 'Language: English' : 'Language: ' + LANGS[l], 'success'); } catch (e) {} }
  }
  function paintPicker() { const s = document.getElementById('lgSel'); if (s) s.value = lang; }
  function card() {
    const settings = document.getElementById('view-settings'); if (!settings || document.getElementById('lgCard')) return;
    const base = settings.querySelector(':scope > .card[data-sec="general"]'); if (!base) return;
    const c = document.createElement('div'); c.className = 'card'; c.id = 'lgCard'; c.dataset.sec = 'general'; c.style.display = base.style.display;
    c.innerHTML = '<div class="card-title"><h3>🌐 Language</h3></div><p class="muted" style="margin:0 0 10px">Choose the language for the main screens. Free, works offline, nothing is sent anywhere.</p><div class="pl-row"><select id="lgSel" aria-label="Language" data-no-i18n></select></div><p class="muted" style="margin:10px 0 0;font-size:.8rem" data-no-i18n>Translations are machine-made and cover the main screens only; anything not translated stays in English. Your own text is never changed.</p>';
    base.insertAdjacentElement('afterend', c); const sel = c.querySelector('select');
    Object.keys(LANGS).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = LANGS[k]; sel.appendChild(o); }); sel.value = lang; sel.addEventListener('change', () => set(sel.value));
  }
  const prev = window.showView;
  if (typeof prev === 'function') window.showView = function (n) { const r = prev.apply(this, arguments); try { if (n === 'settings') card(); } catch (e) { console.error('i18n', e); } return r; };
  try { if (typeof COMMANDS !== 'undefined') Object.keys(LANGS).forEach(k => COMMANDS.push({ name: 'Language: ' + LANGS[k], run: () => set(k) })); } catch (e) {}
  function init() { start(); if (lang !== 'en') apply(); document.documentElement.lang = LANG_HTML[lang]; }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
  window.RexI18n = { set, get: () => lang, tr, langs: LANGS, apply };
})();
