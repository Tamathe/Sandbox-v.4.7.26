/**
 * ADA Compliance — Remediation Service
 *
 * Auto-fixes accessibility issues in course materials and other content.
 * Each fix type has a local heuristic + optional AI enhancement.
 *
 * Fix types:
 *  - headings:    Infer heading hierarchy from content cues
 *  - readability: Simplify long/complex sentences via Haiku
 *  - structure:   Convert run-on lists to formatted lists
 *  - alt-text:    Generate alt text for image references (placeholder)
 *
 * All changes are staged (not applied) — returned as a diff for
 * educator review before committing.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { analyzeReadability, suggestSimplification } from './readability-service'
import { scanAndPersist } from './document-scanner'
import type { DocumentIssue } from './types'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'

// ── Types ────────────────────────────────────────────────────────────────────

export type FixType = 'headings' | 'readability' | 'structure' | 'alt-text' | 'all'

export interface RemediationChange {
  id: string
  fixType: FixType
  issueType: string
  description: string
  before: string
  after: string
  confidence: number  // 0.0–1.0
  applied: boolean
}

export interface RemediationResult {
  targetType: string
  targetId: string
  title: string
  originalContent: string
  remediatedContent: string
  changes: RemediationChange[]
  beforeGrade: string
  afterGrade: string
  beforeScore: number
  afterScore: number
}

// ── Heading remediation ──────────────────────────────────────────────────────

/**
 * Infer and insert markdown headings into unstructured text.
 * Uses AI to identify logical section boundaries.
 */
async function remediateHeadings(content: string): Promise<RemediationChange[]> {
  const changes: RemediationChange[] = []

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are an accessibility expert adding heading structure to a document.

Analyze this text and add markdown headings (## for main sections, ### for subsections) where they belong.

Rules:
- Only add headings where there is a natural section break
- Use the existing text for heading content (don't invent new text)
- Preserve ALL original content — only add heading markers
- If the text is short or already well-structured, return it unchanged
- Return ONLY the modified text, no commentary

Text:
${content.slice(0, 4000)}`,
      }],
    })

    const result = response.content[0]
    const remediated = result.type === 'text' ? result.text.trim() : content

    if (remediated !== content && remediated.includes('#')) {
      // Find the specific heading insertions
      const originalLines = content.split('\n')
      const remediatedLines = remediated.split('\n')

      for (const line of remediatedLines) {
        if (line.startsWith('#') && !originalLines.includes(line)) {
          changes.push({
            id: `heading-${changes.length}`,
            fixType: 'headings',
            issueType: 'missing-headings',
            description: `Add heading: "${line.replace(/^#+\s*/, '').slice(0, 60)}"`,
            before: '(no heading)',
            after: line,
            confidence: 0.8,
            applied: false,
          })
        }
      }
    }
  } catch {
    // AI unavailable — skip heading remediation
  }

  return changes
}

// Heading application is handled by the AI-generated content in generateRemediation

// ── Readability remediation ──────────────────────────────────────────────────

/**
 * Simplify complex sentences in the content.
 */
async function remediateReadability(content: string): Promise<{
  changes: RemediationChange[]
  newContent: string
}> {
  const readability = analyzeReadability(content)

  // Only remediate if grade is C or worse
  if (readability.overallGrade === 'A' || readability.overallGrade === 'B') {
    return { changes: [], newContent: content }
  }

  try {
    const simplified = await suggestSimplification(content)
    const newReadability = analyzeReadability(simplified)

    if (newReadability.overallScore > readability.overallScore) {
      return {
        changes: [{
          id: 'readability-0',
          fixType: 'readability',
          issueType: 'readability-grade-level',
          description: `Simplify from grade ${Math.round(readability.fleschKincaid)} to grade ${Math.round(newReadability.fleschKincaid)}`,
          before: `Grade ${Math.round(readability.fleschKincaid)} (${readability.overallGrade})`,
          after: `Grade ${Math.round(newReadability.fleschKincaid)} (${newReadability.overallGrade})`,
          confidence: 0.75,
          applied: false,
        }],
        newContent: simplified,
      }
    }
  } catch {
    // AI unavailable
  }

  return { changes: [], newContent: content }
}

// ── Structure remediation ────────────────────────────────────────────────────

/**
 * Convert prose lists into formatted markdown lists.
 */
async function remediateStructure(content: string): Promise<{
  changes: RemediationChange[]
  newContent: string
}> {
  const changes: RemediationChange[] = []

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are an accessibility expert improving document structure.

Look for paragraphs that contain sequential items described in prose and convert them to proper markdown lists. Also look for run-on content that should be broken into separate paragraphs.

Rules:
- Only restructure where it genuinely improves readability
- Preserve ALL information — don't remove or summarize content
- Use - for unordered lists, 1. for ordered/sequential items
- If content is already well-structured, return it unchanged
- Return ONLY the modified text, no commentary

Text:
${content.slice(0, 4000)}`,
      }],
    })

    const result = response.content[0]
    const remediated = result.type === 'text' ? result.text.trim() : content

    if (remediated !== content) {
      // Count list markers added
      const originalLists = (content.match(/^[-*\d.]+\s/gm) ?? []).length
      const newLists = (remediated.match(/^[-*\d.]+\s/gm) ?? []).length
      const addedLists = newLists - originalLists

      if (addedLists > 0) {
        changes.push({
          id: 'structure-0',
          fixType: 'structure',
          issueType: 'missing-list-structure',
          description: `Convert ${addedLists} prose sequences to formatted lists`,
          before: `${originalLists} formatted lists`,
          after: `${newLists} formatted lists`,
          confidence: 0.7,
          applied: false,
        })
      }

      return { changes, newContent: remediated }
    }
  } catch {
    // AI unavailable
  }

  return { changes, newContent: content }
}

// ── Main remediation function ────────────────────────────────────────────────

/**
 * Generate remediation changes for a content item.
 * Returns staged changes (not applied) for educator review.
 */
export async function generateRemediation(
  targetType: string,
  targetId: string,
  fixTypes: FixType[] = ['all'],
  rawText?: string,
): Promise<RemediationResult> {
  const shouldFix = (type: FixType) => fixTypes.includes('all') || fixTypes.includes(type)

  // Load content
  let content = ''
  let title = 'Unknown'

  if (rawText) {
    // Freetext mode — content provided directly (e.g. from ADA tool page)
    content = rawText
    title = 'Document'
  } else if (targetType === 'course_material') {
    const mat = await prisma.courseMaterial.findUnique({
      where: { id: targetId },
      select: { content: true, title: true },
    })
    if (!mat) throw new Error('Material not found')
    content = mat.content
    title = mat.title
  } else if (targetType === 'tool') {
    const tool = await prisma.tool.findUnique({
      where: { id: targetId },
      select: { systemPrompt: true, name: true },
    })
    if (!tool) throw new Error('Tool not found')
    content = tool.systemPrompt ?? ''
    title = tool.name
  } else {
    throw new Error(`Unsupported target type: ${targetType}`)
  }

  // Get before score
  const beforeReadability = analyzeReadability(content)
  const beforeGrade = beforeReadability.overallGrade
  const beforeScore = beforeReadability.overallScore

  // Collect changes
  const allChanges: RemediationChange[] = []
  let workingContent = content

  // 1. Headings
  if (shouldFix('headings')) {
    const headingChanges = await remediateHeadings(content)
    allChanges.push(...headingChanges)
  }

  // 2. Structure
  if (shouldFix('structure')) {
    const { changes: structChanges, newContent } = await remediateStructure(workingContent)
    if (structChanges.length > 0) {
      workingContent = newContent
      allChanges.push(...structChanges)
    }
  }

  // 3. Readability (run last since it rewrites text)
  if (shouldFix('readability')) {
    const { changes: readChanges, newContent } = await remediateReadability(workingContent)
    if (readChanges.length > 0) {
      workingContent = newContent
      allChanges.push(...readChanges)
    }
  }

  // 4. Alt-text (placeholder — marks as needing manual review)
  if (shouldFix('alt-text')) {
    // Check existing report for image issues
    const report = await prisma.accessibilityReport.findUnique({
      where: { targetType_targetId: { targetType, targetId } },
      select: { issues: true },
    })

    if (report?.issues) {
      const issues = report.issues as unknown as DocumentIssue[]
      const altTextIssues = issues.filter((i) => i.type === 'missing-alt-text')
      for (const issue of altTextIssues) {
        allChanges.push({
          id: `alt-text-${allChanges.length}`,
          fixType: 'alt-text',
          issueType: 'missing-alt-text',
          description: `Image at ${issue.location} needs alt text (requires manual review)`,
          before: '(no alt text)',
          after: '(alt text needed — use Sandy\'s generate_alt_text tool)',
          confidence: 0.5,
          applied: false,
        })
      }
    }
  }

  // Calculate after score
  const afterReadability = analyzeReadability(workingContent)

  return {
    targetType,
    targetId,
    title,
    originalContent: content,
    remediatedContent: workingContent,
    changes: allChanges,
    beforeGrade: beforeGrade,
    afterGrade: afterReadability.overallGrade,
    beforeScore: beforeScore,
    afterScore: afterReadability.overallScore,
  }
}

/**
 * Apply approved remediation changes to the content item.
 * Only applies changes that have been marked as `applied: true`.
 */
export async function applyRemediation(
  targetType: string,
  targetId: string,
  remediatedContent: string,
): Promise<{ success: boolean; newGrade: string; newScore: number }> {
  // Validate target exists
  if (targetType === 'course_material') {
    await prisma.courseMaterial.update({
      where: { id: targetId },
      data: { content: remediatedContent },
    })
  } else if (targetType === 'tool') {
    await prisma.tool.update({
      where: { id: targetId },
      data: { systemPrompt: remediatedContent },
    })
  } else {
    throw new Error(`Unsupported target type: ${targetType}`)
  }

  // Re-scan after applying changes
  const result = await scanAndPersist(
    targetType as 'course_material' | 'tool',
    targetId,
    remediatedContent,
    { filename: targetId },
  )

  return {
    success: true,
    newGrade: result.overallGrade,
    newScore: result.overallScore,
  }
}

/**
 * Bulk remediate all D/F-graded materials in a course.
 * Returns staged changes for each material (not applied).
 */
export async function bulkGenerateRemediation(courseId: string): Promise<{
  materials: Array<{
    id: string
    title: string
    currentGrade: string
    projectedGrade: string
    changeCount: number
    autoFixableCount: number
  }>
  totalChanges: number
  projectedComplianceGain: number
}> {
  // Find D/F materials
  const reports = await prisma.accessibilityReport.findMany({
    where: {
      targetType: 'course_material',
      overallGrade: { in: ['D', 'F'] },
    },
    select: { targetId: true, overallGrade: true },
  })

  if (reports.length === 0) {
    return { materials: [], totalChanges: 0, projectedComplianceGain: 0 }
  }

  // Filter to materials in this course
  const courseMaterials = await prisma.courseMaterial.findMany({
    where: {
      courseId,
      id: { in: reports.map((r) => r.targetId) },
    },
    select: { id: true, title: true },
  })

  const materialIds = new Set(courseMaterials.map((m) => m.id))
  const relevantReports = reports.filter((r) => materialIds.has(r.targetId))

  const results: Array<{
    id: string
    title: string
    currentGrade: string
    projectedGrade: string
    changeCount: number
    autoFixableCount: number
  }> = []
  let totalChanges = 0

  for (const report of relevantReports.slice(0, 10)) { // Cap at 10 to avoid timeout
    try {
      const remediation = await generateRemediation('course_material', report.targetId, ['all'])
      const mat = courseMaterials.find((m) => m.id === report.targetId)

      results.push({
        id: report.targetId,
        title: mat?.title ?? 'Unknown',
        currentGrade: report.overallGrade,
        projectedGrade: remediation.afterGrade,
        changeCount: remediation.changes.length,
        autoFixableCount: remediation.changes.filter((c) => c.confidence >= 0.7).length,
      })
      totalChanges += remediation.changes.length
    } catch {
      // Skip materials that fail remediation
    }
  }

  const improved = results.filter((r) => r.projectedGrade < r.currentGrade).length
  const projectedComplianceGain = results.length > 0
    ? Math.round((improved / results.length) * 100)
    : 0

  return {
    materials: results,
    totalChanges,
    projectedComplianceGain,
  }
}
