import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FIXTURE_URL = new URL("../tests/fixtures/report-api-state.json", import.meta.url);
const EXPECTED_FILENAME = "log-note-2026-08-10.md";

function requireSafeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Report API smoke requires a valid origin URL.");
  }

  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Report API smoke requires HTTPS or loopback HTTP.");
  }
  return url.origin;
}

function requireHeader(response, name, expected) {
  const actual = response.headers.get(name);
  if (actual !== expected) {
    throw new Error(`Report API smoke failed header check: ${name}.`);
  }
}

export async function verifyReportApi(originValue, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Report API smoke requires fetch support.");
  const origin = requireSafeOrigin(originValue);
  const state = JSON.parse(await readFile(FIXTURE_URL, "utf8"));
  const response = await fetchImpl(new URL("/api/reports/download", origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin
    },
    body: JSON.stringify({
      kind: "markdown",
      scope: "date",
      date: "2026-08-10",
      state
    })
  });

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (response.status !== 200) throw new Error(`Report API smoke failed with status ${response.status}.`);
  requireHeader(response, "content-type", "text/markdown; charset=utf-8");
  requireHeader(response, "content-disposition", `attachment; filename="${EXPECTED_FILENAME}"`);
  requireHeader(response, "cache-control", "private, no-store");
  requireHeader(response, "x-content-type-options", "nosniff");
  if (Number(response.headers.get("content-length")) !== bytes.byteLength) {
    throw new Error("Report API smoke failed content-length check.");
  }

  const markdown = new TextDecoder().decode(bytes);
  if (!markdown.includes("synthetic start") || markdown.includes("synthetic end")) {
    throw new Error("Report API smoke failed synthetic date-scope content check.");
  }

  return { status: response.status, filename: EXPECTED_FILENAME, bytes: bytes.byteLength };
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  verifyReportApi(process.argv[2]).then((result) => {
    console.log(`Report API smoke passed (${result.bytes} bytes).`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : "Report API smoke failed.");
    process.exitCode = 1;
  });
}
