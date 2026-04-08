import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDatasetById, parseReference } from '../../lib/datasets'
import { prisma } from '../../lib/prisma'

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
    const rateLimitKey =
      req.headers.get('x-demo-user-email') ??
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

    const body = await req.json()
    const { toolId, messages, sessionId, courseId } = body

    if (!toolId || !messages) {
      return NextResponse.json({ error: 'toolId and messages are required' }, { status: 400 })
    }

    const { mode } = body // 'tutor' | 'quiz' | 'flashcards' â€” only used for STUDY_BUDDY

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        toolType: true,
        systemPrompt: true,
        personaName: true,
        personaAvatar: true,
        welcomeMessage: true,
        referenceDocUrls: true,
      },
    })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    const isStudyBuddy = tool.toolType === 'STUDY_BUDDY'
    if (tool.toolType !== 'CHATBOT' && !isStudyBuddy) {
      return NextResponse.json({ error: 'Tool is not a chatbot' }, { status: 400 })
    }

    const personaName = tool.personaName?.trim() || 'Sandy'
    let systemPrompt =
      tool.systemPrompt ||
      `You are Sandy, a helpful educational AI assistant on The Sandbox platform at the University of Kentucky. You help students learn by asking good questions, providing clear explanations, and encouraging deeper thinking. Always be encouraging, accurate, and pedagogically sound.`

    if (courseId) {
      const courseLink = await prisma.courseToolLink.findUnique({
        where: {
          courseId_toolId: {
            courseId: String(courseId),
            toolId,
          },
        },
        select: {
          syllabusContext: true,
        },
      }).catch(() => null)

      if (courseLink?.syllabusContext?.trim()) {
        systemPrompt = `${systemPrompt}\n\n---\nINSTRUCTOR CONTEXT FOR THIS SESSION:\n${courseLink.syllabusContext.trim()}\n---`
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
        quiz: `You are a quiz master. Generate questions drawn exclusively from the provided course materials. Present ONE question at a time. After the student answers, give detailed feedback â€” what they got right, what they missed, and the correct answer with context. Then ask if they want another question. Vary question types (multiple choice, short answer, concept application).`,
        flashcards: `You are a flashcard study partner. Present flashcards drawn from the provided course materials. Show the question or term first, wait for the student's response, then reveal the complete answer with additional context. After each card, ask if they want to continue or revisit it. Keep track of cards they find difficult.`,
      }

      const modePrompt = STUDY_BUDDY_MODES[mode] || STUDY_BUDDY_MODES.tutor
      const toolContext = tool.systemPrompt ? `\n\nAdditional context from the educator: ${tool.systemPrompt}` : ''

      if (docs.length > 0) {
        // Truncate to ~120K chars total to stay well within context window
        let docContext = ''
        let charCount = 0
        for (const doc of docs) {
          const section = `\n\n--- Document: ${doc.filename} ---\n${doc.content}`
          if (charCount + section.length > 120000) break
          docContext += section
          charCount += section.length
        }
        systemPrompt = `${modePrompt}${toolContext}\n\n## Course Materials\n${docContext}`
      } else {
        systemPrompt = `${modePrompt}${toolContext}\n\nNote: No course documents have been loaded yet. Let the student know they can upload their materials using the upload button, or answer general questions as best you can.`
      }
    }

    const linkedDatasetContext = buildLinkedDatasetContext(tool.referenceDocUrls)
    if (linkedDatasetContext) {
      systemPrompt = `${systemPrompt}${linkedDatasetContext}`
    }

    {
      const memEmail = req.headers.get('x-demo-user-email')
      if (memEmail) {
        const memUser = await prisma.user
          .findUnique({
            where: { email: memEmail },
            select: { id: true },
          })
          .catch(() => null)

        if (memUser) {
          const memories = await prisma.userMemory
            .findMany({
              where: { userId: memUser.id },
              select: { content: true },
              orderBy: { createdAt: 'asc' },
            })
            .catch(() => [])

          if (memories.length > 0) {
            const memoryBlock = `ABOUT THIS STUDENT (use naturally to personalize â€” do not repeat back verbatim):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`
            systemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
          }
        }
      }
    }

    // Increment session message count + award XP
    const userEmail = req.headers.get('x-demo-user-email')
    if (sessionId) {
      const session = await prisma.toolSession
        .update({
          where: { id: sessionId },
          data: { messageCount: { increment: 1 } },
        })
        .catch(() => null)

      // Award XP for engagement
      if (userEmail && session) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } }).catch(() => null)
        if (user) {
          // Get gamification config for this tool (or use defaults)
          const gamCfg = await prisma.gamificationConfig.findUnique({ where: { toolId } }).catch(() => null)
          const xpPerMsg = gamCfg?.xpPerMessage ?? 2

          await prisma.xPEvent.create({
            data: { userId: user.id, amount: xpPerMsg, reason: 'messages_sent', toolId },
          }).catch(() => {})
          await prisma.user.update({
            where: { id: user.id },
            data: { totalXP: { increment: xpPerMsg } },
          }).catch(() => {})

          // Award session completion XP after 5 messages
          if (session.messageCount === 5) {
            const xpPerSession = gamCfg?.xpPerSession ?? 10
            await prisma.xPEvent.create({
              data: { userId: user.id, amount: xpPerSession, reason: 'session_complete', toolId },
            }).catch(() => {})
            await prisma.user.update({
              where: { id: user.id },
              data: { totalXP: { increment: xpPerSession } },
            }).catch(() => {})
          }
        }
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
    })

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
        } finally {
          if (sessionId && lastUserMessage && fullAssistantResponse.trim()) {
            Promise.all([
              prisma.chatMessage.create({
                data: { sessionId, role: 'user', content: lastUserMessage },
              }),
              prisma.chatMessage.create({
                data: { sessionId, role: 'assistant', content: fullAssistantResponse },
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

