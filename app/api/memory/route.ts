import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import {
  clamp,
  isValidDateString,
  isValidObjectId,
  errorResponse,
} from '@/lib/validation';

/** Maximum memory object size in bytes (roughly) */
const MAX_MEMORY_SIZE = 10_000;

/** Allowed memory field keys */
const ALLOWED_MEMORY_FIELDS = new Set([
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
]);

const MAX_STRING_LENGTH = 100;
const MAX_FREETEXT_LENGTH = 50;
const MAX_INTERESTS = 20;
const MAX_BUDGET = 10_000_000;
const MAX_TRAVELERS = 50;
const MAX_DURATION = 365;

/**
 * Validates the shape of a memory object, rejecting unknown fields
 * and verifying basic type correctness.
 */
function validateMemoryShape(memory: Record<string, unknown>): string | null {
  for (const key of Object.keys(memory)) {
    if (!ALLOWED_MEMORY_FIELDS.has(key)) {
      return `Unknown memory field: "${key}". Allowed fields: ${[...ALLOWED_MEMORY_FIELDS].join(', ')}.`;
    }
  }

  // Type checks for known fields
  if (memory.destination !== undefined && typeof memory.destination !== 'string') {
    return 'Field "destination" must be a string.';
  }
  if (
    typeof memory.destination === 'string' &&
    (memory.destination.trim().length === 0 ||
      memory.destination.trim().length > MAX_STRING_LENGTH)
  ) {
    return `Field "destination" must be between 1 and ${MAX_STRING_LENGTH} characters.`;
  }
  if (memory.startDate !== undefined && typeof memory.startDate !== 'string') {
    return 'Field "startDate" must be a string.';
  }
  if (typeof memory.startDate === 'string' && !isValidDateString(memory.startDate)) {
    return 'Field "startDate" must be a real date in YYYY-MM-DD format.';
  }
  if (memory.endDate !== undefined && typeof memory.endDate !== 'string') {
    return 'Field "endDate" must be a string.';
  }
  if (typeof memory.endDate === 'string' && !isValidDateString(memory.endDate)) {
    return 'Field "endDate" must be a real date in YYYY-MM-DD format.';
  }
  if (
    typeof memory.startDate === 'string' &&
    typeof memory.endDate === 'string' &&
    memory.endDate < memory.startDate
  ) {
    return 'Field "endDate" cannot be before "startDate".';
  }
  if (
    memory.duration !== undefined &&
    (typeof memory.duration !== 'number' ||
      !Number.isFinite(memory.duration) ||
      memory.duration < 1 ||
      memory.duration > MAX_DURATION)
  ) {
    return `Field "duration" must be a number from 1 to ${MAX_DURATION}.`;
  }
  if (
    memory.budget !== undefined &&
    (typeof memory.budget !== 'number' ||
      !Number.isFinite(memory.budget) ||
      memory.budget < 1 ||
      memory.budget > MAX_BUDGET)
  ) {
    return `Field "budget" must be a number from 1 to ${MAX_BUDGET}.`;
  }
  if (memory.currency !== undefined && typeof memory.currency !== 'string') {
    return 'Field "currency" must be a string.';
  }
  if (typeof memory.currency === 'string' && !/^[A-Z]{2,4}$/.test(memory.currency)) {
    return 'Field "currency" must be a 2-4 letter uppercase currency code.';
  }
  if (
    memory.travelers !== undefined &&
    (typeof memory.travelers !== 'number' ||
      !Number.isFinite(memory.travelers) ||
      memory.travelers < 1 ||
      memory.travelers > MAX_TRAVELERS)
  ) {
    return `Field "travelers" must be a number from 1 to ${MAX_TRAVELERS}.`;
  }
  if (memory.travelStyle !== undefined && typeof memory.travelStyle !== 'string') {
    return 'Field "travelStyle" must be a string.';
  }
  if (memory.transportation !== undefined && typeof memory.transportation !== 'string') {
    return 'Field "transportation" must be a string.';
  }
  if (memory.accommodation !== undefined && typeof memory.accommodation !== 'string') {
    return 'Field "accommodation" must be a string.';
  }
  if (memory.interests !== undefined && !Array.isArray(memory.interests)) {
    return 'Field "interests" must be an array of strings.';
  }
  if (
    Array.isArray(memory.interests) &&
    (memory.interests.length > MAX_INTERESTS ||
      memory.interests.some(
        (interest) =>
          typeof interest !== 'string' ||
          interest.trim().length === 0 ||
          interest.trim().length > MAX_FREETEXT_LENGTH
      ))
  ) {
    return `Field "interests" must contain up to ${MAX_INTERESTS} non-empty strings.`;
  }
  if (
    memory.tripStatus !== undefined &&
    (typeof memory.tripStatus !== 'string' ||
      !['exploring', 'planning', 'booking', 'finalized'].includes(memory.tripStatus))
  ) {
    return 'Field "tripStatus" must be one of: exploring, planning, booking, finalized.';
  }

  return null; // Valid
}

function normalizeMemory(memory: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...memory };

  for (const key of [
    'destination',
    'startDate',
    'endDate',
    'currency',
    'travelStyle',
    'transportation',
    'accommodation',
    'tripStatus',
  ]) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalized[key].trim();
    }
  }

  if (typeof normalized.currency === 'string') {
    normalized.currency = normalized.currency.toUpperCase();
  }

  if (typeof normalized.duration === 'number') {
    normalized.duration = clamp(Math.round(normalized.duration), 1, MAX_DURATION);
  }

  if (typeof normalized.budget === 'number') {
    normalized.budget = clamp(Math.round(normalized.budget), 1, MAX_BUDGET);
  }

  if (typeof normalized.travelers === 'number') {
    normalized.travelers = clamp(Math.round(normalized.travelers), 1, MAX_TRAVELERS);
  }

  if (Array.isArray(normalized.interests)) {
    normalized.interests = normalized.interests.map((interest) => interest.trim());
  }

  return normalized;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId || conversationId === 'null') {
      return Response.json({});
    }

    // Validate ObjectId format
    if (!isValidObjectId(conversationId)) {
      return errorResponse(
        'Invalid conversation ID',
        400,
        'The conversation ID format is invalid.'
      );
    }

    await dbConnect();

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: session.user.id,
    }).lean();

    if (!conversation || !conversation.memory) {
      return Response.json({});
    }

    // Return only the memory fields
    return Response.json(conversation.memory);
  } catch (error) {
    console.error('[Memory API] GET error:', error);
    return Response.json({ error: 'Failed to fetch memory' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { conversationId, memory } = body as {
      conversationId?: unknown;
      memory?: unknown;
    };

    if (!conversationId || conversationId === 'null' || typeof conversationId !== 'string') {
      return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!isValidObjectId(conversationId)) {
      return errorResponse(
        'Invalid conversation ID',
        400,
        'The conversation ID format is invalid.'
      );
    }

    if (!memory || typeof memory !== 'object' || Array.isArray(memory)) {
      return Response.json({ error: 'Invalid memory data' }, { status: 400 });
    }

    const normalizedMemory = normalizeMemory(memory as Record<string, unknown>);

    // Check size limit
    const memorySize = JSON.stringify(normalizedMemory).length;
    if (memorySize > MAX_MEMORY_SIZE) {
      return errorResponse(
        'Memory data too large',
        413,
        `Memory object must be under ${MAX_MEMORY_SIZE.toLocaleString()} characters. Received ${memorySize.toLocaleString()}.`
      );
    }

    // Validate memory shape (field names and types)
    const validationError = validateMemoryShape(normalizedMemory);
    if (validationError) {
      return errorResponse('Invalid memory data', 400, validationError);
    }

    await dbConnect();

    const updated = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId: session.user.id },
      { $set: { memory: normalizedMemory } },
      { new: true }
    ).lean();

    if (!updated) {
       return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json(updated.memory || {});
  } catch (error) {
    console.error('[Memory API] PUT error:', error);
    return Response.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId || conversationId === 'null') {
       return Response.json({ success: true });
    }

    // Validate ObjectId format
    if (!isValidObjectId(conversationId)) {
      return errorResponse(
        'Invalid conversation ID',
        400,
        'The conversation ID format is invalid.'
      );
    }

    await dbConnect();

    await Conversation.findOneAndUpdate(
      { _id: conversationId, userId: session.user.id },
      { $set: { memory: {} } }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('[Memory API] DELETE error:', error);
    return Response.json({ error: 'Failed to clear memory' }, { status: 500 });
  }
}
