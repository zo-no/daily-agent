import assert from "node:assert/strict";
import test from "node:test";
import { AiClassifierError } from "../src/shared/ai/http-boundary.mjs";
import { DeepSeekModelError } from "../src/infrastructure/ai/deepseek-execution.mjs";
import { toDeepSeekRouteError } from "../src/infrastructure/ai/route-error.mjs";

test("shared DeepSeek route mapper preserves common and capability-specific public errors", () => {
  const rateLimited = toDeepSeekRouteError({ status: 429 });
  assert.equal(rateLimited.code, "AI_RATE_LIMITED");
  assert.equal(rateLimited.status, 429);

  const configured = toDeepSeekRouteError(
    { code: "AI_PROVIDER_NOT_CONFIGURED" },
    { sharedMessage: "calendar diary review request failed" }
  );
  assert.equal(configured.message, "calendar diary review request failed");

  const invalid = toDeepSeekRouteError(
    { code: "AI_RUNTIME_INVALID_OUTPUT" },
    {
      invalidOutput: {
        code: "AI_DOMAIN_REVIEW_RESPONSE_INVALID",
        message: "model returned an invalid domain review"
      },
      unavailable: { code: "AI_UNAVAILABLE", message: "model request failed" }
    }
  );
  assert.equal(invalid.code, "AI_DOMAIN_REVIEW_RESPONSE_INVALID");

  const bounded = toDeepSeekRouteError(
    new DeepSeekModelError("AI_PROVIDER_RESPONSE_TOO_LARGE", "too large"),
    {
      invalidOutput: { code: "AI_RESPONSE_INVALID", message: "invalid" },
      responseTooLarge: { code: "AI_RESPONSE_TOO_LARGE", message: "too large" },
      unavailable: { code: "AI_UNAVAILABLE", message: "unavailable" }
    }
  );
  assert.equal(bounded.code, "AI_RESPONSE_TOO_LARGE");

  const existing = new AiClassifierError("AI_DOMAIN_DAILY_SUMMARY_UNSAFE", "unsafe", 502);
  assert.equal(toDeepSeekRouteError(existing), existing);
});
