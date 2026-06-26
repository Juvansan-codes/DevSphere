import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import AITripPlan from '@/lib/models/AITripPlan';
import Trip from '@/lib/models/Trip';
import { isValidObjectId, errorResponse } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid plan ID', 400);
    }

    await dbConnect();

    // 1. Read the AI Trip Plan
    const aiPlan = await AITripPlan.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!aiPlan) {
      return errorResponse('AI trip plan not found', 404);
    }

    // 2. Transform into Trip format & Copy all structured data
    const destination = aiPlan.generatedPlan?.destination || aiPlan.destination || 'Unknown Destination';
    const description = aiPlan.generatedPlan?.overview || aiPlan.description || '';
    
    // Convert to plain object if it's a mongoose document
    const itineraryData = aiPlan.generatedPlan 
      ? (typeof aiPlan.generatedPlan.toObject === 'function' ? aiPlan.generatedPlan.toObject() : aiPlan.generatedPlan) 
      : {};

    // 3. Create real itinerary
    const newTrip = await Trip.create({
      destination,
      description,
      status: 'planning',
      user: session.user.id,
      itineraryData,
    });

    // 6. Delete the AI Trip Plan
    await AITripPlan.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      tripId: newTrip._id,
      message: 'Plan converted to itinerary successfully',
    });
  } catch (error) {
    console.error('[AI Trip Plans API] Convert error:', error);
    return errorResponse('Failed to convert plan', 500);
  }
}
