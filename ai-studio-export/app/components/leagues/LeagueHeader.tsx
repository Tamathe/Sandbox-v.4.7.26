'use client'

import { Copy, PauseCircle, PlayCircle, PlusCircle, Archive } from 'lucide-react'

import { LeagueDigestToggle } from './LeagueDigestToggle'
import type { LeagueDetail } from './types'

export function LeagueHeader({
  league,
  isAdmin,
  digestBusy,
  onToggleDigest,
  onCopyJoinCode,
  onCreateCycle,
  onStatusAction,
}: {
  league: LeagueDetail
  isAdmin: boolean
  digestBusy: boolean
  onToggleDigest: (nextValue: boolean) => Promise<void>
  onCopyJoinCode: () => void
  onCreateCycle: () => void
  onStatusAction: (action: 'pause' | 'activate' | 'archive') => Promise<void>
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0033A0]">
              {league.kind.replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              {league.status}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">{league.name}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            {league.description || 'A recurring league experience built on The Sandbox engine.'}
          </p>
          {league.joinCode ? (
            <button
              type="button"
              onClick={onCopyJoinCode}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0033A0]"
            >
              <Copy className="h-3.5 w-3.5" />
              Join Code: <span className="font-mono tracking-[0.2em]">{league.joinCode}</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LeagueDigestToggle
            subscribed={league.isSubscribedToDigest}
            onToggle={onToggleDigest}
            busy={digestBusy}
          />
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={onCreateCycle}
                className="inline-flex items-center gap-2 rounded-full bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#002580]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Open Next Cycle
              </button>
              {league.status === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => onStatusAction('pause')}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStatusAction('activate')}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Activate
                </button>
              )}
              <button
                type="button"
                onClick={() => onStatusAction('archive')}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
