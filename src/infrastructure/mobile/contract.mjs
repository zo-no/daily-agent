/**
 * @fileoverview Platform-neutral contract for the mobile container.
 * Native adapters may report capability state, but they never own Log Note data or cloud writes.
 */

export const MOBILE_PLATFORMS = new Set(["android", "ios", "web"]);
export const MOBILE_LIFECYCLE_STATES = new Set(["active", "inactive", "background"]);
export const MOBILE_NETWORK_STATES = new Set(["online", "offline"]);

export function normalizeMobilePlatform(value) {
  const normalized = String(value || "web").trim().toLowerCase();
  return MOBILE_PLATFORMS.has(normalized) ? normalized : "web";
}

export function normalizeLifecycleState(value) {
  const normalized = String(value || "inactive").trim().toLowerCase();
  return MOBILE_LIFECYCLE_STATES.has(normalized) ? normalized : "inactive";
}

export function normalizeNetworkState(value) {
  const normalized = String(value || "offline").trim().toLowerCase();
  return MOBILE_NETWORK_STATES.has(normalized) ? normalized : "offline";
}

export function createMobileRuntimeState({ platform = "web", lifecycle = "active", network = "online" } = {}) {
  return {
    platform: normalizeMobilePlatform(platform),
    lifecycle: normalizeLifecycleState(lifecycle),
    network: normalizeNetworkState(network)
  };
}

export function isApprovedMobileOrigin(value, { hostname, allowHttpLocalhost = true } = {}) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    return false;
  }
  if (!/^https?:$/.test(url.protocol)) return false;
  if (allowHttpLocalhost && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)) return true;
  return Boolean(hostname) && url.protocol === "https:" && url.hostname === String(hostname).toLowerCase();
}

export function createCallbackState({ requestId, createdAt = Date.now(), ttlMs = 5 * 60 * 1000 } = {}) {
  const id = String(requestId || "").trim();
  if (!id) throw new TypeError("requestId is required");
  return { requestId: id, createdAt: Number(createdAt), expiresAt: Number(createdAt) + Number(ttlMs) };
}

export function isCallbackStateUsable(state, now = Date.now()) {
  return Boolean(state?.requestId) && Number.isFinite(state.createdAt) && Number.isFinite(state.expiresAt)
    && Number(now) >= state.createdAt && Number(now) <= state.expiresAt;
}

export function isZeroWriteNativeFailure(result) {
  return result === undefined || result === null || result?.cancelled === true || result?.ok === false;
}

export function nativeCapabilityUnavailable(name = "capability") {
  const error = new Error(`${name} is unavailable in this runtime`);
  error.code = "MOBILE_CAPABILITY_UNAVAILABLE";
  return error;
}
