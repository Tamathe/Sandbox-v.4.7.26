import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const BUILDER_SYSTEM = `You are a friendly AI tool builder for The Sandbox, an educational AI tool marketplace at the University of Kentucky.

Your job is to help educators create AI tools through conversation. Ask questions to understand what they want to build, then extract a structured spec.

After EVERY response, output a JSON spec block at the very end using this exact format (even if incomplete):
<!--SPEC:{"name":"...","shortDescription":"...","fullDescription":"...","category":"...","toolType":"CHATBOT","systemPrompt":"...","welcomeMessage":"...","starterQuestions":[],"learningObjectives":[],"difficultyLevel":"Introductory","intendedAudience":"...","ready":false}-->

Rules:
- Be conversational and warm. Ask ONE question at a time.
- Start by asking: what they want to build, who it's for, what students should learn.
- After ~4 exchanges, you should have enough to draft a solid spec.
- Set "ready": true once you have name, description, category, and a system prompt.
- The systemPrompt should be detailed and pedagogically sound — it's the instruction set for the AI.
- Do NOT include the <!--SPEC:...--> text in your visible response — it's hidden from the user.
- Categories: Law, History, STEM, Medicine, Business, Arts, General
- Keep responses concise (2-4 sentences max). This is a conversation, not an essay.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not set. Add it to your environment variables.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const client = new Anthropic()

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: BUILDER_SYSTEM,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }, { signal: AbortSignal.timeout(60_000) })

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
          console.error('Builder stream error:', err)
          const isRateLimit = err instanceof Error && err.message.includes('429')
          const isAuth = err instanceof Error && (err.message.includes('401') || err.message.includes('authentication'))
          const isTimeout = err instanceof Error && err.message.includes('abort')
          const userMsg = isRateLimit
            ? 'The AI service is temporarily busy. Please wait a moment and try again.'
            : isAuth
            ? 'AI service configuration error. Please contact support.'
            : isTimeout
            ? 'The request timed out. Please try again.'
            : 'Something went wrong. Please try again.'
          try { controller.enqueue(encoder.encode(`\n\n_${userMsg}_`)) } catch { /* ignore */ }
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
    console.error('POST /api/build-tool error:', err)
    return NextResponse.json({ error: 'Failed to process builder request' }, { status: 500 })
  }
}
