import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

const VALID_CATEGORIES = ['analytics', 'ai-personalization', 'email-communications'] as const
type ConsentCategory = (typeof VALID_CATEGORIES)[number]

// GET — returns the user's per-category consent state
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const categories = await prisma.userConsentCategory.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      category: true,
      consentedAt: true,
      revokedAt: true,
    },
  })

  // Build a map with all categories, defaulting to not-consented
  const result = VALID_CATEGORIES.map((cat) => {
    const record = categories.find((c) => c.category === cat)
    return {
      category: cat,
      consented: record ? !record.revokedAt : false,
      consentedAt: record?.consentedAt?.toISOString() ?? null,
      revokedAt: record?.revokedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ categories: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// PATCH — upsert a consent category (set consentedAt or revokedAt)
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const parsed = await parseRequestBody<{ category?: string; consented?: boolean }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { category, consented } = body

  if (!category || !VALID_CATEGORIES.includes(category as ConsentCategory)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 },
    )
  }

  if (typeof consented !== 'boolean') {
    return NextResponse.json({ error: 'consented must be a boolean' }, { status: 400 })
  }

  const now = new Date()

  if (consented) {
    // Upsert: set consentedAt and clear revokedAt
    await prisma.userConsentCategory.upsert({
      where: { userId_category: { userId: user.id, category } },
      create: { userId: user.id, category, consentedAt: now, revokedAt: null },
      update: { consentedAt: now, revokedAt: null },
    })
  } else {
    // Set revokedAt (only if record exists)
    const existing = await prisma.userConsentCategory.findUnique({
      where: { userId_category: { userId: user.id, category } },
    })
    if (existing) {
      await prisma.userConsentCategory.update({
        where: { id: existing.id },
        data: { revokedAt: now },
      })
    }
  }

  // Log to compliance audit trail
  await prisma.complianceAuditLog.create({
    data: {
      userId: user.id,
      action: consented ? `consent-category-granted:${category}` : `consent-category-revoked:${category}`,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    },
  })

  return NextResponse.json({ ok: true, category, consented })
})
