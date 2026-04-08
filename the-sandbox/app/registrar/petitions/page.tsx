'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import { useStudent360 } from '../../components/registrar/Student360Context'
import { PETITION_TYPE_LABELS, PETITION_STATUS_LABELS } from '../../lib/registrar/types'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'

interface Petition {
  id: string
  type: string
  status: string
  formData: Record<string, unknown>
  eligibilityCheck: { eligible: boolean; reasons: string[]; blockers: string[] } | null
  routedTo: string | null
  reviewedAt: string | null
  decision: string | null
  decisionReason: string | null
  submittedAt: string
  student: { id: string; name: string; email: string }
  reviewer: { id: string; name: string } | null
  auditEntries: { id: string; action: string; note: string | null; createdAt: string; actor: { id: string; name: string } }[]
}

const TABS = ['All', 'Submitted', 'In Review', 'Approved', 'Denied'] as const
type Tab = (typeof TABS)[number]

const STATUS_MAP: Record<Tab, string | null> = {
  All: null,
  Submitted: 'SUBMITTED',
  'In Review': 'IN_REVIEW',
  Approved: 'APPROVED',
  Denied: 'DENIED',
}

export default function PetitionsPage() {
  const { currentUser } = useAuth()
  const { openStudent360 } = useStudent360()
  const [tab, setTab] = useState<Tab>('All')
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Petition | null>(null)
  const [decision, setDecision] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPetitions = useCallback(async () => {
    setLoading(true)
    const status = STATUS_MAP[tab]
    const qs = status ? `?status=${status}` : ''
    try {
      const res = await fetch(`/api/registrar/petitions${qs}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setPetitions(data.petitions)
      }
    } catch {}
    setLoading(false)
  }, [currentUser.email, tab])

  useEffect(() => { void fetchPetitions() }, [fetchPetitions])

  const handleDecision = async () => {
    if (!selected || !decision) return
    setSaving(true)
    try {
      const res = await fetch(`/api/registrar/petitions/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ decision, decisionReason }),
      })
      if (res.ok) {
        await fetchPetitions()
        setSelected(null)
        setDecision('')
        setDecisionReason('')
      }
    } catch {}
    setSaving(false)
  }

  const daysWaiting = (submittedAt: string) => differenceInDays(new Date(), new Date(submittedAt))

  const waitingBadge = (submittedAt: string, status: string) => {
    if (status === 'APPROVED' || status === 'DENIED' || status === 'WITHDRAWN') return null
    const days = daysWaiting(submittedAt)
    const label = formatDistanceToNow(new Date(submittedAt), { addSuffix: false })
    if (days > 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <AlertCircle className="size-3" />{label}
        </span>
      )
    }
    return <span className="text-xs text-gray-400">{label}</span>
  }

  const statusBadge = (status: string) => {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
    switch (status) {
      case 'APPROVED': return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="size-3" />{PETITION_STATUS_LABELS[status]}</span>
      case 'DENIED': return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="size-3" />{PETITION_STATUS_LABELS[status]}</span>
      case 'IN_REVIEW': return <span className={`${base} bg-blue-100 text-blue-700`}><Clock className="size-3" />{PETITION_STATUS_LABELS[status]}</span>
      default: return <span className={`${base} bg-gray-100 text-gray-600`}>{PETITION_STATUS_LABELS[status] ?? status}</span>
    }
  }

  return (
    <RegistrarLayout title="Petition Queue" subtitle="Review and decide on student petitions">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={fetchPetitions} className="ml-auto px-2 py-2 text-gray-400 hover:text-gray-600">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading petitions…</div>
          ) : petitions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No petitions in this view.</div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Routed To</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Waiting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {petitions.map((petition) => (
                    <tr
                      key={petition.id}
                      className={`cursor-pointer ${
                        selected?.id === petition.id
                          ? 'bg-blue-50'
                          : daysWaiting(petition.submittedAt) > 3 && petition.status !== 'APPROVED' && petition.status !== 'DENIED' && petition.status !== 'WITHDRAWN'
                          ? 'bg-amber-50 hover:bg-amber-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => { setSelected(petition); setDecision(''); setDecisionReason('') }}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); openStudent360(petition.student.id) }}
                          className="text-left hover:underline"
                        >
                          <p className="font-medium text-gray-800">{petition.student.name}</p>
                          <p className="text-xs text-gray-400">{petition.student.email}</p>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">{PETITION_TYPE_LABELS[petition.type] ?? petition.type}</td>
                      <td className="py-3 px-4">{statusBadge(petition.status)}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{petition.routedTo ?? '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{new Date(petition.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{waitingBadge(petition.submittedAt, petition.status)}</td>
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
                  <p className="text-xs text-gray-500">{PETITION_TYPE_LABELS[selected.type]}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              {statusBadge(selected.status)}
            </div>

            {/* Form data */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Petition Details</h4>
              <div className="space-y-2">
                {Object.entries(selected.formData).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm text-gray-700">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Eligibility */}
            {selected.eligibilityCheck && (
              <div className={`rounded-2xl border-2 p-4 ${selected.eligibilityCheck.eligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <h4 className="font-bold text-sm mb-2 text-gray-900">Eligibility Check</h4>
                {selected.eligibilityCheck.blockers.map((b) => (
                  <p key={b} className="text-xs text-red-700 mb-1">⛔ {b}</p>
                ))}
                {selected.eligibilityCheck.reasons.map((r) => (
                  <p key={r} className="text-xs text-green-700 mb-1">✓ {r}</p>
                ))}
              </div>
            )}

            {/* Audit trail */}
            {selected.auditEntries.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-3">Audit Trail</h4>
                <div className="space-y-2">
                  {selected.auditEntries.map((entry) => (
                    <div key={entry.id} className="text-xs border-l-2 border-gray-200 pl-3">
                      <p className="font-medium text-gray-700">{entry.action}</p>
                      {entry.note && <p className="text-gray-500">{entry.note}</p>}
                      <p className="text-gray-400">{entry.actor.name} · {new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision form */}
            {!selected.decision && selected.status !== 'WITHDRAWN' && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-3">Record Decision</h4>
                <div className="space-y-3">
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select decision…</option>
                    <option value="APPROVED">Approved</option>
                    <option value="APPROVED_WITH_CONDITIONS">Approved with Conditions</option>
                    <option value="DENIED">Denied</option>
                    <option value="DEFERRED">Deferred</option>
                  </select>
                  <textarea
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Reason for decision…"
                  />
                  <button
                    onClick={handleDecision}
                    disabled={!decision || saving}
                    className="w-full py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Submit Decision'}
                  </button>
                </div>
              </div>
            )}
            {selected.decision && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 text-xs text-green-700">
                Decision recorded: <strong>{selected.decision}</strong>
                {selected.decisionReason && <p className="mt-1">{selected.decisionReason}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </RegistrarLayout>
  )
}
