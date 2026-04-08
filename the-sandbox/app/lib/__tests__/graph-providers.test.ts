import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    assistantEmail: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    assistantCalendarEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../assistant/graph-client', () => ({
  buildGraphUserPath: vi.fn((userPrincipal: string) => `/users/${encodeURIComponent(userPrincipal)}`),
  escapeGraphFilterValue: vi.fn((value: string) => value.replace(/'/g, "''")),
  getGraphPrincipalForUser: vi.fn(),
  getGraphRuntimeDiagnostics: vi.fn(() => ({
    baseUrl: 'https://graph.microsoft.com/v1.0',
    tenantId: 'tenant-1',
    clientId: 'client-1',
    hasClientSecret: true,
    sharePointSiteId: null,
    healthcheckUserEmail: null,
  })),
  graphJsonRequest: vi.fn(),
  recordGraphSyncSuccess: vi.fn(),
  toGraphDateTime: vi.fn((date: Date) => date.toISOString().replace(/\.000Z$/, '')),
  fromGraphDateTime: vi.fn((input: { dateTime?: string | null; timeZone?: string | null }) => {
    const raw = input.dateTime ?? '1970-01-01T00:00:00Z'
    return /Z$/.test(raw) ? new Date(raw) : new Date(`${raw}Z`)
  }),
}))

vi.mock('../integrations/registry', () => ({
  getInstitutionIntegrationByKey: vi.fn(),
  serializeIntegration: vi.fn((value: unknown) => value),
}))

import { prisma } from '../prisma'
import {
  getGraphPrincipalForUser,
  getGraphRuntimeDiagnostics,
  graphJsonRequest,
  recordGraphSyncSuccess,
} from '../assistant/graph-client'
import { GraphCalendarProvider } from '../assistant/graph-calendar'
import { GraphEmailProvider } from '../assistant/graph-email'
import { GraphFileProvider } from '../assistant/graph-files'
import {
  getCalendarProviderSelection,
  getEmailProviderSelection,
  getFileProviderSelection,
} from '../assistant/providers'
import {
  getInstitutionIntegrationByKey,
  serializeIntegration,
} from '../integrations/registry'

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
  assistantEmail: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  assistantCalendarEvent: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
}

const mockGetGraphPrincipalForUser = vi.mocked(getGraphPrincipalForUser)
const mockGetGraphRuntimeDiagnostics = vi.mocked(getGraphRuntimeDiagnostics)
const mockGraphJsonRequest = vi.mocked(graphJsonRequest)
const mockRecordGraphSyncSuccess = vi.mocked(recordGraphSyncSuccess)
const mockGetInstitutionIntegrationByKey = vi.mocked(getInstitutionIntegrationByKey)
const mockSerializeIntegration = vi.mocked(serializeIntegration)

describe('graph-backed assistant providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGraphPrincipalForUser.mockResolvedValue('educator@uky.edu')
    mockSerializeIntegration.mockImplementation((value) => value as never)
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'educator@uky.edu',
    })
    mockGetGraphRuntimeDiagnostics.mockReturnValue({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      tenantId: 'tenant-1',
      clientId: 'client-1',
      hasClientSecret: true,
      sharePointSiteId: null,
      healthcheckUserEmail: null,
    })
  })

  it('syncs Microsoft Graph inbox messages into local assistant emails', async () => {
    mockGraphJsonRequest.mockResolvedValue({
      value: [
        {
          id: 'graph-message-1',
          subject: 'Need a syllabus update',
          bodyPreview: 'Can you share the revised syllabus?',
          body: { content: 'Can you share the revised syllabus?' },
          from: {
            emailAddress: {
              address: 'student@uky.edu',
              name: 'Student Sender',
            },
          },
          toRecipients: [{ emailAddress: { address: 'educator@uky.edu' } }],
          conversationId: 'thread-1',
          categories: [],
          isRead: false,
          importance: 'normal',
          receivedDateTime: '2026-03-25T15:00:00Z',
        },
      ],
    })
    mockPrisma.assistantEmail.findMany.mockResolvedValue([])
    mockPrisma.assistantEmail.create.mockResolvedValue({
      id: 'local-email-1',
      userId: 'user-1',
      fromAddress: 'student@uky.edu',
      fromName: 'Student Sender',
      toAddresses: ['educator@uky.edu'],
      subject: 'Need a syllabus update',
      body: 'Can you share the revised syllabus?',
      snippet: 'Can you share the revised syllabus?',
      threadId: 'thread-1',
      category: 'admin',
      isRead: false,
      isStarred: false,
      receivedAt: new Date('2026-03-25T15:00:00Z'),
      source: 'graph',
      externalId: 'graph-message-1',
    })

    const provider = new GraphEmailProvider()
    const emails = await provider.getInbox('user-1', { limit: 10 })

    expect(mockGraphJsonRequest).toHaveBeenCalledTimes(1)
    expect(mockPrisma.assistantEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        externalId: 'graph-message-1',
        source: 'graph',
        threadId: 'thread-1',
      }),
    })
    expect(mockRecordGraphSyncSuccess).toHaveBeenCalledWith(
      'OUTLOOK_GRAPH_ASSISTANT',
    )
    expect(emails[0]).toMatchObject({
      id: 'local-email-1',
      subject: 'Need a syllabus update',
      fromAddress: 'student@uky.edu',
    })
  })

  it('syncs Microsoft Graph calendar events into local assistant events', async () => {
    mockGraphJsonRequest.mockResolvedValue({
      value: [
        {
          id: 'graph-event-1',
          subject: 'Department meeting',
          bodyPreview: 'Monthly department sync.',
          start: { dateTime: '2026-03-26T14:00:00', timeZone: 'UTC' },
          end: { dateTime: '2026-03-26T15:00:00', timeZone: 'UTC' },
          location: { displayName: 'Patterson 101' },
          attendees: [
            { emailAddress: { address: 'chair@uky.edu' } },
            { emailAddress: { address: 'educator@uky.edu' } },
          ],
          isAllDay: false,
          categories: ['meeting'],
        },
      ],
    })
    mockPrisma.assistantCalendarEvent.findMany.mockResolvedValue([])
    mockPrisma.assistantCalendarEvent.create.mockResolvedValue({
      id: 'local-event-1',
      userId: 'user-1',
      title: 'Department meeting',
      description: 'Monthly department sync.',
      startTime: new Date('2026-03-26T14:00:00Z'),
      endTime: new Date('2026-03-26T15:00:00Z'),
      location: 'Patterson 101',
      attendees: ['chair@uky.edu', 'educator@uky.edu'],
      source: 'graph',
      externalId: 'graph-event-1',
      isAllDay: false,
      category: 'meeting',
    })

    const provider = new GraphCalendarProvider()
    const events = await provider.getEvents(
      'user-1',
      new Date('2026-03-26T00:00:00Z'),
      new Date('2026-03-27T00:00:00Z'),
    )

    expect(mockPrisma.assistantCalendarEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        externalId: 'graph-event-1',
        source: 'graph',
        title: 'Department meeting',
      }),
    })
    expect(mockRecordGraphSyncSuccess).toHaveBeenCalledWith(
      'OUTLOOK_GRAPH_ASSISTANT',
    )
    expect(events[0]).toMatchObject({
      id: 'local-event-1',
      title: 'Department meeting',
      source: 'graph',
    })
  })

  it('returns graph provider selections when real integrations are configured', async () => {
    mockGetInstitutionIntegrationByKey
      .mockResolvedValueOnce({
        key: 'OUTLOOK_GRAPH_ASSISTANT',
        mode: 'REAL',
        status: 'HEALTHY',
        configured: true,
        system: 'MICROSOFT_GRAPH',
        name: 'Outlook / Graph Assistant',
      } as never)
      .mockResolvedValueOnce({
        key: 'OUTLOOK_GRAPH_ASSISTANT',
        mode: 'REAL',
        status: 'HEALTHY',
        configured: true,
        system: 'MICROSOFT_GRAPH',
        name: 'Outlook / Graph Assistant',
      } as never)
      .mockResolvedValueOnce({
        key: 'SHAREPOINT_ONEDRIVE_FILES',
        mode: 'REAL',
        status: 'HEALTHY',
        configured: true,
        system: 'SHAREPOINT_ONEDRIVE',
        name: 'SharePoint / OneDrive Files',
      } as never)

    const [calendarSelection, emailSelection, fileSelection] = await Promise.all([
      getCalendarProviderSelection(),
      getEmailProviderSelection(),
      getFileProviderSelection(),
    ])

    expect(calendarSelection.descriptor).toMatchObject({
      label: 'Graph Calendar Provider',
      available: true,
      mode: 'REAL',
    })
    expect(emailSelection.descriptor).toMatchObject({
      label: 'Graph Email Provider',
      available: true,
      mode: 'REAL',
    })
    expect(fileSelection.descriptor).toMatchObject({
      label: 'Graph File Provider',
      available: true,
      mode: 'REAL',
    })
  })

  it('searches OneDrive files through Microsoft Graph', async () => {
    mockGraphJsonRequest.mockResolvedValue({
      value: [
        {
          id: 'drive-item-1',
          name: 'Budget.xlsx',
          webUrl: 'https://contoso.sharepoint.com/personal/educator/Documents/Budget.xlsx',
          lastModifiedDateTime: '2026-03-25T12:00:00Z',
          file: { mimeType: 'application/vnd.ms-excel' },
        },
      ],
    })

    const provider = new GraphFileProvider()
    const results = await provider.searchDocuments('user-1', 'budget', 5)

    expect(mockGraphJsonRequest).toHaveBeenCalledWith(
      expect.stringContaining("/users/educator%40uky.edu/drive/root/search(q='budget')"),
    )
    expect(mockRecordGraphSyncSuccess).toHaveBeenCalledWith(
      'SHAREPOINT_ONEDRIVE_FILES',
    )
    expect(results[0]).toMatchObject({
      id: 'drive-item-1',
      title: 'Budget.xlsx',
      sourceLabel: 'OneDrive: Budget.xlsx',
    })
  })
})
