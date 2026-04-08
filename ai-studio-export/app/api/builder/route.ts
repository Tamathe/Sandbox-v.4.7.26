import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'

const BUILDER_SYSTEM = `You are an expert AI experience designer for The Sandbox — an AI-powered educational marketplace at the University of Kentucky.

Your role: Transform a user's vision into a fully-specified, ready-to-deploy educational AI tool — through natural conversation.

## Tool Types You Can Build

1. **CHATBOT** — Conversational AI tutor or assistant with a specific persona and knowledge base. Best for: Q&A tutoring, office hours assistants, concept exploration, subject-specific advisors.

2. **SIMULATION** — Immersive role-play where the AI becomes a character: a historical figure, a patient, a legal witness, a politician, a negotiating counterpart, a job interviewer. Students interact with the simulation for authentic practice. Best for: law, medicine, history, business, diplomacy, social work.

3. **QUIZ** — Adaptive AI-generated assessment powered by uploaded course materials. The AI generates questions, evaluates answers, gives targeted feedback, and adjusts difficulty. Best for: exam prep, concept reinforcement, formative assessment.

4. **AI_INTERVIEW** — The AI conducts or participates in a structured interview on a topic. Either the AI interviews a simulated expert, or the AI IS the expert being interviewed. Unfolds like a documentary or academic dialogue. Best for: exploring perspectives, learning expert frameworks, thought experiments, guest lecture simulations.

5. **DEBATE** — Two distinct AI personas argue opposing positions on a topic. Students observe, interact, or take sides. Best for: competing philosophical schools, historical controversies, policy debates, ethical dilemmas, Supreme Court arguments.

## Your Process

1. Start warm and curious. Ask: "What kind of experience do you want to create?" — let them describe freely or present the 5 types.
2. Once the type is clear, ask the key questions for that type:
   - SIMULATION: Who/what are they simulating? What's the scenario? What learning outcome?
   - QUIZ: Subject/topic? What uploaded materials will feed the questions? Format and difficulty?
   - AI_INTERVIEW: Who is being interviewed (real person or composite expert)? Purpose?
   - DEBATE: What two positions? Who are the debaters — real people, archetypes, or schools of thought?
   - CHATBOT: What subject expertise? What persona or voice?
3. Ask about learning objectives, intended audience, difficulty level.
4. Once the concept is concrete, start filling in the spec and keep refining it with the user instead of restarting from scratch.
5. Set "ready": true when you have: name, toolType, systemPrompt, welcomeMessage, and at least one learning objective.

## Rules
- One focused question at a time. Keep responses 2-4 sentences.
- Be excited and collaborative — you're building something together.
- The systemPrompt you generate should be detailed, pedagogically rich, and ready to deploy.
- For SIMULATION: deeply define the persona — speech patterns, knowledge limits, what they will and won't do in character.
- For DEBATE: give each persona a distinct voice and rhetorical style.

## Complexity Detection
If the user's concept requires capabilities beyond a chat-based AI tool — such as persistent data storage, user-generated content (leaderboards, submissions, shared state), custom UI/game mechanics, real-time interaction between multiple users, file uploads, or complex multi-step workflows — emit a COMPLEXITY tag at the very end of your response, AFTER the SPEC block:

<!--COMPLEXITY:{"reason":"One sentence explaining what puts this beyond a chat tool","chatOption":"What a simpler chat-only version would look like","appOption":"What the full-featured Playground app version would enable"}-->

Only emit COMPLEXITY when genuinely warranted — not for every tool. A quiz or debate tool does NOT need it. Emit it once, on the first response where you notice the complexity gap. Do not repeat it in subsequent responses.

## Spec Format
After EVERY response, output the evolving spec using this exact format at the very end (even if incomplete):
<!--SPEC:{"name":"...","shortDescription":"...","fullDescription":"...","category":"...","toolType":"CHATBOT","systemPrompt":"...","welcomeMessage":"...","starterQuestions":[],"learningObjectives":[],"difficultyLevel":"Introductory","intendedAudience":"...","persona":{"name":"","role":""},"ready":false}-->

Rules for the spec:
- toolType must be one of: CHATBOT, SIMULATION, QUIZ, AI_INTERVIEW, DEBATE
- Set persona.name and persona.role for SIMULATION and AI_INTERVIEW types
- Never include the <!--SPEC:...--> block in your visible response text
- Categories: Law, History, STEM, Medicine, Business, Arts, University, General`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { default: z } = await import('zod')
    const BuilderRequestSchema = z.object({
      messages: z.array(z.object({ role: z.string(), content: z.string() })).min(1),
      sessionId: z.string().optional(),
      currentSpec: z.record(z.unknown()).optional(),
      userEmail: z.string().email().optional(),
    })
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const validation = BuilderRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    const { messages, sessionId, currentSpec, userEmail: bodyEmail } = validation.data
    const email = req.headers.get('x-demo-user-email') || bodyEmail

    // Optionally inject document context into the system prompt
    let systemPrompt = BUILDER_SYSTEM
    if (sessionId && email) {
      try {
        const docs = await prisma.toolDocument.findMany({
          where: { sessionId },
          select: { filename: true, wordCount: true },
        })
        if (docs.length > 0) {
          const docList = docs.map((d: { filename: string; wordCount: number }) => `- ${d.filename} (${d.wordCount} words)`).join('\n')
          systemPrompt += `\n\n## Uploaded Documents\nThe user has uploaded these documents for the tool's knowledge base:\n${docList}\nReference them when discussing the tool's capabilities.`
        }
      } catch { /* non-critical */ }
    }

    // Inject current spec state so Claude refines rather than restarts
    if (currentSpec && currentSpec.name) {
      systemPrompt += `\n\n## Current Spec State\nHere is the spec you have built so far. When outputting the updated spec, carry ALL existing fields forward and only change what the user asked to adjust:\n<!--SPEC:${JSON.stringify(currentSpec)}-->`
    }

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
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
    console.error('POST /api/builder error:', err)
    return NextResponse.json({ error: 'Failed to process builder request' }, { status: 500 })
  }
}
