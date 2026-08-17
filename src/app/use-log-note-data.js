"use client";

/**
 * @fileoverview Shared authenticated Log Note data access and short toast state.
 */

import { useEffect, useRef, useState } from "react";
import { useLogNoteDataContext } from "./log-note-data-provider";

export function useLogNoteData(
  onStorageError,
  loadErrorMessage = "Could not read local data. Your saved data has not been changed.",
  saveErrorMessage = "Could not save local data. Export a backup before closing the page."
) {
  const context = useLogNoteDataContext();
  const lastErrorCountRef = useRef(context.storageErrorCount);

  useEffect(() => {
    if (context.storageErrorCount === lastErrorCountRef.current) return;
    lastErrorCountRef.current = context.storageErrorCount;
    if (typeof onStorageError === "function") onStorageError(saveErrorMessage || loadErrorMessage);
  }, [context.storageErrorCount, loadErrorMessage, onStorageError, saveErrorMessage]);

  return context;
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
