import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generateBusinesses } from '../../../lib/philanthropy/business-service'
import type { CampaignFormData } from '../../../lib/philanthropy/types'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as CampaignFormData

  const { organization, donationType, philanthropy, city } = body
  if (!organization || !donationType?.length || !philanthropy || !city) {
    return NextResponse.json(
      { error: 'Missing required fields: organization, donationType, philanthropy, city' },
      { status: 400 },
    )
  }

  const businesses = await generateBusinesses(body)
  return NextResponse.json({ businesses })
})
