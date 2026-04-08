'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Star,
  Sparkles,
  FileText,
  Upload,
  Share2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react'
import SegmentedControl from '../components/SegmentedControl'

interface Artifact {
  id: string
  title: string
  description: string | null
  sourceType: string
  courseId: string | null
  course?: { courseCode: string; title: string }
  aiAnalysis: Record<string, unknown> | null
  reflection: string | null
  bloomLevel: number | null
  featured: boolean
  mappings: {
    id: string
    evidenceStrength: number
    bloomLevel: number
    aiRationale: string
    competency: { code: string; title: string; category: string | null }
  }[]
  createdAt: string
}

interface CompetencyCoverage {
  competencyId: string
  code: string
  title: string
  category: string | null
  artifactCount: number
  avgBloomLevel: number
  avgEvidenceStrength: number
  status: 'demonstrated' | 'partial' | 'not_demonstrated'
}

interface Framework {
  id: string
  name: string
  slug: string
  competencies: { id: string; code: string; title: string; category: string | null }[]
}

type TabId = 'artifacts' | 'competencies'

export default function PortfolioMapperPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [portfolio, setPortfolio] = useState<Record<string, unknown> | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('artifacts')

  // Frameworks + coverage
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('')
  const [coverage, setCoverage] = useState<CompetencyCoverage[]>([])

  // Import modal
  const [showImport, setShowImport] = useState(false)
  const [sessions, setSessions] = useState<{ id: string; tool: { name: string }; course?: { courseCode: string }; startedAt: string; score: number | null }[]>([])
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  // Analyze/reflect state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [reflectingId, setReflectingId] = useState<string | null>(null)

  // Share
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const fetchPortfolio = useCallback(() => {
    if (!currentUser) return
    setLoading(true)
    fetch('/api/portfolio-mapper', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPortfolio(data)
          setArtifacts(data.artifacts || [])
          if (data.shareToken && data.isPublic) {
            setShareUrl(`${window.location.origin}/portfolio-mapper/view/${data.shareToken}`)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  // Fetch frameworks
  useEffect(() => {
    if (!currentUser) return
    fetch('/api/competency/frameworks', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data) => {
        const fw = data.frameworks || []
        setFrameworks(fw)
        if (fw.length > 0 && !selectedFrameworkId) setSelectedFrameworkId(fw[0].id)
      })
      .catch(() => {})
  }, [currentUser])

  // Fetch coverage when framework changes
  useEffect(() => {
    if (!currentUser || !selectedFrameworkId) return
    fetch(`/api/portfolio-mapper/coverage?frameworkId=${selectedFrameworkId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => setCoverage(data.coverage || []))
      .catch(() => {})
  }, [currentUser, selectedFrameworkId, artifacts.length])

  async function handleImportSessions() {
    if (!currentUser || !portfolio || selectedSessions.size === 0) return
    setImporting(true)
    await fetch('/api/portfolio-mapper/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ portfolioId: (portfolio as Record<string, unknown>).id, sessionIds: [...selectedSessions] }),
    })
    setShowImport(false)
    setSelectedSessions(new Set())
    setImporting(false)
    fetchPortfolio()
  }

  async function handleAnalyze(artifactId: string) {
    if (!currentUser) return
    setAnalyzingId(artifactId)
    await fetch(`/api/portfolio-mapper/artifacts/${artifactId}/analyze`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setAnalyzingId(null)
    fetchPortfolio()
  }

  async function handleReflection(artifactId: string) {
    if (!currentUser) return
    setReflectingId(artifactId)
    await fetch(`/api/portfolio-mapper/artifacts/${artifactId}/reflection`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setReflectingId(null)
    fetchPortfolio()
  }

  async function handleToggleFeatured(artifactId: string, current: boolean) {
    if (!currentUser) return
    await fetch(`/api/portfolio-mapper/artifacts/${artifactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ featured: !current }),
    })
    fetchPortfolio()
  }

  async function handleDelete(artifactId: string) {
    if (!currentUser) return
    await fetch(`/api/portfolio-mapper/artifacts/${artifactId}`, {
      method: 'DELETE',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    fetchPortfolio()
  }

  async function handlePublish() {
    if (!currentUser || !portfolio) return
    const res = await fetch('/api/portfolio-mapper/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ portfolioId: (portfolio as Record<string, unknown>).id }),
    })
    const data = await res.json()
    if (data.publicUrl) {
      setShareUrl(`${window.location.origin}${data.publicUrl}`)
    }
    fetchPortfolio()
  }

  async function openImportModal() {
    if (!currentUser) return
    setShowImport(true)
    // Fetch recent sessions
    const res = await fetch('/api/sessions?limit=20', { headers: { 'x-demo-user-email': currentUser.email } })
    const data = await res.json()
    setSessions(data.sessions || [])
  }

  if (!currentUser) return null

  const STATUS_STYLES = {
    demonstrated: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: 'Demonstrated' },
    partial: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', label: 'Partial' },
    not_demonstrated: { icon: XCircle, color: 'text-gray-400 bg-gray-50', label: 'Not Yet' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — Pattern A */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button type="button" onClick={() => router.push('/hub')} className="flex items-center gap-1 text-gray-400 hover:text-[#0033A0] text-sm mb-3 cursor-pointer">
            <ArrowLeft className="size-4" /> Back to Hub
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Portfolio & Competency Mapper</h1>
              <p className="text-sm text-gray-500 mt-1">Curate artifacts, map competencies, share your portfolio</p>
            </div>
            <div className="flex gap-2">
              {shareUrl ? (
                <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-[#0033A0] cursor-pointer">
                  <Copy className="size-4" /> Copy Link
                </button>
              ) : (
                <button type="button" onClick={handlePublish}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] cursor-pointer">
                  <Share2 className="size-4" /> Publish & Share
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center justify-between mb-6">
              <SegmentedControl
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'artifacts' as const, label: <><FileText className="size-4" /> Artifacts ({artifacts.length})</> },
                  { value: 'competencies' as const, label: <><Target className="size-4" /> Competencies</> },
                ]}
              />
              {activeTab === 'artifacts' && (
                <button type="button" onClick={openImportModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] cursor-pointer">
                  <Plus className="size-4" /> Import from Sessions
                </button>
              )}
            </div>

            {/* Artifacts Tab */}
            {activeTab === 'artifacts' && (
              <div className="space-y-4">
                {artifacts.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <Upload className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">No artifacts yet. Import your best tool sessions to get started.</p>
                  </div>
                ) : artifacts.map((a) => {
                  const analysis = a.aiAnalysis as { summary?: string; skills?: string[]; strengths?: string[] } | null
                  return (
                    <div key={a.id} className={`rounded-2xl border-2 bg-white p-5 ${a.featured ? 'border-amber-300' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {a.featured && <Star className="size-4 text-amber-500 fill-amber-500" />}
                            <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {a.course && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0033A0] font-medium">{a.course.courseCode}</span>}
                            {a.bloomLevel && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">Bloom {a.bloomLevel}</span>}
                            <span className="text-xs text-gray-400">{a.sourceType.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleToggleFeatured(a.id, a.featured)} className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer" title="Toggle featured">
                            <Star className={`size-4 ${a.featured ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                          </button>
                          <button type="button" onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" title="Remove">
                            <Trash2 className="size-4 text-gray-300 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Competency tags */}
                      {a.mappings.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {a.mappings.map((m) => (
                            <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium" title={m.aiRationale}>
                              {m.competency.code}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI analysis summary */}
                      {analysis?.summary && (
                        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{analysis.summary}</p>
                      )}

                      {/* Reflection */}
                      {a.reflection && (
                        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-xs font-bold text-blue-700 mb-1">Reflection</p>
                          <p className="text-sm text-blue-900 italic leading-relaxed">{a.reflection}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        {!analysis && (
                          <button type="button" onClick={() => handleAnalyze(a.id)} disabled={analyzingId === a.id}
                            className="flex items-center gap-1 text-xs font-medium text-[#0033A0] hover:underline cursor-pointer">
                            {analyzingId === a.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                            {analyzingId === a.id ? 'Analyzing...' : 'Analyze & Map Competencies'}
                          </button>
                        )}
                        {!a.reflection && (
                          <button type="button" onClick={() => handleReflection(a.id)} disabled={reflectingId === a.id}
                            className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline cursor-pointer">
                            {reflectingId === a.id ? <Loader2 className="size-3 animate-spin" /> : <FileText className="size-3" />}
                            {reflectingId === a.id ? 'Drafting...' : 'Draft Reflection'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Competencies Tab */}
            {activeTab === 'competencies' && (
              <div className="space-y-4">
                {frameworks.length > 0 && (
                  <select value={selectedFrameworkId} onChange={(e) => setSelectedFrameworkId(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] bg-white">
                    {frameworks.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                  </select>
                )}

                {/* Coverage summary */}
                {coverage.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-xl bg-emerald-50">
                      <p className="text-2xl font-extrabold text-emerald-700">{coverage.filter((c) => c.status === 'demonstrated').length}</p>
                      <p className="text-xs text-gray-600 font-medium">Demonstrated</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-50">
                      <p className="text-2xl font-extrabold text-amber-700">{coverage.filter((c) => c.status === 'partial').length}</p>
                      <p className="text-xs text-gray-600 font-medium">Partial</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gray-50">
                      <p className="text-2xl font-extrabold text-gray-500">{coverage.filter((c) => c.status === 'not_demonstrated').length}</p>
                      <p className="text-xs text-gray-600 font-medium">Not Yet</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border-2 border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-bold text-gray-700">Competency</th>
                        <th className="text-left px-4 py-3 font-bold text-gray-700 w-28">Category</th>
                        <th className="text-center px-4 py-3 font-bold text-gray-700 w-24">Evidence</th>
                        <th className="text-center px-4 py-3 font-bold text-gray-700 w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((c) => {
                        const style = STATUS_STYLES[c.status]
                        const Icon = style.icon
                        return (
                          <tr key={c.competencyId} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-900">{c.code}</span>
                              <span className="text-gray-600 ml-1.5">{c.title}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{c.category || '-'}</td>
                            <td className="px-4 py-3 text-center">{c.artifactCount} artifact{c.artifactCount !== 1 ? 's' : ''}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${style.color}`}>
                                <Icon className="size-3.5" /> {style.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Modal */}
            {showImport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Import Tool Sessions</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                    {sessions.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No tool sessions found.</p>
                    ) : sessions.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] cursor-pointer">
                        <input type="checkbox" checked={selectedSessions.has(s.id)}
                          onChange={() => {
                            const next = new Set(selectedSessions)
                            next.has(s.id) ? next.delete(s.id) : next.add(s.id)
                            setSelectedSessions(next)
                          }}
                          className="accent-[#0033A0]" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.tool?.name ?? 'Session'}</p>
                          <p className="text-xs text-gray-500">{s.course?.courseCode ?? 'General'} · {new Date(s.startedAt).toLocaleDateString()}{s.score !== null ? ` · Score: ${Math.round(s.score * 100)}%` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleImportSessions} disabled={importing || selectedSessions.size === 0}
                      className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                      {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      Import {selectedSessions.size} Session{selectedSessions.size !== 1 ? 's' : ''}
                    </button>
                    <button type="button" onClick={() => setShowImport(false)}
                      className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
