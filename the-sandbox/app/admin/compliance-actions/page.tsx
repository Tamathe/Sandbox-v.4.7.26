'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ShieldAlert,
  FileText,
  ClipboardCheck,
  BarChart3,
  Activity,
  Download,
  Eye,
  Play,
  RefreshCw,
  Link2,
  Calendar,
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  FileBarChart,
  Archive,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type ActionResult = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  result,
}: {
  label: string
  icon: typeof Play
  onClick: () => void
  result: ActionResult
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="size-4 text-[#0033A0] shrink-0" />
        <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {result.status === 'loading' && <Loader2 className="size-4 animate-spin text-[#0033A0]" />}
        {result.status === 'success' && <CheckCircle className="size-4 text-green-600" />}
        {result.status === 'error' && <AlertTriangle className="size-4 text-red-600" />}
        <button
          onClick={onClick}
          disabled={result.status === 'loading'}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0033A0] text-white hover:bg-[#002880] disabled:opacity-50 transition-colors"
        >
          {result.status === 'loading' ? 'Running...' : 'Run'}
        </button>
      </div>
      {result.message && (
        <p className={`text-xs mt-1 ${result.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}

function ActionLink({
  label,
  icon: Icon,
  href,
}: {
  label: string
  icon: typeof Eye
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
    >
      <Icon className="size-4 text-[#0033A0] shrink-0" />
      <span className="text-sm font-medium text-gray-700 group-hover:text-[#0033A0] transition-colors">
        {label}
      </span>
      <Link2 className="size-3 text-gray-400 ml-auto shrink-0" />
    </Link>
  )
}

export default function ComplianceActionsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [healthResult, setHealthResult] = useState<ActionResult>({ status: 'idle' })
  const [captureResult, setCaptureResult] = useState<ActionResult>({ status: 'idle' })
  const [evidenceResult, setEvidenceResult] = useState<ActionResult>({ status: 'idle' })
  const [testResult, setTestResult] = useState<ActionResult>({ status: 'idle' })
  const [chainResult, setChainResult] = useState<ActionResult>({ status: 'idle' })

  if (!currentUser || currentUser.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  const headers = { 'x-demo-user-email': currentUser.email }

  async function runAction(
    setter: (r: ActionResult) => void,
    url: string,
    method: 'GET' | 'POST' = 'GET',
  ) {
    setter({ status: 'loading' })
    try {
      const res = await fetch(url, { method, headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const msg = data.status ?? data.message ?? 'Completed successfully'
      setter({ status: 'success', message: typeof msg === 'string' ? msg : 'Done' })
    } catch (e) {
      setter({ status: 'error', message: e instanceof Error ? e.message : 'Failed' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Compliance Quick Actions"
        subtitle="One-stop operational hub for compliance officers"
        action={
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0033A0] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Respond Section */}
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="size-5 text-red-600" />
              <h2 className="text-lg font-extrabold text-gray-900">Respond</h2>
            </div>
            <div className="space-y-2">
              <ActionLink label="View open incidents" icon={AlertTriangle} href="/admin" />
              <ActionButton
                label="Run health check"
                icon={Activity}
                onClick={() => runAction(setHealthResult, '/api/admin/compliance-health')}
                result={healthResult}
              />
              <ActionLink label="View pending approvals" icon={ClipboardCheck} href="/admin" />
            </div>
            {healthResult.message && (
              <p className={`text-xs mt-3 px-3 ${healthResult.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {healthResult.message}
              </p>
            )}
          </div>

          {/* Generate Section */}
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="size-5 text-[#0033A0]" />
              <h2 className="text-lg font-extrabold text-gray-900">Generate</h2>
            </div>
            <div className="space-y-2">
              <ActionButton
                label="Capture metric snapshot"
                icon={BarChart3}
                onClick={() => runAction(setCaptureResult, '/api/admin/compliance-metrics/capture', 'POST')}
                result={captureResult}
              />
              <ActionButton
                label="Auto-collect evidence"
                icon={Archive}
                onClick={() => runAction(setEvidenceResult, '/api/admin/compliance-evidence/auto-collect', 'POST')}
                result={evidenceResult}
              />
              <ActionButton
                label="Run compliance tests"
                icon={Play}
                onClick={() => runAction(setTestResult, '/api/admin/compliance-test')}
                result={testResult}
              />
              <ActionButton
                label="Verify audit chain"
                icon={RefreshCw}
                onClick={() => runAction(setChainResult, '/api/admin/compliance-audit-chain/verify', 'POST')}
                result={chainResult}
              />
            </div>
            {captureResult.message && (
              <p className={`text-xs mt-3 px-3 ${captureResult.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                Snapshot: {captureResult.message}
              </p>
            )}
            {evidenceResult.message && (
              <p className={`text-xs mt-1 px-3 ${evidenceResult.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                Evidence: {evidenceResult.message}
              </p>
            )}
            {testResult.message && (
              <p className={`text-xs mt-1 px-3 ${testResult.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                Tests: {testResult.message}
              </p>
            )}
            {chainResult.message && (
              <p className={`text-xs mt-1 px-3 ${chainResult.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                Chain: {chainResult.message}
              </p>
            )}
          </div>

          {/* Export Section */}
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Download className="size-5 text-emerald-600" />
              <h2 className="text-lg font-extrabold text-gray-900">Export</h2>
            </div>
            <div className="space-y-2">
              <ActionLink label="Export Hub" icon={Download} href="/admin/compliance-exports" />
              <ActionLink label="Compliance Summary" icon={FileBarChart} href="/admin/compliance-summary" />
              <ActionLink label="Maturity Assessment" icon={BarChart3} href="/admin/compliance-maturity" />
            </div>
          </div>

          {/* Review Section */}
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="size-5 text-amber-600" />
              <h2 className="text-lg font-extrabold text-gray-900">Review</h2>
            </div>
            <div className="space-y-2">
              <ActionLink label="Compliance Calendar" icon={Calendar} href="/admin/compliance-calendar" />
              <ActionLink label="Readiness Assessment" icon={ShieldCheck} href="/admin/compliance-readiness" />
              <ActionLink label="Compliance Trends" icon={TrendingUp} href="/admin/compliance-trends" />
              <ActionLink label="Full Dashboard" icon={LayoutDashboard} href="/admin/compliance-dashboard" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
