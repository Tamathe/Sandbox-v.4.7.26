'use client'

import { Check, GitFork, Heart, Users } from 'lucide-react'
import type { AgentProfileSummary } from '../../hooks/useAgentProfiles'
import { renderAgentProfileIcon } from './agent-profile-icons'

interface AgentProfileCardProps {
  profile: AgentProfileSummary
  isOwner: boolean
  isFavorited: boolean
  isActive: boolean
  onActivate: (id: string) => void
  onFork: (id: string) => void
  onEdit: (id: string) => void
  onToggleFavorite: (id: string) => void
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
  REGISTRAR: 'bg-purple-100 text-purple-700',
  STAFF: 'bg-amber-100 text-amber-700',
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function AgentProfileCard({
  profile,
  isOwner,
  isFavorited,
  isActive,
  onActivate,
  onFork,
  onEdit,
  onToggleFavorite,
}: AgentProfileCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: profile.color || '#0033A0' }}
          >
            {renderAgentProfileIcon(profile.icon, { className: 'size-5' })}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold text-gray-900">{profile.name}</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                {formatCategory(profile.category)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{profile.description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(profile.id)}
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isFavorited
              ? 'border-rose-200 bg-rose-50 text-rose-500'
              : 'border-gray-200 text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500'
          }`}
          aria-label={isFavorited ? 'Unfavorite agent' : 'Favorite agent'}
        >
          <Heart className={`size-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{profile.creator.name}</span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${ROLE_BADGE_STYLES[profile.creator.role] ?? 'bg-gray-100 text-gray-700'}`}>
          {profile.creator.role}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {profile.useCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="size-3.5" />
          {profile.forkCount}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => onActivate(profile.id)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-50 text-[#0033A0]'
                  : 'bg-[#0033A0] text-white hover:bg-[#00297f]'
              }`}
            >
              {isActive && <Check className="size-4" />}
              {isActive ? 'Active' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(profile.id)}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              Edit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onActivate(profile.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-blue-50 text-[#0033A0]'
                : 'bg-[#0033A0] text-white hover:bg-[#00297f]'
            }`}
          >
            {isActive && <Check className="size-4" />}
            {isActive ? 'Active' : 'Activate'}
          </button>
        )}

        {!isOwner && (
          <button
            type="button"
            onClick={() => onFork(profile.id)}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            Fork
          </button>
        )}
      </div>
    </div>
  )
}
