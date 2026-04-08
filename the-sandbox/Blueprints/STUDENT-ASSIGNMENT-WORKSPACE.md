# Blueprint 8: Assignment Workspace — From "I Need to Do This" to Doing It

> **Sprint Scope:** Build a split-screen assignment workspace that shows the assignment brief alongside Sandy + relevant tools, closing the gap between "seeing an assignment" and "working on it."
> **Depends On:** Nothing — builds on existing assignment detail page and Sandy sidebar.
> **Estimated Size:** Large (1-2 sprints)
> **Deploy Order:** 8 of 10 — can be built independently but benefits from Blueprints 3 and 5

---

## Context

When a student sees an assignment on the homepage or course page and clicks "Continue" or the assignment title, they land on an assignment detail page that shows the description, rubric, and deadline. Then they're stuck: "Okay, now what? Where do I actually *do* this work?"

Multi-step assignments expose the platform's **tool fragmentation** problem. A student working on the Hallucination Hunt assignment might need to:
1. Read the assignment brief (assignment page)
2. Generate AI text to analyze (Sandy or external tool)
3. Research fact-checking methods (Research Hub)
4. Draft a 500-word analysis (Write Room or external editor)
5. Submit the finished work (unclear where)

These are 5 different tools in 5 different parts of the platform. The Assignment Workspace consolidates this into one view.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/assignments/[id]/workspace/page.tsx` | **New:** assignment workspace page |
| `app/components/assignments/AssignmentWorkspace.tsx` | **New:** split-screen workspace layout |
| `app/components/assignments/WorkspaceToolPanel.tsx` | **New:** right panel with tool tabs |
| `app/components/assignments/AssignmentBrief.tsx` | **New:** left panel showing assignment details |
| `app/components/assignments/SubmissionPanel.tsx` | **New:** inline submission form |
| `app/lib/assignment-workspace-service.ts` | **New:** assignment context builder for Sandy |
| `app/api/assignments/[id]/workspace/route.ts` | **New:** GET — assignment data + recommended tools |

### Key Files to Read

| File | Why |
|------|-----|
| `app/assignments/[id]/page.tsx` | Existing assignment detail page |
| `prisma/schema.prisma` | Assignment, Submission, GradebookEntry models |
| `app/components/SandyInterviewPanel.tsx` | Sandy panel pattern to reuse |
| `app/lib/agent/agent-system-prompt.ts` | Sandy context injection patterns |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Assignment Workspace                            [← Back]   │
├──────────────────────────┬──────────────────────────────────┤
│                          │  [Sandy] [Notes] [Draft] [Submit]│
│  ASSIGNMENT BRIEF        │  ────────────────────────────────│
│                          │                                   │
│  Hallucination Hunt      │  Sandy:                          │
│  TEK-100 · Due Mar 28    │  "I see you're working on the   │
│                          │   Hallucination Hunt. This asks  │
│  Description:            │   you to identify AI             │
│  Find 3 examples of AI   │   hallucinations. Want me to    │
│  hallucination in        │   help you find examples?"      │
│  generated text...       │                                   │
│                          │  [Find examples] [Explain rubric]│
│  Rubric:                 │  [Outline my response]           │
│  - Accuracy (30%)        │                                   │
│  - Analysis depth (40%)  │  You: "Yes, let's find examples" │
│  - Writing quality (30%) │                                   │
│                          │  Sandy:                          │
│  Attachments:            │  "I'll generate 3 passages on    │
│  📎 example-rubric.pdf   │   different topics..."           │
│                          │                                   │
│  Status: Not submitted   │                                   │
│  [Start Draft →]         │                                   │
│                          │                                   │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Feature 1: Assignment Brief Panel (Left Side)

### What

A persistent left panel (5/12 columns on desktop) showing the full assignment details. This stays visible while the student works in the right panel.

### Content

```typescript
interface AssignmentBriefData {
  assignment: {
    title: string
    courseCode: string
    courseName: string
    description: string           // Full assignment description (markdown)
    dueAt: string                 // ISO date
    dueLabel: string              // "Due in 3 days"
    urgency: 'critical' | 'warning' | 'info'
    rubric: RubricItem[] | null   // Rubric criteria with weights
    attachments: Attachment[]     // Linked files
    maxScore: number | null
  }
  submission: {
    status: 'not-started' | 'draft' | 'submitted' | 'graded'
    submittedAt: string | null
    grade: string | null
    feedback: string | null
  }
  relatedConcepts: string[]       // Concepts from the course that relate to this assignment
}
```

### UI Details

- Assignment title as h1
- Course badge (code + name)
- Due date with urgency color and countdown
- Description rendered as markdown (support for formatted instructions)
- Rubric as a table if provided (criterion | weight | description)
- Attachments as downloadable links
- Submission status badge at bottom
- "Start Draft" button if not started (opens Draft tab in right panel)
- Scrollable independently of right panel

---

## Feature 2: Tool Panel (Right Side)

### What

A tabbed right panel (7/12 columns on desktop) with context-aware tools for working on the assignment.

### Tabs

```typescript
const WORKSPACE_TABS = [
  {
    id: 'sandy',
    label: 'Sandy',
    icon: 'sparkles',
    description: 'AI assistant with full assignment context'
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: 'sticky-note',
    description: 'Scratchpad for research and brainstorming'
  },
  {
    id: 'draft',
    label: 'Draft',
    icon: 'file-text',
    description: 'Write and edit your submission'
  },
  {
    id: 'submit',
    label: 'Submit',
    icon: 'send',
    description: 'Review and submit your work'
  },
]
```

### Tab: Sandy (AI Assistant)

A Sandy chat interface pre-loaded with full assignment context:

```typescript
// System prompt injection for workspace Sandy:
const assignmentContext = `
The student is working on the following assignment:
- Title: ${assignment.title}
- Course: ${assignment.courseCode} — ${assignment.courseName}
- Due: ${assignment.dueLabel}
- Description: ${assignment.description}
- Rubric: ${formatRubric(assignment.rubric)}
- Student's current draft: ${currentDraft || 'No draft yet'}
- Related concepts: ${relatedConcepts.join(', ')}

Help the student complete this assignment. You can:
1. Explain the assignment requirements
2. Break down the rubric criteria
3. Help brainstorm and outline
4. Generate examples or reference material
5. Review their draft against the rubric
6. Suggest improvements

Do NOT write the entire assignment for the student. Guide them through the thinking process.
`
```

**Quick-reply chips** appear on first load:
- "Explain the rubric"
- "Help me outline my response"
- "What are the key concepts I need?"
- "Review my draft"

**Sandy "Use This" action**: Every Sandy response has a small action menu:
- "Copy to clipboard"
- "Add to notes"
- "Insert into draft"

This solves the problem of Sandy's outputs being trapped in the chat log.

### Tab: Notes (Scratchpad)

A simple rich-text editor for brainstorming, research notes, and outlines:

```typescript
// Minimal editor — not a full word processor
// Features: headings, bold/italic, bullet lists, links
// Auto-saves to localStorage keyed by assignment ID
// "Import from Sandy" button that copies the last Sandy response

interface WorkspaceNotes {
  assignmentId: string
  content: string               // Markdown or simple HTML
  lastSaved: string             // ISO timestamp
}

// Storage: localStorage for now (fast, no API needed)
// Future: persist to database for cross-device access
```

### Tab: Draft (Writing)

A focused writing editor for the actual submission:

```typescript
// Writing editor features:
// - Word count (shown against assignment's word limit if specified)
// - Character count
// - Basic formatting (bold, italic, headings, lists)
// - Auto-save every 30 seconds
// - "Ask Sandy to review" button that sends the draft to Sandy tab with
//   "Review this draft against the rubric" pre-filled

interface WorkspaceDraft {
  assignmentId: string
  content: string
  wordCount: number
  lastSaved: string
}

// Storage: localStorage initially, with explicit "Save to server" for persistence
// The draft content should also be available to Sandy (injected into context)
```

### Tab: Submit

A submission review and upload panel:

```typescript
// Submit tab shows:
// 1. Preview of the draft (read-only rendered markdown)
// 2. Rubric self-check: "Before submitting, confirm:"
//    ☐ I addressed accuracy (30%)
//    ☐ I provided analysis depth (40%)
//    ☐ I checked writing quality (30%)
// 3. File attachment upload (if assignment accepts files)
// 4. [Submit] button — creates a Submission record

// POST /api/assignments/{id}/submit
// Body: { content: string, attachments?: File[] }
// Creates: Submission with status SUBMITTED
```

---

## Feature 3: Sandy Workflow Scaffolding

### What

When a student first opens the workspace for an assignment they haven't started, Sandy proactively suggests a workflow based on the assignment type.

### Assignment Type Detection

Sandy (Haiku) analyzes the assignment description and rubric to determine a suggested workflow:

```typescript
// In assignment-workspace-service.ts

export async function suggestWorkflow(assignment: Assignment): Promise<WorkflowSuggestion> {
  // Heuristic first (no AI call needed for common patterns):
  const desc = assignment.description.toLowerCase()

  if (desc.includes('essay') || desc.includes('write') || desc.includes('analysis')) {
    return {
      steps: [
        { label: 'Outline your argument', tab: 'notes' },
        { label: 'Research key points with Sandy', tab: 'sandy' },
        { label: 'Write your draft', tab: 'draft' },
        { label: 'Ask Sandy to review against rubric', tab: 'sandy' },
        { label: 'Polish and submit', tab: 'submit' },
      ],
      estimatedMinutes: 90
    }
  }

  if (desc.includes('quiz') || desc.includes('exam') || desc.includes('questions')) {
    return {
      steps: [
        { label: 'Review key concepts with Sandy', tab: 'sandy' },
        { label: 'Take notes on tricky areas', tab: 'notes' },
        { label: 'Submit when ready', tab: 'submit' },
      ],
      estimatedMinutes: 30
    }
  }

  // Fallback: ask Haiku for a suggested workflow
  // (only for novel assignment types)
}
```

The workflow renders as a **step indicator** (dot-based, like the existing `StepIndicator.tsx` component) at the top of the right panel.

---

## Feature 4: Entry Points

### From Homepage

Modify course cards and Sandy's briefing to link to the workspace:

```tsx
// In course card "Continue" button:
// Instead of: href={`/courses/${courseId}`}
// New: href={`/assignments/${assignmentId}/workspace`} if there's an active assignment
// Fallback: href={`/courses/${courseId}`} if no active assignment

// In Sandy's "Coming Up" deadlines:
// Each deadline links to: /assignments/{id}/workspace
```

### From Assignment Detail Page

Add a prominent "Open Workspace" button on the existing `/assignments/[id]` page:

```tsx
<Link href={`/assignments/${assignmentId}/workspace`}
  className="bg-[#0033A0] text-white px-6 py-3 rounded-xl font-semibold">
  Open Workspace
</Link>
```

### From Sandy

When a student asks Sandy about an assignment in the global concierge, Sandy can suggest:
"Would you like to open the workspace for this assignment?" with a link.

---

## Responsive Design

### Desktop (lg+)

Split-screen: 5/12 left (brief) + 7/12 right (tools). Both panels scroll independently. Standard Sandy panel is **hidden** when workspace is open (the workspace has its own Sandy instance with assignment context).

### Tablet (md)

Stacked: Brief collapses to a **sticky header summary** (title + due date + progress) with a "Show details" toggle. Tool panel takes full width.

### Mobile (sm)

Tabbed full-screen: Brief is one tab, Sandy/Notes/Draft/Submit are other tabs. Bottom tab bar for navigation. This is essentially the same content in a different layout.

---

## Edge Cases

- **Assignment has no rubric**: Hide rubric section in brief. Sandy still guides based on description.
- **Assignment already submitted**: Show "Submitted" status. Draft tab becomes read-only. Sandy can still help with revisions if resubmission is allowed.
- **Assignment graded**: Show grade + feedback. Sandy can help the student understand feedback: "Explain why I lost points on analysis depth."
- **Group assignment**: Show group members. Draft is shared (future: real-time collaboration).
- **Assignment requires file upload only (no text)**: Hide Draft tab. Submit tab focuses on file upload.
- **Student navigates away mid-draft**: Auto-saved to localStorage. Restored on return.

---

## API: GET /api/assignments/[id]/workspace

Returns all data needed to render the workspace:

```typescript
export const GET = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, courseCode: true, title: true } },
      submissions: {
        where: { studentId: auth.user.id },
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    }
  })

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify student is enrolled in the course
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: auth.user.id, courseId: assignment.courseId }
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  // Get related concepts for Sandy context
  const concepts = await prisma.conceptState.findMany({
    where: {
      userId: auth.user.id,
      courseId: assignment.courseId,
      effectiveMastery: { lt: 0.5 }
    },
    select: { conceptName: true, effectiveMastery: true },
    take: 5
  })

  // Suggest workflow
  const workflow = await suggestWorkflow(assignment)

  return NextResponse.json({
    assignment: { ...assignment, submission: assignment.submissions[0] || null },
    relatedConcepts: concepts.map(c => c.conceptName),
    workflow
  })
})
```

---

## What This Does NOT Do

- Does not replace the existing assignment detail page (that stays for quick viewing)
- Does not build a full word processor (the draft editor is simple markdown — not Google Docs)
- Does not implement real-time collaboration (that's a future enhancement for group assignments)
- Does not auto-grade (submission goes to the existing grading pipeline)
- Does not write the assignment for the student (Sandy is instructed to guide, not generate)

---

## Success Criteria

A student can go from "I see this assignment on my homepage" to "I'm actively working on it with Sandy's help" in **two clicks** (homepage → workspace), and complete the entire assignment workflow (research → outline → draft → review → submit) **without leaving the workspace page**.
