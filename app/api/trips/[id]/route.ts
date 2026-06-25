import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Trip from '@/lib/models/Trip';
import {
  isValidObjectId,
  safeParseJSON,
  sanitizeString,
  isValidTripStatus,
  errorResponse,
} from '@/lib/validation';

/** Maximum destination length, aligned with the Trip schema */
const MAX_DESTINATION_LENGTH = 100;

/** Maximum description length, aligned with the Trip schema */
const MAX_DESCRIPTION_LENGTH = 500;

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Validate ObjectId format
    if (!isValidObjectId(params.id)) {
      return errorResponse(
        'Invalid trip ID',
        400,
        'The trip ID format is invalid.'
      );
    }

    // Parse and validate body
    const body = await safeParseJSON(request);
    if (!body) {
      return errorResponse(
        'Invalid request body',
        400,
        'Request body must be valid JSON.'
      );
    }

    // Build update object with only provided fields (partial update support)
    const update: Record<string, unknown> = {};

    if (body.destination !== undefined) {
      if (
        typeof body.destination === 'string' &&
        body.destination.trim().length > MAX_DESTINATION_LENGTH
      ) {
        return errorResponse(
          'Destination too long',
          413,
          `Destination must be under ${MAX_DESTINATION_LENGTH} characters.`
        );
      }

      const destination = sanitizeString(body.destination, MAX_DESTINATION_LENGTH);
      if (!destination) {
        return errorResponse(
          'Invalid destination',
          400,
          `Destination must be a non-empty string (max ${MAX_DESTINATION_LENGTH} characters).`
        );
      }
      update.destination = destination;
    }

    if (body.description !== undefined) {
      if (body.description === null || body.description === '') {
        update.description = '';
      } else if (typeof body.description === 'string') {
        if (body.description.trim().length > MAX_DESCRIPTION_LENGTH) {
          return errorResponse(
            'Description too long',
            413,
            `Description must be under ${MAX_DESCRIPTION_LENGTH} characters.`
          );
        }
        update.description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH) || '';
      } else {
        return errorResponse(
          'Invalid description',
          400,
          'Description must be a string.'
        );
      }
    }

    if (body.status !== undefined) {
      if (!isValidTripStatus(body.status)) {
        return errorResponse(
          'Invalid status',
          400,
          'Status must be one of: planning, booked, completed.'
        );
      }
      update.status = body.status;
    }

    if (Object.keys(update).length === 0) {
      return errorResponse(
        'No fields to update',
        400,
        'Provide at least one field to update: destination, description, or status.'
      );
    }

    await dbConnect();

    const trip = await Trip.findOneAndUpdate(
      { _id: params.id, user: session.user.id },
      update,
      { new: true, runValidators: true }
    );

    if (!trip) {
      return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[Trips API] PUT error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Validate ObjectId format
    if (!isValidObjectId(params.id)) {
      return errorResponse(
        'Invalid trip ID',
        400,
        'The trip ID format is invalid.'
      );
    }

    await dbConnect();

    const trip = await Trip.findOneAndDelete({ _id: params.id, user: session.user.id });

    if (!trip) {
      return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Trip deleted' });
  } catch (error) {
    console.error('[Trips API] DELETE error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
