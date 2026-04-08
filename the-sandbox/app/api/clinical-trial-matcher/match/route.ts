import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { matchTrialsToPatient } from '../../../lib/clinical-trial-matcher/matcher-service'
import { withErrorHandling } from '../../../lib/api-utils'
import type { ClinicalTrial, PatientProfile } from '../../../lib/clinical-trial-matcher/types'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { trials, patient } = parsed.data as { trials: ClinicalTrial[]; patient: PatientProfile }

  if (!trials?.length || !patient?.condition) {
    return NextResponse.json({ error: 'Trials and patient data are required' }, { status: 400 })
  }

  const matches = await matchTrialsToPatient(trials, patient)
  return NextResponse.json({ matches })
})
