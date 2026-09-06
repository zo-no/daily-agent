"use client";

/**
 * @fileoverview One client entry for optional native container capabilities.
 * Business components may use this adapter, but it cannot write Log Note state.
 */

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Share } from "@capacitor/share";
import { webBridge } from "@/infrastructure/mobile/web-bridge.mjs";
import { normalizeMobilePlatform } from "@/infrastructure/mobile/contract.mjs";

const native = Capacitor.isNativePlatform();

export const mobileBridge = Object.freeze({
  platform: normalizeMobilePlatform(native ? Capacitor.getPlatform() : "web"),
  isNative: native,
  async openExternal(url) {
    if (!url) return { ok: false, reason: "missing-url" };
    if (!native) return webBridge.openExternal(url);
    await Browser.open({ url });
    return { ok: true };
  },
  async shareFile({ title, text, url } = {}) {
    if (!native) return webBridge.shareFile({ title, text, url });
    const result = await Share.share({ title, text, url, dialogTitle: title });
    return { ok: true, result };
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
    if (!native) return webBridge.handleBack();
    await App.exitApp();
    return { ok: true, handled: true };
  }
});

export function isNativeMobileRuntime() {
  return native;
}
