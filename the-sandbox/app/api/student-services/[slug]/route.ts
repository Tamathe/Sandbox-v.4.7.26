import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  requireStudentUser,
  parseRequestBody,
  isAuthFailure,
} from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getStudentServiceTool } from '../../../lib/student-services'
import {
  buildServiceSystemPrompt,
  checkForPetitionTrigger,
  type StudentAdvisorContext,
} from '../../../lib/service-chat-service'
import { checkRateLimit } from '../../../lib/rate-limit'
import { prisma } from '../../../lib/prisma'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = await requireStudentUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'CHAT', user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          'This is a demo deployment — AI chat is disabled. To enable it, add an ANTHROPIC_API_KEY environment variable.',
      },
      { status: 503 },
    )
  }

  // ── Route params ──────────────────────────────────────────────────────
  const { slug } = await params
  const toolDef = getStudentServiceTool(slug)
  if (!toolDef) {
    return NextResponse.json({ error: 'Service tool not found' }, { status: 404 })
  }

  // ── Body parsing ──────────────────────────────────────────────────────
  const parsed = await parseRequestBody<{ messages: { role: string; content: string }[] }>(req)
  if ('error' in parsed) return parsed.error
  const { messages } = parsed.data

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  const anthropicMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const lastUserMessage =
    [...anthropicMessages].reverse().find((m) => m.role === 'user')?.content ?? ''

  // Student profile injection for academic-advisor
  let studentContext: StudentAdvisorContext | null = null
  if (slug === 'academic-advisor') {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: user.id },
      include: { course: { select: { courseCode: true, title: true } } },
    })
    studentContext = {
      college: user.college ?? 'Not declared',
      program: user.program ?? 'Not declared',
      catalogYear: user.catalogYear ?? 'Unknown',
      enrolledCourses: enrollments.map(
        (e) => `${e.course.courseCode} — ${e.course.title}`
      ),
    }
  }

  // ── System prompt (crisis detection + RAG + escalation footer) ────────
  const systemPrompt = await buildServiceSystemPrompt({
    tool: toolDef,
    messages,
    lastUserMessage,
    studentContext,
  })

  // ── Stream ────────────────────────────────────────────────────────────
  const client = new Anthropic()

  const stream = client.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    },
    { signal: AbortSignal.timeout(60_000) },
  )

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let fullAssistantResponse = ''

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
        console.error(`[student-services/${slug}] Stream error:`, err)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        const isTimeout = err instanceof Error && err.message.includes('abort')
        const userMsg = isRateLimit
          ? 'The AI service is temporarily busy. Please wait a moment and try again.'
          : isTimeout
            ? 'The request timed out. Please try again.'
            : 'Something went wrong. Please try again.'
        try {
          controller.enqueue(encoder.encode(`\n\n_${userMsg}_`))
        } catch {
          /* ignore enqueue after close */
        }
      } finally {
        // Check for petition trigger on financial-aid-appeal tool
        if (toolDef.petitionEnabled && fullAssistantResponse) {
          const petitionResult = await checkForPetitionTrigger(
            fullAssistantResponse,
            user.id,
            toolDef,
          ).catch((err) => {
            console.error('[student-services] petition trigger error:', err)
            return null
          })
          if (petitionResult?.petitionId) {
            try {
              controller.enqueue(
                encoder.encode(`\n[PETITION_CREATED:${petitionResult.petitionId}]`),
              )
            } catch {
              /* stream already closed by client disconnect */
            }
          }
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
})
