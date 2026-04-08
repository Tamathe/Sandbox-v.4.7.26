# Blueprint: Faculty Course Command Center
### Feature: Redesign `/courses` as a faculty-first course management hub
### Target file: `the-sandbox/app/courses/page.tsx` (create if missing)
### Status: Ready for implementation

---

## 1. Context & Goal

The current courses page is a passive file manager — faculty upload materials into module folders and that's it. The goal of this redesign is to turn `/courses` into a **faculty command center**: a single place where an instructor uploads content, activates it as AI-powered learning experiences, monitors student engagement, and tunes their course mid-semester.

**The workflow this enables:**
1. Faculty uploads a syllabus or lecture notes
2. Sandy immediately knows that content and can answer student questions
3. The system suggests AI tools it could build from the uploaded materials
4. Faculty clicks "Build" → tool exists and is linked to the course
5. Faculty sees which modules students are engaging with (and which they're ignoring)

**This page serves two audiences with the same route:**
- **Educators/Admins**: Full CRUD on courses + materials, tool generation, analytics pulse
- **Students**: Read-only view — see their enrolled courses, organized materials, and linked tools

---

## 2. Schema Changes Required

### 2a. Add `CourseToolLink` join table (new)

This table creates a many-to-many relationship between courses and tools. Currently tools and courses are completely disconnected.

**Add to `prisma/schema.prisma` after the `CourseMaterial` model:**

```prisma
model CourseToolLink {
  id        String   @id @default(cuid())
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  toolId    String
  tool      Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([courseId, toolId])
  @@index([courseId])
  @@index([toolId])
}
```

**Update `Course` model — add relation:**
```prisma
model Course {
  // ... existing fields ...
  linkedTools  CourseToolLink[]   // ADD THIS LINE
}
```

**Update `Tool` model — add relation:**
```prisma
model Tool {
  // ... existing fields ...
  courseLinks  CourseToolLink[]   // ADD THIS LINE
}
```

### 2b. Add `isVisible` to `CourseMaterial` (new field)

Allows faculty to hide materials from students (e.g., draft content, answer keys).

**Update `CourseMaterial` model — add one field:**
```prisma
model CourseMaterial {
  id           String   @id @default(cuid())
  courseId     String
  course       Course   @relation(fields: [courseId], references: [id])
  title        String
  content      String
  materialType String   @default("lecture")
  moduleNumber Int?
  isVisible    Boolean  @default(true)   // ADD THIS LINE
  createdAt    DateTime @default(now())
}
```

### 2c. Run migration

After schema changes:
```bash
npx prisma migrate dev --name add-course-tool-links-and-material-visibility
```

---

## 3. New API Routes

### 3a. Course-Tool linking — `app/api/courses/[id]/tools/route.ts`

Create this new file. It manages which tools are linked to a course.

```typescript
// GET /api/courses/[id]/tools — return tools linked to this course
// POST /api/courses/[id]/tools — link a tool to this course (body: { toolId })
// DELETE /api/courses/[id]/tools?toolId=xxx — unlink a tool

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const links = await prisma.courseToolLink.findMany({
    where: { courseId: id },
    include: {
      tool: {
        select: {
          id: true, name: true, shortDescription: true,
          category: true, toolType: true, thumbnailUrl: true,
          _count: { select: { sessions: true } },
        },
      },
    },
  })
  return NextResponse.json(links.map(l => l.tool))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { toolId } = await req.json()
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 })

  try {
    await prisma.courseToolLink.create({ data: { courseId: id, toolId } })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Already linked' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const toolId = req.nextUrl.searchParams.get('toolId')
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 })

  await prisma.courseToolLink.deleteMany({ where: { courseId: id, toolId } })
  return NextResponse.json({ ok: true })
}
```

### 3b. AI tool suggestion — `app/api/courses/[id]/suggest-tools/route.ts`

This calls Claude to analyze module materials and suggest AI tool ideas.

```typescript
// POST /api/courses/[id]/suggest-tools
// Body: { moduleNumber?: number } — if omitted, analyze whole course
// Returns: { suggestions: [{ title, description, toolType, rationale }] }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { moduleNumber } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      materials: {
        where: moduleNumber ? { moduleNumber } : {},
        orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (course.materials.length === 0) {
    return NextResponse.json({ error: 'No materials found for this module' }, { status: 400 })
  }

  const materialsText = course.materials
    .map(m => `[${m.title}]\n${m.content.slice(0, 800)}`)
    .join('\n\n---\n\n')

  const prompt = `You are an educational AI tool designer. Based on the following course materials from "${course.courseCode}: ${course.title}"${moduleNumber ? ` (Module ${moduleNumber})` : ''}, suggest exactly 3 AI learning tools that would help students engage with and master this content.

COURSE MATERIALS:
${materialsText}

For each suggestion, provide:
- title: A short, specific tool name (e.g. "Offer & Acceptance Scenario Coach")
- description: One sentence explaining what the tool does and how students use it
- toolType: One of CHATBOT, SIMULATION, QUIZ, DEBATE, AI_INTERVIEW, STUDY_BUDDY
- rationale: One sentence explaining why this tool addresses a key learning challenge in the material

Respond with ONLY valid JSON in this exact format:
{
  "suggestions": [
    { "title": "...", "description": "...", "toolType": "...", "rationale": "..." },
    { "title": "...", "description": "...", "toolType": "...", "rationale": "..." },
    { "title": "...", "description": "...", "toolType": "...", "rationale": "..." }
  ]
}`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 })
  }
}
```

### 3c. Update existing material visibility — `app/api/courses/[id]/materials/route.ts`

**Update the existing DELETE handler** to also support PATCH for toggling visibility. Add this method to the existing file:

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { materialId, isVisible } = await req.json()
  if (!materialId || isVisible === undefined) {
    return NextResponse.json({ error: 'materialId and isVisible required' }, { status: 400 })
  }

  const updated = await prisma.courseMaterial.update({
    where: { id: materialId },
    data: { isVisible },
  })
  return NextResponse.json(updated)
}
```

---

## 4. Page Layout & Component Architecture

### 4a. Overall page structure

The page is a **two-column layout** at all screen sizes ≥ lg:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: [Course selector dropdown]  [+ New Course button]   │
│         (educator only)                                     │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  COURSE      │  MAIN PANEL                                  │
│  SIDEBAR     │  (tabs: Materials | Tools | Pulse | Settings)│
│  (240px)     │                                              │
│              │  [Tab content]                               │
│  - course    │                                              │
│    list      │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Grid:** `grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0`

The global `ConciergePanel` sidebar (Sandy) is already present via the layout — do NOT add a separate Sandy here.

---

### 4b. Component breakdown

Create the page at `app/courses/page.tsx`. All sub-components can be defined in the same file (no need for separate files unless they exceed ~100 lines).

**Top-level state in `CoursesPage`:**
```typescript
const [courses, setCourses] = useState<Course[]>([])
const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
const [materials, setMaterials] = useState<CourseMaterial[]>([])
const [linkedTools, setLinkedTools] = useState<Tool[]>([])
const [activeTab, setActiveTab] = useState<'materials' | 'tools' | 'pulse' | 'settings'>('materials')
const [loading, setLoading] = useState(true)
```

**Type definitions at top of file:**
```typescript
type Course = {
  id: string
  courseCode: string
  title: string
  description: string | null
  isPublic: boolean
  instructor: { name: string; email: string }
  _count: { materials: number }
}

type CourseMaterial = {
  id: string
  title: string
  content: string
  materialType: string
  moduleNumber: number | null
  isVisible: boolean
  createdAt: string
}

type Tool = {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
  thumbnailUrl: string | null
  _count: { sessions: number }
}

type ToolSuggestion = {
  title: string
  description: string
  toolType: string
  rationale: string
}
```

---

### 4c. Left sidebar — Course list

**Component: `CourseSidebar`**

Props: `{ courses, selectedCourseId, onSelect, isEducator, onNewCourse }`

Render:
```
┌──────────────────────────┐
│ My Courses (if educator) │
│ ─────────────────────── │
│ ● TEK-100                │  ← selected state: bg-blue-50 border-l-2 border-[#0033A0]
│   Technology & Society   │
│   3 materials            │
│                          │
│ ○ LAWG 101               │  ← unselected: hover:bg-gray-50
│   Contracts              │
│   8 materials            │
│                          │
│ ─────────────────────── │
│ [+ New Course]           │  ← educator only, opens inline form
└──────────────────────────┘
```

**Inline "New Course" form** (appears below the list when `showNewCourseForm` is true):
```
Course Code: [___________]
Title:       [___________]
Description: [___________]
[ ] Public course
[Cancel]  [Create Course →]
```

POST to `/api/courses` with `{ courseCode, title, description, isPublic }` and `x-demo-user-email` header.

---

### 4d. Main panel — Tab navigation

Below the course title/header, render 4 tabs:

```
[Materials]  [Tools]  [Pulse]  [Settings]
```

- Students only see: **Materials** and **Tools** (hide Pulse and Settings)
- Active tab: `border-b-2 border-[#0033A0] text-[#0033A0] font-semibold`
- Inactive: `text-gray-500 hover:text-gray-700`

---

### 4e. Tab 1: Materials

This is the core content management tab. Materials are grouped by module.

**Grouping logic:**
```typescript
const grouped = materials.reduce<Record<string, CourseMaterial[]>>((acc, m) => {
  const key = m.moduleNumber ? `Module ${m.moduleNumber}` : 'General'
  if (!acc[key]) acc[key] = []
  acc[key].push(m)
  return acc
}, {})
// Sort keys: General first, then Module 1, Module 2, etc.
const sortedKeys = Object.keys(grouped).sort((a, b) => {
  if (a === 'General') return -1
  if (b === 'General') return 1
  return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1])
})
```

**Per-module section:**
```
┌─────────────────────────────────────────────────────────┐
│ Module 3  (4 materials)          [✦ Suggest Tools]       │
│─────────────────────────────────────────────────────────│
│ 📄 Personal Jurisdiction         lecture  [👁 Hide] [🗑]  │
│ 📄 Pennoyer v. Neff Summary      reading  [👁 Hide] [🗑]  │
│ 📄 Minimum Contacts Analysis     case     [👁 Hide] [🗑]  │
└─────────────────────────────────────────────────────────┘
```

**Material type badge colors:**
```typescript
const TYPE_COLORS: Record<string, string> = {
  lecture:  'bg-blue-100 text-blue-700',
  reading:  'bg-purple-100 text-purple-700',
  case:     'bg-amber-100 text-amber-700',
  rubric:   'bg-red-100 text-red-700',
  syllabus: 'bg-green-100 text-green-700',
  quiz:     'bg-indigo-100 text-indigo-700',
}
// Default: 'bg-gray-100 text-gray-600'
```

**"✦ Suggest Tools" button** (educator-only, per module):
- Shows next to the module header
- On click: calls `POST /api/courses/[id]/suggest-tools` with `{ moduleNumber: X }`
- While loading: show spinner and "Analyzing module..." text in place of button
- On success: show `ToolSuggestionsPanel` (see 4g below)

**"Add Material" form** (educator-only, appears at bottom of each module section):
- Toggle open with "[+ Add to Module X]" button
- Fields:
  - Title: text input (required)
  - Content: `<textarea>` rows=8 (required) — plain text, markdown supported
  - Type: `<select>` options: lecture, reading, case, rubric, syllabus, quiz
  - Module #: number input, min=1, max=99, pre-filled with current module number
  - Visible to students: checkbox, default checked
- Submit: POST to `/api/courses/[id]/materials`
- On success: refetch materials, collapse form

**Visibility toggle** (educator-only, per material):
- Eye icon button: `👁` (visible) or `👁‍🗨` (hidden)
- On click: PATCH to `/api/courses/[id]/materials` with `{ materialId, isVisible: !current }`
- Hidden materials: show with `opacity-50 italic` to indicate student can't see them
- Tooltip on icon: "Visible to students" / "Hidden from students"

**Delete button** (educator-only, per material):
- Trash icon, `text-gray-300 hover:text-red-500`
- On click: confirm with `window.confirm('Delete "[title]"?')` then DELETE to API

**Student view of Materials tab:**
- Same module grouping
- Only shows materials where `isVisible === true`
- No add/delete/hide controls
- Each material is expandable — click to read the content inline (use a collapsible `<details>` or state toggle)
- Content rendered with `react-markdown`

---

### 4f. Tab 2: Tools

Shows tools linked to this course, plus the ability to link/unlink from the published tool catalog.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Tools for TEK-100                    [+ Link a Tool]     │
│─────────────────────────────────────────────────────────│
│ [Card] Cross-Examination Simulator                       │
│        Law · CHATBOT · 47 sessions                       │
│        [Launch]   [Unlink]                               │
│                                                          │
│ [Card] Evidence Rules Simulator                          │
│        Law · CHATBOT · 31 sessions                       │
│        [Launch]   [Unlink]                               │
└─────────────────────────────────────────────────────────┘
```

**Empty state** (educator):
```
No tools linked to TEK-100 yet.
[ ✦ Build with AI ]   [ Use form ]
```

**Empty state** (student):
```
No tools linked to this course yet.
Ask your instructor to add AI tools for practice.
```

**"[+ Link a Tool]" button** (educator-only):
- Opens a small modal/dropdown showing all published tools (GET `/api/tools?published=true`)
- Search input to filter by name
- Each tool shows name + category + type
- Clicking links it: POST `/api/courses/[id]/tools` with `{ toolId }`
- Already-linked tools are disabled/greyed in the list

**Tool card in this tab:**
```typescript
// Compact card, not full ToolCard component
// Shows: name, shortDescription (truncated), category badge, toolType badge, session count
// Buttons: "Launch" (links to /tools/[id]), "Unlink" (educator only)
```

**"Build with AI" button** → links to `/builder?course=COURSE_CODE`
**"Use form"** → links to `/publish?course=COURSE_CODE`

---

### 4g. Tool Suggestions Panel

This component renders below a module section when suggestions have been fetched.

```
┌─────────────────────────────────────────────────────────┐
│ ✦ AI-generated tool ideas for Module 3                  │
│─────────────────────────────────────────────────────────│
│ 1. Jurisdiction Analysis Coach                CHATBOT   │
│    Practice applying minimum contacts test              │
│    to novel fact patterns.                              │
│    Why: Students confuse general vs. specific           │
│    jurisdiction regularly.                              │
│    [Build this tool →]  [Dismiss]                       │
│                                                         │
│ 2. Pennoyer v. Neff Case Simulator            DEBATE    │
│    ...                                                  │
│    [Build this tool →]  [Dismiss]                       │
│                                                         │
│ 3. Personal Jurisdiction Quiz                 QUIZ      │
│    ...                                                  │
│    [Build this tool →]  [Dismiss]                       │
└─────────────────────────────────────────────────────────┘
```

**"Build this tool →"** links to:
```
/builder?course=TEK-100&toolName=Jurisdiction+Analysis+Coach&toolType=CHATBOT&moduleNumber=3
```

This pre-populates the builder's initial message. (The builder page already accepts query params — if it doesn't, just link to `/builder` for now.)

**State:** Store suggestions per module in a `Record<string, ToolSuggestion[] | null>` keyed by module key. `null` = loading, `[]` = dismissed/empty.

---

### 4h. Tab 3: Pulse (educator-only)

A simple analytics view showing student engagement with this course's content.

**Important:** This is SIMULATED data for the MVP. Do not build real analytics queries. Use hardcoded demo data keyed by courseCode.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Module Engagement                                        │
│─────────────────────────────────────────────────────────│
│ Module 1  ████████████████░░░░  72%  (12 students)       │
│ Module 2  ████████████░░░░░░░░  58%  (9 students)        │
│ Module 3  ████████░░░░░░░░░░░░  41%  (7 students)   ⚠   │
│ Module 4  ████░░░░░░░░░░░░░░░░  22%  (3 students)   ⚠   │
│─────────────────────────────────────────────────────────│
│ Common Questions this Week                              │
│ • "What is the minimum contacts test?" (8 students)     │
│ • "How does Pennoyer differ from McGee?" (5 students)   │
│ • "When does general jurisdiction apply?" (4 students)  │
│─────────────────────────────────────────────────────────│
│ ⚠ Attention: Modules 3 and 4 show low engagement.       │
│   Consider adding more practice tools or clarifying     │
│   materials for these sections.                         │
└─────────────────────────────────────────────────────────┘
```

**Simulated data** for TEK-100:
```typescript
const PULSE_DATA: Record<string, {
  modules: { label: string; pct: number; students: number; warn: boolean }[]
  commonQuestions: { question: string; count: number }[]
}> = {
  'TEK-100': {
    modules: [
      { label: 'Module 1', pct: 72, students: 12, warn: false },
      { label: 'Module 2', pct: 58, students: 9, warn: false },
      { label: 'Module 3', pct: 41, students: 7, warn: true },
      { label: 'Module 4', pct: 22, students: 3, warn: true },
    ],
    commonQuestions: [
      { question: 'What is the minimum contacts test?', count: 8 },
      { question: 'How does Pennoyer differ from McGee?', count: 5 },
      { question: 'When does general jurisdiction apply?', count: 4 },
    ],
  },
}
```

Show a note: _"Engagement data is simulated for demo purposes. Live analytics require real session tracking."_

---

### 4i. Tab 4: Settings (educator-only)

Inline editable form for course metadata.

```
Course Code: TEK-100         [non-editable, grayed out]
Title:       [Technology & Society________________]
Description: [______________________________________]
Visibility:  ● Public (all students can enroll)
             ○ Private (invite only)

[Save Changes]
```

PATCH request to... (this endpoint doesn't exist yet, add it):

**Add PATCH to `app/api/courses/route.ts`** — or create `app/api/courses/[id]/route.ts`:

```typescript
// PATCH /api/courses/[id] — update course metadata
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.instructorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, isPublic } = await req.json()
  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(isPublic !== undefined && { isPublic }),
    },
  })
  return NextResponse.json(updated)
}
```

---

## 5. Data Fetching Logic

### On page load:
```typescript
useEffect(() => {
  fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
    .then(r => r.json())
    .then(data => {
      setCourses(data)
      setLoading(false)
      // Auto-select first course
      if (data.length > 0) setSelectedCourseId(data[0].id)
    })
}, [currentUser.email])
```

### When `selectedCourseId` changes:
```typescript
useEffect(() => {
  if (!selectedCourseId) return
  Promise.all([
    fetch(`/api/courses/${selectedCourseId}/materials`, {
      headers: { 'x-demo-user-email': currentUser.email }
    }).then(r => r.json()),
    fetch(`/api/courses/${selectedCourseId}/tools`, {
      headers: { 'x-demo-user-email': currentUser.email }
    }).then(r => r.json()),
  ]).then(([mats, tools]) => {
    setMaterials(mats)
    setLinkedTools(tools)
  })
}, [selectedCourseId, currentUser.email])
```

---

## 6. Visual Design Spec

### Colors & tokens
- Primary action: `bg-[#0033A0] text-white hover:bg-[#002580]`
- Secondary action: `border border-gray-300 text-gray-600 hover:bg-gray-50`
- Danger: `text-gray-300 hover:text-red-500` (delete icons)
- Active tab: `border-b-2 border-[#0033A0] text-[#0033A0] font-semibold text-sm`
- Inactive tab: `text-gray-500 hover:text-gray-700 text-sm`
- Module header: `bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`
- Material row: `bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3`
- AI suggestion panel: `bg-blue-50 border border-blue-200 rounded-xl p-4`

### Sidebar
- Width: 240px fixed at lg+
- Selected course: `bg-blue-50 border-l-2 border-[#0033A0] text-[#0033A0]`
- Unselected: `hover:bg-gray-50 text-gray-700`
- Course code: `text-xs font-bold`
- Course title: `text-sm text-gray-600 truncate`
- Material count: `text-[10px] text-gray-400`

### Empty states
All empty states follow this pattern:
```tsx
<div className="py-12 text-center">
  <IconComponent className="w-10 h-10 mx-auto text-gray-200 mb-3" />
  <h3 className="text-sm font-semibold text-gray-600 mb-1">Heading</h3>
  <p className="text-xs text-gray-400 mb-4">Explanation</p>
  {isEducator && <CTAButton />}
</div>
```

---

## 7. Role-Based Visibility Summary

| UI Element | Student | Educator | Admin |
|---|---|---|---|
| Course sidebar — all public courses | ✓ | ✓ | ✓ |
| "+ New Course" button | ✗ | ✓ | ✓ |
| Materials tab | ✓ | ✓ | ✓ |
| Add Material form | ✗ | ✓ (own courses) | ✓ |
| Hide/Delete material buttons | ✗ | ✓ (own courses) | ✓ |
| Expand and read material content | ✓ (visible only) | ✓ (all) | ✓ |
| "✦ Suggest Tools" button | ✗ | ✓ | ✓ |
| Tools tab — view linked tools | ✓ | ✓ | ✓ |
| Link/Unlink tools | ✗ | ✓ (own courses) | ✓ |
| "Build with AI" / "Use form" CTAs | ✗ | ✓ | ✓ |
| Pulse tab | ✗ | ✓ | ✓ |
| Settings tab | ✗ | ✓ (own courses) | ✓ |

---

## 8. Imports Required

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
  BookOpen, Plus, Trash2, Eye, EyeOff, Sparkles, ChevronDown,
  ChevronRight, FileText, Settings, BarChart3, Compass, AlertTriangle,
  GraduationCap, Loader2, CheckCircle, X
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
```

Note: `react-markdown` is already in package.json (used elsewhere in the project). No new dependencies needed.

---

## 9. Files to Create / Modify

| Action | File |
|---|---|
| **CREATE** | `app/courses/page.tsx` |
| **CREATE** | `app/api/courses/[id]/tools/route.ts` |
| **CREATE** | `app/api/courses/[id]/suggest-tools/route.ts` |
| **CREATE** | `app/api/courses/[id]/route.ts` (PATCH for settings) |
| **MODIFY** | `app/api/courses/[id]/materials/route.ts` (add PATCH handler) |
| **MODIFY** | `prisma/schema.prisma` (add CourseToolLink model, isVisible field) |
| **RUN** | `npx prisma migrate dev --name add-course-tool-links-and-material-visibility` |

---

## 10. Verification Checklist

After implementation, verify each of these manually:

**As Heath Price (EDUCATOR):**
- [ ] `/courses` loads, shows TEK-100 in sidebar, auto-selects it
- [ ] Materials tab shows existing TEK-100 materials grouped by module
- [ ] "+ Add to Module 1" button appears, form opens, fills correctly, material appears after submit
- [ ] Hide button toggles `isVisible`, material goes semi-transparent
- [ ] Delete button asks for confirmation, removes material on confirm
- [ ] "✦ Suggest Tools" button on a module with materials → spinner → 3 suggestion cards appear
- [ ] "Build this tool →" links to `/builder?course=TEK-100&toolName=...`
- [ ] Tools tab shows linked tools with session counts
- [ ] "+ Link a Tool" opens modal with searchable tool list, linking works
- [ ] "Unlink" removes tool from course tools list
- [ ] Pulse tab shows module engagement bars and common questions
- [ ] Settings tab lets you edit title/description/visibility and save
- [ ] "+ New Course" form creates a course and adds it to the sidebar

**As Ian McClure (STUDENT):**
- [ ] `/courses` shows public courses in sidebar
- [ ] Materials tab: only visible materials shown, no add/delete/hide buttons
- [ ] Material content expandable inline with markdown rendering
- [ ] Tools tab: shows linked tools, "Launch" works, no link/unlink controls
- [ ] Pulse and Settings tabs are NOT visible
- [ ] No "✦ Suggest Tools" button visible

**Sandy concierge (ConciergePanel):**
- [ ] On `/courses`, Sandy greets as course concierge (not general platform concierge)
- [ ] Sandy can answer questions about the selected course's materials
- [ ] Starter prompts are course-content focused
