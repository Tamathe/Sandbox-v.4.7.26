import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  isPortfolioType,
  normalizeOptionalString,
  normalizeSkills,
  parsePortfolioDateInput,
} from '../../../../lib/portfolio'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { id } = await params
  const existing = await prisma.portfolioItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
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
      ...(body.metadata !== undefined && { metadata: body.metadata ?? null }),
      ...(body.isVerified !== undefined && { isVerified: body.isVerified === true }),
    },
  })

  return NextResponse.json({ item: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { id } = await params
  const existing = await prisma.portfolioItem.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.portfolioItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
