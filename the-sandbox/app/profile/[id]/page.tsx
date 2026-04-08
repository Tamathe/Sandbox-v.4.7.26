'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, notFound } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { UserProfile } from '../../lib/types'
import ToolCard from '../../components/ToolCard'
import MessageButton from '../../components/MessageButton'
import { Loader2, BookOpen, Heart, MessageSquare, ArrowUp, Save, Trophy } from 'lucide-react'
import { format } from 'date-fns'

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

type Tab = 'published' | 'favorites' | 'credentials'

type BadgeRecord = {
  id: string
  name: string
  icon: string
  description: string
  earnedAt: string
}

export default function ProfilePage() {
  const params = useParams()
  const id = params.id as string
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('published')
  const [bioDraft, setBioDraft] = useState('')
  const [personalContextDraft, setPersonalContextDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [badges, setBadges] = useState<BadgeRecord[]>([])

  const fetchProfile = useCallback(async () => {
    try {
      const headers = { 'x-demo-user-email': currentUser.email }
      const [profileResponse, badgesResponse] = await Promise.all([
        fetch(`/api/users/${id}`, { headers }),
        fetch(`/api/xp/badges?userId=${encodeURIComponent(id)}`, { headers }),
      ])

      if (profileResponse.status === 404) {
        setNotFoundError(true)
        return
      }
      if (!profileResponse.ok) return

      const data = await profileResponse.json()
      setProfile(data)
      setBioDraft(data.bio ?? '')
      setPersonalContextDraft(data.personalContext ?? '')

      if (badgesResponse.ok) {
        const badgeData = await badgesResponse.json()
        setBadges(Array.isArray(badgeData.badges) ? badgeData.badges : [])
      } else {
        setBadges([])
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (notFoundError || !profile) {
    notFound()
    return null
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'published', label: `Published Tools (${profile._count.tools})` },
    { id: 'favorites', label: `Favorited Tools (${profile._count.favorites})` },
    { id: 'credentials', label: `Credentials (${badges.length})` },
  ]

  const publishedTools = profile.tools || []
  const favoritedTools = (profile.favorites || []).map((f) => f.tool)
  const isOwnProfile = profile.email === currentUser.email

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMessage('')

    try {
      const response = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          bio: bioDraft,
          personalContext: personalContextDraft,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }

      const updated = await response.json()
      setProfile((prev) => prev ? { ...prev, bio: updated.bio, personalContext: updated.personalContext } : prev)
      setSaveMessage('Profile saved')
      setTimeout(() => setSaveMessage(''), 2500)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="w-16 h-16 bg-[#0033A0] rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-gray-900">{profile.name}</h1>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeColors[profile.role]}`}
              >
                {profile.role}
              </span>
            </div>
            {profile.department && (
              <div className="text-sm text-gray-500 mb-0.5">
                {profile.department}
                {profile.college && profile.college !== profile.department && (
                  <span> &bull; {profile.college}</span>
                )}
              </div>
            )}
            <div className="text-xs text-gray-400">
              Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
            </div>
            {!isOwnProfile && (
              <div className="mt-3">
                <MessageButton targetUserId={profile.id} targetUserName={profile.name} />
              </div>
            )}
            {profile.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#0033A0]">
                <BookOpen className="w-4 h-4" />
                <span className="text-lg font-bold">{profile._count.tools}</span>
              </div>
              <div className="text-xs text-gray-400">Tools</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-pink-500">
                <Heart className="w-4 h-4" />
                <span className="text-lg font-bold">{profile._count.favorites}</span>
              </div>
              <div className="text-xs text-gray-400">Favorites</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-indigo-500">
                <ArrowUp className="w-4 h-4" />
                <span className="text-lg font-bold">{profile._count.upvotes}</span>
              </div>
              <div className="text-xs text-gray-400">Upvotes</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500">
                <MessageSquare className="w-4 h-4" />
                <span className="text-lg font-bold">{profile._count.comments}</span>
              </div>
              <div className="text-xs text-gray-400">Comments</div>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update your public bio and private context so Sandy can personalize recommendations more effectively.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Public Bio</label>
              <textarea
                value={bioDraft}
                onChange={(event) => setBioDraft(event.target.value)}
                rows={4}
                placeholder="Tell other users a little about your background and what you build."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Personal Context for Sandy</label>
              <textarea
                value={personalContextDraft}
                onChange={(event) => setPersonalContextDraft(event.target.value)}
                rows={5}
                placeholder="I'm a 2nd year law student interested in criminal defense. I want to practice in Kentucky after graduation."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                Tell Sandy about your interests, goals, and background. This is private - Sandy uses it to give you better, more relevant recommendations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </button>
              {saveMessage && (
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                  saveMessage === 'Profile saved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0033A0] text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tool grid */}
      {activeTab === 'published' && (
        <>
          {publishedTools.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No published tools yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'favorites' && (
        <>
          {favoritedTools.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No favorited tools yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoritedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'credentials' && (
        <>
          {badges.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No milestones yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Complete sessions and courses to earn credentials.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <div key={badge.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                      <span aria-hidden="true">{badge.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">{badge.name}</div>
                      <div className="mt-1 text-xs font-medium text-gray-400">
                        Earned {format(new Date(badge.earnedAt), 'MMMM yyyy')}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{badge.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
