# Blueprint: ADA Compliance Automation — AI-Powered Born-Accessible Content Pipeline

> **Sprint Scope:** Transform the platform into a platform where all university content is born accessible. Seven layers: alt-text generation, transcript persistence, readability analysis, document scanning, color contrast validation, compliance dashboard, and bulk remediation agent.
> **Depends On:** PDF upload pipeline (complete: `pdf-extract.ts`, course-material upload). Audio pipeline (complete: Azure Speech TTS, `audio-processor-service.ts`). Builder (complete). Sandy agent framework (complete: 90+ tools). Course Map accessibility overlay (complete: `accessibility-manager.ts`).
> **Unlocks:** University-wide ADA audit reporting, federal compliance certification, competitive differentiation for institutional sales, reduced remediation vendor costs.
> **Estimated Size:** Large (4-5 sprints across 7 phases)
> **Patent Relevance:** HIGH — "AI-powered accessibility compliance automation integrated into a university learning platform where digital content is validated and remediated at the point of creation through multi-modal AI analysis, producing born-accessible educational materials without manual accessibility review"

---

## Context

### The Problem

Universities face three overlapping federal mandates for digital accessibility:

1. **Section 508** — All electronic and information technology must be accessible to people with disabilities
2. **WCAG 2.1 AA** — The technical standard that Section 508 references; 78 success criteria across 4 principles (Perceivable, Operable, Understandable, Robust)
3. **ADA Title II (2024 DOJ Rule)** — As of April 2024, the DOJ finalized rules requiring all state/local government web content (including public universities) to conform to WCAG 2.1 AA. Compliance deadlines: large institutions by April 2026, smaller by April 2027.

The current reality at most universities:

| Problem | Impact |
|---------|--------|
| Faculty upload thousands of PDFs with no heading structure, no alt text on images, no tagged tables | Screen reader users get walls of unlabeled text |
| Course images have no alt text — thumbnails, diagrams, infographics | Invisible to 2.4% of students with visual impairments |
| Audio/video content lacks captions or transcripts | Deaf/HoH students (1.5% of college students) excluded |
| Reading levels exceed undergraduate comprehension | ESL students and students with cognitive disabilities struggle |
| Remediation is retroactive and expensive | UK alone has 70K+ users generating content continuously |
| No centralized compliance visibility | Administrators can't report compliance status to OCR |

Most institutions spend **$50-200 per document** on manual remediation. A university with 10,000 course documents faces $500K-$2M in remediation costs — and new non-compliant content is created daily.

### The Vision

the platform makes content **born accessible** — every content creation touchpoint has an AI accessibility layer that validates, scores, and remediates in real-time. Faculty never think about ADA compliance because the platform handles it automatically.

| Layer | When | What |
|-------|------|------|
| **Alt-Text Generation** | Image upload/reference | Claude Vision generates descriptive alt text; educator reviews before publish |
| **Transcript Persistence** | Audio generation | Audio scripts already exist — persist as captions/transcripts automatically |
| **Readability Analysis** | Content creation | Real-time grade level, jargon detection, plain-language suggestions |
| **Document Scanner** | PDF upload | Heading structure, table accessibility, image references, compliance score |
| **Contrast Validation** | Playground apps, custom content | WCAG AA ratio check before publish |
| **Compliance Dashboard** | Always visible to ADMIN/STAFF | Per-course, per-department, university-wide compliance metrics |
| **Remediation Agent** | On demand via Sandy | Bulk scan + auto-fix across an entire course's content |

### Integration with Existing Systems

```
Existing Feature               →  ADA Compliance Extension
─────────────────────────────────────────────────────────────────
PDF Upload (course-material)   →  + Accessibility scan, heading inference, compliance score
pdf-extract.ts                 →  + Structure analysis (headings, tables, lists, images)
Audio pipeline (TTS)           →  + Auto-persist transcript alongside every AudioEpisode
Builder (tool creation)        →  + Readability gate: flag if systemPrompt/content > grade 12
PlaygroundApp (HTML editor)    →  + Contrast checker, semantic HTML validator
Course Map (a11y overlay)      →  + Already accessible — extend pattern to all platform surfaces
Sandy agent tools              →  + accessibility_scan, remediate_content, compliance_report
Horizon Rail (alerts)          →  + "3 materials in ENG 101 need alt text" nudges
Staff Intelligence hub         →  + Compliance metrics feed into staff dashboards
Tool thumbnailUrl              →  + altText field, AI-generated on upload
Announcements                  →  + Readability score shown before send
```

---

## Key Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/lib/accessibility/alt-text-service.ts` | Claude Vision alt-text generation for uploaded images |
| `app/lib/accessibility/readability-service.ts` | Flesch-Kincaid scoring, jargon detection, plain-language rewrites |
| `app/lib/accessibility/document-scanner.ts` | PDF structure analysis: headings, tables, image refs, compliance score |
| `app/lib/accessibility/contrast-checker.ts` | WCAG AA contrast ratio validation for HTML content |
| `app/lib/accessibility/compliance-aggregator.ts` | Roll-up compliance scores per course, department, university |
| `app/lib/accessibility/remediation-service.ts` | Bulk scan + auto-fix: headings, alt text, reading level, structure |
| `app/lib/accessibility/types.ts` | Shared types: AccessibilityScore, ComplianceReport, RemediationPlan |
| `app/api/accessibility/scan/route.ts` | POST: scan a single content item, return accessibility report |
| `app/api/accessibility/scan-course/route.ts` | POST: scan all materials in a course, return aggregate report |
| `app/api/accessibility/remediate/route.ts` | POST: auto-fix accessibility issues in a content item |
| `app/api/accessibility/alt-text/route.ts` | POST: generate alt text for an image URL via Claude Vision |
| `app/api/accessibility/compliance/route.ts` | GET: compliance dashboard data (course/dept/university level) |
| `app/api/accessibility/readability/route.ts` | POST: analyze text readability, return score + suggestions |
| `app/components/accessibility/ComplianceDashboard.tsx` | ADMIN/STAFF dashboard: scores, trends, remediation queue |
| `app/components/accessibility/AccessibilityScore.tsx` | Compact score badge (A/B/C/D/F) for content items |
| `app/components/accessibility/ReadabilityMeter.tsx` | Real-time readability indicator for content editors |
| `app/components/accessibility/AltTextEditor.tsx` | AI-suggested alt text with educator review/edit |
| `app/components/accessibility/RemediationReport.tsx` | Per-course remediation results and remaining issues |
| `app/components/accessibility/ContrastWarning.tsx` | Inline warning for Playground apps with contrast violations |

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `AccessibilityReport` model, `altText` fields, `transcript` field on AudioEpisode, `accessibilityScore` on CourseMaterial |
| `app/api/upload/course-material/route.ts` | After PDF extraction, trigger async accessibility scan |
| `app/lib/audio-processor-service.ts` | Persist generated script text as transcript on AudioEpisode |
| `app/lib/builder-service.ts` | Add readability check to Ready Gate criteria |
| `app/lib/agent/tools/content-tools.ts` | Register `accessibility_scan`, `remediate_content`, `compliance_report` Sandy tools |
| `app/lib/proactive-suggestions.ts` | Add `accessibility-issues-pending` nudge |
| `app/lib/concierge-service.ts` | Add accessibility context to Sandy's page awareness |
| `app/(pages)/courses/[id]/page.tsx` | Add accessibility score badge on course materials list |
| `app/components/courses/MaterialsTab.tsx` | Show per-material accessibility score |
| `app/components/playground/PlaygroundEditor.tsx` | Add contrast validation before save/publish |

### Files to Read (context, not modify)

| File | Why |
|------|-----|
| `app/lib/course-map/accessibility-manager.ts` | Existing a11y patterns to extend |
| `app/components/course-map/AccessibilityOverlay.tsx` | Existing a11y UI patterns |
| `app/lib/pdf-extract.ts` | PDF parsing pipeline to hook into |
| `app/lib/agent/agent-loop.ts` | Agent tool registration patterns |
| `app/lib/content-permissions.ts` | Governance defaults for content metadata |
| `app/lib/cold-start.ts` | Educator onboarding flow to add accessibility education |

---

## Schema Changes

### New Model: `AccessibilityReport`

Persists scan results per content item so dashboards don't require re-computation.

```prisma
model AccessibilityReport {
  id              String    @id @default(cuid())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // ── Polymorphic target ──
  targetType      String    // "course_material" | "tool" | "playground_app" | "audio_episode" | "announcement"
  targetId        String    // ID of the content item

  // ── Scores (0.0–1.0) ──
  overallScore    Float     // Weighted composite
  overallGrade    String    // A/B/C/D/F
  structureScore  Float     // Heading hierarchy, lists, tables
  altTextScore    Float     // Image descriptions present and descriptive
  readabilityScore Float    // Flesch-Kincaid grade level normalized
  contrastScore   Float     // Color contrast ratios (1.0 if not applicable)
  captionScore    Float     // Audio/video transcript availability (1.0 if not applicable)

  // ── Detail ──
  issues          Json      // Array<{ type, severity, element, description, suggestion, autoFixable }>
  readability     Json      // { fleschKincaid, gradeLevel, avgSentenceLength, jargonTerms[], passiveVoiceCount }
  structure       Json      // { headingLevels[], tableCount, taggedTableCount, listCount, imageCount, altTextCount }
  remediationPlan Json?     // Generated fix plan: Array<{ issueId, action, before, after, confidence }>

  // ── Metadata ──
  contentHash     String?   // Hash of content at scan time (invalidation)
  scanVersion     String    @default("v1")
  scannedBy       String    @default("system") // "system" | "sandy" | userId

  @@unique([targetType, targetId])  // One report per content item (overwrite on re-scan)
  @@index([overallGrade])
  @@index([targetType])
}
```

### Extend Existing Models

```prisma
// ── Tool ──
model Tool {
  // ... existing fields ...
  thumbnailAltText    String?    // AI-generated, educator-reviewed alt text for thumbnail
}

// ── CourseMaterial ──
model CourseMaterial {
  // ... existing fields ...
  accessibilityScore  Float?     // 0.0–1.0, computed by scanner
  accessibilityGrade  String?    // A/B/C/D/F quick display
}

// ── AudioEpisode ──
model AudioEpisode {
  // ... existing fields ...
  transcript          String?    @db.Text  // Full text transcript for captions/accessibility
  transcriptFormat    String?    // "plain" | "vtt" | "srt"
}

// ── PlaygroundApp ──
model PlaygroundApp {
  // ... existing fields ...
  accessibilityScore  Float?     // Contrast + semantic HTML score
}

// ── Announcement (if model exists) or DiscussionPost ──
model DiscussionPost {
  // ... existing fields ...
  readabilityScore    Float?     // Flesch-Kincaid normalized score
}
```

---

## Phase 1: Image Alt-Text Generation

> **Estimated size:** Small (0.5 sprint)
> **Why first:** Most visible ADA gap. Every `Tool.thumbnailUrl` and image in course materials currently has zero alt text. Claude Vision makes this nearly free.

### Service: `app/lib/accessibility/alt-text-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'

interface AltTextResult {
  altText: string           // Concise description (max 150 chars)
  longDescription: string   // Detailed description for complex images (diagrams, charts)
  confidence: number        // 0.0–1.0
  isDecorative: boolean     // true if image is purely decorative (alt="" is correct)
  category: 'photo' | 'diagram' | 'chart' | 'icon' | 'decorative' | 'screenshot' | 'infographic'
}

export async function generateAltText(imageUrl: string, context?: string): Promise<AltTextResult> {
  // Use Claude Vision to analyze the image
  const prompt = `You are an accessibility expert generating alt text for a university learning platform.

Analyze this image and provide:
1. A concise alt text (max 150 characters) — describe what the image shows, not what it is ("Student studying in library" not "Photo of student")
2. A longer description for complex images (diagrams, charts, infographics) — up to 300 characters
3. Whether the image is purely decorative (patterns, spacers, generic stock photos with no informational content)
4. The image category

${context ? `Context: This image appears in: ${context}` : ''}

Rules:
- Don't start with "Image of" or "Picture of" — screen readers already announce it as an image
- For charts/diagrams: describe the data relationships, not just "a bar chart"
- For people: describe actions/context, not physical appearance unless relevant
- For screenshots: describe what the UI shows and what action is being demonstrated
- For decorative images: set isDecorative=true, altText="" (empty string is correct per WCAG)

Return JSON only:
{
  "altText": "...",
  "longDescription": "...",
  "confidence": 0.0-1.0,
  "isDecorative": false,
  "category": "photo|diagram|chart|icon|decorative|screenshot|infographic"
}`

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
}
```

### API Route: `app/api/accessibility/alt-text/route.ts`

```typescript
import { withErrorHandling, parseRequestBody } from '@/app/lib/api-utils'
import { requireEducatorUser } from '@/app/lib/server-auth'
import { generateAltText } from '@/app/lib/accessibility/alt-text-service'
import { prisma } from '@/app/lib/prisma'

export const POST = withErrorHandling(async (req) => {
  const user = await requireEducatorUser(req)
  const { imageUrl, targetType, targetId, context } = await parseRequestBody(req, {
    required: ['imageUrl', 'targetType', 'targetId'],
    optional: ['context'],
  })

  const result = await generateAltText(imageUrl, context)

  // Auto-save to the target model if educator accepts
  // (Frontend sends a separate PATCH to confirm)

  return Response.json({ ...result, imageUrl, targetType, targetId })
})
```

### UI: `app/components/accessibility/AltTextEditor.tsx`

Inline component shown wherever images appear in educator flows:
- Shows AI-suggested alt text in an editable text field
- "Accept" saves to the model; "Edit" lets educator refine
- Visual indicator: green checkmark if alt text exists, yellow warning if missing
- For decorative images: checkbox "This image is decorative" → saves `alt=""`

### Integration Points

1. **Tool creation (Builder):** When educator sets a thumbnail, auto-generate alt text and show `AltTextEditor` before save
2. **Course material upload:** After PDF text extraction, detect image references in the text and flag missing alt text
3. **Playground apps:** Scan `<img>` tags in `htmlContent` for missing `alt` attributes
4. **Bulk backfill:** Sandy tool `generate_alt_text` scans all Tool thumbnails missing `thumbnailAltText` and generates suggestions

---

## Phase 2: Transcript Persistence for Audio

> **Estimated size:** Tiny (0.25 sprint)
> **Why second:** Nearly free. The audio pipeline already generates full text scripts before TTS synthesis. We just need to persist them.

### Changes to `app/lib/audio-processor-service.ts`

After script generation and before/during audio synthesis, save the script as a transcript:

```typescript
// After generating the podcast script via Claude...
// EXISTING: synthesize audio from script
// NEW: persist transcript alongside audio

await prisma.audioEpisode.update({
  where: { id: episodeId },
  data: {
    transcript: generatedScript,         // The full text that was synthesized
    transcriptFormat: 'plain',           // Plain text; could upgrade to VTT later
  },
})
```

### Frontend: Transcript Display

Add a "Transcript" toggle beneath every audio player component:
- Collapsible `<details>` element (semantic, accessible by default)
- Full text of the transcript with timestamps if available
- "Download Transcript" link (`.txt` file)

### For Uploaded Audio Without Transcripts

Future enhancement: integrate Whisper or Azure Speech-to-Text to auto-transcribe uploaded audio files that didn't go through our TTS pipeline.

---

## Phase 3: Readability Analysis Engine

> **Estimated size:** Small-Medium (0.5 sprint)
> **Why third:** Catches the most pervasive accessibility issue — content that's technically tagged correctly but practically incomprehensible to students with cognitive disabilities, ESL students, or frankly most undergraduates.

### Service: `app/lib/accessibility/readability-service.ts`

```typescript
interface ReadabilityResult {
  fleschKincaid: number         // Grade level (target: 8-12 for undergraduate)
  fleschReadingEase: number     // 0-100 (higher = easier; target: 50-70)
  avgSentenceLength: number     // Words per sentence
  avgWordLength: number         // Syllables per word
  passiveVoicePercent: number   // Target: < 15%
  jargonTerms: Array<{
    term: string
    count: number
    suggestion: string          // Plain-language alternative
  }>
  longSentences: Array<{
    text: string
    wordCount: number
    suggestion: string          // Rewritten shorter version
  }>
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string               // One-line: "Grade 14 reading level — consider simplifying for broader accessibility"
}

// Flesch-Kincaid computed locally (no AI needed for base metrics)
export function analyzeReadability(text: string): ReadabilityResult {
  const sentences = splitSentences(text)
  const words = text.split(/\s+/).filter(Boolean)
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0)

  const avgSentenceLength = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length

  const fleschKincaid = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
  const fleschReadingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord

  // ... jargon detection and sentence analysis via pattern matching + optional AI pass
}

// AI-powered plain-language rewrite
export async function suggestSimplification(
  text: string,
  targetGradeLevel: number = 10
): Promise<string> {
  // Claude Haiku rewrites while preserving technical accuracy
  // Prompt emphasizes: keep domain terms but explain them, shorten sentences,
  // use active voice, replace jargon with plain equivalents
}
```

### UI: `app/components/accessibility/ReadabilityMeter.tsx`

A compact, real-time indicator shown in content editors:

```
┌──────────────────────────────────────────────┐
│  📖 Readability: Grade 14  ⚠️               │
│  ████████████████████░░░░  (C)               │
│  3 long sentences · 5 jargon terms           │
│  [Simplify with AI]  [View details]          │
└──────────────────────────────────────────────┘
```

- Green (A/B): Grade 8-12, < 10% passive, no jargon clusters
- Yellow (C): Grade 12-14, some issues
- Red (D/F): Grade 14+, significant barriers

### Integration Points

1. **Builder Ready Gate:** Add criterion #8: "Content readability at or below grade 14"
2. **Course material display:** Show readability badge on each material in `MaterialsTab`
3. **Announcements:** Show readability meter before send
4. **Sandy tool:** `check_readability` — analyzes any selected text and offers rewrite

---

## Phase 4: Document Accessibility Scanner

> **Estimated size:** Medium (1 sprint)
> **Why fourth:** This is the big one for compliance. Every PDF upload gets a full accessibility audit.

### Service: `app/lib/accessibility/document-scanner.ts`

```typescript
interface DocumentScanResult {
  overallScore: number          // 0.0–1.0
  overallGrade: string          // A/B/C/D/F
  issues: AccessibilityIssue[]
  structure: DocumentStructure
  readability: ReadabilityResult
  autoFixable: number           // Count of issues that can be auto-remediated
  manualRequired: number        // Count of issues requiring human review
}

interface AccessibilityIssue {
  id: string
  type: 'missing-headings' | 'heading-skip' | 'untagged-table' | 'missing-alt-text'
       | 'low-contrast-text' | 'image-of-text' | 'no-language-tag' | 'missing-title'
       | 'color-only-info' | 'complex-table' | 'long-paragraph' | 'missing-list-structure'
  severity: 'critical' | 'major' | 'minor'
  location: string              // "Page 3, paragraph 2" or character offset
  description: string           // Human-readable explanation
  wcagCriteria: string          // "1.1.1 Non-text Content" | "1.3.1 Info and Relationships" etc.
  suggestion: string            // How to fix it
  autoFixable: boolean          // Can the system fix this automatically?
  autoFix?: string              // The proposed fix (e.g., inferred heading text)
}

interface DocumentStructure {
  pageCount: number
  hasTitle: boolean
  headings: Array<{ level: number; text: string; page: number }>
  headingHierarchyValid: boolean  // No skips (h1 → h3 without h2)
  tables: Array<{ page: number; hasHeaders: boolean; rows: number; cols: number }>
  images: Array<{ page: number; hasAltText: boolean; description?: string }>
  lists: Array<{ page: number; type: 'ordered' | 'unordered'; items: number }>
  links: Array<{ page: number; text: string; isDescriptive: boolean }>
}

export async function scanDocument(
  extractedText: string,
  metadata: { filename: string; pageCount?: number; courseContext?: string }
): Promise<DocumentScanResult> {
  // 1. Local analysis: sentence splitting, readability scoring, structure detection
  const readability = analyzeReadability(extractedText)

  // 2. AI analysis: Claude identifies structural issues the text extraction misses
  const aiAnalysis = await analyzeWithAI(extractedText, metadata)

  // 3. Combine local + AI findings into unified issue list
  const issues = mergeFindings(readability, aiAnalysis)

  // 4. Score computation
  const score = computeAccessibilityScore(issues)

  return { ...score, issues, structure: aiAnalysis.structure, readability }
}

async function analyzeWithAI(text: string, metadata: any) {
  // Claude Haiku analyzes the document text for:
  // - Heading structure (infers from formatting cues in extracted text)
  // - Table detection (aligned columns, repeated delimiters)
  // - Image references ("see Figure 3", "[image]", embedded image markers)
  // - Color-dependent information ("highlighted in red", "see green section")
  // - Link text quality ("click here" vs descriptive links)
  // - Language complexity spikes
  // - Lists that should be formatted as lists but are run-on paragraphs
}
```

### Integration with Upload Pipeline

In `app/api/upload/course-material/route.ts`, after PDF extraction:

```typescript
// EXISTING: extract text from PDF
const { text, pageCount } = await extractPdfText(buffer)

// EXISTING: create CourseMaterial record
const material = await prisma.courseMaterial.create({ ... })

// NEW: trigger async accessibility scan (non-blocking)
// Don't delay the upload response — scan runs in background
scanDocument(text, { filename, pageCount, courseContext: course.title })
  .then(async (report) => {
    await prisma.accessibilityReport.upsert({
      where: { targetType_targetId: { targetType: 'course_material', targetId: material.id } },
      create: { targetType: 'course_material', targetId: material.id, ...report },
      update: { ...report },
    })
    await prisma.courseMaterial.update({
      where: { id: material.id },
      data: { accessibilityScore: report.overallScore, accessibilityGrade: report.overallGrade },
    })
  })
```

### WCAG Criteria Mapped

| Issue Type | WCAG Criterion | Level |
|-----------|----------------|-------|
| Missing headings | 1.3.1 Info and Relationships | A |
| Heading skip (h1→h3) | 1.3.1 Info and Relationships | A |
| Untagged table | 1.3.1 Info and Relationships | A |
| Missing alt text | 1.1.1 Non-text Content | A |
| Color-only information | 1.4.1 Use of Color | A |
| Low contrast | 1.4.3 Contrast (Minimum) | AA |
| Image of text | 1.4.5 Images of Text | AA |
| Non-descriptive link | 2.4.4 Link Purpose (In Context) | A |
| Missing document title | 2.4.2 Page Titled | A |
| Missing language | 3.1.1 Language of Page | A |
| Complex table without headers | 1.3.1 Info and Relationships | A |
| Reading level > grade 12 | 3.1.5 Reading Level | AAA (advisory) |

---

## Phase 5: Color Contrast Validation

> **Estimated size:** Small (0.5 sprint)
> **Why fifth:** Targets Playground apps (HTML content) where educators have full styling control and can easily create inaccessible color combinations.

### Service: `app/lib/accessibility/contrast-checker.ts`

```typescript
interface ContrastResult {
  passes: boolean               // true if all checks pass WCAG AA
  violations: ContrastViolation[]
  score: number                 // 0.0–1.0
}

interface ContrastViolation {
  element: string               // CSS selector or description
  foreground: string            // hex color
  background: string            // hex color
  ratio: number                 // Actual contrast ratio
  requiredRatio: number         // 4.5 for normal text, 3.0 for large text
  level: 'AA' | 'AAA'
  suggestion: {
    adjustedForeground: string  // Nearest accessible color
    adjustedBackground: string  // Alternative fix
  }
}

// WCAG relative luminance calculation
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Parse HTML content and check all text elements against their backgrounds
export function checkContrast(htmlContent: string): ContrastResult {
  // Extract inline styles, <style> blocks, and Tailwind classes
  // Compute effective foreground/background for each text element
  // Check against WCAG AA thresholds (4.5:1 normal, 3:1 large text)
  // Suggest nearest accessible color alternatives
}
```

### Integration with Playground

In `PlaygroundEditor.tsx`, add a pre-save validation:

```typescript
// Before saving PlaygroundApp:
const contrastResult = checkContrast(htmlContent)
if (!contrastResult.passes) {
  // Show ContrastWarning component with violations and suggested fixes
  // Educator can fix manually or click "Auto-fix colors" to apply suggestions
  // Save is not blocked — but a warning badge persists on the app
}
```

---

## Phase 6: Compliance Dashboard

> **Estimated size:** Medium (1 sprint)
> **Why sixth:** With scan data flowing from Phases 1-5, ADMIN/STAFF need a centralized view to report compliance status to university leadership and OCR.

### Service: `app/lib/accessibility/compliance-aggregator.ts`

```typescript
interface ComplianceSummary {
  // ── University-wide ──
  totalContentItems: number
  scannedItems: number
  complianceRate: number           // % of items scoring B or above
  gradeDistribution: Record<string, number>  // { A: 120, B: 340, C: 89, D: 23, F: 8 }

  // ── By content type ──
  byType: Array<{
    type: string                   // "course_material" | "tool" | "playground_app" | "audio_episode"
    total: number
    scanned: number
    avgScore: number
    gradeDistribution: Record<string, number>
  }>

  // ── By department (via course.department or course code prefix) ──
  byDepartment: Array<{
    department: string
    totalMaterials: number
    avgScore: number
    compliance: number              // % B or above
    topIssue: string                // Most common issue type
  }>

  // ── Trends ──
  weeklyTrend: Array<{
    week: string                    // ISO week
    avgScore: number
    newItems: number
    remediatedItems: number
  }>

  // ── Action items ──
  highImpactQueue: Array<{         // Sorted by enrollment × severity
    targetType: string
    targetId: string
    title: string
    courseName: string
    enrollment: number
    grade: string
    topIssues: string[]
    autoFixableCount: number
  }>
}

export async function getComplianceSummary(
  scope: 'university' | 'department' | 'course',
  scopeId?: string
): Promise<ComplianceSummary> {
  // Aggregate from AccessibilityReport records
  // Join with Course for department/enrollment data
  // Sort action items by impact (enrollment × severity)
}
```

### Dashboard UI: `app/components/accessibility/ComplianceDashboard.tsx`

Three-level drill-down:

```
┌─────────────────────────────────────────────────────────────────┐
│  ADA Compliance Dashboard                            [Export]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  University Compliance: 78%  ████████████████░░░░  (B)          │
│  1,247 / 1,598 items meet WCAG 2.1 AA                          │
│                                                                  │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐           │
│  │  A (32%) │  B (46%) │  C (14%) │  D (6%)  │  F (2%)  │      │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘           │
│                                                                  │
│  ── By Content Type ──────────────────────────────               │
│  Course Materials  ████████████████░░░░  82%                     │
│  Interactive Tools ██████████████░░░░░░  71%                     │
│  Playground Apps   ████████████░░░░░░░░  63%                     │
│  Audio Episodes    ████████████████████  96% (transcripts!)      │
│                                                                  │
│  ── Top Departments ──────────────────────────────               │
│  English           92%  │  Chemistry  71%  │  Engineering  68%   │
│  History           89%  │  Biology    74%  │  Art           61%  │
│                                                                  │
│  ── High-Impact Remediation Queue ─────────────────              │
│  1. ENG 101 Syllabus (F, 450 enrolled, 12 auto-fixable)        │
│  2. CHE 105 Lab Manual (D, 380 enrolled, 8 auto-fixable)       │
│  3. BIO 150 Lecture Slides (D, 320 enrolled, 15 auto-fixable)  │
│  [Run Auto-Remediation on Top 10]                                │
│                                                                  │
│  ── Weekly Trend ─────────────────────────────────               │
│  (recharts line chart: avg score over 12 weeks)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Access Control

- **ADMIN:** Full university-wide view + export for OCR reporting
- **STAFF:** Department-level view
- **EDUCATOR:** Own courses only (shown inline on course page, not separate dashboard)

### Navigation

Add "ADA Compliance" to the Staff Intelligence hub and Admin sidebar.

---

## Phase 7: Sandy Remediation Agent

> **Estimated size:** Medium (1 sprint)
> **Why last:** Requires all scanning infrastructure from Phases 1-5. This is the power tool that lets educators and staff bulk-fix compliance issues.

### Sandy Tools

Register three new tools in `app/lib/agent/tools/content-tools.ts`:

#### `accessibility_scan`

```typescript
{
  name: 'accessibility_scan',
  description: 'Scan a course or specific content item for ADA accessibility compliance issues',
  parameters: {
    courseId: { type: 'string', description: 'Course to scan (scans all materials)' },
    targetType: { type: 'string', description: 'Specific content type to scan', optional: true },
    targetId: { type: 'string', description: 'Specific content item ID', optional: true },
  },
  handler: async ({ courseId, targetType, targetId }) => {
    if (targetType && targetId) {
      // Scan single item
      return await scanSingleItem(targetType, targetId)
    }
    // Scan entire course
    return await scanCourse(courseId)
  },
}
```

#### `remediate_content`

```typescript
{
  name: 'remediate_content',
  description: 'Auto-fix accessibility issues in content. Fixes headings, generates alt text, simplifies reading level, and adds structure. Shows educator what changed for review.',
  parameters: {
    targetType: { type: 'string' },
    targetId: { type: 'string' },
    fixTypes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Which issue types to auto-fix: headings, alt-text, readability, structure, all',
      optional: true,  // defaults to 'all'
    },
  },
  handler: async ({ targetType, targetId, fixTypes }) => {
    // 1. Load existing AccessibilityReport
    // 2. For each auto-fixable issue:
    //    - headings: infer hierarchy from content, apply heading tags
    //    - alt-text: generate via Claude Vision
    //    - readability: rewrite long/complex sentences via Claude Haiku
    //    - structure: convert run-on paragraphs to lists, tag tables
    // 3. Show before/after diff to educator for approval
    // 4. Apply approved changes, re-scan, update report
  },
}
```

#### `compliance_report`

```typescript
{
  name: 'compliance_report',
  description: 'Generate an ADA compliance report for a course, department, or the entire university. Includes WCAG 2.1 AA criteria mapping and remediation recommendations.',
  parameters: {
    scope: { type: 'string', description: '"course", "department", or "university"' },
    scopeId: { type: 'string', description: 'Course ID or department code', optional: true },
    format: { type: 'string', description: '"summary" or "detailed"', optional: true },
  },
  handler: async ({ scope, scopeId, format }) => {
    const summary = await getComplianceSummary(scope, scopeId)
    // Format as conversational report for Sandy to present
    // Include specific action items and quick wins
  },
}
```

### Sandy Conversation Examples

**Educator:** "Is my course accessible?"
```
Sandy: I scanned all 24 materials in ENG 101. Here's your accessibility report:

Overall: B (82%) — good, but 4 items need attention.

Issues found:
• 3 PDFs have no heading structure (auto-fixable)
• 2 images missing alt text (I can generate these)
• 1 document at grade 16 reading level

Want me to auto-fix the headings and generate alt text? I'll show you the changes before applying them.
```

**Staff:** "How compliant is the College of Arts & Sciences?"
```
Sandy: Here's the A&S compliance snapshot:

Overall: 76% compliant (WCAG 2.1 AA)
• English: 92% ✓
• History: 89% ✓
• Chemistry: 71% — 14 documents need headings
• Art: 61% — mostly image alt-text gaps in studio courses

Top quick win: Running auto-remediation on Chemistry's 14 documents
would jump the college to 83%. Want me to generate the fixes for
department review?
```

---

## Implementation Priority Summary

| Phase | What | AI Cost | Impact | Effort |
|-------|-------|---------|--------|--------|
| 1 | Image alt-text generation | ~$0.002/image (Haiku Vision) | Every image on platform | 0.5 sprint |
| 2 | Transcript persistence | $0 (data already exists) | Every audio episode | 0.25 sprint |
| 3 | Readability analysis | ~$0.001/doc (local + Haiku) | Every text content item | 0.5 sprint |
| 4 | Document accessibility scanner | ~$0.003/doc (Haiku) | Every PDF upload | 1 sprint |
| 5 | Color contrast validation | $0 (pure computation) | Playground apps | 0.5 sprint |
| 6 | Compliance dashboard | $0 (aggregation queries) | Admin/Staff visibility | 1 sprint |
| 7 | Sandy remediation agent | Variable (per remediation) | Bulk fix existing content | 1 sprint |

**Total: ~4.75 sprints**

---

## Patent Claims

### Primary Claim

A system and method for **automated digital accessibility compliance in educational platforms** comprising:

1. **Born-accessible content pipeline** — AI-powered accessibility validation integrated at every content creation touchpoint (document upload, interactive tool building, HTML authoring, audio generation), preventing non-compliant content from entering the system without explicit educator override

2. **Multi-modal accessibility analysis** — simultaneous evaluation of visual (alt text, contrast), structural (headings, tables, lists), cognitive (readability, jargon), and temporal (captions, transcripts) accessibility dimensions using large language model analysis

3. **Automated remediation with human-in-the-loop** — AI generates specific accessibility fixes (alt text, heading structure, plain-language rewrites, color adjustments) presented to content creators for review and approval, reducing remediation cost from $50-200/document to near-zero

4. **Institutional compliance aggregation** — hierarchical accessibility scoring (content item → course → department → university) with impact-weighted remediation queuing (enrollment × severity) enabling administrators to demonstrate federal compliance across the entire digital presence

5. **Conversational accessibility agent** — natural language interface for scanning, remediating, and reporting on accessibility compliance, lowering the expertise barrier for faculty who are not accessibility specialists

### Interdependency Claims (strengthens existing patent filings)

- **Sandy agent + accessibility scanning** — The universal AI agent's tool registry enables accessibility as a first-class capability across all platform interactions, not a separate compliance tool
- **Syllabus Intelligence + readability analysis** — Readability scoring from the accessibility layer feeds into syllabus quality assessment, creating a unified content quality framework
- **Audio pipeline + automatic transcripts** — The TTS generation architecture inherently produces accessibility artifacts (transcripts) as a byproduct, not an afterthought
- **Proactive agency + compliance nudges** — The platform's proactive suggestion system identifies and surfaces accessibility issues before they affect students, embodying the "One Brain" architecture

---

## Compliance Framework Reference

### WCAG 2.1 AA Success Criteria Covered

| Principle | Criteria Addressed | Platform Feature |
|-----------|-------------------|-----------------|
| **Perceivable** | 1.1.1 Non-text Content | Alt-text generation (Phase 1) |
| | 1.2.1 Audio-only/Video-only | Transcript persistence (Phase 2) |
| | 1.3.1 Info and Relationships | Document scanner — headings, tables, lists (Phase 4) |
| | 1.3.2 Meaningful Sequence | Document scanner — reading order (Phase 4) |
| | 1.4.1 Use of Color | Document scanner — color-only info (Phase 4) |
| | 1.4.3 Contrast (Minimum) | Contrast checker (Phase 5) |
| | 1.4.5 Images of Text | Document scanner — image-of-text detection (Phase 4) |
| **Operable** | 2.1.1 Keyboard | Already implemented (course map a11y overlay) |
| | 2.4.2 Page Titled | Document scanner — missing title (Phase 4) |
| | 2.4.4 Link Purpose | Document scanner — descriptive links (Phase 4) |
| | 2.4.6 Headings and Labels | Document scanner — heading structure (Phase 4) |
| **Understandable** | 3.1.1 Language of Page | Document scanner — language tag (Phase 4) |
| | 3.1.5 Reading Level | Readability engine (Phase 3) |
| **Robust** | 4.1.2 Name, Role, Value | Existing ARIA implementation + extension |

### DOJ Title II Timeline

| Milestone | Date | Platform Response |
|-----------|------|------------------|
| Final rule published | April 2024 | — |
| Large entities comply | April 2026 | Phases 1-5 complete: all new content born accessible |
| Small entities comply | April 2027 | Phases 6-7 complete: bulk remediation + reporting |

---

## Open Questions

1. **Retroactive scan scope:** Should we auto-scan all existing content on deployment, or let educators/staff trigger scans? Auto-scan could be expensive at scale but provides immediate compliance picture.

2. **Enforcement level:** Should the platform *block* publishing of F-grade content, or just warn? University culture typically resists hard blocks on faculty content. Recommendation: warn + nudge, with optional department-level policy to require minimum grade.

3. **PDF remediation depth:** We can fix text-level issues (headings, readability) in the extracted text, but the original PDF file remains unchanged. Should we generate remediated PDFs, or is fixing the platform representation sufficient?

4. **Video content:** The current platform is primarily text/audio. When video is added, caption generation becomes critical. Plan for Whisper/Azure Speech-to-Text integration.

5. **Third-party content:** LTI tools, external links, and Canvas imports may not be scannable. How do we handle compliance reporting for content we can't analyze?
