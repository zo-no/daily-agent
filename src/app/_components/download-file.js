"use client";

import { isNativeMobileRuntime } from "../_native/native-bridge";

/**
 * @fileoverview 提供浏览器端文件下载的唯一实现。
 */

export async function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  if (isNativeMobileRuntime() && typeof navigator.share === "function" && typeof File === "function") {
    try {
      await navigator.share({ files: [new File([blob], filename, { type })], title: filename });
      return { ok: true, shared: true };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  return { ok: true, downloaded: true };
}
