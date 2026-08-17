/**
 * @fileoverview Pure account presentation helpers that never read or alter Log Note records.
 */

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const email = cleanText(user.email);
  const name = cleanText(metadata.full_name) || cleanText(metadata.name) || email.split("@")[0] || "Log Note";
  const initials = name
    .split(/\s+/)
    .map((part) => [...part][0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "L";
  return { id: String(user.id), email, name, initials, provider: cleanText(user.app_metadata?.provider) || "google" };
}

export function authCallbackUrl(origin) {
  return `${String(origin || "").replace(/\/+$/, "")}/auth/callback`;
}

export function googleOAuthOriginSupported(origin) {
  try {
    const url = new URL(String(origin || ""));
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function startGoogleOAuth(client, origin) {
  if (!client?.auth?.signInWithOAuth) return { ok: false, reason: "unavailable" };
  if (!googleOAuthOriginSupported(origin)) return { ok: false, reason: "secure-origin-required" };
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl(origin), scopes: "openid" }
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
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
