/**
 * Shared types for Starter Pack v2 seed content templates.
 * These types mirror the Prisma schema fields (without id/createdAt/updatedAt)
 * so seed scripts can use them directly.
 */

export interface RubricRow {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  insufficient: string
}

export interface AssignmentTemplateData {
  disciplineFamily: 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'PROFESSIONAL' | 'HEALTH_SCIENCES'
  title: string
  description: string
  assignmentType: 'ESSAY' | 'LAB' | 'PROBLEM_SET' | 'CASE_STUDY' | 'PRESENTATION' | 'PROJECT' | 'EXAM' | 'DISCUSSION' | 'PORTFOLIO' | 'SIMULATION'
  aiTier: 'FOUNDATION' | 'AWARENESS' | 'PARTNERSHIP' | 'FLUENCY'
  aiLevel: 'PROHIBIT' | 'CAUTIOUS' | 'GUIDED' | 'INTEGRATE' | 'REQUIRE'
  syllabusLanguage: string
  rubricRows: RubricRow[]
  implementationNotes: string
  documentationTemplate: string | null
  tags: string[]
}

export interface CheckpointTemplateData {
  disciplineFamily: 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'PROFESSIONAL' | 'HEALTH_SCIENCES'
  name: string
  description: string
  gradingWeight: string
  aiTier: 'FOUNDATION' | 'AWARENESS' | 'PARTNERSHIP' | 'FLUENCY'
}
