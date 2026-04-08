import { prisma } from '../prisma'
import {
  buildGraphUserPath,
  escapeGraphFilterValue,
  getGraphPrincipalForUser,
  graphJsonRequest,
  recordGraphSyncSuccess,
} from './graph-client'
import type {
  Email,
  EmailCategorySummary,
  EmailProvider,
} from './providers'
import { toEmail } from './provider-models'

type GraphEmailAddress = {
  address?: string | null
  name?: string | null
}

type GraphMessage = {
  id: string
  subject?: string | null
  bodyPreview?: string | null
  body?: { content?: string | null }
  from?: { emailAddress?: GraphEmailAddress | null } | null
  toRecipients?: Array<{ emailAddress?: GraphEmailAddress | null }> | null
  conversationId?: string | null
  categories?: string[] | null
  isRead?: boolean | null
  importance?: string | null
  flag?: { flagStatus?: string | null } | null
  receivedDateTime?: string | null
}

type GraphMessageListResponse = {
  value?: GraphMessage[]
}

function normalizeEmailAddress(value: GraphEmailAddress | null | undefined) {
  const address = value?.address?.trim() ?? ''
  return {
    address,
    name: value?.name?.trim() || address || 'Unknown sender',
  }
}

function classifyGraphMessage(
  message: GraphMessage,
  userEmail: string,
) {
  const sender = normalizeEmailAddress(message.from?.emailAddress)
  const categories = (message.categories ?? []).map((value) => value.toLowerCase())
  const subject = (message.subject ?? '').toLowerCase()
  const snippet = (message.bodyPreview ?? '').toLowerCase()
  const senderAddress = sender.address.toLowerCase()
  const senderDomain = senderAddress.includes('@')
    ? senderAddress.split('@')[1]
    : ''
  const userDomain = userEmail.toLowerCase().split('@')[1] ?? ''

  if (
    message.importance?.toLowerCase() === 'high' ||
    categories.includes('urgent') ||
    /\b(urgent|asap|action required|deadline|time sensitive)\b/.test(
      `${subject} ${snippet}`,
    )
  ) {
    return 'urgent'
  }

  if (
    categories.includes('newsletter') ||
    /\b(unsubscribe|newsletter|digest)\b/.test(`${subject} ${snippet}`) ||
    /(^|\b)(noreply|no-reply|donotreply|notifications?)(\b|@)/.test(senderAddress)
  ) {
    return 'newsletter'
  }

  if (senderDomain && userDomain && senderDomain !== userDomain) {
    return 'external'
  }

  return 'admin'
}

function buildMessageQuery(limit: number) {
  const params = new URLSearchParams({
    $top: String(Math.min(Math.max(limit, 1), 50)),
    $orderby: 'receivedDateTime DESC',
    $select: [
      'id',
      'subject',
      'bodyPreview',
      'body',
      'from',
      'toRecipients',
      'conversationId',
      'categories',
      'isRead',
      'importance',
      'flag',
      'receivedDateTime',
    ].join(','),
  })

  return params.toString()
}

async function syncMessages(userId: string, messages: GraphMessage[]) {
  if (messages.length === 0) return []

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  const userEmail = user?.email ?? ''
  const externalIds = messages.map((message) => message.id)
  const existing = await prisma.assistantEmail.findMany({
    where: {
      userId,
      externalId: { in: externalIds },
    },
    select: {
      id: true,
      externalId: true,
    },
  })
  const existingByExternalId = new Map(
    existing.flatMap((row) =>
      row.externalId ? [[row.externalId, row.id] as const] : [],
    ),
  )

  const rows = await Promise.all(
    messages.map(async (message) => {
      const sender = normalizeEmailAddress(message.from?.emailAddress)
      const body = message.body?.content?.trim() || message.bodyPreview?.trim() || ''
      const data = {
        userId,
        fromAddress: sender.address || 'unknown@example.com',
        fromName: sender.name,
        toAddresses: (message.toRecipients ?? [])
          .map((recipient) => normalizeEmailAddress(recipient.emailAddress).address)
          .filter(Boolean),
        subject: message.subject?.trim() || '(No subject)',
        body,
        snippet: message.bodyPreview?.trim() || body.slice(0, 200) || null,
        threadId: message.conversationId ?? null,
        category: classifyGraphMessage(message, userEmail),
        isRead: message.isRead ?? false,
        isStarred:
          message.flag?.flagStatus?.toLowerCase() === 'flagged' ||
          (message.categories ?? []).some(
            (category) => category.toLowerCase() === 'flagged',
          ),
        receivedAt: message.receivedDateTime
          ? new Date(message.receivedDateTime)
          : new Date(),
        source: 'graph',
        externalId: message.id,
      } as const

      const existingId = existingByExternalId.get(message.id)
      if (existingId) {
        return prisma.assistantEmail.update({
          where: { id: existingId },
          data,
        })
      }

      return prisma.assistantEmail.create({ data })
    }),
  )

  return rows.map(toEmail)
}

export class GraphEmailProvider implements EmailProvider {
  async getInbox(
    userId: string,
    opts?: { category?: string; limit?: number },
  ): Promise<Email[]> {
    const userPrincipal = await getGraphPrincipalForUser(userId)
    const query = buildMessageQuery(opts?.limit ?? 50)
    const response = await graphJsonRequest<GraphMessageListResponse>(
      `${buildGraphUserPath(userPrincipal)}/mailFolders/Inbox/messages?${query}`,
      {
        headers: {
          Prefer: 'outlook.body-content-type="text"',
        },
      },
    )

    const synced = await syncMessages(userId, response.value ?? [])
    await recordGraphSyncSuccess('OUTLOOK_GRAPH_ASSISTANT')

    const filtered = opts?.category
      ? synced.filter((message) => message.category === opts.category)
      : synced

    return filtered.sort(
      (left, right) => right.receivedAt.getTime() - left.receivedAt.getTime(),
    )
  }

  async getThread(userId: string, threadId: string): Promise<Email[]> {
    const userPrincipal = await getGraphPrincipalForUser(userId)
    const params = new URLSearchParams({
      $filter: `conversationId eq '${escapeGraphFilterValue(threadId)}'`,
      $orderby: 'receivedDateTime ASC',
      $top: '50',
      $select: [
        'id',
        'subject',
        'bodyPreview',
        'body',
        'from',
        'toRecipients',
        'conversationId',
        'categories',
        'isRead',
        'importance',
        'flag',
        'receivedDateTime',
      ].join(','),
    })

    const response = await graphJsonRequest<GraphMessageListResponse>(
      `${buildGraphUserPath(userPrincipal)}/messages?${params.toString()}`,
      {
        headers: {
          Prefer: 'outlook.body-content-type="text"',
        },
      },
    )

    const synced = await syncMessages(userId, response.value ?? [])
    await recordGraphSyncSuccess('OUTLOOK_GRAPH_ASSISTANT')

    return synced.sort(
      (left, right) => left.receivedAt.getTime() - right.receivedAt.getTime(),
    )
  }

  async categorizeInbox(userId: string): Promise<EmailCategorySummary> {
    const all = await this.getInbox(userId, { limit: 50 })
    const categoryMap = new Map<string, { count: number; unreadCount: number }>()
    let unread = 0
    const urgent: Email[] = []
    const urgencyBreakdown = { respondToday: 0, thisWeek: 0, whenFree: 0, archive: 0 }

    for (const message of all) {
      const category = message.category ?? 'other'
      const entry = categoryMap.get(category) ?? { count: 0, unreadCount: 0 }
      entry.count += 1
      if (!message.isRead) {
        entry.unreadCount += 1
        unread += 1
      }
      categoryMap.set(category, entry)

      if (category === 'urgent') {
        urgent.push(message)
      }

      switch (message.urgencyBucket) {
        case 'respond-today': urgencyBreakdown.respondToday++; break
        case 'this-week': urgencyBreakdown.thisWeek++; break
        case 'when-free': urgencyBreakdown.whenFree++; break
        case 'archive': urgencyBreakdown.archive++; break
      }
    }

    return {
      total: all.length,
      unread,
      categories: Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        unreadCount: data.unreadCount,
      })),
      urgent,
      urgencyBreakdown,
    }
  }
}
