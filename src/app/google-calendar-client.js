/**
 * @fileoverview Browser-only Google Identity Services and Calendar API boundary.
 */

import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar-model.mjs";

const CLIENT_ID = String(process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || "").trim();
const GIS_SRC = "https://accounts.google.com/gsi/client";
const GIS_LOAD_TIMEOUT = 12_000;
let scriptPromise = null;

function googleCalendarClientError(message, code, reason = "") {
  const error = new Error(message);
  error.code = code;
  error.reason = reason;
  return error;
}

export function hasGoogleCalendarConfig() {
  return CLIENT_ID.endsWith(".apps.googleusercontent.com");
}

function loadGoogleIdentityServices() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(globalThis.google);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const script = existing || document.createElement("script");
    let pollTimer = null;
    let timeoutTimer = null;
    const cleanup = () => {
      if (pollTimer) window.clearInterval(pollTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
      script.removeEventListener("load", inspect);
      script.removeEventListener("error", fail);
    };
    const fail = () => {
      cleanup();
      scriptPromise = null;
      reject(googleCalendarClientError("Google authorization could not be loaded", "authorization-unavailable"));
    };
    const inspect = () => {
      if (!globalThis.google?.accounts?.oauth2) return;
      cleanup();
      resolve(globalThis.google);
    };
    script.addEventListener("load", inspect);
    script.addEventListener("error", fail);
    pollTimer = window.setInterval(inspect, 50);
    timeoutTimer = window.setTimeout(fail, GIS_LOAD_TIMEOUT);
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    inspect();
  });
  return scriptPromise;
}

export async function requestGoogleCalendarAccessToken() {
  if (!hasGoogleCalendarConfig()) {
    throw googleCalendarClientError("Google Calendar Client ID is not configured", "deployment-unavailable");
  }
  const google = await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(googleCalendarClientError(
            response?.error_description || response?.error || "Google Calendar authorization was cancelled",
            response?.error || "authorization-cancelled",
            response?.error_description || ""
          ));
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + Math.max(60, Number(response.expires_in) || 3600) * 1000
        });
      },
      error_callback: (response) => reject(googleCalendarClientError(
        response?.message || response?.type || "Google Calendar authorization was cancelled",
        response?.type || "authorization-cancelled",
        response?.message || ""
      ))
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

async function googleCalendarRequest(accessToken, path, options = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  if (response.ok) return response.status === 204 ? null : response.json();
  const payload = await response.json().catch(() => null);
  const error = new Error(payload?.error?.message || `Google Calendar request failed (${response.status})`);
  error.status = response.status;
  error.reason = payload?.error?.errors?.[0]?.reason || "";
  throw error;
}

async function listEvents(accessToken, params) {
  const events = [];
  let pageToken = "";
  do {
    const search = new URLSearchParams({ maxResults: "2500", ...params });
    if (pageToken) search.set("pageToken", pageToken);
    const result = await googleCalendarRequest(accessToken, `/calendars/primary/events?${search}`);
    events.push(...(result.items || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return events;
}

export function listManagedGoogleEvents(accessToken) {
  return listEvents(accessToken, { privateExtendedProperty: "logNoteManaged=true", showDeleted: "false", singleEvents: "true" });
}

export function listGoogleEventsInRange(accessToken, { timeMin, timeMax }) {
  return listEvents(accessToken, { timeMin, timeMax, showDeleted: "false", singleEvents: "true", orderBy: "startTime" });
}

export function createGoogleEvent(accessToken, body) {
  return googleCalendarRequest(accessToken, "/calendars/primary/events", { method: "POST", body: JSON.stringify(body) });
}

export function updateGoogleEvent(accessToken, eventId, body) {
  return googleCalendarRequest(accessToken, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteGoogleEvent(accessToken, eventId) {
  return googleCalendarRequest(accessToken, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

export async function revokeGoogleCalendarAccess(accessToken) {
  if (!accessToken || !globalThis.google?.accounts?.oauth2?.revoke) return;
  await new Promise((resolve) => globalThis.google.accounts.oauth2.revoke(accessToken, resolve));
}
