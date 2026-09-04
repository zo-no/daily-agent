/**
 * @fileoverview Authenticated server boundary for an explicit seven-day domain review.
 */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postDomainReview } from "@/modules/insights/domain-review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postDomainReview(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
