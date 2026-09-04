"use client";

/** Human-approved, session-only comparison of today's cached Google events and diary. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildCalendarDiaryLocalReview, buildCalendarDiaryReviewInput, todayLocalDate } from "@/modules/insights/calendar-diary-review/model.mjs";

function failureKey(code) { const map = { timeout: "insights.calendarReviewTimeout", offline: "insights.calendarReviewOffline", unconfigured: "insights.calendarReviewUnconfigured", auth: "insights.calendarReviewUnconfigured", "rate-limited": "insights.calendarReviewRateLimited", "invalid-response": "insights.calendarReviewInvalid", "invalid-input": "insights.calendarReviewInvalid" }; return map[code] || "insights.calendarReviewUnavailable"; }
function requestId() { return globalThis.crypto?.randomUUID?.() || `calendar-review-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export function DailyCalendarReview({ accountId, allDayEvents, data, locale, provider, remoteEnabled = false, t, timedEvents }) {
  const [today, setToday] = useState(() => todayLocalDate());
  const selection = useMemo(() => buildCalendarDiaryReviewInput({ timedEvents, allDayEvents, entries: data?.entries }, { date: today, locale }), [allDayEvents, data?.entries, locale, timedEvents, today]);
  const localReview = useMemo(() => buildCalendarDiaryLocalReview(selection), [selection]);
  const basePhase = selection.events.length ? "idle" : "calendar-empty";
  const [phase, setPhase] = useState(basePhase); const [result, setResult] = useState(null); const [failure, setFailure] = useState("");
  const abortRef = useRef(null); const generationRef = useRef(0); const openRef = useRef(null); const approveRef = useRef(null); const stopRef = useRef(null); const retryRef = useRef(null); const focusRef = useRef(null);
  const clear = (next = basePhase) => { generationRef.current += 1; abortRef.current?.abort(); abortRef.current = null; setResult(null); setFailure(""); setPhase(next); };

  useLayoutEffect(() => { clear(); return () => { generationRef.current += 1; abortRef.current?.abort(); }; }, [accountId, selection.sourceFingerprint]);
  useLayoutEffect(() => { if (focusRef.current) { focusRef.current.current?.focus(); focusRef.current = null; } }, [phase]);
  useEffect(() => {
    const refresh = () => setToday((current) => { const next = todayLocalDate(); return next === current ? current : next; });
    const now = new Date(); const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const timeout = window.setTimeout(refresh, Math.max(250, nextMidnight - now.getTime() + 25)); const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.clearTimeout(timeout); window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [today]);

  const open = () => { if (!selection.events.length) return; setResult(null); setFailure(""); focusRef.current = approveRef; setPhase("disclosure"); };
  const cancel = () => { focusRef.current = openRef; clear(); };
  const start = async () => {
    if (phase !== "disclosure" || !selection.events.length || abortRef.current) return;
    const generation = ++generationRef.current; const controller = new AbortController(); abortRef.current = controller;
    focusRef.current = stopRef; setPhase("loading"); setResult(null); setFailure("");
    try {
      const next = await provider.analyze({ ...selection, requestId: requestId(), signal: controller.signal });
      if (generation !== generationRef.current || controller.signal.aborted || next.sourceFingerprint !== selection.sourceFingerprint) return;
      setResult(next); focusRef.current = retryRef; setPhase("result");
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted || error?.code === "aborted") return;
      setFailure(String(error?.code || "unavailable")); focusRef.current = retryRef; setPhase("unavailable");
    } finally { if (abortRef.current === controller) abortRef.current = null; }
  };

  const renderIssue = (issue, index) => <li key={issue.id || `${issue.kind}:${index}`} data-calendar-review-issue={issue.kind}><span>{t(`insights.calendarReviewIssue.${issue.kind}`)}</span><strong>{issue.title}</strong><p>{issue.summary}</p></li>;
  return <section className="insights-today" data-calendar-diary-review data-calendar-review-phase={phase} aria-label={t("insights.calendarReviewTitle")} aria-busy={phase === "loading" ? "true" : "false"}>
    <div className="insights-today-live" aria-live="polite" aria-atomic="true">
      <header className="insights-today-heading"><div><span>{t("insights.calendarReviewKicker")}</span><h2>{t("insights.calendarReviewTitle")}</h2></div><p>{t(remoteEnabled ? "insights.calendarReviewScope" : "insights.calendarReviewLocalOnly")}</p></header>
      <div className="insights-today-facts" aria-label={t("insights.calendarReviewFactsLabel")}>
        <span><strong>{localReview.facts.eventCount}</strong>{t("insights.calendarReviewEvents")}</span>
        <span><strong>{localReview.facts.diaryCount}</strong>{t("insights.calendarReviewDiary")}</span>
        <span><strong>{localReview.facts.matchedEventCount}</strong>{t("insights.calendarReviewMatched")}</span>
      </div>
      {phase === "calendar-empty" && <p className="insights-today-empty" data-calendar-review-empty>{t("insights.calendarReviewEmpty")}</p>}
      {selection.events.length > 0 && !!localReview.issues.length && <ul className="insights-today-issues" aria-label={t("insights.calendarReviewIssuesLabel")}>{localReview.issues.slice(0, 8).map(renderIssue)}</ul>}
      {remoteEnabled && phase === "idle" && <button ref={openRef} className="insights-today-action" type="button" data-calendar-review-open onClick={open}>{t("insights.calendarReviewAction")}</button>}
      {phase === "disclosure" && <div className="insights-today-disclosure" data-calendar-review-disclosure><p>{t("insights.calendarReviewDisclosure", { events: selection.events.length, diary: selection.entries.length })}</p>{(selection.omittedEventCount || selection.omittedEntryCount) > 0 && <p>{t("insights.calendarReviewTruncated", { events: selection.omittedEventCount, diary: selection.omittedEntryCount })}</p>}<p>{t("insights.calendarReviewFields")}</p><p>{t("insights.calendarReviewNoWrite")}</p><div className="insights-today-actions"><button ref={approveRef} type="button" data-calendar-review-approve onClick={start}>{t("insights.calendarReviewApprove")}</button><button type="button" data-calendar-review-cancel onClick={cancel}>{t("insights.calendarReviewCancel")}</button></div></div>}
      {phase === "loading" && <div className="insights-today-progress" data-calendar-review-loading><p>{t("insights.calendarReviewLoading")}</p><button ref={stopRef} type="button" data-calendar-review-stop onClick={cancel}>{t("insights.calendarReviewStop")}</button></div>}
      {phase === "result" && result && <div className="insights-today-result" data-calendar-review-result><p className="insights-today-overview">{result.overview}</p>{result.suggestions.length > 0 && <ul className="insights-today-agent-issues">{result.suggestions.map(renderIssue)}</ul>}<button ref={retryRef} className="insights-today-retry" type="button" data-calendar-review-retry onClick={open}>{t("insights.calendarReviewAgain")}</button></div>}
      {phase === "unavailable" && <div className="insights-today-unavailable" data-calendar-review-unavailable data-failure={failure}><p>{t(failureKey(failure))}</p><button ref={retryRef} className="insights-today-retry" type="button" data-calendar-review-retry onClick={open}>{t("insights.calendarReviewRetry")}</button></div>}
    </div>
  </section>;
}
