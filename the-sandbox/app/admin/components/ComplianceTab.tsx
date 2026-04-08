'use client'

import type React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Activity, AlertTriangle, ArrowRightLeft, BarChart2, Calendar,
  CheckCircle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck,
  Clock, Database, Download, FileText, Fingerprint, GraduationCap,
  Loader2, Megaphone, MessageSquare, Play, Plus, RefreshCw, Send,
  Shield, ShieldX, Tag, Trash2, TrendingUp, UserCog, Wifi, X, XCircle, Zap,
} from 'lucide-react'
import type {
  ComplianceCounts, ComplianceUser, AuditLogEntry, RetentionPolicy,
  ConsentVersionRecord, DPARecord, DSARecord, PolicyDriftItem,
  FerpaReminderEducator, FerpaIncidentRecord, ComplianceTestSuite,
  AuditReportRecord, WorkflowRuleRecord, DryRunItem, ExecutionItem,
  BenchmarkItem, TemplateItem, PlaybookItem, CommItem, MetricSnap,
  EvidenceItem, VendorAssessmentItem, AuditChainEntry, ChainIntegrity,
  PolicyAcceptanceStat, DataClassificationItem, ClassificationSummary,
  AccessReviewItem, HealthResult, DelegationItem, ApprovalItem,
  IntegrationItem, ExceptionItem, TagItem, ActivityItem,
  WebhookRecord, ComplianceRoleAssignment, ComplianceDoc, RegReq,
  RegMatrix, TrainingModule, RiskResult,
} from './types'
import ComplianceTabExtended from './ComplianceTabExtended'

export interface ComplianceTabProps {
  currentUserEmail: string
  // Risk
  riskLoading: boolean; riskData: RiskResult | null
  // Compliance stats
  complianceLoading: boolean; complianceCounts: ComplianceCounts | null
  complianceUsers: ComplianceUser[]; complianceScores: Record<string, number>
  complianceFilter: 'all' | 'missing-tos' | 'missing-consent' | 'missing-ferpa'
  setComplianceFilter: (f: 'all' | 'missing-tos' | 'missing-consent' | 'missing-ferpa') => void
  // Audit log
  auditLogEntries: AuditLogEntry[]; auditLogOpen: boolean; setAuditLogOpen: (v: boolean) => void; auditLogLoading: boolean
  // Retention
  retentionPolicies: RetentionPolicy[]; retentionLoading: boolean; retentionSaving: string | null
  setRetentionPolicies: React.Dispatch<React.SetStateAction<RetentionPolicy[]>>
  handleRetentionUpdate: (id: string, field: string, value: number | string | boolean) => void
  // Consent versions
  consentVersions: Record<string, ConsentVersionRecord[]>; consentVersionsLoading: boolean
  newVersionType: 'tos' | 'consent' | 'ferpa'; setNewVersionType: (v: 'tos' | 'consent' | 'ferpa') => void
  newVersionStr: string; setNewVersionStr: (v: string) => void
  newVersionContent: string; setNewVersionContent: (v: string) => void
  versionCreateConfirm: boolean; setVersionCreateConfirm: (v: boolean) => void
  creatingVersion: boolean; handleCreateConsentVersion: () => void
  // DPAs
  dpas: DPARecord[]; dpaLoading: boolean; dpaFormOpen: boolean; setDpaFormOpen: (v: boolean) => void
  dpaVendor: string; setDpaVendor: (v: string) => void
  dpaPurpose: string; setDpaPurpose: (v: string) => void
  dpaCategories: string; setDpaCategories: (v: string) => void
  dpaSignedAt: string; setDpaSignedAt: (v: string) => void
  dpaExpiresAt: string; setDpaExpiresAt: (v: string) => void
  dpaDocUrl: string; setDpaDocUrl: (v: string) => void
  dpaSaving: boolean; handleCreateDPA: () => void; handleDeleteDPA: (id: string) => void
  // DSAs
  dsas: DSARecord[]; dsaLoading: boolean; dsaFormOpen: boolean; setDsaFormOpen: (v: boolean) => void
  dsaPartner: string; setDsaPartner: (v: string) => void
  dsaScope: string; setDsaScope: (v: string) => void
  dsaLegalBasis: string; setDsaLegalBasis: (v: string) => void
  dsaSignedAt: string; setDsaSignedAt: (v: string) => void
  dsaExpiresAt: string; setDsaExpiresAt: (v: string) => void
  dsaContact: string; setDsaContact: (v: string) => void
  dsaSaving: boolean; handleCreateDSA: () => void; handleDeleteDSA: (id: string) => void
  // Policy drift
  policyDrift: PolicyDriftItem[]; policyDriftLoading: boolean
  // TOS reset
  resetTosConfirm: boolean; setResetTosConfirm: (v: boolean) => void
  resetTosLoading: boolean; handleResetTos: () => void
  // FERPA incidents
  ferpaIncidents: FerpaIncidentRecord[]; ferpaIncidentsLoading: boolean
  incidentFormOpen: boolean; setIncidentFormOpen: (v: boolean) => void
  incidentDesc: string; setIncidentDesc: (v: string) => void
  incidentSeverity: 'low' | 'medium' | 'high' | 'critical'; setIncidentSeverity: (v: 'low' | 'medium' | 'high' | 'critical') => void
  incidentSaving: boolean; handleCreateIncident: () => void
  updatingIncident: string | null
  resolutionText: Record<string, string>; setResolutionText: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleUpdateIncident: (id: string, status: string) => void
  // FERPA reminders
  ferpaReminderEducators: FerpaReminderEducator[]; ferpaRemindersLoading: boolean
  ferpaBlastLoading: boolean; ferpaBlastResult: { sent: number; skipped: number; total: number } | null
  handleSendFerpaBlast: () => void
  // Compliance tests
  complianceTestResults: ComplianceTestSuite | null; complianceTestLoading: boolean
  fetchComplianceTests: () => void
  // Export report
  exportingReport: boolean; setExportingReport: (v: boolean) => void
  setToast: (t: { message: string; type: 'success' | 'error' } | null) => void
  // Audit reports
  auditReports: AuditReportRecord[]; auditReportsLoading: boolean
  auditGenerating: boolean; handleGenerateAuditReport: () => void
  expandedReportId: string | null; setExpandedReportId: (id: string | null) => void
  // Workflows
  workflowRules: WorkflowRuleRecord[]; workflowsLoading: boolean
  wfName: string; setWfName: (v: string) => void
  wfTrigger: string; setWfTrigger: (v: string) => void
  wfActions: string[]; setWfActions: React.Dispatch<React.SetStateAction<string[]>>
  wfDelays: string; setWfDelays: (v: string) => void
  wfSaving: boolean; handleCreateWorkflow: () => void
  handleToggleWorkflow: (id: string, active: boolean) => void
  handleDeleteWorkflow: (id: string) => void
  // Workflow executions
  dryRunResults: Record<string, DryRunItem[]>; dryRunLoading: Record<string, boolean>
  handleDryRun: (ruleId: string) => void
  workflowExecs: ExecutionItem[]; workflowExecsLoading: boolean
  // Webhooks
  webhooks: WebhookRecord[]; webhooksLoading: boolean
  whUrl: string; setWhUrl: (v: string) => void
  whSecret: string; setWhSecret: (v: string) => void
  whEvents: string[]; setWhEvents: React.Dispatch<React.SetStateAction<string[]>>
  whSaving: boolean; handleCreateWebhook: () => void; handleDeleteWebhook: (id: string) => void
  // SIEM/CSV
  siemExporting: boolean; handleSiemExport: () => void
  csvExporting: boolean; handleCsvExport: () => void
  // Compliance roles
  compRoles: ComplianceRoleAssignment[]; compRolesLoading: boolean
  crEmail: string; setCrEmail: (v: string) => void
  crRole: string; setCrRole: (v: string) => void
  crSaving: boolean; handleAssignRole: () => void; handleRevokeRole: (id: string) => void
  // Compliance docs
  compDocs: ComplianceDoc[]; compDocsLoading: boolean
  cdType: string; setCdType: (v: string) => void
  cdTitle: string; setCdTitle: (v: string) => void
  cdDesc: string; setCdDesc: (v: string) => void
  cdVersion: string; setCdVersion: (v: string) => void
  cdExpires: string; setCdExpires: (v: string) => void
  cdContent: string; setCdContent: (v: string) => void
  cdSaving: boolean; handleCreateDoc: () => void; handleDeleteDoc: (id: string) => void
  // Reg matrix
  regMatrix: RegMatrix | null; regMatrixLoading: boolean
  regSeeding: boolean; handleSeedRequirements: () => void
  allRegRequirements: RegReq[]
  // Training
  trainingModules: TrainingModule[]; trainingLoading: boolean
  tmTitle: string; setTmTitle: (v: string) => void
  tmDesc: string; setTmDesc: (v: string) => void
  tmType: string; setTmType: (v: string) => void
  tmRoles: string[]; setTmRoles: React.Dispatch<React.SetStateAction<string[]>>
  tmPassing: string; setTmPassing: (v: string) => void
  tmSaving: boolean; handleCreateTraining: () => void; handleDeleteTraining: (id: string) => void
  tmStats: Record<string, { eligibleUsers: number; completed: number; passed: number; completionRate: number; passRate: number }>
  // Benchmarks
  benchmarks: BenchmarkItem[]; benchmarksLoading: boolean
  // Templates
  reportTemplates: TemplateItem[]; templatesLoading: boolean
  templateGenerating: Record<string, boolean>; handleGenerateFromTemplate: (id: string) => void
  // Playbooks
  playbooks: PlaybookItem[]; playbooksLoading: boolean
  pbName: string; setPbName: (v: string) => void
  pbType: string; setPbType: (v: string) => void
  pbSeverity: string; setPbSeverity: (v: string) => void
  pbFormOpen: boolean; setPbFormOpen: (v: boolean) => void
  pbSaving: boolean; pbSeeding: boolean
  handleCreatePlaybook: () => void; handleDeletePlaybook: (id: string) => void; handleSeedPlaybooks: () => void
  // Communications
  compComms: CommItem[]; compCommsLoading: boolean
  ccFormOpen: boolean; setCcFormOpen: (v: boolean) => void
  ccType: string; setCcType: (v: string) => void
  ccSubject: string; setCcSubject: (v: string) => void
  ccBody: string; setCcBody: (v: string) => void
  ccRoles: string[]; setCcRoles: React.Dispatch<React.SetStateAction<string[]>>
  ccPriority: string; setCcPriority: (v: string) => void
  ccSaving: boolean; handleSendComm: () => void
  // Metric tracking
  metricHistory: Record<string, MetricSnap[]>; metricHistoryLoading: boolean
  capturingMetrics: boolean; handleCaptureSnapshot: () => void
  exportingMetrics: boolean; handleExportMetrics: () => void
  // Evidence
  evidenceItems: EvidenceItem[]; evidenceLoading: boolean
  evFormOpen: boolean; setEvFormOpen: (v: boolean) => void
  evTitle: string; setEvTitle: (v: string) => void
  evType: string; setEvType: (v: string) => void
  evDescription: string; setEvDescription: (v: string) => void
  evTags: string; setEvTags: (v: string) => void
  evReqId: string; setEvReqId: (v: string) => void
  evSaving: boolean; handleCreateEvidence: () => void; handleDeleteEvidence: (id: string) => void
  evAutoCollecting: boolean; handleAutoCollect: () => void
  // Vendor assessments
  vendorAssessments: VendorAssessmentItem[]; vendorLoading: boolean
  vaFormOpen: boolean; setVaFormOpen: (v: boolean) => void
  vaVendor: string; setVaVendor: (v: string) => void
  vaRisk: string; setVaRisk: (v: string) => void
  vaScore: string; setVaScore: (v: string) => void
  vaCategories: string; setVaCategories: (v: string) => void
  vaMeasures: string; setVaMeasures: (v: string) => void
  vaNextReview: string; setVaNextReview: (v: string) => void
  vaSaving: boolean; handleCreateVendorAssessment: () => void; handleDeleteVendorAssessment: (id: string) => void
  // Audit chain
  auditChainEntries: AuditChainEntry[]; auditChainLoading: boolean
  chainIntegrity: ChainIntegrity | null; chainVerifyLoading: boolean
  handleVerifyChain: () => void; handleExportChain: (fmt: 'json' | 'csv') => void
  // Policy acceptance
  policyAcceptanceStats: PolicyAcceptanceStat[]; policyAcceptanceLoading: boolean
  // Data classification
  dcItems: DataClassificationItem[]; dcSummary: ClassificationSummary | null; dcLoading: boolean
  dcSeeding: boolean; handleSeedClassifications: () => void
  dcFormOpen: boolean; setDcFormOpen: (v: boolean) => void
  dcAsset: string; setDcAsset: (v: string) => void
  dcLevel: string; setDcLevel: (v: string) => void
  dcFerpa: boolean; setDcFerpa: (v: boolean) => void
  dcPii: boolean; setDcPii: (v: boolean) => void
  dcTags: string; setDcTags: (v: string) => void
  dcNotes: string; setDcNotes: (v: string) => void
  dcSaving: boolean; handleCreateClassification: () => void; handleDeleteClassification: (id: string) => void
  // Access reviews
  arItems: AccessReviewItem[]; arLoading: boolean
  arCycle: string; setArCycle: (v: string) => void
  arCreating: boolean; handleCreateReview: () => void
  arExpandedId: string | null; setArExpandedId: (v: string | null) => void
  handleAccessReviewAction: (id: string, action: 'start' | 'complete') => void
  handleDeleteReview: (id: string) => void
  // Health
  healthResult: HealthResult | null; healthLoading: boolean; fetchHealthCheck: () => void
  // Delegations
  delegations: DelegationItem[]; delegationsLoading: boolean
  delDelegatorEmail: string; setDelDelegatorEmail: (v: string) => void
  delDelegateEmail: string; setDelDelegateEmail: (v: string) => void
  delScope: string; setDelScope: (v: string) => void
  delReason: string; setDelReason: (v: string) => void
  delSaving: boolean; handleCreateDelegation: () => void; handleRevokeDelegation: (id: string) => void
  // Approvals
  pendingApprovals: ApprovalItem[]; approvalsLoading: boolean
  approvalComments: Record<string, string>; setApprovalComments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  approvalActioning: string | null; handleApprovalAction: (id: string, action: 'approve' | 'reject' | 'escalate') => void
  approvalFormOpen: boolean; setApprovalFormOpen: (v: boolean) => void
  newApprovalType: string; setNewApprovalType: (v: string) => void
  newApprovalDesc: string; setNewApprovalDesc: (v: string) => void
  newApprovalSaving: boolean; handleCreateApproval: () => void
  // Integrations
  integrations: IntegrationItem[]; integrationsLoading: boolean; fetchIntegrationStatus: () => void
  // Exceptions
  exceptions: ExceptionItem[]; exceptionsLoading: boolean; expiringExceptions: ExceptionItem[]
  excFormOpen: boolean; setExcFormOpen: (v: boolean) => void
  excUserEmail: string; setExcUserEmail: (v: string) => void
  excReqId: string; setExcReqId: (v: string) => void
  excType: string; setExcType: (v: string) => void
  excReason: string; setExcReason: (v: string) => void
  excValidUntil: string; setExcValidUntil: (v: string) => void
  excSaving: boolean; handleCreateException: () => void
  excRevokeId: string | null; setExcRevokeId: (v: string | null) => void
  excRevokeReason: string; setExcRevokeReason: (v: string) => void
  handleRevokeException: (id: string) => void
  // Tags
  compTags: TagItem[]; compTagsLoading: boolean
  newTagName: string; setNewTagName: (v: string) => void
  newTagColor: string; setNewTagColor: (v: string) => void
  tagSaving: boolean; handleCreateTag: () => void; handleDeleteTag: (id: string) => void
  // Activity
  activityFeed: ActivityItem[]; activityLoading: boolean; activityLimit: number
  setActivityLimit: (v: number) => void; fetchActivityFeed: (limit?: number) => void
}

// This file is intentionally large — it's a 1:1 extraction of the compliance tab JSX.
// Further decomposition into sub-sections is possible but deferred to keep this refactor safe.

export default function ComplianceTab(p: ComplianceTabProps) {
  return (
    <div className="space-y-6">
      {/* Compliance Portal link */}
      <Link
        href="/admin/compliance-portal"
        className="inline-flex items-center gap-2 text-sm font-semibold text-uk-blue hover:underline"
      >
        <Shield className="size-4" />
        Compliance Portal
        <ChevronDown className="size-3 -rotate-90" />
      </Link>
      {/* Institutional Risk Score */}
      {p.riskLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      ) : p.riskData ? (
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Institutional Risk</h2>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex flex-col items-center shrink-0">
              <div className={`relative flex items-center justify-center rounded-full border-4 ${p.riskData.overallScore >= 80 ? 'border-emerald-400' : p.riskData.overallScore >= 50 ? 'border-amber-400' : 'border-red-400'}`} style={{ width: 96, height: 96 }}>
                <span className={`text-3xl font-extrabold ${p.riskData.overallScore >= 80 ? 'text-emerald-600' : p.riskData.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p.riskData.overallScore}</span>
              </div>
              <span className={`mt-2 rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${
                p.riskData.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700'
                : p.riskData.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700'
                : p.riskData.riskLevel === 'high' ? 'bg-orange-100 text-orange-700'
                : 'bg-red-100 text-red-700'
              }`}>{p.riskData.riskLevel} risk</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 flex-1">
              {p.riskData.breakdown.map((item) => (
                <div key={item.category} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500">{item.category}</span>
                    <span className={`text-sm font-bold ${item.score >= 80 ? 'text-emerald-600' : item.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{item.score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 mb-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${item.score >= 80 ? 'bg-emerald-400' : item.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${item.score}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* View Compliance Summary link */}
      <div className="flex justify-end">
        <Link href="/admin/compliance-summary" className="inline-flex items-center gap-1.5 rounded-xl border border-uk-blue px-4 py-2 text-sm font-semibold hover:bg-blue-50" style={{ color: '#0033A0' }}>
          <BarChart2 className="size-4" />
          View Compliance Summary &rarr;
        </Link>
      </div>

      {/* Stat cards */}
      {p.complianceLoading && (
        <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
      )}
      {p.complianceCounts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'TOS Accepted', accepted: p.complianceCounts.tosAccepted, total: p.complianceCounts.total },
            { label: 'Data Consent', accepted: p.complianceCounts.consentAccepted, total: p.complianceCounts.total },
            { label: 'FERPA Acknowledged', accepted: p.complianceCounts.ferpaAcknowledged, total: p.complianceCounts.total },
          ].map((card) => {
            const pct = card.total > 0 ? Math.round((card.accepted / card.total) * 100) : 0
            return (
              <div key={card.label} className="rounded-2xl border-2 border-gray-200 bg-white p-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{pct}%</div>
                <div className="mt-1 text-xs text-gray-400">{card.accepted} of {card.total} users</div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-uk-blue" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Warning cards */}
      {p.complianceCounts && (p.complianceCounts.consentExpiringSoon > 0 || p.complianceCounts.ferpaRenewalNeeded > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {p.complianceCounts.consentExpiringSoon > 0 && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Consent Expiring Soon</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-900">{p.complianceCounts.consentExpiringSoon}</div>
              <div className="mt-1 text-xs text-amber-600">Users within 30 days of consent expiry</div>
            </div>
          )}
          {p.complianceCounts.ferpaRenewalNeeded > 0 && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">FERPA Renewal Needed</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-red-900">{p.complianceCounts.ferpaRenewalNeeded}</div>
              <div className="mt-1 text-xs text-red-600">Educators/admins with FERPA ack older than 1 year</div>
            </div>
          )}
        </div>
      )}

      {/* Policy Drift Detection */}
      {p.policyDriftLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
      ) : p.policyDrift.some((d) => d.driftDetected) ? (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-5 text-amber-600" />
            <h2 className="text-sm font-extrabold text-amber-900 uppercase tracking-wide">Policy Drift Detected</h2>
          </div>
          <div className="space-y-2">
            {p.policyDrift.filter((d) => d.driftDetected).map((d) => (
              <div key={d.type} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase shrink-0">
                  {d.type === 'tos' ? 'TOS' : d.type === 'consent' ? 'Privacy' : 'FERPA'}
                </span>
                <span>{d.summary}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-amber-600">Update consent version to match current policy, or update the policy pages to match the latest version.</p>
        </div>
      ) : p.policyDrift.length > 0 ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">All policy pages match their latest consent versions</span>
          </div>
        </div>
      ) : null}

      {/* Export Report + Compliance Reports link */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            p.setExportingReport(true)
            fetch('/api/admin/compliance-report/export', {
              method: 'POST',
              headers: { 'x-demo-user-email': p.currentUserEmail },
            })
              .then(async (r) => {
                if (!r.ok) throw new Error('Export failed')
                const blob = await r.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'compliance-report.html'; a.click()
                URL.revokeObjectURL(url)
              })
              .catch(() => p.setToast({ message: 'Failed to export report', type: 'error' }))
              .finally(() => p.setExportingReport(false))
          }}
          disabled={p.exportingReport}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#0033A0' }}
        >
          {p.exportingReport ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          Export Report
        </button>
        <Link href="/admin/compliance-reports" className="inline-flex items-center gap-1.5 rounded-xl border border-uk-blue px-4 py-2 text-sm font-semibold hover:bg-blue-50" style={{ color: '#0033A0' }}>
          <TrendingUp className="size-4" />
          Compliance Reports &amp; Export
        </Link>
      </div>

      {/* ===== Remaining compliance sections ===== */}
      {/* Due to the massive size, the rest of the compliance tab sections are rendered below.
          Each section is preserved exactly as in the original page.tsx. */}

      {/* Consent Versions */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Consent Versions</h2>
        {p.consentVersionsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            {(['tos', 'consent', 'ferpa'] as const).map((t) => {
              const items = p.consentVersions[t] ?? []
              return (
                <div key={t}>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                    {t === 'tos' ? 'Terms of Service' : t === 'consent' ? 'Data Consent' : 'FERPA'}
                  </h3>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 mb-2">No versions created yet.</p>
                  ) : (
                    <div className="space-y-1 mb-2">
                      {items.slice(0, 3).map((v) => (
                        <div key={v.id} className="flex items-center gap-3 text-sm">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">v{v.version}</span>
                          <span className="text-xs text-gray-500">Effective {format(new Date(v.effectiveAt), 'MMM d, yyyy')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Create New Version</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                  <select value={p.newVersionType} onChange={(e) => p.setNewVersionType(e.target.value as 'tos' | 'consent' | 'ferpa')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="tos">Terms of Service</option>
                    <option value="consent">Data Consent</option>
                    <option value="ferpa">FERPA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Version</label>
                  <input type="text" placeholder="e.g. 2.0" value={p.newVersionStr} onChange={(e) => p.setNewVersionStr(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
                <textarea rows={4} placeholder="Full text of the updated policy..." value={p.newVersionContent} onChange={(e) => p.setNewVersionContent(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              {!p.versionCreateConfirm ? (
                <button type="button" disabled={!p.newVersionStr.trim() || !p.newVersionContent.trim()} onClick={() => p.setVersionCreateConfirm(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
                  <FileText className="size-4" />
                  Publish New Version
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700 flex-1">
                    Publishing will <span className="font-bold">reset all users&apos; {p.newVersionType === 'tos' ? 'TOS acceptance' : p.newVersionType === 'consent' ? 'data consent' : 'FERPA acknowledgement'}</span> — they will need to re-accept on next visit.
                  </p>
                  <button type="button" onClick={() => void p.handleCreateConsentVersion()} disabled={p.creatingVersion} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#0033A0' }}>
                    {p.creatingVersion ? <Loader2 className="size-4 animate-spin" /> : null}
                    Confirm Publish
                  </button>
                  <button type="button" onClick={() => p.setVersionCreateConfirm(false)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* NOTE: The remaining ~2000 lines of compliance sections are intentionally included
          via a separate render function to keep this file manageable during code review.
          Each section below follows the exact same pattern as the original page.tsx. */}

      {/* Data Retention, User Compliance, Audit Log, DPAs, DSAs, TOS Reset,
          FERPA Incidents, FERPA Training, Compliance Tests, Dashboard link,
          Workflows, External Integrations, Compliance Roles, Documents,
          Regulatory Mapping, Audit Reports, Training, Benchmarks, Templates,
          Playbooks, Communications, Metric Tracking, Evidence, Vendor Assessments,
          Audit Chain, Policy Acceptance, System Health, Data Classification,
          Access Reviews, Delegations & Approvals, Integration Status,
          Exceptions & Waivers, Tags, Activity Feed, Compliance Calendar link */}
      <ComplianceTabSections {...p} />

      {/* View Compliance Calendar link */}
      <div className="flex justify-end">
        <Link href="/admin/compliance-calendar" className="inline-flex items-center gap-1.5 rounded-xl border border-uk-blue px-4 py-2 text-sm font-semibold hover:bg-blue-50" style={{ color: '#0033A0' }}>
          <Calendar className="size-4" />
          View Compliance Calendar &rarr;
        </Link>
      </div>
    </div>
  )
}

// Split out the remaining compliance sections to keep the main component more readable
function ComplianceTabSections(p: ComplianceTabProps) {
  return (
    <>
      {/* Data Retention Policies */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Data Retention Policies</h2>
        {p.retentionLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.retentionPolicies.length === 0 ? (
          <p className="text-sm text-gray-500">No retention policies configured. Run the seed script to create defaults.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">Policy</th>
                  <th className="pb-2 pr-4 font-semibold">Category</th>
                  <th className="pb-2 pr-4 font-semibold">Retention (days)</th>
                  <th className="pb-2 pr-4 font-semibold">Action</th>
                  <th className="pb-2 font-semibold text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {p.retentionPolicies.map((pol) => (
                  <tr key={pol.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{pol.policyName}</td>
                    <td className="py-2.5 pr-4"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{pol.dataCategory}</span></td>
                    <td className="py-2.5 pr-4">
                      <input type="number" min={1} value={pol.retentionDays}
                        onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val) && val > 0) p.setRetentionPolicies((prev) => prev.map((x) => (x.id === pol.id ? { ...x, retentionDays: val } : x))) }}
                        onBlur={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val) && val > 0) void p.handleRetentionUpdate(pol.id, 'retentionDays', val) }}
                        className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900" />
                    </td>
                    <td className="py-2.5 pr-4">
                      <select value={pol.action} onChange={(e) => void p.handleRetentionUpdate(pol.id, 'action', e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900">
                        <option value="anonymize">Anonymize</option>
                        <option value="delete">Delete</option>
                        <option value="archive">Archive</option>
                      </select>
                    </td>
                    <td className="py-2.5 text-center">
                      <button type="button" onClick={() => void p.handleRetentionUpdate(pol.id, 'active', !pol.active)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${pol.active ? 'bg-uk-blue' : 'bg-gray-300'}`}>
                        <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${pol.active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                      {p.retentionSaving === pol.id && <Loader2 className="ml-1 inline size-3 animate-spin text-gray-400" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* User compliance table */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-extrabold text-gray-900">User Compliance Status</h2>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'all', label: 'All Users' }, { key: 'missing-tos', label: 'Missing TOS' }, { key: 'missing-consent', label: 'Missing Consent' }, { key: 'missing-ferpa', label: 'Missing FERPA' }] as const).map((f) => (
              <button key={f.key} type="button" onClick={() => p.setComplianceFilter(f.key)} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.complianceFilter === f.key ? 'bg-uk-blue text-white' : 'border border-gray-200 text-gray-600 hover:border-uk-blue'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-4 font-semibold">User</th>
                <th className="pb-2 pr-4 font-semibold">Role</th>
                <th className="pb-2 pr-4 font-semibold text-center">Score</th>
                <th className="pb-2 pr-4 font-semibold text-center">TOS</th>
                <th className="pb-2 pr-4 font-semibold text-center">Data Consent</th>
                <th className="pb-2 font-semibold text-center">FERPA</th>
              </tr>
            </thead>
            <tbody>
              {p.complianceUsers.filter((u) => {
                if (p.complianceFilter === 'missing-tos') return !u.tosAcceptedAt
                if (p.complianceFilter === 'missing-consent') return !u.dataConsentAt
                if (p.complianceFilter === 'missing-ferpa') return !u.ferpaAckAt
                return true
              }).map((u) => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4"><div className="font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-400">{u.email}</div></td>
                  <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'EDUCATOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                  <td className="py-2.5 pr-4 text-center">{(() => { const s = p.complianceScores[u.id]; if (s == null) return <span className="text-xs text-gray-300">—</span>; const bg = s >= 80 ? 'bg-emerald-100 text-emerald-700' : s >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bg}`}>{s}</span> })()}</td>
                  <td className="py-2.5 pr-4 text-center">{u.tosAcceptedAt ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : <XCircle className="mx-auto size-4 text-red-400" />}</td>
                  <td className="py-2.5 pr-4 text-center">{u.dataConsentAt ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : <XCircle className="mx-auto size-4 text-red-400" />}</td>
                  <td className="py-2.5 text-center">{u.ferpaAckAt ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : <XCircle className="mx-auto size-4 text-red-400" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Compliance Audit Log */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <button type="button" onClick={() => p.setAuditLogOpen(!p.auditLogOpen)} className="flex w-full items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">Recent Compliance Audit Log</h2>
          {p.auditLogOpen ? <ChevronUp className="size-5 text-gray-400" /> : <ChevronDown className="size-5 text-gray-400" />}
        </button>
        {p.auditLogOpen && (
          <div className="mt-4">
            {p.auditLogLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
            ) : p.auditLogEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No audit log entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide"><th className="pb-2 pr-4 font-semibold">User</th><th className="pb-2 pr-4 font-semibold">Action</th><th className="pb-2 pr-4 font-semibold">IP Address</th><th className="pb-2 font-semibold">Timestamp</th></tr></thead>
                  <tbody>
                    {p.auditLogEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-50">
                        <td className="py-2 pr-4"><div className="font-medium text-gray-900">{entry.user.name}</div><div className="text-xs text-gray-400">{entry.user.email}</div></td>
                        <td className="py-2 pr-4"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{entry.action}</span></td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{entry.ipAddress ?? '—'}</td>
                        <td className="py-2 text-xs text-gray-500">{format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* DPAs */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Data Processing Agreements</h2>
          <button type="button" onClick={() => p.setDpaFormOpen(!p.dpaFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
            {p.dpaFormOpen ? 'Cancel' : '+ Add DPA'}
          </button>
        </div>
        {p.dpaFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Vendor Name</label><input type="text" value={p.dpaVendor} onChange={(e) => p.setDpaVendor(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Anthropic, Inc." /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label><input type="text" value={p.dpaPurpose} onChange={(e) => p.setDpaPurpose(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="AI chat processing" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Data Categories (comma-separated)</label><input type="text" value={p.dpaCategories} onChange={(e) => p.setDpaCategories(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="chat messages, user profiles" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Document URL (optional)</label><input type="text" value={p.dpaDocUrl} onChange={(e) => p.setDpaDocUrl(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="https://..." /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Signed At</label><input type="date" value={p.dpaSignedAt} onChange={(e) => p.setDpaSignedAt(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Expires At</label><input type="date" value={p.dpaExpiresAt} onChange={(e) => p.setDpaExpiresAt(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            </div>
            <button type="button" onClick={() => void p.handleCreateDPA()} disabled={p.dpaSaving || !p.dpaVendor.trim() || !p.dpaPurpose.trim() || !p.dpaSignedAt || !p.dpaExpiresAt} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.dpaSaving ? <Loader2 className="size-4 animate-spin" /> : null}Save DPA
            </button>
          </div>
        )}
        {p.dpaLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.dpas.length === 0 ? (
          <p className="text-sm text-gray-500">No DPAs configured yet.</p>
        ) : (
          <div className="space-y-3">
            {p.dpas.map((d) => {
              const now = new Date(); const expires = new Date(d.expiresAt); const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysUntilExpiry <= 0; const isExpiringSoon = !isExpired && daysUntilExpiry <= 60
              return (
                <div key={d.id} className={`rounded-2xl border-2 p-4 ${isExpired ? 'border-red-200 bg-red-50' : isExpiringSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{d.vendorName}</span>
                        {isExpired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">EXPIRED</span>}
                        {isExpiringSoon && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">EXPIRING SOON</span>}
                        {!d.active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">INACTIVE</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{d.purpose}</p>
                      {d.dataCategories.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{d.dataCategories.map((cat) => <span key={cat} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{cat}</span>)}</div>}
                      <p className="text-xs text-gray-400 mt-1.5">Expires: {format(expires, 'MMM d, yyyy')}{isExpired ? '' : ` (${daysUntilExpiry} days)`}</p>
                    </div>
                    <button type="button" onClick={() => void p.handleDeleteDPA(d.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Delete DPA"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* DSAs */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Cross-Institutional Data Sharing</h2>
          <button type="button" onClick={() => p.setDsaFormOpen(!p.dsaFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>{p.dsaFormOpen ? 'Cancel' : '+ Add Agreement'}</button>
        </div>
        {p.dsaFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Partner Institution</label><input type="text" value={p.dsaPartner} onChange={(e) => p.setDsaPartner(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="University of Louisville" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Data Scope</label><input type="text" value={p.dsaScope} onChange={(e) => p.setDsaScope(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Anonymized learning outcomes" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Legal Basis</label><input type="text" value={p.dsaLegalBasis} onChange={(e) => p.setDsaLegalBasis(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Research collaboration MOU" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Contact Email (optional)</label><input type="text" value={p.dsaContact} onChange={(e) => p.setDsaContact(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="contact@partner.edu" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Signed At</label><input type="date" value={p.dsaSignedAt} onChange={(e) => p.setDsaSignedAt(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Expires At</label><input type="date" value={p.dsaExpiresAt} onChange={(e) => p.setDsaExpiresAt(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            </div>
            <button type="button" onClick={() => void p.handleCreateDSA()} disabled={p.dsaSaving || !p.dsaPartner.trim() || !p.dsaScope.trim() || !p.dsaLegalBasis.trim() || !p.dsaSignedAt || !p.dsaExpiresAt} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.dsaSaving ? <Loader2 className="size-4 animate-spin" /> : null}Save Agreement
            </button>
          </div>
        )}
        {p.dsaLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.dsas.length === 0 ? (
          <p className="text-sm text-gray-500">No data sharing agreements configured yet.</p>
        ) : (
          <div className="space-y-3">
            {p.dsas.map((d) => {
              const now = new Date(); const expires = new Date(d.expiresAt); const daysUntil = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysUntil <= 0; const isExpiringSoon = !isExpired && daysUntil <= 60
              return (
                <div key={d.id} className={`rounded-2xl border-2 p-4 ${isExpired ? 'border-red-200 bg-red-50' : isExpiringSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{d.partnerInstitution}</span>
                        {isExpired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">EXPIRED</span>}
                        {isExpiringSoon && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">EXPIRING SOON</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Scope:</span> {d.dataScope}</p>
                      <p className="text-xs text-gray-500"><span className="font-medium">Legal basis:</span> {d.legalBasis}</p>
                      {d.contactEmail && <p className="text-xs text-gray-500"><span className="font-medium">Contact:</span> {d.contactEmail}</p>}
                      <p className="text-xs text-gray-400 mt-1.5">Expires: {format(expires, 'MMM d, yyyy')}{isExpired ? '' : ` (${daysUntil} days)`}</p>
                    </div>
                    <button type="button" onClick={() => void p.handleDeleteDSA(d.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Delete agreement"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Bulk TOS Reset */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-2">Reset All TOS Acceptances</h2>
        <p className="text-sm text-gray-500 mb-4">Use this when the Terms of Service have been updated and all users need to re-accept.</p>
        {!p.resetTosConfirm ? (
          <button type="button" onClick={() => p.setResetTosConfirm(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><ShieldX className="size-4" />Reset All TOS Acceptances</button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="size-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">This will clear TOS acceptance for <span className="font-bold">all users</span>. Are you sure?</p>
            <button type="button" onClick={() => void p.handleResetTos()} disabled={p.resetTosLoading} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{p.resetTosLoading ? <Loader2 className="size-4 animate-spin" /> : null}Confirm Reset</button>
            <button type="button" onClick={() => p.setResetTosConfirm(false)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        )}
      </section>

      {/* FERPA Incidents */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">FERPA Incidents</h2>
          <button type="button" onClick={() => p.setIncidentFormOpen(!p.incidentFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>{p.incidentFormOpen ? 'Cancel' : '+ Report Incident'}</button>
        </div>
        {p.incidentFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Description</label><textarea rows={3} value={p.incidentDesc} onChange={(e) => p.setIncidentDesc(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Describe the FERPA violation incident..." /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Severity</label><select value={p.incidentSeverity} onChange={(e) => p.setIncidentSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <button type="button" onClick={() => void p.handleCreateIncident()} disabled={p.incidentSaving || !p.incidentDesc.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>{p.incidentSaving ? <Loader2 className="size-4 animate-spin" /> : null}Submit Incident</button>
          </div>
        )}
        {p.ferpaIncidentsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.ferpaIncidents.length === 0 ? (
          <p className="text-sm text-gray-500">No FERPA incidents reported.</p>
        ) : (
          <div className="space-y-3">
            {p.ferpaIncidents.map((inc) => {
              const severityStyles: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' }
              const incStatusStyles: Record<string, string> = { open: 'bg-red-50 text-red-600', investigating: 'bg-amber-50 text-amber-600', resolved: 'bg-emerald-50 text-emerald-600', dismissed: 'bg-gray-100 text-gray-500' }
              const isActive = inc.status === 'open' || inc.status === 'investigating'
              return (
                <div key={inc.id} className={`rounded-2xl border-2 p-4 ${inc.severity === 'critical' ? 'border-red-200' : inc.severity === 'high' ? 'border-orange-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityStyles[inc.severity] ?? 'bg-gray-100 text-gray-600'}`}>{inc.severity}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${incStatusStyles[inc.status] ?? 'bg-gray-100 text-gray-600'}`}>{inc.status}</span>
                        <span className="text-[10px] text-gray-400">{format(new Date(inc.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <p className="text-sm text-gray-900">{inc.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Reported by {inc.reportedBy.name} ({inc.reportedBy.email})</p>
                      {inc.resolution && <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2"><p className="text-xs font-semibold text-emerald-700 mb-0.5">Resolution</p><p className="text-xs text-emerald-600">{inc.resolution}</p></div>}
                      {inc.resolvedAt && <p className="text-[10px] text-gray-400 mt-1">Resolved {format(new Date(inc.resolvedAt), 'MMM d, yyyy h:mm a')}</p>}
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="mb-2"><textarea rows={2} placeholder="Resolution notes..." value={p.resolutionText[inc.id] ?? ''} onChange={(e) => p.setResolutionText((prev) => ({ ...prev, [inc.id]: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" /></div>
                      <div className="flex flex-wrap gap-2">
                        {inc.status === 'open' && <button type="button" onClick={() => void p.handleUpdateIncident(inc.id, 'investigating')} disabled={p.updatingIncident === inc.id} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">{p.updatingIncident === inc.id ? <Loader2 className="size-3 animate-spin" /> : null}Investigate</button>}
                        <button type="button" onClick={() => void p.handleUpdateIncident(inc.id, 'resolved')} disabled={p.updatingIncident === inc.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">{p.updatingIncident === inc.id ? <Loader2 className="size-3 animate-spin" /> : null}Resolve</button>
                        <button type="button" onClick={() => void p.handleUpdateIncident(inc.id, 'dismissed')} disabled={p.updatingIncident === inc.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100">{p.updatingIncident === inc.id ? <Loader2 className="size-3 animate-spin" /> : null}Dismiss</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* FERPA Training Reminders */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">FERPA Training Reminders</h2>
          <button type="button" onClick={() => void p.handleSendFerpaBlast()} disabled={p.ferpaBlastLoading || p.ferpaReminderEducators.length === 0} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>{p.ferpaBlastLoading ? <Loader2 className="size-4 animate-spin" /> : null}Send Reminder Blast</button>
        </div>
        {p.ferpaBlastResult && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Sent {p.ferpaBlastResult.sent} reminders, skipped {p.ferpaBlastResult.skipped} (reminded within 7 days). {p.ferpaBlastResult.total} educators need training.</div>}
        {p.ferpaRemindersLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.ferpaReminderEducators.length === 0 ? (
          <p className="text-sm text-gray-500">All educators and admins have current FERPA training.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide"><th className="pb-2 pr-4 font-semibold">Educator</th><th className="pb-2 pr-4 font-semibold">Role</th><th className="pb-2 pr-4 font-semibold">FERPA Status</th><th className="pb-2 font-semibold">Last Reminded</th></tr></thead>
              <tbody>
                {p.ferpaReminderEducators.map((edu) => (
                  <tr key={edu.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4"><div className="font-medium text-gray-900">{edu.name}</div><div className="text-xs text-gray-400">{edu.email}</div></td>
                    <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${edu.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{edu.role}</span></td>
                    <td className="py-2.5 pr-4">{edu.ferpaAckAt ? <span className="text-xs text-amber-600">Expired ({format(new Date(edu.ferpaAckAt), 'MMM d, yyyy')})</span> : <span className="text-xs text-red-600">Never completed</span>}</td>
                    <td className="py-2.5 text-xs text-gray-500">{edu.lastRemindedAt ? format(new Date(edu.lastRemindedAt), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Compliance Tests */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance Tests</h2>
          <button type="button" onClick={() => void p.fetchComplianceTests()} disabled={p.complianceTestLoading} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>{p.complianceTestLoading ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}Run Tests</button>
        </div>
        {p.complianceTestResults && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 mb-3">
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-center"><div className="text-lg font-bold text-gray-900">{p.complianceTestResults.totalTests}</div><div className="text-[10px] text-gray-500 uppercase">Total</div></div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center"><div className="text-lg font-bold text-emerald-700">{p.complianceTestResults.passed}</div><div className="text-[10px] text-emerald-600 uppercase">Passed</div></div>
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center"><div className="text-lg font-bold text-red-700">{p.complianceTestResults.failed}</div><div className="text-[10px] text-red-600 uppercase">Failed</div></div>
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-center"><div className="text-lg font-bold text-gray-600">{p.complianceTestResults.durationMs}ms</div><div className="text-[10px] text-gray-500 uppercase">Duration</div></div>
            </div>
            <p className="text-[10px] text-gray-400">Last run: {format(new Date(p.complianceTestResults.ranAt), 'MMM d, yyyy h:mm a')}</p>
            <div className="space-y-1.5">
              {p.complianceTestResults.results.map((t, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${t.status === 'pass' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {t.status === 'pass' ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> : <XCircle className="size-4 text-red-600 shrink-0" />}
                  <span className={`flex-1 ${t.status === 'pass' ? 'text-emerald-800' : 'text-red-800'}`}>{t.name}</span>
                  <span className="text-[10px] text-gray-400">{t.durationMs}ms</span>
                </div>
              ))}
              {p.complianceTestResults.results.filter((t) => t.error).map((t, i) => (
                <div key={`err-${i}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span className="font-semibold">{t.name}:</span> {t.error}</div>
              ))}
            </div>
          </div>
        )}
        {!p.complianceTestResults && !p.complianceTestLoading && <p className="text-sm text-gray-500">Click &quot;Run Tests&quot; to verify all compliance endpoints.</p>}
        {p.complianceTestLoading && <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>}
      </section>

      {/* View Full Dashboard link */}
      <div><Link href="/admin/compliance-dashboard" className="inline-flex items-center gap-1.5 rounded-xl border border-uk-blue px-4 py-2 text-sm font-semibold hover:bg-blue-50" style={{ color: '#0033A0' }}><BarChart2 className="size-4" />View Full Dashboard &rarr;</Link></div>

      {/* Extended sections — Workflows through Activity Feed */}
      <ComplianceTabExtended {...p} />
    </>
  )
}
