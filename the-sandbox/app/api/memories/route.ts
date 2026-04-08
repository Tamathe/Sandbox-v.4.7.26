import { NextRequest, NextResponse } from 'next/server'
import type { MemoryCategory } from '../../generated/prisma'
import { prisma } from '../../lib/prisma'

const VALID_CATEGORIES: MemoryCategory[] = [
  'IDENTITY',
  'GOALS',
  'STRENGTHS',
  'CHALLENGES',
  'PROJECTS',
  'WRITING_STYLE',
  'PERSONAL',
]

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const memories = await prisma.userMemory.findMany({
    where: { userId: user.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })

  const contextString =
    memories.length > 0
      ? `ABOUT THIS USER (from their profile — use naturally, don't repeat verbatim):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`
      : null

  return NextResponse.json({ memories, contextString })
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

  const { category, content, source } = await req.json()
  if (!category || !content || typeof content !== 'string') {
    return NextResponse.json({ error: 'category and content required' }, { status: 400 })
  }

  if (!VALID_CATEGORIES.includes(category as MemoryCategory)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const memory = await prisma.userMemory.create({
    data: {
      userId: user.id,
      category: category as MemoryCategory,
      content: content.trim(),
      source: typeof source === 'string' && source.trim() ? source.trim() : 'manual',
    },
  })

  return NextResponse.json({ memory })
}
