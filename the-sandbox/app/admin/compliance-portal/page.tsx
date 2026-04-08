'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../../components/PageHeader'
import Breadcrumb from '../../components/Breadcrumb'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

type RiskData = {
  overallScore: number
  riskLevel: string
  breakdown: Array<{ category: string; score: number; description: string }>
}

type BootstrapResult = {
  seeded: Record<string, number>
  alreadyExisted: string[]
}

type APIEndpointEntry = {
  method: string
  path: string
  auth: string
  description: string
}

type APIDirectoryCategory = {
  category: string
  endpoints: APIEndpointEntry[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PATCH: 'bg-amber-100 text-amber-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const DASHBOARD_LINKS = [
  { href: '/admin/compliance-summary', icon: ClipboardCheck, title: 'Compliance Summary', description: 'Overview of all compliance statuses across the institution' },
  { href: '/admin/compliance-dashboard', icon: BarChart2, title: 'Compliance Dashboard', description: 'Interactive dashboard with real-time compliance metrics' },
  { href: '/admin/compliance-trends', icon: TrendingUp, title: 'Compliance Trends', description: 'Historical trends and trajectory analysis' },
  { href: '/admin/compliance-maturity', icon: ShieldCheck, title: 'Maturity Assessment', description: 'Compliance program maturity evaluation' },
]

const OPERATIONS_LINKS = [
  { href: '/admin/compliance-actions', icon: Zap, title: 'Quick Actions', description: 'One-click compliance management actions' },
  { href: '/admin/compliance-calendar', icon: Calendar, title: 'Compliance Calendar', description: 'Deadlines, renewal dates, and audit schedules' },
  { href: '/admin/compliance-exports', icon: Download, title: 'Export Hub', description: 'CSV, SIEM, and report exports' },
  { href: '/admin/compliance-readiness', icon: Shield, title: 'Readiness Assessment', description: 'Audit readiness and gap analysis' },
]

const ADMIN_LINKS = [
  { href: '/admin?tab=compliance', icon: Database, title: 'Compliance Tab', description: 'User compliance status, consent management, and audit logs' },
  { href: '/compliance', icon: Users, title: 'User Self-Service', description: 'Self-service compliance portal for all users' },
]

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`h-1 w-6 rounded-full ${color}`} />
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
    </div>
  )
}

function LinkCard({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 transition-colors hover:border-[#0033A0]/30 hover:shadow-sm"
    >
      <div className="flex items-center justify-center size-9 rounded-xl bg-gray-100 shrink-0 group-hover:bg-blue-50">
        <Icon className="size-4 text-gray-500 group-hover:text-[#0033A0]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 group-hover:text-[#0033A0]">{title}</div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="size-4 text-gray-300 group-hover:text-[#0033A0] shrink-0 mt-0.5" />
    </Link>
  )
}

export default function CompliancePortalPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [riskLoading, setRiskLoading] = useState(true)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapResult, setBootstrapResult] = useState<BootstrapResult | null>(null)
  const [apiDirectory, setApiDirectory] = useState<APIDirectoryCategory[]>([])
  const [totalEndpoints, setTotalEndpoints] = useState(0)
  const [apiLoading, setApiLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }

    const controller = new AbortController()

    const fetchRisk = async () => {
      try {
        const data = await apiFetch<RiskData>(currentUser.email, '/api/admin/compliance-risk', {
          signal: controller.signal,
        })
        setRiskData(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      } finally {
        setRiskLoading(false)
      }
    }

    const fetchDirectory = async () => {
      try {
        const data = await apiFetch<{ directory?: APIDirectoryCategory[]; totalEndpoints?: number }>(
          currentUser.email,
          '/api/admin/compliance-api-directory',
          { signal: controller.signal },
        )
        setApiDirectory(data.directory ?? [])
        setTotalEndpoints(data.totalEndpoints ?? 0)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      } finally {
        setApiLoading(false)
      }
    }

    void fetchRisk()
    void fetchDirectory()
    return () => controller.abort()
  }, [currentUser, router])

  const handleBootstrap = async () => {
    setBootstrapLoading(true)
    setBootstrapResult(null)
    try {
      const data = await apiFetch<BootstrapResult>(currentUser.email, '/api/admin/compliance-bootstrap', {
        method: 'POST',
      })
      setBootstrapResult(data)
      // Refresh risk data
      const riskRefresh = await apiFetch<RiskData>(currentUser.email, '/api/admin/compliance-risk')
      setRiskData(riskRefresh)
    } catch {
      // ignore
    } finally {
      setBootstrapLoading(false)
    }
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  if (currentUser.role !== 'ADMIN') return null

  // Derive quick stats from risk breakdown
  const avgScore = riskData ? riskData.overallScore : 0
  const ferpaItem = riskData?.breakdown.find(b => b.category === 'FERPA Training')
  const ferpaRate = ferpaItem ? ferpaItem.score : 0
  const incidentItem = riskData?.breakdown.find(b => b.category === 'Incident Response')
  const activeIncidents = incidentItem ? (incidentItem.score < 80 ? Math.round((100 - incidentItem.score) / 10) : 0) : 0
  const consentItem = riskData?.breakdown.find(b => b.category === 'Consent Coverage')
  const consentCoverage = consentItem ? consentItem.score : 0

  const showBootstrapButton = !riskLoading && (!riskData || riskData.overallScore === 0)

  return (
    <>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Compliance Portal' }]} />
      <PageHeader title="Compliance Portal" subtitle="University of Kentucky Compliance Management System" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Hero: Risk Score + Quick Stats */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Risk score circle */}
            <div className="flex flex-col items-center shrink-0">
              {riskLoading ? (
                <div className="flex items-center justify-center" style={{ width: 120, height: 120 }}>
                  <Loader2 className="size-8 animate-spin text-gray-300" />
                </div>
              ) : (
                <>
                  <div
                    className={`relative flex items-center justify-center rounded-full border-4 ${
                      avgScore >= 80 ? 'border-emerald-400' : avgScore >= 50 ? 'border-amber-400' : 'border-red-400'
                    }`}
                    style={{ width: 120, height: 120 }}
                  >
                    <span className={`text-4xl font-extrabold ${avgScore >= 80 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {avgScore}
                    </span>
                  </div>
                  {riskData && (
                    <span className={`mt-2 rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${
                      riskData.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700'
                      : riskData.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700'
                      : riskData.riskLevel === 'high' ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {riskData.riskLevel} risk
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Quick stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 w-full">
              <div className="rounded-xl border border-gray-100 p-3">
                <div className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Avg Score</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{riskLoading ? '--' : avgScore}</div>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <div className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">FERPA Rate</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{riskLoading ? '--' : `${ferpaRate}%`}</div>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <div className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Active Incidents</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{riskLoading ? '--' : activeIncidents}</div>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <div className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Consent Coverage</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{riskLoading ? '--' : `${consentCoverage}%`}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Bootstrap button (shown when system is uninitialized) */}
        {showBootstrapButton && (
          <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-1">
                <h2 className="text-sm font-extrabold text-amber-900">Initialize Compliance System</h2>
                <p className="text-xs text-amber-700 mt-1">
                  Seed default regulatory requirements, benchmarks, templates, playbooks, data classifications, and retention policies with one click.
                </p>
              </div>
              <button
                onClick={handleBootstrap}
                disabled={bootstrapLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 shrink-0"
              >
                {bootstrapLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {bootstrapLoading ? 'Initializing...' : 'Initialize'}
              </button>
            </div>
            {bootstrapResult && (
              <div className="mt-3 rounded-xl bg-white border border-amber-200 p-3 text-xs text-gray-700">
                <p className="font-semibold text-emerald-700 mb-1">Bootstrap complete</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {Object.entries(bootstrapResult.seeded).map(([key, count]) => (
                    <span key={key}>{key}: <span className="font-bold">{count}</span> seeded</span>
                  ))}
                </div>
                {bootstrapResult.alreadyExisted.length > 0 && (
                  <p className="mt-1 text-gray-400">Already existed: {bootstrapResult.alreadyExisted.join(', ')}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Dashboards & Analytics */}
        <section>
          <SectionHeader title="Dashboards & Analytics" color="bg-[#0033A0]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DASHBOARD_LINKS.map(link => (
              <LinkCard key={link.href} {...link} />
            ))}
          </div>
        </section>

        {/* Operations */}
        <section>
          <SectionHeader title="Operations" color="bg-emerald-500" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPERATIONS_LINKS.map(link => (
              <LinkCard key={link.href} {...link} />
            ))}
          </div>
        </section>

        {/* Administration */}
        <section>
          <SectionHeader title="Administration" color="bg-amber-500" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADMIN_LINKS.map(link => (
              <LinkCard key={link.href} {...link} />
            ))}
          </div>
        </section>

        {/* API Reference */}
        <section>
          <SectionHeader title="API Reference" color="bg-gray-500" />
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Compliance API Endpoints</span>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                {apiLoading ? '...' : `${totalEndpoints} endpoints`}
              </span>
            </div>

            {apiLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="space-y-1">
                {apiDirectory.map(cat => {
                  const isExpanded = expandedCategories.has(cat.category)
                  return (
                    <div key={cat.category} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(cat.category)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown className="size-3.5 text-gray-400" />
                            : <ChevronRight className="size-3.5 text-gray-400" />
                          }
                          <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">
                          {cat.endpoints.length}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {cat.endpoints.map((ep, i) => (
                            <div key={`${ep.method}-${ep.path}-${i}`} className="flex items-start gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0">
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-600'}`}>
                                {ep.method}
                              </span>
                              <code className="text-xs text-gray-600 font-mono break-all flex-1">{ep.path}</code>
                              <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block max-w-[200px] truncate" title={ep.description}>
                                {ep.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
