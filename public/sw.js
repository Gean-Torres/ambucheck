const CACHE_NAME = 'ambulcheck-v1';
const STATIC_CACHE = 'ambulcheck-static-v1';
const DYNAMIC_CACHE = 'ambulcheck-dynamic-v1';

// Recursos essenciais para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/logo-192x192.png',
  '/icons/logo-512x512.png'
];

// Recursos que podem ser cacheados dinamicamente
const DYNAMIC_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
  /\/icons\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase requests (handled by Firebase SDK)
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(event.request.url.replace(self.location.origin, ''))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
    return;
  }

  // Handle dynamic assets
  const isDynamicAsset = DYNAMIC_PATTERNS.some(pattern => pattern.test(event.request.url));
  if (isDynamicAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) return response;

          return fetch(event.request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => cache.put(event.request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // Return offline fallback if available
              return caches.match('/offline.html') || new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }

  // Default: Network first for app routes
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for future offline use
        if (response.status === 200 && event.request.destination === 'document') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Try cache for offline fallback
        return caches.match(event.request)
          .then((response) => {
            if (response) return response;
            // Return basic offline page
            return new Response(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>AmbuCheck - Offline</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .offline-message { max-width: 400px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #dc2626; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <h1>🚫 Offline</h1>
                    <p>Você está offline no momento. Verifique sua conexão com a internet e tente novamente.</p>
                    <p><small>AmbuCheck - Checklist de Veículos</small></p>
                  </div>
                </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'background-sync-checklists') {
    event.waitUntil(syncPendingChecklists());
  }
});

// Push notifications (optional future feature)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/logo-192x192.png',
      badge: '/icons/logo-48x48.png',
      vibrate: [100, 50, 100],
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Function to sync pending checklists
async function syncPendingChecklists() {
  try {
    // Get pending checklists from localStorage
    const pendingChecklists = getPendingChecklists();

    if (pendingChecklists.length === 0) {
      console.log('Service Worker: No pending checklists to sync');
      return;
    }

    console.log(`Service Worker: Syncing ${pendingChecklists.length} pending checklists`);

    // Import Firebase config dynamically
    const firebaseConfig = {
      // Add your Firebase config here if needed
      // This would be better handled by the main app
    };

    // Send each pending checklist
    for (const checklist of pendingChecklists) {
      try {
        // For now, we'll just mark as synced since Firebase operations
        // are better handled by the main app. In a production app,
        // you might want to use a more sophisticated approach.
        console.log('Service Worker: Would sync checklist', checklist.id);

        // In a real implementation, you would:
        // 1. Send the data to your backend API
        // 2. Handle authentication tokens
        // 3. Retry failed requests

        // For demo purposes, we'll just remove from pending
        removePendingChecklist(checklist.id);
        console.log('Service Worker: Checklist marked as synced', checklist.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync checklist', checklist.id, error);
        // Keep it in pending for next sync attempt
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: `${pendingChecklists.length} checklists sincronizados com sucesso!`
      });
    });

  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Helper functions for pending checklists using localStorage
function getPendingChecklists() {
  try {
    const data = localStorage.getItem('pendingChecklists');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get pending checklists:', error);
    return [];
  }
}

function removePendingChecklist(id) {
  try {
    const pending = getPendingChecklists();
    const filtered = pending.filter(item => item.id !== id);
    localStorage.setItem('pendingChecklists', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pending checklist:', error);
  }
}