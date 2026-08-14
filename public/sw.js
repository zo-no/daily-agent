/**
 * @fileoverview 缓存同源页面与静态资源，并为离线导航提供应用外壳。
 */

const CACHE_PREFIX = "log-note-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = ["/", "/templates", "/manifest.webmanifest", "/icon.svg"];
const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font", "manifest"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function fetchAndCache(event) {
  const response = fetch(event.request);
  event.waitUntil(
    response
      .then(async (networkResponse) => {
        if (!networkResponse.ok) return;
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, networkResponse.clone());
      })
      .catch(() => undefined)
  );
  return response;
}

function isRscRequest(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Accept")?.includes("text/x-component") ||
    url.searchParams.has("_rsc")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isApiRequest = url.pathname === "/api" || url.pathname.startsWith("/api/");
  if (url.origin !== self.location.origin || isApiRequest || isRscRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetchAndCache(event).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match("/")) || Response.error();
      })
    );
    return;
  }

  if (!STATIC_DESTINATIONS.has(request.destination)) return;

  event.respondWith(
    fetchAndCache(event).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(request)) || Response.error();
    })
  );
});
