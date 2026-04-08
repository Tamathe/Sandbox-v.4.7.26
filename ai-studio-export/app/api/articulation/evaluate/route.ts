import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ArticulationStatus } from '../../../generated/prisma'
import {
  clampSimilarityScore,
  extractJsonObject,
  recommendationForScore,
} from '../../../lib/articulation'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'

export const runtime = 'nodejs'

const SYSTEM_PROMPT =
  'You are an expert university registrar specializing in transfer credit articulation. You return only valid JSON.'

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const syllabus = getTextValue(formData, 'syllabus')
    const externalCourseTitle = getTextValue(formData, 'externalCourseTitle')
    const externalInstitution = getTextValue(formData, 'externalInstitution')
    const internalCourseCode = getTextValue(formData, 'internalCourseCode')
    const internalCourseTitle = getTextValue(formData, 'internalCourseTitle')
    const internalCourseDescription = getTextValue(formData, 'internalCourseDescription')

    if (
      !syllabus ||
      !externalCourseTitle ||
      !externalInstitution ||
      !internalCourseCode ||
      !internalCourseTitle ||
      !internalCourseDescription
    ) {
      return NextResponse.json(
        { error: 'All articulation fields are required.' },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            'Compare the external syllabus against the internal course description.',
            'Analyze learning objectives, topics covered, and depth of coverage.',
            'Return ONLY a JSON object with:',
            '{ "similarityScore": <0-100>, "reasoning": "<2-3 sentence explanation>", "recommendation": "APPROVE" | "DENY" | "NEEDS_REVIEW" }',
            'APPROVE if score >= 90. DENY if score < 70. NEEDS_REVIEW otherwise.',
            '',
            `External course title: ${externalCourseTitle}`,
            `External institution: ${externalInstitution}`,
            '',
            'External syllabus:',
            syllabus,
            '',
            `Internal course code: ${internalCourseCode}`,
            `Internal course title: ${internalCourseTitle}`,
            '',
            'Internal course description:',
            internalCourseDescription,
          ].join('\n'),
        },
      ],
    })

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const parsed = extractJsonObject(rawText)
    const similarityScore = clampSimilarityScore(Number(parsed.similarityScore))
    const reasoning =
      typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
        ? parsed.reasoning.trim()
        : 'The model returned an incomplete explanation. Human review is required.'
    const recommendation = recommendationForScore(similarityScore)

    const record = await prisma.articulationRequest.create({
      data: {
        studentEmail: auth.user.email,
        externalCourseTitle,
        externalInstitution,
        externalSyllabus: syllabus,
        internalCourseCode,
        internalCourseTitle,
        internalCourseDescription,
        similarityScore,
        reasoning,
        recommendation,
        status: ArticulationStatus.PENDING,
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('POST /api/articulation/evaluate error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate transfer credit request.' },
      { status: 500 }
    )
  }
}
