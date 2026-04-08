 
/**
 * Syllabus Architect — PDF Parser
 *
 * Three-pass Haiku pipeline:
 *   Pass 1 — Structure Detection: section labels, unit types, raw date strings
 *   Pass 2 — Date Normalization: ISO dates + confidence scores (batched)
 *   Pass 3 — Prerequisite Language Detection: edge graph from prose signals
 *
 * fileHash diff-check: idempotent — returns the existing COMPLETE job if the
 * same PDF has already been processed for this course.
 *
 * Handles messy PDFs via:
 *   - Multi-column heuristic: splits on mid-line 4+ space runs
 *   - 8 000-char context guard on structure detection (Haiku context limit)
 *   - Robust JSON parsing with graceful fallbacks at every pass
 */

import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { prisma } from '../prisma'
import { extractText } from '../syllabus-parser-service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'

// ── Types ──────────────────────────────────────────────────────────────────────

export type UnitType =
  | 'lecture'
  | 'lab'
  | 'exam'
  | 'quiz'
  | 'assignment'
  | 'discussion'
  | 'other'

export type LayoutHint = 'week-based' | 'unit-based' | 'topic-based' | 'date-based'

export interface ExtractedLesson {
  label: string
  rawSourceText: string
  dueDate: string | null        // ISO 8601 date (YYYY-MM-DD) or null
  dateConfidence: number        // 0.0 – 1.0
}

export interface ExtractedModule {
  label: string
  description: string | null
  lessons: ExtractedLesson[]
}

export interface ExtractedUnit {
  label: string
  description: string | null
  rawSourceText: string         // verbatim source for audit trail
  unitType: UnitType
  startDate: string | null      // ISO 8601 or null
  endDate: string | null
  dateConfidence: number        // 0.0 – 1.0
  modules: ExtractedModule[]
  explicitObjectives: string[]  // verbatim learning objectives from syllabus
}

export interface ExtractedPolicy {
  category: 'late' | 'attendance' | 'grading' | 'academic_integrity' | 'communication' | 'other'
  title: string
  content: string               // verbatim policy text from syllabus
}

export interface ExtractedGradingWeight {
  category: string              // e.g. "Exams", "Homework", "Participation"
  weight: number                // percentage as decimal (e.g. 0.25 for 25%)
  description: string | null
}

export interface ExtractedEdge {
  fromLabel: string
  toLabel: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  evidence: string              // verbatim phrase that triggered detection
}

export interface ParseResult {
  units: ExtractedUnit[]
  edges: ExtractedEdge[]
  policies: ExtractedPolicy[]
  gradingWeights: ExtractedGradingWeight[]
  layoutHint: LayoutHint
  semesterStart: string | null
  semesterEnd: string | null
  overallDateConfidence: number // avg across all units
}

// ── Internal types (pass 1 output) ────────────────────────────────────────────

interface RawSection {
  label: string
  rawSourceText: string
  unitType: UnitType
  rawDateString: string | null
  explicitObjectives: string[]
  subSections: Array<{
    label: string
    rawSourceText: string
    rawDateString: string | null
  }>
}

interface StructureDetectionResult {
  layoutHint: LayoutHint
  hasExplicitDates: boolean
  semesterStart: string | null
  semesterEnd: string | null
  sections: RawSection[]
}

// ── fileHash ───────────────────────────────────────────────────────────────────

export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// ── PDF text extraction ────────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { extractPdfText } = await import('../pdf-extract')
  const { text } = await extractPdfText(buffer)
  return text
}

// ── Multi-column heuristic ─────────────────────────────────────────────────────
//
// pdf-parse reads columns left-to-right across the physical line, producing
// interleaved text when two columns are present. Detection heuristic:
// if >40% of lines are shorter than 60 chars AND contain a mid-line run of
// 4+ spaces, the document is probably multi-column. We split on those runs.

function preprocessRawText(raw: string): string {
  const lines = raw.split('\n')
  const shortWithGap = lines.filter((l) => l.length < 60 && /\s{4,}/.test(l))
  if (shortWithGap.length / lines.length > 0.4) {
    return lines.map((l) => l.replace(/\s{4,}/g, '\n')).join('\n')
  }
  return raw
}

// ── Pass 1: Structure Detection ────────────────────────────────────────────────

async function detectStructure(text: string): Promise<StructureDetectionResult> {
  // Hard cap to avoid Haiku context overflow; 16 000 chars ≈ ~3 000 tokens
  // (Haiku 4.5 supports 200K context — 16K is well within safe limits)
  const truncated = text.slice(0, 16000)

  const prompt = `You are parsing a university course syllabus. Analyze this text and extract its structure.

INSTRUCTIONS:
1. Identify the primary organizational unit (weeks, units, modules, topics, or dates).
2. Extract each top-level section (e.g. "Week 1", "Unit 3: Recursion", "Jan 15 – Intro").
3. For each section, capture sub-items (labs, readings, assignments, exams) as subSections.
4. Preserve ALL raw date strings exactly as they appear (e.g. "Jan 15", "Week 3", "3/15/25").
5. Detect semester/course start and end dates if present anywhere in the document.
6. Classify unitType from: lecture | lab | exam | quiz | assignment | discussion | other.
7. For each section, extract any explicitly stated learning objectives, outcomes, or competencies. Look for phrases like "Students will be able to...", "By the end of this unit...", "Learning objectives:", "Course outcomes:", "Competencies:". Capture each objective as a complete sentence. If none found, return an empty array.

Return ONLY valid JSON matching this exact schema (no prose, no markdown fences):
{
  "layoutHint": "week-based" | "unit-based" | "topic-based" | "date-based",
  "hasExplicitDates": boolean,
  "semesterStart": "YYYY-MM-DD or null",
  "semesterEnd": "YYYY-MM-DD or null",
  "sections": [
    {
      "label": "string",
      "rawSourceText": "verbatim text block for this section, max 400 chars",
      "unitType": "lecture" | "lab" | "exam" | "quiz" | "assignment" | "discussion" | "other",
      "rawDateString": "string or null",
      "explicitObjectives": ["string array of verbatim objectives"],
      "subSections": [
        { "label": "string", "rawSourceText": "string", "rawDateString": "string or null" }
      ]
    }
  ]
}

SYLLABUS TEXT:
${truncated}`

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 6144,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    return JSON.parse(clean) as StructureDetectionResult
  } catch {
    // Minimal fallback: single unit encompassing the whole document
    return {
      layoutHint: 'topic-based',
      hasExplicitDates: false,
      semesterStart: null,
      semesterEnd: null,
      sections: [
        {
          label: 'Course Content',
          rawSourceText: truncated.slice(0, 400),
          unitType: 'lecture',
          rawDateString: null,
          explicitObjectives: [],
          subSections: [],
        },
      ],
    }
  }
}

// ── Pass 2: Date Normalization ─────────────────────────────────────────────────
//
// Confidence scoring rules:
//   Explicit calendar date present ("Jan 15"):         0.95 – 1.00
//   Week number + known semesterStart:                 0.85 – 0.90
//   Week number without semesterStart:                 0.65 – 0.75
//   Module/topic order only (no date):                 0.40 – 0.55
//
// All sections are batched into a single Haiku call to minimize latency + cost.

interface DateNormResult {
  normalizedStart: string | null   // YYYY-MM-DD or null
  normalizedEnd: string | null
  confidence: number               // 0.0 – 1.0
  inferenceMethod: 'explicit' | 'relative' | 'inferred'
}

async function normalizeDates(
  sections: RawSection[],
  semesterStart: string | null,
  layoutHint: LayoutHint,
): Promise<DateNormResult[]> {
  const batchInput = sections.map((s, i) => ({
    index: i,
    label: s.label,
    rawDateString: s.rawDateString,
    unitType: s.unitType,
    subSectionDates: s.subSections.map((ss) => ss.rawDateString).filter(Boolean),
  }))

  const today = new Date().toISOString().slice(0, 10)

  const prompt = `You are normalizing date strings from a university course syllabus.

CONTEXT:
- Semester start date: ${semesterStart ?? 'unknown'}
- Today's date (use as fallback if semester start is unknown): ${today}
- Layout type: ${layoutHint}
- Assume a 15-week semester unless end date is known.
- For "Week N" when semesterStart is known: startDate = semesterStart + (N-1)*7 days, endDate = startDate + 6 days.

For each item output a normalized date range and a confidence score.

Confidence scoring:
  - Explicit calendar date ("Jan 15", "March 5"): 0.95–1.0, inferenceMethod: "explicit"
  - Week number + known semesterStart: 0.85–0.90, inferenceMethod: "relative"
  - Week number without semesterStart: 0.65–0.75, inferenceMethod: "relative"
  - No date at all: 0.40–0.55, inferenceMethod: "inferred"

Return ONLY a JSON array (same length and order as input — do not omit any item):
[{ "normalizedStart": "YYYY-MM-DD or null", "normalizedEnd": "YYYY-MM-DD or null", "confidence": 0.0–1.0, "inferenceMethod": "explicit"|"relative"|"inferred" }]

INPUT:
${JSON.stringify(batchInput, null, 2)}`

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const results = JSON.parse(clean) as DateNormResult[]
    // Guard against Haiku truncating the array
    while (results.length < sections.length) {
      results.push({
        normalizedStart: null,
        normalizedEnd: null,
        confidence: 0.4,
        inferenceMethod: 'inferred',
      })
    }
    return results.slice(0, sections.length)
  } catch {
    return sections.map(() => ({
      normalizedStart: null,
      normalizedEnd: null,
      confidence: 0.4,
      inferenceMethod: 'inferred' as const,
    }))
  }
}

// ── Pass 3: Prerequisite Language Detection ────────────────────────────────────
//
// Scans prose for signals of non-trivial ordering:
//   PREREQUISITE  "builds on", "requires completion of", "assumes knowledge of"
//   CONCURRENT    "in parallel with", "alongside", "at the same time as"
//   SEQUENCE      only for explicitly stated ordering (implicit sequence is NOT flagged)
//
// Sequential ordering between adjacent sections is assumed by position — this
// pass only emits edges for *semantically significant* dependencies.

async function detectPrerequisiteEdges(sections: RawSection[]): Promise<ExtractedEdge[]> {
  if (sections.length < 2) return []

  // Compact representation: label + first 200 chars of source text per section
  const compact = sections
    .map((s) => `[${s.label}]: ${s.rawSourceText.slice(0, 200)}`)
    .join('\n---\n')

  const prompt = `Analyze these course syllabus sections for meaningful dependency relationships.

Look for language indicating:
- PREREQUISITE: "builds on", "requires completion of", "prerequisite:", "assumes knowledge of",
  "after completing", "students must have covered", "cannot proceed without"
- CONCURRENT: "in parallel with", "alongside", "at the same time as", "concurrent with"
- SEQUENCE: only flag when the syllabus *explicitly* states ordering ("must be done before");
  do NOT flag implicit numerical/weekly order — that is assumed by position.

Return ONLY a JSON array. If no non-trivial relationships found, return [].
[{
  "fromLabel": "exact source section label",
  "toLabel": "exact target section label",
  "edgeType": "PREREQUISITE" | "SEQUENCE" | "CONCURRENT",
  "evidence": "the verbatim phrase that triggered this"
}]

SECTIONS:
${compact.slice(0, 6000)}`

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const edges = JSON.parse(clean) as ExtractedEdge[]
    return Array.isArray(edges) ? edges.slice(0, 50) : []
  } catch {
    return []
  }
}

// ── Pass 4: Policy + Grading Extraction ──────────────────────────────────────
//
// Uses up to 12 000 chars of the syllabus (policies often appear toward the end).

async function extractPoliciesAndGrading(
  text: string,
): Promise<{ policies: ExtractedPolicy[]; gradingWeights: ExtractedGradingWeight[] }> {
  const truncated = text.slice(0, 12000)

  const prompt = `You are extracting course policies and grading weights from a university syllabus.

INSTRUCTIONS:
1. Extract all course policies. Categorize each as: late, attendance, grading, academic_integrity, communication, or other.
2. Extract the grading breakdown (e.g. "Exams 30%, Homework 25%"). Convert percentages to decimals (25% → 0.25).
3. Preserve verbatim policy text (max 500 chars each).

Return ONLY valid JSON matching this exact schema (no prose, no markdown fences):
{
  "policies": [
    { "category": "late|attendance|grading|academic_integrity|communication|other",
      "title": "string", "content": "verbatim text, max 500 chars" }
  ],
  "gradingWeights": [
    { "category": "string", "weight": 0.0-1.0, "description": "string or null" }
  ]
}

If no policies or grading weights are found, return empty arrays.

SYLLABUS TEXT:
${truncated}`

  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as {
      policies: ExtractedPolicy[]
      gradingWeights: ExtractedGradingWeight[]
    }

    return {
      policies: Array.isArray(parsed.policies) ? parsed.policies : [],
      gradingWeights: Array.isArray(parsed.gradingWeights) ? parsed.gradingWeights : [],
    }
  } catch {
    return { policies: [], gradingWeights: [] }
  }
}

// ── parseSyllabusBuffer (orchestrator) ────────────────────────────────────────
//
// Main entry point. Called from the POST /api/syllabus-architect/parse route.
//
// Returns:
//   fileHash        — SHA-256 of the buffer (for diff detection)
//   result          — structured ParseResult
//   existingJobId   — set if this file was already processed (idempotent skip)

export async function parseSyllabusBuffer(
  buffer: Buffer,
  courseId: string,
  mimeType: string = 'application/pdf',
): Promise<{
  fileHash: string
  result: ParseResult
  existingJobId: string | null
}> {
  const fileHash = computeFileHash(buffer)

  // Idempotency: if the exact same PDF has been successfully parsed for this
  // course already, return the cached result instead of re-running the pipeline.
  const existing = await prisma.syllabusParseJob.findFirst({
    where: { courseId, fileHash, status: 'COMPLETE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, extractedData: true },
  })
  if (existing) {
    return {
      fileHash,
      result: existing.extractedData as unknown as ParseResult,
      existingJobId: existing.id,
    }
  }

  // ── Extract raw text ──────────────────────────────────────────────────────
  const rawText = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ? await extractText(buffer, mimeType)
    : await extractTextFromPdf(buffer)
  const cleanText = preprocessRawText(rawText)

  // ── Pass 1: Structure Detection ───────────────────────────────────────────
  const structure = await detectStructure(cleanText)

  // ── Pass 2: Date Normalization (batched) ──────────────────────────────────
  const dates = await normalizeDates(
    structure.sections,
    structure.semesterStart,
    structure.layoutHint,
  )

  // ── Pass 3: Prerequisite Language Detection ───────────────────────────────
  const edges = await detectPrerequisiteEdges(structure.sections)

  // ── Pass 4: Policy + Grading Extraction ─────────────────────────────────
  const { policies, gradingWeights } = await extractPoliciesAndGrading(cleanText)

  // ── Assemble ExtractedUnit[] ──────────────────────────────────────────────
  const units: ExtractedUnit[] = structure.sections.map((section, i) => ({
    label: section.label,
    description: section.rawSourceText.slice(0, 200) || null,
    rawSourceText: section.rawSourceText,
    unitType: section.unitType,
    startDate: dates[i]?.normalizedStart ?? null,
    endDate: dates[i]?.normalizedEnd ?? null,
    dateConfidence: dates[i]?.confidence ?? 0.4,
    explicitObjectives: section.explicitObjectives ?? [],
    modules: section.subSections.map((sub) => ({
      label: sub.label,
      description: null,
      lessons: [
        {
          label: sub.label,
          rawSourceText: sub.rawSourceText,
          // Sub-item due dates inherit the parent unit's confidence for now;
          // a future optional Pass 2b could refine individual lesson dates.
          dueDate: null,
          dateConfidence: dates[i]?.confidence ?? 0.4,
        },
      ],
    })),
  }))

  const overallDateConfidence =
    units.length > 0
      ? units.reduce((sum, u) => sum + u.dateConfidence, 0) / units.length
      : 0

  const result: ParseResult = {
    units,
    edges,
    policies,
    gradingWeights,
    layoutHint: structure.layoutHint,
    semesterStart: structure.semesterStart,
    semesterEnd: structure.semesterEnd,
    overallDateConfidence,
  }

  return { fileHash, result, existingJobId: null }
}
