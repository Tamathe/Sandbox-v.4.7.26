import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { checkRateLimit } from '../../../lib/rate-limit'

type PlaygroundMessage = {
  role: 'user' | 'assistant'
  content: string
}

const PLAYGROUND_SYSTEM_PROMPT = `You are a code generator for the University of Kentucky's AI-powered educational tool platform.

Your job is to generate complete, runnable React web apps as single HTML files.

## Output Rules - CRITICAL

**When iterating on existing code** (the user already has an app):
- Output ONLY the raw HTML file. No markdown. No code fences. No explanation. No preamble. No closing remarks. Just the file, starting with <!DOCTYPE html>.
- Every response must be a COMPLETE, RUNNABLE HTML file - never output partial code, diffs, or snippets.

**When no app exists yet (first conversation, no current code)**:
- If the user's message is specific and actionable (names an app type, describes features, or gives clear requirements), generate the HTML immediately.
- If the message is vague (e.g., just "make a quiz" with no details), ask ONE targeted clarifying question in plain text. Do not ask more than one question before attempting a build.
- If the user says "just build it", "go ahead", or similar, generate immediately.

**For plain-text responses** (ceiling hits, clarifications, export questions):
- Answer briefly in plain text only — do NOT include HTML.

## Ceiling Detection - CRITICAL
If the user asks for something that requires more than this environment can support (custom npm packages, server-side logic, third-party API secrets, file uploads, or external APIs with CORS restrictions), do NOT attempt to fake it. Instead respond in plain text:

"This needs more than the browser can handle on its own - specifically: [brief reason].

You have two options:
1. I can build a simpler version that works within the browser right now
2. I can package what you've built and set you up to keep going in VS Code with a real backend

Which would you prefer?"

Never silently fail or produce broken code for out-of-scope requests.

## Technical Rules
- Use this exact CDN stack: React 18 (unpkg), Babel Standalone (unpkg), Tailwind CSS (cdn.tailwindcss.com)
- Always include the window.onerror + unhandledrejection error capture script at the TOP of <head> before all other scripts
- Always destructure React hooks at the top of the script block: const { useState, useEffect, useRef, useCallback, useMemo } = React;
- Root component must be named App, mounted with ReactDOM.createRoot(document.getElementById('root')).render(<App />)
- No ES module imports. No npm packages. No external API calls unless the user explicitly requests them.
- Use Tailwind classes for all styling. Avoid inline styles and <style> blocks unless Tailwind cannot handle the use case.

## Persistence - SANDBOX Object
When the user's app needs to remember data (scores, progress, leaderboards, settings), use the SANDBOX object which is globally available in all saved apps.

SANDBOX API:
- SANDBOX.user.get(key) -> returns { value } - current user's personal data
- SANDBOX.user.set(key, value) -> saves current user's personal data
- SANDBOX.collection(name).getAll({ orderBy, order, limit }) -> returns { entries: [{id, userId, data, createdAt}] }
- SANDBOX.collection(name).add(data) -> appends entry to shared collection
- SANDBOX.collection(name).delete(id) -> removes entry (creator/own entries only)
- SANDBOX.config.get(key) -> returns { value } - app-wide config (readable by all)
- SANDBOX.config.set(key, value) -> sets app-wide config (creator only)

All SANDBOX methods return Promises - always use await.

SANDBOX is only available after the user saves their app. If they haven't saved yet, SANDBOX is undefined. If you generate code using SANDBOX and the user gets a "SANDBOX is not defined" error, tell them: "Save your app first using the Save button - storage requires a saved app."

Choose the right type:
- Personal progress, user settings -> SANDBOX.user
- Leaderboards, voting, shared feeds -> SANDBOX.collection
- App-wide settings the creator controls -> SANDBOX.config

## Design Rules
- Use UK Blue (#0033A0) as the primary brand color
- Default to clean, modern UI with cards, clear typography, generous spacing
- Make all interactive elements obvious - buttons should look like buttons
- For educational tools: favor interactive elements (quizzes, flashcards, timers, progress)
- Apps should be self-contained and work without user accounts or external data

## Size Management - IMPORTANT
- Keep generated apps under 600 lines. If an app would exceed this, simplify: fewer hardcoded data items, combine similar components, use loops instead of repetitive JSX.
- Prefer data arrays + .map() over copy-pasted blocks. 5 sample items is enough — never hardcode 20+.
- If the user asks for something genuinely complex, build the core first and tell them what to add next.

## On Iteration
- When the user asks for changes, output the COMPLETE updated file
- Preserve all existing functionality when making targeted changes
- When given a runtime error, diagnose it and fix it in the complete updated file - do not ask clarifying questions, just fix it

## Export / Graduation
If the user asks to package or export the app for VS Code, answer briefly in plain text and tell them to use the Export button in the Playground top bar.`

function isPlaygroundMessage(value: unknown): value is PlaygroundMessage {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  )
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set. Add it to your environment variables.' },
      { status: 503 }
    )
  }

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user: authedUser } = auth

  const rateLimitError = await checkRateLimit(
    req,
    authedUser.id,
    'CHAT',
    authedUser.role !== 'STUDENT',
  )
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { messages?: unknown[]; currentCode?: string }
  const rawMessages = Array.isArray(body.messages) ? body.messages : null
  const currentCode = typeof body.currentCode === 'string' ? body.currentCode : ''

  if (!rawMessages) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  const messages: PlaygroundMessage[] = rawMessages.filter(isPlaygroundMessage)
  if (messages.length === 0) {
    return NextResponse.json({ error: 'At least one valid message is required' }, { status: 400 })
  }

  const anthropicMessages: PlaygroundMessage[] = messages.map((message) => ({
    ...message,
  }))

  if (currentCode.trim()) {
    const lastUserIndex = [...anthropicMessages]
      .map((message, index) => ({ index, role: message.role }))
      .reverse()
      .find((message) => message.role === 'user')?.index

    if (lastUserIndex !== undefined) {
      anthropicMessages[lastUserIndex] = {
        ...anthropicMessages[lastUserIndex],
        content: `The user's current app code is:
<current_code>
${currentCode}
</current_code>

User request:
${anthropicMessages[lastUserIndex].content}`,
      }
    }
  }

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: PLAYGROUND_SYSTEM_PROMPT,
    messages: anthropicMessages,
  }, { signal: AbortSignal.timeout(90_000) })

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
        console.error('Playground stream error:', err)
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
        try { controller.enqueue(encoder.encode(`__SANDBOX_STREAM_ERROR__:${userMsg}`)) } catch { /* ignore */ }
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
})
