import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { DisciplineFamily, ScenarioDifficulty, JudgmentCallScenario, Prisma } from '../../generated/prisma'

// ---------- Types ----------

export interface ScenarioChoice {
  id: string
  label: string
  description?: string
  nextNodeId: string
}

export interface ScenarioNode {
  id: string
  type: 'situation' | 'choice' | 'consequence' | 'reflection'
  content: string
  choices?: ScenarioChoice[]
  nextNodeId?: string
  isTerminal?: boolean
  scores?: { ethical: number; judgment: number }
  reflectionPrompt?: string
}

export interface ScenarioTree {
  startNodeId: string
  nodes: ScenarioNode[]
}

export interface ChoiceMade {
  nodeId: string
  choiceId: string
  timestamp: string
}

export interface Reflection {
  nodeId: string
  text: string
}

// ---------- Queries ----------

export async function getAvailableScenarios(
  disciplineFamily?: DisciplineFamily,
  difficulty?: ScenarioDifficulty,
): Promise<JudgmentCallScenario[]> {
  const where: Record<string, unknown> = { isActive: true }
  if (difficulty) where.difficulty = difficulty
  if (disciplineFamily) {
    where.OR = [
      { disciplineFamily },
      { disciplineFamily: null },
    ]
  }

  return prisma.judgmentCallScenario.findMany({
    where,
    orderBy: [{ difficulty: 'asc' }, { category: 'asc' }],
  })
}

export async function getScenario(scenarioId: string): Promise<JudgmentCallScenario | null> {
  return prisma.judgmentCallScenario.findUnique({ where: { id: scenarioId } })
}

export async function getUserAttempts(userId: string, scenarioIds?: string[]) {
  const where: Record<string, unknown> = { userId }
  if (scenarioIds?.length) where.scenarioId = { in: scenarioIds }

  return prisma.judgmentCallAttempt.findMany({
    where,
    select: {
      id: true,
      scenarioId: true,
      ethicalScore: true,
      judgmentScore: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ---------- Scoring ----------

export function scoreChoicePath(
  choicesMade: ChoiceMade[],
  scenarioTree: ScenarioTree,
): { ethicalScore: number; judgmentScore: number } {
  const nodeMap = new Map(scenarioTree.nodes.map((n) => [n.id, n]))

  // Walk through choices and collect terminal scores
  const terminalScores: { ethical: number; judgment: number }[] = []

  for (const choice of choicesMade) {
    // Find the choice node and the selected choice
    const choiceNode = nodeMap.get(choice.nodeId)
    if (!choiceNode?.choices) continue

    const selected = choiceNode.choices.find((c) => c.id === choice.choiceId)
    if (!selected) continue

    // Follow the chain from the selected choice to find consequence/terminal nodes
    let current = nodeMap.get(selected.nextNodeId)
    while (current) {
      if (current.isTerminal && current.scores) {
        terminalScores.push(current.scores)
      }
      current = current.nextNodeId ? nodeMap.get(current.nextNodeId) : undefined
    }
  }

  if (terminalScores.length === 0) {
    return { ethicalScore: 50, judgmentScore: 50 }
  }

  const ethicalScore = Math.round(
    terminalScores.reduce((sum, s) => sum + s.ethical, 0) / terminalScores.length,
  )
  const judgmentScore = Math.round(
    terminalScores.reduce((sum, s) => sum + s.judgment, 0) / terminalScores.length,
  )

  return {
    ethicalScore: Math.max(0, Math.min(100, ethicalScore)),
    judgmentScore: Math.max(0, Math.min(100, judgmentScore)),
  }
}

// ---------- AI Feedback ----------

const anthropic = new Anthropic()

export async function generateFeedback(
  scenarioTitle: string,
  choicesMade: ChoiceMade[],
  reflections: Reflection[],
  scores: { ethicalScore: number; judgmentScore: number },
  scenarioTree: ScenarioTree,
): Promise<string> {
  const nodeMap = new Map(scenarioTree.nodes.map((n) => [n.id, n]))

  // Build a readable path summary
  const pathSummary = choicesMade.map((c) => {
    const node = nodeMap.get(c.nodeId)
    const choice = node?.choices?.find((ch) => ch.id === c.choiceId)
    return `- At "${node?.content?.slice(0, 80)}..." → chose "${choice?.label}"`
  }).join('\n')

  const reflectionSummary = reflections.length > 0
    ? reflections.map((r) => `- "${r.text}"`).join('\n')
    : 'No reflections provided.'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are a supportive AI literacy coach for university students. A student just completed the judgment call scenario "${scenarioTitle}".

Their choices:
${pathSummary}

Their reflections:
${reflectionSummary}

Scores — Ethical: ${scores.ethicalScore}/100, Judgment: ${scores.judgmentScore}/100

Write 2-3 sentences of personalized feedback. Be encouraging but honest. Highlight what they did well, note any blind spots, and suggest one thing to consider next time. Keep it conversational — like a mentor, not a grader. Do not repeat the scores.`,
      },
    ],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : 'Great effort on this scenario!'
}

// ---------- Submit Attempt ----------

export async function submitAttempt(
  userId: string,
  scenarioId: string,
  choicesMade: ChoiceMade[],
  reflections: Reflection[],
) {
  const scenario = await prisma.judgmentCallScenario.findUnique({
    where: { id: scenarioId },
  })
  if (!scenario) throw new Error('Scenario not found')

  const tree = scenario.scenarioTree as unknown as ScenarioTree
  const scores = scoreChoicePath(choicesMade, tree)
  const feedback = await generateFeedback(
    scenario.title,
    choicesMade,
    reflections,
    scores,
    tree,
  )

  const attempt = await prisma.judgmentCallAttempt.create({
    data: {
      userId,
      scenarioId,
      choicesMade: choicesMade as unknown as Prisma.InputJsonValue,
      reflections: reflections.length > 0 ? (reflections as unknown as Prisma.InputJsonValue) : undefined,
      ethicalScore: scores.ethicalScore,
      judgmentScore: scores.judgmentScore,
      feedback,
      completedAt: new Date(),
    },
  })

  return { attempt, scores, feedback }
}
