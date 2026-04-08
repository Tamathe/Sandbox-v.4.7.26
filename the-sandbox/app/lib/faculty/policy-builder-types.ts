import type {
  CourseGovernanceApiResponse,
  CourseGovernanceFlags,
  SandyTrustPanelData,
  TrustPanelSource,
} from '../provenance-types'

export const POLICY_BUILDER_POLICY_TYPES = [
  'late',
  'attendance',
  'grading',
  'academic_integrity',
  'communication',
  'other',
] as const

export type PolicyBuilderPolicyType = (typeof POLICY_BUILDER_POLICY_TYPES)[number]

export const POLICY_BUILDER_STANCES = [
  'prohibited',
  'limited',
  'disclosed',
  'encouraged',
] as const

export type PolicyBuilderStance = (typeof POLICY_BUILDER_STANCES)[number]

export const POLICY_BUILDER_TONES = [
  'firm',
  'balanced',
  'supportive',
] as const

export type PolicyBuilderTone = (typeof POLICY_BUILDER_TONES)[number]

export type PolicyBuilderCourseOption = {
  id: string
  courseCode: string
  title: string
  description: string | null
  semester: string | null
  flags: CourseGovernanceFlags
  policyCount: number
  gradingWeightCount: number
}

export type PolicyBuilderPolicyRecord = {
  id: string
  policyType: PolicyBuilderPolicyType
  title: string
  content: string
  source: string
  createdAt: string
}

export type PolicyBuilderWeightRecord = {
  id: string
  category: string
  weight: number
  description: string | null
  source: string
  createdAt: string
}

export type PolicyBuilderTemplateHint = {
  id: string
  name: string
  description: string
}

export type PolicyBuilderCourseContext = {
  course: PolicyBuilderCourseOption
  governance: CourseGovernanceApiResponse['course']
  sourceSummary: CourseGovernanceApiResponse['sourceSummary']
  recentSources: TrustPanelSource[]
  existingPolicies: PolicyBuilderPolicyRecord[]
  existingWeights: PolicyBuilderWeightRecord[]
  relevantContextText: string | null
  recommendedTemplate: PolicyBuilderTemplateHint | null
}

export type PolicyBuilderPreflightResponse = {
  courses: PolicyBuilderCourseOption[]
  selectedCourseId: string | null
  context: PolicyBuilderCourseContext | null
}

export type PolicyBuilderDraftInput = {
  courseId: string
  policyType: PolicyBuilderPolicyType
  stance: PolicyBuilderStance
  tone: PolicyBuilderTone
  title?: string | null
  allowedUses?: string | null
  restrictedUses?: string | null
  disclosureRequirements?: string | null
  courseNotes?: string | null
}

export type PolicyBuilderDraft = {
  title: string
  policyType: PolicyBuilderPolicyType
  content: string
  rationale: string[]
  generatedAt: string
  generationMethod: 'template+governance' | 'anthropic+template+governance'
  saveCandidates: PolicyBuilderPolicyRecord[]
  trustPanel: SandyTrustPanelData
}

export type PolicyBuilderGenerateResponse = {
  draft: PolicyBuilderDraft
  context: PolicyBuilderCourseContext
}

export type PolicyBuilderSaveMode = 'append' | 'replace'

export type PolicyBuilderSaveRequest = {
  courseId: string
  saveMode: PolicyBuilderSaveMode
  replacePolicyId?: string | null
  policy: {
    title: string
    policyType: PolicyBuilderPolicyType
    content: string
  }
}

export type PolicyBuilderSaveResponse = {
  savedPolicy: PolicyBuilderPolicyRecord
  saveMode: PolicyBuilderSaveMode
  replacedPolicyId: string | null
  changeRecorded: boolean
  acknowledgmentReset: boolean
  policiesCount: number
}
