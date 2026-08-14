"use client";

/**
 * @fileoverview 在独立管理页中提供导出、恢复、Markdown 与安装设置。
 */

import { useEffect, useRef, useState } from "react";
import {
  backupPayload,
  DEFAULT_MARKDOWN_SETTINGS,
  generalStructureTemplate,
  localDate,
  markdownForAll,
  markdownForDate,
  restoreState,
  structurePayload
} from "@/lib/data.mjs";
import { downloadFile } from "../download-file";
import { useI18n } from "../i18n";
import { ManagementHeader } from "../management-header";
import { Icon } from "../ui";
import { useLogNoteData, useToast } from "../use-log-note-data";

export function SettingsPage() {
  const { t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, setData, hydrated, resumePersistence } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [installPrompt, setInstallPrompt] = useState(null);
  const fileInputRef = useRef(null);
  const selectedDate = localDate();

  useEffect(() => {
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    if (!hydrated || !window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, [hydrated]);

  function download(filename, content, mime, message) {
    downloadFile(filename, content, mime);
    setToast(message);
  }

  function updateMarkdownSetting(key, value) {
    setData((state) => ({
      ...state,
      markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS, ...state.markdownSettings, [key]: value }
    }));
  }

  function resetMarkdownSettings() {
    setData((state) => ({ ...state, markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS } }));
    setToast(t("toast.markdownReset"));
  }

  async function restoreJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored = restoreState(JSON.parse(await file.text()));
      if (!window.confirm(t("confirm.restore", { entries: restored.entries.length }))) return;
      resumePersistence();
      setData(restored);
      setToast(t("toast.backupRestored"));
    } catch {
      setToast(t("toast.restoreFailed"));
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("settings.loading")}</p></main>;
  }

  return (
    <main className="management-page settings-page">
      <ManagementHeader backLabel={t("templates.backRecords")} title={t("settings.title")} />
      <div className="management-workspace settings-workspace">
        <section id="export" className="settings-section markdown-output" aria-labelledby="markdown-output-title">
          <div className="section-heading">
            <div><h2 id="markdown-output-title">{t("settings.markdownOutputTitle")}</h2><p>{t("settings.markdownOutputDescription")}</p></div>
          </div>
          <div className="export-actions" aria-label={t("settings.markdownExports")}>
            <button type="button" onClick={() => download(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8", t("toast.exported"))}><Icon name="download" /><span><b>{t("home.exportCurrent", { date: t("common.today") })}</b><small>{selectedDate.replaceAll("-", "_")}.md</small></span></button>
            <button type="button" onClick={() => download("log-note-all.md", markdownForAll(data), "text/markdown;charset=utf-8", t("toast.exportedAll"))}><Icon name="book" /><span><b>{t("settings.exportAll")}</b><small>{t("settings.exportAllDetail")}</small></span></button>
          </div>
          <div className="section-heading markdown-section-heading">
            <div><h2 id="markdown-title">{t("settings.markdownTitle")}</h2><p>{t("settings.markdownDescription")}</p></div>
            <button className="text-button" type="button" onClick={resetMarkdownSettings}>{t("settings.markdownReset")}</button>
          </div>
          <div className="markdown-workspace">
            <div className="markdown-settings-body">
              <label className="markdown-setting-row"><span>{t("settings.markdownLayout")}</span><select value={data.markdownSettings.layout} onChange={(event) => updateMarkdownSetting("layout", event.target.value)}><option value="grouped">{t("settings.markdownGrouped")}</option><option value="timeline">{t("settings.markdownTimeline")}</option></select></label>
              {data.markdownSettings.layout === "grouped" && <><label className="markdown-setting-field"><span>{t("settings.markdownDomainHeading")}</span><input value={data.markdownSettings.domainHeading} onChange={(event) => updateMarkdownSetting("domainHeading", event.target.value)} /></label><label className="markdown-setting-field"><span>{t("settings.markdownCategoryHeading")}</span><input value={data.markdownSettings.categoryHeading} onChange={(event) => updateMarkdownSetting("categoryHeading", event.target.value)} /></label></>}
              <label className="markdown-setting-field"><span>{t("settings.markdownEntryLine")}</span><input value={data.markdownSettings.entryLine} onChange={(event) => updateMarkdownSetting("entryLine", event.target.value)} /></label>
              <label className="markdown-setting-field"><span>{t("settings.markdownDateHeading")}</span><input value={data.markdownSettings.allDayHeading} onChange={(event) => updateMarkdownSetting("allDayHeading", event.target.value)} /></label>
              <label className="markdown-setting-field"><span>{t("settings.markdownDaySeparator")}</span><input value={data.markdownSettings.daySeparator} onChange={(event) => updateMarkdownSetting("daySeparator", event.target.value)} /></label>
              <p className="markdown-placeholders">{t("settings.markdownPlaceholders")}</p>
            </div>
            <div className="markdown-preview-panel">
              <div className="markdown-preview-heading"><span>{t("settings.markdownPreview")}</span><small>{selectedDate}</small></div>
              <pre className="markdown-preview">{markdownForDate(data, selectedDate) || t("settings.markdownEmptyPreview")}</pre>
            </div>
          </div>
        </section>

        <section className="settings-section protection-section" aria-labelledby="backup-title">
          <div className="section-heading"><div><h2 id="backup-title">{t("settings.backupTitle")}</h2><p>{t("settings.backupStatusDetail", { count: data.entries.length })}</p></div></div>
          <div className="compact-actions">
            <button type="button" onClick={() => download(`log-note-backup-${selectedDate}.json`, backupPayload(data), "application/json;charset=utf-8", t("toast.backupExported"))}><span><b>{t("settings.exportJson")}</b><small>{t("settings.exportJsonDetail")}</small></span><Icon name="download" /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()}><span><b>{t("settings.restoreJson")}</b><small>{t("settings.restoreJsonDetail")}</small></span><Icon name="upload" /></button>
          </div>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restoreJson} />
          <div className="protection-notes"><p>{t("settings.backupRisk")}</p><p>{t("settings.restoreSafety")}</p></div>
        </section>

        <section id="structure" className="settings-section anchor-section" aria-labelledby="structure-export-title">
          <div className="section-heading"><div><h2 id="structure-export-title">{t("settings.structureTitle")}</h2><p>{t("settings.structureDescription")}</p></div></div>
          <div className="compact-actions">
            <button type="button" onClick={() => download("log-note-structure.json", structurePayload(data), "application/json;charset=utf-8", t("toast.structureExported"))}><span><b>{t("settings.exportStructure")}</b><small>{t("settings.exportStructureDetail")}</small></span><Icon name="download" /></button>
            <button type="button" onClick={() => download("log-note-structure-template.json", generalStructureTemplate(), "application/json;charset=utf-8", t("toast.structureExported"))}><span><b>{t("settings.exportGeneralTemplate")}</b><small>{t("settings.exportGeneralTemplateDetail")}</small></span><Icon name="book" /></button>
          </div>
        </section>

        <section className="settings-section local-section" aria-labelledby="local-title">
          <div className="section-heading"><div><h2 id="local-title">{t("settings.localTitle")}</h2><p>{t("settings.storageNote", { count: data.entries.length })}</p></div></div>
          {installPrompt ? <button className="primary-button install-button" type="button" onClick={installApp}>{t("settings.install")}</button> : <p className="install-tip"><b>{t("settings.localFirst")}</b><br />{t("settings.installTip")}</p>}
        </section>
      </div>
      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </main>
  );
}
