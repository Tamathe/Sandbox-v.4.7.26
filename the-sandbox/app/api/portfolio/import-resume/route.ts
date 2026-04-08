import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { PortfolioType } from '../../../generated/prisma'
import { prisma } from '../../../lib/prisma'
import { isPortfolioType, normalizeSkills } from '../../../lib/portfolio'

const RESUME_IMPORT_SYSTEM_PROMPT = `You are an expert resume parser. Extract structured data from the resume text below.
Return ONLY a valid JSON array. Each object must conform to:

{
  "type": "EDUCATION" | "EXPERIENCE" | "PROJECT" | "PUBLICATION" | "CERTIFICATION" | "AWARD",
  "title": string,
  "organization": string,
  "startDate": string,
  "endDate": string,
  "description": string,
  "skills": string[]
}

Return no explanatory text. Only the JSON array.`

type ResumeDraft = {
  type: PortfolioType
  title: string
  organization: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  skills: string[]
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const { text } = await req.json()
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: RESUME_IMPORT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const rawText = response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')

  let parsed: unknown
  try {
    const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Unexpected AI response shape' }, { status: 500 })
  }

  const items: ResumeDraft[] = parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      type: isPortfolioType(item.type) ? item.type : 'EXPERIENCE',
      title: typeof item.title === 'string' ? item.title.trim() : '',
      organization: typeof item.organization === 'string' && item.organization.trim() ? item.organization.trim() : null,
      startDate: typeof item.startDate === 'string' && item.startDate.trim() ? item.startDate.trim() : null,
      endDate: typeof item.endDate === 'string' && item.endDate.trim() ? item.endDate.trim() : null,
      description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : null,
      skills: normalizeSkills(item.skills),
    }))
    .filter((item) => item.title)

  return NextResponse.json({ items })
}
