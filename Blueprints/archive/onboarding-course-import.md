# Educator Course Import — Auto Course Container Creation

## Overview

When an educator's profile is enriched during onboarding and courses are found (from the course catalog or faculty page), offer to auto-create course containers for them in The Sandbox. The educator lands on the platform having already "done something" — their courses exist, tools can be added, and students have a place to join. This dramatically shortens time-to-value for educators.

---

## The Moment

During profile confirmation (step 3 of onboarding), educators see their discovered courses listed with a one-click import option:

```
┌────────────────────────────────────────────────────────┐
│  Courses we found                                      │
│                                                        │
│  [✓]  TEK-100 — Introduction to Entrepreneurship      │
│  [✓]  TEK-201 — Technology Commercialization           │
│  [ ]  TEK-350 — Venture Lab (not sure this is yours)  │
│                                                        │
│  We'll create course spaces for the checked ones.      │
│  You can add, remove, or configure them at any time.   │
│                                                        │
│  + Add a course manually                               │
└────────────────────────────────────────────────────────┘
```

Courses with high confidence are pre-checked. Low-confidence courses (e.g. found the course but not certain the instructor match) are unchecked with a note.

---

## What "Creating a Course Space" Means

A course space is a container in The Sandbox with:

| Component | What it creates |
|---|---|
| Course record | `Course` row in DB with code, name, educator |
| Enrollment link | Unique join URL students use to enroll |
| Tool shelf | Empty tool collection scoped to the course |
| Sandy context | Sandy is aware of the course when on its page |

It does **not** pull syllabus, rosters, grades, or any LMS data — that's a separate LTI/Canvas integration (see `lti-bridge-blueprint.md`). This is just a named space.

---

## Discovery — Where Courses Come From

### Source 1: UK Course Catalog
Search by instructor name for the current semester.

```
GET https://uky.edu/courses/search?instructor=heath+price&semester=spring2026
```

Returns: course codes, names, section numbers, credit hours.

Confidence: **High** if the name match is unambiguous.

### Source 2: Faculty Page Parsing
Many college faculty pages list courses taught. The enrichment engine fetches the faculty page bio and looks for course code patterns (`[A-Z]{2,4}-\d{3}`).

Confidence: **Medium** — courses listed may be from prior semesters.

### Source 3: Course Catalog Cross-Reference
If course codes are found via faculty page, validate them against the current catalog to confirm they're active.

```typescript
async function validateCourseCode(code: string): Promise<CourseValidation> {
  const result = await queryCatalog(code);
  return {
    valid: result !== null,
    currentSemester: result?.semester === CURRENT_SEMESTER,
    name: result?.name,
    credits: result?.credits,
  };
}
```

---

## Confidence Classification for Courses

| Confidence | Criteria | UI behavior |
|---|---|---|
| High | Found in current semester catalog with instructor name match | Pre-checked |
| Medium | Found in catalog but semester unclear, or name match is partial | Pre-checked with note |
| Low | Found on faculty page but not in current catalog | Unchecked, labelled "not sure this is yours" |

---

## "Add a Course Manually" Flow

Simple inline form below the discovered courses:

```
+ Add a course manually

Course code   [ TEK-400              ]
Course name   [ Advanced Venture Lab ]
Semester      [ Spring 2026 ▼        ]

[ Add ]
```

Autocomplete on course code from the full UK catalog. Name auto-fills when a valid code is entered.

---

## What Happens After Import

### Immediately after account creation:

1. `Course` records created in DB, linked to educator's user ID
2. Educator redirected to homepage
3. Welcome banner shows: *"Your course spaces are ready. Add your first tool."*
4. Homepage shows a "Your Courses" section with each imported course

### Educator's first action prompt:

```
┌─────────────────────────────────────────────────────────┐
│  TEK-100 is ready                                       │
│  Add your first tool to get started                     │
│                                                         │
│  [  Browse tools for this course  ]                     │
│  [  Let Sandy suggest tools       ]                     │
│  [  Set up student enrollment     ]                     │
└─────────────────────────────────────────────────────────┘
```

---

## Student Enrollment

Once a course container exists, the educator can share an enrollment link:

```
Your TEK-100 enrollment link:
https://sandbox.uky.edu/join/tek100-sp26-x7k2

Share this with your students so they can join your course space.
```

Students who click the link and are already logged in join automatically. Students without accounts go through the magic signup flow first, then are automatically enrolled after completing onboarding.

---

## Database Schema

```prisma
model Course {
  id            String   @id @default(cuid())
  code          String   // "TEK-100"
  name          String   // "Introduction to Entrepreneurship"
  semester      String?  // "Spring 2026"
  educatorId    String
  enrollmentKey String   @unique @default(cuid()) // used in join URL
  importSource  String?  // "catalog" | "faculty-page" | "manual"
  importedAt    DateTime @default(now())
  createdAt     DateTime @default(now())

  educator      User               @relation("EducatorCourses", fields: [educatorId], references: [id])
  enrollments   CourseEnrollment[]
  tools         CourseToolShelf[]
}

model CourseEnrollment {
  id         String   @id @default(cuid())
  courseId   String
  userId     String
  role       String   // "EDUCATOR" | "STUDENT"
  enrolledAt DateTime @default(now())

  course     Course   @relation(fields: [courseId], references: [id])
  user       User     @relation(fields: [userId], references: [id])

  @@unique([courseId, userId])
}
```

---

## API Routes

### `POST /api/onboarding/import-courses`

Called at the end of onboarding when educator confirms their course selections.

```json
// Request
{
  "courses": [
    {
      "code": "TEK-100",
      "name": "Introduction to Entrepreneurship",
      "semester": "Spring 2026",
      "source": "catalog",
      "confidence": "high"
    },
    {
      "code": "TEK-201",
      "name": "Technology Commercialization",
      "semester": "Spring 2026",
      "source": "catalog",
      "confidence": "high"
    }
  ]
}

// Response
{
  "imported": [
    { "id": "cld123", "code": "TEK-100", "enrollmentUrl": "/join/tek100-sp26-x7k2" },
    { "id": "cld456", "code": "TEK-201", "enrollmentUrl": "/join/tek201-sp26-y3m9" }
  ]
}
```

### `GET /api/courses/[enrollmentKey]/join`

Student-facing join endpoint. Validates the key, enrolls the authenticated user, redirects to course page.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Educator teaches 8+ courses | Show max 5, with "show more" to avoid overwhelming |
| Course code already exists in DB | Skip creation, link educator to existing course |
| Two educators find the same course | Both can have course containers; they're separate spaces |
| Educator skips course import | No courses created; they can add later from profile/courses page |
| Student hits a course import screen | Not shown — course import is educator-only |

---

## Post-Onboarding Course Management

Educators can always manage courses at `/educator/courses`:
- Add new courses
- Edit course name/semester
- Deactivate old courses
- View enrolled students
- Manage tool shelf

---

## Related Documents

- `onboarding-magic-signup-core.md` — where course import fits in the flow
- `onboarding-llm-enrichment-engine.md` — how courses are discovered during enrichment
- `onboarding-intent-routing.md` — how "course-tools" intent routes to course setup
- `lti-bridge-blueprint.md` — future Canvas/LMS integration for roster and grade sync
- `courses-faculty-command-center.md` — full educator course management architecture
