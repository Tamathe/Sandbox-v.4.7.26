import { anthropic, SONNET_MODEL, IMPORT_MAX_TOKENS, extractJsonFromAIResponse } from './ai-config'
import type { ClinicalCaseInput } from './types'

const IMPORT_SYSTEM_PROMPT = `You are a clinical case parser for a medical education platform. Your job is to extract structured clinical case data from unstructured text — OSCE checklists, PDF-extracted text, or free-form case descriptions.

Parse the input into a JSON object with this exact structure:

{
  "title": "Brief case title (e.g. 'Chest Pain in 55-Year-Old Male')",
  "chiefComplaint": "The patient's primary complaint in their words",
  "program": "DNP_PSYCHIATRY" | "COLLEGE_OF_MEDICINE",
  "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
  "targetYear": null or integer (medical school year 1-4),
  "organSystems": ["array", "of", "relevant", "organ", "systems"],
  "learningObjectives": ["array", "of", "learning", "objectives"],
  "tags": ["array", "of", "tags"],
  "patientName": "A realistic patient name",
  "patientAge": integer,
  "patientSex": "Male" | "Female" | "Non-binary",
  "patientPronouns": "he/him" | "she/her" | "they/them" | null,
  "personalityNotes": "Brief personality description for the AI patient to roleplay (e.g. 'Anxious, tends to minimize symptoms')",
  "historyOfPresentIllness": {
    "onset": "when symptoms started",
    "location": "where",
    "duration": "how long",
    "character": "description of symptoms",
    "aggravating": "what makes it worse",
    "relieving": "what makes it better",
    "timing": "pattern",
    "severity": "1-10 scale",
    "associatedSymptoms": ["array"],
    "narrative": "Full HPI paragraph the patient would tell"
  },
  "pastMedicalHistory": {
    "conditions": ["array of past conditions"],
    "surgeries": ["array of past surgeries"],
    "hospitalizations": ["array"]
  },
  "medications": [
    { "name": "drug name", "dose": "dose", "frequency": "frequency" }
  ],
  "allergies": [
    { "allergen": "name", "reaction": "type of reaction" }
  ],
  "socialHistory": {
    "smoking": "status and pack-years if applicable",
    "alcohol": "status and quantity",
    "drugs": "status",
    "occupation": "job",
    "livingSituation": "who they live with",
    "exercise": "activity level",
    "other": "any other relevant social history"
  },
  "familyHistory": {
    "conditions": [
      { "relation": "family member", "condition": "disease" }
    ]
  },
  "reviewOfSystems": {
    "constitutional": "findings or 'negative'",
    "heent": "findings or 'negative'",
    "cardiovascular": "findings or 'negative'",
    "respiratory": "findings or 'negative'",
    "gastrointestinal": "findings or 'negative'",
    "genitourinary": "findings or 'negative'",
    "musculoskeletal": "findings or 'negative'",
    "neurological": "findings or 'negative'",
    "psychiatric": "findings or 'negative'",
    "skin": "findings or 'negative'",
    "endocrine": "findings or 'negative'",
    "hematologic": "findings or 'negative'"
  },
  "physicalExamFindings": {
    "maneuver-name": {
      "finding": "what the student finds when they perform this maneuver",
      "interpretation": "what this finding means clinically"
    }
  },
  "vitalSigns": {
    "heartRate": integer,
    "bloodPressure": "systolic/diastolic",
    "respiratoryRate": integer,
    "temperature": number (Fahrenheit),
    "oxygenSaturation": integer (percent)
  },
  "defaultNormalFindings": {
    "description": "Default response when student examines an area not specifically detailed — e.g. 'Within normal limits'"
  },
  "availableLabs": [
    { "name": "lab test name", "result": "value with units", "normal": "reference range", "abnormal": true|false }
  ],
  "availableImaging": [
    { "name": "imaging study", "findings": "description of what the image shows" }
  ],
  "correctDifferentials": [
    {
      "rank": 1,
      "diagnosis": "most likely diagnosis",
      "supportingFindings": ["evidence for this diagnosis"],
      "opposingFindings": ["evidence against this diagnosis"]
    }
  ],
  "keyHistoryQuestions": [
    { "question": "important question to ask", "domain": "cardiovascular|respiratory|etc", "criticalInfo": "what this reveals" }
  ],
  "keyExamManeuvers": [
    { "maneuver": "exam technique name", "expectedFinding": "what it should show", "significance": "why it matters" }
  ],
  "criticalActions": [
    { "action": "must-do action", "reasoning": "why this is critical", "timeframe": "when it should happen" }
  ],
  "scoringRubric": {
    "historyWeight": 0.25,
    "examWeight": 0.20,
    "differentialWeight": 0.25,
    "planWeight": 0.20,
    "communicationWeight": 0.10
  }
}

Rules:
- Set "program" based on content: use "DNP_PSYCHIATRY" for psychiatric/mental health cases (depression, anxiety, psychosis, substance use, etc.); use "COLLEGE_OF_MEDICINE" for general medical cases (cardiology, pulmonology, GI, surgery, etc.)
- Extract as much information as possible from the input text
- For missing fields, generate clinically appropriate content that is consistent with the case
- Ensure the case is medically coherent — all findings, differentials, and history should align
- Difficulty should reflect the complexity of the differential and the subtlety of findings
- Scoring rubric weights must sum to exactly 1.0
- Generate at least 3 differential diagnoses ranked by likelihood
- Generate at least 5 key history questions and 3 key exam maneuvers
- Patient personality should be realistic and add educational value
- Return ONLY the JSON object, no markdown fences or explanation`

export async function parseRawTextToCase(rawText: string): Promise<ClinicalCaseInput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY not set'), { status: 503 })
  }

  const response = await anthropic.messages.create(
    {
      model: SONNET_MODEL,
      max_tokens: IMPORT_MAX_TOKENS,
      system: IMPORT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse the following clinical case text into a structured ClinicalCaseInput JSON object:\n\n${rawText}`,
        },
      ],
    },
    { signal: AbortSignal.timeout(120_000) },
  )

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw Object.assign(new Error('No text response from AI'), { status: 502 })
  }

  let parsed: ClinicalCaseInput
  try {
    parsed = JSON.parse(extractJsonFromAIResponse(textBlock.text))
  } catch {
    throw Object.assign(new Error('AI returned invalid JSON'), { status: 502 })
  }

  // Validate minimum required fields
  if (!parsed.title || !parsed.chiefComplaint || !parsed.patientName || parsed.patientAge == null) {
    throw Object.assign(
      new Error('AI response missing required fields (title, chiefComplaint, patientName, patientAge)'),
      { status: 502 },
    )
  }

  return parsed
}
