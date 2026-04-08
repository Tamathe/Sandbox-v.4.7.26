'use client'

import { BookOpen, Flame, Swords, TrendingUp, Trophy, Users, Zap } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import PageHeader from '../../components/PageHeader'
import ErrorBanner from '../../components/ErrorBanner'

interface ActiveRoom {
  id: string
  type: string
  title: string
  phase: string
  hostName: string
  groupName: string
  participantCount: number
  participants: string[]
}

interface RecentRoom {
  id: string
  type: string
  title: string
  hostName: string
  topPlayers: Array<{ name: string; score: number }>
}

interface PulseData {
  activeRooms: ActiveRoom[]
  recentRooms: RecentRoom[]
  stats: {
    activeStudyRooms: number
    activeStudiers: number
    challengesToday: number
    participantsToday: number
  }
  trending: Array<{ topic: string; count: number }>
  activePeople: Array<{ userId: string; name: string; roomTitle: string; roomType: string }>
}

export default function CommunityPulsePage() {
  const { currentUser } = useAuth()
  const { data, error: swrError, isLoading: loading, mutate } = useApiFetch<PulseData>('/api/community-pulse')
  const error = swrError ? (swrError instanceof Error ? swrError.message : 'Failed to load community data') : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:ml-96">
      <PageHeader
        title="The Commons"
        subtitle="See what's happening across campus right now"
      />

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading...</div>
      ) : error ? (
        <div className="py-20">
          <ErrorBanner message={error} retry={() => mutate()} />
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-sm text-gray-400">Unable to load community data.</div>
      ) : (
        <div className="space-y-8">
          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<BookOpen className="size-5" />}
              label="Studying Now"
              value={data.stats.activeStudiers}
              sublabel={`${data.stats.activeStudyRooms} study room${data.stats.activeStudyRooms !== 1 ? 's' : ''}`}
              color="emerald"
            />
            <StatCard
              icon={<Swords className="size-5" />}
              label="Challenges Today"
              value={data.stats.challengesToday}
              sublabel={`${data.stats.participantsToday} participants`}
              color="blue"
            />
            <StatCard
              icon={<Zap className="size-5" />}
              label="Active Rooms"
              value={data.activeRooms.length}
              sublabel="right now"
              color="amber"
            />
            <StatCard
              icon={<TrendingUp className="size-5" />}
              label="Trending Topics"
              value={data.trending.length}
              sublabel="in the last 24h"
              color="purple"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Active Rooms */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-extrabold text-gray-900">Live Right Now</h2>
              {data.activeRooms.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
                  <Users className="mx-auto mb-2 size-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No active rooms right now.</p>
                  <p className="mt-1 text-xs text-gray-300">
                    Type <span className="font-mono font-semibold">/challenge</span> or <span className="font-mono font-semibold">/study</span> in any group chat to start one!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.activeRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-4 rounded-2xl border-2 border-gray-100 bg-white p-4 transition-colors hover:border-[#0033A0]/20"
                    >
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        room.type === 'STUDY' ? 'bg-emerald-100 text-emerald-600' : 'bg-[#0033A0]/10 text-[#0033A0]'
                      }`}>
                        {room.type === 'STUDY' ? <BookOpen className="size-5" /> : <Swords className="size-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900">{room.title}</h3>
                        <p className="text-xs text-gray-500">{room.groupName} · hosted by {room.hostName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            {room.participants.slice(0, 3).map((name, i) => (
                              <div
                                key={i}
                                className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#0033A0] text-[9px] font-bold text-white"
                              >
                                {name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{room.participantCount}</span>
                        </div>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          room.type === 'STUDY'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {room.phase === 'LOBBY' ? 'Waiting' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Games */}
              {data.recentRooms.length > 0 && (
                <>
                  <h2 className="mb-4 mt-8 text-lg font-extrabold text-gray-900">Recent Challenges</h2>
                  <div className="space-y-3">
                    {data.recentRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center gap-4 rounded-2xl border-2 border-gray-100 bg-white p-4"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                          <Trophy className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-gray-900">{room.title}</h3>
                          <p className="text-xs text-gray-500">
                            {room.topPlayers.map((p, i) => (
                              <span key={i}>
                                {i > 0 && ' · '}
                                {['🥇', '🥈', '🥉'][i]} {p.name} ({p.score}pts)
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trending Topics */}
              <div>
                <h2 className="mb-4 text-lg font-extrabold text-gray-900">Trending Topics</h2>
                {data.trending.length === 0 ? (
                  <p className="text-sm text-gray-400">No trending topics yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.trending.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                      >
                        <Flame className="size-4 text-amber-500" />
                        <span className="flex-1 text-sm font-medium text-gray-800">{t.topic}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Your People */}
              {data.activePeople.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-extrabold text-gray-900">Your People</h2>
                  <div className="space-y-2">
                    {data.activePeople.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                      >
                        <div className="flex size-7 items-center justify-center rounded-full bg-[#0033A0] text-xs font-bold text-white">
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {p.roomType === 'STUDY' ? 'Studying' : 'Playing'}: {p.roomTitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sublabel: string
  color: 'emerald' | 'blue' | 'amber' | 'purple'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue: 'bg-[#0033A0]/5 text-[#0033A0] border-[#0033A0]/20',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  }

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorMap[color]}`}>
      <div className="mb-2">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-xs opacity-60">{sublabel}</div>
    </div>
  )
}
