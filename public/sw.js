self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// In-memory timers for scheduled delivery reminders
const scheduledTimers = new Map();

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'DOĞAN OTO', {
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      ...options,
    });
  }

  if (event.data.type === 'SCHEDULE_DELIVERY_NOTIFICATION') {
    const { id, title, options, delayMs } = event.data;
    if (scheduledTimers.has(id)) {
      clearTimeout(scheduledTimers.get(id));
      scheduledTimers.delete(id);
    }
    if (delayMs > 0) {
      const timer = setTimeout(() => {
        self.registration.showNotification(title || 'DOĞAN OTO - Teslim Saati Yaklaştı!', {
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [300, 150, 300],
          tag: options?.tag || `delivery-${id}`,
          renotify: true,
          requireInteraction: true,
          ...options,
        });
        scheduledTimers.delete(id);
      }, delayMs);
      scheduledTimers.set(id, timer);
    }
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data;
    if (scheduledTimers.has(id)) {
      clearTimeout(scheduledTimers.get(id));
      scheduledTimers.delete(id);
    }
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'DOĞAN OTO', body: 'Araç teslim saati yaklaştı!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [300, 150, 300],
      tag: data.tag || 'dogan-oto-push',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const firstClient = clientList[0];
        return firstClient.focus();
      }
      return clients.openWindow('/');
    }),
  );
});
