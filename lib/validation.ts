/**
 * Shared validation utilities used across API routes.
 * Centralizes common input validation to eliminate edge-case gaps.
 */

/**
 * Validates whether a string is a valid MongoDB ObjectId format (24 hex chars).
 */
export function isValidObjectId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitizes a string by trimming whitespace and capping length.
 * Returns null if the result is empty.
 */
export function sanitizeString(
  str: unknown,
  maxLength: number
): string | null {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Validates a date string is in YYYY-MM-DD format and represents a real date.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) return false;

  // Verify the parsed date matches the input (catches things like Feb 30)
  const [year, month, day] = dateStr.split('-').map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

/**
 * Clamps a numeric value to [min, max] range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely parses a JSON request body, returning null on failure.
 */
export async function safeParseJSON(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return null;
    }
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Validates that a status value is one of the allowed trip statuses.
 */
export function isValidTripStatus(
  status: unknown
): status is 'planning' | 'booked' | 'completed' {
  return (
    typeof status === 'string' &&
    ['planning', 'booked', 'completed'].includes(status)
  );
}

/**
 * Creates a standard JSON error response.
 */
export function errorResponse(
  message: string,
  status: number,
  details?: string
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details ? { details } : {}),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
