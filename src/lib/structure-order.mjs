/**
 * @fileoverview 结构管理页共用的无副作用排序与跨父级移动逻辑。
 */

import { sortByOrder } from "./data.mjs";

function samePlacement(before, after, parentKey) {
  if (before.length !== after.length) return false;
  const next = new Map(after.map((item) => [item.id, item]));
  return before.every((item) => {
    const candidate = next.get(item.id);
    return candidate && candidate.order === item.order && (!parentKey || candidate[parentKey] === item[parentKey]);
  });
}

/** 将每个父组中的 order 压缩为从 0 开始的连续整数。 */
export function compactOrders(items, parentKey = null) {
  const groups = new Map();
  items.forEach((item) => {
    const key = parentKey ? String(item[parentKey] ?? "") : "root";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const normalized = new Map();
  groups.forEach((group) => {
    sortByOrder(group).forEach((item, order) => normalized.set(item.id, { ...item, order }));
  });
  const result = items.map((item) => normalized.get(item.id));
  return samePlacement(items, result, parentKey) ? items : result;
}

/**
 * 移动一个有序条目。overId 为空时追加到目标父组末尾。
 * position 可取 before / after。
 */
export function moveOrderedItem(items, { id, overId = null, parentKey = null, targetParentId = null, position = "before" }) {
  const source = items.find((item) => item.id === id);
  if (!source || id === overId) return items;

  const parentId = parentKey ? String(targetParentId ?? source[parentKey] ?? "") : null;
  const sourceParentId = parentKey ? String(source[parentKey] ?? "") : null;
  const targetItems = sortByOrder(items.filter((item) => item.id !== id && (!parentKey || String(item[parentKey] ?? "") === parentId)));
  let index = overId ? targetItems.findIndex((item) => item.id === overId) : targetItems.length;
  if (index < 0) index = targetItems.length;
  if (overId && position === "after") index += 1;
  targetItems.splice(index, 0, parentKey ? { ...source, [parentKey]: parentId } : source);

  const affectedParents = new Set([sourceParentId, parentId]);
  const orderById = new Map();
  affectedParents.forEach((affectedParent) => {
    const group = affectedParent === parentId
      ? targetItems
      : sortByOrder(items.filter((item) => item.id !== id && (!parentKey || String(item[parentKey] ?? "") === affectedParent)));
    group.forEach((item, order) => orderById.set(item.id, { ...item, order }));
  });

  const result = items.map((item) => orderById.get(item.id) || item);
  return samePlacement(items, result, parentKey) ? items : result;
}

/** 按当前位置向前或向后移动一步。 */
export function moveOrderedItemBy(items, { id, direction, parentKey = null }) {
  const source = items.find((item) => item.id === id);
  if (!source) return items;
  const siblings = sortByOrder(items.filter((item) => !parentKey || item[parentKey] === source[parentKey]));
  const index = siblings.findIndex((item) => item.id === id);
  const target = siblings[index + direction];
  if (!target) return items;
  return moveOrderedItem(items, {
    id,
    overId: target.id,
    parentKey,
    targetParentId: parentKey ? source[parentKey] : null,
    position: direction > 0 ? "after" : "before"
  });
}

/** 移动模板时同步迁移使用该模板的历史记录分类。 */
export function moveStructureItem(state, type, options) {
  if (type === "domain") {
    const domains = moveOrderedItem(state.domains, { ...options, parentKey: null });
    return domains === state.domains ? state : { ...state, domains };
  }
  if (type === "category") {
    const categories = moveOrderedItem(state.categories, { ...options, parentKey: "domainId" });
    return categories === state.categories ? state : { ...state, categories };
  }
  if (type === "template") {
    const source = state.templates.find((item) => item.id === options.id);
    const templates = moveOrderedItem(state.templates, { ...options, parentKey: "categoryId" });
    if (templates === state.templates) return state;
    const moved = templates.find((item) => item.id === options.id);
    const entries = source?.categoryId !== moved?.categoryId
      ? state.entries.map((entry) => entry.templateId === options.id ? { ...entry, categoryId: moved.categoryId } : entry)
      : state.entries;
    return { ...state, templates, entries };
  }
  return state;
}

/** 字段顺序只由数组位置表达。 */
export function moveTemplateField(fields, id, overId) {
  const from = fields.findIndex((item) => item.id === id);
  const to = fields.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return fields;
  const next = [...fields];
  const [field] = next.splice(from, 1);
  next.splice(to, 0, field);
  return next;
}
