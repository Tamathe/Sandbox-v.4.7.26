# Handoff Prompt — Sprint M14: Prerequisite Unpacker UI + Integration

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, component hierarchy, and design specs. You are
executing Sprint M14 (Tasks 27-28). Sprint M13 is **complete** — the schema, service layer,
and API route are built and ready.

### M13 Completed Files
- **Schema**: `ConceptPrerequisite` model in `prisma/schema.prisma`
  - Fields: `id`, `concept` (target slug), `prerequisite` (required slug), `courseId?`, `source` ("syllabus" | "ai_inferred"), `confidence`, `createdAt`
  - Indexes: `@@unique([concept, prerequisite, courseId])`, `@@index([concept])`, `@@index([courseId])`
  - Relation: optional `Course` via `courseId`
- **Service**: `the-sandbox/app/lib/prerequisite-service.ts`
  - Exports: `unpackPrerequisiteChain(userId, concept, courseId)` → `Promise<PrerequisiteChain>`
  - Exports: `PrerequisiteChain` interface (targetConcept, targetMastery, chain, rootGap, explanation)
  - Exports: `PrerequisiteNode` interface (concept, effectiveMastery, isStale, isGap, depth, courseId?, courseCode?)
  - Logic: recursive chain resolution (max depth 4), AI inference via Haiku when no records exist, mastery decay applied, root gap identification, AI-generated explanation
- **API Route**: `the-sandbox/app/api/prerequisite-unpack/route.ts`
  - `POST /api/prerequisite-unpack`
  - Body: `{ concept: string, courseId: string }`
  - Auth: `requireStudentUser()`
  - Returns: `PrerequisiteChain` JSON

### Previously Completed Magic Moments Sprints
- **M1-M4**: Knowledge Constellation (service, APIs, Semester View, Degree Arc, integration)
- **M5-M6**: Learning Time Machine (service, API, timeline page, homepage card)
- **M7-M8**: Interstitial Micro-Reviews (MicroReview model, service, API, modal, course page integration)
- **M9-M10**: Exam Forge (PracticeExam schema, exam-forge-service, 4 API routes, 6 components, course page integration)
- **M11-M12**: Teach It Back (TeachBackSession schema, service, 5 API routes, chat UI, course integration)
- **M13**: Prerequisite Unpacker service (see above)

### The Sandbox Uses
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- Icons: lucide-react ONLY
- UI pattern: `PLATFORM-CONSISTENCY-MANIFEST.md` — Pattern A/B header, `max-w-6xl`, `border-2 rounded-2xl` cards, `font-extrabold` h1/h2
- Read `the-sandbox/CLAUDE.md` for all coding constraints

### Key Pattern Files to Read
- `app/components/PageHeader.tsx` — standard page header
- `app/components/exam-forge/ExamForgePanel.tsx` — similar panel pattern (slide-out/inline)
- `app/components/teach-it-back/TeachBackPanel.tsx` — similar panel pattern
- `app/lib/prerequisite-service.ts` — the service you're building UI for (read for types)
- `app/api/prerequisite-unpack/route.ts` — the API route you're calling

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 27: Create Prerequisite Unpacker UI Components

Create the following components in `app/components/prerequisite/`:

**PrerequisiteUnpackerPanel** (`PrerequisiteUnpackerPanel.tsx`):
- Main panel component — can render inline or as slide-out panel
- Props: `concept: string`, `courseId: string`, `onClose?: () => void`, `inline?: boolean`
- On mount: calls `POST /api/prerequisite-unpack` with `{ concept, courseId }` and `x-demo-user-email` header
- Loading state: skeleton placeholder with pulsing chain nodes
- Error state: friendly message with retry button
- Layout (top to bottom):
  1. Header: target concept name + mastery percentage badge
  2. ChainVisualization (the prerequisite tree)
  3. Explanation section (AI narrative)
  4. RecommendedPath (action steps)
- Card style: `border-2 rounded-2xl border-gray-200 bg-white p-6`
- If `inline` prop is false/absent, render as fixed right panel (similar to ConciergePanel slide-out)
- Close button (X icon, top-right) calls `onClose`

**ChainVisualization** (`ChainVisualization.tsx`):
- Vertical tree layout: root prerequisite at top → intermediate nodes → target concept at bottom
- Each node connected by vertical lines/arrows (SVG or CSS borders)
- Direction indicator: arrows flow upward (from root gap → target) to show "start here, build up to target"
- Nodes are `PrerequisiteNodeCard` components
- If chain is empty: show "No prerequisites found — this is a foundational concept"

**PrerequisiteNodeCard** (`PrerequisiteNodeCard.tsx`):
- Displays a single node in the prerequisite chain
- Props: `node: PrerequisiteNode`, `isRootGap?: boolean`, `onReviewClick?: (concept: string, toolId?: string) => void`
- Layout:
  - Left: depth indicator (indentation or numbered step)
  - Center: concept name (bold), course code badge if present
  - Right: mastery bar (horizontal, colored by level)
- Mastery bar colors: green (>0.75), amber (0.5-0.75), red (<0.5), gray (0 or undefined)
- If `isStale`: subtle pulsing/dimmed opacity + "Stale" text indicator
- If `isGap` (mastery < 0.5): red left border accent
- If `isRootGap`: prominent red "Root Gap" badge (red background, white text, small pill)
- Action button: "Review this concept" (lucide `ExternalLink` icon) — calls `onReviewClick`

**Supporting elements within PrerequisiteUnpackerPanel** (can be inline, no separate file needed):
- **Explanation**: renders `chain.explanation` in a subtle info card (light blue-gray background, `Info` lucide icon)
- **RecommendedPath**: if `rootGap` exists, show ordered steps:
  1. "Start with: [rootGap.concept]" with the recommended action text
  2. Intermediate steps from chain (gap nodes only, ordered by depth descending)
  3. "Then return to: [targetConcept]"
  - Each step as a numbered list item with checkmark-style icons
  - If `rootGap.recommendedToolId` exists, "Review this concept" button links to `/tools/[toolId]`

### Task 28: Integration Points

Wire the Prerequisite Unpacker into existing surfaces:

**Sandy Concierge Integration** (`app/lib/concierge-service.ts`):
- In the system prompt builder, add awareness: when Sandy detects a student struggling with a concept (context shows low mastery or repeated incorrect answers), Sandy can suggest: "Let me trace back to find where the confusion started..." and recommend using the Prerequisite Unpacker
- Add to Sandy's tool awareness so it can reference the feature by name
- No auto-rendering of the panel from Sandy — just conversational suggestion with concept/course context

**Constellation Integration** (`app/components/constellation/` — if these components exist):
- On weak (red) constellation nodes: add a context action or tooltip: "Why am I struggling with this?"
- Clicking it opens `PrerequisiteUnpackerPanel` inline with the node's concept and courseId
- If constellation components don't exist yet, skip this integration

**Exam Forge Results Integration** (`app/components/exam-forge/`):
- In exam results view: for concepts where the student scored poorly, add a link/button: "Find the root cause"
- Clicking opens `PrerequisiteUnpackerPanel` as a slide-out with that concept and courseId
- If no exam forge results component exists, skip

**Course Page Integration** (`app/courses/[id]/page.tsx` or similar):
- Add a way for students to trigger the unpacker from their course view
- Option A: In the learning objectives or concepts section, add a small "Unpack prerequisites" icon button next to weak concepts
- Option B: Add to an existing course page tab (e.g., overview or progress section)
- Use whichever pattern matches the existing course page structure best
- The panel should slide out or render inline — match existing patterns in the course page

## The Specs
- Read existing component files for patterns BEFORE writing code
- Follow ALL constraints from CLAUDE.md (Tailwind v4, lucide-react, no @apply, size-N)
- No new npm dependencies
- Use `fetch('/api/prerequisite-unpack', { method: 'POST', body, headers })` with `x-demo-user-email` from auth context
- Handle loading states with skeleton/shimmer placeholders
- Handle empty states gracefully (no prerequisites found)
- FERPA: the API already handles data scoping — no additional filtering needed in UI
- Import types from `app/lib/prerequisite-service.ts` (PrerequisiteChain, PrerequisiteNode)

## Architecture Constraints (non-negotiable)
- Prisma v7 — no url in datasource; use prisma.config.ts; PrismaPg adapter at runtime
- Tailwind v4 — no @apply; utility classes in JSX only; `size-N` not `w-N h-N`
- Auth — `requireRequestUser()` / `requireStudentUser()` from `app/lib/server-auth.ts` on all protected routes
- Icons — lucide-react only
- Rate limiting — `checkRateLimit()` on all mutation routes
- No `window.confirm()` — inline React confirmation patterns only
- No hardcoded emails/IDs
- Build command: `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\`
- Prisma client import: `../generated/prisma` (relative to `app/lib/`)
- UK Blue: `#0033A0`
- Route logic: routes must be thin (auth → parse → call lib → return)
- UI standard: `PLATFORM-CONSISTENCY-MANIFEST.md` (max-w-6xl, border-2, rounded-2xl, Pattern A/B headers, font-extrabold h2)

## The Next Link
After completing Tasks 27-28, generate a Handoff Prompt for Sprint M15 (Tasks 29-30):
- Task 29: Complementary Study Matching — new Prisma models `StudyMatchProfile` + `StudyMatch`, service layer `study-match-service.ts` with complementarity algorithm
- Task 30: API routes: `POST /api/study-match/opt-in`, `GET /api/study-match/suggestions`, `POST /api/study-match/[matchId]/respond`
Include the full Context section noting M1-M14 are complete with file paths and exports.

## Instructions
1. Read `CLAUDE.md` at `c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md`
2. Read `app/lib/prerequisite-service.ts` for the types and service contract
3. Read existing panel components (ExamForgePanel, TeachBackPanel) for slide-out patterns
4. Read the course page to understand where integration fits
5. Execute Task 27 — create the 3 component files
6. Run `npm run build` — fix any errors before proceeding
7. Execute Task 28 — wire integrations into existing surfaces
8. Run `npm run build` again — fix any errors
9. Stop, report results, and update `SPRINT-HANDOFF.md` at
   `c:\AA Code\Educator marketplace\Blueprints\SPRINT-HANDOFF.md`
10. Output the updated Resume Prompt for Sprint M15
