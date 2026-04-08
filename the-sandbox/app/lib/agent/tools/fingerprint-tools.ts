/**
 * Sandy Universal Agent — Engagement Fingerprint Tools
 *
 * 2 tools: get_learner_profile, get_class_profile
 *
 * Wraps fingerprint-service for Sandy to surface learning patterns.
 */

import type { ToolModule } from '../agent-types'
import { getFingerprint, getCourseFingerprint } from '../../fingerprint/fingerprint-service'
import { prisma } from '../../prisma'

export const fingerprintTools: ToolModule = {
  tools: [
    {
      name: 'get_learner_profile',
      description:
        'Get the engagement fingerprint and learning profile for the current user. Shows chronotype, study cadence, preferred modes, collaboration style, and more.',
      category: 'analytics',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_class_profile',
      description:
        'Get the aggregated engagement fingerprint for a course section. Shows class-level patterns without identifying individual students.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'Course ID to analyze',
          },
        },
        required: ['courseId'],
      },
    },
  ],

  handlers: {
    async get_learner_profile(_args, user) {
      try {
        const fp = await getFingerprint(user.id)
        if (!fp) {
          return { message: 'Not enough data yet to build a learning profile.' }
        }

        return {
          chronotype: fp.temporal.chronotype,
          cadence: fp.temporal.sessionCadence,
          preferredModes: fp.learning.preferredStudyModes,
          modality: fp.learning.preferredModality,
          collaborationStyle: fp.social.socialOrientation,
          deadlineBehavior: fp.engagement.deadlineProximity,
          sessionsPerWeek: fp.engagement.sessionsPerWeek,
          avgSessionMinutes: fp.engagement.avgSessionMinutes,
          retention: fp.learning.masteryRetention,
          consistency: fp.engagement.consistencyScore,
          confidence: fp.meta.confidence,
        }
      } catch {
        return { is_error: true, message: 'Failed to retrieve learning profile.' }
      }
    },

    async get_class_profile(args, user) {
      try {
        const courseId = args.courseId as string
        if (!courseId) {
          return { is_error: true, message: 'courseId is required.' }
        }

        // Verify course ownership
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { instructorId: true, title: true },
        })

        if (!course) {
          return { is_error: true, message: 'Course not found.' }
        }

        if (course.instructorId !== user.id && user.role !== 'ADMIN') {
          return { is_error: true, message: 'You can only view profiles for your own courses.' }
        }

        const cfp = await getCourseFingerprint(courseId)
        if (!cfp) {
          return { message: 'Not enough student data to build a class profile.' }
        }

        return {
          courseName: course.title,
          studentCount: cfp.studentCount,
          dominantChronotype: cfp.dominantChronotype,
          dominantCadence: cfp.dominantCadence,
          distributions: {
            chronotype: cfp.chronotypeDistribution,
            cadence: cfp.cadenceDistribution,
            social: cfp.socialDistribution,
            deadline: cfp.deadlineDistribution,
          },
          topStudyModes: cfp.topStudyModes,
          avgSessionMinutes: cfp.avgSessionMinutes,
          avgConsistency: cfp.avgConsistencyScore,
          riskSignals: cfp.riskSignals,
          engagementTrend: cfp.engagementTrend,
        }
      } catch {
        return { is_error: true, message: 'Failed to retrieve class profile.' }
      }
    },
  },
}
