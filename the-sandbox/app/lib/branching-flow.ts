import { EXPERIENCE_CATEGORIES, ExperienceType } from './experience-types'

export type StudentActivity = 'answer' | 'converse' | 'write' | 'feedback'
export type StructureLevel = 'freeform' | 'guided' | 'scored'
export type SessionLength = 'short' | 'medium' | 'long'

export interface BranchingAnswers {
  activity: StudentActivity
  structure: StructureLevel
  length: SessionLength
}

// Map activity choices to experience category IDs
const ACTIVITY_MAP: Record<StudentActivity, string[]> = {
  answer: ['practice', 'comprehension'],
  converse: ['roleplay', 'socratic'],
  write: ['writing'],
  feedback: ['tutoring', 'reflection'],
}

// Map structure choices to tool types
const STRUCTURE_MAP: Record<StructureLevel, string[]> = {
  freeform: ['CHATBOT', 'STUDY_BUDDY'],
  guided: ['SIMULATION', 'AI_INTERVIEW', 'DEBATE'],
  scored: ['QUIZ'],
}

const LENGTH_LABELS: Record<SessionLength, string> = {
  short: 'Keep sessions to about 5 minutes.',
  medium: '',
  long: 'Design this as a deep-dive experience, 30 minutes or more.',
}

/**
 * Given branching-flow answers, return the 2-3 best-matching templates
 * from the existing EXPERIENCE_CATEGORIES pool.
 */
export function matchTemplates(answers: BranchingAnswers): ExperienceType[] {
  const categoryIds = ACTIVITY_MAP[answers.activity]
  const toolTypes = STRUCTURE_MAP[answers.structure]
  const lengthSuffix = LENGTH_LABELS[answers.length]

  // Collect all types from matching categories
  const pool = EXPERIENCE_CATEGORIES
    .filter(cat => categoryIds.includes(cat.id))
    .flatMap(cat => cat.types)

  // Score: matching tool type = 2 points, same category = 1 point (already in pool)
  const scored = pool.map(t => ({
    type: t,
    score: toolTypes.includes(t.toolType) ? 2 : 1,
  }))

  scored.sort((a, b) => b.score - a.score)

  // Take top 3, append length instruction to prompt templates
  return scored.slice(0, 3).map(s => ({
    ...s.type,
    promptTemplate: lengthSuffix
      ? `${s.type.promptTemplate} ${lengthSuffix}`
      : s.type.promptTemplate,
  }))
}

export const ACTIVITY_OPTIONS: { id: StudentActivity; label: string; description: string }[] = [
  { id: 'answer', label: 'Answer questions', description: 'Quizzes, drills, concept checks' },
  { id: 'converse', label: 'Practice a conversation', description: 'Role-play, Socratic dialogue, interviews' },
  { id: 'write', label: 'Write something', description: 'Essays, reflections, peer review' },
  { id: 'feedback', label: 'Get feedback on their work', description: 'Tutoring, coaching, self-assessment' },
]

export const STRUCTURE_OPTIONS: { id: StructureLevel; label: string; description: string }[] = [
  { id: 'freeform', label: 'Freeform', description: 'Open-ended conversation' },
  { id: 'guided', label: 'Guided', description: 'Step-by-step with structure' },
  { id: 'scored', label: 'Scored', description: 'Graded with a rubric' },
]

export const LENGTH_OPTIONS: { id: SessionLength; label: string }[] = [
  { id: 'short', label: '5 min' },
  { id: 'medium', label: '15 min' },
  { id: 'long', label: '30+ min' },
]
