import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postPlanRecordReview } from "@/modules/organize/plan-record-review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const rateLimit = createAiRateLimiter();
export async function POST(request) { return postPlanRecordReview(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit }); }
