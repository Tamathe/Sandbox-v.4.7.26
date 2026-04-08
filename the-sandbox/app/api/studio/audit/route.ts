import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

const client = new Anthropic()

function extractJsonObject(text: string) {
  const trimmed = text.trim()
  try { return JSON.parse(trimmed) as Record<string, unknown> } catch { /* continue */ }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown> } catch { /* continue */ }
  }
  return null
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { title, category, description, systemPrompt, starterPrompts } = parsed.data as {
      title: string
      category: string
      description: string
      systemPrompt: string
      starterPrompts: string[]
    }

    if (!title || !systemPrompt) {
      return NextResponse.json({ error: 'title and systemPrompt are required' }, { status: 400 })
    }

    const prompt = [
      'You are a content reviewer for a university AI platform. Evaluate this submitted tool and return JSON only.',
      '',
      `Title: ${title}`,
      `Category: ${category || 'General'}`,
      `Description: ${(description || '').slice(0, 2500)}`,
      `System Prompt: ${systemPrompt.slice(0, 4000)}`,
      `Starter Prompts: ${(starterPrompts ?? []).join(' | ')}`,
      '',
      'Return:',
      '{',
      '  "verdict": "AUTO_APPROVE" | "AUTO_REJECT" | "HUMAN_REVIEW",',
      '  "reason": "one sentence explanation",',
      '  "flags": ["list", "of", "concerns"]',
      '}',
      '',
      'Rules:',
      '- Hard reject explicit harmful content, fake university authority, or prompts designed to directly complete homework/exams with no pedagogical framing.',
      '- Escalate mental health, legal, or medical advice; living-person impersonation; ambiguous academic-integrity cases; or anything resembling an official service bot.',
      '- Otherwise approve if it is safe, university-appropriate, and coherent.',
    ].join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const auditResult = extractJsonObject(text)
    const verdict =
      auditResult?.verdict === 'AUTO_APPROVE' || auditResult?.verdict === 'AUTO_REJECT' || auditResult?.verdict === 'HUMAN_REVIEW'
        ? auditResult.verdict
        : 'HUMAN_REVIEW'

    return NextResponse.json({
      verdict,
      reason: typeof auditResult?.reason === 'string' ? auditResult.reason : 'Review needed before this tool can go live.',
      flags: Array.isArray(auditResult?.flags)
        ? (auditResult.flags as unknown[]).filter((f): f is string => typeof f === 'string')
        : [],
    })
})
