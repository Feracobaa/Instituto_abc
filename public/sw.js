// Service Worker for ETYMON Push Notifications and PWA behavior

const CACHE_NAME = 'etymon-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore failures in caching on development environment
      });
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push Event: triggers when a Web Push notification is received
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nueva Notificación',
    message: 'Tienes una nueva actualización en ETYMON.',
    link_url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // In case it's plain text instead of JSON
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: '/logo-iabc.jpg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.link_url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Ver ahora'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event: triggers when a user clicks the notification or its buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Send navigation request if focused
          return client.focus().then((focusedClient) => {
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
