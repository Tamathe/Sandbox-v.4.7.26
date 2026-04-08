# Registrar Intelligence System — Architecture Blueprint
### The Sandbox — CATS-AI / University of Kentucky
### Status: Blueprint — Ready to implement
### Written: 2026-03-18
### Authors: Master Software Engineer · Head Strategic & Culture Lead · Head Software Engineer

---

## Overview

This document defines the complete architecture for automating approximately 80% of routine
University of Kentucky Registrar's Office operations within The Sandbox platform. It is the
result of a three-stakeholder review: operational analysis from the Registrar, technical
feasibility assessment from the Master Software Engineer, and user experience / cultural
adoption guidance from the Head Strategic and Culture Lead.

The north star: **in 12 months, a student should be able to ask "am I on track to graduate?"
and get an accurate, sourced, human-reviewable answer in 30 seconds — and a registrar staff
member should be able to review that answer, override it, and have the override logged.**

---

## Table of Contents

1. [What's Already Built](#1-whats-already-built)
2. [New User Role: REGISTRAR](#2-new-user-role-registrar)
3. [Sprint 1 — Platform Unblocking](#3-sprint-1--platform-unblocking-2-weeks)
   - 3.1 Shibboleth SSO / Real Auth
   - 3.2 SIS Adapter Interface (Banner)
   - 3.3 Service Bot Builder Permission Change
4. [Sprint 2 — Quick Wins That Build Trust](#4-sprint-2--quick-wins-that-build-trust-2-weeks)
   - 4.1 Policy & Procedure Chatbot
   - 4.2 Transfer Credit Registrar Dashboard
   - 4.3 Articulation Confidence Threshold & Department Routing
5. [Sprint 3 — Core Degree Audit Engine](#5-sprint-3--core-degree-audit-engine-3-weeks)
   - 5.1 Degree Requirements Data Layer
   - 5.2 Degree Audit Agent
   - 5.3 Student Degree Progress Card
   - 5.4 Registrar Staff Review Queue
6. [Sprint 4 — Petition & Workflow Automation](#6-sprint-4--petition--workflow-automation-2-weeks)
   - 6.1 Petition Data Model
   - 6.2 Petition Submission Flow
   - 6.3 Petition Routing & Staff Dashboard
   - 6.4 Graduation Clearance Batch Job
7. [Sprint 5 — Compliance Reporting](#7-sprint-5--compliance-reporting-2-weeks)
   - 7.1 Enrollment Reporting Queries
   - 7.2 Public Analytics Dashboard
   - 7.3 IPEDS Data Extraction (Human-Certified)
8. [Trust Architecture](#8-trust-architecture)
9. [Equity Safeguards](#9-equity-safeguards)
10. [Culture & Change Management Strategy](#10-culture--change-management-strategy)
11. [What We Explicitly Don't Build](#11-what-we-explicitly-dont-build)
12. [New Environment Variables](#12-new-environment-variables)
13. [Complete File Manifest](#13-complete-file-manifest)

---

## 1. What's Already Built

Before speccing new work, understand what exists today and must not be rebuilt:

| Feature | Status | Location |
|---|---|---|
| Transfer credit AI evaluation | ✅ Fully built | `app/api/articulation/`, `app/lib/articulation.ts` |
| Transfer credit student UI | ✅ Fully built | `app/tools/transfer-credit-articulator/` |
| AI Registrar Flashcards | ✅ Fully built | `app/tools/ai-registrar-flashcards/` |
| Campus Navigator "Degree Audit" | ✅ Prompt-only (no live data) | `app/lib/campus-navigator.ts` |
| Service Bot Builder | ✅ Fully built (Admin-only) | `app/service-bot/` |
| PDF parsing | ✅ Fully built | `app/api/upload/pdf/` |
| Email via Resend | ✅ Fully built | `app/lib/email.ts` |
| Notification system | ✅ Fully built | `app/lib/notifications.ts` |
| Cron infrastructure | ✅ Fully built | `vercel.json`, `app/api/leagues/cron/` |
| AdminAuditLog model | ✅ In schema | `prisma/schema.prisma` |
| Recharts | ✅ In stack | `package.json` |

**The single most important thing to understand:** Priorities 5 (Policy Chatbot) and most of
Priority 2 (Transfer Credit) are largely already built. The registrar's staff can operate
Priority 5 this week with a single permission change.

---

## 2. New User Role: REGISTRAR

All registrar features require a dedicated user role. This allows registrar staff to access
their dashboard without being full ADMINs, and gates route rendering cleanly.

### Schema Change

```prisma
// prisma/schema.prisma — UserRole enum, add REGISTRAR

enum UserRole {
  STUDENT
  EDUCATOR
  ADMIN
  REGISTRAR   // ← ADD THIS
}
```

### Auth Context Update

```typescript
// app/lib/auth-context.tsx — add demo registrar user

{ email: 'registrar@uky.edu', name: 'Sara Registrar', role: 'REGISTRAR',
  department: "Registrar's Office", college: 'Administration' }
```

### Route Guard Pattern

```typescript
// Reuse existing pattern from server-auth.ts
// Add to any registrar-only endpoint:

const user = await getSessionUser(request)
if (!user || (user.role !== 'REGISTRAR' && user.role !== 'ADMIN')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 3. Sprint 1 — Platform Unblocking (2 weeks)

These are prerequisites. Sprint 2 onward is blocked without them.

### 3.1 Shibboleth SSO / Real Auth

**Problem:** Mock auth (`x-demo-user-email` header) means we never truly know who the student
is. Every registrar feature — degree audits, transfer credit, petitions — requires real
identity tied to real SIS data.

**Architecture:**

```
Student browser
    ↓ GET /api/auth/shibboleth/login
UK Shibboleth IdP (shibboleth.uky.edu)
    ↓ SAML assertion (eppn, email, displayName, eduPersonAffiliation)
POST /api/auth/shibboleth/callback
    ↓ Verify assertion signature → extract attributes
    ↓ Upsert User record (create on first login, update on subsequent)
    ↓ Set HttpOnly session cookie (JWT, 8-hour TTL)
All subsequent requests: read session from cookie
```

**New files:**

```
app/lib/auth/
  shibboleth.ts          ← SAML assertion verification, attribute mapping
  session.ts             ← HttpOnly JWT cookie read/write helpers
  middleware.ts          ← Next.js middleware: verify session on /api/* routes

app/api/auth/
  shibboleth/login/route.ts    ← Redirect to UK IdP with SAML request
  shibboleth/callback/route.ts ← Receive SAML response, create session
  logout/route.ts              ← Clear session cookie, redirect to IdP logout
  me/route.ts                  ← Return current user from session (replaces /api/auth/status)
```

**Attributes from UK Shibboleth:**

| SAML Attribute | Maps To |
|---|---|
| `eppn` (eduPersonPrincipalName) | `User.email` (primary key) |
| `displayName` | `User.name` |
| `eduPersonAffiliation` | Infer `UserRole` (student/faculty/staff) |
| `ou` (organizational unit) | `User.department` |
| `college` | `User.college` |
| `studentId` | New `User.studentId` field (needed for SIS lookups) |

**Demo mode preservation:** Keep mock auth working via `DEMO_MODE=true` environment variable.
When `DEMO_MODE=true`, the existing `x-demo-user-email` header flow stays active. This
allows continued local development and demos without SSO infrastructure.

**Migration:** `server-auth.ts` keeps its interface (`getSessionUser(request)`) but internally
checks: if `DEMO_MODE=true` → read header, else → read session cookie.

---

### 3.2 SIS Adapter Interface (Banner/Ellucian)

**Problem:** The Campus Navigator "Degree Audit" is a prompt-only chatbot. All four of the
high-value registrar features (degree audit, enrollment advising, graduation clearance,
reporting) require live access to student academic records.

UK uses **Banner by Ellucian** as its SIS. Banner exposes a REST API (Banner REST API Services,
formerly Ethos). Access requires an API key provisioned by UK IT.

**Architecture — adapter pattern (mirrors LeagueAdapter):**

```typescript
// app/lib/sis/adapter.ts

export interface SISAdapter {
  // Student record
  getStudentProfile(studentId: string): Promise<StudentProfile>

  // Academic history
  getCourseHistory(studentId: string): Promise<CompletedCourse[]>
  getTransferCredits(studentId: string): Promise<TransferCredit[]>
  getCurrentEnrollment(studentId: string, term: string): Promise<EnrolledCourse[]>
  getAcademicStanding(studentId: string): Promise<AcademicStanding>

  // Degree requirements
  getDegreeRequirements(programCode: string, catalogYear: string): Promise<DegreeRequirement[]>

  // Course catalog
  getCourseInfo(courseCode: string): Promise<CourseInfo>
  getAvailableSections(courseCode: string, term: string): Promise<CourseSection[]>

  // Enrollment
  getActiveTerms(): Promise<Term[]>
  getRegistrationStatus(studentId: string): Promise<RegistrationStatus>
}
```

**Two implementations:**

```typescript
// app/lib/sis/banner-adapter.ts
// Production: calls Banner REST API at https://banner.uky.edu/StudentApi/api/v1/...
// Auth: Bearer token from SIS_API_KEY env var

// app/lib/sis/mock-adapter.ts
// Development/demo: returns realistic hardcoded data for the 6 demo users
// Ian McClure: 1L law student data (30 credits, Legal Writing, Civil Procedure, etc.)
// Tiana The: English junior data (75 credits, Lit theory, Writing, Arts & Sciences reqs)
```

**Factory:**

```typescript
// app/lib/sis/index.ts
export function getSISAdapter(): SISAdapter {
  if (process.env.DEMO_MODE === 'true' || !process.env.SIS_API_KEY) {
    return new MockSISAdapter()
  }
  return new BannerSISAdapter(process.env.SIS_API_KEY!)
}
```

**New environment variables:**

```
SIS_API_KEY=...          # Banner REST API key (provisioned by UK IT)
SIS_BASE_URL=...         # Banner REST API base URL
SIS_MOCK=true            # Force mock adapter even with API key (staging/testing)
```

**Caching:** SIS data is expensive. Wrap all adapter calls in a 15-minute Redis cache keyed
by `sis:{studentId}:{method}`. Use existing Upstash Redis client in `app/lib/redis.ts`.

---

### 3.3 Service Bot Builder Permission Change

**Problem:** Service Bot Builder is currently restricted to `ADMIN` role. Registrar staff
(new `REGISTRAR` role) need to be able to deploy and update their own policy chatbots without
depending on an admin.

**Change:** One-line edit in `app/service-bot/page.tsx` and `app/api/tools/route.ts`.

```typescript
// app/service-bot/page.tsx — change role guard:
// BEFORE: if (currentUser.role !== 'ADMIN')
// AFTER:  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'REGISTRAR')

// Same change in any API route that checks for Admin before allowing service bot creation
```

**This change alone lets the Registrar's Office deploy Priority 5 (Policy Chatbot) this week.**

---

## 4. Sprint 2 — Quick Wins That Build Trust (2 weeks)

Build these first because they are student-facing, fast, and require no SIS data.
They establish trust in AI-assisted registrar tools before the harder automation arrives.

### 4.1 Policy & Procedure Chatbot

**What it is:** An official UK Registrar service bot that answers student questions about
policies, deadlines, petition procedures, and FERPA rights.

**How to build it (no engineering required):**

1. Registrar staff logs in as REGISTRAR role
2. Navigates to `/service-bot`
3. Uploads documents:
   - Academic calendar (PDF)
   - Undergraduate catalog policy section (PDF)
   - Petition procedures guide (Markdown)
   - FERPA rights notice (PDF)
   - Common deadlines FAQ (Markdown)
4. Configures:
   - Name: "UK Registrar's Office Assistant"
   - Department: "Registrar's Office"
   - Escalation email: registrar@uky.edu
   - Protocol: INFORMATION (existing enum)
5. Deploys → auto-approved, UK Official badge applied

**UX requirement (new):** Add to the Service Bot Builder wizard a
"Uncertainty Acknowledgment" toggle (default ON). When ON, the system prompt instructs the
bot to always end responses that involve deadlines or eligibility with:
> "For official confirmation, contact the Registrar's Office at registrar@uky.edu or visit
> the Student Center in Main Building."

This is a system prompt addition, not a new feature. Add it to `app/lib/service-bot-prompt.ts`.

---

### 4.2 Transfer Credit Registrar Dashboard

**What it is:** A staff-facing view of all `ArticulationRequest` records, surfacing the AI
evaluation results so registrar staff can review and decide — rather than doing the evaluation
manually from scratch.

**New page:** `app/registrar/articulation/page.tsx`

**New API:** `GET /api/registrar/articulation`

```typescript
// Returns all ArticulationRequest records with:
// - student info (name, email, program)
// - external course details
// - AI recommendation (APPROVE / NEEDS_REVIEW / DENY)
// - similarity score (0–100)
// - reasoning (Claude's chain-of-thought, stored as JSON)
// - current status (PENDING / APPROVED / DENIED)
// - days since submission

// Filters: status, score range, department, date range
// Sort: score asc (lowest confidence first for human attention), date desc
```

**Dashboard columns:**

| Student | External Course | Similarity | AI Rec | Submitted | Status | Action |
|---|---|---|---|---|---|---|
| Ian McClure | LAWX 101 — Legal Research | 87 | Approve | 3 days | Pending | Review |
| Tiana The | ENG 201 — British Lit | 64 | Needs Review | 1 day | Pending | Review |

**Detail modal:** Clicking "Review" opens an existing-style panel (reuse `ArticulationRequest`
detail view) with:
- AI reasoning steps (not just the conclusion)
- "Approve", "Deny", "Send to Department" buttons
- Free-text decision note (required for Deny)
- Audit trail showing every action taken on this record

---

### 4.3 Articulation Confidence Threshold & Department Routing

**What it is:** Automatically route low-confidence transfer credit evaluations to the correct
department contact instead of sitting in a shared inbox.

**Schema addition to `ArticulationRequest`:**

```prisma
model ArticulationRequest {
  // ... existing fields ...

  sourceInstitution  String?   // "University of Louisville"
  sourceTermYear     String?   // "Fall 2023"
  sourceCatalogYear  String?   // "2023-2024"
  routedToDept       String?   // "Computer Science" — populated on auto-route
  routedToEmail      String?   // department contact email
  routedAt           DateTime?
  chainOfThought     Json?     // Claude's reasoning steps stored here
}
```

**New config model:**

```prisma
model ArticulationRoutingRule {
  id              String   @id @default(cuid())
  departmentName  String   @unique
  contactEmail    String
  autoApproveThreshold  Int  @default(85)  // ≥85: auto-approve draft
  autoRouteThreshold    Int  @default(65)  // <65: route to dept; 65-84: registrar review
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Logic change in `app/lib/articulation.ts`:**

```typescript
// After AI scoring, apply routing rules:

async function routeArticulationRequest(request: ArticulationRequest, score: number) {
  const rules = await prisma.articulationRoutingRule.findMany()
  const deptRule = rules.find(r => request.targetDepartment?.includes(r.departmentName))
  const threshold = deptRule?.autoApproveThreshold ?? 85
  const routeThreshold = deptRule?.autoRouteThreshold ?? 65

  if (score >= threshold) {
    // Auto-approve draft — registrar staff review before finalizing
    await prisma.articulationRequest.update({
      where: { id: request.id },
      data: { recommendation: 'APPROVE', status: 'DRAFT_APPROVED' }
    })
    await notifyRegistrarStaff(request, 'DRAFT_APPROVED', score)
  } else if (score < routeThreshold && deptRule) {
    // Route to department contact
    await prisma.articulationRequest.update({
      where: { id: request.id },
      data: { routedToDept: deptRule.departmentName, routedToEmail: deptRule.contactEmail, routedAt: new Date() }
    })
    await sendDepartmentRoutingEmail(request, deptRule.contactEmail)
  }
  // else: stays in registrar review queue (65–84 range)
}
```

**New API:** `GET/POST /api/registrar/articulation/routing-rules` (REGISTRAR/ADMIN only)

---

## 5. Sprint 3 — Core Degree Audit Engine (3 weeks)

This is the highest-value feature and the most complex. Build it in this order:
data layer → audit engine → student UI → staff review queue.

### 5.1 Degree Requirements Data Layer

**Problem:** We have no machine-readable degree requirements data. They exist in the UK
Undergraduate Catalog as PDFs. We need a structured representation.

**New schema:**

```prisma
model DegreeProgram {
  id            String   @id @default(cuid())
  code          String   // "CS-BS", "ENG-BA", "LAW-JD"
  name          String   // "Bachelor of Science in Computer Science"
  college       String
  department    String
  catalogYear   String   // "2024-2025"
  totalCredits  Int
  requirements  DegreeRequirement[]
  auditResults  DegreeAuditResult[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([code, catalogYear])
}

model DegreeRequirement {
  id             String          @id @default(cuid())
  programId      String
  program        DegreeProgram   @relation(fields: [programId], references: [id])
  category       RequirementCategory  // CORE | MAJOR | ELECTIVE | GEN_ED | CAPSTONE | MINOR
  name           String          // "Upper Division CS Electives"
  description    String?
  minCredits     Int
  minCourses     Int?
  courses        RequirementCourse[]  // specific allowed courses
  coursePatterns String[]        // patterns like "CS 4*" = any 400-level CS course
  notes          String?

  @@index([programId])
}

model RequirementCourse {
  id            String             @id @default(cuid())
  requirementId String
  requirement   DegreeRequirement  @relation(fields: [requirementId], references: [id])
  courseCode    String             // "CS 311"
  courseName    String
  credits       Int
  isRequired    Boolean            @default(false)  // true = mandatory, false = option within group

  @@index([requirementId])
}

enum RequirementCategory {
  CORE
  MAJOR
  ELECTIVE
  GEN_ED
  CAPSTONE
  MINOR
  TRANSFER_ACCEPTED
}
```

**Seeding strategy:** Build an ingestion script (`scripts/ingest-degree-requirements.ts`)
that parses catalog PDFs (using existing `pdf-parse`) and uses Claude to extract structured
requirement data. Store in the new models above. Registrar staff can review and edit via
admin UI before the audit engine uses it.

**Prerequisite graph:** Add a `prerequisites` field to `RequirementCourse`:

```prisma
model RequirementCourse {
  // ... existing fields ...
  prerequisites  String[]  // course codes that must be completed first, e.g. ["CS 215", "MA 213"]
}
```

---

### 5.2 Degree Audit Agent

**New file:** `app/lib/degree-audit.ts`

**Core function:**

```typescript
export interface DegreeAuditResult {
  programCode: string
  programName: string
  catalogYear: string
  studentId: string
  auditedAt: Date

  totalCreditsCompleted: number
  totalCreditsRequired: number
  percentComplete: number

  requirementResults: RequirementAuditResult[]

  overallStatus: 'ON_TRACK' | 'ACTION_NEEDED' | 'REVIEW_REQUIRED'
  summary: string           // 2-3 sentence human-readable summary
  recommendedActions: string[]  // ordered list of next steps

  // Trust architecture fields
  citedSources: AuditSource[]   // which catalog pages, which SIS records were used
  chainOfThought: AuditStep[]   // every check performed, stored for staff review
  confidenceScore: number       // 0–100 — never shown to students, staff-only
  complexCaseFlag: boolean      // true if student has transfers, major changes, accommodations
  humanReviewRequired: boolean  // true if complexCaseFlag OR confidenceScore < 80
}

export interface RequirementAuditResult {
  requirementId: string
  requirementName: string
  category: RequirementCategory
  status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'WAIVED'
  creditsCompleted: number
  creditsRequired: number
  coursesCompleted: string[]    // course codes
  coursesPending: string[]      // enrolled but not yet complete
  coursesMissing: string[]      // still needed
  satisfiedBy: string[]         // which completed courses satisfied this requirement
}

export interface AuditSource {
  type: 'CATALOG' | 'SIS_TRANSCRIPT' | 'SIS_ENROLLMENT' | 'TRANSFER_RECORD'
  reference: string   // "2024-2025 Undergraduate Catalog, p. 147" or "SIS transcript 2023-01-15"
  dataPoints: string[] // specific data items pulled from this source
}
```

**Audit engine logic:**

```typescript
export async function runDegreeAudit(
  studentId: string,
  programCode: string,
  catalogYear: string
): Promise<DegreeAuditResult> {

  const sis = getSISAdapter()
  const [profile, history, transfers, enrollment, requirements] = await Promise.all([
    sis.getStudentProfile(studentId),
    sis.getCourseHistory(studentId),
    sis.getTransferCredits(studentId),
    sis.getCurrentEnrollment(studentId, await getCurrentTerm()),
    prisma.degreeProgram.findFirst({
      where: { code: programCode, catalogYear },
      include: { requirements: { include: { courses: true } } }
    })
  ])

  // Build chain-of-thought steps
  const steps: AuditStep[] = []

  // For each requirement: check completed courses + transfers + current enrollment
  const requirementResults = requirements.requirements.map(req =>
    evaluateRequirement(req, history, transfers, enrollment, steps)
  )

  // Detect complex case flags
  const complexCaseFlag =
    transfers.length > 0 ||
    profile.majorChanges > 0 ||
    profile.hasAccommodations ||
    history.some(c => c.gradePoints === null)  // incomplete grades

  // Use Claude for natural language summary + action recommendations
  // (structured JSON output mode — no hallucination risk on the data, only the prose)
  const aiSummary = await generateAuditSummary(requirementResults, complexCaseFlag)

  const result: DegreeAuditResult = {
    // ... assembled result
    humanReviewRequired: complexCaseFlag || aiSummary.confidenceScore < 80
  }

  // Persist audit result
  await prisma.degreeAuditResult.create({ data: serializeResult(result) })

  return result
}
```

**New schema model:**

```prisma
model DegreeAuditResult {
  id                  String   @id @default(cuid())
  studentId           String
  student             User     @relation(fields: [studentId], references: [id])
  programId           String
  program             DegreeProgram @relation(fields: [programId], references: [id])
  auditedAt           DateTime @default(now())

  overallStatus       String   // ON_TRACK | ACTION_NEEDED | REVIEW_REQUIRED
  percentComplete     Float
  totalCreditsCompleted Int
  totalCreditsRequired  Int

  requirementResults  Json     // RequirementAuditResult[]
  recommendedActions  Json     // string[]
  citedSources        Json     // AuditSource[]
  chainOfThought      Json     // AuditStep[] — staff-only

  confidenceScore     Int      // 0–100 — staff-only
  complexCaseFlag     Boolean  @default(false)
  humanReviewRequired Boolean  @default(false)

  // Staff review
  staffReviewedBy     String?
  staffReviewedAt     DateTime?
  staffOverride       String?   // ON_TRACK | ACTION_NEEDED | REVIEW_REQUIRED
  staffNotes          String?

  @@index([studentId])
  @@index([programId])
}
```

**New API routes:**

```
GET  /api/registrar/degree-audit/[studentId]     ← Run or retrieve latest audit for a student
POST /api/registrar/degree-audit/[studentId]     ← Force re-run audit
GET  /api/registrar/degree-audit/[studentId]/history  ← All past audits
PATCH /api/registrar/degree-audit/[resultId]/review  ← Staff override + notes
```

---

### 5.3 Student Degree Progress Card

**New component:** `app/components/registrar/DegreeProgressCard.tsx`

A persistent card on the student home dashboard (`app/page.tsx`) and student analytics page.

**Visual design:**
- Top: Program name, overall status badge ("On Track" / "Action Needed" / "Review Required")
  — using the friendly language, NOT the internal enum values
- Progress bar: Credits completed / total (e.g., "87 / 120 credits")
- Requirement categories: Row of mini-bars, one per category (Core, Major, Gen Ed, etc.)
  Each bar is colored: green (satisfied), amber (in progress), gray (not started)
- "Next Steps" section: 1–3 bullet points from `recommendedActions`
- Sources footer: small text "Based on your transcript through [date] · [catalog year] requirements"
- "Talk to an advisor →" link: always visible, never buried

**What is NOT shown to students:**
- `confidenceScore`
- `chainOfThought`
- `humanReviewRequired` status (if true, staff is notified, student sees normal UI)
- Internal status enum values

**New API:**

```
GET /api/students/me/degree-audit   ← Returns latest audit, runs new one if >7 days old
```

---

### 5.4 Registrar Staff Review Queue

**New page:** `app/registrar/degree-audit/page.tsx`

The registrar's primary working view. Shows all `DegreeAuditResult` records that need
human attention.

**Three tabs:**

**Tab 1 — Needs Review** (`humanReviewRequired: true`, not yet reviewed)
- Student name, program, graduation term
- Audit status, confidence score
- Complex case flags: "Has transfers", "Major changed", "Incomplete grades"
- "Review" button → opens detail panel

**Tab 2 — Reviewed** (staff override recorded)
- History of reviewed cases with staff names and dates

**Tab 3 — All Audits** (full list, searchable)
- Search by name, program, status, graduation term

**Detail panel (reuses pattern from `CollabReview` detail):**
- Student profile summary
- Requirement-by-requirement breakdown
- Each requirement: status, which courses satisfied it, missing courses
- AI chain-of-thought steps (collapsed by default, expandable)
- Cited sources (with links where available)
- Staff override controls: dropdown + free text notes
- "Send notification to student" toggle (on override)

---

## 6. Sprint 4 — Petition & Workflow Automation (2 weeks)

### 6.1 Petition Data Model

```prisma
model Petition {
  id             String         @id @default(cuid())
  studentId      String
  student        User           @relation(fields: [studentId], references: [id])
  type           PetitionType
  status         PetitionStatus @default(SUBMITTED)

  formData       Json           // structured data per petition type (see below)
  eligibilityCheck Json?        // auto-validation result: { eligible, reasons, blockers }

  routedTo       String?        // role or email of assigned reviewer
  routedAt       DateTime?

  reviewedBy     String?
  reviewer       User?          @relation("PetitionReviewer", fields: [reviewedBy], references: [id])
  reviewedAt     DateTime?
  decision       PetitionDecision?
  decisionReason String?

  auditEntries   PetitionAuditEntry[]

  submittedAt    DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([studentId])
  @@index([status])
  @@index([type])
}

model PetitionAuditEntry {
  id         String   @id @default(cuid())
  petitionId String
  petition   Petition @relation(fields: [petitionId], references: [id])
  actorId    String
  actor      User     @relation(fields: [actorId], references: [id])
  action     String   // "SUBMITTED" | "ROUTED" | "REVIEWED" | "DECIDED" | "NOTIFIED"
  note       String?
  createdAt  DateTime @default(now())

  @@index([petitionId])
}

enum PetitionType {
  LATE_WITHDRAWAL
  GRADE_CHANGE
  NAME_UPDATE
  ENROLLMENT_CERTIFICATION
  ACADEMIC_RENEWAL
  COURSE_OVERLOAD
  GRADUATION_APPLICATION
  MAJOR_CHANGE
  LEAVE_OF_ABSENCE
}

enum PetitionStatus {
  SUBMITTED
  ELIGIBILITY_CHECKING
  PENDING_STUDENT_INFO
  IN_REVIEW
  APPROVED
  DENIED
  WITHDRAWN
}

enum PetitionDecision {
  APPROVED
  APPROVED_WITH_CONDITIONS
  DENIED
  DEFERRED
}
```

**Form data shapes per petition type (stored in `formData` JSON field):**

```typescript
// LATE_WITHDRAWAL
{ courseCode: string, term: string, reason: string, supportingDocType?: string }

// GRADE_CHANGE
{ courseCode: string, term: string, currentGrade: string, requestedGrade: string,
  instructorEmail: string, justification: string }

// NAME_UPDATE
{ legalFirstName: string, legalLastName: string, preferredName?: string,
  documentType: 'LEGAL_NAME_CHANGE' | 'COURT_ORDER' | 'MARRIAGE_CERT' }

// ENROLLMENT_CERTIFICATION
{ purpose: 'INSURANCE' | 'EMPLOYER' | 'LOAN' | 'SCHOLARSHIP' | 'HOUSING',
  termRequested: string, deliveryMethod: 'ELECTRONIC' | 'MAIL' }
```

---

### 6.2 Petition Submission Flow

**New page:** `app/petitions/page.tsx` — student-facing petition hub

**New page:** `app/petitions/new/[type]/page.tsx` — petition form per type

**New API routes:**

```
GET  /api/petitions              ← Student's own petitions
POST /api/petitions              ← Submit new petition
GET  /api/petitions/[id]         ← Petition detail
DELETE /api/petitions/[id]       ← Withdraw (only if SUBMITTED)
```

**Auto-eligibility validation** (`app/lib/petition-eligibility.ts`):

When a petition is submitted, run synchronous eligibility checks before persisting:

```typescript
export async function checkEligibility(
  petition: PetitionSubmission,
  student: User
): Promise<EligibilityResult> {

  const sis = getSISAdapter()

  switch (petition.type) {
    case 'LATE_WITHDRAWAL': {
      const enrollment = await sis.getCurrentEnrollment(student.sisStudentId!, currentTerm)
      const isEnrolled = enrollment.some(c => c.courseCode === petition.formData.courseCode)
      const deadline = await getWithdrawalDeadline(petition.formData.term)
      const isPastDeadline = new Date() > deadline

      return {
        eligible: isEnrolled,  // can still petition even past deadline (that's the point)
        reasons: [
          isEnrolled ? `Enrolled in ${petition.formData.courseCode}` : `Not enrolled in ${petition.formData.courseCode}`,
          isPastDeadline ? `Past standard withdrawal deadline (${formatDate(deadline)})` : `Within standard withdrawal window`
        ],
        blockers: isEnrolled ? [] : [`Cannot petition for a course you are not enrolled in`]
      }
    }
    // ... other petition types
  }
}
```

**Student UI pattern:** After submission, the student sees a persistent status tracker
(reuse the `Bounty` status pattern). Status badges use the friendly language:
- "Submitted" not "SUBMITTED"
- "Under Review" not "IN_REVIEW"
- "Approved" not "APPROVED"
- "More Information Needed" not "PENDING_STUDENT_INFO"

---

### 6.3 Petition Routing & Staff Dashboard

**Routing logic** (`app/lib/petition-routing.ts`):

```typescript
const PETITION_ROUTES: Record<PetitionType, string> = {
  LATE_WITHDRAWAL:         'registrar@uky.edu',
  GRADE_CHANGE:            'academicrec@uky.edu',  // + cc instructor
  NAME_UPDATE:             'records@uky.edu',
  ENROLLMENT_CERTIFICATION: 'certifications@uky.edu',
  ACADEMIC_RENEWAL:        'registrar@uky.edu',
  COURSE_OVERLOAD:         'advisor@uky.edu',       // route to student's advisor
  GRADUATION_APPLICATION:  'graduation@uky.edu',
  MAJOR_CHANGE:            'advising@uky.edu',
  LEAVE_OF_ABSENCE:        'deanofstudents@uky.edu',
}
```

**New page:** `app/registrar/petitions/page.tsx`

Same three-tab pattern as the degree audit review queue:
- **Needs Action** — new petitions in this staff member's queue
- **In Progress** — assigned to this reviewer
- **Completed** — decided petitions

**Email notifications** (using existing `app/lib/email.ts`):

| Event | Who Gets Email |
|---|---|
| Petition submitted | Student (confirmation + tracker link) |
| Petition routed | Assigned reviewer (with student context + action link) |
| More info needed | Student (specific question + reply link) |
| Decision made | Student (decision + reason + next steps) |

---

### 6.4 Graduation Clearance Batch Job

**New cron route:** `app/api/registrar/cron/graduation-clearance/route.ts`

**Schedule** (add to `vercel.json`):

```json
{ "path": "/api/registrar/cron/graduation-clearance", "schedule": "0 6 15 10,2,6 *" }
```
This runs at 6am on the 15th of October (December grads), February (May grads),
and June (August grads). Protected by `Authorization: Bearer ${CRON_SECRET}` header check.

**Logic:**

```typescript
export async function GET(request: Request) {
  // 1. Find all students with GRADUATION_APPLICATION petitions in current cycle
  const applicants = await prisma.petition.findMany({
    where: { type: 'GRADUATION_APPLICATION', status: 'IN_REVIEW' },
    include: { student: true }
  })

  const results = { cleared: [], actionNeeded: [], reviewRequired: [] }

  for (const applicant of applicants) {
    const audit = await runDegreeAudit(
      applicant.student.sisStudentId!,
      applicant.student.program!,
      applicant.student.catalogYear!
    )

    if (audit.overallStatus === 'ON_TRACK' && !audit.humanReviewRequired) {
      results.cleared.push(applicant)
      await notifyStudentGraduationStatus(applicant.student, 'ON_TRACK')
    } else if (audit.overallStatus === 'ACTION_NEEDED') {
      results.actionNeeded.push({ applicant, actions: audit.recommendedActions })
      await notifyStudentGraduationStatus(applicant.student, 'ACTION_NEEDED', audit.recommendedActions)
    } else {
      results.reviewRequired.push({ applicant, audit })
      // No student notification — registrar staff reviews first
    }
  }

  // Email digest to registrar staff
  await sendGraduationClearanceDigest(results)

  return NextResponse.json({ processed: applicants.length, ...summarize(results) })
}
```

**Critical safeguard:** Students in `results.reviewRequired` receive NO automated notification.
A human registrar staff member reviews the audit and makes the call. The system never
autonomously tells a student they cannot graduate.

---

## 7. Sprint 5 — Compliance Reporting (2 weeks)

### 7.1 Enrollment Reporting Queries

**New file:** `app/lib/registrar/reporting.ts`

```typescript
// Validated SQL queries for standard reporting

export async function getEnrollmentCounts(term: string, breakdowns: string[]) {
  // Returns enrollment counts by college, department, level, status
  // All queries run against SIS mirror, not student-facing DB
  // Results validated against expected ranges before export
}

export async function getDegreeCompletions(
  startDate: Date,
  endDate: Date
): Promise<DegreeCompletionReport> {
  // Returns degree completions by program, college, demographic
  // Used for IPEDS Completion Survey
}

export async function getRetentionCohort(entryTerm: string): Promise<RetentionReport> {
  // First-time, full-time freshmen cohort retention
  // Used for IPEDS Fall Enrollment Survey
}
```

**Important:** These queries must be reviewed and signed off by the Registrar before the
data is used in any federal or state submission. The system produces the query output;
it does NOT submit anything.

---

### 7.2 Public Analytics Dashboard

**New page:** `app/registrar/analytics/page.tsx` (REGISTRAR/ADMIN only)

Uses existing Recharts infrastructure to display:
- Enrollment trends by term (line chart)
- Enrollment by college/department (bar chart)
- Graduation rates over time (line chart)
- Transfer credit volume (area chart)
- Petition volume by type (donut chart)
- Average time-to-decision per petition type (bar chart)

**Differential privacy note:** These charts are for internal registrar use and UK leadership.
When/if any of these aggregate visualizations are published externally (website, board reports),
add k-anonymity checks: suppress any cell with fewer than 10 students, and add ±2% random
noise to percentages to prevent reverse-engineering of individual records.

**Implementation:** Add a `privatizeAggregates(data, minCellSize = 10)` helper to
`app/lib/registrar/reporting.ts`.

---

### 7.3 IPEDS Data Extraction (Human-Certified Only)

**New page:** `app/registrar/reports/ipeds/page.tsx`

A structured data pull tool — never an automated submitter.

**Workflow:**
1. Registrar staff selects report type (Fall Enrollment, Completion, Graduation Rate, etc.)
2. System runs the corresponding query from `reporting.ts`
3. Presents results in a review table with comparison to prior year
4. Flags any values that deviate >10% from prior year (possible data error)
5. Staff reviews, annotates anomalies
6. Staff clicks "Certify & Export" — exports as IPEDS-formatted CSV
7. Staff manually uploads to the IPEDS portal

**Explicit UI copy on the export button:**
> "Export for Review — You are responsible for verifying this data before submission to IPEDS.
> This export does not submit data automatically."

**Audit log entry:** Every export creates an `AdminAuditLog` entry with:
- Who exported, when
- Which report type
- Row count
- A hash of the exported data (for tamper evidence)

---

## 8. Trust Architecture

This is non-negotiable. Without it, users route around the system and automation fails.

### 8.1 Every AI Recommendation Shows Its Sources

Every degree audit result, transfer credit evaluation, and policy answer must display:

```typescript
// app/components/registrar/AuditSourcesCitation.tsx
// Renders as a collapsible "How was this determined?" section

<AuditSourcesCitation sources={audit.citedSources} />
// Renders: "Based on: 2024-2025 Undergraduate Catalog (p. 147) · Your transcript (last updated Jan 15, 2025)"
```

Sources must be:
- Specific (page numbers, document names, dates)
- Clickable where the source is a URL or in-system document
- Honest about limitations ("Transfer credit from University of Louisville evaluated against current UK catalog requirements")

### 8.2 Human Escalation Is Always One Tap Away

Every registrar-facing AI output must include a persistent "Talk to a person" affordance.
This is a design constraint, not a feature. It is never removed for "cleaner" UI.

```typescript
// app/components/registrar/HumanEscalationFooter.tsx
// Required on: DegreeProgressCard, TransferCreditResult, PetitionStatus, PolicyChatbot

<HumanEscalationFooter
  message="Have questions about this result?"
  ctaText="Contact the Registrar's Office"
  href="mailto:registrar@uky.edu"
  additionalText="Located in Main Building, Room 10 · Open Monday–Friday 8am–5pm"
/>
```

### 8.3 Staff See the Work, Not Just the Conclusion

The `chainOfThought` field on `DegreeAuditResult` stores every check the audit engine
performed. In the staff review UI, this is rendered as an expandable "Audit Steps" accordion:

```
✓ CS 311 (Discrete Math): Completed Fall 2023 — satisfies Core Math requirement (3 credits)
✓ CS 371 (Data Structures): Completed Spring 2024 — satisfies Core CS requirement (3 credits)
⚠ CS 415 (Algorithms): Currently enrolled — will satisfy Upper Division Core if passed
✗ CS 499 (Senior Capstone): Not yet completed — required for graduation
```

This is not shown to students. It is shown to registrar staff so they can verify or override
the AI's reasoning, not just accept its conclusion.

### 8.4 Uncertainty Is Always Communicated Explicitly

When `confidenceScore < 80` (staff-visible) or `humanReviewRequired === true`:

- **Student sees:** Normal audit result with an added notice: "Your degree plan has some
  complex elements that a Registrar's advisor is reviewing. We'll confirm your status within
  3 business days."
- **Staff sees:** Yellow warning banner: "Complex case — review required before student
  receives final status. Confidence: [score]%"
- **Student never sees the confidence score.** Showing a 67% confidence score to a student
  asking "will I graduate?" is harmful.

---

## 9. Equity Safeguards

These are load-bearing, not optional. AI systems have differential accuracy across student
populations. We must proactively protect the most vulnerable students.

### 9.1 Complex Case Detection

The `complexCaseFlag` field on `DegreeAuditResult` is set to `true` when ANY of:

```typescript
const complexCaseFlag =
  student.transferCredits.length > 0 ||          // Any transfer credits
  student.majorChanges > 0 ||                    // Changed major at least once
  student.hasActiveAccommodations === true ||     // DRC accommodations
  courseHistory.some(c => c.grade === 'I') ||   // Incomplete grade(s)
  courseHistory.some(c => c.grade === 'W') ||   // Withdrawal(s)
  courseHistory.some(c => c.repeatFlag) ||       // Repeated courses
  student.catalogYear !== currentCatalogYear ||  // On older catalog year
  enrollment.some(c => c.isConditional)          // Conditional enrollment
```

**When `complexCaseFlag === true`:**
- `humanReviewRequired` is automatically `true`
- Student's audit does NOT auto-advance to "On Track" regardless of the computed result
- Student receives the "under advisor review" notice
- Registrar staff receive a priority notification

### 9.2 Graduation Clearance Safeguard

The graduation clearance cron job (Sprint 4.4) **never sends an "On Track" notification
to a complex-case student** without staff review. The logic is:

```typescript
if (audit.overallStatus === 'ON_TRACK' && !audit.humanReviewRequired) {
  // SAFE: notify student
} else if (audit.overallStatus === 'ON_TRACK' && audit.humanReviewRequired) {
  // DO NOT notify student — route to staff first
  results.reviewRequired.push({ applicant, audit, reason: 'COMPLEX_CASE_ON_TRACK' })
}
```

This is the most important safeguard in the entire system. A wrong "you're cleared to
graduate" message to a complex-case student causes serious harm.

### 9.3 Equity Metrics in the Analytics Dashboard

Add to the registrar analytics dashboard (`Sprint 5.2`):

- **Transfer student audit accuracy rate** — tracked separately from non-transfer students
- **Complex-case processing time** — measure whether complex cases take longer to resolve
- **Demographic breakdown of petition outcomes** — flag if denial rates differ significantly
  across demographic groups (requires anonymized demographic data from SIS)

These metrics are for internal registrar review, not public reporting.

---

## 10. Culture & Change Management Strategy

### 10.1 Language in Internal Communications

**Never use:** "automation," "AI-decides," "replaces," "automatic processing"

**Always use:** "AI-assisted review," "pre-sorted for your review," "staff-verified,"
"the system prepares — you decide"

The graduation clearance batch job is "the overnight pre-sort." The degree audit is
"an AI-prepared advising brief." The policy chatbot is "always-on FAQ coverage."

### 10.2 Registrar's Office Verified Badge

Add to the existing tool badge system in `app/components/ToolCard.tsx`:

```typescript
// New badge: "Registrar Verified" — analogous to UK Official badge
// Applied to any tool reviewed and co-authored by Registrar's Office staff
// Distinct color: UK blue ring with graduation cap icon
```

Registrar staff should feel like the experts behind these tools, not the people being
replaced by them. Their name (as a department, not individuals) should appear on tools
they own.

### 10.3 Pilot Cohort Strategy

**Do not launch to all 30,000+ students at once.**

Pilot sequence:
1. **Week 1:** 5 registrar staff use the articulation dashboard and petition routing internally
2. **Week 3:** Policy chatbot available to 200 students in one college (e.g., A&S freshmen)
3. **Week 6:** Degree audit available to 100 seniors in one major (e.g., CS seniors)
4. **Week 10:** Transfer credit dashboard for all new transfer students
5. **Week 16:** Full rollout pending pilot review

Collect feedback via a post-interaction survey (2 questions max, built as a StarRating-style
component reusing the existing `ToolRating` model).

### 10.4 Staff Training Materials

Before the policy chatbot launches, run one 90-minute session with registrar staff:
- What the tool does and doesn't do
- How to update the policy documents when policies change
- How to review the AI's answers for accuracy
- What to do when a student reports a wrong answer

The training should be delivered using a tool built in The Sandbox itself — a Sandcastle
experience or guided chatbot. Eat the dog food.

---

## 11. What We Explicitly Don't Build

| Item | Reason |
|---|---|
| GraphRAG | Overkill for structured catalog data. Prisma relations + pgvector for fuzzy course matching is sufficient |
| "Neuro-symbolic AI" as a separate system | Implement as structured chain-of-thought logging in Claude + audit storage. Same auditability, zero added complexity |
| GenUI (AI-generated dynamic interfaces) | Build Recharts dashboards. AI-generated UI is inaccessible, fragile, and unmaintainable |
| Automated IPEDS submission | Federal compliance requires human certification. We build the query; staff submit |
| Affective computing | Infrastructure cost vs. benefit doesn't justify it for MVP. Use clear language and explicit uncertainty communication instead |
| Differential privacy on federal reports | Federal reports require exact counts, not noisy estimates. Apply DP only to public-facing aggregate dashboards |
| Autonomous graduation decision-making | The system never tells a student they cannot graduate. Staff decides, system prepares |

---

## 12. New Environment Variables

```
# Authentication
SHIBBOLETH_IDP_URL=https://shibboleth.uky.edu/idp/saml2/...
SHIBBOLETH_SP_ENTITY_ID=https://sandbox.uky.edu
SHIBBOLETH_SP_CERT=...
SHIBBOLETH_SP_PRIVATE_KEY=...
SESSION_SECRET=...              # Signs session JWTs (HttpOnly cookie)
SESSION_TTL_HOURS=8

# SIS Integration
SIS_API_KEY=...                 # Banner REST API key (provisioned by UK IT)
SIS_BASE_URL=https://banner.uky.edu/StudentApi/api/v1
SIS_MOCK=false                  # Set true to force mock adapter
SIS_CACHE_TTL_MINUTES=15        # Redis cache TTL for SIS responses

# Registrar Cron
REGISTRAR_NOTIFY_EMAIL=graduation@uky.edu   # Receives graduation clearance digest
```

---

## 13. Complete File Manifest

### New Prisma Models (add to `schema.prisma`)
- `UserRole` enum: add `REGISTRAR`
- `DegreeProgram`
- `DegreeRequirement`
- `RequirementCourse`
- `RequirementCategory` enum
- `DegreeAuditResult`
- `Petition`
- `PetitionAuditEntry`
- `PetitionType` / `PetitionStatus` / `PetitionDecision` enums
- `ArticulationRoutingRule`
- `User`: add `studentId`, `sisStudentId`, `program`, `catalogYear`, `majorChanges`,
  `hasActiveAccommodations` fields

### New Library Files (`app/lib/`)
```
auth/
  shibboleth.ts               ← SAML assertion verification
  session.ts                  ← HttpOnly JWT session helpers
  middleware.ts               ← Next.js middleware: verify session
sis/
  adapter.ts                  ← SISAdapter interface + type definitions
  banner-adapter.ts           ← Banner REST API implementation
  mock-adapter.ts             ← Demo/dev mock implementation
  index.ts                    ← Factory function
registrar/
  degree-audit.ts             ← runDegreeAudit(), evaluateRequirement()
  audit-summary.ts            ← Claude-powered natural language summary
  petition-eligibility.ts     ← checkEligibility() per petition type
  petition-routing.ts         ← PETITION_ROUTES mapping + routing logic
  reporting.ts                ← getEnrollmentCounts(), getDegreeCompletions(), etc.
  graduation-clearance.ts     ← Batch graduation clearance logic
```

### New API Routes (`app/api/`)
```
auth/
  shibboleth/login/route.ts
  shibboleth/callback/route.ts
  logout/route.ts
  me/route.ts
registrar/
  articulation/route.ts               ← GET all articulation requests (REGISTRAR/ADMIN)
  articulation/[id]/route.ts          ← PATCH decision + notes
  articulation/routing-rules/route.ts ← GET/POST routing rules
  degree-audit/[studentId]/route.ts   ← GET latest audit / POST force re-run
  degree-audit/[resultId]/review/route.ts ← PATCH staff override
  petitions/route.ts                  ← GET all petitions (REGISTRAR/ADMIN)
  petitions/[id]/route.ts             ← PATCH assign / decide
  programs/route.ts                   ← GET all degree programs
  programs/[id]/requirements/route.ts ← GET/PATCH requirements for a program
  reports/enrollment/route.ts
  reports/completions/route.ts
  reports/ipeds/[type]/route.ts
  analytics/route.ts
  cron/graduation-clearance/route.ts  ← Vercel cron job
students/
  me/degree-audit/route.ts            ← Student's own audit (STUDENT role)
petitions/
  route.ts                            ← GET/POST student's own petitions
  [id]/route.ts                       ← GET detail / DELETE withdraw
```

### New Pages (`app/`)
```
registrar/
  page.tsx                     ← Registrar home dashboard
  articulation/page.tsx        ← Transfer credit review queue
  degree-audit/page.tsx        ← Degree audit review queue
  petitions/page.tsx           ← Petition workflow dashboard
  programs/page.tsx            ← Degree requirements management
  analytics/page.tsx           ← Enrollment & reporting analytics
  reports/
    ipeds/page.tsx             ← IPEDS data extraction tool
petitions/
  page.tsx                     ← Student petition hub
  new/[type]/page.tsx          ← Petition submission form
```

### New Components (`app/components/`)
```
registrar/
  DegreeProgressCard.tsx       ← Student-facing degree audit summary
  AuditSourcesCitation.tsx     ← "How was this determined?" sources display
  AuditStepsAccordion.tsx      ← Staff-facing chain-of-thought steps
  RequirementBreakdown.tsx     ← Per-category progress bars
  HumanEscalationFooter.tsx   ← "Talk to a person" persistent affordance
  ComplexCaseBanner.tsx        ← Staff warning for flagged cases
  ArticulationDashboard.tsx    ← Transfer credit review queue table
  PetitionQueue.tsx            ← Petition workflow table
  PetitionDetailPanel.tsx      ← Petition review + decision UI
  PetitionStatusTracker.tsx    ← Student-facing petition status
  GraduationClearanceSummary.tsx ← Cron job output display
  RoutingRulesEditor.tsx       ← Department routing configuration
  IPEDSExportPanel.tsx         ← IPEDS data extraction + certification UI
  EnrollmentAnalyticsCharts.tsx ← Recharts-powered analytics
```

### Modified Files
```
app/service-bot/page.tsx       ← Add REGISTRAR role to permission check
app/api/tools/route.ts         ← Same role change for service bot creation
app/lib/service-bot-prompt.ts  ← Add "Uncertainty Acknowledgment" toggle logic
app/lib/auth-context.tsx       ← Add demo REGISTRAR user
app/lib/server-auth.ts         ← Support session cookie + demo header dual-mode
app/components/Header.tsx      ← Add /registrar nav item for REGISTRAR role
app/page.tsx                   ← Add DegreeProgressCard for STUDENT role
prisma/schema.prisma           ← All new models listed above
prisma/seed.ts                 ← Demo data for new models + registrar user
vercel.json                    ← Add graduation clearance cron schedule
```

---

## Dependency Map

```
Shibboleth SSO
    └── All registrar features that need real identity

SIS Adapter
    ├── Degree Audit Engine (Sprint 3)
    ├── Enrollment Advising (Sprint 4, future)
    └── Graduation Clearance (Sprint 4)

Degree Audit Engine
    ├── Student Degree Progress Card (Sprint 3)
    ├── Staff Review Queue (Sprint 3)
    └── Graduation Clearance Batch Job (Sprint 4)

Transfer Credit Dashboard (Sprint 2)
    ← Extends existing ArticulationRequest (no new dependencies)

Policy Chatbot (Sprint 2)
    ← Uses existing Service Bot Builder (no new dependencies, permission change only)

Petition Workflow (Sprint 4)
    ← New Petition model, reuses notification + email infrastructure

Reporting (Sprint 5)
    ← Depends on SIS Adapter + real enrollment data
```

---

*This document is the authoritative implementation spec for the Registrar Intelligence System.
Update it as decisions are made. When in doubt, refer to the north star:
the student asks, gets an accurate answer in 30 seconds, and a registrar staff member
can review and override it.*
