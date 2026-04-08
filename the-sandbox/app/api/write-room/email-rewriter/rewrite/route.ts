import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getIntentDetectionPrompt,
  parseIntent,
  getVariantPrompt,
  getVariantLabel,
  type RewriteRequest,
  type VariantId,
} from '../../../../lib/email-rewriter-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<RewriteRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { originalEmail, preflight } = body
  if (!originalEmail?.trim() || !preflight) {
    return NextResponse.json({ error: 'Missing originalEmail or preflight' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try {
          // Step 1: Intent detection (non-streaming, fast)
          const intentPrompt = getIntentDetectionPrompt(originalEmail, preflight)
          const intentResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            system: intentPrompt.system,
            messages: [{ role: 'user', content: intentPrompt.user }],
          })

          const intentRaw =
            intentResponse.content[0].type === 'text' ? intentResponse.content[0].text : '{}'
          const intent = parseIntent(intentRaw)

          // Emit intent event
          ctrl.enqueue(
            encoder.encode(
              `event: intent\ndata: ${JSON.stringify(intent)}\n\n`,
            ),
          )

          // Step 2: Generate 3 variants in parallel
          const variantIds: VariantId[] = ['polished', 'warm', 'concise']

          const streams = variantIds.map((vid) => {
            const prompt = getVariantPrompt(vid, originalEmail, intent, preflight)
            return {
              id: vid,
              label: getVariantLabel(vid, intent),
              stream: anthropic.messages.stream({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: prompt.system,
                messages: [{ role: 'user', content: prompt.user }],
              }),
            }
          })

          // Process all streams concurrently
          await Promise.all(
            streams.map(async ({ id, label, stream }) => {
              try {
                for await (const event of stream) {
                  if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'text_delta'
                  ) {
                    ctrl.enqueue(
                      encoder.encode(
                        `event: variant\ndata: ${JSON.stringify({ id, label, chunk: event.delta.text })}\n\n`,
                      ),
                    )
                  }
                }
              } catch (err) {
                // One variant failed — emit error event for it
                console.error(`Variant ${id} stream error:`, err)
                ctrl.enqueue(
                  encoder.encode(
                    `event: variant-error\ndata: ${JSON.stringify({ id, label })}\n\n`,
                  ),
                )
              }
            }),
          )

          // Step 3: Done
          ctrl.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
        } catch (err) {
          console.error('Email rewrite stream error:', err)
          ctrl.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: 'Something went wrong. Please try again.' })}\n\n`,
            ),
          )
        } finally {
          ctrl.close()
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
  )
})
