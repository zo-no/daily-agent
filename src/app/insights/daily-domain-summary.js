"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildDailyDomainInput, todayLocalDate } from "@/modules/insights/domain-daily-summary/model.mjs";

function displayDate(value, locale) { const [year, month, day] = String(value || "").split("-").map(Number); if (!year || !month || !day) return String(value || ""); return locale === "zh-CN" ? `${year}年${month}月${day}日` : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day))); }
function failureKey(code) { const map = { unsafe: "insights.dailyUnsafe", timeout: "insights.dailyTimeout", offline: "insights.dailyOffline", unconfigured: "insights.dailyUnconfigured", auth: "insights.dailyUnconfigured", "rate-limited": "insights.dailyRateLimited", "invalid-response": "insights.dailyInvalid", "invalid-input": "insights.dailyInvalid" }; return map[code] || "insights.dailyUnavailable"; }

export function DailyDomainSummary({ accountId, data, domainId, domainName, locale, provider, t }) {
  const [today, setToday] = useState(() => todayLocalDate());
  const selection = useMemo(() => buildDailyDomainInput(data, { domainId, domainName, locale, date: today }), [data, domainId, domainName, locale, today]);
  const initialPhase = selection.totalCount ? (selection.requestable ? "idle" : "unrequestable") : "empty";
  const [phase, setPhase] = useState(initialPhase); const [result, setResult] = useState(null); const [failure, setFailure] = useState("");
  const abortRef = useRef(null); const requestRef = useRef(null); const generationRef = useRef(0); const openRef = useRef(null); const startRef = useRef(null); const stopRef = useRef(null); const retryRef = useRef(null); const reanalyzeRef = useRef(null); const focusRef = useRef(null);
  const basePhase = selection.totalCount ? (selection.requestable ? "idle" : "unrequestable") : "empty";
  const clear = (next = basePhase) => { generationRef.current += 1; abortRef.current?.abort(); abortRef.current = null; requestRef.current = null; setResult(null); setFailure(""); setPhase(next); };
  useLayoutEffect(() => { clear(); return () => { generationRef.current += 1; abortRef.current?.abort(); abortRef.current = null; }; }, [accountId, selection.sourceFingerprint]);
  useLayoutEffect(() => { if (focusRef.current) { focusRef.current.current?.focus(); focusRef.current = null; } }, [phase]);
  useEffect(() => {
    const refresh = () => setToday((current) => {
      const next = todayLocalDate();
      return next === current ? current : next;
    });
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const timer = window.setTimeout(refresh, Math.max(250, nextMidnight - now.getTime() + 25));
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [today]);
  const open = () => { if (!selection.requestable) return; setResult(null); setFailure(""); focusRef.current = startRef; setPhase("disclosure"); };
  const cancel = () => { focusRef.current = openRef; clear(); };
  const start = async () => {
    if (!selection.requestable || phase !== "disclosure" || requestRef.current) return;
    generationRef.current += 1;
    const generation = generationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    requestRef.current = controller;
    focusRef.current = stopRef;
    setPhase("loading"); setResult(null); setFailure("");
    try {
      const next = await provider.analyze({ ...selection, signal: controller.signal });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setResult(next); focusRef.current = reanalyzeRef; setPhase("result");
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || error?.code === "aborted") return;
      setFailure(String(error?.code || "unavailable")); focusRef.current = retryRef; setPhase("unavailable");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (abortRef.current === controller) abortRef.current = null;
    }
  };
  return <section className="insights-daily" data-daily-summary data-daily-phase={phase} data-daily-total={selection.totalCount} data-daily-sent={selection.entries.length} aria-label={t("insights.dailyTitle")} aria-busy={phase === "loading" ? "true" : "false"}>
    <div className="insights-daily-live" aria-live="polite" aria-atomic="true">
      <div className="insights-daily-heading"><div><span>{displayDate(selection.date, locale)}</span><h2>{t("insights.dailyTitle")}</h2></div></div>
      {selection.totalCount > 0 && <p className="insights-daily-facts">{t("insights.dailyCounts", { total: selection.totalCount, ordinary: selection.ordinaryCount, periodic: selection.periodicCount })}</p>}
      {phase === "empty" && <p className="insights-daily-quiet" data-daily-empty>{t("insights.dailyEmpty")}</p>}
      {phase === "unrequestable" && <p className="insights-daily-quiet" data-daily-unrequestable>{t("insights.dailyUnrequestable")}</p>}
      {phase === "idle" && <button ref={openRef} type="button" className="insights-daily-action" data-daily-open onClick={open}>{t("insights.dailyAction")}</button>}
      {phase === "disclosure" && <div className="insights-daily-disclosure" data-daily-disclosure><p><strong>{selection.domainName}</strong> · {displayDate(selection.date, locale)}</p>{selection.omittedCount > 0 && <p data-daily-truncated>{t("insights.dailyTruncated", { sent: selection.entries.length, total: selection.totalCount, omitted: selection.omittedCount })}</p>}<p>{t("insights.dailySendDisclosure")}</p><p>{t("insights.dailySessionDisclosure")}</p><div className="insights-daily-actions"><button ref={startRef} type="button" data-daily-start onClick={start}>{t("insights.dailyStart")}</button><button type="button" data-daily-cancel onClick={cancel}>{t("insights.dailyCancel")}</button></div></div>}
      {phase === "loading" && <div className="insights-daily-progress" data-daily-loading><p>{t("insights.dailyLoading")}</p><button ref={stopRef} type="button" data-daily-stop onClick={cancel}>{t("insights.dailyStop")}</button></div>}
      {phase === "result" && result && <div className="insights-daily-result" data-daily-result><p className="insights-daily-overview">{result.overview}</p>{result.themes?.length > 0 && <div className="insights-daily-themes">{result.themes.map((theme) => <section key={theme.title} data-daily-theme><h3>{theme.title}</h3><p>{theme.summary}</p></section>)}</div>}<button ref={reanalyzeRef} type="button" className="insights-daily-retry" data-daily-reanalyze onClick={open}>{t("insights.dailyReanalyze")}</button></div>}
      {phase === "unavailable" && <div className="insights-daily-unavailable" data-daily-unavailable data-failure={failure}><p>{t(failureKey(failure))}</p><button ref={retryRef} type="button" className="insights-daily-retry" data-daily-retry onClick={open}>{t("insights.dailyRetry")}</button></div>}
    </div>
  </section>;
}
