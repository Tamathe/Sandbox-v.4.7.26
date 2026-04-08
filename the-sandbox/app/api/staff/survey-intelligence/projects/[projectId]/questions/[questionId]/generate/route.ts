import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../../lib/api-utils'
import { prisma } from '../../../../../../../../lib/prisma'
import { searchEvidenceDual } from '../../../../../../../../lib/staff/survey-vault-service'
import { getGeneratePrompt, parseGenerationOutput } from '../../../../../../../../lib/staff/survey-intelligence-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string; questionId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { projectId, questionId } = await params

  // Load question
  const question = await prisma.surveyQuestion.findUnique({
    where: { id: questionId },
    include: { project: { select: { title: true, surveyOrg: true } } },
  })
  if (!question || question.projectId !== projectId) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Search evidence
  const { vaultResults, ukNowResults } = await searchEvidenceDual(question.questionText, {
    categories: [question.category],
    topKVault: 10,
    topKUKNow: 8,
  })

  // Build prompt
  const systemPrompt = getGeneratePrompt({
    questionNumber: question.questionNumber,
    questionText: question.questionText,
    category: question.category,
    wordLimit: question.wordLimit,
    writingTips: question.writingTips,
    projectTitle: question.project.title,
    surveyOrg: question.project.surveyOrg,
    vaultEvidence: vaultResults,
    ukNowEvidence: ukNowResults,
  })

  // Stream with Sonnet, max_tokens 4096, timeout 120s
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  const stream = anthropic.messages.stream(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the survey response based on the evidence provided.' }],
    },
    { signal: controller.signal },
  )

  let fullText = ''
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              ctrl.enqueue(encoder.encode(event.delta.text))
            }
          }

          // After stream completes, persist the draft
          const parsed = parseGenerationOutput(fullText)
          await prisma.surveyQuestion.update({
            where: { id: questionId },
            data: {
              draftResponse: parsed.draftResponse || fullText,
              draftVersion: { increment: 1 },
              status: 'drafted',
              evidenceTable: parsed.evidenceTable.length > 0 ? parsed.evidenceTable : undefined,
              gapAnalysis: parsed.gapAnalysis.length > 0 ? parsed.gapAnalysis : undefined,
              searchMetadata: {
                vaultChunkIds: vaultResults.map(v => v.chunkId),
                ukNowArticleIds: ukNowResults.map(u => u.articleId),
                searchedAt: new Date().toISOString(),
              },
            },
          })

          // Create version record
          const currentVersion = question.draftVersion + 1
          await prisma.surveyQuestionResponse.create({
            data: {
              questionId,
              version: currentVersion,
              content: parsed.draftResponse || fullText,
              generatedBy: 'ai',
              evidenceIds: vaultResults.map(v => v.chunkId),
              ukNowIds: ukNowResults.map(u => u.articleId),
            },
          })
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            ctrl.enqueue(encoder.encode('\n\n_Request timed out._'))
          }
        } finally {
          clearTimeout(timeout)
          ctrl.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
})
