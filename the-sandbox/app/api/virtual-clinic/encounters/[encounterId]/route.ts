import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getEncounter, advancePhase, saveArtifact, saveSelfAssessment, withdrawEncounter, saveNotes } from '../../../../lib/virtual-clinic/encounter-service'
import type { SelfAssessment } from '../../../../lib/virtual-clinic/types'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ encounterId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { encounterId } = await params
  const encounter = await getEncounter(encounterId)

  if (encounter.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(encounter, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// PATCH — save artifact or advance phase
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ encounterId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { encounterId } = await params
  const parsed = await parseRequestBody<{
    action: 'save_artifact' | 'advance_phase' | 'save_self_assessment' | 'withdraw' | 'save_notes'
    artifactType?: 'problem_representation' | 'differential_list' | 'diagnostic_plan'
    artifactData?: unknown
    selfAssessment?: SelfAssessment
    notes?: string
  }>(req)
  if ('error' in parsed) return parsed.error
  const { action, artifactType, artifactData, selfAssessment, notes } = parsed.data

  if (action === 'save_notes') {
    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes string is required' }, { status: 400 })
    }
    await saveNotes(encounterId, user.id, notes)
    return NextResponse.json({ success: true })
  }

  if (action === 'withdraw') {
    const updated = await withdrawEncounter(encounterId, user.id)
    return NextResponse.json(updated)
  }

  if (action === 'save_self_assessment') {
    if (!selfAssessment) {
      return NextResponse.json({ error: 'selfAssessment data is required' }, { status: 400 })
    }
    await saveSelfAssessment(encounterId, user.id, selfAssessment)
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (action === 'advance_phase') {
    const updated = await advancePhase(encounterId, user.id)
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (action === 'save_artifact') {
    if (!artifactType || artifactData === undefined) {
      return NextResponse.json({ error: 'artifactType and artifactData are required' }, { status: 400 })
    }
    const updated = await saveArtifact(encounterId, user.id, artifactType, artifactData)
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
})
