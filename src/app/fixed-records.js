"use client";

/**
 * @fileoverview 在首页内联填写单值与结构化固定记录。
 */

import { useEffect, useMemo, useState } from "react";
import { fixedRecordDraft } from "@/lib/fixed-record-model.mjs";
import { StructuredFields } from "./_components/recording";
import { Icon } from "./ui";

/** 固定记录保持在当前页面内完成；分类视图可隐藏独立区块标题并嵌入所属分类。 */
export function FixedRecords({ items, groups = null, onSave, onRegisterRailSection, t, embedded = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const [valueDrafts, setValueDrafts] = useState({});
  const [contentDrafts, setContentDrafts] = useState({});
  const [fieldDrafts, setFieldDrafts] = useState({});

  const entrySignature = useMemo(
    () => items.map(({ template, entry }) => `${template.id}:${entry?.id || ""}:${entry?.content || ""}:${JSON.stringify(entry?.fieldValues || {})}`).join("|"),
    [items]
  );
  const itemGroups = useMemo(() => {
    if (embedded) return [{ id: "embedded", name: "", items }];
    if (groups) return groups;
    const groupList = [];
    const byDomain = new Map();
    items.forEach((item) => {
      const id = item.domainId || `domain:${item.domain || ""}`;
      let group = byDomain.get(id);
      if (!group) {
        group = { id, name: item.domain || t("common.uncategorized"), items: [] };
        byDomain.set(id, group);
        groupList.push(group);
      }
      group.items.push(item);
    });
    return groupList;
  }, [embedded, groups, items, t]);

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

  function renderItem(item) {
    const mode = fixedRecordDraft(item.template, item.entry).mode;
    return mode === "value" ? (
      <form className="fixed-entry fixed-entry-inline" key={item.template.id} onSubmit={(event) => { event.preventDefault(); event.currentTarget.querySelector("input")?.blur(); }}>
        {!embedded && <span className="visually-hidden">{item.domain} · {item.category}</span>}
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
          {!embedded && <span className="visually-hidden">{item.domain} · {item.category}</span>}
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
    );
  }

  return (
    <section className={`fixed-records view-panel ${embedded ? "fixed-records-embedded" : ""}`} aria-label={t("common.periodicRecords")}>
      {items.length ? itemGroups.map((group) => (
        <section
          className="fixed-records-domain"
          id={!embedded ? `timeline-fixed-domain-${group.id}` : undefined}
          aria-labelledby={!embedded ? `timeline-fixed-domain-heading-${group.id}` : undefined}
          key={group.id}
        >
          {!embedded && <header className="fixed-records-header fixed-records-header-tools-only" data-rail-anchor ref={(node) => onRegisterRailSection?.(`timeline:domain:${group.id}`, node)}>
            <h2 className="visually-hidden" id={`timeline-fixed-domain-heading-${group.id}`}>{group.name}</h2>
            <div className="fixed-records-tools">
              <span aria-label={t("home.fixedRecordsProgress", { completed: group.items.filter(({ entry }) => entry).length, remaining: group.items.filter(({ entry }) => !entry).length })}>
                <strong>{group.items.filter(({ entry }) => entry).length}/{group.items.length}</strong>
              </span>
            </div>
          </header>}
          <div className="fixed-records-list">{group.items.map(renderItem)}</div>
        </section>
      )) : <>
        <p className="fixed-records-empty">{t("home.fixedRecordsPaused")}</p>
      </>}
    </section>
  );
}
