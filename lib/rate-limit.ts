type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    cleanupExpiredBuckets(now);
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return req.headers.get('x-real-ip') || 'unknown';
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
