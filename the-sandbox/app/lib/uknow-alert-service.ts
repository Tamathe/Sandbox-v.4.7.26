/**
 * UKNow Intelligence — Alert CRUD, Digest subscriptions, and digest email delivery.
 */

import { prisma } from './prisma'
import { getEmbeddingProvider } from './embedding-service'
import { sendEmail } from './email'
import { pool } from './pg-pool'

// ─── Alert CRUD ──────────────────────────────────────────────────────────────

export async function createAlert(userId: string, label: string, query: string) {
  // Compute embedding for the query
  const embedding = await getEmbeddingProvider().embed(query)
  const vectorLiteral = `[${embedding.map((n) => n.toFixed(8)).join(',')}]`

  // Insert with raw SQL because Prisma can't write vector type directly
  const result = await pool().query<{
    id: string
    label: string
    query: string
    active: boolean
    createdAt: Date
  }>(
    `INSERT INTO "UKNowAlert" (id, "userId", label, query, embedding, active, "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, true, NOW())
     RETURNING id, label, query, active, "createdAt"`,
    [userId, label, query, vectorLiteral]
  )

  return result.rows[0]
}

export async function listAlerts(userId: string) {
  return prisma.uKNowAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      query: true,
      active: true,
      createdAt: true,
      _count: { select: { matches: true } },
    },
  })
}

export async function getAlertById(alertId: string) {
  return prisma.uKNowAlert.findUnique({
    where: { id: alertId },
    select: { id: true, userId: true, label: true, query: true, active: true },
  })
}

export async function updateAlert(
  alertId: string,
  updates: { active?: boolean; label?: string }
) {
  return prisma.uKNowAlert.update({
    where: { id: alertId },
    data: updates,
    select: { id: true, label: true, query: true, active: true, createdAt: true },
  })
}

export async function deleteAlert(alertId: string) {
  // Cascade deletes matches via schema onDelete: Cascade
  return prisma.uKNowAlert.delete({ where: { id: alertId } })
}

// ─── Digest Preferences ─────────────────────────────────────────────────────

export async function getDigestPreference(userId: string): Promise<string> {
  const sub = await prisma.uKNowDigestSub.findUnique({
    where: { userId },
    select: { frequency: true },
  })
  return sub?.frequency ?? 'OFF'
}

export async function setDigestPreference(userId: string, frequency: string) {
  return prisma.uKNowDigestSub.upsert({
    where: { userId },
    create: { userId, frequency },
    update: { frequency },
  })
}

// ─── Digest Email Delivery ───────────────────────────────────────────────────

export async function sendDigestEmails(): Promise<{ sent: number; skipped: number }> {
  const now = new Date()
  const isMonday = now.getUTCDay() === 1

  // Fetch all active subscribers (DAILY always, WEEKLY only on Mondays)
  const subscribers = await prisma.uKNowDigestSub.findMany({
    where: {
      frequency: {
        in: isMonday ? ['DAILY', 'WEEKLY'] : ['DAILY'],
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const sub of subscribers) {
    try {
      // Determine lookback window
      const lookbackMs = sub.frequency === 'DAILY' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      const since = new Date(now.getTime() - lookbackMs)

      // Find alert matches for this user's alerts created in the lookback window
      const matches = await prisma.uKNowAlertMatch.findMany({
        where: {
          alert: { userId: sub.user.id },
          notifiedAt: { not: null },
          createdAt: { gte: since },
        },
        include: {
          alert: { select: { label: true } },
          article: { select: { title: true, slug: true, url: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (matches.length === 0) {
        skipped++
        continue
      }

      // Group matches by alert label
      const grouped = new Map<string, typeof matches>()
      for (const m of matches) {
        const label = m.alert.label
        if (!grouped.has(label)) grouped.set(label, [])
        grouped.get(label)!.push(m)
      }

      // Build email HTML
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'
      const sections = [...grouped.entries()]
        .map(([label, items]) => {
          const articleList = items
            .map(
              (item) =>
                `<li style="margin-bottom:8px"><a href="${appUrl}/uknow/${item.article.slug}" style="color:#0033A0;font-weight:600">${item.article.title}</a></li>`
            )
            .join('')
          return `<div style="margin-bottom:20px"><h3 style="margin:0 0 8px;font-size:15px;color:#374151">${label}</h3><ul style="margin:0;padding-left:20px;font-size:14px;color:#1f2937">${articleList}</ul></div>`
        })
        .join('')

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
          <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:22px">Your UKNow Alerts — ${matches.length} new match${matches.length === 1 ? '' : 'es'}</h1>
            <p style="color:#93c5fd;margin:4px 0 0">${sub.frequency === 'DAILY' ? 'Daily' : 'Weekly'} digest</p>
          </div>
          <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
            ${sections}
            <p style="margin-top:24px;font-size:12px;color:#9ca3af">
              You're receiving this because you subscribed to UKNow alerts on
              <a href="${appUrl}/uknow" style="color:#0033A0">University of Kentucky</a>.
            </p>
          </div>
        </div>`

      await sendEmail({
        to: sub.user.email,
        subject: `UKNow Alerts — ${matches.length} new match${matches.length === 1 ? '' : 'es'}`,
        html,
      })

      sent++
    } catch (err) {
      console.error(`[uknow-digest] Failed to send digest for user ${sub.user.id}:`, err)
      skipped++
    }
  }

  return { sent, skipped }
}

// ─── Recent Alert Matches (for Sandy concierge) ─────────────────────────────

export async function getRecentAlertMatches(
  userId: string,
  days = 7
): Promise<
  Array<{
    alertLabel: string
    matches: Array<{ title: string; slug: string; similarity: number; publishedAt: string | null }>
  }>
> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const alertsWithMatches = await prisma.uKNowAlert.findMany({
    where: { userId, active: true },
    select: {
      label: true,
      matches: {
        where: { createdAt: { gte: since } },
        orderBy: { similarity: 'desc' },
        take: 5,
        select: {
          similarity: true,
          article: { select: { title: true, slug: true, publishedAt: true } },
        },
      },
    },
  })

  return alertsWithMatches
    .filter((a) => a.matches.length > 0)
    .map((a) => ({
      alertLabel: a.label,
      matches: a.matches.map((m) => ({
        title: m.article.title,
        slug: m.article.slug,
        similarity: m.similarity,
        publishedAt: m.article.publishedAt ? m.article.publishedAt.toISOString() : null,
      })),
    }))
}

// ─── Smart Alert Suggestions ─────────────────────────────────────────────────

export async function suggestAlerts(
  userId: string
): Promise<Array<{ label: string; query: string }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { department: true, college: true },
  })

  const interests = await prisma.userInterest.findMany({
    where: { userId, accepted: { not: false } },
    select: { tag: true },
    take: 5,
  })

  const existingAlerts = await prisma.uKNowAlert.findMany({
    where: { userId },
    select: { query: true },
  })
  const existingQueries = new Set(existingAlerts.map((a) => a.query.toLowerCase().trim()))

  const suggestions: Array<{ label: string; query: string }> = []

  if (user?.department) {
    suggestions.push(
      { label: `${user.department} Research`, query: `${user.department} research` },
      { label: `${user.department} News`, query: `${user.department} news UK` }
    )
  }

  if (user?.college) {
    suggestions.push({
      label: `${user.college} Grants & Awards`,
      query: `College of ${user.college} grants awards`,
    })
  }

  const interestTags = interests.map((i) => i.tag)
  if (interestTags.length >= 2) {
    suggestions.push({
      label: `${interestTags[0]} & ${interestTags[1]}`,
      query: `${interestTags[0]} ${interestTags[1]} university`,
    })
  }
  if (interestTags.length >= 3) {
    suggestions.push({
      label: interestTags[2],
      query: `${interestTags[2]} UK research news`,
    })
  }

  return suggestions.filter((s) => !existingQueries.has(s.query.toLowerCase().trim()))
}

// ─── Alerts with Top Matches (enriched list) ─────────────────────────────────

export async function listAlertsWithTopMatches(userId: string) {
  const alerts = await prisma.uKNowAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      query: true,
      active: true,
      createdAt: true,
      _count: { select: { matches: true } },
      matches: {
        orderBy: { similarity: 'desc' },
        take: 3,
        select: {
          similarity: true,
          createdAt: true,
          article: { select: { title: true, slug: true, publishedAt: true } },
        },
      },
    },
  })

  return alerts.map((a) => ({
    id: a.id,
    label: a.label,
    query: a.query,
    active: a.active,
    createdAt: a.createdAt,
    _count: a._count,
    topMatches: a.matches.map((m) => ({
      title: m.article.title,
      slug: m.article.slug,
      publishedAt: m.article.publishedAt ? m.article.publishedAt.toISOString() : null,
      similarity: m.similarity,
    })),
  }))
}

// ─── Trending Topics ─────────────────────────────────────────────────────────

export async function getTrendingTopics(
  days = 7,
  limit = 12
): Promise<Array<{ topic: string; count: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const logs = await prisma.uKNowQueryLog.findMany({
    where: { createdAt: { gte: since } },
    select: { topTopics: true },
  })

  const topicCounts = new Map<string, number>()
  for (const log of logs) {
    for (const topic of log.topTopics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
    }
  }

  return [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }))
}

// ─── Faculty Alert Suggestions ──────────────────────────────────────────────

/**
 * Suggests UKNow alerts tailored to a faculty member's courses.
 * Reads Course.materials titles + LearningObjective titles for courses where
 * instructorId = userId, and generates domain-specific alert queries.
 */
export async function suggestFacultyAlerts(
  userId: string
): Promise<Array<{ label: string; query: string }>> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      courseCode: true,
      title: true,
      materials: { select: { title: true }, take: 10 },
      objectives: { select: { title: true }, take: 10 },
    },
    take: 5,
  })

  if (courses.length === 0) return []

  const existingAlerts = await prisma.uKNowAlert.findMany({
    where: { userId },
    select: { query: true },
  })
  const existingQueries = new Set(existingAlerts.map((a) => a.query.toLowerCase().trim()))

  const suggestions: Array<{ label: string; query: string }> = []

  for (const course of courses) {
    // Alert based on course title / subject
    suggestions.push({
      label: `${course.courseCode} News`,
      query: `${course.title} university research`,
    })

    // Alert based on material topics (take first 3 distinct titles)
    const materialTopics = course.materials
      .map((m) => m.title)
      .filter((t) => t.length > 3)
      .slice(0, 3)
    for (const topic of materialTopics) {
      // Simplify long titles
      const shortTopic = topic.length > 50 ? topic.slice(0, 50).replace(/\s+\S*$/, '') : topic
      suggestions.push({
        label: `${course.courseCode}: ${shortTopic}`,
        query: `${shortTopic} education research`,
      })
    }

    // Alert based on learning objectives (take first 2)
    const objectiveTopics = course.objectives
      .map((o) => o.title)
      .filter((t) => t.length > 3)
      .slice(0, 2)
    for (const obj of objectiveTopics) {
      const shortObj = obj.length > 50 ? obj.slice(0, 50).replace(/\s+\S*$/, '') : obj
      suggestions.push({
        label: `Objective: ${shortObj}`,
        query: `${shortObj} university Kentucky`,
      })
    }
  }

  // Deduplicate and filter existing
  const seen = new Set<string>()
  return suggestions.filter((s) => {
    const key = s.query.toLowerCase().trim()
    if (existingQueries.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}

// ─── Department Digest ──────────────────────────────────────────────────────

/**
 * Aggregates UKNowAlertMatch records across all users in a department
 * for the given time window. Used by admin department-level digest view.
 */
export async function getDepartmentDigest(
  department: string,
  days = 7
): Promise<{
  department: string
  totalMatches: number
  alertBreakdown: Array<{
    alertLabel: string
    userName: string
    matchCount: number
    topArticles: Array<{ title: string; slug: string; similarity: number }>
  }>
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Find all users in the department who have active alerts
  const usersInDept = await prisma.user.findMany({
    where: { department, uknowAlerts: { some: { active: true } } },
    select: {
      id: true,
      name: true,
      uknowAlerts: {
        where: { active: true },
        select: {
          label: true,
          matches: {
            where: { createdAt: { gte: since } },
            orderBy: { similarity: 'desc' },
            take: 5,
            select: {
              similarity: true,
              article: { select: { title: true, slug: true } },
            },
          },
        },
      },
    },
  })

  const alertBreakdown: Array<{
    alertLabel: string
    userName: string
    matchCount: number
    topArticles: Array<{ title: string; slug: string; similarity: number }>
  }> = []

  let totalMatches = 0

  for (const user of usersInDept) {
    for (const alert of user.uknowAlerts) {
      if (alert.matches.length === 0) continue
      totalMatches += alert.matches.length
      alertBreakdown.push({
        alertLabel: alert.label,
        userName: user.name,
        matchCount: alert.matches.length,
        topArticles: alert.matches.map((m) => ({
          title: m.article.title,
          slug: m.article.slug,
          similarity: m.similarity,
        })),
      })
    }
  }

  // Sort by match count desc
  alertBreakdown.sort((a, b) => b.matchCount - a.matchCount)

  return { department, totalMatches, alertBreakdown }
}

/**
 * Returns all departments that have active UKNow alerts, with match counts.
 * Used for the admin heat map view.
 */
export async function getDepartmentAlertHeatMap(
  days = 7
): Promise<Array<{ department: string; userCount: number; matchCount: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      department: { not: null },
      uknowAlerts: { some: { active: true } },
    },
    select: {
      department: true,
      uknowAlerts: {
        where: { active: true },
        select: {
          _count: {
            select: {
              matches: { where: { createdAt: { gte: since } } } as never,
            },
          },
        },
      },
    },
  })

  const deptMap = new Map<string, { userCount: number; matchCount: number }>()

  for (const user of users) {
    const dept = user.department!
    const entry = deptMap.get(dept) ?? { userCount: 0, matchCount: 0 }
    entry.userCount++
    // Count matches across alerts — use a simpler approach
    deptMap.set(dept, entry)
  }

  // Re-query match counts per department more efficiently
  const departments = [...deptMap.keys()]
  for (const dept of departments) {
    const matchCount = await prisma.uKNowAlertMatch.count({
      where: {
        createdAt: { gte: since },
        alert: {
          active: true,
          user: { department: dept },
        },
      },
    })
    const entry = deptMap.get(dept)!
    entry.matchCount = matchCount
  }

  return [...deptMap.entries()]
    .map(([department, data]) => ({ department, ...data }))
    .sort((a, b) => b.matchCount - a.matchCount)
}

// ─── Query Logging ───────────────────────────────────────────────────────────

export function logQueryFireAndForget(
  query: string,
  topSection: string | null,
  topTopics: string[],
  userId?: string
) {
  prisma.uKNowQueryLog
    .create({
      data: {
        query,
        topSection,
        topTopics,
        userId: userId ?? null,
      },
    })
    .catch((err) => console.error('[uknow] query log failed:', err))
}
