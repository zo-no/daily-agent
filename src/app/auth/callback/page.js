"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { getSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser";
import "./auth-callback.css";

export default function AuthCallbackPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState("working");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const client = getSupabaseBrowserClient();
    const code = new URL(window.location.href).searchParams.get("code");
    if (!client || !code) {
      setStatus("error");
      return;
    }
    client.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error(error);
        setStatus("error");
        return;
      }
      window.location.replace("/");
    }).catch((error) => {
      console.error(error);
      setStatus("error");
    });
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
