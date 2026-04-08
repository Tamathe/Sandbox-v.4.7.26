# The Sandbox — MVP Project Specification

## Overview

Build "The Sandbox" — an AI-powered educational tool marketplace for the University of Kentucky. Think "Teachers Pay Teachers" meets an app store for AI-powered learning experiences. Educators and students publish tools they've built (in external platforms like Microsoft Foundry, GitHub Copilot, or other dev environments) and share them with the UK community. The platform also offers a simple built-in chatbot builder for lightweight tools.

This is the MVP. It should be functional, polished, and carry UK branding. It will eventually scale nationally as a monetized platform, but for now it serves a single university.

---

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Placeholder for now (no SSO yet — use a simple mock auth with selectable user profiles for demo purposes: educator, student, admin)
- **AI**: Anthropic Claude API (single institutional API key via environment variable) for the built-in chatbot builder
- **Hosting**: Designed to run locally for now, deployable to Vercel

---

## Branding & Design

- **University of Kentucky branding**:
  - Primary blue: `#0033A0`
  - Accent: `#FFFFFF` and light grays
  - Use clean, modern UI — not stuffy. This is called "The Sandbox" so the vibe should feel creative, approachable, experimental
- **Logo area**: Text logo "The Sandbox" with a small UK CAAI attribution line beneath it
- **Typography**: Inter or system fonts
- **Design language**: Card-based layouts, subtle shadows, rounded corners, generous whitespace. Think modern SaaS dashboard meets educational warmth.

---

## Core Pages & Features

### 1. Marketplace / Browse Page (Home)

The main landing page. Users browse and discover published tools.

- **Hero section**: Brief tagline explaining The Sandbox ("Discover and share AI-powered learning tools built by UK educators and students")
- **Search bar**: Full-text search across tool names, descriptions, tags
- **Filter/sort options**:
  - Category (e.g., Law, History, Medicine, STEM, Business, Arts, General)
  - Type: External Tool | Built-in Chatbot
  - Sort by: Newest, Most Upvoted, Most Favorited
  - Difficulty level: Introductory, Intermediate, Advanced
- **Tool cards** in a responsive grid:
  - Thumbnail/icon (uploaded by creator or auto-generated placeholder)
  - Tool name
  - Short description (max 120 chars)
  - Creator name and role (e.g., "Dr. Smith — College of Law" or "Jane Doe — CS Junior")
  - Category tags
  - Upvote count, favorite count, comment count
  - Badge if it's a "Featured" tool (admin can feature tools)

### 2. Tool Detail Page

The individual page for each published tool.

- **Header section**:
  - Tool name, creator info, publish date, last updated date
  - Category tags and difficulty level
  - Action buttons: Launch Tool, Upvote, Favorite, Share
  - Upvote/favorite counts displayed prominently

- **Description section**:
  - Full description (markdown supported)
  - Learning objectives (defined by creator)
  - Intended audience
  - Estimated time to complete
  - Screenshots/preview images (uploaded by creator)

- **Launch behavior**:
  - If external tool: Opens in new tab via URL, with an interstitial noting "You're leaving The Sandbox" and a data-sharing consent note
  - If built-in chatbot: Opens inline in a chat interface on the page

- **Comments section**:
  - Threaded comments
  - Any authenticated user can comment
  - Creator can pin a comment

- **Analytics Dashboard** (visible only to the tool creator and admins):
  - This is a tab/section on the tool detail page
  - **Standard metrics** (auto-tracked for all tools):
    - Total launches
    - Unique users
    - Average session duration
    - Return rate (users who come back)
    - Upvotes over time
    - Favorites over time
  - **Custom metrics** (defined by the creator during publishing):
    - The creator defines custom metric names and types during the publishing flow
    - Metric types: Counter, Duration, Rating (1-5), Boolean (completed/not), Text response
    - For external tools: Provide the creator with a simple webhook/API endpoint spec they can POST data to from their tool. The endpoint accepts JSON payloads like:
      ```json
      {
        "tool_id": "xxx",
        "user_session": "anonymous-session-id",
        "metrics": {
          "questions_answered": 5,
          "score": 85,
          "completed": true,
          "time_on_task_seconds": 340
        }
      }
      ```
    - For built-in chatbots: Auto-track messages sent, session length, conversation turns
    - Display custom metrics in simple charts (bar, line, summary cards)

### 3. Tool Publishing / Submission Flow

A multi-step form for creators to publish a new tool.

- **Step 1 — Basic Info**:
  - Tool name
  - Short description (120 char limit)
  - Full description (markdown editor)
  - Category (select from predefined list)
  - Difficulty level
  - Estimated completion time
  - Thumbnail upload

- **Step 2 — Tool Type & Configuration**:
  - Choose: External Tool or Built-in Chatbot
  - If External Tool:
    - URL to the tool
    - Checkbox: "This tool will send analytics data to The Sandbox" (shows webhook endpoint info)
  - If Built-in Chatbot:
    - System prompt (textarea — this is the core of the chatbot's personality/behavior)
    - Welcome message (what the chatbot says first)
    - Suggested starter questions (up to 4)
    - Optional: Upload reference documents (PDF/text) to be included as context

- **Step 3 — Learning Objectives & Metrics**:
  - Learning objectives (add multiple, free text)
  - Intended audience description
  - Custom metrics definition:
    - Add metric: name, type (Counter, Duration, Rating, Boolean, Text), description
    - For external tools, show the webhook endpoint and payload format they should POST to

- **Step 4 — Preview & Publish**:
  - Preview how the tool card and detail page will look
  - Publish button (goes live immediately — open publishing model)
  - Save as Draft option

### 4. Built-in Chatbot Experience

When a user launches a built-in chatbot tool:

- Clean chat interface (right on the tool detail page or in a modal/panel)
- Shows the welcome message defined by the creator
- Shows suggested starter questions as clickable chips
- Messages sent to Claude API using the creator's system prompt
- If reference documents were uploaded, include them in the context
- Use the institutional Claude API key (from env var `ANTHROPIC_API_KEY`)
- Auto-track: message count, session duration, conversation turns
- Simple, clean UI — similar to a ChatGPT or Claude chat window

### 5. User Profile Page

- Display name, role (Educator/Student), department/college
- List of tools they've published
- List of tools they've favorited
- Their comments

### 6. Admin Features (lightweight)

- Ability to "Feature" a tool (shows a badge, pins to top of marketplace)
- Ability to remove a tool if needed
- Simple dashboard: total tools published, total launches across platform, most active creators

---

## Data Model (Prisma Schema)

```prisma
model User {
  id          String    @id @default(cuid())
  name        String
  email       String    @unique
  role        UserRole  @default(EDUCATOR)
  department  String?
  college     String?
  avatarUrl   String?
  createdAt   DateTime  @default(now())
  tools       Tool[]
  upvotes     Upvote[]
  favorites   Favorite[]
  comments    Comment[]
}

enum UserRole {
  EDUCATOR
  STUDENT
  ADMIN
}

model Tool {
  id                String      @id @default(cuid())
  name              String
  shortDescription  String
  fullDescription   String
  category          String
  difficultyLevel   String      @default("Introductory")
  estimatedMinutes  Int?
  thumbnailUrl      String?
  toolType          ToolType
  externalUrl       String?
  systemPrompt      String?
  welcomeMessage    String?
  starterQuestions   String[]
  referenceDocUrls  String[]
  learningObjectives String[]
  published         Boolean     @default(false)
  featured          Boolean     @default(false)
  webhookSecret     String?     @default(cuid())
  creatorId         String
  creator           User        @relation(fields: [creatorId], references: [id])
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  upvotes           Upvote[]
  favorites         Favorite[]
  comments          Comment[]
  customMetrics     CustomMetricDefinition[]
  metricEvents      MetricEvent[]
  sessions          ToolSession[]
}

enum ToolType {
  EXTERNAL
  CHATBOT
}

model Upvote {
  id        String   @id @default(cuid())
  userId    String
  toolId    String
  user      User     @relation(fields: [userId], references: [id])
  tool      Tool     @relation(fields: [toolId], references: [id])
  createdAt DateTime @default(now())
  @@unique([userId, toolId])
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  toolId    String
  user      User     @relation(fields: [userId], references: [id])
  tool      Tool     @relation(fields: [toolId], references: [id])
  createdAt DateTime @default(now())
  @@unique([userId, toolId])
}

model Comment {
  id        String    @id @default(cuid())
  content   String
  pinned    Boolean   @default(false)
  userId    String
  toolId    String
  parentId  String?
  user      User      @relation(fields: [userId], references: [id])
  tool      Tool      @relation(fields: [toolId], references: [id])
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  createdAt DateTime  @default(now())
}

model CustomMetricDefinition {
  id          String     @id @default(cuid())
  toolId      String
  tool        Tool       @relation(fields: [toolId], references: [id])
  name        String
  type        MetricType
  description String?
}

enum MetricType {
  COUNTER
  DURATION
  RATING
  BOOLEAN
  TEXT
}

model MetricEvent {
  id          String   @id @default(cuid())
  toolId      String
  tool        Tool     @relation(fields: [toolId], references: [id])
  sessionId   String?
  metricName  String
  metricValue String
  createdAt   DateTime @default(now())
}

model ToolSession {
  id            String   @id @default(cuid())
  toolId        String
  tool          Tool     @relation(fields: [toolId], references: [id])
  userId        String?
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  messageCount  Int      @default(0)
}
```

---

## API Routes

### Tools
- `GET /api/tools` — List tools (with search, filter, sort, pagination)
- `GET /api/tools/[id]` — Get tool detail
- `POST /api/tools` — Create/publish a tool
- `PUT /api/tools/[id]` — Update a tool
- `DELETE /api/tools/[id]` — Delete a tool (creator or admin only)

### Interactions
- `POST /api/tools/[id]/upvote` — Toggle upvote
- `POST /api/tools/[id]/favorite` — Toggle favorite
- `GET /api/tools/[id]/comments` — Get comments
- `POST /api/tools/[id]/comments` — Add comment

### Chat (Built-in Chatbot)
- `POST /api/chat` — Send message to Claude (pass tool_id to load system prompt and context)

### Analytics
- `GET /api/tools/[id]/analytics` — Get analytics for a tool (creator/admin only)
- `POST /api/tools/[id]/metrics` — Webhook endpoint for external tools to POST custom metric data (authenticated via webhook secret)

### Sessions
- `POST /api/sessions` — Start a session
- `PUT /api/sessions/[id]` — End/update a session

### Users
- `GET /api/users/[id]` — Get user profile
- `GET /api/users/[id]/tools` — Get user's published tools

---

## Sample Tools to Pre-populate

Seed the database with these realistic example tools so the marketplace feels alive during demos:

1. **Cross-Examination Simulator** (External Tool)
   - Category: Law
   - Creator: "Prof. Sarah Mitchell — College of Law"
   - Description: "Practice cross-examination skills with an AI witness. Choose from criminal, civil, or family law scenarios. The AI adapts its responses based on your questioning technique."
   - Difficulty: Advanced
   - Time: 30 min

2. **The Age of Exploration: Ships & Navigation** (Built-in Chatbot)
   - Category: History
   - Creator: "Dr. James Rivera — Dept. of History"
   - Description: "Take an interactive tour of the Niña, Pinta, and Santa María. Ask questions about navigation, daily life aboard, and the journey to the New World."
   - System prompt: "You are a knowledgeable and engaging history educator specializing in the Age of Exploration. You help students explore the voyages of Columbus by answering questions about the three ships (Niña, Pinta, Santa María), navigation techniques of the era, daily life aboard these vessels, and the historical context of the journey. Be vivid and descriptive. When possible, correct common myths with accurate historical information. Keep responses accessible to undergraduate students."
   - Difficulty: Introductory
   - Time: 15 min

3. **Organic Chemistry Reaction Predictor** (External Tool)
   - Category: STEM
   - Creator: "Dr. Priya Patel — Dept. of Chemistry"
   - Description: "Describe a set of reactants and conditions, and the AI will predict the products, explain the mechanism, and quiz you on key concepts."
   - Difficulty: Intermediate
   - Time: 20 min

4. **Patient Interview Practice** (Built-in Chatbot)
   - Category: Medicine
   - Creator: "Dr. Marcus Chen — College of Medicine"
   - Description: "Practice taking a patient history. The AI simulates a patient presenting with symptoms. Practice your differential diagnosis skills."
   - System prompt: "You are simulating a patient visiting a doctor's office. You are a 45-year-old named Pat who has been experiencing intermittent chest pain for the past 2 weeks, especially during physical activity. You also have mild shortness of breath. Your medical history includes Type 2 diabetes (diagnosed 5 years ago) and hypertension. You take metformin and lisinopril. You're a former smoker (quit 3 years ago, smoked for 15 years). You're anxious about your symptoms but cooperative. Answer the medical student's questions naturally — don't volunteer all information at once. Only share details when specifically asked. If asked something you wouldn't know as a patient, say so naturally."
   - Difficulty: Intermediate
   - Time: 25 min

5. **Socratic Philosophy Debate Partner** (Built-in Chatbot)
   - Category: Arts
   - Creator: "Maya Johnson — Philosophy Senior"
   - Description: "Engage in Socratic dialogue on ethics, epistemology, or metaphysics. The AI challenges your reasoning and helps you think more clearly."
   - System prompt: "You are a Socratic dialogue partner. Your role is to engage the student in philosophical inquiry using the Socratic method. Ask probing questions rather than giving answers. Challenge assumptions. Help the student discover contradictions in their reasoning. Be respectful but intellectually rigorous. Focus on ethics, epistemology, and metaphysics. When the student makes a claim, ask them to define their terms, provide examples, and consider counterexamples. Never lecture — always question."
   - Difficulty: Introductory
   - Time: 20 min

6. **Business Case Analyzer** (External Tool)
   - Category: Business
   - Creator: "Prof. Diana Brooks — Gatton College of Business"
   - Description: "Upload a business case study and get an AI-powered SWOT analysis, discussion questions, and framework suggestions for your class presentation."
   - Difficulty: Advanced
   - Time: 45 min

---

## Environment Variables

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_NAME="The Sandbox"
```

---

## Implementation Notes

- Use PostgreSQL locally via Docker or a local install. Provide a `docker-compose.yml` for easy setup.
- Seed script should populate the sample tools above.
- For the demo/MVP, use a simple mock auth system: a dropdown in the header that lets you switch between demo users (an educator, a student, an admin) without real login. Store the selected user in a React context.
- Charts on the analytics dashboard: use Recharts.
- Markdown rendering for tool descriptions: use `react-markdown`.
- The chatbot UI should stream responses from Claude for a good UX.
- Make the webhook endpoint for external tools simple and well-documented — show the endpoint URL and expected payload format clearly in the publishing flow.
- Mobile-responsive design throughout.

---

## Build Order

1. Project scaffolding (Next.js, Tailwind, Prisma, PostgreSQL)
2. Database schema and seed data
3. Marketplace browse page with search/filter
4. Tool detail page
5. Publishing/submission flow
6. Built-in chatbot experience
7. Upvote, favorite, comments
8. Analytics dashboard
9. User profile page
10. Admin features
