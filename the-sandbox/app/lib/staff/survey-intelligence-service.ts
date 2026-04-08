/**
 * Survey Intelligence — Core Service
 *
 * Generation prompts, interview prompts, evidence search, gap analysis.
 * Uses Sonnet for generation, Haiku for interview.
 */

import type { VaultSearchResult } from './survey-vault-service'
import type { NewsSearchResult } from '../vector-store'
import type { SurveyIntelligencePreflight } from './survey-intelligence-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SurveyInterviewState {
  phase: 'setup' | 'template' | 'vault-review' | 'generation' | 'refinement'
  activeQuestionId: string | null
  activeQuestionNumber: number | null
  lastSearchSummary: string | null
}

export interface SurveyInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: SurveyIntelligencePreflight
  interviewState: SurveyInterviewState
  projectContext: {
    title: string
    surveyOrg: string | null
    questionCount: number
    vaultDocCount: number
    questionsStatus: { pending: number; drafted: number; approved: number }
  }
}

export interface SurveyGenerateRequest {
  questionNumber: number
  questionText: string
  category: string
  wordLimit: number | null
  writingTips: string | null
  projectTitle: string
  surveyOrg: string | null
  vaultEvidence: VaultSearchResult[]
  ukNowEvidence: NewsSearchResult[]
}

export interface SurveyRefineRequest {
  questionNumber: number
  questionText: string
  category: string
  wordLimit: number | null
  currentDraft: string
  instruction: string
  additionalEvidence: VaultSearchResult[]
  additionalUKNow: NewsSearchResult[]
}

// ── Chip & Phase Extraction ────────────────────────────────────────────────

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:([\w-]+)-->/

export function extractChips(text: string): string[] {
  const match = text.match(CHIPS_REGEX)
  if (!match) return []
  try {
    return JSON.parse(match[1])
  } catch {
    return []
  }
}

export function extractPhase(text: string): string | null {
  const match = text.match(PHASE_REGEX)
  return match ? match[1] : null
}

// ── Interview Prompt (Haiku) ───────────────────────────────────────────────

export function getInterviewPrompt(req: SurveyInterviewRequest): string {
  const { preflight, interviewState, projectContext } = req
  const firstName = preflight.user.name.split(' ')[0]

  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} respond to an institutional survey using the Survey Intelligence tool.

## Your Personality
- Warm, efficient, and deeply knowledgeable about higher education surveys.
- You know that survey responses need to be specific, evidence-based, and highlight what makes UK unique.
- 2-3 sentences max per message, then ONE follow-up question if needed.
- Never reproduce a full draft in chat — the left panel handles that.

## What You Know
User: ${preflight.user.name} (${preflight.user.role})
Department: ${preflight.user.department ?? 'Not set'}
Project: ${projectContext.title} (${projectContext.surveyOrg ?? 'Custom'})
Questions: ${projectContext.questionCount} total — ${projectContext.questionsStatus.drafted} drafted, ${projectContext.questionsStatus.approved} approved, ${projectContext.questionsStatus.pending} pending
Vault documents: ${projectContext.vaultDocCount}

## Interview State
Phase: ${interviewState.phase}
Active question: ${interviewState.activeQuestionId ? 'Q' + interviewState.activeQuestionNumber : 'None selected'}
${interviewState.lastSearchSummary ? `Last search: ${interviewState.lastSearchSummary}` : ''}

## Phase-Specific Behavior

### setup
- Greet the user and ask what survey they're preparing for.
- If they mention "Great Colleges" or similar, suggest the built-in template.
- Emit: <!--CHIPS:["Great Colleges to Work For","Carnegie Community Engagement","Custom survey"]-->

### template
- Show which template was selected and how many questions it has.
- Ask if they want all questions or a subset.
- Emit: <!--CHIPS:["Use all questions","Let me pick specific ones","I'll add my own questions"]-->

### vault-review
- Check vault document count and categories covered.
- Identify gaps: "I see documents for benefits and culture, but nothing about professional development."
- Encourage uploads for stronger responses.
- Emit: <!--CHIPS:["Upload a document","Search existing evidence","Start drafting","What categories am I missing?"]-->

### generation
- When a draft is generated, briefly summarize what evidence was used.
- Point out gaps: "I couldn't find evidence for [claim]."
- Offer to generate the next question or refine this one.
- Emit: <!--CHIPS:["Generate next question","Revise this draft","Show evidence table","What evidence am I missing?"]-->

### refinement
- Help the user tighten, expand, or redirect the draft.
- Track word count vs. limit if applicable.
- Emit: <!--CHIPS:["Make it more specific","Shorten to word limit","Mark approved","Next question"]-->

## Rules
- Every message MUST end with <!--CHIPS:[...]-->
- Every message MUST end with <!--PHASE:...-->
- Be specific about evidence: cite document titles and UKNow article titles.
- When a question is approved, congratulate briefly and move on.
- If the user asks to upload, remind them to use the Vault tab on the left panel.`
}

// ── Generation Prompt (Sonnet) ─────────────────────────────────────────────

export function getGeneratePrompt(req: SurveyGenerateRequest): string {
  const vaultBlock = req.vaultEvidence.length > 0
    ? req.vaultEvidence
        .map(
          (e, i) =>
            `[Vault ${i + 1}: "${e.documentTitle}" — ${e.category}]\n${e.content}\n(Relevance: ${Math.round(e.similarity * 100)}%)`
        )
        .join('\n\n---\n\n')
    : 'No vault documents found for this category.'

  const ukNowBlock = req.ukNowEvidence.length > 0
    ? req.ukNowEvidence
        .map(
          (e, i) =>
            `[UKNow ${i + 1}: "${e.title}" — ${e.sectionLabel}, ${e.publishedAt ? new Date(e.publishedAt).toLocaleDateString() : 'undated'}]\n${e.content}\n(Relevance: ${Math.round(e.similarity * 100)}%)`
        )
        .join('\n\n---\n\n')
    : 'No UKNow articles found for this topic.'

  return `You are a higher education survey response specialist helping the University of Kentucky respond to an institutional survey. Write a compelling, evidence-based response.

## Survey Context
Survey: ${req.projectTitle}${req.surveyOrg ? ` (${req.surveyOrg})` : ''}
Institution: University of Kentucky (UK) — flagship R1 land-grant research university, 30,000+ students, 16,000+ employees

## The Question
Question ${req.questionNumber}: ${req.questionText}
Category: ${req.category}
${req.wordLimit ? `Word limit: ${req.wordLimit} words` : ''}
${req.writingTips ? `\nWriting tips: ${req.writingTips}` : ''}

## Evidence from Knowledge Vault
${vaultBlock}

## Evidence from UKNow Articles
${ukNowBlock}

## Response Format
Structure your response with these exact markdown sections:

## Draft Response
Write the actual survey response. Rules:
- Lead with UK's strongest, most specific evidence
- Name specific programs, dollar amounts, percentages, and dates
- Highlight what makes UK unique — not generic "we value X" statements
- ${req.wordLimit ? `Stay within ${req.wordLimit} words` : 'Be comprehensive but focused'}
- Write in institutional voice — confident, specific, proud but not boastful
- Every major claim must be traceable to evidence above
- If evidence is thin, make claims appropriately cautious

## Evidence Table
For each major claim in the draft:
| Claim | Source | Source Type | Confidence |
|-------|--------|-------------|------------|
Where Source Type = "vault" or "uknow", Confidence = "high" (direct stat/quote), "medium" (inferred), "low" (tangential)

## Gap Analysis
List categories of evidence that would strengthen this response but were not found:
- [Gap description] → Suggested source: [where to find this evidence]
If evidence is solid, say "No significant gaps identified."`
}

// ── Refinement Prompt (Sonnet) ─────────────────────────────────────────────

export function getRefinePrompt(req: SurveyRefineRequest): string {
  const wordCount = req.currentDraft.split(/\s+/).length

  const evidenceBlock =
    req.additionalEvidence.length > 0 || req.additionalUKNow.length > 0
      ? [
          ...req.additionalEvidence.map(
            (e, i) => `[Vault ${i + 1}: "${e.documentTitle}"]\n${e.content}`
          ),
          ...req.additionalUKNow.map(
            (e, i) => `[UKNow ${i + 1}: "${e.title}"]\n${e.content}`
          ),
        ].join('\n\n---\n\n')
      : 'No additional evidence retrieved.'

  return `You are revising a survey response draft for the University of Kentucky.

## Original Question
Question ${req.questionNumber}: ${req.questionText}
Category: ${req.category}
${req.wordLimit ? `Word limit: ${req.wordLimit} words` : ''}

## Current Draft (${wordCount} words)
${req.currentDraft}

## Revision Instruction
${req.instruction}

## Additional Evidence
${evidenceBlock}

## Rules
- Maintain institutional voice
- Keep all well-supported claims from the original
- Apply the revision instruction precisely
- ${req.wordLimit ? `Stay within ${req.wordLimit} words. Current: ${wordCount} words.` : ''}
- Output the revised draft under a ## Revised Draft header
- Update the evidence table if new evidence was used
- Output ONLY the revised draft + updated evidence table. No preamble.`
}

// ── Parse Generation Output ────────────────────────────────────────────────

export interface ParsedGenerationOutput {
  draftResponse: string
  evidenceTable: { claim: string; source: string; sourceType: string; confidence: string }[]
  gapAnalysis: { gap: string; suggestion: string }[]
}

export function parseGenerationOutput(fullText: string): ParsedGenerationOutput {
  const sections = fullText.split(/^## /m).filter(Boolean)

  let draftResponse = ''
  const evidenceTable: ParsedGenerationOutput['evidenceTable'] = []
  const gapAnalysis: ParsedGenerationOutput['gapAnalysis'] = []

  for (const section of sections) {
    const lines = section.trim()
    if (lines.startsWith('Draft Response') || lines.startsWith('Revised Draft')) {
      draftResponse = lines.replace(/^(Draft Response|Revised Draft)\s*\n/, '').trim()
    } else if (lines.startsWith('Evidence Table')) {
      // Parse markdown table rows
      const tableLines = lines.split('\n').filter((l) => l.includes('|') && !l.includes('---'))
      for (const line of tableLines.slice(1)) {
        // skip header
        const cells = line
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
        if (cells.length >= 4) {
          evidenceTable.push({
            claim: cells[0],
            source: cells[1],
            sourceType: cells[2],
            confidence: cells[3],
          })
        }
      }
    } else if (lines.startsWith('Gap Analysis')) {
      const gapLines = lines.split('\n').filter((l) => l.startsWith('- '))
      for (const line of gapLines) {
        const parts = line.replace(/^- /, '').split('→')
        gapAnalysis.push({
          gap: parts[0]?.trim() ?? line,
          suggestion: parts[1]?.replace(/^.*?:/, '').trim() ?? '',
        })
      }
    }
  }

  return { draftResponse, evidenceTable, gapAnalysis }
}
