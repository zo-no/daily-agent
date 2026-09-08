"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../_providers/i18n";
import { getSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser";
import { App } from "@capacitor/app";
import "./auth-callback.css";

export default function AuthCallbackPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState("working");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus("error");
      return;
    }

    let active = true;
    let handled = false;
    const exchange = (rawUrl) => {
      if (handled || !rawUrl) return;
      let code = null;
      try {
        code = new URL(rawUrl, window.location.origin).searchParams.get("code");
      } catch {
        code = null;
      }
      if (!code) return;
      handled = true;
      client.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!active) return;
        if (error) {
          console.error(error);
          setStatus("error");
          return;
        }
        window.location.replace("/");
      }).catch((error) => {
        if (!active) return;
        console.error(error);
        setStatus("error");
      });
    };

    exchange(window.location.href);
    const listener = App.addListener("appUrlOpen", ({ url }) => exchange(url));
    listener.catch((error) => console.error(error));
    return () => {
      active = false;
      listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);

  return (
    <main className="auth-callback-page">
      <section className="auth-callback-status" role="status" aria-live="polite">
        <span className="auth-callback-mark">L</span>
        <h1>{t(status === "working" ? "auth.callbackWorking" : "auth.callbackFailed")}</h1>
        <p>{t(status === "working" ? "auth.callbackWorkingDetail" : "auth.callbackFailedDetail")}</p>
        {status === "error" && <a href="/">{t("auth.backToAccount")}</a>}
      </section>
    </main>
  );
}
