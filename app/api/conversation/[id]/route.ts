import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import { isValidObjectId, errorResponse } from '@/lib/validation';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return errorResponse(
        'Invalid conversation ID',
        400,
        'The conversation ID format is invalid.'
      );
    }

    await dbConnect();

    const conversation = await Conversation.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json(conversation);
  } catch (error) {
    console.error('[Conversation API] GET error:', error);
    return Response.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return errorResponse(
        'Invalid conversation ID',
        400,
        'The conversation ID format is invalid.'
      );
    }

    await dbConnect();

    const result = await Conversation.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[Conversation API] DELETE error:', error);
    return Response.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
