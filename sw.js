// sw.js - Blosor Engine Service Worker
self.addEventListener('install', (e) => {
  console.log('[Blosor PWA] Service Worker Terpasang');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Blosor PWA] Service Worker Aktif');
});

self.addEventListener('fetch', (e) => {
  // Biarkan fetch berjalan normal secara online
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
