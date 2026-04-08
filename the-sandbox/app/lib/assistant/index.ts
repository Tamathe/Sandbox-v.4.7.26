// Barrel file — re-exports public API from assistant services

// ─── Shared Types ───────────────────────────────────────────
export type {
  ParsedRule,
  ActiveRule,
  EmailInsight,
  FollowUpCandidate,
  UrgencyBucket,
  UrgencyScore,
  ThreadSummary,
  ThreadStallSignal,
  ComposeContext,
  DraftPattern,
  MentionType,
  EmailMention,
  MentionSummary,
  AssistantCourseContext,
  SenderContext,
  CrossSystemContext,
  CourseContext,
  MeetingOption,
  FindTimeInput,
  BookMeetingInput,
  KnowledgeResult,
  KnowledgeQueryInput,
} from './types'

export {
  findRelatedCalendarEvents,
  findRelatedCourseContext,
  buildCrossSystemContext,
} from './cross-system-service'

export { detectThreadStall } from './email-commons-bridge-service'

export { buildComposeContext } from './email-compose-service'

export { getStaleThreads, generateFollowUpDraft } from './email-followup-service'

export { generateEmailInsights, buildEmailIntelligenceBlock } from './email-insight-service'

export { scanForMentions, getMentionSummary } from './email-mention-service'

export { analyzeDraftPatterns, hasNewPatterns, saveLearnedRule } from './email-rule-learner'

export {
  getInboxSummary,
  getInbox,
  getEmailById,
  getThread,
  draftReply,
  approveDraft,
  discardDraft,
  getPendingDrafts,
} from './email-service'

export { summarizeThread } from './email-thread-summary-service'

export { getToneInstruction } from './email-tone-drift-service'

export { scoreEmailUrgency } from './email-urgency-service'

export {
  getGraphRuntimeDiagnostics,
  getGraphAccessToken,
  graphJsonRequest,
  getGraphPrincipalForUser,
  recordGraphSyncSuccess,
  buildGraphUserPath,
  toGraphDateTime,
  fromGraphDateTime,
  escapeGraphFilterValue,
} from './graph-client'

export { GraphCalendarProvider } from './graph-calendar'
export { GraphEmailProvider } from './graph-email'
export { GraphFileProvider } from './graph-files'

export { queryKnowledge } from './knowledge-gateway'

export { toCalendarEvent, toEmail } from './provider-models'

export {
  getCalendarProviderSelection,
  getEmailProviderSelection,
  getFileProviderSelection,
  getCalendarProvider,
  getEmailProvider,
  getFileProvider,
} from './providers'
export type {
  CalendarEvent,
  FreeBusySlot,
  CreateEventInput,
  Email,
  EmailCategorySummary,
  FileSearchResult,
  CalendarProvider,
  EmailProvider,
  FileProvider,
} from './providers'

export { parseRule, evaluateRules, getUserRules, toggleRule, deleteRule } from './rules-service'

export { findMeetingOptions, bookMeeting } from './scheduling-service'

export { seedAssistantData } from './seed-data'

export { SimulatedCalendarProvider } from './simulated-calendar'
export { SimulatedEmailProvider } from './simulated-email'
export { SimulatedFileProvider } from './simulated-files'

export {
  createTask,
  completeTask,
  dismissTask,
  getUpcomingTasks,
  getOverdueTasks,
  getUserTasks,
} from './task-service'
