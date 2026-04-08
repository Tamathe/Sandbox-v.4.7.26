import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '../../../lib/rate-limit'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

// Simple in-process cache (per serverless cold start)
const enrichCache = new Map<string, EnrichResult>()

type EnrichResult = {
  confidence: 'high' | 'medium' | 'low'
  profile: {
    name: string
    role: 'EDUCATOR' | 'STUDENT'
    title: string | null
    department: string | null
    college: string | null
  }
  courses: { code: string; name: string }[]
  interests: string[]
}

// POST /api/onboarding/enrich
// Body: { email: string }
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitError = await checkRateLimit(req, null, 'CHAT')
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { email } = parsed.data as { email?: string }

  if (!email || !email.endsWith('@uky.edu')) {
    return NextResponse.json({ error: 'Valid UK email required' }, { status: 400 })
  }

  const lower = email.toLowerCase().trim()

  // Return cached result if available
  const cached = enrichCache.get(lower)
  if (cached) return NextResponse.json(cached, {
    headers: { 'Cache-Control': 'no-store' },
  })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Given the university email "${lower}", generate a realistic UK (University of Kentucky) faculty or student profile.

Parse the name from the email prefix. Use the ".student" suffix to determine if student (e.g. tiana.the.student@uky.edu → student named Tiana The).
For educators, infer college and department from context clues in the email prefix if possible.

Return JSON only, no markdown:
{
  "name": "Full Name",
  "role": "EDUCATOR" or "STUDENT",
  "title": "Associate Professor" or "1L" or "Junior" or null,
  "department": "Department name or null",
  "college": "College name or null",
  "interests": ["tag1", "tag2", "tag3"],
  "confidence": "high" or "medium" or "low",
  "courses": [{"code": "XXX-000", "name": "Course Name"}]
}

Notes:
- courses: educators only, max 2 courses they might teach; empty array for students
- interests: 3-5 relevant academic or professional interest tags
- title: for students use year (1L, Junior, Senior, etc.); for faculty use rank
- confidence: "high" if name is clearly parseable, "medium" if partially, "low" if ambiguous`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const enrichData = JSON.parse(raw) as Record<string, unknown>

  const result: EnrichResult = {
    confidence: (enrichData.confidence as EnrichResult['confidence']) ?? 'medium',
    profile: {
      name: (enrichData.name as string) ?? '',
      role: enrichData.role === 'STUDENT' ? 'STUDENT' : 'EDUCATOR',
      title: (enrichData.title as string | null) ?? null,
      department: (enrichData.department as string | null) ?? null,
      college: (enrichData.college as string | null) ?? null,
    },
    courses: Array.isArray(enrichData.courses) ? (enrichData.courses as { code: string; name: string }[]).slice(0, 2) : [],
    interests: Array.isArray(enrichData.interests) ? (enrichData.interests as string[]).slice(0, 5) : [],
  }

  enrichCache.set(lower, result)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
})
