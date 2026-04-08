// ─── LLM Role Classifier ──────────────────────────────────────────────────────
// Uses Claude Haiku to classify an ambiguous title into EDUCATOR/STUDENT/ADMIN/UNKNOWN.
// Only called when the title is not obvious from keyword matching.

import Anthropic from '@anthropic-ai/sdk'
import type { EnrichmentUserRole } from './types'

const client = new Anthropic()

// Fast keyword-based pre-classifier — avoids LLM call for clear cases
const EDUCATOR_KEYWORDS = [
  'professor', 'instructor', 'lecturer', 'faculty', 'teaching', 'adjunct',
]
const ADMIN_KEYWORDS = [
  'dean', 'provost', 'director', 'president', 'vice president', 'chancellor',
  'chief', 'officer', 'coordinator', 'adviser', 'advisor', 'registrar',
  'librarian', 'counselor', 'analyst',
]
const STUDENT_KEYWORDS = [
  'student', 'candidate', 'fellow', 'trainee', 'resident', 'intern',
  'doctoral', 'phd candidate', 'postdoc',
]

export function classifyRoleFromTitle(title: string | null, isLikelyStudentEmail: boolean): EnrichmentUserRole {
  if (!title) return isLikelyStudentEmail ? 'STUDENT' : 'UNKNOWN'

  const lower = title.toLowerCase()

  if (EDUCATOR_KEYWORDS.some((k) => lower.includes(k))) return 'EDUCATOR'
  if (STUDENT_KEYWORDS.some((k) => lower.includes(k))) return 'STUDENT'
  if (ADMIN_KEYWORDS.some((k) => lower.includes(k))) return 'ADMIN'

  return 'UNKNOWN'
}

/**
 * When the keyword classifier returns UNKNOWN, fall back to Haiku for
 * a more nuanced classification.
 */
export async function classifyRoleWithLLM(title: string, department: string | null): Promise<EnrichmentUserRole> {
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      system: `Classify this university person's role. Return exactly one of:
EDUCATOR, STUDENT, ADMIN, UNKNOWN
EDUCATOR = faculty, instructor, professor, lecturer, teaching staff
ADMIN = administrator, director, dean, provost, non-teaching staff
STUDENT = student, graduate student, doctoral candidate, postdoc
UNKNOWN = cannot determine`,
      messages: [
        {
          role: 'user',
          content: `Title: "${title}"${department ? `\nDepartment: "${department}"` : ''}`,
        },
      ],
    })

    const text = resp.content[0].type === 'text' ? resp.content[0].text.trim().toUpperCase() : ''
    if (['EDUCATOR', 'STUDENT', 'ADMIN', 'UNKNOWN'].includes(text)) {
      return text as EnrichmentUserRole
    }
    return 'UNKNOWN'
  } catch {
    return 'UNKNOWN'
  }
}
