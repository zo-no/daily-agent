/**
 * @fileoverview 缓存同源页面与静态资源，并为离线导航提供应用外壳。
 */

const CACHE_PREFIX = "log-note-";
const DEFAULT_VERSION = "v14";
const versionFromUrl = new URL(self.location.href).searchParams.get("v");
const CACHE_VERSION = /^[a-z0-9._-]+$/i.test(versionFromUrl || "") ? versionFromUrl : DEFAULT_VERSION;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  "/",
  "/templates",
  "/settings",
  "/organize",
  "/insights",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/ui/diary/paper-texture.svg",
  "/ui/diary/rail-brush-handdrawn.png",
  "/ui/diary/rail-node-idle-fine.png",
  "/ui/diary/rail-node-active-fine.png",
  "/ui/diary/record-rule-handdrawn.png",
  "/ui/diary/record-time-dash-handdrawn.png",
  "/ui/diary/record-focus-loop.png",
  "/ui/diary/rail-search.png",
  "/ui/diary/rail-calendar.png",
  "/ui/diary/rail-settings.png",
  "/ui/diary/rail-insights.png",
  "/ui/diary/record-stamp.png",
  "/ui/diary/export-stamp.png",
  "/ui/diary/plan-add-stamp.png",
  "/ui/diary/agent-spine-spirit.png",
  "/ui/diary/agent-spine-spirit-scanning.png",
  "/ui/diary/agent-spine-spirit-reviewing.png",
  "/ui/diary/agent-spine-spirit-complete.png",
  "/ui/diary/agent-spine-spirit-idle-still.png",
  "/ui/diary/agent-spine-spirit-idle-motion.png",
  "/ui/diary/agent-spine-spirit-scanning-still.png",
  "/ui/diary/agent-spine-spirit-scanning-motion.png",
  "/ui/diary/agent-spine-spirit-reviewing-still.png",
  "/ui/diary/agent-spine-spirit-reviewing-motion.png",
  "/ui/diary/agent-spine-spirit-complete-still.png",
  "/ui/diary/agent-spine-spirit-complete-motion.png",
  "/ui/diary/organize-helper.png",
  "/ui/diary/organize-path.png"
];
const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font", "manifest"]);
const DOCUMENT_SHELLS = new Set(["/", "/templates", "/settings", "/organize", "/insights"]);

function staticAssetsFromDocument(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) assets.add(`${url.pathname}${url.search}`);
  }
  return [...assets];
}

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  const discoveredAssets = new Set();
  for (const path of DOCUMENT_SHELLS) {
    const response = await cache.match(path);
    if (!response) continue;
    const html = await response.clone().text();
    staticAssetsFromDocument(html).forEach((asset) => discoveredAssets.add(asset));
  }
  if (discoveredAssets.size) await cache.addAll([...discoveredAssets]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheApplicationShell()
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
        const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
        if (pathname === "/templates") {
          const focus = url.searchParams.get("focus") === "periodic" ? "?focus=periodic" : "";
          return Response.redirect(new URL(`/settings${focus}#record-setup`, self.location.origin).href, 302);
        }
        const cache = await caches.open(CACHE_NAME);
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
