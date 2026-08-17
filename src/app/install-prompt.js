/**
 * @fileoverview 在根布局和设置页之间保留一次性的 PWA 安装提示事件。
 */

let pendingPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function rememberInstallPrompt(event) {
  event.preventDefault();
  pendingPrompt = event;
  notifyListeners();
}

export function clearInstallPrompt() {
  if (!pendingPrompt) return;
  pendingPrompt = null;
  notifyListeners();
}

export function getInstallPrompt() {
  return pendingPrompt;
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
