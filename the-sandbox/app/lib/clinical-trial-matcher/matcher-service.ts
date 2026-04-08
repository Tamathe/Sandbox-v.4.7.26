// ─── AI-Powered Trial Matching Service ────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { ClinicalTrial, PatientProfile, TrialMatch, CriterionMatch } from './types'

const anthropic = new Anthropic()

/**
 * Score a batch of trials against a patient profile using Claude.
 * Returns trials ranked by match quality.
 */
export async function matchTrialsToPatient(
  trials: ClinicalTrial[],
  patient: PatientProfile,
): Promise<TrialMatch[]> {
  if (!trials.length) return []

  // Process in batches of 5 to stay within token limits
  const batchSize = 5
  const allMatches: TrialMatch[] = []

  for (let i = 0; i < trials.length; i += batchSize) {
    const batch = trials.slice(i, i + batchSize)
    const batchMatches = await matchBatch(batch, patient)
    allMatches.push(...batchMatches)
  }

  // Sort by score descending
  return allMatches.sort((a, b) => b.overallScore - a.overallScore)
}

async function matchBatch(
  trials: ClinicalTrial[],
  patient: PatientProfile,
): Promise<TrialMatch[]> {
  const patientSummary = buildPatientSummary(patient)

  const trialsBlock = trials.map((t, idx) => `
--- TRIAL ${idx + 1}: ${t.nctId} ---
Title: ${t.briefTitle}
Phases: ${t.phases.join(', ') || 'N/A'}
Conditions: ${t.conditions.join(', ')}
Interventions: ${t.interventions.map(i => `${i.name} (${i.type})`).join(', ')}
Status: ${t.overallStatus}
Age Range: ${t.minimumAge ?? 'None'} – ${t.maximumAge ?? 'None'}
Sex: ${t.sex}
Healthy Volunteers: ${t.healthyVolunteers ? 'Yes' : 'No'}
Eligibility Criteria:
${t.eligibilityCriteria}
`).join('\n')

  const systemPrompt = `You are a clinical trial matching specialist. Given a patient profile and a list of clinical trials, evaluate each trial's eligibility criteria against the patient data.

For each trial, output a JSON object with:
- nctId: the trial NCT ID
- overallScore: 0-100 (100 = perfect match, 0 = clearly ineligible)
- recommendation: "STRONG" (score >= 70), "POSSIBLE" (score 40-69), or "UNLIKELY" (score < 40)
- reasoning: 2-3 sentence explanation of why this trial is or isn't a good match
- matchDetails: array of objects, each with:
  - criterion: the specific eligibility criterion text (abbreviated)
  - met: "YES", "NO", "UNKNOWN", or "NEEDS_REVIEW"
  - explanation: brief explanation

Focus on inclusion/exclusion criteria that can be evaluated from the patient data provided. Mark criteria as UNKNOWN when the patient data doesn't contain enough information to evaluate.

Respond with ONLY a JSON array of match objects, no markdown fencing.`

  const userMessage = `## Patient Profile
${patientSummary}

## Trials to Evaluate
${trialsBlock}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text) as {
      nctId: string
      overallScore: number
      recommendation: 'STRONG' | 'POSSIBLE' | 'UNLIKELY'
      reasoning: string
      matchDetails: CriterionMatch[]
    }[]

    return parsed.map(m => {
      const trial = trials.find(t => t.nctId === m.nctId) ?? trials[0]
      return {
        trial,
        overallScore: Math.min(100, Math.max(0, m.overallScore)),
        matchDetails: m.matchDetails ?? [],
        recommendation: m.recommendation ?? 'UNLIKELY',
        reasoning: m.reasoning ?? '',
      }
    })
  } catch {
    // If parsing fails, return basic matches without AI scoring
    return trials.map(trial => ({
      trial,
      overallScore: 50,
      matchDetails: [],
      recommendation: 'POSSIBLE' as const,
      reasoning: 'AI scoring unavailable — manual review recommended.',
    }))
  }
}

function buildPatientSummary(patient: PatientProfile): string {
  const lines: string[] = []
  lines.push(`Condition: ${patient.condition}`)
  if (patient.age) lines.push(`Age: ${patient.age}`)
  if (patient.sex && patient.sex !== 'ALL') lines.push(`Sex: ${patient.sex}`)
  if (patient.stage) lines.push(`Stage: ${patient.stage}`)
  if (patient.ecogStatus !== undefined) lines.push(`ECOG Performance Status: ${patient.ecogStatus}`)
  if (patient.biomarkers?.length) lines.push(`Biomarkers: ${patient.biomarkers.join(', ')}`)
  if (patient.priorTreatments?.length) lines.push(`Prior Treatments: ${patient.priorTreatments.join(', ')}`)
  if (patient.notes) lines.push(`Additional Notes: ${patient.notes}`)
  return lines.join('\n')
}
