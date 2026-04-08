// ─── Virtual Clinic — Patient Affect Engine ───────────────────────────────────
// Computes patient engagement level based on recent exchanges.
// High engagement = patient opens up.
// Low engagement = patient gives minimal answers, withholds sensitive info.

import { callHaikuJSON, AFFECT_MAX_TOKENS } from './ai-config'
import type { AffectState, TranscriptMessage } from './types'

// ─── Default Affect ──────────────────────────────────────────────────────────

export const DEFAULT_AFFECT: AffectState = {
  engagementLevel: 60,
  lastDelta: 0,
  reason: 'Initial encounter — patient is neutral and cooperating.',
}

// ─── Affect Delta Computation ────────────────────────────────────────────────

export async function computeAffectDelta(
  recentMessages: TranscriptMessage[],
  currentAffect: AffectState,
  personalityNotes: string | null,
): Promise<AffectState> {
  // Take last 4 messages
  const last4 = recentMessages.slice(-4)

  // If there are no user messages, patient affect hasn't been influenced
  const hasUserMessages = last4.some((m) => m.role === 'user')
  if (!hasUserMessages) {
    return currentAffect
  }

  const transcript = last4
    .map((m) => `[${m.role === 'user' ? 'CLINICIAN' : 'PATIENT'}] ${m.content.trim()}`)
    .join('\n')

  const system = `You are an expert clinical communication analyst evaluating patient engagement shifts during a medical encounter.
Assess how the clinician's recent communication style has affected patient engagement.

Guidelines for delta scoring (range -15 to +15):
- Open-ended, empathic questions: +5 to +10
- Closed checklist-style questions: -3 to -5
- Acknowledging patient feelings or concerns: +5 to +8
- Rushing, interrupting, or dismissing the patient: -5 to -10
- Neutral or mixed exchanges: -2 to +2

Patient personality context: ${personalityNotes || 'Standard patient — cooperative but guarded initially.'}
Current engagement level: ${currentAffect.engagementLevel}/100

Return JSON only — no prose, no markdown fencing.`

  const userMessage = `## Recent Exchange (last 4 messages)
${transcript}

Assess the engagement delta and return:
{
  "delta": <integer from -15 to 15>,
  "reason": "<one concise sentence explaining the shift>"
}`

  try {
    const parsed = await callHaikuJSON<{ delta: number; reason: string }>(
      system,
      userMessage,
      AFFECT_MAX_TOKENS,
    )

    // Clamp delta to -15..+15
    const delta = Math.max(-15, Math.min(15, Math.round(parsed.delta)))

    // Clamp engagementLevel to 0..100
    const newLevel = Math.max(0, Math.min(100, currentAffect.engagementLevel + delta))

    return {
      engagementLevel: newLevel,
      lastDelta: delta,
      reason: parsed.reason ?? 'Engagement updated based on recent exchange.',
    }
  } catch {
    // Non-critical — return affect unchanged on parse/API errors
    return currentAffect
  }
}

// ─── Affect Prompt Section Builder ──────────────────────────────────────────

export function buildAffectPromptSection(affect: AffectState): string {
  const { engagementLevel } = affect

  if (engagementLevel >= 70) {
    return `## PATIENT ENGAGEMENT — OPEN (${engagementLevel}/100)
The patient is feeling heard and is warming up to this clinician. Reflect this naturally in your responses:
- Give somewhat longer, more detailed answers than strictly asked
- Volunteer small relevant details ("Oh, and I should probably mention…")
- Use warmer, more conversational language
- Show mild relief or gratitude when the clinician acknowledges your concerns
- Still stay in character — don't over-share, but be forthcoming`
  }

  if (engagementLevel >= 40) {
    return `## PATIENT ENGAGEMENT — NEUTRAL (${engagementLevel}/100)
The patient is cooperating at a baseline level. Follow the personality notes for your default behavior.
- Answer questions directly but don't volunteer extra information
- Moderate warmth — polite but not effusive
- Share sensitive information only when directly and empathically asked`
  }

  // engagementLevel < 40 — WITHDRAWN
  return `## PATIENT ENGAGEMENT — WITHDRAWN (${engagementLevel}/100)
The patient feels rushed, dismissed, or uncomfortable with this clinician. Reflect this through guarded behavior:
- Give short, minimal answers ("I don't know," "I guess," "Maybe")
- Use defensive or closed-off language ("I'd rather not say," "Why does that matter?")
- Do NOT disclose sensitive information (substance use, suicidal ideation, trauma history, relationship issues) unless the clinician shows genuine, sustained empathy
- If asked about SI/HI directly, deflect with "I'm fine" or "That's a strong word" — only open up if the clinician explicitly acknowledges your discomfort first
- Slight irritability or one-word answers are appropriate; avoid hostility that would end the encounter`
}
