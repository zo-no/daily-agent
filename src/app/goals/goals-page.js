"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { makeId } from "@/lib/data.mjs";
import { createGoalDraft, normalizeGoal, STATUSES } from "@/lib/goal-model.mjs";
import { buildGoalProgressFacts } from "@/modules/goals/okr-progress/model.mjs";
import { ManagementHeader } from "../_components/management-header";
import { useI18n } from "../_providers/i18n";
import { Icon } from "../_components/ui";
import { useLogNoteData, useToast } from "../_providers/use-log-note-data";

export function GoalsPage() {
  const { t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [draft, setDraft] = useState(null);
  const goals = useMemo(() => data.goals || [], [data.goals]);
  const goalFacts = useMemo(() => new Map(goals.map((goal) => [goal.id, buildGoalProgressFacts({ goal, entries: data.entries || [] })])), [data.entries, goals]);

  function addKeyResult() {
    setDraft((current) => ({ ...current, keyResults: [...(current.keyResults || []), { id: makeId("kr"), content: "", status: "active", targetValue: null, currentValue: null, unit: "", recordIds: [] }] }));
  }

  function updateKeyResult(id, patch) {
    setDraft((current) => ({ ...current, keyResults: (current.keyResults || []).map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function removeKeyResult(id) {
    setDraft((current) => ({ ...current, keyResults: (current.keyResults || []).filter((item) => item.id !== id) }));
  }

  function saveGoal(event) {
    event.preventDefault();
    if (!draft) return;
    try {
      const now = Date.now();
      const candidate = normalizeGoal({ ...draft, id: draft.id || makeId("goal"), createdAt: draft.createdAt || now, updatedAt: now });
      if (!commitData((state) => ({ ...state, goals: [...(state.goals || []).filter((goal) => goal.id !== candidate.id), candidate] }))) return;
      setDraft(null);
      setToast(t("goals.saved"));
    } catch (error) {
      setToast(error.message === "Goal date range is invalid" ? t("goals.dateRangeInvalid") : t("goals.contentRequired"));
    }
  }

  function deleteGoal(goal) {
    if (!window.confirm(t("goals.confirmDelete"))) return;
    if (!commitData((state) => ({
      ...state,
      goals: (state.goals || []).filter((item) => item.id !== goal.id),
      planBlocks: state.planBlocks.map((plan) => plan.goalId === goal.id ? { ...plan, goalId: null, updatedAt: Date.now() } : plan)
    }))) return;
    if (draft?.id === goal.id) setDraft(null);
    setToast(t("goals.deleted"));
  }

  if (!hydrated) return <main className="goals-page"><p>{t("goals.loading")}</p></main>;
  return (
    <main className="goals-page">
      <ManagementHeader backLabel={t("goals.back")} title={t("goals.title")} action={<button className="goals-add" type="button" onClick={() => setDraft(createGoalDraft())}><Icon name="plus" />{t("goals.add")}</button>} />
      <div className="goals-shell">
        <p className="goals-intro">{t("goals.intro")}</p>
        {!goals.length && !draft && <section className="goals-empty"><Icon name="plan" size={30} /><h2>{t("goals.emptyTitle")}</h2><p>{t("goals.emptyHint")}</p></section>}
        <div className="goals-list">
          {goals.map((goal) => <article className="goal-card" key={goal.id}>
            <div className="goal-card-main"><span className="goal-card-kicker">O · {t("goals.objective")}</span><span className={`goal-status is-${goal.status}`}>{t(`goals.status.${goal.status}`)}</span><h2>{goal.content}</h2>{(goal.startDate || goal.endDate) && <p>{goal.startDate || "…"} → {goal.endDate || "…"}</p>}<div className="goal-card-krs"><span className="goal-card-krs-label">K</span>{goal.keyResults?.length ? <div><strong>{t("goals.keyResultCount", { count: goal.keyResults.length })}</strong><ul>{goal.keyResults.slice(0, 3).map((item) => <li key={item.id}>{item.content}</li>)}</ul>{goal.keyResults.length > 3 && <small>{t("goals.moreKeyResults", { count: goal.keyResults.length - 3 })}</small>}</div> : <span className="goal-card-empty">{t("goals.noKeyResults")}</span>}</div><p className="goal-card-evidence">{t("goals.evidenceSummary", { evidence: goalFacts.get(goal.id)?.metrics.evidenceCount || 0, days: goalFacts.get(goal.id)?.metrics.recordedDayCount || 0 })}</p></div>
            <div className="goal-card-actions"><Link href={`/goals/${encodeURIComponent(goal.id)}`}>{t("goals.review")}</Link><button type="button" onClick={() => setDraft({ ...goal, keyResults: (goal.keyResults || []).map((item) => ({ ...item })) })}>{t("common.edit")}</button><button type="button" onClick={() => deleteGoal(goal)}>{t("common.delete")}</button></div>
          </article>)}
        </div>
        {draft && <section className="goal-editor"><form onSubmit={saveGoal}><div className="goal-editor-header"><h2>{draft.id ? t("goals.edit") : t("goals.add")}</h2><button type="button" onClick={() => setDraft(null)} aria-label={t("common.close")}><Icon name="close" /></button></div><label><span>{t("goals.content")}</span><input autoFocus value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} maxLength={240} /></label><div className="goal-date-fields"><label><span>{t("goals.startDate")}</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label><span>{t("goals.endDate")}</span><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div><label><span>{t("goals.statusLabel")}</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{[...STATUSES].map((status) => <option key={status} value={status}>{t(`goals.status.${status}`)}</option>)}</select></label><div className="goal-kr-editor"><div className="goal-kr-heading"><h3>{t("goals.keyResults")}</h3><button type="button" onClick={addKeyResult}>{t("goals.addKeyResult")}</button></div>{(draft.keyResults || []).map((item, index) => <fieldset key={item.id}><legend>{t("goals.keyResultNumber", { number: index + 1 })}</legend><label><span>{t("goals.keyResultContent")}</span><input value={item.content} onChange={(event) => updateKeyResult(item.id, { content: event.target.value })} maxLength={240} /></label><div className="goal-kr-values"><label><span>{t("goals.currentValue")}</span><input type="number" value={item.currentValue ?? ""} onChange={(event) => updateKeyResult(item.id, { currentValue: event.target.value === "" ? null : Number(event.target.value) })} /></label><label><span>{t("goals.targetValue")}</span><input type="number" value={item.targetValue ?? ""} onChange={(event) => updateKeyResult(item.id, { targetValue: event.target.value === "" ? null : Number(event.target.value) })} /></label><label><span>{t("goals.unit")}</span><input value={item.unit || ""} onChange={(event) => updateKeyResult(item.id, { unit: event.target.value })} maxLength={40} /></label></div><button className="goal-kr-remove" type="button" onClick={() => removeKeyResult(item.id)}>{t("goals.removeKeyResult")}</button></fieldset>)}</div><button className="goal-save" type="submit">{t("common.save")}</button></form></section>}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
