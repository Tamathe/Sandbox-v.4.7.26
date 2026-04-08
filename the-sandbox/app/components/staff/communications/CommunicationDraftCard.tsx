'use client'

import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  RefreshCw,
  Share2,
  Send,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  User,
  Loader2,
  X,
} from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import SocialVersionsPanel from './SocialVersionsPanel'
import ApprovalTimeline, { type ApprovalStepData } from '../ApprovalTimeline'
import { getApprovalChain } from '../../../lib/staff/approval-chains'

/* ── Type / Status badge colors ────────────────────────────────────── */

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'campus-wide':    { bg: 'bg-blue-50',    text: 'text-blue-700' },
  'department':     { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'student-facing': { bg: 'bg-amber-50',   text: 'text-amber-700' },
  'executive-brief':{ bg: 'bg-purple-50',  text: 'text-purple-700' },
  'crisis':         { bg: 'bg-red-50',     text: 'text-red-700' },
  'social-media':   { bg: 'bg-pink-50',    text: 'text-pink-700' },
}

const STATUS_MAP: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  'draft':          { bg: 'bg-gray-100',    text: 'text-gray-600',    icon: Edit3 },
  'pending-review': { bg: 'bg-amber-50',    text: 'text-amber-700',   icon: Clock },
  'approved':       { bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: CheckCircle2 },
  'sent':           { bg: 'bg-blue-50',     text: 'text-blue-700',    icon: Send },
}

/* ── Types ─────────────────────────────────────────────────────────── */

interface ComplianceFlag {
  policy: string
  policyTitle?: string
  reason: string
  severity: 'error' | 'warning' | 'info'
}

interface ApprovalChainMember {
  userId?: string
  name: string
  role: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

interface SocialVersions {
  twitter: string
  instagram: string
  linkedin: string
}

export interface CommunicationDraft {
  id: string
  type: string
  status: string
  subject: string | null
  body: string
  audienceDesc: string
  tone: string | null
  socialVersions: SocialVersions | null
  complianceFlags: ComplianceFlag[] | null
  approvalChain: ApprovalChainMember[] | null
  approvalSteps?: ApprovalStepData[] | null
  revisionCount: number
  createdAt: string
  sentAt: string | null
  scheduledFor: string | null
  scheduledBy: string | null
}

interface CommunicationDraftCardProps {
  draft: CommunicationDraft
  onUpdated: (draft: CommunicationDraft) => void
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function CommunicationDraftCard({ draft, onUpdated }: CommunicationDraftCardProps) {
  const { currentUser } = useAuth()

  /* Local state */
  const [editingSubject, setEditingSubject] = useState(false)
  const [subjectValue, setSubjectValue] = useState(draft.subject ?? '')
  const [showRevisePrompt, setShowRevisePrompt] = useState(false)
  const [reviseInstruction, setReviseInstruction] = useState('')
  const [showSocial, setShowSocial] = useState(false)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStepData[]>(draft.approvalSteps ?? [])

  /* helpers */
  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }

  const apiCall = useCallback(async (path: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(path, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) throw new Error('Request failed')
    return res.json() as Promise<{ communication: CommunicationDraft }>
  }, [currentUser.email])

  /* ── Actions ────────────────────────────────────────────────────── */

  const handleSubjectSave = async () => {
    setEditingSubject(false)
    if (subjectValue === draft.subject) return
    setActionLoading('subject')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}`, 'PATCH', { subject: subjectValue })
      onUpdated(data.communication)
    } catch { /* toast? */ }
    setActionLoading(null)
  }

  const handleRevise = async () => {
    if (!reviseInstruction.trim()) return
    setActionLoading('revise')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}/revise`, 'POST', { instruction: reviseInstruction })
      onUpdated(data.communication)
      setReviseInstruction('')
      setShowRevisePrompt(false)
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleGenerateSocial = async () => {
    setActionLoading('social')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}/social`, 'POST')
      onUpdated(data.communication)
      setShowSocial(true)
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleSubmitForApproval = async () => {
    setActionLoading('submit')
    try {
      const res = await fetch(`/api/staff/communications/${draft.id}/submit`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json() as { communication: CommunicationDraft; approvalSteps?: ApprovalStepData[] }
      onUpdated(data.communication)
      if (data.approvalSteps) setApprovalSteps(data.approvalSteps)
      setShowSubmitConfirm(false)
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleApproveStep = async (stepId: string) => {
    setActionLoading('approve')
    try {
      const res = await fetch(`/api/staff/communications/${draft.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepId, decision: 'approved' }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json() as { communication: CommunicationDraft }
      onUpdated(data.communication)
      // Refresh approval steps
      const statusRes = await fetch(`/api/staff/communications/${draft.id}/approval-status`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json() as { steps: ApprovalStepData[] }
        setApprovalSteps(statusData.steps)
      }
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleRejectStep = async (stepId: string, comment: string) => {
    setActionLoading('reject')
    try {
      const res = await fetch(`/api/staff/communications/${draft.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepId, decision: 'rejected', comment }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json() as { communication: CommunicationDraft }
      onUpdated(data.communication)
      const statusRes = await fetch(`/api/staff/communications/${draft.id}/approval-status`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json() as { steps: ApprovalStepData[] }
        setApprovalSteps(statusData.steps)
      }
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleSend = async () => {
    setActionLoading('send')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}/send`, 'POST')
      onUpdated(data.communication)
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleSchedule = async () => {
    if (!scheduleDateTime) return
    setActionLoading('schedule')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}/schedule`, 'POST', {
        scheduledAt: new Date(scheduleDateTime).toISOString(),
      })
      onUpdated(data.communication)
      setShowSchedulePicker(false)
      setScheduleDateTime('')
    } catch { /* */ }
    setActionLoading(null)
  }

  const handleCancelSchedule = async () => {
    setActionLoading('cancel-schedule')
    try {
      const data = await apiCall(`/api/staff/communications/${draft.id}/schedule`, 'DELETE')
      onUpdated(data.communication)
    } catch { /* */ }
    setActionLoading(null)
  }

  /* ── Badge helpers ──────────────────────────────────────────────── */
  const typeColors = TYPE_COLORS[draft.type] ?? { bg: 'bg-gray-50', text: 'text-gray-700' }
  const typeLabel = draft.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const statusMeta = STATUS_MAP[draft.status] ?? STATUS_MAP['draft']
  const StatusIcon = statusMeta.icon
  const statusLabel = draft.status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const flags = draft.complianceFlags ?? []
  const chain = draft.approvalChain ?? []
  const isDraft = draft.status === 'draft'
  const isSent = draft.status === 'sent'
  const isApproved = draft.status === 'approved'
  const isScheduled = !!draft.scheduledFor

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColors.bg} ${typeColors.text}`}>
          {typeLabel}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusMeta.bg} ${statusMeta.text}`}>
          <StatusIcon className="size-3" />
          {statusLabel}
        </span>
        <span className="ml-auto text-xs text-gray-400">{draft.audienceDesc}</span>
      </div>

      {/* ── Subject line ────────────────────────────────────────────── */}
      {draft.subject !== null && (
        <div className="px-5 py-3 border-b border-gray-50">
          {editingSubject ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={subjectValue}
                onChange={(e) => setSubjectValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSubjectSave(); if (e.key === 'Escape') setEditingSubject(false) }}
                className="flex-1 text-sm font-bold text-gray-900 border border-[#0033A0]/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
              />
              <button
                onClick={() => void handleSubjectSave()}
                disabled={actionLoading === 'subject'}
                className="text-xs font-semibold text-[#0033A0] hover:underline"
              >
                Save
              </button>
              <button onClick={() => setEditingSubject(false)} className="text-xs text-gray-400 hover:text-gray-600">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { if (isDraft) { setSubjectValue(draft.subject ?? ''); setEditingSubject(true) } }}
              className={`text-sm font-bold text-gray-900 text-left w-full ${isDraft ? 'hover:text-[#0033A0] cursor-pointer' : 'cursor-default'}`}
              title={isDraft ? 'Click to edit subject' : undefined}
            >
              {draft.subject}
            </button>
          )}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 max-h-72 overflow-y-auto">
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {draft.body}
        </div>
      </div>

      {/* ── Compliance flags ────────────────────────────────────────── */}
      {flags.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="size-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Compliance Flags</span>
          </div>
          <div className="space-y-1.5">
            {flags.map((flag, i) => {
              const sevColor = flag.severity === 'error' ? 'text-red-600' : flag.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className={`size-3.5 mt-0.5 shrink-0 ${sevColor}`} />
                  <div>
                    <span className="font-semibold text-gray-700">{flag.policy}</span>
                    {flag.policyTitle && <span className="text-gray-500"> — {flag.policyTitle}</span>}
                    <p className="text-gray-500 mt-0.5">{flag.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Approval workflow timeline ───────────────────────────────── */}
      {approvalSteps.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <ApprovalTimeline
            steps={approvalSteps}
            currentUserEmail={currentUser.email}
            onApprove={handleApproveStep}
            onReject={handleRejectStep}
            loading={actionLoading === 'approve' || actionLoading === 'reject'}
          />
        </div>
      )}

      {/* ── Legacy approval chain (JSON-based) ─────────────────────── */}
      {chain.length > 0 && approvalSteps.length === 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-600 mb-2 block">Approval Chain</span>
          <div className="flex flex-wrap gap-2">
            {chain.map((member, i) => {
              const chipColor =
                member.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                member.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-gray-50 text-gray-600 border-gray-200'
              const ChipIcon = member.status === 'approved' ? CheckCircle2 : member.status === 'rejected' ? X : Clock
              return (
                <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${chipColor}`}>
                  <User className="size-3" />
                  {member.name}
                  <ChipIcon className="size-3" />
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Revise prompt ───────────────────────────────────────────── */}
      {showRevisePrompt && isDraft && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Tell Sandy what to change</label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={reviseInstruction}
              onChange={(e) => setReviseInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleRevise() }}
              placeholder="Make it shorter, add parking details..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
            />
            <button
              onClick={() => void handleRevise()}
              disabled={!reviseInstruction.trim() || actionLoading === 'revise'}
              className="text-xs font-semibold text-white bg-[#0033A0] rounded-lg px-4 py-2 hover:bg-[#0033A0]/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {actionLoading === 'revise' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Revise
            </button>
          </div>
        </div>
      )}

      {/* ── Social versions panel ───────────────────────────────────── */}
      {draft.socialVersions && showSocial && (
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600">Social Media Versions</span>
            <button onClick={() => setShowSocial(false)} className="text-xs text-gray-400 hover:text-gray-600">
              <ChevronUp className="size-4" />
            </button>
          </div>
          <SocialVersionsPanel versions={draft.socialVersions} />
        </div>
      )}

      {draft.socialVersions && !showSocial && (
        <button
          onClick={() => setShowSocial(true)}
          className="w-full px-5 py-2 border-t border-gray-100 text-xs font-medium text-[#0033A0] hover:bg-[#0033A0]/5 flex items-center justify-center gap-1 transition-colors"
        >
          <ChevronDown className="size-3.5" />
          Show Social Versions
        </button>
      )}

      {/* ── Submit confirmation with chain preview ──────────────────── */}
      {showSubmitConfirm && isDraft && (
        <div className="px-5 py-3 border-t border-gray-100 bg-amber-50/30">
          <span className="text-xs font-bold text-gray-700 mb-2 block">This will require approval:</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
            {getApprovalChain(draft.type).map((step, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <span className="font-medium">{step.label}</span>
                {i < arr.length - 1 && <span className="text-gray-400">→</span>}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSubmitForApproval()}
              disabled={actionLoading === 'submit'}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0033A0] hover:bg-[#0033A0]/90 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'submit' ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Confirm &amp; Submit
            </button>
            <button
              onClick={() => setShowSubmitConfirm(false)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Scheduled banner ────────────────────────────────────────── */}
      {isScheduled && !isSent && draft.scheduledFor && (
        <div className="px-5 py-3 border-t border-gray-100 bg-blue-50/50">
          <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
            <CalendarClock className="size-4" />
            <span>
              Scheduled for{' '}
              {new Date(draft.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' at '}
              {new Date(draft.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <button
              onClick={() => void handleCancelSchedule()}
              disabled={actionLoading === 'cancel-schedule'}
              className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              {actionLoading === 'cancel-schedule' ? <Loader2 className="size-3.5 animate-spin" /> : 'Cancel Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule picker ──────────────────────────────────────────── */}
      {showSchedulePicker && !isSent && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Schedule send time</label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
            />
            <button
              onClick={() => void handleSchedule()}
              disabled={!scheduleDateTime || actionLoading === 'schedule'}
              className="text-xs font-semibold text-white bg-[#0033A0] rounded-lg px-4 py-2 hover:bg-[#0033A0]/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {actionLoading === 'schedule' ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
              Confirm
            </button>
            <button
              onClick={() => { setShowSchedulePicker(false); setScheduleDateTime('') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────── */}
      {!isSent && !isScheduled && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          {isDraft && (
            <>
              <button
                onClick={() => { setShowRevisePrompt(!showRevisePrompt) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                Revise
              </button>

              {!draft.socialVersions && (
                <button
                  onClick={() => void handleGenerateSocial()}
                  disabled={actionLoading === 'social'}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'social' ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
                  Social Versions
                </button>
              )}

              {(chain.length > 0 || getApprovalChain(draft.type).length > 0) && (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={actionLoading === 'submit'}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'submit' ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                  Submit for Approval
                </button>
              )}
            </>
          )}

          {/* Schedule button — visible for approved communications */}
          {(isApproved || (isDraft && chain.length === 0)) && (
            <button
              onClick={() => setShowSchedulePicker(!showSchedulePicker)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] bg-[#0033A0]/5 hover:bg-[#0033A0]/10 rounded-lg px-3 py-2 transition-colors"
            >
              <CalendarClock className="size-3.5" />
              Schedule
            </button>
          )}

          <button
            onClick={() => void handleSend()}
            disabled={actionLoading === 'send'}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0033A0] hover:bg-[#0033A0]/90 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'send' ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send Now
          </button>
        </div>
      )}

      {/* Sent confirmation */}
      {isSent && draft.sentAt && (
        <div className="px-5 py-3 border-t border-gray-100 bg-emerald-50/50">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="size-4" />
            Sent on {new Date(draft.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  )
}
