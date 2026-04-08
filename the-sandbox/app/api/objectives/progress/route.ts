import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

// POST /api/objectives/progress — log one or more objective attempts from a chat session
export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as {
      objectiveUpdates?: { id: string; quality: 'green' | 'yellow' }[]
      objectiveIds?: string[]   // legacy format (backward compat)
      correct?: boolean         // legacy: true=green, false=yellow
      courseId?: string
      flagForReview?: boolean   // if true, mark given objectives as flaggedForReview=true, masteryLevel='struggling'
    }

    // Normalise to a unified list of { id, quality } entries
    type QualityEntry = { id: string; quality: 'green' | 'yellow' }
    let updates: QualityEntry[] = []

    if (Array.isArray(body.objectiveUpdates) && body.objectiveUpdates.length > 0) {
      // New format
      updates = body.objectiveUpdates
    } else if (Array.isArray(body.objectiveIds) && body.objectiveIds.length > 0) {
      // Legacy format — map correct boolean to green/yellow
      const quality: 'green' | 'yellow' = body.correct !== false ? 'green' : 'yellow'
      updates = body.objectiveIds.map((id) => ({ id, quality }))
    } else {
      return NextResponse.json({ error: 'objectiveUpdates or objectiveIds array required' }, { status: 400 })
    }

    const isFlagForReview = body.flagForReview === true

    await Promise.all(
      updates.map(async ({ id: objectiveId, quality }) => {
        const obj = await prisma.learningObjective.findUnique({
          where: { id: objectiveId },
          select: { courseId: true },
        })
        if (!obj) return

        if (isFlagForReview) {
          // Flag for review: set masteryLevel='struggling' and flaggedForReview=true regardless of quality
          await prisma.studentObjectiveProgress.upsert({
            where: { studentId_objectiveId: { studentId: user.id, objectiveId } },
            create: {
              studentId: user.id,
              objectiveId,
              courseId: obj.courseId,
              attempts: 1,
              correct: 0,
              masteryLevel: 'struggling',
              flaggedForReview: true,
              lastSeen: new Date(),
            },
            update: {
              attempts: { increment: 1 },
              masteryLevel: 'struggling',
              flaggedForReview: true,
              lastSeen: new Date(),
            },
          })
          return
        }

        if (quality === 'green') {
          // Green: mastered, increment attempts+1 and correct+1
          await prisma.studentObjectiveProgress.upsert({
            where: { studentId_objectiveId: { studentId: user.id, objectiveId } },
            create: {
              studentId: user.id,
              objectiveId,
              courseId: obj.courseId,
              attempts: 1,
              correct: 1,
              masteryLevel: 'mastered',
              lastSeen: new Date(),
            },
            update: {
              attempts: { increment: 1 },
              correct: { increment: 1 },
              masteryLevel: 'mastered',
              lastSeen: new Date(),
            },
          })
        } else {
          // Yellow: set struggling ONLY IF current level is not 'mastered'
          const existing = await prisma.studentObjectiveProgress.findUnique({
            where: { studentId_objectiveId: { studentId: user.id, objectiveId } },
            select: { masteryLevel: true },
          })

          const newMasteryLevel = existing?.masteryLevel === 'mastered' ? 'mastered' : 'struggling'

          await prisma.studentObjectiveProgress.upsert({
            where: { studentId_objectiveId: { studentId: user.id, objectiveId } },
            create: {
              studentId: user.id,
              objectiveId,
              courseId: obj.courseId,
              attempts: 1,
              correct: 0,
              masteryLevel: 'struggling',
              lastSeen: new Date(),
            },
            update: {
              attempts: { increment: 1 },
              masteryLevel: newMasteryLevel,
              lastSeen: new Date(),
            },
          })
        }
      })
    )

    return NextResponse.json({ recorded: updates.length }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

// GET /api/objectives/progress?courseId=xxx — get current student's progress for a course
export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const courseId = req.nextUrl.searchParams.get('courseId')

    const progress = await prisma.studentObjectiveProgress.findMany({
      where: { studentId: user.id, ...(courseId ? { courseId } : {}) },
      select: {
        objectiveId: true,
        courseId: true,
        attempts: true,
        correct: true,
        masteryLevel: true,
        lastSeen: true,
        objective: {
          select: { title: true, courseId: true, course: { select: { courseCode: true, title: true } } },
        },
      },
      orderBy: { lastSeen: 'desc' },
    })

    // Normalise masteryLevel → mastery for the client
    const normalised = progress.map(({ masteryLevel, ...rest }) => ({ ...rest, mastery: masteryLevel }))

    return NextResponse.json({ progress: normalised }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
