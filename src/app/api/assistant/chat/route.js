import { verifySupabaseAccessToken } from "@/infrastructure/auth/supabase-access-token.mjs";
import { createAiRateLimiter } from "@/shared/ai/rate-limit.mjs";
import { postChat } from "@/modules/assistant/chat/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const rateLimit = createAiRateLimiter();
export async function POST(request) {
  return postChat(request, { verifyAccessToken: verifySupabaseAccessToken, rateLimit });
}
