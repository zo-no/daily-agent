/** @fileoverview Process-local per-user throttling for bounded AI capabilities. */

/** Deployment-wide quotas remain a provider or infrastructure responsibility. */
export function createAiRateLimiter({ limit = 10, windowMs = 60_000, now = Date.now } = {}) {
  const buckets = new Map();
  return (userId) => {
    const cutoff = now() - windowMs;
    const recent = (buckets.get(userId) || []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= limit) {
      buckets.set(userId, recent);
      return false;
    }
    recent.push(now());
    buckets.set(userId, recent);
    if (buckets.size > 1000) {
      for (const [id, timestamps] of buckets) {
        if (!timestamps.some((timestamp) => timestamp > cutoff)) buckets.delete(id);
      }
    }
    return true;
  };
}
