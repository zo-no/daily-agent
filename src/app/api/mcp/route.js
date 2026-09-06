import { getBridgeQueue } from "@/infrastructure/mcp/bridge-queue.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function loopbackOnly(request) {
  const hostname = new URL(request.url).hostname;
  return LOOPBACK_HOSTS.has(hostname) || hostname === "::1";
}

function errorCode(error) {
  const code = String(error?.message || "BRIDGE_ERROR");
  return /^[A-Z0-9_]+$/u.test(code) ? code : "BRIDGE_ERROR";
}

export async function POST(request) {
  if (!loopbackOnly(request)) return json({ error: { code: "LOOPBACK_ONLY", message: "Agent Bridge is available only on loopback" } }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "INVALID_JSON", message: "request body must be JSON" } }, 400);
  }
  const queue = getBridgeQueue();
  const action = String(body?.action || "");
  try {
    if (action === "pair") return json({ ok: true, pairing: queue.createPairing() });
    const token = request.headers.get("x-log-note-bridge-token") || body?.token;
    if (!token) return json({ error: { code: "PAIRING_REQUIRED", message: "pairing token is required" } }, 401);
    if (action === "status") return json({ ok: true, status: queue.status(token) });
    if (action === "revoke") return json({ ok: true, result: queue.revoke(token) });
    if (action === "enqueue") return json({ ok: true, result: queue.enqueue({ token, requestId: body.requestId, kind: body.kind, payload: body.payload }) });
    if (action === "claim") return json({ ok: true, request: queue.claim(token) });
    if (action === "resolve") return json({ ok: true, result: queue.resolve(token, { requestId: body.requestId, result: body.result, error: body.error }) });
    if (action === "poll") return json({ ok: true, result: queue.poll(token, body.requestId) });
    if (action === "cancel") return json({ ok: true, result: queue.cancel(token, body.requestId) });
    return json({ error: { code: "UNKNOWN_ACTION", message: "unsupported bridge action" } }, 400);
  } catch (error) {
    const code = errorCode(error);
    const status = ["PAIRING_UNAVAILABLE", "PAIRING_REQUIRED"].includes(code) ? 401 : 400;
    return json({ error: { code, message: code === "BRIDGE_ERROR" ? "bridge request failed" : code.toLowerCase().replaceAll("_", " ") } }, status);
  }
}
