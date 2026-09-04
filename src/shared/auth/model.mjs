/**
 * @fileoverview Pure account presentation helpers that never read or alter Log Note records.
 */

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveAuthMode(value) {
  return cleanText(value) === "meituan-sso" ? "meituan-sso" : "standard";
}

export function isStableUuidOwner(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanText(value));
}

export function isSafePublicSupabaseKey(value) {
  const key = cleanText(value);
  if (key.startsWith("sb_publishable_")) return true;
  if (key.startsWith("sb_secret_")) return false;
  const parts = key.split(".");
  if (parts.length !== 3 || typeof globalThis.atob !== "function") return false;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded))?.role === "anon";
  } catch {
    return false;
  }
}

export function passwordCredentials(email, password) {
  const normalizedEmail = cleanText(email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, reason: "email" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, reason: "password" };
  }
  return { ok: true, email: normalizedEmail, password };
}

export function accountIdentity(session) {
  const user = session?.user;
  if (!user?.id) return null;
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const appMetadata = user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {};
  const identityData = Array.isArray(user.identities)
    ? user.identities.find((identity) => identity?.identity_data)?.identity_data || {}
    : {};
  const email = cleanText(user.email);
  const name = cleanText(metadata.full_name)
    || cleanText(metadata.name)
    || cleanText(identityData.full_name)
    || cleanText(identityData.name)
    || cleanText(metadata.sso_mis)
    || cleanText(appMetadata.sso_mis)
    || cleanText(identityData.sso_mis)
    || email.split("@")[0]
    || "Log Note";
  const initials = name
    .split(/\s+/)
    .map((part) => [...part][0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "L";
  const provider = cleanText(appMetadata.provider)
    || cleanText(user.identities?.[0]?.provider)
    || "unknown";
  return { id: String(user.id), email, name, initials, provider };
}

export function authStateForSession(session, mode = "standard") {
  if (!session) return { status: "signed-out", session: null, identity: null };
  const identity = accountIdentity(session);
  if (resolveAuthMode(mode) === "meituan-sso" && !isStableUuidOwner(identity?.id)) {
    return { status: "incompatible", session: null, identity: null };
  }
  return { status: "signed-in", session, identity };
}

export function authStatusAfterSignOutFailure(state, mode = "standard") {
  if (state?.session && state?.identity) return "signed-in";
  return resolveAuthMode(mode) === "meituan-sso" ? "incompatible" : "signed-out";
}

export function authCallbackUrl(origin) {
  return `${String(origin || "").replace(/\/+$/, "")}/auth/callback`;
}

export function oauthOriginSupported(origin) {
  try {
    const url = new URL(String(origin || ""));
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function googleOAuthOriginSupported(origin) {
  return oauthOriginSupported(origin);
}

async function startOAuth(client, origin, provider, options = {}) {
  if (!client?.auth?.signInWithOAuth) return { ok: false, reason: "unavailable" };
  if (!oauthOriginSupported(origin)) return { ok: false, reason: "secure-origin-required" };
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authCallbackUrl(origin), ...options }
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function startGoogleOAuth(client, origin) {
  return startOAuth(client, origin, "google", { scopes: "openid" });
}

export async function startMeituanSso(client, origin) {
  return startOAuth(client, origin, "meituan_sso");
}

async function attemptSignOut(client, scope) {
  try {
    return await client.auth.signOut({ scope });
  } catch (error) {
    return { error };
  }
}

export async function signOutRemoteAccount(client) {
  if (!client?.auth?.signOut) return { complete: false, error: new Error("Auth client is unavailable") };
  const globalResult = await attemptSignOut(client, "global");
  if (!globalResult?.error) return { complete: true, scope: "global" };
  const localResult = await attemptSignOut(client, "local");
  if (!localResult?.error) return { complete: true, scope: "local", remoteError: globalResult.error };
  return { complete: false, error: localResult.error, remoteError: globalResult.error };
}
