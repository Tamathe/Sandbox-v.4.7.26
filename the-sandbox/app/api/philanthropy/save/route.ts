import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import type { Prisma } from '../../../generated/prisma'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const {
    organization, philanthropy, city, donationType,
    eventName, eventDate, desiredItems,
    businesses, selectedBusinesses,
    scripts, emails, followups, contactStatus,
  } = parsed.data as { organization: string; philanthropy: string; city: string; donationType?: string[]; eventName?: string; eventDate?: string; desiredItems?: string[]; businesses?: Prisma.InputJsonValue; selectedBusinesses?: Prisma.InputJsonValue; scripts?: Prisma.InputJsonValue; emails?: Prisma.InputJsonValue; followups?: Prisma.InputJsonValue; contactStatus?: Prisma.InputJsonValue }

  if (!organization || !philanthropy || !city) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const campaign = await prisma.philanthropyCampaign.create({
    data: {
      userId: auth.user.id,
      organization,
      philanthropy,
      city,
      donationType: donationType || [],
      eventName: eventName || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      desiredItems: desiredItems || [],
      businesses: businesses || [],
      selectedBusinesses: selectedBusinesses || [],
      scripts: scripts || {},
      emails: emails || {},
      followups: followups || {},
      contactStatus: contactStatus || {},
    },
  })

  return NextResponse.json({ id: campaign.id })
})
