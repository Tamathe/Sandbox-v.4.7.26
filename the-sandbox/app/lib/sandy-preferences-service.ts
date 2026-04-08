/**
 * Sandy Preferences Service — manages per-user Sandy AI preferences
 * (tone, proactivity level, response length, chips visibility).
 */

import { prisma } from './prisma'

export interface SandyPreferenceData {
  tone: string
  proactivityLevel: string
  responseLength: string
  showChips: boolean
  homepageView: string
  sandyIntroSeen: boolean
  updatedAt: Date
}

const DEFAULTS: Omit<SandyPreferenceData, 'updatedAt'> = {
  tone: 'balanced',
  proactivityLevel: 'medium',
  responseLength: 'standard',
  showChips: true,
  homepageView: 'focus',
  sandyIntroSeen: false,
}

export const VALID_HOMEPAGE_VIEWS = ['focus', 'full'] as const

/** Valid values for each field. */
export const VALID_TONES = ['formal', 'balanced', 'casual'] as const
export const VALID_PROACTIVITY = ['off', 'low', 'medium', 'high'] as const
export const VALID_LENGTH = ['concise', 'standard', 'detailed'] as const

const PREFERENCE_SELECT = { tone: true, proactivityLevel: true, responseLength: true, showChips: true, homepageView: true, sandyIntroSeen: true, updatedAt: true } as const

/**
 * Get a user's Sandy preferences. Auto-creates defaults if none exist.
 */
export async function getPreferences(userId: string): Promise<SandyPreferenceData> {
  const existing = await prisma.sandyPreference.findUnique({
    where: { userId },
    select: PREFERENCE_SELECT,
  })

  if (existing) return existing

  // Auto-create defaults
  const created = await prisma.sandyPreference.create({
    data: { userId, ...DEFAULTS },
    select: PREFERENCE_SELECT,
  })
  return created
}

/**
 * Update a user's Sandy preferences. Accepts partial updates.
 * Validates values against allowed enums.
 */
export async function updatePreferences(
  userId: string,
  patch: Partial<SandyPreferenceData>,
): Promise<SandyPreferenceData> {
  const data: Record<string, unknown> = {}

  if (patch.tone !== undefined) {
    if (!(VALID_TONES as readonly string[]).includes(patch.tone)) {
      throw new Error(`Invalid tone: ${patch.tone}`)
    }
    data.tone = patch.tone
  }

  if (patch.proactivityLevel !== undefined) {
    if (!(VALID_PROACTIVITY as readonly string[]).includes(patch.proactivityLevel)) {
      throw new Error(`Invalid proactivityLevel: ${patch.proactivityLevel}`)
    }
    data.proactivityLevel = patch.proactivityLevel
  }

  if (patch.responseLength !== undefined) {
    if (!(VALID_LENGTH as readonly string[]).includes(patch.responseLength)) {
      throw new Error(`Invalid responseLength: ${patch.responseLength}`)
    }
    data.responseLength = patch.responseLength
  }

  if (patch.showChips !== undefined) {
    data.showChips = !!patch.showChips
  }

  if (patch.homepageView !== undefined) {
    if (!(VALID_HOMEPAGE_VIEWS as readonly string[]).includes(patch.homepageView)) {
      throw new Error(`Invalid homepageView: ${patch.homepageView}`)
    }
    data.homepageView = patch.homepageView
  }

  if (patch.sandyIntroSeen !== undefined) {
    data.sandyIntroSeen = !!patch.sandyIntroSeen
  }

  const result = await prisma.sandyPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULTS, ...data },
    update: data,
    select: PREFERENCE_SELECT,
  })

  return result
}

/**
 * Build system prompt instructions from preferences.
 * Returns empty string if all defaults (no behavioral change needed).
 */
export function buildPreferencesPromptSection(prefs: SandyPreferenceData): string {
  const instructions: string[] = []

  // Tone
  if (prefs.tone === 'formal') {
    instructions.push('Use professional, precise language. Avoid contractions and slang. Address the user respectfully.')
  } else if (prefs.tone === 'casual') {
    instructions.push('Be warm and conversational. Use contractions freely. Keep things light and approachable — like a friendly peer.')
  }
  // "balanced" = default Sandy personality, no override needed

  // Proactivity
  if (prefs.proactivityLevel === 'off') {
    instructions.push('DO NOT surface unsolicited suggestions, nudges, or "by the way" tips. Only respond to what the user explicitly asks. Ignore all PROACTIVE SUGGESTIONS, SR NUDGE, and EXAM FORGE NUDGE sections.')
  } else if (prefs.proactivityLevel === 'low') {
    instructions.push('Only surface proactive suggestions when they are urgent (due within 24 hours, critical alerts). Skip low-priority nudges.')
  } else if (prefs.proactivityLevel === 'high') {
    instructions.push('Be actively helpful — surface relevant suggestions, study tips, and reminders proactively. If you see an opportunity to help, take it.')
  }
  // "medium" = default behavior, no override needed

  // Response length
  if (prefs.responseLength === 'concise') {
    instructions.push('Keep responses extremely brief — 1-2 sentences max. Get to the point immediately. Prefer action buttons over explanation.')
  } else if (prefs.responseLength === 'detailed') {
    instructions.push('Provide thorough, detailed responses with examples and context. The user prefers comprehensive explanations over brevity.')
  }
  // "standard" = default 2-4 sentence behavior, no override needed

  if (instructions.length === 0 && !isFirstRunWindow(prefs)) return ''

  let section = ''

  if (instructions.length > 0) {
    section += `\n\n## SANDY BEHAVIOR PREFERENCES
This user has customized how Sandy should communicate. Follow these preferences:
${instructions.map(i => `- ${i}`).join('\n')}`
  }

  if (isFirstRunWindow(prefs)) {
    section += `\n\n## FIRST-RUN CONTEXT
This student recently started using the platform. Their first interaction with you was within the last week. Be welcoming — reference that they're new, offer to show them around if relevant, but don't be patronizing. After ~7 days this context expires naturally.`
  }

  return section
}

function isFirstRunWindow(prefs: SandyPreferenceData): boolean {
  if (!prefs.sandyIntroSeen || !prefs.updatedAt) return false
  const daysSinceIntro = (Date.now() - new Date(prefs.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceIntro <= 7
}
