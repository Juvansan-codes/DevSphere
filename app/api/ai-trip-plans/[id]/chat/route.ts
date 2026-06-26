import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import AITripPlan from '@/lib/models/AITripPlan';
import { isValidObjectId, errorResponse } from '@/lib/validation';
import Groq from 'groq-sdk';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'groq-sdk/resources/chat';
import type {
  Activity,
  DayPlan,
  GeneratedPlan,
  Hotel,
  Restaurant,
  Transport,
} from '@/types/ai-trip-plan';

const SYSTEM_PROMPT = `You are Vyora AI, an expert travel planner agent.
Help users plan amazing personalised trips.
You have access to backend tools.
When generating or modifying a trip plan based on user requests, you MUST call 'updateAITripPlan' to save the changes to the database.
Treat the saved trip plan as persistent state. Never recreate the whole plan unless the user explicitly asks to start over or regenerate everything.
For follow-up requests, preserve all existing days, hotels, restaurants, transport, budget, and notes that the user did not ask to change.
When changing one day, one activity, one hotel, one restaurant, or one transport option, call updateAITripPlan with only that changed section.
Use loadAITripPlan when you need to inspect current state before editing.
Always use tools to fetch or modify the trip data. Never ask the user to wait while you "generate" something without calling the tool.
After calling tools, summarize what you did in a friendly conversational way to the user. Do not leak raw JSON in your chat responses.`;

interface PendingToolCall extends ChatCompletionMessageToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "createAITripPlan",
      description: "Initialize or create a base AI trip plan with a destination.",
      parameters: {
        type: "object",
        properties: { destination: { type: "string" } },
        required: ["destination"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateAITripPlan",
      description: "Patch the current trip plan. Pass only changed fields. Arrays are merged into existing saved state by day number/name; do not resend unrelated sections. Treat the user's budget as the TOTAL trip budget, do not multiply it by the number of days for the estimated cost.",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string" },
          duration: { type: "number" },
          budget: { type: "object", properties: { amount: { type: "number" }, currency: { type: "string" } } },
          travelStyle: { type: "string" },
          overview: { type: "string" },
          totalEstimatedCost: { type: "string" },
          days: { type: "array", items: { type: "object" } },
          hotels: { type: "array", items: { type: "object" } },
          restaurants: { type: "array", items: { type: "object" } },
          transport: { type: "array", items: { type: "object" } },
          notes: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "loadAITripPlan",
      description: "Load the current state of the generated trip plan.",
      parameters: { type: "object", properties: {} }
    }
  },

];

const MAX_TEXT_LENGTH = 2000;
const ACTIVITY_CATEGORIES = new Set([
  'sightseeing',
  'dining',
  'activity',
  'transport',
  'accommodation',
  'other',
]);

function cleanString(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function sanitizeActivities(value: unknown): Activity[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item): Activity | null => {
      const activity = asRecord(item);
      if (!activity) return null;

      const name = cleanString(activity.name, 200);
      if (!name) return null;

      const category = cleanString(activity.category, 50);

      return {
        name,
        description: cleanString(activity.description),
        time: cleanString(activity.time, 100),
        duration: cleanString(activity.duration, 100),
        cost: cleanString(activity.cost, 100),
        location: cleanString(activity.location, 200),
        category: category && ACTIVITY_CATEGORIES.has(category)
          ? (category as Activity['category'])
          : undefined,
      };
    })
    .filter((activity): activity is Activity => Boolean(activity));
}

function sanitizeGeneratedPlanUpdate(input: unknown): Partial<GeneratedPlan> {
  const source = asRecord(input);
  if (!source) return {};

  const update: Partial<GeneratedPlan> = {};
  const destination = cleanString(source.destination, 100);
  const duration = cleanNumber(source.duration);
  const travelStyle = cleanString(source.travelStyle, 100);
  const overview = cleanString(source.overview, 2000);
  const totalEstimatedCost = cleanString(source.totalEstimatedCost, 200);
  const notes = cleanString(source.notes, 2000);

  if (destination) update.destination = destination;
  if (duration !== undefined) update.duration = duration;
  if (travelStyle) update.travelStyle = travelStyle;
  if (overview) update.overview = overview;
  if (totalEstimatedCost) update.totalEstimatedCost = totalEstimatedCost;
  if (notes) update.notes = notes;

  const budget = asRecord(source.budget);
  const budgetAmount = cleanNumber(budget?.amount);
  if (budget && budgetAmount !== undefined) {
    update.budget = {
      amount: budgetAmount,
      currency: cleanString(budget.currency, 10) ?? 'USD',
    };
  }

  const activities = sanitizeActivities(source.activities);
  if (activities) update.activities = activities;

  if (Array.isArray(source.days)) {
    update.days = source.days
      .map((item, index): DayPlan | null => {
        const day = asRecord(item);
        if (!day) return null;

        const dayNumber = cleanNumber(day.day) ?? index + 1;
        const dayActivities = sanitizeActivities(day.activities) ?? [];

        return {
          day: dayNumber,
          date: cleanString(day.date, 50),
          title: cleanString(day.title, 200),
          activities: dayActivities,
          notes: cleanString(day.notes, 1000),
          estimatedCost: cleanString(day.estimatedCost, 100),
        };
      })
      .filter((day): day is DayPlan => Boolean(day));
  }

  if (Array.isArray(source.restaurants)) {
    update.restaurants = source.restaurants
      .map((item): Restaurant | null => {
        const restaurant = asRecord(item);
        const name = cleanString(restaurant?.name, 200);
        if (!restaurant || !name) return null;

        return {
          name,
          cuisine: cleanString(restaurant.cuisine, 100),
          priceRange: cleanString(restaurant.priceRange, 50),
          location: cleanString(restaurant.location, 200),
          speciality: cleanString(restaurant.speciality, 300),
          notes: cleanString(restaurant.notes, 1000),
        };
      })
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));
  }

  if (Array.isArray(source.hotels)) {
    update.hotels = source.hotels
      .map((item): Hotel | null => {
        const hotel = asRecord(item);
        const name = cleanString(hotel?.name, 200);
        if (!hotel || !name) return null;

        return {
          name,
          type: cleanString(hotel.type, 100),
          pricePerNight: cleanString(hotel.pricePerNight, 100),
          location: cleanString(hotel.location, 200),
          amenities: Array.isArray(hotel.amenities)
            ? hotel.amenities
                .map((amenity) => cleanString(amenity, 100))
                .filter((amenity): amenity is string => Boolean(amenity))
            : undefined,
          notes: cleanString(hotel.notes, 1000),
        };
      })
      .filter((hotel): hotel is Hotel => Boolean(hotel));
  }

  if (Array.isArray(source.transport)) {
    update.transport = source.transport
      .map((item): Transport | null => {
        const transport = asRecord(item);
        const type = cleanString(transport?.type, 100);
        if (!transport || !type) return null;

        return {
          type,
          from: cleanString(transport.from, 200),
          to: cleanString(transport.to, 200),
          cost: cleanString(transport.cost, 100),
          duration: cleanString(transport.duration, 100),
          bookingInfo: cleanString(transport.bookingInfo, 1000),
          notes: cleanString(transport.notes, 1000),
        };
      })
      .filter((transport): transport is Transport => Boolean(transport));
  }

  return update;
}

function toPlainGeneratedPlan(plan: unknown): Partial<GeneratedPlan> {
  if (plan && typeof plan === 'object' && 'toObject' in plan && typeof plan.toObject === 'function') {
    return plan.toObject() as Partial<GeneratedPlan>;
  }

  return asRecord(plan) as Partial<GeneratedPlan> ?? {};
}

function mergeDefined<T extends object>(base: T, patch: T): T {
  const merged = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}

function mergeByKey<T extends object>(
  existing: T[] | undefined,
  updates: T[] | undefined,
  getKey: (item: T) => string
): T[] | undefined {
  if (!updates) return existing;

  const merged = [...(existing ?? [])];
  const indexByKey = new Map<string, number>();

  merged.forEach((item, index) => {
    const key = getKey(item);
    if (key) indexByKey.set(key, index);
  });

  for (const update of updates) {
    const key = getKey(update);
    if (!key || !indexByKey.has(key)) {
      merged.push(update);
      if (key) indexByKey.set(key, merged.length - 1);
      continue;
    }

    const existingIndex = indexByKey.get(key)!;
    merged[existingIndex] = mergeDefined(merged[existingIndex], update);
  }

  return merged;
}

function mergeActivities(
  existing: Activity[] | undefined,
  updates: Activity[] | undefined
): Activity[] | undefined {
  return mergeByKey(
    existing,
    updates,
    (activity) => cleanString(activity.name, 200)?.toLowerCase() ?? ''
  );
}

function mergeDays(existing: DayPlan[] | undefined, updates: DayPlan[] | undefined): DayPlan[] | undefined {
  if (!updates) return existing;

  const merged = [...(existing ?? [])];
  const indexByDay = new Map<number, number>();

  merged.forEach((day, index) => indexByDay.set(day.day, index));

  for (const update of updates) {
    const existingIndex = indexByDay.get(update.day);
    if (existingIndex === undefined) {
      merged.push(update);
      indexByDay.set(update.day, merged.length - 1);
      continue;
    }

    const current = merged[existingIndex];
    merged[existingIndex] = {
      ...mergeDefined(current, update),
      activities: mergeActivities(current.activities, update.activities) ?? [],
    } as DayPlan;
  }

  return merged.sort((a, b) => a.day - b.day);
}

function mergeGeneratedPlan(
  existing: Partial<GeneratedPlan>,
  update: Partial<GeneratedPlan>
): Partial<GeneratedPlan> {
  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(update).filter(([key, value]) => {
        if (value === undefined) return false;
        return !['days', 'activities', 'restaurants', 'hotels', 'transport'].includes(key);
      })
    ),
    activities: mergeActivities(existing.activities, update.activities),
    days: mergeDays(existing.days, update.days),
    restaurants: mergeByKey(
      existing.restaurants as unknown as Record<string, unknown>[] | undefined,
      update.restaurants as unknown as Record<string, unknown>[] | undefined,
      (restaurant) => cleanString(restaurant.name, 200)?.toLowerCase() ?? ''
    ) as Restaurant[] | undefined,
    hotels: mergeByKey(
      existing.hotels as unknown as Record<string, unknown>[] | undefined,
      update.hotels as unknown as Record<string, unknown>[] | undefined,
      (hotel) => cleanString(hotel.name, 200)?.toLowerCase() ?? ''
    ) as Hotel[] | undefined,
    transport: mergeByKey(
      existing.transport as unknown as Record<string, unknown>[] | undefined,
      update.transport as unknown as Record<string, unknown>[] | undefined,
      (transport) =>
        [
          cleanString(transport.type, 100),
          cleanString(transport.from, 200),
          cleanString(transport.to, 200),
        ]
          .filter(Boolean)
          .join('|')
          .toLowerCase()
    ) as Transport[] | undefined,
  };
}

function isToolGenerationFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Failed to call a function') ||
    error.message.includes('failed_generation')
  );
}

async function generatePlanWithoutTools(
  groq: Groq,
  request: string,
  destination: string,
  currentPlan: Partial<GeneratedPlan>
): Promise<{ assistantMessage: string; planUpdate: Partial<GeneratedPlan> }> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are Vyora AI, an expert travel planner. Return only valid JSON with two keys: "assistantMessage" and "planUpdate". "assistantMessage" must be a friendly short summary. "planUpdate" must contain structured trip plan fields only.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          destination,
          request,
          currentPlan,
          instruction:
            'Preserve currentPlan. Return only changed fields in planUpdate unless the user explicitly asks to regenerate the entire trip.',
          requiredPlanUpdateShape: {
            destination: 'string',
            duration: 'number',
            budget: { amount: 'number', currency: 'string' },
            travelStyle: 'string',
            overview: 'string',
            totalEstimatedCost: 'string (should reflect the overall budget, do not multiply by days)',
            days: [
              {
                day: 'number',
                title: 'string',
                activities: [
                  {
                    name: 'string',
                    description: 'string',
                    time: 'string',
                    duration: 'string',
                    cost: 'string',
                    location: 'string',
                    category:
                      'sightseeing | dining | activity | transport | accommodation | other',
                  },
                ],
                notes: 'string',
                estimatedCost: 'string',
              },
            ],
            hotels: [{ name: 'string', type: 'string', pricePerNight: 'string', location: 'string', amenities: ['string'], notes: 'string' }],
            restaurants: [{ name: 'string', cuisine: 'string', priceRange: 'string', location: 'string', speciality: 'string', notes: 'string' }],
            transport: [{ type: 'string', from: 'string', to: 'string', cost: 'string', duration: 'string', bookingInfo: 'string', notes: 'string' }],
            notes: 'string',
          },
        }),
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const assistantMessage =
    cleanString(parsed.assistantMessage, 2000) ??
    `I created a trip plan for ${destination}.`;
  const planUpdate = sanitizeGeneratedPlanUpdate(parsed.planUpdate);

  return { assistantMessage, planUpdate };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse('Invalid plan ID', 400);

    let body: { message: string };
    try { body = await req.json(); } catch { return errorResponse('Invalid request body', 400); }

    const userMessage = body.message?.trim();
    if (!userMessage) return errorResponse('Message is required', 400);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return errorResponse(
        'AI planner is not configured',
        500,
        'GROQ_API_KEY is missing.'
      );
    }

    const groq = new Groq({ apiKey });

    await dbConnect();
    const plan = await AITripPlan.findOne({ _id: id, userId: session.user.id });
    if (!plan) return errorResponse('AI trip plan not found', 404);

    const history = plan.messages
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    history.push({ role: 'user' as const, content: userMessage });
    plan.messages.push({ role: 'user', content: userMessage, timestamp: new Date() });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const currentPlanContext = JSON.stringify(toPlainGeneratedPlan(plan.generatedPlan));
        const messagesToSend: ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'system',
            content: `Current saved trip plan state. Preserve this unless the user asks to replace it: ${currentPlanContext}`,
          },
          ...history,
        ];
        let planUpdate: Partial<GeneratedPlan> | null = null;
        let shouldContinue = true;
        let finalAssistantMessage = '';

        while (shouldContinue) {
          shouldContinue = false;
          try {
            const completion = await groq.chat.completions.create({
              model: 'llama-3.3-70b-versatile',
              messages: messagesToSend,
              stream: true,
              tools,
              tool_choice: 'auto'
            });

            let currentResponse = '';
            const toolCalls: PendingToolCall[] = [];

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta;
              if (!delta) continue;

              if (delta.content) {
                currentResponse += delta.content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`));
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.id) {
                    toolCalls.push({
                      id: tc.id,
                      type: 'function',
                      function: {
                        name: tc.function?.name ?? '',
                        arguments: tc.function?.arguments ?? '',
                      },
                    });
                  } else if (toolCalls.length > 0) {
                    const currentTool = toolCalls[toolCalls.length - 1];
                    if (tc.function?.arguments) {
                      currentTool.function.arguments += tc.function.arguments;
                    }
                  }
                }
              }
            }

            if (currentResponse) {
              finalAssistantMessage += currentResponse + '\n';
            }

            if (toolCalls.length > 0) {
              messagesToSend.push({
                role: 'assistant',
                content: currentResponse || null,
                tool_calls: toolCalls
              });

              for (const tc of toolCalls) {
                let args: unknown = {};
                try { args = JSON.parse(tc.function.arguments); } catch {}
                
                let result = '';
                const funcName = tc.function.name;

                if (funcName === 'createAITripPlan') {
                  const destination = cleanString(asRecord(args)?.destination, 100);
                  if (destination) plan.destination = destination;
                  result = `Plan initialized for ${plan.destination}`;
                } else if (funcName === 'updateAITripPlan') {
                  const sanitizedUpdate = sanitizeGeneratedPlanUpdate(args);
                  const existing = toPlainGeneratedPlan(plan.generatedPlan);
                  plan.generatedPlan = mergeGeneratedPlan(existing, sanitizedUpdate);
                  plan.markModified('generatedPlan');
                  planUpdate = toPlainGeneratedPlan(plan.generatedPlan);
                  result = Object.keys(sanitizedUpdate).length > 0
                    ? 'Plan updated successfully in database.'
                    : 'No supported trip plan fields were provided.';
                } else if (funcName === 'loadAITripPlan') {
                  const data = toPlainGeneratedPlan(plan.generatedPlan);
                  result = JSON.stringify(data);

                } else {
                  result = 'Unknown tool';
                }

                messagesToSend.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: result
                });
              }
              // Loop again so LLM can respond to tool results
              shouldContinue = true;
            }
          } catch (err) {
            if (isToolGenerationFailure(err)) {
              try {
                const fallback = await generatePlanWithoutTools(
                  groq,
                  userMessage,
                  plan.destination,
                  toPlainGeneratedPlan(plan.generatedPlan)
                );

                if (Object.keys(fallback.planUpdate).length > 0) {
                  const existing = toPlainGeneratedPlan(plan.generatedPlan);
                  plan.generatedPlan = mergeGeneratedPlan(existing, fallback.planUpdate);
                  plan.markModified('generatedPlan');
                  planUpdate = toPlainGeneratedPlan(plan.generatedPlan);
                }

                finalAssistantMessage += fallback.assistantMessage;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: fallback.assistantMessage })}\n\n`));
              } catch (fallbackErr) {
                const errMsg = fallbackErr instanceof Error ? fallbackErr.message : 'AI error occurred';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
              }
              break;
            }

            const errMsg = err instanceof Error ? err.message : 'AI error occurred';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
            break;
          }
        }

        if (finalAssistantMessage) {
          plan.messages.push({
            role: 'assistant',
            content: finalAssistantMessage.trim(),
            timestamp: new Date(),
          });
        }

        try {
          await plan.save();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to save trip plan';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
        }

        if (planUpdate) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'plan_update', planUpdate })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (error) {
    console.error('[AI Trip Plans Chat] POST error:', error);
    return errorResponse('Failed to process chat message', 500);
  }
}
