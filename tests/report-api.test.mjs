import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, markdownForDate } from "../src/lib/data.mjs";
import { getReportDownload, MAX_REPORT_BODY_BYTES, postReportDownload } from "../src/lib/report-route.mjs";

const URL = "http://localhost:3100/api/reports/download";

function request(body, headers = {}) {
  return new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function byteRequest(bytes, headers = {}) {
  return new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: bytes,
    duplex: "half"
  });
}

function streamingRequest(chunks, { onCancel = () => {}, headers = {} } = {}) {
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) return controller.close();
      controller.enqueue(chunks[index]);
      index += 1;
    },
    cancel(reason) { onCancel(reason); }
  });
  return new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    duplex: "half"
  });
}

test("Route 返回可下载内容、安全缓存头与既有 Markdown 原文", async () => {
  const state = createInitialState();
  const response = await postReportDownload(request({ kind: "markdown", scope: "date", date: "2026-08-11", state }, { origin: "http://localhost:3100" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="log-note-2026-08-11.md"');
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const expected = markdownForDate(state, "2026-08-11");
  assert.equal(Number(response.headers.get("content-length")), new TextEncoder().encode(expected).byteLength);
  assert.equal(await response.text(), expected);
});

test("Content-Length 使用 UTF-8 字节数而不是 JavaScript 字符数", async () => {
  const state = createInitialState();
  state.entries = [{ id: "zh", date: "2026-08-14", time: "09:00", content: "中文正文", categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1 }];
  const response = await postReportDownload(request({ kind: "markdown", scope: "date", date: "2026-08-14", state }));
  const body = await response.text();
  assert.match(body, /中文正文/);
  assert.equal(Number(response.headers.get("content-length")), new TextEncoder().encode(body).byteLength);
  assert.notEqual(Number(response.headers.get("content-length")), body.length);
});

test("Route 接受无 Origin 的本地工具请求并返回结构 JSON", async () => {
  const response = await postReportDownload(request({ kind: "structure-json", scope: "all", state: createInitialState() }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /log-note-structure\.json/);
  assert.equal("entries" in JSON.parse(await response.text()), false);
});

test("Route 统一拒绝跨源、非 JSON、超限、损坏 JSON 和损坏状态", async () => {
  const cases = [
    [request({}, { origin: "https://example.com" }), 403, "REPORT_ORIGIN_FORBIDDEN"],
    [request("plain text", { "content-type": "text/plain" }), 415, "REPORT_CONTENT_TYPE_REQUIRED"],
    [request("{}", { "content-length": String(MAX_REPORT_BODY_BYTES + 1) }), 413, "REPORT_BODY_TOO_LARGE"],
    [request("{broken"), 400, "REPORT_JSON_INVALID"],
    [request({ kind: "markdown", scope: "all", state: { entries: [] } }), 422, "REPORT_STATE_INVALID"]
  ];
  for (const [input, status, code] of cases) {
    const response = await postReportDownload(input);
    assert.equal(response.status, status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(Number(response.headers.get("content-length")), bytes.byteLength);
    assert.equal(JSON.parse(new TextDecoder().decode(bytes)).error.code, code);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});

test("实际读取后的超限请求体也会被拒绝", async () => {
  let cancelled = false;
  const response = await postReportDownload(streamingRequest([
    new Uint8Array(MAX_REPORT_BODY_BYTES),
    new Uint8Array([1]),
    new Uint8Array(64 * 1024)
  ], { onCancel: () => { cancelled = true; } }));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, "REPORT_BODY_TOO_LARGE");
  assert.equal(cancelled, true);
});

test("Route 拒绝空 body 和非法 UTF-8", async () => {
  const empty = await postReportDownload(new Request(URL, { method: "POST", headers: { "content-type": "application/json" } }));
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error.code, "REPORT_JSON_INVALID");

  const invalidUtf8 = await postReportDownload(byteRequest(new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d])));
  assert.equal(invalidUtf8.status, 400);
  assert.equal((await invalidUtf8.json()).error.code, "REPORT_JSON_INVALID");
});

test("Route 拒绝生成结果放大超限", async () => {
  const state = createInitialState();
  state.entries = [{
    id: "amplified", date: "2026-08-14", time: "09:00", content: "x".repeat(100_000), categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, createdAt: 1
  }];
  state.markdownSettings.entryLine = "{{content}}".repeat(30);
  const response = await postReportDownload(request({ kind: "markdown", scope: "all", state }));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, "REPORT_OUTPUT_TOO_LARGE");
});

test("GET 返回 405 和 Allow", async () => {
  const response = getReportDownload();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.equal((await response.json()).error.code, "REPORT_METHOD_NOT_ALLOWED");
});
