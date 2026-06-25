import { NextResponse } from 'next/server';
import getGroqClient, { CHAT_MODEL } from '@/lib/ai/groq';
import {
  extractTokenUsage,
  getErrorMessage,
  isRateLimitError,
  logAiRequest,
  withGroqRetry,
} from '@/lib/ai/groq-utils';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { safeParseJSON, sanitizeString, errorResponse } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { TripMemory } from '@/types/chat';

/** Maximum allowed prompt length in characters */
const MAX_PROMPT_LENGTH = 10_000;

/** Timeout for AI requests in milliseconds */
const AI_TIMEOUT_MS = 30_000;

const AI_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const routeStartedAt = Date.now();
  let aiAttempts = 0;

  const rateLimit = checkRateLimit(
    `ai:${getClientIp(req)}`,
    AI_RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many AI requests',
      429,
      `Please wait ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds before trying again.`
    );
  }

  // 1. Parse request body safely
  const body = await safeParseJSON(req);
  if (!body) {
    return errorResponse(
      'Invalid request body',
      400,
      'Request body must be a valid JSON object with a "prompt" field.'
    );
  }

  // 2. Validate and sanitize the prompt
  const rawPrompt = body.prompt;
  if (rawPrompt === undefined || rawPrompt === null) {
    return errorResponse(
      'Prompt is required',
      400,
      'Please provide a "prompt" field in the request body.'
    );
  }

  if (typeof rawPrompt !== 'string') {
    return errorResponse(
      'Invalid prompt type',
      400,
      'The "prompt" field must be a string.'
    );
  }

  const prompt = sanitizeString(rawPrompt, MAX_PROMPT_LENGTH);
  if (!prompt) {
    return errorResponse(
      'Prompt cannot be empty',
      400,
      'Please provide a non-empty prompt.'
    );
  }

  if (rawPrompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(
      'Prompt too long',
      413,
      `Prompt must be under ${MAX_PROMPT_LENGTH.toLocaleString()} characters. Received ${rawPrompt.length.toLocaleString()}.`
    );
  }

  try {
    const client = getGroqClient();

    // 3. Inject system prompt so the AI stays on-topic (travel-only) even through this endpoint
    const emptyMemory: TripMemory = {};
    const systemPrompt = buildSystemPrompt(emptyMemory);

    // 4. Call Groq with timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let completion;
    try {
      const retryResult = await withGroqRetry(
        () =>
          client.chat.completions.create(
            {
              model: CHAT_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 2048,
              top_p: 0.9,
            },
            { signal: controller.signal }
          ),
        { signal: controller.signal }
      );
      completion = retryResult.result;
      aiAttempts = retryResult.attempts;
    } finally {
      clearTimeout(timeout);
    }

    const usage = extractTokenUsage(completion);
    logAiRequest({
      route: '/api/ai',
      model: CHAT_MODEL,
      durationMs: Date.now() - routeStartedAt,
      attempts: aiAttempts,
      success: true,
      ...usage,
    });

    // 5. Validate the response
    const choice = completion.choices?.[0];
    if (!choice || !choice.message) {
      console.error('[AI Route] No choices returned from model');
      return errorResponse(
        'AI did not return a response',
        502,
        'The AI model returned an empty response. Please try again.'
      );
    }

    const responseText = choice.message.content?.trim() || '';
    if (responseText.length === 0) {
      return errorResponse(
        'AI returned an empty response',
        502,
        'The AI model could not generate a response for this prompt. Please try rephrasing.'
      );
    }

    // 6. Check if response was truncated due to token limit
    const wasTruncated = choice.finish_reason === 'length';

    return NextResponse.json({
      text: responseText,
      ...(wasTruncated
        ? {
            truncated: true,
            notice:
              'The response was truncated due to length limits. Consider asking a more specific question.',
          }
        : {}),
    });
  } catch (error: unknown) {
    console.error('[AI Route] Error:', error);
    logAiRequest({
      route: '/api/ai',
      model: CHAT_MODEL,
      durationMs: Date.now() - routeStartedAt,
      attempts: aiAttempts || 1,
      success: false,
      error: getErrorMessage(error),
    });

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse(
        'Request timed out',
        504,
        'The AI took too long to respond. Please try a simpler prompt.'
      );
    }

    // Handle specific Groq API errors
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    if (isRateLimitError(error)) {
      return errorResponse(
        'Too many requests',
        429,
        'You are sending requests too quickly. Please wait a moment and try again.'
      );
    }

    if (
      errorMessage.includes('authentication') ||
      errorMessage.includes('401') ||
      errorMessage.includes('api_key')
    ) {
      return errorResponse(
        'AI service configuration error',
        503,
        'The AI service is not properly configured. Please contact support.'
      );
    }

    if (
      errorMessage.includes('model_not_found') ||
      errorMessage.includes('404')
    ) {
      return errorResponse(
        'AI model unavailable',
        503,
        'The requested AI model is currently unavailable. Please try again later.'
      );
    }

    return errorResponse(
      'Failed to fetch AI response',
      500,
      'An unexpected error occurred. Please try again.'
    );
  }
}
