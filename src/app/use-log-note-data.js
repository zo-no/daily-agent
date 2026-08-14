"use client";

/**
 * @fileoverview 在页面间共享本地记录的加载、迁移、保存与短提示状态。
 */

import { useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  createInitialState,
  normalizeState
} from "@/lib/data.mjs";
import { ensureDailySeed } from "@/lib/seed.mjs";

/** 从 localStorage 恢复数据并在后续变更时保存。 */
export function useLogNoteData(onLoadError, loadErrorMessage = "Could not read local data. Default settings were loaded.") {
  const [data, setData] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const initialLoadRef = useRef({ onLoadError, loadErrorMessage });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const { onLoadError: reportLoadError, loadErrorMessage: initialLoadErrorMessage } = initialLoadRef.current;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setData(ensureDailySeed(normalizeState(JSON.parse(saved))));
    } catch (error) {
      console.error(error);
      reportLoadError(initialLoadErrorMessage);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

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
