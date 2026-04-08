// Barrel file — re-exports public API from staff services

export { getUnifiedActions, resolveAction, getActionCounts } from './action-center-service'
export type { UnifiedAction, ActionCenterFilters, ActionCounts } from './action-center-service'

export {
  getActionQueue,
  getActionQueueCounts,
  resolveAction as resolveQueueAction,
  delegateAction,
  createAction,
  batchResolve,
  snoozeAction,
  unsnoozeAction,
  batchSnooze,
  resolveUserByEmail,
  createApprovalActionItem,
  resolveApprovalActionItems,
} from './action-queue-service'
export type {
  ActionQueueOpts,
  ActionQueueResult,
  ActionQueueCounts,
  ResolveInput,
  DelegateInput,
  CreateActionInput,
  BatchResolveResult,
} from './action-queue-service'

export { getActiveAlerts, createAlert, dismissAlert } from './alert-service'
export type { CreateAlertInput } from './alert-service'

export { getApprovalChain } from './approval-chains'
export type { ApprovalChainStep } from './approval-chains'

export {
  createApprovalChain,
  advanceApproval,
  getApprovalStatus,
  getStaleApprovals,
  getPendingApprovalsForUser,
  getCurrentActiveStep,
} from './approval-service'
export type { ApprovalStepResult } from './approval-service'

export {
  getDailyBriefing,
  getDailyBriefingDelta,
  generateRecommendations,
} from './briefing-service'
export type {
  ActionQueueSummary,
  SandyRecommendation,
  ScheduledCommsSummary,
  DailyBriefing,
  BriefingDelta,
} from './briefing-service'

export { getBudgetPulse, getBudgetDetail, updateBudgetAfterApproval } from './budget-service'
export type { BudgetVariance, BudgetPulseSummary } from './budget-service'

export { seedCommitteeData } from './committee-seed-data'

export {
  getCommittees,
  getCommittee,
  createCommittee,
  updateCommittee,
  getUpcomingMeetings,
  getMeetingPrep,
  updateAgenda,
  getAgendaWithCarryForward,
  computeNextMeeting,
} from './committee-service'
export type { CommitteeMember, CreateCommitteeInput, UpcomingMeetingInfo, AgendaItem } from './committee-service'

export { checkCommunicationCompliance } from './communication-compliance'
export type { ComplianceFlag, ComplianceCheckResult } from './communication-compliance'

export { seedCommunicationData } from './communication-seed-data'

export {
  createDraft,
  reviseDraft,
  generateSocialVersions,
  submitForApproval,
  approveStep,
  scheduleCommunication,
  cancelSchedule,
  sendCommunication,
  getDrafts,
  getCommunication,
  updateDraft,
  getTemplates,
  createFromTemplate,
} from './communication-service'
export type {
  DraftRequest,
  ApprovalChainMember,
  DraftResult,
  SocialVersions,
} from './communication-service'

export { generateDistributionDraft, distributeMinutes } from './minutes-distribution'
export type { DistributionDraft } from './minutes-distribution'

export {
  generateMinutes,
  regenerateMinutes,
  updateActionItemStatus,
  getCommitteeHistory,
  getMeeting,
  updateMeeting,
  createMeetingDraft,
  reviseMinutesSection,
  createActionItems,
  getOpenActionItems,
} from './minutes-service'
export type {
  GenerateMinutesInput,
  ExtractedActionItem,
  ExtractedDecision,
  ActionReview,
  GeneratedMinutes,
} from './minutes-service'

export { POLICY_DOCUMENTS } from './policy-content'
export type { PolicySeed } from './policy-content'

export { seedPolicyDocuments } from './policy-seed-data'

export {
  searchPolicies,
  answerPolicyQuestion,
  getPolicyByNumber,
  listPolicies,
  getPolicyCategories,
} from './policy-service'
export type { PolicySearchResult, PolicyCitation, PolicyAnswer, PolicyListItem } from './policy-service'

export { seedStaffData } from './staff-seed-data'

export { getSurveyIntelligencePreflight } from './survey-intelligence-preflight'
export type { SurveyIntelligencePreflight } from './survey-intelligence-preflight'

export { seedSurveyIntelligence } from './survey-intelligence-seed-data'

export {
  extractChips,
  extractPhase,
  getInterviewPrompt,
  getGeneratePrompt,
  getRefinePrompt,
  parseGenerationOutput,
} from './survey-intelligence-service'
export type {
  SurveyInterviewState,
  SurveyInterviewRequest,
  SurveyGenerateRequest,
  SurveyRefineRequest,
  ParsedGenerationOutput,
} from './survey-intelligence-service'

export {
  EVIDENCE_CATEGORIES,
  SURVEY_TEMPLATES,
  getTemplate,
  listTemplates,
} from './survey-intelligence-templates'
export type { SurveyTemplateQuestion, SurveyTemplate, EvidenceCategory } from './survey-intelligence-templates'

export {
  createVaultDocument,
  uploadPdfToVault,
  listVaultDocuments,
  getVaultDocument,
  deleteVaultDocument,
  searchVault,
  searchEvidenceDual,
} from './survey-vault-service'
export type { VaultSearchResult, VaultDocumentInput } from './survey-vault-service'
