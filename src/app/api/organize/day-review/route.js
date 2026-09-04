/** Authenticated same-origin route for the optional today's Calendar/diary Agent review. */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postCalendarDiaryReview } from "@/modules/insights/calendar-diary-review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postCalendarDiaryReview(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
