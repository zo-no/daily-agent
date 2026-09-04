/**
 * @fileoverview Authenticated server boundary for explicit DeepSeek smart organize.
 */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postAiClassifier } from "@/modules/organize/classification/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postAiClassifier(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
