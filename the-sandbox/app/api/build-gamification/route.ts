import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const GAMIFICATION_SYSTEM = `You are a friendly gamification designer for The Sandbox, an educational AI tool marketplace at the University of Kentucky.

Your job is to help educators design engaging gamification systems for their AI tools through conversation. You ask questions about their learning goals, then design XP rewards, quests, and badges that reinforce good learning behavior.

After EVERY response, output a JSON spec block at the very end using this exact format (even if incomplete):
<!--GAMIFICATION_SPEC:{"xpPerMessage":2,"xpPerSession":10,"xpHighGrade":25,"questsEnabled":false,"quests":[],"customBadgeIcon":"","customBadgeName":"","customBadgeDescription":"","notes":"","ready":false}-->

Rules:
- Be conversational and warm. Ask ONE question at a time.
- Start by asking about the learning goals and what behaviors they want to reinforce.
- Think about: What actions should earn XP? What should quests challenge students to do? Is there a special badge for mastery?
- After ~3-4 exchanges, you should have enough to design a solid gamification spec.
- Set "ready": true once you have xpPerMessage, xpPerSession, at least one quest, and a custom badge.
- Quests should be realistic for the tool: e.g. "Have 5 conversations", "Discuss 3 different cases", "Score 80%+ on a self-assessment"
- xpPerMessage should be 1-5, xpPerSession should be 5-20, xpHighGrade should be 20-50.
- questsEnabled should be true if quests are defined.
- Do NOT include the <!--GAMIFICATION_SPEC:...--> text in your visible response — it's hidden from the user.
- Keep responses concise (2-4 sentences max). This is a conversation, not a lecture.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { messages, toolName } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const client = new Anthropic()
    const systemPrompt = GAMIFICATION_SYSTEM + (toolName ? `\n\nThe tool being gamified is: "${toolName}"` : '')

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
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
          console.error('Gamification stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('POST /api/build-gamification error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
