import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../lib/prisma'

export async function POST(req: NextRequest) {
  try {
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

    const { items, jobDescription } = await req.json()
    if (!Array.isArray(items) || !items.length || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return NextResponse.json({ error: 'items and jobDescription are required' }, { status: 400 })
    }

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      system: `You are an expert career coach and resume writer.

I will provide my portfolio experiences and a job description.
Rewrite each experience description into 2-3 compelling, action-oriented bullet points
specifically tailored to the job. Use strong action verbs. Quantify impact where possible.
Apply the STAR method where the data supports it. Highlight skills and outcomes most
relevant to the target role.

Format your response in Markdown. Use the experience title as a heading (##)
followed by its bullet points.`,
      messages: [
        {
          role: 'user',
          content: `My portfolio items:
---
${JSON.stringify(items, null, 2)}
---

Target job description:
---
${jobDescription}
---`,
        },
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (error) {
          console.error('Portfolio bullet stream error:', error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('POST /api/portfolio/generate-bullets error:', error)
    return NextResponse.json({ error: 'Failed to generate bullets' }, { status: 500 })
  }
}
