import test from "node:test";
import assert from "node:assert/strict";
import {
  createCallbackState,
  createMobileRuntimeState,
  isApprovedMobileOrigin,
  isCallbackStateUsable,
  normalizeLifecycleState,
  normalizeMobilePlatform,
  normalizeNetworkState
} from "../src/infrastructure/mobile/contract.mjs";

test("mobile runtime state normalizes unknown values safely", () => {
  assert.deepEqual(createMobileRuntimeState({ platform: "native", lifecycle: "sleep", network: "lost" }), {
    platform: "web",
    lifecycle: "inactive",
    network: "offline"
  });
  assert.equal(normalizeMobilePlatform("IOS"), "ios");
  assert.equal(normalizeLifecycleState("BACKGROUND"), "background");
  assert.equal(normalizeNetworkState("ONLINE"), "online");
});

test("approved origins require HTTPS except local development", () => {
  assert.equal(isApprovedMobileOrigin("https://log-note.example", { hostname: "log-note.example" }), true);
  assert.equal(isApprovedMobileOrigin("https://evil.example", { hostname: "log-note.example" }), false);
  assert.equal(isApprovedMobileOrigin("http://127.0.0.1:3100", { hostname: "log-note.example" }), true);
  assert.equal(isApprovedMobileOrigin("javascript:alert(1)", { hostname: "log-note.example" }), false);
});

test("callback state is bounded and expires", () => {
  const state = createCallbackState({ requestId: "oauth-1", createdAt: 1000, ttlMs: 100 });
  assert.equal(isCallbackStateUsable(state, 1050), true);
  assert.equal(isCallbackStateUsable(state, 1101), false);
  assert.throws(() => createCallbackState(), /requestId is required/);
});
