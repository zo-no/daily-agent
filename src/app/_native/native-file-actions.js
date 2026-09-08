"use client";

/**
 * @fileoverview Native-aware file/share entry points. Existing file inputs remain the canonical
 * browser fallback and continue to feed the existing backup and attachment validators.
 */

import { mobileBridge } from "./native-bridge";

export function isMobileContainer() {
  return mobileBridge.isNative;
}

export async function shareBlob(filename, blob) {
  if (!(blob instanceof Blob)) throw new TypeError("blob must be a Blob");
  if (typeof navigator.share === "function" && typeof File === "function") {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: blob.type || "application/octet-stream" })], title: filename });
      return { ok: true, shared: true };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }
  return { ok: false, cancelled: true, reason: mobileBridge.isNative ? "share-unavailable" : "browser-download-path" };
}
