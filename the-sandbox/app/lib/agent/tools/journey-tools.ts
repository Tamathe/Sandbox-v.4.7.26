import { getStudentJourney } from '../../journey/journey-service'

export const journeyTools = [
  {
    name: 'get_student_journey',
    description: 'Retrieve a student\'s holistic learning journey timeline including weekly snapshots, milestones, engagement fingerprint, and AI narrative summary. Returns the last 16 weeks by default.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'The student user ID to look up' },
        weeks: { type: 'number', description: 'Number of weeks to include (default 16)' },
        layer: { type: 'string', description: 'Optional layer filter: academic, mastery, study, social, wellness, campus' },
      },
      required: ['userId'],
    },
    handler: async (input: { userId: string; weeks?: number; layer?: string }) => {
      const journey = await getStudentJourney(input.userId, {
        weeks: input.weeks,
        layer: input.layer,
      })

      return {
        trajectory: journey.currentTrajectory,
        narrative: journey.narrative,
        snapshotCount: journey.snapshots.length,
        milestoneCount: journey.milestones.length,
        fingerprint: journey.fingerprint,
        recentMilestones: journey.milestones.slice(-5).map(m => ({
          type: m.type,
          title: m.title,
          description: m.description,
          layer: m.layer,
          occurredAt: m.occurredAt,
        })),
        latestSnapshot: journey.snapshots.length > 0 ? {
          weekOf: journey.snapshots[journey.snapshots.length - 1].weekOf,
          engagementScore: journey.snapshots[journey.snapshots.length - 1].engagementScore,
          studySessions: journey.snapshots[journey.snapshots.length - 1].studySessions,
          messagesSent: journey.snapshots[journey.snapshots.length - 1].messagesSent,
          conceptsGained: journey.snapshots[journey.snapshots.length - 1].conceptsGained,
        } : null,
      }
    },
  },
]
