/**
 * @fileoverview 在生产环境注册离线缓存，并在开发环境清理同源注册。
 */

"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => new URL(registration.scope).origin === window.location.origin)
            .map((registration) => registration.unregister())
        )
      )
      .catch(console.error);
  }, []);

  return null;
}
