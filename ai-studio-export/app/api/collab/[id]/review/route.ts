import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../lib/prisma'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const CollabReviewBodySchema = z.object({
  aiGuidedAnswers: z
    .object({
      clarity: z.string().optional(),
      effectiveness: z.string().optional(),
      suggestions: z.string().optional(),
      overall_impression: z.string().optional(),
    })
    .optional()
    .nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  transcript: z.string().max(50000).optional().nullable(),
})

type GuidedAnswers = {
  clarity?: string
  effectiveness?: string
  suggestions?: string
  overall_impression?: string
}

async function maybeGenerateSummary(reviewId: string, answers: GuidedAnswers) {
  if (!process.env.ANTHROPIC_API_KEY) return

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: `Summarize this structured peer review in exactly 2 concise sentences.\n\nClarity: ${answers.clarity ?? ''}\nEffectiveness: ${answers.effectiveness ?? ''}\nSuggestions: ${answers.suggestions ?? ''}\nOverall impression: ${answers.overall_impression ?? ''}`,
        },
      ],
    })

    const summary = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    if (!summary) return

    await prisma.collabReview.update({
      where: { id: reviewId },
      data: { summary },
    })
  } catch (error) {
    console.error('Collab review summary generation failed:', error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reviewer = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!reviewer) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const collabRequest = await prisma.collabRequest.findUnique({
      where: { id },
      include: {
        tool: {
          select: {
            id: true,
          },
        },
      },
    })
    if (!collabRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CollabReviewBodySchema, parsed.data)
    if ('error' in validation) return validation.error
    const { aiGuidedAnswers = null, rating = null, transcript = null } = validation.value

    const review = await prisma.collabReview.create({
      data: {
        requestId: collabRequest.id,
        reviewerId: reviewer.id,
        aiGuidedAnswers: aiGuidedAnswers ?? undefined,
        rating,
        transcript,
      },
      include: {
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    })

    await prisma.sandTransaction.create({
      data: {
        userId: reviewer.id,
        amount: 4000,
        reason: 'tool_review_demo',
        description: 'Collaborator review reward',
        toolId: collabRequest.tool.id,
      },
    }).catch(() => {})

    if (aiGuidedAnswers) {
      void maybeGenerateSummary(review.id, aiGuidedAnswers)
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('POST /api/collab/[id]/review error:', error)
    return NextResponse.json({ error: 'Failed to save collaboration review' }, { status: 500 })
  }
}
