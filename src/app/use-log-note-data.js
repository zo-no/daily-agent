"use client";

/**
 * @fileoverview 在页面间共享本地记录的加载、迁移、保存与短提示状态。
 */

import { useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  createInitialState,
  restoreState
} from "@/lib/data.mjs";

/** 从 localStorage 恢复数据并在后续变更时保存。 */
export function useLogNoteData(
  onStorageError,
  loadErrorMessage = "Could not read local data. Default settings were loaded.",
  saveErrorMessage = "Could not save local data. Export a backup before closing the page."
) {
  const [data, setData] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const initialLoadRef = useRef({ onStorageError, loadErrorMessage });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const { onStorageError: reportStorageError, loadErrorMessage: initialLoadErrorMessage } = initialLoadRef.current;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setData(restoreState(JSON.parse(saved)));
    } catch (error) {
      console.error(error);
      reportStorageError(initialLoadErrorMessage);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error(error);
      onStorageError(saveErrorMessage);
    }
  }, [data, hydrated, onStorageError, saveErrorMessage]);

  return { data, setData, hydrated };
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
