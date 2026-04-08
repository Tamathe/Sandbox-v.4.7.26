import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import type { ConceptDifficulty, InsightCardData, Approach } from './types'

// ─── Insight Card Generator ────────────────────────────────────────────────
// Generates actionable insight cards from concept difficulty data.
// Uses historical data + heuristics (no direct LLM calls).

/** Generate insight cards from concept difficulty analysis */
export async function generateInsightCards(
  courseId: string,
  instructorId: string,
  difficulties: ConceptDifficulty[],
  assignmentId?: string
): Promise<InsightCardData[]> {
  const cards: InsightCardData[] = []

  // 1. CONCEPT_STRUGGLE — CRITICAL or VERY_DIFFICULT concepts (top 3)
  const struggling = difficulties
    .filter(d => d.difficulty === 'CRITICAL' || d.difficulty === 'VERY_DIFFICULT')
    .sort((a, b) => a.masteryRate - b.masteryRate)
    .slice(0, 3)

  for (const concept of struggling) {
    const interventions = await suggestInterventions(concept, courseId)
    cards.push({
      type: 'CONCEPT_STRUGGLE',
      title: `Students struggling with ${concept.conceptLabel}`,
      body: buildConceptStruggleBody(concept),
      evidence: [
        {
          source: 'concept-mastery',
          data: {
            masteryRate: concept.masteryRate,
            avgMastery: concept.avgMastery,
            encounterCount: concept.encounterCount,
            difficulty: concept.difficulty,
          },
        },
      ],
      suggestedActions: interventions,
      urgency: concept.difficulty === 'CRITICAL' ? 'immediate' : 'this_week',
      concepts: [concept.concept],
    })
  }

  // 2. MISCONCEPTION — concepts with misconceptions (top 2)
  const withMisconceptions = difficulties
    .filter(d => d.misconceptions.length > 0)
    .sort((a, b) => b.misconceptions.length - a.misconceptions.length)
    .slice(0, 2)

  for (const concept of withMisconceptions) {
    const topMisconception = concept.misconceptions[0]
    cards.push({
      type: 'MISCONCEPTION',
      title: `Misconception detected: ${concept.conceptLabel}`,
      body: `**${topMisconception.type}** — ${topMisconception.description}\n\n` +
        `Seen ${topMisconception.count} times. ` +
        `Example errors: ${topMisconception.exampleErrors.slice(0, 2).join('; ')}`,
      evidence: [
        {
          source: 'misconception-detection',
          data: {
            misconceptionType: topMisconception.type,
            count: topMisconception.count,
            totalMisconceptions: concept.misconceptions.length,
          },
        },
      ],
      suggestedActions: [
        {
          approach: 'RE_EXPLAIN' as Approach,
          reason: 'Direct misconception correction is the most effective first step',
          detail: `Address the "${topMisconception.type}" misconception with explicit contrast between the incorrect and correct mental model.`,
        },
      ],
      urgency: 'this_week',
      concepts: [concept.concept],
    })
  }

  // 3. INTERVENTION_RESULT — concepts with delta7d > 0.1 (celebration, top 1)
  const improving = difficulties
    .filter(d => d.delta7d > 0.1)
    .sort((a, b) => b.delta7d - a.delta7d)
    .slice(0, 1)

  for (const concept of improving) {
    cards.push({
      type: 'INTERVENTION_RESULT',
      title: `Improvement: ${concept.conceptLabel} is trending up`,
      body: `Mastery rate improved by **${(concept.delta7d * 100).toFixed(1)}%** over the past 7 days. ` +
        `Current mastery rate: ${(concept.masteryRate * 100).toFixed(0)}%, ` +
        `avg mastery: ${(concept.avgMastery * 100).toFixed(0)}%. ` +
        `Whatever you're doing is working — keep it up!`,
      evidence: [
        {
          source: 'trend-analysis',
          data: {
            delta7d: concept.delta7d,
            currentMasteryRate: concept.masteryRate,
            avgMastery: concept.avgMastery,
          },
        },
      ],
      suggestedActions: [],
      urgency: 'informational',
      concepts: [concept.concept],
    })
  }

  // 4. STUDENT_FEEDBACK — concepts with sandyQuestionCount >= 5 (top 1)
  const highSandyQuestions = difficulties
    .filter(d => d.sandyQuestionCount >= 5)
    .sort((a, b) => b.sandyQuestionCount - a.sandyQuestionCount)
    .slice(0, 1)

  for (const concept of highSandyQuestions) {
    cards.push({
      type: 'STUDENT_FEEDBACK',
      title: `Students asking Sandy about ${concept.conceptLabel}`,
      body: `**${concept.sandyQuestionCount} Sandy questions** related to this concept. ` +
        `Confusion score: ${(concept.sandyConfusionScore * 100).toFixed(0)}%. ` +
        `Students are actively seeking help — this is a good signal to address the topic proactively.`,
      evidence: [
        {
          source: 'sandy-analytics',
          data: {
            sandyQuestionCount: concept.sandyQuestionCount,
            sandyConfusionScore: concept.sandyConfusionScore,
          },
        },
      ],
      suggestedActions: [
        {
          approach: 'RE_EXPLAIN' as Approach,
          reason: 'High Sandy question volume suggests the current explanation is not landing',
          detail: 'Consider a brief in-class review or a short supplemental resource addressing common questions.',
        },
      ],
      urgency: 'this_week',
      concepts: [concept.concept],
    })
  }

  return cards
}

/** Suggest interventions based on past effectiveness + heuristics */
export async function suggestInterventions(
  concept: ConceptDifficulty,
  courseId: string
): Promise<{ approach: Approach; reason: string; detail: string }[]> {
  const suggestions: { approach: Approach; reason: string; detail: string }[] = []

  // Check past effective interventions on the same concepts
  const pastEffective = await prisma.teachingIntervention.findMany({
    where: {
      courseId,
      targetConcepts: { hasSome: [concept.concept] },
      status: 'effective',
    },
    orderBy: { effectSize: 'desc' },
    take: 2,
  })

  for (const intervention of pastEffective) {
    suggestions.push({
      approach: intervention.approach as Approach,
      reason: `Previously effective for this concept (effect size: ${intervention.effectSize?.toFixed(2) ?? 'N/A'})`,
      detail: intervention.description,
    })
  }

  // Heuristic suggestions based on signals
  if (concept.sandyConfusionScore > 0.5 && !suggestions.some(s => s.approach === 'RE_EXPLAIN')) {
    suggestions.push({
      approach: 'RE_EXPLAIN',
      reason: 'High confusion score suggests the current explanation needs a different angle',
      detail: 'Try an alternative explanation approach — analogies, worked examples, or a different sequence of ideas.',
    })
  }

  if (concept.flashcardFailRate !== null && concept.flashcardFailRate > 0.5 && !suggestions.some(s => s.approach === 'SCAFFOLD_TASK')) {
    suggestions.push({
      approach: 'SCAFFOLD_TASK',
      reason: `High flashcard fail rate (${(concept.flashcardFailRate * 100).toFixed(0)}%) indicates students need more structured practice`,
      detail: 'Break the concept into smaller prerequisite steps with guided practice before assessment.',
    })
  }

  if (concept.misconceptions.length > 0 && !suggestions.some(s => s.approach === 'VISUAL_AID')) {
    suggestions.push({
      approach: 'VISUAL_AID',
      reason: 'Misconceptions are often best corrected with visual comparisons',
      detail: 'Create a diagram or side-by-side comparison showing the correct vs. incorrect mental model.',
    })
  }

  // Always include SANDY_REVIEW as last option
  if (!suggestions.some(s => s.approach === 'SANDY_REVIEW')) {
    suggestions.push({
      approach: 'SANDY_REVIEW',
      reason: 'Sandy can create personalized review materials for struggling students',
      detail: 'Sandy will generate targeted review questions and explanations tailored to each student\'s gaps.',
    })
  }

  return suggestions.slice(0, 4)
}

/** Format concept difficulty data into a readable body */
export function buildConceptStruggleBody(concept: ConceptDifficulty): string {
  const lines: string[] = []

  lines.push(`**Mastery rate:** ${(concept.masteryRate * 100).toFixed(0)}% of students at mastery`)
  lines.push(`**Avg mastery:** ${(concept.avgMastery * 100).toFixed(0)}%`)
  lines.push(`**Success rate:** ${(concept.successRate * 100).toFixed(0)}%`)

  if (concept.sandyQuestionCount > 0) {
    lines.push(`**Sandy questions:** ${concept.sandyQuestionCount} (confusion: ${(concept.sandyConfusionScore * 100).toFixed(0)}%)`)
  }

  if (concept.flashcardFailRate !== null) {
    lines.push(`**Flashcard fail rate:** ${(concept.flashcardFailRate * 100).toFixed(0)}%`)
  }

  if (concept.misconceptions.length > 0) {
    lines.push(`**Misconceptions:** ${concept.misconceptions.length} pattern(s) detected`)
    for (const m of concept.misconceptions.slice(0, 2)) {
      lines.push(`  - ${m.type}: ${m.description} (${m.count}×)`)
    }
  }

  if (concept.delta7d !== 0) {
    const direction = concept.delta7d > 0 ? '↑' : '↓'
    lines.push(`**7-day trend:** ${direction} ${(Math.abs(concept.delta7d) * 100).toFixed(1)}%`)
  }

  return lines.join('\n')
}

/** Persist insight cards to the database */
export async function persistInsightCards(
  courseId: string,
  instructorId: string,
  cards: InsightCardData[],
  assignmentId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days

  for (const card of cards) {
    await prisma.instructorInsightCard.create({
      data: {
        courseId,
        instructorId,
        type: card.type,
        title: card.title,
        body: card.body,
        evidence: toJsonValue(card.evidence),
        suggestedActions: toJsonValue(card.suggestedActions),
        urgency: card.urgency,
        concepts: card.concepts,
        assignmentId: assignmentId ?? null,
        expiresAt,
      },
    })
  }
}
