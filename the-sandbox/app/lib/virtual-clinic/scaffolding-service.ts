import type { ScaffoldingLevel, ScaffoldingPrompt, TranscriptMessage } from './types'

// ─── Virtual Clinic — Scaffolding Service ──────────────────────────────────
//
// Provides optional metacognitive scaffolding during history-taking.
// Three levels:
//   none — summative mode, no hints (default)
//   light — after 8+ exchanges with <3 domains, show a metacognitive prompt
//   full — domain checklist visible, lights up as domains are hit

const METACOGNITIVE_PROMPTS: string[] = [
  "You've gathered good information about the presenting complaint. What other aspects of this patient's life might be relevant?",
  'Think about what factors outside the chief complaint could be contributing to this presentation.',
  "Before you move on, consider: have you explored the patient's full context — social, family, and medical?",
  "Is there anything in the patient's background or lifestyle that could be relevant to their symptoms?",
  "You've asked some good questions. What systems haven't you explored yet?",
]

export function checkScaffolding(
  scaffoldingLevel: ScaffoldingLevel,
  transcript: TranscriptMessage[],
  domainsHit: Record<string, boolean>,
): ScaffoldingPrompt | null {
  if (scaffoldingLevel === 'none') return null

  const historyMessages = transcript.filter(
    (m) => m.role === 'user' && m.phase === 'HISTORY_TAKING',
  )
  const domainCount = Object.values(domainsHit).filter(Boolean).length
  const exchangeCount = historyMessages.length

  if (scaffoldingLevel === 'light') {
    if (exchangeCount >= 8 && domainCount < 3) {
      const idx = exchangeCount % METACOGNITIVE_PROMPTS.length
      return {
        message: METACOGNITIVE_PROMPTS[idx],
        type: 'metacognitive',
      }
    }
    return null
  }

  // Full scaffolding — always return domain status for the checklist
  if (scaffoldingLevel === 'full') {
    return {
      message: `Domains explored: ${domainCount}`,
      type: 'domain-hint',
    }
  }

  return null
}

const CORE_HISTORY_DOMAINS = [
  'Chief Complaint / HPI',
  'Past Medical History',
  'Medications',
  'Allergies',
  'Social History',
  'Family History',
  'Review of Systems',
  'Psychiatric Screen',
]

/**
 * Returns the domain checklist for full scaffolding mode.
 * Each domain maps to whether it's been hit in the encounter.
 */
export function getDomainChecklist(
  domainsHit: Record<string, boolean>,
): { domain: string; hit: boolean }[] {
  const hitKeys = new Set(
    Object.keys(domainsHit).filter((k) => domainsHit[k]).map((k) => k.toLowerCase()),
  )

  return CORE_HISTORY_DOMAINS.map((domain) => {
    const domainLower = domain.toLowerCase()
    const hit = [...hitKeys].some(
      (k) =>
        k.includes(domainLower) ||
        domainLower.includes(k) ||
        (domainLower.includes('hpi') && (k.includes('constitutional') || k.includes('psychiatric'))) ||
        (domainLower.includes('social') && k.includes('social-history')) ||
        (domainLower.includes('family') && k.includes('family-history')) ||
        (domainLower.includes('medication') && k.includes('medications')) ||
        (domainLower.includes('allerg') && k.includes('allergies')) ||
        (domainLower.includes('past medical') && k.includes('past-medical')) ||
        (domainLower.includes('review of systems') &&
          ['cardiovascular', 'respiratory', 'gastrointestinal', 'neurological', 'musculoskeletal', 'genitourinary', 'endocrine', 'dermatological', 'hematological', 'immunological'].some(
            (s) => k.includes(s),
          )) ||
        (domainLower.includes('psychiatric') && k.includes('psychiatric')),
    )
    return { domain, hit }
  })
}
