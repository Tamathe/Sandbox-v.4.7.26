'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Loader2, Save, Settings, FolderOpen, BarChart3,
  Trash2, UserPlus, Shield, ShieldCheck, Eye,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import TabNav from '../../../../components/TabNav'

interface Member {
  id: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  user: { id: string; name: string; email: string; role: string; avatarUrl: string | null }
}

interface Department {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  themeColor: string | null
  websiteUrl: string | null
  contactEmail: string | null
  visibility: 'PUBLIC' | 'INTERNAL' | 'ROLE_RESTRICTED'
  members: Member[]
  _count: { collections: number; followers: number; members: number }
}

const SETTINGS_TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

const ROLE_OPTIONS: Array<{ value: Member['role']; label: string }> = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
]

const VISIBILITY_OPTIONS: Array<{ value: Department['visibility']; label: string; desc: string }> = [
  { value: 'PUBLIC', label: 'Public', desc: 'Anyone can see this storefront' },
  { value: 'INTERNAL', label: 'Internal', desc: 'Only authenticated users' },
  { value: 'ROLE_RESTRICTED', label: 'Role Restricted', desc: 'Only members with Viewer+ role' },
]

export default function DepartmentSettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()

  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [themeColor, setThemeColor] = useState('#0033A0')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [visibility, setVisibility] = useState<Department['visibility']>('PUBLIC')

  // Member management
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Member['role']>('EDITOR')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [members, setMembers] = useState<Member[]>([])

  const headers = { 'x-demo-user-email': currentUser.email, 'Content-Type': 'application/json' }

  const loadDepartment = useCallback(async () => {
    const res = await fetch(`/api/departments/${slug}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (!res.ok) return
    const data: Department = await res.json()
    setDepartment(data)
    setName(data.name)
    setDescription(data.description ?? '')
    setLogoUrl(data.logoUrl ?? '')
    setBannerUrl(data.bannerUrl ?? '')
    setThemeColor(data.themeColor ?? '#0033A0')
    setWebsiteUrl(data.websiteUrl ?? '')
    setContactEmail(data.contactEmail ?? '')
    setVisibility(data.visibility)
    setMembers(data.members)
  }, [slug, currentUser.email])

  useEffect(() => {
    loadDepartment().finally(() => setLoading(false))
  }, [loadDepartment])

  // Check ownership
  const isOwner = department?.members.some(
    m => m.user.email === currentUser.email && m.role === 'OWNER'
  ) || currentUser.role === 'ADMIN'

  const handleSave = async () => {
    if (!department) return
    setSaving(true)
    setSaveMessage('')
    try {
      const res = await fetch(`/api/departments/${slug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name,
          description: description || null,
          logoUrl: logoUrl || null,
          bannerUrl: bannerUrl || null,
          themeColor: themeColor || null,
          websiteUrl: websiteUrl || null,
          contactEmail: contactEmail || null,
          visibility,
        }),
      })
      if (res.ok) {
        setSaveMessage('Saved successfully')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        const err = await res.json()
        setSaveMessage(err.error || 'Failed to save')
      }
    } catch {
      setSaveMessage('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!department || !inviteEmail.trim()) return
    // Client-side email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteError('Please enter a valid email address')
      return
    }
    setInviteLoading(true)
    setInviteError('')
    try {
      // Look up user by email
      const lookupRes = await fetch(`/api/departments/${slug}/members/lookup?email=${encodeURIComponent(inviteEmail.trim())}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!lookupRes.ok) {
        const err = await lookupRes.json()
        setInviteError(err.error || 'User not found')
        return
      }
      const { user } = await lookupRes.json()

      // Add as member
      const res = await fetch(`/api/departments/${slug}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, role: inviteRole }),
      })
      if (res.ok) {
        const member = await res.json()
        setMembers(prev => [...prev, member])
        setInviteEmail('')
      } else {
        const err = await res.json()
        setInviteError(err.error || 'Failed to add member')
      }
    } catch {
      setInviteError('Failed to invite member')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleChangeRole = async (userId: string, role: Member['role']) => {
    try {
      const res = await fetch(`/api/departments/${slug}/members`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, role }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m =>
          m.user.id === userId ? { ...m, role } : m
        ))
      }
    } catch {
      // silently ignore
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/departments/${slug}/members`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.user.id !== userId))
      }
    } catch {
      // silently ignore
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Department Settings" subtitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!department || !isOwner) {
    return (
      <div>
        <PageHeader title="Access Denied" subtitle="You must be a department owner to view settings" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Link href={`/hub/s/${slug}`} className="text-sm font-semibold text-uk-blue hover:underline">
            Back to Storefront
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`${department.shortName} Settings`} subtitle="Manage your department storefront" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-uk-blue transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <ChevronRight className="size-3" />
          <Link href={`/hub/s/${slug}`} className="hover:text-uk-blue transition-colors">
            {department.shortName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-700 font-medium">Settings</span>
        </div>

        {/* Tab Nav */}
        <TabNav
          tabs={SETTINGS_TABS as unknown as Array<{ id: string; label: string; icon?: typeof Settings }>}
          activeTab="settings"
          onTabChange={(id) => {
            if (id === 'collections') router.push(`/hub/s/${slug}/settings/collections`)
            else if (id === 'analytics') router.push(`/hub/s/${slug}/settings/analytics`)
          }}
        />

        {/* Department Details Form */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-gray-900">Department Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Contact Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Logo URL</span>
              <input
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Banner URL</span>
              <input
                type="url"
                value={bannerUrl}
                onChange={e => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Theme Color</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="size-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="block flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Website URL</span>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
              />
            </label>
          </div>

          {/* Visibility Toggle */}
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">Visibility</span>
            <div className="flex flex-col sm:flex-row gap-3">
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex-1 rounded-xl border-2 p-3 text-left transition-colors ${
                    visibility === opt.value
                      ? 'border-uk-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-uk-blue text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Changes
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        {/* Member Management */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 space-y-5">
          <h2 className="text-lg font-extrabold text-gray-900">Members</h2>

          {/* Invite form */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
              placeholder="Enter email to invite..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Member['role'])}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-uk-blue focus:ring-1 focus:ring-uk-blue outline-none"
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-uk-blue text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {inviteLoading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add
            </button>
          </div>
          {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}

          {/* Member list */}
          <div className="divide-y divide-gray-100">
            {members.map(member => {
              const isCurrentUser = member.user.email === currentUser.email
              const RoleIcon = member.role === 'OWNER' ? ShieldCheck : member.role === 'EDITOR' ? Shield : Eye
              return (
                <div key={member.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <RoleIcon className="size-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.user.name} {isCurrentUser && <span className="text-gray-400">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isCurrentUser ? (
                      <>
                        <select
                          value={member.role}
                          onChange={e => handleChangeRole(member.user.id, e.target.value as Member['role'])}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-uk-blue outline-none"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 uppercase">{member.role}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
