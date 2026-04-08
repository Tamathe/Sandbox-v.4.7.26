# Blueprint: Policy Blast Radius Analyzer — Institutional Change Impact Tracing

> **Sprint Scope:** When a university policy changes, automatically trace its impact across courses, syllabi, faculty, students, compliance workflows, and AI policies. Produce an impact report showing who's affected and what needs updating.
> **Depends On:** Policy Navigator (complete — 94 real UK policies, RAG). Course policies system (complete). AI Literacy policy builder (complete).
> **Estimated Size:** Medium (2 sprints)
> **Deploy Order:** 7 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Automated institutional policy change impact analysis through cross-system graph traversal"

---

## Context

Universities change policies constantly — academic integrity, grading, accommodations, FERPA, attendance, AI use. Each change has a blast radius:
- Which courses reference this policy in their syllabus?
- Which faculty need to update their course policies?
- Which students are affected by the change?
- Which compliance workflows trigger?
- Which AI use policies (from the AI Literacy module) conflict with the new rule?

Currently, policy changes are announced via email and everyone figures out the impact manually. The Policy Blast Radius Analyzer traces impact automatically across 6 systems the moment a policy is updated.

### Cross-System Data Sources

| System | Source Models | Impact Question |
|---|---|---|
| **Policies** | `PolicyDocument`, `PolicyChunk` | What changed? |
| **Courses** | `CoursePolicy`, `CoursePolicyAck` | Which courses reference this policy? |
| **AI Policies** | `CourseAIPolicy` | Which AI use policies conflict? |
| **Syllabi** | `CourseMaterial` (syllabus type) | Which syllabi embed this policy language? |
| **Students** | `CourseEnrollment` | How many students are in affected courses? |
| **Compliance** | `ComplianceCalendarEvent`, `ComplianceTrainingModule` | Which compliance workflows trigger? |
| **Faculty** | `Course.creatorId` | Which faculty need to act? |
| **Petitions** | `Petition` | Any active petitions under the old policy? |

---

## Schema Changes

### New Model: `PolicyImpactReport`

```prisma
model PolicyImpactReport {
  id              String   @id @default(cuid())
  policyId        String
  policy          PolicyDocument @relation(fields: [policyId], references: [id])
  generatedAt     DateTime @default(now())
  generatedBy     String   // "auto" | userId

  changeDescription  String   // What changed in the policy
  severity           String   // "informational" | "moderate" | "significant" | "critical"

  // ── Impact Counts ──
  affectedCourses    Int
  affectedFaculty    Int
  affectedStudents   Int
  conflictingAIPolicies Int
  triggeredCompliance   Int
  activePetitions       Int

  // ── Detailed Impact ──
  impacts            PolicyImpact[]

  // ── Actions ──
  suggestedActions   String[]
  status             String   @default("pending") // "pending" | "in-progress" | "resolved"
  resolvedAt         DateTime?

  @@index([policyId, generatedAt])
  @@index([status])
}

model PolicyImpact {
  id          String   @id @default(cuid())
  reportId    String
  report      PolicyImpactReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  impactType  String   // "course-policy" | "ai-policy" | "syllabus" | "compliance" | "petition" | "training"
  targetId    String   // ID of affected entity
  targetLabel String   // Human-readable: "TEK 100 — Dr. Thompson"
  description String   // "Course AI policy allows unrestricted AI use, but new policy requires disclosure"
  severity    String   // "info" | "action-required" | "conflict"
  actionNeeded String? // "Update course AI policy to require disclosure"

  @@index([reportId])
  @@index([impactType])
}
```

---

## Service Architecture

### Impact Analyzer: `app/lib/policy-blast/impact-analyzer.ts`

```typescript
export async function analyzeImpact(
  policyId: string,
  changeDescription?: string
): Promise<PolicyImpactReportData> {
  const policy = await prisma.policyDocument.findUnique({
    where: { id: policyId },
    select: { id: true, title: true, category: true, content: true },
  })
  if (!policy) throw new Error('Policy not found')

  // Extract key terms from policy for matching
  const policyTerms = extractPolicyTerms(policy.title, policy.content)

  // Run all impact checks in parallel
  const [
    courseImpacts, aiPolicyImpacts, syllabiImpacts,
    complianceImpacts, petitionImpacts,
  ] = await Promise.all([
    checkCoursePolicyImpact(policyId, policyTerms),
    checkAIPolicyConflicts(policy, policyTerms),
    checkSyllabiReferences(policyTerms),
    checkComplianceWorkflows(policy.category),
    checkActivePetitions(policyTerms),
  ])

  const allImpacts = [
    ...courseImpacts, ...aiPolicyImpacts, ...syllabiImpacts,
    ...complianceImpacts, ...petitionImpacts,
  ]

  // Deduplicate affected faculty and students
  const affectedCourseIds = allImpacts
    .filter(i => i.metadata?.courseId)
    .map(i => i.metadata!.courseId as string)
  const uniqueCourseIds = [...new Set(affectedCourseIds)]

  const [facultyCount, studentCount] = await Promise.all([
    prisma.course.count({ where: { id: { in: uniqueCourseIds } } }),
    prisma.courseEnrollment.count({
      where: { courseId: { in: uniqueCourseIds }, role: 'STUDENT' },
    }),
  ])

  // Classify severity
  const severity = classifyImpactSeverity(allImpacts, studentCount)

  // Generate suggested actions
  const suggestedActions = await generateSuggestedActions(policy, allImpacts)

  return {
    policyId,
    changeDescription: changeDescription || `Policy updated: ${policy.title}`,
    severity,
    affectedCourses: uniqueCourseIds.length,
    affectedFaculty: facultyCount,
    affectedStudents: studentCount,
    conflictingAIPolicies: aiPolicyImpacts.length,
    triggeredCompliance: complianceImpacts.length,
    activePetitions: petitionImpacts.length,
    impacts: allImpacts,
    suggestedActions,
  }
}

async function checkCoursePolicyImpact(
  policyId: string,
  terms: string[]
): Promise<ImpactData[]> {
  // Find courses that have acknowledged or reference this policy
  const acks = await prisma.coursePolicyAck.findMany({
    where: { policyId },
    select: {
      course: { select: { id: true, title: true, creator: { select: { name: true, email: true } } } },
    },
  })

  return acks.map(a => ({
    impactType: 'course-policy',
    targetId: a.course.id,
    targetLabel: `${a.course.title} — ${a.course.creator.name}`,
    description: `Course has acknowledged this policy — may need re-acknowledgment after changes`,
    severity: 'action-required',
    actionNeeded: 'Faculty should review updated policy and re-acknowledge',
    metadata: { courseId: a.course.id },
  }))
}

async function checkAIPolicyConflicts(
  policy: { title: string; content: string | null },
  terms: string[]
): Promise<ImpactData[]> {
  // If the policy relates to AI/academic integrity, check course AI policies
  const aiRelated = terms.some(t =>
    ['ai', 'artificial intelligence', 'academic integrity', 'plagiarism', 'generative', 'chatgpt', 'disclosure'].includes(t)
  )
  if (!aiRelated) return []

  const aiPolicies = await prisma.courseAIPolicy.findMany({
    include: { course: { select: { id: true, title: true, creator: { select: { name: true } } } } },
  })

  // Use Haiku to check for conflicts
  const conflicts: ImpactData[] = []
  for (const ap of aiPolicies) {
    // Simple heuristic: if institutional policy restricts AI but course allows it
    const courseLevel = ap.defaultAILevel || 'unset'
    if (courseLevel === 'unrestricted' && policy.title.toLowerCase().includes('integrity')) {
      conflicts.push({
        impactType: 'ai-policy',
        targetId: ap.id,
        targetLabel: `${ap.course.title} — ${ap.course.creator.name}`,
        description: `Course allows unrestricted AI use but institutional policy may now require disclosure`,
        severity: 'conflict',
        actionNeeded: 'Review course AI policy for compliance with updated institutional policy',
        metadata: { courseId: ap.course.id },
      })
    }
  }

  return conflicts
}

async function checkSyllabiReferences(terms: string[]): Promise<ImpactData[]> {
  // Search document chunks for policy language in syllabi
  const impacts: ImpactData[] = []

  for (const term of terms.slice(0, 5)) { // Limit to top 5 terms
    const matches = await prisma.documentChunk.findMany({
      where: {
        content: { contains: term, mode: 'insensitive' },
        document: { type: 'SYLLABUS' },
      },
      select: {
        document: {
          select: {
            courseId: true,
            course: { select: { id: true, title: true, creator: { select: { name: true } } } },
          },
        },
      },
      take: 20,
    })

    for (const match of matches) {
      if (match.document?.course) {
        impacts.push({
          impactType: 'syllabus',
          targetId: match.document.course.id,
          targetLabel: `${match.document.course.title} — ${match.document.course.creator.name}`,
          description: `Syllabus contains language referencing "${term}" — may need updating`,
          severity: 'info',
          actionNeeded: 'Review syllabus for outdated policy references',
          metadata: { courseId: match.document.course.id },
        })
      }
    }
  }

  return deduplicateByTarget(impacts)
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/policy-blast/analyze` | POST | `requireAdminUser` | Trigger impact analysis for a policy |
| `/api/policy-blast/reports` | GET | `requireStaffOrAdminUser` | List all impact reports |
| `/api/policy-blast/reports/[reportId]` | GET | `requireStaffOrAdminUser` | Full report with impacts |
| `/api/policy-blast/reports/[reportId]/resolve` | POST | `requireAdminUser` | Mark report resolved |

---

## UI: Impact Report Page

New page at `/admin/policy-blast` (admin only):

```
┌──────────────────────────────────────────────────────────────────┐
│  POLICY IMPACT REPORT                                             │
│  Academic Integrity Policy — Updated 2026-03-24                   │
│  Severity: ■ SIGNIFICANT                                          │
│                                                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │  12  │ │   8  │ │  156 │ │   3  │ │   2  │ │   1  │        │
│  │Courses│ │Faculty│ │Students│ │AI Pol│ │Compl │ │Petns │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                                    │
│  ┌─ CONFLICTS (3) ───────────────────────────────────────────┐   │
│  │ 🔴 CS 101 — Dr. Johnson                                   │   │
│  │    Course allows unrestricted AI use — now requires        │   │
│  │    disclosure per updated integrity policy                 │   │
│  │    Action: Update course AI policy                         │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ ACTION REQUIRED (8) ─────────────────────────────────────┐   │
│  │ 🟠 TEK 100 — Dr. Thompson · Re-acknowledge policy         │   │
│  │ 🟠 ENG 201 — Dr. Williams · Re-acknowledge policy         │   │
│  │ ...                                                        │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  SUGGESTED ACTIONS:                                                │
│  • Send notification to 8 affected faculty to re-acknowledge      │
│  • Flag 3 course AI policies for review                           │
│  • Update compliance calendar with new effective date             │
│  • Brief Sandy with updated policy language                       │
│                                                                    │
│  [Notify Faculty]  [Mark Resolved]                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Sandy Tool

```typescript
{
  name: 'check_policy_impact',
  description: 'Check what courses, faculty, and students are affected by a policy change.',
  parameters: {
    type: 'object',
    properties: {
      policyTitle: { type: 'string', description: 'Name or keyword of the policy' },
    },
    required: ['policyTitle'],
  },
  permission: 'auto',
  handler: async ({ policyTitle }, context) => {
    if (context.userRole !== 'ADMIN' && context.userRole !== 'STAFF') {
      return { message: 'Policy impact analysis is available to admin and staff users.' }
    }

    const policy = await prisma.policyDocument.findFirst({
      where: { title: { contains: policyTitle, mode: 'insensitive' } },
    })
    if (!policy) return { message: `No policy found matching "${policyTitle}"` }

    const report = await analyzeImpact(policy.id)
    return {
      policy: policy.title,
      severity: report.severity,
      affectedCourses: report.affectedCourses,
      affectedFaculty: report.affectedFaculty,
      affectedStudents: report.affectedStudents,
      conflicts: report.impacts.filter(i => i.severity === 'conflict').length,
      suggestedActions: report.suggestedActions,
    }
  },
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/policy-blast/impact-analyzer.ts` | Core impact analysis engine |
| `app/lib/policy-blast/policy-blast-service.ts` | Report CRUD + resolution |
| `app/lib/policy-blast/types.ts` | Shared types |
| `app/api/policy-blast/analyze/route.ts` | POST — trigger analysis |
| `app/api/policy-blast/reports/route.ts` | GET — list reports |
| `app/api/policy-blast/reports/[reportId]/route.ts` | GET — full report |
| `app/api/policy-blast/reports/[reportId]/resolve/route.ts` | POST — resolve |
| `app/admin/policy-blast/page.tsx` | Impact report dashboard |
| `app/components/policy-blast/ImpactReport.tsx` | Full report view |
| `app/components/policy-blast/ImpactSummaryCards.tsx` | Count cards row |
| `app/components/policy-blast/ImpactList.tsx` | Grouped impact list |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `PolicyImpactReport`, `PolicyImpact` models |
| `app/lib/agent/tools/sandy-tools.ts` | Add `check_policy_impact` tool |
| `app/lib/agent/tool-registry.ts` | Register tool |
| `app/components/Header.tsx` | Add admin nav link |

---

## Migration Path

1. **Sprint 1**: Schema + impact analyzer (all 5 checks) + API routes + report page
2. **Sprint 2**: Sandy tool + auto-trigger on policy update + notification to affected faculty + compliance calendar sync

---

## Success Criteria

1. **Instant visibility.** Admin updates an academic integrity policy and within seconds sees: 12 courses, 8 faculty, 156 students, 3 AI policy conflicts.
2. **Conflicts surface.** Course AI policies that now violate institutional policy are flagged before students encounter the inconsistency.
3. **Actionable.** The report tells the admin exactly what to do — not just "things are affected."
