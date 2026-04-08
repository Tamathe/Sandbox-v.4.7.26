'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Loader2, ShieldX, UserCog, X } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

type AdminUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EDUCATOR' | 'STUDENT'
  suspended: boolean
  suspendedReason: string | null
  createdAt: string
  lastSeenAt: string
  _count: { tools: number; toolSessions: number }
  flaggedSessionCount: number
}

type UserActivity = {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'EDUCATOR' | 'STUDENT'
    suspended: boolean
    suspendedReason: string | null
    tools: Array<{ id: string; name: string; approvalStatus: string; createdAt: string }>
    toolSessions: Array<{
      id: string
      startedAt: string
      tool: { id: string; name: string }
      chatMessages: Array<{ id: string; content: string; flagCategory: string | null; flagReason: string | null }>
    }>
  }
}

const roleStyles: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

export default function AdminUsersPage() {
  const { currentUser, refreshAccountStatus } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null)
  const [suspendReasonUser, setSuspendReasonUser] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users?: AdminUser[] }>(currentUser.email, '/api/admin/users')
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error(error)
      setToast('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void fetchUsers()
  }, [currentUser.role, fetchUsers, router])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  const handleUserUpdate = async (userId: string, payload: Record<string, unknown>) => {
    setActionLoading(userId)
    try {
      await apiFetch(currentUser.email, `/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      await fetchUsers()
      await refreshAccountStatus()
      showToast('User updated')
    } catch {
      showToast('Failed to update user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewActivity = async (userId: string) => {
    try {
      const data = await apiFetch<UserActivity>(currentUser.email, `/api/admin/users/${userId}`)
      setSelectedUser(data)
    } catch {
      showToast('Failed to load user activity')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#0033A0]" />
          <p className="text-sm text-slate-500">Loading users</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {toast ? (
        <div className="fixed right-4 top-20 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedUser.user.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedUser.user.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid max-h-[70vh] gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Published Tools</h3>
                <div className="space-y-3">
                  {selectedUser.user.tools.length === 0 ? <p className="text-sm text-slate-500">No tools yet.</p> : selectedUser.user.tools.map((tool) => (
                    <div key={tool.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                      <Link href={`/tools/${tool.id}`} className="font-semibold text-slate-900 hover:text-[#0033A0]">{tool.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">{tool.approvalStatus} · {format(new Date(tool.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Flagged Sessions</h3>
                <div className="space-y-3">
                  {selectedUser.user.toolSessions.length === 0 ? <p className="text-sm text-slate-500">No flagged sessions.</p> : selectedUser.user.toolSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3">
                      <div className="font-semibold text-slate-900">{session.tool.name}</div>
                      <p className="mt-1 text-xs text-slate-500">{format(new Date(session.startedAt), 'MMM d, yyyy h:mm a')}</p>
                      <p className="mt-2 text-sm text-slate-600">{session.chatMessages[0]?.flagReason ?? session.chatMessages[0]?.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] hover:underline">
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">User Management</h1>
          <p className="mt-2 text-sm text-slate-500">Roles, suspension, and user activity review.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-3 border-b border-gray-200 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div>User</div>
          <div>Role</div>
          <div>Usage</div>
          <div>Flags</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-gray-100">
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-3 px-6 py-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Joined {format(new Date(user.createdAt), 'MMM d, yyyy')} · Last active {format(new Date(user.lastSeenAt), 'MMM d')}
                </div>
                {user.suspended ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                    <AlertTriangle className="size-3" />
                    Suspended
                  </div>
                ) : null}
              </div>
              <div>
                <select
                  value={user.role}
                  onChange={(event) => void handleUserUpdate(user.id, { role: event.target.value })}
                  disabled={actionLoading === user.id}
                  className={`block rounded-xl border border-gray-200 px-3 py-2 text-xs ${roleStyles[user.role] ?? ''}`}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EDUCATOR">EDUCATOR</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>
              <div className="text-slate-600">
                <div>{user._count.tools} tools</div>
                <div className="text-xs text-slate-500">{user._count.toolSessions} sessions</div>
              </div>
              <div className="text-slate-600">
                {user.flaggedSessionCount > 0 ? <div>{user.flaggedSessionCount} flagged</div> : <div className="text-slate-400">—</div>}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleViewActivity(user.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <UserCog className="size-3.5" />
                  View Activity
                </button>
                {user.suspended ? (
                  <button
                    type="button"
                    onClick={() => void handleUserUpdate(user.id, { suspended: false, suspendedReason: null })}
                    disabled={actionLoading === user.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <ShieldX className="size-3.5" />
                    Unsuspend
                  </button>
                ) : suspendingUserId === user.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={suspendReasonUser}
                      onChange={(e) => setSuspendReasonUser(e.target.value)}
                      placeholder="Suspension reason…"
                      rows={2}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0033A0]"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          void handleUserUpdate(user.id, { suspended: true, suspendedReason: suspendReasonUser || undefined })
                          setSuspendingUserId(null)
                          setSuspendReasonUser('')
                        }}
                        disabled={actionLoading === user.id}
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSuspendingUserId(null); setSuspendReasonUser('') }}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setSuspendingUserId(user.id); setSuspendReasonUser('') }}
                    disabled={actionLoading === user.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <ShieldX className="size-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
