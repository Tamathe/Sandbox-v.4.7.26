/**
 * email-rewriter-service.ts
 *
 * System prompts, intent detection, variant generation, and refinement
 * for the elevated Email Rewriter.
 */

import type { EmailRewriterPreflight } from './email-rewriter-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmailIntent {
  primaryIntent:
    | 'request'
    | 'apology'
    | 'follow-up'
    | 'introduction'
    | 'thank-you'
    | 'escalation'
    | 'scheduling'
    | 'update'
    | 'other'
  recipient: {
    name: string | null
    inferredRole: 'professor' | 'employer' | 'peer' | 'team' | 'unknown'
    matchedContact: string | null
  }
  currentTone: 'casual' | 'professional' | 'apologetic' | 'aggressive' | 'neutral'
  issues: string[]
  subjectLine: string | null
}

export type VariantId = 'polished' | 'warm' | 'concise'

export interface RewriteRequest {
  originalEmail: string
  preflight: EmailRewriterPreflight
}

export interface InterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  originalEmail: string
  intent: EmailIntent
  preflight: EmailRewriterPreflight
}

export interface RefineRequest {
  originalEmail: string
  currentRewrite: string
  instruction: string
  intent: EmailIntent
  preflight: EmailRewriterPreflight
}

// ── Variant labels (adapt to intent) ───────────────────────────────────────

const VARIANT_LABELS: Record<string, [string, string, string]> = {
  request: ['Clear Ask', 'Friendly Request', 'Quick & Direct'],
  apology: ['Professional Repair', 'Warm Apology', 'Brief & Sincere'],
  'follow-up': ['Firm Follow-Up', 'Friendly Nudge', 'Quick Bump'],
  escalation: ['Diplomatic Escalation', 'Solution-Focused', 'Bottom Line'],
  scheduling: ['Formal Scheduling', 'Flexible & Friendly', 'Quick Availability'],
  introduction: ['Polished Introduction', 'Warm First Impression', 'Brief Hello'],
  'thank-you': ['Gracious Thanks', 'Warm Appreciation', 'Quick Thank-You'],
  update: ['Formal Update', 'Friendly Update', 'Quick FYI'],
  other: ['Professional', 'Friendly', 'Concise'],
}

export function getVariantLabel(variantId: VariantId, intent: EmailIntent): string {
  const labels = VARIANT_LABELS[intent.primaryIntent] ?? VARIANT_LABELS.other
  switch (variantId) {
    case 'polished':
      return labels[0]
    case 'warm':
      return labels[1]
    case 'concise':
      return labels[2]
  }
}

// ── Preflight context builder ──────────────────────────────────────────────

function buildPreflightContext(pf: EmailRewriterPreflight): string {
  const parts: string[] = []
  parts.push(`User: ${pf.user.name} (${pf.user.role})`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.user.college) parts.push(`College: ${pf.user.college}`)
  if (pf.writingStyle) parts.push(`Preferred writing style: ${pf.writingStyle}`)
  return parts.join('\n')
}

function buildContactsContext(pf: EmailRewriterPreflight): string {
  if (pf.knownContacts.length === 0) return 'No known contacts from platform data.'
  return pf.knownContacts
    .slice(0, 15)
    .map((c) => `- ${c.name} (${c.role}) — ${c.context}`)
    .join('\n')
}

// ── Intent detection prompt ────────────────────────────────────────────────

export function getIntentDetectionPrompt(
  originalEmail: string,
  pf: EmailRewriterPreflight,
): { system: string; user: string } {
  return {
    system: `Analyze this email draft and return a JSON object with:
- primaryIntent: one of [request, apology, follow-up, introduction, thank-you, escalation, scheduling, update, other]
- recipient: { name: string|null, inferredRole: one of [professor, employer, peer, team, unknown] }
- currentTone: one of [casual, professional, apologetic, aggressive, neutral]
- issues: string[] — specific problems (e.g., "buried lede", "no greeting", "passive voice in key ask", "too long for the content")
- subjectLine: string|null — existing subject if visible, or inferred

Respond with ONLY the JSON object, no markdown, no explanation.

Known contacts for context:
${buildContactsContext(pf)}`,
    user: `Email draft:\n---\n${originalEmail.slice(0, 3000)}\n---`,
  }
}

export function parseIntent(raw: string): EmailIntent {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned) as EmailIntent
  } catch {
    return {
      primaryIntent: 'other',
      recipient: { name: null, inferredRole: 'unknown', matchedContact: null },
      currentTone: 'neutral',
      issues: [],
      subjectLine: null,
    }
  }
}

// ── Variant generation prompts ─────────────────────────────────────────────

const TONE_DIRECTIVES: Record<VariantId, string> = {
  polished:
    'Formal register. Full sentences. Proper greeting and sign-off. Structure: context → ask → next steps. No contractions. No emoji.',
  warm: 'Approachable but appropriate. Contractions OK. Conversational sentence structure. Still clear and organized. Light warmth, not excessive.',
  concise:
    'Shortest possible version. Strip all padding. Lead with the core ask or statement. No pleasantries unless critical to the relationship. Bullet points OK for multiple items.',
}

export function getVariantPrompt(
  variantId: VariantId,
  originalEmail: string,
  intent: EmailIntent,
  pf: EmailRewriterPreflight,
): { system: string; user: string } {
  const label = getVariantLabel(variantId, intent)
  return {
    system: `Rewrite this email in a "${label}" tone.

Detected intent: ${intent.primaryIntent}
Recipient: ${intent.recipient.name ?? 'unknown'} (${intent.recipient.inferredRole})
Issues to fix: ${intent.issues.join(', ') || 'none detected'}

Rules:
- Preserve ALL factual content (dates, names, numbers, specific details)
- Fix the issues listed above
- Keep the rewrite ${TONE_DIRECTIVES[variantId]}
- If the original has a subject line, improve it. If not, suggest one prefixed with "Subject: " on the first line.
- Sign off with: ${pf.user.name}
- Output ONLY the rewritten email. No preamble, no explanation, no markdown formatting.

Tone directive for "${label}":
${TONE_DIRECTIVES[variantId]}`,
    user: `Original email:\n---\n${originalEmail.slice(0, 3000)}\n---`,
  }
}

// ── Sandy interview prompt ─────────────────────────────────────────────────

export function getInterviewSystemPrompt(
  originalEmail: string,
  intent: EmailIntent,
  pf: EmailRewriterPreflight,
): string {
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping a user improve an email they've drafted.

## Your Personality
- You're a sharp-eyed editor, not a chatty interviewer. Brief, useful, specific.
- Reference specific phrases from their email — never speak in abstractions.
- Use their first name (${pf.user.name.split(' ')[0]}) once in your opening, then keep it professional.
- If the email is already good, say so: "Honestly, this is solid — I just tightened a few phrases."

## What You Know
${buildPreflightContext(pf)}

## Known Contacts
${buildContactsContext(pf)}

## Email Analysis
Intent: ${intent.primaryIntent}
Recipient: ${intent.recipient.name ?? 'unknown'} (${intent.recipient.inferredRole})
Current tone: ${intent.currentTone}
Issues found: ${intent.issues.join(', ') || 'none'}

## Rules
- Never ask for information you can infer from the email itself.
- You ask AT MOST 1-2 questions before producing variants. Usually zero.
- Each message must include quick-reply chips:
  <!--CHIPS:["chip1","chip2","chip3"]-->
- Always include an escape hatch chip.
- Never reproduce the full rewritten email in chat — the left panel handles that.
  Only quote specific phrases you changed and explain why.
- If the email mentions a person from known contacts, acknowledge the relationship.
- If the email contains sensitive content, handle with extra care.

## Anti-Patterns
- Don't add formality that doesn't match the recipient
- Don't change factual content — dates, grades, names, numbers stay
- Don't add information the user didn't include
- Don't use passive-aggressive business clichés`
}

// ── Sandy analysis message builder ─────────────────────────────────────────

export function buildSandyAnalysis(intent: EmailIntent, pf: EmailRewriterPreflight): string {
  const firstName = pf.user.name.split(' ')[0]
  const parts: string[] = []

  // Opening
  let opening = `Hey ${firstName}! `
  if (intent.recipient.name) {
    const matched = pf.knownContacts.find(
      (c) => c.name.toLowerCase() === intent.recipient.name?.toLowerCase(),
    )
    if (matched) {
      opening += `I see you're writing to **${matched.name}** (${matched.context}) — `
    } else {
      opening += `I see you're writing to **${intent.recipient.name}** — `
    }
    opening += `looks like a ${intent.primaryIntent.replace('-', ' ')}.`
  } else {
    opening += `This looks like a ${intent.primaryIntent.replace('-', ' ')} email.`
  }
  parts.push(opening)

  // Issues
  if (intent.issues.length > 0) {
    parts.push("Here's what I noticed:")
    for (const issue of intent.issues.slice(0, 4)) {
      parts.push(`- ${issue}`)
    }
  }

  parts.push('\nPick the version that feels right, or I can tweak any of them.')

  return parts.join('\n')
}

// ── Refine prompt ──────────────────────────────────────────────────────────

export function getRefinePrompt(req: RefineRequest): { system: string; user: string } {
  return {
    system: `You are rewriting an email based on the user's specific instruction.

Original email:
---
${req.originalEmail.slice(0, 3000)}
---

Current rewrite:
---
${req.currentRewrite}
---

Detected intent: ${req.intent.primaryIntent}
Recipient: ${req.intent.recipient.name ?? 'unknown'} (${req.intent.recipient.inferredRole})

Rules:
- Apply the user's instruction precisely
- Preserve ALL factual content (dates, names, numbers)
- Sign off with: ${req.preflight.user.name}
- Output ONLY the refined email. No preamble, no explanation.`,
    user: `User's instruction: "${req.instruction}"`,
  }
}

// ── Chip/phase extraction (reused pattern from cover letter) ───────────────

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:(\w[\w-]*)-->/

export function extractChips(text: string): string[] {
  const match = CHIPS_REGEX.exec(text)
  if (!match) return []
  try {
    return JSON.parse(match[1]) as string[]
  } catch {
    return []
  }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}
