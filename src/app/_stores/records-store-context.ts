"use client";

/** @fileoverview Exposes the provider-owned records store without creating a global singleton. */

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { RecordsStore, RecordsStoreState } from "./records-store";

export const RecordsStoreContext = createContext<RecordsStore | null>(null);

/** Reads record state from the nearest LogNoteDataProvider-owned store. */
export function useRecordsStore<T>(selector: (state: RecordsStoreState) => T): T {
  const store = useContext(RecordsStoreContext);
  if (!store) throw new Error("useRecordsStore must be used inside LogNoteDataProvider");
  return useStore(store, selector);
}
