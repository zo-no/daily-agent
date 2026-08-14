/**
 * @fileoverview 验证 v2 层级、迁移、日记种子与导出行为。
 */

import test from "node:test";
import assert from "node:assert/strict";
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
  structurePayload
} from "../src/lib/data.mjs";
import { createDailySeedEntries, ensureDailySeed } from "../src/lib/seed.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate, translate } from "../src/lib/i18n.mjs";

test("标签会去重并移除井号", () => {
  assert.deepEqual(sanitizeTags("#饮食, 饮食 工作"), ["饮食", "工作"]);
});

test("日期切换跨月正确", () => {
  assert.equal(shiftDate("2026-08-01", -1), "2026-07-31");
});

test("初始结构是领域、分类、模板三级并带显式顺序", () => {
  const state = createInitialState();
  assert.equal(state.version, 2);
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

test("空白模板会被识别", () => {
  assert.equal(hasTemplateContent({ name: "未命名模板", prompt: "", skeleton: "", tags: [], fields: [] }), false);
  assert.equal(hasTemplateContent({ name: "Mood", prompt: "", skeleton: "", tags: [], fields: [] }), true);
});

test("结构化模板按字段顺序组合内容", () => {
  const template = createInitialState().templates.find((item) => item.id === "learn");
  assert.equal(composeTemplateContent(template, { topic: "产品梳理", gain: "分类与模板解耦", next: "移动端验证" }), "学习内容：产品梳理；收获：分类与模板解耦；下一步：移动端验证");
});

test("v1 备份迁移为 v2，移除万能模板并保留记录", () => {
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
  assert.equal(migrated.version, 2);
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
  assert.equal(backup.version, 2);
  assert.equal(backup.entries.length, 14);
  assert.equal(structure.schemaVersion, 2);
  assert.equal("entries" in structure, false);
  assert.ok(structure.templates.every((item) => "recordType" in item && "order" in item));
  assert.equal(JSON.parse(generalStructureTemplate()).entries, undefined);
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
