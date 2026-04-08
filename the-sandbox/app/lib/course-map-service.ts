import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { processCourseMaterial } from './document-processor'
import { createCanvasModule, addCanvasModuleItem } from './canvas-client'
import { createNotification } from './notifications'
import { buildCourseMaterialGovernanceDefaults } from './content-permissions'

// ── Type definitions ──────────────────────────────────────────────────────────

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'

export type CourseMapObjective = {
  title: string
  description: string | null
  sourceDocument: string
  bloomLevel?: BloomLevel | null
}

export type CourseMapMaterial = {
  title: string
  materialType: 'syllabus' | 'lecture' | 'reading' | 'assignment' | 'case' | 'rubric' | 'quiz'
  content: string
  sourceDocument: string
}

export type CourseMapAssignment = {
  title: string
  type: 'TEXT_SUBMISSION' | 'AI_EXPERIENCE' | 'FILE_UPLOAD'
  description: string | null
  dueDate: string | null
  pointsPossible: number | null
}

export type CourseMapToolSuggestion = {
  title: string
  toolType: string
  rationale: string
}

export type CourseMapWeek = {
  weekNumber: number
  title: string
  topic: string | null
  startDate: string | null
  endDate: string | null
  objectives: CourseMapObjective[]
  materials: CourseMapMaterial[]
  assignments: CourseMapAssignment[]
  toolSuggestions: CourseMapToolSuggestion[]
}

export type CourseMapMetadata = {
  totalWeeks: number
  totalObjectives: number
  totalAssignments: number
  documentsProcessed: number
  notice: string | null
}

export type CourseMapResult = {
  weeks: CourseMapWeek[]
  metadata: CourseMapMetadata
}

export type ConfirmResult = {
  weeksCreated: number
  materialsCreated: number
  objectivesCreated: number
  assignmentsCreated: number
}

export type AlignmentIssue = {
  weekNumber: number
  issueType: 'uncovered_objective' | 'orphan_assignment' | 'overloaded' | 'underloaded'
  title: string
  detail: string
}

export type AssignmentSuggestion = {
  title: string
  type: string
  description: string
  pointsPossible: number
  rationale: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEXT_BUDGET = 150_000
const MAX_WEEKS = 20
const MAX_OBJECTIVES = 30
const MAX_ASSIGNMENTS = 20
const MAX_SNAPSHOTS = 10

const VALID_MATERIAL_TYPES = new Set([
  'syllabus', 'lecture', 'reading', 'assignment', 'case', 'rubric', 'quiz',
])

const VALID_ASSIGNMENT_TYPES = new Set([
  'TEXT_SUBMISSION', 'AI_EXPERIENCE', 'FILE_UPLOAD',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJsonPayload(text: string): string {
  const trimmed = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

function buildTextPayload(
  primaryText: string,
  supplementalTexts: { filename: string; text: string }[],
): string {
  let result = `=== PRIMARY DOCUMENT (syllabus) ===\n${primaryText}\n`

  if (supplementalTexts.length === 0) return result

  const primaryLen = result.length
  const budgetForSupplementals = TEXT_BUDGET - primaryLen
  if (budgetForSupplementals <= 0) return result

  const totalSupLen = supplementalTexts.reduce((sum, s) => sum + s.text.length, 0)
  const ratio = totalSupLen > budgetForSupplementals
    ? budgetForSupplementals / totalSupLen
    : 1

  for (const sup of supplementalTexts) {
    const chars = Math.floor(sup.text.length * ratio)
    if (chars < 50) continue
    result += `\n=== SUPPLEMENTAL: ${sup.filename} ===\n${sup.text.slice(0, chars)}\n`
  }

  return result
}

function normalizeWeeks(raw: unknown): CourseMapWeek[] {
  if (!raw || typeof raw !== 'object') return []
  const weeksRaw = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>).weeks)
      ? (raw as Record<string, unknown>).weeks as unknown[]
      : []

  let totalObjectives = 0
  let totalAssignments = 0

  return weeksRaw
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
    .slice(0, MAX_WEEKS)
    .map((w, idx) => {
      const objectives = Array.isArray(w.objectives)
        ? w.objectives
            .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
            .filter(() => totalObjectives < MAX_OBJECTIVES)
            .map((o) => {
              totalObjectives++
              return {
                title: typeof o.title === 'string' ? o.title.slice(0, 200) : 'Untitled Objective',
                description: typeof o.description === 'string' ? o.description : null,
                sourceDocument: typeof o.sourceDocument === 'string' ? o.sourceDocument : '',
              }
            })
        : []

      const materials = Array.isArray(w.materials)
        ? w.materials
            .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
            .map((m) => ({
              title: typeof m.title === 'string' ? m.title.slice(0, 200) : 'Untitled Material',
              materialType: (
                typeof m.materialType === 'string' && VALID_MATERIAL_TYPES.has(m.materialType)
                  ? m.materialType
                  : 'lecture'
              ) as CourseMapMaterial['materialType'],
              content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
              sourceDocument: typeof m.sourceDocument === 'string' ? m.sourceDocument : '',
            }))
        : []

      const assignments = Array.isArray(w.assignments)
        ? w.assignments
            .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
            .filter(() => totalAssignments < MAX_ASSIGNMENTS)
            .map((a) => {
              totalAssignments++
              return {
                title: typeof a.title === 'string' ? a.title.slice(0, 200) : 'Untitled Assignment',
                type: (
                  typeof a.type === 'string' && VALID_ASSIGNMENT_TYPES.has(a.type)
                    ? a.type
                    : 'TEXT_SUBMISSION'
                ) as CourseMapAssignment['type'],
                description: typeof a.description === 'string' ? a.description : null,
                dueDate: typeof a.dueDate === 'string' ? a.dueDate : null,
                pointsPossible: typeof a.pointsPossible === 'number' && Number.isFinite(a.pointsPossible)
                  ? a.pointsPossible
                  : null,
              }
            })
        : []

      const toolSuggestions = Array.isArray(w.toolSuggestions)
        ? w.toolSuggestions
            .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
            .slice(0, 3)
            .map((t) => ({
              title: typeof t.title === 'string' ? t.title : 'Suggested Tool',
              toolType: typeof t.toolType === 'string' ? t.toolType : 'CHATBOT',
              rationale: typeof t.rationale === 'string' ? t.rationale : '',
            }))
        : []

      return {
        weekNumber: typeof w.weekNumber === 'number' ? w.weekNumber : idx + 1,
        title: typeof w.title === 'string' ? w.title.slice(0, 200) : `Week ${idx + 1}`,
        topic: typeof w.topic === 'string' ? w.topic : null,
        startDate: typeof w.startDate === 'string' ? w.startDate : null,
        endDate: typeof w.endDate === 'string' ? w.endDate : null,
        objectives,
        materials,
        assignments,
        toolSuggestions,
      }
    })
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert course architect. Given a university syllabus and optional supplemental documents, produce a complete week-by-week course map as a single JSON object.

Return ONLY valid JSON — no markdown fences, no commentary. The shape must be:

{
  "weeks": [
    {
      "weekNumber": 1,
      "title": "Introduction to ...",
      "topic": "Overview of ...",
      "startDate": "2026-01-15" or null,
      "endDate": "2026-01-19" or null,
      "objectives": [
        { "title": "Define X", "description": "Students will be able to ...", "sourceDocument": "syllabus.pdf" }
      ],
      "materials": [
        { "title": "Chapter 1 Reading", "materialType": "reading", "content": "Relevant excerpt...", "sourceDocument": "syllabus.pdf" }
      ],
      "assignments": [
        { "title": "Homework 1", "type": "TEXT_SUBMISSION", "description": "...", "dueDate": "2026-01-20" or null, "pointsPossible": 100 or null }
      ],
      "toolSuggestions": [
        { "title": "Concept Quiz Bot", "toolType": "QUIZ", "rationale": "Reinforces weekly vocabulary" }
      ]
    }
  ]
}

Rules:
- Maximum 20 weeks. Combine content if the course exceeds 20 weeks.
- Maximum 30 objectives total across all weeks.
- Maximum 20 assignments total across all weeks.
- materialType must be one of: syllabus, lecture, reading, assignment, case, rubric, quiz.
- assignment type must be one of: TEXT_SUBMISSION, AI_EXPERIENCE, FILE_UPLOAD. Default to TEXT_SUBMISSION if unclear.
- toolType should be one of: CHATBOT, QUIZ, AI_INTERVIEW, DEBATE, STUDY_BUDDY, SIMULATION.
- Extract dates when present in the syllabus; use null when not stated.
- content for materials should be the relevant text excerpt from the source document, not a paraphrase.
- sourceDocument should be the filename of the document the item was extracted from.
- objectives.description should describe what mastery looks like for this objective.
- If the syllabus lists grading policies, office hours, or course-level info, include it as a material in week 1 with materialType "syllabus".
- For each week, suggest 1-2 AI tools that would help students learn the material.`

// ── Main function ─────────────────────────────────────────────────────────────

export async function generateCourseMap(
  courseId: string,
  primaryText: string,
  supplementalTexts: { filename: string; text: string }[],
  courseTitle: string,
  courseCode: string,
): Promise<CourseMapResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const textPayload = buildTextPayload(primaryText, supplementalTexts)

  const userMessage = `Course: "${courseTitle}" (${courseCode})

${textPayload}`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let responseText = ''
  let parsed: unknown = null

  // First attempt
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages,
  })

  responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  try {
    parsed = JSON.parse(extractJsonPayload(responseText))
  } catch {
    // Retry once with correction message
    messages.push({ role: 'assistant', content: responseText })
    messages.push({
      role: 'user',
      content: 'Your response was not valid JSON. Return ONLY the JSON object with no markdown fences.',
    })

    const retry = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    })

    const retryText = retry.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    parsed = JSON.parse(extractJsonPayload(retryText))
  }

  const weeks = normalizeWeeks(parsed)

  const totalObjectives = weeks.reduce((sum, w) => sum + w.objectives.length, 0)
  const totalAssignments = weeks.reduce((sum, w) => sum + w.assignments.length, 0)

  const notice = primaryText.length < 500
    ? 'This syllabus had limited detail — consider adding supplemental documents.'
    : null

  return {
    weeks,
    metadata: {
      totalWeeks: weeks.length,
      totalObjectives,
      totalAssignments,
      documentsProcessed: 1 + supplementalTexts.length,
      notice,
    },
  }
}

// ── Confirm course map ───────────────────────────────────────────────────────

export async function confirmCourseMap(
  courseId: string,
  weeks: CourseMapWeek[],
  options?: { expectedVersion?: number; userId?: string },
): Promise<ConfirmResult> {
  let materialsCreated = 0
  let objectivesCreated = 0
  let assignmentsCreated = 0
  let globalOrderIndex = 0

  const [courseGovernance, uploader] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        isPublic: true,
        facultyAiRetrievalApproved: true,
        studentUploadsAllowed: true,
      },
    }),
    options?.userId
      ? prisma.user.findUnique({
          where: { id: options.userId },
          select: { id: true, role: true },
        })
      : Promise.resolve(null),
  ])

  if (!courseGovernance) {
    throw new Error('Course not found')
  }

  const generatedMaterialGovernance = buildCourseMaterialGovernanceDefaults({
    courseIsPublic: courseGovernance.isPublic,
    facultyAiRetrievalApproved: courseGovernance.facultyAiRetrievalApproved,
    studentUploadsAllowed: courseGovernance.studentUploadsAllowed,
    uploaderId: uploader?.id ?? null,
    uploaderRole: uploader?.role ?? null,
    sourceSystem: 'course-map',
    provenanceType: 'inferred',
    approvalBasis: 'system_generated',
  })

  const result = await prisma.$transaction(async (tx) => {
    // Optimistic locking: check courseMapVersion if expectedVersion is provided
    if (options?.expectedVersion !== undefined) {
      const course = await tx.course.findUniqueOrThrow({ where: { id: courseId }, select: { courseMapVersion: true } })
      if (course.courseMapVersion !== options.expectedVersion) {
        throw new Error('CONFLICT: Course map was modified by another user. Reload and try again.')
      }
    }

    // Increment courseMapVersion
    await tx.course.update({
      where: { id: courseId },
      data: { courseMapVersion: { increment: 1 } },
    })

    // Snapshot existing weeks before deleting (only if weeks exist)
    const existingWeeks = await tx.courseWeek.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      include: {
        materials: { select: { title: true, content: true, materialType: true } },
        objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true, description: true } },
        assignments: { select: { title: true, type: true, description: true, dueAt: true, pointsPossible: true } },
      },
    })

    if (existingWeeks.length > 0) {
      // Serialize existing map as CourseMapWeek[]
      const snapshotWeeks: CourseMapWeek[] = existingWeeks.map((w) => ({
        weekNumber: w.weekNumber,
        title: w.title,
        topic: w.topic,
        startDate: w.startDate ? w.startDate.toISOString().slice(0, 10) : null,
        endDate: w.endDate ? w.endDate.toISOString().slice(0, 10) : null,
        objectives: w.objectives.map((o) => ({
          title: o.title,
          description: o.description,
          sourceDocument: '',
        })),
        materials: w.materials.map((m) => ({
          title: m.title,
          materialType: (VALID_MATERIAL_TYPES.has(m.materialType) ? m.materialType : 'lecture') as CourseMapMaterial['materialType'],
          content: m.content,
          sourceDocument: '',
        })),
        assignments: w.assignments.map((a) => ({
          title: a.title,
          type: a.type === 'AI_EXPERIENCE' ? 'AI_EXPERIENCE' as const : 'TEXT_SUBMISSION' as const,
          description: a.description,
          dueDate: a.dueAt ? a.dueAt.toISOString().slice(0, 10) : null,
          pointsPossible: a.pointsPossible,
        })),
        toolSuggestions: [],
      }))

      const totalObj = snapshotWeeks.reduce((s, w) => s + w.objectives.length, 0)
      const totalAsgn = snapshotWeeks.reduce((s, w) => s + w.assignments.length, 0)

      await tx.courseMapSnapshot.create({
        data: {
          courseId,
          weeksJson: toJsonValue(snapshotWeeks),
          metadata: {
            totalWeeks: snapshotWeeks.length,
            totalObjectives: totalObj,
            totalAssignments: totalAsgn,
            documentsProcessed: 0,
            notice: null,
          },
        },
      })

      // Cap at 10 snapshots per course — delete oldest
      const snapshots = await tx.courseMapSnapshot.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (snapshots.length > MAX_SNAPSHOTS) {
        const toDelete = snapshots.slice(MAX_SNAPSHOTS).map((s) => s.id)
        await tx.courseMapSnapshot.deleteMany({ where: { id: { in: toDelete } } })
      }
    }

    // Delete existing weeks (cascade cleans up linked records via weekId)
    await tx.courseWeek.deleteMany({ where: { courseId } })

    const createdMaterialIds: { id: string; content: string }[] = []

    for (const week of weeks) {
      const courseWeek = await tx.courseWeek.create({
        data: {
          courseId,
          weekNumber: week.weekNumber,
          title: week.title,
          topic: week.topic,
          startDate: week.startDate ? new Date(week.startDate) : null,
          endDate: week.endDate ? new Date(week.endDate) : null,
          orderIndex: week.weekNumber,
        },
      })

      for (const mat of week.materials) {
        const created = await tx.courseMaterial.create({
          data: {
            courseId,
            weekId: courseWeek.id,
            title: mat.title,
            content: mat.content,
            materialType: mat.materialType,
            isVisible: true,
            ...generatedMaterialGovernance,
          },
        })
        createdMaterialIds.push({ id: created.id, content: mat.content })
        materialsCreated++
      }

      for (const obj of week.objectives) {
        await tx.learningObjective.create({
          data: {
            courseId,
            weekId: courseWeek.id,
            title: obj.title,
            description: obj.description,
            orderIndex: globalOrderIndex++,
          },
        })
        objectivesCreated++
      }

      for (const assignment of week.assignments) {
        const assignmentType = assignment.type === 'AI_EXPERIENCE' ? 'AI_EXPERIENCE' : 'LEGACY_SUBMISSION'
        await tx.assignment.create({
          data: {
            courseId,
            weekId: courseWeek.id,
            title: assignment.title,
            description: assignment.description,
            type: assignmentType,
            dueAt: assignment.dueDate ? new Date(assignment.dueDate) : null,
            pointsPossible: assignment.pointsPossible ?? 100,
            isPublished: false,
          },
        })
        assignmentsCreated++
      }
    }

    // Record edit if userId is provided
    if (options?.userId) {
      await tx.courseMapEdit.create({
        data: {
          courseId,
          userId: options.userId,
          editType: 'MODIFY_WEEK',
          weekNumber: 0, // 0 = full map update
          payload: { weeksCount: weeks.length },
        },
      })
    }

    return { createdMaterialIds }
  })

  // Fire-and-forget: generate teaching assistant
  triggerTeachingAssistantGeneration(courseId).catch((err) => {
    console.error('[course-map] Teaching assistant generation failed:', err)
  })

  // Fire-and-forget: RAG-embed each new material
  for (const mat of result.createdMaterialIds) {
    processCourseMaterial(mat.id, courseId, mat.content).catch((err) => {
      console.error(`[course-map] RAG embedding failed for material ${mat.id}:`, err)
    })
  }

  return {
    weeksCreated: weeks.length,
    materialsCreated,
    objectivesCreated,
    assignmentsCreated,
  }
}

// ── Teaching assistant generation (extracted from generate-bot route) ─────────

const KNOWLEDGE_CHAR_BUDGET = 120_000

async function triggerTeachingAssistantGeneration(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      materials: {
        orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, content: true, moduleNumber: true, isVisible: true },
      },
    },
  })
  if (!course) return

  // Skip if a teaching assistant bot already exists for this course
  const existingBotLink = await prisma.courseToolLink.findFirst({
    where: { courseId, tool: { toolType: 'CHATBOT' } },
    select: { toolId: true },
  })
  if (existingBotLink) return

  const visibleMaterials = course.materials.filter((m) => m.isVisible)
  const materialsForBot = visibleMaterials.length > 0 ? visibleMaterials : course.materials
  if (materialsForBot.length === 0) return

  let remainingBudget = KNOWLEDGE_CHAR_BUDGET
  const knowledgeBlock = materialsForBot
    .map((material) => {
      if (remainingBudget <= 0) return null
      const sectionTitle = `${material.moduleNumber ? `Module ${material.moduleNumber}: ` : ''}${material.title}`
      const limit = Math.min(material.content.length, remainingBudget)
      const cutPoint = material.content.lastIndexOf('\n\n', limit) > 0
        ? material.content.lastIndexOf('\n\n', limit)
        : limit
      remainingBudget -= cutPoint
      return `### ${sectionTitle}\n${material.content.slice(0, cutPoint)}`
    })
    .filter((section): section is string => !!section)
    .join('\n\n')

  const systemPrompt = `You are an AI Teaching Assistant for the course "${course.title}".
Your role is to help students understand the material, answer questions, and guide their thinking.
You do not give direct answers to graded assessment questions.

COURSE KNOWLEDGE:
${knowledgeBlock}

Always cite which part of the course material your answer comes from. If the answer is not in the course materials, say so clearly and encourage the student to check with their instructor.`

  const tool = await prisma.tool.create({
    data: {
      name: `${course.title} Teaching Assistant`,
      shortDescription: `Course-specific AI teaching assistant for ${course.courseCode}.`,
      fullDescription: `A draft AI teaching assistant generated from the materials in ${course.courseCode}. It helps students understand course content, cite the relevant source material, and stay grounded in what the instructor uploaded.`,
      category: 'General',
      difficultyLevel: 'Introductory',
      toolType: 'CHATBOT',
      systemPrompt,
      personaName: 'Sandy',
      welcomeMessage: `Hi! I'm the AI Teaching Assistant for ${course.courseCode}. Ask me about the course materials, and I'll help you work through the concepts step by step.`,
      starterQuestions: [
        'What are the biggest ideas in this course so far?',
        'Can you help me review the latest module?',
        'What should I study first before the next assignment?',
      ],
      learningObjectives: [
        'Help students review and understand uploaded course materials',
        'Point students back to the most relevant course source',
        'Support guided study without giving away graded answers',
      ],
      intendedAudience: `Students enrolled in ${course.courseCode}`,
      referenceDocUrls: [],
      published: false,
      approvalStatus: 'COMMUNITY',
      creatorId: course.instructorId,
    },
  })

  await prisma.courseToolLink.create({
    data: { courseId, toolId: tool.id },
  })
}

// ── Get course map ───────────────────────────────────────────────────────────

export async function getCourseMap(courseId: string): Promise<CourseMapResult | null> {
  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: {
      materials: { select: { title: true, content: true, materialType: true } },
      objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true, description: true } },
      assignments: { select: { title: true, type: true, description: true, dueAt: true, pointsPossible: true } },
    },
  })

  if (weeks.length === 0) return null

  const mappedWeeks: CourseMapWeek[] = weeks.map((w) => ({
    weekNumber: w.weekNumber,
    title: w.title,
    topic: w.topic,
    startDate: w.startDate ? w.startDate.toISOString().slice(0, 10) : null,
    endDate: w.endDate ? w.endDate.toISOString().slice(0, 10) : null,
    objectives: w.objectives.map((o) => ({
      title: o.title,
      description: o.description,
      sourceDocument: '',
    })),
    materials: w.materials.map((m) => ({
      title: m.title,
      materialType: (VALID_MATERIAL_TYPES.has(m.materialType) ? m.materialType : 'lecture') as CourseMapMaterial['materialType'],
      content: m.content,
      sourceDocument: '',
    })),
    assignments: w.assignments.map((a) => ({
      title: a.title,
      type: a.type === 'AI_EXPERIENCE' ? 'AI_EXPERIENCE' as const : 'TEXT_SUBMISSION' as const,
      description: a.description,
      dueDate: a.dueAt ? a.dueAt.toISOString().slice(0, 10) : null,
      pointsPossible: a.pointsPossible,
    })),
    toolSuggestions: [],
  }))

  const totalObjectives = mappedWeeks.reduce((sum, w) => sum + w.objectives.length, 0)
  const totalAssignments = mappedWeeks.reduce((sum, w) => sum + w.assignments.length, 0)

  return {
    weeks: mappedWeeks,
    metadata: {
      totalWeeks: mappedWeeks.length,
      totalObjectives,
      totalAssignments,
      documentsProcessed: 0,
      notice: null,
    },
  }
}

// ── Course map progress (per-week objective mastery) ─────────────────────────

export type WeekProgress = {
  weekNumber: number
  title: string
  totalObjectives: number
  mastered: number
  struggling: number
  notStarted: number
}

export type CourseMapProgress = {
  weeks: WeekProgress[]
  overallMasteredPct: number
  hasData: boolean
}

export async function getCourseMapProgress(courseId: string): Promise<CourseMapProgress> {
  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    select: {
      weekNumber: true,
      title: true,
      objectives: {
        select: {
          id: true,
          progress: {
            select: { masteryLevel: true },
          },
        },
      },
    },
  })

  let totalObj = 0
  let totalMastered = 0

  const weekProgress: WeekProgress[] = weeks.map((w) => {
    const total = w.objectives.length
    let mastered = 0
    let struggling = 0
    let notStarted = 0

    for (const obj of w.objectives) {
      if (obj.progress.length === 0) {
        notStarted++
      } else {
        // aggregate across all students: count distinct mastery levels
        const levels = obj.progress.map((p) => p.masteryLevel)
        const hasMastered = levels.some((l) => l === 'mastered')
        const hasStruggling = levels.some((l) => l === 'struggling')
        if (hasMastered) mastered++
        else if (hasStruggling) struggling++
        else notStarted++
      }
    }

    totalObj += total
    totalMastered += mastered

    return { weekNumber: w.weekNumber, title: w.title, totalObjectives: total, mastered, struggling, notStarted }
  })

  const hasData = weekProgress.some((w) => w.mastered > 0 || w.struggling > 0)

  return {
    weeks: weekProgress,
    overallMasteredPct: totalObj > 0 ? Math.round((totalMastered / totalObj) * 100) : 0,
    hasData,
  }
}

// ── Course map snapshots ─────────────────────────────────────────────────────

export type SnapshotSummary = {
  id: string
  label: string | null
  createdAt: string
  weekCount: number
}

export async function getCourseMapSnapshots(courseId: string): Promise<SnapshotSummary[]> {
  const snapshots = await prisma.courseMapSnapshot.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    take: MAX_SNAPSHOTS,
    select: { id: true, label: true, createdAt: true, weeksJson: true },
  })

  return snapshots.map((s) => ({
    id: s.id,
    label: s.label,
    createdAt: s.createdAt.toISOString(),
    weekCount: Array.isArray(s.weeksJson) ? s.weeksJson.length : 0,
  }))
}

export async function restoreCourseMapSnapshot(
  courseId: string,
  snapshotId: string,
): Promise<ConfirmResult> {
  const snapshot = await prisma.courseMapSnapshot.findFirst({
    where: { id: snapshotId, courseId },
  })
  if (!snapshot) throw new Error('Snapshot not found')

  const weeksRaw = snapshot.weeksJson as unknown
  const weeks = normalizeWeeks(weeksRaw)
  if (weeks.length === 0) throw new Error('Snapshot contains no valid weeks')

  return confirmCourseMap(courseId, weeks)
}

// ── AI rebalance suggestions ─────────────────────────────────────────────────

export type RebalanceSuggestion = {
  weekNumber: number
  issue: string
  recommendation: string
}

export async function suggestRebalance(
  courseId: string,
  weeks: CourseMapWeek[],
): Promise<{ suggestions: RebalanceSuggestion[] }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Fetch progress data if available
  const progress = await getCourseMapProgress(courseId)

  // Build concise course map summary for the LLM
  const mapSummary = weeks.map((w) => {
    const progressWeek = progress.weeks.find((pw) => pw.weekNumber === w.weekNumber)
    return {
      weekNumber: w.weekNumber,
      title: w.title,
      objectiveCount: w.objectives.length,
      materialCount: w.materials.length,
      assignmentCount: w.assignments.length,
      ...(progressWeek && progress.hasData
        ? { mastered: progressWeek.mastered, struggling: progressWeek.struggling, notStarted: progressWeek.notStarted }
        : {}),
    }
  })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are an expert course design consultant. Analyze the course map below and identify imbalances or issues.

Return ONLY valid JSON — no markdown fences, no commentary. The shape must be:
{
  "suggestions": [
    { "weekNumber": 1, "issue": "...", "recommendation": "..." }
  ]
}

Rules:
- Maximum 5 suggestions, ordered by importance.
- Each suggestion must reference a specific week number.
- "issue" should be a concise 1-sentence description of the problem.
- "recommendation" should be a concise 1-sentence actionable fix.
- Look for: weeks with too many or too few objectives (density imbalance), weeks where students are struggling disproportionately (if progress data is provided), missing assessment coverage (weeks with objectives but no assignments), front-loading or back-loading of content.
- If the course map looks well-balanced, return an empty suggestions array.`,
    messages: [
      { role: 'user', content: JSON.stringify(mapSummary) },
    ],
  })

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  try {
    const parsed = JSON.parse(extractJsonPayload(responseText)) as { suggestions?: unknown[] }
    const suggestions: RebalanceSuggestion[] = (parsed.suggestions ?? [])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .slice(0, 5)
      .map((s) => ({
        weekNumber: typeof s.weekNumber === 'number' ? s.weekNumber : 0,
        issue: typeof s.issue === 'string' ? s.issue : 'Unknown issue',
        recommendation: typeof s.recommendation === 'string' ? s.recommendation : '',
      }))

    return { suggestions }
  } catch {
    return { suggestions: [] }
  }
}

// ── Push course map to Canvas ────────────────────────────────────────────────

export type CanvasPushResult = {
  modulesCreated: number
  itemsCreated: number
}

export async function pushCourseMapToCanvas(
  courseId: string,
  canvasCourseId: string,
): Promise<CanvasPushResult> {
  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true } },
      materials: { select: { title: true, materialType: true } },
      assignments: { select: { title: true, type: true } },
    },
  })

  if (weeks.length === 0) throw new Error('No course map to push')

  let modulesCreated = 0
  let itemsCreated = 0

  for (const week of weeks) {
    const mod = await createCanvasModule(
      canvasCourseId,
      `Week ${week.weekNumber}: ${week.title}`,
      week.weekNumber,
    )
    modulesCreated++

    // Add objectives as sub-headers
    for (const obj of week.objectives) {
      await addCanvasModuleItem(canvasCourseId, mod.id, `Objective: ${obj.title}`, 'SubHeader')
      itemsCreated++
    }

    // Add materials as sub-headers
    for (const mat of week.materials) {
      await addCanvasModuleItem(canvasCourseId, mod.id, `${mat.materialType}: ${mat.title}`, 'SubHeader')
      itemsCreated++
    }

    // Add assignments as sub-headers
    for (const assignment of week.assignments) {
      await addCanvasModuleItem(canvasCourseId, mod.id, `Assignment: ${assignment.title}`, 'SubHeader')
      itemsCreated++
    }
  }

  return { modulesCreated, itemsCreated }
}

// ── Share token management ────────────────────────────────────────────────────

export async function generateShareToken(courseId: string): Promise<string> {
  const token = randomBytes(16).toString('hex')
  await prisma.course.update({
    where: { id: courseId },
    data: { shareToken: token },
  })
  return token
}

export async function revokeShareToken(courseId: string): Promise<void> {
  await prisma.course.update({
    where: { id: courseId },
    data: { shareToken: null },
  })
}

export async function getCourseMapByShareToken(token: string): Promise<{
  courseCode: string
  courseTitle: string
  weeks: CourseMapWeek[]
} | null> {
  const course = await prisma.course.findUnique({
    where: { shareToken: token },
    select: { id: true, courseCode: true, title: true },
  })
  if (!course) return null

  const result = await getCourseMap(course.id)
  if (!result) return null

  return {
    courseCode: course.courseCode,
    courseTitle: course.title,
    weeks: result.weeks,
  }
}

// ── Course map duplication ────────────────────────────────────────────────────

export async function duplicateCourseMap(
  sourceCourseId: string,
  targetCourseId: string,
): Promise<ConfirmResult> {
  const sourceMap = await getCourseMap(sourceCourseId)
  if (!sourceMap || sourceMap.weeks.length === 0) {
    throw new Error('Source course has no course map')
  }

  return confirmCourseMap(targetCourseId, sourceMap.weeks)
}

// ── Course map edits (collaboration audit trail) ─────────────────────────────

export type CourseMapEditEntry = {
  id: string
  editType: string
  weekNumber: number
  payload: unknown
  createdAt: string
  userName: string
  userEmail: string
}

export async function getCourseMapEdits(courseId: string): Promise<CourseMapEditEntry[]> {
  const edits = await prisma.courseMapEdit.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      editType: true,
      weekNumber: true,
      payload: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  })

  return edits.map((e) => ({
    id: e.id,
    editType: e.editType,
    weekNumber: e.weekNumber,
    payload: e.payload,
    createdAt: e.createdAt.toISOString(),
    userName: e.user.name,
    userEmail: e.user.email,
  }))
}

export async function getCourseMapVersion(courseId: string): Promise<number> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { courseMapVersion: true },
  })
  return course.courseMapVersion
}

// ── Course map comparison ────────────────────────────────────────────────────

export type ComparisonWeek = {
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  weekA: CourseMapWeek | null
  weekB: CourseMapWeek | null
}

export type CourseMapComparison = {
  courseA: { id: string; courseCode: string; title: string }
  courseB: { id: string; courseCode: string; title: string }
  weeks: ComparisonWeek[]
}

export async function compareCourseMap(
  courseIdA: string,
  courseIdB: string,
): Promise<CourseMapComparison> {
  const [courseA, courseB] = await Promise.all([
    prisma.course.findUniqueOrThrow({ where: { id: courseIdA }, select: { id: true, courseCode: true, title: true } }),
    prisma.course.findUniqueOrThrow({ where: { id: courseIdB }, select: { id: true, courseCode: true, title: true } }),
  ])

  const [mapA, mapB] = await Promise.all([
    getCourseMap(courseIdA),
    getCourseMap(courseIdB),
  ])

  const weeksA = mapA?.weeks ?? []
  const weeksB = mapB?.weeks ?? []
  const maxLen = Math.max(weeksA.length, weeksB.length)

  const comparisonWeeks: ComparisonWeek[] = []

  for (let i = 0; i < maxLen; i++) {
    const wA = weeksA[i] ?? null
    const wB = weeksB[i] ?? null

    if (!wA && wB) {
      comparisonWeeks.push({ status: 'added', weekA: null, weekB: wB })
    } else if (wA && !wB) {
      comparisonWeeks.push({ status: 'removed', weekA: wA, weekB: null })
    } else if (wA && wB) {
      const titleChanged = wA.title !== wB.title
      const objCountChanged = wA.objectives.length !== wB.objectives.length
      const matCountChanged = wA.materials.length !== wB.materials.length
      const assignCountChanged = wA.assignments.length !== wB.assignments.length
      const isModified = titleChanged || objCountChanged || matCountChanged || assignCountChanged
      comparisonWeeks.push({ status: isModified ? 'modified' : 'unchanged', weekA: wA, weekB: wB })
    }
  }

  return { courseA, courseB, weeks: comparisonWeeks }
}

export async function compareWithSnapshot(
  courseId: string,
  snapshotId: string,
): Promise<CourseMapComparison> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { id: true, courseCode: true, title: true },
  })

  const snapshot = await prisma.courseMapSnapshot.findFirst({
    where: { id: snapshotId, courseId },
  })
  if (!snapshot) throw new Error('Snapshot not found')

  const currentMap = await getCourseMap(courseId)
  const snapshotWeeks = normalizeWeeks(snapshot.weeksJson as unknown)
  const currentWeeks = currentMap?.weeks ?? []
  const maxLen = Math.max(currentWeeks.length, snapshotWeeks.length)

  const comparisonWeeks: ComparisonWeek[] = []

  for (let i = 0; i < maxLen; i++) {
    const wA = snapshotWeeks[i] ?? null
    const wB = currentWeeks[i] ?? null

    if (!wA && wB) {
      comparisonWeeks.push({ status: 'added', weekA: null, weekB: wB })
    } else if (wA && !wB) {
      comparisonWeeks.push({ status: 'removed', weekA: wA, weekB: null })
    } else if (wA && wB) {
      const titleChanged = wA.title !== wB.title
      const objCountChanged = wA.objectives.length !== wB.objectives.length
      const matCountChanged = wA.materials.length !== wB.materials.length
      const assignCountChanged = wA.assignments.length !== wB.assignments.length
      const isModified = titleChanged || objCountChanged || matCountChanged || assignCountChanged
      comparisonWeeks.push({ status: isModified ? 'modified' : 'unchanged', weekA: wA, weekB: wB })
    }
  }

  return {
    courseA: { id: course.id, courseCode: `${course.courseCode} (Snapshot)`, title: snapshot.label ?? `Snapshot ${new Date(snapshot.createdAt).toLocaleDateString()}` },
    courseB: course,
    weeks: comparisonWeeks,
  }
}

// ── Canvas import ────────────────────────────────────────────────────────────

export async function importCourseMapFromCanvas(
  courseId: string,
  canvasCourseId: string,
): Promise<CourseMapResult> {
  // Dynamically import to avoid circular dependency
  const { getCanvasModules, getCanvasModuleItems } = await import('./canvas-client')

  const modules = await getCanvasModules(canvasCourseId)

  const weeks: CourseMapWeek[] = []

  for (const mod of modules) {
    const items = await getCanvasModuleItems(canvasCourseId, mod.id)

    const objectives: CourseMapObjective[] = []
    const materials: CourseMapMaterial[] = []
    const assignments: CourseMapAssignment[] = []

    for (const item of items) {
      switch (item.type) {
        case 'SubHeader':
          objectives.push({
            title: item.title,
            description: null,
            sourceDocument: 'Canvas',
          })
          break
        case 'Page':
        case 'File':
          materials.push({
            title: item.title,
            materialType: item.type === 'File' ? 'reading' : 'lecture',
            content: '',
            sourceDocument: 'Canvas',
          })
          break
        case 'Assignment':
          assignments.push({
            title: item.title,
            type: 'TEXT_SUBMISSION',
            description: null,
            dueDate: null,
            pointsPossible: null,
          })
          break
        default:
          // ExternalUrl, etc. — treat as material
          materials.push({
            title: item.title,
            materialType: 'reading',
            content: '',
            sourceDocument: 'Canvas',
          })
          break
      }
    }

    weeks.push({
      weekNumber: mod.position,
      title: mod.name,
      topic: null,
      startDate: null,
      endDate: null,
      objectives,
      materials,
      assignments,
      toolSuggestions: [],
    })
  }

  return {
    weeks,
    metadata: {
      totalWeeks: weeks.length,
      totalObjectives: weeks.reduce((s, w) => s + w.objectives.length, 0),
      totalAssignments: weeks.reduce((s, w) => s + w.assignments.length, 0),
      documentsProcessed: 0,
      notice: weeks.length === 0 ? 'No modules found in Canvas course' : 'Imported from Canvas — review and edit before saving',
    },
  }
}

// ── Per-week AI teaching tips ──────────────────────────────────────────────

export type WeekInsights = {
  tips: string[]
  weekNumber: number
}

export async function generateWeekInsights(
  courseId: string,
  weekNumber: number,
): Promise<WeekInsights> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Fetch the week's objectives, materials, and assignments
  const week = await prisma.courseWeek.findFirst({
    where: { courseId, weekNumber },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, description: true } },
      materials: { select: { title: true, materialType: true } },
      assignments: { select: { title: true, type: true, pointsPossible: true } },
    },
  })

  if (!week) throw new Error(`Week ${weekNumber} not found`)

  // Fetch student progress for this week's objectives
  const objectiveIds = week.objectives.map((o) => o.id)
  let progressSummary = ''

  if (objectiveIds.length > 0) {
    const progress = await prisma.studentObjectiveProgress.findMany({
      where: { objectiveId: { in: objectiveIds } },
      select: { masteryLevel: true, attempts: true, correct: true, objectiveId: true },
    })

    if (progress.length > 0) {
      const totalStudents = progress.length
      const mastered = progress.filter((p) => p.masteryLevel === 'mastered').length
      const struggling = progress.filter((p) => p.masteryLevel === 'struggling').length
      const notStarted = progress.filter((p) => p.masteryLevel === 'not_started').length
      const avgAttempts = progress.reduce((s, p) => s + p.attempts, 0) / totalStudents
      const avgCorrectRate = totalStudents > 0
        ? progress.reduce((s, p) => s + (p.attempts > 0 ? p.correct / p.attempts : 0), 0) / totalStudents
        : 0

      progressSummary = `
Student progress data for this week:
- ${totalStudents} total progress records across ${objectiveIds.length} objectives
- ${mastered} mastered (${Math.round((mastered / totalStudents) * 100)}%)
- ${struggling} struggling (${Math.round((struggling / totalStudents) * 100)}%)
- ${notStarted} not started (${Math.round((notStarted / totalStudents) * 100)}%)
- Average attempts per objective: ${avgAttempts.toFixed(1)}
- Average correct rate: ${Math.round(avgCorrectRate * 100)}%`
    }
  }

  const weekSummary = {
    weekNumber: week.weekNumber,
    title: week.title,
    topic: week.topic,
    objectives: week.objectives.map((o) => o.title),
    materials: week.materials.map((m) => `${m.materialType}: ${m.title}`),
    assignments: week.assignments.map((a) => `${a.title} (${a.type}, ${a.pointsPossible ?? '?'} pts)`),
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are an expert university teaching consultant. Generate 2–3 actionable teaching tips for a specific week of a course.

Return ONLY valid JSON — no markdown fences, no commentary. The shape must be:
{ "tips": ["tip 1", "tip 2", "tip 3"] }

Rules:
- Each tip should be 1–2 sentences, specific, and actionable.
- If student progress data is provided, tailor tips to what students are struggling with, what's working, and how to improve.
- If no progress data, provide pedagogical best-practice tips based on the objectives and materials.
- Focus on: engagement strategies, assessment alignment, scaffolding, active learning techniques.
- Do NOT give generic advice. Reference the specific objectives and materials.`,
    messages: [
      {
        role: 'user',
        content: `Week details:\n${JSON.stringify(weekSummary, null, 2)}${progressSummary ? `\n\n${progressSummary}` : '\n\nNo student progress data available yet.'}`,
      },
    ],
  })

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  try {
    const parsed = JSON.parse(extractJsonPayload(responseText)) as { tips?: unknown[] }
    const tips = (parsed.tips ?? [])
      .filter((t): t is string => typeof t === 'string')
      .slice(0, 3)

    return { tips, weekNumber }
  } catch {
    return { tips: ['Review the objectives and ensure assessments are aligned with learning goals.'], weekNumber }
  }
}

// ── Share view analytics ────────────────────────────────────────────────────

export async function recordShareView(
  courseId: string,
  viewerIp: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    await prisma.courseMapShareView.create({
      data: { courseId, viewerIp, userAgent },
    })
  } catch {
    // Fire-and-forget — no error propagation
  }
}

export type ShareAnalytics = {
  totalViews: number
  lastViewedAt: string | null
  viewsByDay: { date: string; count: number }[]
}

export async function getShareAnalytics(courseId: string): Promise<ShareAnalytics> {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const [totalResult, lastView, dailyViews] = await Promise.all([
    prisma.courseMapShareView.count({ where: { courseId } }),
    prisma.courseMapShareView.findFirst({
      where: { courseId },
      orderBy: { viewedAt: 'desc' },
      select: { viewedAt: true },
    }),
    prisma.courseMapShareView.groupBy({
      by: ['viewedAt'],
      where: { courseId, viewedAt: { gte: fourteenDaysAgo } },
      _count: { id: true },
    }),
  ])

  // Build day-level counts from the raw groupBy (which groups by exact timestamp)
  // We need to aggregate by date string
  const countsByDate = new Map<string, number>()
  for (const row of dailyViews) {
    const dateStr = row.viewedAt.toISOString().slice(0, 10)
    countsByDate.set(dateStr, (countsByDate.get(dateStr) ?? 0) + row._count.id)
  }

  // Fill in all 14 days
  const viewsByDay: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    viewsByDay.push({ date: dateStr, count: countsByDate.get(dateStr) ?? 0 })
  }

  return {
    totalViews: totalResult,
    lastViewedAt: lastView?.viewedAt.toISOString() ?? null,
    viewsByDay,
  }
}

// ── Prerequisites ──────────────────────────────────────────────────────────

export type PrerequisiteGraph = {
  weekNumber: number
  weekId: string
  prerequisites: number[]
}[]

export async function addPrerequisite(weekId: string, prerequisiteWeekId: string): Promise<void> {
  if (weekId === prerequisiteWeekId) {
    throw new Error('A week cannot be its own prerequisite')
  }

  // Validate both weeks exist and belong to the same course
  const [week, prereqWeek] = await Promise.all([
    prisma.courseWeek.findUnique({ where: { id: weekId }, select: { id: true, courseId: true, weekNumber: true } }),
    prisma.courseWeek.findUnique({ where: { id: prerequisiteWeekId }, select: { id: true, courseId: true, weekNumber: true } }),
  ])

  if (!week || !prereqWeek) throw new Error('Week not found')
  if (week.courseId !== prereqWeek.courseId) throw new Error('Weeks must belong to the same course')

  // Check for circular dependencies via transitive closure
  const visited = new Set<string>()

  const allPrereqs = await prisma.courseWeekPrerequisite.findMany({
    where: {
      week: { courseId: week.courseId },
    },
    select: { weekId: true, prerequisiteWeekId: true },
  })

  // Build adjacency: weekId → prerequisiteWeekIds (what does this week depend on?)
  const adj = new Map<string, string[]>()
  for (const edge of allPrereqs) {
    const list = adj.get(edge.weekId) ?? []
    list.push(edge.prerequisiteWeekId)
    adj.set(edge.weekId, list)
  }

  // BFS from weekId following prerequisite edges — if we reach prerequisiteWeekId, cycle
  // Actually: we want to check if prerequisiteWeekId can reach weekId via the dependency chain
  // i.e. does prerequisiteWeekId depend (transitively) on weekId?
  const queue = [prerequisiteWeekId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === weekId) {
      throw new Error('Adding this prerequisite would create a circular dependency')
    }
    if (visited.has(current)) continue
    visited.add(current)
    const deps = adj.get(current) ?? []
    for (const dep of deps) {
      if (!visited.has(dep)) queue.push(dep)
    }
  }

  await prisma.courseWeekPrerequisite.create({
    data: { weekId, prerequisiteWeekId },
  })
}

export async function removePrerequisite(weekId: string, prerequisiteWeekId: string): Promise<void> {
  await prisma.courseWeekPrerequisite.deleteMany({
    where: { weekId, prerequisiteWeekId },
  })
}

export async function getPrerequisites(courseId: string): Promise<PrerequisiteGraph> {
  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      weekNumber: true,
      dependsOn: {
        select: {
          prerequisiteWeek: { select: { weekNumber: true } },
        },
      },
    },
  })

  return weeks.map((w) => ({
    weekNumber: w.weekNumber,
    weekId: w.id,
    prerequisites: w.dependsOn.map((d) => d.prerequisiteWeek.weekNumber).sort((a, b) => a - b),
  }))
}

// ── Student course map progress ────────────────────────────────────────────

export type StudentWeekProgress = {
  weekNumber: number
  title: string
  objectives: { title: string; masteryLevel: string }[]
  overallMastery: 'mastered' | 'struggling' | 'not_started'
}

export async function getStudentCourseMapProgress(
  courseId: string,
  userId: string,
): Promise<StudentWeekProgress[]> {
  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    select: {
      weekNumber: true,
      title: true,
      objectives: {
        orderBy: { orderIndex: 'asc' },
        select: {
          title: true,
          progress: {
            where: { studentId: userId },
            select: { masteryLevel: true },
            take: 1,
          },
        },
      },
    },
  })

  return weeks.map((w) => {
    const objectives = w.objectives.map((o) => ({
      title: o.title,
      masteryLevel: o.progress[0]?.masteryLevel ?? 'not_started',
    }))

    let masteredCount = 0
    let strugglingCount = 0
    for (const o of objectives) {
      if (o.masteryLevel === 'mastered') masteredCount++
      else if (o.masteryLevel === 'struggling') strugglingCount++
    }

    const total = objectives.length
    let overallMastery: 'mastered' | 'struggling' | 'not_started' = 'not_started'
    if (total > 0) {
      if (masteredCount === total) overallMastery = 'mastered'
      else if (masteredCount > 0 || strugglingCount > 0) overallMastery = 'struggling'
    }

    return { weekNumber: w.weekNumber, title: w.title, objectives, overallMastery }
  })
}

// ── Course map update notifications ────────────────────────────────────────

// ── Gap analysis types ──────────────────────────────────────────────────────

export type GapAnalysisOutcome = {
  outcome: string
  status: 'covered' | 'partial' | 'missing'
  coveringWeeks: number[]
  notes: string
}

export type GapAnalysisRedundancy = {
  objectiveTitle: string
  weekNumbers: number[]
  suggestion: string
}

export type GapAnalysisResult = {
  gaps: GapAnalysisOutcome[]
  redundancies: GapAnalysisRedundancy[]
}

// ── Comment types ───────────────────────────────────────────────────────────

export type CourseMapCommentEntry = {
  id: string
  nodeId: string | null
  edgeId: string | null
  userId: string
  userName: string
  content: string
  resolved: boolean
  resolvedAt: string | null
  createdAt: string
}

// ── AI-powered gap analysis (Task 30) ───────────────────────────────────────

export async function analyzeCourseMapGaps(courseId: string): Promise<GapAnalysisResult> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      instructorId: true,
      weeks: {
        select: { weekNumber: true, objectives: { select: { title: true, description: true } } },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })
  if (!course) throw new Error('Course not found')

  // Collect all course objectives
  const courseObjectives = course.weeks.map((w) => ({
    weekNumber: w.weekNumber,
    objectives: w.objectives.map((o) => o.title),
  }))

  // Try to fetch program outcomes for the instructor
  const instructor = await prisma.user.findUnique({
    where: { id: course.instructorId },
    select: { program: true },
  })

  let programOutcomes: string[] = []
  if (instructor?.program) {
    const degreeProgram = await prisma.degreeProgram.findFirst({
      where: { code: instructor.program },
      include: { requirements: true },
    })
    if (degreeProgram) {
      programOutcomes = degreeProgram.requirements.map((r) => r.name)
    }
  }

  // If no program outcomes found, use a generic prompt
  const outcomeBlock = programOutcomes.length > 0
    ? `Program Learning Outcomes:\n${programOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    : 'No specific program outcomes found. Analyze the course objectives for internal consistency, coverage gaps, and redundancies based on common academic program standards.'

  const objectivesBlock = courseObjectives
    .map((w) => `Week ${w.weekNumber}: ${w.objectives.join('; ')}`)
    .join('\n')

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Analyze this course map for alignment gaps and redundancies.

${outcomeBlock}

Course Map Objectives by Week:
${objectivesBlock}

Return ONLY valid JSON matching this schema:
{
  "gaps": [{ "outcome": "string", "status": "covered|partial|missing", "coveringWeeks": [1,2], "notes": "string" }],
  "redundancies": [{ "objectiveTitle": "string", "weekNumbers": [1,3], "suggestion": "string" }]
}

For gaps: evaluate each program outcome against the course objectives. If no program outcomes exist, identify expected learning domains that appear to be missing.
For redundancies: find objectives that appear in substantially similar form across multiple weeks.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as GapAnalysisResult

  return {
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    redundancies: Array.isArray(parsed.redundancies) ? parsed.redundancies : [],
  }
}

// ── Course Map comments (Task 31 — updated for Phase 20 inline commenting) ──

export async function addCourseMapComment(
  courseId: string, _weekNumber: number, userId: string, text: string
): Promise<CourseMapCommentEntry> {
  // Look up the courseMap from the courseId
  const courseMap = await prisma.courseMap.findUnique({ where: { courseId }, select: { id: true } })
  if (!courseMap) throw new Error('Course map not found')

  const comment = await prisma.courseMapComment.create({
    data: { courseMapId: courseMap.id, userId, content: text },
    include: { user: { select: { name: true } } },
  })
  return {
    id: comment.id,
    nodeId: comment.nodeId,
    edgeId: comment.edgeId,
    userId: comment.userId,
    userName: comment.user.name,
    content: comment.content,
    resolved: comment.resolved,
    resolvedAt: comment.resolvedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
  }
}

export async function getCourseMapComments(courseId: string): Promise<CourseMapCommentEntry[]> {
  const courseMap = await prisma.courseMap.findUnique({ where: { courseId }, select: { id: true } })
  if (!courseMap) return []

  const comments = await prisma.courseMapComment.findMany({
    where: { courseMapId: courseMap.id, parentId: null },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return comments.map((c) => ({
    id: c.id,
    nodeId: c.nodeId,
    edgeId: c.edgeId,
    userId: c.userId,
    userName: c.user.name,
    content: c.content,
    resolved: c.resolved,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }))
}

export async function resolveCourseMapComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.courseMapComment.findUnique({ where: { id: commentId } })
  if (!comment) throw new Error('Comment not found')
  await prisma.courseMapComment.update({
    where: { id: commentId },
    data: { resolved: true, resolvedById: userId, resolvedAt: new Date() },
  })
}

// ── LTI deep links (Task 32) ───────────────────────────────────────────────

export function generateWeekDeepLink(courseId: string, weekNumber: number): string {
  const secret = process.env.STORAGE_JWT_SECRET
  if (!secret) throw new Error('STORAGE_JWT_SECRET is required for deep links')

  const token = jwt.sign(
    { courseId, weekNumber },
    secret,
    { algorithm: 'HS256', expiresIn: '30d' },
  )

  return `/api/lti/course-map/${courseId}/week/${weekNumber}?token=${token}`
}

export function verifyWeekDeepLinkToken(token: string): { courseId: string; weekNumber: number } | null {
  const secret = process.env.STORAGE_JWT_SECRET
  if (!secret) return null

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as {
      courseId: string
      weekNumber: number
    }
    return { courseId: payload.courseId, weekNumber: payload.weekNumber }
  } catch {
    return null
  }
}

// ── Course map update notifications ────────────────────────────────────────

// ── Pacing heatmap (Task 33) ────────────────────────────────────────────────

export type WeekWorkloadMetric = {
  weekNumber: number
  title: string
  objectivesCount: number
  materialsCount: number
  assignmentsCount: number
  workloadScore: number
}

export type WorkloadMetrics = {
  weeks: WeekWorkloadMetric[]
  maxScore: number
}

export async function getWeekWorkloadMetrics(courseId: string): Promise<WorkloadMetrics> {
  const courseWeeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { weekNumber: 'asc' },
    include: {
      _count: {
        select: {
          objectives: true,
          materials: true,
          assignments: true,
        },
      },
    },
  })

  const weeks: WeekWorkloadMetric[] = courseWeeks.map((w) => {
    const objectivesCount = w._count.objectives
    const materialsCount = w._count.materials
    const assignmentsCount = w._count.assignments
    const workloadScore = (objectivesCount * 3) + (materialsCount * 2) + (assignmentsCount * 4)
    return {
      weekNumber: w.weekNumber,
      title: w.title,
      objectivesCount,
      materialsCount,
      assignmentsCount,
      workloadScore,
    }
  })

  const maxScore = Math.max(1, ...weeks.map((w) => w.workloadScore))
  return { weeks, maxScore }
}

// ── Instructor notes (Task 35) ──────────────────────────────────────────────

export type CourseMapNoteEntry = {
  weekNumber: number
  text: string
  updatedAt: string
}

export async function upsertCourseMapNote(
  courseId: string,
  weekNumber: number,
  userId: string,
  text: string,
): Promise<void> {
  if (!text.trim()) {
    // Delete note if text is empty
    await prisma.courseMapNote.deleteMany({
      where: { courseId, weekNumber, userId },
    })
    return
  }

  await prisma.courseMapNote.upsert({
    where: {
      courseId_weekNumber_userId: { courseId, weekNumber, userId },
    },
    create: { courseId, weekNumber, userId, text: text.trim() },
    update: { text: text.trim() },
  })
}

export async function getCourseMapNotes(courseId: string, userId: string): Promise<CourseMapNoteEntry[]> {
  const notes = await prisma.courseMapNote.findMany({
    where: { courseId, userId },
    orderBy: { weekNumber: 'asc' },
  })

  return notes.map((n) => ({
    weekNumber: n.weekNumber,
    text: n.text,
    updatedAt: n.updatedAt.toISOString(),
  }))
}

// ── AI material suggestions ──────────────────────────────────────────────────

export type MaterialSuggestionItem = {
  title: string
  materialType: string
  rationale: string
}

export async function suggestWeekMaterials(
  courseId: string,
  weekNumber: number,
): Promise<{ suggestions: MaterialSuggestionItem[] }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const week = await prisma.courseWeek.findFirst({
    where: { courseId, weekNumber },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true } },
      materials: { select: { title: true, materialType: true } },
    },
  })

  if (!week) throw new Error(`Week ${weekNumber} not found`)

  const existingMaterials = week.materials.map((m) => `${m.materialType}: ${m.title}`).join('\n')
  const objectives = week.objectives.map((o) => o.title).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design assistant for a university course.

Week ${weekNumber}: "${week.title}"${week.topic ? ` (Topic: ${week.topic})` : ''}

Objectives:
${objectives || 'None specified'}

Existing materials:
${existingMaterials || 'None yet'}

Suggest 3–5 additional readings or resources that complement the week's objectives and do NOT duplicate any existing materials. Each suggestion should be a specific, real type of academic resource (textbook chapter, journal article, video lecture, case study, etc.).

Valid material types: syllabus, lecture, reading, assignment, case, rubric, quiz

Return JSON only:
{
  "suggestions": [
    { "title": "...", "materialType": "reading|lecture|case|quiz|...", "rationale": "why this fits" }
  ]
}`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as { suggestions?: MaterialSuggestionItem[] }

  const suggestions = (parsed.suggestions ?? [])
    .filter((s): s is MaterialSuggestionItem =>
      typeof s.title === 'string' &&
      typeof s.materialType === 'string' &&
      typeof s.rationale === 'string'
    )
    .slice(0, 5)
    .map((s) => ({
      title: s.title.slice(0, 200),
      materialType: VALID_MATERIAL_TYPES.has(s.materialType) ? s.materialType : 'reading',
      rationale: s.rationale.slice(0, 300),
    }))

  return { suggestions }
}

// ── AI week summary ─────────────────────────────────────────────────────────

export async function generateWeekSummary(
  courseId: string,
  weekNumber: number,
): Promise<{ summary: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const week = await prisma.courseWeek.findFirst({
    where: { courseId, weekNumber },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true } },
      materials: { select: { title: true, materialType: true } },
      assignments: { select: { title: true, type: true, pointsPossible: true, dueAt: true } },
    },
  })

  if (!week) throw new Error(`Week ${weekNumber} not found`)

  const objectives = (week as { objectives: { title: string }[] }).objectives.map((o: { title: string }) => o.title).join('\n') || 'None'
  const materials = (week as { materials: { materialType: string; title: string }[] }).materials.map((m: { materialType: string; title: string }) => `${m.materialType}: ${m.title}`).join('\n') || 'None'
  const assignments = (week as { assignments: { title: string; type: string; pointsPossible: number | null; dueAt: Date | null }[] }).assignments.map((a: { title: string; type: string; pointsPossible: number | null; dueAt: Date | null }) => {
    const pts = a.pointsPossible != null ? ` (${a.pointsPossible} pts)` : ''
    return `${a.type}: ${a.title}${pts}`
  }).join('\n') || 'None'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design assistant. Write a concise 2–3 sentence summary of this week's content. Capture the learning goals, key activities, and deliverables in plain, professional language.

Week ${weekNumber}: "${week.title}"${week.topic ? ` (Topic: ${week.topic})` : ''}

Objectives:
${objectives}

Materials:
${materials}

Assignments:
${assignments}

Return JSON only:
{ "summary": "..." }`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as { summary?: string }

  return { summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'Unable to generate summary.' }
}

// ── AI alignment check ──────────────────────────────────────────────────────

export async function checkCourseAlignment(
  courseId: string,
): Promise<{ alignmentIssues: AlignmentIssue[] }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const weeks = await prisma.courseWeek.findMany({
    where: { courseId },
    orderBy: { weekNumber: 'asc' },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' }, select: { title: true } },
      assignments: { select: { title: true, type: true, pointsPossible: true } },
    },
  })

  if (weeks.length === 0) return { alignmentIssues: [] }

  const summary = weeks.map((w) => {
    const objs = (w as { objectives: { title: string }[] }).objectives
      .map((o: { title: string }) => o.title)
      .join('; ') || 'None'
    const assigns = (w as { assignments: { title: string; type: string; pointsPossible: number | null }[] }).assignments
      .map((a: { title: string; type: string; pointsPossible: number | null }) => {
        const pts = a.pointsPossible != null ? ` (${a.pointsPossible} pts)` : ''
        return `${a.title}${pts}`
      })
      .join('; ') || 'None'
    return `Week ${w.weekNumber}: "${w.title}"\n  Objectives: ${objs}\n  Assignments: ${assigns}`
  }).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum alignment reviewer. Analyze the following course map and identify alignment issues between objectives and assignments.

${summary}

For each issue found, classify it as one of:
- "uncovered_objective": An objective with no corresponding assignment to assess it
- "orphan_assignment": An assignment that doesn't clearly map to any stated objective
- "overloaded": A week with too many assignments relative to its objectives (e.g., 3+ assignments for 1 objective)
- "underloaded": A week with objectives but no assignments at all

Return JSON only:
{
  "issues": [
    { "weekNumber": 1, "issueType": "uncovered_objective", "title": "Brief title", "detail": "Explanation" }
  ]
}

If the course map is well-aligned, return { "issues": [] }.`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as { issues?: unknown[] }

  const issues: AlignmentIssue[] = Array.isArray(parsed.issues)
    ? parsed.issues
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
        .map((i) => ({
          weekNumber: typeof i.weekNumber === 'number' ? i.weekNumber : 0,
          issueType: (
            typeof i.issueType === 'string' &&
            ['uncovered_objective', 'orphan_assignment', 'overloaded', 'underloaded'].includes(i.issueType)
              ? i.issueType
              : 'uncovered_objective'
          ) as AlignmentIssue['issueType'],
          title: typeof i.title === 'string' ? i.title.slice(0, 200) : 'Alignment issue',
          detail: typeof i.detail === 'string' ? i.detail.slice(0, 500) : '',
        }))
    : []

  return { alignmentIssues: issues }
}

// ── AI assignment suggestions ─────────────────────────────────────────────

export async function suggestWeekAssignments(
  courseId: string,
  weekNumber: number
): Promise<{ suggestions: AssignmentSuggestion[] }> {
  const week = await prisma.courseWeek.findFirst({
    where: { courseId, weekNumber },
    include: {
      objectives: { select: { title: true, description: true } },
      assignments: { select: { title: true, type: true, description: true, pointsPossible: true } },
    },
  })
  if (!week) throw new Error('Week not found')
  if (week.objectives.length === 0) throw new Error('Week has no objectives')

  const objectivesSummary = week.objectives
    .map((o, i) => `${i + 1}. ${o.title}${o.description ? ` — ${o.description}` : ''}`)
    .join('\n')

  const existingAssignments = week.assignments.length > 0
    ? '\n\nExisting assignments (do NOT duplicate these):\n' +
      week.assignments.map((a) => `- ${a.title} (${a.type}, ${a.pointsPossible ?? '?'} pts)`).join('\n')
    : ''

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design assistant. Given these learning objectives for Week ${weekNumber} titled "${week.title}":\n\n${objectivesSummary}${existingAssignments}\n\nSuggest 2–3 NEW assignments that would effectively assess these objectives. Each assignment should have a clear title, a type (one of TEXT_SUBMISSION, AI_EXPERIENCE, or FILE_UPLOAD), a short description, suggested points, and a brief rationale explaining how it assesses the objectives.\n\nReturn JSON: { "suggestions": [{ "title": string, "type": "TEXT_SUBMISSION" | "AI_EXPERIENCE" | "FILE_UPLOAD", "description": string, "pointsPossible": number, "rationale": string }] }`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as { suggestions: AssignmentSuggestion[] }
  return { suggestions: parsed.suggestions ?? [] }
}

// ── Bloom's Taxonomy tagging ───────────────────────────────────────────────

export type BloomTagResult = {
  weekNumber: number
  objectiveIndex: number
  bloomLevel: BloomLevel
}

export async function tagObjectivesBloom(
  courseId: string,
  weeks: { weekNumber: number; objectives: { title: string }[] }[],
): Promise<{ tags: BloomTagResult[] }> {
  const objectives: { weekNumber: number; index: number; title: string }[] = []
  for (const w of weeks) {
    for (let i = 0; i < w.objectives.length; i++) {
      objectives.push({ weekNumber: w.weekNumber, index: i, title: w.objectives[i].title })
    }
  }
  if (objectives.length === 0) return { tags: [] }

  const listing = objectives
    .map((o, i) => `${i + 1}. [W${o.weekNumber}] ${o.title}`)
    .join('\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design expert specializing in Bloom's Taxonomy. Classify each learning objective below into exactly ONE Bloom's level:\n- remember (recall facts)\n- understand (explain concepts)\n- apply (use in new situations)\n- analyze (break down, compare)\n- evaluate (justify, critique)\n- create (produce, design)\n\nObjectives:\n${listing}\n\nReturn JSON: { "tags": [{ "index": number, "bloomLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create" }] }\nwhere "index" is the 0-based position in the list above.`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as {
    tags: { index: number; bloomLevel: string }[]
  }

  const validLevels = new Set<string>(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
  const result: BloomTagResult[] = []
  for (const tag of parsed.tags ?? []) {
    const obj = objectives[tag.index]
    if (!obj) continue
    const level = tag.bloomLevel?.toLowerCase()
    if (!validLevels.has(level)) continue
    result.push({
      weekNumber: obj.weekNumber,
      objectiveIndex: obj.index,
      bloomLevel: level as BloomLevel,
    })
  }

  return { tags: result }
}

// ── AI Rubric Generator (Task 51) ─────────────────────────────────────────

export type RubricCriterionResult = {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  beginning: string
  weight: number
}

export type CourseMapRubricResult = {
  assignmentTitle: string
  criteria: RubricCriterionResult[]
  totalPoints: number
}

export async function generateCourseMapRubric(
  _courseId: string,
  weekNumber: number,
  assignmentIndex: number,
  weeks: { weekNumber: number; objectives: { title: string }[]; assignments: { title: string; type: string; description: string | null; pointsPossible: number | null }[] }[],
): Promise<CourseMapRubricResult> {
  const week = weeks.find((w) => w.weekNumber === weekNumber)
  if (!week) throw new Error(`Week ${weekNumber} not found`)

  const assignment = week.assignments[assignmentIndex]
  if (!assignment) throw new Error(`Assignment index ${assignmentIndex} not found in week ${weekNumber}`)

  const totalPoints = assignment.pointsPossible ?? 100
  const objectivesStr = week.objectives.length > 0
    ? `\n\nWeek ${weekNumber} Learning Objectives:\n${week.objectives.map((o, i) => `${i + 1}. ${o.title}`).join('\n')}`
    : ''

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design expert. Generate a grading rubric for this assignment.

Assignment: "${assignment.title}"
Type: ${assignment.type}
${assignment.description ? `Description: ${assignment.description}` : ''}
Total Points: ${totalPoints}${objectivesStr}

Create 3-5 rubric criteria that align with the assignment and learning objectives. Each criterion should have 4 performance levels: Excellent, Proficient, Developing, Beginning. Assign a weight (percentage) to each criterion. Weights must sum to 100.

Return JSON:
{
  "criteria": [
    {
      "criterion": "criterion name",
      "excellent": "description of excellent performance",
      "proficient": "description of proficient performance",
      "developing": "description of developing performance",
      "beginning": "description of beginning performance",
      "weight": number (percentage, e.g. 30)
    }
  ]
}`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(extractJsonPayload(text)) as {
    criteria: RubricCriterionResult[]
  }

  // Validate and normalize weights
  const criteria = (parsed.criteria ?? []).slice(0, 5).map((c) => ({
    criterion: String(c.criterion ?? ''),
    excellent: String(c.excellent ?? ''),
    proficient: String(c.proficient ?? ''),
    developing: String(c.developing ?? ''),
    beginning: String(c.beginning ?? ''),
    weight: typeof c.weight === 'number' ? c.weight : 20,
  }))

  return {
    assignmentTitle: assignment.title,
    criteria,
    totalPoints,
  }
}

// ── Course map update notifications ────────────────────────────────────────

export async function notifyCourseMapUpdate(courseId: string, userId: string): Promise<number> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { courseCode: true },
  })
  if (!course) throw new Error('Course not found')

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })

  let count = 0
  for (const enrollment of enrollments) {
    // Don't notify the educator who made the change
    if (enrollment.studentId === userId) continue
    await createNotification({
      userId: enrollment.studentId,
      type: 'COURSE_MAP_UPDATED',
      title: 'Course Map Updated',
      body: `${course.courseCode} course map has been updated`,
      href: `/courses?course=${courseId}&tab=course-map`,
    })
    count++
  }

  return count
}
