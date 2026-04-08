import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { messages, systemPrompt } = await req.json()

    if (!messages || !Array.isArray(messages) || !systemPrompt) {
      return NextResponse.json({ error: 'messages and systemPrompt required' }, { status: 400 })
    }

    let enrichedSystemPrompt = systemPrompt
    const userEmail = req.headers.get('x-demo-user-email')
    if (userEmail) {
      const user = await prisma.user
        .findUnique({
          where: { email: userEmail },
          select: { id: true },
        })
        .catch(() => null)

      if (user) {
        const memories = await prisma.userMemory
          .findMany({
            where: { userId: user.id },
            select: { content: true },
            orderBy: { createdAt: 'asc' },
          })
          .catch(() => [])

        if (memories.length > 0) {
          const memoryBlock = `ABOUT THIS USER (use naturally to personalize — do not repeat back verbatim):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`
          enrichedSystemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
        }
      }
    }

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: enrichedSystemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
        } catch (err) {
          console.error('Sandcastle stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('POST /api/sandcastle error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
