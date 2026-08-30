import assert from "node:assert/strict";
import test from "node:test";
import {
  accountIdentity,
  authStateForSession,
  authStatusAfterSignOutFailure,
  authCallbackUrl,
  googleOAuthOriginSupported,
  isStableUuidOwner,
  isSafePublicSupabaseKey,
  oauthOriginSupported,
  passwordCredentials,
  resolveAuthMode,
  signOutRemoteAccount,
  startGoogleOAuth,
  startMeituanSso
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

test("internal identity keeps the stable user id as owner and uses company claims only for display", () => {
  const identity = accountIdentity({ user: {
    id: "11d20f1f-6a56-4db3-9bd8-a7785f40a8a1",
    app_metadata: { provider: "meituan_sso", sso_mis: "display-mis", secret: "not-exposed" },
    user_metadata: {}
  } });
  assert.deepEqual(identity, {
    id: "11d20f1f-6a56-4db3-9bd8-a7785f40a8a1",
    email: "",
    name: "display-mis",
    initials: "D",
    provider: "meituan_sso"
  });
  assert.notEqual(identity.id, "display-mis");
  assert.equal("secret" in identity, false);
});

test("auth distribution mode allowlists only the explicit Meituan SSO build value", () => {
  assert.equal(resolveAuthMode("meituan-sso"), "meituan-sso");
  assert.equal(resolveAuthMode("standard"), "standard");
  assert.equal(resolveAuthMode(""), "standard");
  assert.equal(resolveAuthMode("MEITUAN-SSO"), "standard");
  assert.equal(resolveAuthMode("admin"), "standard");
});

test("internal owner compatibility accepts only canonical UUID values", () => {
  assert.equal(isStableUuidOwner("11d20f1f-6a56-4db3-9bd8-a7785f40a8a1"), true);
  assert.equal(isStableUuidOwner(" 11D20F1F-6A56-4DB3-9BD8-A7785F40A8A1 "), true);
  assert.equal(isStableUuidOwner("display-mis"), false);
  assert.equal(isStableUuidOwner("employee@example.com"), false);
  assert.equal(isStableUuidOwner(""), false);
});

test("internal sessions and sign-out failures never bypass an incompatible UUID owner gate", () => {
  const incompatibleSession = { user: { id: "display-mis", app_metadata: { provider: "meituan_sso" } } };
  assert.deepEqual(authStateForSession(incompatibleSession, "meituan-sso"), {
    status: "incompatible",
    session: null,
    identity: null
  });
  assert.equal(authStatusAfterSignOutFailure({ session: null, identity: null }, "meituan-sso"), "incompatible");

  const validSession = { user: {
    id: "11d20f1f-6a56-4db3-9bd8-a7785f40a8a1",
    app_metadata: { provider: "meituan_sso" }
  } };
  const validState = authStateForSession(validSession, "meituan-sso");
  assert.equal(validState.status, "signed-in");
  assert.equal(validState.identity.id, validSession.user.id);
  assert.equal(authStatusAfterSignOutFailure(validState, "meituan-sso"), "signed-in");

  assert.equal(authStateForSession(incompatibleSession, "standard").status, "signed-in");
  assert.equal(authStatusAfterSignOutFailure({ session: null, identity: null }, "standard"), "signed-out");
});

test("auth callback uses the current app origin without duplicate slashes", () => {
  assert.equal(authCallbackUrl("http://localhost:3100/"), "http://localhost:3100/auth/callback");
});

test("Google OAuth requires HTTPS except on local development origins", () => {
  assert.equal(oauthOriginSupported("https://plus-example.database.sankuai.com"), true);
  assert.equal(oauthOriginSupported("http://localhost:3100"), true);
  assert.equal(oauthOriginSupported("http://81.70.8.30:8080"), false);
  assert.equal(googleOAuthOriginSupported("https://note.kual-shown.online"), true);
  assert.equal(googleOAuthOriginSupported("http://localhost:3100"), true);
  assert.equal(googleOAuthOriginSupported("http://127.0.0.1:3100"), true);
  assert.equal(googleOAuthOriginSupported("http://81.70.8.30:8080"), false);
  assert.equal(googleOAuthOriginSupported("not-a-url"), false);
});

test("Meituan SSO uses the provider-neutral PKCE callback and recovers from provider failures", async () => {
  const requests = [];
  const client = { auth: { signInWithOAuth: async (request) => {
    requests.push(request);
    return { error: null };
  } } };

  assert.deepEqual(await startMeituanSso(client, "https://plus-example.database.sankuai.com"), {
    ok: true
  });
  assert.deepEqual(requests, [{
    provider: "meituan_sso",
    options: { redirectTo: "https://plus-example.database.sankuai.com/auth/callback" }
  }]);
  assert.deepEqual(await startMeituanSso(client, "http://81.70.8.30:8080"), {
    ok: false,
    reason: "secure-origin-required"
  });
  assert.equal(requests.length, 1);

  assert.deepEqual(await startMeituanSso({
    auth: { signInWithOAuth: async () => ({ error: new Error("provider unavailable") }) }
  }, "https://plus-example.database.sankuai.com"), {
    ok: false,
    message: "provider unavailable"
  });
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
