'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Loader2, BookOpen, Swords, Tv, GraduationCap, Compass, MessageSquare,
  FlaskConical, Users, ClipboardCheck, HelpCircle, Theater, Circle,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

const ROOM_TYPES = [
  { type: 'CHALLENGE', label: 'Challenge', desc: 'Quiz battle with AI-generated questions', icon: Swords, color: 'text-blue-600 bg-blue-100' },
  { type: 'STUDY', label: 'Study Session', desc: 'Shared Pomodoro timer for focused studying', icon: BookOpen, color: 'text-emerald-600 bg-emerald-100' },
  { type: 'SIMULATION', label: 'Simulation', desc: 'Branching narrative — same start, different paths', icon: Compass, color: 'text-purple-600 bg-purple-100' },
  { type: 'DEBATE', label: 'Debate', desc: 'Structured argumentation with fact-checking', icon: MessageSquare, color: 'text-red-600 bg-red-100' },
  { type: 'TEACHBACK', label: 'Teachback', desc: 'Peer teaching + audience rating', icon: GraduationCap, color: 'text-amber-600 bg-amber-100' },
  { type: 'CASE_STUDY', label: 'Case Study', desc: 'Phased evidence reveals + hypothesis evolution', icon: FlaskConical, color: 'text-teal-600 bg-teal-100' },
  { type: 'PROBLEM_LAB', label: 'Problem Lab', desc: 'Jigsaw problem decomposition + gap analysis', icon: Zap, color: 'text-orange-600 bg-orange-100' },
  { type: 'IMPROV', label: 'Improv', desc: 'Professional scenario practice + coaching', icon: Theater, color: 'text-pink-600 bg-pink-100' },
  { type: 'FISHBOWL', label: 'Fishbowl', desc: 'Inner/outer circle discussion + annotations', icon: Circle, color: 'text-indigo-600 bg-indigo-100' },
  { type: 'SPEED_MENTORING', label: 'Speed Mentoring', desc: 'Complementary pairing + timed sessions', icon: Users, color: 'text-cyan-600 bg-cyan-100' },
  { type: 'PEER_REVIEW', label: 'Peer Review', desc: 'Anonymous work submission + rubric feedback', icon: ClipboardCheck, color: 'text-violet-600 bg-violet-100' },
  { type: 'OFFICE_HOURS', label: 'Office Hours', desc: 'Sandy-triaged question queue', icon: HelpCircle, color: 'text-sky-600 bg-sky-100' },
  { type: 'WATCH', label: 'Watch Party', desc: 'Shared viewing with reactions', icon: Tv, color: 'text-gray-600 bg-gray-100' },
] as const

interface Group {
  groupId: string
  name: string
  type: string
}

export default function NewCommonsSessionPage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  const [selectedType, setSelectedType] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/messages/conversations', {
      headers: { 'x-demo-user-email': currentUser.email },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { conversations?: Group[] }) => {
        setGroups(data.conversations ?? [])
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setGroups([])
      })
      .finally(() => setGroupsLoading(false))
    return () => controller.abort()
  }, [currentUser.email])

  async function handleCreate() {
    if (!selectedType || !selectedGroupId) {
      setError('Please select a room type and a group')
      return
    }

    setCreating(true)
    setError(null)

    try {
      // Get the default channel for the selected group
      const infoRes = await fetch(`/api/messages/groups/${selectedGroupId}/info`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!infoRes.ok) {
        setError('Failed to load group info')
        setCreating(false)
        return
      }
      const info = await infoRes.json() as { channelId?: string }
      if (!info.channelId) {
        setError('No channel found for this group')
        setCreating(false)
        return
      }

      const roomType = ROOM_TYPES.find((r) => r.type === selectedType)
      const roomTitle = title.trim() || `${roomType?.label ?? selectedType} Session`

      const res = await fetch('/api/commons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          channelId: info.channelId,
          type: selectedType,
          title: roomTitle,
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to create room')
        return
      }
      router.push(`/messages/${selectedGroupId}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:ml-96">
      <PageHeader
        title="New Commons Session"
        subtitle="Start a live, interactive experience in any of your group chats"
      />

      <div className="space-y-6">
        {/* Room Type Picker */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-extrabold text-gray-900">Choose a Room Type</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROOM_TYPES.map((room) => {
              const Icon = room.icon
              const selected = selectedType === room.type
              return (
                <button
                  key={room.type}
                  type="button"
                  onClick={() => setSelectedType(room.type)}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                    selected
                      ? 'border-[#0033A0] bg-blue-50/50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${room.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{room.label}</p>
                    <p className="text-xs text-gray-500">{room.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Group + Title */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-extrabold text-gray-900">
                Group Chat
              </label>
              {groupsLoading ? (
                <div className="flex items-center gap-2 py-2 text-gray-400">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Loading your groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <p className="py-2 text-sm text-gray-500">
                  No groups found. Join or create a group chat in Messages first.
                </p>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                >
                  <option value="">Select a group...</option>
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-extrabold text-gray-900">
                Session Title <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder={selectedType ? `e.g. ${ROOM_TYPES.find((r) => r.type === selectedType)?.label ?? ''} — Week 3 Review` : 'Pick a room type first'}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating || !selectedType || !selectedGroupId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {creating ? 'Creating Session...' : 'Create Session'}
        </button>
      </div>
    </div>
  )
}
