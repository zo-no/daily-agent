/**
 * @fileoverview Browser fallback for the mobile container contract.
 * The web path keeps the existing file inputs/downloads and never mutates account state itself.
 */

import { nativeCapabilityUnavailable } from "./contract.mjs";

export const webBridge = Object.freeze({
  platform: "web",
  isNative: false,
  async openExternal(url) {
    if (!url) throw nativeCapabilityUnavailable("openExternal");
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  },
  async shareFile() {
    return { ok: false, cancelled: true, reason: "browser-download-path" };
  },
  async pickFile() {
    return { ok: false, cancelled: true, reason: "browser-input-path" };
  },
  getLifecycleState() {
    return document.visibilityState === "hidden" ? "background" : "active";
  },
  getNetworkState() {
    return navigator.onLine ? "online" : "offline";
  },
  async handleBack() {
    return { ok: false, handled: false };
  }
});
