import test from "node:test";
import assert from "node:assert/strict";
import {
  backupPayload,
  createInitialState,
  markdownForAll,
  markdownForDate,
  structurePayload
} from "../src/lib/data.mjs";
import { MAX_REPORT_RESPONSE_BYTES, ReportRequestError, createReportDownload, isRealDate } from "../src/lib/report-export.mjs";

function fixtureState() {
  const state = createInitialState();
  state.entries = [
    { id: "before", date: "2026-08-09", time: "08:00", content: "before", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 },
    { id: "start", date: "2026-08-10", time: "09:00", content: "start", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 2 },
    { id: "end", date: "2026-08-12", time: "10:00", content: "end", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 3 },
    { id: "after", date: "2026-08-13", time: "11:00", content: "after", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 4 }
  ];
  return state;
}

test("日期校验拒绝伪日期并接受闰日", () => {
  assert.equal(isRealDate("2024-02-29"), true);
  assert.equal(isRealDate("2026-02-29"), false);
  assert.equal(isRealDate("2026-13-01"), false);
  assert.equal(isRealDate("2026-8-01"), false);
});

test("单日与全部 Markdown 逐字复用现有客户端导出语义", () => {
  const state = fixtureState();
  const date = createReportDownload({ kind: "markdown", scope: "date", date: "2026-08-10", state });
  const all = createReportDownload({ kind: "markdown", scope: "all", state });
  assert.equal(date.body, markdownForDate(state, "2026-08-10"));
  assert.equal(all.body, markdownForAll(state));
  assert.deepEqual({ filename: date.filename, contentType: date.contentType }, {
    filename: "log-note-2026-08-10.md",
    contentType: "text/markdown; charset=utf-8"
  });
});

test("正常 grouped date、range、all 不会被输出预算误拒绝", () => {
  const state = fixtureState();
  state.markdownSettings.layout = "grouped";
  const reports = [
    createReportDownload({ kind: "markdown", scope: "date", date: "2026-08-10", state }),
    createReportDownload({ kind: "markdown", scope: "range", startDate: "2026-08-10", endDate: "2026-08-12", state }),
    createReportDownload({ kind: "markdown", scope: "all", state })
  ];
  assert.equal(reports.every((report) => report.byteLength > 0 && report.byteLength <= MAX_REPORT_RESPONSE_BYTES), true);
});

test("范围 Markdown 包含首尾日期并排除范围外记录", () => {
  const state = fixtureState();
  const report = createReportDownload({
    kind: "markdown", scope: "range", startDate: "2026-08-10", endDate: "2026-08-12", state
  });
  assert.match(report.body, /start/);
  assert.match(report.body, /end/);
  assert.doesNotMatch(report.body, /before|after/);
  assert.equal(report.filename, "log-note-2026-08-10-to-2026-08-12.md");
});

test("完整备份只允许全量且结构导出不含 entries", () => {
  const state = fixtureState();
  const backup = createReportDownload({ kind: "backup-json", scope: "all", state }, { now: new Date("2026-08-14T03:00:00Z") });
  const structure = createReportDownload({ kind: "structure-json", scope: "all", state });
  assert.equal(backup.filename, "log-note-backup-2026-08-14.json");
  const apiBackup = JSON.parse(backup.body);
  const clientBackup = JSON.parse(backupPayload(state));
  assert.match(apiBackup.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
  delete apiBackup.exportedAt;
  delete clientBackup.exportedAt;
  assert.deepEqual(apiBackup, clientBackup);
  assert.deepEqual(JSON.parse(structure.body), JSON.parse(structurePayload(state)));
  assert.equal("entries" in JSON.parse(structure.body), false);
  assert.throws(
    () => createReportDownload({ kind: "backup-json", scope: "date", date: "2026-08-10", state }),
    (error) => error instanceof ReportRequestError && error.code === "REPORT_REQUEST_INVALID"
  );
});

test("契约拒绝未知类型、反向范围、伪日期和损坏状态", () => {
  const state = fixtureState();
  const invalidRequests = [
    { kind: "pdf", scope: "all", state },
    { kind: "markdown", scope: "date", date: "2026-02-30", state },
    { kind: "markdown", scope: "range", startDate: "2026-08-12", endDate: "2026-08-10", state }
  ];
  invalidRequests.forEach((input) => assert.throws(
    () => createReportDownload(input),
    (error) => error instanceof ReportRequestError && error.code === "REPORT_REQUEST_INVALID"
  ));
  assert.throws(
    () => createReportDownload({ kind: "markdown", scope: "all", state: { entries: [] } }),
    (error) => error instanceof ReportRequestError && error.code === "REPORT_STATE_INVALID" && error.status === 422
  );
});

test("Markdown、备份与结构 JSON 均受 UTF-8 输出预算约束", () => {
  const markdownState = fixtureState();
  markdownState.markdownSettings.entryLine = "{{content}}".repeat(20);
  assert.throws(
    () => createReportDownload({ kind: "markdown", scope: "all", state: markdownState }, { maxResponseBytes: 100 }),
    (error) => error instanceof ReportRequestError && error.code === "REPORT_OUTPUT_TOO_LARGE" && error.status === 413
  );

  const jsonState = fixtureState();
  jsonState.entries[0].content = "中文".repeat(MAX_REPORT_RESPONSE_BYTES / 2);
  for (const kind of ["backup-json", "structure-json"]) {
    const state = kind === "structure-json"
      ? { ...jsonState, templates: jsonState.templates.map((template, index) => index === 0 ? { ...template, prompt: "中文".repeat(MAX_REPORT_RESPONSE_BYTES / 2) } : template) }
      : jsonState;
    assert.throws(
      () => createReportDownload({ kind, scope: "all", state }),
      (error) => error instanceof ReportRequestError && error.code === "REPORT_OUTPUT_TOO_LARGE" && error.status === 413
    );
  }
});
