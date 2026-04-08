'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import type {
  TabKey, TranscriptSession, ReviewTool, FeatureFlag, UknowStats,
  QueryStatsData, DeptHeatMapEntry, CitationStatsData, ComplianceUser,
  ComplianceCounts, AuditLogEntry, RetentionPolicy, ConsentVersionRecord,
  DPARecord, DSARecord, PolicyDriftItem, FerpaReminderEducator,
  FerpaIncidentRecord, ComplianceTestSuite, AuditReportRecord,
  WorkflowRuleRecord, DryRunItem, ExecutionItem, BenchmarkItem,
  TemplateItem, PlaybookItem, CommItem, MetricSnap, EvidenceItem,
  VendorAssessmentItem, AuditChainEntry, ChainIntegrity,
  PolicyAcceptanceStat, DataClassificationItem, ClassificationSummary,
  AccessReviewItem, HealthResult, DelegationItem, ApprovalItem,
  IntegrationItem, ExceptionItem, TagItem, ActivityItem,
  WebhookRecord, ComplianceRoleAssignment, ComplianceDoc,
  RegReq, RegMatrix, TrainingModule, RiskResult,
} from './types'
import { AdminStats, ToolWithDetails } from '../../lib/types'

export function useAdminState() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [transcriptSession, setTranscriptSession] = useState<TranscriptSession | null>(null)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [suspendingToolId, setSuspendingToolId] = useState<string | null>(null)
  const [suspendReasonText, setSuspendReasonText] = useState('')

  // Institutional review tools
  const [reviewTools, setReviewTools] = useState<ReviewTool[]>([])
  const [reviewToolsLoading, setReviewToolsLoading] = useState(false)
  const [reviewActionLoading, setReviewActionLoading] = useState<string | null>(null)

  // Sandcastle feature flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [flagsLoaded, setFlagsLoaded] = useState(false)

  // UKNow archive stats
  const [uknowStats, setUknowStats] = useState<UknowStats | null>(null)
  const [uknowStatsLoading, setUknowStatsLoading] = useState(false)
  const [uknowStatsError, setUknowStatsError] = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<string | null>(null)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)
  const [sentimentBackfillLoading, setSentimentBackfillLoading] = useState(false)
  const [sentimentBackfillResult, setSentimentBackfillResult] = useState<string | null>(null)

  // UKNow query analytics
  const [queryStats, setQueryStats] = useState<QueryStatsData | null>(null)
  const [queryStatsLoading, setQueryStatsLoading] = useState(false)

  // UKNow department digest heat map
  const [deptHeatMap, setDeptHeatMap] = useState<DeptHeatMapEntry[] | null>(null)
  const [deptHeatMapLoading, setDeptHeatMapLoading] = useState(false)

  // UKNow citation analytics
  const [citationStats, setCitationStats] = useState<CitationStatsData | null>(null)
  const [citationStatsLoading, setCitationStatsLoading] = useState(false)

  // Compliance tab state
  const [complianceUsers, setComplianceUsers] = useState<ComplianceUser[]>([])
  const [complianceCounts, setComplianceCounts] = useState<ComplianceCounts | null>(null)
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'missing-tos' | 'missing-consent' | 'missing-ferpa'>('all')
  const [auditLogEntries, setAuditLogEntries] = useState<AuditLogEntry[]>([])
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [auditLogLoading, setAuditLogLoading] = useState(false)
  const [resetTosLoading, setResetTosLoading] = useState(false)
  const [resetTosConfirm, setResetTosConfirm] = useState(false)

  // Data retention policies state
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([])
  const [retentionLoading, setRetentionLoading] = useState(false)
  const [retentionSaving, setRetentionSaving] = useState<string | null>(null)

  // Consent versions state
  const [consentVersions, setConsentVersions] = useState<Record<string, ConsentVersionRecord[]>>({})
  const [consentVersionsLoading, setConsentVersionsLoading] = useState(false)
  const [newVersionType, setNewVersionType] = useState<'tos' | 'consent' | 'ferpa'>('tos')
  const [newVersionStr, setNewVersionStr] = useState('')
  const [newVersionContent, setNewVersionContent] = useState('')
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [versionCreateConfirm, setVersionCreateConfirm] = useState(false)

  // DPA state
  const [dpas, setDpas] = useState<DPARecord[]>([])
  const [dpaLoading, setDpaLoading] = useState(false)
  const [dpaFormOpen, setDpaFormOpen] = useState(false)
  const [dpaVendor, setDpaVendor] = useState('')
  const [dpaPurpose, setDpaPurpose] = useState('')
  const [dpaCategories, setDpaCategories] = useState('')
  const [dpaSignedAt, setDpaSignedAt] = useState('')
  const [dpaExpiresAt, setDpaExpiresAt] = useState('')
  const [dpaDocUrl, setDpaDocUrl] = useState('')
  const [dpaSaving, setDpaSaving] = useState(false)

  // Compliance scores
  const [complianceScores, setComplianceScores] = useState<Record<string, number>>({})

  // Data sharing agreements state
  const [dsas, setDsas] = useState<DSARecord[]>([])
  const [dsaLoading, setDsaLoading] = useState(false)
  const [dsaFormOpen, setDsaFormOpen] = useState(false)
  const [dsaPartner, setDsaPartner] = useState('')
  const [dsaScope, setDsaScope] = useState('')
  const [dsaLegalBasis, setDsaLegalBasis] = useState('')
  const [dsaSignedAt, setDsaSignedAt] = useState('')
  const [dsaExpiresAt, setDsaExpiresAt] = useState('')
  const [dsaContact, setDsaContact] = useState('')
  const [dsaSaving, setDsaSaving] = useState(false)

  // Policy drift state
  const [policyDrift, setPolicyDrift] = useState<PolicyDriftItem[]>([])
  const [policyDriftLoading, setPolicyDriftLoading] = useState(false)

  // FERPA training reminders state
  const [ferpaReminderEducators, setFerpaReminderEducators] = useState<FerpaReminderEducator[]>([])
  const [ferpaRemindersLoading, setFerpaRemindersLoading] = useState(false)
  const [ferpaBlastLoading, setFerpaBlastLoading] = useState(false)
  const [ferpaBlastResult, setFerpaBlastResult] = useState<{ sent: number; skipped: number; total: number } | null>(null)

  // Compliance report export state
  const [exportingReport, setExportingReport] = useState(false)

  // FERPA incidents state
  const [ferpaIncidents, setFerpaIncidents] = useState<FerpaIncidentRecord[]>([])
  const [ferpaIncidentsLoading, setFerpaIncidentsLoading] = useState(false)
  const [incidentFormOpen, setIncidentFormOpen] = useState(false)
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [incidentSaving, setIncidentSaving] = useState(false)
  const [updatingIncident, setUpdatingIncident] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({})

  // Compliance tests state
  const [complianceTestResults, setComplianceTestResults] = useState<ComplianceTestSuite | null>(null)
  const [complianceTestLoading, setComplianceTestLoading] = useState(false)

  // Audit reports state
  const [auditReports, setAuditReports] = useState<AuditReportRecord[]>([])
  const [auditReportsLoading, setAuditReportsLoading] = useState(false)
  const [auditGenerating, setAuditGenerating] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  // Workflow rules state
  const [workflowRules, setWorkflowRules] = useState<WorkflowRuleRecord[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfTrigger, setWfTrigger] = useState('consent-expired')
  const [wfActions, setWfActions] = useState<string[]>([])
  const [wfDelays, setWfDelays] = useState('')
  const [wfSaving, setWfSaving] = useState(false)

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [whUrl, setWhUrl] = useState('')
  const [whSecret, setWhSecret] = useState('')
  const [whEvents, setWhEvents] = useState<string[]>([])
  const [whSaving, setWhSaving] = useState(false)

  // SIEM/CSV export state
  const [siemExporting, setSiemExporting] = useState(false)
  const [csvExporting, setCsvExporting] = useState(false)

  // Compliance roles state
  const [compRoles, setCompRoles] = useState<ComplianceRoleAssignment[]>([])
  const [compRolesLoading, setCompRolesLoading] = useState(false)
  const [crEmail, setCrEmail] = useState('')
  const [crRole, setCrRole] = useState('viewer')
  const [crSaving, setCrSaving] = useState(false)

  // Compliance documents state
  const [compDocs, setCompDocs] = useState<ComplianceDoc[]>([])
  const [compDocsLoading, setCompDocsLoading] = useState(false)
  const [cdType, setCdType] = useState('policy')
  const [cdTitle, setCdTitle] = useState('')
  const [cdDesc, setCdDesc] = useState('')
  const [cdVersion, setCdVersion] = useState('')
  const [cdExpires, setCdExpires] = useState('')
  const [cdContent, setCdContent] = useState('')
  const [cdSaving, setCdSaving] = useState(false)

  // Regulatory requirements state
  const [regMatrix, setRegMatrix] = useState<RegMatrix | null>(null)
  const [regMatrixLoading, setRegMatrixLoading] = useState(false)
  const [regSeeding, setRegSeeding] = useState(false)

  // Compliance training state
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([])
  const [trainingLoading, setTrainingLoading] = useState(false)
  const [tmTitle, setTmTitle] = useState('')
  const [tmDesc, setTmDesc] = useState('')
  const [tmType, setTmType] = useState('ferpa')
  const [tmRoles, setTmRoles] = useState<string[]>(['EDUCATOR', 'ADMIN'])
  const [tmPassing, setTmPassing] = useState('80')
  const [tmSaving, setTmSaving] = useState(false)
  const [tmStats, setTmStats] = useState<Record<string, { eligibleUsers: number; completed: number; passed: number; completionRate: number; passRate: number }>>({})

  // Compliance risk state
  const [riskData, setRiskData] = useState<RiskResult | null>(null)
  const [riskLoading, setRiskLoading] = useState(false)

  // Workflow execution state
  const [dryRunResults, setDryRunResults] = useState<Record<string, DryRunItem[]>>({})
  const [dryRunLoading, setDryRunLoading] = useState<Record<string, boolean>>({})
  const [workflowExecs, setWorkflowExecs] = useState<ExecutionItem[]>([])
  const [workflowExecsLoading, setWorkflowExecsLoading] = useState(false)

  // Compliance benchmarks state
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([])
  const [benchmarksLoading, setBenchmarksLoading] = useState(false)

  // Compliance templates state
  const [reportTemplates, setReportTemplates] = useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templateGenerating, setTemplateGenerating] = useState<Record<string, boolean>>({})

  // Incident Playbooks state
  const [playbooks, setPlaybooks] = useState<PlaybookItem[]>([])
  const [playbooksLoading, setPlaybooksLoading] = useState(false)
  const [pbName, setPbName] = useState('')
  const [pbType, setPbType] = useState('data-breach')
  const [pbSeverity, setPbSeverity] = useState('high')
  const [pbFormOpen, setPbFormOpen] = useState(false)
  const [pbSaving, setPbSaving] = useState(false)
  const [pbSeeding, setPbSeeding] = useState(false)

  // Compliance Communications state
  const [compComms, setCompComms] = useState<CommItem[]>([])
  const [compCommsLoading, setCompCommsLoading] = useState(false)
  const [ccFormOpen, setCcFormOpen] = useState(false)
  const [ccType, setCcType] = useState('announcement')
  const [ccSubject, setCcSubject] = useState('')
  const [ccBody, setCcBody] = useState('')
  const [ccRoles, setCcRoles] = useState<string[]>(['EDUCATOR', 'ADMIN'])
  const [ccPriority, setCcPriority] = useState('normal')
  const [ccSaving, setCcSaving] = useState(false)

  // Compliance Metric Tracking state
  const [metricHistory, setMetricHistory] = useState<Record<string, MetricSnap[]>>({})
  const [metricHistoryLoading, setMetricHistoryLoading] = useState(false)
  const [capturingMetrics, setCapturingMetrics] = useState(false)
  const [exportingMetrics, setExportingMetrics] = useState(false)

  // Compliance Evidence state
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evFormOpen, setEvFormOpen] = useState(false)
  const [evTitle, setEvTitle] = useState('')
  const [evType, setEvType] = useState('manual')
  const [evDescription, setEvDescription] = useState('')
  const [evTags, setEvTags] = useState('')
  const [evReqId, setEvReqId] = useState('')
  const [evSaving, setEvSaving] = useState(false)
  const [evAutoCollecting, setEvAutoCollecting] = useState(false)

  // Vendor Risk Assessments state
  const [vendorAssessments, setVendorAssessments] = useState<VendorAssessmentItem[]>([])
  const [vendorLoading, setVendorLoading] = useState(false)
  const [vaFormOpen, setVaFormOpen] = useState(false)
  const [vaVendor, setVaVendor] = useState('')
  const [vaRisk, setVaRisk] = useState('medium')
  const [vaScore, setVaScore] = useState('50')
  const [vaCategories, setVaCategories] = useState('')
  const [vaMeasures, setVaMeasures] = useState('')
  const [vaNextReview, setVaNextReview] = useState('')
  const [vaSaving, setVaSaving] = useState(false)

  // Audit Chain state
  const [auditChainEntries, setAuditChainEntries] = useState<AuditChainEntry[]>([])
  const [auditChainLoading, setAuditChainLoading] = useState(false)
  const [chainIntegrity, setChainIntegrity] = useState<ChainIntegrity | null>(null)
  const [chainVerifyLoading, setChainVerifyLoading] = useState(false)

  // Policy Acceptance state
  const [policyAcceptanceStats, setPolicyAcceptanceStats] = useState<PolicyAcceptanceStat[]>([])
  const [policyAcceptanceLoading, setPolicyAcceptanceLoading] = useState(false)

  // Data Classification state
  const [dcItems, setDcItems] = useState<DataClassificationItem[]>([])
  const [dcSummary, setDcSummary] = useState<ClassificationSummary | null>(null)
  const [dcLoading, setDcLoading] = useState(false)
  const [dcSeeding, setDcSeeding] = useState(false)
  const [dcFormOpen, setDcFormOpen] = useState(false)
  const [dcAsset, setDcAsset] = useState('')
  const [dcLevel, setDcLevel] = useState('internal')
  const [dcFerpa, setDcFerpa] = useState(false)
  const [dcPii, setDcPii] = useState(false)
  const [dcTags, setDcTags] = useState('')
  const [dcNotes, setDcNotes] = useState('')
  const [dcSaving, setDcSaving] = useState(false)

  // Access Review state
  const [arItems, setArItems] = useState<AccessReviewItem[]>([])
  const [arLoading, setArLoading] = useState(false)
  const [arCycle, setArCycle] = useState('')
  const [arCreating, setArCreating] = useState(false)
  const [arExpandedId, setArExpandedId] = useState<string | null>(null)

  // Compliance Health state
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Delegations & Approvals state
  const [delegations, setDelegations] = useState<DelegationItem[]>([])
  const [delegationsLoading, setDelegationsLoading] = useState(false)
  const [delDelegatorEmail, setDelDelegatorEmail] = useState('')
  const [delDelegateEmail, setDelDelegateEmail] = useState('')
  const [delScope, setDelScope] = useState('full')
  const [delReason, setDelReason] = useState('')
  const [delSaving, setDelSaving] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({})
  const [approvalActioning, setApprovalActioning] = useState<string | null>(null)
  const [approvalFormOpen, setApprovalFormOpen] = useState(false)
  const [newApprovalType, setNewApprovalType] = useState('dpa-renewal')
  const [newApprovalDesc, setNewApprovalDesc] = useState('')
  const [newApprovalSaving, setNewApprovalSaving] = useState(false)

  // Integration Status state
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(false)

  // Compliance Exceptions state
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [exceptionsLoading, setExceptionsLoading] = useState(false)
  const [expiringExceptions, setExpiringExceptions] = useState<ExceptionItem[]>([])
  const [excFormOpen, setExcFormOpen] = useState(false)
  const [excUserEmail, setExcUserEmail] = useState('')
  const [excReqId, setExcReqId] = useState('')
  const [excType, setExcType] = useState('waiver')
  const [excReason, setExcReason] = useState('')
  const [excValidUntil, setExcValidUntil] = useState('')
  const [excSaving, setExcSaving] = useState(false)
  const [excRevokeId, setExcRevokeId] = useState<string | null>(null)
  const [excRevokeReason, setExcRevokeReason] = useState('')

  // Compliance Tags state
  const [compTags, setCompTags] = useState<TagItem[]>([])
  const [compTagsLoading, setCompTagsLoading] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#0033A0')
  const [tagSaving, setTagSaving] = useState(false)

  // Compliance Activity state
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityLimit, setActivityLimit] = useState(50)

  // Requirements for evidence linking dropdown
  const allRegRequirements: RegReq[] = regMatrix ? Object.values(regMatrix.grouped).flat() : []

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  // All the fetch and handler functions go here — returning them all
  // This is a direct copy from the original page.tsx lines 519-2131

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin', { headers: { 'x-demo-user-email': currentUser.email } })
      if (response.status === 403) { router.replace('/'); return }
      if (!response.ok) throw new Error('Failed to fetch admin data')
      setStats(await response.json())
    } catch (error) { console.error(error); showToast('Failed to load admin data', 'error') }
    finally { setLoading(false) }
  }, [currentUser.email, router, showToast])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') { router.replace('/'); return }
    void fetchStats()
  }, [currentUser.role, fetchStats, router])

  // Tab-specific data loading
  const fetchFeatureFlags = async () => {
    if (flagsLoaded) return; setFlagsLoading(true)
    try { const res = await fetch('/api/sandcastle/feature-flags', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = (await res.json()) as { flags: FeatureFlag[] }; setFeatureFlags(data.flags); setFlagsLoaded(true) } } finally { setFlagsLoading(false) }
  }
  const fetchUknowStats = async () => {
    setUknowStatsLoading(true); setUknowStatsError(false)
    try { const res = await fetch('/api/admin/uknow-stats', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setUknowStats(await res.json()); else setUknowStatsError(true) } catch { setUknowStatsError(true) } finally { setUknowStatsLoading(false) }
  }
  const fetchQueryStats = async () => {
    setQueryStatsLoading(true)
    try { const res = await fetch('/api/admin/uknow-query-stats', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setQueryStats(await res.json()) } finally { setQueryStatsLoading(false) }
  }
  const fetchDeptHeatMap = async () => {
    setDeptHeatMapLoading(true)
    try { const res = await fetch('/api/uknow/department-digest', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDeptHeatMap(data.departments ?? []) } } finally { setDeptHeatMapLoading(false) }
  }
  const fetchCitationStats = async () => {
    setCitationStatsLoading(true)
    try { const res = await fetch('/api/uknow/citation-stats', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setCitationStats(await res.json()) } finally { setCitationStatsLoading(false) }
  }
  const fetchReviewTools = async () => {
    setReviewToolsLoading(true)
    try { const res = await fetch('/api/admin', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setReviewTools((data.reviewTools ?? []) as ReviewTool[]) } } finally { setReviewToolsLoading(false) }
  }
  const fetchComplianceStats = async () => { setComplianceLoading(true); try { const res = await fetch('/api/admin/compliance-stats', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setComplianceCounts(data.counts); setComplianceUsers(data.users) } } finally { setComplianceLoading(false) } }
  const fetchAuditLog = async () => { setAuditLogLoading(true); try { const res = await fetch('/api/admin/compliance-audit-log?page=1', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setAuditLogEntries(data.entries) } } finally { setAuditLogLoading(false) } }
  const fetchRetentionPolicies = async () => { setRetentionLoading(true); try { const res = await fetch('/api/admin/data-retention', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setRetentionPolicies(data.policies) } } finally { setRetentionLoading(false) } }
  const fetchConsentVersions = async () => { setConsentVersionsLoading(true); try { const res = await fetch('/api/admin/consent-versions', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setConsentVersions(data.versions) } } finally { setConsentVersionsLoading(false) } }
  const fetchDPAs = async () => { setDpaLoading(true); try { const res = await fetch('/api/admin/dpa', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDpas(data.dpas) } } finally { setDpaLoading(false) } }
  const fetchComplianceScores = async () => { try { const res = await fetch('/api/admin/compliance-scores', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setComplianceScores(data.scores) } } catch { /* noop */ } }
  const fetchDSAs = async () => { setDsaLoading(true); try { const res = await fetch('/api/admin/data-sharing', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDsas(data.agreements) } } finally { setDsaLoading(false) } }
  const fetchPolicyDrift = async () => { setPolicyDriftLoading(true); try { const res = await fetch('/api/admin/policy-drift', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setPolicyDrift(data.results) } } finally { setPolicyDriftLoading(false) } }
  const fetchFerpaReminderStatus = async () => { setFerpaRemindersLoading(true); try { const res = await fetch('/api/admin/ferpa-reminders/status', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setFerpaReminderEducators(data.educators) } } finally { setFerpaRemindersLoading(false) } }
  const fetchFerpaIncidents = async () => { setFerpaIncidentsLoading(true); try { const res = await fetch('/api/admin/ferpa-incidents', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setFerpaIncidents(data.incidents) } } finally { setFerpaIncidentsLoading(false) } }
  const fetchAuditReports = async () => { setAuditReportsLoading(true); try { const res = await fetch('/api/admin/audit-reports', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setAuditReports(await res.json()) } finally { setAuditReportsLoading(false) } }
  const fetchWorkflowRules = async () => { setWorkflowsLoading(true); try { const res = await fetch('/api/admin/compliance-workflows', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setWorkflowRules(data.rules ?? []) } } finally { setWorkflowsLoading(false) } }
  const fetchWorkflowExecs = async () => { setWorkflowExecsLoading(true); try { const res = await fetch('/api/admin/compliance-workflow-executions', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setWorkflowExecs(data.executions ?? []) } } catch { /* ignore */ } setWorkflowExecsLoading(false) }
  const fetchBenchmarks = async () => { setBenchmarksLoading(true); try { const res = await fetch('/api/admin/compliance-benchmarks', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setBenchmarks(data.benchmarks ?? []) } } catch { /* ignore */ } setBenchmarksLoading(false) }
  const fetchReportTemplates = async () => { setTemplatesLoading(true); try { const res = await fetch('/api/admin/compliance-templates', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setReportTemplates(data.templates ?? []) } } catch { /* ignore */ } setTemplatesLoading(false) }
  const fetchWebhooks = async () => { setWebhooksLoading(true); try { const res = await fetch('/api/admin/compliance-webhooks', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setWebhooks(data.webhooks ?? []) } } finally { setWebhooksLoading(false) } }
  const fetchComplianceRoles = async () => { setCompRolesLoading(true); try { const res = await fetch('/api/admin/compliance-roles', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setCompRoles(data.assignments ?? []) } } finally { setCompRolesLoading(false) } }
  const fetchComplianceDocs = async () => { setCompDocsLoading(true); try { const res = await fetch('/api/admin/compliance-documents', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setCompDocs(data.documents ?? []) } } finally { setCompDocsLoading(false) } }
  const fetchRegMatrix = async () => { setRegMatrixLoading(true); try { const res = await fetch('/api/admin/compliance-matrix', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setRegMatrix(await res.json()) } finally { setRegMatrixLoading(false) } }
  const fetchTrainingModules = async () => { setTrainingLoading(true); try { const res = await fetch('/api/admin/compliance-training', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setTrainingModules(data.modules ?? []); const statsMap: typeof tmStats = {}; await Promise.all((data.modules ?? []).map(async (m: TrainingModule) => { try { const sr = await fetch(`/api/admin/compliance-training/${m.id}/stats`, { headers: { 'x-demo-user-email': currentUser.email } }); if (sr.ok) statsMap[m.id] = await sr.json() } catch { /* ignore */ } })); setTmStats(statsMap) } } finally { setTrainingLoading(false) } }
  const fetchRiskData = async () => { setRiskLoading(true); try { const res = await fetch('/api/admin/compliance-risk', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setRiskData(await res.json()) } finally { setRiskLoading(false) } }
  const fetchPlaybooks = async () => { setPlaybooksLoading(true); try { const res = await fetch('/api/admin/incident-playbooks', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setPlaybooks(data.playbooks ?? []) } } finally { setPlaybooksLoading(false) } }
  const fetchCompComms = async () => { setCompCommsLoading(true); try { const res = await fetch('/api/admin/compliance-communications', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setCompComms(data.communications ?? []) } } finally { setCompCommsLoading(false) } }
  const fetchMetricHistory = async () => { setMetricHistoryLoading(true); try { const topMetrics = ['avgComplianceScore', 'ferpaTrainingRate', 'consentCoverage', 'tosAcceptance']; const results: Record<string, MetricSnap[]> = {}; await Promise.all(topMetrics.map(async (m) => { const res = await fetch(`/api/admin/compliance-metrics/history?metric=${m}&days=90`, { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); results[m] = data.history ?? [] } })); setMetricHistory(results) } finally { setMetricHistoryLoading(false) } }
  const fetchEvidenceItems = async () => { setEvidenceLoading(true); try { const res = await fetch('/api/admin/compliance-evidence', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setEvidenceItems(data.evidence ?? []) } } finally { setEvidenceLoading(false) } }
  const fetchVendorAssessments = async () => { setVendorLoading(true); try { const res = await fetch('/api/admin/vendor-assessments', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setVendorAssessments(data.assessments ?? []) } } finally { setVendorLoading(false) } }
  const fetchAuditChain = async () => { setAuditChainLoading(true); try { const res = await fetch('/api/admin/compliance-audit-chain?limit=10', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setAuditChainEntries(data.entries ?? []) } } finally { setAuditChainLoading(false) } }
  const fetchPolicyAcceptanceStats = async () => { setPolicyAcceptanceLoading(true); try { const res = await fetch('/api/admin/policy-acceptance-stats', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setPolicyAcceptanceStats(data.stats ?? []) } } finally { setPolicyAcceptanceLoading(false) } }
  const fetchDataClassifications = async () => { setDcLoading(true); try { const res = await fetch('/api/admin/data-classifications', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDcItems(data.classifications ?? []); setDcSummary(data.summary ?? null) } } finally { setDcLoading(false) } }
  const fetchAccessReviews = async () => { setArLoading(true); try { const res = await fetch('/api/admin/access-reviews', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setArItems(data.reviews ?? []) } } finally { setArLoading(false) } }
  const fetchHealthCheck = async () => { setHealthLoading(true); try { const res = await fetch('/api/admin/compliance-health', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setHealthResult(data) } } finally { setHealthLoading(false) } }
  const fetchDelegations = async () => { setDelegationsLoading(true); try { const res = await fetch('/api/admin/compliance-delegations', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDelegations(data.delegations || []) } } finally { setDelegationsLoading(false) } }
  const fetchPendingApprovals = async () => { setApprovalsLoading(true); try { const res = await fetch('/api/admin/compliance-approvals', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setPendingApprovals(data.approvals || []) } } finally { setApprovalsLoading(false) } }
  const fetchIntegrationStatus = async () => { setIntegrationsLoading(true); try { const res = await fetch('/api/admin/compliance-integrations/status', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setIntegrations(data.integrations || []) } } finally { setIntegrationsLoading(false) } }
  const fetchExceptions = async () => { setExceptionsLoading(true); try { const [activeRes, expiringRes] = await Promise.all([fetch('/api/admin/compliance-exceptions?status=active', { headers: { 'x-demo-user-email': currentUser.email } }), fetch('/api/admin/compliance-exceptions?status=active', { headers: { 'x-demo-user-email': currentUser.email } })]); if (activeRes.ok) { const d = await activeRes.json(); setExceptions(d.exceptions || []) }; if (expiringRes.ok) { const d = await expiringRes.json(); const now = Date.now(); const thirtyDays = 30 * 24 * 60 * 60 * 1000; setExpiringExceptions((d.exceptions || []).filter((e: ExceptionItem) => new Date(e.validUntil).getTime() - now < thirtyDays)) } } finally { setExceptionsLoading(false) } }
  const fetchCompTags = async () => { setCompTagsLoading(true); try { const res = await fetch('/api/admin/compliance-tags', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const d = await res.json(); setCompTags(d.tags || []) } } finally { setCompTagsLoading(false) } }
  const fetchActivityFeed = async (limit = 50) => { setActivityLoading(true); try { const res = await fetch(`/api/admin/compliance-activity?limit=${limit}`, { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const d = await res.json(); setActivityFeed(d.activity || []) } } finally { setActivityLoading(false) } }

  useEffect(() => {
    if (activeTab === 'platform') { void fetchFeatureFlags(); void fetchUknowStats(); void fetchQueryStats(); void fetchDeptHeatMap(); void fetchCitationStats() }
    if (activeTab === 'review') { void fetchReviewTools() }
    if (activeTab === 'compliance') {
      void fetchComplianceStats(); void fetchAuditLog(); void fetchRetentionPolicies(); void fetchConsentVersions()
      void fetchDPAs(); void fetchComplianceScores(); void fetchDSAs(); void fetchPolicyDrift()
      void fetchFerpaReminderStatus(); void fetchFerpaIncidents(); void fetchAuditReports()
      void fetchWorkflowRules(); void fetchWebhooks(); void fetchComplianceRoles()
      void fetchComplianceDocs(); void fetchRegMatrix(); void fetchTrainingModules()
      void fetchRiskData(); void fetchWorkflowExecs(); void fetchBenchmarks()
      void fetchReportTemplates(); void fetchPlaybooks(); void fetchCompComms()
      void fetchMetricHistory(); void fetchEvidenceItems(); void fetchVendorAssessments()
      void fetchAuditChain(); void fetchPolicyAcceptanceStats(); void fetchDataClassifications()
      void fetchAccessReviews(); void fetchHealthCheck(); void fetchDelegations()
      void fetchPendingApprovals(); void fetchIntegrationStatus(); void fetchExceptions()
      void fetchCompTags(); void fetchActivityFeed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Handler functions - all from original page.tsx

  const handleToolAction = async (tool: ToolWithDetails, kind: 'feature' | 'delete' | 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => {
    setActionLoading(`${tool.id}-${kind}`)
    try {
      if (kind === 'feature') { const response = await fetch(`/api/admin/tools/${tool.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ featured: !tool.featured }) }); if (!response.ok) throw new Error('Failed') }
      else if (kind === 'delete') { const response = await fetch(`/api/admin/tools/${tool.id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (!response.ok) throw new Error('Failed') }
      else { const suspendedReason = kind === 'SUSPENDED' ? reason : undefined; const response = await fetch(`/api/admin/tools/${tool.id}/approval`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ approvalStatus: kind, suspendedReason }) }); if (!response.ok) throw new Error('Failed') }
      setDeleteConfirm(null); showToast(kind === 'feature' ? tool.featured ? 'Tool unfeatured' : 'Tool featured' : kind === 'delete' ? 'Tool deleted' : `Tool ${kind.toLowerCase()}`); await fetchStats()
    } catch { showToast('Admin action failed', 'error') } finally { setActionLoading(null) }
  }

  const handleViewTranscript = async (sessionId: string) => {
    try { const response = await fetch(`/api/admin/tool-sessions/${sessionId}`, { headers: { 'x-demo-user-email': currentUser.email } }); if (!response.ok) throw new Error('Failed'); const data = await response.json(); setTranscriptSession(data.session) } catch { showToast('Failed to load transcript', 'error') }
  }

  const handleToggleFlag = async (flag: FeatureFlag) => {
    const optimistic = featureFlags.map((f) => f.id === flag.id ? { ...f, enabled: !f.enabled } : f); setFeatureFlags(optimistic)
    try { const res = await fetch(`/api/sandcastle/feature-flags/${flag.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ enabled: !flag.enabled }) }); if (!res.ok) throw new Error('Failed'); showToast(`${flag.feature} ${!flag.enabled ? 'enabled' : 'disabled'}`) } catch { setFeatureFlags(featureFlags); showToast('Failed to update feature flag', 'error') }
  }

  const handleAnnouncementCreate = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) { showToast('Announcement title and message are required', 'error'); return }
    setActionLoading('announcement')
    try { const response = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ title: announcementTitle, message: announcementMessage, tone: 'INFO', dismissible: true }) }); if (!response.ok) throw new Error('Failed'); setAnnouncementTitle(''); setAnnouncementMessage(''); showToast('Announcement published'); await fetchStats() } catch { showToast('Failed to publish announcement', 'error') } finally { setActionLoading(null) }
  }

  const handleReviewAction = async (toolId: string, action: 'approve-review' | 'flag-for-review' | 'clear-review') => {
    setReviewActionLoading(`${toolId}-${action}`)
    try { const res = await fetch(`/api/admin/tools/${toolId}/review`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ action }) }); if (!res.ok) throw new Error('Failed'); showToast(action === 'approve-review' ? 'Tool marked as reviewed' : action === 'flag-for-review' ? 'Tool flagged for review' : 'Review requirement cleared'); await fetchReviewTools() } catch { showToast('Review action failed', 'error') } finally { setReviewActionLoading(null) }
  }

  const handleTriggerIngest = async () => {
    setIngestLoading(true); setIngestResult(null)
    try { const res = await fetch('/api/admin/uknow-ingest', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = (await res.json()) as { ingested: number; errors: number }; setIngestResult(data.ingested > 0 ? `✓ ${data.ingested} new article${data.ingested === 1 ? '' : 's'} ingested` : 'Already up to date'); void fetchUknowStats() } else { setIngestResult('Ingest failed — check logs') } } catch { setIngestResult('Ingest failed — check logs') } finally { setIngestLoading(false) }
  }

  const handleBackfill = async () => {
    setBackfillLoading(true); setBackfillResult(null)
    try { const res = await fetch('/api/admin/uknow-backfill', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = (await res.json()) as { processed: number; remaining: number }; setBackfillResult(data.remaining > 0 ? `Processed ${data.processed}, ${data.remaining} remaining` : `Done — ${data.processed} processed, 0 remaining`) } else { setBackfillResult('Backfill failed — check logs') } } catch { setBackfillResult('Backfill failed — check logs') } finally { setBackfillLoading(false) }
  }

  const sentimentBackfillAbortRef = useRef(false)
  const handleSentimentBackfill = async () => {
    setSentimentBackfillLoading(true); setSentimentBackfillResult(null); sentimentBackfillAbortRef.current = false
    let totalProcessed = 0; let remaining = -1; let batchNum = 0; let consecutiveErrors = 0
    while (!sentimentBackfillAbortRef.current) {
      batchNum++
      try { const res = await fetch('/api/admin/uknow-sentiment-backfill', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (!res.ok) { consecutiveErrors++; if (consecutiveErrors >= 3) { setSentimentBackfillResult(`Stopped after ${totalProcessed} processed — 3 consecutive errors`); break }; setSentimentBackfillResult(`Batch ${batchNum} failed, retrying… (${totalProcessed} processed so far)`); continue }; consecutiveErrors = 0; const data = (await res.json()) as { processed: number; remaining: number }; totalProcessed += data.processed; remaining = data.remaining; setSentimentBackfillResult(`Batch ${batchNum}: +${data.processed} this batch, ${totalProcessed} total, ${remaining} remaining…`); if (remaining === 0 || data.processed === 0) { setSentimentBackfillResult(`Done — ${totalProcessed} articles processed, 0 remaining`); break } } catch { consecutiveErrors++; if (consecutiveErrors >= 3) { setSentimentBackfillResult(`Stopped after ${totalProcessed} processed — network error`); break }; setSentimentBackfillResult(`Network error on batch ${batchNum}, retrying… (${totalProcessed} processed so far)`) }
    }
    if (sentimentBackfillAbortRef.current) setSentimentBackfillResult(`Stopped by user — ${totalProcessed} processed, ${remaining > 0 ? remaining : '?'} remaining`)
    setSentimentBackfillLoading(false)
  }
  const handleStopSentimentBackfill = () => { sentimentBackfillAbortRef.current = true }

  const handleResetTos = async () => { setResetTosLoading(true); try { const res = await fetch('/api/admin/compliance/reset-tos', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (!res.ok) throw new Error('Reset failed'); const data = await res.json(); showToast(`TOS acceptances reset for ${data.affectedCount} users`); setResetTosConfirm(false); await fetchComplianceStats() } catch { showToast('Failed to reset TOS acceptances', 'error') } finally { setResetTosLoading(false) } }
  const handleRetentionUpdate = async (id: string, field: string, value: number | string | boolean) => { setRetentionSaving(id); try { const res = await fetch(`/api/admin/data-retention/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ [field]: value }) }); if (res.ok) { const data = await res.json(); setRetentionPolicies((prev) => prev.map((pp) => (pp.id === id ? data.policy : pp))); showToast('Retention policy updated') } else { showToast('Failed to update policy', 'error') } } catch { showToast('Failed to update policy', 'error') } finally { setRetentionSaving(null) } }
  const handleCreateConsentVersion = async () => { if (!newVersionStr.trim() || !newVersionContent.trim()) return; setCreatingVersion(true); try { const res = await fetch('/api/admin/consent-versions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ type: newVersionType, version: newVersionStr.trim(), content: newVersionContent.trim() }) }); if (res.ok) { const data = await res.json(); showToast(`Version created — ${data.usersReset} user(s) reset`); setNewVersionStr(''); setNewVersionContent(''); setVersionCreateConfirm(false); await fetchConsentVersions(); await fetchComplianceStats() } else { showToast('Failed to create version', 'error') } } catch { showToast('Failed to create version', 'error') } finally { setCreatingVersion(false) } }
  const handleCreateDPA = async () => { if (!dpaVendor.trim() || !dpaPurpose.trim() || !dpaSignedAt || !dpaExpiresAt) return; setDpaSaving(true); try { const res = await fetch('/api/admin/dpa', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ vendorName: dpaVendor.trim(), purpose: dpaPurpose.trim(), dataCategories: dpaCategories.split(',').map((s) => s.trim()).filter(Boolean), signedAt: new Date(dpaSignedAt).toISOString(), expiresAt: new Date(dpaExpiresAt).toISOString(), documentUrl: dpaDocUrl.trim() || undefined }) }); if (res.ok) { showToast('DPA created'); setDpaVendor(''); setDpaPurpose(''); setDpaCategories(''); setDpaSignedAt(''); setDpaExpiresAt(''); setDpaDocUrl(''); setDpaFormOpen(false); await fetchDPAs() } else { showToast('Failed to create DPA', 'error') } } catch { showToast('Failed to create DPA', 'error') } finally { setDpaSaving(false) } }
  const handleDeleteDPA = async (id: string) => { try { const res = await fetch(`/api/admin/dpa/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('DPA deleted'); setDpas((prev) => prev.filter((d) => d.id !== id)) } } catch { showToast('Failed to delete DPA', 'error') } }
  const handleCreateDSA = async () => { if (!dsaPartner.trim() || !dsaScope.trim() || !dsaLegalBasis.trim() || !dsaSignedAt || !dsaExpiresAt) return; setDsaSaving(true); try { const res = await fetch('/api/admin/data-sharing', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ partnerInstitution: dsaPartner.trim(), dataScope: dsaScope.trim(), legalBasis: dsaLegalBasis.trim(), signedAt: new Date(dsaSignedAt).toISOString(), expiresAt: new Date(dsaExpiresAt).toISOString(), contactEmail: dsaContact.trim() || undefined }) }); if (res.ok) { showToast('Data sharing agreement created'); setDsaPartner(''); setDsaScope(''); setDsaLegalBasis(''); setDsaSignedAt(''); setDsaExpiresAt(''); setDsaContact(''); setDsaFormOpen(false); await fetchDSAs() } else { showToast('Failed to create agreement', 'error') } } catch { showToast('Failed to create agreement', 'error') } finally { setDsaSaving(false) } }
  const handleDeleteDSA = async (id: string) => { try { const res = await fetch(`/api/admin/data-sharing/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Agreement deleted'); setDsas((prev) => prev.filter((d) => d.id !== id)) } } catch { showToast('Failed to delete agreement', 'error') } }
  const handleSendFerpaBlast = async () => { setFerpaBlastLoading(true); setFerpaBlastResult(null); try { const res = await fetch('/api/admin/ferpa-reminders/send-blast', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setFerpaBlastResult(data); showToast(`Sent ${data.sent} FERPA reminders (${data.skipped} skipped)`); await fetchFerpaReminderStatus() } else { showToast('Failed to send reminders', 'error') } } catch { showToast('Failed to send reminders', 'error') } finally { setFerpaBlastLoading(false) } }
  const handleCreateIncident = async () => { setIncidentSaving(true); try { const res = await fetch('/api/admin/ferpa-incidents', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ description: incidentDesc, severity: incidentSeverity }) }); if (res.ok) { showToast('Incident created'); setIncidentDesc(''); setIncidentSeverity('medium'); setIncidentFormOpen(false); await fetchFerpaIncidents() } else { showToast('Failed to create incident', 'error') } } catch { showToast('Failed to create incident', 'error') } finally { setIncidentSaving(false) } }
  const handleUpdateIncident = async (id: string, status: string) => { setUpdatingIncident(id); try { const body: Record<string, string> = { status }; const res = resolutionText[id]?.trim(); if (res) body.resolution = res; const resp = await fetch(`/api/admin/ferpa-incidents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify(body) }); if (resp.ok) { showToast(`Incident ${status}`); setResolutionText((prev) => { const next = { ...prev }; delete next[id]; return next }); await fetchFerpaIncidents() } else { showToast('Failed to update incident', 'error') } } catch { showToast('Failed to update incident', 'error') } finally { setUpdatingIncident(null) } }
  const fetchComplianceTests = async () => { setComplianceTestLoading(true); try { const res = await fetch('/api/admin/compliance-test', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setComplianceTestResults(await res.json()) } finally { setComplianceTestLoading(false) } }
  const handleGenerateAuditReport = async () => { setAuditGenerating(true); try { const res = await fetch('/api/admin/audit-report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ scope: 'full-compliance-audit' }) }); if (res.ok) { showToast('Audit report generated'); await fetchAuditReports() } else { showToast('Failed to generate report', 'error') } } catch { showToast('Failed to generate report', 'error') } finally { setAuditGenerating(false) } }
  const handleCreateWorkflow = async () => { if (!wfName || !wfActions.length) return; setWfSaving(true); try { const delays = wfDelays.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n)); const res = await fetch('/api/admin/compliance-workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ name: wfName, triggerEvent: wfTrigger, actions: wfActions, delayDays: delays.length > 0 ? delays : wfActions.map(() => 0) }) }); if (res.ok) { showToast('Workflow rule created'); setWfName(''); setWfActions([]); setWfDelays(''); await fetchWorkflowRules() } else { showToast('Failed to create rule', 'error') } } finally { setWfSaving(false) } }
  const handleToggleWorkflow = async (id: string, active: boolean) => { const res = await fetch(`/api/admin/compliance-workflows/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ active: !active }) }); if (res.ok) await fetchWorkflowRules() }
  const handleDeleteWorkflow = async (id: string) => { const res = await fetch(`/api/admin/compliance-workflows/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Rule deleted'); await fetchWorkflowRules() } }
  const handleDryRun = async (ruleId: string) => { setDryRunLoading((pp) => ({ ...pp, [ruleId]: true })); try { const res = await fetch(`/api/admin/compliance-workflows/${ruleId}/dry-run`, { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); setDryRunResults((pp) => ({ ...pp, [ruleId]: data.results ?? [] })); showToast('Dry run completed'); await fetchWorkflowExecs() } } catch { /* ignore */ } setDryRunLoading((pp) => ({ ...pp, [ruleId]: false })) }
  const handleCreateWebhook = async () => { if (!whUrl || !whSecret || !whEvents.length) return; setWhSaving(true); try { const res = await fetch('/api/admin/compliance-webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ url: whUrl, secret: whSecret, events: whEvents }) }); if (res.ok) { showToast('Webhook created'); setWhUrl(''); setWhSecret(''); setWhEvents([]); await fetchWebhooks() } else { showToast('Failed to create webhook', 'error') } } finally { setWhSaving(false) } }
  const handleDeleteWebhook = async (id: string) => { const res = await fetch(`/api/admin/compliance-webhooks/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Webhook deleted'); await fetchWebhooks() } }
  const handleSiemExport = async () => { setSiemExporting(true); try { const res = await fetch('/api/admin/compliance-export/siem', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (!res.ok) throw new Error('Failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'compliance-events.cef'; a.click(); URL.revokeObjectURL(url) } catch { showToast('SIEM export failed', 'error') } finally { setSiemExporting(false) } }
  const handleCsvExport = async () => { setCsvExporting(true); try { const res = await fetch('/api/admin/compliance-export/csv', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (!res.ok) throw new Error('Failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'compliance-users.csv'; a.click(); URL.revokeObjectURL(url) } catch { showToast('CSV export failed', 'error') } finally { setCsvExporting(false) } }
  const handleAssignRole = async () => { if (!crEmail || !crRole) return; setCrSaving(true); try { const res = await fetch('/api/admin/compliance-roles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ email: crEmail, role: crRole }) }); if (res.ok) { showToast('Role assigned'); setCrEmail(''); await fetchComplianceRoles() } else { const d = await res.json(); showToast(d.error || 'Failed', 'error') } } finally { setCrSaving(false) } }
  const handleRevokeRole = async (id: string) => { const res = await fetch(`/api/admin/compliance-roles/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Role revoked'); await fetchComplianceRoles() } }
  const handleCreateDoc = async () => { if (!cdTitle || !cdType) return; setCdSaving(true); try { const res = await fetch('/api/admin/compliance-documents', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ type: cdType, title: cdTitle, description: cdDesc || undefined, version: cdVersion || undefined, expiresAt: cdExpires || undefined, content: cdContent || undefined }) }); if (res.ok) { showToast('Document created'); setCdTitle(''); setCdDesc(''); setCdVersion(''); setCdExpires(''); setCdContent(''); await fetchComplianceDocs() } else { showToast('Failed to create document', 'error') } } finally { setCdSaving(false) } }
  const handleDeleteDoc = async (id: string) => { const res = await fetch(`/api/admin/compliance-documents/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Document deleted'); await fetchComplianceDocs() } }
  const handleSeedRequirements = async () => { setRegSeeding(true); try { const res = await fetch('/api/admin/regulatory-requirements', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ regulation: 'FERPA', articleRef: '34 CFR 99.3', title: 'Definition of Education Records', description: 'Platform must correctly classify education records.', featureMapping: ['sensitiveSession guard', 'FERPA training'], status: 'met' }) }); if (res.ok) { showToast('Seed requirement created — run seed script for full set'); await fetchRegMatrix() } } finally { setRegSeeding(false) } }
  const handleCreateTraining = async () => { if (!tmTitle || !tmDesc) return; setTmSaving(true); try { const res = await fetch('/api/admin/compliance-training', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ title: tmTitle, description: tmDesc, type: tmType, requiredForRoles: tmRoles, passingScore: parseInt(tmPassing, 10) || 80, content: { sections: [] } }) }); if (res.ok) { setTmTitle(''); setTmDesc(''); setTmType('ferpa'); setTmRoles(['EDUCATOR', 'ADMIN']); setTmPassing('80'); showToast('Training module created'); void fetchTrainingModules() } else showToast('Failed to create module', 'error') } finally { setTmSaving(false) } }
  const handleDeleteTraining = async (id: string) => { try { const res = await fetch(`/api/admin/compliance-training/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Module deleted'); void fetchTrainingModules() } } catch { showToast('Failed to delete module', 'error') } }
  const handleGenerateFromTemplate = async (templateId: string) => { setTemplateGenerating((pp) => ({ ...pp, [templateId]: true })); try { const res = await fetch('/api/admin/compliance-reports/generate-from-template', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ templateId }) }); if (res.ok) { const data = await res.json(); showToast(`Report generated (doc ID: ${data.documentId})`); void fetchComplianceDocs() } else { showToast('Failed to generate report', 'error') } } catch { showToast('Failed to generate report', 'error') } setTemplateGenerating((pp) => ({ ...pp, [templateId]: false })) }
  const handleSeedPlaybooks = async () => { setPbSeeding(true); try { const res = await fetch('/api/admin/incident-playbooks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ seed: true }) }); if (res.ok) { showToast('Default playbooks seeded'); await fetchPlaybooks() } } finally { setPbSeeding(false) } }
  const handleCreatePlaybook = async () => { if (!pbName) return; setPbSaving(true); try { const res = await fetch('/api/admin/incident-playbooks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ name: pbName, incidentType: pbType, severity: pbSeverity, steps: [{ order: 1, title: 'Initial Assessment', description: 'Assess and document the incident.', assignee: 'Compliance Officer', slaHours: 4 }], notifyRoles: ['ADMIN'] }) }); if (res.ok) { showToast('Playbook created'); setPbName(''); setPbFormOpen(false); await fetchPlaybooks() } } finally { setPbSaving(false) } }
  const handleDeletePlaybook = async (id: string) => { const res = await fetch(`/api/admin/incident-playbooks/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Playbook deleted'); await fetchPlaybooks() } }
  const handleSendComm = async () => { if (!ccSubject || !ccBody) return; setCcSaving(true); try { const res = await fetch('/api/admin/compliance-communications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ type: ccType, subject: ccSubject, body: ccBody, targetRoles: ccRoles, priority: ccPriority }) }); if (res.ok) { showToast('Communication sent'); setCcSubject(''); setCcBody(''); setCcFormOpen(false); await fetchCompComms() } } finally { setCcSaving(false) } }
  const handleCaptureSnapshot = async () => { setCapturingMetrics(true); try { const res = await fetch('/api/admin/compliance-metrics/capture', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Metric snapshot captured'); await fetchMetricHistory() } else showToast('Failed to capture snapshot', 'error') } finally { setCapturingMetrics(false) } }
  const handleExportMetrics = async () => { setExportingMetrics(true); try { const res = await fetch('/api/admin/compliance-metrics/export', { headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'compliance-metrics.csv'; a.click(); URL.revokeObjectURL(url) } } finally { setExportingMetrics(false) } }
  const handleCreateEvidence = async () => { if (!evTitle) return; setEvSaving(true); try { const res = await fetch('/api/admin/compliance-evidence', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ title: evTitle, evidenceType: evType, description: evDescription || undefined, requirementId: evReqId || undefined, tags: evTags ? evTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [] }) }); if (res.ok) { showToast('Evidence created'); setEvTitle(''); setEvDescription(''); setEvTags(''); setEvReqId(''); await fetchEvidenceItems() } else showToast('Failed to create evidence', 'error') } finally { setEvSaving(false) } }
  const handleDeleteEvidence = async (id: string) => { const res = await fetch(`/api/admin/compliance-evidence/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Evidence deleted'); await fetchEvidenceItems() } }
  const handleAutoCollect = async () => { setEvAutoCollecting(true); try { const res = await fetch('/api/admin/compliance-evidence/auto-collect', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { const data = await res.json(); showToast(`Collected ${data.count} evidence records`); await fetchEvidenceItems() } else showToast('Auto-collect failed', 'error') } finally { setEvAutoCollecting(false) } }
  const handleCreateVendorAssessment = async () => { if (!vaVendor) return; setVaSaving(true); try { const res = await fetch('/api/admin/vendor-assessments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ vendorName: vaVendor, riskLevel: vaRisk, overallScore: Number(vaScore), dataCategories: vaCategories ? vaCategories.split(',').map((s: string) => s.trim()).filter(Boolean) : [], securityMeasures: vaMeasures ? vaMeasures.split(',').map((s: string) => s.trim()).filter(Boolean) : [], nextReviewDate: vaNextReview || undefined }) }); if (res.ok) { showToast('Assessment created'); setVaVendor(''); setVaScore('50'); setVaCategories(''); setVaMeasures(''); setVaNextReview(''); await fetchVendorAssessments() } else showToast('Failed to create assessment', 'error') } finally { setVaSaving(false) } }
  const handleDeleteVendorAssessment = async (id: string) => { const res = await fetch(`/api/admin/vendor-assessments/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Assessment deleted'); await fetchVendorAssessments() } }
  const handleVerifyChain = async () => { setChainVerifyLoading(true); try { const res = await fetch('/api/admin/compliance-audit-chain/verify', { method: 'POST', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) setChainIntegrity(await res.json()) } finally { setChainVerifyLoading(false) } }
  const handleExportChain = async (fmt: 'json' | 'csv') => { const res = await fetch(`/api/admin/compliance-audit-chain/export?format=${fmt}`, { headers: { 'x-demo-user-email': currentUser.email } }); if (!res.ok) return; const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `audit-chain.${fmt}`; a.click(); URL.revokeObjectURL(url) }
  const handleSeedClassifications = async () => { setDcSeeding(true); try { const res = await fetch('/api/admin/data-classifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ seed: true }) }); if (res.ok) { showToast('Classifications seeded'); await fetchDataClassifications() } } finally { setDcSeeding(false) } }
  const handleCreateClassification = async () => { if (!dcAsset.trim()) return; setDcSaving(true); try { const res = await fetch('/api/admin/data-classifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ dataAsset: dcAsset.trim(), classificationLevel: dcLevel, ferpaProtected: dcFerpa, piiContained: dcPii, sensitivityTags: dcTags ? dcTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [], notes: dcNotes || undefined }) }); if (res.ok) { showToast('Classification created'); setDcAsset(''); setDcLevel('internal'); setDcFerpa(false); setDcPii(false); setDcTags(''); setDcNotes(''); setDcFormOpen(false); await fetchDataClassifications() } } finally { setDcSaving(false) } }
  const handleDeleteClassification = async (id: string) => { try { const res = await fetch(`/api/admin/data-classifications/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Classification deleted'); await fetchDataClassifications() } } catch { /* ignore */ } }
  const handleCreateReview = async () => { if (!arCycle.trim()) return; setArCreating(true); try { const res = await fetch('/api/admin/access-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ reviewCycle: arCycle.trim() }) }); if (res.ok) { showToast('Review created'); setArCycle(''); await fetchAccessReviews() } } finally { setArCreating(false) } }
  const handleAccessReviewAction = async (id: string, action: 'start' | 'complete') => { try { const res = await fetch(`/api/admin/access-reviews/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ action }) }); if (res.ok) { showToast(action === 'start' ? 'Review started' : 'Review completed'); await fetchAccessReviews() } } catch { /* ignore */ } }
  const handleDeleteReview = async (id: string) => { try { const res = await fetch(`/api/admin/access-reviews/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Review deleted'); await fetchAccessReviews() } } catch { /* ignore */ } }
  const handleCreateDelegation = async () => { if (!delDelegatorEmail.trim() || !delDelegateEmail.trim()) return; setDelSaving(true); try { const res = await fetch('/api/admin/compliance-delegations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ delegatorEmail: delDelegatorEmail, delegateEmail: delDelegateEmail, scope: delScope, reason: delReason || undefined }) }); if (res.ok) { setDelDelegatorEmail(''); setDelDelegateEmail(''); setDelReason(''); void fetchDelegations(); showToast('Delegation created') } else { const err = await res.json(); showToast(err.error || 'Failed to create delegation', 'error') } } finally { setDelSaving(false) } }
  const handleRevokeDelegation = async (id: string) => { try { const res = await fetch(`/api/admin/compliance-delegations/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { void fetchDelegations(); showToast('Delegation revoked') } } catch { showToast('Failed to revoke delegation', 'error') } }
  const handleApprovalAction = async (id: string, action: 'approve' | 'reject' | 'escalate') => { setApprovalActioning(id); try { const res = await fetch(`/api/admin/compliance-approvals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ action, comments: approvalComments[id] || undefined }) }); if (res.ok) { setApprovalComments((prev) => { const next = { ...prev }; delete next[id]; return next }); void fetchPendingApprovals(); showToast(`Request ${action}d`) } } finally { setApprovalActioning(null) } }
  const handleCreateApproval = async () => { if (!newApprovalDesc.trim()) return; setNewApprovalSaving(true); try { const res = await fetch('/api/admin/compliance-approvals', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ requestType: newApprovalType, requestData: { description: newApprovalDesc } }) }); if (res.ok) { setNewApprovalDesc(''); setApprovalFormOpen(false); void fetchPendingApprovals(); showToast('Approval request created') } } finally { setNewApprovalSaving(false) } }
  const handleCreateException = async () => { if (!excType || !excReason || !excValidUntil) return; setExcSaving(true); try { const res = await fetch('/api/admin/compliance-exceptions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ userEmail: excUserEmail || undefined, requirementId: excReqId || undefined, exceptionType: excType, reason: excReason, validUntil: excValidUntil }) }); if (res.ok) { showToast('Exception created'); setExcFormOpen(false); setExcUserEmail(''); setExcReqId(''); setExcType('waiver'); setExcReason(''); setExcValidUntil(''); void fetchExceptions() } else { const d = await res.json(); showToast(d.error || 'Failed', 'error') } } finally { setExcSaving(false) } }
  const handleRevokeException = async (id: string) => { try { const res = await fetch(`/api/admin/compliance-exceptions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ revokedReason: excRevokeReason }) }); if (res.ok) { showToast('Exception revoked'); setExcRevokeId(null); setExcRevokeReason(''); void fetchExceptions() } else { showToast('Failed to revoke', 'error') } } catch { showToast('Failed to revoke', 'error') } }
  const handleCreateTag = async () => { if (!newTagName.trim()) return; setTagSaving(true); try { const res = await fetch('/api/admin/compliance-tags', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }, body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }) }); if (res.ok) { showToast('Tag created'); setNewTagName(''); void fetchCompTags() } else { const d = await res.json(); showToast(d.error || 'Failed', 'error') } } finally { setTagSaving(false) } }
  const handleDeleteTag = async (id: string) => { try { const res = await fetch(`/api/admin/compliance-tags/${id}`, { method: 'DELETE', headers: { 'x-demo-user-email': currentUser.email } }); if (res.ok) { showToast('Tag deleted'); void fetchCompTags() } else { showToast('Failed to delete tag', 'error') } } catch { showToast('Failed to delete tag', 'error') } }

  // Return everything needed by the page and sub-components
  return {
    currentUser, stats, loading, activeTab, setActiveTab, actionLoading, deleteConfirm, setDeleteConfirm,
    toast, setToast, transcriptSession, setTranscriptSession,
    announcementTitle, setAnnouncementTitle, announcementMessage, setAnnouncementMessage,
    suspendingToolId, setSuspendingToolId, suspendReasonText, setSuspendReasonText,
    reviewTools, reviewToolsLoading, reviewActionLoading,
    featureFlags, flagsLoading, flagsLoaded,
    uknowStats, uknowStatsLoading, uknowStatsError,
    ingestLoading, ingestResult, backfillLoading, backfillResult,
    sentimentBackfillLoading, sentimentBackfillResult,
    queryStats, queryStatsLoading, deptHeatMap, deptHeatMapLoading,
    citationStats, citationStatsLoading,
    complianceUsers, complianceCounts, complianceLoading, complianceFilter, setComplianceFilter, complianceScores,
    auditLogEntries, auditLogOpen, setAuditLogOpen, auditLogLoading,
    resetTosLoading, resetTosConfirm, setResetTosConfirm,
    retentionPolicies, setRetentionPolicies, retentionLoading, retentionSaving,
    consentVersions, consentVersionsLoading,
    newVersionType, setNewVersionType, newVersionStr, setNewVersionStr,
    newVersionContent, setNewVersionContent, versionCreateConfirm, setVersionCreateConfirm, creatingVersion,
    dpas, dpaLoading, dpaFormOpen, setDpaFormOpen,
    dpaVendor, setDpaVendor, dpaPurpose, setDpaPurpose, dpaCategories, setDpaCategories,
    dpaSignedAt, setDpaSignedAt, dpaExpiresAt, setDpaExpiresAt, dpaDocUrl, setDpaDocUrl, dpaSaving,
    dsas, dsaLoading, dsaFormOpen, setDsaFormOpen,
    dsaPartner, setDsaPartner, dsaScope, setDsaScope, dsaLegalBasis, setDsaLegalBasis,
    dsaSignedAt, setDsaSignedAt, dsaExpiresAt, setDsaExpiresAt, dsaContact, setDsaContact, dsaSaving,
    policyDrift, policyDriftLoading,
    ferpaReminderEducators, ferpaRemindersLoading, ferpaBlastLoading, ferpaBlastResult,
    exportingReport, setExportingReport,
    ferpaIncidents, ferpaIncidentsLoading, incidentFormOpen, setIncidentFormOpen,
    incidentDesc, setIncidentDesc, incidentSeverity, setIncidentSeverity, incidentSaving,
    updatingIncident, resolutionText, setResolutionText,
    complianceTestResults, complianceTestLoading,
    auditReports, auditReportsLoading, auditGenerating, expandedReportId, setExpandedReportId,
    workflowRules, workflowsLoading,
    wfName, setWfName, wfTrigger, setWfTrigger, wfActions, setWfActions, wfDelays, setWfDelays, wfSaving,
    dryRunResults, dryRunLoading, workflowExecs, workflowExecsLoading,
    benchmarks, benchmarksLoading,
    reportTemplates, templatesLoading, templateGenerating,
    webhooks, webhooksLoading, whUrl, setWhUrl, whSecret, setWhSecret, whEvents, setWhEvents, whSaving,
    siemExporting, csvExporting,
    compRoles, compRolesLoading, crEmail, setCrEmail, crRole, setCrRole, crSaving,
    compDocs, compDocsLoading,
    cdType, setCdType, cdTitle, setCdTitle, cdDesc, setCdDesc, cdVersion, setCdVersion,
    cdExpires, setCdExpires, cdContent, setCdContent, cdSaving,
    regMatrix, regMatrixLoading, regSeeding, allRegRequirements,
    trainingModules, trainingLoading,
    tmTitle, setTmTitle, tmDesc, setTmDesc, tmType, setTmType,
    tmRoles, setTmRoles, tmPassing, setTmPassing, tmSaving, tmStats,
    riskData, riskLoading,
    playbooks, playbooksLoading, pbName, setPbName, pbType, setPbType, pbSeverity, setPbSeverity,
    pbFormOpen, setPbFormOpen, pbSaving, pbSeeding,
    compComms, compCommsLoading, ccFormOpen, setCcFormOpen,
    ccType, setCcType, ccSubject, setCcSubject, ccBody, setCcBody,
    ccRoles, setCcRoles, ccPriority, setCcPriority, ccSaving,
    metricHistory, metricHistoryLoading, capturingMetrics, exportingMetrics,
    evidenceItems, evidenceLoading, evFormOpen, setEvFormOpen,
    evTitle, setEvTitle, evType, setEvType, evDescription, setEvDescription,
    evTags, setEvTags, evReqId, setEvReqId, evSaving, evAutoCollecting,
    vendorAssessments, vendorLoading, vaFormOpen, setVaFormOpen,
    vaVendor, setVaVendor, vaRisk, setVaRisk, vaScore, setVaScore,
    vaCategories, setVaCategories, vaMeasures, setVaMeasures, vaNextReview, setVaNextReview, vaSaving,
    auditChainEntries, auditChainLoading, chainIntegrity, chainVerifyLoading,
    policyAcceptanceStats, policyAcceptanceLoading,
    dcItems, dcSummary, dcLoading, dcSeeding, dcFormOpen, setDcFormOpen,
    dcAsset, setDcAsset, dcLevel, setDcLevel, dcFerpa, setDcFerpa,
    dcPii, setDcPii, dcTags, setDcTags, dcNotes, setDcNotes, dcSaving,
    arItems, arLoading, arCycle, setArCycle, arCreating, arExpandedId, setArExpandedId,
    healthResult, healthLoading,
    delegations, delegationsLoading,
    delDelegatorEmail, setDelDelegatorEmail, delDelegateEmail, setDelDelegateEmail,
    delScope, setDelScope, delReason, setDelReason, delSaving,
    pendingApprovals, approvalsLoading, approvalComments, setApprovalComments,
    approvalActioning, approvalFormOpen, setApprovalFormOpen,
    newApprovalType, setNewApprovalType, newApprovalDesc, setNewApprovalDesc, newApprovalSaving,
    integrations, integrationsLoading,
    exceptions, exceptionsLoading, expiringExceptions,
    excFormOpen, setExcFormOpen, excUserEmail, setExcUserEmail, excReqId, setExcReqId,
    excType, setExcType, excReason, setExcReason, excValidUntil, setExcValidUntil, excSaving,
    excRevokeId, setExcRevokeId, excRevokeReason, setExcRevokeReason,
    compTags, compTagsLoading, newTagName, setNewTagName, newTagColor, setNewTagColor, tagSaving,
    activityFeed, activityLoading, activityLimit, setActivityLimit,
    // Handlers
    handleToolAction, handleViewTranscript, handleToggleFlag, handleAnnouncementCreate,
    handleReviewAction, handleTriggerIngest, handleBackfill,
    handleSentimentBackfill, handleStopSentimentBackfill,
    handleResetTos, handleRetentionUpdate, handleCreateConsentVersion,
    handleCreateDPA, handleDeleteDPA, handleCreateDSA, handleDeleteDSA,
    handleSendFerpaBlast, handleCreateIncident, handleUpdateIncident,
    fetchComplianceTests, handleGenerateAuditReport,
    handleCreateWorkflow, handleToggleWorkflow, handleDeleteWorkflow, handleDryRun,
    handleCreateWebhook, handleDeleteWebhook, handleSiemExport, handleCsvExport,
    handleAssignRole, handleRevokeRole, handleCreateDoc, handleDeleteDoc,
    handleSeedRequirements, handleCreateTraining, handleDeleteTraining,
    handleGenerateFromTemplate, handleSeedPlaybooks, handleCreatePlaybook, handleDeletePlaybook,
    handleSendComm, handleCaptureSnapshot, handleExportMetrics,
    handleCreateEvidence, handleDeleteEvidence, handleAutoCollect,
    handleCreateVendorAssessment, handleDeleteVendorAssessment,
    handleVerifyChain, handleExportChain,
    handleSeedClassifications, handleCreateClassification, handleDeleteClassification,
    handleCreateReview, handleAccessReviewAction, handleDeleteReview,
    fetchHealthCheck, handleCreateDelegation, handleRevokeDelegation,
    handleApprovalAction, handleCreateApproval, fetchIntegrationStatus,
    handleCreateException, handleRevokeException, handleCreateTag, handleDeleteTag,
    fetchActivityFeed, showToast,
  }
}
