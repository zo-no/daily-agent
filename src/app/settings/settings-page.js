"use client";

/**
 * @fileoverview 在独立管理页中提供导出、恢复、Markdown 与安装设置。
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  backupPayload,
  DEFAULT_MARKDOWN_SETTINGS,
  generalStructureTemplate,
  localDate,
  makeId,
  markdownForAll,
  markdownForDate,
  restoreState,
  structurePayload
} from "@/lib/data.mjs";
import { createPortableBackup, parsePortableBackup, PORTABLE_BACKUP_MIME } from "@/lib/attachment-bundle.mjs";
import { attachmentRefsFromState, formatAttachmentBytes, stateWithRemappedAttachmentIds } from "@/lib/attachment-model.mjs";
import { mergeDailyMarkdownEntries, parseDailyMarkdownFiles } from "@/lib/daily-markdown-import.mjs";
import {
  attachmentStorageSummary,
  deleteAttachmentBlobs,
  getAttachmentBlob,
  putReplacementAttachmentBlobs,
  removeOrphanAttachmentBlobs
} from "@/lib/attachment-store.mjs";
import { downloadFile } from "../_components/download-file";
import { useI18n } from "../_providers/i18n";
import { clearInstallPrompt, getInstallPrompt, subscribeInstallPrompt } from "../_components/install-prompt";
import { ManagementHeader } from "../_components/management-header";
import { useAuth } from "../_providers/auth-provider";
import { useGoogleCalendar } from "../_providers/google-calendar-provider";
import { Icon } from "../_components/ui";
import { useLogNoteData, useToast } from "../_providers/use-log-note-data";
import { RecordSetupManager } from "./_components/record-setup";
import { AgentBridgePanel } from "./_components/agent-bridge/agent-bridge-panel";

const MAX_JSON_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_DAILY_MARKDOWN_BYTES = 10 * 1024 * 1024;
const MAX_DAILY_MARKDOWN_FILES = 31;
const SETTINGS_PANELS = [
  { id: "general", icon: "settings", label: "settings.navGeneral", detail: "settings.mobileGeneralDetail" },
  { id: "account", icon: "user", label: "settings.navAccount", detail: "settings.mobileAccountDetail" },
  { id: "export", icon: "download", label: "settings.navDownload", detail: "settings.mobileDownloadDetail" },
  { id: "backup", icon: "upload", label: "settings.navRestore", detail: "settings.mobileRestoreDetail" },
  { id: "storage", icon: "image", label: "settings.navImages", detail: "settings.mobileImagesDetail" },
  { id: "record-setup", icon: "book", label: "settings.navRecordSetup", detail: "settings.mobileRecordSetupDetail" }
];
const GOALS_NAV_ENTRY = { icon: "plan", label: "settings.navGoals", detail: "settings.mobileGoalsDetail" };
const SETTINGS_HASH_ALIASES = {
  general: "general",
  account: "account",
  export: "export",
  download: "export",
  backup: "backup",
  restore: "backup",
  "record-setup": "record-setup",
  structure: "export",
  storage: "storage",
  images: "storage"
};

function panelTitleKey(panel) {
  return {
    general: "settings.generalTitle",
    account: "settings.accountTitle",
    export: "settings.downloadTitle",
    backup: "settings.restoreTitle",
    storage: "settings.imagesTitle",
    "record-setup": "settings.recordSetupTitle"
  }[panel.id] || panel.label;
}

function formatCloudTime(value, locale) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/** Owns local export, restore, Markdown, attachment, and install-management interactions. */
export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated, recovery, replaceData, sync, streamConflicts, syncNow, acceptCloud, keepLocal, resolveSyncConflict, retrySync } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const accountState = useAuth();
  const googleCalendar = useGoogleCalendar();
  const installPrompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
  const [attachmentSummary, setAttachmentSummary] = useState({ status: "loading", count: 0, bytes: 0 });
  const [activePanel, setActivePanel] = useState("general");
  const [isMobileSettings, setIsMobileSettings] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [pendingDailyImport, setPendingDailyImport] = useState(null);
  const [editingSyncConflict, setEditingSyncConflict] = useState(null);
  const [editingSyncPayload, setEditingSyncPayload] = useState("");
  const fileInputRef = useRef(null);
  const portableInputRef = useRef(null);
  const dailyMarkdownInputRef = useRef(null);
  const pendingPanelFocusRef = useRef(false);
  const mobileIndexRef = useRef(null);
  const selectedDate = localDate();
  const identity = accountState.identity;
  function beginSyncConflictEdit(conflict) {
    setEditingSyncConflict(conflict);
    setEditingSyncPayload(JSON.stringify(conflict.local || conflict.remote || null, null, 2));
  }

  async function submitSyncConflictEdit() {
    if (!editingSyncConflict) return;
    try {
      const payload = JSON.parse(editingSyncPayload);
      const resolved = await resolveSyncConflict({
        kind: editingSyncConflict.kind,
        entityId: editingSyncConflict.entityId,
        resolution: "merged",
        payload
      });
      if (resolved) setEditingSyncConflict(null);
    } catch {
      setToast(locale === "zh-CN" ? "合并内容不是有效 JSON" : "The merged payload is not valid JSON");
    }
  }
  useEffect(() => {
    if (!hydrated) return undefined;
    const syncHash = () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("focus") === "periodic") {
        url.searchParams.delete("focus");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      const requested = window.location.hash.slice(1);
      const requestedPanel = SETTINGS_HASH_ALIASES[requested];
      setActivePanel(requestedPanel || "general");
      setMobilePanelOpen(Boolean(requestedPanel));
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [hydrated]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const syncViewport = () => setIsMobileSettings(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setAttachmentSummary((current) => ({ ...current, status: "loading" }));
    attachmentStorageSummary()
      .then((summary) => setAttachmentSummary({ status: "ready", ...summary }))
      .catch((error) => {
        console.error(error);
        setAttachmentSummary((current) => ({ ...current, status: "unavailable" }));
      });
  }, [data, hydrated]);

  useEffect(() => {
    if (!pendingPanelFocusRef.current) return;
    pendingPanelFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const target = isMobileSettings
        ? document.querySelector(".settings-page .management-title h1")
        : document.querySelector(`#${activePanel} .settings-panel-heading h2`);
      target?.setAttribute("tabindex", "-1");
      target?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePanel, isMobileSettings]);

  useEffect(() => {
    if (!hydrated || activePanel !== "export" || window.location.hash !== "#structure") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const structure = document.querySelector("#structure");
      structure?.scrollIntoView({ block: "start", behavior: "auto" });
      structure?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePanel, hydrated]);

  function download(filename, content, mime, message) {
    downloadFile(filename, content, mime);
    setToast(message);
  }

  function updateMarkdownSetting(key, value) {
    commitData((state) => ({
      ...state,
      markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS, ...state.markdownSettings, [key]: value }
    }));
  }

  function resetMarkdownSettings() {
    if (commitData((state) => ({ ...state, markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS } }))) {
      setToast(t("toast.markdownReset"));
    }
  }

  async function restoreJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_JSON_BACKUP_BYTES) {
        setToast(t("toast.restoreTooLarge"));
        return;
      }
      const restored = restoreState(JSON.parse(await file.text()));
      if (!window.confirm(t("confirm.restore", { entries: restored.entries.length }))) return;
      if (!replaceData(restored)) {
        setToast(t("toast.restoreFailed"));
        return;
      }
      await removeOrphanAttachmentBlobs(attachmentRefsFromState(restored).map((item) => item.id)).catch((error) => console.error(error));
      setToast(t("toast.backupRestored"));
    } catch {
      setToast(t("toast.restoreFailed"));
    }
  }

  async function importDailyMarkdown(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    try {
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (files.length > MAX_DAILY_MARKDOWN_FILES || totalBytes > MAX_DAILY_MARKDOWN_BYTES) {
        setToast(t("toast.dailyMarkdownTooLarge"));
        return;
      }
      const candidates = parseDailyMarkdownFiles(await Promise.all(files.map(async (file) => ({ name: file.name, text: await file.text() }))));
      const preview = mergeDailyMarkdownEntries(data, candidates, makeId);
      if (!preview.imported.length) {
        setPendingDailyImport(null);
        setToast(t(candidates.length ? "toast.dailyMarkdownNoNew" : "toast.dailyMarkdownEmpty"));
        return;
      }
      setPendingDailyImport({
        candidates,
        files: files.length,
        entries: preview.imported.length,
        skipped: preview.skipped
      });
    } catch (error) {
      console.error(error);
      setPendingDailyImport(null);
      setToast(t("toast.dailyMarkdownFailed"));
    }
  }

  function confirmDailyMarkdownImport() {
    if (!pendingDailyImport) return;
    const { candidates } = pendingDailyImport;
    let importedCount = 0;
    const saved = commitData((state) => {
      const merged = mergeDailyMarkdownEntries(state, candidates, makeId);
      importedCount = merged.imported.length;
      return merged.state;
    });
    if (saved) setPendingDailyImport(null);
    setToast(saved
      ? t(importedCount ? "toast.dailyMarkdownImported" : "toast.dailyMarkdownNoNew", { count: importedCount })
      : t("toast.dailyMarkdownFailed"));
  }

  function cancelDailyMarkdownImport() {
    setPendingDailyImport(null);
  }

  async function exportPortableBackup() {
    try {
      const bundle = await createPortableBackup(data, getAttachmentBlob);
      downloadFile(`log-note-portable-${selectedDate}.lnbackup`, bundle, PORTABLE_BACKUP_MIME);
      setToast(t("toast.portableExported"));
    } catch (error) {
      console.error(error);
      setToast(t("toast.portableExportFailed"));
    }
  }

  /** Verifies and replaces text state while keeping newly inserted Blobs reversible. */
  async function restorePortableBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const insertedIds = [];
    let stateCommitted = false;
    try {
      const parsed = await parsePortableBackup(file, restoreState);
      if (!window.confirm(t("confirm.restorePortable", { entries: parsed.state.entries.length, images: parsed.files.length }))) return;
      const idMap = new Map(parsed.files.map(({ ref }) => [ref.id, makeId("attachment")]));
      const restored = stateWithRemappedAttachmentIds(parsed.state, idMap);
      const inserted = await putReplacementAttachmentBlobs(parsed.files.map(({ ref, blob }) => ({ ref: { ...ref, id: idMap.get(ref.id) }, blob })));
      insertedIds.push(...inserted.map((ref) => ref.id));
      if (!replaceData(restored)) {
        await deleteAttachmentBlobs(insertedIds).catch((error) => console.error(error));
        setToast(t("toast.portableRestoreFailed"));
        return;
      }
      stateCommitted = true;
      const keepIds = attachmentRefsFromState(restored).map((item) => item.id);
      await removeOrphanAttachmentBlobs(keepIds).catch((error) => console.error(error));
      await attachmentStorageSummary().then((summary) => setAttachmentSummary({ status: "ready", ...summary })).catch((error) => console.error(error));
      setToast(t("toast.portableRestored"));
    } catch (error) {
      console.error(error);
      if (!stateCommitted) {
        await deleteAttachmentBlobs(insertedIds).catch((cleanupError) => console.error(cleanupError));
        setToast(t("toast.portableRestoreFailed"));
      }
    }
  }

  async function cleanUnusedAttachments() {
    try {
      const removed = await removeOrphanAttachmentBlobs(attachmentRefsFromState(data).map((item) => item.id));
      setAttachmentSummary({ status: "ready", ...await attachmentStorageSummary() });
      setToast(t("toast.attachmentsCleaned", { count: removed }));
    } catch (error) {
      console.error(error);
      setToast(t("toast.attachmentSaveFailed"));
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      clearInstallPrompt();
    }
  }

  async function disconnectAccount() {
    const result = await accountState.signOut();
    if (!result.ok) {
      setToast(t("toast.accountSignOutFailed"));
      return;
    }
    setToast(t(result.scope === "local" ? "toast.accountSignedOutLocal" : "toast.accountSignedOut"));
  }

  async function disconnectGoogleCalendar() {
    if (!window.confirm(t("confirm.googleCalendarDisconnect"))) return;
    await googleCalendar.disconnect();
  }

  async function keepLocalGooglePlan(planId) {
    await googleCalendar.keepLocalManagedPlan(planId);
  }

  async function useGooglePlan(planId) {
    await googleCalendar.adoptGoogleManagedPlan(planId);
  }

  async function useCloudAfterConflict() {
    if (!sync.document || !window.confirm(t("confirm.restoreCloud"))) return;
    try {
      const rollback = await createPortableBackup(data, getAttachmentBlob);
      downloadFile(`log-note-before-cloud-${selectedDate}.lnbackup`, rollback, PORTABLE_BACKUP_MIME);
      if (!await acceptCloud()) throw new Error("Local state replacement failed or cloud revision changed");
      setToast(t("toast.cloudRestored"));
    } catch (error) {
      console.error(error);
      setToast(t("settings.cloudRestoreFailed"));
    }
  }

  async function keepDeviceAfterConflict() {
    if (!window.confirm(t("confirm.replaceCloud"))) return;
    if (await keepLocal()) setToast(t("toast.cloudSaved"));
  }

  function openPanel(event, panelId, focusPanel = false) {
    event.preventDefault();
    pendingPanelFocusRef.current = focusPanel;
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    url.hash = panelId;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setActivePanel(panelId);
    setMobilePanelOpen(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function closeMobilePanel(event) {
    event.preventDefault();
    window.history.replaceState(null, "", window.location.pathname);
    setMobilePanelOpen(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    window.requestAnimationFrame(() => mobileIndexRef.current?.querySelector(`[data-settings-panel="${activePanel}"]`)?.focus());
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("settings.loading")}</p></main>;
  }

  const dataProtected = Boolean(recovery);
  const rawRecoveryAvailable = typeof recovery?.rawPayload === "string";
  const activePanelMeta = SETTINGS_PANELS.find((panel) => panel.id === activePanel) || SETTINGS_PANELS[0];
  const imageStatus = attachmentSummary.status === "ready"
    ? t("settings.mobileImagesStatus", { count: attachmentSummary.count, size: formatAttachmentBytes(attachmentSummary.bytes) })
    : t("settings.mobileImagesPending");
  function mobilePanelDetail(panel) {
    if (panel.id === "general") return locale === "zh-CN" ? t("settings.chinese") : t("settings.english");
    if (panel.id === "account") {
      return identity?.email
        || identity?.name
        || t(accountState.status === "unavailable" ? "settings.accountUnavailable" : "settings.mobileAccountDetail");
    }
    if (panel.id === "export") return t("settings.mobileDownloadStatus", { count: data.entries.length });
    if (panel.id === "storage") return imageStatus;
    return t(panel.detail);
  }
  const syncStatusKey = {
    checking: "settings.cloudChecking",
    saving: "settings.cloudSaving",
    dirty: "settings.cloudWaiting",
    synced: "settings.cloudSynced",
    offline: "settings.cloudOffline",
    retrying: "settings.cloudRetryingLabel",
    error: "settings.cloudError",
    "load-error": "settings.cloudLoadError",
    "setup-required": "settings.cloudSetupRequiredLabel",
    conflict: "settings.cloudConflictLabel",
    blocked: "settings.cloudBlockedLabel",
    test: "settings.cloudTestMode"
  }[sync.status] || "settings.cloudChecking";
  const syncDetailKey = {
    retrying: "settings.cloudRetryingDetail",
    error: "settings.cloudSaveFailed",
    "load-error": "settings.cloudLoadFailed",
    "setup-required": "settings.cloudSetupRequired",
    conflict: "settings.cloudConflict",
    blocked: "settings.cloudBlocked"
  }[sync.status] || "";
  const remoteData = sync.document?.payload;
  const googleCalendarStatusKey = {
    unavailable: "settings.googleCalendarUnavailable",
    restricted: "settings.googleCalendarUnavailable",
    disconnected: "settings.googleCalendarDisconnected",
    cached: "settings.googleCalendarCached",
    connecting: "settings.googleCalendarConnecting",
    syncing: "settings.googleCalendarSyncing",
    rebuilding: "settings.googleCalendarRebuilding",
    synced: "settings.googleCalendarSynced",
    dirty: "settings.googleCalendarDirty",
    offline: "settings.googleCalendarOffline",
    conflict: "settings.googleCalendarConflict",
    error: "settings.googleCalendarError"
  }[googleCalendar.status] || "settings.googleCalendarDisconnected";
  const googleCalendarIssueKey = {
    "deployment-unavailable": "settings.googleCalendarClientUnavailable",
    "domain-restricted": "settings.googleCalendarDomainUnavailable",
    "account-restricted": "settings.googleCalendarAccountRestricted",
    "popup-blocked": "settings.googleCalendarPopupBlocked",
    "authorization-cancelled": "settings.googleCalendarAuthorizationCancelled",
    "authorization-unavailable": "settings.googleCalendarAuthorizationUnavailable",
    "api-unavailable": "settings.googleCalendarApiUnavailable",
    offline: "settings.googleCalendarOfflineDetail",
    conflict: "settings.googleCalendarConflictDetail",
    "request-failed": "settings.googleCalendarRequestFailed"
  }[googleCalendar.issue] || "";
  const googleCalendarBusy = ["connecting", "syncing", "rebuilding"].includes(googleCalendar.status);
  const googleCalendarAvailable = googleCalendar.configured && googleCalendar.status !== "restricted";
  const googleCalendarIssueTextKey = {
    "remote-changed": "settings.googleCalendarRemoteChanged",
    "remote-deleted": "settings.googleCalendarRemoteDeleted",
    "remote-missing": "settings.googleCalendarRemoteMissing"
  };

  return (
    <main className={`management-page settings-page${mobilePanelOpen ? " settings-mobile-detail" : " settings-mobile-root"}`}>
      <ManagementHeader
        backHref={isMobileSettings && mobilePanelOpen ? "/settings" : "/"}
        backIcon="chevronLeft"
        backLabel={isMobileSettings && mobilePanelOpen ? t("settings.backToSettings") : t("templates.backRecords")}
        onBack={isMobileSettings && mobilePanelOpen ? closeMobilePanel : null}
        title={isMobileSettings ? (mobilePanelOpen ? t(panelTitleKey(activePanelMeta)) : "") : t("settings.title")}
      />
      <div className="management-workspace settings-workspace">
        <div className="settings-shell">
          <aside className="settings-sidebar">
            <nav className="settings-nav" aria-label={t("settings.navLabel")}>
              {SETTINGS_PANELS.map((panel) => (
                <a key={panel.id} href={`#${panel.id}`} aria-current={activePanel === panel.id ? "page" : undefined} onClick={(event) => openPanel(event, panel.id)}>
                  <Icon name={panel.icon} size={18} />
                  <span>{t(panel.label)}</span>
                </a>
              ))}
              <a href="/goals">
                <Icon name={GOALS_NAV_ENTRY.icon} size={18} />
                <span>{t(GOALS_NAV_ENTRY.label)}</span>
              </a>
            </nav>
          </aside>

          <section className="settings-mobile-index" aria-labelledby="mobile-settings-title" ref={mobileIndexRef}>
            <div className="settings-mobile-intro">
              <h2 id="mobile-settings-title">{t("settings.mobileTitle")}</h2>
            </div>
            {recovery && (
              <div className="settings-mobile-recovery" role="alert">
                <a href="#backup" aria-label={t("settings.openRecovery")} onClick={(event) => openPanel(event, "backup", true)}>
                  <span><b>{t("settings.recoveryTitle")}</b><small>{t("settings.recoveryDescription")}</small></span>
                  <Icon name="chevronRight" />
                </a>
              </div>
            )}
            <nav className="settings-mobile-menu" aria-label={t("settings.navLabel")}>
              {SETTINGS_PANELS.map((panel) => (
                <a key={panel.id} data-settings-panel={panel.id} href={`#${panel.id}`} aria-label={t(panel.label)} onClick={(event) => openPanel(event, panel.id, true)}>
                  <span className="settings-mobile-menu-icon"><Icon name={panel.icon} size={19} /></span>
                  <span><b>{t(panel.label)}</b><small>{mobilePanelDetail(panel)}</small></span>
                  <Icon name="chevronRight" size={18} />
                </a>
              ))}
              <a href="/goals" aria-label={t(GOALS_NAV_ENTRY.label)}>
                <span className="settings-mobile-menu-icon"><Icon name={GOALS_NAV_ENTRY.icon} size={19} /></span>
                <span><b>{t(GOALS_NAV_ENTRY.label)}</b><small>{t(GOALS_NAV_ENTRY.detail)}</small></span>
                <Icon name="chevronRight" size={18} />
              </a>
            </nav>
          </section>

          <div className="settings-panel-column">
            {recovery && activePanel !== "backup" && (
              <div className="settings-recovery-banner" role="alert">
                <div><b>{t("settings.recoveryTitle")}</b><p>{t("settings.recoveryDescription")}</p></div>
                <a href="#backup" onClick={(event) => openPanel(event, "backup", true)}>{t("settings.openRecovery")}</a>
              </div>
            )}

            {activePanel === "general" && (
              <section id="general" className="settings-panel settings-section" aria-labelledby="general-title">
                <div className="settings-panel-heading"><span>{t("settings.navGeneral")}</span><h2 id="general-title" tabIndex="-1">{t("settings.generalTitle")}</h2></div>
                <div className="settings-preference-list">
                  <div className="settings-preference-row">
                    <div><h3>{t("settings.languageTitle")}</h3></div>
                    <div className="language-choice" role="group" aria-label={t("settings.languageTitle")}>
                      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>{t("settings.english")}</button>
                      <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>{t("settings.chinese")}</button>
                    </div>
                  </div>
                  <div className="settings-preference-row">
                    <div><h3>{t("settings.appTitle")}</h3></div>
                    {installPrompt
                      ? <button className="settings-install-button" type="button" onClick={installApp}>{t("settings.install")}</button>
                      : <span className="settings-row-status">{t("settings.installTip")}</span>}
                  </div>
                </div>
              </section>
            )}

            {activePanel === "account" && (
              <section id="account" className="settings-panel settings-section account-section" aria-labelledby="account-title">
                <div className="settings-panel-heading"><span>{t("settings.navAccount")}</span><h2 id="account-title" tabIndex="-1">{t("settings.accountTitle")}</h2><p>{t("settings.accountDescription")}</p></div>
                <div className="account-workspace" aria-live="polite">
                  {identity ? (
                    <>
                      <div className="account-identity-row">
                        <span className="account-avatar" aria-hidden="true">{identity.initials}</span>
                        <div><h3>{identity.name}</h3><p>{identity.email || t(accountState.internal ? "settings.accountMeituanIdentity" : "settings.accountConnected")}</p></div>
                        <span className="account-connected-status"><i />{t("settings.accountConnected")}</span>
                      </div>
                      <section className="account-cloud-workspace" aria-labelledby="cloud-save-title">
                        <div className="account-cloud-heading">
                          <div><h3 id="cloud-save-title">{t("settings.cloudTitle")}</h3><p>{sync.document ? t("settings.cloudRevision", { revision: sync.document.revision }) : t("settings.cloudDescription")}</p></div>
                          <div className="account-cloud-heading-actions">
                            <span>{t(syncStatusKey)}</span>
                            <button className="account-secondary-action" type="button" onClick={syncNow} disabled={sync.status === "saving"}>{t("sync.syncNow")}</button>
                          </div>
                        </div>
                        {sync.status === "conflict" && sync.document && streamConflicts.length === 0 && (
                          <div className="account-conflict-workspace">
                            <div className="account-conflict-comparison" aria-label={t("settings.cloudConflict")}>
                              <article>
                                <strong>{t("settings.conflictDeviceTitle")}</strong>
                                <span>{t("settings.conflictEntries", { count: data.entries.length })}</span>
                                <span>{t("settings.conflictPlans", { count: data.planBlocks.length })}</span>
                              </article>
                              <article>
                                <strong>{t("settings.conflictCloudTitle")}</strong>
                                <span>{t("settings.conflictRevision", { revision: sync.document.revision || "—" })}</span>
                                <span>{t("settings.conflictEntries", { count: remoteData?.entries?.length || 0 })}</span>
                                <span>{t("settings.conflictPlans", { count: remoteData?.planBlocks?.length || 0 })}</span>
                                <span>{t("settings.conflictUpdated", { time: formatCloudTime(sync.document.updatedAt, locale) })}</span>
                              </article>
                            </div>
                            <div className="account-cloud-actions">
                              <button type="button" onClick={useCloudAfterConflict}><b>{t("settings.cloudUseRemote")}</b><small>{t("settings.cloudUseRemoteDetail")}</small></button>
                              <button type="button" onClick={keepDeviceAfterConflict}><b>{t("settings.cloudKeepLocal")}</b><small>{t("settings.cloudKeepLocalDetail")}</small></button>
                            </div>
                          </div>
                        )}
                        {streamConflicts.length > 0 && (
                          <section className="account-sync-conflicts" aria-labelledby="account-sync-conflicts-title">
                            <div className="account-cloud-actions-header">
                              <div>
                                <h3 id="account-sync-conflicts-title">{t("sync.streamConflictsTitle")}</h3>
                                <p>{t("sync.streamConflictsDescription")}</p>
                              </div>
                            </div>
                            <div className="account-sync-conflict-list">
                              {streamConflicts.map((conflict) => (
                                <article key={`${conflict.kind}:${conflict.entityId}`} className="account-sync-conflict-card">
                                  <strong>{t(conflict.kind === "record" ? "sync.recordConflict" : "sync.planConflict")}</strong>
                                  <span>{conflict.entityId}</span>
                                  <span>{t("sync.conflictFields", { fields: conflict.conflicts.join(", ") || "—" })}</span>
                                  <div className="account-cloud-actions">
                                    <button type="button" onClick={() => resolveSyncConflict({ kind: conflict.kind, entityId: conflict.entityId, resolution: "local" })}>{t("sync.keepLocal")}</button>
                                    <button type="button" onClick={() => resolveSyncConflict({ kind: conflict.kind, entityId: conflict.entityId, resolution: "cloud" })}>{t("sync.useCloud")}</button>
                                    <button type="button" onClick={() => beginSyncConflictEdit(conflict)}>{t("sync.editMerge")}</button>
                                  </div>
                                  {editingSyncConflict?.kind === conflict.kind && editingSyncConflict.entityId === conflict.entityId && (
                                    <div className="account-sync-editor">
                                      <textarea value={editingSyncPayload} onChange={(event) => setEditingSyncPayload(event.target.value)} aria-label={t("sync.editMerge")} rows={8} />
                                      <div className="account-cloud-actions">
                                        <button type="button" onClick={() => void submitSyncConflictEdit()}>{t("sync.saveMerge")}</button>
                                        <button type="button" onClick={() => setEditingSyncConflict(null)}>{t("sync.cancelMerge")}</button>
                                      </div>
                                    </div>
                                  )}
                                </article>
                              ))}
                            </div>
                          </section>
                        )}
                        {["offline", "error", "retrying", "load-error", "setup-required"].includes(sync.status) && <button className="account-secondary-action" type="button" onClick={retrySync}>{t("settings.cloudRetry")}</button>}
                        {syncDetailKey && <p className="account-cloud-message is-warning" role="status">{t(syncDetailKey)}</p>}
                        {sync.omittedImages > 0 && <p className="account-cloud-message" role="status">{t("settings.cloudImagesOmitted", { count: sync.omittedImages })}</p>}
                        <p className="account-cloud-footnote">{t("settings.cloudTextOnly")}</p>
                      </section>
                      {!accountState.internal && <section
                        className="google-calendar-workspace"
                        aria-labelledby="google-calendar-title"
                        data-google-calendar-status={googleCalendar.status}
                        data-google-calendar-issue={googleCalendar.issue || undefined}
                      >
                        <div className="account-cloud-heading">
                          <div>
                            <h3 id="google-calendar-title">{t("settings.googleCalendarTitle")}</h3>
                            <p>{t("settings.googleCalendarDescription")}</p>
                          </div>
                          <span>{t(googleCalendarStatusKey)}</span>
                        </div>
                        {googleCalendar.lastSyncedAt && <p className="google-calendar-last-sync">{t("settings.googleCalendarLastSync", { time: formatCloudTime(googleCalendar.lastSyncedAt, locale) })}</p>}
                        {googleCalendarIssueKey && <p className="account-cloud-message is-warning" role="status">{t(googleCalendarIssueKey)}</p>}
                        {googleCalendar.managedIssues?.length > 0 && <section className="google-calendar-managed-issues" aria-labelledby="google-calendar-managed-issues-title" data-google-calendar-managed-issues>
                          <h4 id="google-calendar-managed-issues-title">{t("settings.googleCalendarIssuesTitle")}</h4>
                          <div className="google-calendar-managed-issue-list">
                            {googleCalendar.managedIssues.slice(0, 8).map((managedIssue) => {
                              const plan = data.planBlocks.find((item) => String(item.id) === String(managedIssue.planId));
                              return <article className="google-calendar-managed-issue" key={`${managedIssue.planId}:${managedIssue.eventId}`}>
                                <div>
                                  <strong>{plan?.title || managedIssue.planId}</strong>
                                  <p>{t(googleCalendarIssueTextKey[managedIssue.kind] || "settings.googleCalendarRemoteMissing")}</p>
                                </div>
                                <div className="google-calendar-managed-issue-actions">
                                  <button className="account-secondary-action" type="button" disabled={googleCalendarBusy} onClick={() => keepLocalGooglePlan(managedIssue.planId)}>{t("settings.googleCalendarKeepLocal")}</button>
                                  {managedIssue.remote && <button className="account-secondary-action" type="button" disabled={googleCalendarBusy} onClick={() => useGooglePlan(managedIssue.planId)}>{t("settings.googleCalendarUseGoogle")}</button>}
                                </div>
                              </article>;
                            })}
                          </div>
                        </section>}
                        <div className="google-calendar-actions">
                          <button className="account-secondary-action" type="button" disabled={!googleCalendarAvailable || googleCalendarBusy} onClick={googleCalendar.syncNow}>{t(googleCalendarBusy ? "settings.googleCalendarWorking" : googleCalendar.lastSyncedAt ? "settings.googleCalendarSyncNow" : "settings.googleCalendarConnect")}</button>
                          {googleCalendar.lastSyncedAt && <button className="account-secondary-action" type="button" disabled={googleCalendarBusy} onClick={disconnectGoogleCalendar}>{t("settings.googleCalendarDisconnect")}</button>}
                        </div>
                        <p className="account-cloud-footnote">{t("settings.googleCalendarVerificationNote")}</p>
                        <p className="account-cloud-footnote">{t("settings.googleCalendarBoundary")}</p>
                        <a className="google-calendar-privacy-link" href={locale === "zh-CN" ? "/privacy#zh-CN-google-calendar" : "/privacy#en-google-calendar"}>
                          {locale === "zh-CN" ? "查看 Google 数据处理方式" : "How Google data is handled"}
                        </a>
                      </section>}
                      <AgentBridgePanel />
                      <button className="account-secondary-action" type="button" disabled={accountState.status === "signing-out"} onClick={disconnectAccount}>{t(accountState.status === "signing-out" ? "settings.accountSigningOut" : "settings.accountSignOut")}</button>
                    </>
                  ) : (
                    <>
                      <p className="account-form-notice">{t("auth.gateDescription")}</p>
                    </>
                  )}
                  <nav className="account-legal-links" aria-label={locale === "zh-CN" ? "公开文档" : "Public documents"}>
                    <a href="/about">{locale === "zh-CN" ? "关于 Log Note" : "About Log Note"}</a>
                    <a href="/privacy">{locale === "zh-CN" ? "隐私权政策" : "Privacy Policy"}</a>
                    <a href="/terms">{locale === "zh-CN" ? "服务条款" : "Terms of Service"}</a>
                  </nav>
                </div>
              </section>
            )}

            {activePanel === "export" && (
              <section id="export" className="settings-panel settings-section markdown-output" aria-labelledby="markdown-output-title">
                <div className="settings-panel-heading"><span>{t("settings.navDownload")}</span><h2 id="markdown-output-title" tabIndex="-1">{t("settings.downloadTitle")}</h2><p>{t("settings.downloadDescription")}</p></div>
                <section className="settings-action-group settings-record-downloads" aria-labelledby="record-downloads-title">
                  <div className="settings-group-heading"><h3 id="record-downloads-title">{t("settings.recordsGroupTitle")}</h3><p>{t("settings.recordsGroupDescription")}</p></div>
                  <div className="settings-action-list" aria-labelledby="record-downloads-title">
                    <button type="button" data-file-kind="MD" disabled={dataProtected} onClick={() => download(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8", t("toast.exported"))}><Icon name="fileText" /><span><b>{t("settings.downloadToday")}</b><small>{selectedDate.replaceAll("-", "_")}.md</small></span></button>
                    <button type="button" data-file-kind="ALL" disabled={dataProtected} onClick={() => download("log-note-all.md", markdownForAll(data), "text/markdown;charset=utf-8", t("toast.exportedAll"))}><Icon name="book" /><span><b>{t("settings.downloadAll")}</b><small>{t("settings.exportAllDetail")}</small></span></button>
                  </div>
                  <details className="markdown-format-details">
                    <summary><span><b>{t("settings.downloadFormatTitle")}</b><small>{t("settings.downloadFormatDescription")}</small></span><Icon name="chevronDown" /></summary>
                    <div className="markdown-format-toolbar"><p>{t("settings.markdownPlaceholders")}</p><button className="text-button" type="button" disabled={dataProtected} onClick={resetMarkdownSettings}>{t("settings.markdownReset")}</button></div>
                    <div className="markdown-workspace">
                      <div className="markdown-settings-body" aria-disabled={dataProtected}>
                        <label className="markdown-setting-row"><span>{t("settings.markdownLayout")}</span><select disabled={dataProtected} value={data.markdownSettings.layout} onChange={(event) => updateMarkdownSetting("layout", event.target.value)}><option value="grouped">{t("settings.markdownGrouped")}</option><option value="timeline">{t("settings.markdownTimeline")}</option></select></label>
                        {data.markdownSettings.layout === "grouped" && <><label className="markdown-setting-field"><span>{t("settings.markdownDomainHeading")}</span><input disabled={dataProtected} value={data.markdownSettings.domainHeading} onChange={(event) => updateMarkdownSetting("domainHeading", event.target.value)} /></label><label className="markdown-setting-field"><span>{t("settings.markdownCategoryHeading")}</span><input disabled={dataProtected} value={data.markdownSettings.categoryHeading} onChange={(event) => updateMarkdownSetting("categoryHeading", event.target.value)} /></label></>}
                        <label className="markdown-setting-field"><span>{t("settings.markdownEntryLine")}</span><input disabled={dataProtected} value={data.markdownSettings.entryLine} onChange={(event) => updateMarkdownSetting("entryLine", event.target.value)} /></label>
                        <label className="markdown-setting-field"><span>{t("settings.markdownDateHeading")}</span><input disabled={dataProtected} value={data.markdownSettings.allDayHeading} onChange={(event) => updateMarkdownSetting("allDayHeading", event.target.value)} /></label>
                        <label className="markdown-setting-field"><span>{t("settings.markdownDaySeparator")}</span><input disabled={dataProtected} value={data.markdownSettings.daySeparator} onChange={(event) => updateMarkdownSetting("daySeparator", event.target.value)} /></label>
                      </div>
                      <div className="markdown-preview-panel" role="region" aria-labelledby="markdown-preview-title">
                        <div className="markdown-preview-heading"><span id="markdown-preview-title">{t("settings.markdownPreview")}</span><small>{selectedDate}</small></div>
                        <pre className="markdown-preview" tabIndex="0">{markdownForDate(data, selectedDate) || t("settings.markdownEmptyPreview")}</pre>
                      </div>
                    </div>
                  </details>
                </section>
                <section className="settings-action-group settings-backup-downloads" aria-labelledby="backup-downloads-title">
                  <div className="settings-group-heading">
                    <div className="settings-group-title"><h3 id="backup-downloads-title">{t("settings.backupsGroupTitle")}</h3>{!dataProtected && <span className="settings-group-meta">{t("settings.backupsGroupStatus", { records: data.entries.length, images: attachmentSummary.count })}</span>}</div>
                    <p>{dataProtected ? t("settings.localDataRecovery") : t("settings.backupsGroupHint")}</p>
                  </div>
                  <div className="settings-action-list" aria-labelledby="backup-downloads-title">
                    <button type="button" data-file-kind="FULL" disabled={dataProtected} onClick={exportPortableBackup}><Icon name="archive" /><span><span className="settings-action-title"><b>{t("settings.downloadCompleteBackup")}</b><em>{t("settings.recommended")}</em></span><small>{t("settings.exportPortableDetail")}</small></span></button>
                    <button type="button" data-file-kind="JSON" disabled={dataProtected} onClick={() => download(`log-note-backup-${selectedDate}.json`, backupPayload(data), "application/json;charset=utf-8", t("toast.backupExported"))}><Icon name="fileJson" /><span><b>{t("settings.downloadTextBackup")}</b><small>{t("settings.exportJsonDetail")}</small></span></button>
                  </div>
                </section>
                <section id="structure" className="settings-action-group" tabIndex="-1" aria-labelledby="structure-downloads-title">
                  <div className="settings-group-heading"><h3 id="structure-downloads-title">{t("settings.structureGroupTitle")}</h3><p>{t("settings.structureGroupDescription")}</p></div>
                  <div className="settings-action-list" aria-labelledby="structure-downloads-title">
                    <button type="button" data-file-kind="MAP" disabled={dataProtected} onClick={() => download("log-note-structure.json", structurePayload(data), "application/json;charset=utf-8", t("toast.structureExported"))}><Icon name="structure" /><span><b>{t("settings.downloadCurrentStructure")}</b><small>{t("settings.exportStructureDetail")}</small></span></button>
                    <button type="button" data-file-kind="NEW" onClick={() => download("log-note-structure-template.json", generalStructureTemplate(), "application/json;charset=utf-8", t("toast.structureExported"))}><Icon name="template" /><span><b>{t("settings.downloadStarterExample")}</b><small>{t("settings.exportGeneralTemplateDetail")}</small></span></button>
                  </div>
                </section>
              </section>
            )}

            {activePanel === "backup" && (
              <section id="backup" className="settings-panel settings-section protection-section" aria-labelledby="backup-title">
                <div className="settings-panel-heading"><span>{t("settings.navRestore")}</span><h2 id="backup-title" tabIndex="-1">{t("settings.restoreTitle")}</h2><p>{t("settings.restoreDescription")}</p></div>
                {recovery && (
                  <div className="raw-recovery-block" role="alert">
                    <div><h3>{t("settings.recoveryTitle")}</h3><p>{t(rawRecoveryAvailable ? "settings.rawRecoveryDescription" : "settings.rawRecoveryUnavailable")}</p></div>
                    {rawRecoveryAvailable && <button type="button" onClick={() => download(`log-note-recovery-raw-${selectedDate}.txt`, recovery.rawPayload, "text/plain;charset=utf-8", t("toast.rawPayloadExported"))}><Icon name="download" /><span><b>{t("settings.downloadRaw")}</b><small>{t("settings.downloadRawDetail")}</small></span></button>}
                  </div>
                )}
                <section className="settings-action-group daily-import-group" aria-labelledby="daily-import-title">
                  <div className="settings-group-heading"><h3 id="daily-import-title">{t("settings.dailyMarkdownTitle")}</h3><p>{t("settings.dailyMarkdownDescription")}</p></div>
                  <div className="settings-action-list" aria-labelledby="daily-import-title">
                    <button type="button" disabled={dataProtected} onClick={() => dailyMarkdownInputRef.current?.click()}><Icon name="upload" /><span><b>{t("settings.dailyMarkdownAction")}</b><small>{t("settings.dailyMarkdownDetail")}</small></span></button>
                  </div>
                  {pendingDailyImport && (
                    <div className="daily-import-confirmation" role="status">
                      <p>{t("settings.dailyMarkdownConfirm", pendingDailyImport)}</p>
                      <div>
                        <button className="text-button" type="button" onClick={cancelDailyMarkdownImport}>{t("settings.dailyMarkdownCancel")}</button>
                        <button className="primary-button" type="button" onClick={confirmDailyMarkdownImport}>{t("settings.dailyMarkdownConfirmAction", { count: pendingDailyImport.entries })}</button>
                      </div>
                    </div>
                  )}
                </section>
                <section className="settings-action-group restore-group" aria-labelledby="replace-data-title">
                  <div className="settings-group-heading"><h3 id="replace-data-title">{t("settings.restoreReplaceTitle")}</h3><p>{t("settings.restoreReplaceDescription")}</p></div>
                  <div className="restore-warning"><b>{t("settings.restoreWarningTitle")}</b><span>{t("settings.restoreWarningDescription")}</span></div>
                  <div className="settings-action-list">
                    <button className="restore-action" type="button" onClick={() => portableInputRef.current?.click()}><Icon name="upload" /><span><b>{t("settings.restorePortable")}</b><small>{t("settings.restorePortableDetail")}</small></span></button>
                    <button className="restore-action" type="button" onClick={() => fileInputRef.current?.click()}><Icon name="upload" /><span><b>{t("settings.restoreJson")}</b><small>{t("settings.restoreJsonDetail")}</small></span></button>
                  </div>
                </section>
                <input ref={dailyMarkdownInputRef} className="visually-hidden" type="file" multiple accept="text/markdown,text/plain,.md,.markdown" onChange={importDailyMarkdown} />
                <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restoreJson} />
                <input ref={portableInputRef} className="visually-hidden" type="file" accept={`${PORTABLE_BACKUP_MIME},.lnbackup`} onChange={restorePortableBackup} />
                <div className="protection-notes"><p>{t("settings.restoreSafety")}</p></div>
              </section>
            )}

            {activePanel === "storage" && (
              <section id="storage" className="settings-panel settings-section local-section" aria-labelledby="local-title">
                <div className="settings-panel-heading"><span>{t("settings.navImages")}</span><h2 id="local-title" tabIndex="-1">{t("settings.imagesTitle")}</h2><p>{t("settings.imagesDescription")}</p></div>
                <div className="storage-meter-row">
                  <div><h3>{t("settings.imageStorageTitle")}</h3><p>{attachmentSummary.status === "ready" ? t("settings.attachmentStorage", { count: attachmentSummary.count, size: formatAttachmentBytes(attachmentSummary.bytes) }) : attachmentSummary.status === "loading" ? t("settings.attachmentStorageLoading") : t("settings.attachmentStorageUnavailable")}</p></div>
                  <button className="text-button attachment-clean-button" type="button" disabled={dataProtected || attachmentSummary.status !== "ready"} onClick={cleanUnusedAttachments}>{t("settings.cleanAttachments")}<small>{t("settings.cleanAttachmentsDetail")}</small></button>
                </div>
                <div className="storage-boundary-note"><Icon name="inbox" /><div><h3>{t("settings.imagesBoundaryTitle")}</h3><p>{t("settings.imagesBoundaryDescription")}</p></div></div>
              </section>
            )}

            {activePanel === "record-setup" && (
              <section id="record-setup" className="settings-panel settings-section record-setup-section" aria-labelledby="record-setup-title">
                <div className="settings-panel-heading"><span>{t("settings.navRecordSetup")}</span><h2 id="record-setup-title" tabIndex="-1">{t("settings.recordSetupTitle")}</h2><p>{t("settings.recordSetupDescription")}</p></div>
                {dataProtected
                  ? <div className="record-setup-protected" role="alert"><b>{t("settings.recoveryTitle")}</b><p>{t("settings.recordSetupRecoveryBlocked")}</p></div>
                  : <RecordSetupManager embedded />}
              </section>
            )}
          </div>
        </div>
      </div>
      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
