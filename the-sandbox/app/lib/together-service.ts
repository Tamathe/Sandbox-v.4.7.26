/**
 * Together — Learning Communities & Mentorship service.
 * Learning Circles, Peer Mentorship, Knowledge Base, Accountability Partners.
 */

import { prisma } from './prisma'
import type { MentorshipStatus } from '../generated/prisma'

// ── Learning Circles ────────────────────────────────────────────────────

export async function createCircle(
  userId: string,
  data: { name: string; description?: string; topic: string; emoji?: string; isOpen?: boolean; maxMembers?: number },
) {
  const circle = await prisma.learningCircle.create({
    data: {
      createdById: userId,
      name: data.name,
      description: data.description ?? null,
      topic: data.topic,
      emoji: data.emoji ?? '🔵',
      isOpen: data.isOpen ?? true,
      maxMembers: data.maxMembers ?? 12,
    },
  })

  // Auto-join creator
  await prisma.learningCircleMember.create({
    data: { circleId: circle.id, userId, role: 'creator' },
  })

  return circle
}

export async function listCircles(userId?: string) {
  return prisma.learningCircle.findMany({
    include: {
      _count: { select: { members: true } },
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  })
}

export async function getMyCircles(userId: string) {
  const memberships = await prisma.learningCircleMember.findMany({
    where: { userId },
    include: {
      circle: {
        include: {
          _count: { select: { members: true, posts: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  })
  return memberships.map(m => ({ ...m.circle, role: m.role }))
}

export async function joinCircle(userId: string, circleId: string) {
  const circle = await prisma.learningCircle.findUnique({
    where: { id: circleId },
    include: { _count: { select: { members: true } } },
  })
  if (!circle || !circle.isOpen) return null
  if (circle._count.members >= circle.maxMembers) return { error: 'Circle is full' }

  return prisma.learningCircleMember.upsert({
    where: { circleId_userId: { circleId, userId } },
    create: { circleId, userId },
    update: {},
  })
}

export async function leaveCircle(userId: string, circleId: string) {
  const membership = await prisma.learningCircleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  })
  if (!membership) return false
  await prisma.learningCircleMember.delete({ where: { id: membership.id } })
  return true
}

export async function addCirclePost(
  userId: string,
  circleId: string,
  data: { content: string; type?: string },
) {
  // Verify membership
  const member = await prisma.learningCircleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  })
  if (!member) return null

  return prisma.circlePost.create({
    data: {
      circleId,
      authorId: userId,
      content: data.content,
      type: data.type ?? 'discussion',
    },
  })
}

export async function getCirclePosts(circleId: string, limit = 20) {
  return prisma.circlePost.findMany({
    where: { circleId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Peer Mentorship ─────────────────────────────────────────────────────

export async function requestMentorship(
  menteeId: string,
  data: { mentorId: string; topic: string; message?: string },
) {
  return prisma.peerMentorship.create({
    data: {
      mentorId: data.mentorId,
      menteeId,
      topic: data.topic,
      message: data.message ?? null,
    },
  })
}

export async function respondToMentorship(
  userId: string,
  mentorshipId: string,
  status: MentorshipStatus,
) {
  const m = await prisma.peerMentorship.findFirst({
    where: { id: mentorshipId, mentorId: userId },
  })
  if (!m) return null

  return prisma.peerMentorship.update({
    where: { id: mentorshipId },
    data: { status },
  })
}

export async function getMyMentorships(userId: string) {
  const [asMentor, asMentee] = await Promise.all([
    prisma.peerMentorship.findMany({
      where: { mentorId: userId },
      include: { mentee: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.peerMentorship.findMany({
      where: { menteeId: userId },
      include: { mentor: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])
  return { asMentor, asMentee }
}

export async function findPotentialMentors(userId: string, topic: string) {
  // Find students who have high mastery in this topic
  const masteries = await prisma.studentConceptMastery.findMany({
    where: {
      concept: { contains: topic, mode: 'insensitive' },
      masteryLevel: { gte: 0.7 },
      userId: { not: userId },
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { masteryLevel: 'desc' },
    take: 10,
  })

  return masteries.map(m => ({
    user: m.user,
    concept: m.concept,
    masteryLevel: m.masteryLevel,
  }))
}

// ── Knowledge Base ──────────────────────────────────────────────────────

export async function addContribution(
  userId: string,
  data: { title: string; content: string; type: string; topic: string; courseId?: string },
) {
  return prisma.knowledgeContribution.create({
    data: {
      authorId: userId,
      title: data.title,
      content: data.content,
      type: data.type,
      topic: data.topic,
      courseId: data.courseId ?? null,
    },
  })
}

export async function listContributions(options: { topic?: string; courseId?: string; limit?: number } = {}) {
  return prisma.knowledgeContribution.findMany({
    where: {
      ...(options.topic ? { topic: { contains: options.topic, mode: 'insensitive' as const } } : {}),
      ...(options.courseId ? { courseId: options.courseId } : {}),
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
    take: options.limit ?? 20,
  })
}

export async function upvoteContribution(contributionId: string) {
  return prisma.knowledgeContribution.update({
    where: { id: contributionId },
    data: { upvotes: { increment: 1 } },
  })
}

// ── Accountability Partners ─────────────────────────────────────────────

export async function createAccountabilityPair(userId: string, partnerId: string, goalId?: string) {
  return prisma.accountabilityPair.upsert({
    where: { userId_partnerId: { userId, partnerId } },
    create: { userId, partnerId, goalId: goalId ?? null },
    update: { active: true, goalId: goalId ?? null },
  })
}

export async function getMyPartners(userId: string) {
  const pairs = await prisma.accountabilityPair.findMany({
    where: { OR: [{ userId }, { partnerId: userId }], active: true },
  })

  // Fetch partner details
  const partnerIds = pairs.map(p => p.userId === userId ? p.partnerId : p.userId)
  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true, avatarUrl: true },
  })

  return pairs.map(p => {
    const pid = p.userId === userId ? p.partnerId : p.userId
    return { ...p, partner: partners.find(u => u.id === pid) }
  })
}

export async function checkInWithPartner(userId: string, pairId: string) {
  const pair = await prisma.accountabilityPair.findFirst({
    where: { id: pairId, OR: [{ userId }, { partnerId: userId }] },
  })
  if (!pair) return null

  return prisma.accountabilityPair.update({
    where: { id: pairId },
    data: { lastCheckIn: new Date() },
  })
}

// ── Cross-Course Connections ────────────────────────────────────────────

export async function findCrossCourseConnections(userId: string) {
  // Get this student's enrolled courses and their concepts
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: { course: { select: { id: true, title: true, courseCode: true } } },
  })

  if (enrollments.length < 2) return []

  const courseIds = enrollments.map(e => e.courseId)

  // Find concepts that appear across multiple of the student's courses
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId, coursesEncountered: { hasSome: courseIds } },
    select: { concept: true, coursesEncountered: true, masteryLevel: true },
  })

  // Find concepts encountered in 2+ enrolled courses
  const crossConcepts = masteries.filter(m =>
    m.coursesEncountered.filter(cid => courseIds.includes(cid)).length >= 2
  )

  const courseMap = new Map(enrollments.map(e => [e.courseId, e.course]))

  return crossConcepts.map(cc => ({
    concept: cc.concept,
    masteryLevel: cc.masteryLevel,
    courses: cc.coursesEncountered
      .filter(cid => courseIds.includes(cid))
      .map(cid => courseMap.get(cid))
      .filter(Boolean),
  })).sort((a, b) => b.courses.length - a.courses.length).slice(0, 10)
}
