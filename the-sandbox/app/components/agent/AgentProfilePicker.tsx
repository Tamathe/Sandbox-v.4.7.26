'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Check, ChevronDown } from 'lucide-react'
import type { AgentProfileSummary } from '../../hooks/useAgentProfiles'
import { renderAgentProfileIcon } from './agent-profile-icons'

interface AgentProfilePickerProps {
  activeProfileId: string | null
  activeProfile: AgentProfileSummary | null
  favorites: AgentProfileSummary[]
  recentlyUsed: AgentProfileSummary[]
  onSelectProfile: (profileId: string | null) => void
}

function ProfileOption({
  profile,
  active,
  onSelect,
}: {
  profile: AgentProfileSummary
  active: boolean
  onSelect: (profileId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(profile.id)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-blue-50 text-[#0033A0]' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: profile.color || '#0033A0' }}
      >
        {renderAgentProfileIcon(profile.icon, { className: 'size-4' })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-gray-900">{profile.name}</span>
          {active && <Check className="size-3.5 shrink-0 text-[#0033A0]" />}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{profile.description}</p>
      </div>
    </button>
  )
}

export default function AgentProfilePicker({
  activeProfileId,
  activeProfile,
  favorites,
  recentlyUsed,
  onSelectProfile,
}: AgentProfilePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const recentWithoutFavorites = useMemo(() => {
    const favoriteIds = new Set(favorites.map((profile) => profile.id))
    return recentlyUsed.filter((profile) => !favoriteIds.has(profile.id))
  }, [favorites, recentlyUsed])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/25"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {activeProfile
          ? renderAgentProfileIcon(activeProfile.icon, { className: 'size-3.5' })
          : <Bot className="size-3.5" />}
        <span className="max-w-[150px] truncate">{activeProfile?.name ?? 'Sandy'}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onSelectProfile(null)
              setOpen(false)
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
              !activeProfileId ? 'bg-blue-50 text-[#0033A0]' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#0033A0] text-white">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Sandy (Default)</span>
                {!activeProfileId && <Check className="size-3.5 shrink-0 text-[#0033A0]" />}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Use Sandy with the full default toolset.</p>
            </div>
          </button>

          {favorites.length > 0 && (
            <div className="mt-2">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Favorites
              </div>
              <div className="space-y-1">
                {favorites.map((profile) => (
                  <ProfileOption
                    key={profile.id}
                    profile={profile}
                    active={profile.id === activeProfileId}
                    onSelect={(profileId) => {
                      onSelectProfile(profileId)
                      setOpen(false)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {recentWithoutFavorites.length > 0 && (
            <div className="mt-2">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Recent
              </div>
              <div className="space-y-1">
                {recentWithoutFavorites.map((profile) => (
                  <ProfileOption
                    key={profile.id}
                    profile={profile}
                    active={profile.id === activeProfileId}
                    onSelect={(profileId) => {
                      onSelectProfile(profileId)
                      setOpen(false)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="my-2 border-t border-gray-100" />

          <div className="space-y-1 px-1 pb-1">
            <Link
              href="/agents/browse"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#0033A0]"
            >
              Browse all agents...
            </Link>
            <Link
              href="/agents/build"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0033A0] transition-colors hover:bg-blue-50"
            >
              + Build an agent
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
