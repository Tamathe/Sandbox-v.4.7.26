import { prisma } from '../prisma'
import type { CrossSectionInsight } from './types'
import { MIN_CROSS_SECTION_SIZE, SIGNIFICANT_SPREAD } from './types'

// ─── Cross-Section Comparison Service ──────────────────────────────────────

/**
 * Compare concept mastery across multiple sections of the same course.
 * Sections are identified by courseCode prefix (e.g., "CS-101" matches "CS-101-001", "CS-101-002").
 */
export async function compareSections(
  courseCode: string,
  semesterCode: string,
): Promise<CrossSectionInsight[]> {
  // Find all courses whose courseCode starts with the base code
  const sections = await prisma.course.findMany({
    where: { courseCode: { startsWith: courseCode } },
    select: { id: true, courseCode: true, title: true },
  })

  if (sections.length < 2) return []

  // Gather all concept mastery records across all matching sections
  const sectionIds = sections.map(s => s.id)
  const allMastery = await prisma.studentConceptMastery.findMany({
    where: { coursesEncountered: { hasSome: sectionIds } },
  })

  // Build concept → section → mastery data
  const conceptSectionMap = new Map<
    string,
    Map<string, { scores: number[]; studentIds: Set<string> }>
  >()

  for (const record of allMastery) {
    // Determine which section(s) this record belongs to
    for (const sectionId of sectionIds) {
      if (!record.coursesEncountered.includes(sectionId)) continue

      if (!conceptSectionMap.has(record.concept)) {
        conceptSectionMap.set(record.concept, new Map())
      }
      const sectionMap = conceptSectionMap.get(record.concept)!

      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, { scores: [], studentIds: new Set() })
      }
      const data = sectionMap.get(sectionId)!
      data.scores.push(record.masteryLevel)
      data.studentIds.add(record.userId)
    }
  }

  // Check for logged effective interventions per section
  const interventions = await prisma.teachingIntervention.findMany({
    where: {
      courseId: { in: sectionIds },
      improved: true,
    },
    select: { courseId: true, approach: true, targetConcepts: true },
  })

  const sectionLabelMap = new Map(sections.map(s => [s.id, s.courseCode]))

  const insights: CrossSectionInsight[] = []

  for (const [concept, sectionMap] of conceptSectionMap) {
    // Only report if at least 2 sections have data
    const sectionEntries = Array.from(sectionMap.entries())
      .filter(([, data]) => data.studentIds.size >= MIN_CROSS_SECTION_SIZE)

    if (sectionEntries.length < 2) continue

    const sectionResults = sectionEntries.map(([sectionId, data]) => {
      const avgMastery = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      const masteryRate = data.scores.filter(s => s >= 0.7).length / data.scores.length

      // Find effective intervention approach for this section+concept
      const sectionIntervention = interventions.find(
        i => i.courseId === sectionId && i.targetConcepts.includes(concept),
      )

      return {
        label: sectionLabelMap.get(sectionId) ?? sectionId,
        masteryRate,
        avgMastery,
        approach: sectionIntervention?.approach ?? null,
        studentCount: data.studentIds.size,
      }
    })

    const masteryRates = sectionResults.map(s => s.masteryRate)
    const spread = Math.max(...masteryRates) - Math.min(...masteryRates)

    if (spread <= 0.05) continue

    // Determine best approach from highest-performing section
    const bestSection = sectionResults.reduce((best, s) =>
      s.masteryRate > best.masteryRate ? s : best,
    )

    insights.push({
      courseCode,
      concept,
      sections: sectionResults,
      spread,
      bestApproach: bestSection.approach,
      isSignificant: spread >= SIGNIFICANT_SPREAD,
    })
  }

  // Sort by spread descending (most significant differences first)
  return insights.sort((a, b) => b.spread - a.spread)
}

/** Persist cross-section comparison results */
export async function persistCrossSectionComparisons(
  courseCode: string,
  semesterCode: string,
  insights: CrossSectionInsight[],
): Promise<void> {
  for (const insight of insights) {
    const masteryRates = insight.sections.map(s => s.masteryRate)

    await prisma.crossSectionComparison.upsert({
      where: {
        courseCode_concept_semesterCode: {
          courseCode,
          concept: insight.concept,
          semesterCode,
        },
      },
      create: {
        courseCode,
        concept: insight.concept,
        semesterCode,
        sections: insight.sections,
        sectionCount: insight.sections.length,
        bestMasteryRate: Math.max(...masteryRates),
        worstMasteryRate: Math.min(...masteryRates),
        spreadPercent: insight.spread,
        bestApproach: insight.bestApproach,
        isSignificant: insight.isSignificant,
        effectSize: insight.isSignificant ? insight.spread : null,
      },
      update: {
        sections: insight.sections,
        sectionCount: insight.sections.length,
        bestMasteryRate: Math.max(...masteryRates),
        worstMasteryRate: Math.min(...masteryRates),
        spreadPercent: insight.spread,
        bestApproach: insight.bestApproach,
        isSignificant: insight.isSignificant,
        effectSize: insight.isSignificant ? insight.spread : null,
      },
    })
  }
}
