# AI Trip Plans Database Implementation

## ✅ Completed

### 1. Database Schema (`lib/models/AITripPlan.ts`)

**Main Collection: `AITripPlan`**

```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User, indexed)
  title: string (required, max 200 chars)
  destination: string (required, max 100 chars)
  description?: string (max 1000 chars)
  conversationId?: ObjectId (ref: Conversation, indexed)
  
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }>
  
  generatedPlan: {
    destination?: string
    duration?: number
    budget?: {
      amount: number
      currency: string (default: 'USD')
    }
    days?: Array<{
      day: number
      date?: string
      title?: string
      activities: Array<{
        name: string
        description?: string
        time?: string
        duration?: string
        cost?: string
        location?: string
        category?: 'sightseeing' | 'dining' | 'activity' | 'transport' | 'accommodation' | 'other'
      }>
      notes?: string
      estimatedCost?: string
    }>
    activities?: Array<Activity>
    restaurants?: Array<{
      name: string
      cuisine?: string
      priceRange?: string
      location?: string
      speciality?: string
      notes?: string
    }>
    hotels?: Array<{
      name: string
      type?: string
      pricePerNight?: string
      location?: string
      amenities?: string[]
      notes?: string
    }>
    transport?: Array<{
      type: string
      from?: string
      to?: string
      cost?: string
      duration?: string
      bookingInfo?: string
      notes?: string
    }>
    notes?: string
    overview?: string
    totalEstimatedCost?: string
  }
  
  status: 'draft' | 'finalized' | 'archived'
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` - User's plans sorted by creation
- `{ userId: 1, status: 1 }` - Filter by status
- `{ destination: 1 }` - Search by destination

**Virtuals:**
- `messageCount` - Computed from messages array length

### 2. TypeScript Types (`types/ai-trip-plan.ts`)

Complete type definitions for:
- `Activity`
- `DayPlan`
- `Restaurant`
- `Hotel`
- `Transport`
- `GeneratedPlan`
- `AITripPlanMessage`
- `AITripPlan`
- API request/response types

### 3. API Routes

#### **GET /api/ai-trip-plans**
List user's AI trip plans with pagination and filtering

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `status` (optional: 'draft' | 'finalized' | 'archived')
- `search` (optional: search by destination or title)

**Response:**
```json
{
  "plans": [...],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

**Note:** Messages array is excluded from list view for performance

#### **POST /api/ai-trip-plans**
Create new AI trip plan

**Request Body:**
```json
{
  "destination": "Paris",
  "title": "Trip to Paris", // optional, defaults to "Trip to {destination}"
  "description": "Summer vacation", // optional
  "initialMessage": "Plan a 5-day trip..." // optional
}
```

**Response:** Full AITripPlan object with 201 status

#### **GET /api/ai-trip-plans/[id]**
Get specific AI trip plan (includes full messages array)

**Response:** Full AITripPlan object

#### **PUT /api/ai-trip-plans/[id]**
Update AI trip plan

**Request Body (all fields optional):**
```json
{
  "title": "Updated Title",
  "destination": "Updated Destination",
  "description": "Updated description",
  "status": "finalized",
  "generatedPlan": {
    // Partial update - merges with existing
    "duration": 7,
    "overview": "Updated overview..."
  }
}
```

**Response:** Updated AITripPlan object

#### **DELETE /api/ai-trip-plans/[id]**
Delete AI trip plan

**Response:**
```json
{
  "success": true,
  "message": "AI trip plan deleted successfully"
}
```

## 🔒 Security Features

- All endpoints require authentication via NextAuth
- User can only access their own plans (userId validation)
- ObjectId format validation
- Input sanitization for all text fields
- Maximum length validation
- Enum validation for status field

## 📊 Data Structure Benefits

### Structured JSON over Markdown

The `generatedPlan` field uses structured JSON instead of markdown, enabling:

1. **Type Safety:** Full TypeScript typing for all nested objects
2. **Query Support:** Can query specific fields (e.g., find plans with budget < 1000)
3. **Component Rendering:** Direct mapping to React components without parsing
4. **Data Validation:** Schema validation at database level
5. **Easy Updates:** Partial updates to specific plan sections
6. **API Integration:** Ready for external booking/map APIs
7. **Export Formats:** Easy conversion to PDF, CSV, or other formats

### Example JSON Structure

```json
{
  "generatedPlan": {
    "destination": "Paris",
    "duration": 5,
    "budget": {
      "amount": 2000,
      "currency": "USD"
    },
    "days": [
      {
        "day": 1,
        "title": "Arrival & Eiffel Tower",
        "activities": [
          {
            "name": "Visit Eiffel Tower",
            "time": "10:00 AM",
            "duration": "2 hours",
            "cost": "$30",
            "category": "sightseeing"
          }
        ],
        "estimatedCost": "$150"
      }
    ],
    "restaurants": [
      {
        "name": "Le Comptoir du Relais",
        "cuisine": "French",
        "priceRange": "$$",
        "location": "Saint-Germain"
      }
    ],
    "hotels": [
      {
        "name": "Hotel de Crillon",
        "type": "Luxury",
        "pricePerNight": "$400",
        "amenities": ["WiFi", "Spa", "Restaurant"]
      }
    ],
    "overview": "A 5-day cultural exploration of Paris...",
    "totalEstimatedCost": "$2,000"
  }
}
```

## 📝 Files Created

1. `lib/models/AITripPlan.ts` - Mongoose schema and model
2. `types/ai-trip-plan.ts` - TypeScript type definitions
3. `app/api/ai-trip-plans/route.ts` - List and create endpoints
4. `app/api/ai-trip-plans/[id]/route.ts` - Get, update, and delete endpoints

## ✅ Validation Rules

- **Title:** 1-200 characters, sanitized
- **Destination:** 1-100 characters, sanitized, required
- **Description:** 0-1000 characters, sanitized, optional
- **Status:** Must be 'draft', 'finalized', or 'archived'
- **GeneratedPlan:** Structured object with nested validation
- **Messages:** Array of {role, content, timestamp}

## 🔄 Next Steps (Not Implemented Yet)

- Chat API for AI plan generation (`/api/ai-trip-plans/[id]/chat`)
- Finalize endpoint (`/api/ai-trip-plans/[id]/finalize`)
- Convert to Trip endpoint (`/api/ai-trip-plans/[id]/convert`)
- UI Components for displaying plans
- AI prompt engineering for structured plan generation
- Real-time plan preview during chat

## 📦 Dependencies

All required dependencies are already installed:
- `mongoose` - MongoDB ODM
- `next-auth` - Authentication
- TypeScript types are self-contained

## 🧪 Testing

To test the API endpoints:

```bash
# Create a plan
POST /api/ai-trip-plans
Content-Type: application/json
{
  "destination": "Tokyo",
  "title": "Tokyo Adventure"
}

# List plans
GET /api/ai-trip-plans?limit=10&status=draft

# Get specific plan
GET /api/ai-trip-plans/{planId}

# Update plan
PUT /api/ai-trip-plans/{planId}
Content-Type: application/json
{
  "status": "finalized",
  "generatedPlan": {
    "duration": 7,
    "overview": "Week-long exploration..."
  }
}

# Delete plan
DELETE /api/ai-trip-plans/{planId}
```

---

**Status:** ✅ Database implementation complete and ready for use
**Date:** 2024
**Next Phase:** AI chat integration and UI components
