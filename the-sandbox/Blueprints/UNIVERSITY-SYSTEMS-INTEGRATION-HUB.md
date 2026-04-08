# Blueprint: University Systems Integration Hub

> **Sprint Scope:** External integrations with Banner/SIS, 25Live, attendance systems, travel/reimbursement, department websites, and paper review. This is the "pie in the sky" sprint — each integration is independent and can be built incrementally.
> **Depends On:** Azure Graph integration (for some features). Individual vendor API access.
> **Estimated Size:** Very Large (3-5 sprints, modular)

---

## Context

the platform currently operates with simulated external data. The faculty day journey revealed that many critical tasks happen entirely outside the platform: submitting grades to Banner, booking classrooms in 25Live, checking if students dropped, filing travel reimbursements, updating department websites, and logging attendance.

This blueprint defines the **integration architecture** for each system. Each section is independently buildable — they share a common integration pattern but don't depend on each other.

### Integration Architecture (Shared Pattern)

All integrations follow the existing provider-swap pattern from `app/lib/integrations/registry.ts`:

```typescript
// Pattern: every integration has a simulated + real provider
interface IntegrationProvider<T> {
  getStatus(): Promise<IntegrationStatus>
  // ... domain-specific methods
}

class SimulatedProvider implements IntegrationProvider { /* seed data */ }
class RealProvider implements IntegrationProvider { /* API calls */ }

function getProvider(): IntegrationProvider {
  if (credentials.present) return new RealProvider(credentials)
  return new SimulatedProvider()
}
```

### Integration Registry Extension

```typescript
// Extend INTEGRATION_KEYS in registry.ts:
const INTEGRATION_KEYS = [
  'OUTLOOK_GRAPH_ASSISTANT',      // ← Existing (Calendar + Email)
  'CANVAS',                        // ← Existing (LMS)
  'SIS',                           // ← Existing (Banner - mock)
  'SHAREPOINT_ONEDRIVE_FILES',    // ← Existing (Document search)
  // NEW:
  'ROOM_BOOKING',                  // 25Live / EMS
  'ATTENDANCE',                    // iClicker / manual
  'TRAVEL_REIMBURSEMENT',         // Concur / SAP / Chrome River
  'DEPARTMENT_CMS',                // WordPress / Drupal / custom
  'GRANTS_PORTAL',                 // UK Research grants
  'PAPER_REVIEW',                  // Manuscript review workspace
] as const
```

---

## Integration 1: Banner/SIS — Final Grade Submission

### What It Unlocks
- Submit final grades from the platform gradebook → Banner
- See real-time enrollment changes (dropped students surface as notifications)
- Pull official student records (academic standing, GPA, holds)

### Architecture

```
the platform Gradebook
    ↓ (Faculty approves all grades)
    ↓
/api/sis/submit-grades
    ↓
SISProvider.submitGrades({
  courseId: 'TEK-301-001',
  term: '202601',
  grades: [
    { studentId: 'banner-id-123', grade: 'A', lastAttendDate: null },
    { studentId: 'banner-id-456', grade: 'B+', lastAttendDate: null }
  ]
})
    ↓
Banner API (POST /api/v1/grades/final)
    ↓
Confirmation response → update local records
```

### Required Credentials
```
SIS_BASE_URL=https://banner.uky.edu/api/v1
SIS_API_KEY=<service-account-key>
SIS_MOCK=false
```

### Data Mapping
| Sandbox Field | Banner Field | Notes |
|---------------|-------------|-------|
| `Course.courseCode` | CRN (Course Reference Number) | Need mapping table |
| `User.email` → `StudentProfile` | Banner Student ID | Need lookup by email |
| `GradebookEntry.grade` | Letter grade | Standard A-F scale |
| Term | Banner term code | e.g., "202601" for Spring 2026 |

### Dropped Student Detection

```typescript
// Cron job: /api/cron/enrollment-sync (daily)
async function syncEnrollments() {
  for (const course of educatorCourses) {
    const bannerRoster = await sisProvider.getRoster(course.crn, term)
    const sandboxRoster = await prisma.courseEnrollment.findMany({ where: { courseId: course.id } })

    // Find students in Sandbox but not in Banner (dropped)
    const dropped = sandboxRoster.filter(s => !bannerRoster.includes(s.studentBannerId))

    for (const student of dropped) {
      // Create notification for educator
      await createNotification({
        userId: course.instructorId,
        type: 'STUDENT_DROPPED',
        message: `${student.name} dropped ${course.courseCode}`,
        relatedCourseId: course.id
      })
      // Update enrollment status
      await prisma.courseEnrollment.update({
        where: { id: student.id },
        data: { status: 'DROPPED', droppedAt: new Date() }
      })
    }
  }
}
```

### Faculty Homepage Integration
- **Notification:** "Maria Lopez dropped TEK-301 on Mar 25" appears in attention bar or as an alert
- **Course card:** Enrollment count updates automatically
- **Grade submission:** "Submit to Banner" button on gradebook (only visible when SIS is configured and term is open)

### Simulated Mode
For demo: seed 1-2 "dropped" events. Show the notification pattern. Grade submission simulates success.

---

## Integration 2: 25Live — Classroom Booking

### What It Unlocks
- Book a classroom for a review session directly from the platform
- See room availability without leaving the platform
- Sandy can suggest and book rooms: "Book a room for TEK-301 review session, Thursday 3-5 PM"

### Architecture

```
Faculty: "I need a room for a review session"
    ↓
Sandy tool: book_room
    ↓
/api/rooms/search
    ↓
RoomBookingProvider.searchAvailable({
  date: '2026-03-27',
  startTime: '15:00',
  endTime: '17:00',
  capacity: 30,
  building: 'Whitehall'  // Optional preference
})
    ↓
25Live API (GET /api/v1/spaces/available)
    ↓
Results: [{ roomId, name, capacity, building, floor, amenities }]
    ↓
Faculty selects room → RoomBookingProvider.bookRoom()
    ↓
25Live API (POST /api/v1/reservations)
    ↓
Confirmation → add to faculty's calendar
```

### Sandy Tool

```typescript
{
  name: 'book_room',
  description: 'Search for and book available classrooms/meeting rooms on campus',
  parameters: {
    date: { type: 'string', description: 'Date for the booking' },
    startTime: { type: 'string', description: 'Start time' },
    endTime: { type: 'string', description: 'End time' },
    capacity: { type: 'number', description: 'Minimum room capacity' },
    building: { type: 'string', description: 'Preferred building (optional)' }
  },
  handler: async (params) => {
    const rooms = await roomProvider.searchAvailable(params)
    return { rooms, nextStep: 'Select a room to book' }
  }
}
```

### Required Credentials
```
TWENTYFIVE_LIVE_BASE_URL=https://25live.collegenet.com/uky/api
TWENTYFIVE_LIVE_API_KEY=<api-key>
```

### Simulated Mode
Seed 10-15 rooms with realistic UK building names, capacities, and amenities. Simulated search always returns 3-5 available options.

---

## Integration 3: Attendance Logging

### What It Unlocks
- Log attendance from the platform (manual check-in or import from iClicker)
- Attendance data feeds into student risk scoring and flagged students
- Faculty can see attendance patterns in student briefing cards

### Architecture

**Option A: Manual Check-In**
- Faculty opens course page → "Take attendance" button
- Student list with checkboxes (present/absent/excused)
- Save → `AttendanceRecord` model
- Integrates with OfficeHoursCard "Missed X classes" flag

**Option B: iClicker Import**
- Faculty exports iClicker data (CSV)
- Upload to the platform via `/api/courses/[id]/attendance/import`
- Parse and save as `AttendanceRecord`

**Option C: iClicker API (if available)**
- Direct API integration for real-time sync

### Data Model

```prisma
model AttendanceRecord {
  id         String   @id @default(cuid())
  courseId    String
  course     Course   @relation(fields: [courseId], references: [id])
  studentId  String
  student    User     @relation(fields: [studentId], references: [id])
  date       DateTime
  status     AttendanceStatus  // PRESENT, ABSENT, EXCUSED, LATE
  source     String   @default("manual")  // "manual", "iclicker", "api"

  createdAt  DateTime @default(now())

  @@unique([courseId, studentId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
}
```

### Risk Score Integration
- Students with >3 unexcused absences → flag as "attendance" risk
- Attendance patterns feed into overall risk score calculation
- Appears on student briefing card and homepage flagged students

### Simulated Mode
Seed 2-3 weeks of attendance data per course. Include 2-3 students with attendance issues.

---

## Integration 4: Travel Reimbursement

### What It Unlocks
- Start a travel reimbursement request from the platform
- Sandy helps fill out the form: "I need to file a reimbursement for the AERA conference in San Francisco, April 10-13"
- Track reimbursement status without logging into Concur/SAP

### Architecture

**Phase 1: Smart Form + PDF Export (no vendor API needed)**
- Sandy gathers trip details via conversation
- Generates a pre-filled reimbursement form (matching UK's template)
- Faculty reviews, downloads as PDF
- Uploads to Concur/SAP manually (but form is pre-filled → saves 15 minutes)

**Phase 2: Direct API Integration (if Concur API available)**
- Submit directly to Concur from the platform
- Track status via Concur API polling

### Sandy Tool

```typescript
{
  name: 'start_reimbursement',
  description: 'Help file a travel reimbursement request',
  handler: async (params) => {
    // Guided conversation:
    // 1. Trip purpose (conference, research, etc.)
    // 2. Dates and destination
    // 3. Expenses (airfare, hotel, meals, registration, ground transport)
    // 4. Funding source (grant, department, etc.)
    // 5. Generate pre-filled form
    return { form: preFilledPDF, instructions: 'Review and submit to Concur' }
  }
}
```

### Required Credentials (Phase 2)
```
CONCUR_BASE_URL=https://api.concursolutions.com
CONCUR_CLIENT_ID=<client-id>
CONCUR_CLIENT_SECRET=<client-secret>
```

### Simulated Mode
Sandy generates the form with realistic data. No external submission.

---

## Integration 5: Department Website Change Submission

### What It Unlocks
- Faculty can submit updates to their department website from the platform
- Update office hours, research interests, publications, bio
- Sandy helps draft the update content

### Architecture

**Phase 1: Change Request System (no CMS API needed)**
- Faculty requests a change: "Update my office hours to MWF 2-3 PM"
- Sandy drafts the update
- System sends an email to the department web admin with the change request
- Track status: SUBMITTED → APPROVED → PUBLISHED

**Phase 2: Direct CMS Integration (if WordPress REST API available)**
- Push updates directly to faculty profile page on department website

### Data Model

```prisma
model WebsiteChangeRequest {
  id          String   @id @default(cuid())
  facultyId   String
  faculty     User     @relation(fields: [facultyId], references: [id])

  pageUrl     String?  // Which page to update
  section     String   // "office_hours", "bio", "publications", "research"
  currentContent String?  // What it says now
  newContent    String    // What it should say

  status      ChangeRequestStatus  // DRAFT, SUBMITTED, APPROVED, PUBLISHED, REJECTED
  submittedAt DateTime?
  resolvedAt  DateTime?
  resolvedBy  String?  // Web admin who processed it

  createdAt   DateTime @default(now())
}

enum ChangeRequestStatus {
  DRAFT
  SUBMITTED
  APPROVED
  PUBLISHED
  REJECTED
}
```

### Sandy Tool

```typescript
{
  name: 'update_department_website',
  description: 'Submit a change request for your department website profile',
  handler: async (params) => {
    // Sandy asks: what section? what's the new content?
    // Generates change request
    // Sends email to department web admin
    return { status: 'submitted', message: 'Change request sent to web admin' }
  }
}
```

---

## Integration 6: Conference Travel Grants

### What It Unlocks
- Search for conference travel grant opportunities
- Sandy helps draft grant applications
- Track application status

### Architecture

**Phase 1: Knowledge Base + Application Helper**
- Seed a `TravelGrantOpportunity` knowledge base with UK's internal grants
  - Graduate School travel awards
  - Department conference funds
  - Professional development grants
  - External funding sources
- Sandy helps: "What travel grants am I eligible for to present at AERA?"
- Sandy drafts the application narrative based on faculty profile + conference details

**Phase 2: Portal Integration (if grant portal API available)**
- Submit applications directly
- Track status

### Data
- Seed 10-15 grant opportunities with eligibility criteria, deadlines, and amounts
- Sandy uses semantic search to match faculty's conference to eligible grants

---

## Integration 7: Paper Review Workspace

### What It Unlocks
- A dedicated workspace for reviewing colleague papers, student dissertations, and journal manuscripts
- Sandy assists with structured feedback
- Track review commitments and deadlines

### Architecture

**Phase 1: Upload + AI-Assisted Review**
```
Faculty uploads paper (PDF/Word)
    ↓
pdf-extract.ts parses content
    ↓
Sandy provides:
  - Structural analysis (intro, methods, results, discussion)
  - Suggested comments per section
  - Methodology critique prompts
  - Writing quality notes
    ↓
Faculty edits/adds their own comments
    ↓
Export: annotated review (PDF or markdown)
```

### Data Model

```prisma
model PaperReview {
  id          String   @id @default(cuid())
  facultyId   String
  faculty     User     @relation(fields: [facultyId], references: [id])

  title       String              // Paper title
  authors     String              // Paper authors
  source      String              // "journal", "dissertation", "colleague", "conference"
  venue       String?             // Journal/conference name

  documentUrl String?             // Uploaded file URL
  dueDate     DateTime?
  status      ReviewStatus        // PENDING, IN_PROGRESS, COMPLETED, SUBMITTED

  // Sandy-assisted review
  structuralAnalysis String?      // Sandy's structural breakdown
  comments    Json?               // Array of section-specific comments
  overallAssessment String?       // Faculty's final assessment

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum ReviewStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SUBMITTED
}
```

### Sandy Tool

```typescript
{
  name: 'review_paper',
  description: 'Start or continue reviewing an academic paper with AI assistance',
  handler: async (params) => {
    if (params.documentUrl) {
      const content = await extractPDF(params.documentUrl)
      const analysis = await analyzeStructure(content)
      return { analysis, suggestedComments: generateComments(content) }
    }
    // Resume existing review
    const review = await getReview(params.reviewId)
    return { review, nextStep: 'Continue adding comments' }
  }
}
```

### Homepage Integration
- Paper reviews with due dates appear in the "Committees & Deadlines" tab
- Overdue reviews appear in the Attention Bar

---

## Implementation Priority

| Integration | Value | Complexity | Priority |
|-------------|-------|-----------|----------|
| Banner/SIS (grades + enrollment) | Very High | High (vendor API) | P0 — builds on existing SIS mock |
| Attendance Logging | High | Low (manual) / Medium (iClicker) | P1 — feeds risk scores |
| Paper Review Workspace | High | Medium | P1 — pure platform feature, no vendor |
| Travel Reimbursement | Medium | Low (form gen) / High (Concur API) | P2 — Phase 1 is easy |
| Room Booking (25Live) | Medium | Medium | P2 — high UX value |
| Department Website | Low-Medium | Low (email) / Medium (CMS API) | P3 — Phase 1 is trivial |
| Conference Travel Grants | Low | Low (knowledge base) | P3 — mostly content seeding |

---

## Acceptance Criteria (per integration)

### Banner/SIS
- [ ] Grade submission API (simulated + real provider)
- [ ] Enrollment sync cron job with dropped student notifications
- [ ] "Submit to Banner" button on gradebook (when SIS configured)
- [ ] CRN mapping between Sandbox courses and Banner sections

### Attendance
- [ ] Manual attendance check-in on course page
- [ ] iClicker CSV import
- [ ] AttendanceRecord model + per-student history
- [ ] Risk score integration for attendance flags

### Paper Review
- [ ] Upload paper (PDF) and get Sandy structural analysis
- [ ] Section-by-section comment interface
- [ ] Review deadline tracking on homepage
- [ ] Export annotated review

### Travel Reimbursement
- [ ] Sandy-guided expense collection
- [ ] Pre-filled PDF form generation
- [ ] (Phase 2) Concur API submission

### Room Booking
- [ ] Sandy tool: `book_room` with search + booking
- [ ] Room search results with capacity, building, amenities
- [ ] (Phase 2) 25Live API integration

### Department Website
- [ ] Change request form + email to web admin
- [ ] Request tracking (submitted → published)

### Travel Grants
- [ ] Knowledge base of 10-15 grant opportunities
- [ ] Sandy-powered eligibility matching
- [ ] Application narrative drafting

---

## Notes
- Each integration follows the provider-swap pattern: build simulated first, wire real when credentials arrive
- All new Sandy tools must be registered in `tool-registry.ts` under appropriate modules
- No integration should block the homepage from rendering — graceful degradation if any provider is down
- Every integration needs demo seed data for the evaluator/demo experience
