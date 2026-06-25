type RetryOptions = {
  signal?: AbortSignal;
  maxAttempts?: number;
  delaysMs?: number[];
};

type AiRequestLog = {
  route: string;
  model: string;
  durationMs: number;
  success: boolean;
  attempts?: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  error?: string;
};

type TokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

const DEFAULT_RETRY_DELAYS_MS = [500, 1_000, 2_000];

export async function withGroqRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; attempts: number }> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_RETRY_DELAYS_MS.length + 1;
  const delaysMs = options.delaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      return { result: await operation(), attempts };
    } catch (error) {
      lastError = error;

      if (
        attempts >= maxAttempts ||
        options.signal?.aborted ||
        !isRetryableGroqError(error)
      ) {
        throw error;
      }

      await sleep(delaysMs[attempts - 1] ?? delaysMs[delaysMs.length - 1], options.signal);
    }
  }

  throw lastError;
}

export function logAiRequest(log: AiRequestLog) {
  console.info('[AI Request]', {
    route: log.route,
    model: log.model,
    durationMs: log.durationMs,
    promptTokens: log.promptTokens ?? null,
    completionTokens: log.completionTokens ?? null,
    totalTokens: log.totalTokens ?? null,
    attempts: log.attempts ?? 1,
    success: log.success,
    ...(log.error ? { error: log.error } : {}),
  });
}

export function extractTokenUsage(response: unknown): TokenUsage {
  if (!response || typeof response !== 'object') {
    return emptyUsage();
  }

  const usage = (response as { usage?: unknown }).usage;
  if (!usage || typeof usage !== 'object') {
    return emptyUsage();
  }

  return {
    promptTokens: readNumber(usage, 'prompt_tokens'),
    completionTokens: readNumber(usage, 'completion_tokens'),
    totalTokens: readNumber(usage, 'total_tokens'),
  };
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function isRateLimitError(error: unknown): boolean {
  const status = readStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return status === 429 || message.includes('rate_limit') || message.includes('429');
}

function isRetryableGroqError(error: unknown): boolean {
  const status = readStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('rate_limit') ||
    message.includes('temporarily unavailable') ||
    message.includes('timeout')
  );
}

function readStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function readNumber(source: object, key: string): number | null {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function emptyUsage(): TokenUsage {
  return {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}
