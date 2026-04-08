/**
 * Sandy Universal Agent -- Campus Pulse Early Warning Tools
 *
 * 2 tools: get_campus_pulse_events, acknowledge_pulse_event
 */

import type { ToolModule } from '../agent-types'
import {
  getActiveEvents,
  acknowledgeEvent,
} from '../../campus-pulse/campus-pulse-service'

export const campusPulseTools: ToolModule = {
  tools: [
    {
      name: 'get_campus_pulse_events',
      description:
        'Check for active campus-wide concerns detected by the multi-signal intelligence system. Shows emerging issues based on converging signals from news, emails, student risk, office hours, submissions, and course posts. Returns theme, severity, summary, signal count, and suggested actions.',
      category: 'analytics',
      permission: 'auto',
      roles: ['ADMIN', 'STAFF', 'EDUCATOR'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            description: 'Filter by minimum severity: low, medium, high, critical',
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      },
    },
    {
      name: 'acknowledge_pulse_event',
      description:
        'Acknowledge a campus pulse event to indicate it has been seen. Requires the event ID. Only available to ADMIN and STAFF users.',
      category: 'analytics',
      permission: 'confirm',
      roles: ['ADMIN', 'STAFF'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'The ID of the pulse event to acknowledge',
          },
        },
        required: ['eventId'],
      },
    },
  ],

  handlers: {
    async get_campus_pulse_events(args: Record<string, unknown>, user) {
      const severity = args.severity as string | undefined

      const events = await getActiveEvents({
        severity,
        role: user.role,
        limit: 5,
      })

      if (events.length === 0) {
        return {
          message:
            'No active campus concerns detected. All signal streams are within normal ranges.',
        }
      }

      return {
        eventCount: events.length,
        events: events.map(e => ({
          id: e.id,
          theme: e.theme,
          severity: e.severity,
          summary: e.summary,
          signalCount: e.signals.length,
          streams: [...new Set(e.signals.map(s => s.stream))],
          suggestedActions: e.suggestedActions,
          detectedAt: e.detectedAt,
        })),
      }
    },

    async acknowledge_pulse_event(args: Record<string, unknown>, user) {
      const eventId = args.eventId as string

      if (!eventId) {
        return { error: 'eventId is required' }
      }

      try {
        await acknowledgeEvent(eventId, user.id)
        return { success: true, message: `Pulse event ${eventId} has been acknowledged.` }
      } catch {
        return { error: 'Failed to acknowledge event. It may not exist or is already resolved.' }
      }
    },
  },
}
