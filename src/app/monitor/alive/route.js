/** Fixed OCTO health probe. It intentionally exposes no runtime configuration. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_BODY = JSON.stringify({ status: "ok", service: "log-note" });
const HEALTH_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "content-type": "application/json",
  "x-content-type-options": "nosniff"
};

export function GET() {
  return new Response(HEALTH_BODY, {
    status: 200,
    headers: HEALTH_HEADERS
  });
}
