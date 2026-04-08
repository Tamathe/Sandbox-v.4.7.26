/**
 * Syllabus Architect — Assignment + Objective Sync
 *
 * Creates Assignment and LearningObjective records from parsed syllabus data.
 *
 * - Assignments: created from CourseLessonItems that have dueDate or whose
 *   parent unit has unitType in [ASSIGNMENT, QUIZ, EXAM].
 * - LearningObjectives: detected via Bloom's taxonomy verb matching in module
 *   labels and descriptions.
 *
 * For re-import (syncCourseMap): only creates new records for genuinely new
 * units/modules — checks existing records by label match.
 */

import type { PrismaClient } from '../../generated/prisma'
import type { ParseResult, ExtractedUnit, ExtractedModule } from './pdf-parser'

// ── Bloom's Verb → Level Map (for explicit objective detection) ─────────────

const BLOOMS_VERB_MAP: Record<string, string> = {
  remember: 'REMEMBER', recall: 'REMEMBER', list: 'REMEMBER', define: 'REMEMBER',
  identify: 'REMEMBER', name: 'REMEMBER',
  understand: 'UNDERSTAND', explain: 'UNDERSTAND', describe: 'UNDERSTAND',
  summarize: 'UNDERSTAND', interpret: 'UNDERSTAND', classify: 'UNDERSTAND',
  apply: 'APPLY', use: 'APPLY', demonstrate: 'APPLY', solve: 'APPLY',
  implement: 'APPLY', execute: 'APPLY',
  analyze: 'ANALYZE', compare: 'ANALYZE', contrast: 'ANALYZE',
  differentiate: 'ANALYZE', examine: 'ANALYZE', investigate: 'ANALYZE',
  evaluate: 'EVALUATE', assess: 'EVALUATE', judge: 'EVALUATE',
  critique: 'EVALUATE', justify: 'EVALUATE', defend: 'EVALUATE',
  create: 'CREATE', design: 'CREATE', construct: 'CREATE',
  develop: 'CREATE', formulate: 'CREATE', produce: 'CREATE',
}

/**
 * Detects the Bloom's taxonomy level from an explicit objective string.
 * Checks the first verb (first word, or first word after "to") against BLOOMS_VERB_MAP.
 * Returns the matched level or 'UNDERSTAND' as default.
 */
function detectBloomLevelFromObjective(objective: string): string {
  const lower = objective.toLowerCase().trim()
  const words = lower.split(/\s+/)

  // Check first word
  if (words[0] && BLOOMS_VERB_MAP[words[0]]) {
    return BLOOMS_VERB_MAP[words[0]]
  }

  // Check word after "to" (e.g., "Students will be able to analyze...")
  const toIndex = words.indexOf('to')
  if (toIndex >= 0 && words[toIndex + 1] && BLOOMS_VERB_MAP[words[toIndex + 1]]) {
    return BLOOMS_VERB_MAP[words[toIndex + 1]]
  }

  // Scan all words as fallback
  for (const word of words) {
    if (BLOOMS_VERB_MAP[word]) return BLOOMS_VERB_MAP[word]
  }

  return 'UNDERSTAND'
}

// ── Bloom's Taxonomy Verb Map (for text scanning) ──────────────────────────

const BLOOM_VERBS: Record<string, string[]> = {
  create: ['design', 'construct', 'produce', 'develop', 'compose', 'build', 'formulate', 'generate', 'plan', 'invent'],
  evaluate: ['judge', 'assess', 'critique', 'justify', 'argue', 'defend', 'evaluate', 'appraise', 'recommend'],
  analyze: ['examine', 'compare', 'contrast', 'differentiate', 'categorize', 'analyze', 'distinguish', 'investigate', 'organize'],
  apply: ['implement', 'execute', 'solve', 'demonstrate', 'use', 'apply', 'calculate', 'practice', 'operate', 'illustrate'],
  understand: ['explain', 'summarize', 'interpret', 'classify', 'describe', 'discuss', 'paraphrase', 'predict', 'translate'],
  remember: ['define', 'list', 'recall', 'identify', 'recognize', 'name', 'state', 'memorize', 'label', 'match'],
}

// Objective indicator phrases
const OBJECTIVE_INDICATORS = [
  'students will',
  'student will',
  'you will',
  'able to',
  'by the end',
  'learning objective',
  'learning outcome',
  'course objective',
  'upon completion',
  'after completing',
]

// Assignment-eligible unit types (uppercase enum values)
const ASSIGNMENT_UNIT_TYPES = new Set(['ASSIGNMENT', 'QUIZ', 'EXAM'])

// Unit type → assignment category mapping
const UNIT_TYPE_TO_CATEGORY: Record<string, string> = {
  EXAM: 'exam',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
}

/**
 * Detects the Bloom's taxonomy level from text by scanning for verb matches.
 * Returns the highest-order level found, or null if none detected.
 */
function detectBloomLevel(text: string): string | null {
  const lower = text.toLowerCase()
  // Check in reverse order of complexity (highest first)
  const levels = ['create', 'evaluate', 'analyze', 'apply', 'understand', 'remember']
  for (const level of levels) {
    const verbs = BLOOM_VERBS[level]
    for (const verb of verbs) {
      // Match whole word boundaries
      const regex = new RegExp(`\\b${verb}\\b`, 'i')
      if (regex.test(lower)) {
        return level
      }
    }
  }
  return null
}

/**
 * Checks if text contains learning objective indicators.
 */
function containsObjectiveIndicator(text: string): boolean {
  const lower = text.toLowerCase()
  return OBJECTIVE_INDICATORS.some((indicator) => lower.includes(indicator))
}

/**
 * Creates Assignment records from parsed syllabus units.
 * Only creates for lessons with dueDate or in assignment/quiz/exam units.
 *
 * @param tx - Prisma transaction client
 * @param courseId - The course ID
 * @param result - The ParseResult from the syllabus parser
 * @param existingLabels - Set of existing assignment titles (for sync dedup)
 * @returns Number of assignments created
 */
export async function createAssignmentsFromParse(
  tx: Pick<PrismaClient, 'assignment'>,
  courseId: string,
  result: ParseResult,
  existingLabels?: Set<string>,
): Promise<number> {
  let created = 0

  for (const unit of result.units) {
    const unitType = unit.unitType.toUpperCase()
    const isAssignmentUnit = ASSIGNMENT_UNIT_TYPES.has(unitType)
    const category = UNIT_TYPE_TO_CATEGORY[unitType] ?? 'homework'

    for (const mod of unit.modules) {
      for (const lesson of mod.lessons) {
        // Only create if lesson has dueDate OR parent is an assignment-type unit
        if (!lesson.dueDate && !isAssignmentUnit) continue

        // Skip if already exists (sync dedup)
        if (existingLabels?.has(lesson.label.toLowerCase().trim())) continue

        await tx.assignment.create({
          data: {
            courseId,
            title: lesson.label,
            description: lesson.rawSourceText || null,
            type: 'LEGACY_SUBMISSION',
            dueAt: lesson.dueDate ? new Date(lesson.dueDate) : null,
            pointsPossible: 100,
            category,
            isPublished: false,
          },
        })
        created++
      }
    }

    // Also create an assignment for units that are themselves assignment-type
    // but have no modules/lessons (top-level exam, quiz, etc.)
    if (isAssignmentUnit && unit.modules.length === 0) {
      if (existingLabels?.has(unit.label.toLowerCase().trim())) continue

      await tx.assignment.create({
        data: {
          courseId,
          title: unit.label,
          description: unit.rawSourceText?.slice(0, 500) || null,
          type: 'LEGACY_SUBMISSION',
          dueAt: unit.endDate ? new Date(unit.endDate) : null,
          pointsPossible: 100,
          category,
          isPublished: false,
        },
      })
      created++
    }
  }

  return created
}

/**
 * Creates LearningObjective records from parsed syllabus modules.
 * Detects objectives via indicator phrases and assigns Bloom's level.
 *
 * @param tx - Prisma transaction client
 * @param courseId - The course ID
 * @param result - The ParseResult from the syllabus parser
 * @param existingTitles - Set of existing objective titles (for sync dedup)
 * @returns Number of objectives created
 */
export async function createObjectivesFromParse(
  tx: Pick<PrismaClient, 'learningObjective'>,
  courseId: string,
  result: ParseResult,
  existingTitles?: Set<string>,
): Promise<number> {
  let created = 0

  for (let unitIdx = 0; unitIdx < result.units.length; unitIdx++) {
    const unit = result.units[unitIdx]

    // ── Explicit-objective-first priority ──────────────────────────────
    // If the unit has explicit objectives extracted from the syllabus,
    // create LearningObjective records from those and skip Bloom's inference.
    if (unit.explicitObjectives && unit.explicitObjectives.length > 0) {
      for (const objective of unit.explicitObjectives) {
        const trimmed = objective.trim()
        if (!trimmed) continue
        if (existingTitles?.has(trimmed.toLowerCase())) continue

        await tx.learningObjective.create({
          data: {
            courseId,
            title: trimmed.slice(0, 255),
            description: null,
            bloomLevel: detectBloomLevelFromObjective(trimmed),
            source: 'explicit',
            moduleNumber: unitIdx + 1,
            orderIndex: created,
          },
        })
        created++
      }
      continue // skip Bloom's inference for this unit
    }

    // ── Bloom's inference fallback (no explicit objectives) ────────────
    for (const mod of unit.modules) {
      const textToScan = [mod.label, mod.description ?? ''].join(' ')

      // Check if the module text contains objective indicators
      if (!containsObjectiveIndicator(textToScan)) {
        // Also check individual lesson labels for objective language
        const lessonObjectives = mod.lessons.filter((l) =>
          containsObjectiveIndicator(l.label) || detectBloomLevel(l.label),
        )

        for (const lesson of lessonObjectives) {
          if (existingTitles?.has(lesson.label.toLowerCase().trim())) continue

          const bloomLevel = detectBloomLevel(lesson.label)

          await tx.learningObjective.create({
            data: {
              courseId,
              title: lesson.label,
              description: lesson.rawSourceText || null,
              bloomLevel,
              source: 'inferred',
              moduleNumber: unitIdx + 1,
              orderIndex: created,
            },
          })
          created++
        }
        continue
      }

      // The module itself contains objective language — create objective(s)
      const bloomLevel = detectBloomLevel(textToScan)

      // If description has multiple objectives (bullet-point style), try to split
      const description = mod.description ?? ''
      const objectiveLines = splitObjectiveLines(description, mod.label)

      for (const line of objectiveLines) {
        if (existingTitles?.has(line.toLowerCase().trim())) continue

        const lineBloom = detectBloomLevel(line) ?? bloomLevel

        await tx.learningObjective.create({
          data: {
            courseId,
            title: line.slice(0, 255),
            description: description || null,
            bloomLevel: lineBloom,
            source: 'syllabus',
            moduleNumber: unitIdx + 1,
            orderIndex: created,
          },
        })
        created++
      }
    }
  }

  return created
}

/**
 * Splits a module description into individual objective lines if it contains
 * bullet-point or numbered patterns. Falls back to the module label as a
 * single objective.
 */
function splitObjectiveLines(description: string, fallbackLabel: string): string[] {
  if (!description) return [fallbackLabel]

  // Split on common bullet patterns: "- ", "• ", "1. ", "a) "
  const lines = description
    .split(/(?:^|\n)\s*(?:[-•*]|\d+[.):]|[a-z][).])\s*/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 5)

  // Only use split lines if they contain objective language
  const objectiveLines = lines.filter(
    (l) => containsObjectiveIndicator(l) || detectBloomLevel(l),
  )

  return objectiveLines.length > 0 ? objectiveLines : [fallbackLabel]
}

/**
 * Fetches existing assignment titles and objective titles for a course,
 * used during sync to avoid creating duplicates.
 */
export async function getExistingLabels(
  tx: Pick<PrismaClient, 'assignment' | 'learningObjective'>,
  courseId: string,
): Promise<{ assignmentLabels: Set<string>; objectiveTitles: Set<string> }> {
  const [assignments, objectives] = await Promise.all([
    tx.assignment.findMany({
      where: { courseId },
      select: { title: true },
    }),
    tx.learningObjective.findMany({
      where: { courseId },
      select: { title: true },
    }),
  ])

  return {
    assignmentLabels: new Set(assignments.map((a) => a.title.toLowerCase().trim())),
    objectiveTitles: new Set(objectives.map((o) => o.title.toLowerCase().trim())),
  }
}
