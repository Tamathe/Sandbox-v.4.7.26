# Tools Page UX Overhaul — Architecture & Implementation Plan
### The Sandbox / CATS-AI / University of Kentucky
### Date: 2026-03-18
### Source: Student UX Audit (Tools Marketplace → Chat Session → End-of-Session Flow)
### Authors: Student auditor (average user perspective) · Master Software Engineer · Head of Strategic Design & Culture · Head Software Engineer

---

## Document Purpose

This document consolidates the findings and decisions from a three-perspective review of the Tools page student experience:

1. A student walkthrough audit of every section of `/tools`
2. An engineering evaluation of each recommendation (effort, risk, hidden complexity)
3. A strategic/culture review of what the friction points communicate about the institution
4. A head engineering synthesis: what to build, in what order, and why

It is organized into four parts:
- **Part 1 — Root Problems** (the underlying causes, not just symptoms)
- **Part 2 — Implementation Plan** (tiered by effort/impact)
- **Part 3 — New Tools Roadmap** (additions recommended by the audit)
- **Part 4 — Architectural Decisions** (things that affect data models or system design)

---

## Part 1 — Root Problems

Before the fix list, the audit surfaced three structural problems that explain most of the individual friction points:

### Problem 1: The Platform Has No Welcome Moment
A first-year student arrives at `/tools` and has to decode what everything means through exploration. There is no onboarding. The Sandy concierge exists but students don't know what it is. The three tabs (Learn, Services, Play) are unlabeled by purpose. The result: students make incorrect assumptions about what the platform is for and leave.

### Problem 2: New Users Are Introduced to Scarcity First
On the Play tab, students with 0 Sand see locked experiences on their first visit. The first emotional signal the platform sends to new users is "you haven't earned the right to play yet." This is the opposite of the cultural intention.

### Problem 3: Tool Discovery Is Designed for Browsers, Not Searchers
The default sort is "Newest" — useful for returning users who want fresh content, not for first-time visitors who need the best content. The most valuable filters (Type, Level) are hidden behind an "Advanced Filters" toggle. The tool modal adds a click without adding information.

---

## Part 2 — Implementation Plan

### Tier 1 — Ship This Week
*Each item is under 4 hours. No schema changes. No API changes.*

---

#### T1-1: Default Sort → "Most Used"
**File:** `app/tools/page.tsx`
**Change:** One string. Change the `sort` state default from `'newest'` to `'sessions'`.
**Why:** First-time visitors need the most battle-tested tools. "Newest" serves returning users. "Most Used" serves everyone.

```tsx
// Before
const [sort, setSort] = useState('newest')

// After
const [sort, setSort] = useState('sessions')
```

**Effort:** 10 minutes · **Risk:** None

---

#### T1-2: Remove the Tool Launch Modal — Direct Card Navigation
**Files:** `app/components/ToolCard.tsx`, `app/components/ToolLaunchModal.tsx`

**Problem:** Clicking a tool card opens `ToolLaunchModal`. Both buttons in that modal ("Launch" and "View Details") navigate to the same `/tools/[id]` page. The modal is a redundant step that adds friction without adding information.

**Change:**
- Make the tool card itself a `<Link href="/tools/[id]">` wrapper
- Move the "Save to Library" toggle button to the card with `e.stopPropagation()` to prevent nav trigger
- Retire `ToolLaunchModal` or repurpose it as a hover-only "quick peek" (optional, not required)

```tsx
// ToolCard.tsx — simplified structure
<Link href={`/tools/${tool.id}`} className="block">
  <div className="tool-card">
    {/* card content */}
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLibrary() }}
    >
      {inLibrary ? 'Saved' : 'Save'}
    </button>
  </div>
</Link>
```

**Hidden complexity:** The modal currently manages library toggle state. Extract that state + API call into the card itself before deleting the modal. The `LibraryEntry` POST/DELETE calls at `/api/library/` are unchanged.

**Effort:** 2 hours · **Risk:** Low

---

#### T1-3: Creator Attribution — Name + Department
**File:** `app/components/ToolCard.tsx`

**Change:** Replace email handle display with `{creator.name}, {creator.department}`.

```tsx
// Before
<span>{tool.creator.email.split('@')[0]}</span>

// After
<span>{tool.creator.name}{tool.creator.department ? `, ${tool.creator.department}` : ''}</span>
```

The `User` model already has `name`, `department`. No schema change needed.

**Cultural rationale:** Faculty who build tools deserve recognition by name and department. This also signals to students that domain experts created the tools — raising perceived quality and trust.

**Effort:** 45 minutes · **Risk:** None

---

#### T1-4: Badge Tooltips — Verified & UK Official
**File:** `app/components/ToolCard.tsx`

Add `title` attributes (or Radix `Tooltip` if already in the component library) to both badges:

```tsx
// UK Official badge
<span title="Built and maintained by a UK department">
  🛡️ UK Official
</span>

// Verified badge
<span title="Reviewed and approved by a UK educator">
  ✓ Verified
</span>
```

**Effort:** 30 minutes · **Risk:** None

---

#### T1-5: Difficulty Tooltip with Context Text
**File:** `app/components/ToolCard.tsx`

The difficulty badge already has a label. Add hover context:

| Badge | Tooltip text |
|---|---|
| Introductory | "No prerequisites — suitable for all students" |
| Intermediate | "Some course background recommended" |
| Advanced | "Upper-division or graduate-level — prerequisites apply" |

**Effort:** 30 minutes · **Risk:** None

---

#### T1-6: "Start New Session" Button in Chat
**File:** `app/components/ChatInterface.tsx`

Extract session-clear logic into a named handler and wire to a button in the chat header.

```tsx
const handleClearSession = useCallback(async () => {
  // 1. If messages exist, trigger end-of-session save first
  if (messages.length > 0 && sessionId) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ endedAt: new Date().toISOString() })
    })
  }
  // 2. Clear local state
  setMessages([])
  setSessionId(null)
  sessionStorage.removeItem(`sandbox-session-${toolId}`)
  setEndFlowStep(null)
  setSessionJustCompleted(false)
}, [messages, sessionId, toolId, currentUser.email])
```

Render in the chat header area (top-right, next to tool title):
```tsx
{messages.length > 0 && (
  <button onClick={handleClearSession} title="Start a new session">
    <RotateCcw size={16} />
  </button>
)}
```

**Effort:** 2 hours · **Risk:** Low — verify session save completes before clearing

---

#### T1-7: "Simplify This" on Any Message (Not Just Last)
**File:** `app/components/ChatInterface.tsx`

The `Lightbulb` button currently only renders on the last assistant message. Move it to a hover state on every assistant message.

```tsx
const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)

// In message bubble render:
<div
  onMouseEnter={() => setHoveredMsgId(msg.id)}
  onMouseLeave={() => setHoveredMsgId(null)}
  className="relative"
>
  {/* message content */}
  {hoveredMsgId === msg.id && msg.role === 'assistant' && !isLoading && (
    <button onClick={() => handleSimplify(msg.content)}>
      <Lightbulb size={14} /> Simplify
    </button>
  )}
</div>
```

The `handleSimplify` function already exists — it fires a `sandbox-prefill-chat` event with "Can you explain that more simply?". No new logic needed.

**Effort:** 30 minutes · **Risk:** None

---

#### T1-8: Mic Countdown — "Sending in 3…"
**Files:** `app/hooks/useSpeechRecognition.ts`, `app/components/ChatInterface.tsx`

The hook already tracks a 3.5-second silence timer. Expose the countdown value.

```tsx
// useSpeechRecognition.ts — add to return object
silenceCountdown: number | null  // 3, 2, 1 or null when not counting

// ChatInterface.tsx — mic button label
{isRecording ? (
  silenceCountdown !== null
    ? `Sending in ${silenceCountdown}…`
    : 'Listening…'
) : 'Speak'}
```

**Effort:** 1 hour · **Risk:** Low

---

#### T1-9: Hide "Educator Tools" Category Pill from Students on Play Tab
**File:** Play tab component (Sandcastle section of `app/tools/page.tsx` or `app/sandcastle/page.tsx`)

```tsx
// Gate the category pill render
{currentUser.role !== 'STUDENT' && (
  <button>Educator Tools</button>
)}
```

Also gate the experience cards themselves server-side — educator-only Sandcastle experiences should not be fetched or rendered for STUDENT role users.

**Effort:** 15 minutes · **Risk:** None

---

#### T1-10: Sand Balance Explainer Tooltip
**File:** Play tab component

Add a `?` icon button next to the Sand balance display. On click/hover, show:

> "Sand is your play currency. Earn it by completing learning tool sessions, finishing quests, and hitting score milestones."

Use a Radix popover or native `title` attribute. No data changes.

**Effort:** 1 hour · **Risk:** None

---

### Tier 2 — Next Sprint
*Each item is 1–5 days. Some require state refactoring. No schema changes except item T2-3.*

---

#### T2-1: Combine Rating + Journal Into a Single End-of-Session Step
**File:** `app/components/ChatInterface.tsx`

**Problem:** The current `endFlowStep: 'rating' | 'journal' | null` state machine creates two sequential overlays that feel like a toll booth. Students who just finished a learning session should not face a multi-step survey.

**Implementation:**

Replace the 2-step state machine with a single combined overlay.

```tsx
// Remove endFlowStep state machine
// Replace with a single boolean
const [showEndFlow, setShowEndFlow] = useState(false)
const [sessionRating, setSessionRating] = useState<number | null>(null)
const [journalNote, setJournalNote] = useState('')

// Single overlay renders both side by side
{showEndFlow && (
  <div className="end-session-overlay">
    <h3>How was this session?</h3>

    {/* Left: Stars */}
    <StarRating value={sessionRating} onChange={setSessionRating} />

    {/* Right: Note */}
    <textarea
      placeholder="What's one thing that landed? (private — only you see this)"
      value={journalNote}
      onChange={(e) => setJournalNote(e.target.value)}
    />

    {/* Actions */}
    <button onClick={handleSubmitEndFlow}>Save & Done</button>
    <button onClick={() => setShowEndFlow(false)}>Skip</button>
  </div>
)}
```

The `handleSubmitEndFlow` function calls both APIs in parallel:
```tsx
const handleSubmitEndFlow = async () => {
  await Promise.all([
    sessionRating && fetch(`/api/sessions/${sessionId}/rating`, { ... }),
    journalNote.trim() && fetch(`/api/sessions/${sessionId}/note`, { ... })
  ])
  setShowEndFlow(false)
  setSessionJustCompleted(true)
}
```

**Cultural note:** Change the journal label from "Add a private note about this session" (administrative) to "What's one thing that landed?" (reflective). This small copy change repositions the note as student-owned reflection, not platform data collection.

**Effort:** 3 hours · **Risk:** Low — no API or model changes

---

#### T2-2: Starter Questions — Persistent Collapsible Drawer
**File:** `app/components/ChatInterface.tsx`

**Problem:** Starter questions vanish permanently after the first message. Students who want to revisit a prompt mid-session must type it manually.

**Implementation:**

```tsx
const [suggestionsOpen, setSuggestionsOpen] = useState(true)

// Auto-collapse (not destroy) after first user message
useEffect(() => {
  if (userMessageCount === 1) setSuggestionsOpen(false)
}, [userMessageCount])

// Render — always mounted, toggle visibility
{starterQuestions.length > 0 && (
  <div className="suggestions-drawer border-t border-gray-100">
    <button
      onClick={() => setSuggestionsOpen(!suggestionsOpen)}
      className="flex items-center gap-1 text-xs text-gray-500 py-1 px-2"
    >
      <Lightbulb size={12} />
      Suggestions
      {suggestionsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </button>

    {suggestionsOpen && (
      <div className="flex flex-wrap gap-2 px-2 pb-2">
        {starterQuestions.map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="starter-question-pill"
          >
            {q}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

Key behaviors:
- Starts open when `messages.length === 0`
- Auto-collapses (does not disappear) after first user message
- Student can re-open via toggle throughout the entire session
- Clicking a suggestion fills the input — does not auto-send

**Effort:** 2 hours · **Risk:** None

---

#### T2-3: 50 Sand Welcome Grant on Account Creation
**Files:** `prisma/seed.ts`, `app/api/users/` (registration endpoint when SSO lands)

**Problem:** Students arrive at the Play tab with 0 Sand and see locked experiences. The first emotional signal is exclusion.

**Schema:** No change needed. `SandTransaction` already supports any credit reason.

**Seed change:**
```ts
// prisma/seed.ts — when creating each student user
await prisma.sandTransaction.create({
  data: {
    userId: student.id,
    amount: 50,
    type: 'EARNED',
    reason: 'Welcome gift — welcome to The Sandbox!',
    createdAt: new Date()
  }
})
```

**Production registration flow** (when Shibboleth SSO replaces mock auth):
```ts
// In the user creation handler (app/api/users/ or auth callback)
await prisma.sandTransaction.create({
  data: {
    userId: newUser.id,
    amount: 50,
    type: 'EARNED',
    reason: 'Welcome to The Sandbox!'
  }
})
```

**Play tab first-visit banner** (localStorage-gated, shown once):
```tsx
// Play tab mount
const [showWelcomeSand, setShowWelcomeSand] = useState(() =>
  typeof window !== 'undefined' &&
  !localStorage.getItem('sandbox-sand-welcomed')
)

const dismissWelcome = () => {
  localStorage.setItem('sandbox-sand-welcomed', '1')
  setShowWelcomeSand(false)
}

{showWelcomeSand && sandBalance === 50 && (
  <div className="welcome-sand-banner">
    🎉 You start with <strong>50 Sand</strong> — enough to unlock several experiences.
    Earn more by completing learning tools and quests.
    <button onClick={dismissWelcome}>Got it</button>
  </div>
)}
```

**Effort:** 1 hour · **Risk:** None

---

#### T2-4: Tool Type Filter as Visible Pills (Not Hidden in Advanced Filters)
**File:** `app/tools/page.tsx`

**Problem:** The Type filter (AI Chat, Quiz, Simulation, etc.) is the second-most important discovery filter after category. It is buried behind an "Advanced Filters" toggle that most students never expand.

**Implementation:**

Move the Type filter out of the collapsible panel and into a persistent second-row pill bar directly under the category pills:

```tsx
{/* Filter bar — row 1: Categories */}
<div className="category-pills flex gap-2 overflow-x-auto">
  {CATEGORIES.map((cat) => (
    <button key={cat} onClick={() => setCategory(cat)}>{cat}</button>
  ))}
</div>

{/* Filter bar — row 2: Types (new, always visible) */}
<div className="type-pills flex gap-2 mt-2">
  {['All', 'Chat', 'Quiz', 'Simulation', 'Interview', 'Debate', 'Study Aid'].map((type) => (
    <button
      key={type}
      onClick={() => setToolType(type === 'All' ? null : type)}
      className={toolType === type ? 'active' : ''}
    >
      {type}
    </button>
  ))}
</div>
```

Keep the Advanced Filters panel for Difficulty + Audio-Ready (those are secondary signals).

**Effort:** 1 day · **Risk:** Low — requires layout adjustment, no API changes

---

#### T2-5: Publish Form — Tool Name Guidance
**File:** `app/publish/page.tsx` (and/or the `ToolBuilderChat` component)

**Problem:** Educator-facing tool naming conventions leak into student-facing UI. Tools named "TEK Design Coach - DEX" communicate nothing to students who aren't in TEK-100.

**Implementation:**

Add helper text to the Tool Name field in the Publish form:

```tsx
<label>Tool Name</label>
<input type="text" placeholder="e.g. Engineering Design Process Coach" />
<p className="field-hint">
  Lead with what the tool <em>does</em>, not a character name.
  Characters are great in descriptions — save them for inside the experience.
  ✓ "Engineering Design Coach" &nbsp; ✗ "TEK Design Coach - DEX"
</p>
```

Also update the AI builder prompt in `ToolBuilderChat.tsx` to include this naming convention in its system instructions.

**Seed data fix:** Update TEK tool names in `prisma/seed.ts`:

| Old name | New name |
|---|---|
| TEK Design Coach - DEX | Engineering Design Process Coach |
| TEK Team Dynamics Facilitator - Sage | Team Dynamics & Conflict Planning |
| TEK Ethics Advisor - Ethena | Engineering Ethics Advisor |
| TEK Career Pathfinder - Compass | Engineering Career Explorer |
| TEK Communication Coach - Clarity | Technical Writing Coach |

**Effort:** 2 hours (form guidance + seed rename) · **Risk:** None

---

### Tier 3 — Architectural Sprint
*These require schema changes, new components, or multi-day design work.*

---

#### T3-1: First-Login Onboarding Experience

**Problem:** No welcome moment exists. Students arrive at a feature-rich platform with no guidance on what it is, what the tabs mean, or how to get started.

**Schema Change:**
```prisma
// prisma/schema.prisma — add to User model
hasCompletedOnboarding  Boolean  @default(false)
```

**Migration:**
```bash
npx prisma migrate dev --name add_onboarding_flag
```

**New Component:** `app/components/OnboardingModal.tsx`

3-slide experience, rendered as a full-screen overlay on first visit to `/tools` or `/`:

```
Slide 1: Welcome
  Headline: "Welcome to The Sandbox"
  Body: "UK's AI learning hub — built by your professors, for your courses."
  Visual: Platform logo + tab icons

Slide 2: Your Tools (role-personalized)
  STUDENT:  "Your professors build AI tools for your exact courses.
             Browse by category, or let Sandy recommend what fits."
  EDUCATOR: "Build AI tools for your students in minutes.
             Use the Builder or describe what you want in plain language."

Slide 3: Play + Sand
  "You start with 50 Sand. Use it to unlock interactive experiences.
   Earn more by completing learning tools and finishing quests."
  [Explore Tools →] button (primary CTA)
```

**API Change:** `PATCH /api/users/[id]` — add `hasCompletedOnboarding` to the updatable fields.

**Trigger logic:**
```tsx
// In app/layout.tsx or app/page.tsx (home dashboard)
const { currentUser } = useAuth()
const [showOnboarding, setShowOnboarding] = useState(
  !currentUser.hasCompletedOnboarding
)

const completeOnboarding = async () => {
  await fetch(`/api/users/${currentUser.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ hasCompletedOnboarding: true })
  })
  setShowOnboarding(false)
}
```

**Fallback for demo mode** (before schema change ships): gate on `localStorage('sandbox-onboarded')` instead.

**Effort:** 4 hours · **Schema change required**

---

#### T3-2: Course-Enrollment-Driven Tool Personalization

**Problem:** The "Recommended for You" section shows 4 static featured tools. It does not know the student's courses, year, or major.

**Architecture:**

Add a server-side personalization endpoint that uses the student's `CourseEnrollment` records to rank tools:

```
GET /api/tools/recommended?userId=[id]
```

Logic:
1. Fetch the student's enrolled courses (already in `CourseEnrollment`)
2. Fetch tools linked to those courses via `CourseToolLink`
3. Supplement with tools in the student's department/college category
4. Fall back to top-rated tools in any category if no enrollment data

```ts
// app/api/tools/recommended/route.ts
export async function GET(request: Request) {
  const email = request.headers.get('x-demo-user-email')
  const user = await getUserWithEnrollments(email)

  const enrolledCourseIds = user.enrollments.map(e => e.courseId)

  // Priority 1: Tools linked to enrolled courses
  const courseLinkedTools = await prisma.courseToolLink.findMany({
    where: { courseId: { in: enrolledCourseIds } },
    include: { tool: true }
  })

  // Priority 2: Tools in user's department category
  const departmentTools = await prisma.tool.findMany({
    where: {
      category: mapDepartmentToCategory(user.department),
      approvalStatus: 'APPROVED',
      id: { notIn: courseLinkedTools.map(l => l.toolId) }
    },
    orderBy: { sessions: { _count: 'desc' } },
    take: 10
  })

  return NextResponse.json([
    ...courseLinkedTools.map(l => l.tool).slice(0, 4),
    ...departmentTools.slice(0, 4)
  ])
}
```

**Frontend:** Replace the static "Featured Experiences" hero with this dynamic endpoint. Label the section "Recommended for You" instead of "Featured Experiences."

**Effort:** 1 day · **Risk:** Low — reads from existing enrollment data

---

#### T3-3: Course-Level Tags (1L / Pre-Med / Undergrad / Graduate)

**Problem:** Within dense categories like Law and Medicine, students can't tell which tools are appropriate for their year or program level without clicking into each one.

**Schema Change:**
```prisma
// Add to Tool model in schema.prisma
audienceTags  String[]  @default([])
```

Tags are freeform but we define a standard set:
- `1L`, `2L`, `3L`, `bar-prep` (Law)
- `pre-med`, `md-student`, `resident`, `grad` (Medicine)
- `undergrad`, `graduate`, `phd` (STEM/General)

**Publish form change:** Add a multi-select tag picker under the "Intended Audience" field.

**Filter UI change:** When the Law or Medicine category is selected, show a sub-filter row for audience tags:
```tsx
{(category === 'Law') && (
  <div className="audience-tag-pills">
    {['1L', '2L', '3L', 'Bar Prep'].map(tag => (
      <button onClick={() => toggleTag(tag)}>{tag}</button>
    ))}
  </div>
)}
```

**Effort:** 2 days · **Schema change required**

---

#### T3-4: Server-Side Session Persistence (Resume Sessions)

**Problem:** Sessions are stored in `sessionStorage` — cleared when the tab closes. If a student returns to a tool the next day, they start over. The `ChatMessage` model already exists in the schema but is not used to restore UI state.

**Current state:** `sessionStorage.getItem('sandbox-session-${toolId}')` stores only the session ID, not the messages.

**Target state:** On tool page load, fetch the last open session's messages from the DB and populate the chat history.

**Implementation:**

```ts
// app/api/sessions/[id]/messages/route.ts (new endpoint)
// GET /api/sessions/[id]/messages
// Returns all ChatMessage records for a session, ordered by createdAt

export async function GET(request, { params }) {
  const session = await prisma.toolSession.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } }
    }
  })
  return NextResponse.json(session?.messages ?? [])
}
```

```tsx
// ChatInterface.tsx — on mount, if resumeSessionId or stored sessionId exists
useEffect(() => {
  const storedId = sessionStorage.getItem(`sandbox-session-${toolId}`)
  if (storedId || resumeSessionId) {
    const id = resumeSessionId ?? storedId
    fetch(`/api/sessions/${id}/messages`, { headers: ... })
      .then(r => r.json())
      .then(msgs => {
        if (msgs.length > 0) {
          setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })))
          setSessionId(id)
        }
      })
  }
}, [toolId, resumeSessionId])
```

**Note:** `ChatMessage` model already exists. This is a read path only — messages are already being written on each chat turn via `/api/sessions/[id]` PUT or the chat API.

**Effort:** 1 day · **Risk:** Medium — verify `ChatMessage` records are being written reliably before building the read path

---

## Part 3 — New Tools Roadmap

These tools were identified as gaps in the current catalog. Ordered by student demand and build simplicity.

---

### Immediate Priority (Build in next 2 weeks)

Each tool below is a `CHATBOT` type, Haiku-powered, and can be built via the existing Publish flow or the conversational Builder. No new infrastructure required.

---

#### NT-1: Data Structures & Algorithms Tutor
**Category:** STEM · **Difficulty:** Intermediate · **Audience:** CS students (undergrad)
**Gap:** CS 215 Python Tutor covers OOP. Nothing covers DSA — the core of every CS interview and upper-division course.

**System prompt focus:**
- Socratic method: ask the student to trace through an algorithm step by step before explaining
- Cover: arrays, linked lists, stacks, queues, trees, graphs, hash maps, sorting algorithms, Big-O analysis
- When student is stuck, give a hint not an answer
- Draw ASCII diagrams when helpful

**Starter questions:**
- "Can you explain how binary search works?"
- "I don't understand Big-O notation — where do I start?"
- "Walk me through a depth-first search on a tree"

---

#### NT-2: Student Mental Health Navigator
**Category:** Services · **Type:** Informational Service Bot · **Audience:** All students
**Gap:** The Services tab has Financial Aid, Registrar, IT Help Desk — but nothing for mental health. CAPS (UK Counseling & Psychiatric Services) is one of the most-needed services for students.

**Architecture:** Deploy as a Service Bot (admin-only build via `/service-bot`), not a chatbot tool. This gives it the "UK Official" badge and the appropriate `transactional` protocol with escalation email.

**System prompt focus:**
- Never diagnose or provide clinical advice
- Surface CAPS resources: scheduling link, crisis line, walk-in hours
- Provide evidence-based coping strategies for academic stress, anxiety, loneliness
- Escalation trigger: if student expresses crisis → immediately surface crisis line and emergency contacts
- Tone: warm, non-clinical, non-judgmental

**Escalation email:** CAPS department email (to be configured by admin)

---

#### NT-3: Research Paper Outline Generator
**Category:** General · **Difficulty:** Intermediate · **Audience:** All undergrad/grad
**Gap:** Cross-discipline tool with very high usage ceiling. Every student writing a research paper needs help going from topic → thesis → section structure.

**System prompt focus:**
- Step-by-step: topic → narrowed topic → arguable thesis → 3-5 section headers with argument summary
- Ask clarifying questions before generating: "What's your argument?" "Who is your audience?" "How long is the paper?"
- Offer to refine each section if the student pastes a draft

**Starter questions:**
- "I need to write a 10-page paper on climate policy but I don't know where to start"
- "Help me narrow my topic and write a thesis statement"

---

#### NT-4: Internship & Co-op Coach
**Category:** University · **Difficulty:** Introductory · **Audience:** Juniors/Seniors
**Gap:** No career preparation tools exist in the University category. This is one of the highest-anxiety moments in a student's academic career.

**System prompt focus:**
- Resume tailoring for specific job descriptions (student pastes JD, AI identifies gaps)
- Cover letter structure and tone (not ghostwriting — coaching)
- LinkedIn summary coaching
- How to prepare for behavioral interviews (STAR method)
- How to negotiate start dates and relocation

---

#### NT-5: Study Abroad Advisor
**Category:** University · **Difficulty:** Introductory · **Audience:** Sophomores/Juniors
**Gap:** UK has extensive study abroad programs (Education Abroad office). Zero coverage in the current tool catalog.

**System prompt focus:**
- Program exploration: by region, duration, major compatibility
- Credit transfer questions (note: forward complex cases to Education Abroad office)
- Application timeline guidance
- Funding: scholarships, Gilman Award, Benjamin A. Gilman International Scholarship
- What to expect: culture shock, safety, housing

---

### Next Sprint (3–4 weeks out)

| Tool | Category | Difficulty | Key Feature |
|---|---|---|---|
| Close Reading Coach | Arts & Humanities | Intermediate | Paste a poem/passage → guided close reading method, not summary |
| Physical Exam Walkthrough | Medicine | Intermediate | Systems-based H&P practice, SOAP note structure |
| Financial Statement Analyzer | Business | Advanced | Paste 10-K or income statement → ratio analysis, red flag identification |
| Pitch Deck Coach | Business | Intermediate | Narrate idea → investor-style pushback and slide structure feedback |
| Socratic Smackdown (Sandcastle) | Play | — | Two positions, timed 2-minute arguments, AI judges on logic and evidence |
| UK Campus History Quiz (Sandcastle) | Play | — | UK traditions, buildings, mascot history, Wildcat lore |

---

### Tools to NOT Build Yet

| Tool | Reason |
|---|---|
| Housing & Dining Q&A | Requires live data feed from UK Housing — external dependency |
| Parking & Transportation Bot | Real-time permit/route data dependency |
| Major Roulette (Sandcastle) | Fun but low educational value; defer until Play catalog has more depth |
| Drug Interaction Quiz | High liability — requires clinical pharmacist review before publishing |

---

## Part 4 — Architectural Decisions

These are cross-cutting decisions that affect multiple features or set precedents.

---

### Decision 1: Modal Retirement Strategy

The `ToolLaunchModal` should be fully retired, not repurposed. A "quick peek" hover card is not worth the engineering maintenance overhead for the marginal benefit. Decision: delete the component after migrating the library toggle state to `ToolCard`.

---

### Decision 2: Session Storage vs. Database Session Persistence

Current state: `sessionStorage` (volatile, per-tab).
Target state: `ChatMessage` records in DB (durable, cross-device).

This is a Tier 3 item because we need to verify message write reliability first. **Do not build the resume flow until we have confirmed that ChatMessage records are being written on every turn.** Add a monitoring check: count sessions with 0 ChatMessage records that have messageCount > 0 on the ToolSession — that gap is the bug to fix first.

---

### Decision 3: Onboarding Flag — localStorage vs. Schema

For demo mode: use `localStorage('sandbox-onboarded')` as the gate. Ship immediately.
For production: add `hasCompletedOnboarding: Boolean` to the User model and sync on dismiss. The localStorage version should also check the server state on load so switching devices doesn't re-trigger.

---

### Decision 4: New Tools Are Chatbot Type Only Until Further Notice

All new tools in the immediate priority list are `CHATBOT` type tools. We are not building new SIMULATION or QUIZ type tools until the existing infrastructure for scoring and metric events is better documented and tested. The one exception is the Sandcastle experiences (NT-6 and NT-7) which use the existing Sandcastle config pattern in `app/lib/sandcastle.ts`.

---

### Decision 5: Service Bot for Mental Health (Not a Chatbot Tool)

The Student Mental Health Navigator must be deployed as a Service Bot (admin-only, via `/service-bot`), not a community chatbot. This ensures:
- It has the "UK Official" badge (trust signal)
- It goes through the PII certification step in the Service Bot wizard
- The escalation email is configured at the department level
- The `transactional` protocol constraint prevents it from taking actions on behalf of students

This is the same pattern used for Finley (Financial Aid Advisor).

---

### Decision 6: 50 Sand Welcome Grant Is Not a Loophole

Some students may create multiple accounts to farm welcome Sand. Mitigation:
- In demo mode: not an issue (accounts are hardcoded)
- In production: tie Sand grant to SSO first-login. One SSO identity = one grant. The `SandTransaction` creation happens in the auth callback, gated by `hasCompletedOnboarding === false`.

---

## Summary — Implementation Order

| Phase | Items | Effort | Gate |
|---|---|---|---|
| **Week 1** | T1-1 through T1-10 (all Tier 1) | ~8 hours | None — ship immediately |
| **Week 2** | T2-1 (end flow), T2-2 (suggestions drawer), T2-3 (Sand welcome), T2-5 (naming guidance) | ~2 days | None |
| **Week 3** | T2-4 (type filter pills), T3-1 (onboarding modal, localStorage version) | ~2 days | None |
| **Week 4–5** | NT-1 through NT-5 (5 new tools) | ~3 days per tool | Existing Publish/Builder flow |
| **Sprint 2** | T3-2 (enrollment-driven recommendations), T3-3 (course-level tags) | ~3 days | Schema migration |
| **Sprint 3** | T3-4 (session persistence), T3-1 production (schema version) | ~3 days | Verify ChatMessage write reliability first |

---

## Files Affected Summary

| File | Changes |
|---|---|
| `app/components/ToolCard.tsx` | Direct nav (no modal), creator name+dept, badge tooltips, difficulty tooltip |
| `app/components/ToolLaunchModal.tsx` | Retire (delete after library toggle migration) |
| `app/components/ChatInterface.tsx` | New Session button, Simplify on any message, persistent suggestions drawer, combined end-flow overlay, journal copy change |
| `app/hooks/useSpeechRecognition.ts` | Expose silenceCountdown value |
| `app/tools/page.tsx` | Default sort → sessions, type filter pills, Play tab Sand explainer, hide Educator Tools from students |
| `app/publish/page.tsx` | Tool name guidance copy |
| `prisma/seed.ts` | 50 Sand welcome grant per user, TEK tool name updates |
| `prisma/schema.prisma` | `hasCompletedOnboarding` (T3-1), `audienceTags` (T3-3) |
| `app/api/tools/recommended/route.ts` | New — enrollment-driven recommendations (T3-2) |
| `app/api/sessions/[id]/messages/route.ts` | New — session resume read path (T3-4) |
| `app/components/OnboardingModal.tsx` | New — 3-slide onboarding (T3-1) |
| `app/lib/sandcastle.ts` | New Sandcastle entries (NT-6, NT-7) |

---

*This document should be treated as a living spec. Update it as decisions are confirmed or reversed.*
