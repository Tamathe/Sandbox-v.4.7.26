import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { checkRateLimit } from '../../lib/rate-limit'
import { getDataDeskTool } from '../../lib/data-desk'
import { getSystemPrompt, buildUserMessage, buildFormMessage } from '../../lib/data-desk-service'
import { extractPdfText } from '../../lib/pdf-extract'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'GENERATE', user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let slug: string
  let messages: Anthropic.Messages.MessageParam[]
  let model: string

  if (contentType.includes('multipart/form-data')) {
    // File upload (image, PDF, CSV file) or form-based tool
    const formData = await req.formData()
    slug = formData.get('slug') as string
    const file = formData.get('file') as File | null
    const textContent = formData.get('content') as string | null
    const formFields = formData.get('formData') as string | null

    const tool = getDataDeskTool(slug)
    if (!tool) {
      return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
    }
    model = tool.model

    if (tool.inputType === 'form' && formFields) {
      // Presentation Outliner — form fields as JSON
      const parsed = JSON.parse(formFields) as Record<string, string>
      const userMessage = buildFormMessage(parsed)
      messages = [{ role: 'user', content: userMessage }]
    } else if (tool.inputType === 'image' && file) {
      // Chart Explainer — send image as base64
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mediaType = file.type as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
      messages = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: buildUserMessage(slug, '') },
        ],
      }]
    } else if (tool.inputType === 'pdf' && file) {
      // Report Summarizer — extract PDF text
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const { text } = await extractPdfText(buffer)
      if (!text.trim()) {
        return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 })
      }
      const userMessage = buildUserMessage(slug, text)
      messages = [{ role: 'user', content: userMessage }]
    } else if (tool.inputType === 'text' && (file || textContent)) {
      // Survey Analyzer — file upload or pasted text
      let content = textContent ?? ''
      if (file) {
        content = await file.text()
      }
      if (!content.trim()) {
        return NextResponse.json({ error: 'No content provided' }, { status: 400 })
      }
      const userMessage = buildUserMessage(slug, content)
      messages = [{ role: 'user', content: userMessage }]
    } else {
      return NextResponse.json({ error: 'Missing required file or content' }, { status: 400 })
    }
  } else {
    // JSON body — for text paste or form-based tools
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { slug: string; content?: string; formData?: Record<string, string> }
    slug = body.slug

    const tool = getDataDeskTool(slug)
    if (!tool) {
      return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
    }
    model = tool.model

    if (tool.inputType === 'form' && body.formData) {
      const userMessage = buildFormMessage(body.formData)
      messages = [{ role: 'user', content: userMessage }]
    } else if (body.content?.trim()) {
      const userMessage = buildUserMessage(slug, body.content)
      messages = [{ role: 'user', content: userMessage }]
    } else {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }
  }

  const systemPrompt = getSystemPrompt(slug)
  const client = new Anthropic()
  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  }, { signal: AbortSignal.timeout(120_000) })

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
        console.error('Data Desk stream error:', err)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        const isTimeout = err instanceof Error && err.message.includes('abort')
        const userMsg = isRateLimit
          ? 'The AI service is temporarily busy. Please wait a moment and try again.'
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
})
