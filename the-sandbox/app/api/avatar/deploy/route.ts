/**
 * POST /api/avatar/deploy
 *
 * Creates an AI Teaching Assistant tool with an optional RAG knowledge base.
 *
 * When OPENAI_API_KEY is present:
 *   - Creates a synthetic Course + CourseMaterial records for each uploaded doc
 *   - Chunks and embeds each doc into DocumentChunk (pgvector)
 *   - Stores [COURSE_KB_ID:{courseId}] in the tool system prompt
 *   - The /api/chat route detects this marker and runs similarity search per turn
 *
 * When OPENAI_API_KEY is absent:
 *   - Falls back to inline knowledge base injection (stuffs docs into system prompt)
 *   - Tool is still fully functional, just limited by context window size
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { embeddingAvailable, getEmbeddingProvider } from '../../../lib/embedding-service'
import { getVectorStore } from '../../../lib/vector-store'
import { chunkText } from '../../../lib/document-chunker'
import { buildCourseMaterialGovernanceDefaults } from '../../../lib/content-permissions'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'
export const maxDuration = 60

interface DeployDoc {
  name: string
  content: string
}

interface DeployRequest {
  avatarName: string
  courseCode: string
  courseDescription: string
  teachingStyle: string
  focusAreas: string
  docs: DeployDoc[]
  // Tool metadata
  name: string
  shortDescription: string
  fullDescription: string
  category?: string
  difficultyLevel?: string
  welcomeMessage: string
  starterQuestions: string[]
  intendedAudience: string
  learningObjectives: string[]
  published: boolean
}

const STYLE_PROMPTS: Record<string, string> = {
  warm:      'You are warm, encouraging, and patient. Celebrate student effort and progress.',
  socratic:  'You use the Socratic method — respond to questions with guiding questions that lead students to discover the answer themselves.',
  direct:    'You are concise and direct. No fluff. Give clear, actionable answers.',
  scholarly: 'You are rigorous and scholarly. Cite relevant concepts, demand precision, and challenge students to think more deeply.',
}

function buildBasePrompt(req: DeployRequest): string {
  const style = STYLE_PROMPTS[req.teachingStyle] ?? STYLE_PROMPTS.warm
  return `You are ${req.avatarName}, an AI teaching assistant for ${req.courseCode || 'this course'}.

${req.courseDescription ? `About this course: ${req.courseDescription}` : ''}

${style}

${req.focusAreas ? `Key focus areas for this course: ${req.focusAreas}` : ''}

Your role is to help students understand course material, answer questions, and support their learning journey. You represent your instructor's knowledge and pedagogical approach.`
}

function buildInlinePrompt(req: DeployRequest): string {
  const base = buildBasePrompt(req)

  if (req.docs.length === 0) return base

  const KNOWLEDGE_CHAR_BUDGET = 180_000
  let remainingBudget = KNOWLEDGE_CHAR_BUDGET
  const docSections = req.docs.map(d => {
    if (remainingBudget <= 0) {
      return `### ${d.name}\n[Omitted — context budget exceeded.]`
    }
    const limit = Math.min(d.content.length, remainingBudget)
    const cutPoint = d.content.lastIndexOf('\n\n', limit) > 0 ? d.content.lastIndexOf('\n\n', limit) : limit
    remainingBudget -= cutPoint
    return `### ${d.name}\n${d.content.slice(0, cutPoint)}`
  })

  return `${base}

## Your Knowledge Base
Answer questions using ONLY the course materials below. If a question falls outside this material, say: "That topic isn't covered in the materials I have access to — please check the course resources or ask your instructor directly." Do NOT draw on outside knowledge for course-specific questions.

${docSections.join('\n\n')}`
}

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    if (user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Only educators can create AI TAs' }, { status: 403 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as DeployRequest

    const ragEnabled = embeddingAvailable() && body.docs.length > 0

    // ── Build system prompt ────────────────────────────────────────────────────
    // RAG path: base prompt + KB marker (retrieval happens at chat time)
    // Inline path: base prompt + full doc text stuffed in
    const systemPrompt = ragEnabled
      ? buildBasePrompt(body) // KB marker appended below after courseId is known
      : buildInlinePrompt(body)

    // ── Create the Tool record ─────────────────────────────────────────────────
    const tool = await prisma.tool.create({
      data: {
        name:              body.name,
        shortDescription:  body.shortDescription,
        fullDescription:   body.fullDescription,
        category:          body.category ?? 'General',
        difficultyLevel:   body.difficultyLevel ?? 'Introductory',
        toolType:          'CHATBOT',
        systemPrompt,
        welcomeMessage:    body.welcomeMessage,
        starterQuestions:  body.starterQuestions ?? [],
        intendedAudience:  body.intendedAudience,
        learningObjectives: body.learningObjectives ?? [],
        published:         body.published ?? false,
        approvalStatus:    'COMMUNITY',
        creatorId:         user.id,
      },
    })

    if (!ragEnabled) {
      return NextResponse.json({ id: tool.id, ragEnabled: false })
    }

    // ── RAG path: chunk → embed → store ───────────────────────────────────────
    // Create a synthetic course container owned by this educator.
    // courseCode must be unique — prefix with AVATAR- + toolId to guarantee it.
    const course = await prisma.course.create({
      data: {
        courseCode:   `AVATAR-${tool.id}`,
        title:        body.avatarName ?? body.name,
        description:  body.courseDescription || null,
        instructorId: user.id,
        isPublic:     false,
      },
    })

    const embedder = getEmbeddingProvider()
    const store = getVectorStore()
    let totalChunks = 0
    let embeddingFailures = 0

    for (const doc of body.docs) {
      if (!doc.content?.trim()) continue

      // Create CourseMaterial record
      const material = await prisma.courseMaterial.create({
        data: {
          courseId:     course.id,
          title:        doc.name,
          content:      doc.content,
          materialType: 'lecture',
          isVisible:    true,
          ...buildCourseMaterialGovernanceDefaults({
            courseIsPublic: false,
            facultyAiRetrievalApproved: true,
            studentUploadsAllowed: false,
            uploaderId: user.id,
            uploaderRole: user.role,
            sourceSystem: 'avatar',
            provenanceType: 'inferred',
            approvalBasis: 'system_generated',
          }),
        },
      })

      // Chunk the document
      const chunks = chunkText(doc.content)
      if (chunks.length === 0) continue

      // Embed all chunks for this document
      try {
        const embeddings = await embedder.embedBatch(chunks.map(c => c.content))
        const chunksToUpsert = chunks.map((c, i) => ({
          chunkIndex: c.chunkIndex,
          content:    c.content,
          tokenCount: c.tokenCount,
          embedding:  embeddings[i],
        }))
        await store.upsertChunks(material.id, course.id, chunksToUpsert)
        await prisma.courseMaterial.update({
          where: { id: material.id },
          data:  { embeddedAt: new Date() },
        })
        totalChunks += chunks.length
      } catch (embedErr) {
        console.error(`[avatar/deploy] Embedding failed for doc "${doc.name}":`, embedErr)
        embeddingFailures++
        // Continue with remaining docs — partial RAG is better than none
      }
    }

    // If all embeddings failed, fall back to inline prompt on the tool
    if (embeddingFailures === body.docs.length && body.docs.length > 0) {
      const fallbackPrompt = buildInlinePrompt(body)
      await prisma.tool.update({
        where: { id: tool.id },
        data:  { systemPrompt: fallbackPrompt },
      })
      return NextResponse.json({ id: tool.id, ragEnabled: false, fallback: true })
    }

    // Append the KB marker so /api/chat can do retrieval at turn time
    const ragSystemPrompt = `${systemPrompt}\n[COURSE_KB_ID:${course.id}]`
    await prisma.tool.update({
      where: { id: tool.id },
      data:  { systemPrompt: ragSystemPrompt },
    })

    return NextResponse.json({ id: tool.id, ragEnabled: true, totalChunks })
  })
