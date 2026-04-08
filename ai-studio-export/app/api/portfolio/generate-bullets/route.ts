import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const GenerateBulletsSchema = z.object({
  items: z.array(z.unknown()).min(1),
  jobDescription: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const validation = validateBody(GenerateBulletsSchema, parsedBody.data)
    if ('error' in validation) return validation.error
    const { items, jobDescription } = validation.value

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
