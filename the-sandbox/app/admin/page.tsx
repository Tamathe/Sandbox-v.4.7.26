'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart2,
  Users,
  BookOpen,
  ArrowUp,
  Star,
  StarOff,
  Trash2,
  Loader2,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { AdminStats, ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'
import { format } from 'date-fns'

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

const SERVICE_PROTOCOL_LABELS: Record<string, string> = {
  informational: 'Informational',
  regulatory: 'Regulatory',
  transactional: 'Workflow',
}

export default function AdminPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingTools, setPendingTools] = useState<ToolWithDetails[]>([])
  const [serviceBots, setServiceBots] = useState<ToolWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchStats = useCallback(async () => {
    try {
      const [res, pendingRes] = await Promise.all([
        fetch('/api/admin', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/tools?approvalStatus=PENDING&published=all', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      if (res.status === 403) {
        router.replace('/')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
      setServiceBots(Array.isArray(data.serviceBots) ? data.serviceBots : [])
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json()
        setPendingTools(pendingData.tools ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    fetchStats()
  }, [currentUser.role, fetchStats, router])

  const handleToggleFeatured = async (tool: ToolWithDetails) => {
    setActionLoading(tool.id + '-feature')
    try {
      const res = await fetch(`/api/admin/tools/${tool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ featured: !tool.featured }),
      })
      if (res.ok) {
        showToast(
          tool.featured
            ? `"${tool.name}" unfeatured`
            : `"${tool.name}" is now featured!`
        )
        await fetchStats()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (toolId: string) => {
    setActionLoading(toolId + '-delete')
    setDeleteConfirm(null)
    try {
      const res = await fetch(`/api/admin/tools/${toolId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        showToast('Tool removed successfully')
        await fetchStats()
      } else {
        showToast('Failed to delete tool', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproval = async (toolId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(`${toolId}-approval`)
    try {
      const res = await fetch(`/api/admin/tools/${toolId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ approvalStatus: status }),
      })

      if (res.ok) {
        setPendingTools((previous) => previous.filter((tool) => tool.id !== toolId))
        showToast(status === 'APPROVED' ? 'Tool approved' : 'Tool rejected')
        await fetchStats()
      } else {
        showToast('Failed to update approval status', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: 'Total Tools',
      value: stats.totalTools,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Sessions',
      value: stats.totalSessions,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Total Upvotes',
      value: stats.totalUpvotes,
      icon: ArrowUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">Manage tools, users, and platform settings.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-5`}>
            <div className={`${card.color} mb-2`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className={`text-3xl font-bold ${card.color}`}>
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-3xl border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Pending Approval</h2>
        {pendingTools.length === 0 ? (
          <p className="text-sm text-gray-500">No tools awaiting approval.</p>
        ) : (
          <div className="space-y-3">
            {pendingTools.map((tool) => (
              <div key={tool.id} className="rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  <p className="text-sm text-gray-500">{tool.shortDescription}</p>
                  <p className="text-xs text-gray-400 mt-1">By {tool.creator?.name} · {tool.category}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApproval(tool.id, 'APPROVED')}
                    disabled={actionLoading === `${tool.id}-approval`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(tool.id, 'REJECTED')}
                    disabled={actionLoading === `${tool.id}-approval`}
                    className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="my-12 border-gray-200" />

      <section className="mt-12 bg-white rounded-3xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-[#0033A0]" />
          <h2 className="text-xl font-bold text-gray-900">Active Service Bots</h2>
        </div>
        {serviceBots.length === 0 ? (
          <p className="text-sm text-gray-400">No service bots have been added yet.</p>
        ) : (
          <div className="space-y-3">
            {serviceBots.map((tool) => (
              <div key={tool.id} className="rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/tools/${tool.id}`}
                        className="font-semibold text-gray-900 hover:text-[#0033A0] transition-colors"
                      >
                        {tool.name}
                      </Link>
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {SERVICE_PROTOCOL_LABELS[tool.serviceProtocol ?? 'informational'] ?? 'Informational'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-500">
                      <p>
                        <span className="text-gray-400">Created by</span>{' '}
                        {tool.creator.name} ({tool.creator.email})
                      </p>
                      <p>
                        <span className="text-gray-400">Date Added</span>{' '}
                        {format(new Date(tool.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* All tools management */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0033A0]" />
                All Tools
              </h2>
              <span className="text-xs text-gray-400">{stats.allTools.length} total</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {stats.allTools.map((tool) => (
                <div
                  key={tool.id}
                  className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/tools/${tool.id}`}
                        className="font-medium text-gray-900 text-sm hover:text-[#0033A0] transition-colors truncate max-w-xs"
                      >
                        {tool.name}
                      </Link>
                      {tool.featured && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" />
                            Featured
                          </span>
                        </span>
                      )}
                      {!tool.published && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{tool.creator.name}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{tool.category}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ArrowUp className="w-3 h-3" />
                        {tool._count.upvotes}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="w-3 h-3" />
                        {tool._count.comments}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(tool.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleFeatured(tool)}
                      disabled={actionLoading === tool.id + '-feature'}
                      title={tool.featured ? 'Unfeature' : 'Feature'}
                      className={`p-2 rounded-lg transition-colors ${
                        tool.featured
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      {actionLoading === tool.id + '-feature' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : tool.featured ? (
                        <StarOff className="w-4 h-4" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </button>

                    {deleteConfirm === tool.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(tool.id)}
                          disabled={actionLoading === tool.id + '-delete'}
                          className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          {actionLoading === tool.id + '-delete' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(tool.id)}
                        title="Delete tool"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Creators */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0033A0]" />
                Top Creators
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.topCreators.map((creator, i) => (
                <div key={creator.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="w-7 h-7 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {creator.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm truncate">
                      {creator.name}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColors[creator.role]}`}
                    >
                      {creator.role}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-600 flex-shrink-0">
                    {creator._count.tools}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent tools */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Recently Published</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.recentTools.map((tool) => (
                <div key={tool.id} className="px-5 py-3">
                  <Link
                    href={`/tools/${tool.id}`}
                    className="font-medium text-gray-800 text-sm hover:text-[#0033A0] transition-colors line-clamp-1"
                  >
                    {tool.name}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">
                    by {tool.creator.name} &bull; {format(new Date(tool.createdAt), 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

