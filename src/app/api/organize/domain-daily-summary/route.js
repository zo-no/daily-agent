/** @fileoverview Authenticated App Router boundary for current-domain daily summary. */
import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postDomainDailySummary } from "@/modules/insights/domain-daily-summary/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postDomainDailySummary(request, {
    verifyAccessToken: verifySupabaseAccessToken,
    rateLimit
  });
}
