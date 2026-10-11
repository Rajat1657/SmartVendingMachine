const CACHE_NAME = 'nourish-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png'
];

// 1. Install Event: Cache Static App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static app shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strict Caching Strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // RULE A: API Calls (/api/*) & WebSocket requests -> NETWORK ONLY (Never serve stale stock/financial data!)
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/socket.io/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('[SW] API call failed due to offline state:', requestUrl.pathname);
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            error: 'You are currently offline. Live data requires an active network connection.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // RULE B: Navigation / HTML Requests -> Network First with App Shell Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/admin');
      })
    );
    return;
  }

  // RULE C: Static Assets (JS, CSS, Images, Fonts) -> Cache First with Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new static assets on the fly
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.endsWith('.js') ||
           event.request.url.endsWith('.css') ||
           event.request.url.endsWith('.png') ||
           event.request.url.endsWith('.svg') ||
           event.request.url.endsWith('.woff2'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
