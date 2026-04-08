import { prisma } from '../prisma'
import type { ScenarioTemplateType, ScenarioPersona, ScenarioPhase, RubricDimension } from './types'

export async function createScenario(
  creatorId: string,
  data: {
    templateType: ScenarioTemplateType
    title: string
    description: string
    persona: ScenarioPersona
    situation: string
    phases: ScenarioPhase[]
    rubric: RubricDimension[]
    completionCriteria: string
    courseId?: string
  },
) {
  return prisma.interactiveScenario.create({
    data: {
      creatorId,
      templateType: data.templateType,
      title: data.title,
      description: data.description,
      persona: data.persona as object,
      situation: data.situation,
      phases: data.phases as object[],
      rubric: data.rubric as object[],
      completionCriteria: data.completionCriteria,
      courseId: data.courseId,
    },
  })
}

export async function updateScenario(
  scenarioId: string,
  data: Partial<{
    title: string
    description: string
    persona: ScenarioPersona
    situation: string
    phases: ScenarioPhase[]
    rubric: RubricDimension[]
    completionCriteria: string
    published: boolean
  }>,
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.persona) updateData.persona = data.persona as object
  if (data.phases) updateData.phases = data.phases as object[]
  if (data.rubric) updateData.rubric = data.rubric as object[]
  return prisma.interactiveScenario.update({
    where: { id: scenarioId },
    data: updateData,
  })
}

export async function listScenarios(filters?: {
  templateType?: ScenarioTemplateType
  courseId?: string
  published?: boolean
}) {
  const where: Record<string, unknown> = {}
  if (filters?.templateType) where.templateType = filters.templateType
  if (filters?.courseId) where.courseId = filters.courseId
  if (filters?.published !== undefined) where.published = filters.published

  return prisma.interactiveScenario.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { name: true } } },
  })
}

export async function getScenario(scenarioId: string) {
  return prisma.interactiveScenario.findUnique({
    where: { id: scenarioId },
    include: { creator: { select: { name: true } } },
  })
}

export async function incrementTimesPlayed(scenarioId: string) {
  await prisma.interactiveScenario.update({
    where: { id: scenarioId },
    data: { timesPlayed: { increment: 1 } },
  })
}

export function buildScenarioPrompt(scenario: {
  persona: ScenarioPersona
  situation: string
  phases: ScenarioPhase[]
  completionCriteria: string
}): string {
  const p = scenario.persona
  const phases = scenario.phases

  const phaseInstructions = phases.map((ph, i) => {
    let instruction = `Phase ${i + 1}: ${ph.name} — ${ph.objective}`
    if (ph.checkpoint?.required) {
      instruction += `\n  CHECKPOINT: ${ph.checkpoint.criteria}. Do not advance past this phase until the checkpoint is met. Steer back naturally if the student skips ahead.`
    }
    if (ph.maxDurationSecs) {
      instruction += `\n  Max duration: ${Math.floor(ph.maxDurationSecs / 60)} minutes`
    }
    return instruction
  }).join('\n\n')

  return `You are ${p.name}, a ${p.role}. Personality: ${p.personality}.
Voice: ${p.voice}.

SITUATION: ${scenario.situation}

PHASES (progress through these in order):
${phaseInstructions}

COMPLETION: ${scenario.completionCriteria}

RULES:
- Stay in character at all times
- Never break the fourth wall or mention that you are an AI
- Keep responses to 2-4 sentences to maintain conversational flow
- Track which phase the student is currently in
- When all phases are complete, say "SESSION_COMPLETE" at the end of your final response`
}
