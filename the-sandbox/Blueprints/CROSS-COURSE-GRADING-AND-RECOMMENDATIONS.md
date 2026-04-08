# Blueprint: Cross-Course Grading Queue & Recommendation Document Flow

> **Sprint Scope:** Aggregated grading view across all courses + recommendation letter resume-draft with SharePoint/OneDrive integration.
> **Depends On:** Azure Graph integration (for OneDrive — can build grading queue first). Student Intelligence blueprint (for student snapshot).
> **Estimated Size:** Medium (1 sprint)

---

## Context

### Grading Problem
Faculty teach multiple courses. The current "Grade submissions" quick action links to **one course** (`firstCourseId`). If pending grades span TEK-301 and EDU-450, the faculty member must manually navigate to each course's gradebook. There's no unified grading inbox.

### Recommendation Problem
When a recommendation letter is IN_PROGRESS, there's no "Resume draft" action. The draft lives somewhere (Sandy conversation? A document?) but the homepage doesn't link back to it. With SharePoint/OneDrive integration coming (Azure Graph), drafts could live in OneDrive and be editable across sessions.

---

## Key Files

| File | Role |
|------|------|
| `app/components/faculty-home/QuickActionsStrip.tsx` | Update grading link to cross-course queue |
| `app/components/faculty-home/AttentionBar.tsx` | Update grading badge to link to queue |
| `app/components/faculty-home/RecommendationTable.tsx` | Add resume draft + OneDrive link |
| `app/api/faculty/grading-queue/route.ts` | New: cross-course grading endpoint |
| `app/components/faculty-home/GradingQueue.tsx` | New: cross-course grading UI |
| `app/lib/faculty/recommendation-draft-service.ts` | New: draft management |

---

## Feature 1: Cross-Course Grading Queue

### What
A unified view of all pending submissions across all courses, sorted by urgency.

### API Endpoint

```typescript
// GET /api/faculty/grading-queue
// Auth: requireEducatorUser
// Returns: all pending gradebook entries across courses taught by authenticated user

interface GradingQueueResponse {
  items: Array<{
    id: string
    studentName: string
    assignmentTitle: string
    courseCode: string
    courseId: string
    submittedAt: string
    status: 'AI_DRAFT' | 'PENDING_REVIEW'
    hasAiDraft: boolean
    aiDraftSummary?: string  // First 100 chars of AI feedback
    daysWaiting: number
  }>
  summary: {
    total: number
    aiDrafted: number      // Quick review possible
    manualReview: number   // Needs manual attention
    oldestDays: number     // How stale the queue is
  }
}
```

### Query
```typescript
const entries = await prisma.gradebookEntry.findMany({
  where: {
    assignment: {
      course: { instructorId: authenticatedUserId }
    },
    status: { in: ['AI_DRAFT', 'PENDING_REVIEW'] }
  },
  include: {
    student: { select: { name: true } },
    assignment: {
      select: { title: true, course: { select: { courseCode: true, id: true } } }
    }
  },
  orderBy: [
    { status: 'asc' },        // PENDING_REVIEW before AI_DRAFT (needs more attention)
    { submittedAt: 'asc' }    // Oldest first
  ]
})
```

### UI Options

**Option A: Modal Queue (lightweight)**
- "Grade submissions" quick action opens a modal/drawer on the homepage
- Shows the queue list with course code badges
- Click any item → navigates to that course's gradebook with the submission selected
- Summary header: "12 pending: 8 AI-drafted (quick review), 4 manual"

**Option B: Dedicated Page**
- `/grading` — full-page cross-course grading interface
- Inline grade review (approve AI draft, edit feedback, submit grade) without navigating to individual courses
- Filter by course, status, age

**Recommended: Option A first (modal), Option B as future enhancement.**

### Homepage Integration
- **AttentionBar:** "3 pending grades" badge → clicks to open grading queue modal
- **QuickActionsStrip:** "Grade submissions" → opens grading queue modal (instead of first course link)
- **Effort hint** (from Homepage Intelligence blueprint): "3 pending: 2 AI-drafted, 1 manual"

---

## Feature 2: Recommendation Draft Management

### What
Recommendation letters go through a lifecycle: requested → drafting → reviewing → submitted. Currently, IN_PROGRESS letters have no "pick up where I left off" mechanism.

### Draft Storage

**Phase 1: Platform-native drafts**
```prisma
model RecommendationDraft {
  id                String   @id @default(cuid())
  recommendationId  String   @unique
  recommendation    RecommendationRequest @relation(fields: [recommendationId], references: [id])

  content           String   // Markdown draft content
  sandySessionId    String?  // Link to Sandy conversation that generated it
  lastEditedAt      DateTime @updatedAt
  version           Int      @default(1)

  // Future: OneDrive sync
  oneDriveFileId    String?  // When Azure Graph is live
  oneDriveUrl       String?  // Direct link to OneDrive doc
  lastSyncedAt      DateTime?
}
```

**Phase 2: OneDrive sync (when Azure Graph is live)**
- On first draft creation, optionally create a Word doc in OneDrive
- Two-way sync: edits in the platform update OneDrive, and vice versa
- "Open in Word" button for faculty who prefer Word
- Uses `SharePoint/OneDrive` integration from the Azure roadmap

### Resume Draft Flow

1. Faculty sees recommendation in table: "Alex Chen — IN_PROGRESS"
2. New button appears: **"Resume draft"**
3. Click → opens Sandy with the draft loaded as context
4. Sandy: "Here's your draft for Alex Chen's MIT recommendation. Last edited Mar 20. Want to continue refining it?"
5. Faculty edits via Sandy conversation
6. Sandy saves updated draft to `RecommendationDraft`

### UI Enhancement to RecommendationTable

```
Alex Chen — PhD, MIT EECS — IN_PROGRESS — Due Apr 1 (6 days)
  [📝 Resume draft]  [👤 Student snapshot]  [📄 Open in OneDrive]
  Last edited: Mar 20 — v2 — 487 words
```

- "Resume draft" → opens Sandy with draft context
- "Student snapshot" → expands student briefing card (from Student Intelligence blueprint)
- "Open in OneDrive" → opens OneDrive link (grayed out until Azure Graph integration)

### Sandy Integration

```typescript
// Extend draft_recommendation Sandy tool
{
  name: 'draft_recommendation',
  // When resuming, inject existing draft into context:
  contextInjection: async (params) => {
    if (params.recommendationId) {
      const draft = await getDraft(params.recommendationId)
      return {
        existingDraft: draft?.content,
        studentSnapshot: await getStudentBriefing(draft.recommendation.studentId),
        version: draft?.version
      }
    }
  }
}
```

---

## Feature 3: OneDrive Document Integration (Future — Azure Graph)

### What
When Azure Graph credentials are available, recommendation drafts (and potentially other documents) sync to OneDrive.

### Architecture
```
Faculty creates draft in Sandy
    ↓
RecommendationDraft saved to Prisma
    ↓ (if Azure Graph configured)
GraphDocumentProvider.createDocument({
  folder: 'Sandbox/Recommendations',
  fileName: `Recommendation - ${studentName} - ${purpose}.docx`,
  content: markdownToDocx(draft.content)
})
    ↓
oneDriveFileId + oneDriveUrl saved to draft record
    ↓
"Open in Word" button becomes active on homepage
```

### Sync Strategy
- **Write:** Sandy draft → OneDrive (on save)
- **Read:** OneDrive → Sandy (on resume, if oneDriveFileId exists, fetch latest from Graph)
- **Conflict:** If both modified, show diff and let faculty choose which version to keep
- **Offline:** If Graph is down, save to Prisma only, sync when available

### Provider Pattern (consistent with existing integration architecture)
```typescript
// In app/lib/integrations/
function getDocumentProvider(): DocumentProvider {
  if (graphCredentialsPresent) return new GraphDocumentProvider()
  return new LocalDocumentProvider()  // Prisma-only storage
}
```

---

## Acceptance Criteria

- [ ] Cross-course grading queue API returns all pending entries for authenticated educator
- [ ] Grading queue modal accessible from AttentionBar and QuickActionsStrip
- [ ] Queue shows: student name, assignment, course code, status, days waiting
- [ ] Summary shows total count split by AI-drafted vs manual review
- [ ] RecommendationDraft model created
- [ ] "Resume draft" button on IN_PROGRESS recommendations opens Sandy with draft context
- [ ] Draft versioning (increment on each save)
- [ ] Student snapshot expandable on recommendation rows
- [ ] OneDrive integration stub ready (grayed out button, provider pattern in place)
- [ ] Demo seed data: 2-3 recommendation drafts in various stages

---

## Migration Notes

- New `RecommendationDraft` model requires Prisma migration
- If `RecommendationRequest` model doesn't exist yet, create it alongside the draft model
- Existing Sandy `draft_recommendation` tool needs context injection for resume flow
- No breaking changes to existing grading flow — this adds a new aggregation layer on top
