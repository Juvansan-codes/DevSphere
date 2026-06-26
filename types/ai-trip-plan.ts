// === AI Trip Plan Types ===

export interface Activity {
  name: string;
  description?: string;
  time?: string;
  duration?: string;
  cost?: string;
  location?: string;
  category?: 'sightseeing' | 'dining' | 'activity' | 'transport' | 'accommodation' | 'other';
}

export interface DayPlan {
  day: number;
  date?: string;
  title?: string;
  activities: Activity[];
  notes?: string;
  estimatedCost?: string;
}

export interface Restaurant {
  name: string;
  cuisine?: string;
  priceRange?: string;
  location?: string;
  speciality?: string;
  notes?: string;
}

export interface Hotel {
  name: string;
  type?: string;
  pricePerNight?: string;
  location?: string;
  amenities?: string[];
  notes?: string;
}

export interface Transport {
  type: string;
  from?: string;
  to?: string;
  cost?: string;
  duration?: string;
  bookingInfo?: string;
  notes?: string;
}

export interface GeneratedPlan {
  destination?: string;
  duration?: number;
  budget?: {
    amount: number;
    currency: string;
  };
  travelStyle?: string;
  dayCount?: number;
  days?: DayPlan[];
  activities?: Activity[];
  restaurants?: Restaurant[];
  hotels?: Hotel[];
  transport?: Transport[];
  notes?: string;
  overview?: string;
  totalEstimatedCost?: string;
}

export interface AITripPlanMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AITripPlan {
  _id: string;
  userId: string;
  title: string;
  destination: string;
  description?: string;
  conversationId?: string;
  messages: AITripPlanMessage[];
  generatedPlan: GeneratedPlan;
  status: 'draft' | 'finalized' | 'archived';
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

// === API Request/Response Types ===

export interface CreateAITripPlanRequest {
  destination: string;
  title?: string;
  initialMessage?: string;
}

export interface UpdateAITripPlanRequest {
  title?: string;
  destination?: string;
  description?: string;
  generatedPlan?: Partial<GeneratedPlan>;
  status?: 'draft' | 'finalized' | 'archived';
}

export interface AITripPlanListResponse {
  plans: AITripPlan[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AITripPlanChatRequest {
  message: string;
}

export interface AITripPlanChatStreamChunk {
  type: 'token' | 'done' | 'error' | 'plan_update';
  content?: string;
  planUpdate?: Partial<GeneratedPlan>;
  error?: string;
}
