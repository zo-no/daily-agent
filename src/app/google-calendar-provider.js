"use client";

/**
 * @fileoverview Account-scoped Google Calendar connection, local cache, and explicit sync lifecycle.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyGoogleCalendarCache,
  googleCalendarAccessIssue,
  googleCalendarCacheStorageKey,
  googleCalendarSyncWindow,
  googleEventReference,
  mapGoogleEventsToCache,
  normalizeGoogleCalendarCache,
  planSyncFingerprint,
  planToGoogleEvent,
  reconcileManagedGoogleEvents
} from "@/lib/google-calendar-model.mjs";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  hasGoogleCalendarConfig,
  listGoogleEventsInRange,
  listManagedGoogleEvents,
  requestGoogleCalendarAccessToken,
  revokeGoogleCalendarAccess,
  updateGoogleEvent
} from "./google-calendar-client";
import { useAuth } from "./auth-provider";
import { useLogNoteDataContext } from "./log-note-data-provider";

const GoogleCalendarContext = createContext(null);

export function GoogleCalendarProvider({ children }) {
  const { identity } = useAuth();
  const { data, commitData, hydrated } = useLogNoteDataContext();
  const configured = hasGoogleCalendarConfig();
  const [cache, setCache] = useState(emptyGoogleCalendarCache);
  const [status, setStatus] = useState(configured ? "disconnected" : "unavailable");
  const [issue, setIssue] = useState(configured ? "" : "deployment-unavailable");
  const tokenRef = useRef(null);
  const syncingRef = useRef(false);
  const queuedSyncRef = useRef(false);
  const syncWithTokenRef = useRef(null);
  const identityRef = useRef(identity?.id || "");
  const dataRef = useRef(data);
  const lastPlanFingerprintRef = useRef("");
  const planBaselineReadyRef = useRef(false);
  identityRef.current = identity?.id || "";
  dataRef.current = data;

  const persistCache = useCallback((nextCache) => {
    if (!identity?.id) return;
    window.localStorage.setItem(googleCalendarCacheStorageKey(identity.id), JSON.stringify(nextCache));
    setCache(nextCache);
  }, [identity?.id]);

  useEffect(() => {
    tokenRef.current = null;
    queuedSyncRef.current = false;
    planBaselineReadyRef.current = false;
    lastPlanFingerprintRef.current = "";
    setIssue(configured ? "" : "deployment-unavailable");
    if (!identity?.id) {
      setCache(emptyGoogleCalendarCache());
      setStatus(configured ? "disconnected" : "unavailable");
      return;
    }
    let nextCache = emptyGoogleCalendarCache();
    try {
      const raw = window.localStorage.getItem(googleCalendarCacheStorageKey(identity.id));
      if (raw) nextCache = normalizeGoogleCalendarCache(JSON.parse(raw));
    } catch {
      nextCache = emptyGoogleCalendarCache();
    }
    setCache(nextCache);
    setStatus(configured ? (nextCache.lastSyncedAt ? "cached" : "disconnected") : "unavailable");
  }, [configured, identity?.id]);

  useEffect(() => {
    if (!identity?.id || !hydrated) {
      planBaselineReadyRef.current = false;
      return;
    }
    lastPlanFingerprintRef.current = planSyncFingerprint(dataRef.current.planBlocks);
    planBaselineReadyRef.current = true;
  }, [hydrated, identity?.id]);

  const syncWithToken = useCallback(async (token) => {
    if (!identity?.id || !configured || !hydrated) return false;
    if (syncingRef.current) {
      queuedSyncRef.current = true;
      return false;
    }
    syncingRef.current = true;
    queuedSyncRef.current = false;
    setStatus("syncing");
    setIssue("");
    const syncUserId = identity.id;
    const isCurrentSync = () => identityRef.current === syncUserId && tokenRef.current?.accessToken === token;
    const snapshot = dataRef.current.planBlocks;
    const snapshotFingerprint = planSyncFingerprint(snapshot);
    let completed = false;
    try {
      const managedEvents = await listManagedGoogleEvents(token);
      if (!isCurrentSync()) return false;
      const reconciliation = reconcileManagedGoogleEvents(snapshot, managedEvents);
      const references = new Map(reconciliation.unchangedPairs.map(({ plan, event }) => [String(plan.id), googleEventReference("primary", event)]));
      for (const plan of reconciliation.createPlans) {
        const event = await createGoogleEvent(token, planToGoogleEvent(plan));
        if (!isCurrentSync()) return false;
        references.set(String(plan.id), googleEventReference("primary", event));
      }
      for (const { plan, event: currentEvent } of reconciliation.updatePairs) {
        const event = await updateGoogleEvent(token, currentEvent.id, planToGoogleEvent(plan));
        if (!isCurrentSync()) return false;
        references.set(String(plan.id), googleEventReference("primary", event));
      }
      for (const event of reconciliation.deleteEvents) {
        await deleteGoogleEvent(token, event.id);
        if (!isCurrentSync()) return false;
      }

      const rangeEvents = await listGoogleEventsInRange(token, googleCalendarSyncWindow());
      if (!isCurrentSync()) return false;
      const nextCache = mapGoogleEventsToCache(rangeEvents, "primary", new Date().toISOString());
      const needsReferenceUpdate = dataRef.current.planBlocks.some((plan) => {
        const next = references.get(String(plan.id));
        if (!next) return false;
        return plan.externalRef?.eventId !== next.eventId || plan.externalRef?.etag !== next.etag;
      });
      if (needsReferenceUpdate) {
        commitData((current) => ({
          ...current,
          planBlocks: current.planBlocks.map((plan) => references.has(String(plan.id)) ? { ...plan, externalRef: references.get(String(plan.id)) } : plan)
        }));
      }
      persistCache(nextCache);
      lastPlanFingerprintRef.current = snapshotFingerprint;
      if (planSyncFingerprint(dataRef.current.planBlocks) !== snapshotFingerprint) {
        queuedSyncRef.current = true;
        setStatus("dirty");
      } else {
        setStatus("synced");
      }
      completed = true;
      return true;
    } catch (error) {
      const nextIssue = navigator.onLine ? googleCalendarAccessIssue(error) : "offline";
      setIssue(nextIssue);
      setStatus(nextIssue === "domain-restricted" ? "restricted" : navigator.onLine ? "error" : "offline");
      return false;
    } finally {
      syncingRef.current = false;
      const tokenIsCurrent = tokenRef.current?.accessToken === token && tokenRef.current.expiresAt > Date.now() + 30_000;
      if (completed && queuedSyncRef.current && tokenIsCurrent) {
        queuedSyncRef.current = false;
        window.setTimeout(() => syncWithTokenRef.current?.(token), 0);
      }
    }
  }, [commitData, configured, hydrated, identity?.id, persistCache]);
  syncWithTokenRef.current = syncWithToken;

  const connectAndSync = useCallback(async () => {
    if (!configured) return false;
    setStatus("connecting");
    setIssue("");
    try {
      const token = await requestGoogleCalendarAccessToken();
      tokenRef.current = token;
      return syncWithToken(token.accessToken);
    } catch (error) {
      const nextIssue = googleCalendarAccessIssue(error);
      setIssue(nextIssue);
      setStatus(nextIssue === "domain-restricted" ? "restricted" : cache.lastSyncedAt ? "cached" : "disconnected");
      return false;
    }
  }, [cache.lastSyncedAt, configured, syncWithToken]);

  const syncNow = useCallback(() => {
    const token = tokenRef.current;
    return token && token.expiresAt > Date.now() + 30_000
      ? syncWithToken(token.accessToken)
      : connectAndSync();
  }, [connectAndSync, syncWithToken]);

  const disconnect = useCallback(async () => {
    const token = tokenRef.current?.accessToken;
    tokenRef.current = null;
    queuedSyncRef.current = false;
    if (token) await revokeGoogleCalendarAccess(token).catch(() => undefined);
    if (identity?.id) window.localStorage.removeItem(googleCalendarCacheStorageKey(identity.id));
    setCache(emptyGoogleCalendarCache());
    setIssue(configured ? "" : "deployment-unavailable");
    setStatus(configured ? "disconnected" : "unavailable");
  }, [configured, identity?.id]);

  const planFingerprint = planSyncFingerprint(data.planBlocks);
  useEffect(() => {
    if (!identity?.id || !configured || !hydrated || !planBaselineReadyRef.current) return undefined;
    if (!lastPlanFingerprintRef.current) {
      lastPlanFingerprintRef.current = planFingerprint;
      return undefined;
    }
    if (lastPlanFingerprintRef.current === planFingerprint) return undefined;
    const token = tokenRef.current;
    if (!token || token.expiresAt <= Date.now() + 30_000) {
      if (cache.lastSyncedAt) setStatus((current) => ["syncing", "connecting"].includes(current) ? current : "dirty");
      return undefined;
    }
    setStatus((current) => current === "syncing" ? current : "dirty");
    const timer = window.setTimeout(() => syncWithToken(token.accessToken), 900);
    return () => window.clearTimeout(timer);
  }, [cache.lastSyncedAt, configured, hydrated, identity?.id, planFingerprint, syncWithToken]);

  const value = useMemo(() => ({
    configured,
    status,
    issue,
    lastSyncedAt: cache.lastSyncedAt,
    timedEvents: cache.timedEvents,
    allDayEvents: cache.allDayEvents,
    connectAndSync,
    syncNow,
    disconnect
  }), [cache, configured, connectAndSync, disconnect, issue, status, syncNow]);

  return <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>;
}

export function useGoogleCalendar() {
  const value = useContext(GoogleCalendarContext);
  if (!value) throw new Error("useGoogleCalendar must be used inside GoogleCalendarProvider");
  return value;
}
