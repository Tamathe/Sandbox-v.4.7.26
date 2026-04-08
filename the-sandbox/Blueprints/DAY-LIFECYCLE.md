# Blueprint: Day Lifecycle — Summary, Tomorrow Preview, Course Prep & Overnight Sandy

> **Sprint Scope:** End-of-day summary, tomorrow preview, course prep checklist, overnight Sandy async task queue, and teaching reflection journal.
> **Depends On:** Faculty Homepage Intelligence (for dynamic surfaces). Course Communication (for post tracking).
> **Estimated Size:** Medium-Large (1 sprint)

---

## Context

The faculty homepage is optimized for **morning triage** ("What needs my attention?") but has no concept of the day's lifecycle. By 4-5 PM, the homepage looks the same as it did at 8 AM — no closure on what was accomplished, no preview of tomorrow, and no way to delegate overnight prep to Sandy.

This sprint adds **time-aware phases** to the homepage that evolve throughout the day.

---

## Key Files

| File | Role |
|------|------|
| `app/components/faculty-home/FacultyHomepage.tsx` | Add day lifecycle sections |
| `app/components/faculty-home/DaySummary.tsx` | New: end-of-day summary |
| `app/components/faculty-home/TomorrowPreview.tsx` | New: tomorrow preview |
| `app/components/faculty-home/CoursePrep.tsx` | New: course prep checklist |
| `app/lib/faculty/day-lifecycle-service.ts` | New: computes day summary + tomorrow data |
| `app/api/faculty/day-summary/route.ts` | New: day summary endpoint |
| `app/api/faculty/overnight-tasks/route.ts` | New: Sandy overnight queue |

---

## Feature 1: End-of-Day Summary

### What
After ~4:00 PM local time, a collapsible "Your Day" summary card appears at the top of the homepage (below the Attention Bar), showing what was accomplished and what carried over.

### Time-Aware Rendering
```typescript
const hour = new Date().getHours()
const showDaySummary = hour >= 16  // 4 PM onwards
const showTomorrowPreview = hour >= 16
const showCoursePrep = hour >= 15  // 3 PM onwards (prep for next day)
```

### UI

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Today's Wrap-Up                           [Hide]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Completed                    ⏳ Carrying Over
─────────────                   ─────────────────
3 submissions graded            2 advisee holds
1 announcement posted           SACSCOC narrative (due Apr 15)
3 students met (office hours)   1 recommendation (Alex Chen, 6 days)
Module 6 assignment created

📊 Teaching Impact Today
• 28 students accessed TEK-301 materials
• 12 tool sessions across your courses
• 1 student moved from "at-risk" to "on track" (James K.)

[🌙 Prep for tomorrow with Sandy]
```

### Data Source

```typescript
interface DaySummary {
  completed: Array<{
    action: string           // "3 submissions graded"
    category: 'grading' | 'communication' | 'office_hours' | 'content' | 'admin'
  }>
  carryOver: Array<{
    item: string             // "2 advisee holds"
    urgency: 'red' | 'amber' | 'green'
    dueDate?: string
  }>
  teachingImpact: {
    studentsActive: number   // Students who accessed your course materials today
    toolSessions: number     // Tool sessions in your courses today
    riskChanges: Array<{     // Students whose risk status changed
      studentName: string
      direction: 'improved' | 'worsened'
      course: string
    }>
  }
}
```

### Computation
- **Completed:** Track actions taken today via:
  - `GradebookEntry.updatedAt` today + status change to APPROVED/GRADED
  - `CoursePost.createdAt` today (announcements/nudges sent)
  - `OfficeHoursVisitNote.createdAt` today (students met)
  - `Tool.updatedAt` today + `Assignment.createdAt` today (content created)
  - `AssistantTask.completedAt` today (tasks completed)
- **Carry over:** Attention Bar items still unresolved at end of day
- **Teaching impact:** `ToolSession` counts + `CourseEnrollment.lastAccessedAt` today + risk score deltas

### Dismissibility
- "Hide" button collapses the summary (stored in localStorage)
- Resets daily — shows again the next afternoon

---

## Feature 2: Tomorrow Preview

### What
Below the day summary, show what tomorrow looks like: calendar events, assignments due, and predicted attention bar items.

### UI

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tomorrow at a Glance                  Wed, Mar 27
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Schedule                    ⚡ Expected Attention
───────────                    ────────────────────
8:00  TEK-100 Lecture          5 pending grades (2 AI-drafted)
10:00 Department meeting       Assignment 6.1 due (TEK-301)
2:00  Office Hours             Alex Chen rec letter (5 days)
3:00  Tenure Committee mtg

📝 Prep Needed (see below)
```

### Data Source

```typescript
interface TomorrowPreview {
  date: string  // ISO date for tomorrow
  calendar: Array<{
    time: string
    title: string
    courseCode?: string   // If course-related
    location?: string
  }>
  expectedAttention: Array<{
    item: string
    urgency: 'red' | 'amber' | 'blue'
  }>
  prepNeeded: boolean  // True if any course has unresolved prep items
}
```

### Computation
- **Calendar:** Fetch tomorrow's events from briefing calendar provider
- **Expected attention:** Project current Attention Bar items + assignments due tomorrow + deadlines within 24h
- **Prep needed:** Check course prep checklist (Feature 3) for incomplete items

---

## Feature 3: Course Prep Checklist

### What
For each course with a class session tomorrow, show a readiness checklist. Appears starting at ~3 PM.

### UI

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Course Prep — Tomorrow's Classes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEK-100 — Foundations of Ed Tech (8:00 AM)
  ✅ Module 7 materials uploaded (3 files)
  ✅ Assignment 7.1 posted (due Mar 30)
  ⬜ 2 unanswered student questions
  ⬜ Review: Quiz 6 results (class avg: 72%)
  [Open course →]  [Ask Sandy to prep →]

EDU-450 — Assessment Design (no class tomorrow)
  ✓ No prep needed
```

### Checklist Items (auto-generated per course)

| Check | Source | Logic |
|-------|--------|-------|
| Materials uploaded | `CourseMaterial` for next module | Check if module materials exist |
| Assignment posted | `Assignment` for upcoming week | Check if next assignment is created and visible |
| Student questions answered | Platform messaging / discussion | Count unread student messages for this course |
| Recent assessment reviewed | `GradebookEntry` | If graded items returned in last 3 days, prompt review |
| Flagged students addressed | `StudentProfile.riskScore` | If flagged students exist and no visit note today |

### "Ask Sandy to Prep" Action
Clicking this opens Sandy with:
```
"Help me prepare for tomorrow's TEK-100 class. Here's what I know:
- Module 7: [topic from course map]
- 2 unanswered student questions about [topics]
- Quiz 6 class average was 72% (below usual 78%)
Suggest what I should cover and any adjustments to make."
```

Sandy responds with a prep briefing: key topics to emphasize, student questions to address, recommended adjustments based on quiz performance.

---

## Feature 4: Overnight Sandy Prep (Async Task Queue)

### What
Faculty can queue tasks for Sandy to complete asynchronously — drafts, summaries, analyses — that are ready to review the next morning.

### Use Cases
- "Draft the SACSCOC outcome narrative from TEK-301 learning objectives"
- "Summarize this week's student engagement across all my courses"
- "Draft a response to the curriculum committee's questions"
- "Compile a student performance report for my advisees"

### Architecture

```typescript
// New model
model SandyAsyncTask {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  prompt      String           // What the user asked Sandy to do
  context     Json?            // Additional context (course data, student data, etc.)
  status      SandyTaskStatus  // QUEUED, PROCESSING, COMPLETED, FAILED

  result      String?          // Sandy's output (markdown)
  resultType  String?          // 'document' | 'summary' | 'analysis' | 'draft'

  queuedAt    DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  // User interaction
  reviewedAt  DateTime?        // When user read the result
  accepted    Boolean?         // Did user accept/use the output?
}

enum SandyTaskStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

### Flow
1. Faculty clicks "Prep for tomorrow with Sandy" or uses a dedicated "Queue for Sandy" action
2. Composer opens: "What would you like Sandy to prepare overnight?"
3. Pre-filled suggestions based on carry-over items and tomorrow's prep needs
4. Faculty submits → task enters QUEUED status
5. **Processing:** A cron job (`/api/cron/process-sandy-tasks`) picks up queued tasks and runs them through Claude Sonnet with full context
6. **Morning:** Task result appears on homepage as a dismissible card:
   ```
   🌅 Sandy prepared overnight:
   ┌──────────────────────────────────────────┐
   │ SACSCOC Outcome Narrative — Draft Ready  │
   │ 842 words · Based on TEK-301 objectives  │
   │ [Review] [Edit in Sandy] [Dismiss]       │
   └──────────────────────────────────────────┘
   ```

### Cron Job

```typescript
// /api/cron/process-sandy-tasks
// Runs every 30 minutes (or on-demand)
// Picks up QUEUED tasks, processes sequentially with rate limiting

async function processQueuedTasks() {
  const tasks = await prisma.sandyAsyncTask.findMany({
    where: { status: 'QUEUED' },
    orderBy: { queuedAt: 'asc' },
    take: 5  // Process 5 at a time
  })

  for (const task of tasks) {
    await prisma.sandyAsyncTask.update({
      where: { id: task.id },
      data: { status: 'PROCESSING', startedAt: new Date() }
    })

    const result = await runSandyTask(task)

    await prisma.sandyAsyncTask.update({
      where: { id: task.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        result: result.output,
        resultType: result.type,
        completedAt: new Date()
      }
    })
  }
}
```

### Cost Management
- Limit: 3 async tasks per user per day (prevent abuse)
- Use Haiku for simple summaries, Sonnet for complex drafts
- Show estimated completion time: "Sandy will have this ready by ~7 AM"

---

## Feature 5: Teaching Reflection Journal

### What
A lightweight note-taking feature for faculty to log post-class reflections. Not a full journal app — just a quick "What happened in class today?" capture.

### Data Model

```prisma
model TeachingReflection {
  id        String   @id @default(cuid())
  facultyId String
  faculty   User     @relation(fields: [facultyId], references: [id])
  courseId   String
  course    Course   @relation(fields: [courseId], references: [id])

  date      DateTime @default(now())
  content   String           // Free-text reflection
  tags      String[]         // Optional: ['engagement', 'confusion', 'success', 'adjustment']

  // Auto-populated context
  classAttendance  Int?      // If available
  topicsCovered    String?   // From course map

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### UI Entry Points
1. **Course prep checklist:** "How did today's class go?" prompt after class time passes
2. **Day summary:** "Reflect on today" link
3. **Course page:** "Reflections" tab (view history)

### Minimal Capture Form
```
How did TEK-100 go today? (Optional, ~30 seconds)
┌──────────────────────────────────────────────┐
│ [Free text area — 2-3 lines]                 │
│                                               │
│ Tags: [engagement] [confusion] [success]     │
│       [adjustment needed] [student highlight] │
│                                               │
│ [Save]  [Skip]                               │
└──────────────────────────────────────────────┘
```

### Sandy Integration
- Sandy can reference past reflections when helping with course prep
- "Last time you taught Module 5, you noted student confusion about [X]. Consider adding an example this time."
- Reflections feed into the engagement diagnostic context

---

## Acceptance Criteria

- [ ] Day summary appears after 4 PM with completed items, carry-over, and teaching impact
- [ ] Tomorrow preview shows calendar, expected attention items, and prep status
- [ ] Course prep checklist auto-generates per course with tomorrow sessions
- [ ] "Ask Sandy to prep" sends rich context to Sandy for prep briefing
- [ ] Async Sandy task queue: submit, process via cron, deliver results next morning
- [ ] Async task limit: 3 per user per day
- [ ] Overnight results display as dismissible cards on morning homepage
- [ ] Teaching reflection capture form with tags and auto-context
- [ ] Reflections visible in course page history
- [ ] Sandy references past reflections in prep suggestions
- [ ] All new features time-gated (appear at appropriate hours, not all day)
- [ ] Demo seed: sample reflections, 1-2 completed async tasks

---

## Privacy & Data Notes
- Teaching reflections are private to the faculty member (not visible to admin or department)
- Async Sandy tasks are private — only the submitting user can see results
- Day summary data is ephemeral (computed, not stored) — no permanent activity log
- No tracking of "hours worked" or productivity metrics — this is about readiness, not surveillance
