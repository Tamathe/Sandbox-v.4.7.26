'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Clock, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { ConversationListItem } from '@/lib/types'

interface ChatHistoryProps {
  onSelectConversation: (id: string) => void
  currentConversationId: string | null
}

export default function ChatHistory({ onSelectConversation, currentConversationId }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const data = await api.getSearchHistory(20)
      setConversations(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-kch-gray-400 text-sm">
        Loading history...
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-kch-gray-400 text-sm">
        No search history yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv.id)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            currentConversationId === conv.id
              ? 'bg-kch-blue/10 text-kch-blue'
              : 'hover:bg-kch-gray-100 text-kch-gray-700'
          }`}
        >
          <MessageSquare size={14} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {conv.title || 'Untitled conversation'}
            </p>
            <p className="text-xs text-kch-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {new Date(conv.created_at).toLocaleDateString()}
              <span className="ml-1">{conv.message_count} messages</span>
            </p>
          </div>
          <ChevronRight size={14} className="flex-shrink-0 text-kch-gray-400" />
        </button>
      ))}
    </div>
  )
}
