import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getFileCleanerSystemPrompt,
  parseCleanerResponse,
  generateScripts,
  type FileCleanerAnalyzeRequest,
} from '../../../../lib/file-cleaner-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as FileCleanerAnalyzeRequest

  if (!body.fileList?.trim()) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const systemPrompt = getFileCleanerSystemPrompt(body)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Analyze and rename these files now. Output only the JSON.' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const analysis = parseCleanerResponse(text)

  if (!analysis) {
    return NextResponse.json({ error: 'Failed to parse analysis', raw: text }, { status: 500 })
  }

  const scripts = generateScripts(analysis.renames)

  return NextResponse.json({
    ...analysis,
    powershellScript: scripts.powershell,
    bashScript: scripts.bash,
  })
})
