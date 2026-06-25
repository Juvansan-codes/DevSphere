import getGroqClient, { EXTRACTION_MODEL } from './groq';
import {
  extractTokenUsage,
  getErrorMessage,
  logAiRequest,
  withGroqRetry,
} from '@/lib/ai/groq-utils';
import { TripMemory } from '@/types/chat';
import { isValidDateString, clamp, sanitizeString } from '@/lib/validation';

const MAX_BUDGET = 10_000_000;
const MIN_BUDGET = 1;
const MAX_TRAVELERS = 50;
const MAX_DESTINATION_LENGTH = 100;
const MAX_FREETEXT_LENGTH = 50;

const MEMORY_FIELDS = [
  'destination',
  'startDate',
  'endDate',
  'duration',
  'budget',
  'currency',
  'travelers',
  'travelStyle',
  'transportation',
  'accommodation',
  'interests',
  'tripStatus',
] as const;

type MemoryField = (typeof MEMORY_FIELDS)[number];

export type MemoryExtraction = {
  updates: Partial<TripMemory>;
  forgetFields: MemoryField[];
};

const EXTRACTION_PROMPT = `You are a data extraction assistant. Analyze the user's message and extract travel-related memory updates into JSON.

Return ONLY this JSON shape:
{
  "updates": { ...travel fields found },
  "forgetFields": ["fieldName"]
}

If no travel data is found, return {"updates":{},"forgetFields":[]}.

Allowed update fields:
- destination (string): The travel destination city/country
- startDate (string): Travel start date in YYYY-MM-DD format if possible
- endDate (string): Travel end date in YYYY-MM-DD format if possible
- duration (number): Trip duration in days
- budget (number): Numeric budget amount only
- currency (string): Currency code like USD, INR, EUR, GBP, etc.
- travelers (number): Number of travelers
- travelStyle (string): e.g., "luxury", "budget", "adventure", "relaxation", "backpacking"
- transportation (string): Preferred transport mode
- accommodation (string): Preferred accommodation type
- interests (string[]): Array of interest areas like ["food", "nature", "history"]
- tripStatus (string): One of "exploring", "planning", "booking", "finalized".

Rules:
- Put new or changed values in "updates". Do not include fields that are not mentioned.
- Put fields the user wants removed in "forgetFields". Example: "forget my budget" => ["budget"].
- Do not include explanations or markdown.
- Parse relative dates like "next month" or "in 2 weeks" into approximate dates if possible.
- For budget, extract only the numeric value and set the currency separately.
- Infer number of travelers from context, e.g. "me and my wife" = 2.
- If the user changes a field, extract the new value. Example: "Actually not Paris. Let's go Kyoto instead." => destination "Kyoto".

Examples:
User: "I want to visit Bali next month for 5 days with a budget of 80000 INR"
Output: {"updates":{"destination":"Bali","duration":5,"budget":80000,"currency":"INR"},"forgetFields":[]}

User: "Me and my wife want a luxury beach vacation"
Output: {"updates":{"travelers":2,"travelStyle":"luxury","interests":["beach"]},"forgetFields":[]}

User: "Can you suggest some good restaurants?"
Output: {"updates":{},"forgetFields":[]}

User: "I'm just looking at options for my summer vacation."
Output: {"updates":{"tripStatus":"exploring"},"forgetFields":[]}

User: "Help me book my flights to Paris."
Output: {"updates":{"destination":"Paris","tripStatus":"booking"},"forgetFields":[]}

User: "Actually, change the destination to Tokyo."
Output: {"updates":{"destination":"Tokyo"},"forgetFields":[]}

User: "Forget my budget."
Output: {"updates":{},"forgetFields":["budget"]}`;

export async function extractMemory(
  userMessage: string
): Promise<MemoryExtraction> {
  const startedAt = Date.now();
  let attempts = 0;

  try {
    const retryResult = await withGroqRetry(() =>
      getGroqClient().chat.completions.create({
        model: EXTRACTION_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      })
    );

    const completion = retryResult.result;
    attempts = retryResult.attempts;
    logAiRequest({
      route: 'memory-extractor',
      model: EXTRACTION_MODEL,
      durationMs: Date.now() - startedAt,
      attempts,
      success: true,
      ...extractTokenUsage(completion),
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) return emptyExtraction();

    let rawExtraction: Record<string, unknown>;
    try {
      rawExtraction = JSON.parse(responseText);
    } catch {
      console.error('[MemoryExtractor] Failed to parse JSON response:', responseText);
      return emptyExtraction();
    }

    const extraction = validateMemoryExtraction(rawExtraction);
    const heuristicForgetFields = detectForgetFields(userMessage);

    return {
      updates: extraction.updates,
      forgetFields: [...new Set([...extraction.forgetFields, ...heuristicForgetFields])],
    };
  } catch (error) {
    console.error('[MemoryExtractor] Failed to extract memory:', error);
    logAiRequest({
      route: 'memory-extractor',
      model: EXTRACTION_MODEL,
      durationMs: Date.now() - startedAt,
      attempts: attempts || 1,
      success: false,
      error: getErrorMessage(error),
    });
    return emptyExtraction();
  }
}

function validateMemoryExtraction(raw: Record<string, unknown>): MemoryExtraction {
  const extracted =
    raw.updates && typeof raw.updates === 'object' && !Array.isArray(raw.updates)
      ? (raw.updates as Record<string, unknown>)
      : raw;

  const sanitized: Partial<TripMemory> = {};
  const forgetFields = Array.isArray(raw.forgetFields)
    ? raw.forgetFields.filter(isMemoryField)
    : [];

  if (typeof extracted.destination === 'string') {
    const destination = sanitizeString(extracted.destination, MAX_DESTINATION_LENGTH);
    if (destination && destination.length >= 2) {
      sanitized.destination = destination;
    }
  }

  if (typeof extracted.startDate === 'string') {
    const date = extracted.startDate.trim();
    if (isValidDateString(date)) {
      sanitized.startDate = date;
    }
  }

  if (typeof extracted.endDate === 'string') {
    const date = extracted.endDate.trim();
    if (isValidDateString(date)) {
      sanitized.endDate = date;
    }
  }

  if (
    typeof sanitized.startDate === 'string' &&
    typeof sanitized.endDate === 'string' &&
    sanitized.endDate < sanitized.startDate
  ) {
    delete sanitized.endDate;
  }

  if (
    typeof extracted.duration === 'number' &&
    Number.isFinite(extracted.duration) &&
    extracted.duration > 0
  ) {
    sanitized.duration = clamp(Math.round(extracted.duration), 1, 365);
  }

  if (
    typeof extracted.budget === 'number' &&
    Number.isFinite(extracted.budget) &&
    extracted.budget > 0
  ) {
    sanitized.budget = clamp(Math.round(extracted.budget), MIN_BUDGET, MAX_BUDGET);
  }

  if (typeof extracted.currency === 'string' && extracted.currency.length > 0) {
    const currency = extracted.currency.trim().toUpperCase();
    if (/^[A-Z]{2,4}$/.test(currency)) {
      sanitized.currency = currency;
    }
  }

  if (
    typeof extracted.travelers === 'number' &&
    Number.isFinite(extracted.travelers) &&
    extracted.travelers > 0
  ) {
    sanitized.travelers = clamp(Math.round(extracted.travelers), 1, MAX_TRAVELERS);
  }

  if (typeof extracted.travelStyle === 'string') {
    const style = sanitizeString(extracted.travelStyle, MAX_FREETEXT_LENGTH);
    if (style) sanitized.travelStyle = style.toLowerCase();
  }

  if (typeof extracted.transportation === 'string') {
    const transportation = sanitizeString(extracted.transportation, MAX_FREETEXT_LENGTH);
    if (transportation) sanitized.transportation = transportation;
  }

  if (typeof extracted.accommodation === 'string') {
    const accommodation = sanitizeString(extracted.accommodation, MAX_FREETEXT_LENGTH);
    if (accommodation) sanitized.accommodation = accommodation;
  }

  if (Array.isArray(extracted.interests)) {
    const interests = extracted.interests
      .filter((interest): interest is string => typeof interest === 'string')
      .map((interest) => sanitizeString(interest, MAX_FREETEXT_LENGTH))
      .filter((interest): interest is string => interest !== null)
      .slice(0, 20);

    if (interests.length > 0) {
      sanitized.interests = interests;
    }
  }

  if (
    typeof extracted.tripStatus === 'string' &&
    ['exploring', 'planning', 'booking', 'finalized'].includes(extracted.tripStatus)
  ) {
    sanitized.tripStatus = extracted.tripStatus as TripMemory['tripStatus'];
  }

  return {
    updates: sanitized,
    forgetFields,
  };
}

export function mergeMemory(
  existing: TripMemory,
  extraction: MemoryExtraction
): TripMemory {
  const merged = { ...existing };

  for (const key of extraction.forgetFields) {
    delete merged[key];
  }

  for (const [key, value] of Object.entries(extraction.updates)) {
    if (value === undefined || value === null) continue;

    if (key === 'interests' && Array.isArray(value)) {
      const existingInterests = merged.interests || [];
      merged.interests = [...new Set([...existingInterests, ...value])];
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}

function isMemoryField(field: unknown): field is MemoryField {
  return typeof field === 'string' && MEMORY_FIELDS.includes(field as MemoryField);
}

function emptyExtraction(): MemoryExtraction {
  return {
    updates: {},
    forgetFields: [],
  };
}

function detectForgetFields(message: string): MemoryField[] {
  const lower = message.toLowerCase();
  const wantsForget =
    /\b(forget|remove|clear|delete|reset|ignore)\b/.test(lower) ||
    /\b(no|not)\s+(budget|destination|dates?|traveler|travellers|travelers)\b/.test(lower);

  if (!wantsForget) return [];

  const fields: MemoryField[] = [];

  if (/\bbudget|price|cost|money\b/.test(lower)) fields.push('budget');
  if (/\bdestination|place|city|country\b/.test(lower)) fields.push('destination');
  if (/\bdates?|start date|end date|when\b/.test(lower)) {
    fields.push('startDate', 'endDate', 'duration');
  }
  if (/\btraveler|traveller|travelers|travellers|people|group size\b/.test(lower)) {
    fields.push('travelers');
  }
  if (/\binterest|activity|activities\b/.test(lower)) fields.push('interests');
  if (/\baccommodation|hotel|stay\b/.test(lower)) fields.push('accommodation');
  if (/\btransport|flight|train|bus|car\b/.test(lower)) fields.push('transportation');
  if (/\bstyle|luxury|budget-friendly|backpacking\b/.test(lower)) fields.push('travelStyle');

  return [...new Set(fields)];
}
