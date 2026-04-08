import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import {
  isPortfolioType,
  normalizeOptionalString,
  normalizeSkills,
  parsePortfolioDateInput,
} from '../../lib/portfolio'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const items = await prisma.portfolioItem.findMany({
    where: { userId: user.id },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json()
  const {
    type,
    title,
    organization,
    startDate,
    endDate,
    description,
    skills,
    url,
    metadata,
    isVerified,
  } = body

  if (!isPortfolioType(type)) {
    return NextResponse.json({ error: 'Invalid portfolio type' }, { status: 400 })
  }

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
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
      metadata: metadata ?? null,
      isVerified: isVerified === true,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}
