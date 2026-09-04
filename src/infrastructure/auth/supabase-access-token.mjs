/**
 * @fileoverview Server-only Supabase access-token verification adapter.
 *
 * Route Handlers own the decision to require authentication. This adapter only
 * verifies one bearer token against the configured Supabase project and never
 * reads or writes the account document.
 */

import { createClient } from "@supabase/supabase-js";
import { isSafePublicSupabaseKey } from "../../shared/auth/model.mjs";

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export async function verifySupabaseAccessToken(token, {
  createClientImpl = createClient,
  supabaseUrl = DEFAULT_SUPABASE_URL,
  publishableKey = DEFAULT_SUPABASE_PUBLISHABLE_KEY
} = {}) {
  if (!supabaseUrl || !isSafePublicSupabaseKey(publishableKey) || typeof createClientImpl !== "function") {
    return null;
  }

  const client = createClientImpl(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data?.user || null;
}
