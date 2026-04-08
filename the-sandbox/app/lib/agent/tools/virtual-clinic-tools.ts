/**
 * Sandy Agent Tools — Virtual Clinic
 *
 * 4 tools for navigating Virtual Clinic, starting encounters,
 * retrieving scores, and creating clinical cases.
 */

import type { ToolModule, AgentUser } from '../agent-types'
import { prisma } from '../../prisma'
import { listCases } from '../../virtual-clinic/case-service'

export const virtualClinicTools: ToolModule = {
  tools: [
    {
      name: 'launch_virtual_clinic',
      description:
        'Navigate the user to the Virtual Clinic landing page where they can browse clinical cases, start new patient encounters, and review past performance. Use when the user says "virtual clinic", "clinical simulation", "patient encounter", or similar.',
      category: 'campus' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'start_clinical_case',
      description:
        'Start a clinical patient encounter or recommend cases. If caseId is provided, navigates directly to start that case. Otherwise, queries published cases matching optional filters (difficulty, organSystem) and returns top 3 recommendations. Use when a student says "start a case", "practice clinical reasoning", "patient sim", or similar.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          caseId: {
            type: 'string',
            description: 'Specific case ID to start an encounter with',
          },
          difficulty: {
            type: 'string',
            enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
            description: 'Filter cases by difficulty level',
          },
          organSystem: {
            type: 'string',
            description: 'Filter cases by organ system (e.g. "Cardiovascular", "Respiratory")',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_encounter_results',
      description:
        'Retrieve scores, competency level, cognitive biases, and feedback narrative for a completed clinical encounter. Use when a user asks about their encounter performance, scores, or feedback.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          encounterId: {
            type: 'string',
            description: 'The encounter ID to retrieve results for',
          },
        },
        required: ['encounterId'],
      },
    },
    {
      name: 'create_clinical_case',
      description:
        'Create a new draft clinical case and navigate to the author page. Use when an educator says "create a clinical case", "author a patient case", or similar.',
      category: 'campus' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title for the clinical case',
          },
          chiefComplaint: {
            type: 'string',
            description: 'The patient\'s chief complaint',
          },
        },
        required: ['title', 'chiefComplaint'],
      },
    },
  ],

  handlers: {
    launch_virtual_clinic: async () => {
      return {
        action: 'navigate',
        url: '/virtual-clinic',
        message:
          "I'll take you to the Virtual Clinic. From there you can browse available clinical cases, start a new patient encounter, or review your past performance and scores.",
      }
    },

    start_clinical_case: async (args: Record<string, unknown>) => {
      const caseId = args.caseId as string | undefined
      const difficulty = args.difficulty as string | undefined
      const organSystem = args.organSystem as string | undefined

      if (caseId) {
        return {
          action: 'navigate',
          url: '/virtual-clinic',
          message: `I'll take you to the Virtual Clinic to start case **${caseId}**. You'll conduct a patient interview, build a differential, and receive detailed feedback.`,
          caseId,
        }
      }

      const cases = await listCases({
        difficulty,
        organSystem,
        published: true,
      })

      const top3 = cases.slice(0, 3)

      if (top3.length === 0) {
        return {
          action: 'navigate',
          url: '/virtual-clinic',
          message: 'No published cases match those filters. Let me take you to the Virtual Clinic to browse all available cases.',
          cases: [],
        }
      }

      return {
        cases: top3.map((c) => ({
          id: c.id,
          title: c.title,
          chiefComplaint: c.chiefComplaint,
          difficulty: c.difficulty,
          organSystems: c.organSystems,
          patient: `${c.patientName}, ${c.patientAge}${c.patientSex[0]}`,
        })),
        action: 'navigate',
        url: '/virtual-clinic',
        message: `I found ${cases.length} case${cases.length === 1 ? '' : 's'}. Here are the top recommendations. Head to the Virtual Clinic to start one.`,
      }
    },

    get_encounter_results: async (args: Record<string, unknown>, user: AgentUser) => {
      const encounterId = args.encounterId as string

      const encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: encounterId },
        include: {
          clinicalCase: {
            select: { title: true, difficulty: true },
          },
        },
      })

      if (!encounter) {
        return { error: 'Encounter not found' }
      }

      // Ownership check — educators can see encounters in their cases
      if (encounter.userId !== user.id) {
        const isCreator = await prisma.clinicalCase.findFirst({
          where: { id: encounter.caseId, creatorId: user.id },
          select: { id: true },
        })
        if (!isCreator && user.role !== 'ADMIN') {
          return { error: 'You do not have access to this encounter' }
        }
      }

      return {
        caseTitle: encounter.clinicalCase.title,
        difficulty: encounter.clinicalCase.difficulty,
        phase: encounter.phase,
        completedAt: encounter.completedAt,
        overallScore: encounter.overallScore,
        overallLevel: encounter.overallLevel,
        scores: encounter.scores,
        cognitiveBiases: encounter.cognitiveBiases,
        feedbackNarrative: encounter.feedbackNarrative,
        url: `/virtual-clinic/encounter/${encounterId}`,
      }
    },

    create_clinical_case: async (args: Record<string, unknown>) => {
      const title = args.title as string
      const chiefComplaint = args.chiefComplaint as string

      return {
        action: 'navigate',
        url: `/virtual-clinic/author?prefillTitle=${encodeURIComponent(title)}&prefillCC=${encodeURIComponent(chiefComplaint)}`,
        message: `I'll take you to the Case Author with "${title}" pre-filled. You can flesh out the patient details, history, exam findings, and scoring rubric.`,
      }
    },
  },
}
