# The Sandbox — Architecture & Product Specification
### CATS-AI / University of Kentucky
### Living document — update this file whenever major decisions are made or features are added.

---

## Vision

The Sandbox is not a traditional LMS add-on. It is a **new paradigm for AI-powered education** — a marketplace and studio where educators build, share, and measure AI tools for their students. The core insight is that AI in education should be:

1. **Tool-native** — not bolted onto existing systems, but purpose-built for specific learning outcomes
2. **Measurable** — every interaction is a signal, both quantitative and qualitative
3. **Conversational-first** — the interface itself is AI-powered; you describe what you want to build and the system builds it
4. **Faculty-centered** — educators are the builders, students are the learners, but both are first-class users with their own analytics surfaces

The long-term vision is a faculty member uploading their course materials, lecture transcripts, and grading rubrics, and having a fully-functioning AI teaching assistant — with their voice, their knowledge, and their pedagogical style — ready for students within minutes.

### The "Canvas Replacement" Strategy
To transition from a tool marketplace to a full Learning Operating System (LOS), we aim to replace passive "filing cabinet" features with active AI counterparts:
- **Syllabus** → Interactive Course Concierge (Sandy)
- **Assignments** → AI-Assisted Workspaces & Simulations
- **Grading** → AI-Drafted Feedback & Rubric Analysis (Human-in-the-loop)
- **Static Content** → Conversational Learning Objects

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router (TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Neon (cloud) |
| ORM | Prisma v7.4.2 with driver adapter pattern |
| DB Adapter | @prisma/adapter-pg (PrismaPg) |
| AI | Anthropic Claude (claude-haiku-4-5-20251001 for chat, claude-sonnet-4-6 for analysis/concierge) |
| Hosting | Vercel |
| Icons | lucide-react |
| Charts | recharts |
| Date utils | date-fns |

### Critical Prisma v7 Notes
- Schema does NOT have `url` in datasource — connection string is in `prisma.config.ts`
- Runtime client MUST use PrismaPg adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- Generator uses `previewFeatures = ["driverAdapters"]`
- Generated client output: `app/generated/prisma`
- Import from: `../generated/prisma` (relative to app/lib/)
- Build script must run `prisma generate` before `next build`

### Environment Variables
```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_NAME=The Sandbox
```

---

## Authentication (Demo Mode)

Authentication is mocked via a client-side context (`app/lib/auth-context.tsx`). The selected user's email is stored in `localStorage` and passed as the `x-demo-user-email` header on all API calls.

**Current demo users (6):**

| Email | Role | Name | Notes |
|---|---|---|---|
| admin@uky.edu | ADMIN | Alex Admin | Platform admin |
| bob.dipaola@uky.edu | ADMIN | Dr. Robert DiPaola | Provost |
| eric.monday@uky.edu | ADMIN | Eric Monday | Finance & Administration |
| heath.price@uky.edu | EDUCATOR | Heath Price | Owns TEK-100 course |
| ian.mcclure.student@uky.edu | STUDENT | Ian McClure | 1L law student |
| tiana.the@uky.edu | STUDENT | Tiana The | Junior, English/Arts & Sciences |

**Production path:** Replace mock auth with Shibboleth SSO (UK's identity provider) or Auth0.

---

## Navigation Structure

Primary nav (4 items, universal): **Home → Learn▾ → Build → Live**

| Item | Route(s) | Who Sees It | Notes |
|---|---|---|---|
| Home | `/` | Everyone | Dashboard |
| Learn ▾ | dropdown | Everyone | Opens sub-menu |
| &nbsp;&nbsp;Courses | `/courses` | Everyone | |
| &nbsp;&nbsp;Marketplace | `/tools` | Everyone | |
| &nbsp;&nbsp;My Library | `/library` | Students only | |
| Build | `/build` | Everyone | Build hub + conversational builder entry |
| Live | `/sandcastle` | Everyone | Sandcastle experiences |

**User avatar dropdown quick links** (role-gated):
- Open Builder → `/builder` (everyone)
- Bounties → `/bounties` (everyone)
- Datasets → `/datasets` (everyone)
- Publish Tool → `/publish` (educators/admins)
- My Progress → `/analytics/student` (students)
- Analytics → `/analytics/faculty` (educators/admins)
- My Avatar → `/avatar` (educators/admins)
- Service Bots → `/service-bot` (admins only)
- Admin Panel → `/admin` (admins only)

---

## Data Models

### Core Models
- **User** — name, email, role (EDUCATOR/STUDENT/ADMIN), department, college, bio, personalContext
- **Tool** — the primary content unit. Has type (CHATBOT or EXTERNAL), system prompt, learning objectives, category, difficulty, audience, `approvalStatus` (COMMUNITY/PENDING/APPROVED/REJECTED)
  - `isOfficialService` (Boolean) — marks tools deployed as official university service bots
  - `serviceProtocol` (String?) — `'informational' | 'regulatory' | 'transactional'`
  - `escalationEmail` (String?) — contact email injected into service bot system prompts
  - `webhookSecret` (String) — for external integrations
- **ToolSession** — one session = one student using one tool. Tracks start/end time, message count
- **MetricEvent** — custom events fired during tool use (e.g. "correct_answer", "rubric_score")
- **CustomMetricDefinition** — per-tool metric schemas defined by the educator
- **Upvote / Favorite / Comment** — social engagement on tools
- **Bounty** — a request posted by an educator for a tool to be built. Status: OPEN → CLAIMED → FULFILLED
- **BountyReview** — review attached to a fulfilled bounty
- **Course** — a course with materials organized in module folders
- **CourseMaterial** — uploaded content (text/markdown) with moduleNumber for folder grouping
- **LibraryEntry** — a student's saved tool (userId + toolId, unique)
- **Assignment** — a task for students (linked to a Tool or a file upload)
- **CollabRequest** — a request to collaborate on / improve an existing tool
- **CollabReview** — an AI-guided review session attached to a CollabRequest
- **BuildSession** — a builder chat session (links to ToolDocuments)
- **ToolDocument** — uploaded reference docs attached to a tool or build session
- **XPEvent / UserBadge / Quest / UserQuest** — gamification layer
- **SandTransaction** — tracks Sand currency deltas (earned from bounties, XP, publishing)

### Planned Models (not yet built)
- **GradebookEntry** — Score and feedback for a student on an assignment
- **StudentAssessment** — AI-generated assessment of a student session against a rubric
- **LearningSignal** — structured output from AI analysis of conversation transcripts
- **KnowledgeBase** — uploaded documents, transcripts, slides that power a faculty avatar tool
- **CourseRubric** — domain-specific grading criteria that the AI uses to score conversations

---

## Features Built

### Home Dashboard (`/`)
- Personal profile card: name, role badge, year/major, department
- XP level progress bar
- **Student view**: Learning Vitals grid (streak, sessions, time, avg score, class rank, Sand balance), recent sessions feed with scores, upcoming due dates, badges, QuestPanel with daily/weekly quests
- **Educator/Admin view**: Platform stats (tools published, active students, total sessions, avg score), recent student activity feed
- Quick access links to all major sections
- Synthetic demo data per user (Ian McClure = 1L law student, Tiana The = English junior)

### Tools Marketplace (`/tools`)
- Two tabs: **Marketplace** (APPROVED tools only) and **Community** (all tools)
- Browse, search, filter by category/difficulty/type
- Sort by newest, most upvoted, most favorited
- Featured tools highlighted at top
- Tool cards with upvote, favorite, quick stats, star rating
- **UK Official** badge (blue shield) on `isOfficialService` tools
- **Verified** badge (emerald checkmark) on APPROVED tools
- Creator name links to their profile page

### Tool Detail (`/tools/[id]`)
- Full description, learning objectives, intended audience
- Chatbot interface (streaming Claude responses)
- External tool link
- Comments with threading and pinning
- Upvote, favorite, star rating
- Analytics dashboard for tool creator (sessions, messages, engagement over time)
- Per-tool leaderboard, challenges, gamification config sub-routes

### Learn / Courses (`/courses` and `/courses/[id]`)
- Two-column layout: course list sidebar (left) + materials panel (right)
- Materials organized in module folder groups
- Connected tools per course
- Add/delete materials (educators)
- **CourseMagicButton** (`CourseMagicButton.tsx`): one-click generate chatbot from course materials → calls `/api/courses/[courseId]/generate-bot`, redirects to `/publish` with pre-filled config
- Discussion threads per course (`/courses/[id]/discussions/`)
- Sandy concierge adapts persona on `/courses`: course content expert + UI guide
- Error boundaries: `app/sandcastle/[slug]/error.tsx`, `app/tools/[id]/error.tsx`

### Build Hub (`/build`)
- **Conversational hero** (`BuildHubHero.tsx`): free-text input → submits to `/builder?prompt=...`
- **Experience gallery**: 8 category pill tabs expand to show experience type cards
- **Collaborator** sub-tool at `/build/collaborator/`
- **Refiner** sub-tool at `/build/refiner/`
- Course Build Workspace: course selector + AI gap analysis (`/api/courses/[id]/suggest-tools`)
- Sand balance + transaction history

### Builder (`/builder`)
- Conversational tool builder — describe a tool, Claude builds it
- Streaming chat with live spec preview (Preview / Code / Files tabs)
- Pre-seeded via `?prompt=` query param
- Supports document uploads as reference material
- `BuilderLayout.tsx` is the core component; `BuilderChatPanel`, `PreviewPanel`, `CodePanel`, `FilesPanel`
- Experience type config in `app/lib/experience-types.ts` (8 categories, 30+ types)
- **8 TOOL_TYPES**: Chatbot Tutor, Simulation, Debate Partner, Adaptive Quiz, Mock Interview, Writing Coach, Case Analyzer, Auto-Grader / Feedback
- **Gamification builder** (`GamificationBuilderChat.tsx`) for adding quests/challenges to tools

### My Library (`/library`)
- Students save tools for quick access
- Sorted by: Last Played, Most Used, Recently Added
- Session history with quick-launch buttons

### Publish (`/publish`)
- Educator form to create/edit tools
- Toggle: Chatbot vs External URL
- System prompt, welcome message, starter questions, custom metric definitions
- Two modes: traditional form OR conversational AI builder (`ToolBuilderChat`)

### Bounty Board (`/bounties`)
- Educators post tool requests; others claim and build
- `/bounties/new` for creating; `/bounties/[id]` for detail
- Status lifecycle: OPEN → CLAIMED → FULFILLED → CLOSED

### Sandcastle Live (`/sandcastle` and `/sandcastle/[slug]`)
- Catalog of 17 interactive experiences (12 live, 5 coming-soon)
- Each experience has its own route with full ChatInterface
- Sand cost display; "Coming Soon" experiences shown as locked
- `/api/sandcastle/` for session tracking

### Service Bot Builder (`/service-bot`) — ADMIN only
- 3-step wizard for admins to deploy official UK departmental bots (Financial Aid, Registrar, IT Help Desk, etc.)
- Step 1: Upload policy documents (.txt/.md/.csv, max 500KB, or paste text)
- Step 2: Configure service identity — name, department, escalation email, focus areas, protocol type
- Step 3: Review + PII certification → deploy
- Deploys with `isOfficialService: true`, `approvalStatus: APPROVED`, UK Official badge
- Protocol types: `informational` | `regulatory` | `transactional` — displayed in the UI as "Informational" / "Regulatory" / "Workflow" (never raw enum values)
- `transactional` protocol bots include a safety constraint in their system prompt: the bot cannot take actions on behalf of students and must direct them to complete final steps themselves; also uses plain language tone guidance
- System prompt generated by `app/lib/service-bot-prompt.ts` (120K char context budget, PII blocking)
- Distinct from Avatar builder — admins only, policy-focused, auto-approved

### Messaging (`/messages`)
- Direct messaging between users
- Conversation list + message thread UI
- Unread count badge in header (polls every 30s via `MessageButton.tsx`)
- Full API: `/api/messages/` with unread-count, send, read sub-routes

### Datasets (`/datasets`)
- Dataset library for educators and students

### Admin (`/admin`)
- Pending approval queue: approve/reject PENDING tools
- View all users and tools; platform-wide stats
- **Active Service Bots** audit section (below approval queue, separated by `<hr />`): lists all `isOfficialService` tools with bot name, protocol badge (user-friendly label), "Created by" (creator name + email), and "Date Added"

### Profiles (`/profile/[id]`)
- User's published tools, activity stats

### Sandy Concierge (`ConciergePanel.tsx`)
- Sidebar AI powered by Claude Sonnet, page-aware
- On `/courses`: course content expert + UI guide
- Desktop: collapsible right-rail sidebar; Mobile: FAB → 80vh modal

### Privacy Footer (`PrivacyFooter.tsx`)
- Small lock-icon disclaimer: "UKY Protected Environment - Data is not used to train external models"
- Rendered at the bottom of chat interfaces

### Gamification Layer
- **QuestPanel.tsx** — daily/weekly quest display with progress bars, XP/Sand rewards, claim buttons (home dashboard right column)
- **XP system** — `getLevelInfo()` in `app/lib/xp.ts`, XP events via `/api/xp/events`
- **Sand currency** — `calculateSandBalance()` in `app/lib/sand.ts`
- **Challenges** — per-tool at `/api/challenges/[id]/complete`
- **Leaderboards** — per-tool at `/api/tools/[id]/leaderboard`
- **Gamification config builder** — `GamificationBuilderChat.tsx`

### Study Tools
- Study guide generation via `/api/study/guide`
- `StudyBuddyInterface.tsx` — dedicated study buddy chat
- `StudyGuideCard.tsx` — card for generated study guides

### Presence & Collaboration
- `PresenceWidget.tsx` — real-time user presence display
- `/api/presence/` — presence tracking
- `CallOverlay.tsx` — call/video overlay
- CollabRequest/CollabReview — AI-guided collaboration sessions

---

## Sandcastle Experiences

Defined in `app/lib/sandcastle.ts`. **17 total (12 live, 5 coming-soon).**

**Live:** Logic Riddle Room, UK Wildcats Trivia, Jon Snow (50 Sand), Lincoln on Leadership (50 Sand), March Madness Analyst, The Bracket, Book Finder, Other Content Finder, Solve the Murder, Monuments on the Mall, **The Crammer**, **Flashcard Forge**

**Coming Soon:** Fantasy Football GM (100 Sand), Film Discussion Circle (50 Sand), Assignment Stress Test, Rubric Architect, AI Bracket Manager

---

## Key Design Decisions

### Service Bot vs Avatar
| | Avatar (Teaching Assistant) | Service Bot (Dept. Support) |
|---|---|---|
| Created by | Educators | Admins only |
| Goal | Pedagogical support, Socratic method | Policy accuracy, process guidance |
| Knowledge base | Course materials, lectures | Official policy documents |
| Approval | Community/Pending review | Auto-approved |
| Badge | Green "Verified" checkmark | Blue "UK Official" shield |

### Sandy concierge architecture
- Single `ConciergePanel` used globally via layout
- `currentPage` passed to `/api/concierge` on every message; API builds page-specific system prompt
- Course materials injected into Sandy's context (truncated at 600 chars per material)

### Why Neon / Prisma v7 / Haiku+Sonnet / mock auth
- Neon: zero config, serverless pooling, pgvector for future embeddings
- Prisma v7 driver adapters: serverless-safe, no persistent connection issues on Vercel
- Haiku for chat (fast/cheap), Sonnet for concierge/analysis (better reasoning)
- Mock auth: easy to demo; all auth logic in one file (`auth-context.tsx`) for clean swap to Shibboleth

---

## File Structure

```
the-sandbox/
├── app/
│   ├── api/
│   │   ├── admin/              # Approval queue
│   │   ├── bounties/           # Bounty CRUD
│   │   ├── build-gamification/ # Build gamification features
│   │   ├── build-tool/         # Tool build endpoint
│   │   ├── builder/            # Builder sessions + documents
│   │   ├── challenges/         # Per-tool challenges
│   │   ├── chat/               # Streaming Claude chat
│   │   ├── collab/             # Collaboration requests + reviews
│   │   ├── concierge/          # Sandy AI (page-aware)
│   │   ├── courses/            # Course + material CRUD + discussions
│   │   │   └── [courseId]/generate-bot/  # POST: generate chatbot from course materials
│   │   ├── gamification-config/# Per-tool gamification config
│   │   ├── library/            # Student library
│   │   ├── messages/           # Direct messaging + unread count
│   │   ├── presence/           # Real-time presence
│   │   ├── quests/             # Quest claim
│   │   ├── sandcastle/         # Sandcastle session tracking
│   │   ├── sessions/           # Tool session tracking
│   │   ├── study/              # Study guide generation
│   │   ├── tools/              # Tool CRUD + upvote/favorite/comments/metrics
│   │   ├── upload/             # File + PDF upload
│   │   ├── users/              # User profiles
│   │   └── xp/                 # XP + badges + Sand balance
│   ├── components/
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── BuildHubHero.tsx
│   │   ├── BuildMomentOverlay.tsx
│   │   ├── BuilderChatPanel.tsx     # Conversational builder chat + TOOL_TYPES
│   │   ├── BuilderLayout.tsx        # Builder UI (chat + preview/code/files tabs)
│   │   ├── CallOverlay.tsx          # Call/video overlay
│   │   ├── ChatInterface.tsx        # Streaming chat UI (tools + sandcastle)
│   │   ├── ClientProviders.tsx
│   │   ├── CodePanel.tsx
│   │   ├── CommentsSection.tsx
│   │   ├── ConciergePanel.tsx       # Sandy AI sidebar
│   │   ├── CourseMagicButton.tsx    # One-click "generate bot from course" button (educator)
│   │   ├── FilesPanel.tsx
│   │   ├── GamificationBuilderChat.tsx
│   │   ├── Header.tsx               # Nav + user dropdown + XP/Sand display
│   │   ├── MessageButton.tsx        # Message icon + unread badge
│   │   ├── PreviewPanel.tsx
│   │   ├── PresenceWidget.tsx       # Real-time presence
│   │   ├── PrivacyFooter.tsx        # "UKY Protected Environment" privacy note for chat UIs
│   │   ├── QuestPanel.tsx           # Daily/weekly quests (home dashboard)
│   │   ├── StarRating.tsx
│   │   ├── StudyBuddyInterface.tsx
│   │   ├── StudyGuideCard.tsx
│   │   ├── ToolBuilderChat.tsx      # Alt builder (publish page)
│   │   ├── ToolCard.tsx             # Marketplace card (UK Official + Verified badges)
│   │   └── ToolLaunchModal.tsx
│   ├── lib/
│   │   ├── auth-context.tsx         # Mock auth (6 demo users) — REPLACE for production
│   │   ├── datasets.ts
│   │   ├── experience-types.ts      # EXPERIENCE_CATEGORIES (8 categories, 30+ types)
│   │   ├── presence.ts
│   │   ├── prisma.ts                # DB client with PrismaPg adapter
│   │   ├── sand.ts                  # calculateSandBalance()
│   │   ├── sandcastle.ts            # Static Sandcastle configs (17 experiences)
│   │   ├── service-bot-prompt.ts    # buildServiceBotSystemPrompt()
│   │   ├── types.ts
│   │   └── xp.ts                   # getLevelInfo()
│   ├── (pages)/
│   │   ├── page.tsx                 # Home dashboard
│   │   ├── tools/page.tsx + [id]/   # Marketplace + tool detail
│   │   ├── courses/page.tsx + [id]/ # Courses + discussions
│   │   ├── build/page.tsx + collaborator/ + refiner/
│   │   ├── builder/page.tsx
│   │   ├── library/page.tsx
│   │   ├── sandcastle/page.tsx + [slug]/
│   │   ├── bounties/page.tsx + new/ + [id]/
│   │   ├── datasets/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── service-bot/page.tsx     # ADMIN only
│   │   ├── publish/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── profile/[id]/page.tsx
│   │   ├── avatar/page.tsx
│   │   └── analytics/faculty/ + student/
│   └── generated/prisma/            # Auto-generated — do not edit
├── prisma/schema.prisma + seed.ts + migrations/
├── public/cats-ai-logo*.png + cats-ai-logo.mp4
├── prisma.config.ts
└── CLAUDE.md
```

---

## Demo Data (Seed)

**Users:** Alex Admin, Dr. DiPaola, Eric Monday, Heath Price (EDUCATOR, TEK-100), Ian McClure (STUDENT, 1L law), Tiana The (STUDENT, English), plus seeded extras (James Rivera, Maya Johnson, Diana Brooks, etc.)

**Tools (12+):** Cross-Examination Simulator, Age of Exploration, Organic Chemistry Predictor, Patient Interview Practice, Socratic Debate Partner, Business Case Analyzer, PHI 110 Argument Coach, LAW 756 Evidence Simulator, CS 215 Python Tutor, Nonprofit Donor Prospector, HIST 300 Primary Source Analyzer, MBA 640 Strategy Coach

**Courses:** TEK-100 (Heath Price) with module materials

---

## Branding

- Primary color: UK Blue `#0033A0`
- Logo: `public/cats-ai-logo-v2.png` (header), animated `public/cats-ai-logo.mp4` (background)
- App name: "The Sandbox" by CATS-AI / University of Kentucky

---

## Deployment

- **Hosting:** Vercel (auto-deploy from GitHub `master`)
- **Repo:** https://github.com/Tamathe/The-Sandbox
- **Database:** Neon PostgreSQL
- **Build command:** `prisma generate && next build`
- **Required env vars:** `DATABASE_URL`, `ANTHROPIC_API_KEY`

---

## Features In Progress / Planned

### ELI5 "Explain Simpler" Button
Add a `Lightbulb` button beneath the last assistant message in `ChatInterface.tsx`. One click injects a fixed follow-up prompt into the existing streaming flow. Only visible on the last assistant message when not loading. No new API route, no slider.

### Faculty Analytics (`/analytics/faculty`)
Currently simulated. Production: real session/metric capture → async AI analysis → per-student warning flags (engagement drop <50% of baseline, grade drop >1 SD below 4-week rolling mean).

### Student Analytics (`/analytics/student`)
Currently simulated. Skills radar, portfolio with PDF export.

### Faculty Avatar / Knowledge Base (`/avatar`)
Faculty upload docs → RAG chatbot. Path: Vercel Blob → text extraction → chunk + embed (Voyage AI) → pgvector → top-k retrieval. Tool type: `KNOWLEDGE_BASE`.

### Gradebook / Rubric / Submissions (Phase 2)
Canvas replacement core. Requires `GradebookEntry`, `Rubric`, `Submission` models; assignment submission UI; gradebook grid at `/courses/[id]/grades`; AI pre-grading route. Dedicated sprint — design before building.

### Audio / Podcast Mode (Phase 2)
"Listen" button converts chat session to two-person podcast dialogue. Requires `/api/podcast` route, TTS solution (ElevenLabs or Web Speech API), playback controls. Full sprint.

---

## For Teams Building This Out (e.g. Deloitte)

### Priority Build Order
1. Real authentication (Shibboleth SSO)
2. Analytics data pipeline (real session capture)
3. AI transcript analysis (async job queue, e.g. Inngest)
4. Faculty analytics on real data
5. Knowledge base / avatar (pgvector + RAG)
6. ELI5 button in ChatInterface (small but high student value)
7. Gradebook / Rubric / Submissions (dedicated sprint)
8. Audio/Podcast Mode (Phase 2)
9. Mobile optimization
10. LTI integration (embed into Canvas/Blackboard)
11. ~~Rate limiting + abuse prevention~~ (done — sliding-window rate limiter in `/api/chat`)

### What NOT to rebuild
- Tool data model is solid — extend it, don't replace it
- Prisma v7 + Neon pattern works well in serverless
- Keep mock auth demo mode even in production
- The Crammer, Auto-Grader tool type, Service Bot Builder, and UK Official badge are already built

### Estimated team for production
- 1 senior full-stack engineer (Next.js + Prisma)
- 1 AI/ML engineer (embeddings, RAG, prompt engineering)
- 1 frontend engineer (UI polish, mobile, accessibility)
- 1 DevOps (Vercel, Neon, monitoring, FERPA compliance)
- 1 product manager
- Timeline to production-ready v1: ~4 months
