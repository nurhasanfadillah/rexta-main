
const CACHE_NAME = 'rexta-app-v7'; // Versi cache dinaikkan
const RUNTIME_CACHE = 'rexta-runtime-v7';
const IMAGE_CACHE = 'rexta-images-v7';

// Aset kritikal App Shell
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Domain CDN library - Gunakan Cache First karena versi sudah dikunci di URL
const IMMUTABLE_DOMAINS = [
  'esm.sh',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com'
];

// Domain Gambar
const IMAGE_DOMAINS = [
  'cdn-icons-png.flaticon.com',
  'images.unsplash.com'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching App Shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Cleanup old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper
const isDomain = (url, domains) => domains.some(d => url.includes(d));

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // A. HTML Navigation -> Network First, Fallback Cache
  // Menangani SPA Routing: Semua navigasi halaman kembali ke index.html jika offline/gagal
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html').then((response) => {
             return response || caches.match('/');
          });
        })
    );
    return;
  }

  // B. Libraries & Fonts -> CACHE FIRST (Performa Tinggi)
  if (isDomain(url.hostname, IMMUTABLE_DOMAINS)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Images -> Stale While Revalidate
  if (request.destination === 'image' || isDomain(url.hostname, IMAGE_DOMAINS)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return caches.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
               cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // Swallow error
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Default: Network Only
});

// Force Update Handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});