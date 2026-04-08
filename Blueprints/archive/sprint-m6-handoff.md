# Handoff Prompt — Sprint M6: Learning Time Machine UI (Timeline Page + Homepage Card)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, component hierarchy, and design specs. You are
executing Sprint M6 (Tasks 11-12). Sprint M5 is **complete** — the service layer and API
route are built and ready.

### M5 Completed Files
- **Service**: `the-sandbox/app/lib/timeline-service.ts`
  - Exports: `getTimeline`, `LearningTimeline`, `TimelineEvent`, `TimelineOptions`, `TimelineEventType`, `TimelineStats`
  - Event types: `session`, `mastery_jump`, `transfer`, `misconception_cleared`, `bloom_advance`, `study_plan`
  - Magnitudes: `minor`, `notable`, `breakthrough`
  - Stats: `totalSessions`, `conceptsMastered`, `transferEvents`, `misconceptionsOvercome`, `bloomPeak`, `longestStreak`
- **API Route**: `the-sandbox/app/api/timeline/route.ts`
  - `GET /api/timeline?courseId=xxx&from=ISO&to=ISO&limit=50&offset=0&types=session,transfer`
  - Auth: `requireStudentUser()` (STUDENT or ADMIN)
  - Returns: `{ events: TimelineEvent[], stats: TimelineStats, hasMore: boolean }`

### The Sandbox Uses
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- Charts: recharts (already installed)
- Icons: lucide-react ONLY
- UI pattern: `PLATFORM-CONSISTENCY-MANIFEST.md` — Pattern A/B header, `max-w-6xl`, `border-2 rounded-2xl` cards, `font-extrabold` h1/h2
- Read `the-sandbox/CLAUDE.md` for all coding constraints

### Key Pattern Files to Read
- `app/components/PageHeader.tsx` — standard page header
- Any existing student page (e.g., `app/page.tsx`) — for homepage card integration pattern
- `app/components/analytics/` — for recharts usage patterns

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 11: Create TimelinePage at `/timeline`
Create `the-sandbox/app/timeline/page.tsx` — full-page view with:

**TimelineFilters** (`app/components/timeline/TimelineFilters.tsx`):
- Course dropdown: fetch user's enrolled courses, filter timeline by courseId
- Date range picker: two date inputs (from/to), default last 90 days
- Event type toggle chips: one chip per TimelineEventType, toggleable, all ON by default
- Filters call parent callback with updated params; parent re-fetches from API

**TimelineChart** (`app/components/timeline/TimelineChart.tsx`):
- recharts `AreaChart` showing daily session scores over time
- X-axis: dates; Y-axis: score (0-100%)
- Area fill: UK Blue `#0033A0` with 20% opacity
- Dots: colored by magnitude (gold=breakthrough, blue=notable, gray=minor)
- Responsive container, 300px height
- Data: derive from session events in the timeline response (group by day, average scores)

**TimelineStream** (`app/components/timeline/TimelineStream.tsx`):
- Scrollable event list grouped by week (use date-fns `startOfWeek`)
- Each week gets a header: "Week of March 15, 2026"
- Each event rendered as **TimelineEventCard**

**TimelineEventCard** (`app/components/timeline/TimelineEventCard.tsx`):
- Left: type-specific lucide icon (Brain for mastery, ArrowRightLeft for transfer, Flame for session, Target for bloom, BookOpen for study_plan, Lightbulb for misconception)
- Center: title (bold), description, concept tags (colored pills by magnitude)
- Right: relative timestamp (date-fns `formatDistanceToNow`)
- Bottom: course code badge if present
- `breakthrough` magnitude: gold left border + subtle gold background glow
- `notable` magnitude: UK Blue left border
- `minor` magnitude: gray left border

**LoadMoreButton**: shown when `hasMore=true`, increments offset and appends events

**TimelineInsights** (`app/components/timeline/TimelineInsights.tsx`):
- Static for v1 — display stats from the API response
- Cards: Total Sessions, Concepts Mastered, Transfer Events, Misconceptions Overcome, Bloom Peak, Longest Streak
- Each stat in a small card with icon + number + label
- Arrange in 2x3 or 3x2 grid depending on screen width

**Page layout**: PageHeader at top, then horizontal layout — main column (filters → chart → stream → load more) and sidebar (insights panel). On mobile: stack vertically.

### Task 12: Create TimelineCard Homepage Widget
Create `the-sandbox/app/components/timeline/TimelineCard.tsx`:
- Compact card showing last 5 events with inline stats bar
- Fetches `/api/timeline?limit=5` on mount
- Each event: icon + title + relative timestamp (single line)
- Stats bar below events: "12 sessions · 5 mastered · 2 transfers" inline
- "View Full Timeline →" link to `/timeline`
- Card style: `border-2 rounded-2xl border-gray-200 p-6`

**Integration**: Add TimelineCard to the student dashboard section in `app/page.tsx`. Place it alongside existing dashboard cards. Only render for STUDENT role users.

## The Specs
- Read existing component files for patterns BEFORE writing code
- Follow ALL constraints from CLAUDE.md (Tailwind v4, lucide-react, no @apply, size-N)
- No new npm dependencies (recharts, date-fns, lucide-react already available)
- Use `fetch('/api/timeline?...')` with `x-demo-user-email` header from auth context
- Handle loading states with skeleton placeholders
- Handle empty states: "No learning events yet — complete a tool session to start your timeline!"
- FERPA: the API already excludes sensitive sessions; no additional filtering needed in UI

## The Next Link
After completing Tasks 11-12, generate a Handoff Prompt for Sprint M7 (Tasks 13-14):
- Task 13: Interstitial Micro-Reviews — new Prisma model `MicroReview`, service layer `micro-review-service.ts`, API routes
- Task 14: MicroReviewModal component + course page integration
Include full Context section noting M5+M6 are complete with file paths and exports.
