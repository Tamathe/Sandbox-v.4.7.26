/**
 * POST /api/analytics/student/sr-review
 *
 * Mini quiz engine for spaced-repetition review sessions.
 * turnNumber === 1: generate a question for the concept using Haiku.
 * turnNumber > 1:  score the student answer, update ConceptState on correct/partial.
 *
 * Auth: student-accessible (any role).
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    conceptSlug: string
    courseCode: string
    userAnswer?: string
    turnNumber: number
  }

  const { conceptSlug, courseCode, turnNumber } = body
  if (!conceptSlug || !courseCode || typeof turnNumber !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (turnNumber === 1) {
    // Generate a question for this concept
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Generate one clear, concise review question for a student studying the concept "${conceptSlug}" in course ${courseCode}. The question should test understanding, not just recall. Return only the question text, nothing else.`,
        },
      ],
    })

    const question = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return NextResponse.json({ question })
  }

  // turnNumber > 1: score the answer
  const { userAnswer } = body
  if (!userAnswer) {
    return NextResponse.json({ error: 'userAnswer required for scoring' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are scoring a student's spaced-repetition review answer for the concept "${conceptSlug}" in course ${courseCode}.

Student answer: "${userAnswer}"

Score the answer as one of: correct, partial, or incorrect.
- correct: demonstrates solid understanding
- partial: shows some understanding but missing key aspects
- incorrect: wrong or demonstrates misconception

Respond in JSON format exactly like this (no markdown):
{"verdict":"correct","feedback":"Brief encouraging feedback in 1-2 sentences."}`,
      },
    ],
  })

  let verdict: 'correct' | 'partial' | 'incorrect' = 'incorrect'
  let feedback = 'Keep studying this concept.'

  if (message.content[0].type === 'text') {
    try {
      const parsed = JSON.parse(message.content[0].text.trim()) as {
        verdict: 'correct' | 'partial' | 'incorrect'
        feedback: string
      }
      verdict = parsed.verdict
      feedback = parsed.feedback
    } catch {
      // fallback: try to extract verdict from text
      const raw = message.content[0].text.toLowerCase()
      if (raw.includes('"correct"')) verdict = 'correct'
      else if (raw.includes('"partial"')) verdict = 'partial'
    }
  }

  // Update ConceptState if not incorrect
  if (verdict !== 'incorrect') {
    const course = await prisma.course.findUnique({ where: { courseCode } })
    if (course) {
      const cs = await prisma.conceptState.findUnique({
        where: { userId_courseId_conceptSlug: { userId: user.id, courseId: course.id, conceptSlug } },
      })
      if (cs) {
        const newMissed = Math.max(0, cs.missedReviews - 1)
        const daysForward = cs.stabilityFactor * 2
        const nextReview = new Date(Date.now() + daysForward * 24 * 60 * 60 * 1000)
        await prisma.conceptState.update({
          where: { id: cs.id },
          data: { missedReviews: newMissed, nextReviewAt: nextReview },
        })
      }
    }
  }

  return NextResponse.json({ verdict, feedback })
})
