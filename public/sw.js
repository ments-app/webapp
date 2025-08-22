// Service Worker for handling notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  if (!data) return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to the specific URL if provided
          if (data.url) {
            client.navigate(data.url);
          }
          return client.focus();
        }
      }
      
      // If app is not open, open it with the URL
      if (clients.openWindow) {
        const url = data.url ? `${self.location.origin}${data.url}` : self.location.origin;
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification actions
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  const data = notification.data;

  if (action === 'view') {
    // Open the post/profile
    clients.openWindow(data.url);
  } else if (action === 'dismiss') {
    // Just close the notification
    notification.close();
  }
});

// Handle push events (for future push notification support)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag,
    data: data.data,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});