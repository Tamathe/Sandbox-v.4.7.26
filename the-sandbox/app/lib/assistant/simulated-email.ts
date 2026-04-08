// ─── Simulated Email Provider ────────────────────────────────
// Reads AssistantEmail via Prisma. Swap for GraphEmailProvider when Azure arrives.

import { prisma } from '../prisma'
import type {
  EmailProvider,
  Email,
  EmailCategorySummary,
} from './providers'
import { toEmail } from './provider-models'
import { scoreEmailUrgency } from './email-urgency-service'
import type { AssistantEmail } from '../../generated/prisma'

export class SimulatedEmailProvider implements EmailProvider {
  async getInbox(
    userId: string,
    opts?: { category?: string; limit?: number }
  ): Promise<Email[]> {
    const rows = await prisma.assistantEmail.findMany({
      where: {
        userId,
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: opts?.limit ?? 50,
    })

    // Score any unscored emails at read time (backfill)
    await this.scoreUnscoredEmails(rows, userId)

    return rows.map(toEmail)
  }

  /** Score emails that haven't been scored yet and persist results */
  private async scoreUnscoredEmails(rows: AssistantEmail[], userId: string) {
    const unscored = rows.filter(r => r.urgencyScore === null || r.urgencyScore === 0)
    if (unscored.length === 0) return

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, department: true },
    })
    if (!user) return

    const userContext = { role: user.role, department: user.department }

    // Score all in memory, then batch-persist via transaction
    const updates: { id: string; score: number; bucket: string; reasons: string[] }[] = []
    for (const email of unscored) {
      const result = scoreEmailUrgency(email, userContext)
      email.urgencyScore = result.score
      email.urgencyBucket = result.bucket
      email.urgencyReasons = result.reasons
      updates.push({ id: email.id, score: result.score, bucket: result.bucket, reasons: result.reasons })
    }

    await prisma.$transaction(
      updates.map(u => prisma.assistantEmail.update({
        where: { id: u.id },
        data: { urgencyScore: u.score, urgencyBucket: u.bucket, urgencyReasons: u.reasons },
      }))
    )
  }

  async getThread(userId: string, threadId: string): Promise<Email[]> {
    const rows = await prisma.assistantEmail.findMany({
      where: { userId, threadId },
      orderBy: { receivedAt: 'asc' },
    })
    return rows.map(toEmail)
  }

  async categorizeInbox(userId: string): Promise<EmailCategorySummary> {
    const all = await prisma.assistantEmail.findMany({
      where: { userId },
      orderBy: { receivedAt: 'desc' },
    })

    const categoryMap = new Map<string, { count: number; unreadCount: number }>()
    let unread = 0
    const urgent: Email[] = []
    const urgencyBreakdown = { respondToday: 0, thisWeek: 0, whenFree: 0, archive: 0 }

    for (const row of all) {
      const cat = row.category ?? 'other'
      const entry = categoryMap.get(cat) ?? { count: 0, unreadCount: 0 }
      entry.count++
      if (!row.isRead) {
        entry.unreadCount++
        unread++
      }
      categoryMap.set(cat, entry)

      if (cat === 'urgent') {
        urgent.push(toEmail(row))
      }

      // Tally urgency buckets
      switch (row.urgencyBucket) {
        case 'respond-today': urgencyBreakdown.respondToday++; break
        case 'this-week': urgencyBreakdown.thisWeek++; break
        case 'when-free': urgencyBreakdown.whenFree++; break
        case 'archive': urgencyBreakdown.archive++; break
      }
    }

    const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      unreadCount: data.unreadCount,
    }))

    return { total: all.length, unread, categories, urgent, urgencyBreakdown }
  }
}
