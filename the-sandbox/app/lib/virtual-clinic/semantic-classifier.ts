import { callHaikuJSON } from './ai-config'
import { stripMarkers } from './marker-utils'
import type { DomainClassification, TranscriptMessage } from './types'

// ─── Clinical Domains ────────────────────────────────────────────────────────

const CLINICAL_DOMAINS = [
  'cardiovascular',
  'respiratory',
  'gastrointestinal',
  'neurological',
  'musculoskeletal',
  'genitourinary',
  'endocrine',
  'psychiatric',
  'dermatological',
  'hematological',
  'immunological',
  'constitutional',
  'social-history',
  'family-history',
  'medications',
  'allergies',
  'past-medical',
] as const

const BATCH_SIZE = 10

// ─── Classifier ───────────────────────────────────────────────────────────────

async function classifyBatch(questions: string[]): Promise<DomainClassification[]> {
  const result = await callHaikuJSON<{ classifications: DomainClassification[] }>(
    `You are a clinical education domain classifier. Your job is to classify medical student questions into clinical domains. Return JSON only.`,
    `## Clinical Domains (use only these exact strings)
${CLINICAL_DOMAINS.join(', ')}

## Student Questions to Classify
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

For each question, identify all relevant clinical domains it touches. A question may belong to multiple domains.

Return JSON in this exact format:
{
  "classifications": [
    {
      "question": "<exact question text>",
      "domains": ["<domain1>", "<domain2>"],
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Use ONLY domain names from the list above
- If a question does not fit any domain, return an empty "domains" array
- Assign confidence based on how clearly the question maps to the domains
- Return one classification object per question, in the same order as input`,
  )

  // Defensive: ensure we have the right number of results
  const classifications = result.classifications ?? []

  // Filter domains to only valid ones
  const validDomains = new Set(CLINICAL_DOMAINS as readonly string[])
  return classifications.map((c, i) => ({
    question: c.question ?? questions[i] ?? '',
    domains: (c.domains ?? []).filter((d) => validDomains.has(d)),
    confidence: typeof c.confidence === 'number' ? Math.min(1, Math.max(0, c.confidence)) : 0.5,
  }))
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function classifyTranscriptDomains(transcript: TranscriptMessage[]): Promise<{
  domainsHit: Record<string, boolean>
  classifications: DomainClassification[]
}> {
  // Filter to student questions during history-taking phase only
  const studentQuestions = transcript
    .filter((m) => m.role === 'user' && m.phase === 'HISTORY_TAKING')
    .map((m) => stripMarkers(m.content))
    .filter(Boolean)

  if (studentQuestions.length === 0) {
    return { domainsHit: {}, classifications: [] }
  }

  // Batch in groups of BATCH_SIZE to stay within token limits
  const batches: string[][] = []
  for (let i = 0; i < studentQuestions.length; i += BATCH_SIZE) {
    batches.push(studentQuestions.slice(i, i + BATCH_SIZE))
  }

  // Process batches sequentially to avoid rate limit spikes
  const allClassifications: DomainClassification[] = []
  for (const batch of batches) {
    const batchResults = await classifyBatch(batch)
    allClassifications.push(...batchResults)
  }

  // Build domainsHit from all classifications
  const domainsHit: Record<string, boolean> = {}
  for (const classification of allClassifications) {
    for (const domain of classification.domains) {
      domainsHit[domain] = true
    }
  }

  return { domainsHit, classifications: allClassifications }
}
