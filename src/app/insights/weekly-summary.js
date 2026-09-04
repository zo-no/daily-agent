"use client";

/** Explicit, transient seven-day AI summary for the selected domain. */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildWeeklyDomainInput } from "@/modules/insights/domain-review/model.mjs";

function displayDate(value, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "");
  const [year, month, day] = match.slice(1).map(Number);
  if (locale === "zh-CN") return `${year}年${month}月${day}日`;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function requestPayload(selection) {
  return {
    windowStart: selection.windowStart,
    windowEnd: selection.windowEnd,
    domainName: selection.domainName,
    locale: selection.locale,
    entries: selection.entries
  };
}

function unavailableKey(code) {
  if (code === "unsafe") return "insights.weeklyUnsafe";
  if (code === "timeout") return "insights.weeklyTimeout";
  if (code === "offline") return "insights.weeklyOffline";
  if (code === "unconfigured") return "insights.weeklyUnconfigured";
  if (code === "auth") return "insights.weeklyAuth";
  if (code === "rate-limited") return "insights.weeklyRateLimited";
  if (code === "invalid-response" || code === "invalid-input") return "insights.weeklyInvalid";
  return "insights.weeklyUnavailable";
}

export function WeeklySummary({
  accountId,
  data,
  domainId,
  domainName,
  locale,
  provider,
  t
}) {
  const selection = useMemo(() => buildWeeklyDomainInput(data, {
    domainId,
    domainName,
    locale
  }), [data, domainId, domainName, locale]);
  const [phase, setPhase] = useState(selection.totalCount > 0 ? "idle" : "empty");
  const [result, setResult] = useState(null);
  const [failureCode, setFailureCode] = useState("");
  const abortRef = useRef(null);
  const generationRef = useRef(0);
  const openRef = useRef(null);
  const startRef = useRef(null);
  const stopRef = useRef(null);
  const reanalyzeRef = useRef(null);
  const retryRef = useRef(null);
  const pendingFocusRef = useRef(null);

  const clearSession = (nextPhase = selection.totalCount > 0 ? "idle" : "empty") => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(null);
    setFailureCode("");
    setPhase(nextPhase);
  };

  useEffect(() => {
    clearSession(selection.totalCount > 0 ? "idle" : "empty");
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, data, domainId, domainName, locale]);

  useLayoutEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    target.current?.focus();
  }, [phase]);

  const openDisclosure = () => {
    if (!selection.totalCount) return;
    setResult(null);
    setFailureCode("");
    pendingFocusRef.current = startRef;
    setPhase("disclosure");
  };

  const returnToIdle = () => {
    pendingFocusRef.current = openRef;
    clearSession("idle");
  };

  const startSummary = async () => {
    if (!selection.entries.length || phase === "loading") return;
    generationRef.current += 1;
    const generation = generationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setFailureCode("");
    pendingFocusRef.current = stopRef;
    setPhase("loading");
    try {
      const nextResult = await provider.analyze({
        ...requestPayload(selection),
        signal: controller.signal
      });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      abortRef.current = null;
      setResult(nextResult);
      pendingFocusRef.current = reanalyzeRef;
      setPhase("result");
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || error?.code === "aborted") return;
      abortRef.current = null;
      setResult(null);
      setFailureCode(String(error?.code || "unavailable"));
      pendingFocusRef.current = retryRef;
      setPhase("unavailable");
    }
  };

  const windowLabel = t("insights.weeklyWindow", {
    end: displayDate(selection.windowEnd, locale),
    start: displayDate(selection.windowStart, locale)
  });

  return (
    <section
      className="insights-weekly"
      data-weekly-summary
      data-weekly-phase={phase}
      data-weekly-total={selection.totalCount}
      data-weekly-sent={selection.entries.length}
      aria-label={t("insights.weeklyTitle")}
      aria-busy={phase === "loading" ? "true" : "false"}
    >
      <div className="insights-weekly-live" aria-live="polite" aria-atomic="true">
        {phase === "empty" && (
          <p className="insights-weekly-quiet" data-weekly-empty>{t("insights.weeklyEmpty")}</p>
        )}

        {phase === "idle" && (
          <button
            type="button"
            className="insights-weekly-action"
            data-weekly-open
            ref={openRef}
            onClick={openDisclosure}
          >
            {t("insights.weeklyAction")}
          </button>
        )}

        {phase === "disclosure" && (
          <div className="insights-weekly-disclosure" data-weekly-disclosure>
            <p className="insights-weekly-scope">
              <strong>{domainName}</strong>
              <span>{windowLabel}</span>
            </p>
            <p>{t("insights.weeklyCounts", {
              ordinary: selection.ordinaryCount,
              periodic: selection.periodicCount
            })}</p>
            {selection.omittedCount > 0 && (
              <p data-weekly-truncated>{t("insights.weeklyTruncated", {
                omitted: selection.omittedCount,
                sent: selection.entries.length,
                total: selection.totalCount
              })}</p>
            )}
            <p>{t("insights.weeklySendDisclosure")}</p>
            <p>{t("insights.weeklySessionDisclosure")}</p>
            <div className="insights-weekly-actions">
              <button ref={startRef} type="button" data-weekly-start onClick={startSummary}>{t("insights.weeklyStart")}</button>
              <button type="button" data-weekly-cancel onClick={returnToIdle}>{t("insights.weeklyCancel")}</button>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="insights-weekly-progress" data-weekly-loading>
            <p>{t("insights.weeklyLoading")}</p>
            <button ref={stopRef} type="button" data-weekly-stop onClick={returnToIdle}>{t("insights.weeklyStop")}</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="insights-weekly-result" data-weekly-result>
            {selection.limitedSample && <p className="insights-weekly-limited">{t("insights.weeklyLimited")}</p>}
            <p className="insights-weekly-overview">{result.overview}</p>
            {result.themes.length > 0 && (
              <div className="insights-weekly-themes">
                {result.themes.map((theme) => (
                  <section key={theme.title} data-weekly-theme>
                    <h3>{theme.title}</h3>
                    <p>{theme.summary}</p>
                  </section>
                ))}
              </div>
            )}
            <button ref={reanalyzeRef} type="button" className="insights-weekly-retry" data-weekly-reanalyze onClick={openDisclosure}>
              {t("insights.weeklyReanalyze")}
            </button>
          </div>
        )}

        {phase === "unavailable" && (
          <div className="insights-weekly-unavailable" data-weekly-unavailable data-failure={failureCode}>
            <p>{t(unavailableKey(failureCode))}</p>
            <button ref={retryRef} type="button" className="insights-weekly-retry" data-weekly-retry onClick={openDisclosure}>
              {t("insights.weeklyRetry")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
