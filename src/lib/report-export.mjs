/**
 * @fileoverview Stateless report download contract built on Log Note's existing exports.
 */

import {
  backupPayload,
  markdownForAll,
  markdownForDate,
  normalizeState,
  structurePayload
} from "./data.mjs";

const REPORT_KINDS = new Set(["markdown", "backup-json", "structure-json"]);
const MARKDOWN_SCOPES = new Set(["date", "range", "all"]);
export const MAX_REPORT_RESPONSE_BYTES = 2 * 1024 * 1024;

const encoder = new TextEncoder();

export class ReportRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ReportRequestError";
    this.code = code;
    this.status = status;
  }
}

function invalidRequest(message) {
  throw new ReportRequestError("REPORT_REQUEST_INVALID", message, 400);
}

export function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function requireRealDate(value, field) {
  if (!isRealDate(value)) invalidRequest(`${field} must be a real date in YYYY-MM-DD format`);
  return value;
}

function normalizeReportState(state) {
  try {
    return normalizeState(state);
  } catch {
    throw new ReportRequestError("REPORT_STATE_INVALID", "state is not a valid Log Note state", 422);
  }
}

function utf8Length(value) {
  return encoder.encode(String(value || "")).byteLength;
}

function renderedTemplateUpperBound(template, variables) {
  let bytes = 0;
  let offset = 0;
  const pattern = /\{\{(date|domain|category|time|content|tags)\}\}/g;
  for (const match of template.matchAll(pattern)) {
    bytes += utf8Length(template.slice(offset, match.index));
    bytes += utf8Length(variables[match[1]]);
    offset = match.index + match[0].length;
  }
  return bytes + utf8Length(template.slice(offset));
}

/** Estimates the largest possible Markdown response before rendering the report. */
function markdownUpperBound(state, entries, scope) {
  const settings = state.markdownSettings;
  const categoryMap = new Map(state.categories.map((item) => [item.id, item]));
  const domainMap = new Map(state.domains.map((item) => [item.id, item]));
  const dates = scope.type === "date" ? [scope.date] : [...new Set(entries.map((entry) => entry.date))].sort();
  if (!dates.length) return utf8Length("# Log Note\n\nNo records yet.\n");

  let bytes = 1;
  for (const date of dates) {
    const dateEntries = entries.filter((entry) => entry.date === date);
    if (scope.type !== "date") {
      bytes += renderedTemplateUpperBound(settings.allDayHeading, { date });
      bytes += 2;
    }

    if (settings.layout === "grouped") {
      const categoryIds = new Set(dateEntries.map((entry) => entry.categoryId));
      for (const domain of state.domains) {
        const activeCategories = state.categories.filter((category) => category.domainId === domain.id && categoryIds.has(category.id));
        if (!activeCategories.length) continue;
        bytes += renderedTemplateUpperBound(settings.domainHeading, { date, domain: domain.name, category: domain.name }) + 2;
        for (const category of activeCategories) {
          bytes += renderedTemplateUpperBound(settings.categoryHeading, { date, domain: domain.name, category: category.name }) + 2;
        }
      }
    }

    for (const entry of dateEntries) {
      const category = categoryMap.get(entry.categoryId);
      const domain = domainMap.get(category?.domainId);
      const tags = entry.tags.map((tag) => `#${tag}`).join(" ");
      bytes += renderedTemplateUpperBound(settings.entryLine, {
        date: entry.date,
        domain: domain?.name || "",
        category: category?.name || "",
        time: entry.time ? `${entry.time} ` : "",
        content: entry.content,
        tags: tags ? ` ${tags}` : ""
      }) + 1;
    }
  }

  if (scope.type !== "date" && dates.length > 1) {
    const separator = settings.daySeparator.trim();
    bytes += (dates.length - 1) * (separator ? utf8Length(separator) + 4 : 2);
  }
  return bytes + (entries.length * 16) + (dates.length * 32) + 64;
}

function ensureWithinResponseBudget(body, maxResponseBytes) {
  const byteLength = utf8Length(body);
  if (byteLength > maxResponseBytes) {
    throw new ReportRequestError("REPORT_OUTPUT_TOO_LARGE", "generated report exceeds 2 MiB", 413);
  }
  return byteLength;
}

function jsonReport(body, filename, maxResponseBytes) {
  return { body, filename, contentType: "application/json; charset=utf-8", byteLength: ensureWithinResponseBudget(body, maxResponseBytes) };
}

function markdownReport(body, filename, maxResponseBytes) {
  return { body, filename, contentType: "text/markdown; charset=utf-8", byteLength: ensureWithinResponseBudget(body, maxResponseBytes) };
}

/** Builds one validated, size-bounded download while reusing the client export semantics. */
export function createReportDownload(input, { now = new Date(), maxResponseBytes = MAX_REPORT_RESPONSE_BYTES } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalidRequest("request body must be a JSON object");
  if (!REPORT_KINDS.has(input.kind)) invalidRequest("kind must be markdown, backup-json, or structure-json");

  const state = normalizeReportState(input.state);

  if (input.kind === "markdown") {
    if (!MARKDOWN_SCOPES.has(input.scope)) invalidRequest("markdown scope must be date, range, or all");

    if (input.scope === "date") {
      const date = requireRealDate(input.date, "date");
      const entries = state.entries.filter((entry) => entry.date === date);
      if (markdownUpperBound(state, entries, { type: "date", date }) > maxResponseBytes) {
        throw new ReportRequestError("REPORT_OUTPUT_TOO_LARGE", "generated report exceeds 2 MiB", 413);
      }
      return markdownReport(markdownForDate(state, date), `log-note-${date}.md`, maxResponseBytes);
    }

    if (input.scope === "range") {
      const startDate = requireRealDate(input.startDate, "startDate");
      const endDate = requireRealDate(input.endDate, "endDate");
      if (startDate > endDate) invalidRequest("startDate must not be after endDate");
      const rangedState = {
        ...state,
        entries: state.entries.filter((entry) => entry.date >= startDate && entry.date <= endDate)
      };
      if (markdownUpperBound(state, rangedState.entries, { type: "range" }) > maxResponseBytes) {
        throw new ReportRequestError("REPORT_OUTPUT_TOO_LARGE", "generated report exceeds 2 MiB", 413);
      }
      return markdownReport(markdownForAll(rangedState), `log-note-${startDate}-to-${endDate}.md`, maxResponseBytes);
    }

    if (markdownUpperBound(state, state.entries, { type: "all" }) > maxResponseBytes) {
      throw new ReportRequestError("REPORT_OUTPUT_TOO_LARGE", "generated report exceeds 2 MiB", 413);
    }
    return markdownReport(markdownForAll(state), "log-note-all.md", maxResponseBytes);
  }

  if (input.scope !== "all") invalidRequest(`${input.kind} scope must be all`);

  if (input.kind === "backup-json") {
    const date = now.toISOString().slice(0, 10);
    return jsonReport(backupPayload(state), `log-note-backup-${date}.json`, maxResponseBytes);
  }

  return jsonReport(structurePayload(state), "log-note-structure.json", maxResponseBytes);
}
