# Blueprint: Tool Discovery & Builder Enhancements

> **Sprint Scope:** "Tools for your courses" homepage widget, fork/template tools from storefront, "Build a tool" quick action, import materials from course, pre-filled forms throughout.
> **Depends On:** Department Storefronts (complete). Faculty Homepage Intelligence (for clickable surfaces).
> **Estimated Size:** Medium (1 sprint)

---

## Context

Faculty create AI teaching tools in the Builder Studio (`/build`). The Department Storefronts feature allows discovery and browsing. But there's a **discovery gap on the homepage**: the platform knows what courses a faculty member teaches and what modules they're covering, but doesn't proactively suggest relevant tools from the marketplace.

Additionally, the builder doesn't leverage existing course context (materials, objectives) to pre-fill tool creation — forcing faculty to re-describe things the platform already knows.

---

## Key Files

| File | Role |
|------|------|
| `app/components/faculty-home/FacultyHomepage.tsx` | Add tools widget to Courses tab |
| `app/components/faculty-home/QuickActionsStrip.tsx` | Add "Build a tool" action |
| `app/hub/hub-config.ts` | Tool discovery/recommendation logic |
| `app/build/page.tsx` | Builder entry — add course context |
| `app/api/hub/recommendations/route.ts` | Extend for course-specific recommendations |
| `app/api/tools/[id]/fork/route.ts` | New: fork tool endpoint |

---

## Feature 1: "Tools for Your Courses" Homepage Widget

### What
A section within the "Your Courses" tab that recommends marketplace tools matching current course modules and learning objectives.

### UI (Below course health cards)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Suggested Tools for Your Courses
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEK-301 — Module 5: Instructional Design Models
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Case Study   │  │ ID Model     │  │ Design       │
│ Facilitator  │  │ Debate Arena │  │ Challenge    │
│ ★ 4.2 · 89× │  │ ★ 4.5 · 45× │  │ ★ 3.8 · 23× │
│ [Use] [Fork] │  │ [Use] [Fork] │  │ [Use] [Fork] │
└──────────────┘  └──────────────┘  └──────────────┘
Used by 8 instructors in Education Technology

EDU-450 — Module 8: Assessment Design
  No matching tools found. [Build one →]
```

### Recommendation Logic

```typescript
interface CourseToolRecommendation {
  courseId: string
  courseCode: string
  currentModule: string        // Current module based on syllabus timeline
  moduleObjectives: string[]   // Learning objectives for current module
  recommendedTools: Array<{
    toolId: string
    name: string
    rating: number
    useCount: number
    matchReason: string        // Why this tool matches
    departmentAdoption: number // How many instructors in same dept use it
  }>
}
```

**Matching strategy (in order of signal strength):**
1. **Objective match:** Tool's learning objectives overlap with current module objectives (cosine similarity on embeddings)
2. **Category match:** Tool category matches module topic keywords
3. **Department adoption:** Tools popular in the educator's department
4. **Similar course match:** Tools used in courses with similar course codes/descriptions

### API

```typescript
// GET /api/faculty/course-tool-recommendations
// Auth: requireEducatorUser
// Returns recommendations for all courses taught by authenticated user

// Implementation:
// 1. Get educator's courses + current modules (from course map timeline)
// 2. Get module objectives
// 3. Embed objectives → vector search against tool embeddings
// 4. Filter to MARKETPLACE tools only
// 5. Boost tools from same department
// 6. Return top 3 per course
```

### Empty State
When no tools match: "No matching tools for [Module]. [Build one →]" — links to builder with course context pre-filled.

---

## Feature 2: Fork Tool from Storefront

### What
Faculty can take any MARKETPLACE tool and create a private copy they can customize for their course.

### Fork Flow
1. Faculty clicks "Fork" on a tool card (homepage widget, storefront, or search results)
2. System creates a copy with:
   - Original tool's system prompt, persona, reference docs, and settings
   - New tool ID, owned by the forking educator
   - Status: DRAFT (private, not published)
   - `forkedFromId` pointing to original
   - Name: "[Original Name] (My Version)"
3. Faculty lands in the Builder with the forked tool loaded, ready to customize
4. They can modify system prompt, add course-specific materials, change persona, etc.
5. Save as DRAFT or publish to their course (PRIVATE deployment)

### Data Model Extension

```typescript
// Extend Tool model (or add field to existing):
model Tool {
  // ... existing fields
  forkedFromId  String?  // ID of the original tool
  forkedFrom    Tool?    @relation("ToolForks", fields: [forkedFromId], references: [id])
  forks         Tool[]   @relation("ToolForks")
}
```

### API

```typescript
// POST /api/tools/[id]/fork
// Auth: requireEducatorUser
// Body: { courseId?: string }  // Optional: auto-link to course
// Returns: { forkedToolId: string, redirectUrl: string }

// Implementation:
// 1. Verify original tool is MARKETPLACE (public)
// 2. Deep copy: system prompt, persona, audioPersona, reference docs, settings
// 3. Set status = DRAFT, creatorId = authenticated user
// 4. Set forkedFromId = original tool ID
// 5. If courseId provided, create ToolDeployment for that course
// 6. Return new tool ID + redirect to /build?edit=[forkedToolId]
```

### UI
- "Fork" button on tool cards (everywhere tools appear)
- Fork icon (lucide: `GitFork` or `Copy`)
- After fork: redirect to builder with toast "Tool forked! Customize it for your course."

### Attribution
- Forked tools show "Based on [Original Tool] by [Original Creator]" in builder and deployment
- Original creator can see fork count on their tool analytics

---

## Feature 3: "Build a Tool" Quick Action

### What
Add a 6th quick action to the QuickActionsStrip: "Build a tool."

### Current Actions (5)
1. Grade submissions
2. Post announcement
3. Create assignment
4. Schedule office hours
5. Write recommendation

### Addition
6. **Build a tool** — Icon: `Wrench` or `Blocks` — navigates to `/build`

### Context-Aware Launch
If the faculty member is viewing a specific course tab when they click "Build a tool":
- Navigate to `/build` with query param: `?courseId=[id]&module=[currentModule]`
- Builder auto-populates: course name, current module, learning objectives
- Reference docs section shows "Import from [course]" option

### Decision: Replace or Add?
- If the strip gets too wide with 6 items, consider replacing "Write recommendation" (less frequent) with "Build a tool" (more frequent for active educators)
- Alternatively, make the strip scrollable on mobile or use a "More..." overflow

---

## Feature 4: Import Materials from Course

### What
When building a tool, allow importing reference documents and context from an existing course instead of re-uploading.

### UI (In Builder's Reference Documents Section)

```
Reference Documents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[📁 Upload files]  [📚 Import from course]

Import from course:
┌──────────────────────────────────────┐
│ TEK-301 — Instructional Design       │
│   ☑ Module 5 materials (3 files)     │
│   ☐ Module 6 materials (2 files)     │
│   ☑ Syllabus                         │
│   ☐ All course materials (12 files)  │
│                                      │
│ EDU-450 — Assessment Design          │
│   ☐ Module 8 materials (4 files)     │
│                                      │
│ [Import selected]                    │
└──────────────────────────────────────┘
```

### Implementation
- Fetch course materials from `CourseMaterial` model: `prisma.courseMaterial.findMany({ where: { courseId, course: { instructorId: userId } } })`
- Copy selected materials as reference docs for the tool
- If materials are stored as file URLs (S3/Azure Blob), reference the same URL (no duplication)
- If materials are embedded text, copy the text content

### Objective Auto-Population
When importing from a course module, also auto-populate:
- Tool learning objectives from module objectives
- Tool description from module description
- Tool difficulty level from module difficulty (if available)

---

## Feature 5: Pre-Filled Forms Throughout the Interface

### Principle
Wherever the platform has enough context to pre-fill a form, it should. Faculty should edit, not create from scratch.

### Instances to Implement

| Context | Form | Pre-fill Logic |
|---------|------|---------------|
| Building tool for TEK-301 Module 5 | Tool builder | Auto-fill: name suggestion, description from objectives, category from module topic, difficulty from module |
| Posting announcement after engagement drop | Course post composer | Auto-fill: course, body draft about the specific module, audience = at-risk |
| Creating assignment for current module | Assignment creator | Auto-fill: course, module, objectives, rubric criteria from module topics |
| Writing recommendation for Alex Chen | Sandy rec tool | Auto-fill: student name, purpose, target org, student snapshot data |
| Scheduling office hours | Sandy tool | Auto-fill: typical time slot (from pattern), location (from profile) |
| Logging visit note | Visit note form | Auto-fill: student name, course (from office hours context) |

### Implementation Pattern
Each pre-fill should work via:
1. **URL query params:** `?courseId=X&module=Y` → component reads and populates
2. **Sandy prefill events:** `sandy-prefill` event with structured `detail` payload
3. **localStorage context:** Last-used course/module remembered for convenience

### UX Rule
- Pre-filled content is always **editable** — never locked
- Show a subtle indicator that content was auto-filled: light blue background that fades on first edit
- If the pre-fill is wrong, one click clears it to a blank state

---

## Acceptance Criteria

- [ ] "Tools for your courses" widget shows on Courses tab with AI-matched recommendations
- [ ] Recommendations use objective embedding similarity + department adoption
- [ ] Empty state for modules with no matching tools links to builder
- [ ] Fork tool API creates deep copy with `forkedFromId` link
- [ ] Fork button appears on tool cards (homepage, storefront, search)
- [ ] Forked tool opens in builder ready for customization
- [ ] "Build a tool" added to QuickActionsStrip (6th action or replacement)
- [ ] Context-aware builder launch with course/module pre-population
- [ ] "Import from course" in builder reference docs section
- [ ] Material import pulls from CourseMaterial model, scoped to educator's courses
- [ ] Pre-filled forms pattern applied to: tool builder, course posts, assignments, recommendations
- [ ] Pre-fill indicator (light blue fade) and clear-to-blank action
- [ ] Demo data: 3-5 marketplace tools per department with embeddings for recommendation matching

---

## Notes
- Tool recommendation quality depends on embedding coverage — ensure all MARKETPLACE tools have embeddings
- Fork doesn't copy student data, sessions, or analytics — only the tool definition
- Department adoption metric requires tracking which instructors deployed which tools
