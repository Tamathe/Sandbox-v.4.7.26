'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle, Plus, X } from 'lucide-react'
import { ChartPanel } from './ChartPanel'

type Student = {
  id: string
  name: string
  email: string
}

type InterventionEntry = {
  id: string
  studentId: string
  student: Student
  reason: string
  actionTaken: string
  outcome: string | null
  resolvedAt: string | null
  createdAt: string
}

type Props = {
  courseId: string
  userEmail: string
}

export default function InterventionTracker({ courseId, userEmail }: Props) {
  const [logs, setLogs] = useState<InterventionEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ studentEmail: '', reason: '', actionTaken: '' })
  const [formError, setFormError] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const headers = { 'x-demo-user-email': userEmail }

  function fetchLogs() {
    setLoading(true)
    setError(false)
    fetch(`/api/analytics/interventions?courseId=${encodeURIComponent(courseId)}`, { headers })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { logs: InterventionEntry[] }) => {
        setLogs(data.logs)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => { fetchLogs() }, [courseId, userEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentEmail.trim() || !form.reason.trim() || !form.actionTaken.trim()) {
      setFormError('All fields are required.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/analytics/interventions', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, studentEmail: form.studentEmail, reason: form.reason, actionTaken: form.actionTaken }),
      })
      if (!res.ok) throw new Error()
      const created: InterventionEntry = await res.json()
      setLogs(prev => (prev ? [created, ...prev] : [created]))
      setForm({ studentEmail: '', reason: '', actionTaken: '' })
      setShowForm(false)
    } catch {
      setFormError('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolve(id: string) {
    setResolvingId(id)
    try {
      const res = await fetch(`/api/analytics/interventions/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error()
      const updated: InterventionEntry = await res.json()
      setLogs(prev => prev ? prev.map(l => l.id === id ? updated : l) : prev)
    } catch {
      // silently fail — user can retry
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <ChartPanel
      title="Intervention Log"
      subtitle={logs != null ? `${logs.length} record${logs.length !== 1 ? 's' : ''}` : undefined}
      icon={ClipboardList}
      loading={loading}
      error={error}
      errorMessage="Failed to load interventions."
      isEmpty={!loading && !error && logs != null && logs.length === 0 && !showForm}
      emptyMessage="No interventions recorded yet. Use New to log one."
      headerRight={
        <button
          onClick={() => { setShowForm(v => !v); setFormError('') }}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-[#0033A0] border border-[#0033A0] rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          {showForm ? <X className="size-3" /> : <Plus className="size-3" />}
          {showForm ? 'Cancel' : 'New'}
        </button>
      }
    >
      <>
        {/* Inline new-intervention form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5 space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Student Email</label>
              <input
                type="email"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]"
                placeholder="student@uky.edu"
                value={form.studentEmail}
                onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Intervention</label>
              <textarea
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none"
                placeholder="Describe why you are intervening…"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action Taken</label>
              <textarea
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none"
                placeholder="Describe what action you took or plan to take…"
                value={form.actionTaken}
                onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))}
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-medium bg-[#0033A0] text-white rounded-lg px-4 py-2 hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Submit'}
            </button>
          </form>
        )}

        {/* List */}
        {logs && logs.length > 0 && (
          <div className="space-y-3">
            {(showAll ? logs : logs.slice(0, 4)).map(log => (
              <div
                key={log.id}
                className={`rounded-xl border p-4 ${log.resolvedAt ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-gray-50/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{log.student.name}</span>
                      <span className="text-xs text-gray-400">{log.student.email}</span>
                      {log.resolvedAt && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                          <CheckCircle className="size-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 mt-1 leading-snug">
                      <span className="font-medium text-gray-500">Reason: </span>
                      {log.reason.slice(0, 120)}{log.reason.length > 120 ? '…' : ''}
                    </p>
                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="font-medium text-gray-500">Action: </span>
                      {log.actionTaken.slice(0, 120)}{log.actionTaken.length > 120 ? '…' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {!log.resolvedAt && (
                    <button
                      onClick={() => handleResolve(log.id)}
                      disabled={resolvingId === log.id}
                      className="flex-shrink-0 text-xs font-medium text-green-700 border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-50 disabled:opacity-50 transition-colors"
                    >
                      {resolvingId === log.id ? 'Saving…' : 'Mark Resolved'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {logs && logs.length > 4 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
          >
            Show all {logs.length} entries
          </button>
        )}
      </>
    </ChartPanel>
  )
}
