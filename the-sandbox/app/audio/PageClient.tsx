'use client'

import { useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { User, BookOpen, Compass, Mic, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ForYouFeed from '../components/audio/hub/ForYouFeed'
import CourseEpisodeList from '../components/audio/hub/CourseEpisodeList'
import BrowseGrid from '../components/audio/hub/BrowseGrid'
import VoiceSessionPanel from '../components/audio/voice/VoiceSessionPanel'
import ScenarioBrowser from '../components/audio/scenarios/ScenarioBrowser'
import type { EpisodeCardData } from '../lib/audio/types'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import PodcastifyFAB from '../components/audio/PodcastifyFAB'

const TABS = [
  { id: 'for-you', label: 'For You', icon: User },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'browse', label: 'Browse', icon: Compass },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'scenarios', label: 'Scenarios', icon: Users },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is TabId {
  return TABS.some(t => t.id === value)
}

function AudioHubContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabId>(isValidTab(initialTab) ? initialTab : 'for-you')
  const { activate } = useAudioPlayer()

  const handleTabChange = useCallback((id: TabId) => {
    setTab(id)
    router.replace(`/audio?tab=${id}`, { scroll: false })
  }, [router])

  const handlePlay = useCallback((episode: EpisodeCardData) => {
    if (!episode.cdnUrl) return
    activate({
      toolId: episode.id,
      toolName: episode.sourceName,
      personaName: 'Podcast',
      voiceName: 'alloy',
      speed: 1,
      backgroundTrack: null,
      artworkUrl: null,
    })
  }, [activate])

  const handleScenarioSelect = useCallback((id: string) => {
    router.push(`/audio/scenarios/${id}`)
  }, [router])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Audio"
        subtitle="Listen, learn, and practice with AI-powered audio experiences"
      />

      {/* Scrollable tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-w-fit ${
                active
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'for-you' && <ForYouFeed onPlay={handlePlay} onNavigateTab={(t) => handleTabChange(t as TabId)} />}
      {tab === 'courses' && <CourseEpisodeList onPlay={handlePlay} />}
      {tab === 'browse' && <BrowseGrid onPlay={handlePlay} />}
      {tab === 'voice' && <VoiceSessionPanel />}
      {tab === 'scenarios' && <ScenarioBrowser onSelect={handleScenarioSelect} />}

      <PodcastifyFAB />
    </div>
  )
}

export default function AudioHubPage() {
  return (
    <Suspense fallback={null}>
      <AudioHubContent />
    </Suspense>
  )
}
