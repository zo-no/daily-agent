import { byteLength } from "../../shared/agent-bridge/protocol.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 120;

export class BridgeClientError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "BridgeClientError";
    this.code = code;
  }
}

function requestId() {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `request_${value}`;
}

function parseLoopbackUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new BridgeClientError("INVALID_BRIDGE_URL", "bridge URL is invalid");
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new BridgeClientError("LOOPBACK_ONLY", "bridge URL must use local http loopback");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new BridgeClientError("INVALID_BRIDGE_URL", "bridge URL cannot contain credentials or query data");
  }
  return `${url.origin}${url.pathname.replace(/\/$/u, "")}`;
}

function safeError(body, fallback = "BRIDGE_ERROR") {
  const code = String(body?.error?.code || fallback);
  const message = String(body?.error?.message || code);
  return new BridgeClientError(/^[A-Z0-9_]+$/u.test(code) ? code : fallback, message);
}

export function createBridgeClient({
  baseUrl,
  token,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = POLL_INTERVAL_MS
} = {}) {
  const origin = parseLoopbackUrl(baseUrl);
  const pairingToken = String(token || "");
  if (!pairingToken || pairingToken.length > 256) throw new BridgeClientError("PAIRING_REQUIRED", "pairing token is required");
  if (typeof fetchImpl !== "function") throw new BridgeClientError("FETCH_UNAVAILABLE", "fetch is unavailable");

  async function call(body, { signal } = {}) {
    const serialized = JSON.stringify(body);
    if (byteLength(serialized) > 256 * 1024) throw new BridgeClientError("REQUEST_TOO_LARGE", "bridge request is too large");
    let response;
    try {
      response = await fetchImpl(`${origin}/api/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-log-note-bridge-token": pairingToken
        },
        body: serialized,
        signal
      });
    } catch {
      throw new BridgeClientError("BRIDGE_UNAVAILABLE", "Log Note browser bridge is unavailable");
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new BridgeClientError("BRIDGE_PROTOCOL_ERROR", "bridge returned invalid JSON");
    }
    if (!response.ok || data?.error) throw safeError(data, response.ok ? "BRIDGE_ERROR" : "BRIDGE_HTTP_ERROR");
    return data;
  }

  async function request({ kind, payload, timeout = timeoutMs } = {}) {
    const id = requestId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, Number(timeout) || DEFAULT_TIMEOUT_MS));
    try {
      await call({ action: "enqueue", requestId: id, kind, payload }, { signal: controller.signal });
      while (true) {
        const response = await call({ action: "poll", requestId: id }, { signal: controller.signal });
        const result = response.result || {};
        if (result.status === "complete") return result.result;
        if (result.status === "error") throw safeError({ error: result.error }, "BRIDGE_ERROR");
        if (result.status === "not-found") throw new BridgeClientError("REQUEST_NOT_FOUND", "bridge request was not found");
        await new Promise((resolve) => setTimeout(resolve, Math.max(20, Number(pollIntervalMs) || POLL_INTERVAL_MS)));
      }
    } catch (error) {
      if (error?.name === "AbortError") throw new BridgeClientError("BRIDGE_TIMEOUT", "browser bridge request timed out");
      try {
        await call({ action: "cancel", requestId: id });
      } catch {
        // The browser may already have completed or discarded the request.
      }
      throw error instanceof BridgeClientError ? error : new BridgeClientError("BRIDGE_ERROR", "bridge request failed");
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({ request, call, origin });
}

export function createBridgeClientFromEnv(env = process.env) {
  return createBridgeClient({
    baseUrl: env.LOG_NOTE_BRIDGE_URL,
    token: env.LOG_NOTE_PAIRING_TOKEN
  });
}
