# University Systems Integration Hub — Architecture

> **Status:** Complete
> **Date:** 2026-03-25
> **Origin:** Blueprint `UNIVERSITY-SYSTEMS-INTEGRATION-HUB.md` — 7 campus system integrations following the provider-swap pattern
> **Page:** `/university-systems`

---

## Overview

7 campus system integrations in simulated mode, each following the **provider-swap pattern**: a simulated provider ships now with synthetic data shaped like the real API responses; when institutional credentials arrive, each integration switches to the real provider without frontend changes.

**Integrations:** Banner/SIS grade submission, 25Live room booking, iClicker/manual attendance, travel reimbursements, travel grants, peer paper review, department website changes.

**Design principle:** Every integration is usable today as a prototype. The simulated layer is not a stub — it returns realistic data (real UK buildings, real grant programs, real course rosters) so that demos, user testing, and Sandy tool development proceed without waiting on credential access.

---

## Schema Models (6 new)

All models added to `prisma/schema.prisma`.

| Model | Key Fields | Purpose |
|---|---|---|
| `AttendanceRecord` | `courseId`, `studentId`, `date`, `status` (PRESENT/ABSENT/EXCUSED/LATE), `source` (manual/iclicker/api), `loggedById` | Per-student per-date attendance with source tracking |
| `PaperReview` | `facultyId`, `title`, `authors[]`, `source`, `venue`, `dueDate`, `status`, `structuralAnalysis` (AI-generated), `comments` (JSON), `overallAssessment` | Peer review queue with AI structural analysis |
| `WebsiteChangeRequest` | `facultyId`, `section`, `pageUrl`, `currentContent`, `newContent`, `status` (DRAFT→SUBMITTED→APPROVED→PUBLISHED→REJECTED) | Department website change request pipeline |
| `TravelReimbursement` | `requesterId`, `tripPurpose`, `destination`, `departureDate`, `returnDate`, `expenses` (JSON array), `totalAmount`, `fundingSource`, `status` pipeline | Travel expense reimbursement workflow |
| `TravelGrant` | `name`, `provider`, `description`, `maxAmount`, `eligibility`, `deadline`, `categories[]`, `isActive` | Searchable grant/funding catalog |
| `CampusRoom` | `name`, `building`, `floor`, `capacity`, `amenities[]`, `isAvailable` | Bookable rooms for 25Live integration |

**Status enums:** `AttendanceStatus` (4 values), `TravelReimbursementStatus` (DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED→REJECTED→PAID), `WebsiteChangeStatus` (5 values), `PaperReviewStatus` (PENDING→IN_PROGRESS→COMPLETED).

---

## Integration Registry Extension

6 new keys added to support health checks and mode detection:

| Enum Addition | System |
|---|---|
| `InstitutionIntegrationKey.SIS_BANNER` | Banner/SIS grade submission |
| `InstitutionIntegrationKey.ROOM_BOOKING_25LIVE` | 25Live room search/booking |
| `InstitutionIntegrationKey.ATTENDANCE_ICLICKER` | iClicker attendance import |
| `InstitutionIntegrationKey.TRAVEL_CONCUR` | Concur travel reimbursement |
| `InstitutionIntegrationKey.WEBSITE_CMS` | Department website CMS |
| `InstitutionIntegrationKey.PAPER_REVIEW` | Peer review system |

**Registry:** Catalog entries in `app/lib/integrations/registry.ts`. Each entry declares `name`, `description`, `category`, `configKeys` (env vars that trigger real mode).

**Health checks:** `app/lib/integrations/health.ts` — shared `checkSimulatedUniversitySystem()` function returns `{ status: 'simulated', message }` for all 6 integrations. When real credentials are present, the function delegates to the real provider's health endpoint.

---

## Service Layer

**File:** `app/lib/university-systems-service.ts`

18 exported functions covering all 7 integrations:

| Function | Integration | Description |
|---|---|---|
| `searchRooms(query, date, startTime, endTime)` | 25Live | Filter rooms by capacity, amenities, availability |
| `bookRoom(roomId, userId, date, startTime, endTime, purpose)` | 25Live | Reserve a room (simulated confirmation) |
| `getRooms()` | 25Live | List all campus rooms |
| `logAttendance(courseId, studentId, date, status, source, loggedById)` | Attendance | Record single attendance entry |
| `bulkLogAttendance(records[])` | Attendance | Batch attendance for full roster |
| `getAttendance(courseId, date?)` | Attendance | Retrieve attendance records with optional date filter |
| `getStudentAttendance(studentId, courseId)` | Attendance | Per-student attendance history |
| `importAttendance(courseId, file, format)` | iClicker | Parse and import iClicker/CSV attendance data |
| `submitGrades(courseId, grades[])` | Banner/SIS | Submit final grades to SIS (simulated acknowledgment) |
| `checkEnrollmentChanges(courseId)` | Banner/SIS | Poll for adds/drops/withdrawals since last check |
| `createReimbursement(data)` | Concur | Start a travel reimbursement request |
| `getReimbursements(userId)` | Concur | List user's reimbursement requests |
| `updateReimbursement(id, data)` | Concur | Update status or add expenses |
| `getReimbursementForm(id)` | Concur | Generate pre-filled reimbursement form data |
| `searchTravelGrants(query?, categories?)` | Travel | Search grant catalog with optional filters |
| `matchTravelGrants(tripPurpose, destination)` | Travel | AI-matched grants for a specific trip |
| `createWebsiteChangeRequest(data)` | CMS | Submit a department website change |
| `getWebsiteChangeRequests(facultyId)` | CMS | List change requests by faculty |
| `createPaperReview(data)` | Paper Review | Add a paper to the review queue |
| `getPaperReviews(facultyId)` | Paper Review | List faculty's review assignments |
| `analyzePaper(id)` | Paper Review | Run AI structural analysis (Haiku) |
| `updatePaperReview(id, data)` | Paper Review | Save comments, assessment, status |

**Synthetic fallback data:**
- 12 rooms in real UK buildings (Whitehall Classroom Building, Funkhouser, Gatton, etc.) with realistic capacities and amenities
- 12 grants modeled on real UK programs (EVPRI Travel Fund, Graduate Student Congress, Chellgren Center, etc.) with realistic deadlines and amounts

All functions are **provider-swap ready**: each checks the integration registry mode before executing. Simulated mode returns synthetic data or writes to the database with a simulated confirmation. Real mode would call the external API.

---

## API Routes (15 files)

All routes under `app/api/university-systems/`. Each follows the thin-handler pattern: auth → parse → call service → return JSON.

### Banner/SIS
| Method | Route | Purpose |
|---|---|---|
| POST | `/sis/submit-grades` | Submit grades to Banner (simulated) |
| GET | `/sis/enrollment-changes` | Check for enrollment changes since last poll |

### Room Booking (25Live)
| Method | Route | Purpose |
|---|---|---|
| GET | `/rooms/search` | Search rooms by date/time/capacity |
| POST | `/rooms/book` | Book a room |

### Attendance
| Method | Route | Purpose |
|---|---|---|
| POST | `/attendance` | Log attendance (single or bulk) |
| GET | `/attendance` | Get attendance records for a course |
| POST | `/attendance/import` | Import from iClicker/CSV |
| GET | `/attendance/student` | Per-student attendance history |

### Travel
| Method | Route | Purpose |
|---|---|---|
| POST | `/travel/reimbursements` | Create reimbursement request |
| GET | `/travel/reimbursements` | List user's reimbursements |
| GET | `/travel/reimbursements/[id]/form` | Get pre-filled form data |
| GET | `/travel/grants` | Search grant catalog |
| GET | `/travel/grants/match` | AI-matched grants for a trip |

### Department Website
| Method | Route | Purpose |
|---|---|---|
| POST | `/website/changes` | Submit a change request |
| GET | `/website/changes` | List change requests |

### Paper Review
| Method | Route | Purpose |
|---|---|---|
| POST | `/paper-review` | Add paper to review queue |
| GET | `/paper-review` | List review assignments |
| POST | `/paper-review/[id]/analyze` | Run AI structural analysis |
| PATCH | `/paper-review/[id]` | Update review (comments, status) |

### Supporting Route
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/courses/[id]/roster` | Get enrolled students for a course (used by attendance tab) |

---

## Sandy Tools (10)

**Module:** `app/lib/agent/tools/university-systems-tools.ts`

Registered in the Sandy universal agent tool registry. All tools are available to all roles.

| Tool | Description |
|---|---|
| `book_room` | Search and book a campus room via 25Live |
| `log_attendance` | Record attendance for a student in a course |
| `get_attendance_summary` | Retrieve attendance summary with risk flags |
| `submit_grades_to_sis` | Submit final grades to Banner/SIS |
| `check_enrollment_changes` | Poll for adds/drops/withdrawals |
| `start_reimbursement` | Begin a travel reimbursement request |
| `search_travel_grants` | Search available travel funding |
| `update_department_website` | Submit a department website change request |
| `review_paper` | Add or update a peer review |
| `get_my_reimbursements` | List user's travel reimbursement requests |

---

## Hub Page

**File:** `app/(pages)/university-systems/page.tsx`

Single-page 7-tab interface. No sub-routes — all interactions happen within the tab view.

### Tab Structure

| Tab | Icon | Content |
|---|---|---|
| Attendance | ClipboardCheck | Bulk roster with status buttons, live counts, risk flags |
| Room Booking | Building2 | Search with time validation, book with confirmation |
| Grade Submission | GraduationCap | Course selector, grade entry, 2-step Banner confirmation |
| Travel | Plane | Reimbursement form + grant search with deadline urgency |
| Paper Review | FileText | Review queue with AI analysis, deadline coloring |
| Department Website | Globe | Section-based change request form |
| Enrollment | Users | Formatted enrollment changes with capitalized badges |

### UX Decisions (37 fixes across 7 polish passes)

**P0 — Structural:**
- Tab-only navigation (killed card grid overview)
- Auto-fetch all data on mount (no manual refresh buttons)
- Real course roster from `/api/courses/[id]/roster` instead of hardcoded students

**P4 — Interaction:**
- Attendance: icon buttons (CheckCircle/XCircle/Clock/AlertTriangle) with bulk "Mark All Present" + live status counts
- Grade submission: 2-step confirmation dialog before Banner submission

**P5 — Performance:**
- Sticky tab bar with mobile horizontal scroll (`overflow-x-auto snap-x`)
- Module-level course cache (`useRef`) prevents triple fetch when switching tabs

**P7 — Stability:**
- Grants fetch-once guard (`useRef` flag) prevents infinite loop from effect dependency
- Auto-clearing flash messages (4-second timeout)
- URL hash tab persistence (`#attendance`, `#rooms`, etc.)

### Additional UX Details
- Enter-to-search on room booking
- Time validation (end must be after start) on room search
- Formatted amenities list on room cards
- Currency formatting on travel amounts
- Deadline urgency coloring (red < 7 days, amber < 30 days)
- Auto-focus on review comment textarea
- Section dropdown on website change requests
- Capitalized status badges on enrollment changes
- Formatted dates throughout (Intl.DateTimeFormat)

---

## Seed Script

**File:** `scripts/seed-university-systems.ts`

**Run:** `npx tsx scripts/seed-university-systems.ts`

Seeds:
- 12 campus rooms (real UK buildings with realistic amenities and capacities)
- 12 travel grants (modeled on real UK funding programs)
- 40 attendance records (spread across courses and dates)
- 2 paper reviews (with realistic venue/deadline data)
- 1 website change request (sample department page update)
- 1 travel reimbursement (sample conference trip)

Idempotent — checks for existing data before inserting.

---

## Navigation

- **Header quick link:** Building2 icon, "University Systems", visible to all roles
- **Priority sort:** Appears higher in quick-link list for STAFF and ADMIN roles
- **Sandy concierge:** Page context registered in `concierge-service.ts` — Sandy knows which tab is active and can suggest relevant actions

---

## Provider Swap Pattern

The architecture is designed for zero-frontend-change credential activation. When real system access arrives:

```
1. Set environment variables
   e.g., SIS_BASE_URL, SIS_API_KEY, TWENTYFIVE_LIVE_URL, CONCUR_API_KEY

2. Integration registry detects credentials
   registry.ts checks for env vars → mode switches from SIMULATED to REAL

3. Service functions branch on mode
   university-systems-service.ts: if (mode === 'REAL') → call external API
                                  if (mode === 'SIMULATED') → return synthetic data

4. No frontend changes needed
   Same API response shapes, same component rendering
```

**Per-integration credential mapping:**

| Integration | Env Vars | Real Provider |
|---|---|---|
| Grade Submission | `SIS_BASE_URL`, `SIS_API_KEY` | Banner/SIS REST API |
| Room Booking | `TWENTYFIVE_LIVE_URL`, `TWENTYFIVE_LIVE_API_KEY` | CollegeNET 25Live |
| Attendance Import | `ICLICKER_API_URL`, `ICLICKER_API_KEY` | iClicker Cloud |
| Travel Reimbursement | `CONCUR_BASE_URL`, `CONCUR_API_KEY` | SAP Concur |
| Travel Grants | (database-only, no external API) | Manually maintained catalog |
| Website Changes | `CMS_API_URL`, `CMS_API_KEY` | Drupal/WordPress REST API |
| Paper Review | (database-only, no external API) | Internal workflow |

---

## File Manifest

| Type | Path |
|---|---|
| Schema | `prisma/schema.prisma` (6 new models + 3 enums) |
| Service | `app/lib/university-systems-service.ts` |
| Sandy Tools | `app/lib/agent/tools/university-systems-tools.ts` |
| Hub Page | `app/(pages)/university-systems/page.tsx` |
| Seed Script | `scripts/seed-university-systems.ts` |
| Integration Registry | `app/lib/integrations/registry.ts` (6 new entries) |
| Health Checks | `app/lib/integrations/health.ts` |
| API Routes (15) | `app/api/university-systems/{sis,rooms,attendance,travel,website,paper-review}/**` |
| Course Roster API | `app/api/courses/[id]/roster/route.ts` |
| Blueprint | `Blueprints/UNIVERSITY-SYSTEMS-INTEGRATION-HUB.md` |
