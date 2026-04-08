/**
 * Cross-Course Concept Bridge — Bridge Recommender
 *
 * When a student struggles with a concept, finds cross-course resources:
 * flashcards, peer experts, study groups, course materials, live rooms.
 */

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import type { CrossCourseResource, BridgeRecommendationData, BridgeBriefingBlock, BridgeSandyContext } from './types'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate cross-course resource recommendations for a struggling student.
 */
export async function generateBridgeRecommendations(
  userId: string,
  concept: string,
  courseId: string,
): Promise<BridgeRecommendationData> {
  // 1. Find bridge concepts from other courses
  const bridges = await prisma.conceptBridge.findMany({
    where: {
      OR: [
        { conceptA: { contains: concept, mode: 'insensitive' }, courseA: courseId },
        { conceptB: { contains: concept, mode: 'insensitive' }, courseB: courseId },
      ],
      similarity: { gte: 0.6 },
    },
    orderBy: { similarity: 'desc' },
  })

  if (bridges.length === 0) {
    return { resources: [], concept, courseId }
  }

  // 2. For each bridge, find resources in the bridged course
  const resources: CrossCourseResource[] = []

  for (const bridge of bridges) {
    const isSideA =
      bridge.conceptA.toLowerCase().includes(concept.toLowerCase()) &&
      bridge.courseA === courseId
    const bridgedConcept = isSideA ? bridge.conceptB : bridge.conceptA
    const bridgedCourseId = isSideA ? bridge.courseB : bridge.courseA

    // Find flashcards with good retention for this concept
    const flashcards = await prisma.flashcardState.findMany({
      where: {
        conceptSlug: { contains: bridgedConcept, mode: 'insensitive' },
        lastQuality: { gte: 3 },
      },
      select: { id: true, userId: true, conceptSlug: true },
      take: 5,
    })
    if (flashcards.length > 0) {
      resources.push({
        type: 'flashcards',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: flashcards.length,
        reason: `${flashcards.length} flashcard(s) with high retention for "${bridgedConcept}"`,
        score: bridge.similarity * 0.9,
      })
    }

    // Find peer experts — students who mastered this concept
    const experts = await prisma.studentConceptMastery.findMany({
      where: {
        concept: { contains: bridgedConcept, mode: 'insensitive' },
        masteryLevel: { gte: 0.8 },
        userId: { not: userId },
      },
      select: { userId: true, masteryLevel: true },
      take: 5,
    })
    if (experts.length > 0) {
      resources.push({
        type: 'peer-experts',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: experts.length,
        reason: `${experts.length} student(s) mastered "${bridgedConcept}" and could help`,
        score: bridge.similarity * 0.85,
        peerIds: experts.map(e => e.userId),
      })
    }

    // Find study groups in the bridged course
    const groups = await prisma.studyGroup.findMany({
      where: {
        courseId: bridgedCourseId,
        name: { contains: bridgedConcept, mode: 'insensitive' },
      },
      select: { id: true, name: true, _count: { select: { members: true } } },
      take: 3,
    })
    if (groups.length > 0) {
      resources.push({
        type: 'study-groups',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: groups.length,
        reason: `${groups.length} study group(s) on "${bridgedConcept}"`,
        score: bridge.similarity * 0.8,
        groupIds: groups.map(g => g.id),
      })
    }

    // Find relevant course materials
    const materials = await prisma.documentChunk.findMany({
      where: {
        courseId: bridgedCourseId,
        content: { contains: bridgedConcept, mode: 'insensitive' },
      },
      select: { id: true, materialId: true },
      take: 3,
    })
    if (materials.length > 0) {
      resources.push({
        type: 'materials',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: materials.length,
        reason: `Course materials covering "${bridgedConcept}" from another course`,
        score: bridge.similarity * 0.75,
      })
    }

    // Find recent live rooms on this concept
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const liveRooms = await prisma.liveRoom.findMany({
      where: {
        title: { contains: bridgedConcept, mode: 'insensitive' },
        phase: 'COMPLETE',
        endedAt: { gte: sevenDaysAgo },
      },
      select: { id: true, title: true, _count: { select: { participants: true } } },
      take: 2,
    })
    if (liveRooms.length > 0) {
      resources.push({
        type: 'live-rooms',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: liveRooms.length,
        reason: `Recent Commons sessions on "${bridgedConcept}"`,
        score: bridge.similarity * 0.7,
      })
    }
  }

  // Sort by score and cap at 10
  const sorted = resources.sort((a, b) => b.score - a.score).slice(0, 10)

  // Persist recommendation
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.bridgeRecommendation.create({
    data: {
      userId,
      concept,
      courseId,
      resources: sorted as unknown as Prisma.InputJsonValue,
      expiresAt: sevenDaysFromNow,
    },
  })

  return { resources: sorted, concept, courseId }
}

// ---------------------------------------------------------------------------
// Integration Helpers (exported for future wiring)
// ---------------------------------------------------------------------------

/**
 * Build a briefing block for the student homepage morning briefing.
 * Integration merge will wire this into briefing.ts.
 */
export async function buildBriefingBlock(userId: string): Promise<BridgeBriefingBlock | null> {
  const recs = await prisma.bridgeRecommendation.findMany({
    where: {
      userId,
      status: { in: ['pending', 'viewed'] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  if (recs.length === 0) return null

  const topRec = recs[0]

  return {
    type: 'concept-bridge',
    count: recs.length,
    topConcept: topRec.concept,
    topCourseName: topRec.courseId,
  }
}

/**
 * Build Sandy concierge context for the concept bridge feature.
 * Integration merge will wire this into concierge-service.ts.
 */
export async function buildSandyContext(userId: string): Promise<BridgeSandyContext> {
  const count = await prisma.bridgeRecommendation.count({
    where: {
      userId,
      status: { in: ['pending', 'viewed'] },
      expiresAt: { gt: new Date() },
    },
  })

  let topConcept: string | null = null
  if (count > 0) {
    const topRec = await prisma.bridgeRecommendation.findFirst({
      where: {
        userId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: { concept: true },
    })
    topConcept = topRec?.concept ?? null
  }

  return {
    activeBridgeRecommendations: count,
    topStrugglingConcept: topConcept,
  }
}
