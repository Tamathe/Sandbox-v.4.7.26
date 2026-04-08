/**
 * GET  /api/experiments  — list experiments for a course with arm counts
 * POST /api/experiments  — create a new experiment (DRAFT status)
 *
 * GET query params:
 *   courseId (required)
 *
 * POST body: PedagogicalExperiment fields (validated with zod)
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '../../generated/prisma'
import { prisma } from '../../lib/prisma'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'

export const runtime = 'nodejs'

const ExperimentCreateSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  hypothesis: z.string().min(1).max(2000),
  primaryMetric: z.enum(['mastery_delta', 'avg_score', 'session_completion', 'concept_coverage']),
  controlLabel: z.string().min(1).max(100).default('Control'),
  treatmentLabel: z.string().min(1).max(100).default('Treatment'),
  enrollmentMode: z.enum(['AUTOMATIC', 'MANUAL']).default('AUTOMATIC'),
  targetSampleSize: z.number().int().positive().optional(),
  treatmentConfig: z.record(z.string(), z.unknown()).optional(),
})

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const courseId = request.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const experiments = await prisma.pedagogicalExperiment.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  })

  // Count enrollments per arm for each experiment
  const experimentIds = experiments.map((e) => e.id)
  const enrollmentGroups = await prisma.experimentEnrollment.groupBy({
    by: ['experimentId', 'arm'],
    where: { experimentId: { in: experimentIds } },
    _count: { id: true },
  })

  // Build a map: experimentId → { controlN, treatmentN }
  const armCounts = new Map<string, { controlN: number; treatmentN: number }>()
  for (const group of enrollmentGroups) {
    const cur = armCounts.get(group.experimentId) ?? { controlN: 0, treatmentN: 0 }
    if (group.arm === 'control') cur.controlN = group._count.id
    else if (group.arm === 'treatment') cur.treatmentN = group._count.id
    armCounts.set(group.experimentId, cur)
  }

  const result = experiments.map((exp) => ({
    ...exp,
    ...(armCounts.get(exp.id) ?? { controlN: 0, treatmentN: 0 }),
  }))

  return NextResponse.json({ experiments: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsedBody = await parseRequestBody(request)
  if ('error' in parsedBody) return parsedBody.error

  const parsed = ExperimentCreateSchema.safeParse(parsedBody.data)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  const experiment = await prisma.pedagogicalExperiment.create({
    data: {
      courseId: data.courseId,
      creatorId: user.id,
      title: data.title,
      hypothesis: data.hypothesis,
      primaryMetric: data.primaryMetric,
      controlLabel: data.controlLabel,
      treatmentLabel: data.treatmentLabel,
      enrollmentMode: data.enrollmentMode,
      targetSampleSize: data.targetSampleSize ?? null,
      treatmentConfig: (data.treatmentConfig ?? {}) as Prisma.InputJsonValue,
      status: 'DRAFT',
    },
  })

  return NextResponse.json({ experiment }, { status: 201 })
})
