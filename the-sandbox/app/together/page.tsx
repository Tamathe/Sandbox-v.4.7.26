'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, MessageSquare, BookOpen, Handshake, UserPlus,
  ThumbsUp, ArrowRight, Search, Globe, Lock, Crown, Check,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

// ── Types ───────────────────────────────────────────────────────────────

interface Circle {
  id: string
  name: string
  description: string | null
  topic: string
  emoji: string
  isOpen: boolean
  maxMembers: number
  role?: string
  createdBy: { id: string; name: string; avatarUrl: string | null }
  _count: { members: number; posts?: number }
}

interface Mentorship {
  id: string
  topic: string
  status: string
  message: string | null
  mentor?: { id: string; name: string; avatarUrl: string | null }
  mentee?: { id: string; name: string; avatarUrl: string | null }
}

interface Contribution {
  id: string
  title: string
  content: string
  type: string
  topic: string
  upvotes: number
  author: { id: string; name: string; avatarUrl: string | null }
  createdAt: string
}

interface CrossCourseConnection {
  concept: string
  masteryLevel: number
  courses: { id: string; title: string; courseCode: string }[]
}

// ── Page ────────────────────────────────────────────────────────────────

export default function TogetherPage() {
  const { currentUser } = useAuth()
  const email = currentUser.email
  const [tab, setTab] = useState<'circles' | 'mentorship' | 'knowledge' | 'connections'>('circles')
  const [myCircles, setMyCircles] = useState<Circle[]>([])
  const [allCircles, setAllCircles] = useState<Circle[]>([])
  const [mentorships, setMentorships] = useState<{ asMentor: Mentorship[]; asMentee: Mentorship[] }>({ asMentor: [], asMentee: [] })
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [connections, setConnections] = useState<CrossCourseConnection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [myC, allC, mentData, contData, connData] = await Promise.all([
        apiFetch<{ circles: Circle[] }>(email, '/api/together/circles?action=my'),
        apiFetch<{ circles: Circle[] }>(email, '/api/together/circles'),
        apiFetch<{ asMentor: Mentorship[]; asMentee: Mentorship[] }>(email, '/api/together/mentorship'),
        apiFetch<{ contributions: Contribution[] }>(email, '/api/together/knowledge'),
        apiFetch<{ connections: CrossCourseConnection[] }>(email, '/api/together/accountability?action=cross-course'),
      ])
      setMyCircles(myC.circles)
      setAllCircles(allC.circles)
      setMentorships(mentData)
      setContributions(contData.contributions)
      setConnections(connData.connections)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [email])

  useEffect(() => { void fetchAll() }, [fetchAll])

  const tabs = [
    { id: 'circles' as const, label: 'Learning Circles', icon: <Users className="size-4" /> },
    { id: 'mentorship' as const, label: 'Mentorship', icon: <Handshake className="size-4" /> },
    { id: 'knowledge' as const, label: 'Knowledge Base', icon: <BookOpen className="size-4" /> },
    { id: 'connections' as const, label: 'Connections', icon: <ArrowRight className="size-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Together"
        subtitle="Learn with others. Form circles, find mentors, share knowledge."
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {(myCircles.length > 0 || mentorships.asMentor.length > 0 || mentorships.asMentee.length > 0) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">My Circles</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{myCircles.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mentorships</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{mentorships.asMentor.length + mentorships.asMentee.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cross-Course Links</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{connections.length}</p>
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

        {!loading && tab === 'circles' && (
          <CirclesTab myCircles={myCircles} allCircles={allCircles} email={email} onUpdate={fetchAll} />
        )}
        {!loading && tab === 'mentorship' && (
          <MentorshipTab mentorships={mentorships} email={email} onUpdate={fetchAll} />
        )}
        {!loading && tab === 'knowledge' && (
          <KnowledgeTab contributions={contributions} email={email} onUpdate={fetchAll} />
        )}
        {!loading && tab === 'connections' && (
          <ConnectionsTab connections={connections} />
        )}
      </div>
    </div>
  )
}

// ── Circles Tab ─────────────────────────────────────────────────────────

function CirclesTab({ myCircles, allCircles, email, onUpdate }: {
  myCircles: Circle[]; allCircles: Circle[]; email: string; onUpdate: () => void
}) {
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) return
    setSaving(true)
    try {
      await apiFetch(email, '/api/together/circles', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), topic: topic.trim(), description: description.trim() || undefined }),
      })
      setName(''); setTopic(''); setDescription(''); setShowNew(false); onUpdate()
    } finally { setSaving(false) }
  }

  const handleJoin = async (circleId: string) => {
    await apiFetch(email, '/api/together/circles', { method: 'POST', body: JSON.stringify({ action: 'join', circleId }) })
    onUpdate()
  }

  const myCircleIds = new Set(myCircles.map(c => c.id))
  const discoverable = allCircles.filter(c => !myCircleIds.has(c.id) && c.isOpen)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-gray-900">Learning Circles</h3>
        <Button size="sm" onClick={() => setShowNew(!showNew)} icon={<Plus />}>New Circle</Button>
      </div>

      {showNew && (
        <div className="bg-white border-2 border-[#0033A0]/20 rounded-2xl p-5 mb-4 space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Circle name" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]" autoFocus />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g. Machine Learning, Organic Chemistry)" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this circle about?" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none" />
          <Button size="sm" onClick={handleCreate} loading={saving} disabled={!name.trim() || !topic.trim()} icon={<Users />}>Create Circle</Button>
        </div>
      )}

      {/* My Circles */}
      {myCircles.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Circles</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myCircles.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-gray-900 truncate">{c.name}</h4>
                      {c.role === 'creator' && <Crown className="size-3.5 text-amber-500" />}
                    </div>
                    <p className="text-xs text-gray-500">{c.topic} · {c._count.members} members</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover */}
      {discoverable.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Discover</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discoverable.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <span className="text-2xl">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{c.name}</h4>
                  <p className="text-xs text-gray-500">{c.topic} · {c._count.members}/{c.maxMembers}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleJoin(c.id)} icon={<UserPlus />}>Join</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {myCircles.length === 0 && discoverable.length === 0 && !showNew && (
        <div className="text-center py-12 text-gray-400">
          <Users className="size-10 mx-auto mb-3 text-gray-300" />
          <p>No circles yet. Create one to start learning together!</p>
        </div>
      )}
    </div>
  )
}

// ── Mentorship Tab ──────────────────────────────────────────────────────

function MentorshipTab({ mentorships, email, onUpdate }: {
  mentorships: { asMentor: Mentorship[]; asMentee: Mentorship[] }; email: string; onUpdate: () => void
}) {
  const [searchTopic, setSearchTopic] = useState('')
  const [mentors, setMentors] = useState<{ user: { id: string; name: string }; concept: string; masteryLevel: number }[]>([])

  const handleSearch = async () => {
    if (!searchTopic.trim()) return
    const data = await apiFetch<{ mentors: typeof mentors }>(email, `/api/together/mentorship?action=find-mentors&topic=${encodeURIComponent(searchTopic)}`)
    setMentors(data.mentors)
  }

  const handleRequest = async (mentorId: string) => {
    await apiFetch(email, '/api/together/mentorship', {
      method: 'POST',
      body: JSON.stringify({ mentorId, topic: searchTopic, message: `I'd love help learning about ${searchTopic}` }),
    })
    onUpdate()
  }

  const handleRespond = async (id: string, status: string) => {
    await apiFetch(email, '/api/together/mentorship', {
      method: 'POST',
      body: JSON.stringify({ action: 'respond', mentorshipId: id, status }),
    })
    onUpdate()
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-500',
    DECLINED: 'bg-red-100 text-red-600',
  }

  return (
    <div>
      <h3 className="font-extrabold text-gray-900 mb-4">Peer Mentorship</h3>

      {/* Find mentors */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Find a mentor</h4>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input type="text" value={searchTopic} onChange={e => setSearchTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Search by topic (e.g. calculus, Python, writing)" className="w-full pl-10 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]" />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={!searchTopic.trim()}>Search</Button>
        </div>

        {mentors.length > 0 && (
          <div className="mt-4 space-y-2">
            {mentors.map(m => (
              <div key={m.user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{m.user.name}</p>
                  <p className="text-xs text-gray-500">{m.concept} — {Math.round(m.masteryLevel * 100)}% mastery</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRequest(m.user.id)} icon={<Handshake />}>Request</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending requests (as mentor) */}
      {mentorships.asMentor.filter(m => m.status === 'PENDING').length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mentorship Requests</h4>
          <div className="space-y-2">
            {mentorships.asMentor.filter(m => m.status === 'PENDING').map(m => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{m.mentee?.name} wants help with <span className="text-[#0033A0]">{m.topic}</span></p>
                  {m.message && <p className="text-sm text-gray-500 mt-1">{m.message}</p>}
                </div>
                <Button size="sm" onClick={() => handleRespond(m.id, 'ACTIVE')} icon={<Check />}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => handleRespond(m.id, 'DECLINED')}>Decline</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active mentorships */}
      {[...mentorships.asMentor.filter(m => m.status === 'ACTIVE'), ...mentorships.asMentee.filter(m => m.status === 'ACTIVE')].length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Mentorships</h4>
          <div className="space-y-2">
            {[...mentorships.asMentor.filter(m => m.status === 'ACTIVE').map(m => ({ ...m, role: 'mentor', partner: m.mentee })),
              ...mentorships.asMentee.filter(m => m.status === 'ACTIVE').map(m => ({ ...m, role: 'mentee', partner: m.mentor }))].map(m => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{m.partner?.name}</p>
                  <p className="text-xs text-gray-500">{m.topic} · You are the {m.role}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status]}`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Knowledge Tab ───────────────────────────────────────────────────────

function KnowledgeTab({ contributions, email, onUpdate }: {
  contributions: Contribution[]; email: string; onUpdate: () => void
}) {
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('study-guide')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !topic.trim()) return
    setSaving(true)
    try {
      await apiFetch(email, '/api/together/knowledge', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), topic: topic.trim(), type }),
      })
      setTitle(''); setContent(''); setTopic(''); setShowNew(false); onUpdate()
    } finally { setSaving(false) }
  }

  const handleUpvote = async (id: string) => {
    await apiFetch(email, '/api/together/knowledge', { method: 'POST', body: JSON.stringify({ action: 'upvote', id }) })
    onUpdate()
  }

  const typeLabels: Record<string, string> = {
    'study-guide': 'Study Guide', tip: 'Tip', 'resource-list': 'Resources', 'cheat-sheet': 'Cheat Sheet',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-gray-900">Community Knowledge Base</h3>
        <Button size="sm" onClick={() => setShowNew(!showNew)} icon={<Plus />}>Contribute</Button>
      </div>

      {showNew && (
        <div className="bg-white border-2 border-[#0033A0]/20 rounded-2xl p-5 mb-4 space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]" autoFocus />
          <div className="flex gap-3">
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]" />
            <select value={type} onChange={e => setType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0]">
              <option value="study-guide">Study Guide</option>
              <option value="tip">Tip</option>
              <option value="resource-list">Resources</option>
              <option value="cheat-sheet">Cheat Sheet</option>
            </select>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share your knowledge (Markdown supported)..." rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0033A0] resize-none font-mono text-sm" />
          <Button size="sm" onClick={handleCreate} loading={saving} disabled={!title.trim() || !content.trim() || !topic.trim()} icon={<BookOpen />}>Publish</Button>
        </div>
      )}

      {contributions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="size-10 mx-auto mb-3 text-gray-300" />
          <p>No contributions yet. Be the first to share knowledge!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contributions.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => handleUpvote(c.id)} className="shrink-0 flex flex-col items-center text-gray-400 hover:text-[#0033A0] transition-colors">
                  <ThumbsUp className="size-4" />
                  <span className="text-xs font-medium">{c.upvotes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{c.title}</h4>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{typeLabels[c.type] ?? c.type}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.topic}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.content}</p>
                  <p className="text-xs text-gray-400 mt-2">by {c.author.name} · {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Connections Tab ─────────────────────────────────────────────────────

function ConnectionsTab({ connections }: { connections: CrossCourseConnection[] }) {
  return (
    <div>
      <h3 className="font-extrabold text-gray-900 mb-2">Cross-Course Connections</h3>
      <p className="text-sm text-gray-500 mb-6">Concepts that bridge multiple courses you&apos;re enrolled in.</p>

      {connections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Globe className="size-10 mx-auto mb-3 text-gray-300" />
          <p>Enroll in 2+ courses to discover cross-course connections.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(c => (
            <div key={c.concept} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{c.concept}</h4>
                <span className="text-sm font-extrabold text-[#0033A0]">{Math.round(c.masteryLevel * 100)}%</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {c.courses.map(course => (
                  <span key={course.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                    {course.courseCode}: {course.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
