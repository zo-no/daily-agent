"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  accountIdentity,
  authStateForSession,
  authStatusAfterSignOutFailure,
  authCallbackUrl,
  oauthOriginSupported,
  passwordCredentials,
  resolveAuthMode,
  signOutRemoteAccount,
  startGoogleOAuth,
  startMeituanSso
} from "@/lib/auth-model.mjs";
import { getSupabaseBrowserClient } from "./supabase-browser";
import { useI18n } from "./i18n";

const AuthContext = createContext(null);
const E2E_AUTH_CONFIGURED = process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1";
const AUTH_MODE = resolveAuthMode(process.env.NEXT_PUBLIC_LOG_NOTE_AUTH_MODE);
const INTERNAL_AUTH = AUTH_MODE === "meituan-sso";
const E2E_IDENTITY = {
  id: "e2e-user",
  email: "e2e@log-note.local",
  name: "E2E Writer",
  initials: "EW",
  provider: "test"
};

function localE2EAuthEnabled() {
  return E2E_AUTH_CONFIGURED
    && typeof window !== "undefined"
    && ["127.0.0.1", "localhost"].includes(window.location.hostname);
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", session: null, identity: null });

  useEffect(() => {
    if (localE2EAuthEnabled()) {
      setState(window.localStorage.getItem("log-note:e2e-auth-locked") === "1"
        ? { status: "signed-out", session: null, identity: null }
        : { status: "signed-in", session: null, identity: E2E_IDENTITY });
      return undefined;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setState({ status: "unavailable", session: null, identity: null });
      return undefined;
    }
    let active = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error(error);
        setState({ status: "error", session: null, identity: null });
        return;
      }
      setState(authStateForSession(data.session, AUTH_MODE));
    }).catch((error) => {
      if (!active) return;
      console.error(error);
      setState({ status: "error", session: null, identity: null });
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(authStateForSession(session, AUTH_MODE));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithPassword(email, password) {
    if (INTERNAL_AUTH) return { ok: false, reason: "sso-only" };
    const credentials = passwordCredentials(email, password);
    if (!credentials.ok) return { ok: false, reason: credentials.reason };
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false, reason: "unavailable" };
    setState((current) => ({ ...current, status: "submitting" }));
    try {
      const { data, error } = await client.auth.signInWithPassword(credentials);
      if (error) {
        setState({ status: "signed-out", session: null, identity: null });
        return { ok: false, message: error.message };
      }
      setState({ status: "signed-in", session: data.session, identity: accountIdentity(data.session) });
      return { ok: true };
    } catch (error) {
      setState({ status: "signed-out", session: null, identity: null });
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  async function signUpWithPassword(email, password) {
    if (INTERNAL_AUTH) return { ok: false, reason: "sso-only" };
    const credentials = passwordCredentials(email, password);
    if (!credentials.ok) return { ok: false, reason: credentials.reason };
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false, reason: "unavailable" };
    setState((current) => ({ ...current, status: "submitting" }));
    try {
      const { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { emailRedirectTo: authCallbackUrl(window.location.origin) }
      });
      if (error) {
        setState({ status: "signed-out", session: null, identity: null });
        return { ok: false, message: error.message };
      }
      if (data.session) {
        setState({ status: "signed-in", session: data.session, identity: accountIdentity(data.session) });
        return { ok: true };
      }
      setState({ status: "signed-out", session: null, identity: null });
      return { ok: true, confirmationRequired: true };
    } catch (error) {
      setState({ status: "signed-out", session: null, identity: null });
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  async function signInWithGoogle() {
    if (INTERNAL_AUTH) return { ok: false, reason: "sso-only" };
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false, reason: "unavailable" };
    const origin = window.location.origin;
    if (!oauthOriginSupported(origin)) return { ok: false, reason: "secure-origin-required" };
    setState((current) => ({ ...current, status: "redirecting" }));
    const result = await startGoogleOAuth(client, origin);
    if (!result.ok) {
      setState({ status: "signed-out", session: null, identity: null });
      return result;
    }
    return { ok: true };
  }

  async function signInWithMeituan() {
    if (!INTERNAL_AUTH) return { ok: false, reason: "unavailable" };
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false, reason: "unavailable" };
    const origin = window.location.origin;
    if (!oauthOriginSupported(origin)) return { ok: false, reason: "secure-origin-required" };
    setState((current) => ({ ...current, status: "redirecting" }));
    const result = await startMeituanSso(client, origin);
    if (!result.ok) {
      setState({ status: "signed-out", session: null, identity: null });
      return result;
    }
    return { ok: true };
  }

  async function signOut() {
    if (localE2EAuthEnabled()) return { ok: true };
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false };
    setState((current) => ({ ...current, status: "signing-out" }));
    const result = await signOutRemoteAccount(client);
    if (!result.complete) {
      console.error(result.error);
      setState((current) => ({
        ...current,
        status: authStatusAfterSignOutFailure(current, AUTH_MODE)
      }));
      return { ok: false };
    }
    setState({ status: "signed-out", session: null, identity: null });
    return { ok: true, scope: result.scope };
  }

  const value = useMemo(() => ({
    ...state,
    mode: AUTH_MODE,
    internal: INTERNAL_AUTH,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithMeituan,
    signOut
  }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

function AccountGate() {
  const { locale, setLocale, t } = useI18n();
  const auth = useAuth();
  const [mode, setMode] = useState("sign-in");
  const [form, setForm] = useState({ email: "", password: "" });
  const [notice, setNotice] = useState("");
  const [secureOriginSupported, setSecureOriginSupported] = useState(true);
  const internal = auth.mode === "meituan-sso";

  useEffect(() => {
    setSecureOriginSupported(oauthOriginSupported(window.location.origin));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    const result = mode === "sign-up"
      ? await auth.signUpWithPassword(form.email, form.password)
      : await auth.signInWithPassword(form.email, form.password);
    setForm((current) => ({ ...current, password: "" }));
    if (result.ok && result.confirmationRequired) {
      setNotice(t("settings.accountCheckEmail"));
      return;
    }
    if (result.ok) return;
    if (result.message) {
      setNotice(result.message);
      return;
    }
    const key = result.reason === "email"
      ? "settings.accountEmailInvalid"
      : result.reason === "password"
        ? "settings.accountPasswordInvalid"
        : "auth.gateUnavailable";
    setNotice(t(key));
  }

  async function useGoogle() {
    setNotice("");
    const result = await auth.signInWithGoogle();
    if (!result.ok) {
      setNotice(result.reason === "secure-origin-required"
        ? t("auth.googleHttpsRequired")
        : result.message || t("auth.gateUnavailable"));
    }
  }

  async function useMeituan() {
    setNotice("");
    const result = await auth.signInWithMeituan();
    if (!result.ok) {
      setNotice(result.reason === "secure-origin-required"
        ? t("auth.meituanHttpsRequired")
        : result.message || t("auth.meituanUnavailable"));
    }
  }

  const unavailable = auth.status === "unavailable";
  const incompatible = auth.status === "incompatible";
  const busy = ["loading", "submitting", "redirecting", "signing-out"].includes(auth.status);
  return (
    <main className="account-gate">
      <section className="account-gate-card" aria-labelledby="account-gate-title">
        <div className="account-gate-topline">
          <div className="account-gate-brand"><span className="brand-mark">L</span><strong>Log Note</strong></div>
          <button type="button" onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}>{locale === "zh-CN" ? "EN" : "中"}</button>
        </div>
        <div className="account-gate-heading">
          <h1 id="account-gate-title">{t(internal ? "auth.meituanTitle" : mode === "sign-up" ? "auth.gateCreateTitle" : "auth.gateTitle")}</h1>
          <span>{t(internal ? "auth.meituanDescription" : mode === "sign-up" ? "auth.gateCreateDescription" : "auth.gateDescription")}</span>
        </div>
        {unavailable || incompatible ? (
          <>
            <p className="account-gate-notice" role="alert">{t(incompatible ? "auth.meituanIdentityUnsupported" : internal ? "auth.meituanUnavailable" : "auth.gateUnavailable")}</p>
            {incompatible && <button className="account-password-action" type="button" onClick={auth.signOut}>{t("settings.accountSignOut")}</button>}
          </>
        ) : internal ? (
          <>
            {notice && <p className="account-gate-notice" role="status">{notice}</p>}
            <button
              className="account-password-action account-meituan-action"
              type="button"
              disabled={busy || !secureOriginSupported}
              onClick={useMeituan}
            >
              {t(!secureOriginSupported
                ? "auth.meituanHttpsRequired"
                : auth.status === "redirecting"
                  ? "auth.meituanRedirecting"
                  : "auth.meituanContinue")}
            </button>
          </>
        ) : (
          <>
            <div className="account-mode-switch" role="tablist" aria-label={t("settings.accountPasswordTitle")}>
              <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setNotice(""); }}>{t("settings.accountSignInTab")}</button>
              <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setNotice(""); }}>{t("settings.accountSignUpTab")}</button>
            </div>
            <form className="account-password-form" onSubmit={submit}>
              <label><span>{t("settings.accountEmail")}</span><input type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label><span>{t("settings.accountPassword")}</span><input type="password" minLength="8" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
              {notice && <p className="account-gate-notice" role="status">{notice}</p>}
              <button className="account-password-action" type="submit" disabled={busy}>{t(busy ? "settings.accountSubmitting" : mode === "sign-up" ? "settings.accountCreate" : "settings.accountSignIn")}</button>
            </form>
            <div className="account-divider"><span>{t("settings.accountOr")}</span></div>
            <button className="account-google-action" type="button" disabled={busy || !secureOriginSupported} onClick={useGoogle}><span className="account-google-mark" aria-hidden="true">G</span>{t(!secureOriginSupported ? "auth.googleHttpsRequired" : auth.status === "redirecting" ? "settings.accountRedirecting" : "settings.accountContinueGoogle")}</button>
          </>
        )}
      </section>
    </main>
  );
}

export function AuthGate({ children }) {
  const pathname = usePathname();
  const auth = useAuth();
  if (pathname === "/auth/callback") return children;
  if (auth.status === "signed-in") return children;
  if (auth.status === "loading") {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>Log Note</p></main>;
  }
  return <AccountGate />;
}
