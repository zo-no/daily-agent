"use client";

/**
 * @fileoverview Normalizes foreground/network signals for the existing local-first retry paths.
 * This module reports signals only; persistence remains owned by LogNoteDataProvider.
 */

import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { mobileBridge } from "./native-bridge";

export function subscribeMobileRuntime(onChange) {
  if (typeof onChange !== "function") throw new TypeError("onChange must be a function");
  let active = true;
  const emit = (patch) => {
    if (active) onChange({ platform: mobileBridge.platform, ...patch });
  };
  const listeners = [];

  const onVisibility = () => emit({ lifecycle: mobileBridge.getLifecycleState(), network: mobileBridge.getNetworkState() });
  window.addEventListener("online", onVisibility);
  window.addEventListener("offline", onVisibility);
  document.addEventListener("visibilitychange", onVisibility);
  listeners.push(() => window.removeEventListener("online", onVisibility));
  listeners.push(() => window.removeEventListener("offline", onVisibility));
  listeners.push(() => document.removeEventListener("visibilitychange", onVisibility));
  emit({ lifecycle: mobileBridge.getLifecycleState(), network: mobileBridge.getNetworkState() });

  if (mobileBridge.isNative) {
    listeners.push(App.addListener("appStateChange", ({ isActive }) => emit({ lifecycle: isActive ? "active" : "background" })));
    listeners.push(Network.addListener("networkStatusChange", ({ connected }) => emit({ network: connected ? "online" : "offline" })));
  }

  return () => {
    active = false;
    listeners.forEach((listener) => {
      if (typeof listener === "function") listener();
      else listener?.then?.((handle) => handle.remove()).catch(() => undefined);
    });
  };
}
