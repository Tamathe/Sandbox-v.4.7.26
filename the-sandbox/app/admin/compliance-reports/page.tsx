'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'

const ComplianceTrendChart = dynamic(
  () => import('./ComplianceTrendChart').then(m => m.ComplianceTrendChart),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-gray-100" /> }
)
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type TrendDay = { date: string; tos: number; consent: number; ferpa: number }
type UserRow = {
  name: string
  email: string
  role: string
  tosAcceptedAt: string | null
  dataConsentAt: string | null
  ferpaAckAt: string | null
  acceptedTosVersion: string | null
  acceptedConsentVersion: string | null
  acceptedFerpaVersion: string | null
}

export default function ComplianceReportsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [trends, setTrends] = useState<TrendDay[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/compliance-trends', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.status === 403) {
        router.replace('/')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setTrends(data.trends)
        setUsers(data.users)
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void fetchData()
  }, [currentUser.role, fetchData, router])

  function handleExportCSV() {
    const headers = ['Name', 'Email', 'Role', 'TOS Accepted At', 'Data Consent At', 'FERPA Ack At', 'TOS Version', 'Consent Version', 'FERPA Version']
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.tosAcceptedAt ? format(new Date(u.tosAcceptedAt), 'yyyy-MM-dd HH:mm') : '',
      u.dataConsentAt ? format(new Date(u.dataConsentAt), 'yyyy-MM-dd HH:mm') : '',
      u.ferpaAckAt ? format(new Date(u.ferpaAckAt), 'yyyy-MM-dd HH:mm') : '',
      u.acceptedTosVersion ?? '',
      u.acceptedConsentVersion ?? '',
      u.acceptedFerpaVersion ?? '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-status-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Compliance Reports"
        subtitle="Acceptance trends and exportable compliance status"
        action={
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Trend Chart */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Acceptance Trends — Last 30 Days</h2>
          <div className="h-[320px]">
            <ComplianceTrendChart trends={trends} />
          </div>
        </section>

        {/* Export CSV */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Export Compliance Status</h2>
              <p className="text-sm text-gray-500 mt-1">
                Download a CSV of all {users.length} users with their compliance status and accepted versions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: '#0033A0' }}
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">User</th>
                  <th className="pb-2 pr-4 font-semibold">Role</th>
                  <th className="pb-2 pr-4 font-semibold text-center">TOS</th>
                  <th className="pb-2 pr-4 font-semibold text-center">Consent</th>
                  <th className="pb-2 pr-4 font-semibold text-center">FERPA</th>
                  <th className="pb-2 pr-4 font-semibold">TOS Ver.</th>
                  <th className="pb-2 pr-4 font-semibold">Consent Ver.</th>
                  <th className="pb-2 font-semibold">FERPA Ver.</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 20).map((u) => (
                  <tr key={u.email} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'EDUCATOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-center text-xs text-gray-500">
                      {u.tosAcceptedAt ? format(new Date(u.tosAcceptedAt), 'MMM d') : '—'}
                    </td>
                    <td className="py-2 pr-4 text-center text-xs text-gray-500">
                      {u.dataConsentAt ? format(new Date(u.dataConsentAt), 'MMM d') : '—'}
                    </td>
                    <td className="py-2 pr-4 text-center text-xs text-gray-500">
                      {u.ferpaAckAt ? format(new Date(u.ferpaAckAt), 'MMM d') : '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{u.acceptedTosVersion ?? '—'}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{u.acceptedConsentVersion ?? '—'}</td>
                    <td className="py-2 text-xs text-gray-500">{u.acceptedFerpaVersion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length > 20 && (
              <p className="mt-2 text-xs text-gray-400">Showing first 20 of {users.length} users. Export CSV for the full list.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
