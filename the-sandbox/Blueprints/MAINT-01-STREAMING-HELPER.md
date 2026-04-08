# Blueprint: Streaming Helper Extraction

> **Sprint Scope:** Extract the copy-pasted Anthropic streaming block from 13+ interview routes into a single shared helper.
> **Estimated Size:** Small (1 prompt, ~15 min)
> **Origin:** Duplication Audit, 2026-03-28

---

## Context

Every `interview/route.ts` across wellness-hub (4), write-room (4), meeting-machine (4), and data-desk (1+) contains the same 40-line streaming block: AbortController with 60s timeout, `anthropic.messages.stream()` with haiku model, `ReadableStream` with `content_block_delta` loop, and identical response headers. The only variation is which service's `getInterviewPrompt` is imported and the slug string.

### Current State

**Identical block in every file:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 60_000)
const stream = anthropic.messages.stream(
  { model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })) },
  { signal: controller.signal },
)
const encoder = new TextEncoder()
return new Response(
  new ReadableStream({
    async start(ctrl) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            ctrl.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch { /* timeout */ }
      finally { clearTimeout(timeout); ctrl.close() }
    },
  }),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
)
```

**Files affected (13+):**
- `app/api/wellness-hub/mindfulness/interview/route.ts`
- `app/api/wellness-hub/habits/interview/route.ts`
- `app/api/wellness-hub/sleep/interview/route.ts`
- `app/api/wellness-hub/journal/interview/route.ts`
- `app/api/write-room/resume-builder/interview/route.ts`
- `app/api/write-room/cover-letter/interview/route.ts`
- `app/api/write-room/linkedin-optimizer/interview/route.ts`
- `app/api/write-room/email-rewriter/interview/route.ts`
- `app/api/meeting-machine/agenda-builder/interview/route.ts`
- `app/api/meeting-machine/minutes-taker/interview/route.ts`
- `app/api/meeting-machine/action-items/interview/route.ts`
- `app/api/meeting-machine/follow-up-drafter/interview/route.ts`
- `app/api/data-desk/chart-explainer/interview/route.ts`
- *(grep for more — pattern: `anthropic.messages.stream` in `interview/route.ts`)*

---

## Implementation

### Step 1: Create the shared helper

**New file:** `app/lib/streaming.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function streamHaikuInterview(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: { maxTokens?: number; timeoutMs?: number }
): Promise<Response> {
  const maxTokens = options?.maxTokens ?? 512
  const timeoutMs = options?.timeoutMs ?? 60_000

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const stream = anthropic.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    },
    { signal: controller.signal },
  )

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              ctrl.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch {
          // timeout or abort
        } finally {
          clearTimeout(timeout)
          ctrl.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
}
```

### Step 2: Update all 13+ interview routes

Each route goes from ~60 lines to ~20 lines. The pattern becomes:

```typescript
import { streamHaikuInterview } from '@/app/lib/streaming'
import { requireRequestUser } from '@/app/lib/server-auth'
import { getInterviewPrompt } from '@/app/lib/[suite]/[tool]-service'

export async function POST(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response

  const { messages, context } = await req.json()
  if (!messages?.length) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  const systemPrompt = getInterviewPrompt(context)
  return streamHaikuInterview(systemPrompt, messages)
}
```

### Step 3: Verify

- `npx tsc --noEmit` — no type errors
- Test one interview from each suite (wellness-hub, write-room, meeting-machine, data-desk) to confirm streaming still works

---

## Risk

**Low.** Pure extraction — no behavior change. Every route produces the same Response object it did before. If any route has customized the streaming params (different model, different max_tokens), the `options` parameter accommodates that.

## Acceptance Criteria

- [ ] `app/lib/streaming.ts` exists with `streamHaikuInterview`
- [ ] All 13+ interview routes import and use the helper
- [ ] No route file contains the inline `ReadableStream` / `content_block_delta` block
- [ ] TypeScript compiles clean
- [ ] Manual test: one interview per suite streams correctly
