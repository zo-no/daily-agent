import test from "node:test";
import assert from "node:assert/strict";
import { BridgeQueue } from "../src/infrastructure/mcp/bridge-queue.mjs";

test("bridge queue supports pairing, claim, resolve, poll, and request-id idempotency", () => {
  let now = 1_000;
  const queue = new BridgeQueue({ clock: () => now, idleTtlMs: 1_000_000 });
  const pairing = queue.createPairing();
  const payload = { date: "2026-09-05" };
  assert.match(pairing.token, /^[A-Za-z0-9_-]+$/u);

  assert.deepEqual(queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-plans", payload }), {
    requestId: "request-1",
    status: "pending"
  });
  assert.deepEqual(queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-plans", payload }), {
    requestId: "request-1",
    status: "pending",
    result: undefined,
    error: undefined
  });
  assert.throws(() => queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-records", payload }), /REQUEST_ID_REPLAY/);

  const claimed = queue.claim(pairing.token);
  assert.deepEqual(claimed, { requestId: "request-1", kind: "list-plans", payload, claimedAt: now });
  const resolved = queue.resolve(pairing.token, { requestId: "request-1", result: { data: [1] } });
  assert.equal(resolved.status, "complete");
  assert.deepEqual(queue.poll(pairing.token, "request-1"), {
    requestId: "request-1",
    status: "complete",
    result: { data: [1] },
    fingerprint: resolved.fingerprint
  });
});

test("cancel, expiry, and revoke invalidate pending work", () => {
  let now = 0;
  const queue = new BridgeQueue({ clock: () => now, idleTtlMs: 100 });
  const pairing = queue.createPairing();
  queue.enqueue({ token: pairing.token, requestId: "cancel-me", kind: "read", payload: {} });
  assert.equal(queue.cancel(pairing.token, "cancel-me").error.code, "REQUEST_CANCELLED");
  assert.equal(queue.poll(pairing.token, "cancel-me").status, "error");

  queue.enqueue({ token: pairing.token, requestId: "expire-me", kind: "read", payload: {} });
  now = 61_000;
  assert.throws(() => queue.claim(pairing.token), /PAIRING_UNAVAILABLE/);
  assert.equal(queue.revoke(pairing.token).revoked, true);
  assert.throws(() => queue.status(pairing.token), /PAIRING_UNAVAILABLE/);
});
