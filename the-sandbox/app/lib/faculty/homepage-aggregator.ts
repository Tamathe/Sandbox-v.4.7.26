import { GradebookStatus, RecommendationStatus, AssessmentScope } from '../../generated/prisma'
import { prisma } from '../prisma'
import type { FacultyHomepageV2Data } from './homepage-types'
import { getFacultyAdvisingData } from './advisee-service'
import { getUpcomingDeadlines } from './assessment-service'
import { getFacultyCommitteeData } from './committee-service'
import { getRecommendationRequests } from './recommendation-service'

const defaultHomepageData: FacultyHomepageV2Data = {
  advisees: {
    total: 23,
    withHolds: 2,
    needsDegreeAudit: 3,
    registrationWindow: {
      start: new Date('2026-04-07T08:00:00-04:00').toISOString(),
      end: new Date('2026-04-11T17:00:00-04:00').toISOString(),
    },
  },
  officeHours: {
    todaySlot: {
      start: new Date('2026-03-24T14:00:00-04:00').toISOString(),
      end: new Date('2026-03-24T15:30:00-04:00').toISOString(),
    },
    queueCount: 3,
    topTheme: 'Midterm review - Module 5',
    queueLabel: '3 students checked in',
    flaggedForOfficeHours: [
      { name: 'Javier M.', reason: 'Grade drop (Module 5)', course: 'TEK-100' },
      { name: 'Alice C.', reason: '14 days inactive', course: 'TEK-100' },
    ],
  },
  flaggedStudents: [
    { id: 'flag-javier-martinez', name: 'Javier Martinez', flag: 'grade_drop', course: 'TEK-100', detail: 'grade drop' },
    { id: 'flag-alice-chen', name: 'Alice Chen', flag: 'inactive', course: 'TEK-100', detail: '14 days inactive' },
    { id: 'flag-ruth-okafor', name: 'Ruth Okafor', flag: 'accommodation', course: 'TEK-100', detail: 'Accommodation letter active' },
    { id: 'flag-meera-singh', name: 'Meera Singh', flag: 'attendance', course: 'TEK-100', detail: 'Missed 3 classes' },
  ],
  recommendations: [
    {
      id: 'rec-sarah-kim',
      studentName: 'Sarah Kim',
      purpose: 'PhD program',
      targetOrg: 'MIT EECS',
      dueDate: new Date('2026-04-01T17:00:00-04:00').toISOString(),
      status: RecommendationStatus.IN_PROGRESS,
      daysUntilDue: 8,
    },
    {
      id: 'rec-james-oduya',
      studentName: 'James Oduya',
      purpose: 'Scholarship',
      targetOrg: 'UK Honors',
      dueDate: new Date('2026-04-15T17:00:00-04:00').toISOString(),
      status: RecommendationStatus.PENDING,
      daysUntilDue: 22,
    },
    {
      id: 'rec-priya-patel',
      studentName: 'Priya Patel',
      purpose: 'Internship',
      targetOrg: 'Google STEP',
      dueDate: new Date('2026-04-20T17:00:00-04:00').toISOString(),
      status: RecommendationStatus.PENDING,
      daysUntilDue: 27,
    },
  ],
  committees: [
    {
      id: 'committee-faculty-curriculum',
      name: 'Curriculum Committee',
      nextMeeting: new Date('2026-03-28T15:00:00-04:00').toISOString(),
      actionItemsDue: 1,
      unreadMinutes: true,
      nextActionTitle: 'Review proposed TEK-100 syllabus changes',
      unreadMinutesDate: new Date('2026-03-14T15:00:00-04:00').toISOString(),
    },
    {
      id: 'committee-faculty-assessment',
      name: 'Assessment & Accreditation',
      nextMeeting: new Date('2026-04-02T10:00:00-04:00').toISOString(),
      actionItemsDue: 1,
      unreadMinutes: true,
      nextActionTitle: 'Submit SACSCOC outcome data for TEK-100',
      unreadMinutesDate: new Date('2026-03-19T10:00:00-04:00').toISOString(),
    },
  ],
  departmentFeed: [],
  assessmentDeadlines: [
    {
      id: 'assessment-sacscoc',
      title: 'SACSCOC Outcome Report',
      dueDate: new Date('2026-04-15T17:00:00-04:00').toISOString(),
      scope: AssessmentScope.INSTITUTION,
      courseCode: null,
      progress: 'TEK-100 data needed',
    },
    {
      id: 'assessment-midterm-grades',
      title: 'Mid-semester grades',
      dueDate: new Date('2026-03-31T17:00:00-04:00').toISOString(),
      scope: AssessmentScope.COURSE,
      courseCode: 'TEK-100',
      progress: '12 of 28 entered',
    },
  ],
  quickActions: {
    pendingGradeCount: 4,
    firstCourseId: null,
    gradingEffortHint: '~5 min (AI-drafted, quick review)',
  },
  courseIntelligence: [
    {
      code: 'TEK-100',
      engagementBreakdown: {
        assignmentCompletion: 78,
        toolActivity: 65,
        loginFrequency: 72,
      },
      atRiskStudents: [
        { name: 'Javier M.', flag: 'Grade drop', detail: 'Module 5' },
        { name: 'Alice C.', flag: 'Inactive', detail: '14 days inactive' },
        { name: 'Meera S.', flag: 'Attendance', detail: 'Missed 3 classes' },
      ],
      lastTermEngagement: 68,
    },
  ],
}

async function getQuickActionsData(userId: string): Promise<FacultyHomepageV2Data['quickActions']> {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    const courseIds = courses.map((course) => course.id)
    if (courseIds.length === 0) return defaultHomepageData.quickActions

    const [aiDraftCount, pendingReviewCount] = await Promise.all([
      prisma.gradebookEntry.count({
        where: {
          status: GradebookStatus.AI_DRAFT,
          submission: { assignment: { courseId: { in: courseIds } } },
        },
      }),
      prisma.gradebookEntry.count({
        where: {
          status: GradebookStatus.PENDING_REVIEW,
          submission: { assignment: { courseId: { in: courseIds } } },
        },
      }),
    ])

    const totalPending = aiDraftCount + pendingReviewCount

    // Compute effort hint based on AI draft ratio
    let gradingEffortHint: string | null = null
    if (totalPending > 0) {
      if (pendingReviewCount === 0) {
        gradingEffortHint = `~${Math.max(1, Math.round(totalPending * 1.5))} min (all AI-drafted)`
      } else if (aiDraftCount > pendingReviewCount) {
        gradingEffortHint = `~${Math.round(aiDraftCount * 1.5 + pendingReviewCount * 5)} min (mostly AI-drafted)`
      } else {
        gradingEffortHint = `~${Math.round(totalPending * 5)} min (manual review needed)`
      }
    }

    return {
      pendingGradeCount: totalPending,
      firstCourseId: courses[0]?.id ?? null,
      gradingEffortHint,
    }
  } catch (error) {
    console.warn('[faculty/homepage-aggregator] Falling back to synthetic quick actions', error)
    return defaultHomepageData.quickActions
  }
}

async function getCourseIntelligence(userId: string): Promise<FacultyHomepageV2Data['courseIntelligence']> {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
      select: {
        id: true,
        courseCode: true,
        enrollments: {
          select: {
            student: {
              select: {
                id: true,
                name: true,
                studentProfile: {
                  select: { riskScore: true },
                },
              },
            },
          },
        },
        assignments: {
          select: {
            id: true,
            submissions: { select: { id: true } },
          },
        },
      },
    })

    if (courses.length === 0) return defaultHomepageData.courseIntelligence

    return courses.map((course) => {
      const enrollmentCount = course.enrollments.length

      // Assignment completion rate
      const totalExpected = course.assignments.length * enrollmentCount
      const totalSubmitted = course.assignments.reduce((sum: number, a: { submissions: { id: string }[] }) => sum + a.submissions.length, 0)
      const assignmentCompletion = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0

      // Tool activity: approximate from assignment engagement
      const toolActivity = Math.round(assignmentCompletion * 0.85)

      // Login frequency: approximate — use inverse of at-risk ratio as proxy
      const riskStudents = course.enrollments.filter(
        (e) => e.student.studentProfile?.riskScore != null && e.student.studentProfile.riskScore > 0.6,
      )
      const atRiskRatio = enrollmentCount > 0 ? riskStudents.length / enrollmentCount : 0
      const loginFrequency = Math.round((1 - atRiskRatio) * 100)

      // At-risk students (riskScore > 0.6), first name + last initial, capped at 5
      const atRiskStudents = riskStudents.slice(0, 5).map((e) => {
        const parts = e.student.name.split(' ')
        const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
        const score = e.student.studentProfile!.riskScore!

        let flag = 'At risk'
        let detail = 'Below threshold'
        if (score > 0.8) {
          flag = 'Grade drop'
          detail = 'Significant decline'
        }

        return { name: displayName, flag, detail }
      })

      return {
        code: course.courseCode,
        engagementBreakdown: {
          assignmentCompletion,
          toolActivity,
          loginFrequency,
        },
        atRiskStudents,
        lastTermEngagement: null, // no historical data yet — demo fallback used
      }
    })
  } catch (error) {
    console.warn('[faculty/homepage-aggregator] Falling back to synthetic course intelligence', error)
    return defaultHomepageData.courseIntelligence
  }
}

export async function getFacultyHomepageV2Data(userId: string): Promise<FacultyHomepageV2Data> {
  const [advisingResult, recommendationsResult, committeeResult, assessmentResult, quickActionsResult, courseIntelResult] =
    await Promise.allSettled([
      getFacultyAdvisingData(userId),
      getRecommendationRequests(userId),
      getFacultyCommitteeData(userId),
      getUpcomingDeadlines(userId),
      getQuickActionsData(userId),
      getCourseIntelligence(userId),
    ])

  const advising =
    advisingResult.status === 'fulfilled'
      ? advisingResult.value
      : {
          advisees: defaultHomepageData.advisees,
          officeHours: defaultHomepageData.officeHours,
          flaggedStudents: defaultHomepageData.flaggedStudents,
        }

  const recommendations =
    recommendationsResult.status === 'fulfilled'
      ? recommendationsResult.value
      : defaultHomepageData.recommendations

  const committeeData =
    committeeResult.status === 'fulfilled'
      ? committeeResult.value
      : {
          committees: defaultHomepageData.committees,
          departmentFeed: defaultHomepageData.departmentFeed,
        }

  const assessmentDeadlines =
    assessmentResult.status === 'fulfilled'
      ? assessmentResult.value
      : defaultHomepageData.assessmentDeadlines

  const quickActions =
    quickActionsResult.status === 'fulfilled'
      ? quickActionsResult.value
      : defaultHomepageData.quickActions

  const courseIntelligence =
    courseIntelResult.status === 'fulfilled'
      ? courseIntelResult.value
      : defaultHomepageData.courseIntelligence

  // Enrich committee data with new fields (fallback to defaults if the service doesn't return them)
  const enrichedCommittees = committeeData.committees.map((c) => ({
    ...c,
    nextActionTitle: (c as FacultyHomepageV2Data['committees'][number]).nextActionTitle ?? null,
    unreadMinutesDate: (c as FacultyHomepageV2Data['committees'][number]).unreadMinutesDate ?? null,
  }))

  // Build office hours with clarified semantics
  const officeHours: FacultyHomepageV2Data['officeHours'] = {
    ...advising.officeHours,
    queueLabel: `${advising.officeHours.queueCount} student${advising.officeHours.queueCount === 1 ? '' : 's'} checked in`,
    flaggedForOfficeHours: (advising.flaggedStudents ?? []).slice(0, 3).map((s) => {
      const parts = s.name.split(' ')
      const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
      return { name: displayName, reason: s.detail, course: s.course }
    }),
  }

  return {
    advisees: advising.advisees,
    officeHours,
    flaggedStudents: advising.flaggedStudents,
    recommendations,
    committees: enrichedCommittees,
    departmentFeed: committeeData.departmentFeed,
    assessmentDeadlines,
    quickActions,
    courseIntelligence,
  }
}
