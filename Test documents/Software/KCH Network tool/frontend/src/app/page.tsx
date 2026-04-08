'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'
import SearchBar from '@/components/search/search-bar'
import SearchResults from '@/components/search/search-results'
import ChatHistory from '@/components/search/chat-history'
import { MessageSquare, History, X } from 'lucide-react'
import type { SearchResponse, SearchFilters, ConversationMessage } from '@/lib/types'

interface ChatEntry {
  query: string
  result: SearchResponse
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const handleSearch = useCallback(async (query: string, filters?: SearchFilters) => {
    setIsSearching(true)
    setError(null)

    try {
      const result = await api.search(query, conversationId || undefined, filters)
      setChatEntries((prev) => [...prev, { query, result }])
      setConversationId(result.conversation_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }, [conversationId])

  const handleNewConversation = useCallback(() => {
    setChatEntries([])
    setConversationId(null)
    setError(null)
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      const conv = await api.getConversation(id)
      setConversationId(id)
      setChatEntries(
        conv.messages.map((m) => ({
          query: m.query,
          result: {
            answer: m.answer,
            confidence: (m.confidence as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
            sources: m.sources,
            conversation_id: id,
            response_time_ms: 0,
          },
        }))
      )
      setShowHistory(false)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-kch-blue/30 border-t-kch-blue rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* Top bar: New conversation + History toggle */}
        <div className="flex items-center justify-between mb-6">
          {chatEntries.length > 0 ? (
            <button onClick={handleNewConversation} className="btn-secondary text-sm flex items-center gap-2">
              <MessageSquare size={16} />
              New Search
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {showHistory ? <X size={16} /> : <History size={16} />}
            {showHistory ? 'Close' : 'History'}
          </button>
        </div>

        {/* History sidebar overlay */}
        {showHistory && (
          <div className="card mb-6 p-4">
            <h3 className="text-sm font-semibold text-kch-gray-700 mb-3">Recent Searches</h3>
            <ChatHistory
              onSelectConversation={handleSelectConversation}
              currentConversationId={conversationId}
            />
          </div>
        )}

        {/* Empty state */}
        {chatEntries.length === 0 && !isSearching && (
          <div className="text-center py-12 sm:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-kch-blue/10 rounded-2xl mb-4">
              <span className="text-kch-blue font-bold text-2xl">KCH</span>
            </div>
            <h2 className="text-2xl font-bold text-kch-gray-900 mb-2">
              KCH Network Document Search
            </h2>
            <p className="text-kch-gray-500 max-w-md mx-auto mb-4">
              Search across Kentucky Children&apos;s Hospital network policies, procedures,
              guidelines, and documentation. Ask questions in natural language.
            </p>
            <div className="max-w-lg mx-auto mb-8 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium">
                PROOF OF CONCEPT ONLY — This tool is for demonstration purposes and should not be
                used for clinical or medical decision-making. The documents in the database are
                currently being reviewed and updated.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {[
                '16 day old with a fever but looks very well. Can I send them home?',
                'I have a 12-year-old with a urinary tract infection. What are the recommended antibiotics to use?',
                'What is the bronchiolitis score?',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => handleSearch(example)}
                  className="px-3 py-1.5 bg-white border border-kch-gray-200 rounded-full text-kch-gray-600
                             hover:border-kch-blue hover:text-kch-blue transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className={chatEntries.length === 0 && !isSearching ? 'max-w-3xl mx-auto' : ''}>
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Chat entries */}
        <div className="mt-6 space-y-8">
          {chatEntries.map((entry, i) => (
            <div key={i}>
              {/* User query */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-kch-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-kch-gray-600">
                    {user.full_name.charAt(0)}
                  </span>
                </div>
                <div className="bg-kch-gray-100 rounded-xl px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-kch-gray-900">{entry.query}</p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-kch-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
                <div className="flex-1 max-w-[95%]">
                  <SearchResults result={entry.result} />
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isSearching && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-kch-blue rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <div className="card px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-kch-gray-500">
                  <div className="w-4 h-4 border-2 border-kch-blue/30 border-t-kch-blue rounded-full animate-spin" />
                  Searching documents and generating answer...
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
