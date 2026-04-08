/**
 * sentiment-analyzer-service.ts
 *
 * Sandy-powered sentiment analysis for Twitter/X Spaces, public forums,
 * and campus discourse. User pastes transcript/text, Sandy analyzes
 * sentiment, themes, stakeholder concerns, and drafts talking points.
 */

export interface SentimentAnalyzerInterviewState {
  phase: 'input' | 'context' | 'analyzing' | 'results' | 'exploring'
  institutionalContext: string | null
  additionalContext: string | null
}

export interface SentimentAnalyzerGenerateRequest {
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: SentimentAnalyzerInterviewState
  rawInput: string
}

export interface SentimentAnalyzerInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: SentimentAnalyzerInterviewState
  rawInput?: string
}

export function getSentimentGeneratePrompt(req: SentimentAnalyzerGenerateRequest): string {
  return `You are Sandy, analyzing public sentiment for the University of Kentucky's communications team.

## Context
User: ${req.preflight.user.name} (${req.preflight.user.role}, ${req.preflight.user.department ?? 'UK'})
${req.interviewState.institutionalContext ? `Institutional context: ${req.interviewState.institutionalContext}` : ''}

## Text to Analyze
${req.rawInput}

## Instructions
Analyze the provided text for sentiment, themes, and stakeholder concerns. Structure your response with these exact headers:

## Executive Summary
2-3 sentence overview of the sentiment landscape. Lead with the headline finding.

## Overall Sentiment
State: [Positive / Mixed / Negative / Neutral]
Score: [number from -1.0 to 1.0]
Brief explanation of why.

## Key Themes
For each theme found (3-6 themes):
### [Theme Name]
- **Sentiment**: [Positive/Mixed/Negative]
- **Frequency**: [How often mentioned]
- **Key Quotes**: [1-2 direct quotes]

## Stakeholder Map
For each identifiable stakeholder group:
- **Group**: [e.g., students, faculty, community, alumni]
- **Sentiment**: [overall]
- **Primary Concerns**: [bulleted list]

## Notable Quotes
3-5 quotes that are significant — either because they represent a majority view, an influential voice, or a particularly sharp articulation of a concern.
For each: the quote, why it matters, and its sentiment.

## Recommended Responses
For each major concern identified:
- **Concern**: [what people are worried about]
- **Talking Point**: [how to address it]
- **Tone**: [empathetic / factual / proactive / measured]

## Risk Assessment
What could escalate? What needs immediate attention vs. monitoring?

Rules:
- Be specific — quote the actual text, don't paraphrase vaguely
- Don't sugarcoat negative sentiment — the comms team needs the truth
- Talking points should be usable as-is, not generic platitudes
- If the text is too short or unclear for meaningful analysis, say so
- 600-1000 words total`
}

export function getSentimentInterviewPrompt(req: SentimentAnalyzerInterviewRequest): string {
  const firstName = req.preflight.user.name.split(' ')[0]
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} analyze public sentiment.

## Current State
Phase: ${req.interviewState.phase}
Context: ${req.interviewState.institutionalContext ?? 'not yet provided'}
Text provided: ${req.rawInput ? 'yes' : 'no'}

## Rules
- 2-3 sentences max, then ONE question if needed
- Be concise — comms people are busy
- Every message MUST end with <!--CHIPS:["a","b","c"]-->
- Every message MUST include <!--PHASE:phase-name-->
- After analysis is generated, reference specific findings in your chat responses
- If asked to draft a response, keep it to 3-5 sentences max`
}

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:(\w[\w-]*)-->/

export function extractChips(text: string): string[] {
  const match = CHIPS_REGEX.exec(text)
  if (!match) return []
  try { return JSON.parse(match[1]) as string[] } catch { return [] }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}
