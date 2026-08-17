"use client";

/**
 * @fileoverview 按当前日期和语言派生首页时间线、周期记录与分类分组。
 */

import { useMemo } from "react";
import { localizeCategoryName, localizeDomainName, localizeTemplate } from "@/lib/i18n.mjs";

/** 只从记录状态派生首页展示模型，不拥有写入动作。 */
export function useHomeRecordModel(data, selectedDate, locale) {
  const domainMap = useMemo(() => new Map(data.domains.map((item) => [item.id, item])), [data.domains]);
  const categoryMap = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories]);
  const templateMap = useMemo(() => new Map(data.templates.map((item) => [item.id, item])), [data.templates]);
  const localizedTemplates = useMemo(() => {
    const domainOrder = new Map(data.domains.map((item) => [item.id, item.order]));
    const categoryOrder = new Map(data.categories.map((item) => [item.id, item.order]));
    const categoryDomain = new Map(data.categories.map((item) => [item.id, item.domainId]));
    return [...data.templates].sort((a, b) => {
      const domainDifference = (domainOrder.get(categoryDomain.get(a.categoryId)) || 0) - (domainOrder.get(categoryDomain.get(b.categoryId)) || 0);
      const categoryDifference = (categoryOrder.get(a.categoryId) || 0) - (categoryOrder.get(b.categoryId) || 0);
      return domainDifference || categoryDifference || (a.order || 0) - (b.order || 0);
    }).map((template) => localizeTemplate(template, locale));
  }, [data.templates, data.categories, data.domains, locale]);
  const dateEntries = useMemo(
    () => data.entries
      .filter((entry) => entry.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time) || b.createdAt - a.createdAt),
    [data.entries, selectedDate]
  );
  const timelineEntries = useMemo(
    () => dateEntries.filter((entry) => templateMap.get(entry.templateId)?.recordType !== "periodic"),
    [dateEntries, templateMap]
  );
  const periodicTemplates = useMemo(
    () => localizedTemplates.filter((template) => template.recordType === "periodic" && template.homeVisible !== false),
    [localizedTemplates]
  );
  const periodicEntryMap = useMemo(() => {
    const entries = new Map();
    dateEntries.forEach((entry) => {
      if (templateMap.get(entry.templateId)?.recordType === "periodic" && entry.content.trim() && !entries.has(entry.templateId)) {
        entries.set(entry.templateId, entry);
      }
    });
    return entries;
  }, [dateEntries, templateMap]);
  const periodicItems = useMemo(() => periodicTemplates.map((displayTemplate) => {
    const template = templateMap.get(displayTemplate.id);
    const entry = periodicEntryMap.get(template.id);
    const categoryId = entry?.categoryId || template.categoryId;
    const category = categoryMap.get(categoryId);
    return {
      template,
      displayTemplate,
      entry,
      domain: localizeDomainName(domainMap.get(category?.domainId), locale),
      categoryId
    };
  }), [periodicTemplates, periodicEntryMap, templateMap, categoryMap, domainMap, locale]);
  const categoryGroups = useMemo(() => data.domains
    .map((domain) => {
      const categories = data.categories
        .filter((category) => category.domainId === domain.id)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map((category) => {
          const entries = timelineEntries.filter((entry) => entry.categoryId === category.id);
          const categoryPeriodicItems = periodicItems.filter((item) => item.categoryId === category.id);
          return {
            id: category.id,
            name: localizeCategoryName(category, locale),
            entries,
            periodicItems: categoryPeriodicItems,
            periodicCompletedCount: categoryPeriodicItems.filter((item) => item.entry).length
          };
        })
        .filter((category) => category.entries.length || category.periodicItems.length);
      return { id: domain.id, name: localizeDomainName(domain, locale), categories };
    })
    .filter((domain) => domain.categories.length), [data.domains, data.categories, timelineEntries, periodicItems, locale]);

  return {
    categoryGroups,
    categoryMap,
    domainMap,
    localizedTemplates,
    periodicEntryMap,
    periodicItems,
    templateMap,
    timelineEntries
  };
}
