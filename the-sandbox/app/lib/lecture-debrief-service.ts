import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { applyMasteryDecay } from './mastery-decay'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonInput = any

// ── Types ────────────────────────────────────────────────────────────────────

interface ConceptExtraction {
  slug: string
  label: string
  bloomLevel: number
  isNew: boolean
  isReinforcement: boolean
}

interface ObjectiveCoverage {
  objectiveId: string
  objectiveTitle: string
  bloomLevel: string
  coverageDepth: 'introduced' | 'practiced' | 'reinforced' | 'not_covered'
}

interface ObjectiveGap {
  objectiveId: string
  objectiveTitle: string
  suggestion: string
}

interface StudyGuideSection {
  heading: string
  content: string
  conceptSlugs: string[]
}

interface Flashcard {
  front: string
  back: string
  conceptSlug: string
  bloomLevel: number
}

interface CheckQuestion {
  question: string
  type: 'multiple_choice' | 'short_answer'
  options?: string[]
  correctAnswer: string
  explanation: string
  bloomLevel: number
  conceptSlug: string
}

export interface LectureDebriefSummary {
  id: string
  title: string | null
  lectureDate: Date
  status: string
  publishedAt: Date | null
  conceptCount: number
  createdAt: Date
}

export interface StudentStudyGuideResponse {
  id: string
  title: string | null
  lectureDate: Date
  courseCode: string
  studyGuide: StudyGuideSection[]
  flashcards: Flashcard[]
  checkQuestions: CheckQuestion[]
  studentContext: {
    weakConcepts: string[]
    dueConcepts: string[]
    focusRecommendation: string
  }
}

export interface CoverageStatsResponse {
  debriefCount: number
  objectiveCount: number
  coveredObjectiveCount: number
  uncoveredObjectives: { id: string; title: string; bloomLevel: string | null }[]
  conceptsIntroduced: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100)
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    // Try to extract JSON from the response — handle markdown code fences
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

// ── AI Passes ────────────────────────────────────────────────────────────────

async function runPass1(
  client: Anthropic,
  rawInput: string,
  courseCode: string,
  courseTitle: string,
  objectiveList: string,
  recentConceptSlugs: string[]
): Promise<ConceptExtraction[]> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: `You are a curriculum analyst. Extract the key concepts taught in this lecture.
For each concept, determine:
- slug: a normalized lowercase-hyphenated identifier (max 100 chars)
- label: a human-readable name
- bloomLevel: the Bloom's taxonomy level at which it was presented (1=remember, 2=understand, 3=apply, 4=analyze, 5=evaluate, 6=create)
- isNew: true if this concept appears to be introduced for the first time in the course
- isReinforcement: true if this revisits a concept previously covered

Course: ${courseCode} — ${courseTitle}
Syllabus objectives (for reference): ${objectiveList}
Previously covered concepts (last 3 lectures): ${recentConceptSlugs.join(', ') || 'none'}

Return ONLY a JSON array of objects with {slug, label, bloomLevel, isNew, isReinforcement}. Max 15 concepts.`,
    messages: [{ role: 'user', content: rawInput }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = safeJsonParse<ConceptExtraction[]>(text, [])
  return parsed.map((c) => ({
    ...c,
    slug: normalizeSlug(c.slug || c.label || 'unknown'),
  }))
}

async function runPass2(
  client: Anthropic,
  concepts: ConceptExtraction[],
  objectives: { id: string; title: string; bloomLevel: string | null }[]
): Promise<{ covered: ObjectiveCoverage[]; gaps: ObjectiveGap[] }> {
  const objectiveList = objectives
    .map((o) => `- [${o.id}] ${o.title} (Bloom: ${o.bloomLevel ?? 'unspecified'})`)
    .join('\n')

  const conceptList = concepts
    .map((c) => `- ${c.label} (${c.slug}, Bloom ${c.bloomLevel})`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: `You are a curriculum alignment specialist. Given the concepts extracted from today's lecture
and the course's learning objectives, determine which objectives were covered and which were not.

Concepts covered today:
${conceptList}

Course learning objectives:
${objectiveList}

For each objective, classify coverage as: introduced, practiced, reinforced, or not_covered.
For not_covered objectives, suggest when to cover them.

Return ONLY JSON: { "covered": [{"objectiveId":"...","objectiveTitle":"...","bloomLevel":"...","coverageDepth":"..."}], "gaps": [{"objectiveId":"...","objectiveTitle":"...","suggestion":"..."}] }`,
    messages: [{ role: 'user', content: 'Map the lecture concepts to objectives.' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeJsonParse(text, { covered: [], gaps: [] })
}

async function runPass3(
  client: Anthropic,
  rawInput: string,
  concepts: ConceptExtraction[],
  courseCode: string,
  courseTitle: string
): Promise<{ sections: StudyGuideSection[]; flashcards: Flashcard[] }> {
  const conceptList = concepts
    .map((c) => `- ${c.label} (${c.slug}, Bloom ${c.bloomLevel})`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: `You are a study guide author for university students. Create a concise study guide
for today's lecture that students can use to review. Include:
1. 3-5 study guide sections with clear headings and markdown content
2. 5-10 flashcards (front/back) for the key concepts

Write at an appropriate level for the course. Be concrete and specific — use examples
from the lecture notes, not generic definitions.

Course: ${courseCode} — ${courseTitle}
Concepts: ${conceptList}

Return ONLY JSON: { "sections": [{"heading":"...","content":"...markdown...","conceptSlugs":["..."]}], "flashcards": [{"front":"...","back":"...","conceptSlug":"...","bloomLevel":1}] }`,
    messages: [{ role: 'user', content: rawInput.slice(0, 8000) }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeJsonParse(text, { sections: [], flashcards: [] })
}

async function runPass4(
  client: Anthropic,
  concepts: ConceptExtraction[],
  courseCode: string,
  courseTitle: string
): Promise<CheckQuestion[]> {
  const conceptList = concepts
    .map((c) => `- ${c.label} (${c.slug}, Bloom ${c.bloomLevel})`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: `You are an assessment designer. Generate 5 "check your understanding" questions
for students to self-assess after reviewing the lecture. Mix Bloom levels:
- 2 questions at remember/understand (levels 1-2)
- 2 questions at apply/analyze (levels 3-4)
- 1 question at evaluate/create (levels 5-6)

Include both multiple_choice (with 4 options array) and short_answer formats.
Each question must map to a specific concept from the lecture.

Course: ${courseCode} — ${courseTitle}
Concepts: ${conceptList}

Return ONLY a JSON array of objects: [{"question":"...","type":"multiple_choice"|"short_answer","options":["A","B","C","D"],"correctAnswer":"...","explanation":"...","bloomLevel":1,"conceptSlug":"..."}]`,
    messages: [{ role: 'user', content: 'Generate check questions for these concepts.' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeJsonParse<CheckQuestion[]>(text, [])
}

// ── Main Service Functions ───────────────────────────────────────────────────

export async function createDebrief(
  userId: string,
  courseId: string,
  rawInput: string,
  lectureDate?: Date,
  title?: string
) {
  // Verify user owns this course
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: userId },
    select: { id: true, courseCode: true, title: true },
  })
  if (!course) throw new Error('Course not found or not owned by user')

  // Create the debrief record in processing state
  const debrief = await prisma.lectureDebrief.create({
    data: {
      courseId,
      createdById: userId,
      rawInput,
      lectureDate: lectureDate ?? new Date(),
      title: title || null,
      status: 'processing',
    },
  })

  // Gather context
  const [objectives, recentDebriefs] = await Promise.all([
    prisma.learningObjective.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, bloomLevel: true },
    }),
    prisma.lectureDebrief.findMany({
      where: { courseId, status: 'complete', id: { not: debrief.id } },
      orderBy: { lectureDate: 'desc' },
      take: 3,
      select: { conceptsExtracted: true },
    }),
  ])

  const objectiveList = objectives
    .map((o) => `${o.title} (Bloom: ${o.bloomLevel ?? '?'})`)
    .join('; ')

  const recentConceptSlugs = recentDebriefs.flatMap((d) => {
    const concepts = d.conceptsExtracted as ConceptExtraction[] | null
    return concepts?.map((c) => c.slug) ?? []
  })

  const client = new Anthropic()

  try {
    // Pass 1: Concept Extraction
    const concepts = await runPass1(client, rawInput, course.courseCode, course.title, objectiveList, recentConceptSlugs)
    await prisma.lectureDebrief.update({
      where: { id: debrief.id },
      data: { conceptsExtracted: concepts as JsonInput },
    })

    // Pass 2: Syllabus Mapping
    const { covered, gaps } = await runPass2(client, concepts, objectives)
    await prisma.lectureDebrief.update({
      where: { id: debrief.id },
      data: {
        objectivesCovered: covered as JsonInput,
        coverageGaps: gaps as JsonInput,
      },
    })

    // Pass 3: Study Guide
    const { sections, flashcards } = await runPass3(client, rawInput, concepts, course.courseCode, course.title)
    await prisma.lectureDebrief.update({
      where: { id: debrief.id },
      data: {
        studyGuide: sections as JsonInput,
        flashcards: flashcards as JsonInput,
      },
    })

    // Pass 4: Check Questions
    const checkQuestions = await runPass4(client, concepts, course.courseCode, course.title)
    await prisma.lectureDebrief.update({
      where: { id: debrief.id },
      data: {
        checkQuestions: checkQuestions as JsonInput,
        status: 'complete',
        title: title || `Lecture — ${course.courseCode} — ${(lectureDate ?? new Date()).toLocaleDateString()}`,
      },
    })

    return await prisma.lectureDebrief.findUnique({ where: { id: debrief.id } })
  } catch (err) {
    console.error('Lecture debrief pipeline failed:', err)
    await prisma.lectureDebrief.update({
      where: { id: debrief.id },
      data: { status: 'failed' },
    })
    throw err
  }
}

export async function getDebrief(debriefId: string, userId: string) {
  const debrief = await prisma.lectureDebrief.findUnique({
    where: { id: debriefId },
    include: { course: { select: { courseCode: true, title: true, instructorId: true } } },
  })
  if (!debrief) return null

  // Access control: creator, enrolled student (if published), or admin
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return null

  if (debrief.createdById !== userId && user.role !== 'ADMIN') {
    // Must be a student enrolled in the course AND debrief must be published
    if (!debrief.publishedAt) return null
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: debrief.courseId } },
    })
    if (!enrollment) return null

    // Increment view count for student views
    await prisma.lectureDebrief.update({
      where: { id: debriefId },
      data: { viewCount: { increment: 1 } },
    })
  }

  return debrief
}

export async function listDebriefs(
  courseId: string,
  userId: string,
  options?: { publishedOnly?: boolean }
): Promise<LectureDebriefSummary[]> {
  const where: Record<string, unknown> = { courseId }

  if (options?.publishedOnly) {
    where.publishedAt = { not: null }
    where.status = 'complete'
  }

  const debriefs = await prisma.lectureDebrief.findMany({
    where,
    orderBy: { lectureDate: 'desc' },
    select: {
      id: true,
      title: true,
      lectureDate: true,
      status: true,
      publishedAt: true,
      conceptsExtracted: true,
      createdAt: true,
    },
  })

  return debriefs.map((d) => ({
    id: d.id,
    title: d.title,
    lectureDate: d.lectureDate,
    status: d.status,
    publishedAt: d.publishedAt,
    conceptCount: Array.isArray(d.conceptsExtracted)
      ? (d.conceptsExtracted as unknown[]).length
      : 0,
    createdAt: d.createdAt,
  }))
}

export async function publishDebrief(debriefId: string, userId: string) {
  const debrief = await prisma.lectureDebrief.findFirst({
    where: { id: debriefId, createdById: userId, status: 'complete' },
  })
  if (!debrief) throw new Error('Debrief not found or not ready')

  await prisma.lectureDebrief.update({
    where: { id: debriefId },
    data: { publishedAt: new Date() },
  })

  return { published: true }
}

export async function unpublishDebrief(debriefId: string, userId: string) {
  await prisma.lectureDebrief.updateMany({
    where: { id: debriefId, createdById: userId },
    data: { publishedAt: null },
  })
  return { published: false }
}

export async function deleteDebrief(debriefId: string, userId: string) {
  const debrief = await prisma.lectureDebrief.findFirst({
    where: { id: debriefId, createdById: userId },
  })
  if (!debrief) throw new Error('Debrief not found')

  await prisma.lectureDebrief.delete({ where: { id: debriefId } })
  return { deleted: true }
}

export async function getStudentStudyGuide(
  debriefId: string,
  studentId: string
): Promise<StudentStudyGuideResponse | null> {
  const debrief = await prisma.lectureDebrief.findFirst({
    where: { id: debriefId, publishedAt: { not: null }, status: 'complete' },
    include: { course: { select: { courseCode: true, title: true } } },
  })
  if (!debrief) return null

  // Verify enrollment
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: debrief.courseId } },
  })
  if (!enrollment) return null

  const concepts = (debrief.conceptsExtracted as unknown as ConceptExtraction[]) ?? []
  const conceptSlugs = concepts.map((c) => c.slug)

  // Fetch student mastery + SR state
  const [masteries, srStates] = await Promise.all([
    prisma.studentConceptMastery.findMany({
      where: { userId: studentId, concept: { in: conceptSlugs } },
    }),
    prisma.conceptState.findMany({
      where: { userId: studentId, courseId: debrief.courseId, conceptSlug: { in: conceptSlugs } },
    }),
  ])

  const weakConcepts = masteries
    .filter((m) => applyMasteryDecay(m) < 0.5)
    .map((m) => m.concept)

  const dueConcepts = srStates
    .filter((s) => s.nextReviewAt <= new Date())
    .map((s) => s.conceptSlug)

  const focusRecommendation =
    weakConcepts.length > 0
      ? `Focus on: ${weakConcepts.slice(0, 3).join(', ')}`
      : dueConcepts.length > 0
        ? `Review due: ${dueConcepts.slice(0, 3).join(', ')}`
        : "You're on track — review all sections evenly."

  // Increment view
  await prisma.lectureDebrief.update({
    where: { id: debriefId },
    data: { viewCount: { increment: 1 } },
  })

  return {
    id: debrief.id,
    title: debrief.title,
    lectureDate: debrief.lectureDate,
    courseCode: debrief.course.courseCode,
    studyGuide: (debrief.studyGuide as unknown as StudyGuideSection[]) ?? [],
    flashcards: (debrief.flashcards as unknown as Flashcard[]) ?? [],
    checkQuestions: (debrief.checkQuestions as unknown as CheckQuestion[]) ?? [],
    studentContext: {
      weakConcepts,
      dueConcepts,
      focusRecommendation,
    },
  }
}

export async function getDebriefCoverageStats(
  courseId: string,
  userId: string
): Promise<CoverageStatsResponse> {
  // Verify ownership
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: userId },
  })
  if (!course) throw new Error('Course not found or not owned by user')

  const [debriefs, objectives] = await Promise.all([
    prisma.lectureDebrief.findMany({
      where: { courseId, status: 'complete' },
      select: { objectivesCovered: true, conceptsExtracted: true },
    }),
    prisma.learningObjective.findMany({
      where: { courseId },
      select: { id: true, title: true, bloomLevel: true },
    }),
  ])

  // Build set of covered objective IDs
  const coveredIds = new Set<string>()
  let totalConceptsIntroduced = 0

  for (const d of debriefs) {
    const covered = (d.objectivesCovered as unknown as ObjectiveCoverage[]) ?? []
    for (const oc of covered) {
      if (oc.coverageDepth !== 'not_covered') {
        coveredIds.add(oc.objectiveId)
      }
    }
    const concepts = (d.conceptsExtracted as unknown as ConceptExtraction[]) ?? []
    totalConceptsIntroduced += concepts.filter((c) => c.isNew).length
  }

  const uncoveredObjectives = objectives
    .filter((o) => !coveredIds.has(o.id))
    .map((o) => ({ id: o.id, title: o.title, bloomLevel: o.bloomLevel }))

  return {
    debriefCount: debriefs.length,
    objectiveCount: objectives.length,
    coveredObjectiveCount: coveredIds.size,
    uncoveredObjectives,
    conceptsIntroduced: totalConceptsIntroduced,
  }
}
