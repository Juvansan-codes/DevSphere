import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Trip from '@/lib/models/Trip';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const trips = await Trip.find({ user: session.user.id }).sort({ createdAt: -1 });
    
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { destination, description, status } = await request.json();

    if (!destination) {
      return NextResponse.json({ message: 'Destination is required' }, { status: 400 });
    }

    await dbConnect();
    const trip = await Trip.create({
      destination,
      description,
      status: status || 'planning',
      user: session.user.id,
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
