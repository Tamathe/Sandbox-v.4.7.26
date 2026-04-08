// GET /api/onboarding/enrich-stream?email=...
// Server-Sent Events stream of enrichment progress.
// Runs the full enrichment pipeline step-by-step, emitting events as each
// data source resolves — so the UI can animate the profile building in real time.

import { NextRequest } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'
import { parseNameFromEmail, isLikelyStudent, isLinkBlueFormat } from '../../../lib/enrichment/name-parser'
import { findCollegeProfile }                  from '../../../lib/enrichment/college-directory'
import { findOrcidProfile }                    from '../../../lib/enrichment/orcid'
import { classifyRoleFromTitle, classifyRoleWithLLM } from '../../../lib/enrichment/role-classifier'
import { extractInterests, mergeInterests }    from '../../../lib/enrichment/interest-extractor'
import { scoreConfidence }                     from '../../../lib/enrichment/confidence'
import { getCached, setCached }                from '../../../lib/enrichment/cache'
import { toFlatProfile }                       from '../../../lib/enrichment/index'
import type {
  EnrichmentProfile,
  EnrichedCourse,
  EnrichedInterest,
  FieldSource,
} from '../../../lib/enrichment/types'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '../../../lib/api-utils'

const anthropic = new Anthropic()

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitError = await checkRateLimit(req, null, 'CHAT')
  if (rateLimitError) return rateLimitError

  const email = new URL(req.url).searchParams.get('email')
  if (!email) return new Response('Missing email', { status: 400 })

  const normalized = email.trim().toLowerCase()
  const encoder    = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // ── Check cache first ──────────────────────────────────────────────────
        const cached = getCached(normalized)
        if (cached) {
          const flat = toFlatProfile(cached)
          emit({ type: 'step', step: `Identifying ${normalized}`, status: 'success' })
          emit({ type: 'field', field: 'name',       value: flat.name,             source: cached.profile.name.source })
          if (flat.title)      emit({ type: 'field', field: 'title',      value: flat.title,      source: 'college-faculty-page' })
          if (flat.department) emit({ type: 'field', field: 'department', value: flat.department, source: 'college-faculty-page' })
          if (flat.college)    emit({ type: 'field', field: 'college',    value: flat.college,    source: 'college-faculty-page' })
          emit({ type: 'field', field: 'role', value: flat.role, source: cached.profile.role.source })
          if (cached.courses.length)   emit({ type: 'courses',   courses:   cached.courses })
          if (cached.interests.length) emit({ type: 'interests', interests: cached.interests })
          emit({ type: 'complete', confidence: cached.confidence, profile: flat })
          controller.close()
          return
        }

        const t0 = Date.now()

        // ── Step 1: parse name ─────────────────────────────────────────────────
        const parsedName    = parseNameFromEmail(normalized)
        const likelyStudent = isLikelyStudent(normalized)
        const isLinkBlue    = isLinkBlueFormat(normalized)

        // LinkBlue IDs (e.g. tsthe2) are not human names — leave blank for user to fill in
        const displayName = parsedName ?? ''

        emit({ type: 'step', step: 'Identifying name from email', status: parsedName ? 'success' : 'skip' })
        if (displayName) {
          emit({ type: 'field', field: 'name', value: displayName, source: 'email-parse' })
        }

        // ── Step 2: College directory ──────────────────────────────────────────
        emit({ type: 'step', step: 'Searching UK faculty directory', status: 'pending' })

        const profile: EnrichmentProfile = {
          name:       { value: displayName, confidence: parsedName ? 0.6 : 0.2, source: 'email-parse' },
          title:      { value: null, confidence: 0, source: 'email-parse' },
          department: { value: null, confidence: 0, source: 'email-parse' },
          college:    { value: null, confidence: 0, source: 'email-parse' },
          role:       { value: likelyStudent ? 'STUDENT' : 'UNKNOWN', confidence: likelyStudent ? 0.8 : 0.3, source: 'email-parse' },
          email:      { value: null, confidence: 0, source: 'email-parse' },
          orcidId:    { value: null, confidence: 0, source: 'email-parse' },
        }

        let courses: EnrichedCourse[]   = []
        let interests: EnrichedInterest[] = []
        const sources: FieldSource[]    = ['email-parse']

        if (parsedName && !likelyStudent) {
          const directoryProfile = await findCollegeProfile(parsedName)

          if (directoryProfile) {
            sources.push('college-faculty-page')
            emit({ type: 'step', step: 'Searching UK faculty directory', status: 'success' })

            profile.name = { value: directoryProfile.name || parsedName, confidence: 0.95, source: 'college-faculty-page' }
            emit({ type: 'field', field: 'name', value: profile.name.value, source: 'college-faculty-page' })

            if (directoryProfile.title) {
              profile.title = { value: directoryProfile.title, confidence: 0.9, source: 'college-faculty-page' }
              emit({ type: 'field', field: 'title', value: directoryProfile.title, source: 'college-faculty-page' })
            }
            if (directoryProfile.department) {
              profile.department = { value: directoryProfile.department, confidence: 0.9, source: 'college-faculty-page' }
              emit({ type: 'field', field: 'department', value: directoryProfile.department, source: 'college-faculty-page' })
            }
            if (directoryProfile.college) {
              profile.college = { value: directoryProfile.college, confidence: 1.0, source: 'college-faculty-page' }
              emit({ type: 'field', field: 'college', value: directoryProfile.college, source: 'college-faculty-page' })
            }

            // ── Step 3: Extract interests from bio ─────────────────────────────
            const bioText = [directoryProfile.bioText, directoryProfile.researchInterests.join('. ')].filter(Boolean).join(' ')
            if (bioText.trim()) {
              emit({ type: 'step', step: 'Reading faculty profile', status: 'pending' })
              const bioInterests = await extractInterests(bioText, 'bio-extraction')
              interests = mergeInterests(bioInterests)
              if (interests.length) {
                emit({ type: 'interests', interests })
              }
              emit({ type: 'step', step: 'Reading faculty profile', status: 'success' })
            }
          } else {
            emit({ type: 'step', step: 'Searching UK faculty directory', status: 'skip' })
          }

          // ── Step 4: ORCID ──────────────────────────────────────────────────
          emit({ type: 'step', step: 'Checking ORCID', status: 'pending' })
          const nameParts  = parsedName.split(' ')
          const orcidResult = await findOrcidProfile(nameParts[0], nameParts.slice(1).join(' ') || nameParts[0])

          if (orcidResult) {
            sources.push('orcid')
            profile.orcidId = { value: orcidResult.orcidId, confidence: 1.0, source: 'orcid' }
            emit({ type: 'step', step: 'Checking ORCID', status: 'success' })

            const orcidText = [orcidResult.biography, orcidResult.keywords.join('. ')].filter(Boolean).join(' ')
            if (orcidText.trim()) {
              const orcidInterests = await extractInterests(orcidText, 'orcid')
              interests = mergeInterests(interests, orcidInterests)
              if (orcidInterests.length) emit({ type: 'interests', interests })
            }
          } else {
            emit({ type: 'step', step: 'Checking ORCID', status: 'skip' })
          }
        }

        // ── Step 5: Role classification ────────────────────────────────────────
        if (profile.role.value === 'UNKNOWN' || profile.role.confidence < 0.6) {
          const keywordRole = classifyRoleFromTitle(profile.title.value, likelyStudent)
          if (keywordRole !== 'UNKNOWN') {
            profile.role = { value: keywordRole, confidence: 0.85, source: 'title-inference' }
          } else if (profile.title.value) {
            const llmRole = await classifyRoleWithLLM(profile.title.value, profile.department.value)
            if (llmRole !== 'UNKNOWN') {
              profile.role = { value: llmRole, confidence: 0.75, source: 'ai-inferred' }
            }
          } else if (isLinkBlue) {
            // LinkBlue IDs without faculty info default to STUDENT
            profile.role = { value: 'STUDENT', confidence: 0.7, source: 'email-parse' }
          }
        }
        emit({ type: 'field', field: 'role', value: profile.role.value === 'UNKNOWN' ? 'STUDENT' : profile.role.value, source: profile.role.source })

        // ── Step 6: LLM fallback if no real data found ─────────────────────────
        // Runs for any email that only has email-parse data, including LinkBlue IDs.
        if (sources.length === 1) {
          emit({ type: 'step', step: 'Building profile with AI', status: 'pending' })
          try {
            const nameHint = parsedName ? `, Name: ${parsedName}` : ''
            const linkBlueHint = isLinkBlue
              ? '\nThis is a UK LinkBlue username, not a first.last name — do not guess a name from it.'
              : ''
            const resp = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: `University user profile setup. Return ONLY valid JSON.`,
              messages: [{
                role: 'user',
                content: `Email: ${normalized}${nameHint}${linkBlueHint}
Infer what you can. Return JSON:
{"role":"EDUCATOR|STUDENT|ADMIN|UNKNOWN","title":null,"department":null,"college":null,"interests":[]}`,
              }],
            })
            const raw = resp.content[0].type === 'text' ? resp.content[0].text.trim() : '{}'
            const llm = JSON.parse(raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim())
            sources.push('ai-inferred')

            if (llm.title && !profile.title.value) {
              profile.title = { value: llm.title, confidence: 0.5, source: 'ai-inferred' }
              emit({ type: 'field', field: 'title', value: llm.title, source: 'ai-inferred' })
            }
            if (llm.department && !profile.department.value) {
              profile.department = { value: llm.department, confidence: 0.4, source: 'ai-inferred' }
              emit({ type: 'field', field: 'department', value: llm.department, source: 'ai-inferred' })
            }
            if (llm.college && !profile.college.value) {
              profile.college = { value: llm.college, confidence: 0.4, source: 'ai-inferred' }
              emit({ type: 'field', field: 'college', value: llm.college, source: 'ai-inferred' })
            }
            if (llm.role && llm.role !== 'UNKNOWN' && profile.role.value === 'UNKNOWN') {
              profile.role = { value: llm.role, confidence: 0.5, source: 'ai-inferred' }
              emit({ type: 'field', field: 'role', value: llm.role, source: 'ai-inferred' })
            }
            if (Array.isArray(llm.interests) && interests.length === 0) {
              interests = (llm.interests as string[]).map((tag) => ({ tag, source: 'ai-inferred' as FieldSource }))
              if (interests.length) emit({ type: 'interests', interests })
            }
            emit({ type: 'step', step: 'Building profile with AI', status: 'success' })
          } catch {
            emit({ type: 'step', step: 'Building profile with AI', status: 'skip' })
          }
        }

        // ── Score + cache + emit complete ─────────────────────────────────────
        const { score, level } = scoreConfidence({ profile, courses, interests })

        const result = {
          confidence: level, confidenceScore: score, profile, courses, interests,
          sources, enrichmentDurationMs: Date.now() - t0,
        }
        setCached(normalized, result)

        const flat = toFlatProfile(result)
        emit({ type: 'complete', confidence: level, profile: flat })

      } catch (err) {
        console.error('enrich-stream error:', err)
        emit({ type: 'error', message: "Couldn't enrich your profile automatically — fill in your details below." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
})
