import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are an AI teaching assistant embedded in a course map builder for university educators.
You help educators improve their course structure, identify gaps, and optimize learning paths.
Keep responses concise and actionable. Use markdown formatting (bold, lists) for clarity.
When suggesting improvements, be specific and practical.`

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { action, question, context, nodeContext } = parsed.data as {
    action: 'ask' | 'improve-node' | 'summarize' | 'structure' | 'resources'
    question?: string
    context: string
    nodeContext?: {
      label: string
      nodeType: string
      unitDescription: string | null
      modules: { label: string; lessonCount: number }[]
      incomingEdges: { fromLabel: string; edgeType: string }[]
      outgoingEdges: { toLabel: string; edgeType: string }[]
    }
  }

  let userMessage = ''

  switch (action) {
    case 'ask':
      userMessage = `Course map context:\n${context}\n\nQuestion: ${question}`
      break
    case 'improve-node':
      userMessage = `Course map context:\n${context}\n\nAnalyze this node and suggest specific improvements:\n` +
        `Node: "${nodeContext?.label}" (${nodeContext?.nodeType})\n` +
        `Description: ${nodeContext?.unitDescription || 'None'}\n` +
        `Modules: ${nodeContext?.modules?.map((m) => `${m.label} (${m.lessonCount} lessons)`).join(', ') || 'None'}\n` +
        `Prerequisites from: ${nodeContext?.incomingEdges?.map((e) => e.fromLabel).join(', ') || 'None'}\n` +
        `Leads to: ${nodeContext?.outgoingEdges?.map((e) => e.toLabel).join(', ') || 'None'}`
      break
    case 'summarize':
      userMessage = `Generate a clear narrative summary of this course structure:\n${context}`
      break
    case 'structure':
      userMessage = `Course map context:\n${context}\n\nStructure analysis question: ${question}`
      break
    case 'resources':
      userMessage = `Course map context:\n${context}\n\n${question}`
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const answer = textBlock?.type === 'text' ? textBlock.text : 'No response generated.'

  return NextResponse.json({ answer })
})
