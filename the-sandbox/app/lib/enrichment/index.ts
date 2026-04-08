// ─── Enrichment Pipeline Orchestrator ────────────────────────────────────────
// Runs the full profile enrichment pipeline for a given UK email address.
// Tries real data sources first, falls back to LLM inference.

import type {
  EnrichmentResult,
  EnrichmentProfile,
  EnrichedCourse,
  EnrichedInterest,
  FieldSource,
} from './types'
import { parseNameFromEmail, isLikelyStudent, isLinkBlueFormat } from './name-parser'
import { findCollegeProfile } from './college-directory'
import { findOrcidProfile } from './orcid'
import { classifyRoleFromTitle, classifyRoleWithLLM } from './role-classifier'
import { extractInterests, mergeInterests } from './interest-extractor'
import { scoreConfidence } from './confidence'
import { getCached, setCached } from './cache'

// ─── Event types (for the streaming route to subscribe to) ───────────────────

export type EnrichmentStep =
  | { type: 'step';      step: string; status: 'pending' | 'success' | 'skip' }
  | { type: 'field';     field: string; value: string; source: FieldSource }
  | { type: 'courses';   courses: EnrichedCourse[] }
  | { type: 'interests'; interests: EnrichedInterest[] }
  | { type: 'complete';  confidence: string; profile: FlatProfile }
  | { type: 'error';     message: string }

// Flat profile shape for the SSE "complete" event (matches signup page expectations)
export type FlatProfile = {
  name:       string
  role:       string
  title:      string | null
  department: string | null
  college:    string | null
  interests:  string[]
  courses:    EnrichedCourse[]
}

// ─── Full pipeline (batch) ───────────────────────────────────────────────────

export async function enrichProfile(email: string): Promise<EnrichmentResult> {
  const normalized = email.trim().toLowerCase()
  const t0 = Date.now()

  // Cache check
  const cached = getCached(normalized)
  if (cached) return cached

  // Step 1: Parse name from email
  const parsedName = parseNameFromEmail(normalized)
  const likelyStudent = isLikelyStudent(normalized)

  const isLinkBlue = isLinkBlueFormat(normalized)

  // Seed profile with email-parse data
  // LinkBlue IDs (e.g. tsthe2) are not human names — use empty string so user fills in their name
  const profile: EnrichmentProfile = {
    name:       { value: parsedName ?? '', confidence: parsedName ? 0.6 : 0.2, source: 'email-parse' },
    title:      { value: null, confidence: 0, source: 'email-parse' },
    department: { value: null, confidence: 0, source: 'email-parse' },
    college:    { value: null, confidence: 0, source: 'email-parse' },
    role:       { value: likelyStudent ? 'STUDENT' : 'UNKNOWN', confidence: likelyStudent ? 0.8 : 0.3, source: 'email-parse' },
    email:      { value: null, confidence: 0, source: 'email-parse' },
    orcidId:    { value: null, confidence: 0, source: 'email-parse' },
  }

  const courses: EnrichedCourse[] = []
  let interests: EnrichedInterest[] = []
  const sources: FieldSource[] = ['email-parse']

  if (!parsedName || likelyStudent) {
    // Students / LinkBlue IDs: no directory lookup. Role is confirmed, done.
    if (likelyStudent || isLinkBlue) {
      profile.role = { value: 'STUDENT', confidence: 0.9, source: 'email-parse' }
    }
    const { score, level } = scoreConfidence({ profile, courses, interests })
    const result: EnrichmentResult = {
      confidence: level, confidenceScore: score, profile, courses, interests,
      sources, enrichmentDurationMs: Date.now() - t0,
    }
    setCached(normalized, result)
    return result
  }

  // Step 2: Parallel — college directory + ORCID
  const nameParts = parsedName.split(' ')
  const firstName = nameParts[0]
  const lastName  = nameParts.slice(1).join(' ') || nameParts[0]

  const [directoryProfile, orcidProfile] = await Promise.allSettled([
    findCollegeProfile(parsedName),
    findOrcidProfile(firstName, lastName),
  ])

  // Step 3: Merge directory data
  if (directoryProfile.status === 'fulfilled' && directoryProfile.value) {
    const dp = directoryProfile.value
    sources.push('college-faculty-page')

    profile.name       = { value: dp.name || parsedName, confidence: 0.95, source: 'college-faculty-page' }
    if (dp.title)      profile.title      = { value: dp.title, confidence: 0.9, source: 'college-faculty-page' }
    if (dp.department) profile.department = { value: dp.department, confidence: 0.9, source: 'college-faculty-page' }
    if (dp.college)    profile.college    = { value: dp.college, confidence: 1.0, source: 'college-faculty-page' }
    if (dp.email)      profile.email      = { value: dp.email, confidence: 1.0, source: 'college-faculty-page' }

    // Extract interests from bio + research interests
    const bioText = [dp.bioText, dp.researchInterests.join('. ')].filter(Boolean).join(' ')
    if (bioText.trim()) {
      const bioInterests = await extractInterests(bioText, 'bio-extraction')
      interests = mergeInterests(bioInterests)
    }
  }

  // Step 4: Merge ORCID data (supplements directory data)
  if (orcidProfile.status === 'fulfilled' && orcidProfile.value) {
    const op = orcidProfile.value
    sources.push('orcid')

    profile.orcidId = { value: op.orcidId, confidence: 1.0, source: 'orcid' }

    // ORCID keywords supplement (not overwrite) interests
    const orcidText = [op.biography, op.keywords.join('. ')].filter(Boolean).join(' ')
    if (orcidText.trim()) {
      const orcidInterests = await extractInterests(orcidText, 'orcid')
      interests = mergeInterests(interests, orcidInterests)
    }
  }

  // Step 5: Role classification
  if (profile.role.value === 'UNKNOWN' || profile.role.confidence < 0.6) {
    const keywordRole = classifyRoleFromTitle(profile.title.value, likelyStudent)
    if (keywordRole !== 'UNKNOWN') {
      profile.role = { value: keywordRole, confidence: 0.85, source: 'title-inference' }
    } else if (profile.title.value) {
      const llmRole = await classifyRoleWithLLM(profile.title.value, profile.department.value)
      if (llmRole !== 'UNKNOWN') {
        profile.role = { value: llmRole, confidence: 0.75, source: 'ai-inferred' }
      }
    }
  }

  // Step 6: Fallback — if we found nothing from real sources, use LLM inference
  if (sources.length === 1) {
    // Only email-parse, no real data found — use Haiku as last resort
    const llmResult = await llmFallbackInference(normalized, parsedName)
    if (llmResult) {
      sources.push('ai-inferred')
      if (!profile.title.value && llmResult.title)
        profile.title = { value: llmResult.title, confidence: 0.5, source: 'ai-inferred' }
      if (!profile.department.value && llmResult.department)
        profile.department = { value: llmResult.department, confidence: 0.4, source: 'ai-inferred' }
      if (!profile.college.value && llmResult.college)
        profile.college = { value: llmResult.college, confidence: 0.4, source: 'ai-inferred' }
      if (profile.role.value === 'UNKNOWN' && llmResult.role)
        profile.role = { value: llmResult.role, confidence: 0.5, source: 'ai-inferred' }
      if (interests.length === 0 && llmResult.interests.length > 0)
        interests = llmResult.interests.map((tag) => ({ tag, source: 'ai-inferred' as FieldSource }))
    }
  }

  // Step 7: Score
  const { score, level } = scoreConfidence({ profile, courses, interests })

  const result: EnrichmentResult = {
    confidence:          level,
    confidenceScore:     score,
    profile,
    courses,
    interests,
    sources,
    enrichmentDurationMs: Date.now() - t0,
  }

  setCached(normalized, result)
  return result
}

// ─── LLM fallback (no real data found) ───────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

async function llmFallbackInference(email: string, name: string): Promise<{
  title: string | null
  department: string | null
  college: string | null
  role: 'EDUCATOR' | 'STUDENT' | 'ADMIN' | 'UNKNOWN'
  interests: string[]
} | null> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You help set up university user profiles. Return ONLY valid JSON, no explanation.`,
      messages: [{
        role: 'user',
        content: `Email: ${email}, Name: ${name}
Based on the email and name, infer what you can. Return JSON:
{"role":"EDUCATOR|STUDENT|ADMIN|UNKNOWN","title":null,"department":null,"college":null,"interests":[]}`,
      }],
    })

    const raw = resp.content[0].type === 'text' ? resp.content[0].text.trim() : 'null'
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// ─── Flat profile helper (for SSE and API responses) ─────────────────────────

export function toFlatProfile(result: EnrichmentResult): FlatProfile {
  return {
    name:       result.profile.name.value,
    role:       result.profile.role.value === 'UNKNOWN' ? 'STUDENT' : result.profile.role.value,
    title:      result.profile.title.value,
    department: result.profile.department.value,
    college:    result.profile.college.value,
    interests:  result.interests.map((i) => i.tag),
    courses:    result.courses,
  }
}
