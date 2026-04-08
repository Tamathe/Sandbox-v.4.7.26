/**
 * Course Map Notification Service
 *
 * Notifies collaborators when changes are made to a shared course map.
 * Queries CourseMapEdit records for the activity feed.
 */

import { prisma } from '../prisma'
import { createNotification } from '../notifications'

export type CourseMapChangeType =
  | 'node_added'
  | 'node_removed'
  | 'node_modified'
  | 'edge_added'
  | 'edge_removed'
  | 'snapshot_restored'
  | 'snapshot_created'
  | 'merge_applied'

const CHANGE_LABELS: Record<CourseMapChangeType, string> = {
  node_added: 'added a node',
  node_removed: 'removed a node',
  node_modified: 'modified a node',
  edge_added: 'added a connection',
  edge_removed: 'removed a connection',
  snapshot_restored: 'restored a snapshot',
  snapshot_created: 'saved a snapshot',
  merge_applied: 'applied a merge',
}

/**
 * Notify all editors of a course (except the actor) about a course map change.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function notifyCourseMapChange(
  courseId: string,
  userId: string,
  changeType: CourseMapChangeType,
  details?: string,
): Promise<void> {
  try {
    // Find the course name for the notification title
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, instructorId: true },
    })
    if (!course) return

    // Find all users who have edited this course map (collaborators)
    const editors = await prisma.courseMapEdit.findMany({
      where: { courseId },
      select: { userId: true },
      distinct: ['userId'],
    })

    // Also include the course owner
    const recipientIds = new Set(editors.map((e) => e.userId))
    recipientIds.add(course.instructorId)
    // Exclude the actor
    recipientIds.delete(userId)

    if (recipientIds.size === 0) return

    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    const actorName = actor?.name || 'Someone'
    const label = CHANGE_LABELS[changeType] || 'made a change'
    const title = `Course Map: ${course.title}`
    const body = details
      ? `${actorName} ${label}: ${details}`
      : `${actorName} ${label}`

    await Promise.allSettled(
      [...recipientIds].map((recipientId) =>
        createNotification({
          userId: recipientId,
          type: 'COURSE_MAP_UPDATED',
          title,
          body,
          href: `/courses/${courseId}/course-map`,
        }),
      ),
    )
  } catch (err) {
    console.error('[notifyCourseMapChange] Error:', err)
  }
}

// ── Targeted Notification Types ──────────────────────────────────────────────

export type MapNotificationEvent =
  | { type: 'MAP_NODE_ADDED'; nodeLabel: string }
  | { type: 'MAP_DUE_DATE_CHANGED'; nodeLabel: string; newDueDate: string }
  | { type: 'MAP_PUBLISHED' }

/**
 * Notify all active editors of a course map (except the actor) about significant events.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function notifyMapEditors(
  courseId: string,
  actorUserId: string,
  event: MapNotificationEvent,
): Promise<void> {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, instructorId: true },
    })
    if (!course) return

    const editors = await prisma.courseMapEdit.findMany({
      where: { courseId },
      select: { userId: true },
      distinct: ['userId'],
    })

    const recipientIds = new Set(editors.map((e) => e.userId))
    recipientIds.add(course.instructorId)
    recipientIds.delete(actorUserId)
    if (recipientIds.size === 0) return

    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true },
    })
    const actorName = actor?.name || 'Someone'
    const title = `Course Map: ${course.title}`

    let body: string
    switch (event.type) {
      case 'MAP_NODE_ADDED':
        body = `${actorName} added a new node: "${event.nodeLabel}"`
        break
      case 'MAP_DUE_DATE_CHANGED':
        body = `${actorName} changed a due date on "${event.nodeLabel}" to ${event.newDueDate}`
        break
      case 'MAP_PUBLISHED':
        body = `${actorName} published the course map`
        break
    }

    await Promise.allSettled(
      [...recipientIds].map((recipientId) =>
        createNotification({
          userId: recipientId,
          type: event.type,
          title,
          body,
          href: `/courses/${courseId}/course-map`,
        }),
      ),
    )
  } catch (err) {
    console.error('[notifyMapEditors] Error:', err)
  }
}

/**
 * Notify all enrolled students of significant course map changes.
 * Only fires for: MAP_NODE_ADDED, MAP_DUE_DATE_CHANGED, MAP_PUBLISHED.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function notifyEnrolledStudents(
  courseId: string,
  event: MapNotificationEvent,
): Promise<void> {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    })
    if (!course) return

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    })
    if (enrollments.length === 0) return

    const title = `Course Map Updated: ${course.title}`
    let body: string
    switch (event.type) {
      case 'MAP_NODE_ADDED':
        body = `A new topic was added to the course map: "${event.nodeLabel}"`
        break
      case 'MAP_DUE_DATE_CHANGED':
        body = `A due date was changed on "${event.nodeLabel}" — new date: ${event.newDueDate}`
        break
      case 'MAP_PUBLISHED':
        body = `The course map has been published with new updates`
        break
    }

    await Promise.allSettled(
      enrollments.map((e) =>
        createNotification({
          userId: e.studentId,
          type: event.type,
          title,
          body,
          href: `/courses/${courseId}/course-map`,
        }),
      ),
    )
  } catch (err) {
    console.error('[notifyEnrolledStudents] Error:', err)
  }
}

/**
 * Send a one-time "Course map updated" notification to all enrolled students.
 * Used by the "Notify Students" toolbar button.
 */
export async function notifyStudentsManual(
  courseId: string,
  actorName: string,
): Promise<{ sent: number }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  })
  if (!course) return { sent: 0 }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  if (enrollments.length === 0) return { sent: 0 }

  const title = `Course Map Updated: ${course.title}`
  const body = `${actorName} has updated the course map. Check it out for the latest changes.`

  await Promise.allSettled(
    enrollments.map((e) =>
      createNotification({
        userId: e.studentId,
        type: 'COURSE_MAP_UPDATED',
        title,
        body,
        href: `/courses/${courseId}/course-map`,
      }),
    ),
  )

  return { sent: enrollments.length }
}

// ── Activity Feed ────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  editType: string
  description: string
  payload: unknown
  createdAt: string
}

/**
 * Get recent course map activity from CourseMapEdit records.
 */
export async function getRecentMapActivity(
  courseId: string,
  limit = 30,
  cursor?: string,
): Promise<{ entries: ActivityEntry[]; nextCursor: string | null }> {
  const edits = await prisma.courseMapEdit.findMany({
    where: {
      courseId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      userId: true,
      editType: true,
      weekNumber: true,
      payload: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  })

  const hasMore = edits.length > limit
  const items = hasMore ? edits.slice(0, limit) : edits
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

  const entries: ActivityEntry[] = items.map((e) => {
    const payload = e.payload as Record<string, unknown> | null
    const action = payload?.action as string | undefined
    let description = e.editType

    if (action === 'node_moved') {
      description = `Moved node`
    } else if (action === 'node_updated') {
      const label = payload?.label as string | undefined
      description = label ? `Updated node "${label}"` : 'Updated a node'
    } else if (action === 'edge_created') {
      description = 'Added a connection'
    } else if (action === 'edge_deleted') {
      description = 'Removed a connection'
    } else if (action === 'snapshot_restored') {
      const name = payload?.snapshotName as string | undefined
      description = name ? `Restored snapshot "${name}"` : 'Restored a snapshot'
    } else if (action === 'snapshot_created') {
      const name = payload?.snapshotName as string | undefined
      description = name ? `Saved snapshot "${name}"` : 'Saved a snapshot'
    } else if (action === 'merge_applied') {
      const nodeCount = payload?.appliedNodes as number | undefined
      description = nodeCount ? `Applied merge (${nodeCount} nodes)` : 'Applied a merge'
    } else if (e.editType === 'MODIFY_WEEK') {
      description = 'Modified course map'
    } else if (e.editType === 'ADD_WEEK') {
      description = 'Added content'
    } else if (e.editType === 'REMOVE_WEEK') {
      description = 'Removed content'
    } else if (e.editType === 'REORDER') {
      description = 'Reordered content'
    }

    return {
      id: e.id,
      userId: e.userId,
      userName: e.user.name,
      userEmail: e.user.email,
      editType: action || e.editType,
      description,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    }
  })

  return { entries, nextCursor }
}
