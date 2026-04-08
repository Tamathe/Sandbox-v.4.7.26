import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MemoryCategory } from '../../../generated/prisma'
import { prisma } from '../../../lib/prisma'

const EXTRACTION_SYSTEM_PROMPT = `You are a profile extraction system. The user has had a conversation with "The Notebook," a tool designed to learn about them. Extract factual statements about the user into structured memory entries.

Return ONLY valid JSON in this exact format:
{
  "memories": [
    { "category": "IDENTITY", "content": "Prefers to go by 'Jamie', junior studying Computer Science" },
    { "category": "GOALS", "content": "Wants to work in product management at a tech company after graduation" }
  ]
}

Categories:
- IDENTITY: name preference, year, major, minor, college, pronouns
- GOALS: career goals, aspirations, dreams
- STRENGTHS: things they're good at, proud of, or find energizing
- CHALLENGES: areas they find hard, want to improve, or avoid
- PROJECTS: current courses, research, side projects, things they're actively working on
- WRITING_STYLE: how they prefer to communicate (formal/casual, concise/detailed, etc.)
- PERSONAL: hobbies, interests, background, anything personal they shared

Rules:
- Only include facts the user explicitly stated. Do not infer or assume.
- One clear sentence per memory. No compound memories.
- If nothing was shared in a category, omit it entirely.
- Maximum 12 memories total. Prioritize the most specific and useful.`

const VALID_CATEGORIES: MemoryCategory[] = [
  'IDENTITY',
  'GOALS',
  'STRENGTHS',
  'CHALLENGES',
  'PROJECTS',
  'WRITING_STYLE',
  'PERSONAL',
]

type TranscriptMessage = {
  role: string
  content: string
}

type ExtractedResponse = {
  memories?: Array<{ category: string; content: string }>
}

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages) || messages.length < 2) {
    return NextResponse.json({ error: 'Not enough conversation to extract from' }, { status: 400 })
  }

  const transcript = (messages as TranscriptMessage[])
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => `${message.role === 'user' ? 'Student' : 'Notebook'}: ${message.content}`)
    .join('\n\n')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Here is the conversation transcript:\n\n${transcript}` }],
  })

  const rawText = response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')

  let extracted: ExtractedResponse
  try {
    const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim()
    extracted = JSON.parse(cleaned) as ExtractedResponse
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  if (!Array.isArray(extracted.memories)) {
    return NextResponse.json({ error: 'Unexpected AI response shape' }, { status: 500 })
  }

  const validMemories = extracted.memories.filter(
    (memory) =>
      typeof memory.content === 'string' &&
      memory.content.trim() &&
      VALID_CATEGORIES.includes(memory.category as MemoryCategory)
  )

  const saved = await Promise.all(
    validMemories.map((memory) =>
      prisma.userMemory.create({
        data: {
          userId: user.id,
          category: memory.category as MemoryCategory,
          content: memory.content.trim(),
          source: 'notebook',
        },
      })
    )
  )

  return NextResponse.json({ saved, count: saved.length })
}
