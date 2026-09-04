/**
 * @fileoverview Authenticated server boundary for explicit single-day timeline review.
 */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postDailyReview } from "@/modules/organize/daily-review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postDailyReview(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
