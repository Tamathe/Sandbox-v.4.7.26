/**
 * ADA Compliance — Document Accessibility Scanner
 *
 * Combines local heuristic analysis with AI-powered structure detection
 * to produce a comprehensive accessibility audit for uploaded documents
 * (PDFs, course materials, tool content).
 *
 * Local analysis: heading detection, table detection, link quality, list detection
 * AI analysis (Haiku): structure inference, image refs, color-dependent info,
 *   complex table detection, paragraph-to-list suggestions
 *
 * Returns WCAG-mapped issues with severity, location, and auto-fix suggestions.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import { analyzeReadability } from './readability-service'
import { scoreToGrade } from './types'
import type {
  AccessibilityGrade,
  DocumentIssue,
  DocumentIssueSeverity,
  DocumentIssueType,
  DocumentScanResult,
  DocumentStructure,
  ReadabilityResult,
  ScanTargetType,
} from './types'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'

// ── WCAG criteria reference ──────────────────────────────────────────────────

const WCAG_MAP: Record<DocumentIssueType, { criteria: string; level: string }> = {
  'missing-headings': { criteria: '1.3.1 Info and Relationships', level: 'A' },
  'heading-skip': { criteria: '1.3.1 Info and Relationships', level: 'A' },
  'untagged-table': { criteria: '1.3.1 Info and Relationships', level: 'A' },
  'missing-alt-text': { criteria: '1.1.1 Non-text Content', level: 'A' },
  'image-of-text': { criteria: '1.4.5 Images of Text', level: 'AA' },
  'no-language-tag': { criteria: '3.1.1 Language of Page', level: 'A' },
  'missing-title': { criteria: '2.4.2 Page Titled', level: 'A' },
  'color-only-info': { criteria: '1.4.1 Use of Color', level: 'A' },
  'complex-table': { criteria: '1.3.1 Info and Relationships', level: 'A' },
  'long-paragraph': { criteria: '3.1.5 Reading Level', level: 'AAA' },
  'missing-list-structure': { criteria: '1.3.1 Info and Relationships', level: 'A' },
  'non-descriptive-link': { criteria: '2.4.4 Link Purpose (In Context)', level: 'A' },
}

// ── Local heuristic analysis ─────────────────────────────────────────────────

/** Detect headings from extracted PDF text (formatting cues). */
function detectHeadings(text: string): DocumentStructure['headings'] {
  const headings: DocumentStructure['headings'] = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Markdown headings
    const mdMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (mdMatch) {
      headings.push({ level: mdMatch[1].length, text: mdMatch[2], page: estimatePage(i, lines.length) })
      continue
    }

    // ALL CAPS short lines (likely headings in PDFs)
    if (line.length > 3 && line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
      headings.push({ level: 1, text: line, page: estimatePage(i, lines.length) })
      continue
    }

    // Short standalone lines followed by content (heuristic for PDF section headers)
    if (
      line.length < 60 &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().length > line.length * 2
    ) {
      // Check if it looks like a numbered section: "1.", "1.1", "Section 1", "Chapter 2"
      if (/^(\d+(\.\d+)*\.?\s|Chapter\s|Section\s|Part\s)/i.test(line)) {
        headings.push({ level: 2, text: line, page: estimatePage(i, lines.length) })
      }
    }
  }

  return headings
}

/** Check heading hierarchy for skips (h1 → h3 without h2). */
function validateHeadingHierarchy(headings: DocumentStructure['headings']): boolean {
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      return false
    }
  }
  return headings.length > 0
}

/** Detect table-like structures in extracted text. */
function detectTables(text: string): DocumentStructure['tables'] {
  const tables: DocumentStructure['tables'] = []
  const lines = text.split('\n')
  let tableStart = -1
  let currentRows = 0
  let maxCols = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Tab-delimited or pipe-delimited lines suggest a table
    const tabCols = line.split('\t').length
    const pipeCols = line.split('|').filter(Boolean).length

    if (tabCols >= 3 || pipeCols >= 3) {
      if (tableStart === -1) tableStart = i
      currentRows++
      maxCols = Math.max(maxCols, tabCols >= 3 ? tabCols : pipeCols)
    } else if (tableStart !== -1 && currentRows >= 2) {
      // End of table region
      tables.push({
        page: estimatePage(tableStart, lines.length),
        hasHeaders: true, // Assume first row is header (heuristic)
        rows: currentRows,
        cols: maxCols,
      })
      tableStart = -1
      currentRows = 0
      maxCols = 0
    } else {
      tableStart = -1
      currentRows = 0
      maxCols = 0
    }
  }

  // Close any open table
  if (tableStart !== -1 && currentRows >= 2) {
    tables.push({
      page: estimatePage(tableStart, lines.length),
      hasHeaders: true,
      rows: currentRows,
      cols: maxCols,
    })
  }

  return tables
}

/** Detect image references in extracted text. */
function detectImageReferences(text: string): DocumentStructure['images'] {
  const images: DocumentStructure['images'] = []
  const patterns = [
    /\[image\]/gi,
    /\[figure\s*\d*\]/gi,
    /see\s+figure\s+\d+/gi,
    /\(see\s+diagram\)/gi,
    /\bfig\.\s*\d+/gi,
    /\[graphic\]/gi,
    /\[photo\]/gi,
    /\[chart\]/gi,
    /\[graph\]/gi,
    /\bimage\s+\d+:/gi,
  ]

  const lines = text.split('\n')
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const lineIndex = text.substring(0, match.index).split('\n').length - 1
      images.push({
        page: estimatePage(lineIndex, lines.length),
        hasAltText: false, // PDF-extracted image refs never have alt text
        description: match[0],
      })
    }
  }

  return images
}

/** Detect links in text. */
function detectLinks(text: string): DocumentStructure['links'] {
  const links: DocumentStructure['links'] = []
  const lines = text.split('\n')

  // Markdown links
  const mdLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match
  while ((match = mdLinkPattern.exec(text)) !== null) {
    const lineIndex = text.substring(0, match.index).split('\n').length - 1
    links.push({
      page: estimatePage(lineIndex, lines.length),
      text: match[1],
      isDescriptive: isDescriptiveLink(match[1]),
    })
  }

  // Plain URLs
  const urlPattern = /(?:^|\s)(https?:\/\/\S+)/gm
  while ((match = urlPattern.exec(text)) !== null) {
    const lineIndex = text.substring(0, match.index).split('\n').length - 1
    links.push({
      page: estimatePage(lineIndex, lines.length),
      text: match[1],
      isDescriptive: false, // Raw URLs are never descriptive
    })
  }

  return links
}

/** Check if link text is descriptive (not "click here", "link", etc.) */
function isDescriptiveLink(text: string): boolean {
  const nonDescriptive = ['click here', 'here', 'link', 'this link', 'read more', 'more', 'learn more', 'click']
  return !nonDescriptive.includes(text.toLowerCase().trim())
}

/** Detect list-like content that isn't formatted as lists. */
function detectLists(text: string): DocumentStructure['lists'] {
  const lists: DocumentStructure['lists'] = []
  const lines = text.split('\n')
  let listStart = -1
  let listItems = 0
  let listType: 'ordered' | 'unordered' = 'unordered'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Bullet patterns: -, *, •, ▪
    if (/^[-*•▪]\s/.test(line)) {
      if (listStart === -1) { listStart = i; listType = 'unordered' }
      listItems++
    }
    // Numbered patterns: 1., 1), a., a)
    else if (/^(\d+[.)]\s|[a-z][.)]\s)/i.test(line)) {
      if (listStart === -1) { listStart = i; listType = 'ordered' }
      listItems++
    } else if (listStart !== -1 && listItems >= 2) {
      lists.push({
        page: estimatePage(listStart, lines.length),
        type: listType,
        items: listItems,
      })
      listStart = -1
      listItems = 0
    } else {
      listStart = -1
      listItems = 0
    }
  }

  if (listStart !== -1 && listItems >= 2) {
    lists.push({
      page: estimatePage(listStart, lines.length),
      type: listType,
      items: listItems,
    })
  }

  return lists
}

/** Rough page estimate from line position. */
function estimatePage(lineIndex: number, totalLines: number, pageCount = 1): number {
  if (pageCount <= 1) return 1
  return Math.min(pageCount, Math.floor((lineIndex / totalLines) * pageCount) + 1)
}

/** Generate a unique issue ID. */
let issueCounter = 0
function issueId(): string {
  return `issue-${++issueCounter}-${Date.now().toString(36)}`
}

// ── AI-powered analysis ──────────────────────────────────────────────────────

const AI_ANALYSIS_PROMPT = `You are a WCAG 2.1 AA compliance expert analyzing extracted PDF text for accessibility issues.

Analyze the following document text and identify structural accessibility issues. Return JSON only.

Focus on issues that are DETECTABLE from extracted text:
1. Color-dependent information ("highlighted in red", "see the green section", "items in blue")
2. Possible image-of-text references ("see the screenshot", "as shown in the image above")
3. Long paragraphs that should be broken into lists (3+ sequential items described in prose)
4. Missing document structure cues (no apparent sections, headings, or organization)
5. Complex tables that may lack proper headers

DO NOT fabricate issues. Only report what you can actually detect from the text.

Return this JSON structure:
{
  "colorReferences": [{"text": "...", "location": "Paragraph N"}],
  "imageOfTextRefs": [{"text": "...", "location": "Paragraph N"}],
  "listCandidates": [{"text": "first 50 chars...", "itemCount": 4, "location": "Paragraph N"}],
  "structureNotes": "Brief assessment of document organization",
  "complexTables": [{"location": "Paragraph N", "reason": "..."}],
  "hasTitle": true/false,
  "languageCues": "detected language or 'unclear'"
}`

interface AIAnalysisResult {
  colorReferences: Array<{ text: string; location: string }>
  imageOfTextRefs: Array<{ text: string; location: string }>
  listCandidates: Array<{ text: string; itemCount: number; location: string }>
  structureNotes: string
  complexTables: Array<{ location: string; reason: string }>
  hasTitle: boolean
  languageCues: string
}

async function analyzeWithAI(
  text: string,
  metadata: { filename: string; pageCount?: number },
): Promise<AIAnalysisResult> {
  // Truncate long documents for AI analysis (keep first + last sections)
  const maxChars = 6000
  let analysisText = text
  if (text.length > maxChars) {
    const half = Math.floor(maxChars / 2)
    analysisText = `${text.slice(0, half)}\n\n[... ${text.length - maxChars} characters omitted ...]\n\n${text.slice(-half)}`
  }

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${AI_ANALYSIS_PROMPT}\n\nFilename: ${metadata.filename}\nPage count: ${metadata.pageCount ?? 'unknown'}\n\nDocument text:\n${analysisText}`,
        },
      ],
    })

    const raw = response.content[0]
    const responseText = raw.type === 'text' ? raw.text : ''
    const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned) as AIAnalysisResult
  } catch {
    // Graceful fallback — return empty analysis
    return {
      colorReferences: [],
      imageOfTextRefs: [],
      listCandidates: [],
      structureNotes: 'AI analysis unavailable',
      complexTables: [],
      hasTitle: true,
      languageCues: 'en',
    }
  }
}

// ── Issue merging + scoring ──────────────────────────────────────────────────

function buildIssues(
  structure: DocumentStructure,
  readability: ReadabilityResult,
  aiResult: AIAnalysisResult,
  metadata: { filename: string; pageCount?: number },
): DocumentIssue[] {
  const issues: DocumentIssue[] = []

  // 1. Missing headings
  if (structure.headings.length === 0 && readability.wordCount > 200) {
    issues.push({
      id: issueId(),
      type: 'missing-headings',
      severity: 'critical',
      location: 'Entire document',
      description: 'No headings detected. Screen reader users cannot navigate by section.',
      wcagCriteria: WCAG_MAP['missing-headings'].criteria,
      suggestion: 'Add heading structure (H1 for title, H2 for sections, H3 for subsections).',
      autoFixable: false,
    })
  }

  // 2. Heading hierarchy skips
  if (!structure.headingHierarchyValid && structure.headings.length > 1) {
    // Find the specific skip
    for (let i = 1; i < structure.headings.length; i++) {
      if (structure.headings[i].level > structure.headings[i - 1].level + 1) {
        issues.push({
          id: issueId(),
          type: 'heading-skip',
          severity: 'major',
          location: `Heading "${structure.headings[i].text}" (page ${structure.headings[i].page})`,
          description: `Heading level jumps from H${structure.headings[i - 1].level} to H${structure.headings[i].level}, skipping H${structure.headings[i - 1].level + 1}.`,
          wcagCriteria: WCAG_MAP['heading-skip'].criteria,
          suggestion: `Change to H${structure.headings[i - 1].level + 1} or add intermediate headings.`,
          autoFixable: true,
          autoFix: `Change heading level to H${structure.headings[i - 1].level + 1}`,
        })
      }
    }
  }

  // 3. Image references without alt text
  for (const img of structure.images) {
    if (!img.hasAltText) {
      issues.push({
        id: issueId(),
        type: 'missing-alt-text',
        severity: 'critical',
        location: `Page ${img.page}: "${img.description ?? 'image reference'}"`,
        description: 'Image reference found without alternative text. Screen readers cannot describe this content.',
        wcagCriteria: WCAG_MAP['missing-alt-text'].criteria,
        suggestion: 'Add descriptive alt text that conveys the information or purpose of the image.',
        autoFixable: false,
      })
    }
  }

  // 4. Non-descriptive links
  for (const link of structure.links) {
    if (!link.isDescriptive) {
      issues.push({
        id: issueId(),
        type: 'non-descriptive-link',
        severity: 'major',
        location: `Page ${link.page}: "${link.text.slice(0, 60)}"`,
        description: `Link text "${link.text.slice(0, 40)}" does not describe the destination.`,
        wcagCriteria: WCAG_MAP['non-descriptive-link'].criteria,
        suggestion: 'Replace with descriptive text that explains where the link leads (e.g., "UK Academic Calendar" instead of "click here").',
        autoFixable: false,
      })
    }
  }

  // 5. Tables without clear headers
  for (const table of structure.tables) {
    if (table.rows >= 4 && table.cols >= 4) {
      issues.push({
        id: issueId(),
        type: 'complex-table',
        severity: 'major',
        location: `Page ${table.page}: ${table.rows}×${table.cols} table`,
        description: `Complex table (${table.rows} rows × ${table.cols} columns) may be difficult to navigate with assistive technology.`,
        wcagCriteria: WCAG_MAP['complex-table'].criteria,
        suggestion: 'Ensure table headers are properly tagged with <th> and use scope attributes. Consider simplifying or splitting large tables.',
        autoFixable: false,
      })
    }
  }

  // 6. AI-detected: color-dependent information
  for (const ref of aiResult.colorReferences) {
    issues.push({
      id: issueId(),
      type: 'color-only-info',
      severity: 'major',
      location: ref.location,
      description: `Color is used as the sole means of conveying information: "${ref.text.slice(0, 80)}"`,
      wcagCriteria: WCAG_MAP['color-only-info'].criteria,
      suggestion: 'Add a non-color indicator (text label, pattern, icon) alongside the color reference.',
      autoFixable: false,
    })
  }

  // 7. AI-detected: image of text
  for (const ref of aiResult.imageOfTextRefs) {
    issues.push({
      id: issueId(),
      type: 'image-of-text',
      severity: 'major',
      location: ref.location,
      description: `Possible image-of-text detected: "${ref.text.slice(0, 80)}" — text embedded in images cannot be read by screen readers.`,
      wcagCriteria: WCAG_MAP['image-of-text'].criteria,
      suggestion: 'Replace image-of-text with actual text content. If the image is essential, provide full text in alt text or a text alternative.',
      autoFixable: false,
    })
  }

  // 8. AI-detected: prose that should be lists
  for (const candidate of aiResult.listCandidates) {
    issues.push({
      id: issueId(),
      type: 'missing-list-structure',
      severity: 'minor',
      location: candidate.location,
      description: `Paragraph contains ${candidate.itemCount} sequential items that would be more accessible as a formatted list.`,
      wcagCriteria: WCAG_MAP['missing-list-structure'].criteria,
      suggestion: 'Convert sequential items into a bulleted or numbered list for better screen reader navigation.',
      autoFixable: true,
      autoFix: 'Restructure as a list',
    })
  }

  // 9. Missing document title
  if (!aiResult.hasTitle) {
    issues.push({
      id: issueId(),
      type: 'missing-title',
      severity: 'major',
      location: 'Document metadata',
      description: 'No document title detected. Screen readers announce the filename instead.',
      wcagCriteria: WCAG_MAP['missing-title'].criteria,
      suggestion: `Add a descriptive title. Suggested: "${metadata.filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')}"`,
      autoFixable: true,
      autoFix: metadata.filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
    })
  }

  // 10. Long paragraphs (readability — advisory)
  if (readability.longSentences.length > 5) {
    issues.push({
      id: issueId(),
      type: 'long-paragraph',
      severity: 'minor',
      location: 'Multiple locations',
      description: `${readability.longSentences.length} sentences exceed 30 words, making the document harder to read for students with cognitive disabilities.`,
      wcagCriteria: WCAG_MAP['long-paragraph'].criteria,
      suggestion: 'Break long sentences into shorter ones. Target 15-20 words per sentence.',
      autoFixable: true,
      autoFix: 'AI simplification available',
    })
  }

  return issues
}

// ── Score computation ────────────────────────────────────────────────────────

function computeScore(issues: DocumentIssue[]): { overallScore: number; overallGrade: AccessibilityGrade } {
  // Penalty-based scoring: start at 1.0, deduct per issue by severity
  const penalties: Record<DocumentIssueSeverity, number> = {
    critical: 0.15,
    major: 0.08,
    minor: 0.03,
  }

  let score = 1.0
  for (const issue of issues) {
    score -= penalties[issue.severity]
  }

  score = Math.max(0, Math.min(1, Math.round(score * 100) / 100))
  return { overallScore: score, overallGrade: scoreToGrade(score) }
}

// ── Main scan function ───────────────────────────────────────────────────────

/**
 * Perform a full accessibility scan on document text.
 * Combines local heuristics with AI analysis.
 */
export async function scanDocument(
  extractedText: string,
  metadata: { filename: string; pageCount?: number; courseContext?: string },
): Promise<DocumentScanResult> {
  // 1. Local: readability analysis
  const readability = analyzeReadability(extractedText)

  // 2. Local: structure detection
  const headings = detectHeadings(extractedText)
  const tables = detectTables(extractedText)
  const images = detectImageReferences(extractedText)
  const links = detectLinks(extractedText)
  const lists = detectLists(extractedText)

  // 3. AI: deeper structure analysis
  const aiResult = await analyzeWithAI(extractedText, metadata)

  // 4. Assemble structure
  const structure: DocumentStructure = {
    pageCount: metadata.pageCount ?? 1,
    hasTitle: aiResult.hasTitle,
    headings,
    headingHierarchyValid: validateHeadingHierarchy(headings),
    tables,
    images,
    lists,
    links,
  }

  // 5. Build issues list
  issueCounter = 0 // Reset per scan
  const issues = buildIssues(structure, readability, aiResult, metadata)

  // 6. Score
  const { overallScore, overallGrade } = computeScore(issues)
  const autoFixable = issues.filter((i) => i.autoFixable).length
  const manualRequired = issues.length - autoFixable

  return {
    overallScore,
    overallGrade,
    issues,
    structure,
    readability,
    autoFixable,
    manualRequired,
  }
}

// ── Persist scan results ─────────────────────────────────────────────────────

/**
 * Scan a document and persist the result to AccessibilityReport.
 */
export async function scanAndPersist(
  targetType: ScanTargetType,
  targetId: string,
  text: string,
  metadata: { filename: string; pageCount?: number; courseContext?: string },
): Promise<DocumentScanResult> {
  const result = await scanDocument(text, metadata)

  const issuesJson = toJsonValue(result.issues)
  const structureJson = toJsonValue(result.structure)
  const readabilityJson = toJsonValue({
    fleschKincaid: result.readability.fleschKincaid,
    fleschReadingEase: result.readability.fleschReadingEase,
    avgSentenceLength: result.readability.avgSentenceLength,
    avgWordLength: result.readability.avgWordLength,
    passiveVoicePercent: result.readability.passiveVoicePercent,
    jargonTerms: result.readability.jargonTerms,
    longSentences: result.readability.longSentences,
    wordCount: result.readability.wordCount,
    sentenceCount: result.readability.sentenceCount,
  })
  const remediationPlanJson = toJsonValue(result.issues.filter((i) => i.autoFixable))

  // Compute sub-scores
  const altTextScore = result.structure.images.length === 0
    ? 1.0
    : result.structure.images.filter((i) => i.hasAltText).length / result.structure.images.length
  const structureScore = result.structure.headingHierarchyValid && result.structure.headings.length > 0 ? 0.9 : 0.3

  await prisma.accessibilityReport.upsert({
    where: {
      targetType_targetId: { targetType, targetId },
    },
    create: {
      targetType,
      targetId,
      overallScore: result.overallScore,
      overallGrade: result.overallGrade,
      readabilityScore: result.readability.overallScore,
      altTextScore,
      structureScore,
      contrastScore: 1, // Not applicable for PDFs
      captionScore: 1,  // Not applicable for PDFs
      issues: issuesJson,
      structure: structureJson,
      readability: readabilityJson,
      remediationPlan: remediationPlanJson,
    },
    update: {
      overallScore: result.overallScore,
      overallGrade: result.overallGrade,
      readabilityScore: result.readability.overallScore,
      altTextScore,
      structureScore,
      issues: issuesJson,
      structure: structureJson,
      readability: readabilityJson,
      remediationPlan: remediationPlanJson,
      updatedAt: new Date(),
    },
  })

  return result
}

/**
 * Bulk scan all materials in a course.
 */
export async function bulkScanCourse(courseId: string): Promise<{
  scanned: number
  avgScore: number
  grades: Record<AccessibilityGrade, number>
  materials: Array<{
    id: string
    title: string
    grade: AccessibilityGrade
    score: number
    issueCount: number
    autoFixable: number
  }>
}> {
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId },
    select: { id: true, title: true, content: true },
  })

  const grades: Record<AccessibilityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  const results: Array<{
    id: string
    title: string
    grade: AccessibilityGrade
    score: number
    issueCount: number
    autoFixable: number
  }> = []
  let totalScore = 0

  for (const mat of materials) {
    if (!mat.content || mat.content.length < 20) continue

    const result = await scanAndPersist('course_material', mat.id, mat.content, {
      filename: mat.title,
    })

    grades[result.overallGrade]++
    totalScore += result.overallScore
    results.push({
      id: mat.id,
      title: mat.title,
      grade: result.overallGrade,
      score: result.overallScore,
      issueCount: result.issues.length,
      autoFixable: result.autoFixable,
    })
  }

  return {
    scanned: results.length,
    avgScore: results.length > 0 ? Math.round((totalScore / results.length) * 100) / 100 : 1.0,
    grades,
    materials: results.sort((a, b) => a.score - b.score),
  }
}
