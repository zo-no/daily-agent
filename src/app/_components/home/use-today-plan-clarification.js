"use client";

/** Session-only orchestration for the side Hero's plan-to-record clarification. */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildTodayPlanClarificationInput, todayPlanClarificationLocalDate } from "@/modules/diary/today-plan-clarification/model.mjs";
import { timeToMinutes } from "@/lib/plan-model.mjs";
import { localTime, makeId } from "@/lib/data.mjs";

const idle = () => ({ status: "idle", snapshot: null, targets: [], overlay: null, error: "", busy: false });
const requestId = () => `today-clarification-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

function createSnapshot(data, date, locale, visibleEntries) {
  const plans = data.planBlocks.filter((plan) => plan.source === "local" && plan.date === date)
    .map((plan, index) => ({ ...plan, startMinute: timeToMinutes(plan.startTime), endMinute: timeToMinutes(plan.endTime), index }))
    .filter((plan) => Number.isInteger(plan.startMinute) && Number.isInteger(plan.endMinute) && plan.endMinute > plan.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || String(a.title).localeCompare(String(b.title)) || a.index - b.index);
  // Scope record candidates to the ordinary entries rendered by the current
  // record view. Fixed/periodic values never get an unreachable marker.
  const entries = (Array.isArray(visibleEntries) ? visibleEntries : []).filter((entry) => entry.date === date && String(entry.content || "").trim())
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")) || (Number(a.createdAt) || a.index) - (Number(b.createdAt) || b.index) || a.index - b.index);
  const input = buildTodayPlanClarificationInput({
    plans: plans.map((plan) => ({ ...plan, date, source: "local" })),
    entries
  }, { date, locale });
  return {
    input,
    sourceByOpaqueId: new Map([
      ...input.plans.map((plan, index) => [plan.id, { kind: "plan", source: plans[index] }]),
      ...input.entries.map((entry, index) => [entry.id, { kind: "entry", source: entries[index] }])
    ])
  };
}

/** Owns no durable data: proposals only reach commitData after explicit apply. */
export function useTodayPlanClarification({ data, entries, selectedDate, locale, provider, commitData, setToast, t }) {
  const [session, setSession] = useState(idle);
  const abortRef = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const isToday = selectedDate === todayPlanClarificationLocalDate();
  const currentSnapshot = useMemo(
    () => isToday ? createSnapshot(data, selectedDate, locale, entries) : null,
    [data, entries, isToday, locale, selectedDate]
  );

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!session.snapshot || !currentSnapshot || session.snapshot.input.sourceFingerprint === currentSnapshot.input.sourceFingerprint) return;
    abortRef.current?.abort();
    setSession(idle());
  }, [currentSnapshot, session.snapshot]);

  function reset({ restoreFocus = true } = {}) {
    abortRef.current?.abort();
    const trigger = sessionRef.current.overlay?.trigger;
    setSession(idle());
    if (restoreFocus) requestAnimationFrame(() => trigger?.focus?.({ preventScroll: true }));
  }

  function activate(trigger) {
    if (!isToday) { setSession((current) => ({ ...current, error: "not-today" })); return; }
    if (!currentSnapshot?.input.plans.length) { setSession((current) => ({ ...current, error: "no-plans" })); return; }
    const rect = trigger?.getBoundingClientRect?.();
    setSession({ status: "disclosure", snapshot: currentSnapshot, targets: [], overlay: { trigger, anchorRect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null }, error: "", busy: false });
  }

  async function beginAnalysis() {
    const snapshot = sessionRef.current.snapshot;
    if (!snapshot || sessionRef.current.status !== "disclosure") return;
    const controller = new AbortController(); abortRef.current?.abort(); abortRef.current = controller;
    setSession((current) => ({ ...current, status: "analyzing", busy: true, error: "" }));
    try {
      const result = await provider.analyze({ ...snapshot.input, mode: "analyze", requestId: requestId(), signal: controller.signal });
      if (controller.signal.aborted || abortRef.current !== controller || !currentSnapshot || currentSnapshot.input.sourceFingerprint !== snapshot.input.sourceFingerprint) return;
      const targets = result.targets.filter((target) => snapshot.sourceByOpaqueId.get(target.sourceId)?.kind === target.kind);
      setSession({ status: "ready", snapshot, targets, overlay: null, error: "", busy: false });
    } catch (error) {
      if (!controller.signal.aborted && abortRef.current === controller) setSession((current) => ({ ...current, status: "idle", busy: false, error: error?.code || "unavailable" }));
    } finally { if (abortRef.current === controller) abortRef.current = null; }
  }

  function openTarget(sourceId, trigger) {
    const target = sessionRef.current.targets.find((item) => item.sourceId === sourceId);
    if (!target || !sessionRef.current.snapshot?.sourceByOpaqueId.has(sourceId)) return;
    const rect = trigger?.getBoundingClientRect?.();
    setSession((current) => ({ ...current, overlay: { sourceId, question: target.question, questionIndex: 1, answers: [], candidate: "", trigger, anchorRect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null } }));
  }

  function closeOverlay() {
    const current = sessionRef.current;
    if (current.status === "ready" && current.overlay?.sourceId) {
      const trigger = current.overlay.trigger;
      setSession((state) => ({ ...state, overlay: null, busy: false, error: "" }));
      requestAnimationFrame(() => trigger?.focus?.({ preventScroll: true }));
      return;
    }
    reset();
  }

  async function answer(questionAnswer) {
    const current = sessionRef.current; const overlay = current.overlay; const target = current.targets.find((item) => item.sourceId === overlay?.sourceId);
    if (!overlay || !target || current.busy || !current.snapshot) return;
    const currentInput = currentSnapshot?.input;
    if (!currentInput || currentInput.sourceFingerprint !== current.snapshot.input.sourceFingerprint) { reset(); return; }
    const controller = new AbortController(); abortRef.current?.abort(); abortRef.current = controller;
    setSession((state) => ({ ...state, busy: true, error: "" }));
    try {
      const source = (target.kind === "entry" ? current.snapshot.input.entries : current.snapshot.input.plans).find((item) => item.id === target.sourceId);
      if (!source) { reset(); return; }
      const answers = [...(overlay.answers || []), { question: overlay.question, answer: questionAnswer }];
      const result = await provider.reply({ schemaVersion: current.snapshot.input.schemaVersion, mode: "reply", requestId: requestId(), targetDate: current.snapshot.input.targetDate, sourceFingerprint: current.snapshot.input.sourceFingerprint, locale: current.snapshot.input.locale, target: { kind: target.kind, sourceId: target.sourceId, ...(target.kind === "entry" ? { time: source.time, content: source.content } : { title: source.title, startMinute: source.startMinute, endMinute: source.endMinute }) }, questionIndex: overlay.questionIndex, answers, signal: controller.signal });
      if (controller.signal.aborted || abortRef.current !== controller) return;
      if (!currentSnapshot || currentSnapshot.input.sourceFingerprint !== current.snapshot.input.sourceFingerprint) { reset(); return; }
      setSession((state) => ({ ...state, busy: false, overlay: result.outcome === "question" ? { ...overlay, question: result.question, questionIndex: 2, answers } : { ...overlay, answers, candidate: result.outcome === "candidate" ? result.replacementContent : "", none: result.outcome === "none" } }));
    } catch (error) { if (!controller.signal.aborted && abortRef.current === controller) setSession((state) => ({ ...state, busy: false, error: error?.code || "unavailable" })); }
    finally { if (abortRef.current === controller) abortRef.current = null; }
  }

  function applyCandidate() {
    const current = sessionRef.current; const overlay = current.overlay; const target = current.targets.find((item) => item.sourceId === overlay?.sourceId); const snapshot = current.snapshot;
    if (!overlay?.candidate || !target || !snapshot || !currentSnapshot || currentSnapshot.input.sourceFingerprint !== snapshot.input.sourceFingerprint) { reset(); return; }
    const source = snapshot.sourceByOpaqueId.get(target.sourceId)?.source;
    if (!source) { reset(); return; }
    let saved = false;
    if (target.kind === "entry") {
      saved = commitData((state) => ({ ...state, entries: state.entries.map((entry) => entry.id === source.id && entry.content === source.content ? { ...entry, content: overlay.candidate } : entry) }));
    } else {
      const quick = data.templates.find((template) => template.id === "quick") || data.templates.find((template) => template.inputMode === "free");
      const entry = { id: makeId("entry"), date: selectedDate, time: source.endTime || localTime(), content: overlay.candidate, categoryId: quick?.categoryId || data.categories[0]?.id || "", tags: [], templateId: quick?.id || null, fieldValues: {}, attachments: [], createdAt: Date.now() };
      saved = commitData((state) => ({ ...state, entries: [...state.entries, entry] }));
    }
    if (!saved) {
      setSession((state) => ({ ...state, error: "save-failed" }));
      return;
    }
    setToast(t(target.kind === "entry" ? "agent.clarificationUpdated" : "agent.clarificationCreated"));
    reset({ restoreFocus: false });
  }

  const entrySourceIds = useMemo(() => new Set(session.targets.filter((target) => target.kind === "entry").map((target) => target.sourceId)), [session.targets]);
  const planSourceIds = useMemo(() => new Set(session.targets.filter((target) => target.kind === "plan").map((target) => target.sourceId)), [session.targets]);
  const entryMarkerIds = useMemo(() => new Set([...entrySourceIds].map((id) => session.snapshot?.sourceByOpaqueId.get(id)?.source?.id).filter(Boolean)), [entrySourceIds, session.snapshot]);
  const planMarkerIds = useMemo(() => new Set([...planSourceIds].map((id) => session.snapshot?.sourceByOpaqueId.get(id)?.source?.id).filter(Boolean)), [planSourceIds, session.snapshot]);
  const sourceIdForEntry = (id) => [...entrySourceIds].find((sourceId) => session.snapshot?.sourceByOpaqueId.get(sourceId)?.source?.id === id) || "";
  const sourceIdForPlan = (id) => [...planSourceIds].find((sourceId) => session.snapshot?.sourceByOpaqueId.get(sourceId)?.source?.id === id) || "";

  return { session, isToday, snapshot: currentSnapshot, activate, beginAnalysis, reset, openTarget, closeOverlay, answer, applyCandidate, entryMarkerIds, planMarkerIds, sourceIdForEntry, sourceIdForPlan };
}
