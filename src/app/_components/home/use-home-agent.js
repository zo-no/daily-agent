"use client";

/**
 * @fileoverview 集中首页私有的 Diary 与 Plan Agent 编排：会话状态、生命周期 effect 与显式确认动作。
 * 只暴露组装层需要的数据与动作；写入仍走 commitData，模型请求仍走注入的 agentProvider。
 */

import { useEffect, useRef, useState } from "react";
import {
  agentCategoryResolution,
  mergePlanUpdateProposal,
  reconcileAgentReviewItems
} from "@/modules/assistant/review/model.mjs";
import { timeToMinutes } from "@/lib/plan-model.mjs";
import { localDate, localTime, makeId } from "@/lib/data.mjs";

function createIdleDiarySession() {
  return {
    status: "idle",
    intro: "",
    items: [],
    activeIndex: 0,
    messages: [],
    proposedAppend: "",
    proposedCategoryId: "",
    replyOutcome: "",
    replying: false,
    lastCategoryUndo: null,
    fallbackReason: ""
  };
}

function createIdlePlanSession() {
  return {
    status: "idle",
    intro: "",
    items: [],
    activeIndex: 0,
    messages: [],
    proposal: null,
    replying: false,
    fallbackReason: ""
  };
}

export function useHomeAgent({
  accountId,
  agentProvider,
  availableCategories,
  commitData,
  data,
  dayPlanActive,
  locale,
  savePlanBlock,
  selectedDate,
  selectedGoogleConflicts,
  selectedLocalPlans,
  setToast,
  t,
  timelineEntries,
  viewMode
}) {
  const [agentSession, setAgentSession] = useState(createIdleDiarySession);
  const [planAgentSession, setPlanAgentSession] = useState(createIdlePlanSession);
  const [agentEmptyNote, setAgentEmptyNote] = useState("");
  const [agentInteractionPaused, setAgentInteractionPaused] = useState(false);
  const [agentMobileViewport, setAgentMobileViewport] = useState(false);
  const [agentDocumentHidden, setAgentDocumentHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const agentAbortRef = useRef(null);
  const agentEmptyNoteTimerRef = useRef(0);

  // Unmount cleanup: cancel any in-flight request and clear the transient note timer.
  useEffect(() => () => {
    window.clearTimeout(agentEmptyNoteTimerRef.current);
    agentAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener?.("change", updateMotionPreference);
    return () => motionQuery.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 700px)");
    const updateMobileViewport = () => setAgentMobileViewport(mobileQuery.matches);
    updateMobileViewport();
    mobileQuery.addEventListener?.("change", updateMobileViewport);
    return () => mobileQuery.removeEventListener?.("change", updateMobileViewport);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setAgentDocumentHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  // Reset both sessions when the owning account changes.
  useEffect(() => {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setAgentSession((current) => current.status === "idle" ? current : createIdleDiarySession());
    setPlanAgentSession((current) => current.status === "idle" ? current : createIdlePlanSession());
  }, [accountId]);

  const activeAgentItem = agentSession.status === "reviewing"
    ? agentSession.items[agentSession.activeIndex] || null
    : null;
  const displayedAgentItem = activeAgentItem && agentSession.proposedCategoryId
    ? { ...activeAgentItem, kind: "category", categoryId: agentSession.proposedCategoryId }
    : activeAgentItem;
  const activeAgentEntry = activeAgentItem
    ? timelineEntries.find((entry) => entry.id === activeAgentItem.entryId)
    : null;
  const activePlanAgentItem = planAgentSession.status === "reviewing"
    ? planAgentSession.items[planAgentSession.activeIndex] || null
    : null;
  const activePlanAgentPlan = activePlanAgentItem
    ? data.planBlocks.find((plan) => plan.id === activePlanAgentItem.planId && plan.date === selectedDate && plan.source === "local")
    : null;
  const agentVisualStatus = displayedAgentItem?.kind === "category" ? "category" : agentSession.status;
  const agentSummary = agentSession.status === "scanning"
    ? t("agent.scanning")
    : agentSession.status === "reviewing"
      ? t("agent.found", { count: agentSession.items.length })
      : agentSession.status === "complete"
        ? t("agent.completeTitle")
        : "";

  // Keep the active review panel in view as the queue advances or the viewport resizes.
  useEffect(() => {
    if (!activeAgentItem) return undefined;
    let frame = 0;
    let shouldReveal = false;
    const update = (revealPanel) => {
      frame = 0;
      const row = document.querySelector(`[data-entry-id="${CSS.escape(activeAgentItem.entryId)}"]`);
      if (!row) return;
      const box = row.getBoundingClientRect();

      if (!revealPanel) return;
      const panel = row.nextElementSibling?.matches?.(".agent-review-panel") ? row.nextElementSibling : null;
      const dock = document.querySelector(".action-dock");
      if (!panel) return;
      const panelBox = panel.getBoundingClientRect();
      const dockBox = dock?.getBoundingClientRect();
      const safeTop = 104;
      const safeBottom = Math.min(window.innerHeight - 16, (dockBox?.top || window.innerHeight) - 16);
      const availableHeight = safeBottom - safeTop;
      const reviewHeight = panelBox.bottom - box.top;
      const desiredTop = reviewHeight <= availableHeight ? Math.max(safeTop, safeBottom - reviewHeight) : safeTop;
      const scrollDelta = box.top - desiredTop;
      if (Math.abs(scrollDelta) > 1) {
        window.scrollBy({
          top: scrollDelta,
          left: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        });
      }
    };
    const schedule = (revealPanel = false) => {
      shouldReveal ||= revealPanel;
      if (!frame) frame = requestAnimationFrame(() => {
        const reveal = shouldReveal;
        shouldReveal = false;
        update(reveal);
      });
    };
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-entry-id="${CSS.escape(activeAgentItem.entryId)}"]`);
      row?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      schedule(true);
    });
    const revealAfterResize = () => schedule(true);
    window.addEventListener("resize", revealAfterResize);
    window.visualViewport?.addEventListener("resize", revealAfterResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", revealAfterResize);
      window.visualViewport?.removeEventListener("resize", revealAfterResize);
    };
  }, [activeAgentItem?.entryId, viewMode]);

  function stopAgentReview({ keepUndo = true } = {}) {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setAgentSession((current) => ({
      ...createIdleDiarySession(),
      lastCategoryUndo: keepUndo ? current.lastCategoryUndo : null
    }));
  }

  function clearAgentEmptyNote() {
    window.clearTimeout(agentEmptyNoteTimerRef.current);
    agentEmptyNoteTimerRef.current = 0;
    setAgentEmptyNote("");
  }

  function toggleEmptyDateAgentNote() {
    if (agentEmptyNote) {
      clearAgentEmptyNote();
      return;
    }
    const message = selectedDate === localDate()
      ? t("agent.emptyToday")
      : t("agent.emptyDate");
    setAgentEmptyNote(message);
    window.clearTimeout(agentEmptyNoteTimerRef.current);
    agentEmptyNoteTimerRef.current = window.setTimeout(() => {
      agentEmptyNoteTimerRef.current = 0;
      setAgentEmptyNote("");
    }, 4500);
  }

  function activateDiaryAgent() {
    if (!timelineEntries.length) {
      toggleEmptyDateAgentNote();
      return;
    }
    if (agentSession.status === "idle") startAgentReview();
    else stopAgentReview();
  }

  function stopPlanAgentReview() {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setPlanAgentSession(createIdlePlanSession());
  }

  function categoryPath(categoryId) {
    const category = availableCategories.find((item) => item.id === categoryId);
    return category ? `${category.domainName} / ${category.name}` : "";
  }

  async function startAgentReview() {
    if (!timelineEntries.length || dayPlanActive || agentSession.status === "scanning") return;
    const scanStartedAt = performance.now();
    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;
    setAgentSession((current) => ({
      ...current,
      status: "scanning",
      intro: "",
      items: [],
      activeIndex: 0,
      messages: [],
      proposedAppend: "",
      proposedCategoryId: "",
      replyOutcome: "",
      replying: false,
      fallbackReason: ""
    }));
    const result = await agentProvider.analyze({
      date: selectedDate,
      locale,
      entries: timelineEntries,
      categories: availableCategories,
      signal: controller.signal
    });
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    const remainingScanTime = 480 - (performance.now() - scanStartedAt);
    if (remainingScanTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingScanTime));
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    agentAbortRef.current = null;
    const items = reconcileAgentReviewItems(result.items, timelineEntries, availableCategories);
    setAgentSession((current) => ({
      ...current,
      status: items.length ? "reviewing" : "complete",
      intro: result.intro || "",
      items,
      activeIndex: 0,
      messages: [],
      proposedAppend: "",
      proposedCategoryId: "",
      replyOutcome: "",
      replying: false,
      fallbackReason: result.fallbackReason || ""
    }));
  }

  function planAgentInput() {
    return {
      reviewTarget: "plan",
      date: selectedDate,
      locale,
      plans: selectedLocalPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        startMinute: timeToMinutes(plan.startTime),
        endMinute: timeToMinutes(plan.endTime)
      })),
      conflicts: selectedGoogleConflicts.map((plan) => ({
        title: plan.title,
        startMinute: timeToMinutes(plan.startTime),
        endMinute: timeToMinutes(plan.endTime)
      }))
    };
  }

  async function startPlanAgentReview() {
    if (!dayPlanActive || !selectedLocalPlans.length || planAgentSession.status === "scanning") return;
    const scanStartedAt = performance.now();
    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;
    setPlanAgentSession((current) => ({
      ...current,
      status: "scanning",
      intro: "",
      items: [],
      activeIndex: 0,
      messages: [],
      proposal: null,
      replying: false,
      fallbackReason: ""
    }));
    const result = await agentProvider.analyze({ ...planAgentInput(), signal: controller.signal });
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    const remainingScanTime = 480 - (performance.now() - scanStartedAt);
    if (remainingScanTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingScanTime));
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    agentAbortRef.current = null;
    setPlanAgentSession((current) => ({
      ...current,
      status: result.items?.length ? "reviewing" : "complete",
      intro: result.intro || "",
      items: result.items || [],
      activeIndex: 0,
      messages: [],
      proposal: null,
      replying: false,
      fallbackReason: result.fallbackReason || ""
    }));
  }

  function advanceAgentReview() {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setAgentSession((current) => {
      const nextIndex = current.activeIndex + 1;
      return nextIndex >= current.items.length
        ? { ...current, status: "complete", activeIndex: nextIndex, messages: [], proposedAppend: "", proposedCategoryId: "", replyOutcome: "", replying: false }
        : { ...current, activeIndex: nextIndex, messages: [], proposedAppend: "", proposedCategoryId: "", replyOutcome: "", replying: false };
    });
  }

  function advancePlanAgentReview() {
    setPlanAgentSession((current) => {
      const nextIndex = current.activeIndex + 1;
      return nextIndex >= current.items.length
        ? { ...current, status: "complete", activeIndex: nextIndex, messages: [], proposal: null, replying: false }
        : { ...current, activeIndex: nextIndex, messages: [], proposal: null, replying: false };
    });
  }

  async function sendAgentReply(content) {
    if (!activeAgentItem || activeAgentItem.kind !== "question" || !activeAgentEntry || agentSession.replying
      || ["append", "category", "none"].includes(agentSession.replyOutcome)) return;
    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;
    const userMessage = { role: "user", content };
    const nextMessages = [...agentSession.messages, userMessage].slice(-8);
    setAgentSession((current) => ({ ...current, messages: nextMessages, replying: true }));
    const result = await agentProvider.reply({
      date: selectedDate,
      locale,
      entries: [activeAgentEntry],
      categories: availableCategories,
      activeEntryId: activeAgentEntry.id,
      item: activeAgentItem,
      messages: nextMessages,
      signal: controller.signal
    });
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    agentAbortRef.current = null;
    setAgentSession((current) => ({
      ...current,
      messages: [...nextMessages, ...(result.reply ? [{ role: "assistant", content: result.reply }] : [])],
      proposedAppend: result.outcome === "append" ? result.proposedAppend || "" : "",
      proposedCategoryId: result.outcome === "category" ? result.categoryId || "" : "",
      replyOutcome: result.outcome || "none",
      replying: false
    }));
  }

  async function sendPlanAgentReply(content) {
    if (!activePlanAgentItem || !activePlanAgentPlan) return;
    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;
    const userMessage = { role: "user", content };
    const nextMessages = [...planAgentSession.messages, userMessage].slice(-8);
    setPlanAgentSession((current) => ({ ...current, messages: nextMessages, replying: true }));
    const result = await agentProvider.reply({
      ...planAgentInput(),
      plans: planAgentInput().plans.filter((plan) => plan.id === activePlanAgentPlan.id),
      activePlanId: activePlanAgentPlan.id,
      item: activePlanAgentItem,
      messages: nextMessages,
      signal: controller.signal
    });
    if (controller.signal.aborted || agentAbortRef.current !== controller) return;
    agentAbortRef.current = null;
    setPlanAgentSession((current) => ({
      ...current,
      messages: [...nextMessages, ...(result.reply ? [{ role: "assistant", content: result.reply }] : [])],
      proposal: result.proposal || null,
      replying: false
    }));
  }

  function applyPlanAgentProposal(proposal) {
    if (!activePlanAgentPlan) return;
    const merged = mergePlanUpdateProposal(activePlanAgentPlan, proposal, selectedDate);
    if (!merged) {
      setToast(t("agent.planProposalInvalid"));
      return;
    }
    if (!savePlanBlock(merged)) return;
    setToast(t("agent.planUpdated"));
    advancePlanAgentReview();
  }

  function appendAgentDetail(content) {
    if (!activeAgentEntry || !content.trim()) return;
    const saved = commitData((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === activeAgentEntry.id
        ? {
            ...entry,
            content: `${entry.content}${entry.content.endsWith("\n\n") ? "" : entry.content.endsWith("\n") ? "\n" : "\n\n"}${content.trim()}`
          }
        : entry)
    }));
    if (!saved) return;
    setToast(t("agent.appended"));
    advanceAgentReview();
  }

  function addAgentDetailAsRecord(content) {
    if (!content.trim()) return;
    const quickTemplate = data.templates.find((template) => template.id === "quick") || data.templates.find((template) => template.recordType !== "periodic");
    const entry = {
      id: makeId("entry"),
      date: selectedDate,
      time: localTime(),
      content: content.trim(),
      categoryId: activeAgentEntry?.categoryId || quickTemplate?.categoryId || data.categories[0]?.id || "",
      tags: [],
      templateId: quickTemplate?.id || null,
      fieldValues: {},
      attachments: [],
      createdAt: Date.now()
    };
    if (!commitData((state) => ({ ...state, entries: [...state.entries, entry] }))) return;
    setToast(t("agent.createdRecord"));
    advanceAgentReview();
  }

  function applyAgentCategory(categoryId) {
    const resolution = agentCategoryResolution(activeAgentEntry, categoryId, availableCategories);
    if (resolution === "invalid") return;
    if (resolution === "already-current") {
      setToast(t("agent.categoryAlreadyCurrent", { category: categoryPath(categoryId) }));
      advanceAgentReview();
      return;
    }
    const previousCategoryId = activeAgentEntry.categoryId;
    if (!commitData((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === activeAgentEntry.id ? { ...entry, categoryId } : entry)
    }))) return;
    setAgentSession((current) => ({
      ...current,
      lastCategoryUndo: { entryId: activeAgentEntry.id, previousCategoryId, categoryId }
    }));
    setToast(t("agent.categoryApplied", { category: categoryPath(categoryId) }));
    advanceAgentReview();
  }

  function undoAgentCategory() {
    const snapshot = agentSession.lastCategoryUndo;
    if (!snapshot) return;
    if (!commitData((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === snapshot.entryId ? { ...entry, categoryId: snapshot.previousCategoryId } : entry)
    }))) return;
    setAgentSession((current) => ({ ...current, lastCategoryUndo: null }));
    setToast(t("agent.categoryUndone"));
  }

  return {
    agentSession,
    activeAgentItem,
    displayedAgentItem,
    agentVisualStatus,
    agentSummary,
    planAgentSession,
    activePlanAgentItem,
    activePlanAgentPlan,
    agentEmptyNote,
    agentInteractionPaused,
    agentDocumentHidden,
    agentMobileViewport,
    prefersReducedMotion,
    activateDiaryAgent,
    startAgentReview,
    stopAgentReview,
    advanceAgentReview,
    sendAgentReply,
    appendAgentDetail,
    addAgentDetailAsRecord,
    applyAgentCategory,
    undoAgentCategory,
    clearAgentEmptyNote,
    setAgentInteractionPaused,
    categoryPath,
    startPlanAgentReview,
    stopPlanAgentReview,
    advancePlanAgentReview,
    sendPlanAgentReply,
    applyPlanAgentProposal
  };
}
