"use client";

/**
 * @fileoverview 在首页内联填写单值与结构化固定记录。
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fixedRecordDraft } from "@/lib/fixed-record-model.mjs";
import { StructuredFields } from "./templates/structured-fields";
import { Icon } from "./ui";

/** 固定记录保持在当前页面内完成；分类视图可隐藏独立区块标题并嵌入所属分类。 */
export function FixedRecords({ items, onSave, t, embedded = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const [valueDrafts, setValueDrafts] = useState({});
  const [contentDrafts, setContentDrafts] = useState({});
  const [fieldDrafts, setFieldDrafts] = useState({});

  const entrySignature = useMemo(
    () => items.map(({ template, entry }) => `${template.id}:${entry?.id || ""}:${entry?.content || ""}:${JSON.stringify(entry?.fieldValues || {})}`).join("|"),
    [items]
  );
  const completedCount = items.filter(({ entry }) => entry).length;
  const remainingCount = items.length - completedCount;

  useEffect(() => {
    const drafts = items.map((item) => [item.template.id, fixedRecordDraft(item.template, item.entry)]);
    setValueDrafts(Object.fromEntries(drafts.filter(([, draft]) => draft.mode === "value").map(([id, draft]) => [id, draft.value])));
    setContentDrafts(Object.fromEntries(drafts.filter(([, draft]) => draft.mode === "free").map(([id, draft]) => [id, draft.content])));
    setFieldDrafts(Object.fromEntries(drafts.filter(([, draft]) => draft.mode === "structured").map(([id, draft]) => [id, draft.fieldValues])));
  }, [entrySignature]);

  function saveValue(item, draftValue = valueDrafts[item.template.id]) {
    const nextValue = String(draftValue || "").trim();
    const currentValue = fixedRecordDraft(item.template, item.entry).value;
    if (nextValue === currentValue) return;
    onSave(item.template.id, { value: nextValue });
  }

  function saveContent(event, item) {
    event.preventDefault();
    const saved = onSave(item.template.id, { content: contentDrafts[item.template.id] || "" });
    if (saved) setExpandedId(null);
  }

  function saveFields(event, item) {
    event.preventDefault();
    const fields = fieldDrafts[item.template.id] || {};
    const missing = item.displayTemplate.fields.find((field) => field.required && !String(fields[field.id] ?? "").trim());
    const hasAnyValue = Object.values(fields).some((value) => String(value ?? "").trim());
    if (missing && (!item.entry || hasAnyValue)) {
      event.currentTarget.querySelector(`[data-field-id="${CSS.escape(missing.id)}"]`)?.focus();
      return onSave(item.template.id, { fieldValues: fields, missingField: missing });
    }
    if (onSave(item.template.id, { fieldValues: fields })) setExpandedId(null);
  }

  return (
    <section className={`fixed-records view-panel ${embedded ? "fixed-records-embedded" : ""}`} aria-label={t("common.periodicRecords")}>
      {!embedded && <header className="fixed-records-header">
        <h2>{t("common.periodicRecords")}</h2>
        <div className="fixed-records-tools">
          {!!items.length && <span aria-label={t("home.fixedRecordsProgress", { completed: completedCount, remaining: remainingCount })}>
            <strong>{completedCount}/{items.length}</strong>
          </span>}
          <Link href="/templates?focus=periodic">{t("home.adjustFixedRecords")}</Link>
        </div>
      </header>}
      {items.length ? <div className="fixed-records-list">
        {items.map((item) => {
          const mode = fixedRecordDraft(item.template, item.entry).mode;
          return mode === "value" ? (
          <form className="fixed-entry fixed-entry-inline" key={item.template.id} onSubmit={(event) => { event.preventDefault(); event.currentTarget.querySelector("input")?.blur(); }}>
            {!embedded && <span className="fixed-entry-scope">{item.domain}</span>}
            <label className="fixed-entry-label" htmlFor={`fixed-${item.template.id}`}>{item.displayTemplate.name}</label>
            <div className="fixed-inline-control">
              <input
                id={`fixed-${item.template.id}`}
                value={valueDrafts[item.template.id] ?? ""}
                onChange={(event) => setValueDrafts((values) => ({ ...values, [item.template.id]: event.target.value }))}
                onBlur={(event) => saveValue(item, event.currentTarget.value)}
                placeholder={item.displayTemplate.prompt || t("home.recordFixedNow")}
              />
            </div>
          </form>
        ) : (
          <div className={`fixed-entry-block ${expandedId === item.template.id ? "expanded" : ""}`} key={item.template.id}>
            <button className="fixed-entry fixed-entry-expand" type="button" aria-expanded={expandedId === item.template.id} onClick={() => setExpandedId((id) => id === item.template.id ? null : item.template.id)}>
              {!embedded && <span className="fixed-entry-scope">{item.domain}</span>}
              <span className="fixed-entry-label">{item.displayTemplate.name}</span>
              <span className={`fixed-entry-value ${item.entry ? "" : "empty"}`}>{item.entry ? item.entry.content : t("home.fillInline")}</span>
              <Icon name="chevronRight" size={16} />
            </button>
            {expandedId === item.template.id && (
              <form className="fixed-inline-form" onSubmit={(event) => mode === "structured" ? saveFields(event, item) : saveContent(event, item)}>
                {item.displayTemplate.prompt && <p>{item.displayTemplate.prompt}</p>}
                {mode === "structured" ? (
                  <StructuredFields
                    fields={item.displayTemplate.fields}
                    values={fieldDrafts[item.template.id] || {}}
                    onChange={(fieldId, value) => setFieldDrafts((drafts) => ({ ...drafts, [item.template.id]: { ...(drafts[item.template.id] || {}), [fieldId]: value } }))}
                  />
                ) : (
                  <div className="structured-fields">
                    <div className="structured-field">
                      <textarea
                        autoFocus
                        value={contentDrafts[item.template.id] ?? ""}
                        onChange={(event) => setContentDrafts((drafts) => ({ ...drafts, [item.template.id]: event.target.value }))}
                        placeholder={item.displayTemplate.prompt || t("composer.placeholder")}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
                <div className="fixed-inline-actions">
                  <button className="text-button" type="button" onClick={() => setExpandedId(null)}>{t("common.close")}</button>
                  <button className="save-button" type="submit">{t("common.done")}</button>
                </div>
              </form>
            )}
          </div>
        );})}
      </div> : <p className="fixed-records-empty">{t("home.fixedRecordsPaused")}</p>}
    </section>
  );
}
