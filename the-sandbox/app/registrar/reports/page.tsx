'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import { ClipboardList, Download, AlertTriangle } from 'lucide-react'

interface Analytics {
  enrollment: { usersByRole: { role: string; count: number }[]; toolsByType: { type: string; count: number }[] }
  petitions: { byStatus: { status: string; count: number }[]; byType: { type: string; count: number }[] }
  articulation: { byStatus: { status: string; count: number }[] }
  degreeAudit: { total: number; needingReview: number; byStatus: { status: string; count: number }[] }
}

export default function ReportsPage() {
  const { currentUser } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exported, setExported] = useState<string | null>(null)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/registrar/analytics', { headers: { 'x-demo-user-email': currentUser.email } })
        if (res.ok) setAnalytics(await res.json())
      } catch {}
      setLoading(false)
    }
    void fetch_()
  }, [currentUser.email])

  const exportCSV = (filename: string, rows: string[][], reportName: string) => {
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setExported(reportName)
  }

  const reports = [
    {
      id: 'enrollment',
      title: 'Enrollment by Role',
      description: 'Count of users by role — equivalent to IPEDS Fall Enrollment Report input.',
      generate: () => {
        const headers = ['Role', 'Count']
        const rows = analytics?.enrollment.usersByRole.map((r) => [r.role, String(r.count)]) ?? []
        exportCSV('enrollment-by-role.csv', [headers, ...rows], 'Enrollment by Role')
      },
    },
    {
      id: 'petitions',
      title: 'Petition Activity Report',
      description: 'Petition counts by type and status for the reporting period.',
      generate: () => {
        const headers = ['Type', 'Count']
        const rows = analytics?.petitions.byType.map((r) => [r.type, String(r.count)]) ?? []
        exportCSV('petition-activity.csv', [headers, ...rows], 'Petition Activity')
      },
    },
    {
      id: 'articulation',
      title: 'Transfer Credit Summary',
      description: 'Articulation requests by status — supports AACRAO transfer equivalency reporting.',
      generate: () => {
        const headers = ['Status', 'Count']
        const rows = analytics?.articulation.byStatus.map((r) => [r.status, String(r.count)]) ?? []
        exportCSV('transfer-credit-summary.csv', [headers, ...rows], 'Transfer Credit Summary')
      },
    },
    {
      id: 'audits',
      title: 'Degree Audit Status Summary',
      description: 'Breakdown of degree audit results by status.',
      generate: () => {
        const headers = ['Status', 'Count']
        const rows = analytics?.degreeAudit.byStatus.map((r) => [r.status, String(r.count)]) ?? []
        exportCSV('degree-audit-summary.csv', [headers, ...rows], 'Degree Audit Summary')
      },
    },
  ]

  return (
    <RegistrarLayout title="Reports" subtitle="Generate compliance and enrollment reports for export">
      {/* Disclaimer */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-800">
        <AlertTriangle className="size-4 flex-shrink-0 mt-0.5 text-amber-600" />
        <span>
          <strong>Data Verification Required</strong> — Exported reports are for review purposes only.
          You are responsible for verifying all data before any official submission.
          Do not submit AI-generated reports to federal agencies without human review.
        </span>
      </div>

      {exported && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          ✓ &quot;{exported}&quot; exported successfully. Please verify the data before use.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border-2 border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <ClipboardList className="size-5 text-[#0033A0]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{report.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                </div>
              </div>
              <button
                onClick={report.generate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0033A0] text-white rounded-lg hover:bg-blue-800 flex-shrink-0"
              >
                <Download className="size-3.5" />
                Export for Review
              </button>
            </div>
          ))}
        </div>
      )}
    </RegistrarLayout>
  )
}
