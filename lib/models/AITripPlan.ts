import mongoose, { Schema, Document } from 'mongoose';

// === Embedded Schemas ===

const ActivitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    time: String,
    duration: String,
    cost: String,
    location: String,
    category: {
      type: String,
      enum: ['sightseeing', 'dining', 'activity', 'transport', 'accommodation', 'other'],
    },
  },
  { _id: false }
);

const DayPlanSchema = new Schema(
  {
    day: {
      type: Number,
      required: true,
    },
    date: String,
    title: String,
    activities: [ActivitySchema],
    notes: String,
    estimatedCost: String,
  },
  { _id: false }
);

const RestaurantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    cuisine: String,
    priceRange: String,
    location: String,
    speciality: String,
    notes: String,
  },
  { _id: false }
);

const HotelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: String,
    pricePerNight: String,
    location: String,
    amenities: [String],
    notes: String,
  },
  { _id: false }
);

const TransportSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },
    from: String,
    to: String,
    cost: String,
    duration: String,
    bookingInfo: String,
    notes: String,
  },
  { _id: false }
);

const GeneratedPlanSchema = new Schema(
  {
    destination: String,
    duration: Number,
    budget: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    travelStyle: String,
    days: [DayPlanSchema],
    activities: [ActivitySchema],
    restaurants: [RestaurantSchema],
    hotels: [HotelSchema],
    transport: [TransportSchema],
    notes: String,
    overview: String,
    totalEstimatedCost: String,
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// === Main Schema ===

export interface IAITripPlan extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  destination: string;
  description?: string;
  conversationId?: mongoose.Types.ObjectId;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  generatedPlan: {
    destination?: string;
    duration?: number;
    budget?: {
      amount: number;
      currency: string;
    };
    travelStyle?: string;
    days?: Array<{
      day: number;
      date?: string;
      title?: string;
      activities: Array<{
        name: string;
        description?: string;
        time?: string;
        duration?: string;
        cost?: string;
        location?: string;
        category?: string;
      }>;
      notes?: string;
      estimatedCost?: string;
    }>;
    activities?: Array<{
      name: string;
      description?: string;
      time?: string;
      duration?: string;
      cost?: string;
      location?: string;
      category?: string;
    }>;
    restaurants?: Array<{
      name: string;
      cuisine?: string;
      priceRange?: string;
      location?: string;
      speciality?: string;
      notes?: string;
    }>;
    hotels?: Array<{
      name: string;
      type?: string;
      pricePerNight?: string;
      location?: string;
      amenities?: string[];
      notes?: string;
    }>;
    transport?: Array<{
      type: string;
      from?: string;
      to?: string;
      cost?: string;
      duration?: string;
      bookingInfo?: string;
      notes?: string;
    }>;
    notes?: string;
    overview?: string;
    totalEstimatedCost?: string;
  };
  status: 'draft' | 'finalized' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const AITripPlanSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Destination cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    generatedPlan: {
      type: GeneratedPlanSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AITripPlanSchema.index({ userId: 1, createdAt: -1 });
AITripPlanSchema.index({ userId: 1, status: 1 });
AITripPlanSchema.index({ destination: 1 });

// Virtual for message count
AITripPlanSchema.virtual('messageCount').get(function () {
  return this.messages?.length || 0;
});

// Ensure virtuals are included in JSON
AITripPlanSchema.set('toJSON', { virtuals: true });
AITripPlanSchema.set('toObject', { virtuals: true });

export default mongoose.models.AITripPlan ||
  mongoose.model<IAITripPlan>('AITripPlan', AITripPlanSchema);
