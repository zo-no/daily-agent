"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { availableClassificationCategories } from "@/modules/organize/classification/model.mjs";
import { createRemoteAgentReviewProvider } from "@/modules/assistant/review/client.mjs";
import { createRemoteContentImprovementProvider } from "@/modules/composer/content-improvement/client.mjs";
import { createRemoteTodayPlanClarificationProvider } from "@/modules/diary/today-plan-clarification/client.mjs";
import {
  composeTemplateContent,
  fixedContentParts,
  hasFixedContent,
  localDate,
  localTime,
  makeId,
  sanitizeTags
} from "@/lib/data.mjs";
import { localizeTemplate } from "@/lib/i18n.mjs";
import { AgentDiaryReview } from "./agent-diary-review";
import { useAuth } from "../../auth-provider";
import { HomeHeader } from "./home-header";
import { DiaryAgentSurface } from "./diary-agent-surface";
import { TodayPlanClarificationOverlay } from "./today-plan-clarification-overlay";
import { DomainDirectoryRail } from "./home-domain-rail";
import { useI18n } from "../../i18n";
import { useGoogleCalendar } from "../../google-calendar-provider";
import { RecordComposer } from "../../record-composer";
import { Icon } from "../../ui";
import { useDraftAttachments } from "./use-draft-attachments";
import { useHomeRecordModel } from "./use-home-record-model";
import { useHomeDateSwipe } from "./use-home-date-swipe";
import { useHomeNavigation } from "./use-home-navigation";
import { createHomeRecordActions } from "./home-record-actions";
import { HomeToolWorkspace } from "./home-tool-workspace";
import { HomeActionDock } from "./home-action-dock";
import { HomeRecordWorkspace } from "./home-record-workspace";
import { useLogNoteData, useToast } from "../../use-log-note-data";
import { useHomeAgent } from "./use-home-agent";
import { useTodayPlanClarification } from "./use-today-plan-clarification";

/** Orchestrates the quick-record loop and delegates derived views and attachment drafts. */
export function HomePage() {
  const { locale, t } = useI18n();
  const { identity, internal: internalAuth, session } = useAuth();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [dayPlanActive, setDayPlanActive] = useState(false);
  const [draft, setDraft] = useState(null);
  const [quickEditDraft, setQuickEditDraft] = useState(null);
  const [draftPresentation, setDraftPresentation] = useState("dialog");
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [planCreateRequest, setPlanCreateRequest] = useState(null);
  const {
    calendarOpen,
    calendarOpenedDateRef,
    calendarReturnScrollRef,
    monthTriggerRef,
    searchOpen,
    searchTriggerRef,
    settingsOpen,
    settingsTriggerRef,
    mobileDirectoryEnabled,
    setCalendarOpen,
    setSearchOpen,
    setSettingsOpen,
    scheduleCalendarScroll,
    scheduleToolScrollRestore,
    toolReturnScrollRef
  } = useHomeNavigation();
  const railSectionRefs = useRef(new Map());
  const deepLinkHandledRef = useRef(false);
  const keyboardStateRef = useRef(null);
  const draftBaselineRef = useRef(null);
  const draftReturnTargetRef = useRef("content");
  const templateDraftsRef = useRef(new Map());
  const recordEditorOwnerRef = useRef(identity?.id || session?.user?.id || "");
  const planCreateRequestIdRef = useRef(0);

  const {
    categoryGroups,
    categoryMap,
    domainMap,
    localizedTemplates,
    periodicDomainGroups,
    periodicEntryMap,
    periodicItems,
    templateMap,
    timelineEntries
  } = useHomeRecordModel(data, selectedDate, locale);
  const quickEditableEntryIds = useMemo(() => new Set(data.entries
    .filter((entry) => {
      const template = templateMap.get(entry.templateId);
      return !template || template.inputMode === "free";
    })
    .map((entry) => entry.id)), [data.entries, templateMap]);
  const availableCategories = useMemo(() => availableClassificationCategories(data), [data]);
  const agentProvider = useMemo(() => createRemoteAgentReviewProvider({
    getAccessToken: () => session?.access_token || ""
  }), [session?.access_token]);
  const contentImprovementProvider = useMemo(() => createRemoteContentImprovementProvider({
    getAccessToken: () => session?.access_token || (
      process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1"
      && typeof window !== "undefined"
      && ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "e2e-content-improvement-token"
        : ""
    )
  }), [session?.access_token]);
  const todayPlanClarificationProvider = useMemo(() => createRemoteTodayPlanClarificationProvider({
    getAccessToken: () => session?.access_token || (
      process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1"
      && typeof window !== "undefined"
      && ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "e2e-today-clarification-token"
        : ""
    )
  }), [session?.access_token]);
  const railSections = useMemo(() => {
    if (calendarOpen || dayPlanActive || viewMode !== "grouped") return [];
    return categoryGroups.map((domain) => ({
      id: `grouped:domain:${domain.id}`,
      domainId: domain.id,
      name: domain.name,
      targetId: `record-domain-${domain.id}`,
      kind: "domain"
    }));
  }, [calendarOpen, categoryGroups, dayPlanActive, viewMode]);
  const mobileCategoryRailVisible = mobileDirectoryEnabled
    && viewMode === "grouped"
    && !dayPlanActive
    && !calendarOpen
    && !searchOpen
    && !settingsOpen;
  const {
    addAttachment,
    attachmentBusy,
    deleteDraftAttachments,
    discardAttachmentChanges,
    finalizeAttachmentChanges,
    removeAttachment
  } = useDraftAttachments({ draft, setDraft, setToast, t });
  const recordEditorOwner = identity?.id || session?.user?.id || "";
  useEffect(() => {
    if (recordEditorOwnerRef.current === recordEditorOwner) return;
    recordEditorOwnerRef.current = recordEditorOwner;
    setDraftPresentation("dialog");
    setQuickEditDraft(null);
    if (!draft) return;
    void discardAttachmentChanges();
    templateDraftsRef.current.clear();
    setDraft(null);
  }, [discardAttachmentChanges, draft, recordEditorOwner]);
  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];
  const visiblePlanBlocks = useMemo(() => [...data.planBlocks, ...googleCalendar.timedEvents], [data.planBlocks, googleCalendar.timedEvents]);
  const selectedLocalPlans = useMemo(() => data.planBlocks.filter((plan) => plan.date === selectedDate && plan.source === "local"), [data.planBlocks, selectedDate]);
  const selectedGoogleConflicts = useMemo(() => googleCalendar.timedEvents.filter((plan) => plan.date === selectedDate), [googleCalendar.timedEvents, selectedDate]);
  const {
    deletePlanBlock,
    exportToday,
    saveFixedInline,
    saveInlineQuickRecord,
    savePlanBlock
  } = createHomeRecordActions({
    commitData,
    data,
    locale,
    periodicEntryMap,
    selectedDate,
    setToast,
    t,
    templateMap
  });

  const {
    agentSession,
    activeAgentItem,
    displayedAgentItem,
    planAgentSession,
    activePlanAgentItem,
    activePlanAgentPlan,
    agentEmptyNote,
    agentInteractionPaused,
    agentDocumentHidden,
    agentMobileViewport,
    prefersReducedMotion,
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
  } = useHomeAgent({
    accountId: session?.user?.id,
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
  });
  const agentDetailItem = activeAgentItem?.kind === "question" && activeAgentItem.questionGoal === "enrich-detail"
    ? activeAgentItem
    : null;
  const todayClarification = useTodayPlanClarification({
    data,
    entries: timelineEntries,
    selectedDate,
    locale,
    provider: todayPlanClarificationProvider,
    commitData,
    setToast,
    t
  });

  keyboardStateRef.current = {
    agentEmptyNote,
    clearAgentEmptyNote,
    closeSearch,
    closeSettings,
    draft,
    openNewEntry,
    openSearch,
    quickEditDraft,
    searchOpen,
    settingsOpen,
    todayClarification
  };

  useEffect(() => {
    const handler = (event) => {
      const current = keyboardStateRef.current;
      if (!current) return;
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "Escape" && current.todayClarification.session.error) {
        event.preventDefault();
        current.todayClarification.reset();
      } else if (event.key === "Escape" && current.agentEmptyNote) {
        event.preventDefault();
        current.clearAgentEmptyNote();
      } else if (event.key === "Escape" && !current.draft && !current.quickEditDraft && (current.searchOpen || current.settingsOpen)) {
        event.preventDefault();
        if (current.searchOpen) current.closeSearch();
        else current.closeSettings();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (current.draft || current.quickEditDraft || current.searchOpen || current.settingsOpen) return;
        event.preventDefault();
        current.openSearch();
      } else if (!current.draft && !current.quickEditDraft && !current.searchOpen && !current.settingsOpen && !typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        current.openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    clearAgentEmptyNote();
    setAgentInteractionPaused(false);
  }, [dayPlanActive, draft, quickEditDraft, searchOpen, selectedDate, settingsOpen]);

  const currentTemplateDisplay = localizeTemplate(currentTemplate, locale);
  const isPeriodicValueDraft = Boolean(draft && currentTemplate?.recordType === "periodic" && currentTemplate?.inputMode === "value");
  const usesStructuredTemplate = Boolean(
    draft && !isPeriodicValueDraft && currentTemplate?.inputMode === "structured" && currentTemplate?.fields?.length && (
      !draft.id || (
        Object.keys(draft.fieldValues || {}).length > 0 &&
        Object.keys(draft.fieldValues || {}).every((fieldId) => currentTemplate.fields.some((field) => field.id === fieldId))
      )
    )
  );
  const { motion: dateSwipeMotion, swipeProps, swipeStyle } = useHomeDateSwipe({
    calendarOpen,
    disabled: Boolean(draft || quickEditDraft || searchOpen || settingsOpen || agentSession.status === "scanning" || agentSession.status === "reviewing"),
    locale,
    onDateChange: changeSelectedDate,
    selectedDate
  });

  function setDraftWithBaseline(nextDraft) {
    draftBaselineRef.current = nextDraft ? JSON.stringify(nextDraft) : null;
    setDraft(nextDraft);
  }

  function editableRecordDraft(entry) {
    const fixed = fixedContentParts(entry.content);
    return { ...entry, fixedLabel: fixed.label, fixedValue: fixed.value, tags: [...(entry.tags || [])] };
  }

  function restoreDraftTriggerFocus(entryId, target = draftReturnTargetRef.current) {
    if (!entryId) return;
    const action = target === "time" ? "time" : "content";
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-${action}-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
    });
  }

  async function closeDraft({ confirmChanges = true, restoreFocus = true } = {}) {
    if (!draft || attachmentBusy) return false;
    const entryId = draft.id;
    const presentation = draftPresentation;
    const returnTarget = draftReturnTargetRef.current;
    const changed = JSON.stringify(draft) !== draftBaselineRef.current;
    const drafts = [...templateDraftsRef.current.values(), draft];
    const hasNewContent = drafts.some((item) => Boolean(
      item?.content?.trim() || item?.fixedValue?.trim() ||
      Object.values(item?.fieldValues || {}).some((value) => String(value).trim()) || item?.attachments?.length
    ));
    if (confirmChanges && (draft.id ? changed : hasNewContent) && !window.confirm(t("confirm.discardDraft"))) return false;
    await discardAttachmentChanges();
    templateDraftsRef.current.clear();
    setDraft(null);
    setDraftPresentation("dialog");
    if (restoreFocus && presentation === "dialog") restoreDraftTriggerFocus(entryId, returnTarget);
    return true;
  }

  async function closeAgentLinkedDraft() {
    if (!draft?.id || !await closeDraft({ confirmChanges: false, restoreFocus: false })) return;
    advanceAgentReview();
  }

  useEffect(() => {
    if (!agentDetailItem) return;
    const entry = timelineEntries.find((item) => item.id === agentDetailItem.entryId);
    if (!entry || (draftPresentation === "agent-inline" && draft?.id === entry.id)) return;
    setQuickEditDraft(null);
    setDraftPresentation("agent-inline");
    draftReturnTargetRef.current = "content";
    setActiveTemplate(entry.templateId || "");
    templateDraftsRef.current.clear();
    setDraftWithBaseline(editableRecordDraft(entry));
  }, [agentDetailItem?.entryId, agentDetailItem?.id, draft?.id, draftPresentation, timelineEntries]);

  useEffect(() => {
    if (agentDetailItem || draftPresentation !== "agent-inline" || !draft?.id) return;
    void closeDraft({ confirmChanges: false, restoreFocus: false });
  }, [agentDetailItem?.id, attachmentBusy, draft?.id, draftPresentation]);

  useEffect(() => {
    if (!hydrated || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const entry = data.entries.find((item) => item.id === params.get("entry"));
    const templateId = params.get("newTemplate");
    const requestedDate = params.get("date") || localDate();
    if (entry) {
      setSelectedDate(entry.date);
      openEntry(entry);
    } else if (templateId && templateMap.get(templateId)?.recordType === "periodic") {
      setSelectedDate(requestedDate);
      openNewEntry(templateId, "", requestedDate);
    }
    if (entry || templateId) window.history.replaceState({}, "", "/");
  }, [hydrated, data.entries, templateMap]);

  async function openNewEntry(templateId = "quick", categoryIdOverride = "", dateOverride = "") {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    setQuickEditDraft(null);
    setDraftPresentation("dialog");
    draftReturnTargetRef.current = "content";
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    const content = template?.inputMode === "value" ? `${template.name}=` : (template?.skeleton || "");
    const fixed = fixedContentParts(content);
    setActiveTemplate(template?.id || "");
    const nextDraft = {
      id: null,
      date: dateOverride || selectedDate,
      time: localTime(),
      content,
      fixedLabel: template?.inputMode === "value" ? template.name : fixed.label,
      fixedValue: fixed.value,
      categoryId: categoryIdOverride || template?.categoryId || data.categories[0]?.id || "",
      tags: template?.tags || [],
      templateId: template?.id || null,
      fieldValues: {},
      attachments: [],
      createdAt: Date.now()
    };
    templateDraftsRef.current = new Map([[template?.id || "", nextDraft]]);
    setDraftWithBaseline(nextDraft);
  }

  async function openEntry(entry, { returnTarget = "content" } = {}) {
    if (draft && !await closeDraft({ confirmChanges: false, restoreFocus: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    setQuickEditDraft(null);
    setDraftPresentation("dialog");
    draftReturnTargetRef.current = returnTarget;
    setActiveTemplate(entry.templateId || "");
    templateDraftsRef.current.clear();
    setDraftWithBaseline(editableRecordDraft(entry));
    setSearchOpen(false);
  }

  function openEntryTime(entry) {
    return openEntry(entry, { returnTarget: "time" });
  }

  async function openQuickEntryEdit(entry, sourceElement = null) {
    if (draft && !await closeDraft({ confirmChanges: false, restoreFocus: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    setDraftPresentation("dialog");
    setQuickEditDraft({
      id: entry.id,
      content: entry.content,
      initialControlHeight: sourceElement?.getBoundingClientRect().height || 44
    });
  }

  function changeQuickEntryEdit(entryId, content) {
    setQuickEditDraft((current) => current?.id === entryId ? { ...current, content } : current);
  }

  function cancelQuickEntryEdit(entryId) {
    setQuickEditDraft((current) => current?.id === entryId ? null : current);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-content-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
    });
  }

  function saveQuickEntryEdit(entryId, rawContent) {
    const current = data.entries.find((entry) => entry.id === entryId);
    if (!current) {
      setQuickEditDraft(null);
      return true;
    }
    const content = String(rawContent || "").trim();
    if (!content) {
      setToast(t("toast.writeSomething"));
      return false;
    }
    if (content !== current.content) {
      const saved = commitData((state) => ({
        ...state,
        entries: state.entries.map((entry) => entry.id === entryId ? { ...entry, content } : entry)
      }));
      if (!saved) return false;
      setToast(t("toast.recordUpdated"));
    }
    setQuickEditDraft(null);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-content-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
    });
    return true;
  }

  /** Switches the draft template without hiding or silently discarding an attached image. */
  function chooseTemplate(templateId) {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    if (draft.attachments?.length && template?.inputMode !== "free") {
      setToast(t("toast.removeAttachmentBeforeTemplate"));
      return;
    }
    const previous = currentTemplate;
    templateDraftsRef.current.set(previous?.id || activeTemplate, draft);
    const cached = templateDraftsRef.current.get(template.id);
    setActiveTemplate(template.id);
    setDraft((value) => {
      if (cached) return { ...cached, date: value.date, time: value.time };
      const canReplace = !value.content.trim() || value.content === previous?.skeleton;
      const content = canReplace
        ? (template.inputMode === "value" ? `${template.name}=` : (template.fields.length ? "" : template.skeleton))
        : value.content;
      const fixed = fixedContentParts(content);
      const next = {
        ...value,
        content,
        fixedLabel: template.inputMode === "value" ? template.name : fixed.label,
        fixedValue: fixed.value,
        categoryId: template.categoryId,
        tags: [...template.tags],
        templateId: template.id,
        fieldValues: {}
      };
      templateDraftsRef.current.set(template.id, next);
      return next;
    });
  }

  /** Persists the active draft before committing its staged attachment cleanup. */
  async function saveEntry(event) {
    event.preventDefault();
    if (attachmentBusy) return false;
    const presentation = draftPresentation;
    const returnTarget = draftReturnTargetRef.current;
    if (usesStructuredTemplate) {
      const missing = currentTemplate.fields.find((field) => field.required && !String(draft.fieldValues[field.id] ?? "").trim());
      const displayField = currentTemplateDisplay.fields.find((field) => field.id === missing?.id);
      if (missing) {
        setToast(t("toast.required", { field: displayField?.label || missing.label }));
        return missing.id;
      }
    }
    if (isPeriodicValueDraft) {
      const label = String(currentTemplate?.name || draft.fixedLabel || "").trim();
      const value = String(draft.fixedValue || "").trim();
      if (!label) {
        setToast(t("toast.fixedNameRequired"));
        return false;
      }
      if (!hasFixedContent(`${label}=${value}`)) {
        if (draft.id) {
          const deleted = commitData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
          if (!deleted) return false;
          setDraft(null);
          setToast(t("toast.emptyRecordDeleted"));
        } else {
          setToast(t("toast.fixedValueRequired"));
        }
        return false;
      }
    }
    const content = (isPeriodicValueDraft
      ? `${String(currentTemplate?.name || draft.fixedLabel).trim()}=${String(draft.fixedValue).trim()}`
      : usesStructuredTemplate
        ? composeTemplateContent(currentTemplateDisplay, draft.fieldValues)
        : draft.content).trim();
    if (!content && !draft.attachments?.length) {
      setToast(t("toast.writeSomething"));
      return false;
    }
    const now = Date.now();
    const entry = {
      id: draft.id || makeId("entry"),
      date: draft.date,
      time: draft.time,
      content,
      categoryId: draft.categoryId,
      tags: sanitizeTags(draft.tags),
      templateId: draft.templateId,
      fieldValues: draft.fieldValues,
      attachments: draft.attachments || [],
      createdAt: draft.createdAt || now
    };
    const saved = commitData((state) => ({
      ...state,
      entries: draft.id ? state.entries.map((item) => item.id === draft.id ? entry : item) : [...state.entries, entry]
    }));
    if (!saved) return false;
    const editedEntryId = draft.id;
    const attachmentsCleaned = await finalizeAttachmentChanges(entry.attachments);
    setSelectedDate(entry.date);
    templateDraftsRef.current.clear();
    setDraft(null);
    setDraftPresentation("dialog");
    setToast(attachmentsCleaned ? (draft.id ? t("toast.recordUpdated") : t("toast.recordAdded")) : t("toast.attachmentCleanupPending"));
    if (editedEntryId && presentation === "dialog") restoreDraftTriggerFocus(editedEntryId, returnTarget);
    return true;
  }

  async function saveAgentLinkedEntry(event) {
    const saved = await saveEntry(event);
    if (saved === true) advanceAgentReview();
    return saved;
  }

  async function deleteEntry() {
    if (attachmentBusy || !draft.id || !window.confirm(t("confirm.deleteRecord"))) return false;
    if (!commitData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }))) return false;
    const attachmentsCleaned = await deleteDraftAttachments(draft.attachments || []);
    templateDraftsRef.current.clear();
    setDraft(null);
    setDraftPresentation("dialog");
    setToast(attachmentsCleaned ? t("toast.recordDeleted") : t("toast.attachmentCleanupPending"));
    return true;
  }

  async function deleteAgentLinkedEntry() {
    if (await deleteEntry()) advanceAgentReview();
  }

  async function changeViewMode(nextMode) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (nextMode !== "grouped" && agentSession.status !== "idle") stopAgentReview();
    setViewMode(nextMode);
  }

  async function changeDayPlanMode(active) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (active && agentSession.status !== "idle") stopAgentReview();
    if (!active && planAgentSession.status !== "idle") stopPlanAgentReview();
    setPlanCreateRequest(null);
    setDayPlanActive(active);
  }

  function openPrimaryCreate() {
    if (!dayPlanActive) {
      openNewEntry();
      return;
    }
    planCreateRequestIdRef.current += 1;
    setPlanCreateRequest({ id: planCreateRequestIdRef.current });
  }

  function consumePlanCreateRequest(requestId) {
    setPlanCreateRequest((current) => current?.id === requestId ? null : current);
  }

  async function changeSelectedDate(nextDate) {
    if (nextDate !== selectedDate && draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (nextDate !== selectedDate && agentSession.status !== "idle") stopAgentReview();
    if (nextDate !== selectedDate && planAgentSession.status !== "idle") stopPlanAgentReview();
    setSelectedDate(nextDate);
    if (calendarOpen) scheduleCalendarScroll(0, { smooth: false });
  }

  async function returnToToday() {
    const today = localDate();
    if (today === selectedDate) return;
    if (calendarOpen) {
      calendarReturnScrollRef.current = null;
      calendarOpenedDateRef.current = null;
      setCalendarOpen(false);
    }
    await changeSelectedDate(today);
    requestAnimationFrame(() => monthTriggerRef.current?.focus({ preventScroll: true }));
  }

  async function setCalendarVisibility(nextOpen) {
    const shouldOpen = typeof nextOpen === "function" ? nextOpen(calendarOpen) : Boolean(nextOpen);
    if (shouldOpen === calendarOpen) return;

    if (shouldOpen) {
      if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
      if (agentSession.status !== "idle") stopAgentReview();
      if (planAgentSession.status !== "idle") stopPlanAgentReview();
      setSearchOpen(false);
      setSettingsOpen(false);
      calendarReturnScrollRef.current = window.scrollY;
      calendarOpenedDateRef.current = selectedDate;
      setCalendarOpen(true);
      scheduleCalendarScroll(0);
      return;
    }

    const returnScroll = calendarOpenedDateRef.current === selectedDate
      ? calendarReturnScrollRef.current
      : null;
    calendarReturnScrollRef.current = null;
    calendarOpenedDateRef.current = null;
    setCalendarOpen(false);
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll);
  }

  async function openSearch() {
    if (searchOpen) {
      closeSearch();
      return;
    }
    if (calendarOpen) await setCalendarVisibility(false);
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    if (planAgentSession.status !== "idle") stopPlanAgentReview();
    if (!settingsOpen) toolReturnScrollRef.current = window.scrollY;
    setSettingsOpen(false);
    setSearchOpen(true);
  }

  async function openSettings() {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    if (calendarOpen) await setCalendarVisibility(false);
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    if (planAgentSession.status !== "idle") stopPlanAgentReview();
    if (!searchOpen) toolReturnScrollRef.current = window.scrollY;
    setSearchOpen(false);
    setSettingsOpen(true);
  }

  function closeSearch() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    setSearchOpen(false);
    if (Number.isFinite(returnScroll)) scheduleToolScrollRestore(returnScroll, {
      waitForDirectory: mobileDirectoryEnabled && viewMode === "grouped" && railSections.length > 0
    });
    requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true }));
  }

  function closeSettings() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    setSettingsOpen(false);
    if (Number.isFinite(returnScroll)) window.scrollTo({ top: returnScroll, left: 0, behavior: "auto" });
    if (Number.isFinite(returnScroll)) scheduleToolScrollRestore(returnScroll, {
      waitForDirectory: mobileDirectoryEnabled && viewMode === "grouped" && railSections.length > 0
    });
    requestAnimationFrame(() => settingsTriggerRef.current?.focus({ preventScroll: true }));
  }

  function registerRailSection(sectionId, node) {
    if (node) railSectionRefs.current.set(sectionId, node);
    else railSectionRefs.current.delete(sectionId);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("home.loading")}</p></main>;
  }

  const agentReviewPanel = displayedAgentItem && !agentDetailItem ? (
    <AgentDiaryReview
      busy={Boolean(agentSession.replying)}
      categoryPath={categoryPath(displayedAgentItem.categoryId)}
      item={displayedAgentItem}
      lastCategoryUndo={agentSession.lastCategoryUndo}
      messages={agentSession.messages}
      onAppend={appendAgentDetail}
      onApplyCategory={applyAgentCategory}
      onKeep={advanceAgentReview}
      onNewRecord={addAgentDetailAsRecord}
      onSend={sendAgentReply}
      onStop={() => stopAgentReview()}
      onUndoCategory={undoAgentCategory}
      proposedAppend={agentSession.proposedAppend}
      replyOutcome={agentSession.replyOutcome}
      t={t}
      total={agentSession.items.length}
      index={agentSession.activeIndex}
    />
  ) : null;
  const planAgentReviewPanel = activePlanAgentItem ? (
    <AgentDiaryReview
      busy={Boolean(planAgentSession.replying)}
      currentPlan={activePlanAgentPlan}
      index={planAgentSession.activeIndex}
      item={activePlanAgentItem}
      messages={planAgentSession.messages}
      onApplyPlan={applyPlanAgentProposal}
      onKeepPlan={advancePlanAgentReview}
      onSend={sendPlanAgentReply}
      onStop={stopPlanAgentReview}
      planMode
      proposal={planAgentSession.proposal || activePlanAgentItem.proposal}
      t={t}
      total={planAgentSession.items.length}
    />
  ) : null;

  const draftEditsVisibleRow = Boolean(
    draftPresentation === "agent-inline"
    && draft?.id
    && agentDetailItem?.entryId === draft.id
    && timelineEntries.some((entry) => entry.id === draft.id)
  );
  const inlineRecordEditor = draftEditsVisibleRow ? (
    <section
      className="agent-linked-editor"
      data-agent-linked-editor
      data-entry-id={draft.id}
      aria-label={t("agent.detailEditorLabel")}
    >
      <header className="agent-linked-editor-context">
        <div className="agent-linked-editor-meta">
          <span className="agent-linked-editor-role" aria-hidden="true">Agent</span>
          <span className="agent-linked-editor-progress" aria-label={t("agent.reviewItem", { current: agentSession.activeIndex + 1, total: agentSession.items.length })}>
            {agentSession.activeIndex + 1} / {agentSession.items.length}
          </span>
        </div>
        <p data-agent-linked-prompt>{agentDetailItem.prompt}</p>
        {agentSession.lastCategoryUndo && (
          <button className="agent-linked-editor-undo" type="button" onClick={undoAgentCategory}>
            {t("agent.undoCategory")}
          </button>
        )}
      </header>
      <RecordComposer
        activeTemplate={activeTemplate}
        categories={data.categories}
        categoryMap={categoryMap}
        currentTemplateDisplay={currentTemplateDisplay}
        draft={draft}
        isPeriodicValueDraft={isPeriodicValueDraft}
        locale={locale}
        localizedTemplates={localizedTemplates}
        onChooseTemplate={chooseTemplate}
        onClose={closeAgentLinkedDraft}
        onDelete={deleteAgentLinkedEntry}
        onAddAttachment={addAttachment}
        onRemoveAttachment={removeAttachment}
        onDraftChange={setDraft}
        onSave={saveAgentLinkedEntry}
        attachmentBusy={attachmentBusy}
        accountGeneration={identity?.id || session?.user?.id || ""}
        contentImprovementProvider={contentImprovementProvider}
        inline
        t={t}
        usesStructuredTemplate={usesStructuredTemplate}
      />
    </section>
  ) : null;
  const hasBlockingDraft = Boolean(draft && draftPresentation !== "agent-inline");
  const showDiaryAgent = viewMode === "grouped" && !dayPlanActive && !searchOpen && !settingsOpen && !hasBlockingDraft && !quickEditDraft;
  const diaryAgentMotionMode = !agentMobileViewport || calendarOpen || agentDocumentHidden || agentEmptyNote || agentInteractionPaused || prefersReducedMotion
    ? "still"
    : "animated";
  const diaryClarificationVisualStatus = todayClarification.session.status === "analyzing"
    ? "scanning"
    : todayClarification.session.status === "ready"
      ? "complete"
      : todayClarification.session.status === "disclosure" || todayClarification.session.overlay
        ? "reviewing"
        : "idle";
  const diaryAgentLabel = t("agent.clarificationWake");
  const diaryAgentMount = showDiaryAgent ? (
    <DiaryAgentSurface
      calendarOpen={calendarOpen}
      documentHidden={agentDocumentHidden}
      emptyNote={todayClarification.session.error ? t(`agent.clarificationError.${todayClarification.session.error}`) : ""}
      hasEntries={todayClarification.isToday && Boolean(todayClarification.snapshot?.input.plans.length)}
      label={diaryAgentLabel}
      motionMode={diaryAgentMotionMode}
      onActivate={(event) => todayClarification.activate(event.currentTarget)}
      onInteractionPausedChange={setAgentInteractionPaused}
      selectedDate={selectedDate}
      sessionStatus={todayClarification.session.status}
      summary={todayClarification.session.status === "ready" ? t("agent.clarificationFound", { count: todayClarification.session.targets.length }) : ""}
      visualStatus={diaryClarificationVisualStatus}
    />
  ) : null;

  return (
    <main
      className={`app-shell${dayPlanActive ? " is-day-plan" : ""}${viewMode === "grouped" && !dayPlanActive ? " is-category-view" : ""}${mobileCategoryRailVisible ? " has-category-rail" : ""}${activeAgentItem ? " has-agent-review" : ""}`}
      data-category-rail-visible={mobileCategoryRailVisible ? "true" : "false"}
      data-page-navigation-motion={dateSwipeMotion.direction}
      data-page-swipe-phase={dateSwipeMotion.phase}
      style={swipeStyle}
      {...swipeProps}
    >
      {mobileCategoryRailVisible && <img className="home-edge-rail-brush" src="/ui/diary/rail-brush-handdrawn.png" alt="" aria-hidden="true" />}

      <HomeHeader
        calendarOpen={calendarOpen}
        dayPlanActive={dayPlanActive}
        locale={locale}
        selectedDate={selectedDate}
        searchOpen={searchOpen}
        settingsOpen={settingsOpen}
        searchTriggerRef={searchTriggerRef}
        settingsTriggerRef={settingsTriggerRef}
        triggerRef={monthTriggerRef}
        viewMode={viewMode}
        onCalendarToggle={() => setCalendarVisibility(!calendarOpen)}
        onReturnToToday={selectedDate === localDate() ? null : returnToToday}
        onSearch={openSearch}
        onSettings={openSettings}
        onDayPlanChange={changeDayPlanMode}
        onViewModeChange={changeViewMode}
        t={t}
      />

      {diaryAgentMount}

      {mobileCategoryRailVisible && railSections.length > 0 && (
        <DomainDirectoryRail
          sections={railSections}
          sectionRefs={railSectionRefs}
          selectedDate={selectedDate}
          t={t}
        />
      )}

      <div className={`home-workspace ${timelineEntries.length ? "has-timeline-records" : "is-timeline-empty"}`}>
        <HomeRecordWorkspace
          activeAgentItem={activeAgentItem}
          activeDraftId={draftEditsVisibleRow ? draft.id : ""}
          clarificationEntryIds={todayClarification.entryMarkerIds}
          clarificationSourceIdForEntry={todayClarification.sourceIdForEntry}
          clarificationPlanIds={todayClarification.planMarkerIds}
          clarificationSourceIdForPlan={todayClarification.sourceIdForPlan}
          quickEditDraft={quickEditDraft}
          quickEditableEntryIds={quickEditableEntryIds}
          agentReviewPanel={agentReviewPanel}
          activePlanAgentItem={activePlanAgentItem}
          agentSession={agentSession}
          planAgentReviewPanel={planAgentReviewPanel}
          planAgentReviewKey={`${activePlanAgentItem?.id || ""}:${planAgentSession.messages.length}:${planAgentSession.proposal ? "proposal" : "plain"}`}
          planAgentStatus={planAgentSession.status}
          planAgentIntro={planAgentSession.intro}
          calendarTriggerRef={monthTriggerRef}
          calendarOpen={calendarOpen}
          categoryGroups={categoryGroups}
          categoryMap={categoryMap}
          dayPlanActive={dayPlanActive}
          domainMap={domainMap}
          entries={data.entries}
          fixedItems={periodicItems}
          fixedGroups={periodicDomainGroups}
          googleCalendarSupported={!internalAuth}
          inlineEditor={inlineRecordEditor}
          inlineQuickRecordKey={`${recordEditorOwner}:${selectedDate}:${viewMode}`}
          inlineQuickRecordVisible={viewMode === "timeline" && !dayPlanActive && !calendarOpen && !draft && !quickEditDraft && timelineEntries.length > 0 && agentSession.status === "idle"}
          locale={locale}
          onCalendarOpenChange={setCalendarVisibility}
          onDateChange={changeSelectedDate}
          onDeletePlan={deletePlanBlock}
          onOpenEntry={openEntry}
          onOpenQuickEdit={openQuickEntryEdit}
          onOpenEntryTime={openEntryTime}
          onSaveQuickEdit={saveQuickEntryEdit}
          onCancelQuickEdit={cancelQuickEntryEdit}
          onOpenClarification={todayClarification.openTarget}
          onChangeQuickEdit={changeQuickEntryEdit}
          onSaveFixed={saveFixedInline}
          onSaveQuickRecord={saveInlineQuickRecord}
          onSavePlan={savePlanBlock}
          onPlanAgentStart={startPlanAgentReview}
          onPlanAgentStop={stopPlanAgentReview}
          onPlanEditorOpen={() => planAgentSession.status !== "idle" && stopPlanAgentReview()}
          onPlanCreateRequestHandled={consumePlanCreateRequest}
          planCreateRequest={planCreateRequest}
          registerRailSection={registerRailSection}
          planBlocks={visiblePlanBlocks}
          allDayPlans={googleCalendar.allDayEvents}
          selectedDate={selectedDate}
          showDomainQuickRecords={!dayPlanActive && !calendarOpen && !draft && !quickEditDraft && agentSession.status === "idle"}
          t={t}
          timelineEntries={timelineEntries}
          toolWorkspaceOpen={searchOpen || settingsOpen}
          onAgentRestart={startAgentReview}
          onAgentStop={() => stopAgentReview()}
          onUndoCategory={undoAgentCategory}
          viewMode={viewMode}
        />
        <HomeToolWorkspace
          categoryMap={categoryMap}
          entries={data.entries}
          locale={locale}
          onCloseSearch={closeSearch}
          onCloseSettings={closeSettings}
          onOpenEntry={openEntry}
          searchOpen={searchOpen}
          setSelectedDate={setSelectedDate}
          settingsOpen={settingsOpen}
          t={t}
          toolReturnScrollRef={toolReturnScrollRef}
        />
      </div>

      <TodayPlanClarificationOverlay
        session={todayClarification.session}
        onAnswer={(value) => value === "__begin__" ? todayClarification.beginAnalysis() : todayClarification.answer(value)}
        onApply={todayClarification.applyCandidate}
        onClose={todayClarification.closeOverlay}
        t={t}
      />

      <HomeActionDock
        dayPlanActive={dayPlanActive}
        exportToday={exportToday}
        locale={locale}
        openPrimaryCreate={openPrimaryCreate}
        selectedDate={selectedDate}
        t={t}
      />

      {dateSwipeMotion.phase !== "idle" && (
        <>
          <div
            className="home-swipe-shadow"
            data-side={dateSwipeMotion.direction === "previous" ? "left" : "right"}
            aria-hidden="true"
          />
          <div
            className="home-swipe-date-card"
            data-direction={dateSwipeMotion.direction}
            aria-hidden="true"
          >
            <span>{dateSwipeMotion.targetLabel}</span>
          </div>
        </>
      )}

      {draft && draftPresentation === "dialog" && (
        <RecordComposer
          activeTemplate={activeTemplate}
          categories={data.categories}
          categoryMap={categoryMap}
          currentTemplateDisplay={currentTemplateDisplay}
          draft={draft}
          isPeriodicValueDraft={isPeriodicValueDraft}
          locale={locale}
          localizedTemplates={localizedTemplates}
          onChooseTemplate={chooseTemplate}
          onClose={closeDraft}
          onDelete={deleteEntry}
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          onDraftChange={setDraft}
          onSave={saveEntry}
          attachmentBusy={attachmentBusy}
          accountGeneration={identity?.id || session?.user?.id || ""}
          contentImprovementProvider={contentImprovementProvider}
          t={t}
          usesStructuredTemplate={usesStructuredTemplate}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
