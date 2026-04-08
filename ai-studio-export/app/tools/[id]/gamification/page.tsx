'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'
import GamificationBuilderChat from '../../../components/GamificationBuilderChat'
import { Zap } from 'lucide-react'

export default function ToolGamificationPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const params = useParams()
  const toolId = params.id as string

  const [toolName, setToolName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/${toolId}`)
      .then(r => r.json())
      .then(data => { setToolName(data.name ?? 'Your Tool'); setLoading(false) })
      .catch(() => setLoading(false))
  }, [toolId])

  if (currentUser.role === 'STUDENT') {
    router.push(`/tools/${toolId}`)
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Set Up Gamification</h1>
            <p className="text-sm text-gray-500">
              Design XP rewards, quests, and badges for <span className="font-semibold text-gray-700">{toolName}</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4 text-sm text-gray-700 mt-4">
          <strong>How it works:</strong> Chat with the AI to design your gamification system.
          Students earn XP for engaging with your tool — more engagement and higher grades = more XP.
          Quests give students specific goals to work toward. Custom badges reward mastery.
        </div>
      </div>

      <GamificationBuilderChat
        toolId={toolId}
        toolName={toolName}
        onSave={() => router.push(`/tools/${toolId}`)}
        onSkip={() => router.push(`/tools/${toolId}`)}
      />
    </div>
  )
}
