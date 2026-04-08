# Faculty Homepage v2 — Architecture

**Status:** Approved — ready to execute
**Date:** 2026-03-24
**Scope:** Enhance faculty homepage from teaching-only dashboard to full faculty workday surface
**Demo user:** Katie Thompson (katie.thompson@uky.edu, EDUCATOR, owns TEK-100)
**Depends on:** Student Homepage v2 (complete), Staff Experience (complete), Sandy Universal Agent (complete)

---

## 1. Vision

The current faculty homepage covers **one of four buckets** of a professor's daily life: teaching. A real faculty member also advises students, serves on committees, manages recommendation letters, juggles grading deadlines, and needs quick access to frequent actions — all before lunch.

Faculty Homepage v2 transforms the homepage from a "teaching dashboard" into **the single screen a faculty member opens every morning**. The design philosophy: *if Katie has to leave this page to know what needs her today, we failed.*

**Evaluator impact:** A provost or dean watching Katie's demo should see a faculty member whose entire professional life — teaching, advising, service, communication — is orchestrated by a single intelligent surface.

---

## 2. Current State

| Zone | Component | Status |
|------|-----------|--------|
| Attention Bar | `AttentionBar.tsx` | Keep, enhance |
| Your Day (Email + Calendar + Tasks) | `EmailBrief.tsx`, `CalendarBrief.tsx`, `TaskBrief.tsx` | Keep as-is |
| Teaching Intelligence | Course health cards, `EngagementTrendCard`, `ConceptGapsCard` | Keep, tighten |
| My Students (advising) | — | **New** |
| Service & Committees | — | **New** |
| Quick Actions Strip | — | **New** |

---

## 3. Product Spec

### 3.1 Zone 1 — Attention Bar (Enhanced)

**Goal:** Surface everything that needs Katie *right now*, not just emails and tasks.

**Current items (keep):**
- Urgent emails (decision-bucket)
- Overdue tasks
- Pending grades by course

**New items to add:**

| Item | Icon | Color | Condition | Action |
|------|------|-------|-----------|--------|
| Grading queue | `ClipboardCheck` | amber | Any `GradebookEntry` with status `AI_DRAFT` older than 48h | Link to `/courses/[id]/gradebook?status=pending` |
| Advisee hold alert | `ShieldAlert` | red | Any advisee with active registration hold | Link to advisee card in My Students zone |
| Committee action due | `Gavel` | purple | Any `CommitteeActionItem` assigned to user due within 3 days | Link to Service & Committees zone |
| Recommendation deadline | `FileSignature` | blue | Any `RecommendationRequest` due within 7 days | Link to My Students zone |

**Urgency algorithm update:**
```
urgent = urgentEmails.length + overdueTasks.length + pendingGrades.length
       + staleGradingQueue.length + adviseeHolds.length
       + committeeActionsDueSoon.length + recsComingDue.length
```

All-clear state triggers only when `urgent === 0`.

### 3.2 Zone 2 — Your Day (No Changes)

Email (2/3 width) + Calendar & Tasks (1/3 stacked). Already working well. No modifications needed.

### 3.3 Zone 3 — Teaching Intelligence (Minor Tighten)

**Changes:**
- Cap course health cards at 3 (down from 4) to leave room for new zones below
- Add "View all courses" link if educator has > 3 courses
- Engagement trend and concept gaps: no changes

### 3.4 Zone 4 — My Students (NEW)

**Goal:** Roll up everything about the humans Katie is responsible for — advisees, flagged students, office hours, recommendation letters.

**Layout:** 2-column grid on `lg+`, single column on mobile.

#### 4a. Advisee Snapshot (left column)

```
┌─────────────────────────────────────────┐
│ 👤 My Advisees                    23 total │
│                                           │
│ Registration window: Apr 7–11             │
│ 2 advisees have holds  ⚠                  │
│ 3 need degree audit review                │
│                                           │
│ [View all advisees →]                     │
└─────────────────────────────────────────┘
```

**Data source:** New `FacultyAdvisee` model (or synthetic fallback for demo).

**Card design:**
- `rounded-2xl border-2 border-gray-200 bg-white p-6`
- Header: `Users` icon + "My Advisees" + count badge
- Stat rows: registration window date, holds count (red if > 0), audit reviews needed
- Footer link: scrolls to full advisee list (future: dedicated `/advisees` page)

#### 4b. Office Hours & Student Flags (right column)

```
┌─────────────────────────────────────────┐
│ 🕐 Office Hours Today         2:00–3:30 PM │
│                                           │
│ Queue: 3 students waiting                 │
│ Top theme: "Midterm review — Module 5"    │
│                                           │
│ ── Flagged Students (4) ──────────────── │
│ • J. Martinez — grade drop, TEK-100      │
│ • A. Chen — 14 days inactive             │
│ • R. Okafor — accommodation flag         │
│ • M. Singh — missed 3 classes            │
│                                           │
│ [Open office hours →]                     │
└─────────────────────────────────────────┘
```

**Data sources:**
- Office hours: existing `OfficeHoursQuestion` model + `AssistantCalendarEvent` for today's OH slot
- Flagged students: existing `StudentProfile.riskScore` + new flag types (accommodation, attendance)
- Top theme: existing `OfficeHoursCluster` model

#### 4c. Recommendation Letters (below, full width)

```
┌──────────────────────────────────────────────────────────────────┐
│ ✍️ Recommendation Letters                               3 active │
│                                                                  │
│ Sarah Kim      — PhD program (MIT)         Due: Apr 1  ⚠ 8 days │
│ James Oduya    — Scholarship (UK Honors)   Due: Apr 15           │
│ Priya Patel    — Internship (Google)       Due: Apr 20           │
│                                                                  │
│ [+ New request]                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Data source:** New `RecommendationRequest` model.

**Design:**
- Table rows with student name, purpose, target institution, due date
- Due-date badge turns amber within 14 days, red within 7 days
- "+ New request" button opens Sandy-assisted letter drafting flow

### 3.5 Zone 5 — Service & Committees (NEW)

**Goal:** Surface Katie's non-teaching obligations — committee work, department announcements, assessment deadlines.

**Layout:** 3-column grid on `lg+`, stacked on mobile.

#### 5a. My Committees

```
┌────────────────────────────────────┐
│ ⚖️ My Committees              2 active │
│                                        │
│ Curriculum Committee                   │
│ Next: Mar 28, 3:00 PM                 │
│ 1 action item due before meeting       │
│                                        │
│ Assessment & Accreditation             │
│ Next: Apr 2, 10:00 AM                 │
│ Unread minutes from last meeting       │
│                                        │
│ [View committees →]                    │
└────────────────────────────────────┘
```

**Data source:** Existing `Committee` + `CommitteeMeeting` models. New `CommitteeActionItem` model for assigned actions. Filter committees where `members` JSON array contains Katie's userId.

#### 5b. Department Feed

```
┌────────────────────────────────────┐
│ 📋 Department Updates          3 new │
│                                      │
│ Chair: "Spring grades due May 5"     │
│ 2 days ago                           │
│                                      │
│ Dean: "New lab space proposals"      │
│ 4 days ago                           │
│                                      │
│ [View all →]                         │
└────────────────────────────────────┘
```

**Data source:** Existing `Announcement` model filtered by `audienceRole` containing EDUCATOR + department match. Shows most recent 3.

#### 5c. Assessment & Compliance

```
┌────────────────────────────────────┐
│ 📊 Assessment Deadlines       2 upcoming │
│                                          │
│ SACSCOC Outcome Report                   │
│ Due: Apr 15  — TEK-100 data needed       │
│                                          │
│ Mid-semester grades                      │
│ Due: Mar 31  — 12 of 28 entered  ⚠      │
│                                          │
│ [View compliance portal →]               │
└────────────────────────────────────────┘
```

**Data source:** New `AssessmentDeadline` model (or synthetic demo data). Links to existing compliance portal for ADMIN, or course gradebook for grade deadlines.

### 3.6 Zone 6 — Quick Actions Strip (NEW)

**Goal:** One-tap access to the 5 things faculty do most often. Sits between Zone 1 (Attention Bar) and Zone 2 (Your Day).

**Layout:** Horizontal scrollable chip strip (same pattern as Student Homepage v2 mobile swipe strip).

```
[ 📝 Grade submissions (4) ] [ 📢 Post announcement ] [ 📋 Create assignment ] [ 🕐 Schedule office hours ] [ ✍️ Write recommendation ]
```

**Design:**
- Each chip: `rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold`
- Hover: `bg-[#0033A0] text-white` transition
- Badge count on "Grade submissions" showing pending `AI_DRAFT` entries
- Mobile: `overflow-x-auto snap-x snap-mandatory` with `scroll-padding`
- Actions:
  - Grade submissions → `/courses/[firstCourseId]/gradebook?status=pending`
  - Post announcement → triggers Sandy with `post_announcement` tool pre-loaded
  - Create assignment → `/courses` with create-assignment modal
  - Schedule office hours → triggers Sandy with `block_time` tool context
  - Write recommendation → triggers Sandy with letter drafting prompt

---

## 4. Data Models

### 4.1 New Models

```prisma
model RecommendationRequest {
  id            String   @id @default(cuid())
  facultyId     String
  faculty       User     @relation("FacultyRecommendations", fields: [facultyId], references: [id])
  studentName   String
  studentEmail  String?
  purpose       String   // "PhD program", "Scholarship", "Internship", "Job"
  targetOrg     String   // "MIT", "UK Honors", "Google"
  dueDate       DateTime
  status        RecommendationStatus @default(PENDING)
  notes         String?  // Faculty's private notes
  draftContent  String?  // Sandy-assisted draft (stored for resume)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([facultyId, status])
}

enum RecommendationStatus {
  PENDING
  IN_PROGRESS
  SUBMITTED
  DECLINED
}

model FacultyAdvisee {
  id              String   @id @default(cuid())
  facultyId       String
  faculty         User     @relation("FacultyAdvisees", fields: [facultyId], references: [id])
  studentId       String
  student         User     @relation("StudentAdvisor", fields: [studentId], references: [id])
  assignedAt      DateTime @default(now())
  primaryAdvisor  Boolean  @default(true)
  notes           String?

  @@unique([facultyId, studentId])
  @@index([facultyId])
}

model CommitteeActionItem {
  id            String   @id @default(cuid())
  committeeId   String
  committee     Committee @relation(fields: [committeeId], references: [id])
  meetingId     String?
  meeting       CommitteeMeeting? @relation(fields: [meetingId], references: [id])
  assigneeId    String
  assignee      User     @relation("CommitteeActions", fields: [assigneeId], references: [id])
  title         String
  description   String?
  dueDate       DateTime?
  status        ActionItemStatus @default(OPEN)
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  @@index([assigneeId, status])
  @@index([committeeId])
}

enum ActionItemStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  DEFERRED
}

model AssessmentDeadline {
  id            String   @id @default(cuid())
  title         String   // "SACSCOC Outcome Report", "Mid-semester grades"
  description   String?
  dueDate       DateTime
  scope         AssessmentScope
  courseId       String?  // null = institution-wide
  course        Course?  @relation(fields: [courseId], references: [id])
  departmentId  String?
  createdBy     String?
  status        AssessmentDeadlineStatus @default(UPCOMING)
  createdAt     DateTime @default(now())

  @@index([dueDate])
  @@index([courseId])
}

enum AssessmentScope {
  COURSE        // e.g., mid-semester grades
  DEPARTMENT    // e.g., program review
  INSTITUTION   // e.g., SACSCOC report
}

enum AssessmentDeadlineStatus {
  UPCOMING
  IN_PROGRESS
  SUBMITTED
  OVERDUE
}
```

### 4.2 User Model Additions

```prisma
model User {
  // ... existing fields ...

  // New relations
  recommendationRequests  RecommendationRequest[] @relation("FacultyRecommendations")
  advisees                FacultyAdvisee[]        @relation("FacultyAdvisees")
  advisorOf               FacultyAdvisee[]        @relation("StudentAdvisor")
  committeeActions        CommitteeActionItem[]   @relation("CommitteeActions")
}
```

### 4.3 Committee Model Addition

```prisma
model Committee {
  // ... existing fields ...
  actionItems   CommitteeActionItem[]
}

model CommitteeMeeting {
  // ... existing fields ...
  actionItems   CommitteeActionItem[]
}
```

---

## 5. API Routes

### 5.1 New Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/faculty/advisees` | GET | List faculty's advisees with hold/audit status | EDUCATOR, ADMIN |
| `/api/faculty/advisees/stats` | GET | Advisee summary: count, holds, registration window | EDUCATOR, ADMIN |
| `/api/faculty/recommendations` | GET | List recommendation requests for faculty | EDUCATOR, ADMIN |
| `/api/faculty/recommendations` | POST | Create new recommendation request | EDUCATOR, ADMIN |
| `/api/faculty/recommendations/[id]` | PATCH | Update status, draft content, notes | EDUCATOR, ADMIN |
| `/api/faculty/committees` | GET | List committees where user is a member + next meetings + action items | EDUCATOR, ADMIN |
| `/api/faculty/committees/actions` | GET | All action items assigned to user across committees | EDUCATOR, ADMIN |
| `/api/faculty/committees/actions/[id]` | PATCH | Mark action item complete/deferred | EDUCATOR, ADMIN |
| `/api/faculty/assessment-deadlines` | GET | Upcoming assessment/compliance deadlines for faculty's courses + department | EDUCATOR, ADMIN |
| `/api/faculty/homepage-data` | GET | Aggregated endpoint for all new Zone 4–6 data (single fetch) | EDUCATOR, ADMIN |

### 5.2 Modified Routes

| Route | Change |
|-------|--------|
| `/api/dashboard` | Add `gradingQueueStale` count (AI_DRAFT > 48h) to EDUCATOR response |
| `/api/briefing` | Add `adviseeHoldCount` and `committeeActionsDueSoon` to stats object |

### 5.3 Aggregated Homepage Endpoint

`GET /api/faculty/homepage-data` returns a single payload to minimize round-trips:

```typescript
interface FacultyHomepageV2Data {
  advisees: {
    total: number;
    withHolds: number;
    needsDegreeAudit: number;
    registrationWindow: { start: string; end: string } | null;
  };
  officeHours: {
    todaySlot: { start: string; end: string } | null;
    queueCount: number;
    topTheme: string | null;
  };
  flaggedStudents: Array<{
    id: string;
    name: string;
    flag: 'grade_drop' | 'inactive' | 'accommodation' | 'attendance';
    course: string;
    detail: string;
  }>;
  recommendations: Array<{
    id: string;
    studentName: string;
    purpose: string;
    targetOrg: string;
    dueDate: string;
    status: RecommendationStatus;
    daysUntilDue: number;
  }>;
  committees: Array<{
    id: string;
    name: string;
    nextMeeting: string | null;
    actionItemsDue: number;
    unreadMinutes: boolean;
  }>;
  departmentFeed: Array<{
    id: string;
    title: string;
    sender: string;
    createdAt: string;
  }>;
  assessmentDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    scope: AssessmentScope;
    courseCode: string | null;
    progress: string | null; // "12 of 28 entered"
  }>;
  quickActions: {
    pendingGradeCount: number;
    firstCourseId: string | null;
  };
}
```

---

## 6. Service Layer

### 6.1 New Services

| File | Purpose |
|------|---------|
| `app/lib/faculty/advisee-service.ts` | `getAdviseeStats(facultyId)`, `getAdviseeList(facultyId)` |
| `app/lib/faculty/recommendation-service.ts` | CRUD for recommendation requests, Sandy draft integration |
| `app/lib/faculty/committee-service.ts` | `getMyCommittees(userId)`, `getMyActionItems(userId)` — wraps existing Committee model |
| `app/lib/faculty/assessment-service.ts` | `getUpcomingDeadlines(facultyId)` — course + department + institution scope |
| `app/lib/faculty/homepage-aggregator.ts` | `getFacultyHomepageV2Data(userId)` — parallel calls to all services above |

### 6.2 Synthetic Fallback Data

For demo purposes, all new services return **synthetic fallback data** when no real records exist (same pattern as briefing service). This means:
- No schema migration required for demo to work
- Real data takes priority when it exists
- Fallback is clearly marked in code with `// SYNTHETIC FALLBACK` comments

Katie Thompson's synthetic data:
- **23 advisees**, 2 with holds, 3 needing audit review
- **Registration window:** Apr 7–11, 2026
- **3 recommendation requests** (Sarah Kim/MIT, James Oduya/UK Honors, Priya Patel/Google)
- **2 committees** (Curriculum, Assessment & Accreditation) with 1 action item each
- **4 flagged students** across TEK-100 (grade_drop, inactive, accommodation, attendance)
- **2 assessment deadlines** (SACSCOC report Apr 15, mid-semester grades Mar 31)
- **Office hours today** 2:00–3:30 PM with 3 in queue

---

## 7. Component Architecture

### 7.1 New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `QuickActionsStrip` | `app/components/faculty-home/QuickActionsStrip.tsx` | Horizontal action chip bar |
| `MyStudentsZone` | `app/components/faculty-home/MyStudentsZone.tsx` | Container for advisees + OH + flags + recs |
| `AdviseeSnapshot` | `app/components/faculty-home/AdviseeSnapshot.tsx` | Advisee stats card |
| `OfficeHoursCard` | `app/components/faculty-home/OfficeHoursCard.tsx` | Today's OH + queue + flags |
| `RecommendationTable` | `app/components/faculty-home/RecommendationTable.tsx` | Active rec letter table |
| `ServiceZone` | `app/components/faculty-home/ServiceZone.tsx` | Container for committees + dept + assessment |
| `CommitteeCard` | `app/components/faculty-home/CommitteeCard.tsx` | Committee list with actions |
| `DepartmentFeed` | `app/components/faculty-home/DepartmentFeed.tsx` | Recent dept announcements |
| `AssessmentDeadlines` | `app/components/faculty-home/AssessmentDeadlines.tsx` | Compliance/assessment deadlines |

### 7.2 Modified Components

| Component | Change |
|-----------|--------|
| `FacultyHomepage.tsx` | Add Zones 4–6, integrate new hook data, insert QuickActionsStrip |
| `AttentionBar.tsx` | Add grading queue, advisee holds, committee actions, rec deadlines to urgency calc |
| `useFacultyHome.ts` | Add fetch to `/api/faculty/homepage-data`, return `v2Data` field |

### 7.3 Updated Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Zone 1: Attention Bar (enhanced — grading, holds, actions)   │
├──────────────────────────────────────────────────────────────┤
│ Zone 6: Quick Actions Strip (grade, announce, assign, OH)    │
├──────────────────────────────────────────────────────────────┤
│ Zone 2: Your Day                                             │
│ ┌─────────────────────────────┬────────────────────────────┐ │
│ │ Email (2/3)                 │ Calendar (1/3)             │ │
│ │                             │ Tasks                      │ │
│ └─────────────────────────────┴────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ Zone 3: Teaching Intelligence                                │
│ ┌──────────┬──────────┬──────────┐                          │
│ │ Course 1 │ Course 2 │ Course 3 │  [View all →]           │
│ └──────────┴──────────┴──────────┘                          │
│ Engagement Trends    │    Concept Gaps                       │
├──────────────────────────────────────────────────────────────┤
│ Zone 4: My Students                                          │
│ ┌─────────────────────────────┬────────────────────────────┐ │
│ │ Advisee Snapshot            │ Office Hours + Flags       │ │
│ └─────────────────────────────┴────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Recommendation Letters (full width table)                 │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ Zone 5: Service & Committees                                 │
│ ┌──────────────────┬──────────────────┬──────────────────┐  │
│ │ My Committees    │ Dept Feed        │ Assessment Dates │  │
│ └──────────────────┴──────────────────┴──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Sandy Integration

### 8.1 New Sandy Tools

| Tool | Permission | Purpose |
|------|-----------|---------|
| `get_advisee_list` | auto | List faculty's advisees with status |
| `get_advisee_detail` | auto | Single advisee's full profile (holds, degree progress, courses) |
| `draft_recommendation` | confirm | Generate recommendation letter draft from student data + faculty notes |
| `get_committee_actions` | auto | List action items across committees |
| `complete_committee_action` | confirm | Mark committee action item complete |

### 8.2 Proactive Sandy Triggers

When Katie is on the homepage, Sandy's ambient context should include:
- "You have 4 submissions waiting for review in TEK-100"
- "Sarah Kim's recommendation for MIT is due in 8 days — want to start a draft?"
- "Curriculum Committee meets Thursday — you have 1 action item due before then"
- "2 advisees have registration holds. Want me to pull their details?"

These are generated from the same `/api/faculty/homepage-data` response, fed to Sandy via the existing `sandbox-briefing-ready` custom event.

---

## 9. Task Sequence

Each task is independent and can be executed in any order. Tasks are designed for Codex execution — each has a clear goal, file list, and acceptance criteria.

---

### Task 1: Schema & Seed — New Data Models

**Goal:** Add 4 new Prisma models and seed Katie Thompson's demo data.

**Files to create/modify:**
- `prisma/schema.prisma` — add `RecommendationRequest`, `FacultyAdvisee`, `CommitteeActionItem`, `AssessmentDeadline` models + enums + User relations
- `scripts/seed-faculty-v2.ts` — seed script for Katie's synthetic data (23 advisees, 3 recs, committee actions, assessment deadlines)
- `package.json` — add `"db:seed:faculty-v2": "tsx scripts/seed-faculty-v2.ts"` script

**Acceptance criteria:**
- `npx prisma migrate dev --name faculty-homepage-v2` succeeds
- `npx tsx scripts/seed-faculty-v2.ts` populates data without errors
- `npx tsc --noEmit` passes with 0 errors

---

### Task 2: Service Layer — Faculty Homepage Aggregator

**Goal:** Build the service layer that powers all new zones.

**Files to create:**
- `app/lib/faculty/advisee-service.ts`
- `app/lib/faculty/recommendation-service.ts`
- `app/lib/faculty/committee-service.ts`
- `app/lib/faculty/assessment-service.ts`
- `app/lib/faculty/homepage-aggregator.ts`

**Design:**
- Each service has a primary function + synthetic fallback
- `homepage-aggregator.ts` calls all 4 services in parallel via `Promise.allSettled`
- Returns `FacultyHomepageV2Data` interface (defined in Section 5.3)
- All functions take `userId: string` parameter
- Import Prisma from `../../generated/prisma`

**Acceptance criteria:**
- All services export typed functions
- `homepage-aggregator.ts` returns complete `FacultyHomepageV2Data`
- `npx tsc --noEmit` passes

---

### Task 3: API Route — `/api/faculty/homepage-data`

**Goal:** Single aggregated GET endpoint for all new homepage zones.

**Files to create:**
- `app/api/faculty/homepage-data/route.ts`

**Design:**
- Auth: `requireEducatorOrAdmin()`
- Calls `getFacultyHomepageV2Data(user.id)`
- Returns JSON response
- Standard error handling pattern (try/catch → 500)

**Files to modify:**
- `app/api/dashboard/route.ts` — add `gradingQueueStale` to EDUCATOR response
- `app/api/briefing/route.ts` — add `adviseeHoldCount`, `committeeActionsDueSoon` to stats

**Acceptance criteria:**
- `GET /api/faculty/homepage-data` with `x-demo-user-email: katie.thompson@uky.edu` returns complete payload
- Modified routes include new fields
- `npx tsc --noEmit` passes

---

### Task 4: Quick Actions Strip Component

**Goal:** Horizontal scrollable action chip bar between Attention Bar and Your Day.

**Files to create:**
- `app/components/faculty-home/QuickActionsStrip.tsx`

**Design:**
```tsx
// Chip data
const actions = [
  { label: 'Grade submissions', icon: ClipboardCheck, badge: pendingGradeCount, href: gradebookUrl },
  { label: 'Post announcement', icon: Megaphone, sandyTool: 'post_announcement' },
  { label: 'Create assignment', icon: FilePlus, href: '/courses' },
  { label: 'Schedule office hours', icon: Clock, sandyTool: 'block_time' },
  { label: 'Write recommendation', icon: FileSignature, sandyTool: 'draft_recommendation' },
];
```

- Container: `flex gap-3 overflow-x-auto py-3 snap-x snap-mandatory scrollbar-hide`
- Each chip: `flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 whitespace-nowrap snap-start hover:bg-[#0033A0] hover:text-white hover:border-[#0033A0] transition-colors cursor-pointer`
- Badge: `ml-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold` (only if count > 0)
- Sandy tool actions: dispatch `sandbox-sandy-tool` custom event with tool name
- href actions: use `next/link`

**Acceptance criteria:**
- Renders 5 chips horizontally
- Badge shows pending grade count
- Scrollable on mobile with snap points
- Hover state uses UK blue
- `npx tsc --noEmit` passes

---

### Task 5: My Students Zone — Advisee Snapshot + Office Hours + Flags

**Goal:** Build Zone 4 left and right columns (advisees, office hours, flagged students).

**Files to create:**
- `app/components/faculty-home/MyStudentsZone.tsx` — container
- `app/components/faculty-home/AdviseeSnapshot.tsx` — advisee stats card
- `app/components/faculty-home/OfficeHoursCard.tsx` — OH queue + flagged students

**Design:**
- `MyStudentsZone`: section header "My Students" with `Users` icon, then `grid grid-cols-1 lg:grid-cols-2 gap-6`
- `AdviseeSnapshot`: standard card (`rounded-2xl border-2 border-gray-200 bg-white p-6`), `Users` icon header, stat rows with conditional red/green coloring, footer link
- `OfficeHoursCard`: standard card, split into OH section (top) and flagged students section (bottom with divider). Flag types: `grade_drop` (TrendingDown, red), `inactive` (Clock, amber), `accommodation` (Shield, blue), `attendance` (UserX, orange)
- Both components receive data from `FacultyHomepageV2Data` as props

**Acceptance criteria:**
- Renders 2-column layout on desktop, stacked on mobile
- Advisee card shows count, holds (red highlight), registration window
- OH card shows today's slot time, queue count, top theme
- Flagged students list shows icon + name + flag type + course
- `npx tsc --noEmit` passes

---

### Task 6: My Students Zone — Recommendation Letters Table

**Goal:** Build the recommendation letters table (Zone 4 bottom, full width).

**Files to create:**
- `app/components/faculty-home/RecommendationTable.tsx`

**Design:**
- Standard card, full width below the 2-column grid
- Header: `FileSignature` icon + "Recommendation Letters" + count badge
- Table rows: student name, purpose (italic), target org, due date with urgency badge
- Due date badge: green (> 14 days), amber (7–14 days), red (< 7 days)
- "+ New request" button at bottom (secondary style)
- Empty state: "No active recommendation requests" with subdued text

**Acceptance criteria:**
- Renders 3 recommendation rows from demo data
- Due date badges color-coded correctly
- Responsive: horizontal scroll on mobile if needed
- `npx tsc --noEmit` passes

---

### Task 7: Service & Committees Zone

**Goal:** Build Zone 5 — committees, department feed, assessment deadlines.

**Files to create:**
- `app/components/faculty-home/ServiceZone.tsx` — container
- `app/components/faculty-home/CommitteeCard.tsx`
- `app/components/faculty-home/DepartmentFeed.tsx`
- `app/components/faculty-home/AssessmentDeadlines.tsx`

**Design:**
- `ServiceZone`: section header "Service & Committees" with `Briefcase` icon, then `grid grid-cols-1 lg:grid-cols-3 gap-6`
- `CommitteeCard`: standard card, list of committees with next meeting date, action items due (amber badge if > 0), unread minutes indicator (blue dot)
- `DepartmentFeed`: standard card, list of recent announcements (max 3) with sender role, title, relative timestamp. Footer: "View all" link
- `AssessmentDeadlines`: standard card, list of upcoming deadlines with scope badge (course/dept/institution), due date, progress string if applicable

**Acceptance criteria:**
- 3-column layout on desktop, stacked on mobile
- Committee action items show amber badge
- Department feed shows relative timestamps
- Assessment deadlines show scope-colored badges
- `npx tsc --noEmit` passes

---

### Task 8: Attention Bar Enhancement

**Goal:** Add new urgency items to AttentionBar — grading queue, advisee holds, committee actions, rec deadlines.

**Files to modify:**
- `app/components/faculty-home/AttentionBar.tsx`

**Design:**
- Add 4 new pill types to the urgent items array:
  - Grading queue: `ClipboardCheck` icon, amber, "N submissions need review"
  - Advisee holds: `ShieldAlert` icon, red, "N advisees have holds"
  - Committee actions: `Gavel` icon, purple, "N committee actions due"
  - Rec deadlines: `FileSignature` icon, blue, "N recs due within 7 days"
- Update all-clear condition to include new counts
- New items receive data from `v2Data` prop added to AttentionBar

**Acceptance criteria:**
- All 4 new pill types render correctly when counts > 0
- All-clear state only shows when ALL counts are 0
- Existing pills unchanged
- `npx tsc --noEmit` passes

---

### Task 9: Homepage Integration — Wire Everything Together

**Goal:** Integrate all new zones into FacultyHomepage and update the data hook.

**Files to modify:**
- `app/hooks/useFacultyHome.ts` — add fetch to `/api/faculty/homepage-data`, return `v2Data`
- `app/components/faculty-home/FacultyHomepage.tsx` — add QuickActionsStrip (after Zone 1), MyStudentsZone (after Zone 3), ServiceZone (after Zone 4), pass v2Data to AttentionBar

**Design:**
- Hook adds 5th parallel fetch to existing `Promise.allSettled`
- `FacultyHomepage` renders new zones with skeleton loading states
- Zone order: Attention Bar → Quick Actions → Your Day → Teaching Intelligence → My Students → Service & Committees
- Each new zone wrapped in section with `mt-8` spacing
- Skeleton: same pattern as existing zones (pulsing gray rectangles)

**Acceptance criteria:**
- Faculty homepage renders all 6 zones
- Loading skeletons show while data loads
- No regressions to existing zones
- Cold start hero still works for 0-course educators
- Executive briefing still works for admin
- `npx tsc --noEmit` passes

---

### Task 10: Sandy Tools — Advisee & Recommendation Support

**Goal:** Register new Sandy tools for advisee lookup and recommendation drafting.

**Files to create:**
- `app/lib/agent/tools/faculty-tools.ts` — `get_advisee_list`, `get_advisee_detail`, `draft_recommendation`, `get_committee_actions`, `complete_committee_action`

**Files to modify:**
- `app/lib/agent/tool-registry.ts` — register new faculty tools with EDUCATOR + ADMIN permissions

**Design:**
- `get_advisee_list`: returns advisee list with hold/audit status
- `get_advisee_detail`: returns single advisee detail (courses, holds, degree progress)
- `draft_recommendation`: takes studentName + purpose + targetOrg + facultyNotes, generates letter via Haiku
- `get_committee_actions`: returns action items across all committees
- `complete_committee_action`: marks action item complete (requires confirm)

**Acceptance criteria:**
- All 5 tools registered in tool registry
- EDUCATOR and ADMIN roles can access all 5
- `draft_recommendation` requires `confirm` permission
- `complete_committee_action` requires `confirm` permission
- `npx tsc --noEmit` passes

---

### Task 11: Seed Data Hardening & Demo Polish

**Goal:** Ensure Katie Thompson's demo experience is compelling with realistic data.

**Files to modify:**
- `scripts/seed-faculty-v2.ts` — enhance with realistic names, dates, institutions
- Verify all synthetic fallback data in services matches seed data

**Demo data specifics:**
- Advisees: 23 students, mix of freshmen–seniors, 2 with FERPA/financial holds, 3 needing senior audit
- Recommendations: Sarah Kim (MIT CS PhD, due Apr 1), James Oduya (UK Honors scholarship, due Apr 15), Priya Patel (Google STEP internship, due Apr 20)
- Committees: Curriculum Committee (meets Thursdays, 1 action: "Review TEK-100 syllabus update"), Assessment & Accreditation (meets biweekly, 1 action: "Submit SACSCOC data")
- Department feed: 3 recent announcements from chair/dean
- Office hours: Today 2:00–3:30 PM, 3 students in queue, top theme "Midterm review"
- Assessment deadlines: SACSCOC report (Apr 15), mid-semester grades (Mar 31, 12/28 entered)

**Acceptance criteria:**
- Full demo walkthrough as Katie shows all zones populated
- Sandy proactively mentions recommendation deadline and committee action
- `npx tsc --noEmit` passes
- No regressions to student or staff experiences

---

## 10. Execution Sequence

Tasks can be executed in dependency order. Copy-paste these prompts into Codex:

**Phase A — Foundation (Tasks 1–3)**
```
Task 1 → Task 2 → Task 3 (sequential — schema before services before routes)
```

**Phase B — Components (Tasks 4–7, parallel)**
```
Tasks 4, 5, 6, 7 can all be built in parallel — no dependencies between them
```

**Phase C — Integration (Tasks 8–9, sequential)**
```
Task 8 → Task 9 (attention bar before full integration)
```

**Phase D — Intelligence & Polish (Tasks 10–11, parallel)**
```
Tasks 10, 11 can run in parallel
```

---

## 11. Post-Execution Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] Login as Katie Thompson → homepage shows all 6 zones
- [ ] Attention Bar shows enhanced urgency items
- [ ] Quick Actions strip scrollable on mobile
- [ ] My Students zone shows advisees, OH, flags, recommendations
- [ ] Service zone shows committees, dept feed, assessment deadlines
- [ ] Sandy mentions rec deadline and committee action proactively
- [ ] Login as Tiana (student) → no faculty zones visible
- [ ] Login as Morgan (staff) → staff homepage unchanged
- [ ] Login as Heath (admin) → executive briefing or faculty view depending on tools

---

## 12. Files Changed Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Schema | 0 | 1 (`schema.prisma`) |
| Scripts | 1 (`seed-faculty-v2.ts`) | 1 (`package.json`) |
| Services | 5 (`app/lib/faculty/`) | 0 |
| API Routes | 1 (`/api/faculty/homepage-data`) | 2 (`dashboard`, `briefing`) |
| Components | 9 (`app/components/faculty-home/`) | 2 (`FacultyHomepage`, `AttentionBar`) |
| Hooks | 0 | 1 (`useFacultyHome`) |
| Sandy Tools | 1 (`faculty-tools.ts`) | 1 (`tool-registry.ts`) |
| **Total** | **17 new** | **7 modified** |
