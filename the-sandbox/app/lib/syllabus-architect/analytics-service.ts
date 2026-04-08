/**
 * Course Map Analytics Service
 *
 * Computes editing pattern analytics, collaboration stats, node change
 * frequency, and time-based activity data from CourseMapEdit records.
 */

import { prisma } from '../prisma'
import { subDays, format, startOfDay } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EditCountByUser {
  userId: string
  name: string
  count: number
}

export interface EditCountByType {
  type: string
  count: number
}

export interface EditsPerDay {
  date: string
  count: number
}

export interface NodeChangeFrequency {
  nodeId: string
  label: string
  changeCount: number
}

export interface CourseMapAnalytics {
  editCountByUser: EditCountByUser[]
  editCountByType: EditCountByType[]
  editsPerDay: EditsPerDay[]
  nodeChangeFrequency: NodeChangeFrequency[]
  collaboratorCount: number
  totalEdits: number
  mostActiveDay: string
  averageEditsPerDay: number
}

// ── Service ──────────────────────────────────────────────────────────────────

export async function getCourseMapAnalytics(courseId: string): Promise<CourseMapAnalytics> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  // Run all queries in parallel
  const [allEdits, recentEdits, distinctUsers] = await Promise.all([
    // All edits for by-user and by-type breakdowns
    prisma.courseMapEdit.findMany({
      where: { courseId },
      select: {
        id: true,
        userId: true,
        editType: true,
        payload: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Recent edits for the 30-day timeline
    prisma.courseMapEdit.findMany({
      where: { courseId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Distinct collaborators
    prisma.courseMapEdit.findMany({
      where: { courseId },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  // ── Edit count by user ─────────────────────────────────────────────
  const userMap = new Map<string, { name: string; count: number }>()
  for (const edit of allEdits) {
    const existing = userMap.get(edit.userId)
    if (existing) {
      existing.count++
    } else {
      userMap.set(edit.userId, { name: edit.user.name, count: 1 })
    }
  }
  const editCountByUser: EditCountByUser[] = [...userMap.entries()]
    .map(([userId, { name, count }]) => ({ userId, name, count }))
    .sort((a, b) => b.count - a.count)

  // ── Edit count by type ─────────────────────────────────────────────
  const typeMap = new Map<string, number>()
  for (const edit of allEdits) {
    const payload = edit.payload as Record<string, unknown> | null
    const action = (payload?.action as string) || edit.editType
    typeMap.set(action, (typeMap.get(action) || 0) + 1)
  }
  const editCountByType: EditCountByType[] = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // ── Edits per day (last 30 days) ──────────────────────────────────
  const dayMap = new Map<string, number>()
  // Pre-fill all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
    dayMap.set(day, 0)
  }
  for (const edit of recentEdits) {
    const day = format(startOfDay(edit.createdAt), 'yyyy-MM-dd')
    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
  }
  const editsPerDay: EditsPerDay[] = [...dayMap.entries()].map(([date, count]) => ({ date, count }))

  // ── Node change frequency (top 10) ────────────────────────────────
  const nodeMap = new Map<string, { label: string; count: number }>()
  for (const edit of allEdits) {
    const payload = edit.payload as Record<string, unknown> | null
    const nodeId = payload?.nodeId as string | undefined
    const label = (payload?.label as string) || 'Unknown node'
    if (nodeId) {
      const existing = nodeMap.get(nodeId)
      if (existing) {
        existing.count++
      } else {
        nodeMap.set(nodeId, { label, count: 1 })
      }
    }
  }
  const nodeChangeFrequency: NodeChangeFrequency[] = [...nodeMap.entries()]
    .map(([nodeId, { label, count }]) => ({ nodeId, label, changeCount: count }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10)

  // ── Aggregates ─────────────────────────────────────────────────────
  const totalEdits = allEdits.length
  const collaboratorCount = distinctUsers.length

  // Most active day
  let mostActiveDay = format(new Date(), 'yyyy-MM-dd')
  let maxDayCount = 0
  for (const [date, count] of dayMap) {
    if (count > maxDayCount) {
      maxDayCount = count
      mostActiveDay = date
    }
  }

  // Average edits per day (over days that have at least 1 edit)
  const daysWithEdits = [...dayMap.values()].filter((c) => c > 0).length
  const averageEditsPerDay = daysWithEdits > 0 ? Math.round((recentEdits.length / daysWithEdits) * 10) / 10 : 0

  return {
    editCountByUser,
    editCountByType,
    editsPerDay,
    nodeChangeFrequency,
    collaboratorCount,
    totalEdits,
    mostActiveDay,
    averageEditsPerDay,
  }
}
