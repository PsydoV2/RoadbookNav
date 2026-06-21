const CACHE = 'roadbook-v1';

const PRECACHE = [
  '/app/',
  '/manifest.json',
  '/arrows/arrow-up-sm-svgrepo-com.svg',
  '/arrows/arrow-left-sm-svgrepo-com.svg',
  '/arrows/arrow-right-sm-svgrepo-com.svg',
  '/arrows/arrow-up-left-sm-svgrepo-com.svg',
  '/arrows/arrow-up-right-sm-svgrepo-com.svg',
  '/arrows/arrow-down-sm-svgrepo-com.svg',
  '/arrows/arrow-down-left-sm-svgrepo-com.svg',
  '/arrows/arrow-down-right-sm-svgrepo-com.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// Pre-cache known static assets on install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for all GET requests
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. map tiles)
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);

      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) {
        // Serve cache immediately, update in background
        fetchPromise.catch(() => {});
        return cached;
      }

      // Not cached yet — wait for network
      const res = await fetchPromise;
      if (res) return res;

      // Offline and not cached: fall back to app shell for navigation requests
      if (e.request.destination === 'document') {
        return cache.match('/app/') ?? new Response('Offline', { status: 503 });
      }
    })
  );
});
