/** Authenticated same-origin route for the optional today's Calendar/diary Agent review. */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postCalendarDiaryReview } from "@/modules/insights/calendar-diary-review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CALENDAR_AI_TRANSFER_ENABLED = process.env.CALENDAR_AI_TRANSFER_ENABLED === "1";
const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postCalendarDiaryReview(request, {
    enabled: CALENDAR_AI_TRANSFER_ENABLED,
    verifyAccessToken: verifySupabaseAccessToken,
    rateLimit
  });
}
