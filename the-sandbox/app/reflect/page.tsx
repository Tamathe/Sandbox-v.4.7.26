'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Brain, Plus, MessageSquare, BarChart3, BookOpen,
  TrendingUp, ChevronRight, Share2, Gauge,
  Lightbulb, AlertTriangle, Zap,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

// ── Types ───────────────────────────────────────────────────────────────

interface Reflection {
  id: string
  trigger: string
  prompt: string | null
  content: string
  tags: string[]
  concept: string | null
  sharedWithGroup: boolean
  createdAt: string
}

interface ConfidenceCheck {
  id: string
  concept: string
  predictedScore: number
  actualScore: number | null
  calibrationDelta: number | null
  createdAt: string
}

interface CalibrationSummary {
  totalChecks: number
  avgDelta: number
  tendency: 'underconfident' | 'overconfident' | 'well-calibrated' | 'none'
}

interface WeeklyJournal {
  id: string
  weekOf: string
  prompt: string
  biggestInsight: string | null
  biggestChallenge: string | null
  nextWeekFocus: string | null
  freeform: string | null
  activitySummary: { toolSessions: number; studyMinutes: number; topConcepts: string[]; toolsUsed: string[] } | null
}

interface GrowthConcept {
  concept: string
  masteryLevel: number
  encounterCount: number
  successCount: number
}

const tendencyConfig = {
  underconfident: { label: 'Underconfident', color: 'text-blue-600', desc: 'You tend to underestimate yourself — trust your prep!' },
  overconfident: { label: 'Overconfident', color: 'text-amber-600', desc: 'You tend to overestimate — spend a bit more time on weak spots.' },
  'well-calibrated': { label: 'Well Calibrated', color: 'text-green-600', desc: 'Your self-assessment closely matches reality. Great metacognition!' },
  none: { label: 'No Data', color: 'text-gray-400', desc: 'Try a confidence check to start building self-awareness.' },
}

// ── Page ────────────────────────────────────────────────────────────────

export default function ReflectPage() {
  const { currentUser } = useAuth()
  const email = currentUser.email
  const [tab, setTab] = useState<'journal' | 'reflections' | 'confidence' | 'growth'>('journal')
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [checks, setChecks] = useState<ConfidenceCheck[]>([])
  const [calibration, setCalibration] = useState<CalibrationSummary | null>(null)
  const [journal, setJournal] = useState<WeeklyJournal | null>(null)
  const [growthConcepts, setGrowthConcepts] = useState<GrowthConcept[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [refData, calData, journalData, growthData] = await Promise.all([
        apiFetch<{ reflections: Reflection[] }>(email, '/api/reflect/reflections'),
        apiFetch<CalibrationSummary>(email, '/api/reflect/confidence?action=summary'),
        apiFetch<{ journal: WeeklyJournal }>(email, '/api/reflect/journal'),
        apiFetch<{ concepts: GrowthConcept[] }>(email, '/api/reflect/growth'),
      ])
      setReflections(refData.reflections)
      setCalibration(calData)
      setJournal(journalData.journal)
      setGrowthConcepts(growthData.concepts)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [email])

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    if (tab === 'confidence') {
      apiFetch<{ checks: ConfidenceCheck[] }>(email, '/api/reflect/confidence')
        .then(d => setChecks(d.checks))
        .catch(() => {})
    }
  }, [tab, email])

  const tabs = [
    { id: 'journal' as const, label: 'Weekly Journal', icon: <BookOpen className="size-4" /> },
    { id: 'reflections' as const, label: 'Reflections', icon: <MessageSquare className="size-4" /> },
    { id: 'confidence' as const, label: 'Confidence', icon: <Gauge className="size-4" /> },
    { id: 'growth' as const, label: 'Growth', icon: <TrendingUp className="size-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Reflect"
        subtitle="Build self-awareness about your learning. The strongest predictor of academic success."
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Calibration Summary */}
        {calibration && calibration.totalChecks > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 flex items-center gap-4">
            <Gauge className={`size-5 shrink-0 ${tendencyConfig[calibration.tendency].color}`} />
            <div>
              <p className="font-semibold text-gray-900">
                Confidence calibration: <span className={tendencyConfig[calibration.tendency].color}>{tendencyConfig[calibration.tendency].label}</span>
              </p>
              <p className="text-sm text-gray-500">{tendencyConfig[calibration.tendency].desc}</p>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-2xl font-extrabold text-gray-900">{calibration.totalChecks}</p>
              <p className="text-xs text-gray-400">checks</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-16 text-gray-400">Loading...</div>}

        {!loading && tab === 'journal' && journal && (
          <JournalTab journal={journal} email={email} onUpdate={j => setJournal(j)} />
        )}
        {!loading && tab === 'reflections' && (
          <ReflectionsTab reflections={reflections} email={email} onCreated={fetchAll} />
        )}
        {!loading && tab === 'confidence' && (
          <ConfidenceTab checks={checks} email={email} onCreated={fetchAll} />
        )}
        {!loading && tab === 'growth' && (
          <GrowthTab concepts={growthConcepts} />
        )}
      </div>
    </div>
  )
}

// ── Journal Tab ─────────────────────────────────────────────────────────

function JournalTab({ journal, email, onUpdate }: { journal: WeeklyJournal; email: string; onUpdate: (j: WeeklyJournal) => void }) {
  const [insight, setInsight] = useState(journal.biggestInsight ?? '')
  const [challenge, setChallenge] = useState(journal.biggestChallenge ?? '')
  const [focus, setFocus] = useState(journal.nextWeekFocus ?? '')
  const [freeform, setFreeform] = useState(journal.freeform ?? '')
  const [saving, setSaving] = useState(false)

  const summary = journal.activitySummary

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await apiFetch<{ journal: WeeklyJournal }>(email, '/api/reflect/journal', {
        method: 'PUT',
        body: JSON.stringify({
          id: journal.id,
          biggestInsight: insight || undefined,
          biggestChallenge: challenge || undefined,
          nextWeekFocus: focus || undefined,
          freeform: freeform || undefined,
        }),
      })
      onUpdate(data.journal)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="size-5 text-[#0033A0]" /> Your Week at a Glance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Sessions</p><p className="text-xl font-extrabold text-gray-900">{summary.toolSessions}</p></div>
            <div><p className="text-xs text-gray-500">Study Time</p><p className="text-xl font-extrabold text-gray-900">{summary.studyMinutes}m</p></div>
            <div><p className="text-xs text-gray-500">Tools Used</p><p className="text-xl font-extrabold text-gray-900">{summary.toolsUsed.length}</p></div>
            <div><p className="text-xs text-gray-500">Top Concepts</p><p className="text-sm text-gray-700">{summary.topConcepts.slice(0, 3).join(', ') || '—'}</p></div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="size-5 text-[#0033A0]" />
          <h3 className="font-extrabold text-gray-900">Weekly Reflection</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">Week of {new Date(journal.weekOf).toLocaleDateString()}</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-[#0033A0] font-medium flex items-center gap-2">
            <Lightbulb className="size-4" /> Sandy asks: {journal.prompt}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What was your biggest insight this week?</label>
            <textarea value={insight} onChange={e => setInsight(e.target.value)} placeholder="Something that clicked, a connection you made..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What was the hardest thing you tackled?</label>
            <textarea value={challenge} onChange={e => setChallenge(e.target.value)} placeholder="A concept that's still fuzzy, a problem that stumped you..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What will you focus on next week?</label>
            <textarea value={focus} onChange={e => setFocus(e.target.value)} placeholder="A goal, a concept to revisit, a habit to build..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anything else? <span className="text-gray-400">(optional)</span></label>
            <textarea value={freeform} onChange={e => setFreeform(e.target.value)} placeholder="Free reflection..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none" />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Brain />}>Save Reflection</Button>
        </div>
      </div>
    </div>
  )
}

// ── Reflections Tab ─────────────────────────────────────────────────────

function ReflectionsTab({ reflections, email, onCreated }: { reflections: Reflection[]; email: string; onCreated: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [content, setContent] = useState('')
  const [concept, setConcept] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await apiFetch(email, '/api/reflect/reflections', {
        method: 'POST',
        body: JSON.stringify({ trigger: 'MANUAL', content: content.trim(), concept: concept.trim() || undefined }),
      })
      setContent(''); setConcept(''); setShowNew(false); onCreated()
    } finally { setSaving(false) }
  }

  const handleToggleShare = async (id: string) => {
    await apiFetch(email, '/api/reflect/reflections', { method: 'POST', body: JSON.stringify({ action: 'toggle-share', reflectionId: id }) })
    onCreated()
  }

  const triggerLabels: Record<string, string> = { POST_SESSION: 'After session', WEEKLY_JOURNAL: 'Weekly', MANUAL: 'Personal', MILESTONE: 'Milestone' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-gray-900">Your Reflections</h3>
        <Button size="sm" onClick={() => setShowNew(!showNew)} icon={<Plus />}>New Reflection</Button>
      </div>

      {showNew && (
        <div className="bg-white border-2 border-[#0033A0]/20 rounded-2xl p-5 mb-4">
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind about your learning?" rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-[#0033A0] resize-none" autoFocus />
          <div className="flex items-center gap-3">
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)} placeholder="Related concept (optional)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0033A0]" />
            <Button size="sm" onClick={handleCreate} loading={saving} disabled={!content.trim()}>Save</Button>
          </div>
        </div>
      )}

      {reflections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="size-10 mx-auto mb-3 text-gray-300" />
          <p>No reflections yet. Start building self-awareness.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{r.content}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{triggerLabels[r.trigger] ?? r.trigger}</span>
                    {r.concept && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{r.concept}</span>}
                    {r.tags.map(t => <span key={t} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
                <button onClick={() => handleToggleShare(r.id)} className={`shrink-0 p-1.5 rounded-lg transition-colors ${r.sharedWithGroup ? 'bg-blue-100 text-[#0033A0]' : 'text-gray-300 hover:text-gray-500'}`} title={r.sharedWithGroup ? 'Shared with study group' : 'Share with study group'}>
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Confidence Tab ──────────────────────────────────────────────────────

function ConfidenceTab({ checks, email, onCreated }: { checks: ConfidenceCheck[]; email: string; onCreated: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [concept, setConcept] = useState('')
  const [predicted, setPredicted] = useState(3)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!concept.trim()) return
    setSaving(true)
    try {
      await apiFetch(email, '/api/reflect/confidence', { method: 'POST', body: JSON.stringify({ concept: concept.trim(), predictedScore: predicted }) })
      setConcept(''); setPredicted(3); setShowNew(false); onCreated()
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-gray-900">Confidence Calibration</h3>
          <p className="text-sm text-gray-500">Rate your confidence before studying, then compare with reality.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)} icon={<Plus />}>New Check</Button>
      </div>

      {showNew && (
        <div className="bg-white border-2 border-[#0033A0]/20 rounded-2xl p-5 mb-4">
          <input type="text" value={concept} onChange={e => setConcept(e.target.value)} placeholder="What concept are you about to study?" className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-[#0033A0]" autoFocus />
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">How well do you think you know this? (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setPredicted(n)} className={`size-10 rounded-lg font-bold transition-colors ${predicted === n ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{n}</button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1"><span>No idea</span><span>Expert</span></div>
          </div>
          <Button size="sm" onClick={handleCreate} loading={saving} disabled={!concept.trim()} icon={<Zap />}>Log Prediction</Button>
        </div>
      )}

      {checks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Gauge className="size-10 mx-auto mb-3 text-gray-300" />
          <p>No confidence checks yet. Predict before you study!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map(c => {
            const delta = c.calibrationDelta ?? 0
            const deltaColor = delta > 0 ? 'text-blue-600' : delta < 0 ? 'text-amber-600' : 'text-green-600'
            const deltaLabel = delta > 0 ? 'Underestimated' : delta < 0 ? 'Overestimated' : 'Spot on'
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{c.concept}</p>
                  <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-center"><p className="text-xs text-gray-500">Predicted</p><p className="text-lg font-extrabold text-gray-900">{c.predictedScore}</p></div>
                <ChevronRight className="size-4 text-gray-300" />
                <div className="text-center"><p className="text-xs text-gray-500">Actual</p><p className="text-lg font-extrabold text-gray-900">{c.actualScore ?? '—'}</p></div>
                {c.actualScore !== null && <span className={`text-xs font-medium ${deltaColor} px-2 py-1 rounded-full`}>{deltaLabel} ({delta > 0 ? '+' : ''}{delta})</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Growth Tab ──────────────────────────────────────────────────────────

function GrowthTab({ concepts }: { concepts: GrowthConcept[] }) {
  return (
    <div>
      <h3 className="font-extrabold text-gray-900 mb-2">Your Strongest Growth</h3>
      <p className="text-sm text-gray-500 mb-6">Concepts where you&apos;ve made the most progress through repeated practice.</p>

      {concepts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp className="size-10 mx-auto mb-3 text-gray-300" />
          <p>Not enough data yet. Keep studying — growth takes time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map(c => {
            const pct = Math.round(c.masteryLevel * 100)
            const successRate = c.encounterCount > 0 ? Math.round((c.successCount / c.encounterCount) * 100) : 0
            return (
              <div key={c.concept} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{c.concept}</h4>
                  <span className="text-sm font-extrabold text-[#0033A0]">{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#0033A0] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>{c.encounterCount} encounters</span>
                  <span>{successRate}% success rate</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
