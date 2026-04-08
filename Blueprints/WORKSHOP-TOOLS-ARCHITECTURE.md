# Workshop Tools — Technical Architecture

> **Status:** Phase 2 — Architecture
> **Goal:** Build 4 new tools to rough-draft state for demo. All remain in Workshop tab with "In Development" badges.
> **Pattern:** Follows Research Hub architecture (tool registry → hub page → [slug] chat page → streaming API)

---

## Table of Contents

1. [Shared Architecture](#1-shared-architecture)
2. [Tool 1: Grant Finder](#2-tool-1-grant-finder)
3. [Tool 2: Faculty Command Center](#3-tool-2-faculty-command-center)
4. [Tool 3: Space Utilization Optimizer](#4-tool-3-space-utilization-optimizer)
5. [Tool 4: Grant Writing Assistant](#5-tool-4-grant-writing-assistant)
6. [Data Model Changes](#6-data-model-changes)
7. [File Inventory](#7-file-inventory)
8. [Execution Phases](#8-execution-phases)

---

## 1. Shared Architecture

### Pattern (from Research Hub)

All 4 tools follow the same blueprint:

```
1. Tool Config     → app/lib/workshop/[tool-name].ts
2. Page Route      → app/workshop/[slug]/page.tsx (shared dynamic route)
3. API Route       → app/api/workshop/route.ts (shared streaming endpoint)
4. Upload Route    → app/api/workshop/upload/route.ts (shared, tools 1 & 4)
```

### Shared Tool Registry

**File:** `app/lib/workshop/index.ts`

```typescript
export interface WorkshopTool {
  slug: string
  title: string
  tagline: string
  description: string
  emoji: string
  icon: string                    // lucide icon name for dynamic import
  color: string                   // Tailwind text color
  bg: string                      // Tailwind bg color
  border: string                  // Tailwind border
  headerGradient: string          // CSS gradient for chat header
  systemPrompt: string            // Claude system prompt
  welcomeMessage: string          // First message shown
  starterQuestions: string[]      // 4-5 starter chips
  features: string[]              // Feature list for landing page
  model: 'haiku' | 'sonnet'      // AI model to use
  supportsUpload?: boolean        // Show file upload UI
  uploadAcceptTypes?: string[]    // e.g., ['application/pdf', 'text/plain']
  uploadMaxSizeMB?: number        // Default 10
  status: 'live' | 'in-development'
}

export { GRANT_FINDER } from './grant-finder'
export { FACULTY_COMMAND_CENTER } from './faculty-command-center'
export { SPACE_OPTIMIZER } from './space-optimizer'
export { GRANT_WRITER } from './grant-writer'

export const WORKSHOP_TOOLS: WorkshopTool[] = [
  GRANT_FINDER,
  FACULTY_COMMAND_CENTER,
  SPACE_OPTIMIZER,
  GRANT_WRITER,
]

export function getWorkshopTool(slug: string): WorkshopTool | undefined {
  return WORKSHOP_TOOLS.find(t => t.slug === slug)
}
```

### Shared Workshop Page (`app/workshop/[slug]/page.tsx`)

Follows Research Hub `[slug]/page.tsx` exactly:
- Full-height chat layout: `h-[calc(100vh-64px)]`
- Header with gradient, emoji, title
- Message list with ReactMarkdown for assistant
- Starter question chips
- Textarea + send button + optional mic
- File upload button (if `tool.supportsUpload`)
- Privacy disclaimer footer

**Key enhancement over Research Hub:** If `tool.supportsUpload`, render a file upload zone above the input:

```tsx
{tool.supportsUpload && (
  <div className="border-t border-gray-100 px-4 py-2">
    {uploadedFile ? (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <FileText className="size-4" />
        <span className="truncate">{uploadedFile.name}</span>
        <span className="text-xs text-gray-400">({uploadedFile.pageCount} pages)</span>
        <button onClick={() => setUploadedFile(null)} className="text-red-400 hover:text-red-600">
          <X className="size-3" />
        </button>
      </div>
    ) : (
      <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0033A0] cursor-pointer">
        <Paperclip className="size-4" />
        Attach a document (PDF, TXT, DOCX)
        <input type="file" className="hidden"
          accept={tool.uploadAcceptTypes?.join(',') || '.pdf,.txt'}
          onChange={handleFileUpload}
        />
      </label>
    )}
  </div>
)}
```

### Shared API Route (`app/api/workshop/route.ts`)

```typescript
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { getWorkshopTool } from '../../lib/workshop'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const WorkshopSchema = z.object({
  slug: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  uploadedContent: z.string().optional(), // Extracted text from uploaded file
})

export async function POST(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const body = await req.json()
  const parsed = WorkshopSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { slug, messages, uploadedContent } = parsed.data
  const tool = getWorkshopTool(slug)
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 })

  // Build system prompt with optional uploaded content
  let systemPrompt = tool.systemPrompt
  if (uploadedContent) {
    systemPrompt += `\n\n---\nUPLOADED DOCUMENT CONTENT:\n${uploadedContent.slice(0, 50000)}\n---`
  }

  // Enrich with user memory (same pattern as Research Hub)
  const memories = await prisma.userMemory.findMany({
    where: { userId: auth.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })
  if (memories.length > 0) {
    const memoryBlock = memories.map(m => `- ${m.key}: ${m.value}`).join('\n')
    systemPrompt += `\n\n---\nABOUT THIS USER:\n${memoryBlock}\n---`
  }

  // Stream response
  const client = new Anthropic()
  const modelId = tool.model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  const stream = client.messages.stream({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  }, { signal: AbortSignal.timeout(120_000) })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error && err.message.includes('rate_limit')
          ? 'Rate limited — please wait a moment and try again.'
          : 'An error occurred. Please try again.'
        try { controller.enqueue(encoder.encode(`\n\n_${msg}_`)) } catch {}
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
```

### Shared Upload Route (`app/api/workshop/upload/route.ts`)

```typescript
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let extractedText = ''
  let pageCount = 0

  if (file.type === 'application/pdf') {
    const { extractPdfText } = await import('../../../lib/pdf-extract')
    const result = await extractPdfText(buffer)
    extractedText = result.text || ''
    pageCount = result.pageCount || 0
  } else {
    extractedText = buffer.toString('utf-8')
  }

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length

  return NextResponse.json({
    filename: file.name,
    fileType: file.type,
    wordCount,
    pageCount,
    extractedText, // Client stores this and sends with chat messages
  })
}
```

---

## 2. Tool 1: Grant Finder

### Purpose
Faculty describes their research. AI semantically matches against grant databases, scores fit, provides logistics.

### File: `app/lib/workshop/grant-finder.ts`

```typescript
export const GRANT_FINDER: WorkshopTool = {
  slug: 'grant-finder',
  title: 'Grant Finder',
  tagline: 'Find grants that match your research',
  description: 'Describe your research focus and criteria. AI searches grant databases, scores relevance, and provides deadline and logistics support.',
  emoji: '🎯',
  icon: 'Target',
  color: 'text-emerald-700',
  bg: 'bg-emerald-50',
  border: 'border-emerald-200 hover:border-emerald-400',
  headerGradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
  model: 'sonnet',
  supportsUpload: true,
  uploadAcceptTypes: ['application/pdf', 'text/plain'],
  uploadMaxSizeMB: 10,
  status: 'in-development',
  welcomeMessage: `Welcome to Grant Finder! I'll help you discover funding opportunities that match your research.

You can:
- **Describe your research** and I'll find matching grants
- **Upload your CV or research statement** (PDF) for deeper matching
- **Set criteria** like funding range, deadline, or agency preference
- **Ask about specific grants** for logistics and eligibility details

What's your research area?`,
  starterQuestions: [
    'Find NSF grants for machine learning in healthcare',
    'What NIH R01 opportunities exist for neuroscience research?',
    'I study climate adaptation in agricultural systems — what grants fit?',
    'Show me foundation grants under $50K for education research',
    'What grants have deadlines in the next 90 days for social sciences?',
  ],
  features: [
    'Semantic matching based on your research description',
    'Upload CV or research statement for personalized results',
    'Custom scoring by your criteria (amount, deadline, agency)',
    'Deadline tracking and application logistics',
    'Eligibility analysis for your career stage',
  ],
  systemPrompt: `You are Grant Finder, an AI research funding advisor for University of Kentucky faculty.

YOUR PRIMARY FUNCTION:
Help faculty discover and evaluate grant funding opportunities that match their research focus, career stage, and institutional context.

WHEN A FACULTY MEMBER DESCRIBES THEIR RESEARCH:
1. Identify the core research domain(s) and subdisciplines
2. Suggest relevant funding agencies (NSF, NIH, DOE, DOD, NEH, NEA, foundations)
3. Name specific grant mechanisms (R01, R21, R15, K-series, F-series, CAREER, etc.)
4. For each suggestion, provide:
   - Grant name and mechanism
   - Typical funding range
   - Typical duration
   - General deadline cycle (e.g., "February/June/October for R01")
   - Match score (1-10) with brief justification
   - Key eligibility requirements
   - Link to program page if you know it

SCORING CRITERIA (when user specifies preferences):
- Research alignment (semantic match to their description)
- Funding amount (within their stated range)
- Deadline proximity (prioritize upcoming deadlines if requested)
- Career stage fit (early-career vs. established)
- UK institutional eligibility
- Success rate (if known)

IF A CV OR RESEARCH STATEMENT IS UPLOADED:
- Extract key themes, methodologies, and publication areas
- Cross-reference against grant program descriptions
- Identify gaps (areas of research not yet funded)
- Suggest "stretch" grants that partially match

LOGISTICS SUPPORT:
When asked about a specific grant, provide:
- Application components (project narrative, budget, biosketches, etc.)
- Page limits and formatting requirements (if known)
- UK Office of Sponsored Projects (OSP) contacts and processes
- Common pitfalls for that mechanism
- Timeline suggestion (work backwards from deadline)

IMPORTANT CAVEATS:
- Always note that grant programs change — verify current details at the agency website
- Direct faculty to UK's Office of Sponsored Projects for institutional requirements
- Your knowledge has a cutoff — flag if a program may have been discontinued or modified
- Never guarantee funding or success rates
- For NIH: remind about eRA Commons, ASSIST submission, and study section selection

TONE: Knowledgeable, direct, collegial. You're a senior grants advisor who knows the landscape. Be specific — name actual programs, not just agencies.

UK-SPECIFIC CONTEXT:
- University of Kentucky is an R1 research institution
- Faculty should coordinate with their department's grants coordinator
- OSP handles all institutional approvals and submissions
- UK has institutional memberships with several foundation networks
- Limited submissions may apply — check with OSP before applying to some programs`,
}
```

### User Flow

```
1. Faculty opens Grant Finder
2. Sees welcome message + starter questions
3. Option A: Describes research in chat → AI returns ranked grant suggestions
4. Option B: Uploads CV (PDF) → AI extracts themes → returns personalized matches
5. Faculty asks follow-up: "Tell me more about the NSF CAREER award"
6. AI provides detailed logistics, timeline, eligibility
7. Faculty refines: "Only show me grants with deadlines in the next 6 months over $100K"
8. AI filters and re-scores
```

### No Database Changes
This tool is chat-only with optional file upload. No persistent storage needed for MVP.

---

## 3. Tool 2: Faculty Command Center

### Purpose
AI chief of staff for faculty. Aggregates deadlines, student performance, drafts emails. Designed for future Outlook/SharePoint integration.

### File: `app/lib/workshop/faculty-command-center.ts`

### Architecture Decision: Dashboard + Chat Hybrid

Unlike the other 3 tools (pure chat), the Faculty Command Center is a **dashboard with an AI sidebar**. This follows the Sandy Concierge pattern more than the Research Hub pattern.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Faculty Command Center                    [Prof. Name]  │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│  Dashboard (left 2/3)             │  AI Chat (right 1/3)│
│                                   │                     │
│  ┌─── Upcoming Deadlines ───┐     │  "How can I help?"  │
│  │ • Grades due: Mar 28     │     │                     │
│  │ • Committee mtg: Apr 2   │     │  [Draft an email    │
│  │ • Grant LOI: Apr 15      │     │   to my TA about    │
│  └──────────────────────────┘     │   grading]          │
│                                   │                     │
│  ┌─── Course Health ────────┐     │  [Summarize student │
│  │ TEK-100: 85% engaged     │     │   performance in    │
│  │ TEK-200: 72% at-risk: 3  │     │   TEK-200]          │
│  └──────────────────────────┘     │                     │
│                                   │                     │
│  ┌─── Quick Actions ────────┐     │                     │
│  │ [Draft Email] [Meeting   │     │                     │
│  │  Prep] [Student Report]  │     │                     │
│  └──────────────────────────┘     │                     │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│  ⚠ Outlook & SharePoint integration coming soon         │
└─────────────────────────────────────────────────────────┘
```

### Page: `app/workshop/faculty-command-center/page.tsx` (dedicated, not [slug])

This tool gets its own page file because it's a dashboard, not a chat-only tool.

### Data Sources (MVP — from existing DB)

| Section | Source | API |
|---------|--------|-----|
| Upcoming Deadlines | `Assignment.dueDate` from owned courses | `/api/workshop/command-center/deadlines` |
| Course Health | `ToolSession` counts + `StudentProfile` at-risk flags | `/api/workshop/command-center/course-health` |
| Student Performance | `GradebookEntry` summaries | `/api/workshop/command-center/students` |

### New API Routes

**`app/api/workshop/command-center/deadlines/route.ts`**
```typescript
// Returns upcoming deadlines for educator's courses
// Sources: Assignment.dueDate, manually added deadlines
// Auth: requireEducatorUser
```

**`app/api/workshop/command-center/course-health/route.ts`**
```typescript
// Returns per-course engagement and at-risk counts
// Sources: ToolSession (last 7 days), StudentProfile.atRiskLevel
// Auth: requireEducatorUser
```

**`app/api/workshop/command-center/students/route.ts`**
```typescript
// Returns student summary for a specific course
// Sources: GradebookEntry, ToolSession, StudentProfile
// Auth: requireCourseOwner
```

### AI Chat System Prompt

```
You are the Faculty Command Center AI — a chief of staff for University of Kentucky professors.

YOU HAVE ACCESS TO THE FOLLOWING CONTEXT (injected per-session):
- Faculty member's name, department, courses
- Upcoming deadlines (assignments, meetings, grants)
- Course health metrics (engagement %, at-risk students)
- Student performance summaries (when requested)

YOUR CAPABILITIES:
1. **Email Drafting**: Draft professional emails to students, TAs, colleagues, or department chairs. Match the appropriate tone (formal for chairs, friendly for students).
2. **Meeting Preparation**: Summarize relevant data before committee meetings, student meetings, or advising sessions.
3. **Student Reports**: Generate individual or class-wide performance summaries with actionable recommendations.
4. **Deadline Management**: Help prioritize and plan around upcoming deadlines.
5. **Course Analysis**: Identify trends in engagement, at-risk students, and tool usage patterns.

FUTURE CAPABILITIES (mention but note "coming soon"):
- Outlook calendar integration
- SharePoint document access
- Automated email sending
- Committee document assembly

TONE: Professional, efficient, proactive. You're a capable executive assistant who anticipates needs. Be concise — faculty are busy.

IMPORTANT:
- Always include [DRAFT] labels on generated emails
- Never send emails directly — present drafts for faculty to review
- Student data is FERPA-protected — remind faculty not to share outside official channels
- Offer to "dig deeper" when summarizing — don't overwhelm with data unprompted
```

### Outlook/SharePoint Integration Architecture (Future)

Design the command center with a **pluggable data source** pattern:

```typescript
interface DataSource {
  id: string
  name: string
  status: 'connected' | 'available' | 'coming-soon'
  icon: string
  fetchData: () => Promise<DataSourceResult>
}

const DATA_SOURCES: DataSource[] = [
  { id: 'sandbox', name: 'The Sandbox', status: 'connected', ... },
  { id: 'outlook', name: 'Microsoft Outlook', status: 'coming-soon', ... },
  { id: 'sharepoint', name: 'SharePoint', status: 'coming-soon', ... },
]
```

The UI shows connected sources with green badges and "coming soon" sources with gray badges + lock icons. This makes the integration story visible in the demo.

---

## 4. Tool 3: Space Utilization Optimizer

### Purpose
AI-powered room/office booking. Knows room inventory, availability, equipment. Recommends optimal space.

### File: `app/lib/workshop/space-optimizer.ts`

### Architecture Decision: Chat with Simulated Data

For the demo, this tool operates on **simulated room inventory data** embedded in the system prompt. No real booking system integration needed for MVP.

### Simulated Room Data (embedded in system prompt)

```
UK CAMPUS ROOM INVENTORY (simulated):

CLASSROOM BUILDINGS:
- Whitehall Classroom Building (WCB):
  - WCB 100: Lecture hall, 200 seats, projector, mic system, recording
  - WCB 205: Seminar room, 30 seats, whiteboard, projector
  - WCB 310: Computer lab, 40 stations, dual monitors

- Jacobs Science Building (JSB):
  - JSB 101: Lecture hall, 150 seats, lab bench demo area
  - JSB 220: Wet lab, 24 stations, fume hoods, safety shower
  - JSB 315: Dry lab, 30 workstations

- Gatton College of Business (GATTON):
  - GATTON 200: Tiered auditorium, 250 seats, video conferencing
  - GATTON 301: Case study room, 40 seats, breakout pods
  - GATTON 310: Bloomberg terminal room, 20 stations

- Funkhouser Building (FUNK):
  - FUNK 100: Lecture hall, 120 seats
  - FUNK 201: Seminar, 25 seats, round table
  - FUNK 305: Studio, 20 easels, natural light

AVAILABILITY PATTERNS (simulated):
- MWF: Most rooms booked 9am-3pm, available after 3pm
- TR: Most rooms booked 9:30am-2:30pm
- Evenings (after 5pm): 80% availability
- Weekends: 95% availability (JSB labs locked)
- Finals week: All rooms reserved for exams

EQUIPMENT TAGS:
projector, whiteboard, smartboard, video-conference, recording,
computer-lab, wet-lab, dry-lab, breakout-pods, mic-system,
accessibility-ramp, adjustable-seating, natural-light
```

### System Prompt Core

```
You are the Space Utilization Optimizer for University of Kentucky.

YOUR FUNCTION:
Help faculty, staff, and event planners find and book the optimal room or space for their needs.

WHEN A USER DESCRIBES THEIR NEED:
1. Ask clarifying questions if needed:
   - How many people?
   - What type of activity? (lecture, seminar, lab, meeting, event)
   - What equipment is needed?
   - Preferred building/location?
   - Date/time preferences?
   - Accessibility requirements?

2. Search the room inventory for matches
3. Return top 3 recommendations with:
   - Room name and building
   - Capacity and equipment
   - Availability for requested time
   - Match score (1-10) with reasoning
   - Alternative times if preferred slot is taken

4. Offer to check conflicts and suggest backup options

OPTIMIZATION PRIORITIES:
1. Right-size the room (don't put 10 people in a 200-seat hall)
2. Match equipment to activity type
3. Minimize building changes for back-to-back events
4. Consider accessibility requirements
5. Prefer energy-efficient scheduling (consolidate bookings)

BOOKING PROCESS (simulated):
- "I've found WCB 205 available Tuesday 2-4pm. In the full system, you'd click 'Reserve' to book it."
- Note: "Booking confirmation would come via email from the Registrar's office."

TONE: Efficient, helpful, practical. Like a concierge who knows every room on campus.
```

### User Flow

```
1. Faculty: "I need a room for 35 students for a case study discussion next Tuesday afternoon"
2. AI: "Let me check... GATTON 301 (40 seats, breakout pods) is available Tuesday 2-4pm.
   Also available: WCB 205 (30 seats, seminar) — slightly tight but works.
   My recommendation: GATTON 301 — the breakout pods are ideal for case discussions."
3. Faculty: "Does it have video conferencing? I have a guest speaker joining remotely."
4. AI: "GATTON 301 does not have video conferencing. Let me find alternatives...
   GATTON 200 (250 seats, video conferencing) is available but oversized.
   Alternative: Book GATTON 301 and request a portable webcam kit from UK IT."
```

---

## 5. Tool 4: Grant Writing Assistant (Upload Edition)

### Purpose
Upload CV + grant RFP. AI generates first-draft narrative sections.

### File: `app/lib/workshop/grant-writer.ts`

### Architecture Decision: Multi-Stage Upload + Chat

This tool has a **two-phase flow**:

**Phase 1 — Upload & Analysis:**
1. Upload CV/publications list (PDF)
2. Upload grant RFP/NOFO (PDF)
3. AI analyzes both documents and presents a summary:
   - Key requirements from the RFP
   - Faculty's relevant qualifications
   - Gaps to address
   - Suggested narrative structure

**Phase 2 — Drafting:**
4. Faculty requests specific sections: "Draft my Specific Aims"
5. AI generates section drafts incorporating:
   - RFP requirements and evaluation criteria
   - Faculty's publications and expertise
   - UK institutional context
   - Proper formatting and length guidance

### Page Enhancement

Instead of the standard chat page, this tool's page has an **upload pane + chat pane** layout:

```
┌──────────────────────────┬──────────────────────────────┐
│ Documents                │ AI Writing Assistant          │
│                          │                              │
│ ┌── Your CV ───────────┐ │ "Upload your CV and the      │
│ │ ✓ cv_2026.pdf        │ │  grant RFP to get started."  │
│ │   12 pages, 4.2K wds │ │                              │
│ └──────────────────────┘ │                              │
│                          │ [Draft Specific Aims]         │
│ ┌── Grant RFP ─────────┐ │ [Draft Significance]         │
│ │ ✓ nsf_career.pdf     │ │ [Draft Approach]             │
│ │   28 pages, 11K wds  │ │ [Draft Budget Justification] │
│ └──────────────────────┘ │                              │
│                          │                              │
│ [Upload another file]    │                              │
│                          │                              │
│ ── Analysis ──           │                              │
│ Key requirements: ...    │                              │
│ Your strengths: ...      │                              │
│ Gaps identified: ...     │                              │
│                          │                              │
└──────────────────────────┴──────────────────────────────┘
```

### Page: `app/workshop/grant-writer/page.tsx` (dedicated)

Like the Faculty Command Center, this tool gets its own page because it has a non-standard layout.

### System Prompt Core

```
You are a Grant Writing Assistant for University of Kentucky faculty.

YOU HAVE TWO UPLOADED DOCUMENTS:
1. FACULTY CV/PUBLICATIONS — Their research record, expertise, and track record
2. GRANT RFP/NOFO — The funding opportunity they're applying to

YOUR PRIMARY FUNCTION:
Generate publication-quality first-draft narrative sections for the grant application.

WHEN BOTH DOCUMENTS ARE UPLOADED, FIRST:
1. Summarize the grant opportunity:
   - Funder and mechanism (e.g., "NSF CAREER Award")
   - Funding amount and duration
   - Key evaluation criteria
   - Required sections and page limits
   - Deadline

2. Analyze the faculty's fit:
   - Relevant publications and expertise
   - Preliminary data or prior work that applies
   - Institutional resources at UK
   - Career stage alignment

3. Identify gaps:
   - Areas where the RFP requires something not evident in the CV
   - Missing preliminary data
   - Collaboration needs
   - Broader impacts components

WHEN DRAFTING SECTIONS:
- Follow the RFP's required structure exactly
- Incorporate specific details from the faculty's CV (publications, grants, students mentored)
- Reference UK resources (core facilities, centers, institutes)
- Use first person ("I propose..." or "We will...")
- Include placeholder brackets for missing info: [INSERT: specific preliminary data]
- Stay within page limit guidance
- Use clear section headers and logical flow
- Include significance statements at the start of each section

SECTION-SPECIFIC GUIDANCE:
- Specific Aims: 1 page. Hook → gap → objective → aims (2-3) → impact
- Significance: Why this matters. Cite the literature. Build the case.
- Innovation: What's new about your approach? Be explicit.
- Approach: Detailed methodology. Include timelines, milestones, alternatives.
- Budget Justification: Line-item rationale tied to specific aims.
- Broader Impacts: NSF-specific. Education, outreach, diversity, societal benefit.
- Biosketches: Formatted per agency requirements.

TONE: Scholarly, precise, confident but not arrogant. Match the conventions of the faculty's field.

IMPORTANT:
- Always label output as [DRAFT] — faculty must review and revise
- Note that formatting requirements change — verify against current NOFO
- Direct faculty to UK's Office of Sponsored Projects for submission
- Never fabricate publications or data — use only what's in the uploaded CV
- If information is missing, use [INSERT: description] placeholders
```

### Multi-File Upload State

```typescript
interface UploadedDocument {
  id: string
  filename: string
  fileType: string
  wordCount: number
  pageCount: number
  extractedText: string
  role: 'cv' | 'rfp' | 'supplemental'
}

// State in the page component
const [documents, setDocuments] = useState<UploadedDocument[]>([])

// When sending chat messages, include document content
const enrichedMessages = [{
  role: 'user',
  content: buildContextMessage(documents) + '\n\n' + userMessage,
}]
```

---

## 6. Data Model Changes

### No Prisma Schema Changes for MVP

All 4 tools operate on:
- **Chat-only interactions** (no persistent storage of conversations for MVP)
- **Existing data** (Course, Assignment, ToolSession, StudentProfile for Command Center)
- **Uploaded files** (processed in-memory, text extracted and sent with chat)
- **Simulated data** (Space Optimizer room inventory in system prompt)

### Future Schema Additions (post-MVP)

If these tools graduate from Workshop to full platform tools:

```prisma
model WorkshopSession {
  id          String   @id @default(cuid())
  userId      String
  toolSlug    String
  messages    Json     // Chat history
  documents   Json?    // Uploaded file metadata (not content)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
}
```

Not needed for MVP — these are demo-grade rough drafts.

---

## 7. File Inventory

### New Files to Create

```
app/
├── lib/
│   └── workshop/
│       ├── index.ts                         # Tool registry + exports
│       ├── grant-finder.ts                  # Grant Finder config + system prompt
│       ├── faculty-command-center.ts        # Command Center config + system prompt
│       ├── space-optimizer.ts               # Space Optimizer config + system prompt
│       └── grant-writer.ts                  # Grant Writer config + system prompt
├── workshop/
│   ├── page.tsx                             # Workshop landing/hub page
│   ├── [slug]/
│   │   └── page.tsx                         # Shared chat page (Grant Finder, Space Optimizer)
│   ├── faculty-command-center/
│   │   └── page.tsx                         # Dashboard + chat hybrid
│   └── grant-writer/
│       └── page.tsx                         # Upload pane + chat hybrid
└── api/
    └── workshop/
        ├── route.ts                         # Shared streaming chat endpoint
        ├── upload/
        │   └── route.ts                     # Shared file upload endpoint
        └── command-center/
            ├── deadlines/
            │   └── route.ts                 # Faculty deadlines aggregation
            ├── course-health/
            │   └── route.ts                 # Course engagement summary
            └── students/
                └── route.ts                 # Student performance summary
```

### Files to Modify

| File | Change |
|------|--------|
| `app/hub/page.tsx` | Update `COMING_SOON_TOOLS` array, add status field + visual treatment |

### Total New Files: ~14
### Total Modified Files: 1

---

## 8. Execution Phases

| Phase | Tasks | Complexity |
|-------|-------|------------|
| **W1** | Shared infrastructure: `workshop/index.ts`, API routes (chat + upload), `[slug]/page.tsx` | Medium |
| **W2** | Grant Finder: config + system prompt, verify with [slug] page | Low |
| **W3** | Space Optimizer: config + system prompt, verify with [slug] page | Low |
| **W4** | Grant Writing Assistant: config, dedicated page with upload pane | Medium |
| **W5** | Faculty Command Center: config, dashboard page, 3 data API routes | High |
| **W6** | Hub integration: update Workshop tab with new tools + status badges | Low |

Each phase ≤ 2 tasks per the handoff constraint.
