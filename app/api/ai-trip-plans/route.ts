import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import AITripPlan from '@/lib/models/AITripPlan';
import mongoose from 'mongoose';
import {
  sanitizeString,
  errorResponse,
} from '@/lib/validation';

/** Default number of plans to return */
const DEFAULT_LIMIT = 20;

/** Maximum plans to return in a single request */
const MAX_LIMIT = 100;

/** Maximum title length */
const MAX_TITLE_LENGTH = 200;

/** Maximum destination length */
const MAX_DESTINATION_LENGTH = 100;

/** Maximum description length */
const MAX_DESCRIPTION_LENGTH = 1000;

// GET /api/ai-trip-plans - List user's AI trip plans
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse query parameters
    const url = new URL(req.url);
    let limit = parseInt(url.searchParams.get('limit') || '', 10);
    let offset = parseInt(url.searchParams.get('offset') || '', 10);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    // Validate and clamp pagination values
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (isNaN(offset) || offset < 0) offset = 0;

    await dbConnect();

    // Build query
    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.user.id),
    };

    // Filter by status if provided
    if (status && ['draft', 'finalized', 'archived'].includes(status)) {
      query.status = status;
    }

    // Search by destination or title
    if (search && search.trim().length > 0) {
      query.$or = [
        { destination: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Fetch plans with a compact generatedPlan summary for dashboard cards.
    // The full generatedPlan is only returned by the detail endpoint.
    const plans = await AITripPlan.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          userId: { $toString: '$userId' },
          title: 1,
          destination: 1,
          description: 1,
          conversationId: {
            $cond: [
              { $ifNull: ['$conversationId', false] },
              { $toString: '$conversationId' },
              '$$REMOVE',
            ],
          },
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          messageCount: { $size: { $ifNull: ['$messages', []] } },
          generatedPlan: {
            duration: '$generatedPlan.duration',
            budget: '$generatedPlan.budget',
            travelStyle: '$generatedPlan.travelStyle',
            overview: '$generatedPlan.overview',
            dayCount: { $size: { $ifNull: ['$generatedPlan.days', []] } },
          },
        },
      },
    ]);

    const total = await AITripPlan.countDocuments(query);

    return NextResponse.json({
      plans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[AI Trip Plans API] GET error:', error);
    return errorResponse('Failed to fetch AI trip plans', 500);
  }
}

// POST /api/ai-trip-plans - Create new AI trip plan
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
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

    // Validate destination (required)
    const destination = sanitizeString(
      body.destination as string,
      MAX_DESTINATION_LENGTH
    );
    if (!destination) {
      return errorResponse(
        'Destination is required',
        400,
        `Please provide a non-empty destination string (max ${MAX_DESTINATION_LENGTH} characters).`
      );
    }

    // Validate title (optional, defaults to "Trip to {destination}")
    let title = sanitizeString(body.title as string, MAX_TITLE_LENGTH);
    if (!title) {
      title = `Trip to ${destination}`;
    }

    // Validate description (optional)
    let description: string | undefined;
    if (body.description) {
      if (typeof body.description !== 'string') {
        return errorResponse('Invalid description', 400, 'Description must be a string.');
      }
      const sanitized = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
      if (sanitized) {
        description = sanitized;
      }
    }

    // Validate initial message (optional)
    let initialMessage: string | undefined;
    if (body.initialMessage) {
      if (typeof body.initialMessage !== 'string') {
        return errorResponse(
          'Invalid initial message',
          400,
          'Initial message must be a string.'
        );
      }
      const sanitized = sanitizeString(body.initialMessage, 5000);
      if (sanitized) {
        initialMessage = sanitized;
      }
    }

    await dbConnect();

    // Create the AI trip plan
    const messages = initialMessage
      ? [
          {
            role: 'user' as const,
            content: initialMessage,
            timestamp: new Date(),
          },
        ]
      : [];

    const plan = await AITripPlan.create({
      userId: session.user.id,
      title,
      destination,
      description,
      messages,
      generatedPlan: {},
      status: 'draft',
    });

    return NextResponse.json(
      {
        _id: plan._id.toString(),
        userId: plan.userId.toString(),
        title: plan.title,
        destination: plan.destination,
        description: plan.description,
        conversationId: plan.conversationId?.toString(),
        messageCount: plan.messages.length,
        generatedPlan: plan.generatedPlan,
        status: plan.status,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[AI Trip Plans API] POST error:', error);
    return errorResponse('Failed to create AI trip plan', 500);
  }
}
