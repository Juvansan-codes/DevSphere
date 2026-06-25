import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Trip from '@/lib/models/Trip';
import {
  safeParseJSON,
  sanitizeString,
  isValidTripStatus,
  errorResponse,
} from '@/lib/validation';

/** Maximum destination length, aligned with the Trip schema */
const MAX_DESTINATION_LENGTH = 100;

/** Maximum description length, aligned with the Trip schema */
const MAX_DESCRIPTION_LENGTH = 500;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const trips = await Trip.find({ user: session.user.id }).sort({ createdAt: -1 });
    
    return NextResponse.json(trips);
  } catch (error) {
    console.error('[Trips API] GET error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

    // Validate destination
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
        'Destination is required',
        400,
        `Please provide a non-empty destination string (max ${MAX_DESTINATION_LENGTH} characters).`
      );
    }

    // Validate description (optional)
    let description: string | null = null;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        return errorResponse(
          'Invalid description',
          400,
          'Description must be a string.'
        );
      }
      if (body.description.trim().length > MAX_DESCRIPTION_LENGTH) {
        return errorResponse(
          'Description too long',
          413,
          `Description must be under ${MAX_DESCRIPTION_LENGTH} characters.`
        );
      }
      description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
    }

    // Validate status (optional, defaults to 'planning')
    let status: 'planning' | 'booked' | 'completed' = 'planning';
    if (body.status !== undefined && body.status !== null) {
      if (!isValidTripStatus(body.status)) {
        return errorResponse(
          'Invalid status',
          400,
          'Status must be one of: planning, booked, completed.'
        );
      }
      status = body.status;
    }

    await dbConnect();

    // Check for duplicate destination (warn, don't block)
    const existingTrip = await Trip.findOne({
      user: session.user.id,
      destination: { $regex: new RegExp(`^${destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();

    const trip = await Trip.create({
      destination,
      description: description || undefined,
      status,
      user: session.user.id,
    });

    return NextResponse.json(
      {
        ...trip.toObject(),
        ...(existingTrip
          ? {
              warning: `You already have a trip to "${destination}". This creates an additional one.`,
            }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Trips API] POST error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
