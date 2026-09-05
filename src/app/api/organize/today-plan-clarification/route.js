/** Authenticated route for the optional human-approved today plan clarification. */
import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { postTodayPlanClarification } from "@/modules/diary/today-plan-clarification/server.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const rateLimit = createAiRateLimiter();
export async function POST(request) { return postTodayPlanClarification(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit }); }
