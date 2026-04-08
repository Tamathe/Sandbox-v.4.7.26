/**
 * Pack Builder Service — AI-powered personalized starter pack generation.
 * Takes faculty intake answers + profile data, selects and customizes seed
 * templates from the library using Claude AI, and creates a personalized pack.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { generatePolicy } from '../policy-builder-service'
import type { DisciplineFamily, AIStance, PackAssignmentType, AITier, Prisma } from '../../generated/prisma'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BuilderIntake {
  userId: string
  courseId: string
  courseDescription: string  // "Organic Chemistry II, 120 students, lab-based"
  classSize?: number
  courseType?: string        // lecture, lab, seminar, clinical, studio
  comfortLevel?: string     // nervous, cautious, open, enthusiastic
  concerns?: string         // "worried about plagiarism in lab reports"
  existingAssignmentTypes?: string[]
}

export interface TimelineStep {
  week: number
  action: string
  itemId?: string  // links to a CustomPackItem
}

export interface BuilderResult {
  packId: string
  pack: {
    id: string
    name: string
    status: string
    items: Array<{
      id: string
      templateId: string | null
      title: string
      description: string
      aiTier: string
      aiLevel: string
      assignmentType: string
      syllabusLanguage: string
    }>
    checkpoints: Array<{
      id: string
      name: string
      description: string
      weight: string
    }>
    policyLanguage: string | null
    timelinePlan: TimelineStep[] | null
  }
}

interface AISelectionResult {
  selectedTemplateIds: string[]
  customizations: Array<{
    templateId: string
    customTitle: string
    customDescription: string
  }>
  selectedCheckpointIds: string[]
  policyLanguage: string
  timeline: Array<{
    week: number
    action: string
    templateId: string | null
  }>
}

// ── Event types for streaming builder ────────────────────────────────────────

export type BuilderEvent =
  | { type: 'status'; phase: string; message: string }
  | { type: 'template_selected'; templateId: string; title: string; description: string; aiTier: string; aiLevel: string; assignmentType: string; index: number }
  | { type: 'policy_chunk'; text: string }
  | { type: 'timeline'; steps: Array<{ week: number; action: string; templateId: string | null }> }
  | { type: 'complete'; packId: string }
  | { type: 'error'; message: string }

// ── Main Builder ─────────────────────────────────────────────────────────────

export async function buildPersonalizedPack(intake: BuilderIntake): Promise<BuilderResult> {
  // 1. Gather context
  const [literacyProfile, course] = await Promise.all([
    prisma.aILiteracyProfile.findUnique({ where: { userId: intake.userId } }),
    prisma.course.findUnique({
      where: { id: intake.courseId },
      select: { id: true, courseCode: true, title: true },
    }),
  ])

  if (!course) throw new Error('Course not found')

  const disciplineFamily: DisciplineFamily =
    literacyProfile?.disciplineFamily ?? 'PROFESSIONAL'

  const stance: AIStance = literacyProfile?.stance ?? 'GUIDED'

  const profileContext = literacyProfile
    ? { archetype: null as string | null, readiness: literacyProfile.readiness, comfort: literacyProfile.comfort }
    : null

  // 2. Fetch candidate templates + checkpoints
  const [templates, checkpoints] = await Promise.all([
    prisma.starterPackTemplate.findMany({
      where: { disciplineFamily },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.checkpointTemplate.findMany({
      where: { disciplineFamily },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  // 3. Call Claude Haiku for selection + customization
  let aiResult: AISelectionResult | null = null
  try {
    aiResult = await callClaudeForSelection(
      templates,
      checkpoints,
      intake,
      disciplineFamily,
      stance,
      course,
      profileContext,
    )
  } catch {
    // Fall through to heuristic fallback
  }

  // 4. Fallback if AI call failed
  if (!aiResult) {
    aiResult = buildHeuristicFallback(
      templates,
      checkpoints,
      intake,
      stance,
      course,
    )
  }

  // 5-9. Create DB records and return result
  return createPackFromAIResult(intake, aiResult, disciplineFamily, templates, checkpoints, course)
}

// ── Streaming Builder ────────────────────────────────────────────────────────

export async function buildPersonalizedPackStreaming(
  intake: BuilderIntake,
  emit: (event: BuilderEvent) => void,
): Promise<void> {
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  try {
    // Phase 1: Gather context
    emit({ type: 'status', phase: 'analyzing', message: 'Analyzing your course...' })

    const [literacyProfile, course] = await Promise.all([
      prisma.aILiteracyProfile.findUnique({ where: { userId: intake.userId } }),
      prisma.course.findUnique({
        where: { id: intake.courseId },
        select: { id: true, courseCode: true, title: true },
      }),
    ])

    if (!course) {
      emit({ type: 'error', message: 'Course not found' })
      return
    }

    const disciplineFamily: DisciplineFamily =
      literacyProfile?.disciplineFamily ?? 'PROFESSIONAL'

    const stance: AIStance = literacyProfile?.stance ?? 'GUIDED'

    const profileContext = literacyProfile
      ? { archetype: null as string | null, readiness: literacyProfile.readiness, comfort: literacyProfile.comfort }
      : null

    const [templates, checkpoints] = await Promise.all([
      prisma.starterPackTemplate.findMany({
        where: { disciplineFamily },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.checkpointTemplate.findMany({
        where: { disciplineFamily },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    // Phase 2: Select assignments via Claude (streaming)
    emit({ type: 'status', phase: 'selecting', message: 'Selecting assignments for your course...' })

    let aiResult: AISelectionResult | null = null
    try {
      aiResult = await callClaudeForSelectionStreaming(
        templates,
        checkpoints,
        intake,
        disciplineFamily,
        stance,
        course,
        profileContext,
      )
    } catch {
      // Fall through to heuristic fallback
    }

    if (!aiResult) {
      aiResult = buildHeuristicFallback(
        templates,
        checkpoints,
        intake,
        stance,
        course,
      )
    }

    // Emit template_selected events with staggered delay
    const selectedTemplates = templates.filter(t =>
      aiResult!.selectedTemplateIds.includes(t.id),
    )
    const customMap = new Map(
      aiResult.customizations.map(c => [c.templateId, c]),
    )

    for (let i = 0; i < selectedTemplates.length; i++) {
      const template = selectedTemplates[i]
      const custom = customMap.get(template.id)
      emit({
        type: 'template_selected',
        templateId: template.id,
        title: custom?.customTitle ?? template.title,
        description: custom?.customDescription ?? template.description,
        aiTier: template.aiTier,
        aiLevel: template.aiLevel,
        assignmentType: template.assignmentType,
        index: i,
      })
      await delay(150)
    }

    // Phase 3: Policy language
    emit({ type: 'status', phase: 'policy', message: 'Writing your AI policy...' })

    const policyText = aiResult.policyLanguage
    const chunkSize = 50
    for (let i = 0; i < policyText.length; i += chunkSize) {
      emit({ type: 'policy_chunk', text: policyText.slice(i, i + chunkSize) })
      await delay(30)
    }

    // Phase 4: Timeline
    emit({ type: 'status', phase: 'timeline', message: 'Building your implementation timeline...' })

    emit({
      type: 'timeline',
      steps: aiResult.timeline.map(step => ({
        week: step.week,
        action: step.action,
        templateId: step.templateId,
      })),
    })

    // Phase 5: Save to DB
    emit({ type: 'status', phase: 'saving', message: 'Saving your pack...' })

    const result = await createPackFromAIResult(
      intake,
      aiResult,
      disciplineFamily,
      templates,
      checkpoints,
      course,
    )

    emit({ type: 'complete', packId: result.packId })
  } catch (err) {
    emit({ type: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred' })
  }
}

// ── Shared DB Writer ─────────────────────────────────────────────────────────

async function createPackFromAIResult(
  intake: BuilderIntake,
  aiResult: AISelectionResult,
  disciplineFamily: DisciplineFamily,
  templates: Array<{
    id: string; title: string; description: string;
    aiTier: string; aiLevel: string; assignmentType: string;
    syllabusLanguage: string; tags: string[]
  }>,
  checkpoints: Array<{
    id: string; name: string; description: string;
    gradingWeight: string; aiTier: string
  }>,
  course: { id: string; courseCode: string; title: string },
): Promise<BuilderResult> {
  // Create CustomStarterPack
  const packName = `${course.courseCode} AI Starter Pack`

  const pack = await prisma.customStarterPack.create({
    data: {
      userId: intake.userId,
      courseId: intake.courseId,
      name: packName,
      disciplineFamily,
      courseDescription: intake.courseDescription,
      classSize: intake.classSize ?? null,
      courseType: intake.courseType ?? null,
      comfortLevel: intake.comfortLevel ?? null,
      concerns: intake.concerns ?? null,
      policyLanguage: aiResult.policyLanguage,
      timelinePlan: aiResult.timeline as unknown as Prisma.InputJsonValue,
      status: 'READY',
    },
  })

  // Build a lookup for customizations
  const customMap = new Map(
    aiResult.customizations.map(c => [c.templateId, c]),
  )

  // Resolve selected templates
  const selectedTemplates = templates.filter(t =>
    aiResult.selectedTemplateIds.includes(t.id),
  )

  // Create CustomPackItems
  const items = await Promise.all(
    selectedTemplates.map((template, idx) => {
      const custom = customMap.get(template.id)
      return prisma.customPackItem.create({
        data: {
          packId: pack.id,
          templateId: template.id,
          customTitle: custom?.customTitle ?? null,
          customDescription: custom?.customDescription ?? null,
          sortOrder: idx,
        },
      })
    }),
  )

  // Create CustomPackCheckpoints
  const selectedCheckpoints = checkpoints.filter(c =>
    aiResult.selectedCheckpointIds.includes(c.id),
  )

  const cpRecords = await Promise.all(
    selectedCheckpoints.map((cp, idx) =>
      prisma.customPackCheckpoint.create({
        data: {
          packId: pack.id,
          checkpointId: cp.id,
          sortOrder: idx,
        },
      }),
    ),
  )

  // Create PackImplementation records (NOT_STARTED) for each item
  await Promise.all(
    items.map(item =>
      prisma.packImplementation.create({
        data: {
          packId: pack.id,
          itemId: item.id,
          status: 'NOT_STARTED',
        },
      }),
    ),
  )

  // Return BuilderResult
  return {
    packId: pack.id,
    pack: {
      id: pack.id,
      name: pack.name,
      status: pack.status,
      items: items.map(item => {
        const template = selectedTemplates.find(t => t.id === item.templateId)
        const custom = item.templateId ? customMap.get(item.templateId) : null
        return {
          id: item.id,
          templateId: item.templateId,
          title: custom?.customTitle ?? template?.title ?? 'Untitled',
          description: custom?.customDescription ?? template?.description ?? '',
          aiTier: template?.aiTier ?? 'FOUNDATION',
          aiLevel: template?.aiLevel ?? 'GUIDED',
          assignmentType: template?.assignmentType ?? 'ESSAY',
          syllabusLanguage: item.customSyllabusLanguage ?? template?.syllabusLanguage ?? '',
        }
      }),
      checkpoints: cpRecords.map(cp => {
        const template = selectedCheckpoints.find(c => c.id === cp.checkpointId)
        return {
          id: cp.id,
          name: cp.customName ?? template?.name ?? 'Checkpoint',
          description: cp.customDescription ?? template?.description ?? '',
          weight: cp.customWeight ?? template?.gradingWeight ?? '10%',
        }
      }),
      policyLanguage: aiResult.policyLanguage,
      timelinePlan: aiResult.timeline.map(step => ({
        week: step.week,
        action: step.action,
        itemId: step.templateId
          ? items.find(i => i.templateId === step.templateId)?.id
          : undefined,
      })),
    },
  }
}

// ── Shared Prompt Building ───────────────────────────────────────────────────

function buildSelectionPrompts(
  templates: Array<{
    id: string; title: string; description: string;
    aiTier: AITier; assignmentType: PackAssignmentType; tags: string[]
  }>,
  checkpoints: Array<{ id: string; name: string; description: string; aiTier: AITier }>,
  intake: BuilderIntake,
  disciplineFamily: DisciplineFamily,
  stance: AIStance,
  course: { courseCode: string; title: string },
  discoveryProfile: { archetype: string | null; readiness: number; comfort: number } | null,
): { systemPrompt: string; userMessage: string } {
  const templateSummary = templates.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description.slice(0, 200),
    aiTier: t.aiTier,
    assignmentType: t.assignmentType,
    tags: t.tags,
  }))

  const checkpointSummary = checkpoints.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description.slice(0, 150),
    aiTier: c.aiTier,
  }))

  const systemPrompt = `You are an AI literacy curriculum advisor helping university faculty build personalized AI starter packs.

Given the available assignment templates and checkpoint templates, select the best combination for this instructor's course and comfort level.

RULES:
- Select 5-6 assignment templates that best fit the course context
- Include a spread across AI tiers (at least 1 FOUNDATION, at least 1 PARTNERSHIP or FLUENCY)
- If the instructor is nervous/cautious, weight toward FOUNDATION and AWARENESS
- If enthusiastic, include more PARTNERSHIP and FLUENCY items
- Select 2-4 checkpoint templates
- Generate a 12-week implementation timeline
- Write syllabus-ready AI policy language matching their comfort level and stance (${stance})

Return ONLY valid JSON (no markdown, no code fences):
{
  "selectedTemplateIds": ["id1", "id2", ...],
  "customizations": [
    {"templateId": "id1", "customTitle": "...", "customDescription": "..."},
    ...
  ],
  "selectedCheckpointIds": ["id1", ...],
  "policyLanguage": "Syllabus-ready paragraph(s) about AI use in this course...",
  "timeline": [
    {"week": 1, "action": "Introduce AI policy and expectations", "templateId": null},
    {"week": 2, "action": "First assignment: ...", "templateId": "id1"},
    ...
  ]
}`

  const userMessage = `Course: ${course.courseCode} — ${course.title}
Description: ${intake.courseDescription}
Class size: ${intake.classSize ?? 'unknown'}
Course type: ${intake.courseType ?? 'unknown'}
Discipline: ${disciplineFamily}
Instructor comfort level: ${intake.comfortLevel ?? 'unknown'}
Instructor concerns: ${intake.concerns ?? 'none specified'}
Existing assignment types: ${intake.existingAssignmentTypes?.join(', ') || 'none specified'}
${discoveryProfile ? `AI Literacy readiness: ${discoveryProfile.readiness}/100, comfort: ${discoveryProfile.comfort}/100` : ''}

Available assignment templates:
${JSON.stringify(templateSummary, null, 2)}

Available checkpoint templates:
${JSON.stringify(checkpointSummary, null, 2)}`

  return { systemPrompt, userMessage }
}

/** Parse raw AI text into a validated AISelectionResult, filtering to only known IDs. */
function parseAndValidateAIResult(
  text: string,
  templates: Array<{ id: string }>,
  checkpoints: Array<{ id: string }>,
): AISelectionResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in AI response')

  const parsed = JSON.parse(jsonMatch[0]) as AISelectionResult

  if (
    !Array.isArray(parsed.selectedTemplateIds) ||
    !Array.isArray(parsed.customizations) ||
    !Array.isArray(parsed.timeline) ||
    !parsed.policyLanguage
  ) {
    throw new Error('Invalid AI response structure')
  }

  const validTemplateIds = new Set(templates.map(t => t.id))
  parsed.selectedTemplateIds = parsed.selectedTemplateIds.filter(id => validTemplateIds.has(id))
  parsed.customizations = parsed.customizations.filter(c => validTemplateIds.has(c.templateId))

  const validCheckpointIds = new Set(checkpoints.map(c => c.id))
  parsed.selectedCheckpointIds = (parsed.selectedCheckpointIds ?? []).filter(id =>
    validCheckpointIds.has(id),
  )

  return parsed
}

// ── Claude AI Selection ──────────────────────────────────────────────────────

async function callClaudeForSelection(
  templates: Array<{
    id: string; title: string; description: string;
    aiTier: AITier; assignmentType: PackAssignmentType; tags: string[]
  }>,
  checkpoints: Array<{ id: string; name: string; description: string; aiTier: AITier }>,
  intake: BuilderIntake,
  disciplineFamily: DisciplineFamily,
  stance: AIStance,
  course: { courseCode: string; title: string },
  discoveryProfile: { archetype: string | null; readiness: number; comfort: number } | null,
): Promise<AISelectionResult> {
  const { systemPrompt, userMessage } = buildSelectionPrompts(
    templates, checkpoints, intake, disciplineFamily, stance, course, discoveryProfile,
  )

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return parseAndValidateAIResult(text, templates, checkpoints)
}

// ── Claude AI Selection (Streaming variant) ─────────────────────────────────

async function callClaudeForSelectionStreaming(
  templates: Array<{
    id: string; title: string; description: string;
    aiTier: AITier; assignmentType: PackAssignmentType; tags: string[]
  }>,
  checkpoints: Array<{ id: string; name: string; description: string; aiTier: AITier }>,
  intake: BuilderIntake,
  disciplineFamily: DisciplineFamily,
  stance: AIStance,
  course: { courseCode: string; title: string },
  discoveryProfile: { archetype: string | null; readiness: number; comfort: number } | null,
): Promise<AISelectionResult> {
  const { systemPrompt, userMessage } = buildSelectionPrompts(
    templates, checkpoints, intake, disciplineFamily, stance, course, discoveryProfile,
  )

  // Use streaming API — accumulate full text, then parse
  let fullText = ''
  const stream = anthropic.messages.stream({
    model: HAIKU_MODEL,
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text
    }
  }

  return parseAndValidateAIResult(fullText, templates, checkpoints)
}

// ── Heuristic Fallback ───────────────────────────────────────────────────────

function buildHeuristicFallback(
  templates: Array<{
    id: string; title: string; description: string;
    aiTier: AITier; assignmentType: PackAssignmentType;
    aiLevel: AIStance; syllabusLanguage: string; tags: string[]
  }>,
  checkpoints: Array<{ id: string; name: string; description: string; gradingWeight: string; aiTier: AITier }>,
  intake: BuilderIntake,
  stance: AIStance,
  course: { courseCode: string; title: string },
): AISelectionResult {
  // Pick first 2 from each tier (up to 6 total)
  const tiers: AITier[] = ['FOUNDATION', 'AWARENESS', 'PARTNERSHIP', 'FLUENCY']
  const selected: string[] = []
  for (const tier of tiers) {
    const tierTemplates = templates.filter(t => t.aiTier === tier)
    selected.push(...tierTemplates.slice(0, 2).map(t => t.id))
    if (selected.length >= 6) break
  }

  // If we still have fewer than 4, fill from remaining
  if (selected.length < 4) {
    for (const t of templates) {
      if (!selected.includes(t.id)) {
        selected.push(t.id)
        if (selected.length >= 5) break
      }
    }
  }

  // Customizations: use template title/description as-is (no custom overrides)
  const customizations = selected.map(id => {
    const t = templates.find(tpl => tpl.id === id)!
    return {
      templateId: id,
      customTitle: t.title,
      customDescription: t.description,
    }
  })

  // Select first 3 checkpoints
  const selectedCheckpointIds = checkpoints.slice(0, 3).map(c => c.id)

  // Generate policy via existing policy builder
  const assignmentLevels = selected.map(id => {
    const t = templates.find(tpl => tpl.id === id)!
    return {
      title: t.title,
      level: stanceToAILevel(t.aiLevel),
    }
  })
  const policy = generatePolicy(
    stance,
    `${course.courseCode} — ${course.title}`,
    assignmentLevels,
  )

  // Simple linear timeline: 1 item every 2 weeks
  const timeline: Array<{ week: number; action: string; templateId: string | null }> = [
    { week: 1, action: 'Introduce AI policy and discuss expectations', templateId: null },
  ]
  selected.forEach((id, idx) => {
    timeline.push({
      week: 2 + idx * 2,
      action: `Implement: ${templates.find(t => t.id === id)!.title}`,
      templateId: id,
    })
  })
  timeline.push({ week: 12, action: 'Reflect on semester AI integration', templateId: null })

  return {
    selectedTemplateIds: selected,
    customizations,
    selectedCheckpointIds,
    policyLanguage: policy.fullText,
    timeline,
  }
}

function stanceToAILevel(stance: AIStance): 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED' {
  switch (stance) {
    case 'PROHIBIT': return 'PROHIBITED'
    case 'CAUTIOUS': return 'LIMITED'
    case 'GUIDED': return 'GUIDED'
    case 'INTEGRATE': return 'GUIDED'
    case 'REQUIRE': return 'REQUIRED'
    default: return 'GUIDED'
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retrieve a user's pack for a specific course, or their most recent pack. */
export async function getPackForUser(
  userId: string,
  courseId?: string,
): Promise<Awaited<ReturnType<typeof prisma.customStarterPack.findFirst>> | null> {
  const where = courseId
    ? { userId, courseId }
    : { userId }

  return prisma.customStarterPack.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: { template: true },
        orderBy: { sortOrder: 'asc' },
      },
      checkpoints: {
        include: { checkpoint: true },
        orderBy: { sortOrder: 'asc' },
      },
      implementations: true,
    },
  })
}

/** Summary of all packs for a user (for the hub page). */
export async function getUserPackSummaries(
  userId: string,
): Promise<Array<{
  id: string
  name: string
  courseName: string
  status: string
  itemCount: number
  completedCount: number
}>> {
  const packs = await prisma.customStarterPack.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { courseCode: true, title: true } },
      items: { select: { id: true } },
      implementations: {
        select: { status: true },
      },
    },
  })

  return packs.map(pack => ({
    id: pack.id,
    name: pack.name,
    courseName: `${pack.course.courseCode} — ${pack.course.title}`,
    status: pack.status,
    itemCount: pack.items.length,
    completedCount: pack.implementations.filter(
      i => i.status === 'COMPLETED' || i.status === 'REFLECTED',
    ).length,
  }))
}
