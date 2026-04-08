import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  listClassifications,
  createClassification,
  getClassificationSummary,
  seedClassifications,
} from '../../../lib/data-classification-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const level = request.nextUrl.searchParams.get('level') ?? undefined
    const [classifications, summary] = await Promise.all([
      listClassifications(level),
      getClassificationSummary(),
    ])
    return NextResponse.json({ classifications, summary }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    seed?: boolean
    dataAsset?: string
    classificationLevel?: string
    sensitivityTags?: string[]
    ferpaProtected?: boolean
    piiContained?: boolean
    retentionCategory?: string
    owner?: string
    notes?: string
  }>(request)
  if ('error' in parsed) return parsed.error

    // Seed mode — pre-populate 12 canonical classifications
    if (parsed.data.seed) {
      const result = await seedClassifications()
      return NextResponse.json(result, { status: 201 })
    }

    // Create single classification
    if (!parsed.data.dataAsset || !parsed.data.classificationLevel) {
      return NextResponse.json({ error: 'dataAsset and classificationLevel are required' }, { status: 400 })
    }

    const classification = await createClassification({
      dataAsset: parsed.data.dataAsset,
      classificationLevel: parsed.data.classificationLevel,
      sensitivityTags: parsed.data.sensitivityTags,
      ferpaProtected: parsed.data.ferpaProtected,
      piiContained: parsed.data.piiContained,
      retentionCategory: parsed.data.retentionCategory,
      owner: parsed.data.owner,
      notes: parsed.data.notes,
    })
    return NextResponse.json(classification, { status: 201 })

})
