import assert from "node:assert/strict";
import test from "node:test";
import {
  accountIdentity,
  authCallbackUrl,
  googleOAuthOriginSupported,
  isSafePublicSupabaseKey,
  passwordCredentials,
  signOutRemoteAccount,
  startGoogleOAuth
} from "../src/lib/auth-model.mjs";

test("account identity keeps only the display fields needed by the settings surface", () => {
  assert.deepEqual(accountIdentity({ user: {
    id: "user-1",
    email: "writer@example.com",
    app_metadata: { provider: "google", secret: "not-exposed" },
    user_metadata: { full_name: "Quiet Writer", picture: "https://example.com/avatar.png" }
  } }), {
    id: "user-1",
    email: "writer@example.com",
    name: "Quiet Writer",
    initials: "QW",
    provider: "google"
  });
});

test("account identity safely falls back to the email name", () => {
  assert.equal(accountIdentity({ user: { id: "user-2", email: "local.author@example.com" } }).name, "local.author");
  assert.equal(accountIdentity(null), null);
});

test("auth callback uses the current app origin without duplicate slashes", () => {
  assert.equal(authCallbackUrl("http://localhost:3100/"), "http://localhost:3100/auth/callback");
});

test("Google OAuth requires HTTPS except on local development origins", () => {
  assert.equal(googleOAuthOriginSupported("https://note.kual-shown.online"), true);
  assert.equal(googleOAuthOriginSupported("http://localhost:3100"), true);
  assert.equal(googleOAuthOriginSupported("http://127.0.0.1:3100"), true);
  assert.equal(googleOAuthOriginSupported("http://81.70.8.30:8080"), false);
  assert.equal(googleOAuthOriginSupported("not-a-url"), false);
});

test("Google OAuth refuses insecure public origins and recovers from provider failures", async () => {
  let calls = 0;
  const client = { auth: { signInWithOAuth: async (request) => {
    calls += 1;
    assert.deepEqual(request, {
      provider: "google",
      options: { redirectTo: "https://note.kual-shown.online/auth/callback", scopes: "openid" }
    });
    throw new Error("provider unavailable");
  } } };

  assert.deepEqual(await startGoogleOAuth(client, "http://81.70.8.30:8080"), {
    ok: false,
    reason: "secure-origin-required"
  });
  assert.equal(calls, 0);
  assert.deepEqual(await startGoogleOAuth(client, "https://note.kual-shown.online"), {
    ok: false,
    message: "provider unavailable"
  });
  assert.equal(calls, 1);
});

test("password credentials normalize email without persisting or rewriting the password", () => {
  assert.deepEqual(passwordCredentials("  Writer@Example.COM ", "quiet-note-2026"), {
    ok: true,
    email: "writer@example.com",
    password: "quiet-note-2026"
  });
  assert.deepEqual(passwordCredentials("not-an-email", "quiet-note-2026"), { ok: false, reason: "email" });
  assert.deepEqual(passwordCredentials("writer@example.com", "short"), { ok: false, reason: "password" });
});

test("browser auth accepts only publishable or legacy anon keys", () => {
  const jwt = (role) => ["header", Buffer.from(JSON.stringify({ role })).toString("base64url"), "signature"].join(".");
  assert.equal(isSafePublicSupabaseKey("sb_publishable_public-test"), true);
  assert.equal(isSafePublicSupabaseKey(jwt("anon")), true);
  assert.equal(isSafePublicSupabaseKey("sb_secret_private-test"), false);
  assert.equal(isSafePublicSupabaseKey(jwt("service_role")), false);
  assert.equal(isSafePublicSupabaseKey("YOUR_PUBLISHABLE_KEY"), false);
});

test("remote sign-out never reports success when both server and local cleanup fail", async () => {
  const scopes = [];
  const failure = new Error("offline");
  const failed = await signOutRemoteAccount({ auth: { signOut: async ({ scope }) => {
    scopes.push(scope);
    return { error: failure };
  } } });
  assert.deepEqual(scopes, ["global", "local"]);
  assert.equal(failed.complete, false);
  assert.equal(failed.error, failure);

  const localFallback = await signOutRemoteAccount({ auth: { signOut: async ({ scope }) => (
    scope === "global" ? { error: failure } : { error: null }
  ) } });
  assert.deepEqual(localFallback, { complete: true, scope: "local", remoteError: failure });
});
