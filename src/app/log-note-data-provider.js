"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEY, createInitialState, restoreState } from "@/lib/data.mjs";
import { attachmentRefsFromState } from "@/lib/attachment-model.mjs";
import { claimLegacyAttachmentBlobs, releaseClaimedLegacyAttachmentBlobs, setAttachmentStorageOwner } from "@/lib/attachment-store.mjs";
import { loadStoredState, persistStoredState } from "@/lib/storage-state.mjs";
import {
  accountDataStorageKey,
  accountSyncStorageKey,
  makeSyncMetadata,
  mergeCloudTextWithLocalAttachments,
  readSyncMetadata,
  reconcileAccountDocument,
  textStateFingerprint
} from "@/lib/account-sync.mjs";
import { cloudRevisionConflict, cloudSchemaUnavailable } from "@/lib/cloud-document.mjs";
import { readCloudDocument, saveCloudDocument } from "./cloud-document-client";
import { getSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n";

const DataContext = createContext(null);
const CLOUD_DEVICE_STORAGE_KEY = "log-note:cloud-device:v1";
const E2E_AUTH_CONFIGURED = process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1";

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
  const [loadBlocked, setLoadBlocked] = useState(false);
  const [sync, setSync] = useState({ status: "checking", document: null, message: "", omittedImages: 0 });
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

  const saveToCloud = useCallback(async (expectedRevision = cloudDocumentRef.current?.revision ?? null) => {
    if (!identity?.id || testAuthEnabled || recovery) return false;
    const generation = generationRef.current;
    if (savingGenerationRef.current === generation) {
      saveQueuedRef.current = true;
      return false;
    }
    const client = getSupabaseBrowserClient();
    if (!client) return false;
    savingGenerationRef.current = generation;
    const snapshot = dataRef.current;
    const snapshotFingerprint = textStateFingerprint(snapshot);
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
      pendingSaveRef.current = null;
      saveConfirmed = true;
      const changedDuringSave = textStateFingerprint(dataRef.current) !== snapshotFingerprint;
      setSync({
        status: changedDuringSave ? "dirty" : "synced",
        document: result.document,
        message: "",
        omittedImages: result.omittedImages
      });
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
          setSync((current) => ({ ...current, status: "error", message: "" }));
        }
      } else {
        setSync((current) => ({
          ...current,
          status: cloudSchemaUnavailable(error) ? "setup-required" : navigator.onLine ? "error" : "offline",
          message: ""
        }));
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
  }, [identity?.id, recovery, testAuthEnabled]);

  const reconcileCloud = useCallback(async ({ localState, localExists, legacyState = null, generation }) => {
    if (!identity?.id || testAuthEnabled) {
      setSync({ status: testAuthEnabled ? "test" : "checking", document: null, message: "", omittedImages: 0 });
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client || reconcilingGenerationRef.current === generation) return;
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
        status: cloudSchemaUnavailable(error) ? "setup-required" : localExists ? (navigator.onLine ? "error" : "offline") : "load-error",
        document: null,
        message: "",
        omittedImages: 0
      });
      if (!localExists) setLoadBlocked(true);
    } finally {
      if (reconcilingGenerationRef.current === generation) reconcilingGenerationRef.current = null;
    }
  }, [applyCloudDocument, identity?.id, persistLocal, testAuthEnabled]);

  useEffect(() => {
    if (!identity?.id) return undefined;
    generationRef.current += 1;
    const generation = generationRef.current;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveQueuedRef.current = false;
    pendingSaveRef.current = null;
    setHydrated(false);
    setRecovery(null);
    setLegacyChoice(null);
    setLegacyChoiceBusy(false);
    setLoadBlocked(false);
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
    saveTimerRef.current = window.setTimeout(() => saveToCloud(), 1200);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [data, hydrated, identity?.id, recovery, saveToCloud, sync.status, testAuthEnabled]);

  useEffect(() => {
    if (!identity?.id || testAuthEnabled) return undefined;
    const retryRead = () => {
      if (!["offline", "error"].includes(sync.status)) return;
      reconcileCloud({
        localState: dataRef.current,
        localExists: true,
        generation: generationRef.current
      });
    };
    const timer = sync.status === "error" && navigator.onLine
      ? window.setTimeout(retryRead, 3000)
      : null;
    window.addEventListener("online", retryRead);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("online", retryRead);
    };
  }, [identity?.id, reconcileCloud, sync.status, testAuthEnabled]);

  const commitData = useCallback((updater) => {
    if (!hydrated || !identity?.id) return false;
    const nextData = typeof updater === "function" ? updater(dataRef.current) : updater;
    if (!persistLocal(nextData)) return false;
    setSync((current) => current.status === "conflict" ? current : { ...current, status: "dirty", message: "" });
    return true;
  }, [hydrated, identity?.id, persistLocal]);

  const replaceData = useCallback((nextData) => {
    if (!hydrated || !identity?.id) return false;
    if (!persistLocal(nextData, true, false)) return false;
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
      setSync((current) => ({ ...current, status: navigator.onLine ? "error" : "offline" }));
      return false;
    }
  }, [applyCloudDocument, identity?.id, sync.document, testAuthEnabled]);
  const keepLocal = useCallback(() => saveToCloud(sync.document?.revision ?? null), [saveToCloud, sync.document?.revision]);
  const retrySync = useCallback(() => {
    if (!identity?.id) return;
    setSync((current) => ({ ...current, status: "checking", message: "" }));
    reconcileCloud({
      localState: dataRef.current,
      localExists: true,
      generation: generationRef.current
    });
  }, [identity?.id, reconcileCloud]);

  const value = useMemo(() => ({
    data,
    commitData,
    hydrated,
    recovery,
    replaceData,
    storageErrorCount,
    sync,
    acceptCloud,
    keepLocal,
    retrySync
  }), [acceptCloud, commitData, data, hydrated, keepLocal, recovery, replaceData, retrySync, storageErrorCount, sync]);

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

  if (loadBlocked) {
    return (
      <main className="account-gate">
        <section className="account-gate-card" role="alert">
          <span className="brand-mark">L</span>
          <div className="account-gate-heading"><h1>{t("auth.cloudLoadTitle")}</h1><span>{t("auth.cloudLoadDescription")}</span></div>
          <button className="account-password-action" type="button" onClick={() => window.location.reload()}>{t("auth.retry")}</button>
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
