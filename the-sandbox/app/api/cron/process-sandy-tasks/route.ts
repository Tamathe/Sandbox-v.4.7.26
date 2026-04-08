import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const tasks = await prisma.sandyAsyncTask.findMany({
    where: { status: 'QUEUED' },
    orderBy: { queuedAt: 'asc' },
    take: 5,
    include: { user: { select: { name: true, email: true, department: true } } },
  })

  if (tasks.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Mark all tasks as PROCESSING in one batch
  await prisma.sandyAsyncTask.updateMany({
    where: { id: { in: tasks.map(t => t.id) } },
    data: { status: 'PROCESSING', startedAt: new Date() },
  })

  const anthropic = new Anthropic()
  let processed = 0

  const results = await Promise.allSettled(tasks.map(async (task) => {
    try {
      // Determine model based on task complexity
      const isSimple = task.prompt.length < 200
      const model = isSimple ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'

      const contextStr = task.context
        ? `\n\nAdditional context:\n${JSON.stringify(task.context, null, 2)}`
        : ''

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: `You are Sandy, the AI assistant at the University of Kentucky. A faculty member has queued this task for you to complete overnight. Produce a thorough, well-structured response in markdown format. The faculty member is ${task.user.name} (${task.user.department ?? 'faculty'}).`,
        messages: [
          { role: 'user', content: `${task.prompt}${contextStr}` },
        ],
      })

      const resultText = response.content
        .filter(block => block.type === 'text')
        .map(block => block.type === 'text' ? block.text : '')
        .join('\n\n')

      // Infer result type
      let resultType = 'document'
      const promptLower = task.prompt.toLowerCase()
      if (promptLower.includes('summarize') || promptLower.includes('summary')) resultType = 'summary'
      else if (promptLower.includes('analyze') || promptLower.includes('analysis')) resultType = 'analysis'
      else if (promptLower.includes('draft') || promptLower.includes('write')) resultType = 'draft'

      await prisma.sandyAsyncTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          result: resultText,
          resultType,
          completedAt: new Date(),
        },
      })

      processed++
    } catch (error) {
      console.error(`[cron/process-sandy-tasks] Failed task ${task.id}:`, error)
      await prisma.sandyAsyncTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', completedAt: new Date() },
      })
    }
  }))

  // Count successful tasks from settled results
  const successCount = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({ processed: successCount, total: tasks.length })
})
