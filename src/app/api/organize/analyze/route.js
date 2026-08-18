/**
 * @fileoverview Authenticated server boundary for explicit DeepSeek smart organize.
 */

import { createClient } from "@supabase/supabase-js";
import { isSafePublicSupabaseKey } from "@/lib/auth-model.mjs";
import { createAiRateLimiter, postAiClassifier } from "@/lib/ai-classifier-route.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const rateLimit = createAiRateLimiter();

async function verifyAccessToken(token) {
  if (!SUPABASE_URL || !isSafePublicSupabaseKey(SUPABASE_PUBLISHABLE_KEY)) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user;
}

export async function POST(request) {
  return postAiClassifier(request, { verifyAccessToken, rateLimit });
}
