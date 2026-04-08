'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'

interface ReportState {
  status: string
  reportId?: string
  reportHtml?: string
  generatedAt?: string
}

export default function SandcastleReportPage() {
  const params = useParams<{ roomId: string }>()
  const { currentUser } = useAuth()
  const roomId = params.roomId

  const [report, setReport] = useState<ReportState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchReport() {
    try {
      const res = await fetch(`/api/sandcastle/rooms/${roomId}/report`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to fetch report')
      const data = (await res.json()) as ReportState
      setReport(data)
      setLoading(false)

      if (data.status === 'COMPLETE' && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReport()
    // Poll every 5 s until complete
    pollRef.current = setInterval(() => void fetchReport(), 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.email])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <Link href={`/sandcastle/${roomId}`} className="mt-4 inline-block text-sm text-[#0033A0] hover:underline">
            ← Back to room
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Session Report"
        subtitle={report?.generatedAt ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : 'Post-session analysis'}
        action={
          <Link
            href={`/sandcastle/${roomId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Room
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {report?.status !== 'COMPLETE' ? (
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-12 text-center">
            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="size-8 animate-spin text-[#0033A0]" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Generating Report…</h2>
            <p className="text-gray-500 text-sm">This page will refresh automatically when the report is ready.</p>
            <p className="text-xs text-gray-400 mt-2">Status: {report?.status ?? 'PENDING'}</p>
          </div>
        ) : (
          <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
              <FileText className="size-5 text-[#0033A0]" />
              <h2 className="font-extrabold text-gray-900">Report</h2>
            </div>
            <div
              className="p-6"
              dangerouslySetInnerHTML={{ __html: report?.reportHtml ?? '' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
