import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import AITripPlan from '@/lib/models/AITripPlan';
import {
  sanitizeString,
  isValidObjectId,
  errorResponse,
} from '@/lib/validation';

/** Maximum title length */
const MAX_TITLE_LENGTH = 200;

/** Maximum destination length */
const MAX_DESTINATION_LENGTH = 100;

/** Maximum description length */
const MAX_DESCRIPTION_LENGTH = 1000;

// GET /api/ai-trip-plans/[id] - Get specific AI trip plan
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return errorResponse(
        'Invalid plan ID',
        400,
        'The plan ID format is invalid.'
      );
    }

    await dbConnect();

    const plan = await AITripPlan.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!plan) {
      return errorResponse('AI trip plan not found', 404);
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[AI Trip Plans API] GET by ID error:', error);
    return errorResponse('Failed to fetch AI trip plan', 500);
  }
}

// PUT /api/ai-trip-plans/[id] - Update AI trip plan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return errorResponse(
        'Invalid plan ID',
        400,
        'The plan ID format is invalid.'
      );
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

    await dbConnect();

    // Check if plan exists and belongs to user
    const existingPlan = await AITripPlan.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!existingPlan) {
      return errorResponse('AI trip plan not found', 404);
    }

    // Build update object
    const update: Record<string, unknown> = {};

    // Validate and update title
    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return errorResponse('Invalid title', 400, 'Title must be a string.');
      }
      const sanitized = sanitizeString(body.title, MAX_TITLE_LENGTH);
      if (!sanitized) {
        return errorResponse(
          'Title is required',
          400,
          `Please provide a non-empty title (max ${MAX_TITLE_LENGTH} characters).`
        );
      }
      update.title = sanitized;
    }

    // Validate and update destination
    if (body.destination !== undefined) {
      if (typeof body.destination !== 'string') {
        return errorResponse(
          'Invalid destination',
          400,
          'Destination must be a string.'
        );
      }
      const sanitized = sanitizeString(body.destination, MAX_DESTINATION_LENGTH);
      if (!sanitized) {
        return errorResponse(
          'Destination is required',
          400,
          `Please provide a non-empty destination (max ${MAX_DESTINATION_LENGTH} characters).`
        );
      }
      update.destination = sanitized;
    }

    // Validate and update description
    if (body.description !== undefined) {
      if (body.description === null || body.description === '') {
        update.description = undefined;
      } else if (typeof body.description === 'string') {
        const sanitized = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
        if (sanitized) {
          update.description = sanitized;
        }
      } else {
        return errorResponse(
          'Invalid description',
          400,
          'Description must be a string.'
        );
      }
    }

    // Validate and update status
    if (body.status !== undefined) {
      if (!['draft', 'finalized', 'archived'].includes(body.status as string)) {
        return errorResponse(
          'Invalid status',
          400,
          'Status must be one of: draft, finalized, archived.'
        );
      }
      update.status = body.status;
    }

    // Update generatedPlan (merge with existing)
    if (body.generatedPlan !== undefined) {
      if (typeof body.generatedPlan !== 'object' || Array.isArray(body.generatedPlan)) {
        return errorResponse(
          'Invalid generated plan',
          400,
          'Generated plan must be an object.'
        );
      }
      // Merge with existing generatedPlan
      update.generatedPlan = {
        ...existingPlan.generatedPlan,
        ...(body.generatedPlan as Record<string, unknown>),
      };
    }

    // Perform update
    const updatedPlan = await AITripPlan.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedPlan) {
      return errorResponse('Failed to update AI trip plan', 500);
    }

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('[AI Trip Plans API] PUT error:', error);
    return errorResponse('Failed to update AI trip plan', 500);
  }
}

// DELETE /api/ai-trip-plans/[id] - Delete AI trip plan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return errorResponse(
        'Invalid plan ID',
        400,
        'The plan ID format is invalid.'
      );
    }

    await dbConnect();

    // Delete the plan
    const result = await AITripPlan.deleteOne({
      _id: id,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return errorResponse(
        'AI trip plan not found',
        404,
        'The plan does not exist or you do not have permission to delete it.'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI trip plan deleted successfully',
    });
  } catch (error) {
    console.error('[AI Trip Plans API] DELETE error:', error);
    return errorResponse('Failed to delete AI trip plan', 500);
  }
}
