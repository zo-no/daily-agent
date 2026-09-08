"use client";

import { useMemo, useState } from "react";
import { buildGoalProgressFacts, buildOkrAnalysisInput } from "@/modules/goals/okr-progress/model.mjs";
import { useI18n } from "../_providers/i18n";
import { ManagementHeader } from "../_components/management-header";
import { useLogNoteData } from "../_providers/use-log-note-data";

function percent(value) {
  return value === null ? null : Math.round(value * 100);
}

export function GoalDetailPage({ goalId }) {
  const { locale, t } = useI18n();
  const { data, hydrated } = useLogNoteData();
  const [disclosure, setDisclosure] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const goal = useMemo(() => (data.goals || []).find((item) => item.id === goalId), [data.goals, goalId]);
  const facts = useMemo(() => buildGoalProgressFacts({ goal, entries: data.entries || [] }), [data.entries, goal]);
  const grouped = useMemo(() => {
    const groups = [];
    for (const entry of facts?.evidence || []) {
      const previous = groups.at(-1);
      if (!previous || previous.date !== entry.date) groups.push({ date: entry.date, entries: [] });
      groups.at(-1).entries.push(entry);
    }
    return groups;
  }, [facts]);

  async function requestAnalysis() {
    if (!facts) return;
    setAnalysis({ state: "loading" });
    try {
      const input = buildOkrAnalysisInput(facts, { locale });
      const response = await fetch("/api/goals/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const value = await response.json();
      if (!response.ok) throw new Error(value?.error?.code || "AI_UNAVAILABLE");
      if (value.requestId !== input.requestId || value.sourceFingerprint !== input.sourceFingerprint) throw new Error("AI_RESPONSE_STALE");
      setAnalysis({ state: "ready", value });
      setDisclosure(false);
    } catch (error) {
      setAnalysis({ state: "error", code: error.message });
    }
  }

  if (!hydrated) return <main className="goal-detail-page"><p>{t("goals.loading")}</p></main>;
  if (!goal || !facts) return <main className="goal-detail-page"><ManagementHeader backHref="/goals" backLabel={t("goals.backToGoals")} title={t("goals.notFound")} /><section className="goal-detail-empty"><p>{t("goals.notFoundHint")}</p></section></main>;

  return <main className="goal-detail-page">
    <ManagementHeader backHref="/goals" backLabel={t("goals.backToGoals")} title={t("goals.reviewTitle")} />
    <div className="goal-detail-shell">
      <header className="goal-detail-hero"><span className={`goal-status is-${goal.status}`}>{t(`goals.status.${goal.status}`)}</span><h2>{goal.content}</h2><p>{facts.goal.startDate && facts.goal.endDate ? `${facts.goal.startDate} → ${facts.goal.endDate}` : t("goals.undated")}</p></header>
      <section className="goal-metrics" aria-label={t("goals.progressSummary")}><div><strong>{facts.metrics.recordedDayCount}</strong><span>{t("goals.recordedDays")}</span></div><div><strong>{facts.metrics.missingDayCount}</strong><span>{t("goals.missingDays")}</span></div><div><strong>{facts.metrics.evidenceCount}</strong><span>{t("goals.evidenceCount")}</span></div></section>
      <section className="goal-detail-section"><div className="goal-section-heading"><span>K</span><h2>{t("goals.keyResults")}</h2></div>{!facts.keyResults.length ? <p className="goal-muted">{t("goals.noKeyResults")}</p> : <div className="goal-detail-krs">{facts.keyResults.map((item) => { const value = percent(item.progress); return <article key={item.id}><div><span className={`goal-status is-${item.status}`}>{t(`goals.status.${item.status}`)}</span><h3>{item.content}</h3><p>{value === null ? t("goals.qualitativeProgress", { count: item.evidenceCount }) : t("goals.numericProgress", { current: item.currentValue, target: item.targetValue, unit: item.unit || "", percent: value })}</p></div>{value !== null && <div className="goal-progress" aria-label={`${value}%`}><span style={{ width: `${value}%` }} /></div>}</article>; })}</div>}</section>
      <section className="goal-detail-section"><div className="goal-section-heading"><span>R</span><h2>{t("goals.timeline")}</h2></div>{!grouped.length ? <div className="goal-detail-empty"><p>{facts.periodDays.length ? t("goals.noEvidence") : t("goals.undatedEvidence")}</p></div> : <div className="goal-timeline">{grouped.map((group) => <section key={group.date}><h3>{group.date}</h3>{group.entries.map((entry) => <article key={entry.id}><time>{entry.time || t("entry.noTime")}</time><p>{entry.content}</p></article>)}</section>)}</div>}</section>
      <section className="goal-detail-section goal-ai"><div className="goal-section-heading"><span>AI</span><h2>{t("goals.aiTitle")}</h2></div><p className="goal-muted">{t("goals.aiDescription")}</p><button className="goal-ai-action" type="button" onClick={() => setDisclosure(true)} disabled={!facts.evidence.length}>{t("goals.aiStart")}</button>{disclosure && <div className="goal-ai-disclosure" role="dialog" aria-modal="true" aria-label={t("goals.aiDisclosureTitle")}><h3>{t("goals.aiDisclosureTitle")}</h3><p>{t("goals.aiDisclosureBody", { records: facts.metrics.evidenceCount, keyResults: facts.keyResults.length })}</p><ul><li>{t("goals.aiDisclosureGoal")}</li><li>{t("goals.aiDisclosureEvidence")}</li><li>{t("goals.aiDisclosureNoAccount")}</li></ul><div><button type="button" onClick={() => setDisclosure(false)}>{t("common.cancel")}</button><button type="button" onClick={requestAnalysis}>{t("goals.aiConfirm")}</button></div></div>}{analysis?.state === "loading" && <p role="status">{t("goals.aiLoading")}</p>}{analysis?.state === "error" && <p className="goal-ai-error" role="status">{analysis.code === "AI_NOT_CONFIGURED" ? t("goals.aiNotConfigured") : analysis.code === "AI_RESPONSE_STALE" ? t("goals.aiStale") : t("goals.aiUnavailable")}</p>}{analysis?.state === "ready" && <div className="goal-ai-result"><h3>{analysis.value.summary}</h3>{[["completed", t("goals.aiCompleted")], ["inProgress", t("goals.aiInProgress")], ["missingEvidence", t("goals.aiMissing")], ["risks", t("goals.aiRisks")], ["nextSteps", t("goals.aiNext")]].map(([key, label]) => <section key={key}><h4>{label}</h4><ul>{analysis.value[key].map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul></section>)}</div>}</section>
    </div>
  </main>;
}
