import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    assistantActionLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../assistant/providers', () => ({
  getCalendarProvider: vi.fn(),
}))

vi.mock('../assistant/rules-service', () => ({
  evaluateRules: vi.fn(),
}))

import { prisma } from '../prisma'
import { getCalendarProvider } from '../assistant/providers'
import { bookMeeting } from '../assistant/scheduling-service'

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
  assistantActionLog: { create: ReturnType<typeof vi.fn> }
}

const mockGetCalendarProvider = vi.mocked(getCalendarProvider)

describe('scheduling-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.assistantActionLog.create.mockResolvedValue({ id: 'log-1' })
  })

  it('does not duplicate attendee events when the organizer event is Graph-backed', async () => {
    const calendarProvider = {
      createEvent: vi.fn().mockResolvedValue({
        id: 'graph-event-1',
        title: 'Office Hours',
        description: null,
        startTime: new Date('2026-03-26T15:00:00Z'),
        endTime: new Date('2026-03-26T15:30:00Z'),
        location: null,
        attendees: ['student@uky.edu'],
        source: 'graph',
        isAllDay: false,
        category: 'meeting',
      }),
    }
    mockGetCalendarProvider.mockResolvedValue(calendarProvider as never)

    const event = await bookMeeting({
      requesterId: 'faculty-1',
      title: 'Office Hours',
      attendees: ['student@uky.edu'],
      option: {
        index: 1,
        start: new Date('2026-03-26T15:00:00Z'),
        end: new Date('2026-03-26T15:30:00Z'),
        label: 'Thu Mar 26, 3:00 PM - 3:30 PM',
        score: 4,
      },
    })

    expect(calendarProvider.createEvent).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(event.source).toBe('graph')
  })

  it('preserves mirrored attendee events for simulated calendars', async () => {
    const calendarProvider = {
      createEvent: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'local-event-1',
          title: 'Office Hours',
          description: null,
          startTime: new Date('2026-03-26T15:00:00Z'),
          endTime: new Date('2026-03-26T15:30:00Z'),
          location: null,
          attendees: ['student@uky.edu'],
          source: 'simulated',
          isAllDay: false,
          category: 'meeting',
        })
        .mockResolvedValueOnce({
          id: 'local-event-2',
          title: 'Office Hours',
          description: null,
          startTime: new Date('2026-03-26T15:00:00Z'),
          endTime: new Date('2026-03-26T15:30:00Z'),
          location: null,
          attendees: ['student@uky.edu'],
          source: 'simulated',
          isAllDay: false,
          category: 'meeting',
        }),
    }
    mockGetCalendarProvider.mockResolvedValue(calendarProvider as never)
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'student-user-1' })

    await bookMeeting({
      requesterId: 'faculty-1',
      title: 'Office Hours',
      attendees: ['student@uky.edu'],
      option: {
        index: 1,
        start: new Date('2026-03-26T15:00:00Z'),
        end: new Date('2026-03-26T15:30:00Z'),
        label: 'Thu Mar 26, 3:00 PM - 3:30 PM',
        score: 4,
      },
    })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'student@uky.edu' },
    })
    expect(calendarProvider.createEvent).toHaveBeenCalledTimes(2)
    expect(calendarProvider.createEvent).toHaveBeenNthCalledWith(2, 'student-user-1', {
      title: 'Office Hours',
      startTime: new Date('2026-03-26T15:00:00Z'),
      endTime: new Date('2026-03-26T15:30:00Z'),
      attendees: ['student@uky.edu'],
      category: 'meeting',
    })
  })
})
