"use client";

/**
 * @fileoverview 管理首页设置分页并渲染语言、导出、恢复与安装操作。
 */

import { useEffect, useRef, useState } from "react";
import { markdownForDate } from "@/lib/data.mjs";
import { DialogSurface } from "./dialog-surface";
import { Icon } from "./ui";

/** Reset to general settings whenever the dialog is opened. */
export function SettingsDialog({
  currentDateLabel,
  data,
  installPrompt,
  locale,
  onClose,
  onExportAll,
  onExportGeneralTemplate,
  onExportJson,
  onExportStructure,
  onExportToday,
  onInstall,
  onLocaleChange,
  onMarkdownReset,
  onMarkdownSettingChange,
  onRestore,
  open,
  selectedDate,
  t
}) {
  const [tab, setTab] = useState("general");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) setTab("general");
  }, [open]);

  if (!open) return null;

  return (
    <DialogSurface onClose={onClose} className="settings-surface" label={`${t("settings.title")} Log Note`}>
      <div className="surface-header settings-header">
        <div><p className="eyebrow">Log Note</p><h2>{t("settings.title")}</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          <button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>{t("settings.general")}</button>
          <button className={tab === "data" ? "active" : ""} onClick={() => setTab("data")}>{t("settings.data")}</button>
        </nav>

        <div className="settings-content">
          {tab === "general" && (
            <section>
              <div className="section-heading"><div><h3>{t("settings.language")}</h3><p>{t("settings.languageDescription")}</p></div></div>
              <label className="preference-row">
                <span>{t("settings.language")}</span>
                <select value={locale} onChange={(event) => onLocaleChange(event.target.value)}>
                  <option value="en">{t("settings.english")}</option>
                  <option value="zh-CN">{t("settings.chinese")}</option>
                </select>
              </label>
            </section>
          )}

          {tab === "data" && (
            <section>
              <div className="section-heading"><div><h3>{t("settings.exportTitle")}</h3><p>{t("settings.exportDescription")}</p></div></div>
              <div className="data-actions">
                <button type="button" onClick={onExportToday}><span className="action-icon"><Icon name="download" /></span><span><b>{t("home.exportCurrent", { date: currentDateLabel })}</b><small>{selectedDate.replaceAll("-", "_")}.md</small></span><Icon name="chevronRight" /></button>
                <button type="button" onClick={onExportAll}><span className="action-icon"><Icon name="book" /></span><span><b>{t("settings.exportAll")}</b><small>{t("settings.exportAllDetail")}</small></span><Icon name="chevronRight" /></button>
                <button type="button" onClick={onExportJson}><span className="action-icon"><Icon name="download" /></span><span><b>{t("settings.exportJson")}</b><small>{t("settings.exportJsonDetail")}</small></span><Icon name="chevronRight" /></button>
                <button type="button" onClick={onExportStructure}><span className="action-icon"><Icon name="download" /></span><span><b>{t("settings.exportStructure")}</b><small>{t("settings.exportStructureDetail")}</small></span><Icon name="chevronRight" /></button>
                <button type="button" onClick={onExportGeneralTemplate}><span className="action-icon"><Icon name="book" /></span><span><b>{t("settings.exportGeneralTemplate")}</b><small>{t("settings.exportGeneralTemplateDetail")}</small></span><Icon name="chevronRight" /></button>
                <button type="button" onClick={() => fileInputRef.current?.click()}><span className="action-icon"><Icon name="upload" /></span><span><b>{t("settings.restoreJson")}</b><small>{t("settings.restoreJsonDetail")}</small></span><Icon name="chevronRight" /></button>
              </div>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={onRestore} />
              <details className="markdown-settings">
                <summary>
                  <span><b>{t("settings.markdownTitle")}</b><small>{t("settings.markdownDescription")}</small></span>
                  <Icon name="chevronRight" />
                </summary>
                <div className="markdown-settings-body">
                  <label className="markdown-setting-row">
                    <span>{t("settings.markdownLayout")}</span>
                    <select value={data.markdownSettings.layout} onChange={(event) => onMarkdownSettingChange("layout", event.target.value)}>
                      <option value="grouped">{t("settings.markdownGrouped")}</option>
                      <option value="timeline">{t("settings.markdownTimeline")}</option>
                    </select>
                  </label>
                  {data.markdownSettings.layout === "grouped" && (
                    <>
                      <label className="markdown-setting-field"><span>{t("settings.markdownDomainHeading")}</span><input value={data.markdownSettings.domainHeading} onChange={(event) => onMarkdownSettingChange("domainHeading", event.target.value)} /></label>
                      <label className="markdown-setting-field"><span>{t("settings.markdownCategoryHeading")}</span><input value={data.markdownSettings.categoryHeading} onChange={(event) => onMarkdownSettingChange("categoryHeading", event.target.value)} /></label>
                    </>
                  )}
                  <label className="markdown-setting-field"><span>{t("settings.markdownEntryLine")}</span><input value={data.markdownSettings.entryLine} onChange={(event) => onMarkdownSettingChange("entryLine", event.target.value)} /></label>
                  <label className="markdown-setting-field"><span>{t("settings.markdownDateHeading")}</span><input value={data.markdownSettings.allDayHeading} onChange={(event) => onMarkdownSettingChange("allDayHeading", event.target.value)} /></label>
                  <label className="markdown-setting-field"><span>{t("settings.markdownDaySeparator")}</span><input value={data.markdownSettings.daySeparator} onChange={(event) => onMarkdownSettingChange("daySeparator", event.target.value)} /></label>
                  <p className="markdown-placeholders">{t("settings.markdownPlaceholders")}</p>
                  <div className="markdown-preview-heading">
                    <span>{t("settings.markdownPreview")}</span>
                    <button className="text-button" type="button" onClick={onMarkdownReset}>{t("settings.markdownReset")}</button>
                  </div>
                  <pre className="markdown-preview">{markdownForDate(data, selectedDate) || t("settings.markdownEmptyPreview")}</pre>
                </div>
              </details>
              <div className="storage-note"><Icon name="check" /><p><b>{t("settings.localFirst")}</b><br />{t("settings.storageNote", { count: data.entries.length })}</p></div>
              {installPrompt ? (
                <button className="primary-button install-button" type="button" onClick={onInstall}>{t("settings.install")}</button>
              ) : (
                <p className="install-tip">{t("settings.installTip")}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </DialogSurface>
  );
}
