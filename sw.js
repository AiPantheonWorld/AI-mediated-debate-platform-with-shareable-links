// Accord Service Worker v2 — subpath-aware
const CACHE = 'accord-v2';

// Get the base path dynamically from the SW location
const BASE = self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([BASE, BASE + 'index.html']).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never intercept: Firebase, OpenRouter, GIF APIs, Fonts, CDNs
  const passThrough = [
    'firestore.googleapis.com', 'firebase.googleapis.com',
    'googleapis.com', 'gstatic.com',
    'openrouter.ai', 'api.giphy.com', 'tenor.googleapis.com',
    'fonts.googleapis.com', 'fonts.gstatic.com',
    'cdnjs.cloudflare.com', 'esm.sh',
  ];
  if (passThrough.some(h => url.hostname.includes(h))) return;

  // Cache-first for the app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('text/html') || ct.includes('javascript') || ct.includes('css')) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
        }
        return res;
      }).catch(() => caches.match(BASE + 'index.html'));
    })
  );
});
