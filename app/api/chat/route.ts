import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import getGroqClient, { CHAT_MODEL } from '@/lib/ai/groq';
import {
  estimateTokenCount,
  getErrorMessage,
  isRateLimitError,
  logAiRequest,
  withGroqRetry,
} from '@/lib/ai/groq-utils';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { extractMemory, mergeMemory } from '@/lib/ai/memory-extractor';
import { summarizeMessages } from '@/lib/ai/summarizer';
import { isValidObjectId, errorResponse } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import type { TripMemory as TripMemoryType } from '@/types/chat';

export const runtime = 'nodejs';

/** Maximum message length in characters */
const MAX_MESSAGE_LENGTH = 5_000;

/** Maximum messages per conversation before suggesting a new one */
const MAX_CONVERSATION_MESSAGES = 500;

/** Start enforcing summary discipline for large conversations */
const SUMMARY_MESSAGE_THRESHOLD = 300;

/** AI quota guard per authenticated user */
const AI_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Fallback message when AI returns empty content */
const FALLBACK_RESPONSE =
  "I'm sorry, I couldn't generate a response for that. Could you try rephrasing your question about travel planning?";

export async function POST(req: NextRequest) {
  const routeStartedAt = Date.now();
  let aiAttempts = 0;

  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = session.user.id;
    const rateLimit = checkRateLimit(
      `chat:${userId}`,
      AI_RATE_LIMIT,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        'Too many AI requests',
        429,
        `Please wait ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds before sending another message.`
      );
    }

    // 2. Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        'Invalid request body',
        400,
        'Request body must be valid JSON.'
      );
    }

    const { message, conversationId } = body as {
      message?: unknown;
      conversationId?: unknown;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse(
        'Message is required',
        400,
        'Please provide a non-empty message string.'
      );
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(
        'Message too long',
        413,
        `Messages must be under ${MAX_MESSAGE_LENGTH.toLocaleString()} characters. Received ${trimmedMessage.length.toLocaleString()}.`
      );
    }

    // 3. Validate conversationId format if provided
    if (conversationId !== undefined && conversationId !== null) {
      if (typeof conversationId !== 'string') {
        return errorResponse(
          'Invalid conversation ID',
          400,
          'The conversation ID must be a string.'
        );
      }

      if (conversationId.length > 0 && !isValidObjectId(conversationId)) {
        return errorResponse(
          'Invalid conversation ID',
          400,
          'The conversation ID format is invalid.'
        );
      }
    }

    await dbConnect();

    // 4. Load or create conversation
    let conversation;
    if (conversationId && typeof conversationId === 'string' && isValidObjectId(conversationId)) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });
      if (!conversation) {
        return errorResponse('Conversation not found', 404);
      }

      // Check conversation message cap
      if (conversation.messages.length >= MAX_CONVERSATION_MESSAGES) {
        return errorResponse(
          'Conversation limit reached',
          400,
          `This conversation has reached the ${MAX_CONVERSATION_MESSAGES}-message limit. Please start a new conversation for better AI performance.`
        );
      }
    } else {
      conversation = new Conversation({
        userId,
        title: trimmedMessage.slice(0, 80).trim() || 'New Trip Chat',
        messages: [],
        memory: {},
        conversationSummary: '',
        summaryIndex: 0,
      });
    }

    // 5. Load conversation memory
    const currentMemory: TripMemoryType = conversation.memory || {};

    // 6. Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    });

    // 7. Build messages for Groq
    const shouldRequireSummary =
      conversation.messages.length >= SUMMARY_MESSAGE_THRESHOLD;
    let conversationSummary = conversation.conversationSummary || '';

    if (shouldRequireSummary && !conversationSummary) {
      const messagesToSummarize = conversation.messages.slice(0, -15);
      conversationSummary = await summarizeMessages('', messagesToSummarize);
      conversation.conversationSummary = conversationSummary;
      conversation.summaryIndex = messagesToSummarize.length;
      await conversation.save();
    }

    const systemPrompt = buildSystemPrompt(currentMemory, conversationSummary);
    const groqMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Include last 15 messages for context window management
    const recentMessages = conversation.messages.slice(-15);
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        groqMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 8. Stream the response with timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let stream;
    try {
      const retryResult = await withGroqRetry(
        () =>
          getGroqClient().chat.completions.create(
            {
              model: CHAT_MODEL,
              messages: groqMessages,
              stream: true,
              temperature: 0.7,
              max_tokens: 2048,
              top_p: 0.9,
            },
            { signal: controller.signal }
          ),
        { signal: controller.signal }
      );
      stream = retryResult.result;
      aiAttempts = retryResult.attempts;
    } catch (streamInitError) {
      clearTimeout(timeout);
      throw streamInitError;
    }

    // Create a readable stream for the client
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(streamController) {
        try {
          // Send the conversation ID first
          const convId = conversation._id.toString();
          streamController.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`)
          );

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              streamController.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`)
              );
            }
          }

          clearTimeout(timeout);
          const promptTokens = estimateTokenCount(
            groqMessages.map((message) => message.content).join('\n')
          );
          const completionTokens = estimateTokenCount(fullResponse);
          logAiRequest({
            route: '/api/chat',
            model: CHAT_MODEL,
            durationMs: Date.now() - routeStartedAt,
            attempts: aiAttempts,
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            success: true,
          });

          // Use fallback if the AI returned nothing
          if (fullResponse.trim().length === 0) {
            fullResponse = FALLBACK_RESPONSE;
            streamController.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'token', content: FALLBACK_RESPONSE })}\n\n`
              )
            );
          }

          // Save assistant message
          conversation.messages.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          });
          await conversation.save();

          // Background tasks: memory extraction + summarization (non-blocking)
          (async () => {
            try {
              let needsSave = false;

              // 1. Memory Extraction
              const extracted = await extractMemory(trimmedMessage);
              if (
                Object.keys(extracted.updates).length > 0 ||
                extracted.forgetFields.length > 0
              ) {
                // Use atomic update to avoid race conditions
                await Conversation.findOneAndUpdate(
                  { _id: conversation._id, userId },
                  { $set: { memory: mergeMemory(currentMemory, extracted) } }
                );
              }

              // 2. Summarization — reload conversation to get fresh state
              const freshConv = await Conversation.findById(conversation._id);
              if (freshConv) {
                const summaryIndex = freshConv.summaryIndex || 0;
                if (freshConv.messages.length - summaryIndex > 15) {
                  const numToSummarize = freshConv.messages.length - summaryIndex - 15;
                  const messagesToSummarize = freshConv.messages.slice(
                    summaryIndex,
                    summaryIndex + numToSummarize
                  );

                  const newSummary = await summarizeMessages(
                    freshConv.conversationSummary || '',
                    messagesToSummarize
                  );

                  await Conversation.findOneAndUpdate(
                    { _id: conversation._id },
                    {
                      $set: {
                        conversationSummary: newSummary,
                        summaryIndex: summaryIndex + numToSummarize,
                      },
                    }
                  );
                  needsSave = false; // Already saved atomically
                }
              }

              // Safety: if somehow we still need to save
              if (needsSave) {
                await conversation.save();
              }
            } catch (err) {
              console.error('[Chat] Background tasks failed:', err);
            }
          })();

          // Signal completion
          streamController.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );
          streamController.close();
        } catch (error) {
          clearTimeout(timeout);
          console.error('[Chat] Streaming error:', error);
          logAiRequest({
            route: '/api/chat',
            model: CHAT_MODEL,
            durationMs: Date.now() - routeStartedAt,
            attempts: aiAttempts || 1,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            success: false,
            error: getErrorMessage(error),
          });

          // Save partial response if we collected any content
          if (fullResponse.trim().length > 0) {
            try {
              conversation.messages.push({
                role: 'assistant',
                content: fullResponse + '\n\n*[Response was interrupted]*',
                timestamp: new Date(),
              });
              await conversation.save();
            } catch (saveErr) {
              console.error('[Chat] Failed to save partial response:', saveErr);
            }
          }

          const isTimeout =
            error instanceof Error && error.name === 'AbortError';
          const errorMessage = isTimeout
            ? 'The AI took too long to respond. Please try a shorter or simpler question.'
            : error instanceof Error
              ? error.message
              : 'An unexpected error occurred';

          streamController.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
            )
          );
          streamController.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse(
        'Request timed out',
        504,
        'The AI took too long to respond. Please try again.'
      );
    }

    // Handle specific Groq API errors
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    const status =
      isRateLimitError(error)
        ? 429
        : errorMessage.includes('authentication') || errorMessage.includes('401')
          ? 401
          : 500;

    const userMessage =
      status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : status === 401
          ? 'AI service authentication failed. Please check the API key configuration.'
          : 'Something went wrong. Please try again.';

    return errorResponse(userMessage, status);
  }
}
