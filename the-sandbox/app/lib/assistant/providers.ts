// ─── Personal Assistant Provider Interfaces ──────────────────
// Provider pattern: SimulatedProvider now, GraphProvider when Azure arrives.
// Swap at the factory level — zero UI or service changes needed.

import {
  getInstitutionIntegrationByKey,
  serializeIntegration,
} from '../integrations/registry'
import type { IntegrationProviderDescriptor, IntegrationSummary } from '../integrations/types'

// ─── Shared Types ────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
  attendees: string[]
  source: string
  isAllDay: boolean
  category: string | null
}

export interface FreeBusySlot {
  start: Date
  end: Date
  title: string
}

export interface CreateEventInput {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  category?: string
}

export interface Email {
  id: string
  fromAddress: string
  fromName: string
  toAddresses: string[]
  subject: string
  body: string
  snippet: string | null
  threadId: string | null
  category: string | null
  isRead: boolean
  isStarred: boolean
  receivedAt: Date
  urgencyScore: number | null
  urgencyBucket: string | null
  urgencyReasons: string[]
}

export interface EmailCategorySummary {
  total: number
  unread: number
  categories: { category: string; count: number; unreadCount: number }[]
  urgent: Email[]
  urgencyBreakdown: { respondToday: number; thisWeek: number; whenFree: number; archive: number }
}

export interface FileSearchResult {
  id: string
  title: string
  content: string
  source: string
  sourceLabel: string
  relevance: number
}

// ─── Provider Interfaces ─────────────────────────────────────

export interface CalendarProvider {
  getEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]>
  getFreeBusy(userId: string, startDate: Date, endDate: Date): Promise<FreeBusySlot[]>
  createEvent(userId: string, event: CreateEventInput): Promise<CalendarEvent>
  deleteEvent(userId: string, eventId: string): Promise<void>
}

export interface EmailProvider {
  getInbox(userId: string, opts?: { category?: string; limit?: number }): Promise<Email[]>
  getThread(userId: string, threadId: string): Promise<Email[]>
  categorizeInbox(userId: string): Promise<EmailCategorySummary>
}

export interface FileProvider {
  searchDocuments(userId: string, query: string, topK?: number): Promise<FileSearchResult[]>
}

// ─── Factory Functions ───────────────────────────────────────
// When Azure Graph is available, check env and return GraphProvider instead.

import { SimulatedCalendarProvider } from './simulated-calendar'
import { SimulatedEmailProvider } from './simulated-email'
import { SimulatedFileProvider } from './simulated-files'
import { GraphCalendarProvider } from './graph-calendar'
import { GraphEmailProvider } from './graph-email'
import { GraphFileProvider } from './graph-files'

const simulatedCalendarProvider = new SimulatedCalendarProvider()
const simulatedEmailProvider = new SimulatedEmailProvider()
const simulatedFileProvider = new SimulatedFileProvider()
const graphCalendarProvider = new GraphCalendarProvider()
const graphEmailProvider = new GraphEmailProvider()
const graphFileProvider = new GraphFileProvider()

type ProviderSelection<T> = {
  provider: T
  descriptor: IntegrationProviderDescriptor
  integration: IntegrationSummary
}

class UnavailableCalendarProvider implements CalendarProvider {
  constructor(private readonly message: string) {}

  async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    void userId
    void startDate
    void endDate
    throw new Error(this.message)
  }

  async getFreeBusy(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FreeBusySlot[]> {
    void userId
    void startDate
    void endDate
    throw new Error(this.message)
  }

  async createEvent(
    userId: string,
    event: CreateEventInput,
  ): Promise<CalendarEvent> {
    void userId
    void event
    throw new Error(this.message)
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    void userId
    void eventId
    throw new Error(this.message)
  }
}

class UnavailableEmailProvider implements EmailProvider {
  constructor(private readonly message: string) {}

  async getInbox(
    userId: string,
    opts?: { category?: string; limit?: number },
  ): Promise<Email[]> {
    void userId
    void opts
    throw new Error(this.message)
  }

  async getThread(userId: string, threadId: string): Promise<Email[]> {
    void userId
    void threadId
    throw new Error(this.message)
  }

  async categorizeInbox(userId: string): Promise<EmailCategorySummary> {
    void userId
    throw new Error(this.message)
  }
}

class UnavailableFileProvider implements FileProvider {
  constructor(private readonly message: string) {}

  async searchDocuments(
    userId: string,
    query: string,
    topK?: number,
  ): Promise<FileSearchResult[]> {
    void userId
    void query
    void topK
    throw new Error(this.message)
  }
}

function buildDescriptor(
  integration: IntegrationSummary,
  label: string,
  available: boolean,
  message: string | null,
): IntegrationProviderDescriptor {
  return {
    key: integration.key,
    label,
    system: integration.system,
    mode: integration.mode,
    status: integration.status,
    configured: integration.configured,
    available,
    message,
  }
}

function getUnavailableReason(integration: IntegrationSummary): string {
  if (!integration.configured) {
    return `${integration.name} is set to ${integration.mode.toLowerCase()} mode, but its configuration is incomplete.`
  }

  return `${integration.name} is set to real mode, but the Microsoft Graph path is currently unavailable.`
}

export async function getCalendarProviderSelection(): Promise<ProviderSelection<CalendarProvider>> {
  const resolved = await getInstitutionIntegrationByKey('OUTLOOK_GRAPH_ASSISTANT')
  const integration = serializeIntegration(resolved)

  if (integration.mode === 'SIMULATED') {
    return {
      provider: simulatedCalendarProvider,
      descriptor: buildDescriptor(
        integration,
        'Simulated Calendar Provider',
        true,
        null,
      ),
      integration,
    }
  }

  if (integration.configured) {
    return {
      provider: graphCalendarProvider,
      descriptor: buildDescriptor(
        integration,
        'Graph Calendar Provider',
        true,
        null,
      ),
      integration,
    }
  }

  const reason = getUnavailableReason(integration)

  return {
    provider: new UnavailableCalendarProvider(reason),
    descriptor: buildDescriptor(
      integration,
      'Graph Calendar Provider',
      false,
      reason,
    ),
    integration,
  }
}

export async function getEmailProviderSelection(): Promise<ProviderSelection<EmailProvider>> {
  const resolved = await getInstitutionIntegrationByKey('OUTLOOK_GRAPH_ASSISTANT')
  const integration = serializeIntegration(resolved)

  if (integration.mode === 'SIMULATED') {
    return {
      provider: simulatedEmailProvider,
      descriptor: buildDescriptor(
        integration,
        'Simulated Email Provider',
        true,
        null,
      ),
      integration,
    }
  }

  if (integration.configured) {
    return {
      provider: graphEmailProvider,
      descriptor: buildDescriptor(
        integration,
        'Graph Email Provider',
        true,
        null,
      ),
      integration,
    }
  }

  const reason = getUnavailableReason(integration)

  return {
    provider: new UnavailableEmailProvider(reason),
    descriptor: buildDescriptor(
      integration,
      'Graph Email Provider',
      false,
      reason,
    ),
    integration,
  }
}

export async function getFileProviderSelection(): Promise<ProviderSelection<FileProvider>> {
  const resolved = await getInstitutionIntegrationByKey('SHAREPOINT_ONEDRIVE_FILES')
  const integration = serializeIntegration(resolved)

  if (integration.mode === 'SIMULATED') {
    return {
      provider: simulatedFileProvider,
      descriptor: buildDescriptor(
        integration,
        'Simulated File Provider',
        true,
        null,
      ),
      integration,
    }
  }

  if (integration.configured) {
    return {
      provider: graphFileProvider,
      descriptor: buildDescriptor(
        integration,
        'Graph File Provider',
        true,
        null,
      ),
      integration,
    }
  }

  const reason = getUnavailableReason(integration)

  return {
    provider: new UnavailableFileProvider(reason),
    descriptor: buildDescriptor(
      integration,
      'Graph File Provider',
      false,
      reason,
    ),
    integration,
  }
}

export async function getCalendarProvider(): Promise<CalendarProvider> {
  const selection = await getCalendarProviderSelection()
  return selection.provider
}

export async function getEmailProvider(): Promise<EmailProvider> {
  const selection = await getEmailProviderSelection()
  return selection.provider
}

export async function getFileProvider(): Promise<FileProvider> {
  const selection = await getFileProviderSelection()
  return selection.provider
}

// ─── Helpers: map Prisma rows → provider types ───────────────

