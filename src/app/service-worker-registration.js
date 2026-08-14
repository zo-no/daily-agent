/**
 * @fileoverview 在生产环境注册离线缓存，并在开发环境清理同源注册。
 */

"use client";

import { useEffect } from "react";

export const SERVICE_WORKER_VERSION = "v4";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`/sw.js?v=${SERVICE_WORKER_VERSION}`, { updateViaCache: "none" }).catch(console.error);
      return;
    }

    async function clearDevelopmentWorker() {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sameOrigin = registrations.filter((registration) => new URL(registration.scope).origin === window.location.origin);
      await Promise.all(sameOrigin.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.filter((key) => key.startsWith("log-note-")).map((key) => caches.delete(key)));
      }
      if (sameOrigin.length && !sessionStorage.getItem("log-note:dev-worker-cleared")) {
        sessionStorage.setItem("log-note:dev-worker-cleared", "1");
        window.location.reload();
      }
    }

    clearDevelopmentWorker().catch(console.error);
  }, []);

  return null;
}
