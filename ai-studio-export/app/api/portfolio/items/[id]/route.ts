import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import {
  isPortfolioType,
  normalizeOptionalString,
  normalizeSkills,
  parsePortfolioDateInput,
} from '../../../../lib/portfolio'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const PatchPortfolioItemSchema = z.object({
  type: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  organization: z.string().max(200).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  skills: z.unknown().optional(),
  url: z.string().max(500).optional().nullable(),
  metadata: z.unknown().optional().nullable(),
  isVerified: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params
  const existing = await prisma.portfolioItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(PatchPortfolioItemSchema, parsed.data)
  if ('error' in validation) return validation.error
  const body = validation.value

  if (body.type !== undefined && !isPortfolioType(body.type)) {
    return NextResponse.json({ error: 'Invalid portfolio type' }, { status: 400 })
  }

  const updated = await prisma.portfolioItem.update({
    where: { id },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.organization !== undefined && {
        organization: normalizeOptionalString(body.organization),
      }),
      ...(body.startDate !== undefined && {
        startDate: parsePortfolioDateInput(body.startDate),
      }),
      ...(body.endDate !== undefined && {
        endDate: parsePortfolioDateInput(body.endDate),
      }),
      ...(body.description !== undefined && {
        description: normalizeOptionalString(body.description),
      }),
      ...(body.skills !== undefined && { skills: normalizeSkills(body.skills) }),
      ...(body.url !== undefined && { url: normalizeOptionalString(body.url) }),
      ...(body.metadata !== undefined && { metadata: (body.metadata as Parameters<typeof prisma.portfolioItem.update>[0]['data']['metadata']) ?? null }),
      ...(body.isVerified !== undefined && { isVerified: body.isVerified === true }),
    },
  })

  return NextResponse.json({ item: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params
  const existing = await prisma.portfolioItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.portfolioItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
