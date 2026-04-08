import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getGoal, savePath, type PathStep } from '../../../lib/my-path-service'
import { prisma } from '../../../lib/prisma'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { goalId } = parsed.data as { goalId: string }
  if (!goalId) {
    return NextResponse.json({ error: 'goalId is required' }, { status: 400 })
  }

  const goal = await getGoal(auth.user.id, goalId)
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  // Fetch context: student's enrolled courses + published tools
  const [enrollments, tools] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { studentId: auth.user.id },
      include: { course: { select: { id: true, title: true, description: true } } },
    }),
    prisma.tool.findMany({
      where: { published: true },
      select: { id: true, name: true, shortDescription: true, category: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ])

  const enrolledCourses = enrollments.map((e) => e.course)

  const systemPrompt = `You are Sandy, a learning assistant at the University of Kentucky. Generate a personalized learning path for a student's goal. Return ONLY a JSON array (no markdown, no explanation) with 4-7 steps. Each step must have:
- "type": one of "course", "tool", "flashcards", "practice", "custom"
- "id": the id of the course or tool if type is "course" or "tool", omit otherwise
- "title": a short action-oriented title
- "reason": one sentence explaining why this step helps

Available courses the student is enrolled in:
${JSON.stringify(enrolledCourses, null, 2)}

Available platform tools:
${JSON.stringify(tools, null, 2)}`

  const userMessage = `Goal: ${goal.title}${goal.description ? `\nDescription: ${goal.description}` : ''}${goal.category ? `\nCategory: ${goal.category}` : ''}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  let path: PathStep[]
  try {
    path = JSON.parse(text)
  } catch {
    // Try extracting JSON from potential markdown wrapping
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
    path = JSON.parse(match[0])
  }

  const updatedGoal = await savePath(auth.user.id, goalId, path)
  return NextResponse.json({ path, goal: updatedGoal })
})
