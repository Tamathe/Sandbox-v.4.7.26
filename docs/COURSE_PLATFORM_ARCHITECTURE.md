# Course Platform Architecture

Architecture for the course-delivery layer of The Sandbox — extending the AI-tool marketplace into a full educator → learner course experience.

## 1. Goals

- Let educators package tools, readings, and assessments into structured courses.
- Let students enroll, progress, and earn completion records.
- Reuse the existing marketplace primitives (tools, users, tags) instead of duplicating them.
- Stay deployable on Vercel + Postgres; no new infra.

## 2. High-Level Layers

```
┌──────────────────────────────────────────────┐
│  UI (Next.js App Router)                     │
│   /courses, /courses/[slug], /learn/[id]     │
├──────────────────────────────────────────────┤
│  API routes (/api/courses/*)                 │
│   - authoring, enrollment, progress, grading │
├──────────────────────────────────────────────┤
│  Domain services                             │
│   CourseService · EnrollmentService ·        │
│   ProgressService · AssessmentService        │
├──────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                     │
├──────────────────────────────────────────────┤
│  External: Claude API, marketplace Tool refs │
└──────────────────────────────────────────────┘
```

## 3. Domain Model

| Entity | Purpose | Key fields |
|---|---|---|
| `Course` | Top-level container authored by an educator | `id, slug, title, description, ownerId, status (draft/published/archived), visibility, category, difficulty, estimatedHours` |
| `Module` | Ordered section within a course | `id, courseId, order, title, summary` |
| `Lesson` | Atomic learning unit inside a module | `id, moduleId, order, type (reading/tool/chatbot/video/assessment), contentRef` |
| `Enrollment` | User ↔ Course join | `id, userId, courseId, role (student/ta), enrolledAt, completedAt` |
| `LessonProgress` | Per-user state on a lesson | `id, enrollmentId, lessonId, status, score, lastSeenAt` |
| `Assessment` | Quiz / rubric definition | `id, lessonId, type, rubric, passingScore` |
| `Submission` | A learner attempt | `id, assessmentId, userId, payload, score, gradedBy, gradedAt` |
| `CourseToolLink` | Reuse marketplace tools as lesson content | `courseId, lessonId, toolId` |

Existing `User` and `Tool` models from the marketplace are referenced — not duplicated.

## 4. Lesson Content Polymorphism

`Lesson.type` + `contentRef` (JSON) keeps the schema flat:

- `reading` → `{ markdown }`
- `tool` → `{ toolId }` (links to marketplace `Tool`)
- `chatbot` → `{ systemPrompt, model, starterMessages }`
- `video` → `{ url, durationSec }`
- `assessment` → `{ assessmentId }`

Renderers live in `app/components/learn/lesson-renderers/` and switch on `type`.

## 5. API Surface

```
POST   /api/courses                  create draft
PATCH  /api/courses/:id              update metadata
POST   /api/courses/:id/publish
GET    /api/courses                  list / search / filter
GET    /api/courses/:slug            public detail

POST   /api/courses/:id/modules
POST   /api/modules/:id/lessons
PATCH  /api/lessons/:id/reorder

POST   /api/courses/:id/enroll
GET    /api/me/enrollments
POST   /api/lessons/:id/progress     mark viewed/completed
POST   /api/assessments/:id/submit
GET    /api/courses/:id/gradebook    educator only
```

All routes go through a thin `withAuth(role)` wrapper that uses the existing mock-auth profile selector.

## 6. Authoring Flow

1. Educator clicks **Create Course** → draft `Course` row.
2. Course Builder page (`/courses/[id]/edit`) shows a left rail of modules/lessons (drag-to-reorder) and a right pane editor that swaps based on lesson type.
3. Tool lessons open a marketplace picker that filters published `Tool`s the educator has access to.
4. **Publish** validates: ≥1 module, ≥1 lesson, all assessments have rubrics, then flips `status`.

## 7. Learner Flow

1. Browse `/courses` (mirrors marketplace card grid; reuses `<ToolCard>` styling as `<CourseCard>`).
2. Enroll → creates `Enrollment` and lands on `/learn/:courseId`.
3. Linear lesson navigator with a sidebar progress tree. `LessonProgress` is upserted on view and on completion.
4. On final lesson + passing scores → `Enrollment.completedAt` is set; a completion record is generated.

## 8. Assessment & Grading

- **Auto-graded**: multiple-choice and short-answer with key. Scored at submit time.
- **AI-assisted**: free-response graded by Claude using the rubric stored on the `Assessment`. Result is a *suggested* score that the educator confirms.
- **Manual**: educator opens `/courses/:id/gradebook` → submission → grade form.

Submissions are immutable; regrades create a new `Submission` row with `supersedesId`.

## 9. Permissions

| Action | Student | Educator (owner) | Admin |
|---|---|---|---|
| View published course | ✓ | ✓ | ✓ |
| View draft | — | ✓ | ✓ |
| Edit course | — | ✓ | ✓ |
| Enroll | ✓ | ✓ | ✓ |
| Grade submissions | — | ✓ | ✓ |
| Feature course | — | — | ✓ |

Enforced in the `withAuth` wrapper plus row-level checks in service methods.

## 10. Reuse of Marketplace Primitives

- **Tools** become first-class lesson content via `CourseToolLink`. Launching a tool lesson uses the same interstitial as the marketplace.
- **Tags / categories** are shared tables — a course and a tool can carry the same tag.
- **Upvote / favorite / comment** components are generic; they accept a `targetType` (`tool` | `course`) so courses get social signals for free.

## 11. Directory Layout

```
app/
  courses/
    page.tsx                  browse
    [slug]/page.tsx           public detail
    [id]/edit/                authoring UI
  learn/
    [courseId]/page.tsx       learner shell
  api/courses/...
  components/
    course/                   cards, builder, navigator
    learn/lesson-renderers/
lib/
  courses/
    course-service.ts
    enrollment-service.ts
    progress-service.ts
    assessment-service.ts
prisma/
  schema.prisma               + Course, Module, Lesson, ...
```

## 12. Migration Plan

1. Add Prisma models + migration; no changes to existing tool tables.
2. Ship authoring UI behind `?courses=1` flag.
3. Seed two demo courses (one tool-driven, one chatbot-driven).
4. Open enrollment to mock student profile.
5. Remove flag; add `/courses` to top nav.

## 13. Open Questions

- SSO timing — when real auth lands, replace mock profile with UK SSO claims; `Enrollment.userId` semantics stay identical.
- Certificates — out of MVP scope; `completedAt` is the hook.
- Analytics — basic completion funnel only; defer cohort analytics.
