'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import { RequirementBreakdown } from '../../components/registrar/RequirementBreakdown'
import { AuditStepsAccordion } from '../../components/registrar/AuditStepsAccordion'
import { ComplexCaseBanner } from '../../components/registrar/ComplexCaseBanner'
import { useStudent360 } from '../../components/registrar/Student360Context'
import { AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import type { RequirementAuditResult, AuditStep, AuditSource } from '../../lib/registrar/types'

interface AuditRecord {
  id: string
  overallStatus: string
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: RequirementAuditResult[]
  recommendedActions: string[]
  citedSources: AuditSource[]
  chainOfThought: AuditStep[]
  confidenceScore: number
  complexCaseFlag: boolean
  humanReviewRequired: boolean
  staffReviewedAt: string | null
  staffOverride: string | null
  staffNotes: string | null
  auditedAt: string
  student: { id: string; name: string; email: string; program: string | null; catalogYear: string | null }
  program: { code: string; name: string }
}

const TABS = ['Needs Review', 'Reviewed', 'All'] as const
type Tab = (typeof TABS)[number]

export default function DegreeAuditPage() {
  const { currentUser } = useAuth()
  const { openStudent360 } = useStudent360()
  const [tab, setTab] = useState<Tab>('Needs Review')
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AuditRecord | null>(null)
  const [overrideText, setOverrideText] = useState('')
  const [notesText, setNotesText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAudits = useCallback(async () => {
    setLoading(true)
    try {
      const params = tab === 'Needs Review' ? '?needsReview=true' : ''
      const res = await fetch(`/api/registrar/degree-audit${params}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        let items = data.audits as AuditRecord[]
        if (tab === 'Reviewed') items = items.filter((a) => a.staffReviewedAt)
        setAudits(items)
      }
    } catch {}
    setLoading(false)
  }, [currentUser.email, tab])

  useEffect(() => { void fetchAudits() }, [fetchAudits])

  const handleSaveReview = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/registrar/degree-audit/review/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ staffOverride: overrideText, staffNotes: notesText }),
      })
      if (res.ok) {
        await fetchAudits()
        setSelected(null)
      }
    } catch {}
    setSaving(false)
  }

  const statusIcon = (status: string) => {
    if (status === 'ON_TRACK') return <CheckCircle className="size-4 text-green-600" />
    if (status === 'ACTION_NEEDED') return <AlertTriangle className="size-4 text-amber-600" />
    return <Clock className="size-4 text-blue-600" />
  }

  return (
    <RegistrarLayout title="Degree Audit Review Queue" subtitle="Review and override AI-generated degree audits">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#0033A0] text-[#0033A0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={fetchAudits} className="ml-auto px-2 py-2 text-gray-400 hover:text-gray-600">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading audits…</div>
          ) : audits.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {tab === 'Needs Review' ? 'No audits pending staff review.' : 'No audits in this tab.'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Program</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Confidence</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Audited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {audits.map((audit) => (
                    <tr
                      key={audit.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selected?.id === audit.id ? 'bg-blue-50' : ''}`}
                      onClick={() => { setSelected(audit); setOverrideText(audit.staffOverride ?? ''); setNotesText(audit.staffNotes ?? '') }}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); openStudent360(audit.student.id) }}
                          className="text-left hover:underline"
                        >
                          <p className="font-medium text-gray-800">{audit.student.name}</p>
                          <p className="text-xs text-gray-400">{audit.student.email}</p>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">{audit.program.code}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(audit.overallStatus)}
                          <span className="text-xs text-gray-700">{audit.overallStatus.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-[#0033A0] rounded-full" style={{ width: `${Math.min(audit.percentComplete, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{audit.percentComplete}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${audit.confidenceScore >= 80 ? 'text-green-700' : audit.confidenceScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                          {audit.confidenceScore}%
                        </span>
                        {audit.complexCaseFlag && <span className="ml-1 text-amber-500">⚠</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {new Date(audit.auditedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{selected.student.name}</h3>
                  <p className="text-xs text-gray-500">{selected.program.name}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>

              {selected.complexCaseFlag && (
                <ComplexCaseBanner
                  confidenceScore={selected.confidenceScore}
                  flags={[
                    ...(selected.chainOfThought?.some((s: AuditStep) => s.detail?.includes('withdrawals')) ? ['Course withdrawals on record'] : []),
                    ...(selected.chainOfThought?.some((s: AuditStep) => s.detail?.includes('Incomplete')) ? ['Incomplete grades'] : []),
                    ...(selected.citedSources?.some((s: AuditSource) => s.type === 'TRANSFER') ? ['Transfer credits'] : []),
                  ]}
                />
              )}
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Requirements</h4>
              <RequirementBreakdown requirements={selected.requirementResults ?? []} />
            </div>

            {selected.chainOfThought?.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <AuditStepsAccordion steps={selected.chainOfThought} />
              </div>
            )}

            {/* Staff review form */}
            {!selected.staffReviewedAt && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-3">Staff Review</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Override Note (visible to student)</label>
                    <textarea
                      value={overrideText}
                      onChange={(e) => setOverrideText(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                      placeholder="Optional note for student view…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                      placeholder="Staff-only notes…"
                    />
                  </div>
                  <button
                    onClick={handleSaveReview}
                    disabled={saving}
                    className="w-full py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Mark as Reviewed'}
                  </button>
                </div>
              </div>
            )}
            {selected.staffReviewedAt && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 text-xs text-green-700">
                <CheckCircle className="size-3.5 inline mr-1" />
                Reviewed on {new Date(selected.staffReviewedAt).toLocaleDateString()}
                {selected.staffOverride && <p className="mt-1">Note: {selected.staffOverride}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </RegistrarLayout>
  )
}
