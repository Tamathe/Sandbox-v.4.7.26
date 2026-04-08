# Blueprint: Inline Analytics & Student Intelligence

> **Sprint Scope:** Inline analytics mini-panel on homepage, Sandy "Why?" analysis for engagement drops, student briefing cards for office hours, visit notes, and FERPA-conscious student snapshots.
> **Depends On:** Faculty Homepage Intelligence (for clickable engagement %)
> **Estimated Size:** Large (1-2 sprints)

---

## Context

Faculty currently must leave the homepage to view analytics (`/analytics/faculty`). This sprint brings critical analytics **inline** so faculty can diagnose and act without navigating away. It also adds student-level intelligence for office hours and recommendation letters — all scoped by FERPA constraints.

### Key Files

| File | Role |
|------|------|
| `app/components/faculty-home/FacultyHomepage.tsx` | Add inline analytics panel |
| `app/components/faculty-home/OfficeHoursCard.tsx` | Add student briefing + visit notes |
| `app/components/faculty-home/RecommendationTable.tsx` | Add student snapshot |
| `app/lib/faculty/homepage-aggregator.ts` | Compute inline analytics data |
| `app/lib/student-context-service.ts` | Reference for FERPA-safe data patterns |
| `app/api/faculty/student-briefing/route.ts` | New: student briefing endpoint |
| `app/api/faculty/visit-notes/route.ts` | New: office hours visit notes |

---

## Feature 1: Inline Analytics Mini-Panel

### What
When a faculty member clicks the "Engagement Insight Line" (e.g., "TEK-301 engagement dropped 8% this week"), an inline panel expands on the homepage showing diagnostic analytics — no page navigation.

### UI (Expandable Panel)

```
TEK-301 engagement dropped 8% this week  [▾ Why?]

┌────────────────────────────────────────────────────┐
│ Engagement Diagnostic — TEK-301                    │
│                                                     │
│ 📉 Trend: 70% → 62% (Week 8 → Week 9)            │
│ [Sparkline chart — 6-week trend]                    │
│                                                     │
│ Likely Causes:                                      │
│ • Assignment 5.2 submission rate: 54% (vs 78% avg) │
│ • 4 students stopped logging in after Mar 18        │
│ • Module 5 avg score: 64% (vs 76% course avg)      │
│                                                     │
│ Suggested Actions:                                  │
│ [📢 Post reminder about Assignment 5.2]            │
│ [💬 Nudge 4 inactive students]                     │
│ [📊 View full analytics →]                         │
└────────────────────────────────────────────────────┘
```

### Data Source
Create a new aggregation in `homepage-aggregator.ts` or a dedicated service:

```typescript
interface EngagementDiagnostic {
  courseId: string
  courseCode: string
  currentEngagement: number
  previousEngagement: number
  weekOverWeekDelta: number
  sparkline: number[]  // Last 6 weeks of engagement %
  likelyCauses: Array<{
    type: 'low_submission' | 'student_dropout' | 'low_scores' | 'no_sessions'
    description: string
    severity: 'high' | 'medium' | 'low'
  }>
  suggestedActions: Array<{
    label: string
    actionType: 'post' | 'nudge' | 'navigate'
    payload: Record<string, unknown>  // Pre-filled data for action
  }>
}
```

### Cause Detection Logic
1. **Low submission rate:** Compare current assignment submission % to course average
2. **Student dropout:** Count students with no activity in last 7 days vs. prior 7 days
3. **Low scores:** Compare current module/assignment average to course baseline
4. **No tool sessions:** If tool usage dropped >20% week-over-week

### Sandy "Why?" Integration
- Alternatively, faculty can click "Ask Sandy why" → Sandy receives the diagnostic data as context and provides a natural-language explanation
- Sandy can also suggest more nuanced interventions based on student-level patterns

### Suggested Action Buttons
Each suggested action button should dispatch the appropriate event:
- "Post reminder" → opens Course Communication composer (see COURSE-COMMUNICATION-ANNOUNCEMENTS blueprint)
- "Nudge inactive students" → opens nudge composer with auto-selected students
- "View full analytics" → navigates to `/analytics/faculty?course=[id]`

---

## Feature 2: Student Briefing Card for Office Hours

### What
When a student is next in the office hours queue (or when faculty clicks a flagged student), auto-generate a context card with relevant performance data — scoped to FERPA constraints.

### FERPA Scope Rule
**A faculty member only sees data from their own interactions with the student:**
- Grades in courses they teach
- Tool sessions in tools they created or courses they own
- Attendance in their classes
- Submissions to their assignments
- Notes they personally wrote

**They do NOT see:**
- Grades in other faculty's courses
- Risk scores (these are platform-computed from all courses — too broad)
- Other faculty's visit notes
- Student's activity in unrelated courses

### Student Briefing Card UI

```
┌────────────────────────────────────────────────┐
│ 📋 Student Briefing: Maria Lopez               │
│                                                  │
│ Your Courses:                                    │
│   TEK-301: B- (78%) — Grade dropped from B+     │
│     Recent: Assignment 5.1 (62%), Quiz 5 (71%)  │
│     Last active: 3 days ago                      │
│     Attendance: 11/13 classes                    │
│                                                  │
│ Tool Engagement (your tools):                    │
│   Case Study Analyzer: 4 sessions, avg 72%      │
│   Module Review Bot: 2 sessions, avg 68%         │
│                                                  │
│ Previous Visit Notes (yours):                    │
│   Mar 10: "Discussed Module 4 confusion.         │
│   Recommended extra practice with Case Study     │
│   Analyzer."                                     │
│                                                  │
│ [💬 Send nudge]  [📝 Add note]                  │
└────────────────────────────────────────────────┘
```

### API Endpoint

```typescript
// GET /api/faculty/student-briefing?studentId=[id]
// Auth: requireEducatorUser
// Returns: only data from courses taught by the authenticated educator

interface StudentBriefing {
  studentName: string
  studentId: string
  courses: Array<{
    courseId: string
    courseCode: string
    currentGrade: string
    gradePercentage: number
    gradeTrend: 'improving' | 'stable' | 'declining'
    recentAssignments: Array<{ name: string; score: number; maxScore: number }>
    lastActiveAt: string
    attendancePresent: number
    attendanceTotal: number
  }>
  toolEngagement: Array<{
    toolName: string
    sessionCount: number
    averageScore: number
  }>
  previousVisitNotes: Array<{
    date: string
    content: string
  }>
}
```

### Query Scoping (Critical for FERPA)
```typescript
// In the service layer:
const courses = await prisma.course.findMany({
  where: { instructorId: authenticatedUserId },
  include: {
    enrollments: { where: { studentId: targetStudentId } },
    assignments: {
      include: {
        submissions: { where: { studentId: targetStudentId } }
      }
    }
  }
})
// ONLY returns data from courses where the authenticated user is the instructor
```

---

## Feature 3: Visit Notes / Interaction Log

### What
After meeting with a student during office hours, faculty can log a brief note. These notes persist and appear in future student briefing cards.

### Data Model

```prisma
model OfficeHoursVisitNote {
  id          String   @id @default(cuid())
  facultyId   String
  faculty     User     @relation("FacultyNotes", fields: [facultyId], references: [id])
  studentId   String
  student     User     @relation("StudentNotes", fields: [studentId], references: [id])
  courseId     String?  // Optional — may be cross-course
  course      Course?  @relation(fields: [courseId], references: [id])

  content     String   // Free-text note
  followUpDate DateTime?  // Optional: "check in by [date]"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### UI
- "Add note" button on student briefing card and on office hours queue after student leaves
- Opens a small form:
  ```
  Student: Maria Lopez
  Course: TEK-301 (auto-selected if only one)
  Note: [Free text area]
  Follow up by: [Optional date picker]
  [Save]
  ```
- Saved notes appear in future student briefings
- Follow-up dates generate tasks (auto-generated, requiring acceptance per Homepage Intelligence blueprint)

### Visibility
- Visit notes are **private to the faculty member who wrote them**
- No other faculty, staff, or students can see them
- If a follow-up date is set, a task appears for that faculty member only

---

## Feature 4: Student Snapshot for Recommendations

### What
When viewing a recommendation letter request, faculty can expand a student snapshot showing all relevant data to help write the letter.

### UI (Expandable on RecommendationTable)

```
Alex Chen — PhD program, MIT EECS — Due Apr 1 (6 days)
  [▾ Student Snapshot]

┌────────────────────────────────────────────────┐
│ Courses with you:                               │
│   TEK-301 (Fall 2025): A (94%)                  │
│   EDU-450 (Spring 2026): A- (91%)               │
│                                                  │
│ Highlights:                                      │
│   • Top 5% in TEK-301 final project             │
│   • 23 tool sessions, avg score 89%             │
│   • Consistent engagement (never below 85%)     │
│                                                  │
│ Your Previous Notes:                             │
│   "Exceptional case study analysis. Strong       │
│   analytical writing. Recommended for TA role."  │
│                                                  │
│ [📝 Draft in Sandy]  [📄 Export to OneDrive]    │
└────────────────────────────────────────────────┘
```

### Data Source
Reuse the `StudentBriefing` API with an added `highlights` computation:
- Top percentile ranking in courses
- Total tool sessions + average scores
- Consistency metric (minimum weekly engagement)
- Any faculty notes about this student

### "Export to OneDrive" (Future — see SharePoint/OneDrive blueprint)
- When Azure Graph is live, the "Export to OneDrive" button saves the recommendation draft to the faculty member's OneDrive
- For now, show "Copy to clipboard" as the action

---

## Acceptance Criteria

- [ ] Inline analytics mini-panel expands from engagement insight line
- [ ] Diagnostic data includes: trend sparkline, likely causes, suggested actions
- [ ] Suggested action buttons trigger course communication or nudge composers
- [ ] Student briefing card available for office hours queue and flagged students
- [ ] Briefing data scoped to ONLY courses taught by authenticated faculty (FERPA)
- [ ] Visit notes CRUD with optional follow-up dates
- [ ] Visit notes visible only to the faculty member who wrote them
- [ ] Follow-up dates generate suggested tasks
- [ ] Student snapshot available on recommendation letter rows
- [ ] Snapshot shows courses, grades, highlights, and previous notes
- [ ] Demo seed data includes visit notes and student performance data

---

## FERPA Compliance Checklist

- [ ] Student briefing API filters by `instructorId === authenticatedUserId`
- [ ] No cross-faculty data leakage (faculty A cannot see faculty B's grades for a student)
- [ ] Risk scores are NOT shown to faculty (platform-internal only)
- [ ] Visit notes are private to the writing faculty member
- [ ] Student names use first + last initial on homepage; full name only in detailed views
- [ ] No accommodation details beyond "accommodation letter active" flag
- [ ] Audit log: all student data access logged with faculty ID and timestamp
