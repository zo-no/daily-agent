"use client";

/**
 * @fileoverview Lazily creates the optional Supabase browser auth client.
 */

import { createClient } from "@supabase/supabase-js";
import { isSafePublicSupabaseKey } from "@/shared/auth/model.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
let browserClient = null;

export function hasSupabaseBrowserConfig() {
  if (!SUPABASE_URL || !isSafePublicSupabaseKey(SUPABASE_PUBLISHABLE_KEY)) return false;
  try {
    return ["http:", "https:"].includes(new URL(SUPABASE_URL).protocol);
  } catch {
    return false;
  }
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseBrowserConfig()) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "log-note:auth"
      }
    });
  }
  return browserClient;
}
