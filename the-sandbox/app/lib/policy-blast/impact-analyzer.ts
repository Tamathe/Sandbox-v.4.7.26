/**
 * Policy Blast Radius — Impact Analyzer Engine
 *
 * Core engine that traces the blast radius of a policy change across
 * courses, AI policies, syllabi, compliance workflows, and petitions.
 * Runs 5 checks in parallel via Promise.all.
 */

import { prisma } from '../prisma'
import type { ImpactData, PolicyImpactReportData } from './types'

// ── Public API ───────────────────────────────────────────────────────────────

export async function analyzeImpact(
  policyId: string,
  changeDescription?: string,
): Promise<PolicyImpactReportData> {
  const policy = await prisma.policyDocument.findUnique({
    where: { id: policyId },
    select: { id: true, title: true, category: true, fullText: true },
  })
  if (!policy) throw new Error('Policy not found')

  const policyTerms = extractPolicyTerms(policy.title, policy.fullText)

  // Run all 5 impact checks in parallel
  const [courseImpacts, aiPolicyImpacts, syllabiImpacts, complianceImpacts, petitionImpacts] =
    await Promise.all([
      checkCoursePolicyImpact(policyId, policyTerms),
      checkAIPolicyConflicts(policy, policyTerms),
      checkSyllabiReferences(policyTerms),
      checkComplianceWorkflows(policy.category),
      checkActivePetitions(policyTerms),
    ])

  const allImpacts = [
    ...courseImpacts,
    ...aiPolicyImpacts,
    ...syllabiImpacts,
    ...complianceImpacts,
    ...petitionImpacts,
  ]

  // Deduplicate affected courses for counts
  const affectedCourseIds = allImpacts
    .filter((i) => i.metadata?.courseId)
    .map((i) => i.metadata!.courseId as string)
  const uniqueCourseIds = [...new Set(affectedCourseIds)]

  const [facultyCount, studentCount] = await Promise.all([
    uniqueCourseIds.length > 0
      ? prisma.course.count({ where: { id: { in: uniqueCourseIds } } })
      : Promise.resolve(0),
    uniqueCourseIds.length > 0
      ? prisma.courseEnrollment.count({
          where: { courseId: { in: uniqueCourseIds } },
        })
      : Promise.resolve(0),
  ])

  const severity = classifyImpactSeverity(allImpacts, studentCount)
  const suggestedActions = generateSuggestedActions(policy, allImpacts)

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

// ── Check 1: Course Policy Impact ────────────────────────────────────────────

async function checkCoursePolicyImpact(
  policyId: string,
  terms: string[],
): Promise<ImpactData[]> {
  // CoursePolicyAck doesn't link directly to PolicyDocument, so we search
  // CoursePolicy content for policy terms to find affected courses
  const impacts: ImpactData[] = []
  const seenCourseIds = new Set<string>()

  for (const term of terms.slice(0, 5)) {
    const matches = await prisma.coursePolicy.findMany({
      where: {
        content: { contains: term, mode: 'insensitive' },
      },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, email: true } },
          },
        },
      },
      take: 30,
    })

    for (const m of matches) {
      if (seenCourseIds.has(m.course.id)) continue
      seenCourseIds.add(m.course.id)
      impacts.push({
        impactType: 'course-policy',
        targetId: m.course.id,
        targetLabel: `${m.course.title} — ${m.course.instructor.name}`,
        description: `Course policy references "${term}" — may need updating after policy change`,
        severity: 'action-required',
        actionNeeded: 'Faculty should review updated policy and update course policy accordingly',
        metadata: { courseId: m.course.id },
      })
    }
  }

  return impacts
}

// ── Check 2: AI Policy Conflicts ─────────────────────────────────────────────

async function checkAIPolicyConflicts(
  policy: { title: string; fullText: string | null },
  terms: string[],
): Promise<ImpactData[]> {
  const aiRelated = terms.some((t) =>
    [
      'ai',
      'artificial intelligence',
      'academic integrity',
      'plagiarism',
      'generative',
      'chatgpt',
      'disclosure',
    ].includes(t),
  )
  if (!aiRelated) return []

  const aiPolicies = await prisma.courseAIPolicy.findMany({
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
        },
      },
    },
  })

  const conflicts: ImpactData[] = []
  for (const ap of aiPolicies) {
    // Heuristic: if institutional policy relates to integrity but course stance is permissive
    const stance = ap.stance
    if (
      (stance === 'INTEGRATE' || stance === 'REQUIRE') &&
      policy.title.toLowerCase().includes('integrity')
    ) {
      conflicts.push({
        impactType: 'ai-policy',
        targetId: ap.id,
        targetLabel: `${ap.course.title} — ${ap.course.instructor.name}`,
        description: `Course AI stance is "${stance}" but institutional policy may now require stricter disclosure or restrictions`,
        severity: 'conflict',
        actionNeeded: 'Review course AI policy for compliance with updated institutional policy',
        metadata: { courseId: ap.course.id },
      })
    }
  }

  return conflicts
}

// ── Check 3: Syllabi References ──────────────────────────────────────────────

async function checkSyllabiReferences(terms: string[]): Promise<ImpactData[]> {
  const impacts: ImpactData[] = []
  const seenCourseIds = new Set<string>()

  for (const term of terms.slice(0, 5)) {
    const matches = await prisma.documentChunk.findMany({
      where: {
        content: { contains: term, mode: 'insensitive' },
        material: { materialType: 'syllabus' },
      },
      include: {
        material: {
          include: {
            course: {
              include: {
                instructor: { select: { name: true } },
              },
            },
          },
        },
      },
      take: 20,
    })

    for (const match of matches) {
      const course = match.material?.course
      if (!course || seenCourseIds.has(course.id)) continue
      seenCourseIds.add(course.id)
      impacts.push({
        impactType: 'syllabus',
        targetId: course.id,
        targetLabel: `${course.title} — ${course.instructor.name}`,
        description: `Syllabus contains language referencing "${term}" — may need updating`,
        severity: 'info',
        actionNeeded: 'Review syllabus for outdated policy references',
        metadata: { courseId: course.id },
      })
    }
  }

  return impacts
}

// ── Check 4: Compliance Workflows ────────────────────────────────────────────

async function checkComplianceWorkflows(category: string): Promise<ImpactData[]> {
  // Map policy categories to compliance event types
  const categoryToEventTypes: Record<string, string[]> = {
    'Academic & Compliance': ['policy-review', 'audit-scheduled', 'training-deadline'],
    'HR & Employment': ['training-deadline', 'policy-review'],
    'IT & Data': ['dpa-expiry', 'consent-renewal', 'audit-scheduled'],
    'Student Affairs': ['policy-review', 'training-deadline'],
    'Finance & Procurement': ['audit-scheduled', 'policy-review'],
    'Facilities & Operations': ['audit-scheduled'],
  }

  const relevantTypes = categoryToEventTypes[category] ?? ['policy-review']

  const events = await prisma.complianceCalendarEvent.findMany({
    where: {
      eventType: { in: relevantTypes },
      completed: false,
      dueDate: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      eventType: true,
      dueDate: true,
    },
    take: 20,
  })

  return events.map((e) => ({
    impactType: 'compliance' as const,
    targetId: e.id,
    targetLabel: `${e.title} (${e.eventType})`,
    description: `Compliance event "${e.title}" due ${e.dueDate.toISOString().split('T')[0]} may be affected by policy change`,
    severity: 'action-required' as const,
    actionNeeded: 'Review compliance timeline and update if policy effective date changes',
  }))
}

// ── Check 5: Active Petitions ────────────────────────────────────────────────

async function checkActivePetitions(terms: string[]): Promise<ImpactData[]> {
  // Find petitions that are still open (not resolved)
  const petitions = await prisma.petition.findMany({
    where: {
      status: { in: ['SUBMITTED', 'ELIGIBILITY_CHECKING', 'PENDING_STUDENT_INFO', 'IN_REVIEW'] },
    },
    select: {
      id: true,
      type: true,
      status: true,
      student: { select: { name: true } },
      submittedAt: true,
    },
    take: 50,
  })

  // Filter petitions whose type relates to the policy terms
  const impacts: ImpactData[] = []
  for (const p of petitions) {
    const petitionType = p.type.toLowerCase().replace(/_/g, ' ')
    const matches = terms.some((t) => petitionType.includes(t))
    if (matches) {
      impacts.push({
        impactType: 'petition',
        targetId: p.id,
        targetLabel: `${p.type} petition — ${p.student.name}`,
        description: `Active ${p.status} petition may be affected by policy change`,
        severity: 'action-required',
        actionNeeded: 'Review petition under updated policy language',
      })
    }
  }

  return impacts
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function extractPolicyTerms(title: string, content: string | null): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was',
    'will', 'has', 'have', 'been', 'not', 'but', 'all', 'can', 'had',
    'her', 'his', 'its', 'may', 'new', 'now', 'old', 'see', 'way',
    'who', 'did', 'get', 'let', 'say', 'she', 'too', 'use', 'any',
    'each', 'which', 'their', 'shall', 'must', 'should', 'would',
    'could', 'also', 'than', 'other', 'into', 'only', 'very',
    'university', 'kentucky', 'policy', 'regulation', 'section',
    'part', 'article', 'chapter', 'pursuant', 'herein',
  ])

  // Extract significant terms from title
  const titleTerms = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  // Extract key phrases from content (first 2000 chars)
  const contentSnippet = (content || '').slice(0, 2000).toLowerCase()
  const contentTerms = contentSnippet
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))

  // Count frequency, take top terms
  const freq = new Map<string, number>()
  for (const t of [...titleTerms, ...titleTerms, ...contentTerms]) {
    freq.set(t, (freq.get(t) || 0) + 1)
  }

  // Title terms get priority, then content frequency
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)

  // Also add multi-word phrases from title
  const titlePhrases: string[] = []
  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
  for (let i = 0; i < titleWords.length - 1; i++) {
    const bigram = `${titleWords[i]} ${titleWords[i + 1]}`
    if (!stopWords.has(titleWords[i]) && !stopWords.has(titleWords[i + 1])) {
      titlePhrases.push(bigram)
    }
  }

  return [...titlePhrases, ...sorted].slice(0, 10)
}

function classifyImpactSeverity(
  impacts: ImpactData[],
  studentCount: number,
): 'informational' | 'moderate' | 'significant' | 'critical' {
  const hasConflicts = impacts.some((i) => i.severity === 'conflict')
  const hasActionRequired = impacts.some((i) => i.severity === 'action-required')

  if (studentCount > 500 && hasConflicts) return 'critical'
  if (hasConflicts || studentCount > 200) return 'significant'
  if (hasActionRequired) return 'moderate'
  return 'informational'
}

function generateSuggestedActions(
  policy: { title: string; category: string },
  impacts: ImpactData[],
): string[] {
  const actions: string[] = []

  const coursePolicyCount = impacts.filter((i) => i.impactType === 'course-policy').length
  const aiConflictCount = impacts.filter((i) => i.impactType === 'ai-policy').length
  const syllabiCount = impacts.filter((i) => i.impactType === 'syllabus').length
  const complianceCount = impacts.filter((i) => i.impactType === 'compliance').length
  const petitionCount = impacts.filter((i) => i.impactType === 'petition').length

  if (coursePolicyCount > 0) {
    actions.push(
      `Send notification to ${coursePolicyCount} affected faculty to review and update course policies`,
    )
  }

  if (aiConflictCount > 0) {
    actions.push(
      `Flag ${aiConflictCount} course AI ${aiConflictCount === 1 ? 'policy' : 'policies'} for compliance review`,
    )
  }

  if (syllabiCount > 0) {
    actions.push(
      `Notify ${syllabiCount} faculty to update syllabus language referencing "${policy.title}"`,
    )
  }

  if (complianceCount > 0) {
    actions.push(`Update compliance calendar with new effective date for ${policy.title}`)
  }

  if (petitionCount > 0) {
    actions.push(
      `Review ${petitionCount} active ${petitionCount === 1 ? 'petition' : 'petitions'} under updated policy language`,
    )
  }

  actions.push(`Brief Sandy with updated policy language for "${policy.title}"`)

  return actions
}
