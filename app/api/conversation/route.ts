import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';

/** Default number of conversations to return */
const DEFAULT_LIMIT = 50;

/** Maximum conversations to return in a single request */
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination params
    const url = new URL(req.url);
    let limit = parseInt(url.searchParams.get('limit') || '', 10);
    let offset = parseInt(url.searchParams.get('offset') || '', 10);

    // Validate and clamp pagination values
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (isNaN(offset) || offset < 0) offset = 0;

    await dbConnect();

    const conversations = await Conversation.find({ userId: session.user.id })
      .select('title updatedAt messages')
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const summaries = conversations.map((conv: Record<string, unknown>) => ({
      _id: conv._id,
      title: conv.title,
      updatedAt: conv.updatedAt,
      messageCount: Array.isArray(conv.messages) ? conv.messages.length : 0,
    }));

    // Include pagination metadata
    const total = await Conversation.countDocuments({ userId: session.user.id });

    return Response.json({
      conversations: summaries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
