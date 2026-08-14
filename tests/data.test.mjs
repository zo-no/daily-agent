/**
 * @fileoverview 验证 v2 层级、迁移、日记种子与导出行为。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  backupPayload,
  composeTemplateContent,
  createInitialState,
  DEFAULT_MARKDOWN_SETTINGS,
  fixedContentParts,
  generalStructureTemplate,
  hasFixedContent,
  hasTemplateContent,
  markdownForAll,
  markdownForDate,
  normalizeState,
  restoreState,
  sanitizeTags,
  shiftDate,
  sortByOrder,
  structurePayload
} from "../src/lib/data.mjs";
import { createDailySeedEntries, ensureDailySeed } from "../src/lib/seed.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate, translate } from "../src/lib/i18n.mjs";
import {
  compactOrders,
  moveOrderedItem,
  moveOrderedItemBy,
  moveStructureItem,
  moveTemplateField
} from "../src/lib/structure-order.mjs";
import { loadStoredState, persistStoredState } from "../src/lib/storage-state.mjs";
import { fixedRecordDraft, fixedRecordEditorMode, fixedRecordSaveResult } from "../src/lib/fixed-record-model.mjs";

const legacyPeriodicBackup = JSON.parse(readFileSync(new URL("./fixtures/legacy-periodic-free-backup.json", import.meta.url), "utf8"));

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    value(key) { return values.get(key); }
  };
}

test("标签会去重并移除井号", () => {
  assert.deepEqual(sanitizeTags("#饮食, 饮食 工作"), ["饮食", "工作"]);
});

test("日期切换跨月正确", () => {
  assert.equal(shiftDate("2026-08-01", -1), "2026-07-31");
});

test("初始结构是领域、分类、模板三级并带显式顺序", () => {
  const state = createInitialState();
  assert.equal(state.version, 3);
  assert.equal(state.structureSchemaVersion, 2);
  assert.deepEqual(state.domains.map((item) => item.id), ["daily-domain", "health-domain", "learning-domain", "trading-domain"]);
  assert.equal(state.categories.find((item) => item.id === "health-food").domainId, "health-domain");
  assert.ok(state.domains.every((item) => Number.isInteger(item.order)));
  assert.ok(state.categories.every((item) => Number.isInteger(item.order)));
  assert.ok(state.templates.every((item) => Number.isInteger(item.order)));
});

test("i18n 默认英文，同时保留自定义名称", () => {
  const state = createInitialState();
  assert.equal(translate("en", "common.today"), "Today");
  assert.equal(localizeDomainName(state.domains.find((item) => item.id === "health-domain"), "en"), "Health");
  assert.equal(localizeCategoryName(state.categories.find((item) => item.id === "daily"), "en"), "Notes");
  assert.equal(localizeCategoryName({ id: "daily", name: "My journal" }, "en"), "My journal");
  const sleep = localizeTemplate(state.templates.find((item) => item.id === "sleep"), "en");
  assert.equal(sleep.name, "Sleep");
  assert.equal(sleep.fields.find((item) => item.id === "duration").label, "Sleep duration");
});

test("模板行为区分线性与周期，并规范三种周期", () => {
  const state = createInitialState();
  assert.equal(state.templates.find((item) => item.id === "quick").recordType, "linear");
  assert.deepEqual(state.templates.find((item) => item.id === "morning-weight").schedule, { cadence: "timepoint", time: "08:00" });
  assert.deepEqual(state.templates.find((item) => item.id === "health-abnormal").schedule, { cadence: "daily" });
  assert.deepEqual(state.templates.find((item) => item.id === "waist").schedule, { cadence: "weekly", weekday: 1 });
});

test("无效周期配置安全回退", () => {
  const state = createInitialState();
  const waist = state.templates.find((item) => item.id === "waist");
  waist.schedule = { cadence: "sometimes", weekday: 99 };
  assert.deepEqual(normalizeState(state).templates.find((item) => item.id === "waist").schedule, { cadence: "daily" });
});

test("单日 Markdown 严格按领域与分类 JSON 顺序导出", () => {
  const state = createInitialState();
  state.entries = [
    { id: "2", date: "2026-08-11", time: "12:20", content: "南瓜粥", categoryId: "health-food", templateId: "meal", tags: ["饮食"], fieldValues: {}, createdAt: 2 },
    { id: "1", date: "2026-08-11", time: "08:28", content: "出发上班", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 }
  ];
  assert.equal(markdownForDate(state, "2026-08-11"), "## 日常\n\n### 记录\n\n- 08:28 出发上班\n\n## 健康\n\n### 饮食\n\n- 12:20 南瓜粥 #饮食\n");
});

test("周期记录按模板顺序而不是填写时间导出", () => {
  const state = createInitialState();
  state.entries = [
    { id: "a", date: "2026-08-11", time: "07:00", content: "异常=无", categoryId: "health-fixed", templateId: "health-abnormal", tags: [], fieldValues: {}, createdAt: 1 },
    { id: "b", date: "2026-08-11", time: "22:00", content: "晨重=66.95kg", categoryId: "health-fixed", templateId: "morning-weight", tags: [], fieldValues: {}, createdAt: 2 }
  ];
  const markdown = markdownForDate(state, "2026-08-11");
  assert.ok(markdown.indexOf("晨重=66.95kg") < markdown.indexOf("异常=无"));
});

test("固定记录按照记录实际所属分类导出", () => {
  const state = createInitialState();
  const learningDomain = state.domains.find((item) => item.id === "learning-domain");
  const learningCategory = state.categories.find((item) => item.domainId === learningDomain.id);
  const fixedTemplate = state.templates.find((item) => item.recordType === "periodic");
  state.entries = [
    { id: "learning-linear", date: "2026-08-13", time: "09:00", content: "学习普通记录", categoryId: learningCategory.id, templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 },
    { id: "learning-fixed", date: "2026-08-13", time: "10:00", content: "学习复盘=完成", categoryId: learningCategory.id, templateId: fixedTemplate.id, tags: [], fieldValues: {}, createdAt: 2 }
  ];

  const daily = markdownForDate(state, "2026-08-13");
  assert.match(daily, new RegExp(`## ${learningDomain.name}[\\s\\S]*### ${learningCategory.name}[\\s\\S]*学习复盘=完成[\\s\\S]*学习普通记录`));
  assert.equal((daily.match(/学习复盘=完成/g) || []).length, 1);
  assert.match(markdownForAll(state), /学习复盘=完成/);
});

test("Markdown 可以切换为带领域占位符的扁平时间线", () => {
  const state = createInitialState();
  state.entries = [{ id: "1", date: "2026-08-11", time: "08:00", content: "出发", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 }];
  state.markdownSettings = { ...DEFAULT_MARKDOWN_SETTINGS, layout: "timeline", entryLine: "{{time}}{{domain}} / {{category}} — {{content}}" };
  assert.equal(markdownForDate(state, "2026-08-11"), "08:00 日常 / 记录 — 出发\n");
});

test("全部 Markdown 使用自定义日期标题和分隔符", () => {
  const state = createInitialState();
  state.entries = [
    { id: "1", date: "2026-08-10", time: "08:00", content: "前一天", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 },
    { id: "2", date: "2026-08-11", time: "09:00", content: "今天", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 2 }
  ];
  state.markdownSettings = { ...DEFAULT_MARKDOWN_SETTINGS, layout: "timeline", entryLine: "{{content}}", allDayHeading: "## Day {{date}}", daySeparator: "***" };
  assert.equal(markdownForAll(state), "## Day 2026-08-10\n\n前一天\n\n***\n\n## Day 2026-08-11\n\n今天\n");
});

test("Markdown 设置允许空字符串并在备份恢复后保持逐字输出", () => {
  const state = createInitialState();
  state.entries = [{ id: "empty-format", date: "2026-08-13", time: "09:00", content: "verbatim", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, createdAt: 1 }];
  state.markdownSettings = { ...DEFAULT_MARKDOWN_SETTINGS, domainHeading: "", categoryHeading: "", entryLine: "{{content}}", allDayHeading: "", daySeparator: "" };
  const before = markdownForAll(state);
  const restored = restoreState(JSON.parse(backupPayload(state)));
  assert.equal(markdownForAll(restored), before);
  assert.equal(before, "verbatim\n");
  assert.deepEqual(restored.markdownSettings, state.markdownSettings);
});

test("今日原始日记只载入 14 条有内容记录且正文不变", () => {
  const entries = createDailySeedEntries();
  assert.equal(entries.length, 14);
  assert.equal(entries[0].sourceLine, "- 08:28 出发上班。");
  assert.equal(entries[5].sourceLine, "- 11:37  现在开始做一下报告");
  assert.equal(entries[5].content, " 现在开始做一下报告");
  assert.equal(entries.some((entry) => entry.time === "13:02"), false);
  assert.equal(entries.some((entry) => entry.content === "晚重=kg"), false);
  assert.equal(entries[7].content, "晨重=66.95kg");
  assert.equal(entries.at(-1).content, "今日市场分化开始，考虑是否撤资等过两个小时后看看");
});

test("种子记录获得正确模板且升级不改正文", () => {
  const state = createInitialState();
  state.seedVersion = 2;
  state.entries = state.entries.map((item) => ({ ...item, templateId: null }));
  const before = state.entries.map((item) => item.content);
  const migrated = ensureDailySeed(state);
  assert.deepEqual(migrated.entries.map((item) => item.content), before);
  assert.equal(migrated.entries.find((item) => item.content.startsWith("晨重=")).templateId, "morning-weight");
  assert.equal(migrated.entries.find((item) => item.content.includes("昨日睡眠")).templateId, "sleep");
  assert.deepEqual(ensureDailySeed(migrated), migrated);
});

test("固定值内容拆分并忽略空值或纯单位", () => {
  assert.deepEqual(fixedContentParts("晨重=66.95kg"), { label: "晨重", value: "66.95kg" });
  assert.equal(hasFixedContent("晨重=66.95kg"), true);
  assert.equal(hasFixedContent("晚重=kg"), false);
});

test("固定记录运行时适配区分 value、structured、legacy free 与不可逆正文", () => {
  const state = restoreState(legacyPeriodicBackup);
  const template = (id) => state.templates.find((item) => item.id === id);
  const entry = (id) => state.entries.find((item) => item.templateId === id);

  assert.equal(template("morning-weight").inputMode, "free");
  assert.equal(fixedRecordEditorMode(template("morning-weight"), entry("morning-weight")), "value");
  assert.equal(fixedRecordDraft(template("morning-weight"), entry("morning-weight")).value, "67.2kg");
  assert.equal(fixedRecordEditorMode(template("legacy-journal"), entry("legacy-journal")), "free");
  assert.equal(fixedRecordEditorMode(template("energy-check"), entry("energy-check")), "structured");
  assert.equal(fixedRecordEditorMode(template("legacy-review"), entry("legacy-review")), "free");

  const customizedBuiltin = { ...template("morning-weight"), inputMode: "free" };
  const customFreeEntry = { ...entry("morning-weight"), content: "今天状态不错，没有称重。" };
  assert.equal(fixedRecordEditorMode(customizedBuiltin, customFreeEntry), "free");
  assert.equal(fixedRecordDraft(customizedBuiltin, customFreeEntry).content, "今天状态不错，没有称重。");
});

test("固定记录保存只改显式编辑内容并保留旧模板形态", () => {
  const state = restoreState(legacyPeriodicBackup);
  const template = (id) => state.templates.find((item) => item.id === id);
  const entry = (id) => state.entries.find((item) => item.templateId === id);

  const value = fixedRecordSaveResult(template("morning-weight"), template("morning-weight"), entry("morning-weight"), { value: "67.6kg" });
  assert.equal(value.content, "晨重=67.6kg");
  const free = fixedRecordSaveResult(template("legacy-journal"), template("legacy-journal"), entry("legacy-journal"), { content: "  Edited verbatim = yes.  " });
  assert.equal(free.content, "  Edited verbatim = yes.  ");
  const structured = fixedRecordSaveResult(template("energy-check"), template("energy-check"), entry("energy-check"), { fieldValues: { energy: "Focused" } });
  assert.deepEqual(structured, { mode: "structured", content: "Energy: Focused", fieldValues: { energy: "Focused" } });
  assert.equal(fixedRecordSaveResult(template("legacy-review"), template("legacy-review"), entry("legacy-review"), { content: "" }).content, "");

  const structuredWithHistoricalField = {
    ...entry("energy-check"),
    fieldValues: { energy: "Calm", removed_private_note: "do not drop" }
  };
  const preserved = fixedRecordSaveResult(template("energy-check"), template("energy-check"), structuredWithHistoricalField, { fieldValues: { energy: "Focused" } });
  assert.deepEqual(preserved.fieldValues, { energy: "Focused", removed_private_note: "do not drop" });
});

test("旧周期备份往返不迁移模板且不改写未编辑正文", () => {
  const restored = restoreState(legacyPeriodicBackup);
  const roundTrip = restoreState(JSON.parse(backupPayload(restored)));
  assert.deepEqual(roundTrip.templates.map(({ id, inputMode }) => ({ id, inputMode })), restored.templates.map(({ id, inputMode }) => ({ id, inputMode })));
  assert.deepEqual(roundTrip.entries.map(({ id, content, fieldValues }) => ({ id, content, fieldValues })), restored.entries.map(({ id, content, fieldValues }) => ({ id, content, fieldValues })));
});

test("固定记录显示状态缺失时默认开启，暂停状态可在完整与结构 JSON 往返", () => {
  const legacy = createInitialState();
  legacy.templates = legacy.templates.map(({ homeVisible, ...template }) => template);
  const normalized = normalizeState(legacy);
  assert.equal(normalized.templates.every((template) => template.homeVisible === true), true);

  normalized.templates = normalized.templates.map((template) => template.id === "morning-weight" ? { ...template, homeVisible: false } : template);
  const restoredBackup = normalizeState(JSON.parse(backupPayload(normalized)));
  const structure = JSON.parse(structurePayload(normalized));
  assert.equal(restoredBackup.templates.find((template) => template.id === "morning-weight").homeVisible, false);
  assert.equal(structure.templates.find((template) => template.id === "morning-weight").homeVisible, false);
  assert.equal(restoredBackup.entries.find((entry) => entry.templateId === "morning-weight").content, normalized.entries.find((entry) => entry.templateId === "morning-weight").content);
});

test("空白模板会被识别", () => {
  assert.equal(hasTemplateContent({ name: "未命名模板", prompt: "", skeleton: "", tags: [], fields: [] }), false);
  assert.equal(hasTemplateContent({ name: "Mood", prompt: "", skeleton: "", tags: [], fields: [] }), true);
});

test("结构化模板按字段顺序组合内容", () => {
  const template = createInitialState().templates.find((item) => item.id === "learn");
  assert.equal(composeTemplateContent(template, { topic: "产品梳理", gain: "分类与模板解耦", next: "移动端验证" }), "学习内容：产品梳理；收获：分类与模板解耦；下一步：移动端验证");
});

test("v1 备份迁移为当前版本，移除万能模板并保留记录", () => {
  const legacy = {
    version: 1, seedVersion: 2, templateSchemaVersion: 1,
    categories: [
      { id: "daily", name: "日常记录", kind: "timeline" },
      { id: "health-fixed", name: "健康 · 固定记录", kind: "fixed" },
      { id: "health-food", name: "健康 · 饮食节奏", kind: "timeline" },
      { id: "health-rest", name: "健康 · 作息与恢复", kind: "timeline" },
      { id: "study", name: "学习", kind: "timeline" },
      { id: "trading", name: "交易 · 今日观察", kind: "timeline" }
    ],
    templates: [
      { id: "quick", name: "随手记", categoryId: "daily", tags: [], prompt: "", skeleton: "", fields: [] },
      { id: "universal", name: "万能记录", categoryId: "daily", tags: [], prompt: "", skeleton: "", fields: [] }
    ],
    entries: [{ id: "e1", date: "2026-08-11", time: "09:00", content: "原文", categoryId: "daily", tags: [], templateId: "universal", fieldValues: {}, createdAt: 1 }]
  };
  const migrated = normalizeState(legacy);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.domains.find((item) => item.id === "health-domain").name, "健康");
  assert.equal(migrated.categories.find((item) => item.id === "health-fixed").name, "身体指标");
  assert.equal(migrated.templates.some((item) => item.id === "universal"), false);
  assert.equal(migrated.entries[0].content, "原文");
  assert.equal(migrated.entries[0].templateId, "quick");
});

test("规范化缺失创建时间的记录时结果幂等", () => {
  const state = createInitialState();
  state.entries = [
    { id: "later", date: "2026-08-11", time: "09:00", content: "第二条", categoryId: "daily", templateId: "quick" },
    { id: "first", date: "2026-08-11", time: "09:00", content: "第一条", categoryId: "daily", templateId: "quick" }
  ];
  const normalized = normalizeState(state);
  assert.deepEqual(normalized.entries.map((item) => item.createdAt), [0, 1]);
  assert.deepEqual(normalizeState(normalized), normalized);
});

test("旧 Markdown 标题字段只在导入时兼容", () => {
  const state = createInitialState();
  state.markdownSettings = {
    parentHeading: "# {{domain}}",
    childHeading: "## {{category}}",
    entryLine: "{{content}}"
  };
  const normalized = normalizeState(state);
  assert.equal(normalized.markdownSettings.domainHeading, "# {{domain}}");
  assert.equal(normalized.markdownSettings.categoryHeading, "## {{category}}");
  assert.equal("parentHeading" in normalized.markdownSettings, false);
  assert.equal("childHeading" in normalized.markdownSettings, false);
  assert.equal("parentHeading" in JSON.parse(backupPayload(state)).markdownSettings, false);
  assert.equal("childHeading" in JSON.parse(structurePayload(state)).markdownSettings, false);
});

test("完整备份包含记录，结构导出不包含记录", () => {
  const state = createInitialState();
  const backup = JSON.parse(backupPayload(state));
  const structure = JSON.parse(structurePayload(state));
  assert.equal(backup.version, 3);
  assert.equal(backup.entries.length, 14);
  assert.equal(structure.schemaVersion, 2);
  assert.equal("entries" in structure, false);
  assert.ok(structure.templates.every((item) => "recordType" in item && "order" in item));
  const general = JSON.parse(generalStructureTemplate());
  assert.equal(general.entries, undefined);
  assert.deepEqual(new Set(general.templates.map((item) => item.inputMode)), new Set(["free", "structured", "value"]));
  assert.deepEqual(new Set(general.templates.flatMap((item) => item.fields.map((field) => field.type))), new Set(["textarea", "text", "select", "rating", "number"]));
  assert.deepEqual(new Set(general.templates.filter((item) => item.recordType === "periodic").map((item) => item.schedule.cadence)), new Set(["daily", "weekly", "timepoint"]));
});

test("备份恢复保留顺序、来源和 Markdown 设置", () => {
  const original = createInitialState();
  original.domains[0].order = 9;
  original.markdownSettings.entryLine = "- [{{domain}}/{{category}}] {{content}}";
  const restored = normalizeState(JSON.parse(backupPayload(original)));
  assert.equal(restored.domains.find((item) => item.id === "daily-domain").order, 9);
  assert.equal(restored.entries[0].source, "2026_08_11.md");
  assert.equal(restored.markdownSettings.entryLine, "- [{{domain}}/{{category}}] {{content}}");
});

test("同组移动会压缩顺序，原位放下不产生新状态", () => {
  const items = [{ id: "a", order: 4 }, { id: "b", order: 9 }, { id: "c", order: 12 }];
  const compacted = compactOrders(items);
  assert.deepEqual(compacted.map((item) => item.order), [0, 1, 2]);
  const moved = moveOrderedItem(compacted, { id: "c", overId: "a" });
  assert.deepEqual([...moved].sort((a, b) => a.order - b.order).map((item) => item.id), ["c", "a", "b"]);
  assert.equal(moveOrderedItem(moved, { id: "c", overId: "a" }), moved);
  const downward = moveOrderedItem(compacted, { id: "a", overId: "b", position: "after" });
  assert.deepEqual([...downward].sort((a, b) => a.order - b.order).map((item) => item.id), ["b", "a", "c"]);
});

test("分类可以跨领域移动，也可以进入空领域", () => {
  const categories = [
    { id: "a", domainId: "one", order: 0 },
    { id: "b", domainId: "one", order: 1 },
    { id: "c", domainId: "two", order: 0 }
  ];
  const moved = moveOrderedItem(categories, { id: "b", overId: "c", parentKey: "domainId", targetParentId: "two" });
  assert.deepEqual(sortByOrder(moved.filter((item) => item.domainId === "two")).map((item) => item.id), ["b", "c"]);
  const empty = moveOrderedItem(moved, { id: "b", parentKey: "domainId", targetParentId: "empty" });
  assert.deepEqual(empty.find((item) => item.id === "b"), { id: "b", domainId: "empty", order: 0 });
});

test("模板跨分类时历史记录一起迁移", () => {
  const state = createInitialState();
  const before = state.entries.find((item) => item.templateId === "quick");
  const next = moveStructureItem(state, "template", { id: "quick", targetParentId: "study" });
  assert.equal(next.templates.find((item) => item.id === "quick").categoryId, "study");
  assert.equal(next.entries.find((item) => item.id === before.id).categoryId, "study");
  assert.equal(next.entries.find((item) => item.id === before.id).content, before.content);
});

test("菜单步进和字段移动使用同一稳定顺序", () => {
  const items = [{ id: "a", group: "x", order: 0 }, { id: "b", group: "x", order: 1 }];
  assert.deepEqual(moveOrderedItemBy(items, { id: "a", direction: 1, parentKey: "group" }).map((item) => item.order), [1, 0]);
  const fields = [{ id: "first" }, { id: "second" }, { id: "third" }];
  assert.deepEqual(moveTemplateField(fields, "third", "first").map((item) => item.id), ["third", "first", "second"]);
  assert.equal(moveTemplateField(fields, "first", "first"), fields);
});

test("损坏的本地 JSON 会保留原始 payload，且不会允许默认数据自动覆盖", () => {
  const key = "log-note:data:v1";
  const rawPayload = "{not valid JSON";
  const storage = fakeStorage({ [key]: rawPayload });
  const result = loadStoredState(storage, key, createInitialState, restoreState);
  assert.equal(result.mode, "recovery-needed");
  assert.equal(result.canPersist, false);
  assert.equal(result.rawPayload, rawPayload);
  const blockedSave = persistStoredState(storage, key, result.state, { allowWrite: result.canPersist });
  assert.equal(blockedSave.blocked, true);
  assert.equal(storage.value(key), rawPayload);
});

test("迁移或恢复异常不会覆盖已保存的 JSON，显式重置才会写入默认数据", () => {
  const key = "log-note:data:v1";
  const rawPayload = JSON.stringify({ categories: [], templates: [], entries: [] });
  const storage = fakeStorage({ [key]: rawPayload });
  const result = loadStoredState(storage, key, createInitialState, restoreState);
  assert.equal(result.mode, "recovery-needed");
  assert.equal(storage.value(key), rawPayload);

  // The caller must make this explicit recovery decision before persistence.
  const reset = persistStoredState(storage, key, createInitialState(), { allowWrite: true });
  assert.equal(reset.ok, true);
  assert.notEqual(storage.value(key), rawPayload);
  assert.equal(JSON.parse(storage.value(key)).version, 3);
});

test("localStorage 写入失败会返回错误且不会改变原始数据", () => {
  const key = "log-note:data:v1";
  const rawPayload = "saved-before-write-error";
  const storage = {
    getItem() { return rawPayload; },
    setItem() { throw new Error("quota exceeded"); }
  };
  const result = persistStoredState(storage, key, createInitialState());
  assert.equal(result.ok, false);
  assert.match(result.error.message, /quota exceeded/);
  assert.equal(storage.getItem(key), rawPayload);
});

test("恢复旧备份时同步升级日记种子", () => {
  const backup = createInitialState();
  backup.seedVersion = 2;
  backup.entries = backup.entries.filter((item) => item.id !== "seed-2026-08-11-18");
  const restored = restoreState(backup);
  assert.equal(restored.seedVersion, 3);
  assert.equal(restored.entries.some((item) => item.id === "seed-2026-08-11-18"), true);
});

test("备份中的重复 ID 会被拒绝", () => {
  [
    ["domains", "domain"],
    ["categories", "category"],
    ["templates", "template"],
    ["entries", "record"]
  ].forEach(([key, label]) => {
    const backup = createInitialState();
    backup[key].push({ ...backup[key][0] });
    assert.throws(() => normalizeState(backup), new RegExp(`duplicate ${label} IDs`));
  });
});

test("纯自定义旧备份不会注入内置模板或日记种子", () => {
  const backup = {
    version: 1,
    seedVersion: 0,
    categories: [{ id: "custom", name: "自定义" }],
    templates: [{ id: "custom-template", name: "自定义模板", categoryId: "custom", fields: [] }],
    entries: []
  };
  const restored = restoreState(backup);
  assert.deepEqual(restored.templates.map((item) => item.id), ["custom-template"]);
  assert.deepEqual(restored.entries, []);
});

test("空备份可以安全恢复，旧版本会迁移，重复 ID 会在替换前被拒绝", () => {
  const empty = createInitialState();
  empty.entries = [];
  assert.deepEqual(restoreState(empty).entries, []);

  const legacy = {
    version: 1,
    seedVersion: 3,
    categories: [{ id: "legacy", name: "旧分类" }],
    templates: [{ id: "legacy-template", name: "旧模板", categoryId: "legacy", fields: [] }],
    entries: []
  };
  assert.equal(restoreState(legacy).version, 3);

  const duplicate = createInitialState();
  duplicate.entries.push({ ...duplicate.entries[0] });
  assert.throws(() => restoreState(duplicate), /duplicate record IDs/);
});
