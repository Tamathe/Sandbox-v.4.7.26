'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch, ApiFetchError } from '../lib/api-client'

const ACTIVE_AGENT_STORAGE_KEY = 'sandy-active-agent'
const RECENT_AGENTS_STORAGE_KEY = 'sandy-recent-agents'
const AGENT_PROFILE_EVENT = 'uky-agent-profile-change'

export interface AgentProfileSummary {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  category: string
  capabilities: string[]
  systemPrompt?: string
  starterQuestions: string[]
  welcomeMessage: string | null
  useCount: number
  forkCount: number
  visibility: string
  approvalStatus: string
  creatorId: string
  creator: { id?: string; name: string; role: string }
  forkedFromId: string | null
  createdAt: string
  updatedAt?: string
}

interface ProfilesResponse {
  profiles: AgentProfileSummary[]
  total: number
}

interface FavoritesResponse {
  favorites: AgentProfileSummary[]
}

interface UseAgentProfilesReturn {
  activeProfileId: string | null
  activeProfile: AgentProfileSummary | null
  setActiveProfileId: (id: string | null) => void
  favorites: AgentProfileSummary[]
  recentlyUsed: AgentProfileSummary[]
  myProfiles: AgentProfileSummary[]
  loading: boolean
  toggleFavorite: (profileId: string) => Promise<void>
  forkProfile: (profileId: string) => Promise<AgentProfileSummary | null>
  refreshProfiles: () => void
}

function readStoredActiveAgent(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY)?.trim()
    return stored || null
  } catch {
    return null
  }
}

function writeStoredActiveAgent(profileId: string | null) {
  if (typeof window === 'undefined') return

  try {
    if (profileId) {
      window.localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, profileId)
    } else {
      window.localStorage.removeItem(ACTIVE_AGENT_STORAGE_KEY)
    }
  } catch {
    // Ignore localStorage failures
  }
}

function readRecentAgentIds(limit = 3): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(RECENT_AGENTS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, limit)
  } catch {
    return []
  }
}

function pushRecentAgent(profileId: string) {
  if (typeof window === 'undefined') return

  try {
    const next = [profileId, ...readRecentAgentIds(12).filter((id) => id !== profileId)].slice(0, 12)
    window.localStorage.setItem(RECENT_AGENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore localStorage failures
  }
}

function dispatchAgentProfileChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AGENT_PROFILE_EVENT))
}

async function fetchRecentProfiles(
  email: string,
  signal: AbortSignal,
): Promise<AgentProfileSummary[]> {
  const ids = readRecentAgentIds(3)
  if (ids.length === 0) return []

  const profiles = await Promise.all(
    ids.map(async (id) => {
      try {
        return await apiFetch<AgentProfileSummary>(email, `/api/agent/profiles/${id}`, { signal })
      } catch (error) {
        if (error instanceof ApiFetchError && error.status === 404) {
          return null
        }
        throw error
      }
    }),
  )

  return profiles.filter(Boolean) as AgentProfileSummary[]
}

export function useAgentProfiles(): UseAgentProfilesReturn {
  const { currentUser } = useAuth()
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null)
  const [activeProfile, setActiveProfile] = useState<AgentProfileSummary | null>(null)
  const [favorites, setFavorites] = useState<AgentProfileSummary[]>([])
  const [recentlyUsed, setRecentlyUsed] = useState<AgentProfileSummary[]>([])
  const [myProfiles, setMyProfiles] = useState<AgentProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    setActiveProfileIdState(readStoredActiveAgent())
  }, [currentUser.email])

  useEffect(() => {
    const syncFromStorage = () => {
      setActiveProfileIdState(readStoredActiveAgent())
      setRefreshToken((value) => value + 1)
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === ACTIVE_AGENT_STORAGE_KEY ||
        event.key === RECENT_AGENTS_STORAGE_KEY ||
        event.key === null
      ) {
        syncFromStorage()
      }
    }

    window.addEventListener(AGENT_PROFILE_EVENT, syncFromStorage)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(AGENT_PROFILE_EVENT, syncFromStorage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadLists() {
      setLoading(true)

      try {
        const [favoritesResult, myProfilesResult, recentProfiles] = await Promise.all([
          apiFetch<FavoritesResponse>(currentUser.email, '/api/agent/profiles/favorites', {
            signal: controller.signal,
          }),
          apiFetch<ProfilesResponse>(currentUser.email, '/api/agent/profiles?visibility=mine&limit=50', {
            signal: controller.signal,
          }),
          fetchRecentProfiles(currentUser.email, controller.signal),
        ])

        if (controller.signal.aborted) return

        setFavorites(favoritesResult.favorites ?? [])
        setMyProfiles(
          [...(myProfilesResult.profiles ?? [])].sort((a, b) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime(),
          ),
        )
        setRecentlyUsed(recentProfiles)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setFavorites([])
          setMyProfiles([])
          setRecentlyUsed([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadLists()
    return () => controller.abort()
  }, [currentUser.email, refreshToken])

  useEffect(() => {
    if (!activeProfileId) {
      setActiveProfile(null)
      return
    }

    const controller = new AbortController()

    async function loadActiveProfile() {
      try {
        const profile = await apiFetch<AgentProfileSummary>(
          currentUser.email,
          `/api/agent/profiles/${activeProfileId}`,
          { signal: controller.signal },
        )

        if (!controller.signal.aborted) {
          setActiveProfile(profile)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        if (error instanceof ApiFetchError && (error.status === 403 || error.status === 404)) {
          writeStoredActiveAgent(null)
          if (!controller.signal.aborted) {
            setActiveProfile(null)
            setActiveProfileIdState(null)
            dispatchAgentProfileChange()
          }
          return
        }

        if (!controller.signal.aborted) {
          setActiveProfile(null)
        }
      }
    }

    void loadActiveProfile()
    return () => controller.abort()
  }, [activeProfileId, currentUser.email])

  const setActiveProfileId = useCallback((id: string | null) => {
    setActiveProfileIdState(id)
    writeStoredActiveAgent(id)
    if (id) pushRecentAgent(id)
    dispatchAgentProfileChange()
    setRefreshToken((value) => value + 1)
  }, [])

  const refreshProfiles = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  const toggleFavorite = useCallback(async (profileId: string) => {
    await apiFetch(currentUser.email, '/api/agent/profiles/favorites', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    })
    refreshProfiles()
  }, [currentUser.email, refreshProfiles])

  const forkProfile = useCallback(async (profileId: string) => {
    const profile = await apiFetch<AgentProfileSummary>(
      currentUser.email,
      `/api/agent/profiles/${profileId}/fork`,
      { method: 'POST' },
    )

    pushRecentAgent(profile.id)
    dispatchAgentProfileChange()
    refreshProfiles()
    return profile
  }, [currentUser.email, refreshProfiles])

  const value = useMemo<UseAgentProfilesReturn>(() => ({
    activeProfileId,
    activeProfile,
    setActiveProfileId,
    favorites,
    recentlyUsed,
    myProfiles,
    loading,
    toggleFavorite,
    forkProfile,
    refreshProfiles,
  }), [
    activeProfileId,
    activeProfile,
    favorites,
    recentlyUsed,
    myProfiles,
    loading,
    setActiveProfileId,
    toggleFavorite,
    forkProfile,
    refreshProfiles,
  ])

  return value
}
