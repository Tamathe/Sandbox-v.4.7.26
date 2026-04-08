import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { reviewSandcastleSubmission, slugify, type SandcastleReviewResult } from '../../../lib/admin-control-tower'
import { prisma } from '../../../lib/prisma'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const SandcastleSubmitBodySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  systemPrompt: z.string().min(1),
  starterPrompts: z.array(z.string()).min(1),
  tagline: z.string().max(200).optional().nullable(),
  emoji: z.string().max(10).optional().nullable(),
  sandCost: z.number().min(0).optional(),
})

async function getUniqueSlug(baseTitle: string) {
  const base = slugify(baseTitle) || 'sandcastle-experience'

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const existing = await prisma.sandcastleSubmission.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
  }

  return `${base}-${Date.now()}`
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const validation = validateBody(SandcastleSubmitBodySchema, parsedBody.data)
    if ('error' in validation) return validation.error
    const { title, category, description, systemPrompt, starterPrompts, tagline, emoji, sandCost } = validation.value

    const filteredStarterPrompts = starterPrompts.filter((p) => p.trim())
    if (filteredStarterPrompts.length === 0) {
      return NextResponse.json({ error: 'At least one non-empty starterPrompt is required' }, { status: 400 })
    }

    const slug = await getUniqueSlug(title)
    let review: SandcastleReviewResult = {
      verdict: 'HUMAN_REVIEW',
      reason: 'Queued for human review because AI review is unavailable.',
      flags: ['ai_review_unavailable'],
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic()
      review = await reviewSandcastleSubmission({
        client,
        title,
        category,
        description,
        systemPrompt,
        starterPrompts: filteredStarterPrompts,
      })
    }

    const approvalStatus =
      review.verdict === 'AUTO_APPROVE'
        ? 'APPROVED'
        : review.verdict === 'AUTO_REJECT'
          ? 'REJECTED'
          : 'PENDING'

    const submission = await prisma.sandcastleSubmission.create({
      data: {
        slug,
        title,
        category,
        tagline: tagline?.trim() ?? null,
        description,
        emoji: emoji?.trim() ?? null,
        sandCost: Math.max(0, sandCost ?? 0),
        systemPrompt,
        starterPrompts: filteredStarterPrompts,
        approvalStatus,
        aiVerdict: review.verdict,
        aiRejectReason: review.verdict === 'AUTO_REJECT' ? review.reason : null,
        aiFlags: review.flags,
        creatorId: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      {
        submission,
        verdict: review.verdict,
        reason: review.reason,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/sandcastle/submit error:', error)
    return NextResponse.json({ error: 'Failed to submit Sandcastle experience' }, { status: 500 })
  }
}
