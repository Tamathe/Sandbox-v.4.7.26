/**
 * Syllabus Drop — paste or upload syllabus → extract assignments → bulk scan → generate policy.
 * One-shot flow that produces a complete AI policy from raw syllabus text.
 */

import Anthropic from '@anthropic-ai/sdk'
import { scanAssignment, type ScanResult } from '../assignment-redesign-service'
import { generatePolicy, type AssignmentAILevel } from '../policy-builder-service'
import type { AIStance, DisciplineFamily } from '../../generated/prisma'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export interface ExtractedAssignment {
  title: string
  description: string
  type: string // essay, problem-set, project, exam, presentation, lab, etc.
}

export interface BulkScanResult {
  assignment: ExtractedAssignment
  scan: ScanResult
  suggestedLevel: AssignmentAILevel
}

export interface SyllabusDropResult {
  assignments: ExtractedAssignment[]
  scanResults: BulkScanResult[]
  policy: {
    fullText: string
    mainParagraph: string
    disclosureRequirements: string
    consequencesLanguage: string
  }
  avgCompletability: number
  /** Number of assignments that exceeded the scan cap and were not scanned */
  assignmentsSkipped: number
}

function scoreToLevel(aiCompletability: number): AssignmentAILevel {
  if (aiCompletability >= 80) return 'PROHIBITED'
  if (aiCompletability >= 60) return 'LIMITED'
  if (aiCompletability >= 30) return 'GUIDED'
  return 'REQUIRED'
}

export async function extractAssignmentsFromSyllabus(
  syllabusText: string,
): Promise<ExtractedAssignment[]> {
  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: `You extract assignments from a course syllabus. Return ONLY a JSON array of assignments found.

Format: [{"title": "...", "description": "...", "type": "essay|problem-set|project|exam|presentation|lab|discussion|quiz|other"}]

Include ALL graded items: essays, papers, problem sets, projects, exams, quizzes, presentations, labs, discussions, etc. For each, extract the title and a brief description of what students are expected to do. If the syllabus doesn't clearly describe the assignment, use the title and context to infer a description.

Return 0 items if no assignments found.`,
      messages: [{
        role: 'user',
        content: `Extract assignments from this syllabus:\n\n${syllabusText.slice(0, 6000)}`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedAssignment[]
    return parsed.filter(a => a.title && a.description)
  } catch (err) {
    console.error('[syllabus-drop] Assignment extraction failed:', err)
    throw new Error(
      'Failed to extract assignments from your syllabus. ' +
      'Please check that the text is readable and try again.'
    )
  }
}

const MAX_SCAN_COUNT = 10

export async function bulkScanAssignments(
  assignments: ExtractedAssignment[],
): Promise<BulkScanResult[]> {
  // Scan up to MAX_SCAN_COUNT assignments in parallel (rate limiting consideration)
  const toScan = assignments.slice(0, MAX_SCAN_COUNT)

  const results = await Promise.all(
    toScan.map(async (assignment) => {
      const scan = await scanAssignment(
        `${assignment.title}\n\n${assignment.description}`,
        assignment.type,
      )
      return {
        assignment,
        scan,
        suggestedLevel: scoreToLevel(scan.aiCompletability),
      }
    }),
  )

  return results
}

export async function generateComprehensivePolicy(
  stance: AIStance,
  courseName: string,
  scanResults: BulkScanResult[],
  disciplineFamily?: DisciplineFamily,
) {
  const assignmentLevels = scanResults.map(r => ({
    title: r.assignment.title,
    level: r.suggestedLevel,
  }))

  return generatePolicy(stance, courseName, assignmentLevels, disciplineFamily)
}

export async function processSyllabusDrop(
  syllabusText: string,
  stance: AIStance,
  courseName: string,
  disciplineFamily?: DisciplineFamily,
): Promise<SyllabusDropResult> {
  // Step 1: Extract assignments
  const assignments = await extractAssignmentsFromSyllabus(syllabusText)

  if (assignments.length === 0) {
    // Generate policy without specific assignments
    const policy = generatePolicy(stance, courseName, [], disciplineFamily)
    return {
      assignments: [],
      scanResults: [],
      policy: {
        fullText: policy.fullText,
        mainParagraph: policy.mainParagraph,
        disclosureRequirements: policy.disclosureRequirements,
        consequencesLanguage: policy.consequencesLanguage,
      },
      avgCompletability: 0,
      assignmentsSkipped: 0,
    }
  }

  // Step 2: Bulk scan
  const scanResults = await bulkScanAssignments(assignments)

  // Step 3: Generate policy
  const policy = await generateComprehensivePolicy(stance, courseName, scanResults, disciplineFamily)

  const avgCompletability = scanResults.length > 0
    ? Math.round(scanResults.reduce((s, r) => s + r.scan.aiCompletability, 0) / scanResults.length)
    : 0

  return {
    assignments,
    scanResults,
    policy: {
      fullText: policy.fullText,
      mainParagraph: policy.mainParagraph,
      disclosureRequirements: policy.disclosureRequirements,
      consequencesLanguage: policy.consequencesLanguage,
    },
    avgCompletability,
    assignmentsSkipped: Math.max(0, assignments.length - MAX_SCAN_COUNT),
  }
}
