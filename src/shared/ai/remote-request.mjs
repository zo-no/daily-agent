/** @fileoverview Shared browser transport for one bounded, authenticated AI proposal request. */

export const DEFAULT_REMOTE_AI_TIMEOUT_MS = 25_000;

export class RemoteAiRequestError extends Error {
  constructor(code, message = "remote AI request failed") {
    super(message);
    this.name = "RemoteAiRequestError";
    this.code = code;
  }
}

function normalizedTimeout(timeoutMs) {
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REMOTE_AI_TIMEOUT_MS;
}

function defaultHttpFailure({ status }) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate-limited";
  if (status === 503) return "unconfigured";
  if (status === 504) return "timeout";
  if (status === 400 || status === 413 || status === 415 || status === 502) return "invalid-response";
  return "unavailable";
}

async function responseErrorCode(response) {
  try {
    return String((await response?.json?.())?.error?.code || "");
  } catch {
    return "";
  }
}

/**
 * Post one already-sanitized payload and return its untrusted JSON response.
 * Capability modules retain payload validation, response validation, and fallback behavior.
 */
export async function postRemoteAiJson({
  endpoint,
  input,
  getAccessToken,
  fetchImpl = globalThis.fetch,
  signal,
  timeoutMs = DEFAULT_REMOTE_AI_TIMEOUT_MS,
  mapHttpFailure = defaultHttpFailure,
  abortFailureCode = "offline"
} = {}) {
  if (signal?.aborted) throw new RemoteAiRequestError("aborted");

  let token = "";
  try {
    token = typeof getAccessToken === "function" ? await getAccessToken() : "";
  } catch {
    throw new RemoteAiRequestError("unconfigured");
  }
  if (!token || typeof fetchImpl !== "function") {
    throw new RemoteAiRequestError("unconfigured");
  }
  if (signal?.aborted) throw new RemoteAiRequestError("aborted");

  const controller = new AbortController();
  let callerAborted = false;
  let timedOut = false;
  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort();
  };
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) abortFromCaller();

  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new RemoteAiRequestError("timeout"));
    }, normalizedTimeout(timeoutMs));
  });

  try {
    const operation = (async () => {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: controller.signal
      });
      if (!response?.ok) {
        const code = mapHttpFailure({ status: response?.status, serverCode: await responseErrorCode(response) });
        throw new RemoteAiRequestError(code || "unavailable");
      }
      const payload = await response.json();
      if (callerAborted || signal?.aborted) throw new RemoteAiRequestError("aborted");
      if (timedOut) throw new RemoteAiRequestError("timeout");
      return payload;
    })();
    return await Promise.race([operation, deadline]);
  } catch (error) {
    if (callerAborted || signal?.aborted) throw new RemoteAiRequestError("aborted");
    if (timedOut) throw new RemoteAiRequestError("timeout");
    if (error instanceof RemoteAiRequestError) throw error;
    if (error?.name === "AbortError") throw new RemoteAiRequestError(abortFailureCode);
    if (error instanceof SyntaxError) throw new RemoteAiRequestError("invalid-response");
    throw new RemoteAiRequestError("offline");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
