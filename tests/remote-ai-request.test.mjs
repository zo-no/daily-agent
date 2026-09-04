import assert from "node:assert/strict";
import test from "node:test";
import {
  RemoteAiRequestError,
  postRemoteAiJson
} from "../src/shared/ai/remote-request.mjs";

test("shared browser AI transport sends one authenticated no-store JSON request", async () => {
  let request;
  const result = await postRemoteAiJson({
    endpoint: "/api/example",
    input: { requestId: "request-1" },
    getAccessToken: async () => "access-token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json({ proposal: "ok" });
    }
  });

  assert.deepEqual(result, { proposal: "ok" });
  assert.equal(request.url, "/api/example");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer access-token");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.equal(request.options.body, '{"requestId":"request-1"}');
  assert.equal(request.options.cache, "no-store");
});

test("shared browser AI transport keeps timeout, caller abort, and capability HTTP codes distinct", async () => {
  await assert.rejects(
    () => postRemoteAiJson({
      endpoint: "/api/example",
      input: {},
      getAccessToken: async () => "access-token",
      timeoutMs: 1,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      })
    }),
    (error) => error instanceof RemoteAiRequestError && error.code === "timeout"
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => postRemoteAiJson({
      endpoint: "/api/example",
      input: {},
      getAccessToken: async () => "access-token",
      fetchImpl: async () => Response.json({}),
      signal: controller.signal
    }),
    (error) => error instanceof RemoteAiRequestError && error.code === "aborted"
  );

  const inFlightController = new AbortController();
  let requestStarted;
  const started = new Promise((resolve) => { requestStarted = resolve; });
  const inFlight = postRemoteAiJson({
    endpoint: "/api/example",
    input: {},
    getAccessToken: async () => "access-token",
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      requestStarted();
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
    signal: inFlightController.signal
  });
  await started;
  inFlightController.abort();
  await assert.rejects(
    () => inFlight,
    (error) => error instanceof RemoteAiRequestError && error.code === "aborted"
  );

  await assert.rejects(
    () => postRemoteAiJson({
      endpoint: "/api/example",
      input: {},
      getAccessToken: async () => "access-token",
      fetchImpl: async () => Response.json({ error: { code: "AI_DOMAIN_REVIEW_UNSAFE" } }, { status: 502 }),
      mapHttpFailure: ({ status, serverCode }) => (
        serverCode === "AI_DOMAIN_REVIEW_UNSAFE" ? "unsafe" : `status-${status}`
      )
    }),
    (error) => error instanceof RemoteAiRequestError && error.code === "unsafe"
  );
});
