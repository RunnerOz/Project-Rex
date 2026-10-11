/* Project Rex Center service worker (V11.3.2).
   Network-first for the app's own files so updates arrive as soon as you reload; the cache is only a fallback
   for offline use. Bump CACHE when you want old caches cleared. */
const CACHE = 'rex-v11.3.2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'js/01-main.js', 'js/02-clock-and-changelog.js', 'js/03-holidays.js', 'js/04-studio-and-restore.js', 'js/05-v11-features.js', 'js/06-v11-1-mobile-update.js', 'css/v11-1.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('rex-snap-') && k !== 'rex-meta').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin === self.location.origin) {
    // version.json and sw.js always come from the network; everything else may be served from a saved earlier version ("Go back").
    if (/\/(version\.json|sw\.js)$/.test(url.pathname)) { event.respondWith(networkFirst(url, req)); return; }
    event.respondWith(pinnedOrNetwork(url, req));
    return;
  }

  // Other sites (Google Fonts, weather, Discord): never intercept requests that send data; cache fonts only.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

function networkFirst(url, req) {
  // Our own files: try the network first (skipping the browser's stale copy), fall back to the cache when offline.
  return fetch(url.href, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)));
}

async function pinnedOrNetwork(url, req) {
  try {
    const meta = await caches.open('rex-meta');
    const pin = await meta.match('__rex_pin');
    if (pin) {
      const v = await pin.text();
      const snap = await caches.open('rex-snap-' + v);
      const key = url.pathname.endsWith('/') ? new URL('index.html', url).href : url.href;
      const hit = await snap.match(key, { ignoreSearch: true });
      if (hit) return hit;
    }
  } catch (e) { /* fall through to the network */ }
  return networkFirst(url, req);
}
