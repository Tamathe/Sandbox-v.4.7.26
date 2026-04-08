# Build Page — Student Contexts & Two-Tier Publishing Blueprint

**Project:** The Sandbox — AI-powered educational tool marketplace (University of Kentucky)
**Feature:** Build page role-awareness, student publishing, AI gap analysis, Marketplace/Community tab
**Target:** Codex implementation agent
**Date:** 2026-03-15

---

## 1. Overview

The current `/build` page is implicitly educator-focused. This blueprint makes it role-aware and adds:

1. **Three build contexts** — Course, Marketplace, and Sandcastle. Each has a dedicated workspace with relevant framing and tools.
2. **Student publishing** — students can publish tools without restriction. Tools go into a "Community" tier by default; they can optionally request admin approval to appear in the main Marketplace.
3. **AI-generated gap analysis** — on the Course Build workspace, Claude analyzes the course materials and currently linked tools, then suggests what tools are missing.
4. **Marketplace / Community tab split** — the `/tools` page gets a tab toggle at the top: `Marketplace` (approved/featured tools) vs `Community` (all published tools, no approval required).
5. **Approved badge on ToolCard** — tools with `approvalStatus: 'APPROVED'` show a small checkmark badge.

---

## 2. Schema Change — Add `approvalStatus` to Tool

### 2a. Add enum `ApprovalStatus` to `prisma/schema.prisma`

Add this enum after the `ToolType` enum (around line 95):

```prisma
enum ApprovalStatus {
  COMMUNITY
  PENDING
  APPROVED
  REJECTED
}
```

### 2b. Add `approvalStatus` field to `Tool` model

Inside the `Tool` model block, add after the `featured Boolean` line:

```prisma
  approvalStatus ApprovalStatus @default(COMMUNITY)
```

### 2c. Add index

At the bottom of the `Tool` model's `@@index` block, add:

```prisma
  @@index([approvalStatus])
```

### 2d. Run migration

After editing the schema, run:

```bash
npx prisma migrate dev --name add-approval-status
```

---

## 3. API Changes

### 3a. Allow STUDENT role to publish tools — `app/api/tools/route.ts`

**Current behavior:** The POST handler likely restricts tool creation to EDUCATOR/ADMIN roles.

Find the POST handler in `app/api/tools/route.ts`. Remove any role guard that blocks STUDENT. The role check should allow all three roles: EDUCATOR, STUDENT, ADMIN.

If there is a check like:
```typescript
if (user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

Change it to allow STUDENT as well:
```typescript
if (!['EDUCATOR', 'STUDENT', 'ADMIN'].includes(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 3b. Set default `approvalStatus` on tool creation

In the same POST handler, when creating a tool via `prisma.tool.create`, ensure `approvalStatus` is not explicitly set (so it defaults to `COMMUNITY` as defined in the schema). Do not add it manually — rely on the schema default.

### 3c. Add `approvalStatus` filter to GET `/api/tools`

In the GET handler, add support for a new query param `approvalStatus`:

```typescript
const approvalStatusFilter = searchParams.get('approvalStatus') || ''
// ...inside the where block:
if (approvalStatusFilter) where.approvalStatus = approvalStatusFilter
```

Also include `approvalStatus` in the `prisma.tool.findMany` select/return so it's present in the response payload.

### 3d. New endpoint — `GET /api/courses/[id]/suggest-tools`

Create file: `app/api/courses/[id]/suggest-tools/route.ts`

This endpoint:
1. Fetches the course record including all `materials` (title, content, materialType) and `linkedTools` (name, shortDescription, category, toolType).
2. Calls Claude claude-sonnet-4-6 (NOT Haiku) with a structured prompt asking it to do a gap analysis.
3. Returns a JSON array of suggestions.

**Full implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        materials: { select: { title: true, content: true, materialType: true } },
        linkedTools: {
          include: {
            tool: { select: { name: true, shortDescription: true, category: true, toolType: true } },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const materialsText = course.materials
      .map((m) => `- [${m.materialType}] ${m.title}: ${m.content.slice(0, 300)}`)
      .join('\n')

    const toolsText = course.linkedTools.length
      ? course.linkedTools
          .map((lt) => `- ${lt.tool.name} (${lt.tool.toolType}): ${lt.tool.shortDescription}`)
          .join('\n')
      : 'None linked yet.'

    const prompt = `You are an educational tool designer helping a faculty member build AI tools for their course.

Course: "${course.title}" (${course.courseCode})
${course.description ? `Description: ${course.description}` : ''}

Course Materials:
${materialsText || 'No materials uploaded yet.'}

Already Linked Tools:
${toolsText}

Based on the course materials and the gaps in existing tools, suggest 3 high-impact AI tools that would most help students in this course. For each suggestion:
- Give it a specific, descriptive title
- Write a 1-sentence description of what it does
- Pick the best tool type from: CHATBOT, QUIZ, AI_INTERVIEW, DEBATE, STUDY_BUDDY, SIMULATION
- Write a 1-sentence recommendation explaining why this gap matters

Respond ONLY with a JSON array, no markdown fences, in this exact shape:
[
  {
    "title": "...",
    "description": "...",
    "toolType": "CHATBOT",
    "recommendation": "..."
  }
]`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const suggestions = JSON.parse(text)

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[suggest-tools]', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
```

### 3e. Admin approval endpoint — `PATCH /api/admin/tools/[id]/approval`

Create file: `app/api/admin/tools/[id]/approval/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { approvalStatus } = body // 'APPROVED' | 'REJECTED' | 'PENDING'

  if (!['APPROVED', 'REJECTED', 'PENDING', 'COMMUNITY'].includes(approvalStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const tool = await prisma.tool.update({
    where: { id },
    data: { approvalStatus },
  })

  return NextResponse.json({ tool })
}
```

---

## 4. Component — ToolCard Approved Badge

### File: `app/components/ToolCard.tsx`

Add a visual badge for approved tools. Inside the card's thumbnail area (top-right corner, alongside any existing badges), add this conditional snippet:

Find the section that renders the tool type badge and add after it (inside the same thumbnail overlay area):

```tsx
{tool.approvalStatus === 'APPROVED' && (
  <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
    <CheckCircle className="w-3 h-3" />
    Verified
  </div>
)}
```

Add `CheckCircle` to the lucide-react imports at the top of the file.

Also update the `ToolWithDetails` type reference — `approvalStatus` is now a field returned from the API. If `ToolWithDetails` in `app/lib/types.ts` has a `Tool` type inline or imported, add `approvalStatus?: string` to it.

---

## 5. Tools Page — Marketplace / Community Tab Toggle

### File: `app/tools/page.tsx`

**Goal:** Add a tab bar at the top of the results area (below filters) with two tabs:
- `Marketplace` — only shows tools with `approvalStatus: 'APPROVED'` or `featured: true` or the existing `published: true` behavior (educator-published tools that haven't been explicitly community-tiered — keep backward compat by treating `COMMUNITY` status as Community tab)
- `Community` — shows ALL published tools regardless of approvalStatus

**Implementation steps:**

1. Add state:
```typescript
const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('marketplace')
```

2. When fetching tools, pass `approvalStatus` param based on tab:
- `marketplace` tab: fetch with `approvalStatus=APPROVED` (or no filter if you want featured tools to always show — see note below)
- `community` tab: fetch with no `approvalStatus` filter (returns all published)

**Note on backward compat:** The existing seed tools don't have `approvalStatus` set, so they'll default to `COMMUNITY` after migration. To avoid the Marketplace tab being empty after migration, also run a seed update or add a one-time migration script that sets all currently-`published=true` educator-created tools to `approvalStatus: 'APPROVED'`. See Section 7 below.

3. Add the tab UI above the tool grid (below the search/filter bar):

```tsx
<div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
  {(['marketplace', 'community'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
        activeTab === tab
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab === 'marketplace' ? '🏪 Marketplace' : '🌐 Community'}
    </button>
  ))}
</div>
```

4. Re-fetch when `activeTab` changes. Add `activeTab` to the dependency array of the search `useEffect`.

---

## 6. Build Page Rewrite — `app/build/page.tsx`

**Goal:** Make the Build page role-aware with three context tiles at the top and a course build workspace below.

### 6a. Three Context Tiles (replaces current BUILD_SURFACES array)

Replace the `BUILD_SURFACES` static array and its grid section with a role-aware three-tile layout:

```tsx
// Three build contexts — shown to everyone, framing varies by role
const BUILD_CONTEXTS = [
  {
    id: 'course',
    title: 'Course Workspace',
    studentDescription: 'Build tools tied to your active courses. Get AI suggestions on what to create.',
    educatorDescription: 'Build tools for your courses. AI analyzes your materials for gaps.',
    href: null, // scrolls to the course workspace section below
    icon: BookOpen,
    accent: 'from-[#0033A0] to-blue-600',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    studentDescription: 'Publish a tool for everyone. Community tools go live immediately; submit for Verified status.',
    educatorDescription: 'Publish a tool to the marketplace. Submit for admin approval to get the Verified badge.',
    href: '/publish',
    icon: Store,
    accent: 'from-purple-600 to-fuchsia-600',
  },
  {
    id: 'sandcastle',
    title: 'Sandcastle',
    studentDescription: 'Build live experiences — games, simulations, and role-play for the Sandcastle stage.',
    educatorDescription: 'Create Sandcastle experiences — immersive, game-like tools for live sessions.',
    href: '/sandcastle',
    icon: Castle,
    accent: 'from-amber-500 to-orange-500',
  },
]
```

Import icons: `BookOpen, Store, Castle` from lucide-react (Castle may not exist — use `Gamepad2` or `Swords` as fallback for Sandcastle).

Render them as a 3-column grid of cards. The Course tile's `href` is `null` — clicking it should smooth-scroll to the `#course-workspace` section lower on the page:

```tsx
onClick={() => document.getElementById('course-workspace')?.scrollIntoView({ behavior: 'smooth' })}
```

### 6b. Course Build Workspace section

Add a new section below the existing Sand/drafts/bounties sections. It should be a full-width card with `id="course-workspace"`.

**State needed:**
```typescript
const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
const [selectedCourseId, setSelectedCourseId] = useState<string>('')
const [gapSuggestions, setGapSuggestions] = useState<GapSuggestion[]>([])
const [gapLoading, setGapLoading] = useState(false)
```

Where `GapSuggestion` is:
```typescript
type GapSuggestion = {
  title: string
  description: string
  toolType: string
  recommendation: string
}
```

**Fetching courses:**

For EDUCATOR/ADMIN: fetch `/api/courses` to get courses where `instructorId === currentUser.id`.
For STUDENT: fetch `/api/courses` to get all public courses (students are enrolled, not owning). Use the same endpoint — the API already returns public courses.

Add courses to the existing `Promise.all` in the `load()` useEffect:
```typescript
const courseRes = await fetch('/api/courses', {
  headers: { 'x-demo-user-email': currentUser.email },
})
if (courseRes.ok) {
  const courseData = await courseRes.json()
  setCourses((courseData.courses ?? []).slice(0, 10))
}
```

**Gap analysis trigger:**

When user selects a course and clicks "Analyze Gaps":
```typescript
async function analyzeGaps() {
  if (!selectedCourseId) return
  setGapLoading(true)
  setGapSuggestions([])
  try {
    const res = await fetch(`/api/courses/${selectedCourseId}/suggest-tools`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = await res.json()
      setGapSuggestions(data.suggestions ?? [])
    }
  } finally {
    setGapLoading(false)
  }
}
```

**Section JSX:**

```tsx
<section id="course-workspace" className="bg-white rounded-3xl border border-gray-200 p-6">
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900">Course Build Workspace</h2>
      <p className="text-sm text-gray-500">
        Select a course and let AI identify what tools are missing for your students.
      </p>
    </div>
  </div>

  <div className="flex flex-col sm:flex-row gap-3 mb-6">
    <select
      value={selectedCourseId}
      onChange={(e) => { setSelectedCourseId(e.target.value); setGapSuggestions([]) }}
      className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
    >
      <option value="">Select a course...</option>
      {courses.map((c) => (
        <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
      ))}
    </select>
    <button
      onClick={analyzeGaps}
      disabled={!selectedCourseId || gapLoading}
      className="px-6 py-3 rounded-2xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
    >
      {gapLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Analyze Gaps
        </>
      )}
    </button>
  </div>

  {gapLoading && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  )}

  {!gapLoading && gapSuggestions.length > 0 && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {gapSuggestions.map((s, i) => (
        <div key={i} className="rounded-2xl border border-[#0033A0]/20 bg-blue-50/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#0033A0] text-white px-2 py-1 rounded-full">
              {s.toolType.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{s.description}</p>
          <p className="text-xs text-[#0033A0] font-medium italic">"{s.recommendation}"</p>
          <Link
            href={`/publish?prefill=${encodeURIComponent(s.title)}&type=${s.toolType}`}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
          >
            Build this
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ))}
    </div>
  )}

  {!gapLoading && gapSuggestions.length === 0 && selectedCourseId && (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
      <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-700">Click "Analyze Gaps" to get AI suggestions</p>
      <p className="text-xs text-gray-500 mt-1">Claude will review your course materials and currently linked tools.</p>
    </div>
  )}
</section>
```

### 6c. Role-aware hero heading

Change the hero `<h1>` and `<p>` text to be role-aware:

```tsx
<h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
  {currentUser.role === 'STUDENT'
    ? 'Build something for your education'
    : 'Create, refine, collaborate, and publish from one workspace'}
</h1>
<p className="text-blue-100 text-base sm:text-lg leading-relaxed">
  {currentUser.role === 'STUDENT'
    ? 'Build AI tools for your courses, publish to the community, or create experiences for Sandcastle. Everything you make earns Sand.'
    : 'The build flow is organized around four stages: prototype quickly, improve drafts, get community help, and publish when the tool is ready.'}
</p>
```

---

## 7. Seed Update — Mark Existing Tools as APPROVED

After running the migration, existing seed tools will have `approvalStatus: 'COMMUNITY'` (the new default). To avoid the Marketplace tab being empty in development, update `prisma/seed.ts`:

Find where tools are created in the seed file. For each tool created by an EDUCATOR or ADMIN, add `approvalStatus: 'APPROVED'` to the `prisma.tool.create` data block:

```typescript
approvalStatus: 'APPROVED',
```

Do this for all tools in the seed that represent quality/vetted content (all of the existing 12 seeded tools). Student-created tools should keep the default `COMMUNITY`.

After updating seed.ts, reseed: `npm run db:seed` (or `npx ts-node --project tsconfig.seed.json prisma/seed.ts`).

---

## 8. Admin Approval Queue — `app/admin/page.tsx`

Add a new "Pending Approval" section to the admin dashboard.

**Fetch pending tools:**
```typescript
const pendingRes = await fetch('/api/tools?approvalStatus=PENDING&published=all', {
  headers: { 'x-demo-user-email': currentUser.email },
})
```

**Render each pending tool with Approve / Reject buttons:**

```tsx
<section className="bg-white rounded-3xl border border-gray-200 p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-5">Pending Approval</h2>
  {pendingTools.length === 0 ? (
    <p className="text-sm text-gray-500">No tools awaiting approval.</p>
  ) : (
    <div className="space-y-3">
      {pendingTools.map((tool) => (
        <div key={tool.id} className="rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">{tool.name}</h3>
            <p className="text-sm text-gray-500">{tool.shortDescription}</p>
            <p className="text-xs text-gray-400 mt-1">By {tool.creator?.name} · {tool.category}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleApproval(tool.id, 'APPROVED')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleApproval(tool.id, 'REJECTED')}
              className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
```

**`handleApproval` function:**

```typescript
async function handleApproval(toolId: string, status: 'APPROVED' | 'REJECTED') {
  await fetch(`/api/admin/tools/${toolId}/approval`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': currentUser.email,
    },
    body: JSON.stringify({ approvalStatus: status }),
  })
  // Refresh pending list
  setPendingTools((prev) => prev.filter((t) => t.id !== toolId))
}
```

---

## 9. Publish Page — "Request Verification" Option

### File: `app/publish/page.tsx`

After the main publish form, add a checkbox (only shown after a tool is published):

> ☐ Request Verified status — an admin will review this tool. Verified tools appear in the main Marketplace tab.

When checked, call `PATCH /api/admin/tools/[id]/approval` with `approvalStatus: 'PENDING'` immediately after the tool is created/updated.

If the publish page uses a different API flow (the AI builder), add the same checkbox to the final confirmation step.

---

## 10. Implementation Order

1. Schema + migration (Section 2) — do this first, everything depends on it
2. Seed update (Section 7) — immediately after migration, so dev data is correct
3. API changes (Section 3a–3c) — enable student publishing + filter support
4. Gap analysis endpoint (Section 3d) — standalone, test independently
5. Admin approval endpoint (Section 3e)
6. ToolCard badge (Section 4) — small isolated change
7. Tools page tab toggle (Section 5) — depends on API filter working
8. Build page rewrite (Section 6) — largest change, do last
9. Admin queue section (Section 8)
10. Publish page verification checkbox (Section 9)

---

## 11. Types Update — `app/lib/types.ts`

Add `approvalStatus` to `ToolWithDetails`:

Find the `ToolWithDetails` interface (or type) and add:

```typescript
approvalStatus: string
```

This ensures the field flows from API response → ToolCard without TypeScript errors.
