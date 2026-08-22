"use client";

/**
 * @fileoverview 管理首页记录搜索查询并渲染搜索结果弹窗。
 */

import { useMemo, useState } from "react";
import { localizeCategoryName } from "@/lib/i18n.mjs";
import { compactDateLabel } from "./date-label";
import { MarkdownContent } from "./markdown-content";
import { Icon } from "./ui";

/** Keep query state while the dialog is closed and reopened. */
export function SearchDialog({ embedded = false, open, entries, categoryMap, locale, onClose, onSelect, t }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? entries.filter((entry) => {
        const category = localizeCategoryName(categoryMap.get(entry.categoryId), locale);
        return [entry.content, entry.tags.join(" "), category, entry.date, entry.time].join(" ").toLowerCase().includes(normalizedQuery);
      })
      : entries;
    return matches
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, normalizedQuery ? 80 : 40);
  }, [categoryMap, entries, locale, query]);

  if (!open) return null;

  const content = (
    <div className="search-workspace-content">
      <div className="search-field">
        <Icon name="search" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search.placeholder")} />
        <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
      </div>
      <div className="search-results">
        <p className="result-count">{query ? t("search.results", { count: results.length }) : t("search.recent")}</p>
        {results.length ? results.map((entry) => (
          <button type="button" className="search-result" key={entry.id} onClick={() => onSelect(entry)}>
            <span className="result-date">{compactDateLabel(entry.date, locale, t)}<small>{entry.time}</small></span>
            <span><b><MarkdownContent content={entry.content} compact /></b><small>{localizeCategoryName(categoryMap.get(entry.categoryId), locale)}{entry.tags.length ? ` · ${entry.tags.map((tag) => `#${tag}`).join(" ")}` : ""}{entry.attachments?.length ? <span className="attachment-search-meta"> · {t("attachments.count", { count: entry.attachments.length })}</span> : null}</small></span>
          </button>
        )) : <div className="mini-empty"><Icon name="inbox" /><p>{t("search.empty")}</p></div>}
      </div>
    </div>
  );
  return embedded
    ? <section className="search-surface search-workspace" aria-label={t("search.label")}>{content}</section>
    : <div className="search-surface">{content}</div>;
}
