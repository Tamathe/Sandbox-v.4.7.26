# Academic Pathfinder — Major Exploration & What-If Planning
### University of Kentucky
### Created: 2026-03-24

---

## Problem Statement

A junior student considering a major change today faces a **fragmented, multi-tool scavenger hunt**. The platform has the backend data (8 seeded degree programs, a full catalog API, a working degree audit engine) but no student-facing UI connects these pieces into a coherent exploration journey.

**Current state:** 4 of 8 steps in the "should I change majors?" journey are completely blocked — no course catalog browse page, no what-if audit, no timeline comparison, no credit transfer mapping. The student ends up at "go talk to your advisor" in ~15 minutes with zero actionable data.

**Target state:** A student opens one page, picks an alternative program, and instantly sees: what transfers, what's missing, and how long it adds. Sandy coaches them through the implications. They walk into their advisor appointment prepared — not empty-handed.

**Three Pillars alignment:**
- **One Brain** — The what-if audit feeds Sandy's advising context. Sandy knows the student just explored CS-BS and can reference the gap analysis proactively.
- **Proactive Agency** — Sandy can detect students with declining engagement in their current major and suggest exploration before they're in crisis.
- **Generative Campus** — The platform generates a personalized analysis that didn't exist before the student asked. Every exploration makes the institutional brain smarter about cross-program pathways.

---

## Feature Overview

Three features, one page, one flow:

| # | Feature | What It Does | Builds On |
|---|---------|-------------|-----------|
| 1 | **Course Catalog Explorer** | Browse/search/filter all courses with prerequisite chains | `catalog-service.ts`, `/api/catalog/courses` |
| 2 | **What-If Degree Audit** | Run the audit engine against *any* program, not just current | `degree-audit.ts`, `/api/students/me/degree-audit` |
| 3 | **Graduation Timeline Comparison** | Side-by-side: current major vs. alternative — credits, semesters, overlap | `degree-plan-service.ts`, audit results |

All three converge at a new page: **`/explore-majors`** — accessible to all roles (nav quick-link for students).

---

## User Journey (Tiana's Story)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                             │
│  Student Homepage → Sandy nudge: "Thinking about your major?"            │
│  OR: Nav quick-link → /explore-majors                                    │
│  OR: Sandy Academic Advisor → "Let me help you explore" → link           │
├──────────────────────────────────────────────────────────────────────────┤
│  2. BROWSE                                                               │
│  /explore-majors → See all 8 programs as cards                           │
│  Filter by college, search by name                                       │
│  Current major highlighted with "Your Program" badge                     │
├──────────────────────────────────────────────────────────────────────────┤
│  3. COMPARE                                                              │
│  Click "Explore CS-BS" → What-If Audit runs                             │
│  Split view: Current (LAW-JD) vs Target (CS-BS)                         │
│  Requirement-by-requirement breakdown                                    │
│  Credits that transfer / Credits that don't / New credits needed          │
├──────────────────────────────────────────────────────────────────────────┤
│  4. PLAN                                                                 │
│  Timeline comparison: "Current: 2 semesters left → CS-BS: 5 semesters"  │
│  Semester-by-semester roadmap for the new program                        │
│  Missing prerequisites highlighted with chains                           │
├──────────────────────────────────────────────────────────────────────────┤
│  5. ACT                                                                  │
│  "Create Degree Plan for CS-BS" → pre-populated with transferable courses│
│  "Book Advisor Appointment" → college-specific contact card              │
│  "Ask Sandy" → opens concierge with full what-if context                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        /explore-majors (page)                           │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐    │
│  │  Program Grid         │  │  What-If Panel (shown after click)   │    │
│  │  ┌──────┐ ┌──────┐   │  │  ┌──────────────────────────────┐   │    │
│  │  │CS-BS │ │ENG-BA│   │  │  │  Credit Transfer Map          │   │    │
│  │  └──────┘ └──────┘   │  │  │  ✅ MA 109 → Gen Ed (3 cr)   │   │    │
│  │  ┌──────┐ ┌──────┐   │  │  │  ✅ PHI 100 → Gen Ed (3 cr)  │   │    │
│  │  │BIO-BS│ │LAW-JD│   │  │  │  ❌ LAW 601 → no match       │   │    │
│  │  │      │ │ YOUR │   │  │  └──────────────────────────────┘   │    │
│  │  └──────┘ └──────┘   │  │  ┌──────────────────────────────┐   │    │
│  │  ┌──────┐ ┌──────┐   │  │  │  Requirement Comparison       │   │    │
│  │  │NURS  │ │FIN-BS│   │  │  │  CORE: 0/40 credits          │   │    │
│  │  └──────┘ └──────┘   │  │  │  GEN_ED: 18/30 (60%)         │   │    │
│  │  ┌──────┐ ┌──────┐   │  │  │  ELECTIVE: 6/24 (25%)        │   │    │
│  │  │ME-BS │ │PSY-BA│   │  │  └──────────────────────────────┘   │    │
│  │  └──────┘ └──────┘   │  │  ┌──────────────────────────────┐   │    │
│  │                       │  │  │  Timeline Comparison          │   │    │
│  │  ┌──────────────────┐ │  │  │  Current: Spring 2028 (2 sem)│   │    │
│  │  │ Course Catalog   │ │  │  │  CS-BS:   Fall 2029 (5 sem)  │   │    │
│  │  │ Search & Browse  │ │  │  │  Delta: +3 semesters         │   │    │
│  │  └──────────────────┘ │  │  └──────────────────────────────┘   │    │
│  └──────────────────────┘  │  ┌──────────────────────────────┐   │    │
│                             │  │  Actions                      │   │    │
│                             │  │  [Create Plan] [Book Advisor] │   │    │
│                             │  └──────────────────────────────┘   │    │
│                             └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Course Catalog Explorer

### What It Does
A searchable, filterable browse page for the entire `CatalogCourse` table. Students can discover courses, see prerequisites, and understand what programs require them.

### Page Section
Collapsible section at the bottom of `/explore-majors`, also accessible standalone via `/catalog` (redirect alias).

### UI Components

**CatalogBrowser** (new component: `app/components/explore/CatalogBrowser.tsx`)
```
┌──────────────────────────────────────────────────────────┐
│  🔍 Search courses...          [Prefix ▾] [Credits ▾]   │
├──────────────────────────────────────────────────────────┤
│  CS 101 — Intro to Computer Science          3 credits   │
│  Prerequisites: none                                      │
│  "Introduction to problem solving, algorithms..."         │
│  Used in: CS-BS (Core), ME-BS (Elective)                 │
├──────────────────────────────────────────────────────────┤
│  CS 215 — Intro to Python                    3 credits   │
│  Prerequisites: CS 101                                    │
│  "Programming fundamentals using Python..."              │
│  Used in: CS-BS (Core)                                   │
├──────────────────────────────────────────────────────────┤
│  Showing 1-20 of 847 courses          [← Prev] [Next →] │
└──────────────────────────────────────────────────────────┘
```

### Data Source
- **Existing API:** `GET /api/catalog/courses?q=&prefix=&creditMin=&creditMax=&page=&pageSize=`
- **Existing service:** `searchCatalogCourses()` in `catalog-service.ts`
- **Existing data:** `getCatalogPrefixes()` for filter dropdown

### New: "Used in" Programs Query

**New service function** in `catalog-service.ts`:
```typescript
export async function getCoursePrograms(courseCode: string): Promise<{ programCode: string; programName: string; category: string }[]> {
  const reqs = await prisma.requirementCourse.findMany({
    where: { courseCode: { equals: courseCode, mode: 'insensitive' } },
    include: { requirement: { include: { program: { select: { code: true, name: true } } } } },
  })
  // Also check coursePatterns via regex match
  const patternMatches = await prisma.degreeRequirement.findMany({
    where: { coursePatterns: { isEmpty: false } },
    include: { program: { select: { code: true, name: true } } },
  })
  // ... combine and deduplicate
}
```

### New: Prerequisite Chain Expansion

**New service function** in `catalog-service.ts`:
```typescript
export async function getPrerequisiteChain(courseCode: string): Promise<PrerequisiteNode> {
  // Parse prerequisitesRaw → recursive lookup → build tree
  // Returns: { courseCode, title, credits, prerequisites: PrerequisiteNode[] }
  // Max depth: 4 levels (prevent infinite loops)
}
```

**New component:** `PrerequisiteTree.tsx` — collapsible tree view showing prerequisite chains. Each node is clickable (scrolls to course in catalog list).

### API Changes
- **Existing route (no changes):** `GET /api/catalog/courses`
- **New route:** `GET /api/catalog/courses/[courseCode]/programs` → returns programs that require this course
- **New route:** `GET /api/catalog/courses/[courseCode]/prerequisites` → returns prerequisite tree

### Files to Create
| File | Purpose |
|------|---------|
| `app/components/explore/CatalogBrowser.tsx` | Search/filter/browse UI |
| `app/components/explore/CourseCard.tsx` | Single course display with expand |
| `app/components/explore/PrerequisiteTree.tsx` | Collapsible prereq chain |
| `app/api/catalog/courses/[courseCode]/programs/route.ts` | Programs using this course |
| `app/api/catalog/courses/[courseCode]/prerequisites/route.ts` | Prerequisite tree |

### Files to Modify
| File | Change |
|------|--------|
| `app/lib/catalog-service.ts` | Add `getCoursePrograms()`, `getPrerequisiteChain()` |

---

## Feature 2: What-If Degree Audit

### What It Does
Runs the **existing** `runDegreeAudit()` engine against a *different* program than the student's current one. Shows a side-by-side comparison: current program audit vs. target program audit.

### Core Insight
The audit engine already accepts arbitrary `programCode` and `catalogYear` parameters. It just needs a new API route that doesn't hardcode `user.program` and a UI that presents the comparison.

### API

**New route:** `GET /api/students/me/degree-audit/what-if?program=CS-BS`

```typescript
// app/api/students/me/degree-audit/what-if/route.ts
export async function GET(request: NextRequest) {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const targetProgram = request.nextUrl.searchParams.get('program')
  if (!targetProgram) return NextResponse.json({ error: 'program required' }, { status: 400 })

  const catalogYear = user.catalogYear ?? '2024-2025'
  const sisId = user.sisStudentId ?? user.id

  // Run audit against target program
  const targetAudit = await runDegreeAudit(sisId, targetProgram, catalogYear)

  // Run audit against current program (for comparison)
  const currentProgram = user.program ?? 'UNDECLARED'
  const currentAudit = await runDegreeAudit(sisId, currentProgram, catalogYear)

  // Build transfer map: which completed courses count in the target program?
  const transferMap = buildTransferMap(currentAudit, targetAudit)

  // Strip staff-only fields
  const strip = (a: typeof targetAudit) => {
    const { chainOfThought: _, confidenceScore: __, ...safe } = a
    return safe
  }

  return NextResponse.json({
    current: strip(currentAudit),
    target: strip(targetAudit),
    transferMap,
    currentProgram,
    targetProgram,
  })
}
```

### New Service: Transfer Map Builder

**New function** in `app/lib/registrar/what-if-service.ts`:

```typescript
export interface TransferMapEntry {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  currentCategory: string        // What it satisfies in current program
  targetCategory: string | null  // What it satisfies in target program (null = doesn't transfer)
  transfers: boolean
}

export interface TransferMapSummary {
  entries: TransferMapEntry[]
  creditsTransfer: number        // Credits that count in target program
  creditsLost: number            // Credits that don't count
  creditsNeeded: number          // New credits required
  targetTotalCredits: number     // Target program total
}

export function buildTransferMap(
  currentAudit: DegreeAuditResultPayload,
  targetAudit: DegreeAuditResultPayload,
): TransferMapSummary {
  // For each satisfying course in currentAudit.requirementResults:
  //   Check if it appears in targetAudit.requirementResults.satisfyingCourses
  //   If yes → transfers: true, record target category
  //   If no → transfers: false, creditsLost++
  // creditsNeeded = targetTotalCredits - creditsTransfer
}
```

### UI Components

**WhatIfPanel** (new component: `app/components/explore/WhatIfPanel.tsx`)

Split into 4 sections:

#### Section A: Header Summary
```
┌──────────────────────────────────────────────────────────┐
│  What-If: You → Computer Science (BS)                    │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ 18/120  │  │ 42      │  │ 78      │  │ +3 sem  │   │
│  │ credits │  │ transfer │  │ needed  │  │ longer  │   │
│  │ complete│  │          │  │         │  │         │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└──────────────────────────────────────────────────────────┘
```

#### Section B: Credit Transfer Map
```
┌──────────────────────────────────────────────────────────┐
│  Credit Transfer Map                                     │
│                                                          │
│  ✅ Transfers (42 credits)                               │
│  ├── MA 109 — College Algebra (3 cr) → Gen Ed            │
│  ├── WRD 110 — Intro to Writing (3 cr) → Gen Ed          │
│  ├── PHI 100 — Intro to Philosophy (3 cr) → Gen Ed       │
│  └── ... 11 more courses                                 │
│                                                          │
│  ❌ Does Not Transfer (18 credits)                       │
│  ├── LAW 601 — Civil Procedure I (4 cr)                  │
│  ├── LAW 602 — Contracts I (4 cr)                        │
│  └── ... 3 more courses                                  │
└──────────────────────────────────────────────────────────┘
```

#### Section C: Requirement Comparison
```
┌──────────────────────────────────────────────────────────┐
│  CS-BS Requirements                                      │
│                                                          │
│  CORE (40 credits required)                 0/40 ██░░░░ │
│  ├── CS 101 — Intro to Computer Science     ❌ needed    │
│  ├── CS 215 — Intro to Python               ❌ needed    │
│  ├── CS 270 — Systems Programming           ❌ needed    │
│  └── ... 8 more                                          │
│                                                          │
│  GEN ED (30 credits required)              18/30 ████░░ │
│  ├── WRD 110 — Intro to Writing             ✅ complete  │
│  ├── MA 109 — College Algebra               ✅ complete  │
│  ├── BIO 103 — Basic Ideas of Biology       ❌ needed    │
│  └── ... 5 more                                          │
│                                                          │
│  ELECTIVE (24 credits required)             6/24 ██░░░░ │
│  └── 6 credits from current courses apply               │
│                                                          │
│  CAPSTONE (6 credits required)              0/6  ░░░░░░ │
│  ├── CS 498 — Senior Project I              ❌ needed    │
│  └── CS 499 — Senior Project II             ❌ needed    │
└──────────────────────────────────────────────────────────┘
```

#### Section D: Actions
```
┌──────────────────────────────────────────────────────────┐
│  [Create CS-BS Degree Plan]  [Book Advisor Appointment]  │
│                                                          │
│  Sandy says: "Switching from Law to CS is a big move,    │
│  but your gen-ed credits transfer well. The main gap is  │
│  the CS core — you'd start from CS 101. Want me to help  │
│  you map out the fastest path?"                          │
└──────────────────────────────────────────────────────────┘
```

### Files to Create
| File | Purpose |
|------|---------|
| `app/lib/registrar/what-if-service.ts` | `buildTransferMap()`, `estimateTimeline()` |
| `app/api/students/me/degree-audit/what-if/route.ts` | What-if audit endpoint |
| `app/components/explore/WhatIfPanel.tsx` | Main what-if comparison UI |
| `app/components/explore/CreditTransferMap.tsx` | Transfer/no-transfer course list |
| `app/components/explore/RequirementComparison.tsx` | Requirement-by-requirement bars |

### Files to Modify
| File | Change |
|------|--------|
| `app/lib/registrar/degree-audit.ts` | No changes — already accepts arbitrary programCode |

---

## Feature 3: Graduation Timeline Comparison

### What It Does
Calculates and visualizes: "If you stay in your current major, you graduate in X semesters. If you switch to [target], you graduate in Y semesters. Here's why."

### Timeline Estimation Logic

**New function** in `app/lib/registrar/what-if-service.ts`:

```typescript
export interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number       // Credits that count toward this program
  creditsRemaining: number       // Credits still needed
  estimatedSemesters: number     // Remaining semesters (15 credits/semester assumption)
  estimatedGraduation: string    // "Fall 2029"
  bottleneck: string | null      // "CS 101 → CS 215 → CS 315 → CS 498 (4-course chain)"
  prerequisiteChains: PrereqChain[]  // Longest chains that force sequencing
}

export interface PrereqChain {
  courses: string[]             // Ordered list: ["CS 101", "CS 215", "CS 315"]
  semestersRequired: number     // Length of chain (each course = 1 semester minimum)
}

export interface TimelineComparison {
  current: TimelineEstimate
  target: TimelineEstimate
  deltaSemesters: number         // Positive = longer, negative = shorter
  deltaCredits: number
  recommendation: string         // AI-generated one-line recommendation
}

export async function estimateTimeline(
  studentId: string,
  programCode: string,
  auditResult: DegreeAuditResultPayload,
): Promise<TimelineEstimate> {
  const creditsRemaining = auditResult.totalCreditsRequired - auditResult.totalCreditsCompleted

  // Base: 15 credits/semester standard load
  const baseSemesters = Math.ceil(Math.max(0, creditsRemaining) / 15)

  // Bottleneck: find longest prerequisite chain in missing courses
  const missingCodes = auditResult.requirementResults
    .flatMap(r => r.missingSuggestions)
    .map(s => s.split(' — ')[0])
  const chains = await findPrerequisiteChains(missingCodes)
  const longestChain = chains.sort((a, b) => b.semestersRequired - a.semestersRequired)[0]

  // Timeline = max(credit-based estimate, chain-based estimate)
  const chainSemesters = longestChain?.semestersRequired ?? 0
  const estimatedSemesters = Math.max(baseSemesters, chainSemesters)

  // Calculate graduation semester
  const now = new Date()
  const currentSemester = now.getMonth() < 5 ? 'Spring' : now.getMonth() < 8 ? 'Summer' : 'Fall'
  const currentYear = now.getFullYear()
  // ... advance by estimatedSemesters

  return {
    program: programCode,
    programName: '...',
    creditsCompleted: auditResult.totalCreditsCompleted,
    creditsRemaining,
    estimatedSemesters,
    estimatedGraduation: `${gradSemester} ${gradYear}`,
    bottleneck: longestChain
      ? `${longestChain.courses.join(' → ')} (${longestChain.semestersRequired}-course chain)`
      : null,
    prerequisiteChains: chains,
  }
}
```

### UI Component

**TimelineComparison** (new component: `app/components/explore/TimelineComparison.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│  Graduation Timeline                                     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ LAW-JD (current)                                 │    │
│  │ ████████████████████░░░░  Spring 2028 (2 sem)    │    │
│  │ 72/90 credits · 18 remaining                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ CS-BS (exploring)                                │    │
│  │ ████░░░░░░░░░░░░░░░░░░░  Fall 2029 (5 sem)      │    │
│  │ 42/120 credits · 78 remaining                     │    │
│  │ ⚠️ Bottleneck: CS 101 → CS 215 → CS 315 → CS 498│    │
│  │   (4-course prerequisite chain = 4 semesters min) │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Delta: +3 semesters · +60 credits                       │
│                                                          │
│  💡 Sandy: "The biggest factor isn't credits — it's the  │
│  prerequisite chain. CS 498 requires 3 courses before    │
│  it, each offered once per year. Starting CS 101 this    │
│  fall is critical to avoid adding a 6th semester."       │
└──────────────────────────────────────────────────────────┘
```

### Visual: Semester Roadmap (Optional Expand)

When student clicks "Show semester-by-semester plan":

```
┌──────────────────────────────────────────────────────────┐
│  Semester Roadmap → CS-BS                                │
│                                                          │
│  Fall 2026                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │CS 101│ │MA 113│ │PHY101│ │ENG201│ │WRD111│         │
│  │ NEW  │ │ NEW  │ │ NEW  │ │ DONE │ │ DONE │         │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│  15 credits (3 new + 2 transferred)                      │
│                                                          │
│  Spring 2027                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │CS 215│ │MA 214│ │PHY102│ │STA291│                   │
│  │ NEW  │ │ NEW  │ │ NEW  │ │ NEW  │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│  12 credits (all new)                                    │
│                                                          │
│  ... (Fall 2027, Spring 2028, Fall 2028, Spring 2029)    │
└──────────────────────────────────────────────────────────┘
```

### AI-Generated Recommendation

**New function** in `what-if-service.ts`:

```typescript
export async function generateWhatIfRecommendation(
  comparison: TimelineComparison,
  transferMap: TransferMapSummary,
): Promise<string> {
  // Haiku call — 1 sentence, honest, actionable
  // Input: credits transferring, credits lost, semester delta, bottleneck chain
  // Output: "The biggest factor isn't credits — it's the prerequisite chain..."
}
```

### Files to Create
| File | Purpose |
|------|---------|
| `app/components/explore/TimelineComparison.tsx` | Side-by-side graduation bars |
| `app/components/explore/SemesterRoadmap.tsx` | Expand: semester-by-semester course plan |

### Files to Modify
| File | Change |
|------|--------|
| `app/lib/registrar/what-if-service.ts` | Add `estimateTimeline()`, `generateWhatIfRecommendation()` |

---

## Main Page: `/explore-majors`

### Page File
`app/explore-majors/page.tsx`

### Layout
```
'use client' page with three states:
1. BROWSE — Program grid + catalog browser (default)
2. COMPARE — What-if panel + timeline (after selecting a target program)
3. LOADING — Skeleton while audit runs
```

### Page Structure

```tsx
<PageHeader
  title="Explore Majors"
  subtitle="See how your credits transfer to any program at UK"
/>

{/* Current Program Banner */}
<CurrentProgramBanner
  program={user.program}
  college={user.college}
  percentComplete={currentAudit?.percentComplete}
/>

{/* Tab: Browse Programs | Course Catalog */}
<TabNav tabs={['Programs', 'Course Catalog']} />

{/* Programs Tab */}
<ProgramGrid
  programs={allPrograms}
  currentProgram={user.program}
  onExplore={(programCode) => setTargetProgram(programCode)}
/>

{/* Course Catalog Tab */}
<CatalogBrowser />

{/* What-If Panel (slides in when target selected) */}
{targetProgram && (
  <WhatIfPanel
    currentAudit={currentAudit}
    targetAudit={targetAudit}
    transferMap={transferMap}
    timeline={timeline}
    onCreatePlan={handleCreatePlan}
    onBookAdvisor={handleBookAdvisor}
  />
)}
```

### Program Grid Card Design

Follow `PLATFORM-CONSISTENCY-MANIFEST.md`:

```tsx
<div className="bg-white rounded-2xl border-2 border-gray-200 hover:shadow-md
                hover:-translate-y-0.5 transition-all p-5 cursor-pointer group">
  <div className="flex items-start justify-between">
    <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
      <GraduationCap className="size-5 text-[#0033A0]" />
    </div>
    {isCurrentProgram && (
      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700
                       border border-emerald-200 rounded-full px-2.5 py-0.5">
        Your Program
      </span>
    )}
  </div>
  <h3 className="text-base font-extrabold text-gray-900 mt-3
                 group-hover:text-[#0033A0] transition-colors">{program.name}</h3>
  <p className="text-sm text-gray-500 mt-1">{program.college} · {program.department}</p>
  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
    <span>{program.totalCredits} credits</span>
    <span>{program.requirements.length} requirement areas</span>
  </div>
  <button className="mt-3 text-sm font-semibold text-[#0033A0] flex items-center gap-1
                     opacity-0 group-hover:opacity-100 transition-opacity">
    Explore <ArrowRight className="size-4" />
  </button>
</div>
```

---

## Sandy Integration

### Concierge Context Injection

When student is on `/explore-majors`, Sandy's system prompt includes:

```typescript
// In concierge-service.ts, add page-aware block:
if (currentPage === '/explore-majors') {
  sections.push(`
## Page Context: Academic Pathfinder
The student is exploring alternative majors. They may be considering a major change.

${targetProgram ? `
They are currently comparing their program (${currentProgram}) against ${targetProgram}.
Key findings:
- Credits that transfer: ${transferMap.creditsTransfer}
- Credits lost: ${transferMap.creditsLost}
- New credits needed: ${transferMap.creditsNeeded}
- Estimated additional semesters: ${timeline.deltaSemesters}
- Bottleneck: ${timeline.target.bottleneck ?? 'none detected'}

Be encouraging but honest. Reference specific numbers. If the delta is large (>2 semesters),
acknowledge the commitment and suggest they talk to an advisor before deciding.
` : 'They haven\'t selected a target program yet. Ask what they\'re interested in.'}
  `)
}
```

### Proactive Nudge (Student Homepage)

**New nudge type** in `concierge-service.ts`:

```typescript
// Trigger: student has declining engagement (sessions down 30%+ over 3 weeks)
// OR: student has asked Sandy about majors/careers in last 7 days
// OR: student is undeclared (program === null)

if (shouldSuggestExploration(user)) {
  nudges.push({
    type: 'explore-majors',
    message: "You've seemed less engaged with your coursework lately. " +
             "Sometimes that's a sign it's worth exploring what else is out there. " +
             "Want to see how your credits would transfer to other programs?",
    action: { href: '/explore-majors', label: 'Explore Majors' },
  })
}
```

### Auto-Create Degree Plan

When student clicks "Create Degree Plan for CS-BS":

```typescript
// Pre-populate the new plan with:
// 1. All courses that transfer (status: COMPLETED)
// 2. Currently enrolled courses that transfer (status: REGISTERED)
// 3. AI-suggested next courses for remaining requirements (status: PLANNED)

async function createWhatIfPlan(
  userId: string,
  targetProgramId: string,
  transferMap: TransferMapSummary,
): Promise<DegreePlan> {
  const plan = await createDegreePlan(userId, {
    title: `What-If: ${targetProgramName}`,
    programId: targetProgramId,
  })

  // Add transferring courses as COMPLETED
  for (const entry of transferMap.entries.filter(e => e.transfers)) {
    await addCourseToPlan(plan.id, userId, {
      courseCode: entry.courseCode,
      semester: 'Transfer',
      year: 0,
      status: 'COMPLETED',
    })
  }

  // Get AI suggestions for remaining requirements
  const suggestions = await getCourseSuggestions(userId)
  // Add top suggestions as PLANNED...

  return plan
}
```

---

## Navigation Changes

### Quick-Link Addition

In `Header.tsx`, add to student quick-links dropdown:

```typescript
{ label: 'Explore Majors', href: '/explore-majors', icon: Compass }
```

Visible to all roles (consistent with "all tools open to all roles" policy).

### Student Homepage Link

Add an `Explore Majors` card to the student homepage's quick-actions area, positioned after the existing course enrollment strip.

---

## Data Model Changes

**No schema changes required.** All features build on existing models:
- `DegreeProgram` + `DegreeRequirement` + `RequirementCourse` (browse programs)
- `CatalogCourse` (browse courses)
- `DegreeAuditResult` (what-if audit — uses existing `runDegreeAudit()`)
- `TranscriptRecord` (credit transfer analysis)
- `DegreePlan` + `PlannedCourse` (auto-create plan from what-if)

The only new data written is the auto-created `DegreePlan` (when student clicks "Create Plan").

---

## API Route Summary

| Route | Method | Auth | Purpose | New? |
|-------|--------|------|---------|------|
| `GET /api/catalog/courses` | GET | Any | Search catalog | Existing |
| `GET /api/catalog/courses/[courseCode]/programs` | GET | Any | Programs requiring this course | **New** |
| `GET /api/catalog/courses/[courseCode]/prerequisites` | GET | Any | Prerequisite chain tree | **New** |
| `GET /api/degree-plan/programs` | GET | Any | List all programs | Existing |
| `GET /api/students/me/degree-audit` | GET | Any | Current program audit | Existing |
| `GET /api/students/me/degree-audit/what-if` | GET | Any | What-if audit + transfer map | **New** |
| `POST /api/degree-plan` | POST | Any | Create plan (for auto-create) | Existing |
| `POST /api/degree-plan/[planId]/courses` | POST | Any | Add courses (for auto-populate) | Existing |

---

## File Inventory (All New Files)

### Pages (1)
| File | Lines (est.) |
|------|-------------|
| `app/explore-majors/page.tsx` | ~400 |

### Components (8)
| File | Lines (est.) |
|------|-------------|
| `app/components/explore/ProgramGrid.tsx` | ~120 |
| `app/components/explore/ProgramCard.tsx` | ~80 |
| `app/components/explore/CurrentProgramBanner.tsx` | ~60 |
| `app/components/explore/CatalogBrowser.tsx` | ~250 |
| `app/components/explore/CourseCard.tsx` | ~100 |
| `app/components/explore/PrerequisiteTree.tsx` | ~120 |
| `app/components/explore/WhatIfPanel.tsx` | ~300 |
| `app/components/explore/CreditTransferMap.tsx` | ~150 |
| `app/components/explore/RequirementComparison.tsx` | ~180 |
| `app/components/explore/TimelineComparison.tsx` | ~200 |
| `app/components/explore/SemesterRoadmap.tsx` | ~180 |

### API Routes (3 new)
| File | Lines (est.) |
|------|-------------|
| `app/api/catalog/courses/[courseCode]/programs/route.ts` | ~25 |
| `app/api/catalog/courses/[courseCode]/prerequisites/route.ts` | ~25 |
| `app/api/students/me/degree-audit/what-if/route.ts` | ~50 |

### Services (1 new + 1 modified)
| File | Lines (est.) |
|------|-------------|
| `app/lib/registrar/what-if-service.ts` | ~200 |
| `app/lib/catalog-service.ts` (modified) | +80 |
| `app/lib/concierge-service.ts` (modified) | +30 |

### Total Estimate
- **~15 new files**
- **~2,350 lines of code**
- **3 modified files**
- **0 schema migrations**

---

## Implementation Order

### Phase 1: Foundation (build bottom-up)
1. `what-if-service.ts` — `buildTransferMap()`, `estimateTimeline()`, `generateWhatIfRecommendation()`
2. `catalog-service.ts` additions — `getCoursePrograms()`, `getPrerequisiteChain()`
3. Three new API routes (thin handlers)

### Phase 2: Components (build in isolation)
4. `ProgramCard.tsx` + `ProgramGrid.tsx` — program browsing
5. `CatalogBrowser.tsx` + `CourseCard.tsx` + `PrerequisiteTree.tsx` — catalog browsing
6. `CreditTransferMap.tsx` + `RequirementComparison.tsx` — what-if details
7. `TimelineComparison.tsx` + `SemesterRoadmap.tsx` — timeline visualization
8. `WhatIfPanel.tsx` — compose all what-if components

### Phase 3: Page Assembly
9. `explore-majors/page.tsx` — compose all components, wire state
10. `CurrentProgramBanner.tsx` — student's current program context

### Phase 4: Integration
11. `Header.tsx` — add nav quick-link
12. `concierge-service.ts` — add `/explore-majors` page context block
13. Auto-create degree plan logic (uses existing `degree-plan-service.ts`)

### Phase 5: Polish
14. Loading skeletons + error states
15. Mobile responsive (stack what-if panel below grid on mobile)
16. Empty states (no programs seeded, no transcript data)

---

## Constraints & Guard Rails

- **No schema migrations** — all features build on existing models
- **No new AI models** — uses Haiku (existing) for recommendations
- **Disclaimer banner** — every what-if result shows: "This is an estimate. Your college advisor has the final say on credit transfer and graduation requirements."
- **No registration flow** — this is exploration, not enrollment
- **Caching** — what-if audits are NOT cached (they're exploratory, not canonical). Only `GET /api/students/me/degree-audit` (current program) uses the 7-day cache.
- **Auth** — all routes use `requireRequestUser` (any authenticated user). No role gating.
- **Rate limiting** — what-if audit calls `runDegreeAudit()` twice per request. Apply rate limit: 10 what-if requests per hour per user.

---

## Success Criteria

After this ships, Tiana should be able to:

1. Open `/explore-majors` from nav or Sandy suggestion → **< 2 seconds**
2. See all 8 programs with her current one highlighted → **immediate**
3. Click "Explore CS-BS" → see complete what-if analysis → **< 5 seconds**
4. Understand exactly which credits transfer and which don't → **visual, no reading walls of text**
5. See graduation timeline delta with bottleneck explanation → **one glance**
6. Create a pre-populated CS-BS degree plan → **one click**
7. Walk into advisor appointment with printed/screenshotted comparison → **prepared, not empty-handed**

**The measure:** time from "I wonder about changing majors" to "I have a data-backed plan to discuss with my advisor" drops from **∞ (impossible today)** to **under 5 minutes**.
