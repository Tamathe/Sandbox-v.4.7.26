'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/navigation'
import SegmentedControl from '../../components/SegmentedControl'
import BookingPanel from '../../components/office-hours/BookingPanel'
import {
  HelpCircle,
  ArrowLeft,
  Calendar,
  Loader2,
  Send,
  Users,
  BookOpen,
  CheckCircle2,
  Shield,
  Plus,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react'

interface QueueItem {
  id: string
  studentName: string
  question: string
  context: string | null
  conceptSlugs: string[]
  priority: number
  aiAnswer: string | null
  createdAt: string
}

interface ClusterItem {
  id: string
  label: string
  questionCount: number
  representativeQuestion: string | null
  status: string
}

interface KBEntry {
  id: string
  question: string
  answer: string
  useCount: number
  verified: boolean
  source: string
}

interface Stats {
  autoResolvedThisWeek: number
  totalThisWeek: number
  autoResolveRate: number
  kbSize: number
  queueSize: number
}

type TabId = 'queue' | 'clusters' | 'kb' | 'booking'

export default function FacultyOfficeHoursPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('queue')
  const [loading, setLoading] = useState(false)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [clusters, setClusters] = useState<ClusterItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([])

  // Response state
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(false)

  // Add KB
  const [showAddKB, setShowAddKB] = useState(false)
  const [newKBQ, setNewKBQ] = useState('')
  const [newKBA, setNewKBA] = useState('')

  // AI prep expand
  const [expandedPrep, setExpandedPrep] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data) => {
        const list = data.courses || data || []
        setCourses(list)
        if (list.length > 0 && !selectedCourseId) setSelectedCourseId(list[0].id)
      })
      .catch(() => {})
  }, [currentUser])

  const fetchData = useCallback(() => {
    if (!currentUser || !selectedCourseId) return
    setLoading(true)

    Promise.all([
      fetch(`/api/office-hours/queue?courseId=${selectedCourseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      }).then((r) => r.json()),
      fetch(`/api/office-hours/kb?courseId=${selectedCourseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      }).then((r) => r.json()),
    ])
      .then(([queueData, kbData]) => {
        setQueue(queueData.queue || [])
        setClusters(queueData.clusters || [])
        setStats(queueData.stats || null)
        setKbEntries(kbData.entries || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser, selectedCourseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRespond(questionId: string) {
    if (!currentUser || !responseText.trim()) return
    setSending(true)
    await fetch(`/api/office-hours/${questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ answer: responseText.trim() }),
    })
    setRespondingId(null)
    setResponseText('')
    setSending(false)
    fetchData()
  }

  async function handleRespondCluster(clusterId: string) {
    if (!currentUser || !responseText.trim()) return
    setSending(true)
    await fetch(`/api/office-hours/cluster/${clusterId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ answer: responseText.trim() }),
    })
    setRespondingId(null)
    setResponseText('')
    setSending(false)
    fetchData()
  }

  async function handleAddKB() {
    if (!currentUser || !newKBQ.trim() || !newKBA.trim()) return
    await fetch('/api/office-hours/kb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ courseId: selectedCourseId, question: newKBQ.trim(), answer: newKBA.trim() }),
    })
    setNewKBQ('')
    setNewKBA('')
    setShowAddKB(false)
    fetchData()
  }

  if (!currentUser) return null

  const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Urgent', color: 'bg-red-50 text-red-700' },
    2: { label: 'Urgent', color: 'bg-red-50 text-red-700' },
    3: { label: 'High', color: 'bg-amber-50 text-amber-700' },
    4: { label: 'High', color: 'bg-amber-50 text-amber-700' },
    5: { label: 'Normal', color: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — Pattern A */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button type="button" onClick={() => router.push('/hub')} className="flex items-center gap-1 text-gray-400 hover:text-[#0033A0] text-sm mb-3 cursor-pointer">
            <ArrowLeft className="size-4" /> Back to Hub
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">Office Hours Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Prioritized student questions, clustered similar queries, knowledge base</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Course selector + Stats */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Course</label>
            <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] bg-white">
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>))}
            </select>
          </div>

          {stats && (
            <div className="flex gap-3 ml-auto">
              <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-lg font-extrabold text-emerald-700">{Math.round(stats.autoResolveRate * 100)}%</p>
                <p className="text-xs text-emerald-600 font-medium">Auto-resolved</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-lg font-extrabold text-[#0033A0]">{stats.queueSize}</p>
                <p className="text-xs text-blue-600 font-medium">In Queue</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-violet-50 border border-violet-200 text-center">
                <p className="text-lg font-extrabold text-violet-700">{stats.kbSize}</p>
                <p className="text-xs text-violet-600 font-medium">KB Entries</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'queue' as TabId, label: <><HelpCircle className="size-4" />Queue{queue.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{queue.length}</span>}</> },
            { value: 'clusters' as TabId, label: <><Users className="size-4" />Clusters{clusters.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{clusters.length}</span>}</> },
            { value: 'kb' as TabId, label: <><BookOpen className="size-4" />Knowledge Base{kbEntries.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{kbEntries.length}</span>}</> },
            { value: 'booking' as TabId, label: <><Calendar className="size-4" />Appointments</> },
          ]}
          className="mb-6"
        />

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                {queue.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">All caught up! No pending questions.</p>
                  </div>
                ) : queue.map((q) => {
                  const pri = PRIORITY_LABELS[Math.min(q.priority, 5)] || PRIORITY_LABELS[5]
                  return (
                    <div key={q.id} className="rounded-2xl border-2 border-gray-200 bg-white p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{q.studentName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pri.color}`}>{pri.label}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{q.question}</p>
                          {q.context && <p className="text-xs text-gray-500 mt-1 italic">Context: {q.context}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-4">{new Date(q.createdAt).toLocaleDateString()}</span>
                      </div>

                      {q.aiAnswer && (
                        <div className="mt-3">
                          <button type="button" onClick={() => setExpandedPrep(expandedPrep === q.id ? null : q.id)}
                            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0033A0] cursor-pointer">
                            {expandedPrep === q.id ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            AI Prep Notes
                          </button>
                          {expandedPrep === q.id && (
                            <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                              {q.aiAnswer}
                            </div>
                          )}
                        </div>
                      )}

                      {respondingId === q.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Type your response..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0]" rows={3} />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleRespond(q.id)} disabled={sending || !responseText.trim()}
                              className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
                            </button>
                            <button type="button" onClick={() => { setRespondingId(null); setResponseText('') }}
                              className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setRespondingId(q.id); setResponseText(q.aiAnswer ? q.aiAnswer + '\n\n' : '') }}
                          className="mt-3 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] text-sm font-semibold text-gray-600 hover:text-[#0033A0] cursor-pointer">
                          Respond
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Clusters Tab */}
            {activeTab === 'clusters' && (
              <div className="space-y-4">
                {clusters.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <Users className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No question clusters yet.</p>
                  </div>
                ) : clusters.map((c) => (
                  <div key={c.id} className="rounded-2xl border-2 border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="size-4 text-violet-600" />
                          <span className="text-sm font-bold text-gray-900">{c.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">{c.questionCount} students</span>
                        </div>
                        {c.representativeQuestion && (
                          <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{c.representativeQuestion}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    {respondingId === `cluster-${c.id}` ? (
                      <div className="mt-3 space-y-2">
                        <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Type a response for all students in this cluster..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0]" rows={3} />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleRespondCluster(c.id)} disabled={sending || !responseText.trim()}
                            className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Respond to All
                          </button>
                          <button type="button" onClick={() => { setRespondingId(null); setResponseText('') }}
                            className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setRespondingId(`cluster-${c.id}`); setResponseText('') }}
                        className="mt-3 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] text-sm font-semibold text-gray-600 hover:text-[#0033A0] cursor-pointer">
                        Respond to All ({c.questionCount})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* KB Tab */}
            {activeTab === 'kb' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowAddKB(!showAddKB)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] cursor-pointer">
                    <Plus className="size-4" /> Add Entry
                  </button>
                </div>

                {showAddKB && (
                  <div className="rounded-2xl border-2 border-[#0033A0] bg-blue-50 p-5 space-y-3">
                    <input value={newKBQ} onChange={(e) => setNewKBQ(e.target.value)} placeholder="Question"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] bg-white" />
                    <textarea value={newKBA} onChange={(e) => setNewKBA(e.target.value)} placeholder="Answer"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0] bg-white" rows={3} />
                    <button type="button" onClick={handleAddKB} disabled={!newKBQ.trim() || !newKBA.trim()}
                      className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] disabled:opacity-50 cursor-pointer">Save</button>
                  </div>
                )}

                {kbEntries.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <BookOpen className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Knowledge base is empty. It grows as you answer questions.</p>
                  </div>
                ) : kbEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border-2 border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{entry.question}</p>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{entry.answer}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {entry.verified && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600"><Shield className="size-3" /> Verified</span>
                        )}
                        <span className="text-xs text-gray-400">{entry.useCount} uses</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Booking / Appointments Tab */}
            {activeTab === 'booking' && (
              <BookingPanel mode="faculty" courseId={selectedCourseId} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
