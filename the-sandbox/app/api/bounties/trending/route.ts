import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response

    const bounties = await prisma.bounty.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: { select: { reviews: true } },
      },
    })

    if (bounties.length === 0) {
      return NextResponse.json({
        summary: 'No open bounties right now — be the first to post a tool request!',
        topBounties: [],
      }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    const titles = bounties.map((b) => `- ${b.title} (${b.category})`).join('\n')

    const anthropic = new Anthropic()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `These are the latest open bounties (tool requests) on a university AI marketplace:\n${titles}\n\nWrite exactly 2 sentences summarizing what educators are looking for right now. Be specific and energetic. No bullet points.`,
        },
      ],
    })

    const summary = msg.content[0].type === 'text' ? msg.content[0].text : ''

    return NextResponse.json({
      summary,
      topBounties: bounties.map((b) => ({
        id: b.id,
        title: b.title,
        claimCount: b._count.reviews,
      })),
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
