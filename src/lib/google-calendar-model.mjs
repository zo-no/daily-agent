/**
 * @fileoverview Pure Google Calendar mapping and reconciliation helpers.
 */

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";
export const GOOGLE_CALENDAR_CACHE_VERSION = 1;
const CACHE_PREFIX = "log-note:google-calendar:user:";
const MANAGED_KEY = "logNoteManaged";
const PLAN_ID_KEY = "logNotePlanId";

function googleCalendarErrorText(error) {
  if (typeof error === "string") return error.toLowerCase();
  if (!error || typeof error !== "object") return "";
  return [error.code, error.reason, error.type, error.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Converts provider and Google errors into stable UI-safe availability reasons. */
export function googleCalendarAccessIssue(error) {
  const text = googleCalendarErrorText(error);
  if (/deployment-unavailable|client id is not configured/.test(text)) return "deployment-unavailable";
  if (/origin_mismatch|invalid_client|not a valid origin|origin[^\n]*(not authorized|not allowed)/.test(text)) return "domain-restricted";
  if (/popup_failed_to_open/.test(text)) return "popup-blocked";
  if (/popup_closed|access_denied|authorization was cancelled/.test(text)) return "authorization-cancelled";
  if (/authorization-unavailable|authorization could not be loaded/.test(text)) return "authorization-unavailable";
  if (/accessnotconfigured|api[^\n]*(not enabled|disabled)|service[^\n]*disabled/.test(text)) return "api-unavailable";
  return "request-failed";
}

function cleanUserId(userId) {
  const value = String(userId || "").trim();
  if (!value) throw new Error("Authenticated user ID is required");
  return encodeURIComponent(value);
}

export function googleCalendarCacheStorageKey(userId) {
  return `${CACHE_PREFIX}${cleanUserId(userId)}:v1`;
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localTimeString(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localPlanDate(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hours, minutes] = String(time).split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function planToGoogleEvent(plan, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
  return {
    summary: String(plan.title || "").trim(),
    start: { dateTime: localPlanDate(plan.date, plan.startTime).toISOString(), timeZone },
    end: { dateTime: localPlanDate(plan.date, plan.endTime).toISOString(), timeZone },
    extendedProperties: {
      private: {
        [MANAGED_KEY]: "true",
        [PLAN_ID_KEY]: String(plan.id)
      }
    }
  };
}

export function googleEventPlanId(event) {
  if (event?.extendedProperties?.private?.[MANAGED_KEY] !== "true") return "";
  return String(event.extendedProperties.private[PLAN_ID_KEY] || "").trim();
}

export function googleEventIsManaged(event) {
  return Boolean(googleEventPlanId(event));
}

function googleEventMatchesPlan(event, plan) {
  if (!event?.start?.dateTime || !event?.end?.dateTime) return false;
  return String(event.summary || "").trim() === String(plan.title || "").trim()
    && new Date(event.start.dateTime).getTime() === localPlanDate(plan.date, plan.startTime).getTime()
    && new Date(event.end.dateTime).getTime() === localPlanDate(plan.date, plan.endTime).getTime();
}

/** Only reconciles events explicitly marked as owned by Log Note. */
export function reconcileManagedGoogleEvents(localPlans, managedEvents) {
  const plans = (Array.isArray(localPlans) ? localPlans : []).filter((plan) => plan?.source !== "google");
  const planIds = new Set(plans.map((plan) => String(plan.id)));
  const remoteByPlanId = new Map();
  const deleteEvents = [];

  for (const event of Array.isArray(managedEvents) ? managedEvents : []) {
    const planId = googleEventPlanId(event);
    if (!planId || !planIds.has(planId)) {
      if (googleEventIsManaged(event)) deleteEvents.push(event);
      continue;
    }
    if (remoteByPlanId.has(planId)) {
      deleteEvents.push(event);
      continue;
    }
    remoteByPlanId.set(planId, event);
  }

  const createPlans = [];
  const updatePairs = [];
  const unchangedPairs = [];
  for (const plan of plans) {
    const remote = remoteByPlanId.get(String(plan.id));
    if (!remote) createPlans.push(plan);
    else if (googleEventMatchesPlan(remote, plan)) unchangedPairs.push({ plan, event: remote });
    else updatePairs.push({ plan, event: remote });
  }
  return { createPlans, updatePairs, unchangedPairs, deleteEvents };
}

function externalRef(calendarId, event) {
  return {
    provider: "google",
    calendarId,
    eventId: String(event.id),
    etag: event.etag ? String(event.etag) : null
  };
}

function splitTimedEvent(event, calendarId) {
  const start = new Date(event.start?.dateTime || "");
  const end = new Date(event.end?.dateTime || "");
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];
  const lastMoment = new Date(end.getTime() - 1);
  const items = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate()); cursor <= lastMoment; cursor.setDate(cursor.getDate() + 1)) {
    const date = localDateString(cursor);
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const segmentStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
    const segmentEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
    items.push({
      id: `google:${calendarId}:${event.id}:${date}`,
      date,
      title: String(event.summary || "(Untitled event)"),
      startTime: localTimeString(segmentStart),
      endTime: segmentEnd.getTime() === dayEnd.getTime() ? "23:59" : localTimeString(segmentEnd),
      source: "google",
      flexibility: "fixed",
      externalRef: externalRef(calendarId, event),
      htmlLink: event.htmlLink ? String(event.htmlLink) : ""
    });
  }
  return items;
}

function expandAllDayEvent(event, calendarId) {
  const start = String(event.start?.date || "");
  const end = String(event.end?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end <= start) return [];
  const [year, month, day] = start.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  const items = [];
  while (localDateString(cursor) < end) {
    const date = localDateString(cursor);
    items.push({
      id: `google-all-day:${calendarId}:${event.id}:${date}`,
      date,
      title: String(event.summary || "(Untitled event)"),
      source: "google",
      allDay: true,
      externalRef: externalRef(calendarId, event),
      htmlLink: event.htmlLink ? String(event.htmlLink) : ""
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return items;
}

export function mapGoogleEventsToCache(events, calendarId = "primary", syncedAt = new Date().toISOString()) {
  const timedEvents = [];
  const allDayEvents = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || event.status === "cancelled" || googleEventIsManaged(event)) continue;
    if (event.start?.date && event.end?.date) allDayEvents.push(...expandAllDayEvent(event, calendarId));
    else timedEvents.push(...splitTimedEvent(event, calendarId));
  }
  return { version: GOOGLE_CALENDAR_CACHE_VERSION, calendarId, lastSyncedAt: syncedAt, timedEvents, allDayEvents };
}

export function emptyGoogleCalendarCache() {
  return { version: GOOGLE_CALENDAR_CACHE_VERSION, calendarId: "primary", lastSyncedAt: null, timedEvents: [], allDayEvents: [] };
}

export function normalizeGoogleCalendarCache(value) {
  if (!value || typeof value !== "object") return emptyGoogleCalendarCache();
  const cleanTimed = (Array.isArray(value.timedEvents) ? value.timedEvents : []).filter((item) => item?.id && item?.date && item?.startTime && item?.endTime).map((item) => ({ ...item, source: "google", flexibility: "fixed" }));
  const cleanAllDay = (Array.isArray(value.allDayEvents) ? value.allDayEvents : []).filter((item) => item?.id && item?.date).map((item) => ({ ...item, source: "google", allDay: true }));
  return {
    version: GOOGLE_CALENDAR_CACHE_VERSION,
    calendarId: String(value.calendarId || "primary"),
    lastSyncedAt: value.lastSyncedAt ? String(value.lastSyncedAt) : null,
    timedEvents: cleanTimed,
    allDayEvents: cleanAllDay
  };
}

export function googleCalendarSyncWindow(now = new Date()) {
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 30);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 91);
  timeMax.setHours(0, 0, 0, 0);
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

export function planSyncFingerprint(plans) {
  return JSON.stringify((Array.isArray(plans) ? plans : []).filter((plan) => plan?.source !== "google").map((plan) => [plan.id, plan.date, plan.startTime, plan.endTime, plan.title]));
}

export function googleEventReference(calendarId, event) {
  return externalRef(calendarId, event);
}
