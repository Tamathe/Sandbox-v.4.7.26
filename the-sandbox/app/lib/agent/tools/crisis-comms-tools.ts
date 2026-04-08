/**
 * Sandy Agent Tools — Crisis Communications
 *
 * Provides Sandy with the ability to launch crisis spokesperson training drills
 * and retrieve a user's drill history and performance trends.
 */

import type { ToolModule, AgentUser } from '../agent-types'
import { prisma } from '../../prisma'
import type { DrillScores } from '../../crisis-comms/spokesperson-trainer/types'
import { getIncidentsByUser } from '../../crisis-comms/command-center/command-center-service'

const TOOL_ID = 'tool-crisis-spokesperson-trainer'

export const crisisCommsTools: ToolModule = {
  tools: [
    {
      name: 'start_crisis_drill',
      description:
        'Navigate the user to the Crisis Spokesperson Trainer to practice a media training drill. Optionally suggest a scenario and difficulty level. Use when the user says "I want to practice a press conference", "media training", "spokesperson practice", or similar.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          suggestedScenario: {
            type: 'string',
            description:
              'Optional scenario to suggest: campus-lockdown, severe-weather, data-breach, student-death, reputational-allegation, or custom',
          },
          suggestedDifficulty: {
            type: 'string',
            enum: ['warmup', 'standard', 'hostile', 'press-conference'],
            description: 'Optional difficulty to suggest',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_crisis_drill_history',
      description:
        'Retrieve the user\'s past crisis spokesperson training drill results including scores and trends. Use when the user asks about their media training performance or past drills.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of past drills to retrieve (default: 10, max: 20)',
          },
        },
        required: [],
      },
    },
    {
      name: 'start_crisis_incident',
      description:
        'Start a new crisis incident in the Command Center. Navigates user to the Command Center page and suggests a demo scenario if no details provided. Use when the user says "start a crisis", "open the command center", "crisis war room", or similar.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      reliability: 'navigation' as const,
      input_schema: {
        type: 'object',
        properties: {
          scenarioId: {
            type: 'string',
            description:
              'Optional demo scenario ID: chemistry-lab-explosion, student-data-breach, or controversial-speaker-protest',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_crisis_incidents',
      description:
        'Get the user\'s recent crisis incidents and their current status. Use when the user asks about their crisis incidents, command center history, or incident status.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      reliability: 'live' as const,
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],

  handlers: {
    start_crisis_drill: async (
      args: Record<string, unknown>,
    ) => {
      const scenario = (args.suggestedScenario as string) ?? null
      const difficulty = (args.suggestedDifficulty as string) ?? 'standard'

      const scenarioNames: Record<string, string> = {
        'campus-lockdown': 'Campus Lockdown',
        'severe-weather': 'Severe Weather Emergency',
        'data-breach': 'Student Data Breach',
        'student-death': 'Student Injury or Death',
        'reputational-allegation': 'Viral Reputational Allegation',
      }

      return {
        action: 'navigate',
        url: '/crisis-comms/spokesperson-trainer',
        message: scenario
          ? `I'll take you to the Crisis Spokesperson Trainer. I'd suggest the **${scenarioNames[scenario] ?? scenario}** scenario on **${difficulty}** difficulty. You can also define key messages you want to practice landing.`
          : `I'll take you to the Crisis Spokesperson Trainer. You can pick from 5 preset crisis scenarios or describe your own, choose a difficulty (including the new Press Conference mode with multiple reporters), and define key messages to practice.`,
      }
    },

    start_crisis_incident: async (
      args: Record<string, unknown>,
    ) => {
      const scenarioId = (args.scenarioId as string) ?? null

      const scenarioNames: Record<string, string> = {
        'chemistry-lab-explosion': 'Chemistry Lab Explosion (Critical)',
        'student-data-breach': 'Student Data Breach (Moderate)',
        'controversial-speaker-protest': 'Controversial Speaker Protest (Low)',
      }

      return {
        action: 'navigate',
        url: '/crisis-comms/command-center',
        message: scenarioId
          ? `I'll take you to the Crisis Command Center. I'd suggest starting with the **${scenarioNames[scenarioId] ?? scenarioId}** demo scenario. You'll get an AI situation assessment and coordinated document drafts.`
          : `I'll take you to the Crisis Command Center. You can pick from 3 demo scenarios (Chemistry Lab Explosion, Student Data Breach, Controversial Speaker Protest) or describe your own crisis. The system will generate an AI assessment and draft all your communications.`,
      }
    },

    get_crisis_incidents: async (
      _args: Record<string, unknown>,
      user: AgentUser,
    ) => {
      const incidents = await getIncidentsByUser(user.id)

      if (incidents.length === 0) {
        return {
          message: 'No crisis incidents found. Would you like to start one in the Command Center?',
          incidentCount: 0,
          incidents: [],
        }
      }

      const summary = incidents.slice(0, 10).map((inc) => ({
        title: inc.title,
        severity: inc.severity === 3 ? 'Critical' : inc.severity === 2 ? 'Moderate' : 'Low',
        status: inc.status,
        documentCount: inc.documents?.length ?? 0,
        participantCount: inc.participants?.length ?? 0,
        createdAt: inc.createdAt,
      }))

      return {
        message: `Found ${incidents.length} crisis incident${incidents.length > 1 ? 's' : ''}.`,
        incidentCount: incidents.length,
        incidents: summary,
      }
    },

    get_crisis_drill_history: async (
      args: Record<string, unknown>,
      user: AgentUser,
    ) => {
      const limit = Math.min(Math.max(1, (args.limit as number) ?? 10), 20)

      const sessions = await prisma.toolSession.findMany({
        where: {
          toolId: TOOL_ID,
          userId: user.id,
          score: { not: null },
          endedAt: { not: null },
        },
        orderBy: { endedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          notes: true,
          score: true,
          endedAt: true,
        },
      })

      const drills = sessions
        .map((s) => {
          if (!s.notes || !s.endedAt) return null
          try {
            const data = JSON.parse(s.notes) as {
              scenarioTitle?: string
              difficulty?: string
              scores?: DrillScores
              questionsAnswered?: number
            }
            if (!data.scores) return null
            const avg = (data.scores.clarity + data.scores.empathy + data.scores.speculationControl + data.scores.messageDiscipline) / 4
            return {
              scenarioTitle: data.scenarioTitle ?? 'Custom',
              difficulty: data.difficulty ?? 'standard',
              scores: data.scores,
              averageScore: avg.toFixed(1),
              questionsAnswered: data.questionsAnswered ?? 0,
              completedAt: s.endedAt.toISOString(),
            }
          } catch {
            return null
          }
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)

      if (drills.length === 0) {
        return {
          message: 'No completed crisis drills found. Would you like to start one?',
          drillCount: 0,
          drills: [],
        }
      }

      // Compute trend
      const latestAvg = parseFloat(drills[0].averageScore)
      const prevAvg = drills.length > 1 ? parseFloat(drills[1].averageScore) : null
      const trend = prevAvg !== null
        ? latestAvg > prevAvg ? 'improving' : latestAvg < prevAvg ? 'declining' : 'steady'
        : 'first-drill'

      return {
        message: `Found ${drills.length} completed crisis drill${drills.length > 1 ? 's' : ''}.`,
        drillCount: drills.length,
        trend,
        latestScore: drills[0].averageScore,
        drills: drills.slice(0, 5), // Top 5 for context
      }
    },
  },
}
