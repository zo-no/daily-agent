/** Authenticated server boundary for transient in-page Agent diary review. */

import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postAgentReview } from "@/modules/assistant/review/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimit = createAiRateLimiter();

export async function POST(request) {
  return postAgentReview(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
