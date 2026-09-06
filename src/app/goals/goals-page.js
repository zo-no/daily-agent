"use client";

import { useMemo, useState } from "react";
import { makeId } from "@/lib/data.mjs";
import { createGoalDraft, normalizeGoal, STATUSES } from "@/lib/goal-model.mjs";
import { ManagementHeader } from "../management-header";
import { useI18n } from "../i18n";
import { Icon } from "../ui";
import { useLogNoteData, useToast } from "../use-log-note-data";

export function GoalsPage() {
  const { t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [draft, setDraft] = useState(null);
  const goals = useMemo(() => data.goals || [], [data.goals]);

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
            <div className="goal-card-main"><span className={`goal-status is-${goal.status}`}>{t(`goals.status.${goal.status}`)}</span><h2>{goal.content}</h2>{(goal.startDate || goal.endDate) && <p>{goal.startDate || "…"} → {goal.endDate || "…"}</p>}</div>
            <div className="goal-card-actions"><button type="button" onClick={() => setDraft({ ...goal })}>{t("common.edit")}</button><button type="button" onClick={() => deleteGoal(goal)}>{t("common.delete")}</button></div>
          </article>)}
        </div>
        {draft && <section className="goal-editor"><form onSubmit={saveGoal}><div className="goal-editor-header"><h2>{draft.id ? t("goals.edit") : t("goals.add")}</h2><button type="button" onClick={() => setDraft(null)} aria-label={t("common.close")}><Icon name="close" /></button></div><label><span>{t("goals.content")}</span><input autoFocus value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} maxLength={240} /></label><div className="goal-date-fields"><label><span>{t("goals.startDate")}</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label><span>{t("goals.endDate")}</span><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div><label><span>{t("goals.statusLabel")}</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{[...STATUSES].map((status) => <option key={status} value={status}>{t(`goals.status.${status}`)}</option>)}</select></label><button className="goal-save" type="submit">{t("common.save")}</button></form></section>}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
