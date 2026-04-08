import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { MemoryCategory } from '../../generated/prisma'
import { prisma } from '../../lib/prisma'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'

const VALID_CATEGORIES: MemoryCategory[] = [
  'IDENTITY',
  'GOALS',
  'STRENGTHS',
  'CHALLENGES',
  'PROJECTS',
  'WRITING_STYLE',
  'PERSONAL',
]

const CreateMemoryBodySchema = z.object({
  category: z.enum(['IDENTITY', 'GOALS', 'STRENGTHS', 'CHALLENGES', 'PROJECTS', 'WRITING_STYLE', 'PERSONAL']),
  content: z.string().min(1).max(1000),
  source: z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

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
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(CreateMemoryBodySchema, parsed.data)
  if ('error' in validation) return validation.error
  const { category, content, source } = validation.value

  const memory = await prisma.userMemory.create({
    data: {
      userId: user.id,
      category: category as MemoryCategory,
      content: content.trim(),
      source: source?.trim() || 'manual',
    },
  })

  return NextResponse.json({ memory })
}
