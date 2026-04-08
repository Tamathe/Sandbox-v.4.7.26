// ─── Patient Data Extraction from Clinical Notes ─────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { PatientProfile } from './types'

const anthropic = new Anthropic()

/**
 * Extract structured patient data from free-text clinical notes using AI.
 */
export async function extractPatientFromNotes(clinicalNotes: string): Promise<PatientProfile> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a clinical data extraction specialist. Extract structured patient information from clinical notes.

Return ONLY a JSON object with these fields (omit any that cannot be determined):
{
  "condition": "primary diagnosis/condition",
  "age": number or null,
  "sex": "MALE" or "FEMALE" or null,
  "stage": "disease stage if applicable" or null,
  "biomarkers": ["array of biomarkers/mutations"] or [],
  "priorTreatments": ["array of prior treatments"] or [],
  "ecogStatus": number 0-4 or null,
  "notes": "any other relevant clinical details"
}

No markdown fencing. Just the JSON.`,
    messages: [{ role: 'user', content: clinicalNotes }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const parsed = JSON.parse(text)
    return {
      condition: parsed.condition ?? '',
      age: parsed.age ?? undefined,
      sex: parsed.sex ?? undefined,
      stage: parsed.stage ?? undefined,
      biomarkers: parsed.biomarkers ?? [],
      priorTreatments: parsed.priorTreatments ?? [],
      ecogStatus: parsed.ecogStatus ?? undefined,
      notes: parsed.notes ?? undefined,
    }
  } catch {
    return { condition: '' }
  }
}
