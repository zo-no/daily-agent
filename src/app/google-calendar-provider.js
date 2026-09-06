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
  applyGoogleCalendarChanges,
  managedIssueForPair,
  normalizeGoogleCalendarCache,
  planSyncFingerprint,
  planToGoogleEvent,
  reconcileManagedGoogleEvents
} from "@/lib/google-calendar-model.mjs";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  hasGoogleCalendarConfig,
  listGoogleEventsInRangeWithSyncToken,
  listGoogleEventsIncremental,
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
  const cacheRef = useRef(cache);
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

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const persistCache = useCallback((nextCache) => {
    if (!identity?.id) return;
    window.localStorage.setItem(googleCalendarCacheStorageKey(identity.id), JSON.stringify(nextCache));
    cacheRef.current = nextCache;
    setCache(nextCache);
  }, [identity?.id]);

  useEffect(() => {
    tokenRef.current = null;
    queuedSyncRef.current = false;
    planBaselineReadyRef.current = false;
    lastPlanFingerprintRef.current = "";
    setIssue(configured ? "" : "deployment-unavailable");
    if (!identity?.id) {
      cacheRef.current = emptyGoogleCalendarCache();
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
    cacheRef.current = nextCache;
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
      const syncedAt = new Date().toISOString();
      let nextCache;
      const syncCache = cacheRef.current;
      if (syncCache.syncToken) {
        try {
          const delta = await listGoogleEventsIncremental(token, syncCache.syncToken);
          if (!isCurrentSync()) return false;
          nextCache = applyGoogleCalendarChanges(syncCache, delta.events, delta.nextSyncToken, "primary", syncedAt);
        } catch (error) {
          if (error?.code !== "sync-token-expired" && error?.status !== 410) throw error;
          setStatus("rebuilding");
          const rebuilt = await listGoogleEventsInRangeWithSyncToken(token, googleCalendarSyncWindow());
          if (!isCurrentSync()) return false;
          nextCache = applyGoogleCalendarChanges(emptyGoogleCalendarCache(), rebuilt.events, rebuilt.nextSyncToken, "primary", syncedAt);
        }
      } else {
        const initial = await listGoogleEventsInRangeWithSyncToken(token, googleCalendarSyncWindow());
        if (!isCurrentSync()) return false;
        nextCache = applyGoogleCalendarChanges(emptyGoogleCalendarCache(), initial.events, initial.nextSyncToken, "primary", syncedAt);
      }

      const managedEvents = await listManagedGoogleEvents(token);
      if (!isCurrentSync()) return false;
      const reconciliation = reconcileManagedGoogleEvents(snapshot, managedEvents, { tombstones: nextCache.tombstones });
      const references = new Map(reconciliation.unchangedPairs.map(({ plan, event }) => [String(plan.id), googleEventReference("primary", event)]));
      const managedIssues = new Map((syncCache.managedIssues || []).map((item) => [String(item.planId), item]));
      for (const pair of reconciliation.conflictPairs) {
        const issue = managedIssueForPair(pair, pair.reason || "remote-changed", syncedAt);
        if (issue.planId && issue.eventId) managedIssues.set(issue.planId, issue);
      }
      for (const pair of reconciliation.missingPairs) {
        const issue = managedIssueForPair(pair, pair.reason || "remote-missing", syncedAt);
        if (issue.planId && issue.eventId) managedIssues.set(issue.planId, issue);
      }
      for (const plan of reconciliation.createPlans) {
        const event = await createGoogleEvent(token, planToGoogleEvent(plan));
        if (!isCurrentSync()) return false;
        references.set(String(plan.id), googleEventReference("primary", event));
        managedIssues.delete(String(plan.id));
      }
      for (const { plan, event: currentEvent } of reconciliation.updatePairs) {
        const event = await updateGoogleEvent(token, currentEvent.id, planToGoogleEvent(plan), currentEvent.etag || plan.externalRef?.etag || "");
        if (!isCurrentSync()) return false;
        references.set(String(plan.id), googleEventReference("primary", event));
        managedIssues.delete(String(plan.id));
      }
      for (const { plan } of reconciliation.unchangedPairs) managedIssues.delete(String(plan.id));
      for (const event of reconciliation.deleteEvents) {
        await deleteGoogleEvent(token, event.id, event.etag || "");
        if (!isCurrentSync()) return false;
      }
      nextCache = { ...nextCache, managedIssues: [...managedIssues.values()].slice(-100) };
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
      } else if (nextCache.managedIssues.length) {
        setIssue("conflict");
        setStatus("conflict");
      } else {
        setStatus("synced");
      }
      completed = true;
      return true;
    } catch (error) {
      const nextIssue = navigator.onLine ? googleCalendarAccessIssue(error) : "offline";
      const conflict = error?.code === "etag-mismatch" || error?.status === 412;
      setIssue(conflict ? "conflict" : nextIssue);
      setStatus(conflict ? "conflict" : nextIssue === "domain-restricted" ? "restricted" : navigator.onLine ? "error" : "offline");
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
      setStatus(nextIssue === "domain-restricted" ? "restricted" : cacheRef.current.lastSyncedAt ? "cached" : "disconnected");
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
    cacheRef.current = emptyGoogleCalendarCache();
    setCache(emptyGoogleCalendarCache());
    setIssue(configured ? "" : "deployment-unavailable");
    setStatus(configured ? "disconnected" : "unavailable");
  }, [configured, identity?.id]);

  const removeManagedIssue = useCallback((planId) => {
    const current = cacheRef.current;
    const nextIssues = (current.managedIssues || []).filter((item) => String(item.planId) !== String(planId));
    if (nextIssues.length === (current.managedIssues || []).length) return;
    persistCache({ ...current, managedIssues: nextIssues });
  }, [persistCache]);

  const keepLocalManagedPlan = useCallback(async (planId) => {
    const plan = dataRef.current.planBlocks.find((item) => String(item.id) === String(planId));
    if (!plan) return false;
    const saved = commitData((current) => ({
      ...current,
      planBlocks: current.planBlocks.map((item) => String(item.id) === String(planId) ? { ...item, externalRef: null } : item)
    }));
    if (!saved) return false;
    removeManagedIssue(planId);
    const token = tokenRef.current;
    return token && token.expiresAt > Date.now() + 30_000 ? syncWithToken(token.accessToken) : true;
  }, [commitData, removeManagedIssue, syncWithToken]);

  const adoptGoogleManagedPlan = useCallback(async (planId) => {
    const issue = (cacheRef.current.managedIssues || []).find((item) => String(item.planId) === String(planId));
    const remote = issue?.remote;
    const plan = dataRef.current.planBlocks.find((item) => String(item.id) === String(planId));
    if (!issue || !remote || !plan || !remote.date || !remote.startTime || !remote.endTime) return false;
    const saved = commitData((current) => ({
      ...current,
      planBlocks: current.planBlocks.map((item) => String(item.id) === String(planId)
        ? {
          ...item,
          date: remote.date,
          startTime: remote.startTime,
          endTime: remote.endTime,
          title: remote.title,
          externalRef: {
            provider: "google",
            calendarId: remote.calendarId || "primary",
            eventId: remote.eventId,
            etag: remote.etag || null
          }
        }
        : item)
    }));
    if (!saved) return false;
    removeManagedIssue(planId);
    const token = tokenRef.current;
    return token && token.expiresAt > Date.now() + 30_000 ? syncWithToken(token.accessToken) : true;
  }, [commitData, removeManagedIssue, syncWithToken]);

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

  useEffect(() => {
    if (!identity?.id || !configured || !hydrated) return undefined;
    const syncIfAuthorized = () => {
      const token = tokenRef.current;
      if (token && token.expiresAt > Date.now() + 30_000) syncWithToken(token.accessToken);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) syncIfAuthorized();
    };
    const onOnline = () => syncIfAuthorized();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) syncIfAuthorized();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [configured, hydrated, identity?.id, syncWithToken]);

  const value = useMemo(() => ({
    configured,
    status,
    issue,
    lastSyncedAt: cache.lastSyncedAt,
    managedIssues: cache.managedIssues || [],
    timedEvents: cache.timedEvents,
    allDayEvents: cache.allDayEvents,
    connectAndSync,
    syncNow,
    disconnect,
    keepLocalManagedPlan,
    adoptGoogleManagedPlan
  }), [adoptGoogleManagedPlan, cache, configured, connectAndSync, disconnect, issue, keepLocalManagedPlan, status, syncNow]);

  return <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>;
}

export function useGoogleCalendar() {
  const value = useContext(GoogleCalendarContext);
  if (!value) throw new Error("useGoogleCalendar must be used inside GoogleCalendarProvider");
  return value;
}
