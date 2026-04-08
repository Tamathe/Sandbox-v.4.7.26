/**
 * Course Map Comment Service
 *
 * Inline comments on nodes/edges with threaded replies, @mentions,
 * and resolution tracking.
 */

import { prisma } from '../prisma'
import { createNotification } from '../notifications'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommentEntry {
  id: string
  courseMapId: string
  nodeId: string | null
  edgeId: string | null
  parentId: string | null
  userId: string
  userName: string
  userEmail: string
  content: string
  resolved: boolean
  resolvedById: string | null
  resolvedByName: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  replies: CommentEntry[]
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a comment on a course map node/edge, or a reply to an existing comment.
 */
export async function createComment(
  courseMapId: string,
  userId: string,
  input: {
    content: string
    nodeId?: string
    edgeId?: string
    parentId?: string
  },
): Promise<CommentEntry> {
  const { content, nodeId, edgeId, parentId } = input

  // If replying, inherit nodeId/edgeId from parent
  let resolvedNodeId = nodeId ?? null
  let resolvedEdgeId = edgeId ?? null

  if (parentId) {
    const parent = await prisma.courseMapComment.findUnique({
      where: { id: parentId },
      select: { nodeId: true, edgeId: true, courseMapId: true },
    })
    if (!parent) throw new Error('Parent comment not found')
    if (parent.courseMapId !== courseMapId) throw new Error('Parent comment belongs to a different course map')
    resolvedNodeId = parent.nodeId
    resolvedEdgeId = parent.edgeId
  }

  const comment = await prisma.courseMapComment.create({
    data: {
      courseMapId,
      userId,
      content,
      nodeId: resolvedNodeId,
      edgeId: resolvedEdgeId,
      parentId: parentId ?? null,
    },
    include: {
      user: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Fire-and-forget: notify @mentioned users
  const mentions = extractMentions(content)
  if (mentions.length > 0) {
    notifyMentionedUsers(courseMapId, userId, comment.user.name, mentions, content).catch(() => {})
  }

  return formatComment(comment)
}

/**
 * Get comments for a course map, optionally filtered by node/edge/resolved status.
 */
export async function getComments(
  courseMapId: string,
  filters?: { nodeId?: string; edgeId?: string; resolved?: boolean },
): Promise<CommentEntry[]> {
  const where: Record<string, unknown> = {
    courseMapId,
    parentId: null, // Only root comments; replies are nested
  }

  if (filters?.nodeId) where.nodeId = filters.nodeId
  if (filters?.edgeId) where.edgeId = filters.edgeId
  if (filters?.resolved !== undefined) where.resolved = filters.resolved

  const comments = await prisma.courseMapComment.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return comments.map(formatComment)
}

/**
 * Resolve a comment (set resolved = true).
 */
export async function resolveComment(
  commentId: string,
  resolvedById: string,
): Promise<CommentEntry> {
  const comment = await prisma.courseMapComment.update({
    where: { id: commentId },
    data: {
      resolved: true,
      resolvedById,
      resolvedAt: new Date(),
    },
    include: {
      user: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return formatComment(comment)
}

/**
 * Unresolve a comment (set resolved = false).
 */
export async function unresolveComment(commentId: string): Promise<CommentEntry> {
  const comment = await prisma.courseMapComment.update({
    where: { id: commentId },
    data: {
      resolved: false,
      resolvedById: null,
      resolvedAt: null,
    },
    include: {
      user: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return formatComment(comment)
}

/**
 * Delete a comment — only the author can delete their own comments.
 */
export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const comment = await prisma.courseMapComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  })
  if (!comment) throw new Error('Comment not found')
  if (comment.userId !== userId) throw new Error('Only the comment author can delete this comment')

  await prisma.courseMapComment.delete({ where: { id: commentId } })
}

/**
 * Get unresolved comment counts grouped by nodeId and edgeId.
 * Used for badge counts on the graph.
 */
export async function getCommentCounts(
  courseMapId: string,
): Promise<{ nodeCounts: Record<string, number>; edgeCounts: Record<string, number> }> {
  const comments = await prisma.courseMapComment.findMany({
    where: { courseMapId, resolved: false },
    select: { nodeId: true, edgeId: true },
  })

  const nodeCounts: Record<string, number> = {}
  const edgeCounts: Record<string, number> = {}

  for (const c of comments) {
    if (c.nodeId) nodeCounts[c.nodeId] = (nodeCounts[c.nodeId] || 0) + 1
    if (c.edgeId) edgeCounts[c.edgeId] = (edgeCounts[c.edgeId] || 0) + 1
  }

  return { nodeCounts, edgeCounts }
}

/**
 * Extract @email mentions from comment content.
 */
export function extractMentions(content: string): string[] {
  const regex = /@([\w.+-]+@[\w.-]+\.\w+)/g
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1].toLowerCase())
  }
  return [...new Set(matches)]
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function notifyMentionedUsers(
  courseMapId: string,
  actorId: string,
  actorName: string,
  emails: string[],
  content: string,
): Promise<void> {
  try {
    const courseMap = await prisma.courseMap.findUnique({
      where: { id: courseMapId },
      include: { course: { select: { id: true, title: true } } },
    })
    if (!courseMap) return

    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    })

    const preview = content.length > 80 ? content.slice(0, 77) + '...' : content

    await Promise.allSettled(
      users
        .filter((u) => u.id !== actorId)
        .map((u) =>
          createNotification({
            userId: u.id,
            type: 'COURSE_MAP_UPDATED',
            title: `${actorName} mentioned you`,
            body: preview,
            href: `/courses/${courseMap.course.id}/course-map`,
          }),
        ),
    )
  } catch (err) {
    console.error('[notifyMentionedUsers] Error:', err)
  }
}

function formatComment(c: {
  id: string
  courseMapId: string
  nodeId: string | null
  edgeId: string | null
  parentId: string | null
  userId: string
  user: { name: string; email: string }
  content: string
  resolved: boolean
  resolvedById: string | null
  resolvedBy: { name: string } | null
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  replies: Array<{
    id: string
    courseMapId: string
    nodeId: string | null
    edgeId: string | null
    parentId: string | null
    userId: string
    user: { name: string; email: string }
    content: string
    resolved: boolean
    resolvedById: string | null
    resolvedBy: { name: string } | null
    resolvedAt: Date | null
    createdAt: Date
    updatedAt: Date
    replies: Array<{ id: string }>
  }>
}): CommentEntry {
  return {
    id: c.id,
    courseMapId: c.courseMapId,
    nodeId: c.nodeId,
    edgeId: c.edgeId,
    parentId: c.parentId,
    userId: c.userId,
    userName: c.user.name,
    userEmail: c.user.email,
    content: c.content,
    resolved: c.resolved,
    resolvedById: c.resolvedById,
    resolvedByName: c.resolvedBy?.name ?? null,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    replies: c.replies.map((r) => ({
      id: r.id,
      courseMapId: r.courseMapId,
      nodeId: r.nodeId,
      edgeId: r.edgeId,
      parentId: r.parentId,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      content: r.content,
      resolved: r.resolved,
      resolvedById: r.resolvedById,
      resolvedByName: r.resolvedBy?.name ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      replies: [], // Only one level of nesting
    })),
  }
}
