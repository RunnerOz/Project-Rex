/* Project Rex Center V14.1.0 · Story trail effects (free, local, no images or sounds to download).
   - the walked part of the trail marches, and a soft ring pulses where Rex is
   - each season has its own drifting particles: leaves, snow, clouds and stars, embers, fireflies
   - reached places twinkle, and tapping one throws confetti
   - Trail finds: a small collectible sits on the road between every two places. It lights up when you pass it; tap it to see what Rex found
   - a confetti shower when Rex reaches a new place
   Everything respects "Reduce motion" and the app's animation switch. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const THEMES = {
    one: { p: ['🍃', '✨', '🌼'], kind: 'leaf', finds: [['🍄', 'Red Mushroom'], ['🪵', 'Smooth Stick'], ['🌰', 'Acorn'], ['🪶', 'Blue Feather'], ['🍯', 'Honey Drop'], ['🐞', 'Lucky Ladybug'], ['🌻', 'Sunflower'], ['🪨', 'Round Pebble'], ['🍎', 'Wild Apple'], ['🦋', 'Butterfly Wing'], ['🔭', 'Tiny Spyglass']] },
    two: { p: ['❄️', '✨'], kind: 'snow', finds: [['🧤', 'Lost Mitten'], ['🍪', 'Gingerbread'], ['🔔', 'Sleigh Bell'], ['🎿', 'Mini Ski'], ['⛄', 'Snow Buddy'], ['🧊', 'Clear Ice Cube'], ['🕯️', 'Lantern Candle'], ['🐧', 'Penguin Pin'], ['🎁', 'Wrapped Gift'], ['🧣', 'Striped Scarf'], ['⭐', 'Frost Star']] },
    three: { p: ['☁️', '✨', '⭐'], kind: 'star', finds: [['🎈', 'Red Balloon'], ['🧭', 'Sky Compass'], ['🪁', 'Paper Kite'], ['🛰️', 'Toy Satellite'], ['🌟', 'Fallen Star'], ['🪙', 'Cloud Coin'], ['🔑', 'Brass Key'], ['🐚', 'Sky Shell'], ['🍓', 'Cloudberry'], ['📻', 'Tiny Radio'], ['💫', 'Spark Dust']] },
    four: { p: ['🔥', '✨'], kind: 'ember', finds: [['🌵', 'Pocket Cactus'], ['🪔', 'Clay Lamp'], ['🧿', 'Blue Charm'], ['🐪', 'Camel Bell'], ['🏺', 'Little Jar'], ['🦂', 'Friendly Scorpion'], ['🪙', 'Old Coin'], ['🌶️', 'Chili Pepper'], ['💎', 'Red Gem'], ['🧭', 'Desert Compass'], ['🔥', 'Warm Coal']] },
    five: { p: ['✨', '🦋', '💫'], kind: 'fly', finds: [['🌙', 'Moon Sliver'], ['🍄', 'Glow Cap'], ['🕯️', 'Dream Candle'], ['🦉', 'Owl Pin'], ['📖', 'Tiny Storybook'], ['🧸', 'Sleepy Bear'], ['🔮', 'Wish Orb'], ['🪞', 'Pocket Mirror'], ['🎼', 'Lullaby Note'], ['🪻', 'Night Flower'], ['⭐', 'Nap Star']] }
  };
  const WORD = { one: /story mode/i, two: /season two/i, three: /season three/i, four: /season four/i, five: /season five/i };
  const themeOf = svg => { const l = svg.getAttribute('aria-label') || ''; for (const k of ['two', 'three', 'four', 'five']) if (WORD[k].test(l)) return k; return 'one'; };
  const calm = () => document.body.classList.contains('anim-off') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mk = (n, a, t) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; };
  const pos = g => { const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform') || ''); return m ? [+m[1], +m[2]] : null; };
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (e) { /* ignore */ } };

  function particles(svg, th) {
    const g = mk('g', { class: 'fx-parts fx-' + THEMES[th].kind, 'aria-hidden': 'true', 'pointer-events': 'none' });
    const N = 16;
    for (let i = 0; i < N; i++) {
      const x = 30 + ((i * 6151) % 940), dur = 9 + (i * 7) % 9, del = -((i * 5) % dur), sz = 14 + (i * 3) % 12, ch = THEMES[th].p[i % THEMES[th].p.length];
      const t = mk('text', { x, y: 0, class: 'fx-p', 'font-size': sz, 'text-anchor': 'middle', style: '--dur:' + dur + 's;--del:' + del + 's;--dx:' + (((i * 37) % 60) - 30) + 'px' }, ch);
      g.appendChild(t);
    }
    return g;
  }

  function decorate(svg) {
    if (svg.dataset.fx) return; svg.dataset.fx = '1';
    const th = themeOf(svg), T = THEMES[th], nodes = [...svg.querySelectorAll('g.st-n')];
    svg.classList.add('fx-' + th);
    const road = svg.querySelector('.st-road'); if (road && road.nextSibling) svg.insertBefore(particles(svg, th), road); else svg.appendChild(particles(svg, th));
    const first = svg.querySelector('g.st-n'); const way = mk('g', { class: 'fx-ways' });
    for (let i = 0; i < nodes.length - 1 && i < T.finds.length; i++) {
      const a = pos(nodes[i]), b = pos(nodes[i + 1]); if (!a || !b) continue;
      const got = nodes[i + 1].classList.contains('on'), f = T.finds[i];
      const g = mk('g', { class: 'fx-way' + (got ? ' got' : ''), tabindex: '0', role: 'button', 'data-i': i, transform: 'translate(' + ((a[0] + b[0]) / 2).toFixed(1) + ' ' + ((a[1] + b[1]) / 2).toFixed(1) + ')', 'aria-label': got ? 'Trail find: ' + f[1] : 'Trail find, not reached yet' });
      g.appendChild(mk('circle', { r: 17 })); g.appendChild(mk('text', { y: 7, 'text-anchor': 'middle', 'font-size': 19 }, got ? f[0] : '❔'));
      way.appendChild(g);
    }
    if (first) svg.insertBefore(way, first);
    nodes.forEach((n, i) => { if (n.classList.contains('on')) { const o = pos(n); if (o) n.appendChild(mk('text', { class: 'fx-tw', x: 30, y: -26, 'font-size': 16, 'text-anchor': 'middle', style: '--d:' + ((i * 0.37) % 2.4).toFixed(2) + 's' }, '✦')); } });
    const on = nodes.filter(n => n.classList.contains('on')), cur = on[on.length - 1];
    if (cur) cur.insertBefore(mk('circle', { class: 'fx-ring', r: 46 }), cur.firstChild);
  }

  function burst(x, y, chars, n) {
    if (calm()) return;
    const host = document.body, N = n || 14;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span'); s.className = 'fx-conf'; s.textContent = chars[i % chars.length];
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5, d = 60 + Math.random() * 90;
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--tx:' + Math.cos(ang) * d + 'px;--ty:' + (Math.sin(ang) * d - 40) + 'px;--r:' + (Math.random() * 540 - 270) + 'deg;font-size:' + (14 + Math.random() * 12) + 'px';
      host.appendChild(s); setTimeout(() => s.remove(), 1300);
    }
  }
  function shower() {
    if (calm()) return; const w = innerWidth;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span'); s.className = 'fx-rain'; s.textContent = ['🎉', '✨', '⭐', '🎊', '💫'][i % 5];
      s.style.cssText = 'left:' + Math.round(Math.random() * w) + 'px;--dl:' + (Math.random() * 0.8).toFixed(2) + 's;--du:' + (1.6 + Math.random() * 1.4).toFixed(2) + 's;font-size:' + (16 + Math.random() * 14) + 'px';
      document.body.appendChild(s); setTimeout(() => s.remove(), 3600);
    }
  }
  /* phones: the big map is hidden, so the same fun goes into the place list (finds strip) and behind the season banner (drifting particles) */
  function themeFromTabs(root) { const t = [...root.querySelectorAll('.stp-sn')], i = t.findIndex(x => x.classList.contains('on')); return ['one', 'two', 'three', 'four', 'five'][i < 0 ? 0 : i] || 'one'; }
  function decorateList(ol) {
    if (ol.dataset.fx) return; ol.dataset.fx = '1';
    const root = document.getElementById('view-story'), th = themeFromTabs(root), T = THEMES[th], items = [...ol.querySelectorAll('.st-li')];
    let got = 0; const chips = T.finds.slice(0, Math.max(0, items.length - 1)).map((f, i) => { const on = items[i + 1].classList.contains('on'); if (on) got++; return '<button type="button" class="fx-chip' + (on ? ' got' : '') + '" data-i="' + i + '" data-th="' + th + '" aria-label="' + (on ? 'Trail find: ' + f[1] : 'Trail find, not reached yet') + '"><span aria-hidden="true">' + (on ? f[0] : '❔') + '</span></button>'; }).join('');
    const box = document.createElement('div'); box.className = 'fx-finds'; box.innerHTML = '<div class="fx-fh"><b>Trail finds</b><small>' + got + ' of ' + Math.max(0, items.length - 1) + ' found</small></div><div class="fx-fr">' + chips + '</div>';
    ol.parentNode.insertBefore(box, ol);
  }
  function decorateHero(h) {
    if (h.dataset.fx) return; h.dataset.fx = '1';
    const th = themeFromTabs(document.getElementById('view-story')), T = THEMES[th], layer = document.createElement('div'); layer.className = 'fx-hp fx-h-' + T.kind; layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 9; i++) { const sp = document.createElement('span'); sp.textContent = T.p[i % T.p.length]; sp.style.cssText = 'left:' + (5 + (i * 11) % 90) + '%;--du:' + (7 + (i * 3) % 6) + 's;--dl:-' + ((i * 2) % 7) + 's;font-size:' + (13 + (i * 3) % 10) + 'px'; layer.appendChild(sp); }
    h.insertBefore(layer, h.firstChild);
  }
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  document.addEventListener('click', e => {
    const w = e.target.closest && e.target.closest('#view-story .fx-way');
    if (w) {
      const svg = w.ownerSVGElement, T = THEMES[themeOf(svg)], f = T.finds[+w.dataset.i], [x, y] = center(w);
      if (w.classList.contains('got')) { burst(x, y, [f[0], '✨'], 10); say(f[0] + ' Trail find: ' + f[1], 'success'); }
      else say('❔ Something is waiting on the road. Keep walking to find it.');
      return;
    }
    const c = e.target.closest && e.target.closest('#view-story .fx-chip');
    if (c) { const f = THEMES[c.dataset.th].finds[+c.dataset.i], [x, y] = center(c); if (c.classList.contains('got')) { burst(x, y, [f[0], '✨'], 10); say(f[0] + ' Trail find: ' + f[1], 'success'); } else say('❔ Something is waiting on the road. Keep walking to find it.'); return; }
    const n = e.target.closest && e.target.closest('#view-story g.st-n.on');
    if (n) { const [x, y] = center(n); burst(x, y, ['✨', '⭐', '🎉', '💫'], 14); }
  }, true);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('fx-way')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

  let q = 0;
  function scan() {
    q = 0; const v = document.getElementById('view-story'); if (!v) return;
    v.querySelectorAll('svg.st-map').forEach(decorate);
    v.querySelectorAll('ol.st-list').forEach(decorateList); v.querySelectorAll('.st-hero').forEach(decorateHero);
    v.querySelectorAll('.st-news').forEach(n => { if (!n.dataset.fx) { n.dataset.fx = '1'; shower(); } });
  }
  const v = document.getElementById('view-story');
  if (v) new MutationObserver(() => { if (!q) q = requestAnimationFrame(scan); }).observe(v, { childList: true, subtree: true });
  setTimeout(scan, 300);
  window.RexTrailFx = { scan, burst, shower };
})();
