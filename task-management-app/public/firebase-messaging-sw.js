importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDIt4t2FePRn9EmsYgAry4Qkd6cyNQTUPA',
  authDomain: 'tms-project-d2197.firebaseapp.com',
  projectId: 'tms-project-d2197',
  storageBucket: 'tms-project-d2197.firebasestorage.app',
  messagingSenderId: '43652241815',
  appId: '1:43652241815:web:06e8b6f15b2782db824cd2'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = (payload && payload.notification) || {};
  const data = (payload && payload.data) || {};

  const title = notification.title || data.title || 'TaskFlow';
  const body = notification.body || data.body || 'New task assigned';
  const url = data.url || '/';

  self.registration.showNotification(title, {
    body,
    data: {
      ...data,
      url
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const normalized = url.startsWith('http') ? url : new URL(url, self.location.origin).toString();

      for (const client of allClients) {
        if (client.url === normalized && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(normalized);
      }
      return undefined;
    })()
  );
});
