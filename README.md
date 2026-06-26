# Vyora: Your AI Travel Agent

> **Turn hours of tedious travel research into a personalized, interactive itinerary in minutes.**

## What is Vyora?

Planning a trip should be exciting, but it often devolves into juggling dozens of browser tabs, spreadsheets, and endless research. Vyora is a minimalist, intelligent web application that solves this by centralizing the travel planning experience. 

At its core is a personalized AI travel planner that listens to your preferences—budget, travel style, dates, and interests—and instantly generates a comprehensive, structured, day-by-day itinerary. Instead of static lists, you interact with a conversational AI agent that can dynamically adjust your schedule, recommend hidden gem restaurants, and optimize your budget on the fly.

## Live Demo

🚀 **[Click here to view the live demo](https://vyora-trip.vercel.app/)**

## How to Run Locally

You can spin up Vyora on your local machine in just a few steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Juvansan-codes/Vyora.git
   cd Vyora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and define the following keys (do not use real production values here):
   ```env
   # Your MongoDB connection string for the database
   MONGODB_URI=

   # Authentication Secret and URL for NextAuth
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000

   # Groq API Key to power the AI Agent
   GROQ_API_KEY=
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

## How the AI Feature Works

Vyora's intelligent features are powered by the **Groq API** utilizing the blazing-fast Llama-3 model. Rather than just asking the LLM to output long, unstructured text, our system uses advanced function calling (tool use) to maintain and modify a persistent, structured JSON representation of your trip.

The AI system prompt instructs it to act as an expert travel planner that has access to your existing itinerary state. When you chat with the AI and ask it to "swap my lunch on day 2 for a sushi place," the AI understands the context, generates the new recommendation, and calls a backend `updateAITripPlan` tool. This tool surgically merges only the changed fields into your database, which instantly updates the user interface. The result is a seamless conversation where the AI actually "does the work" of editing your trip plan automatically.
