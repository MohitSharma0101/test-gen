// Education+ service worker: an offline screen and nothing else.
//
// Data has to be fresh (attendance, fees, papers), so nothing from the app is
// cached. The only job here is that opening the installed app with no signal
// shows a branded "You're offline" page instead of the browser's error.
const CACHE = "eplus-offline-v1";
const OFFLINE_ASSETS = ["/offline.html", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop caches from older versions of this file
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only full page loads; API calls, assets and Next.js data requests go
  // straight to the network exactly as without a service worker
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
