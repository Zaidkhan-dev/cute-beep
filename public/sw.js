const CACHE_NAME = 'beep-toy-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/beep.wav',
  '/assets/bat-cat.jpg',
  '/assets/kitty-cat.jpg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/socket.io/socket.io.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Some cache assets failed to pre-cache', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network first with fallback to cache for api/socket, cache first for static
  if (event.request.url.includes('/socket.io/') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {
    title: 'beep beep beep',
    body: '₍ᐢ. ̫ .ᐢ₎',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'beep-notification',
    renotify: true,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      const text = event.data.text();
      if (text) data.title = text;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    tag: data.tag,
    renotify: true,
    data: data.data,
    actions: []
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'beep beep beep', options),
      // Also notify any open client tabs so they play audio and trigger UI animation
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'PUSH_BEEP', timestamp: Date.now() });
        }
      })
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

