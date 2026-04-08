'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Bell,
  BellMinus,
  BellOff,
  Check,
  Crown,
  Loader2,
  LogOut,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Member {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: 'OWNER' | 'MODERATOR' | 'MEMBER'
  joinedAt: string
}

interface UserResult {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
}

interface GroupSettingsModalProps {
  open: boolean
  onClose: () => void
  groupId: string
  groupName: string
  onGroupUpdated: () => void
  notifLevel?: 'ALL' | 'MENTIONS' | 'NONE'
  onNotifLevelChange?: (level: 'ALL' | 'MENTIONS' | 'NONE') => void
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SB'
  )
}

const ROLE_BADGE: Record<string, { label: string; icon: typeof Crown | null; className: string }> = {
  OWNER: { label: 'Owner', icon: Crown, className: 'bg-amber-50 text-amber-700' },
  MODERATOR: { label: 'Mod', icon: Shield, className: 'bg-blue-50 text-blue-700' },
  MEMBER: { label: 'Member', icon: null, className: 'bg-gray-50 text-gray-500' },
}

const NOTIF_OPTIONS: { level: 'ALL' | 'MENTIONS' | 'NONE'; label: string; icon: typeof Bell }[] = [
  { level: 'ALL', label: 'All messages', icon: Bell },
  { level: 'MENTIONS', label: 'Mentions only', icon: BellMinus },
  { level: 'NONE', label: 'Nothing', icon: BellOff },
]

export default function GroupSettingsModal({
  open,
  onClose,
  groupId,
  groupName,
  onGroupUpdated,
  notifLevel = 'ALL',
  onNotifLevelChange,
}: GroupSettingsModalProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState(groupName)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [nameEdited, setNameEdited] = useState(false)

  // Add member search
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<UserResult[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)

  const addInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headers = { 'x-demo-user-email': currentUser.email }
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'MODERATOR'

  // Load members
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setName(groupName)
    setNameEdited(false)
    setShowAddSearch(false)
    setAddQuery('')
    setAddResults([])

    async function load() {
      try {
        const res = await fetch(`/api/messages/groups/${groupId}/members`, { headers })
        if (!res.ok) return
        const data: { members: Member[]; currentUserRole: string } = await res.json()
        if (!cancelled) {
          setMembers(data.members)
          setCurrentUserRole(data.currentUserRole)
        }
      } catch { /* silent */ }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId, groupName])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Debounced user search for add members
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = addQuery.trim()
    if (trimmed.length < 2) {
      setAddResults([])
      setAddSearching(false)
      return
    }
    setAddSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/messages/users/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { headers },
        )
        if (!res.ok) return
        const data: { users: UserResult[] } = await res.json()
        const memberIds = new Set(members.map((m) => m.id))
        setAddResults(data.users.filter((u) => !memberIds.has(u.id)))
      } catch { /* silent */ }
      setAddSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addQuery])

  const handleSaveName = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === groupName) return
    setSaving(true)
    try {
      const res = await fetch(`/api/messages/groups/${groupId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) {
        setNameEdited(false)
        onGroupUpdated()
      }
    } catch { /* silent */ }
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, groupName, groupId])

  const handleAddMember = useCallback(async (userId: string) => {
    setAddingUserId(userId)
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/members`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      if (res.ok) {
        // Refresh members
        const membersRes = await fetch(`/api/messages/groups/${groupId}/members`, { headers })
        if (membersRes.ok) {
          const data: { members: Member[]; currentUserRole: string } = await membersRes.json()
          setMembers(data.members)
        }
        setAddQuery('')
        setAddResults([])
        onGroupUpdated()
      }
    } catch { /* silent */ }
    setAddingUserId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const handleRemoveMember = useCallback(async (targetId: string) => {
    if (!window.confirm('Remove this member from the group?')) return
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/members/${targetId}`, {
        method: 'DELETE',
        headers,
      })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== targetId))
        onGroupUpdated()
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const handleLeave = useCallback(async () => {
    if (!window.confirm('Leave this conversation? You will no longer see its messages.')) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/leave`, {
        method: 'POST',
        headers,
      })
      if (res.ok) {
        onClose()
        router.push('/messages')
      }
    } catch { /* silent */ }
    setLeaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, onClose, router])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  const canRemove = (targetRole: string) => {
    if (currentUserRole === 'OWNER') return true
    if (currentUserRole === 'MODERATOR' && targetRole === 'MEMBER') return true
    return false
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Group settings"
    >
      <div
        ref={modalRef}
        className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border-2 border-gray-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-extrabold text-gray-900">Group Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Group name */}
              <div className="border-b border-gray-100 px-5 py-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Group Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
                    disabled={!canManage}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:bg-gray-50 disabled:text-gray-500"
                    maxLength={100}
                  />
                  {canManage && nameEdited && name.trim() !== groupName && (
                    <button
                      type="button"
                      onClick={() => void handleSaveName()}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0033A0] px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      Save
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications */}
              {onNotifLevelChange && (
                <div className="border-b border-gray-100 px-5 py-4">
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
                    Notifications
                  </label>
                  <div className="flex gap-1">
                    {NOTIF_OPTIONS.map(({ level, label, icon: Icon }) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onNotifLevelChange(level)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                          notifLevel === level
                            ? 'bg-[#0033A0] text-white'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Members ({members.length})
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSearch(!showAddSearch)
                        if (!showAddSearch) {
                          setTimeout(() => addInputRef.current?.focus(), 50)
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#0033A0] transition-colors hover:bg-blue-50"
                    >
                      <UserPlus className="size-3" />
                      Add
                    </button>
                  )}
                </div>

                {/* Add member search */}
                {showAddSearch && canManage && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
                      <Search className="size-4 shrink-0 text-gray-400" />
                      <input
                        ref={addInputRef}
                        type="text"
                        value={addQuery}
                        onChange={(e) => setAddQuery(e.target.value)}
                        placeholder="Search by name or email…"
                        className="min-w-0 flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                      {addSearching && <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />}
                    </div>
                    {addResults.length > 0 && (
                      <ul className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1">
                        {addResults.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => void handleAddMember(user.id)}
                              disabled={addingUserId === user.id}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50 disabled:opacity-40"
                            >
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-semibold text-white">
                                {user.avatarUrl ? (
                                  <Image src={user.avatarUrl} alt={user.name} width={28} height={28} className="size-full rounded-full object-cover" />
                                ) : (
                                  getInitials(user.name)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="truncate text-xs text-gray-500">{user.email}</div>
                              </div>
                              {addingUserId === user.id ? (
                                <Loader2 className="size-4 animate-spin text-gray-400" />
                              ) : (
                                <UserPlus className="size-4 text-[#0033A0]" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {addQuery.trim().length >= 2 && !addSearching && addResults.length === 0 && (
                      <p className="mt-2 text-center text-xs text-gray-400">No users found</p>
                    )}
                  </div>
                )}

                {/* Members */}
                <ul className="space-y-1">
                  {members.map((member) => {
                    const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.MEMBER
                    const BadgeIcon = badge.icon
                    const isSelf = member.id === currentUser.id

                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-xs font-semibold text-white">
                          {member.avatarUrl ? (
                            <Image src={member.avatarUrl} alt={member.name} width={32} height={32} className="size-full rounded-full object-cover" />
                          ) : (
                            getInitials(member.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-gray-900">
                              {member.name}
                              {isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                              {BadgeIcon && <BadgeIcon className="size-3" />}
                              {badge.label}
                            </span>
                          </div>
                          <div className="truncate text-xs text-gray-500">{member.email}</div>
                        </div>
                        {/* Remove button — only if authorized and not self */}
                        {!isSelf && canRemove(member.role) && (
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(member.id)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${member.name}`}
                            title={`Remove ${member.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer — Leave group */}
        <div className="border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={() => void handleLeave()}
            disabled={leaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
          >
            {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Leave Group
          </button>
        </div>
      </div>
    </div>
  )
}
