const CACHE_NAME = "fatou-shop-shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/fatou-shop.svg",
  "/icons/fatou-shop-192.png",
  "/icons/fatou-shop-512.png",
  "/bfa.jpeg",
];
const STATIC_ASSET = /^\/assets\/.+\.(?:js|css|svg|png|jpe?g|webp|woff2?)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("fatou-shop-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const shell = await caches.match("/");
        if (shell) return shell;
        throw new Error("Fatou Shop n'est pas encore disponible hors connexion.");
      }),
    );
    return;
  }

  if (!STATIC_ASSET.test(url.pathname) && !APP_SHELL.includes(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached && !STATIC_ASSET.test(url.pathname)) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response.ok ? response : cached || response;
      }).catch((error) => {
        if (cached) return cached;
        throw error;
      });
    }),
  );
});
