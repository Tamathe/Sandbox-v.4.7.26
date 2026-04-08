'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getExperience } from '../../../lib/sandcastle'
import { useAuth } from '../../../lib/auth-context'
import ChatInterface from '../../../components/ChatInterface'

interface ToolData {
  id: string
  name: string
  systemPrompt: string | null
  welcomeMessage: string | null
  starterQuestions: string[]
  toolType: string
  personaName: string | null
  personaAvatar: string | null
  audioEnabled: boolean
  audioPersonaName: string | null
  audioVoiceName: string | null
  audioSpeed: number | null
  audioBackgroundTrack: string | null
}

export default function SandcastleExperiencePage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string
  const experience = getExperience(slug)

  const [tool, setTool] = useState<ToolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!experience) {
      setError('Experience not found')
      setLoading(false)
      return
    }

    fetch(`/api/tools/sandcastle-${slug}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(res => {
        if (!res.ok) throw new Error('Tool not found')
        return res.json()
      })
      .then(data => {
        setTool(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load this experience. Run the seed to create sandcastle tools.')
        setLoading(false)
      })
  }, [slug, experience, currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error || !experience || !tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">{experience?.emoji || '🏰'}</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Experience not found</h1>
        <p className="text-gray-500 mb-6">{error || 'This experience does not exist yet.'}</p>
        <Link
          href="/campus"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002680] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Community
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link
            href="/campus"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{experience.emoji}</span>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 leading-tight">{experience.title}</h1>
              <p className="text-xs text-gray-500">{experience.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          toolId={tool.id}
          toolName={tool.name}
          systemPrompt={tool.systemPrompt}
          personaName={tool.personaName}
          welcomeMessage={tool.welcomeMessage}
          starterQuestions={tool.starterQuestions || []}
          audioEnabled={tool.audioEnabled}
          audioPersonaName={tool.audioPersonaName}
          audioVoiceName={tool.audioVoiceName}
          audioSpeed={tool.audioSpeed ?? undefined}
          audioBackgroundTrack={tool.audioBackgroundTrack}
        />
      </div>
    </div>
  )
}
