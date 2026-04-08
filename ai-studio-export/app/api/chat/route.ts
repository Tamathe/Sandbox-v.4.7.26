import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { classifyConversationTurn, getTokenTotals } from '../../lib/admin-control-tower'
import { getDatasetById, parseReference } from '../../lib/datasets'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { ChatRequestSchema } from '../../lib/schemas'

const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function buildLinkedDatasetContext(referenceDocUrls: string[]) {
  const datasetSections: string[] = []

  for (const reference of referenceDocUrls) {
    const parsed = parseReference(reference)
    if (parsed.type !== 'dataset') continue

    const dataset = getDatasetById(parsed.id)
    if (!dataset) continue

    datasetSections.push(
      [
        `### ${dataset.title}`,
        `Owner: ${dataset.owner}`,
        `Summary: ${dataset.summary}`,
        `Coverage: ${dataset.coverage}`,
        `Tags: ${dataset.tags.join(', ')}`,
      ].join('\n')
    )
  }

  if (datasetSections.length === 0) return ''

  return (
    `\n\n## Linked Dataset Context\n` +
    `Use the linked public dataset notes below to ground your answers when relevant. ` +
    `These notes are not student-specific records. If a question requires account access, ` +
    `personal data, or an official determination, direct the user to the appropriate office.\n\n` +
    datasetSections.join('\n\n')
  )
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitKey =
      user.email ??
      req.headers.get('x-forwarded-for') ??
      'unknown'
    const now = Date.now()
    const existingEntry = rateLimitMap.get(rateLimitKey)

    if (!existingEntry || now - existingEntry.windowStart > 60_000) {
      rateLimitMap.set(rateLimitKey, { count: 0, windowStart: now })
    }

    const rateLimitEntry = rateLimitMap.get(rateLimitKey)!
    rateLimitEntry.count += 1

    if (rateLimitEntry.count > 20) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before sending another message.' },
        { status: 429 }
      )
    }

    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.windowStart > 60_000) {
        rateLimitMap.delete(key)
      }
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'This is a demo deployment â€” AI chat is disabled. To enable it, add an ANTHROPIC_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    const client = new Anthropic()

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(ChatRequestSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { toolId, messages, sessionId, courseId, audioMode, mode } = validation.value

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        toolType: true,
        systemPrompt: true,
        referenceDocUrls: true,
        audioEnabled: true,
        audioSystemSuffix: true,
      },
    })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    const isStudyBuddy = tool.toolType === 'STUDY_BUDDY'
    if (tool.toolType !== 'CHATBOT' && !isStudyBuddy) {
      return NextResponse.json({ error: 'Tool is not a chatbot' }, { status: 400 })
    }

    let systemPrompt =
      tool.systemPrompt ||
      `You are Sandy, a helpful educational AI assistant on The Sandbox platform at the University of Kentucky. You help students learn by asking good questions, providing clear explanations, and encouraging deeper thinking. Always be encouraging, accurate, and pedagogically sound.`

    if (audioMode && tool.audioEnabled && tool.audioSystemSuffix?.trim()) {
      systemPrompt = `${systemPrompt}\n\nAUDIO MODE INSTRUCTIONS:\n${tool.audioSystemSuffix.trim()}`
    }

    if (courseId) {
      const [courseLink, objectives] = await Promise.all([
        prisma.courseToolLink.findUnique({
          where: { courseId_toolId: { courseId: String(courseId), toolId } },
          select: { syllabusContext: true },
        }).catch(() => null),
        prisma.learningObjective.findMany({
          where: { courseId: String(courseId) },
          orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
          select: { id: true, title: true, moduleNumber: true },
        }).catch(() => [] as { id: string; title: string; moduleNumber: number | null }[]),
      ])

      if (courseLink?.syllabusContext?.trim()) {
        systemPrompt = `${systemPrompt}\n\n---\nINSTRUCTOR CONTEXT FOR THIS SESSION:\n${courseLink.syllabusContext.trim()}\n---`
      }

      if (objectives.length > 0) {
        const objList = objectives
          .map((o) => `- [${o.id}] ${o.moduleNumber ? `(Module ${o.moduleNumber}) ` : ''}${o.title}`)
          .join('\n')
        systemPrompt = `${systemPrompt}

## COURSE LEARNING OBJECTIVES
The following learning objectives are mapped to this course. When your response addresses one or more learning objectives, append a hidden tag at the very end (never visible to student):
<!--OBJECTIVES:[{"id":"id1","quality":"green"},{"id":"id2","quality":"yellow"}]-->
- Use "green" when the student demonstrated clear mastery or understanding of the objective.
- Use "yellow" when the student engaged with the objective but showed uncertainty, confusion, or partial understanding.
- Only include objectives your response genuinely covers. Omit objectives not addressed.

${objList}`
      }
    }

    // For Study Buddy tools: inject documents + mode-specific prompt
    if (isStudyBuddy) {
      const docWhere = sessionId
        ? { OR: [{ toolId }, { sessionId }] }
        : { toolId }
      const docs = await prisma.toolDocument.findMany({
        where: docWhere,
        select: { filename: true, content: true },
        orderBy: { createdAt: 'asc' },
      }).catch(() => [])

      const STUDY_BUDDY_MODES: Record<string, string> = {
        tutor: `You are a knowledgeable tutor. Answer the student's questions using ONLY the provided course materials below. Reference specific sections when relevant. If the answer isn't covered in the materials, say so honestly rather than guessing. Be encouraging, clear, and pedagogically helpful.`,
        quiz: `You are a quiz master. Generate questions drawn exclusively from the provided course materials. Present ONE question at a time. After the student answers, give detailed feedback — what they got right, what they missed, and the correct answer with context. Then ask if they want another question. Vary question types (multiple choice, short answer, concept application).`,
        flashcards: `You are a flashcard study partner. Present flashcards drawn from the provided course materials.

CRITICAL FORMAT RULE: Every flashcard you generate MUST use this exact format with no deviation:

**Term:** [the term or concept]
**Definition:** [the definition or explanation in 1-3 sentences]

Then on a new line, write: "Got it? Type 'next' for another card, or ask me to explain further."

Show ONE card at a time. After each card, wait for the student's response before showing the next one. Keep a mental note of cards they find difficult and offer to revisit them at the end.`,
        socratic: `You are a Socratic tutor. Your ONLY allowed responses are questions — you MUST NEVER give direct answers, definitions, explanations, or summaries.

ABSOLUTE RULE: Even if the student says “just tell me”, “I give up”, “please just explain it”, “I don't have time”, or expresses any frustration — you MUST NOT break character. Respond with genuine empathy, then redirect with another question. Example: “I hear you — it's genuinely frustrating. But I promise you're closer than you think. Let's try a different angle: what do you already know about how this concept works in a simpler case?”

If the student is stuck after 3+ attempts, do NOT give the answer — instead:
1. Break the question into a smaller sub-question
2. Ask them to explain what they DO know, even if partial
3. Offer an analogy prompt: “It's a bit like how water flows downhill — what does that make you think of here?”

Your goal is for the student to construct the answer themselves. A student who struggles and arrives at an answer independently retains it far longer than one who was told. Every question you ask is a gift, not a withholding.`,
        'teach-back': `You are playing the role of a curious, somewhat confused student who needs to be taught a concept. The user is the teacher.

PHASE 1 — LEARNING (most of the session):
Ask follow-up questions that probe depth, the way a real confused student would:
- “Wait, I don't understand what you mean by [X] — can you explain that part again?”
- “So does that mean [Y] is ALWAYS true? What about [edge case]?”
- “What happens if [scenario]?”
- “How is this different from [related concept]?”
Stay genuinely curious. Do not ask more than ONE question per turn.

PHASE 2 — FEEDBACK (only after at least 5 exchanges AND the student says something like “did I explain it well?” or “how did I do?” or “am I on the right track?”):
Break out of the student persona and give honest, structured feedback:
1. What they explained clearly and accurately
2. Any gaps, inaccuracies, or missing nuance
3. One thing they could add to make the explanation complete

IMPORTANT: Do NOT give feedback in Phase 1. Do NOT break character to correct mistakes — just ask a question that surfaces the mistake. Let the student find it.`,
        debate: `You are a rigorous debate opponent. The student will state a position. Your job is to argue the OPPOSING side as compellingly as possible — steelman the counterargument, cite relevant reasoning, and challenge weak points in the student's logic. Do not agree with them even if they make good points — push harder, ask for evidence, expose assumptions. After 3-4 exchanges, you may briefly acknowledge the strongest parts of their argument before delivering a final counterargument. The goal is to make the student defend and strengthen their position under pressure.`,
        essay: `You are an expert writing coach and editor. When the student shares an essay draft or writing question, give structured, actionable feedback across these dimensions: (1) Thesis clarity — is the central argument clear and specific? (2) Argument structure — does the logic flow? Are claims supported? (3) Evidence quality — is evidence relevant and properly used? (4) Prose clarity — flag confusing sentences, passive voice, or jargon. (5) Conclusion — does it synthesize rather than just restate? Be honest but constructive. After feedback, offer to work through any specific section in detail. Do not rewrite the essay for them — coach them to improve it themselves.`,
      }

      const modePrompt = STUDY_BUDDY_MODES[mode] || STUDY_BUDDY_MODES.tutor
      const toolContext = tool.systemPrompt ? `\n\nAdditional context from the educator: ${tool.systemPrompt}` : ''

      // Pull CourseMaterial records when courseId is provided
      let courseMaterialContext = ''
      if (courseId) {
        const courseMaterials = await prisma.courseMaterial.findMany({
          where: { courseId: String(courseId), isVisible: true },
          select: { title: true, content: true, moduleNumber: true },
          orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
        }).catch(() => [])

        let charCount = 0
        for (const mat of courseMaterials) {
          const section = `\n\n--- ${mat.moduleNumber ? `Module ${mat.moduleNumber}: ` : ''}${mat.title} ---\n${mat.content}`
          if (charCount + section.length > 80000) break // leave headroom for ToolDocuments
          courseMaterialContext += section
          charCount += section.length
        }
      }

      // ToolDocuments (uploaded by educator or student) — appended after course materials
      let toolDocContext = ''
      if (docs.length > 0) {
        let charCount = courseMaterialContext.length
        for (const doc of docs) {
          const section = `\n\n--- Document: ${doc.filename} ---\n${doc.content}`
          if (charCount + section.length > 120000) break
          toolDocContext += section
          charCount += section.length
        }
      }

      const combinedContext = courseMaterialContext + toolDocContext

      if (combinedContext.trim()) {
        systemPrompt = `${modePrompt}${toolContext}\n\n## Course Materials\n${combinedContext}`
      } else {
        systemPrompt = `${modePrompt}${toolContext}\n\nNote: No course documents have been loaded yet. Let the student know they can upload their materials using the upload button, or answer general questions as best you can.`
      }
    }

    const linkedDatasetContext = buildLinkedDatasetContext(tool.referenceDocUrls)
    if (linkedDatasetContext) {
      systemPrompt = `${systemPrompt}${linkedDatasetContext}`
    }

    {
      const memories = await prisma.userMemory
        .findMany({
          where: { userId: user.id },
          select: { content: true },
          orderBy: { createdAt: 'asc' },
        })
        .catch(() => [])

      if (memories.length > 0) {
        const memoryBlock = `ABOUT THIS STUDENT (use naturally to personalize â€” do not repeat back verbatim):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`
        systemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
      }
    }

    // Increment session message count + award XP
    if (sessionId) {
      const session = await prisma.toolSession
        .update({
          where: { id: sessionId },
          data: { messageCount: { increment: 1 } },
        })
        .catch(() => null)

      if (session) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSeenAt: new Date() },
        }).catch(() => {})
      }
    }

    const anthropicMessages = messages
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    const lastUserMessage =
      [...anthropicMessages].reverse().find((message) => message.role === 'user')?.content ?? ''
    let fullAssistantResponse = ''

    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: isStudyBuddy ? 2048 : 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    }, { signal: AbortSignal.timeout(60_000) })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullAssistantResponse += chunk.delta.text
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
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
          let inputTokens = 0
          let outputTokens = 0
          let tokensUsed = 0
          let flagged = false
          let flagCategory: string | null = null
          let flagReason: string | null = null

          try {
            const finalMessage = await stream.finalMessage()
            const totals = getTokenTotals(finalMessage.usage)
            inputTokens = totals.inputTokens
            outputTokens = totals.outputTokens
            tokensUsed = totals.tokensUsed
          } catch (usageError) {
            console.error('Failed to capture Anthropic usage:', usageError)
          }

          if (lastUserMessage && fullAssistantResponse.trim()) {
            try {
              const moderation = await classifyConversationTurn({
                client,
                toolName: tool.name,
                userMessage: lastUserMessage,
                assistantResponse: fullAssistantResponse,
              })
              flagged = moderation.flagged
              flagCategory = moderation.category
              flagReason = moderation.reason
            } catch (moderationError) {
              console.error('Chat moderation failed:', moderationError)
            }
          }

          if (sessionId && lastUserMessage && fullAssistantResponse.trim()) {
            Promise.all([
              prisma.chatMessage.create({
                data: { sessionId, role: 'user', content: lastUserMessage },
              }),
              prisma.chatMessage.create({
                data: {
                  sessionId,
                  role: 'assistant',
                  content: fullAssistantResponse,
                  flagged,
                  flagCategory,
                  flagReason,
                  tokensUsed,
                  inputTokens,
                  outputTokens,
                },
              }),
            ]).catch(console.error)
          }
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
    console.error('POST /api/chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}

