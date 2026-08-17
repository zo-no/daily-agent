/**
 * @fileoverview 在生产环境注册离线缓存，并在开发环境清理同源注册。
 */

"use client";

import { useEffect } from "react";
import { clearInstallPrompt, rememberInstallPrompt } from "./install-prompt";

const SERVICE_WORKER_VERSION = "v7";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", rememberInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`/sw.js?v=${SERVICE_WORKER_VERSION}`, { updateViaCache: "none" }).catch(console.error);
    } else if ("serviceWorker" in navigator) {
      async function clearDevelopmentWorker() {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const sameOrigin = registrations.filter((registration) => new URL(registration.scope).origin === window.location.origin);
        const removedRegistrations = await Promise.all(sameOrigin.map((registration) => registration.unregister()));
        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.filter((key) => key.startsWith("log-note-")).map((key) => caches.delete(key)));
        }
        if (removedRegistrations.some(Boolean)) window.location.reload();
      }

      clearDevelopmentWorker().catch(console.error);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", rememberInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  return null;
}
