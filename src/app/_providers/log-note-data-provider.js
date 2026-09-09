"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEY, createInitialState, restoreState } from "@/lib/data.mjs";
import { attachmentRefsFromState } from "@/lib/attachment-model.mjs";
import { claimLegacyAttachmentBlobs, releaseClaimedLegacyAttachmentBlobs, setAttachmentStorageOwner } from "@/lib/attachment-store.mjs";
import { loadStoredState, persistStoredState } from "@/lib/storage-state.mjs";
import {
  accountDataStorageKey,
  accountSyncStorageKey,
  accountSyncStreamStorageKey,
  makeSyncMetadata,
  makeSyncStreamState,
  mergeCloudTextWithLocalAttachments,
  readSyncMetadata,
  readSyncStreamState,
  reconcileAccountDocument,
  structureStateFingerprint,
  textStateFingerprint
} from "@/lib/account-sync.mjs";
import {
  coalesceSyncMutations,
  diffSyncItems,
  makeSyncMutation,
  mergeSyncItem,
  sortSyncItems,
  SYNC_BATCH_LIMIT,
  SYNC_KINDS,
  SYNC_PULL_LIMIT
} from "@/lib/incremental-sync.mjs";
import { cloudRevisionConflict, cloudSyncStatus } from "@/lib/cloud-document.mjs";
import { pullSyncChanges, pushSyncBatch, readCloudDocument, readSyncItemsSnapshot, readSyncItem, saveCloudDocument, subscribeSyncChanges } from "./cloud-document-client";
import { getSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n";
import { subscribeMobileRuntime } from "../_native/native-lifecycle";

const DataContext = createContext(null);
const CLOUD_DEVICE_STORAGE_KEY = "log-note:cloud-device:v1";
const E2E_AUTH_CONFIGURED = process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1";
const INCREMENTAL_SYNC_ENABLED = process.env.NEXT_PUBLIC_LOG_NOTE_INCREMENTAL_SYNC !== "0";
const STREAM_KINDS = [...SYNC_KINDS];

function streamItems(state, kind) {
  return kind === "record" ? (state?.entries || []) : (state?.planBlocks || []);
}

function stateWithStreamItems(state, kind, items) {
  return kind === "record" ? { ...state, entries: sortSyncItems(kind, items) } : { ...state, planBlocks: sortSyncItems(kind, items) };
}

function removeStreamConflict(conflicts, entityId) {
  return conflicts.filter((conflict) => conflict.entityId !== entityId);
}

function localE2EAuthEnabled() {
  return E2E_AUTH_CONFIGURED
    && typeof window !== "undefined"
    && ["127.0.0.1", "localhost"].includes(window.location.hostname);
}

function deviceId() {
  const existing = window.localStorage.getItem(CLOUD_DEVICE_STORAGE_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(CLOUD_DEVICE_STORAGE_KEY, value);
  return value;
}

function writeMetadata(userId, document, state) {
  const metadata = makeSyncMetadata(userId, document.revision, textStateFingerprint(state));
  try {
    window.localStorage.setItem(accountSyncStorageKey(userId), JSON.stringify(metadata));
    return metadata;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function LogNoteDataProvider({ children }) {
  const { identity } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [legacyChoice, setLegacyChoice] = useState(null);
  const [legacyChoiceBusy, setLegacyChoiceBusy] = useState(false);
  const [sync, setSync] = useState({ status: "checking", document: null, message: "", omittedImages: 0 });
  const [streamConflicts, setStreamConflicts] = useState([]);
  const [storageErrorCount, setStorageErrorCount] = useState(0);
  const dataRef = useRef(data);
  const storageKeyRef = useRef("");
  const canPersistRef = useRef(false);
  const cloudDocumentRef = useRef(null);
  const saveTimerRef = useRef(null);
  const savingGenerationRef = useRef(null);
  const saveQueuedRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const reconcilingGenerationRef = useRef(null);
  const generationRef = useRef(0);
  const streamStateRef = useRef({ record: null, plan: null });
  const incrementalReadyRef = useRef(false);
  const incrementalRunningRef = useRef(false);
  const incrementalRetryTimerRef = useRef(null);
  const incrementalRetryAttemptRef = useRef(0);
  const incrementalWakeRef = useRef(null);
  const structureFingerprintRef = useRef(null);
  const legacyStructureDirtyRef = useRef(false);
  dataRef.current = data;
  cloudDocumentRef.current = sync.document;
  const testAuthEnabled = localE2EAuthEnabled();

  const persistLocal = useCallback((nextData, allowWrite = canPersistRef.current, reportError = true) => {
    const result = persistStoredState(() => window.localStorage, storageKeyRef.current, nextData, { allowWrite });
    if (!result.ok) {
      if (result.error) console.error(result.error);
      if (reportError) setStorageErrorCount((count) => count + 1);
      return false;
    }
    canPersistRef.current = true;
    dataRef.current = nextData;
    setData(nextData);
    return true;
  }, []);

  const applyCloudDocument = useCallback((document) => {
    if (!identity?.id || !document) return false;
    const mergedState = mergeCloudTextWithLocalAttachments(dataRef.current, document.payload);
    if (!persistLocal(mergedState, true)) return false;
    writeMetadata(identity.id, document, mergedState);
    setRecovery(null);
    setSync({ status: "synced", document, message: "", omittedImages: 0 });
    return true;
  }, [identity?.id, persistLocal]);

  const persistStreamState = useCallback((kind, state) => {
    if (!identity?.id) return false;
    try {
      window.localStorage.setItem(accountSyncStreamStorageKey(identity.id, kind), JSON.stringify(state));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }, [identity?.id]);

  const readStoredStreamState = useCallback((kind) => {
    if (!identity?.id) return makeSyncStreamState("anonymous", kind);
    try {
      return readSyncStreamState(window.localStorage.getItem(accountSyncStreamStorageKey(identity.id, kind)), identity.id, kind);
    } catch (error) {
      console.error(error);
      return makeSyncStreamState(identity.id, kind);
    }
  }, [identity?.id]);

  const updateStreamConflicts = useCallback((states) => {
    setStreamConflicts(STREAM_KINDS.flatMap((kind) => (states[kind]?.conflicts || []).map((conflict) => ({ ...conflict, kind }))));
  }, []);

  const persistIncrementalState = useCallback((states) => {
    if (!identity?.id) return false;
    let ok = true;
    for (const kind of STREAM_KINDS) {
      if (!persistStreamState(kind, states[kind] || makeSyncStreamState(identity.id, kind))) ok = false;
    }
    streamStateRef.current = states;
    updateStreamConflicts(states);
    return ok;
  }, [identity?.id, persistStreamState, updateStreamConflicts]);

  const applyRemoteStreamChanges = useCallback((kind, stream, changes) => {
    const itemMap = new Map(streamItems(dataRef.current, kind).map((item) => [String(item.id), item]));
    const base = { ...(stream.base || {}) };
    const versions = { ...(stream.versions || {}) };
    let conflicts = [...(stream.conflicts || [])];
    let cursor = Number(stream.cursor) || 0;
    const orderedChanges = changes.slice().sort((left, right) => Number(left.serverSeq || 0) - Number(right.serverSeq || 0));

    for (const change of orderedChanges) {
      const entityId = String(change.entityId);
      const isDelete = change.operation === "delete";
      const remotePayload = isDelete ? null : change.payload || null;
      const result = mergeSyncItem({
        kind,
        base: Object.prototype.hasOwnProperty.call(base, entityId) ? base[entityId] : null,
        local: itemMap.get(entityId) || null,
        remote: remotePayload
      });
      cursor = Math.max(cursor, Number(change.serverSeq) || 0);
      versions[entityId] = Number(change.itemVersion) || 0;
      if (result.status === "conflict") {
        conflicts = removeStreamConflict(conflicts, entityId);
        conflicts.push({ kind, entityId, ...result, serverSeq: change.serverSeq, itemVersion: change.itemVersion, operation: change.operation });
        continue;
      }
      if (result.item) itemMap.set(entityId, result.item);
      else itemMap.delete(entityId);
      base[entityId] = remotePayload;
      conflicts = removeStreamConflict(conflicts, entityId);
    }
    return {
      nextState: stateWithStreamItems(dataRef.current, kind, [...itemMap.values()]),
      nextStream: { ...stream, base, versions, cursor, conflicts },
      conflicts
    };
  }, []);

  const runIncrementalSync = useCallback(async ({ generation } = {}) => {
    if (!INCREMENTAL_SYNC_ENABLED || testAuthEnabled || !identity?.id || !incrementalReadyRef.current || incrementalRunningRef.current) return false;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSync((current) => ({ ...current, status: "setup-required", message: "" }));
      return false;
    }
    incrementalRunningRef.current = true;
    try {
      const states = { ...streamStateRef.current };
      let nextData = dataRef.current;
      let legacyDocumentMayHaveAdvanced = false;

      for (const kind of STREAM_KINDS) {
        const baseStream = states[kind] || makeSyncStreamState(identity.id, kind);
        let nextStream = baseStream;
        let nextState = nextData;

        const outbox = [...(baseStream.outbox || [])];
        const retainedOutbox = [];
        while (outbox.length) {
          const batch = outbox.splice(0, SYNC_BATCH_LIMIT);
          let results;
          try {
            results = await pushSyncBatch(client, identity.id, kind, batch, deviceId());
          } catch (error) {
            // Keep the entire batch for retry; local commits never wait on this path.
            retainedOutbox.push(...batch);
            throw error;
          }
          if (generation && generation !== generationRef.current) return false;
          const resultsByOperation = new Map(results.map((result) => [result.operationId, result]));
          batch.forEach((mutation) => {
            const result = resultsByOperation.get(mutation.operationId);
            if (!result || result.outcome === "conflict") retainedOutbox.push(mutation);
          });
          for (const result of results) {
            if (result.outcome === "conflict") {
              nextStream = {
                ...nextStream,
                conflicts: [
                  ...(nextStream.conflicts || []).filter((item) => item.entityId !== result.entityId),
                  {
                    kind,
                    entityId: result.entityId,
                    conflicts: ["version"],
                    base: nextStream.base?.[result.entityId] || null,
                    local: streamItems(nextState, kind).find((item) => item.id === result.entityId) || null,
                    remote: result.conflictPayload || null,
                    current: result.conflictPayload || null,
                    serverSeq: result.serverSeq,
                    itemVersion: result.conflictVersion || 0,
                    operation: result.operation
                  }
                ]
              };
              continue;
            }
            legacyDocumentMayHaveAdvanced = true;
            const payload = result.operation === "delete" ? null : result.payload || null;
            nextStream = {
              ...nextStream,
              base: { ...nextStream.base, [result.entityId]: payload },
              versions: { ...nextStream.versions, [result.entityId]: result.itemVersion },
              cursor: Math.max(Number(nextStream.cursor) || 0, Number(result.serverSeq) || 0),
              conflicts: (nextStream.conflicts || []).filter((item) => item.entityId !== result.entityId)
            };
          }
        }
        nextStream = {
          ...nextStream,
          outbox: coalesceSyncMutations(retainedOutbox)
        };

        let cursor = Number(nextStream.cursor) || 0;
        let pulled = [];
        do {
          const page = await pullSyncChanges(client, identity.id, kind, cursor, SYNC_PULL_LIMIT);
          if (generation && generation !== generationRef.current) return false;
          pulled = page.changes || [];
          if (!pulled.length) break;
          const applied = applyRemoteStreamChanges(kind, nextStream, pulled);
          nextState = applied.nextState;
          nextStream = applied.nextStream;
          cursor = nextStream.cursor;
        } while (pulled.length === SYNC_PULL_LIMIT);

        if (nextState !== nextData) nextData = nextState;
        states[kind] = nextStream;
      }

      if (nextData !== dataRef.current) {
        if (!persistLocal(nextData, true)) return false;
      }
      if (legacyDocumentMayHaveAdvanced) {
        try {
          const latestDocument = await readCloudDocument(client, identity.id);
          if (latestDocument) {
            cloudDocumentRef.current = latestDocument;
            if (textStateFingerprint(latestDocument.payload) === textStateFingerprint(nextData)) {
              writeMetadata(identity.id, latestDocument, nextData);
            }
          }
        } catch (error) {
          // The item streams remain authoritative; a legacy revision refresh is best effort.
          console.error(error);
        }
      }
      persistIncrementalState(states);
      const hasStreamConflicts = STREAM_KINDS.some((kind) => (states[kind]?.conflicts || []).length > 0);
      const hasPending = STREAM_KINDS.some((kind) => (states[kind]?.outbox || []).length > 0);
      setSync((current) => current.status === "conflict" || hasStreamConflicts
        ? { ...current, status: "conflict" }
        : { ...current, status: hasPending ? "dirty" : navigator.onLine ? "synced" : current.status, message: "" });
      incrementalRetryAttemptRef.current = 0;
      if (incrementalRetryTimerRef.current) {
        window.clearTimeout(incrementalRetryTimerRef.current);
        incrementalRetryTimerRef.current = null;
      }
      return true;
    } catch (error) {
      console.error(error);
      const offline = !navigator.onLine;
      setSync((current) => ({ ...current, status: cloudSyncStatus(error, navigator.onLine), message: "" }));
      if (!offline && incrementalReadyRef.current) {
        const attempt = incrementalRetryAttemptRef.current;
        const delay = Math.min(30_000, 1_000 * (2 ** Math.min(attempt, 5)));
        incrementalRetryAttemptRef.current = attempt + 1;
        if (incrementalRetryTimerRef.current) window.clearTimeout(incrementalRetryTimerRef.current);
        incrementalRetryTimerRef.current = window.setTimeout(() => {
          incrementalRetryTimerRef.current = null;
          void runIncrementalSync({ generation: generationRef.current });
        }, delay);
      }
      return false;
    } finally {
      incrementalRunningRef.current = false;
    }
  }, [identity?.id, incrementalReadyRef, persistIncrementalState, persistLocal, testAuthEnabled, applyRemoteStreamChanges]);

  const scheduleIncrementalSync = useCallback((delay = 0) => {
    if (!INCREMENTAL_SYNC_ENABLED || testAuthEnabled || !identity?.id || !incrementalReadyRef.current) return;
    if (incrementalWakeRef.current) window.clearTimeout(incrementalWakeRef.current);
    incrementalWakeRef.current = window.setTimeout(() => {
      incrementalWakeRef.current = null;
      void runIncrementalSync();
    }, Math.max(0, Number(delay) || 0));
  }, [identity?.id, runIncrementalSync, testAuthEnabled]);

  const initializeIncrementalSync = useCallback(async ({ generation }) => {
    if (!INCREMENTAL_SYNC_ENABLED || testAuthEnabled || !identity?.id || incrementalReadyRef.current) return false;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSync((current) => ({ ...current, status: "setup-required", message: "" }));
      return false;
    }
    try {
      const states = {};
      for (const kind of STREAM_KINDS) {
        const stored = readStoredStreamState(kind);
        const items = [];
        let cursor = Number(stored.cursor) || 0;
        let snapshot;
        do {
          snapshot = await pullSyncChanges(client, identity.id, kind, cursor, SYNC_PULL_LIMIT);
          items.push(...snapshot.changes);
          cursor = snapshot.cursor || cursor;
        } while (snapshot.hasMore);
        // A migration can populate item tables without a corresponding change log.
        // Fill that hole from the account-scoped snapshot before enabling the stream.
        if (!items.length && cursor === 0) {
          let offset = 0;
          let page;
          do {
            page = await readSyncItemsSnapshot(client, identity.id, kind, SYNC_PULL_LIMIT, offset);
            items.push(...page.changes);
            offset += page.changes.length;
          } while (page.hasMore);
        }
        if (generation !== generationRef.current) return false;
        const base = { ...(stored.base || {}) };
        const versions = { ...(stored.versions || {}) };
        items.forEach((item) => {
          base[item.entityId] = item.payload;
          versions[item.entityId] = item.itemVersion;
        });
        const currentItems = streamItems(dataRef.current, kind);
        const localMutations = diffSyncItems({
          kind,
          before: Object.values(base).filter(Boolean),
          after: currentItems,
          versions,
          deviceId: deviceId()
        });
        const next = makeSyncStreamState(identity.id, kind, {
          cursor: Math.max(cursor, ...items.map((item) => item.serverSeq || 0)),
          base,
          versions,
          outbox: coalesceSyncMutations([...(stored.outbox || []), ...localMutations]),
          conflicts: stored.conflicts || []
        });
        states[kind] = next;
        persistStreamState(kind, next);
      }
      streamStateRef.current = states;
      structureFingerprintRef.current = structureStateFingerprint(dataRef.current);
      incrementalReadyRef.current = true;
      updateStreamConflicts(states);
      scheduleIncrementalSync(0);
      return true;
    } catch (error) {
      console.error(error);
      incrementalReadyRef.current = false;
      const offline = !navigator.onLine;
      setSync((current) => ({
        ...current,
        status: cloudSyncStatus(error, navigator.onLine),
        message: ""
      }));
      return false;
    }
  }, [identity?.id, persistStreamState, readStoredStreamState, scheduleIncrementalSync, testAuthEnabled, updateStreamConflicts]);

  const enqueueStreamDiff = useCallback((before, after) => {
    if (!incrementalReadyRef.current || !identity?.id) return;
    const states = streamStateRef.current;
    STREAM_KINDS.forEach((kind) => {
      const stream = states[kind] || makeSyncStreamState(identity.id, kind);
      const mutations = diffSyncItems({
        kind,
        before: streamItems(before, kind),
        after: streamItems(after, kind),
        versions: stream.versions,
        deviceId: deviceId()
      });
      if (!mutations.length) return;
      stream.outbox = coalesceSyncMutations([...(stream.outbox || []), ...mutations]);
      states[kind] = stream;
      persistStreamState(kind, stream);
    });
    scheduleIncrementalSync(300);
  }, [identity?.id, persistStreamState, scheduleIncrementalSync]);

  const saveToCloud = useCallback(async (expectedRevision = cloudDocumentRef.current?.revision ?? null) => {
    if (!identity?.id || testAuthEnabled || recovery) return false;
    const generation = generationRef.current;
    if (savingGenerationRef.current === generation) {
      saveQueuedRef.current = true;
      return false;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSync((current) => ({ ...current, status: "setup-required", message: "" }));
      return false;
    }
    savingGenerationRef.current = generation;
    const snapshot = dataRef.current;
    const snapshotFingerprint = textStateFingerprint(snapshot);
    const snapshotStructureFingerprint = structureStateFingerprint(snapshot);
    const previousPending = pendingSaveRef.current;
    const pending = previousPending
      && previousPending.fingerprint === snapshotFingerprint
      && previousPending.expectedRevision === expectedRevision
      ? previousPending
      : { fingerprint: snapshotFingerprint, expectedRevision, operationId: crypto.randomUUID() };
    pendingSaveRef.current = pending;
    let saveConfirmed = false;
    setSync((current) => ({ ...current, status: "saving", message: "" }));
    try {
      const result = await saveCloudDocument(client, identity.id, snapshot, pending.expectedRevision, deviceId(), pending.operationId);
      if (generation !== generationRef.current) return false;
      writeMetadata(identity.id, result.document, snapshot);
      cloudDocumentRef.current = result.document;
      if (structureStateFingerprint(dataRef.current) === snapshotStructureFingerprint) {
        legacyStructureDirtyRef.current = false;
      }
      pendingSaveRef.current = null;
      saveConfirmed = true;
      incrementalRetryAttemptRef.current = 0;
      const changedDuringSave = textStateFingerprint(dataRef.current) !== snapshotFingerprint;
      setSync({
        status: changedDuringSave ? "dirty" : "synced",
        document: result.document,
        message: "",
        omittedImages: result.omittedImages
      });
      scheduleIncrementalSync(0);
      return true;
    } catch (error) {
      if (generation !== generationRef.current) return false;
      console.error(error);
      if (cloudRevisionConflict(error)) {
        try {
          const latest = await readCloudDocument(client, identity.id);
          cloudDocumentRef.current = latest;
          if (latest && textStateFingerprint(latest.payload) === snapshotFingerprint) {
            writeMetadata(identity.id, latest, snapshot);
            pendingSaveRef.current = null;
            saveConfirmed = true;
            setSync({
              status: textStateFingerprint(dataRef.current) === snapshotFingerprint ? "synced" : "dirty",
              document: latest,
              message: "",
              omittedImages: 0
            });
          } else {
            pendingSaveRef.current = null;
            setSync({ status: "conflict", document: latest, message: "", omittedImages: 0 });
          }
        } catch (readError) {
          console.error(readError);
          setSync((current) => ({ ...current, status: cloudSyncStatus(readError, navigator.onLine), message: "" }));
        }
      } else {
        const nextStatus = cloudSyncStatus(error, navigator.onLine);
        setSync((current) => ({
          ...current,
          status: nextStatus,
          message: ""
        }));
        if (nextStatus === "retrying" && !incrementalReadyRef.current) {
          const attempt = incrementalRetryAttemptRef.current;
          const delay = Math.min(30_000, 1_000 * (2 ** Math.min(attempt, 5)));
          incrementalRetryAttemptRef.current = attempt + 1;
          if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = window.setTimeout(() => {
            saveTimerRef.current = null;
            if (generation === generationRef.current) void saveToCloud(pending.expectedRevision);
          }, delay);
        }
      }
      return false;
    } finally {
      if (savingGenerationRef.current === generation) savingGenerationRef.current = null;
      if (generation !== generationRef.current) return;
      const changedDuringSave = textStateFingerprint(dataRef.current) !== snapshotFingerprint;
      const queueNextSave = saveConfirmed && (saveQueuedRef.current || changedDuringSave);
      saveQueuedRef.current = false;
      if (queueNextSave) {
        setSync((current) => current.status === "conflict" ? current : { ...current, status: "dirty" });
        saveTimerRef.current = window.setTimeout(() => saveToCloud(cloudDocumentRef.current?.revision ?? null), 0);
      }
    }
  }, [identity?.id, recovery, scheduleIncrementalSync, testAuthEnabled]);

  const reconcileCloud = useCallback(async ({ localState, localExists, legacyState = null, generation }) => {
    if (!identity?.id || testAuthEnabled) {
      setSync({ status: testAuthEnabled ? "test" : "checking", document: null, message: "", omittedImages: 0 });
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      if (!localExists && legacyState) {
        dataRef.current = legacyState;
        setData(legacyState);
        setLegacyChoice({ state: legacyState });
      } else if (!localExists) {
        persistLocal(localState, true);
      }
      setHydrated(true);
      setSync((current) => ({ ...current, status: "setup-required", document: null, message: "" }));
      return;
    }
    if (reconcilingGenerationRef.current === generation) return;
    reconcilingGenerationRef.current = generation;
    try {
      const document = await readCloudDocument(client, identity.id);
      if (generation !== generationRef.current) return;
      const metadata = readSyncMetadata(window.localStorage.getItem(accountSyncStorageKey(identity.id)), identity.id);
      const currentLocalState = localExists ? dataRef.current : localState;
      const decision = reconcileAccountDocument({ localState: currentLocalState, localExists, cloudDocument: document, metadata });
      cloudDocumentRef.current = document;
      if (decision.action === "use-cloud") {
        pendingSaveRef.current = null;
        applyCloudDocument(document);
        scheduleIncrementalSync(0);
        setHydrated(true);
      } else if (!document && legacyState) {
        dataRef.current = legacyState;
        setData(legacyState);
        setLegacyChoice({ state: legacyState });
      } else if (decision.action === "use-local") {
        pendingSaveRef.current = null;
        if (document) writeMetadata(identity.id, document, currentLocalState);
        setHydrated(true);
        setSync({ status: "synced", document, message: "", omittedImages: 0 });
        scheduleIncrementalSync(0);
      } else if (decision.action === "conflict") {
        pendingSaveRef.current = null;
        setHydrated(true);
        setSync({ status: "conflict", document, message: "", omittedImages: 0 });
      } else {
        if (!localExists) persistLocal(currentLocalState, true);
        setHydrated(true);
        setSync({ status: "dirty", document, message: "", omittedImages: 0 });
      }
    } catch (error) {
      if (generation !== generationRef.current) return;
      console.error(error);
      setSync({
        status: localExists ? cloudSyncStatus(error, navigator.onLine) : (navigator.onLine ? "load-error" : "offline"),
        document: null,
        message: "",
        omittedImages: 0
      });
      if (!localExists) {
        // A missing cache is expected on a new device. Keep this account's
        // initial state usable while the cloud read remains retryable.
        persistLocal(localState, true);
        setHydrated(true);
      }
    } finally {
      if (reconcilingGenerationRef.current === generation) reconcilingGenerationRef.current = null;
    }
  }, [applyCloudDocument, identity?.id, persistLocal, testAuthEnabled]);

  const syncNow = useCallback(() => {
    const generation = generationRef.current;
    if (incrementalReadyRef.current) {
      return runIncrementalSync({ generation });
    }
    setSync((current) => ({ ...current, status: "checking", message: "" }));
    return reconcileCloud({
      localState: dataRef.current,
      localExists: true,
      generation
    }).finally(async () => {
      if (generation !== generationRef.current || incrementalReadyRef.current) return;
      if (await initializeIncrementalSync({ generation })) await runIncrementalSync({ generation });
    });
  }, [initializeIncrementalSync, reconcileCloud, runIncrementalSync]);

  useEffect(() => {
    if (!identity?.id) return undefined;
    incrementalReadyRef.current = false;
    incrementalRunningRef.current = false;
    incrementalRetryAttemptRef.current = 0;
    legacyStructureDirtyRef.current = false;
    if (incrementalRetryTimerRef.current) window.clearTimeout(incrementalRetryTimerRef.current);
    if (incrementalWakeRef.current) window.clearTimeout(incrementalWakeRef.current);
    generationRef.current += 1;
    const generation = generationRef.current;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveQueuedRef.current = false;
    pendingSaveRef.current = null;
    setHydrated(false);
    setRecovery(null);
    setLegacyChoice(null);
    setLegacyChoiceBusy(false);
    setSync({ status: "checking", document: null, message: "", omittedImages: 0 });
    const scopedKey = testAuthEnabled ? STORAGE_KEY : accountDataStorageKey(identity.id);
    setAttachmentStorageOwner(identity.id);
    storageKeyRef.current = scopedKey;
    const result = loadStoredState(() => window.localStorage, scopedKey, createInitialState, restoreState);
    canPersistRef.current = result.canPersist;
    if (result.mode === "recovery-needed") {
      console.error(result.error);
      dataRef.current = result.state;
      setData(result.state);
      setRecovery({ rawPayload: result.rawPayload, error: result.error });
      setHydrated(true);
      setSync({ status: "blocked", document: null, message: "", omittedImages: 0 });
      return undefined;
    }
    if (result.mode === "ready") {
      dataRef.current = result.state;
      setData(result.state);
      setHydrated(true);
      reconcileCloud({ localState: result.state, localExists: true, generation });
      return undefined;
    }

    let legacyState = null;
    if (!testAuthEnabled) {
      const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        try {
          legacyState = restoreState(JSON.parse(legacyRaw));
        } catch (error) {
          console.error(error);
        }
      }
    }
    const initial = result.state;
    dataRef.current = initial;
    setData(initial);
    if (testAuthEnabled) {
      persistLocal(initial, true);
      setHydrated(true);
    }
    reconcileCloud({ localState: initial, localExists: false, legacyState, generation });
    return undefined;
  }, [identity?.id, persistLocal, reconcileCloud, testAuthEnabled]);

  useEffect(() => {
    if (!hydrated || !identity?.id || recovery || testAuthEnabled || sync.status !== "dirty") return undefined;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (incrementalReadyRef.current && !legacyStructureDirtyRef.current) {
      scheduleIncrementalSync(300);
      return undefined;
    }
    saveTimerRef.current = window.setTimeout(() => saveToCloud(), 1200);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [data, hydrated, identity?.id, recovery, saveToCloud, scheduleIncrementalSync, sync.status, testAuthEnabled]);

  useEffect(() => {
    if (!hydrated || !identity?.id || recovery || testAuthEnabled) return undefined;
    void initializeIncrementalSync({ generation: generationRef.current });
    return undefined;
  }, [hydrated, identity?.id, initializeIncrementalSync, recovery, testAuthEnabled]);

  useEffect(() => {
    if (!identity?.id || testAuthEnabled) return undefined;
    const retryRead = () => {
      if (["offline", "error", "retrying"].includes(sync.status)) {
        reconcileCloud({
          localState: dataRef.current,
          localExists: true,
          generation: generationRef.current
        });
      }
      if (!incrementalReadyRef.current && navigator.onLine) {
        const generation = generationRef.current;
        void initializeIncrementalSync({ generation }).then((ready) => {
          if (ready && generation === generationRef.current) return runIncrementalSync({ generation });
          return false;
        });
      }
      if (incrementalReadyRef.current && navigator.onLine) scheduleIncrementalSync(0);
    };
    const unsubscribeMobileRuntime = subscribeMobileRuntime(({ lifecycle, network }) => {
      if (lifecycle === "active" || network === "online") retryRead();
    });
    const timer = ["error", "retrying"].includes(sync.status) && navigator.onLine
      ? window.setTimeout(retryRead, 3000)
      : null;
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine && incrementalReadyRef.current) scheduleIncrementalSync(0);
    }, 15_000);
    window.addEventListener("online", retryRead);
    return () => {
      unsubscribeMobileRuntime();
      if (timer) window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("online", retryRead);
    };
  }, [identity?.id, initializeIncrementalSync, reconcileCloud, runIncrementalSync, scheduleIncrementalSync, sync.status, testAuthEnabled]);

  useEffect(() => {
    if (!identity?.id || testAuthEnabled || !incrementalReadyRef.current) return undefined;
    const client = getSupabaseBrowserClient();
    if (!client) return undefined;
    return subscribeSyncChanges(client, identity.id, () => scheduleIncrementalSync(0));
  }, [identity?.id, scheduleIncrementalSync, testAuthEnabled, sync.status]);

  const commitData = useCallback((updater) => {
    if (!hydrated || !identity?.id) return false;
    const previousData = dataRef.current;
    const nextData = typeof updater === "function" ? updater(previousData) : updater;
    if (!persistLocal(nextData)) return false;
    if (structureStateFingerprint(previousData) !== structureStateFingerprint(nextData)) {
      legacyStructureDirtyRef.current = true;
    }
    enqueueStreamDiff(previousData, nextData);
    scheduleIncrementalSync(300);
    setSync((current) => current.status === "conflict" ? current : { ...current, status: "dirty", message: "" });
    return true;
  }, [enqueueStreamDiff, hydrated, identity?.id, persistLocal, scheduleIncrementalSync]);

  const replaceData = useCallback((nextData) => {
    if (!hydrated || !identity?.id) return false;
    if (!persistLocal(nextData, true, false)) return false;
    legacyStructureDirtyRef.current = true;
    setRecovery(null);
    setSync((current) => current.status === "conflict" ? current : { ...current, status: "dirty", message: "" });
    return true;
  }, [hydrated, identity?.id, persistLocal]);

  async function adoptLegacyData() {
    if (!legacyChoice || !identity?.id) return;
    setLegacyChoiceBusy(true);
    let claim = null;
    try {
      claim = await claimLegacyAttachmentBlobs(attachmentRefsFromState(legacyChoice.state).map((item) => item.id));
      if (!persistLocal(legacyChoice.state, true)) throw new Error("Account cache could not be created");
      legacyStructureDirtyRef.current = true;
      setLegacyChoice(null);
      setHydrated(true);
      setSync({ status: "dirty", document: null, message: "", omittedImages: 0 });
    } catch (error) {
      console.error(error);
      if (claim) {
        try {
          await releaseClaimedLegacyAttachmentBlobs(claim);
        } catch (rollbackError) {
          console.error(rollbackError);
        }
      }
      setLegacyChoiceBusy(false);
    }
  }

  function startFresh() {
    const initial = createInitialState();
    persistLocal(initial, true);
    legacyStructureDirtyRef.current = true;
    setLegacyChoice(null);
    setHydrated(true);
    setSync({ status: "dirty", document: null, message: "", omittedImages: 0 });
  }

  const acceptCloud = useCallback(async () => {
    if (!sync.document) return false;
    if (testAuthEnabled) return applyCloudDocument(sync.document);
    const client = getSupabaseBrowserClient();
    if (!client || !identity?.id) return false;
    try {
      const latest = await readCloudDocument(client, identity.id);
      if (!latest || latest.revision !== sync.document.revision) {
        setSync({ status: "conflict", document: latest, message: "", omittedImages: 0 });
        return false;
      }
      pendingSaveRef.current = null;
      return applyCloudDocument(latest);
    } catch (error) {
      console.error(error);
      setSync((current) => ({ ...current, status: cloudSyncStatus(error, navigator.onLine) }));
      return false;
    }
  }, [applyCloudDocument, identity?.id, sync.document, testAuthEnabled]);
  const keepLocal = useCallback(() => saveToCloud(sync.document?.revision ?? null), [saveToCloud, sync.document?.revision]);
  const retrySync = useCallback(() => {
    if (!identity?.id) return;
    setSync((current) => ({ ...current, status: "checking", message: "" }));
    const generation = generationRef.current;
    void reconcileCloud({
      localState: dataRef.current,
      localExists: true,
      generation
    }).finally(async () => {
      if (generation !== generationRef.current || incrementalReadyRef.current) return;
      if (await initializeIncrementalSync({ generation })) await runIncrementalSync({ generation });
    });
  }, [identity?.id, initializeIncrementalSync, reconcileCloud, runIncrementalSync]);

  const resolveSyncConflict = useCallback(async ({ kind, entityId, resolution, payload = undefined }) => {
    if (!identity?.id || !SYNC_KINDS.includes(kind)) return false;
    const stream = streamStateRef.current[kind] || makeSyncStreamState(identity.id, kind);
    const conflict = (stream.conflicts || []).find((item) => item.entityId === entityId);
    if (!conflict) return false;
    const client = getSupabaseBrowserClient();
    if (!client) return false;
    let latest = null;
    try {
      latest = await readSyncItem(client, identity.id, kind, entityId);
    } catch (error) {
      console.error(error);
      setSync((current) => ({
        ...current,
        status: cloudSyncStatus(error, navigator.onLine),
        message: ""
      }));
      return false;
    }
    if (latest && Number(latest.itemVersion) !== Number(conflict.itemVersion || 0)) {
      scheduleIncrementalSync(0);
      return false;
    }
    const currentItems = streamItems(dataRef.current, kind);
    const currentItem = currentItems.find((item) => item.id === entityId) || null;
    let nextItems = currentItems;
    let nextStream = {
      ...stream,
      conflicts: (stream.conflicts || []).filter((item) => item.entityId !== entityId)
    };

    if (resolution === "cloud") {
      const remotePayload = latest?.payload || conflict.remote || null;
      if (remotePayload) {
        nextItems = currentItems.some((item) => item.id === entityId)
          ? currentItems.map((item) => item.id === entityId ? remotePayload : item)
          : [...currentItems, remotePayload];
      } else {
        nextItems = currentItems.filter((item) => item.id !== entityId);
      }
      nextStream = {
        ...nextStream,
        outbox: (nextStream.outbox || []).filter((item) => item.entityId !== entityId),
        base: { ...nextStream.base, [entityId]: remotePayload },
        versions: { ...nextStream.versions, [entityId]: latest?.itemVersion || conflict.itemVersion || conflict.serverSeq || 0 },
        cursor: Math.max(Number(nextStream.cursor) || 0, Number(latest?.serverSeq) || Number(conflict.serverSeq) || 0)
      };
    } else {
      const localPayload = currentItem || conflict.local || null;
      const chosenPayload = resolution === "merged"
        ? payload
        : resolution === "local"
          ? localPayload
          : conflict.remote || null;
      const mutation = makeSyncMutation({
        kind,
        operation: chosenPayload ? "upsert" : "delete",
        entityId,
        baseVersion: Number(conflict.itemVersion || 0),
        payload: chosenPayload,
        deviceId: deviceId()
      });
      nextStream = {
        ...nextStream,
        outbox: coalesceSyncMutations([...(nextStream.outbox || []), mutation]),
        base: { ...nextStream.base, [entityId]: latest?.payload || conflict.remote || null },
        versions: { ...nextStream.versions, [entityId]: latest?.itemVersion || conflict.itemVersion || 0 }
      };
      nextItems = chosenPayload
        ? (currentItems.some((item) => item.id === entityId) ? currentItems.map((item) => item.id === entityId ? chosenPayload : item) : [...currentItems, chosenPayload])
        : currentItems.filter((item) => item.id !== entityId);
    }

    const nextState = stateWithStreamItems(dataRef.current, kind, nextItems);
    if (!persistLocal(nextState, true)) return false;
    streamStateRef.current = { ...streamStateRef.current, [kind]: nextStream };
    persistStreamState(kind, nextStream);
    updateStreamConflicts(streamStateRef.current);
    setSync((current) => ({ ...current, status: nextStream.conflicts.length ? "conflict" : "dirty", message: "" }));
    scheduleIncrementalSync(0);
    return true;
  }, [identity?.id, persistLocal, persistStreamState, scheduleIncrementalSync, updateStreamConflicts]);

  const value = useMemo(() => ({
    data,
    commitData,
    hydrated,
    recovery,
    replaceData,
    storageErrorCount,
    sync,
    streamConflicts,
    syncNow,
    acceptCloud,
    keepLocal,
    resolveSyncConflict,
    retrySync
  }), [acceptCloud, commitData, data, hydrated, keepLocal, recovery, replaceData, retrySync, resolveSyncConflict, storageErrorCount, streamConflicts, sync, syncNow]);

  if (legacyChoice) {
    return (
      <main className="account-gate">
        <section className="account-gate-card legacy-choice" aria-labelledby="legacy-choice-title">
          <span className="brand-mark">L</span>
          <div className="account-gate-heading">
            <p>{t("auth.legacyEyebrow")}</p>
            <h1 id="legacy-choice-title">{t("auth.legacyTitle")}</h1>
            <span>{t("auth.legacyDescription")}</span>
          </div>
          <div className="legacy-choice-actions">
            <button type="button" disabled={legacyChoiceBusy} onClick={adoptLegacyData}>{t(legacyChoiceBusy ? "settings.accountSubmitting" : "auth.legacyUse")}</button>
            <button type="button" disabled={legacyChoiceBusy} onClick={startFresh}>{t("auth.legacyFresh")}</button>
          </div>
          <p className="account-gate-footnote">{t("auth.legacyFootnote")}</p>
        </section>
      </main>
    );
  }

  return (
    <DataContext.Provider value={value}>
      {children}
      {sync.status === "conflict" && (
        <a className="cloud-sync-alert" href="/settings#account" role="status">{t("sync.conflictBanner")}</a>
      )}
    </DataContext.Provider>
  );
}

export function useLogNoteDataContext() {
  const value = useContext(DataContext);
  if (!value) throw new Error("useLogNoteDataContext must be used inside LogNoteDataProvider");
  return value;
}
