"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { availableClassificationCategories } from "@/lib/classification-model.mjs";
import { createRemoteAgentReviewProvider } from "@/lib/agent-review-provider.mjs";
import {
  composeTemplateContent,
  fixedContentParts,
  hasFixedContent,
  localDate,
  localTime,
  makeId,
  markdownForDate,
  sanitizeTags
} from "@/lib/data.mjs";
import { fixedRecordEditorMode, fixedRecordSaveResult } from "@/lib/fixed-record-model.mjs";
import { localizeTemplate } from "@/lib/i18n.mjs";
import {
  agentCategoryResolution,
  mergePlanUpdateProposal,
  reconcileAgentReviewItems
} from "@/lib/agent-review-model.mjs";
import { normalizePlanBlock, timeToMinutes } from "@/lib/plan-model.mjs";
import { compactDateLabel } from "./date-label";
import { AgentAppearance } from "./agent-appearance";
import { AgentDiaryReview, AgentReviewComplete } from "./agent-diary-review";
import { useAuth } from "./auth-provider";
import { downloadFile } from "./download-file";
import { FixedRecords } from "./fixed-records";
import { HomeHeader } from "./home-header";
import { DomainDirectoryRail } from "./home-domain-rail";
import { HomeRecordViews } from "./home-record-views";
import { useI18n } from "./i18n";
import { useGoogleCalendar } from "./google-calendar-provider";
import { RecordComposer } from "./record-composer";
import { SearchDialog } from "./search-dialog";
import { SettingsPage } from "./settings/settings-page";
import { Icon } from "./ui";
import { useDraftAttachments } from "./use-draft-attachments";
import { useHomeRecordModel } from "./use-home-record-model";
import { useHomeDateSwipe } from "./use-home-date-swipe";
import { useLogNoteData, useToast } from "./use-log-note-data";
import "./home-header.css";
import "./date-disclosure.css";
import "./home-calendar.css";
import "./home-day-plan.css";
import "./home-timeline.css";
import "./home-fixed-records.css";
import "./entry-composer.css";
import "./attachments.css";
import "./search-dialog.css";
import "./management-header.css";
import "./settings-dialog.css";
import "./templates/templates.css";

/** Orchestrates the quick-record loop and delegates derived views and attachment drafts. */
export default function Home() {
  const { locale, t } = useI18n();
  const { internal: internalAuth, session } = useAuth();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayPlanActive, setDayPlanActive] = useState(false);
  const [draft, setDraft] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentEmptyNote, setAgentEmptyNote] = useState("");
  const [agentDocumentHidden, setAgentDocumentHidden] = useState(false);
  const [agentInteractionPaused, setAgentInteractionPaused] = useState(false);
  const [agentMobileViewport, setAgentMobileViewport] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [agentSession, setAgentSession] = useState({
    status: "idle",
    intro: "",
    items: [],
    activeIndex: 0,
    messages: [],
    proposedAppend: "",
    lastCategoryUndo: null,
    fallbackReason: ""
  });
  const [planAgentSession, setPlanAgentSession] = useState({
    status: "idle",
    intro: "",
    items: [],
    activeIndex: 0,
    messages: [],
    proposal: null,
    replying: false,
    fallbackReason: ""
  });
  const monthTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const calendarReturnScrollRef = useRef(null);
  const toolReturnScrollRef = useRef(null);
  const calendarOpenedDateRef = useRef(null);
  const calendarScrollFrameRef = useRef(0);
  const calendarViewportWidthRef = useRef(null);
  const railSectionRefs = useRef(new Map());
  const deepLinkHandledRef = useRef(false);
  const draftBaselineRef = useRef(null);
  const templateDraftsRef = useRef(new Map());
  const agentAbortRef = useRef(null);
  const agentEmptyNoteTimerRef = useRef(0);

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "Escape" && agentEmptyNote) {
        event.preventDefault();
        clearAgentEmptyNote();
      } else if (event.key === "Escape" && !draft && (searchOpen || settingsOpen)) {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else closeSettings();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (draft || searchOpen || settingsOpen) return;
        event.preventDefault();
        openSearch();
      } else if (!draft && !searchOpen && !settingsOpen && !typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [agentEmptyNote, calendarOpen, data.categories, data.templates, draft, searchOpen, settingsOpen, selectedDate]);

  useEffect(() => () => {
    cancelAnimationFrame(calendarScrollFrameRef.current);
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

  useEffect(() => {
    clearAgentEmptyNote();
    setAgentInteractionPaused(false);
  }, [dayPlanActive, draft, searchOpen, selectedDate, settingsOpen]);

  useEffect(() => {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setAgentSession((current) => current.status === "idle" ? current : {
      status: "idle", intro: "", items: [], activeIndex: 0, messages: [], proposedAppend: "",
      lastCategoryUndo: null, fallbackReason: ""
    });
    setPlanAgentSession((current) => current.status === "idle" ? current : {
      status: "idle", intro: "", items: [], activeIndex: 0, messages: [], proposal: null,
      replying: false, fallbackReason: ""
    });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth;
    calendarViewportWidthRef.current = viewportWidth();
    const keepCalendarVisible = () => {
      const nextWidth = viewportWidth();
      if (Math.abs(nextWidth - calendarViewportWidthRef.current) < 1) return;
      calendarViewportWidthRef.current = nextWidth;
      scheduleCalendarScroll(0, { smooth: false });
    };
    window.addEventListener("resize", keepCalendarVisible);
    window.visualViewport?.addEventListener("resize", keepCalendarVisible);
    return () => {
      window.removeEventListener("resize", keepCalendarVisible);
      window.visualViewport?.removeEventListener("resize", keepCalendarVisible);
      calendarViewportWidthRef.current = null;
    };
  }, [calendarOpen]);

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
  const availableCategories = useMemo(() => availableClassificationCategories(data), [data]);
  const agentProvider = useMemo(() => createRemoteAgentReviewProvider({
    getAccessToken: () => session?.access_token || ""
  }), [session?.access_token]);
  const activeAgentItem = agentSession.status === "reviewing" ? agentSession.items[agentSession.activeIndex] || null : null;
  const activeAgentEntry = activeAgentItem ? timelineEntries.find((entry) => entry.id === activeAgentItem.entryId) : null;
  const activePlanAgentItem = planAgentSession.status === "reviewing" ? planAgentSession.items[planAgentSession.activeIndex] || null : null;
  const activePlanAgentPlan = activePlanAgentItem ? data.planBlocks.find((plan) => plan.id === activePlanAgentItem.planId && plan.date === selectedDate && plan.source === "local") : null;
  const agentVisualStatus = activeAgentItem?.kind === "category" ? "category" : agentSession.status;
  const agentSummary = agentSession.status === "scanning"
    ? t("agent.scanning")
    : agentSession.status === "reviewing"
      ? t("agent.found", { count: agentSession.items.length })
      : agentSession.status === "complete"
        ? t("agent.completeTitle")
        : "";
  const railSections = useMemo(() => {
    if (calendarOpen || dayPlanActive) return [];
    if (viewMode === "timeline") {
      return [
        ...(timelineEntries.length ? [{ id: "timeline:records", name: t("common.record"), targetId: "timeline-records", kind: "record" }] : []),
        ...periodicDomainGroups.map((group) => ({
          id: `timeline:domain:${group.id}`,
          domainId: group.id,
          name: group.name || t("common.uncategorized"),
          targetId: `timeline-fixed-domain-${group.id}`,
          kind: "domain"
        }))
      ];
    }
    return categoryGroups.map((domain) => ({
      id: `grouped:domain:${domain.id}`,
      domainId: domain.id,
      name: domain.name,
      targetId: `record-domain-${domain.id}`,
      kind: "domain"
    }));
  }, [calendarOpen, categoryGroups, dayPlanActive, periodicDomainGroups, t, timelineEntries.length, viewMode]);
  const {
    addAttachment,
    attachmentBusy,
    deleteDraftAttachments,
    discardAttachmentChanges,
    finalizeAttachmentChanges,
    removeAttachment
  } = useDraftAttachments({ draft, setDraft, setToast, t });
  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];
  const visiblePlanBlocks = useMemo(() => [...data.planBlocks, ...googleCalendar.timedEvents], [data.planBlocks, googleCalendar.timedEvents]);
  const selectedLocalPlans = useMemo(() => data.planBlocks.filter((plan) => plan.date === selectedDate && plan.source === "local"), [data.planBlocks, selectedDate]);
  const selectedGoogleConflicts = useMemo(() => googleCalendar.timedEvents.filter((plan) => plan.date === selectedDate), [googleCalendar.timedEvents, selectedDate]);
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
    disabled: Boolean(draft || searchOpen || settingsOpen || agentSession.status === "scanning" || agentSession.status === "reviewing"),
    locale,
    onDateChange: changeSelectedDate,
    selectedDate
  });

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

  function setDraftWithBaseline(nextDraft) {
    draftBaselineRef.current = nextDraft ? JSON.stringify(nextDraft) : null;
    setDraft(nextDraft);
  }

  async function closeDraft() {
    if (!draft || attachmentBusy) return;
    const changed = JSON.stringify(draft) !== draftBaselineRef.current;
    const drafts = [...templateDraftsRef.current.values(), draft];
    const hasNewContent = drafts.some((item) => Boolean(
      item?.content?.trim() || item?.fixedValue?.trim() ||
      Object.values(item?.fieldValues || {}).some((value) => String(value).trim()) || item?.attachments?.length
    ));
    if ((draft.id ? changed : hasNewContent) && !window.confirm(t("confirm.discardDraft"))) return;
    await discardAttachmentChanges();
    templateDraftsRef.current.clear();
    setDraft(null);
  }

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

  function openNewEntry(templateId = "quick", categoryIdOverride = "", dateOverride = "") {
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

  function openEntry(entry) {
    const fixed = fixedContentParts(entry.content);
    setActiveTemplate(entry.templateId || "");
    templateDraftsRef.current.clear();
    setDraftWithBaseline({ ...entry, fixedLabel: fixed.label, fixedValue: fixed.value, tags: [...entry.tags] });
    setSearchOpen(false);
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
    const attachmentsCleaned = await finalizeAttachmentChanges(entry.attachments);
    setSelectedDate(entry.date);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(attachmentsCleaned ? (draft.id ? t("toast.recordUpdated") : t("toast.recordAdded")) : t("toast.attachmentCleanupPending"));
    return true;
  }

  function savePlanBlock(candidate) {
    const now = Date.now();
    let planBlock;
    try {
      planBlock = normalizePlanBlock({
        ...candidate,
        id: candidate.id || makeId("plan"),
        createdAt: candidate.createdAt || now,
        updatedAt: now
      });
    } catch (error) {
      console.error(error);
      setToast(t("toast.planSaveFailed"));
      return false;
    }
    const saved = commitData((state) => ({
      ...state,
      planBlocks: state.planBlocks.some((item) => item.id === planBlock.id)
        ? state.planBlocks.map((item) => item.id === planBlock.id ? planBlock : item)
        : [...state.planBlocks, planBlock]
    }));
    if (saved) setToast(candidate.id ? t("toast.planUpdated") : t("toast.planAdded"));
    return saved;
  }

  function deletePlanBlock(planBlock) {
    if (!window.confirm(t("confirm.deletePlan", { name: planBlock.title }))) return false;
    const deleted = commitData((state) => ({
      ...state,
      planBlocks: state.planBlocks.filter((item) => item.id !== planBlock.id)
    }));
    if (deleted) setToast(t("toast.planDeleted"));
    return deleted;
  }

  async function deleteEntry() {
    if (attachmentBusy || !draft.id || !window.confirm(t("confirm.deleteRecord"))) return;
    if (!commitData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }))) return;
    const attachmentsCleaned = await deleteDraftAttachments(draft.attachments || []);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(attachmentsCleaned ? t("toast.recordDeleted") : t("toast.attachmentCleanupPending"));
  }

  /** Applies one inline periodic edit through the same durable boundary as the composer. */
  function saveFixedInline(templateId, payload) {
    const template = templateMap.get(templateId);
    const displayTemplate = localizeTemplate(template, locale);
    const existing = periodicEntryMap.get(templateId);
    if (!template) return false;
    const mode = fixedRecordEditorMode(template, existing);
    if (payload.missingField) {
      setToast(t("toast.required", { field: payload.missingField.label }));
      return false;
    }
    const { content, fieldValues } = fixedRecordSaveResult(template, displayTemplate, existing, payload);

    if (existing && content === existing.content && JSON.stringify(fieldValues) === JSON.stringify(existing.fieldValues || {})) return true;

    if (!content.trim()) {
      if (!existing) {
        setToast(mode === "value" ? t("toast.fixedValueRequired") : t("toast.writeSomething"));
        return false;
      }
      if (!commitData((state) => ({ ...state, entries: state.entries.filter((entry) => entry.id !== existing.id) }))) return false;
      setToast(t("toast.emptyRecordDeleted"));
      return true;
    }

    const entry = {
      id: existing?.id || makeId("entry"),
      date: selectedDate,
      time: existing?.time || localTime(),
      content,
      categoryId: existing?.categoryId || template.categoryId,
      tags: existing?.tags || [...template.tags],
      templateId: template.id,
      fieldValues,
      createdAt: existing?.createdAt || Date.now()
    };
    if (!commitData((state) => ({
      ...state,
      entries: existing ? state.entries.map((item) => item.id === existing.id ? entry : item) : [...state.entries, entry]
    }))) return false;
    setToast(existing ? t("toast.recordUpdated") : t("toast.recordAdded"));
    return true;
  }

  function stopAgentReview({ keepUndo = true } = {}) {
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    setAgentSession((current) => ({
      status: "idle",
      intro: "",
      items: [],
      activeIndex: 0,
      messages: [],
      proposedAppend: "",
      lastCategoryUndo: keepUndo ? current.lastCategoryUndo : null,
      fallbackReason: ""
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
    setPlanAgentSession({
      status: "idle",
      intro: "",
      items: [],
      activeIndex: 0,
      messages: [],
      proposal: null,
      replying: false,
      fallbackReason: ""
    });
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
    setAgentSession((current) => {
      const nextIndex = current.activeIndex + 1;
      return nextIndex >= current.items.length
        ? { ...current, status: "complete", activeIndex: nextIndex, messages: [], proposedAppend: "" }
        : { ...current, activeIndex: nextIndex, messages: [], proposedAppend: "" };
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
    if (!activeAgentItem || !activeAgentEntry) return;
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
      proposedAppend: result.proposedAppend || content,
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

  function exportToday() {
    downloadFile(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8");
    setToast(t("toast.exported"));
  }

  function changeViewMode(nextMode) {
    setViewMode(nextMode);
  }

  function changeDayPlanMode(active) {
    if (active && agentSession.status !== "idle") stopAgentReview();
    if (!active && planAgentSession.status !== "idle") stopPlanAgentReview();
    setDayPlanActive(active);
  }

  function changeSelectedDate(nextDate) {
    if (nextDate !== selectedDate && agentSession.status !== "idle") stopAgentReview();
    if (nextDate !== selectedDate && planAgentSession.status !== "idle") stopPlanAgentReview();
    setSelectedDate(nextDate);
    if (calendarOpen) scheduleCalendarScroll(0, { smooth: false });
  }

  function returnToToday() {
    const today = localDate();
    if (today === selectedDate) return;
    if (calendarOpen) {
      calendarReturnScrollRef.current = null;
      calendarOpenedDateRef.current = null;
      setCalendarOpen(false);
    }
    changeSelectedDate(today);
    requestAnimationFrame(() => monthTriggerRef.current?.focus({ preventScroll: true }));
  }

  function scheduleCalendarScroll(top, { smooth = true } = {}) {
    cancelAnimationFrame(calendarScrollFrameRef.current);
    calendarScrollFrameRef.current = requestAnimationFrame(() => {
      calendarScrollFrameRef.current = requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, left: 0, behavior: smooth && !reducedMotion ? "smooth" : "auto" });
      });
    });
  }

  function setCalendarVisibility(nextOpen) {
    const shouldOpen = typeof nextOpen === "function" ? nextOpen(calendarOpen) : Boolean(nextOpen);
    if (shouldOpen === calendarOpen) return;

    if (shouldOpen) {
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

  function openSearch() {
    if (searchOpen) {
      closeSearch();
      return;
    }
    if (calendarOpen) setCalendarVisibility(false);
    if (agentSession.status !== "idle") stopAgentReview();
    if (planAgentSession.status !== "idle") stopPlanAgentReview();
    if (!settingsOpen) toolReturnScrollRef.current = window.scrollY;
    setSettingsOpen(false);
    setSearchOpen(true);
  }

  function openSettings() {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    if (calendarOpen) setCalendarVisibility(false);
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
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll, { smooth: false });
    requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true }));
  }

  function closeSettings() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    if (Number.isFinite(returnScroll)) window.scrollTo({ top: returnScroll, left: 0, behavior: "auto" });
    setSettingsOpen(false);
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll, { smooth: false });
    requestAnimationFrame(() => settingsTriggerRef.current?.focus({ preventScroll: true }));
  }

  function registerRailSection(sectionId, node) {
    if (node) railSectionRefs.current.set(sectionId, node);
    else railSectionRefs.current.delete(sectionId);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("home.loading")}</p></main>;
  }

  const agentReviewPanel = activeAgentItem ? (
    <AgentDiaryReview
      busy={Boolean(agentSession.replying)}
      categoryPath={categoryPath(activeAgentItem.categoryId)}
      item={activeAgentItem}
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

  const showDiaryAgent = !dayPlanActive && !searchOpen && !settingsOpen && !draft;
  const diaryAgentMotionMode = !agentMobileViewport || calendarOpen || agentDocumentHidden || agentEmptyNote || agentInteractionPaused || prefersReducedMotion
    ? "still"
    : "animated";
  const diaryAgentLabel = !timelineEntries.length
    ? t("agent.emptyWake")
    : agentSession.status === "idle"
      ? t("agent.wakeHint")
      : t("agent.stop");
  const showDiaryAgentIdleHint = Boolean(timelineEntries.length)
    && agentSession.status === "idle"
    && !calendarOpen;
  const diaryAgentMount = showDiaryAgent ? (
    <div
      className="organize-helper-slot diary-agent-viewport"
      data-agent-surface="diary"
      data-agent-stage-state={agentSession.status}
      data-agent-status={agentSession.status}
      data-agent-motion-mode={diaryAgentMotionMode}
      data-agent-calendar-open={calendarOpen ? "true" : "false"}
      data-agent-document-hidden={agentDocumentHidden ? "true" : "false"}
      data-agent-empty-date={!timelineEntries.length ? "true" : "false"}
      data-agent-speaking={agentEmptyNote ? "true" : "false"}
      data-agent-placement="viewport-spine"
    >
      <div className="diary-agent-traveler">
        <button
          className={`organize-helper${agentSession.status !== "idle" ? " is-awake" : ""}`}
          type="button"
          aria-label={diaryAgentLabel}
          aria-pressed={timelineEntries.length ? agentSession.status !== "idle" : undefined}
          aria-expanded={!timelineEntries.length ? Boolean(agentEmptyNote) : undefined}
          data-date={selectedDate}
          data-agent-status={agentSession.status}
          onBlur={() => setAgentInteractionPaused(false)}
          onClick={activateDiaryAgent}
          onFocus={() => setAgentInteractionPaused(true)}
          onPointerCancel={(event) => setAgentInteractionPaused(event.currentTarget === document.activeElement)}
          onPointerDown={() => setAgentInteractionPaused(true)}
          onPointerUp={(event) => setAgentInteractionPaused(event.currentTarget === document.activeElement)}
        >
          <AgentAppearance motionMode={diaryAgentMotionMode} status={agentSession.status} />
          <span className="visually-hidden">{diaryAgentLabel}</span>
        </button>
        {showDiaryAgentIdleHint && (
          <span className="diary-agent-tap-hint" data-agent-idle-hint aria-hidden="true">
            {t("agent.wakeHint")}
          </span>
        )}
        {agentEmptyNote && (
          <div className="diary-agent-empty-note" role="status" aria-live="polite">
            {agentEmptyNote}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <main
      className={`app-shell${dayPlanActive ? " is-day-plan" : ""}${activeAgentItem ? " has-agent-review" : ""}`}
      data-page-navigation-motion={dateSwipeMotion.direction}
      data-page-swipe-phase={dateSwipeMotion.phase}
      style={swipeStyle}
      {...swipeProps}
    >
      <img className="home-edge-rail-brush" src="/ui/diary/rail-brush-handdrawn.png" alt="" aria-hidden="true" />

      <HomeHeader
        agentSummary={agentSummary}
        agentStatus={agentVisualStatus}
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
        onDayPlanChange={changeDayPlanMode}
        onReturnToToday={selectedDate === localDate() ? null : returnToToday}
        onSearch={openSearch}
        onSettings={openSettings}
        onViewModeChange={changeViewMode}
        t={t}
      />

      {diaryAgentMount}

      {!searchOpen && !settingsOpen && railSections.length > 0 && (
        <DomainDirectoryRail
          sections={railSections}
          sectionRefs={railSectionRefs}
          selectedDate={selectedDate}
          t={t}
        />
      )}

      <div className={`home-workspace ${timelineEntries.length ? "has-timeline-records" : "is-timeline-empty"}`}>
        <div
          className={`home-diary-workspace${searchOpen || settingsOpen ? " is-tool-hidden" : ""}`}
          aria-hidden={searchOpen || settingsOpen ? "true" : undefined}
          inert={searchOpen || settingsOpen || undefined}
        >
          <div className="home-record-stream">
            <HomeRecordViews
              activeAgentEntryId={activeAgentItem?.entryId || ""}
              activeAgentKind={activeAgentItem?.kind || ""}
              agentReviewPanel={agentReviewPanel}
              activePlanAgentId={activePlanAgentItem?.planId || ""}
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
              googleCalendarSupported={!internalAuth}
              locale={locale}
              onCalendarOpenChange={setCalendarVisibility}
              onDateChange={changeSelectedDate}
              onDeletePlan={deletePlanBlock}
              onOpenEntry={openEntry}
              onSaveFixed={saveFixedInline}
              onSavePlan={savePlanBlock}
              onPlanAgentStart={startPlanAgentReview}
              onPlanAgentStop={stopPlanAgentReview}
              onPlanAgentRestart={startPlanAgentReview}
              onPlanEditorOpen={() => planAgentSession.status !== "idle" && stopPlanAgentReview()}
              registerRailSection={registerRailSection}
              planBlocks={visiblePlanBlocks}
              allDayPlans={googleCalendar.allDayEvents}
              selectedDate={selectedDate}
              t={t}
              timelineEntries={timelineEntries}
              viewMode={viewMode}
            />
            {agentSession.status === "complete" && !dayPlanActive && (
              <div className="agent-review-complete-shell">
                <AgentReviewComplete
                  lastCategoryUndo={agentSession.lastCategoryUndo}
                  onRestart={startAgentReview}
                  onStop={() => stopAgentReview()}
                  onUndoCategory={undoAgentCategory}
                  t={t}
                />
              </div>
            )}
          </div>

          {viewMode === "timeline" && !dayPlanActive && (
            <FixedRecords
              items={periodicItems}
              groups={periodicDomainGroups}
              onRegisterRailSection={registerRailSection}
              onSave={saveFixedInline}
              t={t}
            />
          )}
        </div>

        {(searchOpen || settingsOpen) && (
          <div className="home-tool-workspace home-record-stream">
            {searchOpen ? (
              <SearchDialog
                embedded
                open
                entries={data.entries}
                categoryMap={categoryMap}
                locale={locale}
                onClose={closeSearch}
                onSelect={(entry) => {
                  toolReturnScrollRef.current = null;
                  setSelectedDate(entry.date);
                  openEntry(entry);
                }}
                t={t}
              />
            ) : (
              <SettingsPage embedded workspace onClose={closeSettings} />
            )}
          </div>
        )}
      </div>

      {!dayPlanActive && (
        <div className="action-dock action-rail" aria-label={t("home.quickActions")} data-edge-rail-item="workspace-actions">
          <div className="record-action-row">
            <button className="export-fab" data-edge-rail-item="export" type="button" onClick={exportToday} aria-label={t("home.exportCurrent", { date: compactDateLabel(selectedDate, locale, t) })}>
              <img className="export-fab-stamp" src="/ui/diary/export-stamp.png" alt="" aria-hidden="true" />
              <span className="export-rail-icon" aria-hidden="true">
                <img src="/ui/diary/export-stamp.png" alt="" />
              </span>
            </button>
            <button className="fab" data-edge-rail-item="record" type="button" onClick={() => openNewEntry()} aria-label={t("home.addRecord")}>
              <img src="/ui/diary/record-stamp.png" alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

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

      {draft && (
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
          t={t}
          usesStructuredTemplate={usesStructuredTemplate}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
