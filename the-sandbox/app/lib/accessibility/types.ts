/**
 * ADA Compliance Automation — Shared Types
 *
 * Types for alt-text generation, readability analysis, document scanning,
 * contrast validation, and compliance reporting.
 */

// ── Alt-Text ──────────────────────────────────────────────────────────────────

export type ImageCategory =
  | 'photo'
  | 'diagram'
  | 'chart'
  | 'icon'
  | 'decorative'
  | 'screenshot'
  | 'infographic'

export interface AltTextResult {
  altText: string           // Concise description (max 150 chars)
  longDescription: string   // Detailed description for complex images
  confidence: number        // 0.0–1.0
  isDecorative: boolean     // true → alt="" is correct per WCAG
  category: ImageCategory
}

export type AltTextTargetType = 'tool' | 'course_material' | 'playground_app'

// ── Accessibility Scores ──────────────────────────────────────────────────────

export type AccessibilityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AccessibilityIssue {
  type: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  element: string
  description: string
  suggestion: string
  autoFixable: boolean
}

export interface AccessibilityScoreBreakdown {
  overallScore: number    // 0.0–1.0
  overallGrade: AccessibilityGrade
  altTextScore: number
  structureScore: number
  readabilityScore: number
  contrastScore: number
  captionScore: number
}

// ── Readability ──────────────────────────────────────────────────────────────

export interface JargonTerm {
  term: string
  count: number
  suggestion: string          // Plain-language alternative
}

export interface LongSentence {
  text: string
  wordCount: number
}

export interface ReadabilityResult {
  fleschKincaid: number         // Grade level (target: 8-12 for undergraduate)
  fleschReadingEase: number     // 0-100 (higher = easier; target: 50-70)
  avgSentenceLength: number     // Words per sentence
  avgWordLength: number         // Syllables per word
  passiveVoicePercent: number   // Target: < 15%
  jargonTerms: JargonTerm[]
  longSentences: LongSentence[]
  overallGrade: AccessibilityGrade
  overallScore: number          // 0.0–1.0 normalized
  summary: string               // One-line description
  wordCount: number
  sentenceCount: number
}

export type ReadabilityTargetType = 'course_material' | 'tool' | 'announcement' | 'freetext'

// ── Document Scanning ────────────────────────────────────────────────────────

export type DocumentIssueType =
  | 'missing-headings'
  | 'heading-skip'
  | 'untagged-table'
  | 'missing-alt-text'
  | 'image-of-text'
  | 'no-language-tag'
  | 'missing-title'
  | 'color-only-info'
  | 'complex-table'
  | 'long-paragraph'
  | 'missing-list-structure'
  | 'non-descriptive-link'

export type DocumentIssueSeverity = 'critical' | 'major' | 'minor'

export interface DocumentIssue {
  id: string
  type: DocumentIssueType
  severity: DocumentIssueSeverity
  location: string              // "Page 3, paragraph 2" or description
  description: string
  wcagCriteria: string          // "1.1.1 Non-text Content"
  suggestion: string
  autoFixable: boolean
  autoFix?: string              // Proposed fix text
}

export interface DocumentStructure {
  pageCount: number
  hasTitle: boolean
  headings: Array<{ level: number; text: string; page: number }>
  headingHierarchyValid: boolean
  tables: Array<{ page: number; hasHeaders: boolean; rows: number; cols: number }>
  images: Array<{ page: number; hasAltText: boolean; description?: string }>
  lists: Array<{ page: number; type: 'ordered' | 'unordered'; items: number }>
  links: Array<{ page: number; text: string; isDescriptive: boolean }>
}

export interface DocumentScanResult {
  overallScore: number          // 0.0–1.0
  overallGrade: AccessibilityGrade
  issues: DocumentIssue[]
  structure: DocumentStructure
  readability: ReadabilityResult
  autoFixable: number
  manualRequired: number
}

export type ScanTargetType = 'course_material' | 'tool' | 'playground_app'

// ── Contrast Checking ────────────────────────────────────────────────────────

export interface ContrastViolation {
  element: string               // CSS selector or description
  foreground: string            // hex color
  background: string            // hex color
  ratio: number                 // Actual contrast ratio
  requiredRatio: number         // 4.5 for normal text, 3.0 for large text
  isLargeText: boolean
  level: 'AA' | 'AAA'
  suggestion: {
    adjustedForeground: string  // Nearest accessible color
    adjustedBackground: string  // Alternative fix
  }
}

export interface ContrastResult {
  passes: boolean               // true if all checks pass WCAG AA
  violations: ContrastViolation[]
  score: number                 // 0.0–1.0
  checkedPairs: number          // Total foreground/background pairs evaluated
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function scoreToGrade(score: number): AccessibilityGrade {
  if (score >= 0.9) return 'A'
  if (score >= 0.8) return 'B'
  if (score >= 0.7) return 'C'
  if (score >= 0.6) return 'D'
  return 'F'
}
