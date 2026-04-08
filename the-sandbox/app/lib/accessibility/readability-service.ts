/**
 * ADA Compliance — Readability Analysis Engine
 *
 * Flesch-Kincaid scoring, jargon detection, passive voice detection,
 * and AI-powered plain-language simplification via Claude Haiku.
 *
 * All base metrics are computed locally (no AI needed). The optional
 * `suggestSimplification()` function uses Haiku for rewrites.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import type {
  AccessibilityGrade,
  JargonTerm,
  LongSentence,
  ReadabilityResult,
  ReadabilityTargetType,
} from './types'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'

// ── Syllable counting ────────────────────────────────────────────────────────

/**
 * Estimate syllable count for an English word using a simple heuristic.
 * Not perfect, but matches Flesch-Kincaid reference implementations.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length <= 2) return 1

  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1

  // Silent -e at end
  if (w.endsWith('e') && !w.endsWith('le') && count > 1) count--
  // -ed endings (walked = 1 syl, not 2)
  if (w.endsWith('ed') && w.length > 3 && !w.endsWith('ted') && !w.endsWith('ded') && count > 1) count--
  // -es endings
  if (w.endsWith('es') && w.length > 3 && !w.endsWith('ses') && !w.endsWith('zes') && count > 1) count--

  return Math.max(count, 1)
}

// ── Sentence splitting ───────────────────────────────────────────────────────

/** Split text into sentences. Handles abbreviations, decimals, etc. */
export function splitSentences(text: string): string[] {
  // Replace common abbreviations to avoid false splits
  const cleaned = text
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|vs|etc|e\.g|i\.e|Jr|Sr)\./gi, '$1\u2024')
    .replace(/(\d)\./g, '$1\u2024') // decimals

  const raw = cleaned.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return raw.length > 0 ? raw : [text]
}

// ── Passive voice detection ──────────────────────────────────────────────────

const PASSIVE_PATTERN =
  /\b(is|are|was|were|be|been|being)\s+(being\s+)?(\w+ed|built|bought|caught|chosen|done|drawn|driven|eaten|fallen|felt|found|given|gone|grown|heard|held|hidden|hit|hung|kept|known|laid|led|left|lent|let|lost|made|meant|met|paid|put|read|ridden|rung|run|said|seen|sent|set|shaken|shown|shut|slept|sold|spent|spoken|stood|struck|swept|taken|taught|thought|thrown|told|understood|woken|won|worn|written|cut|broken|forgotten|frozen|stolen|sworn|torn)\b/gi

export function detectPassiveVoice(sentences: string[]): number {
  let passiveCount = 0
  for (const s of sentences) {
    if (PASSIVE_PATTERN.test(s)) passiveCount++
    PASSIVE_PATTERN.lastIndex = 0 // reset regex state
  }
  return sentences.length > 0 ? (passiveCount / sentences.length) * 100 : 0
}

// ── Jargon detection ─────────────────────────────────────────────────────────

/** Common academic jargon with plain-language alternatives. */
const JARGON_MAP: Record<string, string> = {
  'utilize': 'use',
  'utilization': 'use',
  'methodology': 'method',
  'facilitate': 'help',
  'implement': 'carry out',
  'paradigm': 'model',
  'synergy': 'combined effort',
  'leverage': 'use',
  'optimize': 'improve',
  'aforementioned': 'mentioned earlier',
  'herein': 'in this document',
  'heretofore': 'until now',
  'notwithstanding': 'despite',
  'pursuant': 'following',
  'whereby': 'by which',
  'henceforth': 'from now on',
  'therein': 'in that',
  'ascertain': 'find out',
  'disseminate': 'share',
  'elucidate': 'explain',
  'juxtapose': 'compare',
  'nomenclature': 'naming system',
  'promulgate': 'announce',
  'substantiate': 'support',
  'ameliorate': 'improve',
  'dichotomy': 'division',
  'epistemological': 'related to knowledge',
  'heuristic': 'rule of thumb',
  'ontological': 'related to existence',
  'pedagogy': 'teaching method',
  'praxis': 'practice',
  'axiom': 'basic principle',
  'conflate': 'combine',
  'efficacy': 'effectiveness',
  'mitigate': 'reduce',
  'obfuscate': 'confuse',
  'proliferate': 'spread',
  'superfluous': 'unnecessary',
  'ubiquitous': 'everywhere',
  'vis-a-vis': 'compared to',
  'cognizant': 'aware',
  'delineate': 'describe',
  'exacerbate': 'make worse',
  'extrapolate': 'estimate',
  'precipitate': 'cause',
}

export function detectJargon(text: string): JargonTerm[] {
  const lower = text.toLowerCase()
  const results: JargonTerm[] = []

  for (const [term, suggestion] of Object.entries(JARGON_MAP)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    const matches = lower.match(regex)
    if (matches && matches.length > 0) {
      results.push({ term, count: matches.length, suggestion })
    }
  }

  return results.sort((a, b) => b.count - a.count)
}

// ── Long sentence detection ──────────────────────────────────────────────────

const LONG_SENTENCE_THRESHOLD = 30 // words

export function detectLongSentences(sentences: string[]): LongSentence[] {
  return sentences
    .filter((s) => {
      const wordCount = s.split(/\s+/).filter(Boolean).length
      return wordCount > LONG_SENTENCE_THRESHOLD
    })
    .map((s) => ({
      text: s.length > 200 ? `${s.slice(0, 200)}...` : s,
      wordCount: s.split(/\s+/).filter(Boolean).length,
    }))
    .slice(0, 10) // Cap at 10 flagged sentences
}

// ── Grade mapping ────────────────────────────────────────────────────────────

function readabilityGrade(fleschKincaid: number): AccessibilityGrade {
  if (fleschKincaid <= 10) return 'A'  // 10th grade or below — great
  if (fleschKincaid <= 12) return 'B'  // High school senior — good
  if (fleschKincaid <= 14) return 'C'  // Some college — acceptable
  if (fleschKincaid <= 16) return 'D'  // College level — concerning
  return 'F'                            // Graduate+ — inaccessible
}

function readabilityScore(fleschKincaid: number): number {
  // Map grade level to 0-1 score (lower grade = higher score)
  if (fleschKincaid <= 8) return 1.0
  if (fleschKincaid >= 20) return 0.0
  return Math.max(0, 1.0 - (fleschKincaid - 8) / 12)
}

function buildSummary(fk: number, grade: AccessibilityGrade): string {
  const level = Math.round(fk)
  switch (grade) {
    case 'A': return `Grade ${level} reading level — accessible to a broad audience`
    case 'B': return `Grade ${level} reading level — appropriate for most undergraduates`
    case 'C': return `Grade ${level} reading level — consider simplifying for broader accessibility`
    case 'D': return `Grade ${level} reading level — may be difficult for many students`
    case 'F': return `Grade ${level} reading level — likely inaccessible to many readers; simplification recommended`
  }
}

// ── Main analysis function ───────────────────────────────────────────────────

/**
 * Analyze text readability. All metrics computed locally — no AI calls.
 */
export function analyzeReadability(text: string): ReadabilityResult {
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')   // Remove code blocks
    .replace(/`[^`]+`/g, '')          // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')  // Remove image markdown
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // Keep link text
    .replace(/<[^>]+>/g, '')          // Strip HTML
    .replace(/#+\s/g, '')             // Strip markdown headings
    .replace(/[*_~]{1,3}/g, '')       // Strip markdown emphasis
    .trim()

  if (!cleanText || cleanText.length < 20) {
    return {
      fleschKincaid: 0,
      fleschReadingEase: 100,
      avgSentenceLength: 0,
      avgWordLength: 0,
      passiveVoicePercent: 0,
      jargonTerms: [],
      longSentences: [],
      overallGrade: 'A',
      overallScore: 1.0,
      summary: 'Text too short to analyze',
      wordCount: 0,
      sentenceCount: 0,
    }
  }

  const sentences = splitSentences(cleanText)
  const words = cleanText.split(/\s+/).filter(Boolean)
  const syllableTotal = words.reduce((sum, w) => sum + countSyllables(w), 0)

  const wordCount = words.length
  const sentenceCount = sentences.length
  const avgSentenceLength = wordCount / Math.max(sentenceCount, 1)
  const avgSyllablesPerWord = syllableTotal / Math.max(wordCount, 1)

  const fleschKincaid = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
  const fleschReadingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord

  const fkClamped = Math.max(0, fleschKincaid)
  const freClamped = Math.max(0, Math.min(100, fleschReadingEase))
  const passiveVoicePercent = detectPassiveVoice(sentences)
  const jargonTerms = detectJargon(cleanText)
  const longSentences = detectLongSentences(sentences)

  const grade = readabilityGrade(fkClamped)
  const score = readabilityScore(fkClamped)

  return {
    fleschKincaid: Math.round(fkClamped * 10) / 10,
    fleschReadingEase: Math.round(freClamped * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgSyllablesPerWord * 100) / 100,
    passiveVoicePercent: Math.round(passiveVoicePercent * 10) / 10,
    jargonTerms,
    longSentences,
    overallGrade: grade,
    overallScore: Math.round(score * 100) / 100,
    summary: buildSummary(fkClamped, grade),
    wordCount,
    sentenceCount,
  }
}

// ── AI-powered simplification ────────────────────────────────────────────────

const SIMPLIFY_PROMPT = `You are a plain-language rewriting expert for a university learning platform.

Rewrite the following text to be accessible at a grade 10 reading level while preserving all technical accuracy.

Rules:
- Keep domain-specific terms but add brief parenthetical explanations on first use
- Break long sentences into shorter ones (target: 15-20 words per sentence)
- Replace jargon with plain equivalents where possible
- Use active voice
- Preserve the original meaning and all key information
- Do NOT add new information or opinions
- Return ONLY the rewritten text, no commentary`

/**
 * Use Claude Haiku to rewrite text at a target reading level.
 */
export async function suggestSimplification(
  text: string,
  targetGradeLevel = 10,
): Promise<string> {
  if (text.length < 50) return text

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${SIMPLIFY_PROMPT}\n\nTarget grade level: ${targetGradeLevel}\n\nText to rewrite:\n${text.slice(0, 3000)}`,
      },
    ],
  })

  const result = response.content[0]
  return result.type === 'text' ? result.text.trim() : text
}

// ── Scan + persist to AccessibilityReport ────────────────────────────────────

/**
 * Analyze readability and upsert the result into the AccessibilityReport table.
 * Returns the ReadabilityResult for immediate display.
 */
export async function scanAndPersistReadability(
  targetType: ReadabilityTargetType,
  targetId: string,
  text: string,
): Promise<ReadabilityResult> {
  const result = analyzeReadability(text)

  // Prisma Json fields require plain objects — strip typed arrays
  const readabilityJson = toJsonValue({
    fleschKincaid: result.fleschKincaid,
    fleschReadingEase: result.fleschReadingEase,
    avgSentenceLength: result.avgSentenceLength,
    avgWordLength: result.avgWordLength,
    passiveVoicePercent: result.passiveVoicePercent,
    jargonTerms: result.jargonTerms,
    longSentences: result.longSentences,
    wordCount: result.wordCount,
    sentenceCount: result.sentenceCount,
  })
  const issuesJson = toJsonValue(buildReadabilityIssues(result))

  await prisma.accessibilityReport.upsert({
    where: {
      targetType_targetId: { targetType, targetId },
    },
    create: {
      targetType,
      targetId,
      overallScore: result.overallScore,
      overallGrade: result.overallGrade,
      readabilityScore: result.overallScore,
      readability: readabilityJson,
      issues: issuesJson,
      // Default other scores until those phases run
      altTextScore: 0,
      structureScore: 0,
      contrastScore: 1,
      captionScore: 1,
    },
    update: {
      overallScore: result.overallScore,
      overallGrade: result.overallGrade,
      readabilityScore: result.overallScore,
      readability: readabilityJson,
      issues: issuesJson,
      updatedAt: new Date(),
    },
  })

  return result
}

/**
 * Convert readability metrics into AccessibilityIssue[] for the report.
 */
function buildReadabilityIssues(result: ReadabilityResult) {
  const issues: Array<{
    type: string
    severity: 'critical' | 'serious' | 'moderate' | 'minor'
    element: string
    description: string
    suggestion: string
    autoFixable: boolean
  }> = []

  // High grade level
  if (result.fleschKincaid > 14) {
    issues.push({
      type: 'readability-grade-level',
      severity: result.fleschKincaid > 16 ? 'critical' : 'serious',
      element: 'document',
      description: `Reading level is grade ${Math.round(result.fleschKincaid)}, which exceeds the recommended undergraduate target of grade 8-12.`,
      suggestion: 'Shorten sentences, replace jargon with plain language, and use active voice.',
      autoFixable: true,
    })
  }

  // High passive voice
  if (result.passiveVoicePercent > 25) {
    issues.push({
      type: 'readability-passive-voice',
      severity: result.passiveVoicePercent > 40 ? 'serious' : 'moderate',
      element: 'document',
      description: `${Math.round(result.passiveVoicePercent)}% of sentences use passive voice (target: < 15%).`,
      suggestion: 'Rewrite passive constructions to active voice for clarity.',
      autoFixable: true,
    })
  }

  // Jargon
  if (result.jargonTerms.length > 3) {
    issues.push({
      type: 'readability-jargon',
      severity: result.jargonTerms.length > 8 ? 'serious' : 'moderate',
      element: 'document',
      description: `${result.jargonTerms.length} jargon terms detected that may be unfamiliar to students.`,
      suggestion: `Consider replacing: ${result.jargonTerms.slice(0, 3).map((j) => `"${j.term}" → "${j.suggestion}"`).join(', ')}`,
      autoFixable: true,
    })
  }

  // Long sentences
  if (result.longSentences.length > 2) {
    issues.push({
      type: 'readability-long-sentences',
      severity: result.longSentences.length > 5 ? 'serious' : 'moderate',
      element: 'document',
      description: `${result.longSentences.length} sentences exceed 30 words.`,
      suggestion: 'Break long sentences into shorter ones for better comprehension.',
      autoFixable: true,
    })
  }

  return issues
}

/**
 * Bulk scan readability for all course materials in a course.
 * Returns a summary with per-material grades.
 */
export async function bulkScanCourseReadability(courseId: string): Promise<{
  scanned: number
  grades: Record<AccessibilityGrade, number>
  avgScore: number
  materials: Array<{ id: string; title: string; grade: AccessibilityGrade; score: number; fleschKincaid: number }>
}> {
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId },
    select: { id: true, title: true, content: true },
  })

  const grades: Record<AccessibilityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  const results: Array<{ id: string; title: string; grade: AccessibilityGrade; score: number; fleschKincaid: number }> = []
  let totalScore = 0

  for (const mat of materials) {
    if (!mat.content || mat.content.length < 20) continue
    const result = await scanAndPersistReadability('course_material', mat.id, mat.content)
    grades[result.overallGrade]++
    totalScore += result.overallScore
    results.push({
      id: mat.id,
      title: mat.title,
      grade: result.overallGrade,
      score: result.overallScore,
      fleschKincaid: result.fleschKincaid,
    })
  }

  return {
    scanned: results.length,
    grades,
    avgScore: results.length > 0 ? Math.round((totalScore / results.length) * 100) / 100 : 1.0,
    materials: results.sort((a, b) => a.score - b.score), // Worst first
  }
}
