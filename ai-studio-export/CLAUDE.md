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
| Email | Resend (gracefully degrades to console.log if no RESEND_API_KEY) |
| Cron | Vercel Cron Jobs (`vercel.json`) — Monday bracket digest, Monday league digest, Friday book digest |
| Code Editor | @monaco-editor/react — Monaco editor in Playground |
| Auth tokens | jsonwebtoken — JWT for Playground storage API |
| Export | jszip — Zip export for Playground apps |
| PDF parsing | pdf-parse — PDF text extraction for uploads |
| Audio TTS | OpenAI TTS API — voice synthesis for Audio Mode (optional) |

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
RESEND_API_KEY=re_...          # Optional — emails log to console if missing
CRON_SECRET=...                # Protects /api/brackets/digest, /api/book-recommender/digest, /api/leagues/cron/monday
OPENAI_API_KEY=sk-...          # Optional — audio synthesis disabled if missing
PLAYGROUND_JWT_SECRET=...      # Signs Playground storage tokens (falls back to a dev default if unset)
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

Primary nav (4 items, universal): **Home → Courses → Tools → Build**

| Item | Route(s) | Who Sees It | Notes |
|---|---|---|---|
| Home | `/` | Everyone | Dashboard |
| Courses | `/courses` | Everyone | |
| Tools | `/tools` | Everyone | Marketplace |
| Build | `/build` | Everyone | Build hub + conversational builder entry |

**User avatar dropdown quick links** (role-gated):
- My Library → `/library` (students only)
- Open Builder → `/builder` (everyone)
- Playground → `/playground` (everyone)
- My Apps → `/my-apps` (everyone)
- Bounties → `/bounties` (everyone)
- Datasets → `/datasets` (everyone)
- Publish Tool → `/publish` (educators/admins)
- My Progress → `/analytics/student` (students)
- Analytics → `/analytics/faculty` (educators/admins)
- My Portfolio → `/portfolio` (everyone)
- My TA → `/avatar` (educators/admins)
- Service Bots → `/service-bot` (admins only)
- Admin Panel → `/admin` (admins only)

**Header also shows:** unread message badge, notification bell badge (polls every 30s), pending challenge count (students)

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
- **BracketPool** — multi-user NCAA bracket challenge pool with join code and lock state
- **BracketEntry** — per-user picks (63-game JSON) and computed score/rank
- **BracketGame** — individual game stub with winner tracking; score recomputed on result entry
- **BracketEmailSub** — per-pool Monday email digest subscription
- **BookProfile** — per-user book taste profile (one per user)
- **BookEntry** — liked/disliked books with optional reason text
- **BookRecommendation** — AI-generated book recs with status (WANT/READ/SKIP)
- **BookDigestSub** — weekly new-release email digest subscription
- **UserMemory** — per-user AI-extracted knowledge/context stored as key-value facts
- **StudentNote** — freeform notes attached to a course; supports rich text; marked read/unread
- **ArticulationRequest** — AI-evaluated transfer credit request; stores external course info, internal course, similarity score (0–100), recommendation (APPROVE/NEEDS_REVIEW/DENY), and final admin decision (PENDING/APPROVED/DENIED)
- **AdminAnnouncement** — platform-wide banners shown via `PlatformAnnouncementBanner.tsx`
- **AdminAuditLog** — log of admin actions (approve/reject/suspend/etc.)
- **SandcastleSubmission** — student work submitted through Sandcastle experiences
- **LearningObjective** — per-course learning objectives visible on course page
- **StudentObjectiveProgress** — student completion state for each objective
- **CourseEnrollment** — explicit enrollment record (userId + courseId)
- **MaterialReadStatus** — tracks which students have read which materials
- **CourseToolLink** — many-to-many join linking tools to courses
- **PlatformQuest** / **UserPlatformQuest** — platform-wide quests (different from per-tool Quests)
- **LeaderboardEntry** — generic ranked entry attached to a tool
- **Challenge** — per-tool challenge issued from one user to another
- **DiscussionThread** / **DiscussionPost** — threaded course discussion boards
- **PortfolioItem** — student portfolio items (education, experience, project, skill, achievement); AI-generated bullet points; resume import
- **Notification** — in-app notifications (type enum: MENTION, REPLY, TOOL_APPROVED, BOUNTY_CLAIMED, etc.)
- **CollabSession** / **CollabParticipant** / **CollabMessage** — real-time collaborative chat sessions (separate from CollabRequest/CollabReview)
- **PlaygroundApp** — a saved Playground code app with title, description, system prompt, code
- **AppStoreEntry** — key-value config/data entries belonging to a PlaygroundApp
- **AppStoreDelegate** — JWT-authenticated delegate that can access a PlaygroundApp's store
- **GamificationConfig** — per-tool gamification settings (challenges, quests, leaderboard config)
- **ChatMessage** — individual messages stored per ToolSession for session history
- **League** / **LeagueMember** / **LeagueCycle** / **LeagueSubmission** / **LeagueStanding** / **LeagueEmailSub** / **LeagueEvent** — full competitive league system (see Leagues section)

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
- **Student view**: Learning Vitals grid (streak, sessions, time, avg score, class rank, Sand balance), recent sessions feed with scores, upcoming due dates, badges
  - `StudentQuestWidget` — compact quest progress widget (daily/weekly XP/Sand quests)
  - `ActionItems` — AI-recommended next steps based on activity
  - `NotebookWidget` — inline note-taking widget showing last 6 notes, links to `/notes`
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
- **Tool Forking** (`/api/tools/[id]/fork`) — clones a tool into a new Build Session so the user can customize it; redirects to `/builder`
- **Tool Scoring** (`/api/tools/[id]/score`) — records best score and latest score per user per tool; used by leaderboard and quest progress
- **Gamification Editor** (`/tools/[id]/gamification`) — educator/admin only; launches `GamificationBuilderChat` scoped to that tool for configuring XP, quests, and challenges

### Learn / Courses (`/courses` and `/courses/[id]`)
- Two-column layout: course list sidebar (left) + materials panel (right)
- Materials organized in module folder groups
- Connected tools per course
- Add/delete materials (educators)
- **CourseMagicButton** (`CourseMagicButton.tsx`): one-click generate chatbot from course materials → calls `/api/courses/[courseId]/generate-bot`, redirects to `/publish` with pre-filled config
- Discussion threads per course (`/courses/[id]/discussions/`)
- Sandy concierge adapts persona on `/courses`: course content expert + UI guide
- Error boundaries: `app/sandcastle/[slug]/error.tsx`, `app/tools/[id]/error.tsx`
- **Course Materials Viewer** (`CourseMaterialViewer.tsx`) — markdown renderer for course documents; shows module badge, read status, material type; marks materials read via `/api/materials/[id]/mark-read`
- **Course Study Panel** (`CourseStudyPanel.tsx`) — right-rail study companion per course: integrated Study Buddy AI chat powered by course materials, suggested topics pulled from top materials, linked tool launcher with type badges
- **Course Enrollment** — `CourseEnrollment` model; `/api/enrollment/` and `/api/courses/[id]/enroll`; enrollment shows objectives with mastery breakdown (mastered / struggling / not started)

### Learning Objectives & Mastery Tracking
- Per-course `LearningObjective` records with module organization
- `StudentObjectiveProgress` tracks: attempts, correct/incorrect counts, mastery level (`not_started` → `struggling` → `mastered`), `flaggedForReview` boolean, `lastSeenAt`
- `/api/objectives/progress` — upserts progress records; triggers `awardQuestProgress` for `SCORE_ABOVE_THRESHOLD` and `HIGH_SCORE_N_TOOLS` quest types
- "Flag for review" marks a student as struggling on a specific objective — visible to educators in analytics

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
- Catalog of 27 interactive experiences (25 live, 2 coming-soon)
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

### Admin (`/admin`, `/admin/users`, `/admin/ux-audit`)
- Pending approval queue: approve/reject PENDING tools
- View all users and tools; platform-wide stats
- **Active Service Bots** audit section: lists all `isOfficialService` tools
- **`/admin/users`** — full user management: view, suspend/unsuspend users. `SuspendedAccountScreen.tsx` shown to suspended users
- **`/admin/ux-audit`** — structured UX walkthrough runner (`UxAuditRunner.tsx`, `app/lib/ux-audit.ts`). Step-by-step guided audit across student/educator/admin/cross-cutting sections
- **Announcements** — create/delete platform-wide banners via `/api/admin/announcements/`. Displayed via `PlatformAnnouncementBanner.tsx`
- **Sandcastle submissions** — view/manage via `/api/admin/sandcastle-submissions/`
- **Tool session management** — view sessions via `/api/admin/tool-sessions/`

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
- **StudentQuestWidget.tsx** — compact quest widget on student home (shows 3 sample quests: Use Tool Today, Study Streak, Score 90%+)
- **Platform Quests** (`app/lib/platform-quests.ts`) — database-driven quests with two auto-incrementing types:
  - `SCORE_ABOVE_THRESHOLD` — fires when a tool session scores above the quest's `targetValue`
  - `HIGH_SCORE_N_TOOLS` — fires when a student achieves ≥90 on N distinct tools within the cadence window
  - Progress tracked in `UserPlatformQuest` (one row per user × quest × period); claimed rewards write `SandTransaction` + `XPEvent`
- **XP system** — `getLevelInfo()` in `app/lib/xp.ts`, XP events via `/api/xp/events`
- **Sand currency** — `calculateSandBalance()` in `app/lib/sand.ts`
- **Challenges** — per-tool at `/api/challenges/[id]/complete`
- **Leaderboards** — per-tool at `/api/tools/[id]/leaderboard`; scores written via `/api/tools/[id]/score`
- **Gamification config builder** — `GamificationBuilderChat.tsx`; also accessible at `/tools/[id]/gamification` per-tool

### Study Tools
- Study guide generation via `/api/study/guide`
- `StudyBuddyInterface.tsx` — dedicated study buddy chat
- `StudyGuideCard.tsx` — card for generated study guides

### Presence & Collaboration
- `PresenceWidget.tsx` — real-time user presence display
- `/api/presence/` — presence tracking
- `CallOverlay.tsx` — call/video overlay
- **CollabRequest/CollabReview** — async AI-guided review sessions (educator assigns tool review to another user)
- **CollabSession** (real-time) — multi-user live sessions with:
  - Host/participant model with join codes
  - Turn-based or free-form mode; turn order tracked in DB
  - `CollabMessage` history with sender name
  - Team score accumulation; **1.5× XP multiplier** for participants
  - End-of-session completion bonus XP
  - Artifact creation (shared output documents)
  - Optional course/syllabus context injection
  - UI: `CollabChatInterface.tsx`, `CollabJoinModal.tsx`; backend: `app/lib/collab.ts`, `collab-bus.ts`

### NCAA Bracket Challenge (`/tools/ncaa-bracket`)
- Multi-user pool system with 6-character join codes
- Pool creator auto-seeded with 63 game stubs; results entered by admin trigger full score recompute
- Bracket fill UI: region tabs (East/West/South/Midwest + Final Four), per-game pick buttons
- Scoring: R64=1, R32=2, S16=4, E8=8, FF=16, Championship=32
- Monday morning email digest (Vercel cron) via Resend
- Key files: `app/lib/bracket-teams.ts`, `app/api/brackets/`, `app/tools/ncaa-bracket/`

### Book Recommender (`/tools/book-recommender`)
- Per-user taste profile: add liked/disliked books with reasons
- Claude Haiku generates 8 personalized recommendations with "why this fits you" reasoning
- Mark recs Want / Read / Skip; Goodreads deep-link on each card
- Weekly new-release digest: Google Books API → Claude scores each release → emails matches ≥7/10 (Friday cron)
- All 6 demo users pre-seeded with books + recs matching their character profiles
- Key files: `app/api/book-recommender/`, `app/tools/book-recommender/`

### Campus Navigator (`/campus-navigator` and `/campus-navigator/[slug]`)
- Tool collection of 4 UK-specific academic support chatbots (all live)
- **Course Planner** — builds semester schedules from major/year/completed courses
- **Degree Audit Assistant** — decodes DegreeWorks flags, maps courses to requirements
- **Advisor Q&A** — practice advising questions before real appointment
- **Scholarship Finder** — surfaces UK-specific and national scholarships based on student profile
- Each tool has dedicated system prompt, welcome message, and starter questions in `app/lib/campus-navigator.ts`
- Route: `/campus-navigator` (gallery) + `/campus-navigator/[slug]` (chat)

### Research Hub (`/research-hub` and `/research-hub/[slug]`)
- Tool collection of 4 AI tools for faculty and graduate researchers (all live)
- **Literature Search** — search strategy, database selection, Boolean operators, PICO, PRISMA/PROSPERO for systematic reviews; includes AI discovery tools (Research Rabbit, Connected Papers, Semantic Scholar)
- **Citation Helper** — style guide rules and edge cases (datasets, preprints, AI content); explicitly NOT a citation generator; leads with accuracy disclaimer; recommends Zotero for bulk formatting
- **Methodology Reviewer** — peer-review-style design critique; structured output (fatal flaws → major → minor → suggestions); CONSORT/STROBE/COREQ/PRISMA reporting checklists; pre-registration guidance (OSF, ClinicalTrials.gov)
- **Grant Writing Assistant** — NIH Specific Aims, NSF Broader Impacts, R01/R21/K/F mechanism decision framework, reviewer critique responses; explicit disclaimer to verify formatting against current NOFO/FOA; NIH RePORTER recommendation; SciENcv biosketch note
- Powered by **Claude Sonnet** via `/api/research-hub` (not Haiku — tasks require reasoning; 4096 tokens, 120s timeout)
- Chat page includes: export conversation button (Download icon in header), paste-your-draft hint above textarea, full markdown rendering with h1/h2/h3 support
- Visible to EDUCATOR and ADMIN roles in header dropdown Quick Access menu
- Tool cards in `/tools` marketplace show Research Hub section below Campus Navigator
- Each tool config in `app/lib/research-hub.ts`

### Leagues System (`/tools/coffee-roulette`, `/tools/prediction-market`, `/tools/survivor-pool`)
- Generic multi-user competitive platform with adapter pattern (`app/lib/leagues/adapters/`)
- **3 adapters built:**
  - **Coffee Roulette** — weekly random partner matching for 1:1 coffee meetings; members rate their meet
  - **Prediction Market** — members bet Sand on yes/no propositions each cycle
  - **Survivor Pool** — pick one winner per cycle; wrong pick = eliminated
- Architecture: `LeagueAdapter` interface defines `validateSubmission`, `resolveCycle`, `buildDigest`, `buildNextCycle`; core logic in `app/lib/leagues/core.ts`
- UI: `LeagueShell.tsx` is the universal shell; `LeagueHeader`, `LeagueLeaderboard`, `LeagueFeed`, `LeagueCycleCard`, `LeagueSubmissionPanel`, per-adapter views
- Monday cron digest (`/api/leagues/cron/monday`) emails subscribers via Resend
- Join via code; public leaderboard; `LeagueStanding` tracks wins/losses/streak

### Code Playground (`/playground`, `/my-apps`)
- Monaco editor + live preview + AI chat in a single split-pane layout (`PlaygroundLayout.tsx`)
- Save and retrieve apps (`PlaygroundApp` model); JWT-secured storage API (`/api/playground/token`, `/api/playground/store/`)
- App export as zip (`jszip`) via `ExportModal` + `app/lib/playground-export.ts`
- Delegate system: other users can be granted access to a PlaygroundApp's store
- Pre-seeded examples gallery (`ExamplesGallery.tsx`)
- `/my-apps` — lists all playground apps the current user has saved

### Student Portfolio (`/portfolio`)
- Portfolio items in 5 categories: Education, Experience, Project, Skill, Achievement
- AI-generated bullet points for experience/project items via `/api/portfolio/generate-bullets`
- Resume import (text or PDF) via `/api/portfolio/import-resume` — Claude extracts and structures entries
- AI suggestions for missing/weak items via `/api/portfolio/suggestions`
- `PortfolioAddItemModal.tsx` for add/edit; `app/lib/portfolio.ts` for helpers

### Student Notes (`/notes`)
- Freeform note-taking per course or standalone
- `NoteEditor.tsx` — rich text editor component
- Filter by course, search by content
- API: `/api/notes/` (CRUD)

### Notifications (`/notifications`)
- In-app notification center (`/notifications` page)
- `app/lib/notifications.ts` — `createNotification()` helper used throughout the codebase
- API: `/api/notifications/` — list and mark-read
- Types: MENTION, REPLY, TOOL_APPROVED, BOUNTY_CLAIMED, etc.

### Transfer Credit Articulator (`/tools/transfer-credit-articulator`)
- Students submit an external course syllabus + target UK course for AI evaluation
- Claude computes a similarity score (0–100) and recommends APPROVE / NEEDS_REVIEW / DENY
- Educators/admins make final APPROVED/DENIED decision with notes
- `app/lib/articulation.ts` — scoring helpers, recommendation thresholds (≥90 = approve, <70 = deny)
- `ConfidenceWarning.tsx` — shown when AI confidence is low
- API: `/api/articulation/` (CRUD) + `/api/articulation/evaluate` (AI scoring) + `/api/articulation/[id]/decision`

### AI Registrar Flashcards (`/tools/ai-registrar-flashcards`)
- AI-generated flashcard quiz about UK registrar processes and policies
- `AIRegistrarFlashcardQuiz.tsx` — interactive quiz UI with confidence rating
- `app/lib/ai-registrar-flashcards.ts` — question generation logic

### Audio Mode
- Per-tool optional audio playback — AI responses are synthesized to speech
- `AudioPlayerBar.tsx` — sticky audio player bar with play/pause/speed controls
- `useAudioPlayer.ts` — audio state hook
- `/api/audio/synthesize` — calls OpenAI TTS API (voices: alloy/echo/fable/onyx/nova/shimmer)
- Rate-limited: 1,500 chars/request, 50,000 chars/user/day
- `app/lib/audio-experience.ts` — `ToolAudioConfig`, `AudioPersonaPreset` types
- Requires `OPENAI_API_KEY`; gracefully returns error if missing

### User Memories (`/api/memories/`)
- Per-user AI-extracted facts stored as `UserMemory` records
- **7 memory categories**: `IDENTITY` (name/year/major), `GOALS` (aspirations), `STRENGTHS`, `CHALLENGES`, `PROJECTS`, `WRITING_STYLE`, `PERSONAL` (hobbies/background)
- `/api/memories/extract` — Claude reads a message transcript and extracts up to 12 factual statements; auto-assigns category; tracks source (`extracted` vs `manual`)
- Memory context string injected as natural-language summary into tool system prompts for personalization
- Manual CRUD via `/api/memories/` (list, create, delete)

### Admin Control Tower (`app/lib/admin-control-tower.ts`)
- **Sandcastle submission review** — AI verdict: `AUTO_APPROVE` / `AUTO_REJECT` / `HUMAN_REVIEW`; flags: explicit content, fake authority, homework completion
- **Conversation moderation** — classifies individual turns: academic integrity violation, PII exposure, harmful content, off-topic
- **Fast-track tool approval** — auto-approves tools meeting all criteria: educator/admin created, not external URL, not official service, no risky terms in prompt
- **Token cost tracking** — `HAIKU_PRICING` ($1/M input, $5/M output); `getTokenTotals()` helper handles cache tokens
- **Admin audit logging** — all admin actions written to `AdminAuditLog` with metadata

### Auth Status Endpoint
- `/api/auth/status` — returns `{ userId, email, role, suspended }` for the current demo user; used by external integrations and the Playground JWT flow

### UI Mode System (`app/lib/ui-mode.ts`)
- `getUIMode(role)` returns `'professional'` for all roles currently
- `'gamified'` mode is scaffolded but not yet activated — intended for a future student-facing game-like UI variant
- `IS_GAMIFIED` / `IS_PROFESSIONAL` helper predicates for conditional rendering

### Chat Interface Markdown
- All chat components render assistant messages through ReactMarkdown with explicit `components` prop
- Components: `ConciergePanel`, `StudyBuddyInterface`, `BuilderChatPanel`, `GamificationBuilderChat`, `ToolBuilderChat`, `ChatInterface` (tools + sandcastle), `PlaygroundChat`, `CollabChatInterface`
- User messages always plain `whitespace-pre-wrap` — ReactMarkdown only for assistant

---

## Sandcastle Experiences

Defined in `app/lib/sandcastle.ts`. **28 total — all live.**

**Games:** Logic Riddle Room, UK Wildcats Trivia, Solve the Murder, Liar's Bluff, Escape the Island, Dead Reckoning

**Role-Play:** Jon Snow (50 Sand), Lincoln on Leadership (50 Sand), Monuments on the Mall, Job Interview Gauntlet, Negotiation Room, The Policy Room

**Sports AI:** March Madness Analyst, The Bracket, Fantasy Football GM, AI Bracket Manager

**Educator Tools:** Book Club, Other Content Finder, The Devil's Advocate, Citation Detective, Build a Syllabus, The Peer Review

**Club & Organizer:** The Crammer, Flashcard Forge, Assignment Stress Test, Rubric Architect, Major & Career Compass, Film Discussion Circle

### Sandcastle Submission & AI Review System
- Students can submit their own experiences via `/api/sandcastle/submit`
- AI-powered review in `admin-control-tower.ts` returns: `AUTO_APPROVE`, `AUTO_REJECT`, or `HUMAN_REVIEW`
- Content flagging checks: explicit content, fake authority claims, homework completion assistance
- Admin manages pending submissions via `/api/admin/sandcastle-submissions/`
- `SandcastleSubmission` model tracks status, flags, verdict, and reviewer notes

### Speech Recognition (`app/hooks/useSpeechRecognition.ts`)
- `continuous = true` mode with 3.5-second silence timer
- Any speech activity resets the countdown; delivers full accumulated transcript on silence
- Gracefully handles `onend` re-fires in continuous mode
- Manual stop (mic button) cancels timer and delivers immediately

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
│   │   ├── admin/                    # Approval queue + announcements + user mgmt + audit log + submissions
│   │   ├── announcements/            # Public read of active announcements
│   │   ├── articulation/             # Transfer credit AI evaluation + admin decisions
│   │   ├── audio/synthesize/         # OpenAI TTS synthesis (rate-limited)
│   │   ├── auth/status/              # Auth status check
│   │   ├── book-recommender/         # Taste profile + recommendations + digest
│   │   ├── bounties/                 # Bounty CRUD + reviews
│   │   ├── brackets/                 # NCAA bracket pools + entries + digest cron
│   │   ├── build-gamification/       # Build gamification features
│   │   ├── build-tool/               # Tool build endpoint
│   │   ├── builder/                  # Builder sessions + documents + publish
│   │   ├── challenges/               # Per-tool challenges
│   │   ├── chat/                     # Streaming Claude chat (sliding-window rate limiter)
│   │   ├── collab/                   # Collaboration requests + real-time sessions
│   │   ├── concierge/                # Sandy AI (page-aware)
│   │   ├── courses/                  # Course CRUD + materials + discussions + enrollment + objectives
│   │   │   └── [courseId]/generate-bot/  # POST: generate chatbot from course materials
│   │   ├── enrollment/               # Course enrollment
│   │   ├── gamification-config/      # Per-tool gamification config
│   │   ├── leagues/                  # League CRUD + cycles + submissions + leaderboard + digest cron
│   │   ├── library/                  # Student library
│   │   ├── materials/[id]/mark-read/ # Material read tracking
│   │   ├── memories/                 # User memory CRUD + AI extraction
│   │   ├── messages/                 # Direct messaging + unread count
│   │   ├── notes/                    # Student notes CRUD
│   │   ├── notifications/            # In-app notifications
│   │   ├── objectives/progress/      # Learning objective progress
│   │   ├── playground/               # Playground apps + JWT tokens + storage + chat + export
│   │   ├── portfolio/                # Portfolio items + AI bullet gen + resume import + suggestions
│   │   ├── presence/                 # Real-time presence
│   │   ├── publish/preview-chat/     # Live tool preview in publish flow
│   │   ├── quests/                   # Quest claim
│   │   ├── sandcastle/               # Sandcastle session tracking + submissions
│   │   ├── sessions/                 # Tool session tracking + message history
│   │   ├── study/                    # Study guide generation + document uploads
│   │   ├── tools/                    # Tool CRUD + upvote/favorite/comments/metrics/fork/score
│   │   ├── upload/                   # File + PDF upload
│   │   ├── users/                    # User profiles
│   │   └── xp/                       # XP + badges + Sand balance
│   ├── components/
│   │   ├── ActionItems.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── AudioPlayerBar.tsx        # Sticky audio player for Audio Mode
│   │   ├── BuildHubHero.tsx
│   │   ├── BuildMomentOverlay.tsx
│   │   ├── BuilderChatPanel.tsx      # Conversational builder chat + TOOL_TYPES
│   │   ├── BuilderLayout.tsx         # Builder UI (chat + preview/code/files tabs)
│   │   ├── CallOverlay.tsx           # Call/video overlay
│   │   ├── ChatInterface.tsx         # Streaming chat UI (tools + sandcastle)
│   │   ├── ClientProviders.tsx
│   │   ├── CodePanel.tsx
│   │   ├── CommentsSection.tsx
│   │   ├── ConciergePanel.tsx        # Sandy AI sidebar
│   │   ├── CourseMagicButton.tsx     # One-click "generate bot from course" button (educator)
│   │   ├── FilesPanel.tsx
│   │   ├── GamificationBuilderChat.tsx
│   │   ├── Header.tsx                # Nav + user dropdown + XP/Sand display
│   │   ├── MessageButton.tsx         # Message icon + unread badge
│   │   ├── NoteEditor.tsx            # Rich text note editor
│   │   ├── NotebookWidget.tsx        # Compact note-taking widget
│   │   ├── PlatformAnnouncementBanner.tsx  # Admin-created platform-wide banners
│   │   ├── PortfolioAddItemModal.tsx  # Add/edit portfolio item
│   │   ├── PreviewPanel.tsx
│   │   ├── PresenceWidget.tsx        # Real-time presence
│   │   ├── PrivacyFooter.tsx         # "UKY Protected Environment" privacy note for chat UIs
│   │   ├── QuestPanel.tsx            # Daily/weekly quests (home dashboard)
│   │   ├── StarRating.tsx
│   │   ├── StudentQuestWidget.tsx
│   │   ├── StudyBuddyInterface.tsx
│   │   ├── StudyGuideCard.tsx
│   │   ├── SuspendedAccountScreen.tsx  # Shown to suspended users
│   │   ├── ToolBuilderChat.tsx        # Alt builder (publish page)
│   │   ├── ToolCard.tsx               # Marketplace card (UK Official + Verified badges)
│   │   ├── ToolLaunchModal.tsx
│   │   ├── admin/UxAuditRunner.tsx    # Guided UX audit UI
│   │   ├── collab/CollabChatInterface.tsx  # Real-time collab chat
│   │   ├── collab/CollabJoinModal.tsx
│   │   ├── courses/CourseMaterialViewer.tsx
│   │   ├── courses/CourseStudyPanel.tsx
│   │   ├── leagues/                   # League UI components (Shell, Header, Leaderboard, Feed, etc.)
│   │   │   └── adapters/              # Per-adapter views (CoffeeRouletteView, PredictionMarketView, SurvivorPoolView)
│   │   ├── playground/                # Playground components (PlaygroundLayout, PlaygroundChat, CodeEditor, AppPreview, etc.)
│   │   ├── publish/ToolPreviewChat.tsx  # Live preview chat in publish flow
│   │   └── registrar/                 # AIRegistrarFlashcardQuiz + ConfidenceWarning
│   ├── lib/
│   │   ├── admin-control-tower.ts     # Admin action helpers
│   │   ├── ai-registrar-flashcards.ts # Flashcard question generation
│   │   ├── articulation.ts            # Score helpers, recommendation thresholds
│   │   ├── audio-experience.ts        # ToolAudioConfig, AudioPersonaPreset types, voice list
│   │   ├── auth-context.tsx           # Mock auth (6 demo users) — REPLACE for production
│   │   ├── bracket-teams.ts           # 64 NCAA teams, buildInitialGames(), computeScore()
│   │   ├── campus-navigator.ts        # CAMPUS_TOOLS array (4 tools with system prompts)
│   │   ├── collab-bus.ts / collab-types.ts / collab.ts  # Collab session logic
│   │   ├── datasets.ts
│   │   ├── email.ts                   # Shared email helpers (wraps Resend)
│   │   ├── experience-types.ts        # EXPERIENCE_CATEGORIES (8 categories, 30+ types)
│   │   ├── join-code.ts               # 6-char join code generator (used by leagues + brackets)
│   │   ├── leagues/                   # Leagues: core.ts, digest.ts, sand-ledger.ts, adapters/
│   │   ├── messaging.ts               # Messaging helpers
│   │   ├── notifications.ts           # createNotification() helper
│   │   ├── platform-quests.ts         # Platform-wide quest definitions
│   │   ├── playground-export.ts       # JSZip export logic
│   │   ├── playground-storage.ts      # JWT auth + CORS helpers for playground storage API
│   │   ├── portfolio.ts               # Portfolio helpers
│   │   ├── presence-context.tsx       # Presence React context
│   │   ├── presence.ts
│   │   ├── prisma.ts                  # DB client with PrismaPg adapter
│   │   ├── sand.ts                    # calculateSandBalance()
│   │   ├── sandcastle.ts              # Static Sandcastle configs (27 experiences)
│   │   ├── server-auth.ts             # Server-side auth helpers
│   │   ├── service-bot-prompt.ts      # buildServiceBotSystemPrompt()
│   │   ├── types.ts
│   │   ├── ui-mode.ts                 # UI mode helpers
│   │   ├── ux-audit.ts                # UX audit step definitions
│   │   └── xp.ts                      # getLevelInfo()
│   ├── hooks/
│   │   ├── useAudioPlayer.ts          # Audio state/playback hook
│   │   └── useSpeechRecognition.ts    # continuous=true, 3.5s silence timer, full transcript accumulation
│   ├── (pages)/
│   │   ├── page.tsx                   # Home dashboard
│   │   ├── tools/page.tsx + [id]/     # Marketplace + tool detail
│   │   ├── tools/ncaa-bracket/        # Pool list, [poolId] leaderboard, [poolId]/fill
│   │   ├── tools/book-recommender/    # Taste profile + recs + digest sub
│   │   ├── tools/transfer-credit-articulator/  # AI transfer credit evaluation
│   │   ├── tools/ai-registrar-flashcards/      # Registrar process flashcards
│   │   ├── tools/coffee-roulette/     # Coffee Roulette league
│   │   ├── tools/prediction-market/   # Prediction Market league
│   │   ├── tools/survivor-pool/       # Survivor Pool league
│   │   ├── campus-navigator/page.tsx + [slug]/  # Campus Navigator tool collection
│   │   ├── courses/page.tsx + [id]/   # Courses + discussions + materials
│   │   ├── build/page.tsx + collaborator/ + refiner/
│   │   ├── builder/page.tsx
│   │   ├── library/page.tsx
│   │   ├── my-apps/page.tsx           # User's saved Playground apps
│   │   ├── notes/page.tsx             # Student notes
│   │   ├── notifications/page.tsx     # Notification center
│   │   ├── playground/page.tsx        # Code Playground
│   │   ├── portfolio/page.tsx         # Student portfolio
│   │   ├── sandcastle/page.tsx + [slug]/
│   │   ├── bounties/page.tsx + new/ + [id]/
│   │   ├── datasets/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── service-bot/page.tsx       # ADMIN only
│   │   ├── publish/page.tsx
│   │   ├── admin/page.tsx + users/ + ux-audit/
│   │   ├── profile/[id]/page.tsx
│   │   ├── avatar/page.tsx
│   │   └── analytics/faculty/ + student/
│   └── generated/prisma/              # Auto-generated — do not edit
├── prisma/schema.prisma + seed.ts + migrations/
├── public/cats-ai-logo*.png + cats-ai-logo.mp4
├── prisma.config.ts
└── CLAUDE.md
```

---

## Demo Data (Seed)

**Users:** Alex Admin, Dr. DiPaola, Eric Monday, Heath Price (EDUCATOR, TEK-100), Ian McClure (STUDENT, 1L law), Tiana The (STUDENT, English), plus seeded extras (James Rivera, Maya Johnson, Diana Brooks, etc.)

**Tools (35+):** Cross-Examination Simulator, Age of Exploration, Organic Chemistry Predictor, Patient Interview Practice, Socratic Debate Partner, Business Case Analyzer, PHI 110 Argument Coach, LAW 756 Evidence Simulator, CS 215 Python Tutor, Nonprofit Donor Prospector, HIST 300 Primary Source Analyzer, MBA 640 Strategy Coach, Financial Aid Advisor (Finley — UK Official), plus catalog tools

**Courses:** TEK-100 (Heath Price) with module materials

**Book Profiles:** All 6 demo users seeded with 3–5 liked books + 4–5 pre-generated recommendations tailored to their role:
- Ian McClure (Law): Just Mercy, Lincoln Lawyer → Presumed Innocent, Devil in the Grove
- Tiana The (English): Morrison, Baldwin, Rooney → Pachinko, A Little Life, Bluets
- Heath Price (Engineering): Isaacson, Feynman → Code Book, Skunk Works
- Alex Thompson (AI admin): Alignment Problem → Coming Wave, Atlas of AI
- Dr. DiPaola (Provost): Collins, Kahneman → Range, Fearless Organization
- Eric Monday (Finance): Dalio, Collins → Measure What Matters, Checklist Manifesto

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

## Tool Collections (Marketplace Bundles)

Themed bundles of complementary AI tools. Defined in `c:\AA Code\Educator marketplace\TOOL-COLLECTIONS.md`.

| Collection | Status | Category | Tools |
|---|---|---|---|
| **Study Buddy** | ✅ Built | University | Tutoring, Flashcards, Essay Coach, Quiz |
| **Campus Navigator** | ✅ Built | University | Course Planner, Degree Audit, Advisor Q&A, Scholarship Finder |
| **Research Hub** | ✅ Built | University | Literature Search, Citation Coach, Methodology Reviewer, Grant Writing |
| **Coach's Corner** | Planned | Athletics | Play Diagrammer, Scouting Report, Film Notes, Game Plan Builder |
| **Fan Zone** | Planned | Athletics | Stats Explainer, Fantasy Advice, Team History Q&A, Trash Talk |
| **Athlete Toolkit** | Planned | Athletics | Nutrition Logger, Workout Planner, Injury Checker, Mental Prep Coach |
| **Meeting Machine** | Planned | Productivity | Agenda Builder, Minutes Taker, Action Item Tracker, Follow-up Drafter |
| **Write Room** | Planned | Productivity | Resume Builder, Cover Letter, Email Rewriter, LinkedIn Optimizer |
| **Data Desk** | Planned | Productivity | Chart Explainer, Survey Analyzer, Report Summarizer, Presentation Outliner |
| **Story Forge** | Planned | Creative | Plot Outliner, Character Developer, Dialogue Writer, World Builder |
| **Music Studio** | Planned | Creative | Lyric Writer, Chord Suggester, Genre Explainer, Set List Planner |
| **Wellness Hub** | Planned | Health | Symptom Journal, Mindfulness Coach, Sleep Analyzer, Habit Tracker |

**Build Priority:** Study Buddy ✅ → Campus Navigator ✅ → Research Hub → Coach's Corner → Write Room

---

## Features In Progress / Planned

### ELI5 "Explain Simpler" Button
Add a `Lightbulb` button beneath the last assistant message in `ChatInterface.tsx`. One click injects a fixed follow-up prompt into the existing streaming flow. Only visible on the last assistant message when not loading. No new API route, no slider.

### Faculty Analytics (`/analytics/faculty`)
Currently simulated. Production: real session/metric capture → async AI analysis → per-student warning flags (engagement drop <50% of baseline, grade drop >1 SD below 4-week rolling mean).

### Student Analytics (`/analytics/student`)
Currently simulated. Skills radar; portfolio page exists but PDF export not yet built.

### Faculty Avatar / Knowledge Base (`/avatar`)
Faculty upload docs → RAG chatbot. Path: Vercel Blob → text extraction → chunk + embed (Voyage AI) → pgvector → top-k retrieval. Tool type: `KNOWLEDGE_BASE`.

### Gradebook / Rubric / Submissions (Phase 2)
Canvas replacement core. Requires `GradebookEntry`, `Rubric`, `Submission` models; assignment submission UI; gradebook grid at `/courses/[id]/grades`; AI pre-grading route. Dedicated sprint — design before building.

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
8. Student analytics PDF export
9. Mobile optimization
10. LTI integration (embed into Canvas/Blackboard)
11. ~~Rate limiting + abuse prevention~~ (done — sliding-window rate limiter in `/api/chat`)
12. ~~Audio/Podcast Mode~~ (done — OpenAI TTS, per-tool audio config, `AudioPlayerBar`)
13. ~~Campus Navigator~~ (done — 4 tools live at `/campus-navigator`)
14. ~~Portfolio~~ (done — `/portfolio` with AI bullet gen + resume import)
15. ~~Student Notes~~ (done — `/notes`)
16. ~~Leagues~~ (done — Coffee Roulette, Prediction Market, Survivor Pool)
17. ~~Code Playground~~ (done — Monaco editor, JWT storage, zip export)

### What NOT to rebuild
- Tool data model is solid — extend it, don't replace it
- Prisma v7 + Neon pattern works well in serverless
- Keep mock auth demo mode even in production
- The Crammer, Auto-Grader tool type, Service Bot Builder, and UK Official badge are already built
- Leagues system (adapter pattern is extensible — just add a new adapter)
- Code Playground (JWT storage API is reusable for embedded tools)
- Audio Mode infrastructure (`audio-experience.ts` + `/api/audio/synthesize` + `AudioPlayerBar`)
- Campus Navigator, Portfolio, Notes, Notifications — all built and working

### Estimated team for production
- 1 senior full-stack engineer (Next.js + Prisma)
- 1 AI/ML engineer (embeddings, RAG, prompt engineering)
- 1 frontend engineer (UI polish, mobile, accessibility)
- 1 DevOps (Vercel, Neon, monitoring, FERPA compliance)
- 1 product manager
- Timeline to production-ready v1: ~4 months
