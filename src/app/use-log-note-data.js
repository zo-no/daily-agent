"use client";

/**
 * @fileoverview 在页面间共享本地记录的加载、迁移、保存与短提示状态。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  createInitialState,
  restoreState
} from "@/lib/data.mjs";
import { loadStoredState, persistStoredState } from "@/lib/storage-state.mjs";

function reportError(callback, message) {
  if (typeof callback === "function") callback(message);
}

/** 从 localStorage 恢复数据并在后续变更时保存。 */
export function useLogNoteData(
  onStorageError,
  loadErrorMessage = "Could not read local data. Your saved data has not been changed.",
  saveErrorMessage = "Could not save local data. Export a backup before closing the page."
) {
  const [data, setData] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const initialLoadRef = useRef({ onStorageError, loadErrorMessage });
  const loadedRef = useRef(false);
  const canPersistRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const { onStorageError: reportStorageError, loadErrorMessage: initialLoadErrorMessage } = initialLoadRef.current;
    const result = loadStoredState(() => window.localStorage, STORAGE_KEY, createInitialState, restoreState);
    canPersistRef.current = result.canPersist;
    setData(result.state);
    if (result.mode === "recovery-needed") {
      console.error(result.error);
      setRecovery({ rawPayload: result.rawPayload, error: result.error });
      reportError(reportStorageError, initialLoadErrorMessage);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const result = persistStoredState(() => window.localStorage, STORAGE_KEY, data, { allowWrite: canPersistRef.current });
    if (result.blocked) {
      reportError(onStorageError, saveErrorMessage);
      return;
    }
    if (!result.ok) {
      console.error(result.error);
      reportError(onStorageError, saveErrorMessage);
    }
  }, [data, hydrated, onStorageError, saveErrorMessage]);

  const commitData = useCallback((updater) => {
    if (!hydrated) return false;
    const nextData = typeof updater === "function" ? updater(data) : updater;
    const result = persistStoredState(() => window.localStorage, STORAGE_KEY, nextData, { allowWrite: canPersistRef.current });
    if (!result.ok) {
      if (result.error) console.error(result.error);
      reportError(onStorageError, saveErrorMessage);
      return false;
    }
    skipNextPersistRef.current = true;
    setData(nextData);
    return true;
  }, [data, hydrated, onStorageError, saveErrorMessage]);

  const resetToDefaults = useCallback(() => {
    if (!hydrated) return false;
    canPersistRef.current = true;
    setRecovery(null);
    setData(createInitialState());
    return true;
  }, [hydrated]);

  const resumePersistence = useCallback(() => {
    if (!hydrated) return false;
    canPersistRef.current = true;
    setRecovery(null);
    return true;
  }, [hydrated]);

  return { data, setData, commitData, hydrated, recovery, resetToDefaults, resumePersistence };
}

export function useToast() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  return [toast, setToast];
}
