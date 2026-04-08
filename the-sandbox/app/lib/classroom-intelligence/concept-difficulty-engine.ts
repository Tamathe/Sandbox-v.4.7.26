import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import type { ConceptDifficulty, MisconceptionPattern, DifficultyLevel } from './types'
import { DIFFICULTY_THRESHOLDS, MIN_SAMPLE_SIZE } from './types'

/** Compute concept difficulty for all concepts in a course */
export async function computeConceptDifficulty(courseId: string): Promise<ConceptDifficulty[]> {
  // StudentConceptMastery uses coursesEncountered[] array, not a direct courseId FK
  const masteryRecords = await prisma.studentConceptMastery.findMany({
    where: { coursesEncountered: { has: courseId } },
    orderBy: { concept: 'asc' },
  })

  // Group by concept
  const byConceptMap = new Map<string, typeof masteryRecords>()
  for (const record of masteryRecords) {
    if (!byConceptMap.has(record.concept)) byConceptMap.set(record.concept, [])
    byConceptMap.get(record.concept)!.push(record)
  }

  const difficulties: ConceptDifficulty[] = []

  // Filter concepts with enough samples, then process in batches of BATCH_SIZE
  const eligibleConcepts = Array.from(byConceptMap.entries())
    .filter(([, records]) => records.length >= MIN_SAMPLE_SIZE)

  const processConcept = async ([concept, records]: [string, typeof masteryRecords]) => {
    const masteryScores = records.map(r => r.masteryLevel)
    const avgMastery = masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length
    const masteryRate = masteryScores.filter(s => s >= 0.7).length / masteryScores.length
    const totalEncounters = records.reduce((sum, r) => sum + r.encounterCount, 0)
    const totalSuccesses = records.reduce((sum, r) => sum + r.successCount, 0)
    const successRate = totalEncounters > 0 ? totalSuccesses / totalEncounters : 0

    // Parallelize all async lookups per concept
    const [sandyData, flashcardData, previousSnapshot] = await Promise.all([
      computeSandyConfusion(courseId, concept),
      computeFlashcardFailRate(courseId, concept),
      prisma.conceptDifficultySnapshot.findFirst({
        where: {
          courseId,
          concept,
          computedAt: { gte: new Date(Date.now() - 10 * 86400000), lte: new Date(Date.now() - 5 * 86400000) },
        },
        orderBy: { computedAt: 'desc' },
      }),
    ])

    const difficulty = classifyDifficulty(masteryRate)
    const misconceptions = detectMisconceptions(concept, records)
    const delta7d = previousSnapshot ? avgMastery - previousSnapshot.avgMastery : 0

    return {
      concept,
      conceptLabel: formatConceptLabel(concept),
      difficulty,
      masteryRate,
      avgMastery,
      encounterCount: totalEncounters,
      successRate,
      misconceptions,
      sandyQuestionCount: sandyData.questionCount,
      sandyConfusionScore: sandyData.confusionScore,
      flashcardFailRate: flashcardData.failRate,
      delta7d,
    }
  }

  // Process in batches to avoid saturating the DB connection pool
  const BATCH_SIZE = 5
  for (let i = 0; i < eligibleConcepts.length; i += BATCH_SIZE) {
    const batch = eligibleConcepts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(processConcept))
    difficulties.push(...results)
  }

  // Sort by difficulty (hardest first)
  return difficulties.sort((a, b) => a.avgMastery - b.avgMastery)
}

function classifyDifficulty(masteryRate: number): DifficultyLevel {
  if (masteryRate >= DIFFICULTY_THRESHOLDS.EASY) return 'EASY'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.MODERATE) return 'MODERATE'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.DIFFICULT) return 'DIFFICULT'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.VERY_DIFFICULT) return 'VERY_DIFFICULT'
  return 'CRITICAL'
}

async function computeSandyConfusion(courseId: string, concept: string): Promise<{
  questionCount: number
  confusionScore: number
}> {
  const d14 = new Date(Date.now() - 14 * 86400000)
  const keyword = concept.replace(/-/g, ' ')

  // Count tool sessions with chat messages mentioning this concept
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      startedAt: { gte: d14 },
      chatMessages: {
        some: {
          content: { contains: keyword, mode: 'insensitive' },
          role: 'user',
        },
      },
    },
    select: { id: true },
  })

  const questionCount = sessions.length
  const confusionScore = Math.min(1, questionCount / 20)

  return { questionCount, confusionScore }
}

async function computeFlashcardFailRate(courseId: string, concept: string): Promise<{
  failRate: number | null
}> {
  const cards = await prisma.flashcardState.findMany({
    where: {
      courseId,
      conceptSlug: concept,
    },
    select: { easeFactor: true, reviewCount: true },
  })

  if (cards.length === 0) return { failRate: null }

  // Low ease factor = high difficulty
  const avgEase = cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length
  const failRate = Math.max(0, 1 - (avgEase - 1.3) / (2.5 - 1.3))

  return { failRate }
}

function detectMisconceptions(
  concept: string,
  records: { userId: string; masteryLevel: number; encounterCount: number; successCount: number }[]
): MisconceptionPattern[] {
  const strugglers = records.filter(r => r.encounterCount >= 3 && r.successCount / r.encounterCount < 0.5)

  if (strugglers.length < 3) return []

  return [{
    type: 'knowledge_gap',
    count: strugglers.length,
    description: `${strugglers.length} students show repeated difficulty with ${formatConceptLabel(concept)}`,
    exampleErrors: [],
  }]
}

function formatConceptLabel(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Persist concept difficulty snapshot */
export async function persistDifficultySnapshot(courseId: string, difficulties: ConceptDifficulty[]) {
  const now = new Date()
  if (difficulties.length === 0) return

  await prisma.conceptDifficultySnapshot.createMany({
    data: difficulties.map(d => ({
      courseId,
      concept: d.concept,
      conceptLabel: d.conceptLabel,
      difficulty: d.difficulty,
      masteryRate: d.masteryRate,
      avgMastery: d.avgMastery,
      encounterCount: d.encounterCount,
      successRate: d.successRate,
      commonErrors: toJsonValue(d.misconceptions),
      misconceptionCount: d.misconceptions.length,
      sandyQuestionCount: d.sandyQuestionCount,
      sandyConfusionScore: d.sandyConfusionScore,
      flashcardFailRate: d.flashcardFailRate,
      difficultyDelta7d: d.delta7d,
      computedAt: now,
    })),
  })
}
