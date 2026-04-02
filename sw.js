// Accord Service Worker v1
// Caches the app shell for offline use

const CACHE = 'accord-v1';
const SHELL = [
  '/',
  '/index.html',
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(SHELL).catch(() => {
        // If caching fails (local dev etc), still install
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting(); // activate immediately
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// Fetch: network-first for Firebase/API calls, cache-first for app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for: Firebase, OpenRouter, Giphy, Tenor, Google Fonts
  const networkOnly = [
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'openrouter.ai',
    'api.giphy.com',
    'tenor.googleapis.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'gstatic.com',
  ];
  if (networkOnly.some(h => url.hostname.includes(h))) {
    return; // Let the browser handle it normally
  }

  // For the app shell: try cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful HTML/JS/CSS responses
        if (response.ok && ['text/html', 'text/css', 'application/javascript'].some(
          t => response.headers.get('content-type')?.includes(t)
        )) {
          const toCache = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, toCache));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback: serve cached index.html
      return caches.match('/') || caches.match('/index.html');
    })
  );
});
