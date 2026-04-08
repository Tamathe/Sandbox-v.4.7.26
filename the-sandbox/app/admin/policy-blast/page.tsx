'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, Search, RefreshCw } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PageHeader from '../../components/PageHeader'
import ImpactReport from '../../components/policy-blast/ImpactReport'
import type { PolicyImpactReportSummary, PolicyImpactReportFull } from '../../lib/policy-blast/types'

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  significant: 'bg-amber-100 text-amber-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  informational: 'bg-blue-100 text-blue-800',
}

interface PolicyOption {
  id: string
  title: string
  policyNumber: string
}

export default function PolicyBlastPage() {
  const { currentUser } = useAuth()
  const email = currentUser?.email

  const [reports, setReports] = useState<PolicyImpactReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<PolicyImpactReportFull | null>(null)
  const [loading, setLoading] = useState(true)

  // Analyze form state
  const [policies, setPolicies] = useState<PolicyOption[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [changeDesc, setChangeDesc] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalyzeForm, setShowAnalyzeForm] = useState(false)
  const [policySearch, setPolicySearch] = useState('')

  const fetchReports = useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const data = await apiFetch<PolicyImpactReportSummary[]>(email, '/api/policy-blast/reports')
      setReports(data)
    } catch {
      // apiFetch handles errors
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Fetch policies for the analyze form (search via staff policy endpoint)
  useEffect(() => {
    if (!email || !showAnalyzeForm) return
    async function loadPolicies() {
      try {
        const data = await apiFetch<{ policies: PolicyOption[] }>(
          email!,
          '/api/staff/policies?limit=200',
        )
        setPolicies(data.policies ?? [])
      } catch {
        // Fallback: empty list
      }
    }
    loadPolicies()
  }, [email, showAnalyzeForm])

  async function handleAnalyze() {
    if (!email || !selectedPolicyId) return
    setAnalyzing(true)
    try {
      const report = await apiFetch<PolicyImpactReportFull>(email, '/api/policy-blast/analyze', {
        method: 'POST',
        body: JSON.stringify({
          policyId: selectedPolicyId,
          changeDescription: changeDesc || undefined,
        }),
      })
      setSelectedReport(report)
      setShowAnalyzeForm(false)
      setSelectedPolicyId('')
      setChangeDesc('')
      fetchReports()
    } catch {
      // apiFetch handles errors
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleViewReport(reportId: string) {
    if (!email) return
    try {
      const report = await apiFetch<PolicyImpactReportFull>(
        email,
        `/api/policy-blast/reports/${reportId}`,
      )
      setSelectedReport(report)
    } catch {
      // apiFetch handles errors
    }
  }

  function handleResolved(updated: PolicyImpactReportFull) {
    setSelectedReport(updated)
    fetchReports()
  }

  const filteredPolicies = policySearch
    ? policies.filter(
        (p) =>
          p.title.toLowerCase().includes(policySearch.toLowerCase()) ||
          p.policyNumber.toLowerCase().includes(policySearch.toLowerCase()),
      )
    : policies

  // Detail view
  if (selectedReport) {
    return (
      <div>
        <PageHeader
          title="Policy Blast Radius"
          subtitle="Institutional change impact analysis"
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ImpactReport
            report={selectedReport}
            onBack={() => setSelectedReport(null)}
            onResolved={handleResolved}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Policy Blast Radius"
        subtitle="Trace the impact of policy changes across courses, faculty, students, AI policies, and compliance"
        action={
          <button
            onClick={() => setShowAnalyzeForm(!showAnalyzeForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#0033A0] text-white hover:bg-[#002880]"
          >
            <Zap className="size-4" />
            Analyze Policy Impact
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Analyze Form */}
        {showAnalyzeForm && (
          <div className="border rounded-2xl shadow-sm bg-white p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
              New Impact Analysis
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Policy
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
                />
              </div>
              <select
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
              >
                <option value="">Choose a policy...</option>
                {filteredPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.policyNumber} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Change Description (optional)
              </label>
              <textarea
                value={changeDesc}
                onChange={(e) => setChangeDesc(e.target.value)}
                rows={2}
                placeholder="Describe what changed in the policy..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!selectedPolicyId || analyzing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#0033A0] text-white hover:bg-[#002880] disabled:opacity-50"
              >
                <Zap className="size-4" />
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
              <button
                onClick={() => setShowAnalyzeForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
              Impact Reports
            </h3>
            <button
              onClick={fetchReports}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="size-3" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="border rounded-2xl shadow-sm bg-white p-8 text-center text-gray-500">
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="border rounded-2xl shadow-sm bg-white p-8 text-center text-gray-500">
              No impact reports yet. Click &ldquo;Analyze Policy Impact&rdquo; to trace the blast radius of a policy change.
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleViewReport(r.id)}
                  className="w-full text-left border rounded-2xl shadow-sm bg-white p-4 hover:border-[#0033A0]/30 hover:shadow transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {r.policyTitle}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.policyNumber} &middot;{' '}
                        {new Date(r.generatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${severityColors[r.severity] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {r.severity}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${r.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{r.affectedCourses} courses</span>
                    <span>{r.affectedFaculty} faculty</span>
                    <span>{r.affectedStudents} students</span>
                    {r.conflictingAIPolicies > 0 && (
                      <span className="text-red-600 font-medium">
                        {r.conflictingAIPolicies} AI conflicts
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
