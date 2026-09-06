import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const clientSourcePath = new URL("../src/app/google-calendar-client.js", import.meta.url);
const modelSourcePath = new URL("../src/lib/google-calendar-model.mjs", import.meta.url);

let clientPromise;
async function loadClient() {
  if (!clientPromise) {
    const source = await readFile(clientSourcePath, "utf8");
    const modelImport = JSON.stringify(pathToFileURL(modelSourcePath.pathname).href);
    const rewritten = source.replace('from "@/lib/google-calendar-model.mjs"', `from ${modelImport}`);
    clientPromise = import(`data:text/javascript;base64,${Buffer.from(rewritten).toString("base64")}`);
  }
  return clientPromise;
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("Calendar client follows paginated bounded full-sync and incremental query shapes", async () => {
  const client = await loadClient();
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? jsonResponse({ items: [{ id: "event-1" }], nextPageToken: "page-2" })
      : jsonResponse({ items: [{ id: "event-2" }], nextSyncToken: "cursor-1" });
  };
  try {
    const full = await client.listGoogleEventsInRangeWithSyncToken("access-token", {
      timeMin: "2026-09-01T00:00:00.000Z",
      timeMax: "2026-09-10T00:00:00.000Z"
    });
    assert.deepEqual(full.events.map((event) => event.id), ["event-1", "event-2"]);
    assert.equal(full.nextSyncToken, "cursor-1");
    const firstUrl = new URL(calls[0].url);
    assert.equal(firstUrl.searchParams.get("timeMin"), "2026-09-01T00:00:00.000Z");
    assert.equal(firstUrl.searchParams.get("timeMax"), "2026-09-10T00:00:00.000Z");
    assert.equal(firstUrl.searchParams.get("showDeleted"), "true");
    assert.equal(firstUrl.searchParams.get("singleEvents"), "true");
    assert.equal(new URL(calls[1].url).searchParams.get("pageToken"), "page-2");
    assert.equal(calls[0].options.headers.Authorization, "Bearer access-token");

    calls.length = 0;
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({ items: [{ id: "event-delta" }], nextSyncToken: "cursor-2" });
    };
    const delta = await client.listGoogleEventsIncremental("access-token", "cursor-1");
    assert.deepEqual(delta, { events: [{ id: "event-delta" }], nextSyncToken: "cursor-2" });
    const deltaUrl = new URL(calls[0].url);
    assert.equal(deltaUrl.searchParams.get("syncToken"), "cursor-1");
    assert.equal(deltaUrl.searchParams.get("showDeleted"), "true");
    assert.equal(deltaUrl.searchParams.get("singleEvents"), "true");
    assert.equal(deltaUrl.searchParams.has("timeMin"), false);
    assert.equal(deltaUrl.searchParams.has("timeMax"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Calendar client maps cursor expiry and sends etag preconditions for managed writes", async () => {
  const client = await loadClient();
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return jsonResponse({ error: { message: "expired", errors: [{ reason: "fullSyncRequired" }] } }, 410);
    return jsonResponse({ id: "event-1", etag: "etag-2" });
  };
  try {
    await assert.rejects(
      () => client.listGoogleEventsIncremental("access-token", "expired-cursor"),
      (error) => error.code === "sync-token-expired" && error.status === 410
    );
    await client.updateGoogleEvent("access-token", "event-1", { summary: "Updated" }, "etag-1");
    await client.deleteGoogleEvent("access-token", "event-1", "etag-2");
    assert.equal(calls[1].options.headers["If-Match"], "etag-1");
    assert.equal(calls[2].options.headers["If-Match"], "etag-2");
    assert.equal(calls[1].options.method, "PATCH");
    assert.equal(calls[2].options.method, "DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
