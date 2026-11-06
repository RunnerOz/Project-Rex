/* Project Rex Center V13.6.0 · Discord-style live preview: dark and light themes, phone width, APP tag, real embed look, variables filled in.
   Display only. It never changes what is sent. Free and local. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const K = 'rex2101_preview';
  const rd = () => { try { const v = JSON.parse(localStorage.getItem(K) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const wr = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const cfg = Object.assign({ theme: 'dark', phone: false, vars: true }, rd());
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const nowText = () => { const d = new Date(); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return 'Today at ' + h + ':' + p2(d.getMinutes()) + ' ' + ap; };
  const fill = t => (cfg.vars && window.RexVars && typeof t === 'string') ? RexVars.apply(t) : t;

  // Discord-style text: bold, italic, underline, strike, `code`, ```blocks```, > quotes, # headings, links
  function rich(text) {
    if (/^```ansi\n/.test(String(text).trim())) return renderMsgPreview(text);
    const keep = []; const hold = h => '\u0001' + (keep.push(h) - 1) + '\u0001';
    let t = esc(text);
    t = t.replace(/```(?:[a-z]+\n)?([\s\S]*?)```/g, (m, c) => hold('<pre class="dpv-pre">' + c.replace(/^\n|\n$/g, '') + '</pre>'));
    t = t.replace(/`([^`\n]+)`/g, (m, c) => hold('<code>' + c + '</code>'));
    t = t.split('\n').map(l => {
      let m;
      if ((m = /^(#{1,3}) (.+)$/.exec(l))) return '<div class="dpv-h dpv-h' + m[1].length + '">' + m[2] + '</div>';
      if ((m = /^&gt; ?(.*)$/.exec(l))) return '<div class="dpv-q">' + m[1] + '</div>';
      if ((m = /^-# (.+)$/.exec(l))) return '<div class="dpv-sub">' + m[1] + '</div>';
      return l + '<br>';
    }).join('').replace(/<br>$/, '');
    t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a class="dpv-a">$1</a>');
    t = mdToHtml(t);
    return t.replace(/\u0001(\d+)\u0001/g, (m, i) => keep[+i]);
  }

  function frame() { return document.querySelector('.preview-wrap .discord'); }
  function toolbar() {
    const wrap = document.querySelector('.preview-wrap'); if (!wrap || $('dpvBar')) return;
    const bar = document.createElement('div'); bar.id = 'dpvBar'; bar.className = 'dpv-bar';
    bar.innerHTML = '<div class="dpv-seg" role="group" aria-label="Theme"><button type="button" data-t="dark">🌙 Dark</button><button type="button" data-t="light">☀️ Light</button></div>' +
      '<div class="dpv-seg" role="group" aria-label="Screen"><button type="button" data-p="0">🖥️ Desktop</button><button type="button" data-p="1">📱 Phone</button></div>' +
      '<label class="dpv-chk"><input type="checkbox" id="dpvVars"> Fill in {variables}</label>';
    const title = wrap.querySelector('.card-title'); title.insertAdjacentElement('afterend', bar);
    bar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.t) cfg.theme = b.dataset.t; if (b.dataset.p != null) cfg.phone = b.dataset.p === '1'; wr(cfg); apply(); });
    $('dpvVars').addEventListener('change', e => { cfg.vars = e.target.checked; wr(cfg); try { updatePreview(); } catch (x) { /* ignore */ } });
    $('dpvVars').checked = cfg.vars;
  }
  function apply() {
    const f = frame(); if (!f) return;
    f.classList.add('dpv'); f.classList.toggle('dpv-light', cfg.theme === 'light'); f.classList.toggle('dpv-dark', cfg.theme !== 'light'); f.classList.toggle('dpv-phone', !!cfg.phone);
    document.querySelectorAll('#dpvBar [data-t]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === cfg.theme)));
    document.querySelectorAll('#dpvBar [data-p]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.p === '1') === !!cfg.phone)));
  }
  function enhance() {
    const f = frame(); if (!f) return; toolbar(); apply();
    let d; try { d = collectBuilder(); } catch (e) { return; }
    const name = $('pName'); if (name && !f.querySelector('.dpv-app')) { const t = document.createElement('span'); t.className = 'dpv-app'; t.textContent = 'APP'; name.insertAdjacentElement('afterend', t); }
    const av = $('pAv'); if (av && !av.dataset.dpv) { av.dataset.dpv = 1; av.addEventListener('error', () => { av.style.visibility = 'hidden'; }); av.addEventListener('load', () => { av.style.visibility = ''; }); }
    const mt = f.querySelector('.mt'); if (mt) mt.textContent = nowText();
    const msg = $('pMsg'); if (msg) { const has = !!d.content; msg.innerHTML = has ? rich(fill(d.content)) : (d.embedOn ? '' : '<span class="dpv-ph">Your message will look like this…</span>'); msg.style.display = (has || !d.embedOn) ? '' : 'none'; }
    if (d.embedOn) {
      const e = d.embed, emb = $('pEmbed');
      if (!emb.querySelector('.dpv-auth')) { const a = document.createElement('div'); a.className = 'dpv-auth'; emb.insertBefore(a, emb.firstChild); }
      emb.querySelector('.dpv-auth').textContent = fill(e.author || ''); emb.querySelector('.dpv-auth').style.display = e.author ? '' : 'none';
      const t = $('pETitle'); t.textContent = fill(e.title) || (e.description || e.fields.length ? '' : 'Embed title'); t.classList.toggle('dpv-link', !!e.url); t.style.display = t.textContent ? '' : 'none';
      $('pEDesc').innerHTML = e.description ? rich(fill(e.description)) : '';
      $('pEUrl').style.display = 'none';
      const ff = $('pFields'), items = e.fields || [];
      Array.from(ff.children).forEach((c, i) => { const it = items[i]; c.classList.toggle('inl', !!(it && it.inline)); const s = c.querySelector('strong'), sp = c.querySelector('span'); if (it && s && sp) { s.textContent = fill(it.name); sp.textContent = fill(it.value); } });
      const foot = $('pEFoot'); const bits = [fill(e.footer || '')].filter(Boolean); if (e.timestamp) bits.push(nowText()); foot.textContent = bits.join(' • '); foot.style.display = bits.length ? '' : 'none';
    }
    const pb = $('pBtns'); if (pb) pb.classList.add('dpv-btns');
    const over = (d.content || '').length > 2000; const cc = $('charCount'); if (cc) cc.classList.toggle('dpv-over', over);
  }
  if (typeof window.updatePreview === 'function') { const orig = window.updatePreview; window.updatePreview = function () { const r = orig.apply(this, arguments); try { enhance(); } catch (e) { console.warn('preview', e); } return r; }; }
  const go = () => { try { toolbar(); apply(); } catch (e) { /* ignore */ } };
  /* repaint the preview only when the builder is actually opened, so nothing loads (like the default avatar) before that */
  const prevShow = window.showView;
  if (typeof prevShow === 'function') window.showView = function (n) { const r = prevShow.apply(this, arguments); if (n === 'builder') { try { toolbar(); apply(); window.updatePreview(); } catch (e) { /* ignore */ } } return r; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(go, 500)); else setTimeout(go, 500);
  window.RexPreview = { cfg: () => Object.assign({}, cfg), set: o => { Object.assign(cfg, o); wr(cfg); apply(); try { updatePreview(); } catch (e) { /* ignore */ } } };
})();
