/**
 * @fileoverview Validates report HTTP requests and returns bounded, non-cacheable downloads.
 */

import { ReportRequestError, createReportDownload } from "./report-export.mjs";

export const MAX_REPORT_BODY_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};

function errorResponse(status, code, message, extraHeaders = {}) {
  const body = encoder.encode(JSON.stringify({ error: { code, message } }));
  return new Response(body, {
    status,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(body.byteLength),
      ...extraHeaders
    }
  });
}

function hasJsonContentType(request) {
  const contentType = request.headers.get("content-type") || "";
  return /^application\/json(?:\s*;|$)/i.test(contentType);
}

function hasAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** Reads a bounded UTF-8 JSON request body without accepting partial or oversized payloads. */
async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BODY_BYTES) {
    throw new ReportRequestError("REPORT_BODY_TOO_LARGE", "request body exceeds 1 MiB", 413);
  }

  if (!request.body) {
    throw new ReportRequestError("REPORT_JSON_INVALID", "request body must contain valid UTF-8 JSON", 400);
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REPORT_BODY_BYTES) {
        await reader.cancel("report request body too large").catch(() => undefined);
        throw new ReportRequestError("REPORT_BODY_TOO_LARGE", "request body exceeds 1 MiB", 413);
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ReportRequestError) throw error;
    throw new ReportRequestError("REPORT_JSON_INVALID", "request body must contain valid UTF-8 JSON", 400);
  } finally {
    reader.releaseLock();
  }
}

/** Reads, validates, and converts one bounded report POST request into a download. */
export async function postReportDownload(request) {
  if (!hasAllowedOrigin(request)) {
    return errorResponse(403, "REPORT_ORIGIN_FORBIDDEN", "cross-origin report downloads are not allowed");
  }
  if (!hasJsonContentType(request)) {
    return errorResponse(415, "REPORT_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json");
  }

  try {
    const input = await readJsonBody(request);
    const report = createReportDownload(input);
    const body = encoder.encode(report.body);
    return new Response(body, {
      status: 200,
      headers: {
        ...BASE_HEADERS,
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Content-Length": String(body.byteLength)
      }
    });
  } catch (error) {
    if (error instanceof ReportRequestError) {
      return errorResponse(error.status, error.code, error.message);
    }
    return errorResponse(500, "REPORT_INTERNAL_ERROR", "report generation failed");
  }
}

export function getReportDownload() {
  return errorResponse(405, "REPORT_METHOD_NOT_ALLOWED", "use POST to download a report", { Allow: "POST" });
}
