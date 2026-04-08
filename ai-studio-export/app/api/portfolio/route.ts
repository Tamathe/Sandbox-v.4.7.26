import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import {
  isPortfolioType,
  normalizeOptionalString,
  normalizeSkills,
  parsePortfolioDateInput,
} from '../../lib/portfolio'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'

const PortfolioItemBodySchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  organization: z.string().max(200).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  skills: z.unknown().optional(),
  url: z.string().max(500).optional().nullable(),
  metadata: z.unknown().optional().nullable(),
  isVerified: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const items = await prisma.portfolioItem.findMany({
    where: { userId: user.id },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(PortfolioItemBodySchema, parsed.data)
  if ('error' in validation) return validation.error
  const { type, title, organization, startDate, endDate, description, skills, url, metadata, isVerified } = validation.value

  if (!isPortfolioType(type)) {
    return NextResponse.json({ error: 'Invalid portfolio type' }, { status: 400 })
  }

  const item = await prisma.portfolioItem.create({
    data: {
      userId: user.id,
      type,
      title: title.trim(),
      organization: normalizeOptionalString(organization),
      startDate: parsePortfolioDateInput(startDate),
      endDate: parsePortfolioDateInput(endDate),
      description: normalizeOptionalString(description),
      skills: normalizeSkills(skills),
      url: normalizeOptionalString(url),
      metadata: (metadata as Parameters<typeof prisma.portfolioItem.create>[0]['data']['metadata']) ?? null,
      isVerified: isVerified === true,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}
