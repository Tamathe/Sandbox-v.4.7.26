/**
 * Course Map Notification Service
 *
 * In-app notification feed for course map events. Notifications are stored
 * in the CourseMap.metadata JSON field under `notifications[]`.
 */

import { randomUUID } from 'crypto'
import { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'edit'
  | 'comment'
  | 'milestone_achieved'
  | 'health_change'
  | 'snapshot'
  | 'collaboration'

export interface CourseMapNotification {
  id: string
  courseId: string
  userId: string        // user who triggered the notification
  userName: string
  type: NotificationType
  title: string
  description: string
  nodeId: string | null  // optional link to a specific node
  readBy: string[]       // user IDs who have read this notification
  createdAt: string      // ISO 8601
}

interface CourseMapMetadata {
  notifications?: CourseMapNotification[]
  [key: string]: unknown
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMetadata(raw: unknown): CourseMapMetadata {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as CourseMapMetadata
  }
  return {}
}

// Keep max 200 notifications per course map to avoid metadata bloat
const MAX_NOTIFICATIONS = 200

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new notification for a course map event.
 */
export async function createNotification(
  courseId: string,
  event: {
    userId: string
    userName: string
    type: NotificationType
    title: string
    description: string
    nodeId?: string | null
  },
): Promise<CourseMapNotification> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) throw new Error('Course map not found')

  const meta = getMetadata(courseMap.metadata)
  const existing = meta.notifications || []

  const notification: CourseMapNotification = {
    id: randomUUID(),
    courseId,
    userId: event.userId,
    userName: event.userName,
    type: event.type,
    title: event.title,
    description: event.description,
    nodeId: event.nodeId ?? null,
    readBy: [],
    createdAt: new Date().toISOString(),
  }

  // Prepend new notification, trim to max
  const updated = [notification, ...existing].slice(0, MAX_NOTIFICATIONS)

  await prisma.courseMap.update({
    where: { courseId },
    data: {
      metadata: { ...meta, notifications: updated } as unknown as Prisma.InputJsonValue,
    },
  })

  return notification
}

/**
 * Get notifications for a course map, paginated and optionally filtered.
 */
export async function getNotifications(
  courseId: string,
  userId: string,
  options: {
    type?: NotificationType
    unreadOnly?: boolean
    page?: number
    limit?: number
  } = {},
): Promise<{
  notifications: CourseMapNotification[]
  total: number
  unreadCount: number
  page: number
  limit: number
}> {
  const { type, unreadOnly = false, page = 1, limit = 20 } = options

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return { notifications: [], total: 0, unreadCount: 0, page, limit }

  const meta = getMetadata(courseMap.metadata)
  let all = meta.notifications || []

  // Count unread before filtering
  const unreadCount = all.filter((n) => !n.readBy.includes(userId)).length

  // Apply filters
  if (type) {
    all = all.filter((n) => n.type === type)
  }
  if (unreadOnly) {
    all = all.filter((n) => !n.readBy.includes(userId))
  }

  const total = all.length
  const start = (page - 1) * limit
  const notifications = all.slice(start, start + limit)

  return { notifications, total, unreadCount, page, limit }
}

/**
 * Mark a single notification as read for a user.
 */
export async function markAsRead(
  courseId: string,
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return false

  const meta = getMetadata(courseMap.metadata)
  const notifications = meta.notifications || []

  const idx = notifications.findIndex((n) => n.id === notificationId)
  if (idx === -1) return false

  if (!notifications[idx].readBy.includes(userId)) {
    notifications[idx].readBy.push(userId)
  }

  await prisma.courseMap.update({
    where: { courseId },
    data: {
      metadata: { ...meta, notifications } as unknown as Prisma.InputJsonValue,
    },
  })

  return true
}

/**
 * Mark all notifications as read for a user in a course.
 */
export async function markAllAsRead(
  courseId: string,
  userId: string,
): Promise<number> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return 0

  const meta = getMetadata(courseMap.metadata)
  const notifications = meta.notifications || []

  let marked = 0
  for (const n of notifications) {
    if (!n.readBy.includes(userId)) {
      n.readBy.push(userId)
      marked++
    }
  }

  if (marked > 0) {
    await prisma.courseMap.update({
      where: { courseId },
      data: {
        metadata: { ...meta, notifications } as unknown as Prisma.InputJsonValue,
      },
    })
  }

  return marked
}
