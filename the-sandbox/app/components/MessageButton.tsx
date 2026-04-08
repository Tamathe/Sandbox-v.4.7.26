'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type ExistingConversation = {
  id: string
  isGroup: boolean
  participants: Array<{ id: string; name: string; role: string }>
}

export default function MessageButton({
  targetUserId,
  targetUserName,
}: {
  targetUserId: string
  targetUserName: string
}) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/messages?checkExisting=${encodeURIComponent(targetUserId)}`, {
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to check existing conversations')
      }

      const conversations: ExistingConversation[] = await response.json()
      const existingConversation = conversations.find((conversation) => (
        !conversation.isGroup &&
        conversation.participants.length === 2 &&
        conversation.participants.some((participant) => participant.id === targetUserId)
      ))

      if (existingConversation) {
        router.push(`/messages?conversation=${existingConversation.id}`)
        return
      }

      router.push(`/messages?newWith=${encodeURIComponent(targetUserId)}&name=${encodeURIComponent(targetUserName)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleClick()}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:text-[#0033A0] hover:bg-blue-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      Message
    </button>
  )
}
