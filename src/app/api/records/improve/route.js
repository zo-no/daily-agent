import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postContentImprovement } from "@/modules/composer/content-improvement/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postContentImprovement(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
