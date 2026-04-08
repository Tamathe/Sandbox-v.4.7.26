'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BookMarked, Clock, ExternalLink, Play, Plus, X, FileText, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../lib/auth-context'
import { LibraryEntryWithTool, LibraryHistoryEntry, ToolWithDetails } from '../lib/types'
import StudyGuideCard from '../components/StudyGuideCard'

const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  General: 'bg-gray-500',
}

export default function LibraryPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [library, setLibrary] = useState<LibraryEntryWithTool[]>([])
  const [history, setHistory] = useState<LibraryHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'recent' | 'used' | 'added'>('recent')
  const [historyVisible, setHistoryVisible] = useState(true)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [pendingChallenges, setPendingChallenges] = useState<
    Array<{
      id: string
      challenger: { id: string; name: string }
      tool: { id: string; name: string }
      challengerScore: number
      expiresAt: string
    }>
  >([])

  const fetchLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const [libraryResponse, challengesResponse] = await Promise.all([
        fetch('/api/library', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/challenges', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      const data = await libraryResponse.json()
      const challengeData = await challengesResponse.json().catch(() => ({}))
      setLibrary(data.library ?? [])
      setHistory(data.history ?? [])
      setPendingChallenges(challengeData.pending ?? [])
    } catch {
      setLibrary([])
      setHistory([])
      setPendingChallenges([])
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    fetchLibrary()
  }, [fetchLibrary])

  const addToLibrary = async (toolId: string) => {
    await fetch('/api/library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ toolId }),
    })
    await fetchLibrary()
  }

  const removeFromLibrary = async (toolId: string) => {
    setLibrary((prev) => prev.filter((entry) => entry.toolId !== toolId))
    await fetch(`/api/library?toolId=${toolId}`, {
      method: 'DELETE',
      headers: { 'x-demo-user-email': currentUser.email },
    })
  }

  const handleLaunch = (tool: ToolWithDetails, resumeSessionId?: string | null) => {
    if (tool.toolType === 'EXTERNAL' && tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer')
      return
    }

    if (resumeSessionId) {
      router.push(`/tools/${tool.id}?resumeSession=${resumeSessionId}`)
      return
    }

    router.push(`/tools/${tool.id}?launch=true`)
  }

  const sortedLibrary = [...library].sort((a, b) => {
    if (sort === 'recent') {
      const aDate = a.lastSessionAt ?? a.addedAt
      const bDate = b.lastSessionAt ?? b.addedAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    }

    if (sort === 'used') return b.sessionCount - a.sessionCount

    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  })
  const savedToolIds = new Set(library.map((entry) => entry.toolId))

  return (
    <div>
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">My Library</h1>
              <p className="mt-1 text-sm text-gray-500">
                Your saved tools, ready to launch whenever you need them.
              </p>
            </div>
            <Link
              href="/tools"
              className="text-xs font-semibold text-[#0033A0] hover:underline"
            >
              Browse more tools
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        {currentUser.role === 'STUDENT' && <StudyGuideCard title="Library Study Guide" />}
        {currentUser.role === 'STUDENT' && pendingChallenges.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-900">Pending Challenges</h2>
            </div>
            <div className="space-y-3">
              {pendingChallenges.map((challenge) => (
                <div key={challenge.id} className="rounded-xl border border-amber-200 bg-white px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {challenge.challenger.name} challenged you on {challenge.tool.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Score to beat: {Math.round(challenge.challengerScore)}% · Expires{' '}
                    {formatDistanceToNow(new Date(challenge.expiresAt), { addSuffix: true })}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/tools/${challenge.tool.id}?launch=true`)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Accept Challenge
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-[#0033A0]" />
              <h2 className="text-base font-extrabold text-gray-900">Saved Tools</h2>
              {!loading && <span className="text-xs text-gray-400">({library.length})</span>}
            </div>
            {library.length > 0 && (
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="cursor-pointer rounded-lg border-0 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 outline-none"
              >
                <option value="recent">Last Played</option>
                <option value="used">Most Used</option>
                <option value="added">Recently Added</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white animate-pulse"
                >
                  <div className="h-32 bg-gray-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                    <div className="mt-3 h-8 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : library.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
              <BookMarked className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <h3 className="mb-1 text-base font-semibold text-gray-600">Your library is empty</h3>
              <p className="mb-5 text-sm text-gray-400">
                Browse tools and click the plus button to save the ones worth keeping.
              </p>
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                Browse Tools
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedLibrary.map((entry) => {
                const bgClass = categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
                return (
                  <div
                    key={entry.id}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                  >
                    <div className={`relative flex h-32 items-center justify-center ${bgClass}`}>
                      {entry.tool.thumbnailUrl ? (
                        <Image
                          src={entry.tool.thumbnailUrl}
                          alt={entry.tool.name}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeFromLibrary(entry.toolId)}
                        title="Remove from library"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="p-4">
                      <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                        {entry.tool.name}
                      </p>
                      <p className="mb-3 text-xs text-gray-400">
                        {entry.sessionCount > 0
                          ? `${entry.sessionCount} session${entry.sessionCount !== 1 ? 's' : ''} - Last used ${formatDistanceToNow(
                              new Date(entry.lastSessionAt!),
                              { addSuffix: true }
                            )}`
                          : 'Never launched'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleLaunch(entry.tool, entry.activeSessionId)}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white transition-colors ${
                          entry.activeSessionId
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-[#0033A0] hover:bg-[#002580]'
                        }`}
                      >
                        {entry.tool.toolType === 'EXTERNAL' ? (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </>
                        ) : entry.activeSessionId ? (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            Launch
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {!loading && history.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setHistoryVisible((prev) => !prev)}
              className="mb-4 flex items-center gap-2"
            >
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-base font-extrabold text-gray-900">Session History</h2>
              <span className="text-xs text-gray-400">
                ({history.length} tool{history.length !== 1 ? 's' : ''} tried)
              </span>
              <span className="ml-1 text-xs font-medium text-[#0033A0]">
                {historyVisible ? 'Hide' : 'Show'}
              </span>
            </button>

            {historyVisible && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
                {history.map((entry) => {
                  const bgClass = categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
                  const noteExpanded = !!expandedNotes[entry.toolId]

                  return (
                    <div key={entry.toolId} className="transition-colors hover:bg-gray-50">
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className={`h-10 w-10 flex-shrink-0 rounded-lg ${bgClass}`} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {entry.tool.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {entry.tool.category} - {entry.sessionCount} session{entry.sessionCount !== 1 ? 's' : ''} -{' '}
                            {entry.lastSessionAt
                              ? formatDistanceToNow(new Date(entry.lastSessionAt), { addSuffix: true })
                              : 'No recent activity'}
                          </p>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {entry.latestNote && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNotes((prev) => ({
                                  ...prev,
                                  [entry.toolId]: !prev[entry.toolId],
                                }))
                              }
                              title={noteExpanded ? 'Hide session note' : 'Show session note'}
                              className={`rounded-lg border px-2.5 py-1.5 transition-colors ${
                                noteExpanded
                                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                                  : 'border-gray-200 text-amber-500 hover:bg-amber-50'
                              }`}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleLaunch(entry.tool, entry.activeSessionId)}
                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                              entry.activeSessionId
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-[#0033A0] hover:bg-[#002580]'
                            }`}
                          >
                            <Play className="h-3 w-3" />
                            {entry.activeSessionId ? 'Resume' : 'Launch'}
                          </button>
                          {savedToolIds.has(entry.toolId) ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                              <BookMarked className="h-3.5 w-3.5" />
                              In Library
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToLibrary(entry.toolId)}
                              className="flex items-center gap-1 rounded-lg border border-[#0033A0]/30 px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
                            >
                              <Plus className="h-3 w-3" />
                              Add to Library
                            </button>
                          )}
                        </div>
                      </div>

                      {noteExpanded && entry.latestNote && (
                        <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3">
                          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                            <FileText className="h-3.5 w-3.5" />
                            Private session note
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                            {entry.latestNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
