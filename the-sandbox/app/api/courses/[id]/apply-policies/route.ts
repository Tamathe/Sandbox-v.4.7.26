/**
 * GET  /api/courses/[id]/apply-policies — retrieve stored policies + grading weights
 * POST /api/courses/[id]/apply-policies — upsert policies + grading weights from syllabus
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const [policies, gradingWeights] = await Promise.all([
    prisma.coursePolicy.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.gradingWeight.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({ policies, gradingWeights })
})

const PolicySchema = z.object({
  category: z.enum(['late', 'attendance', 'grading', 'academic_integrity', 'communication', 'other']),
  title: z.string().min(1),
  content: z.string().min(1).max(2000),
})

const GradingWeightSchema = z.object({
  category: z.string().min(1),
  weight: z.number().min(0).max(1),
  description: z.string().nullable(),
})

const BodySchema = z.object({
  policies: z.array(PolicySchema),
  gradingWeights: z.array(GradingWeightSchema),
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(parsed.data)
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues : 'Invalid request body'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const [, , policies, weights] = await prisma.$transaction([
    prisma.coursePolicy.deleteMany({ where: { courseId } }),
    prisma.gradingWeight.deleteMany({ where: { courseId } }),
    prisma.coursePolicy.createManyAndReturn({
      data: body.policies.map((p) => ({
        courseId,
        policyType: p.category,
        title: p.title,
        content: p.content,
        source: 'syllabus',
      })),
    }),
    prisma.gradingWeight.createManyAndReturn({
      data: body.gradingWeights.map((g) => ({
        courseId,
        category: g.category,
        weight: g.weight,
        description: g.description,
        source: 'syllabus',
      })),
    }),
  ])

  return NextResponse.json({
    applied: true,
    policiesCount: policies.length,
    gradingWeightsCount: weights.length,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
