# Build Page — Student Contexts & Two-Tier Publishing Blueprint

## Context

The current `app/build/page.tsx` assumes the user is an educator: it shows draft tools, bounties, Sand ledger, and build surfaces (Builder, Refiner, Collaborator, Publish). Students land on this page and see content entirely framed around building tools for others — not for themselves.

This blueprint redesigns Build into a **role-aware, context-first hub** that works for all roles:
- **Students** — build personal learning tools, contribute to community, earn Sand
- **Educators** — existing flow + course-specific workspaces with AI gap analysis
- **Admins** — existing flow + pending approval queue

The core framing shift: **Build is a studio, not a form**. You arrive and choose a context (course, marketplace, Sandcastle), then the workspace adapts.

---

## Design Overview

### Three Build Contexts (all roles)

| Context | Entry Point | Who Uses It | Published To |
|---|---|---|---|
| **Course Workspace** | A specific course | Educators (primary), Students (enrolled) | That course's tool list |
| **Marketplace** | General | Everyone | Marketplace (educator = auto-published, student = community queue) |
| **Sandcastle Live** | Sandcastle tab | Everyone | Sandcastle experiences |

### Two-Tier Publishing

Tools published by educators go straight to marketplace (existing behavior).
Tools published by students go into a **Community Library** — immediately visible with a `COMMUNITY` badge, no admin review needed.
Educators and admins can additionally submit tools for **official approval** (`PENDING → APPROVED`), which adds an `✓ Approved` badge and higher trust signals in the marketplace.

```
ApprovalStatus enum:
  COMMUNITY   — student-published, no review (default for student role)
  PENDING     — submitted for admin review
  APPROVED    — admin-verified, shows checkmark
  REJECTED    — did not pass review
```

---

## Schema Changes

### 1. Add `ApprovalStatus` enum and field to `Tool`

**File:** `prisma/schema.prisma`

Add after the `ToolType` enum:

```prisma
enum ApprovalStatus {
  COMMUNITY
  PENDING
  APPROVED
  REJECTED
}
```

Add field to `Tool` model (after `featured`):

```prisma
approvalStatus  ApprovalStatus @default(COMMUNITY)
```

Add index:

```prisma
@@index([approvalStatus])
```

### 2. Run migration

```bash
npx prisma migrate dev --name add-approval-status
```

---

## API Changes

### 3. Allow student role to create tools

**File:** `app/api/tools/route.ts`

**Change** (POST handler, around line 108):

```typescript
// Current — blocks students
if (user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Only educators and admins can publish tools' }, { status: 403 })
}
```

**Replace with:**

```typescript
// All roles can publish; approval status depends on role
const isPrivileged = user.role === 'EDUCATOR' || user.role === 'ADMIN'
```

Then in the `prisma.tool.create` data block, add:

```typescript
approvalStatus: isPrivileged ? 'PENDING' : 'COMMUNITY',
// Note: educators start as PENDING (opt-in to review);
// pass approvalStatus in body to allow ADMIN to override to APPROVED
```

Actually, let's simplify: educators default to `COMMUNITY` (immediate visibility, same as before), but can optionally choose to submit for `PENDING` approval which adds the verified badge. Students always default to `COMMUNITY`.

**Final logic for POST:**

```typescript
// Determine approval status
let approvalStatus: 'COMMUNITY' | 'PENDING' | 'APPROVED' = 'COMMUNITY'
if (body.submitForApproval && isPrivileged) {
  approvalStatus = 'PENDING'
}
if (user.role === 'ADMIN' && body.approvalStatus) {
  approvalStatus = body.approvalStatus  // admin can set any status
}
```

Add `approvalStatus` to the `prisma.tool.create` data.

### 4. Add `approvalStatus` filter to GET /api/tools

In the `where` block (already handles `publishedFilter`), add:

```typescript
const approvalFilter = searchParams.get('approvalStatus') || ''
if (approvalFilter) where.approvalStatus = approvalFilter
```

This lets the `/tools` page filter to `COMMUNITY` or `APPROVED` for the two tabs.

### 5. New endpoint: AI Gap Analysis

**New file:** `app/api/courses/[id]/suggest-tools/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      materials: { orderBy: { moduleNumber: 'asc' } },
      linkedTools: { include: { tool: true } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const existingTools = course.linkedTools.map(l => l.tool.name).join(', ') || 'none'
  const modulesSummary = course.materials
    .slice(0, 10)
    .map(m => `Module ${m.moduleNumber ?? '?'}: ${m.title} — ${m.content.slice(0, 200)}`)
    .join('\n')

  const prompt = `You are an educational technology advisor. A course called "${course.title}" (${course.courseCode}) has these materials:

${modulesSummary}

Existing AI tools linked to this course: ${existingTools}

Identify 3 specific gaps where an AI tool would meaningfully improve student learning outcomes. For each gap:
1. Name the gap (2-5 words)
2. Write a 1-sentence recommendation for what to build
3. Suggest a tool type: CHATBOT, QUIZ, AI_INTERVIEW, DEBATE, SIMULATION, or STUDY_BUDDY

Respond as a JSON array:
[
  { "gap": "...", "recommendation": "...", "toolType": "..." },
  ...
]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return NextResponse.json({ suggestions: [] })

  try {
    const suggestions = JSON.parse(jsonMatch[0])
    return NextResponse.json({ suggestions, courseTitle: course.title })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
```

---

## Build Page Rewrite

**File:** `app/build/page.tsx`

### New structure

```
BuildHubPage
├── Header banner (role-aware title + Sand balance card)
├── [STUDENT/EDUCATOR/ADMIN] Context tiles (3 cards: Course / Marketplace / Sandcastle)
├── [When courseId selected] CourseWorkspace inline section
│   ├── AI Gap Analysis panel (fetched from /api/courses/[id]/suggest-tools)
│   └── Quick-build buttons (pre-filled intent → /builder?course=X&intent=Y)
├── [EDUCATOR/ADMIN] Refiner section (existing draft tools)
├── [EDUCATOR/ADMIN] Bounties section (existing open bounties)
├── [ADMIN] Pending Approvals section (tools with approvalStatus=PENDING)
├── Sand activity + How Sand grows (existing, keep for all roles)
└── Datasets section (existing, keep for all roles)
```

### Role-aware header copy

```typescript
const headerConfig = {
  ADMIN: {
    label: 'Build',
    title: 'Create, approve, and curate the platform',
    subtitle: 'Post bounties, review community submissions, and publish tools directly.',
  },
  EDUCATOR: {
    label: 'Build',
    title: 'Create, refine, collaborate, and publish',
    subtitle: 'Build tools for your courses, claim bounties, and contribute to the community.',
  },
  STUDENT: {
    label: 'Build',
    title: 'Build your own learning tools',
    subtitle: 'Create study tools, contribute to the community, and earn Sand for every publish.',
  },
}
```

### Context tiles (all roles)

Replace `BUILD_SURFACES` static array with these three context tiles. State: `selectedContext: 'course' | 'marketplace' | 'sandcastle' | null`.

```typescript
const CONTEXT_TILES = [
  {
    id: 'course',
    title: 'Course Workspace',
    description: 'Build tools directly tied to a course. See what\'s missing and fill the gap.',
    icon: BookOpen,
    accent: 'from-[#0033A0] to-blue-600',
    roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
  },
  {
    id: 'marketplace',
    title: 'Marketplace Tool',
    description: 'Build for the whole community. Educators go live instantly; students join the community library.',
    icon: Sparkles,
    accent: 'from-purple-600 to-fuchsia-600',
    roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
  },
  {
    id: 'sandcastle',
    title: 'Sandcastle Experience',
    description: 'Build a game, simulation, or live experience for the Sandcastle arcade.',
    icon: Gamepad2,
    accent: 'from-amber-500 to-orange-500',
    roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
  },
]
```

Clicking a tile sets `selectedContext`. For `course`, also show a course dropdown (populated from `/api/courses?member=me`).

### CourseWorkspace component (inline, shown when `selectedContext === 'course'` and courseId selected)

```tsx
// State:
const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
const [gapSuggestions, setGapSuggestions] = useState<GapSuggestion[]>([])
const [gapLoading, setGapLoading] = useState(false)

// Fetch gap analysis when courseId changes
useEffect(() => {
  if (!selectedCourseId) return
  setGapLoading(true)
  fetch(`/api/courses/${selectedCourseId}/suggest-tools`, {
    headers: { 'x-demo-user-email': currentUser.email },
  })
    .then(r => r.json())
    .then(data => setGapSuggestions(data.suggestions ?? []))
    .finally(() => setGapLoading(false))
}, [selectedCourseId])

// Render: 3 gap cards, each with:
// - Gap name (bold)
// - Recommendation (1 sentence)
// - Tool type badge
// - "Build this →" button → /builder?course=[courseCode]&intent=[encodeURIComponent(recommendation)]
```

**Gap card JSX:**

```tsx
<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
  <div className="flex items-start justify-between gap-3 mb-2">
    <h4 className="font-bold text-gray-900 text-sm">{suggestion.gap}</h4>
    <span className="text-[10px] font-semibold bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
      {toolTypeLabels[suggestion.toolType] ?? suggestion.toolType}
    </span>
  </div>
  <p className="text-xs text-gray-600 leading-relaxed mb-3">{suggestion.recommendation}</p>
  <Link
    href={`/builder?course=${encodeURIComponent(selectedCourseCode)}&intent=${encodeURIComponent(suggestion.recommendation)}`}
    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline"
  >
    <Sparkles className="w-3.5 h-3.5" />
    Build this →
  </Link>
</div>
```

If `gapLoading`: show 3 skeleton cards with `animate-pulse`.
If `gapSuggestions.length === 0` after load: show empty state with "Analyze" button to retry.

### Admin Approval Queue section (ADMIN only)

Shown below the context tiles, before the Refiner section.

```tsx
// Fetch: /api/tools?approvalStatus=PENDING&limit=10
// State: pendingTools: ToolWithDetails[]

// Render as a table/list:
// - Tool name + creator
// - Category + type badges
// - Submitted date
// - "Approve" button → PATCH /api/tools/[id] { approvalStatus: 'APPROVED' }
// - "Reject" button  → PATCH /api/tools/[id] { approvalStatus: 'REJECTED' }
```

Add PATCH handler to `app/api/tools/[id]/route.ts` (may already exist — check; if so, ensure it handles `approvalStatus` field updates and requires ADMIN role).

### Student-specific framing of Refiner

When `currentUser.role === 'STUDENT'`, the Refiner section title changes:

- Title: "Your drafts" (not "Refiner")
- Description: "Tools you've started building — resume and publish to earn Sand."
- Empty state: "Start in Builder to create your first tool."
- "Continue" link still goes to `/tools/[id]/gamification` or `/publish?edit=[id]`

The API call for drafts (`/api/tools?published=draft&creator=me`) works for students too — no API change needed since we're removing the EDUCATOR-only restriction on tool creation.

---

## Tools Page: Marketplace / Community Tab

**File:** `app/tools/page.tsx`

### Add tab state

```typescript
const [toolsTab, setToolsTab] = useState<'marketplace' | 'community'>('marketplace')
```

### Tab UI

Add tab toggle above the search/filter bar:

```tsx
<div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
  <button
    onClick={() => setToolsTab('marketplace')}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      toolsTab === 'marketplace'
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Marketplace
  </button>
  <button
    onClick={() => setToolsTab('community')}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      toolsTab === 'community'
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Community
    <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
      NEW
    </span>
  </button>
</div>
```

### Tab behavior

- **Marketplace tab:** existing behavior — fetches published tools (no approvalStatus filter needed; community tools are also published)
- **Community tab:** fetches `/api/tools?approvalStatus=COMMUNITY` — shows student-published tools with community badge

In Community tab, add a subtle banner:

```tsx
{toolsTab === 'community' && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 mb-4">
    <strong>Community Library</strong> — tools created by students and educators without formal review.
    Great for finding peer-built study aids, practice sets, and experimental tools.
  </div>
)}
```

---

## ToolCard: Approved Badge

**File:** `app/components/ToolCard.tsx`

### Add `approvalStatus` awareness

The `ToolWithDetails` type should already include `approvalStatus` once the schema is updated and `app/lib/types.ts` is updated. Update `app/lib/types.ts`:

```typescript
// In ToolWithDetails, add:
approvalStatus: 'COMMUNITY' | 'PENDING' | 'APPROVED' | 'REJECTED'
```

### Verified badge on thumbnail

In the thumbnail block, after the "Featured" badge:

```tsx
{tool.approvalStatus === 'APPROVED' && (
  <div className="absolute top-3 left-3 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
    <ShieldCheck className="w-3 h-3" />
    Verified
  </div>
)}
```

Note: `ShieldCheck` is in lucide-react — add to imports.

If `tool.featured` is true, show "Featured" badge instead (Featured takes precedence). The Verified badge shows for APPROVED non-featured tools.

### Community badge on thumbnail

```tsx
{tool.approvalStatus === 'COMMUNITY' && (
  <div className="absolute top-3 left-3 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
    Community
  </div>
)}
```

Only show Community badge on the Community tab (pass a prop `showApprovalBadge?: boolean`).

---

## Builder Page: Pre-fill from Gap Analysis

**File:** `app/builder/page.tsx`

Read the `intent` query param and pre-fill the chat input on mount:

```typescript
const searchParams = useSearchParams()
const intent = searchParams.get('intent') || ''
const courseParam = searchParams.get('course') || ''

useEffect(() => {
  if (intent) {
    // Pre-fill the chat with the gap recommendation
    setInitialMessage(intent)
  }
}, [intent])
```

The `BuilderChat` / `ToolBuilderChat` component should accept an `initialMessage` prop and auto-submit or pre-fill on mount.

Also show a course context banner when `courseParam` is present:

```tsx
{courseParam && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 mb-4 text-sm text-blue-800">
    Building for course: <strong>{courseParam}</strong>
  </div>
)}
```

---

## Publish Page: Allow Student Publishing

**File:** `app/publish/page.tsx`

### Remove educator-only gate (if present in UI)

The page likely shows a 403 or redirect for non-educators. Remove this gate.

### Add publishing destination selector for students

After the form header, when `currentUser.role === 'STUDENT'`, show:

```tsx
<div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
  <Users className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
  <div>
    <div className="text-sm font-semibold text-emerald-900">Publishing to Community Library</div>
    <div className="text-xs text-emerald-700 mt-0.5">
      Your tool will be immediately visible in the Community tab of the marketplace. No review required.
      Earn <strong>+150 Sand</strong> when you publish.
    </div>
  </div>
</div>
```

### Remove Submit for Approval option for students

The "Submit for Approval" checkbox (if it exists) should only show for EDUCATOR and ADMIN roles.

---

## Files Modified

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ApprovalStatus` enum + `approvalStatus` field on Tool |
| `app/api/tools/route.ts` | Allow STUDENT role to create tools; set approvalStatus based on role; add approvalStatus GET filter |
| `app/api/tools/[id]/route.ts` | PATCH handler: allow ADMIN to update approvalStatus |
| `app/api/courses/[id]/suggest-tools/route.ts` | NEW — AI gap analysis endpoint |
| `app/build/page.tsx` | Role-aware rewrite: context tiles, CourseWorkspace with gap analysis, admin approval queue |
| `app/tools/page.tsx` | Add Marketplace/Community tab toggle |
| `app/tools/[id]/page.tsx` | No change needed (tool detail works for all roles) |
| `app/components/ToolCard.tsx` | Add Verified + Community badges based on approvalStatus |
| `app/lib/types.ts` | Add approvalStatus to ToolWithDetails |
| `app/builder/page.tsx` | Read `intent` + `course` query params, pre-fill chat |
| `app/publish/page.tsx` | Remove educator gate; add student community publishing context banner |

---

## Migration & Seeding Notes

After schema change:
```bash
npx prisma migrate dev --name add-approval-status
```

Update seed (`prisma/seed.ts`) to set `approvalStatus` on all existing seeded tools:
- Educator-created tools → `'COMMUNITY'` (or `'APPROVED'` for featured ones to demo the badge)
- Add 1-2 student-created demo tools with `approvalStatus: 'COMMUNITY'` to populate the Community tab

---

## Verification Steps

1. **Build page (student):** Switch to Ian McClure or Tiana → Build page shows "Build your own learning tools" title, three context tiles, no educator-specific sections
2. **Course workspace:** Click "Course Workspace" tile → select a course → gap analysis loads 3 suggestions → click "Build this →" → lands on builder with intent pre-filled
3. **Community tab:** Go to `/tools` → click "Community" tab → see student-published tools with Community badge
4. **Student publishing:** As student, go to `/publish` → see Community Library banner → submit tool → tool appears in Community tab, not Marketplace tab
5. **Approved badge:** As admin, approve a PENDING tool → badge appears on ToolCard in marketplace
6. **Admin approval queue:** Switch to admin → Build page shows pending tools section with Approve/Reject buttons
7. **Sand reward:** After student publishes tool → Sand balance increases by 150 (requires Sand API to handle `TOOL_PUBLISHED` event for student role)
