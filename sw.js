/* Project Rex Center service worker (logic generation 11.5.0).

   WHY THIS EXISTS
   Before 11.5.0 this worker always fetched the newest files from the website, so a plain refresh or reopen
   silently "installed" whatever was deployed. Now the app is served from a saved, version-pinned copy:

     rex-release-<version>   one cache per saved release (the files of that exact version)
     rex-control             one tiny entry that says which release is ACTIVE (and which was the PREVIOUS one)

   - Reloading, reopening and refreshing only ever show the ACTIVE release. They never install anything.
   - Only the page's "Update now" button (after a confirmation) downloads a new release, checks it, and then
     moves the ACTIVE pointer. If anything fails the pointer stays where it was.
   - version.json and sw.js always come from the network, so "Check for updates" can see what is published.
   - Requests carrying ?__rexnet=... skip the saved copy; the installer uses that to download fresh files.

   HONEST LIMITS: a hard refresh (Ctrl/Cmd+Shift+R) bypasses every service worker and loads the website directly;
   browsers without service workers, private windows that block them, and file:// copies always load whatever is
   hosted. On the very first visit (no saved release yet) the page loads from the network and then saves itself. */
const SW_LOGIC = '11.5.0';
const CONTROL = 'rex-control';
const RELEASE_PREFIX = 'rex-release-';
const FONTS = 'rex-fonts';

const scopeUrl = p => new URL(p, self.registration.scope).href;
const controlKey = () => scopeUrl('__rex_control');

async function readPointer() {
  try {
    const c = await caches.open(CONTROL);
    const hit = await c.match(controlKey());
    if (!hit) return null;
    const p = await hit.json();
    return p && typeof p.active === 'string' && p.active ? p : null;
  } catch (e) { return null; }
}

self.addEventListener('install', event => {
  // Only take over immediately when nothing is saved yet (first install, or the one-time move from 11.4.0 or older).
  // Once a release is saved, a changed worker waits quietly until every tab is closed, so it can never swap things mid-use.
  event.waitUntil(readPointer().then(p => { if (!p) return self.skipWaiting(); }));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Remove caches made by 11.4.0 and older (their network-first copies and "rex-snap-" Go-back copies are migrated by the page).
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^rex-v\d/.test(k) || k === 'rex-meta').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin === self.location.origin) {
    if (/\/(version\.json|sw\.js)$/.test(url.pathname) || url.searchParams.has('__rexnet')) {
      event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => offlineFallback(req, url)));
      return;
    }
    event.respondWith(fromActiveRelease(req, url));
    return;
  }
  // Other sites: never touch anything that sends data; only remember Google Fonts so the look works offline.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

async function fromActiveRelease(req, url) {
  const p = await readPointer();
  if (p) {
    try {
      const cache = await caches.open(RELEASE_PREFIX + p.active);
      let key = req.url;
      if (req.mode === 'navigate' || url.pathname.endsWith('/')) key = scopeUrl('index.html');
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
    } catch (e) { /* fall through to the network */ }
  }
  // No saved release (first visit / migration) or a file the release does not contain: use the website, never save it as the app.
  return fetch(req).catch(() => offlineFallback(req, url));
}

async function offlineFallback(req, url) {
  if (req.mode === 'navigate') {
    const p = await readPointer();
    if (p) { const c = await caches.open(RELEASE_PREFIX + p.active); const hit = await c.match(scopeUrl('index.html'), { ignoreSearch: true }); if (hit) return hit; }
  }
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
