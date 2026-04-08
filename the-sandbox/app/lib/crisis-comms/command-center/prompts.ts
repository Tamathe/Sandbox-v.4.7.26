/**
 * prompts.ts
 *
 * AI prompt builders for the Crisis Command Center.
 * Three exported functions: situation assessment, document generation, and AI revision.
 */

import type { AssessmentResult, DocumentType } from './types'

// ── Assessment prompt ─────────────────────────────────────────────────────────

export function buildAssessmentPrompt(inputText: string): string {
  return `You are a senior crisis communications analyst at the University of Kentucky. You have 20+ years of experience in higher-education crisis management.

You have just received the following incident report from the crisis comms team:

---
${inputText}
---

Analyze this incident and produce a structured situation assessment. Your response must be a single JSON object with NO markdown wrapping, NO code fences, and NO explanation text — just the raw JSON.

The JSON must match this exact shape:
{
  "summary": "2-3 sentence executive summary of the situation",
  "severity": <1 | 2 | 3>,
  "affectedPopulations": ["<population1>", ...],
  "recommendedChannels": ["<channel1>", ...],
  "suggestedDocumentTypes": ["<DOCUMENT_TYPE>", ...],
  "keyFacts": ["<fact1>", ...],
  "unknowns": ["<unknown1>", ...],
  "immediateActions": ["<action1>", ...]
}

Severity scale:
- 1 = Low / localized. Affects a small group, unlikely to draw media attention beyond campus. Examples: minor facility issue, small protest, isolated student incident.
- 2 = Moderate / campus-wide. Affects a significant portion of campus, may draw regional media. Examples: data breach, severe weather closure, controversial speaker event.
- 3 = Critical / national attention. Threatens life, safety, or institutional reputation at scale. National media likely. Examples: active threat, explosion, death, major scandal.

Affected populations — include all that apply: students, faculty, staff, parents, media, donors, alumni, community, legislators, prospective students.

Recommended channels — choose from: press statement, internal email, social media (Twitter/X), social media (Instagram), social media (Facebook), parent notification, website banner, talking points, emergency text alert, phone hotline.

Suggested document types — choose from: EMERGENCY_TEXT_ALERT, PRESS_STATEMENT, INTERNAL_EMAIL, SOCIAL_TWITTER, SOCIAL_INSTAGRAM, SOCIAL_FACEBOOK, PARENT_NOTIFICATION, WEBSITE_BANNER, TALKING_POINTS, AFTER_ACTION_REPORT. Order by urgency (most urgent first). For severity 3, the default order is: EMERGENCY_TEXT_ALERT → WEBSITE_BANNER → PRESS_STATEMENT → INTERNAL_EMAIL → PARENT_NOTIFICATION → TALKING_POINTS → SOCIAL_TWITTER → SOCIAL_FACEBOOK → SOCIAL_INSTAGRAM. Include EMERGENCY_TEXT_ALERT for any severity 3 incident involving immediate safety threats. For severity 1, include only the most relevant 3-4. AFTER_ACTION_REPORT is optional and typically only suggested for severity 2-3 incidents.

Key facts — extract every confirmed, verifiable detail from the input. Be precise.

Unknowns — identify gaps: what isn't confirmed, what might reporters ask that you can't answer yet?

Immediate actions — what should the crisis team do in the first 60 minutes? Be specific and actionable (e.g., "Brief the President's office", "Activate Counseling Center walk-in hours", "Post holding statement to website").

Return ONLY the JSON object.`
}

// ── Document generation prompts ───────────────────────────────────────────────

const DOCUMENT_FORMAT_INSTRUCTIONS: Record<DocumentType, string> = {
  EMERGENCY_TEXT_ALERT: `Write an emergency text alert for the UK Mass Notification System.
- 160 characters MAXIMUM — this is a hard SMS segment limit. Count every character.
- Clery Act format: WHAT → WHERE → WHAT TO DO → WHERE to get updates
- Start with "UK ALERT:" prefix
- No suspect descriptions unless confirmed by law enforcement
- No speculation, no hedging, no "may" or "might"
- Action-oriented imperative voice: "Shelter in place", "Avoid the area", "Lock doors"
- End with update source: "Updates: uky.edu/alert"
- Example: "UK ALERT: Active threat reported near Student Center. Shelter in place. Lock doors. Silence phones. Do NOT evacuate unless directed by UKPD. Updates: uky.edu/alert"`,

  PRESS_STATEMENT: `Write a formal press statement in AP style.
- Lead with the most important fact
- Include a quote placeholder: [QUOTE FROM SPOKESPERSON NAME/TITLE]
- Keep it to a 30-second read (~150-200 words)
- End with "For updates, visit uky.edu" and a media contact line
- Do not speculate or include unconfirmed information
- Tone: authoritative, transparent, measured`,

  INTERNAL_EMAIL: `Write an internal email to all university employees (faculty, staff, administrators).
- From: University Leadership
- Subject line included at the top
- Calm, factual, direct tone
- Bullet action items clearly (what employees should do, where to direct questions)
- Include relevant phone numbers and resources
- Acknowledge the emotional weight if appropriate
- Remind staff not to speak to media — direct inquiries to PR
- Close with a note of confidence in the community`,

  SOCIAL_TWITTER: `Write a tweet for the official @universityofky X/Twitter account.
- 280 characters maximum — this is a hard limit
- Include [LINK] placeholder for the full statement URL
- No hashtags during an active crisis
- Factual, not emotional
- If severity is high, lead with the safety action (e.g., "Shelter in place")`,

  SOCIAL_INSTAGRAM: `Write an Instagram caption for the official @universityofky account.
- 2,200 characters maximum
- Empathetic, community-focused tone
- Lead with what the university is doing, not what happened
- Include accessibility: describe any image that would accompany this
- End with "Link in bio for full statement and updates"
- No crisis hashtags`,

  SOCIAL_FACEBOOK: `Write a Facebook post for the University of Kentucky official page.
- Longer form than Twitter — 300-500 words is appropriate
- Community-focused tone: "Our Wildcat family"
- Include specific resources, links, phone numbers
- Acknowledge that comments may have questions — add: "Our team is monitoring comments. For urgent questions, please call [PHONE]."
- More personal and empathetic than the press statement`,

  PARENT_NOTIFICATION: `Write a direct notification to parents and families.
- From: Office of the Dean of Students (or appropriate office)
- Reassuring but honest tone — parents want safety information first
- Lead with: what happened, is my child safe, what is the university doing
- Include specific contact numbers (not generic "call the university")
- Include UK Counseling Center number: (859) 257-8701
- If applicable, include UK Police: (859) 257-8573
- Avoid jargon. Write as if speaking to a worried parent directly.
- Close with "We will send another update by [TIMEFRAME]."`,

  WEBSITE_BANNER: `Write a website emergency banner for uky.edu.
- 1-2 sentences maximum
- High-contrast, scannable text
- Include a link placeholder: [LINK TO FULL STATEMENT]
- Lead with the action or status, not background
- Examples of good banners:
  "Campus closure in effect due to severe weather. Classes cancelled. Details →"
  "The university is responding to an incident near [LOCATION]. Updates →"`,

  TALKING_POINTS: `Write a talking points document for university spokespeople.
- Use bullet format throughout
- Sections:
  1. KEY MESSAGES (3-5 core messages to deliver in any interview)
  2. APPROVED LANGUAGE (exact phrases spokespeople should use)
  3. BRIDGE PHRASES (transitions to redirect difficult questions back to key messages)
  4. DO NOT SAY (specific phrases, topics, or framings to avoid — with brief rationale)
  5. ANTICIPATED QUESTIONS (5-8 likely reporter questions with suggested responses)
- Every response should reference at least one key message
- Include a reminder: "If you don't know, say 'I don't have that information yet, but I will get back to you.'"`,

  AFTER_ACTION_REPORT: `Write a preliminary after-action report framework for this incident.
- This is a placeholder structure to be completed post-incident — fill in what is known now and mark gaps
- Sections:
  1. INCIDENT OVERVIEW (date, time, nature, severity, duration)
  2. TIMELINE OF EVENTS (chronological key actions taken)
  3. COMMUNICATIONS ISSUED (list each document type sent, with timestamp placeholders)
  4. WHAT WORKED WELL (based on initial response — to be expanded post-incident)
  5. AREAS FOR IMPROVEMENT (to be completed post-incident)
  6. RECOMMENDATIONS (to be completed post-incident)
- Professional, neutral, analytical tone
- Mark incomplete sections with [TO BE COMPLETED POST-INCIDENT]`,
}

export function buildDocumentGenerationPrompt(
  type: DocumentType,
  assessment: AssessmentResult,
  title: string
): string {
  const formatInstructions = DOCUMENT_FORMAT_INSTRUCTIONS[type]

  return `You are a crisis communications writer at the University of Kentucky. You are drafting a ${type.replace(/_/g, ' ').toLowerCase()} for an active incident.

INCIDENT: ${title}
SEVERITY: ${assessment.severity} (${assessment.severity === 3 ? 'Critical — national attention likely' : assessment.severity === 2 ? 'Moderate — campus-wide impact' : 'Low — localized impact'})

SITUATION SUMMARY:
${assessment.summary}

CONFIRMED KEY FACTS:
${assessment.keyFacts.map((f) => `- ${f}`).join('\n')}

UNKNOWNS (do NOT include these as facts — do not speculate):
${assessment.unknowns.map((u) => `- ${u}`).join('\n')}

AFFECTED POPULATIONS: ${assessment.affectedPopulations.join(', ')}

IMMEDIATE ACTIONS UNDERWAY:
${assessment.immediateActions.map((a) => `- ${a}`).join('\n')}

FORMAT REQUIREMENTS:
${formatInstructions}

UNIVERSAL RULES:
- University name is always "University of Kentucky" (or "UK" on second reference)
- Never speculate about causes, blame, or unconfirmed details
- Never release names of injured/deceased unless confirmed by family consent
- Reference only the confirmed key facts above
- If the unknowns list includes something a reader would want to know, acknowledge it: "This is under investigation" or "We will share more as it becomes available"
- Write for the specific audience this document type serves

Return ONLY the document text. No markdown code fences, no preamble, no explanation.`
}

// ── AI revision prompt ────────────────────────────────────────────────────────

export function buildAiRevisionPrompt(
  currentContent: string,
  instruction: string,
  documentType: DocumentType
): string {
  const formatInstructions = DOCUMENT_FORMAT_INSTRUCTIONS[documentType]

  return `You are a crisis communications editor at the University of Kentucky. You are revising an existing ${documentType.replace(/_/g, ' ').toLowerCase()}.

CURRENT DOCUMENT:
---
${currentContent}
---

USER INSTRUCTION: ${instruction}

FORMAT CONSTRAINTS FOR THIS DOCUMENT TYPE:
${formatInstructions}

RULES:
- Apply the user's instruction while preserving the document type's format requirements
- Do not add speculative information that wasn't in the original
- Do not change confirmed facts
- Maintain the appropriate tone for this document type
- If the instruction conflicts with crisis comms best practices (e.g., "add the victim's name"), ignore that part and keep the safe version

Return ONLY the revised document text. No explanations, no "Here's the revised version:", no markdown fences.`
}
