'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUp,
  BarChart2,
  BookOpen,
  CheckCircle,
  DollarSign,
  Eye,
  FileText,
  Flag,
  Loader2,
  Megaphone,
  ShieldX,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { AdminStats, ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'

type TabKey = 'overview' | 'moderation' | 'economics' | 'platform'

type TranscriptSession = {
  id: string
  tool?: { name: string; category: string }
  user?: { name: string; email: string } | null
  chatMessages: Array<{
    id: string
    role: string
    content: string
    flagged: boolean
    flagCategory: string | null
    flagReason: string | null
    createdAt: string
  }>
}

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  COMMUNITY: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-200 text-red-900',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdminPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [transcriptSession, setTranscriptSession] = useState<TranscriptSession | null>(null)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin', {
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (response.status === 403) {
        router.replace('/')
        return
      }

      if (!response.ok) throw new Error('Failed to fetch admin data')
      setStats(await response.json())
    } catch (error) {
      console.error(error)
      showToast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router, showToast])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void fetchStats()
  }, [currentUser.role, fetchStats, router])

  const handleToolAction = async (tool: ToolWithDetails, kind: 'feature' | 'delete' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    setActionLoading(`${tool.id}-${kind}`)
    try {
      if (kind === 'feature') {
        const response = await fetch(`/api/admin/tools/${tool.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ featured: !tool.featured }),
        })
        if (!response.ok) throw new Error('Failed to update feature state')
      } else if (kind === 'delete') {
        const response = await fetch(`/api/admin/tools/${tool.id}`, {
          method: 'DELETE',
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!response.ok) throw new Error('Failed to delete tool')
      } else {
        const suspendedReason =
          kind === 'SUSPENDED'
            ? window.prompt('Reason for suspending this tool?', 'Suspended by admin review') || undefined
            : undefined
        const response = await fetch(`/api/admin/tools/${tool.id}/approval`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ approvalStatus: kind, suspendedReason }),
        })
        if (!response.ok) throw new Error('Failed to update approval state')
      }

      setDeleteConfirm(null)
      showToast(
        kind === 'feature'
          ? tool.featured
            ? 'Tool unfeatured'
            : 'Tool featured'
          : kind === 'delete'
            ? 'Tool deleted'
            : `Tool ${kind.toLowerCase()}`
      )
      await fetchStats()
    } catch {
      showToast('Admin action failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewTranscript = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/tool-sessions/${sessionId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!response.ok) throw new Error('Failed to fetch transcript')
      const data = await response.json()
      setTranscriptSession(data.session)
    } catch {
      showToast('Failed to load transcript', 'error')
    }
  }

  const handleAnnouncementCreate = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      showToast('Announcement title and message are required', 'error')
      return
    }

    setActionLoading('announcement')
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          title: announcementTitle,
          message: announcementMessage,
          tone: 'INFO',
          dismissible: true,
        }),
      })
      if (!response.ok) throw new Error('Failed to create announcement')
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      showToast('Announcement published')
      await fetchStats()
    } catch {
      showToast('Failed to publish announcement', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSandcastleReview = async (id: string, approvalStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoading(`sandcastle-${id}`)
    try {
      const aiRejectReason =
        approvalStatus === 'REJECTED'
          ? window.prompt('Reason to show the submitter?', 'Needs revision before approval') || undefined
          : undefined
      const response = await fetch(`/api/admin/sandcastle-submissions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ approvalStatus, aiRejectReason }),
      })
      if (!response.ok) throw new Error('Failed to review submission')
      showToast(`Sandcastle submission ${approvalStatus.toLowerCase()}`)
      await fetchStats()
    } catch {
      showToast('Failed to review submission', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: 'Total Tools', value: stats.totalTools, icon: BookOpen, bg: 'bg-blue-50 text-blue-700' },
    { label: 'Total Sessions', value: stats.totalSessions, icon: TrendingUp, bg: 'bg-emerald-50 text-emerald-700' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, bg: 'bg-violet-50 text-violet-700' },
    { label: 'Total Upvotes', value: stats.totalUpvotes, icon: ArrowUp, bg: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {toast ? (
        <div className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.message}
        </div>
      ) : null}

      {transcriptSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{transcriptSession.tool?.name ?? 'Transcript'}</h2>
                <p className="mt-1 text-sm text-slate-500">{transcriptSession.user?.name ?? 'Unknown user'} · {transcriptSession.user?.email ?? 'No email'}</p>
              </div>
              <button type="button" onClick={() => setTranscriptSession(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
              {transcriptSession.chatMessages.map((message) => (
                <div key={message.id} className={`rounded-2xl border px-4 py-3 ${message.flagged ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wide text-slate-700">{message.role}</span>
                    <span>{format(new Date(message.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.content}</p>
                  {message.flagReason ? <p className="mt-2 text-xs font-medium text-red-700">{message.flagReason}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Control Tower</h1>
          <p className="mt-2 text-sm text-slate-500">Moderation, economics, approvals, and platform interventions in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/ux-audit" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            Run UX Audit
          </Link>
          <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <UserCog className="h-4 w-4" />
            Manage Users
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-3xl p-5 ${card.bg}`}>
            <card.icon className="mb-3 h-5 w-5" />
            <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
            <div className="mt-1 text-xs text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart2 },
          { key: 'moderation', label: 'Moderation', icon: Flag },
          { key: 'economics', label: 'Economics', icon: DollarSign },
          { key: 'platform', label: 'Platform', icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? 'bg-[#0033A0] text-white' : 'border border-gray-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8">
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Pending Approval Queue</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{stats.pendingTools.length} waiting</span>
            </div>
            <div className="space-y-3">
              {stats.pendingTools.length === 0 ? <p className="text-sm text-slate-500">No tools awaiting approval.</p> : stats.pendingTools.map((tool) => (
                <div key={tool.id} className="flex flex-col gap-4 rounded-2xl border border-gray-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{tool.name}</h3>
                      <StatusBadge status={tool.approvalStatus} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{tool.shortDescription}</p>
                    <p className="mt-1 text-xs text-slate-400">By {tool.creator.name} · {tool.category}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void handleToolAction(tool, 'APPROVED')} disabled={actionLoading === `${tool.id}-APPROVED`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                    <button type="button" onClick={() => void handleToolAction(tool, 'REJECTED')} disabled={actionLoading === `${tool.id}-REJECTED`} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">Reject</button>
                    <button type="button" onClick={() => void handleToolAction(tool, 'SUSPENDED')} disabled={actionLoading === `${tool.id}-SUSPENDED`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60">Suspend</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">All Tools</h2>
              <span className="text-xs text-slate-400">{stats.allTools.length} total</span>
            </div>
            <div className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto">
              {stats.allTools.map((tool) => (
                <div key={tool.id} className="flex items-start gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/tools/${tool.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-[#0033A0]">{tool.name}</Link>
                      <StatusBadge status={tool.approvalStatus} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{tool.creator.name}</span>
                      <span>·</span>
                      <span>{tool.category}</span>
                      <span>·</span>
                      <span>{format(new Date(tool.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => void handleToolAction(tool, 'feature')} disabled={actionLoading === `${tool.id}-feature`} className={`rounded-lg p-2 ${tool.featured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}>
                      {tool.featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => void handleToolAction(tool, 'SUSPENDED')} disabled={actionLoading === `${tool.id}-SUSPENDED`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <ShieldX className="h-4 w-4" />
                    </button>
                    {deleteConfirm === tool.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => void handleToolAction(tool, 'delete')} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">Confirm</button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirm(tool.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'moderation' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Flagged Sessions</h2>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{stats.flaggedSessions.length} flagged</span>
            </div>
            <div className="space-y-3">
              {stats.flaggedSessions.length === 0 ? <p className="text-sm text-slate-500">No flagged sessions right now.</p> : stats.flaggedSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3">
                  <div className="font-semibold text-slate-900">{session.tool.name}</div>
                  <p className="mt-1 text-sm text-slate-600">{session.chatMessages[0]?.flagReason ?? 'Flagged for moderation review.'}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{session.chatMessages[0]?.content}</p>
                  <button type="button" onClick={() => void handleViewTranscript(session.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Eye className="h-4 w-4" />
                    View Transcript
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Recent Admin Audit Log</h2>
            <div className="space-y-3">
              {stats.auditLog.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{entry.action}</div>
                    <div className="text-xs text-slate-400">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{entry.admin.name} · {entry.targetType}{entry.targetLabel ? ` · ${entry.targetLabel}` : ''}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'economics' ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">This Month</div>
              <div className="mt-3 text-3xl font-bold">{stats.economics.totalTokens.toLocaleString()}</div>
              <div className="mt-1 text-sm text-slate-300">Total tokens</div>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-700">Estimated Cost</div>
              <div className="mt-3 text-3xl font-bold text-emerald-900">{formatUsd(stats.economics.totalEstimatedCostUsd)}</div>
              <div className="mt-1 text-sm text-emerald-700">Based on Haiku pricing</div>
            </div>
            <div className="rounded-3xl bg-blue-50 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Input / Output</div>
              <div className="mt-3 text-3xl font-bold text-blue-900">{stats.economics.totalInputTokens.toLocaleString()} / {stats.economics.totalOutputTokens.toLocaleString()}</div>
              <div className="mt-1 text-sm text-blue-700">Tokens</div>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-3xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Top Expensive Tools</h2>
              <div className="space-y-3">
                {stats.economics.topTools.map((tool) => (
                  <div key={tool.toolId} className="rounded-2xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{tool.toolName}</div>
                        <div className="text-xs text-slate-500">{tool.tokensUsed.toLocaleString()} tokens</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{formatUsd(tool.estimatedCostUsd)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Top Heavy Users</h2>
              <div className="space-y-3">
                {stats.economics.topUsers.map((entry) => (
                  <div key={entry.userId} className="rounded-2xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{entry.userName}</div>
                        <div className="text-xs text-slate-500">{entry.userEmail} · {entry.tokensUsed.toLocaleString()} tokens</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{formatUsd(entry.estimatedCostUsd)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === 'platform' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#0033A0]" />
              <h2 className="text-lg font-bold text-slate-900">System-Wide Announcements</h2>
            </div>
            <div className="space-y-3">
              <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15" />
              <textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Message shown to every user" rows={4} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15" />
              <button type="button" onClick={() => void handleAnnouncementCreate()} disabled={actionLoading === 'announcement'} className="rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60">
                Publish Banner
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {stats.recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                  <div className="font-semibold text-slate-900">{announcement.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{announcement.message}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#0033A0]" />
              <h2 className="text-lg font-bold text-slate-900">Sandcastle Review Queue</h2>
            </div>
            <div className="space-y-3">
              {stats.sandcastleQueue.length === 0 ? <p className="text-sm text-slate-500">No pending Sandcastle submissions.</p> : stats.sandcastleQueue.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-900">{submission.title}</div>
                    <StatusBadge status={submission.approvalStatus} />
                    {submission.aiVerdict ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">{submission.aiVerdict}</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{submission.category} · {submission.creator.name}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void handleSandcastleReview(submission.id, 'APPROVED')} disabled={actionLoading === `sandcastle-${submission.id}`} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                    <button type="button" onClick={() => void handleSandcastleReview(submission.id, 'REJECTED')} disabled={actionLoading === `sandcastle-${submission.id}`} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
