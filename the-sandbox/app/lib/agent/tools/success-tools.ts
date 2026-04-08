/**
 * Sandy Universal Agent — Student Success Early Warning Tools
 *
 * 4 tools: get_student_success_score, get_course_risk_summary,
 *          get_intervention_effectiveness, suggest_intervention
 */

import type { ToolModule, ToolHandler } from '../agent-types'
import { prisma } from '../../prisma'
import { getCourseRiskHeatmap } from '../../success/success-service'

export const successTools: ToolModule = {
  tools: [
    {
      name: 'get_student_success_score',
      description:
        "Get a student's current success score and trajectory for a course. Shows composite score, trajectory direction, top risk signals, active alerts, and last intervention. For faculty/advisor use only.",
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          studentEmail: { type: 'string', description: 'Student email address' },
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['studentEmail', 'courseId'],
      },
    },
    {
      name: 'get_course_risk_summary',
      description:
        'Get risk distribution and top at-risk students for a course. Returns healthy/watch/concern/urgent/critical breakdown, average score, 7-day trend, and top 5 at-risk students.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_intervention_effectiveness',
      description:
        'Get intervention outcome statistics for a course. Shows which types of outreach are working best (re-engaged, partial, no change, escalated).',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'suggest_intervention',
      description:
        'Get AI-generated intervention suggestions for a specific at-risk student alert. Returns suggested actions with reasoning and urgency levels.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          alertId: { type: 'string', description: 'Success alert ID' },
        },
        required: ['alertId'],
      },
    },
  ],

  handlers: {
    async get_student_success_score(args: Record<string, unknown>) {
      const { studentEmail, courseId } = args as { studentEmail: string; courseId: string }
      const student = await prisma.user.findUnique({
        where: { email: studentEmail },
        select: { id: true, name: true },
      })

      if (!student) return { error: 'Student not found' }

      const score = await prisma.studentSuccessScore.findUnique({
        where: { userId_courseId: { userId: student.id, courseId } },
      })

      if (!score) return { error: 'No success score data available for this student in this course' }

      const alerts = await prisma.successAlert.findMany({
        where: { userId: student.id, courseId, status: { in: ['active', 'acknowledged'] } },
        select: { severity: true, patternType: true, triggerReason: true },
        take: 3,
      })

      const lastIntervention = await prisma.successIntervention.findFirst({
        where: { userId: student.id },
        orderBy: { createdAt: 'desc' },
        select: { type: true, outcome: true, createdAt: true },
      })

      return {
        studentName: student.name,
        score: score.score,
        trajectory: score.trajectory,
        scoreDelta7d: score.scoreDelta7d,
        inflectionDetected: score.inflectionDetected,
        inflectionType: score.inflectionType,
        daysSinceActive: score.daysSinceActive,
        topSignals: [
          { signal: 'login', score: score.loginScore },
          { signal: 'assignments', score: score.assignmentScore },
          { signal: 'grades', score: score.gradeTrendScore },
          { signal: 'flashcards', score: score.flashcardScore },
          { signal: 'studySessions', score: score.studySessionScore },
        ].filter(s => s.score != null).sort((a, b) => (a.score ?? 100) - (b.score ?? 100)).slice(0, 3),
        activeAlerts: alerts,
        lastIntervention,
      }
    },

    async get_course_risk_summary(args: Record<string, unknown>) {
      const { courseId } = args as { courseId: string }
      const heatmap = await getCourseRiskHeatmap(courseId)
      return {
        courseName: heatmap.courseName,
        totalStudents: heatmap.totalStudents,
        avgScore: heatmap.avgScore,
        avgDelta7d: heatmap.avgDelta7d,
        distribution: heatmap.distribution,
        topRiskStudents: heatmap.topRiskStudents.slice(0, 5).map(s => ({
          name: s.userName,
          score: s.score,
          trajectory: s.trajectory,
          severity: s.severity,
        })),
      }
    },

    async get_intervention_effectiveness(args: Record<string, unknown>) {
      const { courseId } = args as { courseId: string }
      const interventions = await prisma.successIntervention.findMany({
        where: { alert: { courseId } },
        select: { type: true, outcome: true },
      })

      const byType: Record<string, Record<string, number>> = {}
      for (const int of interventions) {
        if (!byType[int.type]) byType[int.type] = {}
        byType[int.type][int.outcome] = (byType[int.type][int.outcome] ?? 0) + 1
      }

      return {
        total: interventions.length,
        byType,
        overallOutcomes: {
          reEngaged: interventions.filter(i => i.outcome === 'RE_ENGAGED').length,
          partial: interventions.filter(i => i.outcome === 'PARTIAL').length,
          noChange: interventions.filter(i => i.outcome === 'NO_CHANGE').length,
          escalated: interventions.filter(i => i.outcome === 'ESCALATED').length,
          pending: interventions.filter(i => i.outcome === 'PENDING').length,
        },
      }
    },

    async suggest_intervention(args: Record<string, unknown>) {
      const { alertId } = args as { alertId: string }
      const alert = await prisma.successAlert.findUnique({
        where: { id: alertId },
        include: {
          user: { select: { name: true } },
        },
      })

      if (!alert) return { error: 'Alert not found' }

      return {
        studentName: alert.user.name,
        severity: alert.severity,
        patternType: alert.patternType,
        triggerReason: alert.triggerReason,
        suggestedActions: alert.suggestedActions,
        signalBreakdown: alert.signalBreakdown,
      }
    },
  },
}
