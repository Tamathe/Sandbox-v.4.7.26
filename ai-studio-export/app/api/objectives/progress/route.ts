import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// POST /api/objectives/progress — log one or more objective attempts from a chat session
export async function POST(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as {
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

    return NextResponse.json({ recorded: updates.length })
  } catch (err) {
    console.error('POST /api/objectives/progress error:', err)
    return NextResponse.json({ error: 'Failed to record progress' }, { status: 500 })
  }
}

// GET /api/objectives/progress?courseId=xxx — get current student's progress for a course
export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const courseId = req.nextUrl.searchParams.get('courseId')

    const progress = await prisma.studentObjectiveProgress.findMany({
      where: { studentId: user.id, ...(courseId ? { courseId } : {}) },
      select: {
        objectiveId: true,
        courseId: true,
        attempts: true,
        correct: true,
        lastSeen: true,
        objective: {
          select: { title: true, courseId: true, course: { select: { courseCode: true, title: true } } },
        },
      },
      orderBy: { lastSeen: 'desc' },
    })

    return NextResponse.json({ progress })
  } catch (err) {
    console.error('GET /api/objectives/progress error:', err)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}
