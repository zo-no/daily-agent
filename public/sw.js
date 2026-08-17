/**
 * @fileoverview 缓存同源页面与静态资源，并为离线导航提供应用外壳。
 */

const CACHE_PREFIX = "log-note-";
const DEFAULT_VERSION = "v7";
const versionFromUrl = new URL(self.location.href).searchParams.get("v");
const CACHE_VERSION = /^[a-z0-9._-]+$/i.test(versionFromUrl || "") ? versionFromUrl : DEFAULT_VERSION;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  "/",
  "/templates",
  "/settings",
  "/organize",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png"
];
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

// Keep the active cache version observable for support and the controlled
// browser upgrade regression. It exposes no user data.
self.addEventListener("message", (event) => {
  if (event.data?.type === "log-note:version") {
    event.ports[0]?.postMessage({ version: CACHE_VERSION, cacheName: CACHE_NAME });
  }
});

function fetchAndCache(event) {
  const response = fetch(event.request);
  event.waitUntil(
    response
      .then((networkResponse) => {
        if (!networkResponse.ok) return;
        const cacheableResponse = networkResponse.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheableResponse));
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
  const isAuthCallback = url.pathname === "/auth/callback";
  if (url.origin !== self.location.origin || isApiRequest || isAuthCallback || isRscRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetchAndCache(event).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
        return (await cache.match(request)) || (await cache.match(pathname)) || (await cache.match("/")) || Response.error();
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
