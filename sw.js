/* Makes the site installable as an app. Pages always come fresh from the network; nothing is cached. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response('<!doctype html><meta name=viewport content="width=device-width"><body style="font:16px system-ui;padding:40px;text-align:center;background:#F7F5F0;color:#14213D"><h2>You are offline</h2><p>Connect to the internet and try again.</p>', { headers: { 'content-type': 'text/html' } });
  }));
});
