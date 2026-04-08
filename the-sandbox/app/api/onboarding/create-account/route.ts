import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { checkRateLimit } from '../../../lib/rate-limit'
import { withErrorHandling } from '../../../lib/api-utils'
import { parseRequestBody } from '../../../lib/server-auth'

type InterestEntry = { tag: string; source: string; accepted: boolean }

type CreateAccountBody = {
  email: string
  name: string
  role: 'EDUCATOR' | 'STUDENT'
  title?: string | null
  department?: string | null
  college?: string | null
  enrichmentSource?: string
  enrichmentConfidence?: string
  interests?: InterestEntry[]
}

// POST /api/onboarding/create-account
export const POST = withErrorHandling(async (req: NextRequest) => {
  const rateLimited = await checkRateLimit(req, null, 'API')
  if (rateLimited) return rateLimited

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as CreateAccountBody

  const {
    email, name, role,
    title, department, college,
    enrichmentSource = 'ai-inferred',
    enrichmentConfidence = 'high',
    interests = [],
  } = body

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'email, name, and role are required' }, { status: 400 })
  }

  const lower = email.toLowerCase().trim()

  if (!lower.endsWith('@uky.edu')) {
    return NextResponse.json({ error: 'UK email required' }, { status: 400 })
  }

  // Check for existing account
  const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'Account already exists' }, { status: 409 })
  }

  // Randomly assign to A/B study group (50/50 control vs treatment)
  const studyGroup = Math.random() < 0.5 ? 'control' : 'treatment'

  // Create user
  const user = await prisma.user.create({
    data: {
      email: lower,
      name: name.trim(),
      role,
      title: title ?? null,
      department: department ?? null,
      college: college ?? null,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      enrichmentSource,
      enrichmentConfidence,
      studyGroup,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  // Create interest records (accepted and rejected)
  if (interests.length > 0) {
    await prisma.userInterest.createMany({
      data: interests.map(i => ({
        userId: user.id,
        tag: i.tag,
        source: i.source,
        accepted: i.accepted,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ user })
})
