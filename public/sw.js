// BatchBase service worker
// IMPORTANT: bump CACHE_VERSION on any change to this file OR whenever you
// want to force all clients to drop their cached static assets. The build
// step in scripts/bump-sw-version.js will auto-append the git SHA so every
// deploy gets a unique cache name without manual edits.
const CACHE_VERSION = 'batchbase-1776352400000-156e875';
const CACHE_NAME = CACHE_VERSION;
const CACHE_URLS = ['/manifest.json'];

// --- Push notifications ---
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'BatchBase', body: event.data.text() };
  }
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: { url: data.url || '/dashboard' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(data.title || 'BatchBase', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// --- Lifecycle: activate new SW immediately, claim all clients ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS))
  );
  // Don't wait — replace old SW right away
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge every cache that isn't this build's cache
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      // Take control of all open tabs
      await self.clients.claim();
      // Tell every tab a new version is live — the app listens for this
      // and triggers the UpdateBanner or a silent hard-reload.
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'NEW_VERSION_INSTALLED', cache: CACHE_NAME }));
    })()
  );
});

// Allow the page to trigger immediate activation (e.g. UpdateBanner "Reload")
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- Fetch strategy ---
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API, auth, or Next data routes — always network
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  // Cache-first for hashed static assets (they change filename on every build,
  // so there's no staleness risk, and this speeds up repeat loads).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for everything else (HTML, images we want fresh, etc.)
  // Fall back to cache only if offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Opportunistically keep the latest response for offline use.
        if (res.ok && event.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
