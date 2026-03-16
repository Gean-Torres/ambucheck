const STATIC_CACHE = 'ambulcheck-static-v2';
const DYNAMIC_CACHE = 'ambulcheck-dynamic-v2';

// Recursos essenciais para inicialização offline (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo-192x192.png',
  '/icons/logo-512x512.png'
];

const CACHEABLE_DESTINATIONS = new Set(['style', 'script', 'image', 'font', 'document']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Firebase/Auth requests devem continuar rede-first e sem interceptação
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com/identitytoolkit')
  ) {
    return;
  }

  // Navegação SPA: app shell cache-first com fallback para rede
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cachedShell) => {
        if (cachedShell) return cachedShell;
        return fetch(event.request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put('/index.html', responseClone));
            return response;
          })
          .catch(() =>
            new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          );
      })
    );
    return;
  }

  // Assets: stale-while-revalidate
  if (CACHEABLE_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // fallback padrão
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

// Background sync: delega sincronização real para a aplicação (janela),
// já que Service Worker não possui acesso a localStorage.
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-checklists') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_LOCAL_SYNC'
          });
        });
      })
    );
  }
});
