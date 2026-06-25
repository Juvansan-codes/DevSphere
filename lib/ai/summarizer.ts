import getGroqClient, { CHAT_MODEL } from './groq';
import {
  extractTokenUsage,
  getErrorMessage,
  logAiRequest,
  withGroqRetry,
} from '@/lib/ai/groq-utils';
import type { ChatMessage } from '@/types/chat';

const SUMMARIZER_PROMPT = `You are a conversation summarization assistant. Your task is to summarize the key points of the travel conversation.
You will be provided with the "Current Summary" (if any) and a list of "New Messages".
Combine them into a single, concise, updated summary.

Rules:
- Keep the summary brief and focus on facts, user preferences, and decisions made (e.g., destinations chosen, itinerary days locked in, budget limits).
- Do not include conversational filler like "The user said" or "I suggested". 
- Write in a direct, bullet-point style or concise sentences.
- Only include information relevant to the trip.`;

export async function summarizeMessages(
  currentSummary: string,
  newMessages: ChatMessage[]
): Promise<string> {
  if (newMessages.length === 0) return currentSummary;
  const startedAt = Date.now();
  let attempts = 0;

  const messagesText = newMessages
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n');

  const userPrompt = `Current Summary:\n${
    currentSummary || 'None'
  }\n\nNew Messages:\n${messagesText}\n\nPlease provide the updated summary.`;

  try {
    const retryResult = await withGroqRetry(() =>
      getGroqClient().chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: SUMMARIZER_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })
    );
    const completion = retryResult.result;
    attempts = retryResult.attempts;
    logAiRequest({
      route: 'summarizer',
      model: CHAT_MODEL,
      durationMs: Date.now() - startedAt,
      attempts,
      success: true,
      ...extractTokenUsage(completion),
    });

    const newSummary = completion.choices[0]?.message?.content?.trim();
    return newSummary || currentSummary;
  } catch (error) {
    console.error('[Summarizer] Failed to summarize messages:', error);
    logAiRequest({
      route: 'summarizer',
      model: CHAT_MODEL,
      durationMs: Date.now() - startedAt,
      attempts: attempts || 1,
      success: false,
      error: getErrorMessage(error),
    });
    return currentSummary;
  }
}
