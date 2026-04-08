/**
 * Student Proactive Suggestions — aggregates multiple signal sources into
 * a ranked list of contextual suggestions Sandy can weave into conversation.
 *
 * Signals: overdue flashcards, imminent deadlines with no recent study,
 * active study rooms with coursemates, unused course tools.
 */

import { prisma } from './prisma'
import { getPendingClinicAssignments } from './virtual-clinic/encounter-service'

export interface ProactiveSuggestion {
  type: 'overdue-review' | 'upcoming-deadline' | 'active-study-room' | 'unused-tool' | 'ai-policy-gap' | 'no-stance' | 'stale-assignments' | 'mei-almost-ready' | 'no-starter-pack' | 'pack-stale' | 'student-policies-unreviewed' | 'student-literacy-gap' | 'goal-no-milestones' | 'goal-stale' | 'readability-gap' | 'accessibility-issues-pending' | 'accreditation-critical-gaps' | 'accreditation-harvest-stale' | 'accreditation-narrative-review' | 'classroom-intel-unread-insights' | 'classroom-intel-critical-concept' | 'classroom-intel-intervention-result' | 'virtual-clinic-due-soon' | 'concept-bridge-available' | 'campus-pulse-critical' | 'policy-impact-unresolved' | 'virtual-clinic-first-visit' | 'study-spot-suggestion'
  priority: number // 1-10, higher = more urgent
  message: string  // Suggested phrasing for Sandy
  action?: string  // ACTION tag for clickable button
}

/**
 * Compute up to 5 ranked suggestions for a student.
 * @param userId  The student's user ID.
 * @param srDueCount  Optional — number of SR-due concepts (from existing srContext).
 */
export async function getProactiveSuggestions(
  userId: string,
  srDueCount?: number,
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = []

  // Get enrolled courses (shared across multiple checks)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true, course: { select: { courseCode: true } } },
  })
  const enrolledCourseIds = enrollments.map(e => e.courseId)
  const courseCodeMap = new Map(enrollments.map(e => [e.courseId, e.course.courseCode]))

  // 1. Overdue flashcard reviews (re-use existing SR count to avoid duplicate query)
  if (srDueCount && srDueCount > 0) {
    suggestions.push({
      type: 'overdue-review',
      priority: 8,
      message: `You have ${srDueCount} concept${srDueCount > 1 ? 's' : ''} due for review — a quick 5-minute flashcard session would lock them in.`,
      action: '<!--ACTION:{"type":"navigate","href":"/analytics/student","label":"Review Flashcards"}-->',
    })
  }

  // 2. Assignments due within 48h with no recent study session on that course
  if (enrolledCourseIds.length > 0) {
    const now = new Date()
    const twoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        dueAt: { gte: now, lte: twoDays },
        isPublished: true,
      },
      select: { id: true, title: true, dueAt: true, courseId: true },
      orderBy: { dueAt: 'asc' },
      take: 3,
    }).catch(() => [])

    for (const a of upcomingAssignments) {
      if (!a.dueAt) continue

      // Check if student has a session in the last 24h for this course
      const recentSession = await prisma.toolSession.findFirst({
        where: {
          userId,
          courseId: a.courseId,
          startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      }).catch(() => null)

      if (!recentSession) {
        const cc = courseCodeMap.get(a.courseId) ?? ''
        const hoursLeft = Math.round((a.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60))
        suggestions.push({
          type: 'upcoming-deadline',
          priority: hoursLeft < 24 ? 9 : 7,
          message: `"${a.title}" (${cc}) is due in ${hoursLeft < 24 ? `${hoursLeft} hours` : 'tomorrow'} and you haven't studied for it recently.`,
          action: `<!--ACTION:{"type":"navigate","href":"/exam-forge?courseId=${a.courseId}&targetAssignmentId=${a.id}","label":"Practice for ${a.title}"}-->`,
        })
      }
    }
  }

  // 3. Active study/challenge rooms with coursemates
  if (enrolledCourseIds.length > 0) {
    const activeRooms = await prisma.liveRoom.findMany({
      where: {
        phase: { in: ['LOBBY', 'COUNTDOWN', 'QUESTION', 'REVEAL', 'SCOREBOARD'] },
        endedAt: null,
        channel: {
          group: {
            courseId: { in: enrolledCourseIds },
          },
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        _count: { select: { participants: true } },
        channel: { select: { group: { select: { name: true } } } },
      },
      take: 2,
    }).catch(() => [])

    for (const room of activeRooms) {
      const roomTypeLabel = room.type.toLowerCase().replace('_', ' ')
      suggestions.push({
        type: 'active-study-room',
        priority: 6,
        message: `There's an active ${roomTypeLabel} room "${room.title || room.channel.group.name}" with ${room._count.participants} people — want to join?`,
        action: '<!--ACTION:{"type":"navigate","href":"/community","label":"Join Room"}-->',
      })
    }
  }

  // 4. Unused tools in enrolled courses
  if (enrolledCourseIds.length > 0) {
    const courseTools = await prisma.courseToolLink.findMany({
      where: { courseId: { in: enrolledCourseIds } },
      select: {
        tool: { select: { id: true, name: true } },
        course: { select: { courseCode: true } },
      },
      take: 10,
    }).catch(() => [])

    if (courseTools.length > 0) {
      const toolIds = courseTools.map(ct => ct.tool.id)
      const usedTools = await prisma.toolSession.findMany({
        where: { userId, toolId: { in: toolIds } },
        select: { toolId: true },
        distinct: ['toolId'],
      }).catch(() => [])

      const usedSet = new Set(usedTools.map(s => s.toolId))
      const unused = courseTools.filter(ct => !usedSet.has(ct.tool.id))

      if (unused.length > 0) {
        const pick = unused[0]
        suggestions.push({
          type: 'unused-tool',
          priority: 3,
          message: `Your ${pick.course.courseCode} course has a tool called "${pick.tool.name}" that you haven't tried yet.`,
          action: `<!--ACTION:{"type":"launch","toolId":"${pick.tool.id}","label":"Try ${pick.tool.name}"}-->`,
        })
      }
    }
  }

  // 5. AI Policy Gap (faculty/admin only — check courses without AI policies)
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  }).catch(() => null)

  if (userProfile?.role === 'EDUCATOR' || userProfile?.role === 'ADMIN') {
    const [totalCourses, coursesWithPolicy, stanceProfile] = await Promise.all([
      prisma.course.count({ where: { instructorId: userId } }),
      prisma.courseAIPolicy.count({ where: { course: { instructorId: userId } } }),
      prisma.aILiteracyProfile.findUnique({ where: { userId }, select: { stance: true } }),
    ]).catch(() => [0, 0, null] as const)

    const missingPolicies = totalCourses - coursesWithPolicy
    if (missingPolicies > 0) {
      suggestions.push({
        type: 'ai-policy-gap',
        priority: 7,
        message: `You have ${missingPolicies} course${missingPolicies > 1 ? 's' : ''} without an AI policy — want to build one in 5 minutes?`,
        action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/policy","label":"Build AI Policy"}-->',
      })
    }

    if (!stanceProfile?.stance) {
      suggestions.push({
        type: 'no-stance',
        priority: 6,
        message: 'Discover your AI teaching stance — a 5-minute reflection that shapes everything else in AI literacy.',
        action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/stance","label":"Take Stance Assessment"}-->',
      })
    }

    // 6. Readability gap — educator has materials scored D/F on readability
    try {
      const lowReadabilityReport = await prisma.accessibilityReport.findFirst({
        where: {
          targetType: 'course_material',
          overallGrade: { in: ['D', 'F'] },
        },
        select: { targetId: true, overallGrade: true, readability: true },
        orderBy: { overallScore: 'asc' },
      })

      if (lowReadabilityReport) {
        const material = await prisma.courseMaterial.findUnique({
          where: { id: lowReadabilityReport.targetId },
          select: { title: true, course: { select: { instructorId: true, courseCode: true } } },
        })

        if (material && material.course.instructorId === userId) {
          const readability = lowReadabilityReport.readability as { fleschKincaid?: number } | null
          const gradeLevel = readability?.fleschKincaid ? Math.round(readability.fleschKincaid) : 'high'
          suggestions.push({
            type: 'readability-gap',
            priority: 4,
            message: `"${material.title}" (${material.course.courseCode}) has a grade ${gradeLevel} reading level — want me to suggest simplifications?`,
            action: '<!--ACTION:{"type":"navigate","href":"/courses","label":"Review Materials"}-->',
          })
        }
      }
    } catch {
      // Non-fatal — skip readability suggestions on error
    }

    // Accessibility issues pending — educator has D/F materials with auto-fixable issues
    try {
      const pendingCount = await prisma.accessibilityReport.count({
        where: {
          targetType: 'course_material',
          overallGrade: { in: ['D', 'F'] },
          remediationPlan: { not: { equals: null } },
        },
      })

      if (pendingCount > 0) {
        suggestions.push({
          type: 'accessibility-issues-pending',
          priority: 5,
          message: `${pendingCount} course material${pendingCount > 1 ? 's' : ''} ${pendingCount > 1 ? 'have' : 'has'} auto-fixable accessibility issues — want me to generate fixes?`,
          action: '<!--ACTION:{"type":"navigate","href":"/ada-tool?tab=dashboard","label":"View Compliance Dashboard"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 7. MEI Almost Ready — student is 1 session away from getting an MEI score
  if (userProfile?.role === 'STUDENT' && enrolledCourseIds.length > 0) {
    try {
      const toolAssessments = await prisma.assignment.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          type: 'TOOL_ASSESSMENT',
          assessmentToolIds: { isEmpty: false },
        },
        select: { id: true, title: true, minimumAttempts: true, assessmentToolIds: true, course: { select: { courseCode: true } } },
      })

      for (const ta of toolAssessments) {
        const sessionCount = await prisma.toolSession.count({
          where: {
            userId,
            toolId: { in: ta.assessmentToolIds },
            score: { not: null },
          },
        })

        const needed = ta.minimumAttempts ?? 3
        if (sessionCount === needed - 1) {
          suggestions.push({
            type: 'mei-almost-ready',
            priority: 7,
            message: `One more session on "${ta.title}" (${ta.course.courseCode}) and you'll unlock your Mastery Efficiency score!`,
            action: `<!--ACTION:{"type":"navigate","href":"/assignments/${ta.id}/mei","label":"View MEI Dashboard"}-->`,
          })
          break // Only one MEI nudge at a time
        }
      }
    } catch {
      // Non-fatal — skip MEI suggestions on error
    }
  }

  // 8. No Starter Pack — educator hasn't adopted any starter packs
  if (userProfile?.role === 'EDUCATOR' || userProfile?.role === 'ADMIN') {
    try {
      const packCount = await prisma.starterPackAdoption.count({ where: { userId } })
      if (packCount === 0) {
        suggestions.push({
          type: 'no-starter-pack',
          priority: 4,
          message: 'Grab a discipline-specific AI Starter Pack — pre-built assignments and policies for your field, ready in 2 minutes.',
          action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs","label":"Browse Starter Packs"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 9. Pack Stale — educator adopted a pack but hasn't revisited in 60+ days
  if (userProfile?.role === 'EDUCATOR' || userProfile?.role === 'ADMIN') {
    try {
      const latestPack = await prisma.starterPackAdoption.findFirst({
        where: { userId },
        orderBy: { adoptedAt: 'desc' },
        select: { adoptedAt: true },
      })
      if (latestPack) {
        const daysSince = Math.floor((Date.now() - latestPack.adoptedAt.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSince > 60) {
          suggestions.push({
            type: 'pack-stale',
            priority: 2,
            message: 'Your AI Starter Pack was adopted over 2 months ago — check for new templates and updates.',
            action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs","label":"Review Starter Packs"}-->',
          })
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 10. Student: unreviewed AI policies
  if (userProfile?.role === 'STUDENT') {
    try {
      const clarityChecks = await prisma.clarityCheckResponse.findMany({
        where: { userId },
        select: { courseId: true },
        distinct: ['courseId'],
      })
      const checkedCourseIds = new Set(clarityChecks.map(c => c.courseId))
      const coursesWithPolicies = await prisma.courseAIPolicy.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          publishedToStudents: true,
        },
        select: { courseId: true },
      })
      const unreviewed = coursesWithPolicies.filter(p => !checkedCourseIds.has(p.courseId)).length
      if (unreviewed > 0) {
        suggestions.push({
          type: 'student-policies-unreviewed',
          priority: 7,
          message: `You have ${unreviewed} course${unreviewed > 1 ? 's' : ''} with AI policies you haven't reviewed yet.`,
          action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/student/policies","label":"Review Policies"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 11. Student: literacy profile dimension gap
  if (userProfile?.role === 'STUDENT') {
    try {
      const studentProfile = await prisma.studentLiteracyProfile.findUnique({
        where: { userId },
        select: { profileMaterialized: true, practicalSkill: true, communication: true, skepticism: true, judgment: true },
      })
      if (studentProfile?.profileMaterialized) {
        const dims = [
          { label: 'Practical Skill', value: studentProfile.practicalSkill, module: 'prompt-craft' },
          { label: 'Communication', value: studentProfile.communication, module: 'prompt-craft' },
          { label: 'Skepticism', value: studentProfile.skepticism, module: 'output-detective' },
          { label: 'Judgment', value: studentProfile.judgment, module: 'judgment-calls' },
        ]
        const weakest = dims.reduce((a, b) => (a.value < b.value ? a : b))
        if (weakest.value < 40) {
          const moduleLabels: Record<string, string> = {
            'prompt-craft': 'Prompt Craft',
            'output-detective': 'Output Detective',
            'judgment-calls': 'Judgment Calls',
          }
          suggestions.push({
            type: 'student-literacy-gap',
            priority: 5,
            message: `Your ${weakest.label} could use some practice — try ${moduleLabels[weakest.module] ?? weakest.module}?`,
            action: `<!--ACTION:{"type":"navigate","href":"/ai-literacy/student/${weakest.module}","label":"Practice ${moduleLabels[weakest.module] ?? weakest.module}"}-->`,
          })
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 12. Learning goals — nudge students who have goals without milestones or stale goals
  if (userProfile?.role === 'STUDENT') {
    try {
      const activeGoals = await prisma.learningGoal.findMany({
        where: { userId, status: 'ACTIVE' },
        include: { _count: { select: { milestones: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      })

      // Goal with no milestones
      const emptyGoal = activeGoals.find(g => g._count.milestones === 0)
      if (emptyGoal) {
        suggestions.push({
          type: 'goal-no-milestones',
          priority: 5,
          message: `Your goal "${emptyGoal.title}" doesn't have any milestones yet — want me to help break it into steps?`,
          action: `<!--ACTION:{"type":"navigate","href":"/my-path","label":"Open My Path"}-->`,
        })
      }

      // Goal not updated in 7+ days
      const staleGoal = activeGoals.find(g => {
        const daysSince = Math.floor((Date.now() - g.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        return daysSince > 7 && g._count.milestones > 0
      })
      if (staleGoal && !emptyGoal) {
        suggestions.push({
          type: 'goal-stale',
          priority: 4,
          message: `You haven't made progress on "${staleGoal.title}" in over a week — still working on it or want to adjust?`,
          action: `<!--ACTION:{"type":"navigate","href":"/my-path","label":"Check My Goals"}-->`,
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 13. Virtual Clinic — assigned cases due within 3 days that haven't been started
  if (userProfile?.role === 'STUDENT' && enrolledCourseIds.length > 0) {
    try {
      const now = new Date()
      const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      const pending = await getPendingClinicAssignments(userId, enrolledCourseIds, {
        dueAfter: now,
        dueBefore: threeDays,
        limit: 2,
      })
      const unstarted = pending.filter(a => !a.started)

      if (unstarted.length > 0) {
        suggestions.push({
          type: 'virtual-clinic-due-soon',
          priority: 7,
          message: `You have a clinical case due soon — start your encounter for "${unstarted[0].title}"`,
          action: '<!--ACTION:{"type":"navigate","href":"/virtual-clinic","label":"Open Virtual Clinic"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 14. Virtual Clinic — first-visit nudge for students with 0 completed encounters
  if (userProfile?.role === 'STUDENT') {
    try {
      const completedCount = await prisma.clinicalEncounter.count({
        where: { userId, completedAt: { not: null } },
      })
      if (completedCount === 0) {
        suggestions.push({
          type: 'virtual-clinic-first-visit',
          priority: 6,
          message: 'Try your first clinical case — practice patient interviews, exams, and diagnosis with AI-powered feedback.',
          action: '<!--ACTION:{"type":"navigate","href":"/virtual-clinic","label":"Open Virtual Clinic"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // 15. Concept Bridge Available — student has cross-course help recommendations
  if (userProfile?.role === 'STUDENT' && enrolledCourseIds.length > 1) {
    try {
      const { buildBriefingBlock } = await import('./concept-bridge/bridge-recommender')
      const bridgeBlock = await buildBriefingBlock(userId)
      if (bridgeBlock) {
        suggestions.push({
          type: 'concept-bridge-available',
          priority: 6,
          message: 'A concept from one of your courses could help you in another — want to see the connection?',
          action: '<!--ACTION:{"type":"navigate","href":"/together","label":"View Cross-Course Connections"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Classroom Intelligence Loop nudges (EDUCATOR/ADMIN) ─────────────
  if (userProfile?.role === 'EDUCATOR' || userProfile?.role === 'ADMIN') {
    // Unread teaching insights
    try {
      const unreadInsights = await prisma.instructorInsightCard.count({
        where: {
          instructorId: userId,
          viewed: false,
          expiresAt: { gte: new Date() },
        },
      })
      if (unreadInsights > 0) {
        suggestions.push({
          type: 'classroom-intel-unread-insights',
          priority: 7,
          message: `You have ${unreadInsights} new teaching insight${unreadInsights > 1 ? 's' : ''} from your courses`,
          action: '<!--ACTION:{"type":"navigate","href":"/analytics/teaching","label":"View Teaching Insights"}-->',
        })
      }
    } catch {
      // Non-fatal
    }

    // Critical concept difficulty
    try {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: userId },
        select: { id: true },
      })
      const instructorCourseIds = instructorCourses.map(c => c.id)

      if (instructorCourseIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const criticalConcepts = await prisma.conceptDifficultySnapshot.count({
          where: {
            courseId: { in: instructorCourseIds },
            difficulty: 'CRITICAL',
            computedAt: { gte: sevenDaysAgo },
          },
        })
        if (criticalConcepts > 0) {
          suggestions.push({
            type: 'classroom-intel-critical-concept',
            priority: 9,
            message: `${criticalConcepts} concept${criticalConcepts > 1 ? 's' : ''} in critical difficulty — students need help`,
            action: '<!--ACTION:{"type":"navigate","href":"/analytics/teaching","label":"View Concept Map"}-->',
          })
        }
      }
    } catch {
      // Non-fatal
    }

    // Intervention results ready
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const measuredInterventions = await prisma.teachingIntervention.count({
        where: {
          instructorId: userId,
          status: 'active',
          createdAt: { lte: sevenDaysAgo },
        },
      })
      if (measuredInterventions > 0) {
        suggestions.push({
          type: 'classroom-intel-intervention-result',
          priority: 5,
          message: 'Your recent teaching adjustment has been measured — see the results',
          action: '<!--ACTION:{"type":"navigate","href":"/analytics/teaching/interventions","label":"View Intervention Results"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Accreditation Autopilot nudges (ADMIN only) ──────────────────────
  if (userProfile?.role === 'ADMIN') {
    try {
      const activeCycle = await prisma.accreditationCycle.findFirst({
        where: { isActive: true },
        select: { id: true },
      })
      if (activeCycle) {
        const criticalGaps = await prisma.complianceGap.count({
          where: { cycleId: activeCycle.id, severity: 'critical', remediationStatus: { not: 'resolved' } },
        })
        if (criticalGaps > 0) {
          suggestions.push({
            type: 'accreditation-critical-gaps',
            priority: 9,
            message: `${criticalGaps} critical accreditation gap${criticalGaps > 1 ? 's' : ''} need${criticalGaps === 1 ? 's' : ''} attention — want to review them?`,
            action: '<!--ACTION:{"type":"navigate","href":"/accreditation","label":"Review Gaps"}-->',
          })
        }

        const lastEvidence = await prisma.accreditationEvidence.findFirst({
          where: { cycleId: activeCycle.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
        if (lastEvidence) {
          const daysSince = Math.floor((Date.now() - lastEvidence.createdAt.getTime()) / 86400000)
          if (daysSince > 14) {
            suggestions.push({
              type: 'accreditation-harvest-stale',
              priority: 5,
              message: "Evidence harvest hasn't run in 2+ weeks — some accreditation evidence may be stale.",
              action: '<!--ACTION:{"type":"navigate","href":"/accreditation/evidence","label":"Check Evidence"}-->',
            })
          }
        }

        const narrativesInReview = await prisma.complianceNarrative.count({
          where: { cycleId: activeCycle.id, status: 'AI_DRAFT' },
        })
        if (narrativesInReview > 0) {
          suggestions.push({
            type: 'accreditation-narrative-review',
            priority: 6,
            message: `${narrativesInReview} compliance narrative${narrativesInReview > 1 ? 's' : ''} ready for your review.`,
            action: '<!--ACTION:{"type":"navigate","href":"/accreditation/narratives","label":"Review Narratives"}-->',
          })
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Campus Pulse Critical (ADMIN/STAFF) ──────────────────────────────
  if (userProfile?.role === 'ADMIN' || userProfile?.role === 'STAFF') {
    try {
      const criticalPulseEvents = await prisma.pulseEvent.count({
        where: {
          status: 'active',
          severity: 'critical',
        },
      })
      if (criticalPulseEvents > 0) {
        suggestions.push({
          type: 'campus-pulse-critical',
          priority: 9,
          message: `${criticalPulseEvents} critical campus pulse event${criticalPulseEvents > 1 ? 's' : ''} detected — multiple data streams are converging on a concern.`,
          action: '<!--ACTION:{"type":"navigate","href":"/admin/campus-pulse","label":"View Campus Pulse"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Policy Impact Unresolved (ADMIN) ────────────────────────────────
  if (userProfile?.role === 'ADMIN') {
    try {
      const unresolvedReports = await prisma.policyImpactReport.count({
        where: { status: { not: 'resolved' } },
      })
      if (unresolvedReports > 0) {
        suggestions.push({
          type: 'policy-impact-unresolved',
          priority: 7,
          message: `${unresolvedReports} policy impact report${unresolvedReports > 1 ? 's' : ''} still unresolved — review affected courses and workflows.`,
          action: '<!--ACTION:{"type":"navigate","href":"/admin/policy-blast","label":"View Policy Impact"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // Study spot suggestion (students only, low priority nudge)
  if (enrolledCourseIds.length > 0) {
    try {
      const rec = await prisma.studyLocationRecommendation.findUnique({
        where: { userId },
        select: { recommendations: true },
      })
      const recs = rec?.recommendations as unknown as Array<{ buildingName: string; reason: string }> | null
      if (recs && recs.length > 0) {
        suggestions.push({
          type: 'study-spot-suggestion',
          priority: 3,
          message: `Looking for a study spot? ${recs[0].buildingName} might be a great fit — ${recs[0].reason.toLowerCase()}.`,
          action: '<!--ACTION:{"type":"navigate","href":"/campus-map","label":"View on Map"}-->',
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // Sort by priority desc, take top 5
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

/**
 * Format suggestions into a system prompt section.
 */
export function buildProactiveSuggestionsSection(
  suggestions: ProactiveSuggestion[],
): string {
  if (suggestions.length === 0) return ''

  const lines = suggestions.map(
    (s, i) => `${i + 1}. ${s.message}${s.action ? `\n   ${s.action}` : ''}`,
  )

  return `\n\n## PROACTIVE SUGGESTIONS
Sandy, here are contextual suggestions to weave into the conversation when relevant. Pick AT MOST ONE to surface naturally — don't dump the list. Choose the one most relevant to what the student is doing or asking about.

${lines.join('\n')}

Rules:
- Surface at most ONE suggestion per conversation
- Weave it in naturally — "By the way..." or "I noticed..."
- If the student is clearly focused on something specific, don't interrupt with unrelated suggestions
- If no suggestion fits the conversation flow, skip them entirely`
}
