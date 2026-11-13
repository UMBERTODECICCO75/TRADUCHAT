// Retirement worker: existing installations update here instead of retaining
// the removed offline page. No requests or application data are cached.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('traduchat-offline-')).map((key) => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});