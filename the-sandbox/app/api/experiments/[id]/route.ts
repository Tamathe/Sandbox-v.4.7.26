/**
 * GET   /api/experiments/[id]  — full experiment with latest outcome snapshot
 * PATCH /api/experiments/[id]  — update status or config fields
 *
 * PATCH body (all optional):
 *   status, treatmentConfig, targetSampleSize, title, hypothesis
 *
 * Status transitions:
 *   DRAFT → ACTIVE  : sets startedAt = now()
 *   ACTIVE → COMPLETED : sets endedAt = now()
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generateOutcomeNarrative } from '../../../lib/ab-experiments'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const experiment = await prisma.pedagogicalExperiment.findUnique({
    where: { id },
    include: {
      outcomes: {
        orderBy: { snapshotAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  // Generate narrative for the latest snapshot if missing
  const latestSnapshot = experiment.outcomes[0] ?? null
  if (latestSnapshot && (!latestSnapshot.narrative || !latestSnapshot.narrativeGeneratedAt)) {
    try {
      await generateOutcomeNarrative(latestSnapshot.id)
      // Re-fetch the updated snapshot
      const refreshed = await prisma.experimentOutcomeSnapshot.findUnique({
        where: { id: latestSnapshot.id },
      })
      if (refreshed) {
        experiment.outcomes[0] = refreshed
      }
    } catch (err) {
      console.error(`[experiments/[id]] Narrative generation failed:`, err)
      // Non-fatal — return experiment without narrative
    }
  }

  return NextResponse.json({ experiment }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const parsed = await parseRequestBody<{
    status?: string
    treatmentConfig?: Record<string, unknown>
    targetSampleSize?: number
    title?: string
    hypothesis?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const existing = await prisma.pedagogicalExperiment.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const ALLOWED_STATUSES = new Set(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'])
  if (body.status && !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
  }

  // Build update payload
  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.hypothesis !== undefined) updateData.hypothesis = body.hypothesis
  if (body.targetSampleSize !== undefined) updateData.targetSampleSize = body.targetSampleSize
  if (body.treatmentConfig !== undefined) updateData.treatmentConfig = body.treatmentConfig

  if (body.status) {
    updateData.status = body.status
    if (body.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      updateData.startedAt = new Date()
    }
    if (body.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.endedAt = new Date()
    }
  }

  const updated = await prisma.pedagogicalExperiment.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ experiment: updated }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
