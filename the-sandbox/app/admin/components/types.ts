import type React from 'react'

export type TabKey = 'overview' | 'moderation' | 'economics' | 'platform' | 'review' | 'compliance'

export type TranscriptSession = {
  id: string
  tool?: { name: string; category: string }
  user?: { name: string; email: string } | null
  chatMessages: Array<{
    id: string
    role: string
    content: string
    flagged: boolean
    flagCategory: string | null
    flagReason: string | null
    createdAt: string
  }>
}

export type ReviewTool = {
  id: string; name: string; category: string; createdAt: string
  requiresInstitutionalReview: boolean; reviewedAt: string | null
  reviewedBy: string | null; reviewExpiresAt: string | null
  creator: { name: string; email: string }
}

export type FeatureFlag = {
  id: string; feature: string; enabled: boolean; rolloutPercent: number
}

export type UknowStats = {
  totalArticles: number
  totalChunks: number
  lastIngestedAt: string | null
  sectionBreakdown: Array<{ section: string; sectionLabel: string; count: number }>
}

export type QueryStatsData = {
  topQueries: Array<{ query: string; count: number }>
  topSections: Array<{ section: string; count: number }>
  trendingTopics: Array<{ topic: string; count: number }>
  volumeByDay: Array<{ date: string; count: number }>
}

export type DeptHeatMapEntry = { department: string; userCount: number; matchCount: number }

export type CitationStatsData = {
  totalCitations: number
  uniqueArticlesCited: number
  topArticles: Array<{ articleId: string; title: string; slug: string; citationCount: number }>
  recentCitations: Array<{ userName: string; articleTitle: string; createdAt: string }>
}

export type ComplianceUser = {
  id: string; name: string; email: string; role: string
  tosAcceptedAt: string | null; dataConsentAt: string | null; ferpaAckAt: string | null
}

export type ComplianceCounts = {
  total: number; tosAccepted: number; consentAccepted: number
  ferpaAcknowledged: number; consentExpiringSoon: number; ferpaRenewalNeeded: number
}

export type AuditLogEntry = {
  id: string; userId: string; action: string; ipAddress: string | null
  userAgent: string | null; createdAt: string; user: { name: string; email: string }
}

export type RetentionPolicy = {
  id: string; policyName: string; dataCategory: string
  retentionDays: number; action: string; active: boolean
}

export type ConsentVersionRecord = {
  id: string; type: string; version: string; effectiveAt: string
  content: string; createdAt: string
}

export type DPARecord = {
  id: string; vendorName: string; purpose: string; dataCategories: string[]
  signedAt: string; expiresAt: string; documentUrl: string | null; active: boolean
}

export type DSARecord = {
  id: string; partnerInstitution: string; dataScope: string; legalBasis: string
  signedAt: string; expiresAt: string; contactEmail: string | null; active: boolean
}

export type PolicyDriftItem = {
  type: string; driftDetected: boolean; latestVersionDate: string | null; summary: string
}

export type FerpaReminderEducator = {
  id: string; name: string; email: string; role: string
  ferpaAckAt: string | null; lastRemindedAt: string | null
}

export type FerpaIncidentRecord = {
  id: string; description: string; severity: string; status: string
  resolution: string | null; createdAt: string; resolvedAt: string | null
  reportedBy: { id: string; name: string; email: string; role: string }
}

export type ComplianceTestResult = { name: string; status: 'pass' | 'fail'; durationMs: number; error?: string }

export type ComplianceTestSuite = {
  ranAt: string; totalTests: number; passed: number; failed: number
  durationMs: number; results: ComplianceTestResult[]
}

export type AuditReportRecord = {
  id: string; generatedAt: string; scope: string
  findings: {
    summary?: string; overallRisk?: string
    findings?: Array<{ severity: string; category: string; title: string; description: string; recommendation: string }>
    statistics?: Record<string, number>
  }
  generatedBy: string; createdAt: string
}

export type WorkflowRuleRecord = {
  id: string; name: string; triggerEvent: string; actions: string[]
  delayDays: number[]; active: boolean; createdAt: string
}

export type DryRunItem = { userId: string; email: string; triggered: boolean; reason: string }

export type ExecutionItem = {
  id: string; ruleId: string; ruleName: string; action: string; result: string
  dryRun: boolean; createdAt: string; user: { id: string; email: string; name: string }
}

export type BenchmarkItem = {
  id: string; category: string; label: string; targetValue: number
  unit: string; notes: string | null; currentValue: number
}

export type TemplateItem = {
  id: string; name: string; description: string | null; sections: string[]
  format: string; active: boolean
}

export type PlaybookItem = {
  id: string; name: string; incidentType: string; severity: string
  steps: { order: number; title: string; description: string; assignee: string; slaHours: number }[]
  notifyRoles: string[]; active: boolean; _count: { responses: number }
}

export type CommItem = {
  id: string; type: string; subject: string; body: string; targetRoles: string[]
  sentAt: string; readBy: string[]; priority: string
  sender: { id: string; name: string; email: string }
}

export type MetricSnap = { id: string; metricName: string; value: number; capturedAt: string }

export type EvidenceItem = {
  id: string; requirementId: string | null; evidenceType: string; title: string
  description: string | null; content: string | null; collectedAt: string
  validUntil: string | null; tags: string[]
  collector: { id: string; name: string; email: string }
  requirement: { id: string; title: string; regulation: string } | null
}

export type VendorAssessmentItem = {
  id: string; vendorName: string; dpaId: string | null; assessmentDate: string
  riskLevel: string; dataCategories: string[]; securityMeasures: string[]
  findings: unknown; overallScore: number; nextReviewDate: string | null; createdAt: string
  assessor: { id: string; name: string; email: string }
}

export type AuditChainEntry = {
  id: string; sequenceNumber: number; eventType: string; actorEmail: string
  timestamp: string; eventData: unknown
}

export type ChainIntegrity = { valid: boolean; brokenAt?: number; totalRecords: number }

export type PolicyAcceptanceStat = {
  policyType: string; totalAccepted: number; currentVersion: string
  currentVersionAccepted: number; currentVersionPct: number; withdrawn: number; totalUsers: number
}

export type DataClassificationItem = {
  id: string; dataAsset: string; classificationLevel: string; sensitivityTags: string[]
  ferpaProtected: boolean; piiContained: boolean; retentionCategory: string | null
  owner: string | null; notes: string | null; createdAt: string; updatedAt: string
}

export type ClassificationSummary = {
  countsByLevel: Record<string, number>; piiCount: number; ferpaCount: number; total: number
}

export type AccessReviewItem = {
  id: string; reviewCycle: string; status: string; startedAt: string | null
  completedAt: string | null; totalUsers: number; usersReviewed: number
  changesRecommended: number; findings: unknown
  reviewer: { name: string; email: string } | null; createdAt: string
}

export type HealthCheckItem = { name: string; status: 'pass' | 'warn' | 'fail'; message: string; value?: number }

export type HealthResult = {
  status: 'healthy' | 'degraded' | 'critical'; timestamp: string; checks: HealthCheckItem[]
}

export type DelegationItem = {
  id: string; delegatorId: string; delegateId: string; scope: string
  validFrom: string; validUntil: string | null; active: boolean
  reason: string | null; createdAt: string
  delegator: { id: string; name: string; email: string; role: string }
  delegate: { id: string; name: string; email: string; role: string }
}

export type ApprovalItem = {
  id: string; requestType: string; requestData: Record<string, unknown>
  requestedBy: string; status: string; approvedBy: string | null
  approvedAt: string | null; comments: string | null; createdAt: string
  requester: { id: string; name: string; email: string; role: string }
  approver?: { id: string; name: string; email: string; role: string } | null
}

export type IntegrationItem = {
  name: string; type: string; status: 'active' | 'degraded' | 'inactive'
  lastActivity: string | null; details: string
}

export type ExceptionItem = {
  id: string; userId: string | null; exceptionType: string; reason: string
  validFrom: string; validUntil: string; status: string
  revokedAt: string | null; revokedReason: string | null; createdAt: string
  user: { id: string; name: string; email: string; role: string } | null
  requirement: { id: string; title: string; regulation: string } | null
  grantor: { id: string; name: string; email: string; role: string }
}

export type TagItem = {
  id: string; name: string; color: string; description: string | null
  usageCount: number; createdAt: string; _count: { assignments: number }
}

export type ActivityItem = {
  id: string; type: string; title: string; description: string
  actor: string; timestamp: string
}

export type WebhookRecord = {
  id: string; url: string; secret: string; events: string[]
  active: boolean; createdAt: string
}

export type ComplianceRoleAssignment = {
  id: string; userId: string; role: string; grantedBy: string; grantedAt: string
  user: { id: string; name: string; email: string; role: string }
}

export type ComplianceDoc = {
  id: string; type: string; title: string; description: string | null
  version: string | null; expiresAt: string | null; createdAt: string
  uploader: { name: string; email: string }
}

export type RegReq = {
  id: string; regulation: string; articleRef: string; title: string; description: string
  featureMapping: string[]; status: string; notes: string | null
}

export type RegMatrix = {
  grouped: Record<string, RegReq[]>
  counts: Record<string, { met: number; partial: number; unmet: number; na: number; total: number }>
  gaps: RegReq[]
}

export type TrainingModule = {
  id: string; title: string; description: string; type: string
  requiredForRoles: string[]; passingScore: number; active: boolean
  createdAt: string; _count: { completions: number }
}

export type RiskBreakdown = { category: string; score: number; description: string }

export type RiskResult = { overallScore: number; riskLevel: string; breakdown: RiskBreakdown[] }

export type StatCard = {
  label: string; value: number
  icon: React.ComponentType<{ className?: string }>; bg: string
  onClick?: () => void
}

export const statusStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  COMMUNITY: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-200 text-red-900',
}
