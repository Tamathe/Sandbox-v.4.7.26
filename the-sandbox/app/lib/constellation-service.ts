/**
 * constellation-service.ts
 *
 * Data aggregation for the Knowledge Constellation feature.
 * Pure read-view over existing models — no new tables needed.
 *
 * Two modes:
 *   - SemesterConstellation: current courses as orbital clusters with mastery nodes
 *   - DegreeArc: full program timeline from transcript through planned semesters
 */

import { prisma } from './prisma'
import { applyMasteryDecay, isMasteryStale } from './mastery-decay'

// ── Exported Interfaces ────────────────────────────────────────────────────────

export interface SemesterConstellation {
  semester: string
  courses: CourseCluster[]
  transferEdges: TransferEdge[]
  overallMastery: number
  srDueCount: number
}

export interface CourseCluster {
  courseId: string
  courseCode: string
  title: string
  color: string
  nodes: ConstellationNode[]
  edges: IntraCourseEdge[]
  aggregateMastery: number
}

export interface ConstellationNode {
  id: string
  type: 'objective' | 'assignment' | 'concept' | 'tool'
  label: string
  bloomLevel?: string
  masteryLevel?: number
  isStale?: boolean
  status?: 'not_started' | 'in_progress' | 'mastered'
  dueAt?: string
  pointsPossible?: number
  submissionStatus?: 'pending' | 'submitted' | 'graded'
  score?: number
  effectiveMastery?: number
  encounterCount?: number
  srDueDate?: string
  srOverdue?: boolean
  missedReviews?: number
  bloomHighWater?: number
  toolId?: string
  sessionCount?: number
  lastScore?: number
}

export interface TransferEdge {
  concept: string
  sourceCourseId: string
  sourceCourseCode: string
  targetCourseId: string
  targetCourseCode: string
  sessionScore: number
}

export interface IntraCourseEdge {
  fromNodeId: string
  toNodeId: string
  type: 'prerequisite' | 'sequence' | 'assesses'
}

export interface DegreeArc {
  program: {
    code: string
    name: string
    totalCredits: number
    catalogYear: string
  }
  semesters: ArcSemester[]
  milestones: ArcMilestone[]
  requirementSatisfaction: RequirementStatus[]
  percentComplete: number | null
  estimatedGraduation: string | null
}

export interface ArcSemester {
  label: string
  semesterIndex: number
  status: 'completed' | 'current' | 'planned' | 'unplanned'
  courses: ArcCourse[]
  aggregateMastery?: number
  totalCredits: number
}

export interface ArcCourse {
  courseCode: string
  title: string
  credits: number
  status: 'COMPLETED' | 'REGISTERED' | 'PLANNED' | 'WAIVED'
  grade?: string
  mastery?: number
  prerequisitesMet: boolean
  satisfiesRequirement?: string
}

export interface ArcMilestone {
  label: string
  semesterLabel: string
  type: 'exam' | 'rotation' | 'capstone' | 'graduation' | 'custom'
  status: 'completed' | 'upcoming' | 'far_future'
}

export interface RequirementStatus {
  category: string
  name: string
  creditsCompleted: number
  creditsRequired: number
  satisfied: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CLUSTER_COLORS = [
  '#0033A0', '#6366f1', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#7c3aed', '#db2777',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month <= 4) return `Spring ${year}`
  if (month <= 6) return `Summer ${year}`
  return `Fall ${year}`
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function objectiveMasteryNumber(
  progress: { attempts: number; correct: number; masteryLevel: string } | undefined,
): number {
  if (!progress) return 0
  if (progress.masteryLevel === 'mastered') return 1
  if (progress.attempts === 0) return 0
  return progress.correct / progress.attempts
}

function masteryStatus(
  progress: { masteryLevel: string } | undefined,
): 'not_started' | 'in_progress' | 'mastered' {
  if (!progress) return 'not_started'
  if (progress.masteryLevel === 'mastered') return 'mastered'
  if (progress.masteryLevel === 'not_started') return 'not_started'
  return 'in_progress'
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

function semesterSortKey(label: string): number {
  const match = label.match(/^(Spring|Summer|Fall)\s+(\d{4})$/)
  if (!match) return 99999
  const year = parseInt(match[2])
  const seasonOrder = match[1] === 'Spring' ? 0 : match[1] === 'Summer' ? 1 : 2
  return year * 10 + seasonOrder
}

// ── getSemesterConstellation ───────────────────────────────────────────────────

export async function getSemesterConstellation(
  userId: string,
  semester?: string,
): Promise<SemesterConstellation> {
  const targetSemester = semester ?? getCurrentSemester()

  // 1. Fetch enrolled courses for this semester
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      studentId: userId,
      course: { semester: targetSemester },
    },
    include: {
      course: { select: { id: true, courseCode: true, title: true } },
    },
  })

  if (enrollments.length === 0) {
    return {
      semester: targetSemester,
      courses: [],
      transferEdges: [],
      overallMastery: 0,
      srDueCount: 0,
    }
  }

  const courseIds = enrollments.map((e) => e.courseId)

  // 2. Parallel data fetches
  const [
    objectives,
    assignments,
    toolLinks,
    progressRecords,
    masteries,
    conceptStates,
    transfers,
    submissions,
    toolSessions,
  ] = await Promise.all([
    prisma.learningObjective.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        bloomLevel: true,
        weekId: true,
      },
    }),
    prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        id: true,
        courseId: true,
        title: true,
        dueAt: true,
        pointsPossible: true,
        type: true,
        weekId: true,
      },
    }),
    prisma.courseToolLink.findMany({
      where: { courseId: { in: courseIds } },
      include: { tool: { select: { id: true, name: true } } },
    }),
    prisma.studentObjectiveProgress.findMany({
      where: { studentId: userId, courseId: { in: courseIds } },
    }),
    prisma.studentConceptMastery.findMany({
      where: { userId },
    }),
    prisma.conceptState.findMany({
      where: { userId, courseId: { in: courseIds } },
      select: {
        conceptSlug: true,
        courseId: true,
        nextReviewAt: true,
        missedReviews: true,
        bloomHighWater: true,
      },
    }),
    prisma.transferEvent.findMany({
      where: {
        userId,
        OR: [
          { sourceCourseId: { in: courseIds } },
          { targetCourseId: { in: courseIds } },
        ],
      },
      include: {
        sourceCourse: { select: { courseCode: true } },
        targetCourse: { select: { courseCode: true } },
      },
    }),
    prisma.submission.findMany({
      where: { studentId: userId, assignment: { courseId: { in: courseIds } } },
      select: {
        assignmentId: true,
        gradebookEntry: { select: { facultyScore: true } },
      },
    }),
    prisma.toolSession.findMany({
      where: { userId, courseId: { in: courseIds } },
      select: { toolId: true, courseId: true, score: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  // 3. Build lookup maps
  const progressMap = new Map(progressRecords.map((p) => [p.objectiveId, p]))
  const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]))

  const now = new Date()

  // SR state keyed by "slug:courseId"
  const srMap = new Map(
    conceptStates.map((cs) => [`${cs.conceptSlug}:${cs.courseId}`, cs]),
  )

  // Tool session aggregation — ordered desc so first per key is latest
  const toolSessionAgg = new Map<string, { count: number; lastScore: number | null }>()
  for (const s of toolSessions) {
    const key = `${s.toolId}:${s.courseId}`
    const existing = toolSessionAgg.get(key)
    if (!existing) {
      toolSessionAgg.set(key, { count: 1, lastScore: s.score })
    } else {
      existing.count++
    }
  }

  // Apply mastery decay
  const enrichedMasteries = masteries.map((m) => ({
    ...m,
    effectiveMastery: applyMasteryDecay(m),
    isStale: isMasteryStale(m),
  }))

  // Group by course
  const objByCourse = groupBy(objectives, (o) => o.courseId)
  const asgnByCourse = groupBy(assignments, (a) => a.courseId)
  const toolByCourse = groupBy(toolLinks, (t) => t.courseId)

  // Overall SR due count
  const srDueCount = conceptStates.filter((cs) => cs.nextReviewAt <= now).length

  // 4. Build CourseCluster[] per enrollment
  const courses: CourseCluster[] = enrollments.map((enrollment, idx) => {
    const { course } = enrollment
    const courseObjectives = objByCourse.get(course.id) ?? []
    const courseAssignments = asgnByCourse.get(course.id) ?? []
    const courseToolLinks = toolByCourse.get(course.id) ?? []
    const courseConcepts = enrichedMasteries.filter((m) =>
      m.coursesEncountered.includes(course.id),
    )

    const nodes: ConstellationNode[] = []

    // — Objective nodes
    for (const obj of courseObjectives) {
      const prog = progressMap.get(obj.id)
      nodes.push({
        id: `obj-${obj.id}`,
        type: 'objective',
        label: obj.title,
        bloomLevel: obj.bloomLevel ?? undefined,
        masteryLevel: objectiveMasteryNumber(prog),
        status: masteryStatus(prog),
      })
    }

    // — Assignment nodes
    for (const asgn of courseAssignments) {
      const sub = submissionMap.get(asgn.id)
      let submissionStatus: 'pending' | 'submitted' | 'graded' = 'pending'
      let score: number | undefined
      if (sub) {
        if (sub.gradebookEntry?.facultyScore != null) {
          submissionStatus = 'graded'
          score = sub.gradebookEntry.facultyScore
        } else {
          submissionStatus = 'submitted'
        }
      }
      nodes.push({
        id: `asgn-${asgn.id}`,
        type: 'assignment',
        label: asgn.title,
        dueAt: asgn.dueAt?.toISOString(),
        pointsPossible: asgn.pointsPossible,
        submissionStatus,
        score,
      })
    }

    // — Concept nodes
    for (const m of courseConcepts) {
      const slug = normalizeSlug(m.concept)
      const sr = srMap.get(`${slug}:${course.id}`)
      nodes.push({
        id: `concept-${slug}`,
        type: 'concept',
        label: m.concept,
        effectiveMastery: m.effectiveMastery,
        encounterCount: m.encounterCount,
        isStale: m.isStale,
        srDueDate: sr?.nextReviewAt.toISOString(),
        srOverdue: sr ? sr.nextReviewAt <= now : undefined,
        missedReviews: sr?.missedReviews,
        bloomHighWater: sr?.bloomHighWater ?? undefined,
      })
    }

    // — Tool nodes
    for (const link of courseToolLinks) {
      const agg = toolSessionAgg.get(`${link.toolId}:${course.id}`)
      nodes.push({
        id: `tool-${link.toolId}`,
        type: 'tool',
        label: link.tool.name,
        toolId: link.toolId,
        sessionCount: agg?.count ?? 0,
        lastScore: agg?.lastScore ?? undefined,
      })
    }

    // 5. Build IntraCourseEdge[]
    const edges: IntraCourseEdge[] = []

    // objective→assignment via shared weekId
    for (const obj of courseObjectives) {
      if (!obj.weekId) continue
      for (const asgn of courseAssignments) {
        if (asgn.weekId === obj.weekId) {
          edges.push({
            fromNodeId: `obj-${obj.id}`,
            toNodeId: `asgn-${asgn.id}`,
            type: 'assesses',
          })
        }
      }
    }

    // concept→objective via tag matching (concept name in objective title/description)
    for (const m of courseConcepts) {
      if (m.concept.length < 3) continue
      const conceptLower = m.concept.toLowerCase()
      const slug = normalizeSlug(m.concept)
      for (const obj of courseObjectives) {
        const text = `${obj.title} ${obj.description ?? ''}`.toLowerCase()
        if (text.includes(conceptLower)) {
          edges.push({
            fromNodeId: `concept-${slug}`,
            toNodeId: `obj-${obj.id}`,
            type: 'sequence',
          })
        }
      }
    }

    // Aggregate mastery: weighted average of all nodes with mastery data
    const masteryValues = nodes
      .map((n) => n.masteryLevel ?? n.effectiveMastery ?? n.lastScore ?? null)
      .filter((v): v is number => v != null)
    const aggregateMastery =
      masteryValues.length > 0
        ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
        : 0

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      title: course.title,
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      nodes,
      edges,
      aggregateMastery,
    }
  })

  // 6. Build TransferEdge[]
  const transferEdges: TransferEdge[] = transfers.map((t) => ({
    concept: t.concept,
    sourceCourseId: t.sourceCourseId,
    sourceCourseCode: t.sourceCourse.courseCode,
    targetCourseId: t.targetCourseId,
    targetCourseCode: t.targetCourse.courseCode,
    sessionScore: t.sessionScore,
  }))

  // Overall mastery across all courses
  const nonEmptyCourses = courses.filter((c) => c.aggregateMastery > 0)
  const overallMastery =
    nonEmptyCourses.length > 0
      ? nonEmptyCourses.reduce((a, c) => a + c.aggregateMastery, 0) / nonEmptyCourses.length
      : 0

  return {
    semester: targetSemester,
    courses,
    transferEdges,
    overallMastery,
    srDueCount,
  }
}

// ── getDegreeArc ───────────────────────────────────────────────────────────────

export async function getDegreeArc(userId: string): Promise<DegreeArc> {
  // 1. Fetch degree plan with planned courses and program
  const degreePlan = await prisma.degreePlan.findFirst({
    where: { studentId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      program: true,
      courses: {
        include: {
          catalog: {
            select: { title: true, creditHoursMin: true, prerequisitesParsed: true },
          },
        },
      },
    },
  })

  if (!degreePlan) {
    return {
      program: { code: '', name: '', totalCredits: 0, catalogYear: '' },
      semesters: [],
      milestones: [],
      requirementSatisfaction: [],
      percentComplete: null,
      estimatedGraduation: null,
    }
  }

  const currentSemester = getCurrentSemester()

  // 2. Parallel fetches
  const [transcriptRecords, currentEnrollments, masteries] = await Promise.all([
    prisma.transcriptRecord.findMany({
      where: { studentId: userId },
      include: {
        catalog: {
          select: { title: true, creditHoursMin: true, prerequisitesParsed: true },
        },
      },
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId, course: { semester: currentSemester } },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            title: true,
            catalogCourse: { select: { creditHoursMin: true } },
          },
        },
      },
    }),
    prisma.studentConceptMastery.findMany({ where: { userId } }),
  ])

  // 3. Build courseId → aggregate mastery map
  const courseMasteryBuckets = new Map<string, number[]>()
  for (const m of masteries) {
    const effective = applyMasteryDecay(m)
    for (const cId of m.coursesEncountered) {
      if (!courseMasteryBuckets.has(cId)) courseMasteryBuckets.set(cId, [])
      courseMasteryBuckets.get(cId)!.push(effective)
    }
  }
  function getCourseMastery(courseId: string): number | undefined {
    const vals = courseMasteryBuckets.get(courseId)
    if (!vals || vals.length === 0) return undefined
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  // Map courseCode → sandbox Course id for mastery lookups
  const allCourseCodes = [
    ...transcriptRecords.map((t) => t.courseCode),
    ...currentEnrollments.map((e) => e.course.courseCode),
  ]
  const sandboxCourses =
    allCourseCodes.length > 0
      ? await prisma.course.findMany({
          where: { courseCode: { in: [...new Set(allCourseCodes)] } },
          select: { id: true, courseCode: true },
        })
      : []
  const courseCodeToId = new Map(sandboxCourses.map((c) => [c.courseCode, c.id]))

  // Completed course codes for prerequisite checking
  const completedCodes = new Set(transcriptRecords.map((t) => t.courseCode))

  // 4. Build ArcSemester[] timeline
  const semesterMap = new Map<string, ArcSemester>()

  function ensureSemester(
    label: string,
    status: ArcSemester['status'],
    semesterIndex?: number,
  ): ArcSemester {
    if (!semesterMap.has(label)) {
      semesterMap.set(label, {
        label,
        semesterIndex: semesterIndex ?? 0,
        status,
        courses: [],
        totalCredits: 0,
      })
    }
    return semesterMap.get(label)!
  }

  function checkPrereqsMet(prereqsParsed: unknown): boolean {
    if (!prereqsParsed || !Array.isArray(prereqsParsed)) return true
    return (prereqsParsed as string[]).every((code) => completedCodes.has(code))
  }

  // — Completed semesters from transcript
  for (const tr of transcriptRecords) {
    const sem = ensureSemester(tr.semester, 'completed')
    const courseId = courseCodeToId.get(tr.courseCode)
    sem.courses.push({
      courseCode: tr.courseCode,
      title: tr.catalog.title,
      credits: tr.credits,
      status: 'COMPLETED',
      grade: tr.grade ?? undefined,
      mastery: courseId ? getCourseMastery(courseId) : undefined,
      prerequisitesMet: true,
    })
    sem.totalCredits += tr.credits
  }

  // — Current semester from enrollments
  if (currentEnrollments.length > 0) {
    const sem = ensureSemester(currentSemester, 'current')
    sem.status = 'current'
    const existingCodes = new Set(sem.courses.map((c) => c.courseCode))

    for (const e of currentEnrollments) {
      if (existingCodes.has(e.course.courseCode)) continue
      const credits = e.course.catalogCourse?.creditHoursMin ?? 3
      sem.courses.push({
        courseCode: e.course.courseCode,
        title: e.course.title,
        credits,
        status: 'REGISTERED',
        mastery: getCourseMastery(e.courseId),
        prerequisitesMet: true,
      })
      sem.totalCredits += credits
    }
  }

  // — Planned courses from degree plan
  for (const pc of degreePlan.courses) {
    if (pc.status === 'COMPLETED') continue
    const semLabel = pc.intendedSemester ?? 'Unscheduled'
    const sem = ensureSemester(
      semLabel,
      semLabel === currentSemester ? 'current' : 'planned',
      pc.semesterIndex ?? undefined,
    )
    const existingCodes = new Set(sem.courses.map((c) => c.courseCode))
    if (existingCodes.has(pc.courseCode)) continue

    const credits = pc.catalog.creditHoursMin
    sem.courses.push({
      courseCode: pc.courseCode,
      title: pc.catalog.title,
      credits,
      status: pc.status as 'PLANNED' | 'REGISTERED' | 'WAIVED',
      prerequisitesMet: checkPrereqsMet(pc.catalog.prerequisitesParsed),
    })
    sem.totalCredits += credits
    if (pc.semesterIndex != null && sem.semesterIndex === 0) {
      sem.semesterIndex = pc.semesterIndex
    }
  }

  // Compute aggregate mastery for completed/current semesters
  for (const sem of semesterMap.values()) {
    if (sem.status === 'completed' || sem.status === 'current') {
      const vals = sem.courses
        .map((c) => c.mastery)
        .filter((v): v is number => v != null)
      if (vals.length > 0) {
        sem.aggregateMastery = vals.reduce((a, b) => a + b, 0) / vals.length
      }
    }
  }

  // Sort chronologically
  const semesters = [...semesterMap.values()].sort(
    (a, b) => semesterSortKey(a.label) - semesterSortKey(b.label),
  )
  semesters.forEach((sem, idx) => {
    if (sem.semesterIndex === 0) sem.semesterIndex = idx + 1
  })

  // 5. Check for cached DegreeAuditResult (< 24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const auditResult = await prisma.degreeAuditResult.findFirst({
    where: {
      studentId: userId,
      programId: degreePlan.programId,
      auditedAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { auditedAt: 'desc' },
  })

  let percentComplete: number | null = null
  let requirementSatisfaction: RequirementStatus[] = []

  if (auditResult) {
    percentComplete = auditResult.percentComplete
    const results = auditResult.requirementResults as
      | Array<{
          category?: string
          name?: string
          creditsCompleted?: number
          creditsRequired?: number
          satisfied?: boolean
        }>
      | null
    if (Array.isArray(results)) {
      requirementSatisfaction = results.map((r) => ({
        category: r.category ?? 'UNKNOWN',
        name: r.name ?? '',
        creditsCompleted: r.creditsCompleted ?? 0,
        creditsRequired: r.creditsRequired ?? 0,
        satisfied: r.satisfied ?? false,
      }))
    }
  }

  // 6. Build ArcMilestone[] from course title patterns
  const milestones: ArcMilestone[] = []
  for (const sem of semesters) {
    for (const c of sem.courses) {
      const upper = c.title.toUpperCase()
      let milestoneType: ArcMilestone['type'] | null = null

      if (upper.includes('CLINICAL') || upper.includes('ROTATION')) {
        milestoneType = 'rotation'
      } else if (upper.includes('CAPSTONE') || upper.includes('THESIS')) {
        milestoneType = 'capstone'
      } else if (
        upper.includes('STEP') ||
        upper.includes('BAR') ||
        upper.includes('BOARD')
      ) {
        milestoneType = 'exam'
      }

      if (milestoneType) {
        milestones.push({
          label: c.title,
          semesterLabel: sem.label,
          type: milestoneType,
          status:
            sem.status === 'completed'
              ? 'completed'
              : sem.status === 'current'
                ? 'upcoming'
                : 'far_future',
        })
      }
    }
  }

  // Estimated graduation = last non-Unscheduled semester
  const scheduledSemesters = semesters.filter((s) => s.label !== 'Unscheduled')
  const lastSemester = scheduledSemesters[scheduledSemesters.length - 1]
  const estimatedGraduation = lastSemester?.label ?? null

  return {
    program: {
      code: degreePlan.program.code,
      name: degreePlan.program.name,
      totalCredits: degreePlan.program.totalCredits,
      catalogYear: degreePlan.program.catalogYear,
    },
    semesters,
    milestones,
    requirementSatisfaction,
    percentComplete,
    estimatedGraduation,
  }
}
