"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { availableClassificationCategories } from "@/modules/organize/classification/model.mjs";
import { createRemoteAgentReviewProvider } from "@/modules/assistant/review/client.mjs";
import { createRemoteContentImprovementProvider } from "@/modules/composer/content-improvement/client.mjs";
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
import { normalizePlanBlock } from "@/lib/plan-model.mjs";
import { isValidRecordTime, mergeRecordTime } from "@/lib/record-inline-edit-model.mjs";
import { compactDateLabel } from "../../date-label";
import { AgentAppearance } from "../../agent-appearance";
import { AgentDiaryReview, AgentReviewComplete } from "./agent-diary-review";
import { useAuth } from "../../auth-provider";
import { downloadFile } from "../../download-file";
import { FixedRecords } from "../../fixed-records";
import { HomeHeader, WorkspaceModeRailToggle } from "./home-header";
import { DomainDirectoryRail } from "./home-domain-rail";
import { HomeRecordViews, InlineQuickRecord } from "./home-record-views";
import { useI18n } from "../../i18n";
import { useGoogleCalendar } from "../../google-calendar-provider";
import { RecordComposer } from "../../record-composer";
import { SearchDialog } from "../../search-dialog";
import { SettingsPage } from "../../settings/settings-page";
import { Icon } from "../../ui";
import { useDraftAttachments } from "./use-draft-attachments";
import { useHomeRecordModel } from "./use-home-record-model";
import { useHomeDateSwipe } from "./use-home-date-swipe";
import { useLogNoteData, useToast } from "../../use-log-note-data";
import { useHomeAgent } from "./use-home-agent";

/** Orchestrates the quick-record loop and delegates derived views and attachment drafts. */
export function HomePage() {
  const { locale, t } = useI18n();
  const { identity, internal: internalAuth, session } = useAuth();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayPlanActive, setDayPlanActive] = useState(false);
  const [draft, setDraft] = useState(null);
  const [quickEditDraft, setQuickEditDraft] = useState(null);
  const [activeTimeEntryId, setActiveTimeEntryId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDirectoryEnabled, setMobileDirectoryEnabled] = useState(false);
  const monthTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const calendarReturnScrollRef = useRef(null);
  const toolReturnScrollRef = useRef(null);
  const toolScrollFrameRef = useRef(0);
  const calendarOpenedDateRef = useRef(null);
  const calendarScrollFrameRef = useRef(0);
  const calendarViewportWidthRef = useRef(null);
  const railSectionRefs = useRef(new Map());
  const deepLinkHandledRef = useRef(false);
  const draftBaselineRef = useRef(null);
  const templateDraftsRef = useRef(new Map());
  const recordEditorOwnerRef = useRef(identity?.id || session?.user?.id || "");

  useEffect(() => () => {
    cancelAnimationFrame(calendarScrollFrameRef.current);
    cancelAnimationFrame(toolScrollFrameRef.current);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const sync = () => setMobileDirectoryEnabled(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

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
    setActiveTimeEntryId("");
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

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "Escape" && agentEmptyNote) {
        event.preventDefault();
        clearAgentEmptyNote();
      } else if (event.key === "Escape" && !draft && !quickEditDraft && !activeTimeEntryId && (searchOpen || settingsOpen)) {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else closeSettings();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (draft || quickEditDraft || activeTimeEntryId || searchOpen || settingsOpen) return;
        event.preventDefault();
        openSearch();
      } else if (!draft && !quickEditDraft && !activeTimeEntryId && !searchOpen && !settingsOpen && !typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTimeEntryId, agentEmptyNote, calendarOpen, data.categories, data.templates, draft, quickEditDraft, searchOpen, settingsOpen, selectedDate]);

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
    disabled: Boolean(draft || quickEditDraft || activeTimeEntryId || searchOpen || settingsOpen || agentSession.status === "scanning" || agentSession.status === "reviewing"),
    locale,
    onDateChange: changeSelectedDate,
    selectedDate
  });

  function setDraftWithBaseline(nextDraft) {
    draftBaselineRef.current = nextDraft ? JSON.stringify(nextDraft) : null;
    setDraft(nextDraft);
  }

  async function closeDraft({ confirmChanges = true } = {}) {
    if (!draft || attachmentBusy) return false;
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
    return true;
  }

  async function closeInlineDraft() {
    const entryId = draft?.id;
    if (!entryId || !await closeDraft({ confirmChanges: false })) return;
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-content-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
    });
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

  async function openNewEntry(templateId = "quick", categoryIdOverride = "", dateOverride = "") {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    setQuickEditDraft(null);
    setActiveTimeEntryId("");
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

  async function openEntry(entry) {
    if (draft?.id && draft.id !== entry.id && !await closeDraft({ confirmChanges: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    setQuickEditDraft(null);
    setActiveTimeEntryId("");
    const fixed = fixedContentParts(entry.content);
    setActiveTemplate(entry.templateId || "");
    templateDraftsRef.current.clear();
    setDraftWithBaseline({ ...entry, fixedLabel: fixed.label, fixedValue: fixed.value, tags: [...entry.tags] });
    setSearchOpen(false);
  }

  async function openEntryTime(entry) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    setQuickEditDraft(null);
    setActiveTimeEntryId((current) => current === entry.id ? "" : entry.id);
  }

  async function openQuickEntryEdit(entry) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (agentSession.status !== "idle") stopAgentReview();
    setActiveTimeEntryId("");
    setQuickEditDraft({ id: entry.id, content: entry.content });
  }

  function changeQuickEntryEdit(entryId, content) {
    setQuickEditDraft((current) => current?.id === entryId ? { ...current, content } : current);
  }

  function cancelQuickEntryEdit(entryId) {
    setQuickEditDraft((current) => current?.id === entryId ? null : current);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-quick-edit-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
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
      document.querySelector(`[data-entry-quick-edit-action][data-entry-id="${CSS.escape(entryId)}"]`)?.focus({ preventScroll: true });
    });
    return true;
  }

  function saveInlineQuickRecord({ content: rawContent, time }) {
    const content = String(rawContent || "").trim();
    if (!content || !isValidRecordTime(time)) return false;
    const template = data.templates.find((item) => item.id === "quick") || data.templates.find((item) => item.recordType !== "periodic");
    const entry = {
      id: makeId("entry"),
      date: selectedDate,
      time,
      content,
      categoryId: template?.categoryId || data.categories[0]?.id || "",
      tags: sanitizeTags(template?.tags || []),
      templateId: template?.id || null,
      fieldValues: {},
      attachments: [],
      createdAt: Date.now()
    };
    const saved = commitData((state) => ({ ...state, entries: [...state.entries, entry] }));
    if (saved) setToast(t("toast.recordAdded"));
    return saved;
  }

  function saveEntryTime(entryId, time) {
    const current = data.entries.find((entry) => entry.id === entryId);
    const next = mergeRecordTime(current, time);
    if (!next) return false;
    if (next === current) return true;
    const saved = commitData((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === entryId ? mergeRecordTime(entry, time) || entry : entry)
    }));
    if (saved) setToast(t("toast.recordUpdated"));
    return saved;
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
    const editedEntryId = draft.id;
    const attachmentsCleaned = await finalizeAttachmentChanges(entry.attachments);
    setSelectedDate(entry.date);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(attachmentsCleaned ? (draft.id ? t("toast.recordUpdated") : t("toast.recordAdded")) : t("toast.attachmentCleanupPending"));
    if (editedEntryId) window.requestAnimationFrame(() => {
      document.querySelector(`[data-entry-content-action][data-entry-id="${CSS.escape(editedEntryId)}"]`)?.focus({ preventScroll: true });
    });
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

  function exportToday() {
    downloadFile(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8");
    setToast(t("toast.exported"));
  }

  async function changeViewMode(nextMode) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    setActiveTimeEntryId("");
    setViewMode(nextMode);
  }

  async function changeDayPlanMode(active) {
    if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
    setActiveTimeEntryId("");
    if (active && agentSession.status !== "idle") stopAgentReview();
    if (!active && planAgentSession.status !== "idle") stopPlanAgentReview();
    setDayPlanActive(active);
  }

  async function changeSelectedDate(nextDate) {
    if (nextDate !== selectedDate && draft?.id && !await closeDraft({ confirmChanges: false })) return;
    if (nextDate !== selectedDate) setActiveTimeEntryId("");
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

  function scheduleCalendarScroll(top, { smooth = true } = {}) {
    cancelAnimationFrame(calendarScrollFrameRef.current);
    calendarScrollFrameRef.current = requestAnimationFrame(() => {
      calendarScrollFrameRef.current = requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, left: 0, behavior: smooth && !reducedMotion ? "smooth" : "auto" });
      });
    });
  }

  function scheduleToolScrollRestore(top) {
    cancelAnimationFrame(toolScrollFrameRef.current);
    let attempts = 0;
    const restore = () => {
      attempts += 1;
      const directory = document.querySelector(".domain-directory-scroll");
      const directoryPending = mobileDirectoryEnabled
        && viewMode === "grouped"
        && railSections.length > 0
        && directory?.dataset.positioned !== "true";
      if (directoryPending && attempts < 8) {
        toolScrollFrameRef.current = requestAnimationFrame(restore);
        return;
      }
      toolScrollFrameRef.current = 0;
      window.scrollTo({ top, left: 0, behavior: "auto" });
    };
    toolScrollFrameRef.current = requestAnimationFrame(restore);
  }

  async function setCalendarVisibility(nextOpen) {
    const shouldOpen = typeof nextOpen === "function" ? nextOpen(calendarOpen) : Boolean(nextOpen);
    if (shouldOpen === calendarOpen) return;

    if (shouldOpen) {
      if (draft?.id && !await closeDraft({ confirmChanges: false })) return;
      setActiveTimeEntryId("");
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
    setActiveTimeEntryId("");
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
    setActiveTimeEntryId("");
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
    if (Number.isFinite(returnScroll)) scheduleToolScrollRestore(returnScroll);
    requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true }));
  }

  function closeSettings() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    setSettingsOpen(false);
    if (Number.isFinite(returnScroll)) window.scrollTo({ top: returnScroll, left: 0, behavior: "auto" });
    if (Number.isFinite(returnScroll)) scheduleToolScrollRestore(returnScroll);
    requestAnimationFrame(() => settingsTriggerRef.current?.focus({ preventScroll: true }));
  }

  function registerRailSection(sectionId, node) {
    if (node) railSectionRefs.current.set(sectionId, node);
    else railSectionRefs.current.delete(sectionId);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("home.loading")}</p></main>;
  }

  const agentReviewPanel = displayedAgentItem ? (
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

  const draftEditsVisibleRow = Boolean(draft?.id && timelineEntries.some((entry) => entry.id === draft.id));
  const inlineRecordEditor = draftEditsVisibleRow ? (
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
      onClose={closeInlineDraft}
      onDelete={deleteEntry}
      onAddAttachment={addAttachment}
      onRemoveAttachment={removeAttachment}
      onDraftChange={setDraft}
      onSave={saveEntry}
      attachmentBusy={attachmentBusy}
      accountGeneration={identity?.id || session?.user?.id || ""}
      contentImprovementProvider={contentImprovementProvider}
      inline
      t={t}
      usesStructuredTemplate={usesStructuredTemplate}
    />
  ) : null;
  const showDiaryAgent = !dayPlanActive && !searchOpen && !settingsOpen && !draft && !quickEditDraft && !activeTimeEntryId;
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
      className={`app-shell${dayPlanActive ? " is-day-plan" : ""}${viewMode === "grouped" && !dayPlanActive ? " is-category-view" : ""}${activeAgentItem ? " has-agent-review" : ""}`}
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
        onReturnToToday={selectedDate === localDate() ? null : returnToToday}
        onSearch={openSearch}
        onSettings={openSettings}
        onViewModeChange={changeViewMode}
        t={t}
      />

      {diaryAgentMount}

      {mobileDirectoryEnabled && !searchOpen && !settingsOpen && railSections.length > 0 && (
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
              activeDraftId={draftEditsVisibleRow ? draft.id : ""}
              activeTimeEntryId={activeTimeEntryId}
              quickEditDraft={quickEditDraft}
              quickEditableEntryIds={quickEditableEntryIds}
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
              onOpenQuickEdit={openQuickEntryEdit}
              onOpenEntryTime={openEntryTime}
              onCloseEntryTime={() => setActiveTimeEntryId("")}
              onSaveEntryTime={saveEntryTime}
              onSaveQuickEdit={saveQuickEntryEdit}
              onCancelQuickEdit={cancelQuickEntryEdit}
              onChangeQuickEdit={changeQuickEntryEdit}
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
              inlineEditor={inlineRecordEditor}
              viewMode={viewMode}
            />
            {!dayPlanActive && !calendarOpen && !draft && !quickEditDraft && !activeTimeEntryId && timelineEntries.length > 0 && agentSession.status === "idle" && (
              <InlineQuickRecord
                key={`${recordEditorOwner}:${selectedDate}:${viewMode}`}
                onSave={saveInlineQuickRecord}
                t={t}
              />
            )}
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

      <div
        className={`action-dock action-rail${dayPlanActive ? " is-day-plan-navigation" : ""}`}
        aria-label={t("home.quickActions")}
        data-edge-rail-item="workspace-actions"
      >
        <WorkspaceModeRailToggle dayPlanActive={dayPlanActive} onDayPlanChange={changeDayPlanMode} t={t} />
        {!dayPlanActive && (
          <div className="record-action-row">
            <button className="export-fab" data-edge-rail-item="export" type="button" onClick={exportToday} aria-label={t("home.exportCurrent", { date: compactDateLabel(selectedDate, locale, t) })}>
              <span className="export-rail-icon" aria-hidden="true">
                <img src="/ui/diary/export-stamp.png" alt="" />
              </span>
              <span className="export-fab-label">{t("home.exportTodayLabel")}</span>
            </button>
            <button className="fab" data-edge-rail-item="record" type="button" onClick={() => openNewEntry()} aria-label={t("home.addRecord")}>
              <img src="/ui/diary/record-stamp.png" alt="" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

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

      {draft && !draftEditsVisibleRow && (
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
