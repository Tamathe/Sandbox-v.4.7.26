'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, PenSquare } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth-context'
import ConversationList from '../components/messages/ConversationList'
import ComposeModal from '../components/messages/ComposeModal'

export type Conversation = {
  groupId: string
  name: string
  type: string
  isArchived: boolean
  isMuted: boolean
  notificationLevel: 'ALL' | 'MENTIONS' | 'NONE'
  lastMessage: {
    content: string
    createdAt: string
    authorName: string
    authorAvatar: string | null
  } | null
  unreadCount: number
  memberAvatars: { name: string; avatarUrl: string | null }[]
  memberCount: number
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const params = useParams()
  const selectedGroupId = (params.groupId as string) ?? null

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const fetchConversations = useCallback(
    async (cursor?: string) => {
      try {
        const url = new URL('/api/messages/conversations', window.location.origin)
        if (cursor) url.searchParams.set('cursor', cursor)

        const res = await fetch(url.toString(), {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Failed to load conversations')

        const data: { conversations: Conversation[]; nextCursor: string | null } = await res.json()

        if (cursor) {
          setConversations((prev) => [...prev, ...data.conversations])
        } else {
          setConversations(data.conversations)
        }
        setNextCursor(data.nextCursor)
      } catch {
        // Silently fail — conversations list stays as-is
      } finally {
        setLoading(false)
      }
    },
    [currentUser.email],
  )

  useEffect(() => {
    setLoading(true)
    void fetchConversations()
  }, [fetchConversations])

  // Poll for new conversations every 15s
  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchConversations()
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [fetchConversations])

  // Immediately refresh conversations when a message is sent (optimistic UI support)
  useEffect(() => {
    const handler = () => void fetchConversations()
    window.addEventListener('messages:sent', handler)
    return () => window.removeEventListener('messages:sent', handler)
  }, [fetchConversations])

  // Listen for compose event from empty state
  useEffect(() => {
    const handler = () => setComposeOpen(true)
    window.addEventListener('messages:compose', handler)
    return () => window.removeEventListener('messages:compose', handler)
  }, [])

  const handleSelectConversation = useCallback(
    (groupId: string) => {
      router.push(`/messages/${groupId}`)
    },
    [router],
  )

  const handleLoadMore = useCallback(() => {
    if (nextCursor) void fetchConversations(nextCursor)
  }, [nextCursor, fetchConversations])

  const handleBack = useCallback(() => {
    router.push('/messages')
  }, [router])

  return (
    <div>
      <PageHeader title="Messages" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid min-h-[70vh] grid-cols-1 gap-6 md:grid-cols-[350px_minmax(0,1fr)]">
          {/* Sidebar — conversation list */}
          <aside
            className={`${
              selectedGroupId ? 'hidden md:block' : 'block'
            } overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm`}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="text-lg font-semibold text-gray-900">Messages</div>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0033A0]"
                aria-label="New message"
              >
                <PenSquare className="size-5" />
              </button>
            </div>
            <ConversationList
              conversations={conversations}
              selectedGroupId={selectedGroupId}
              currentUserId={currentUser.name}
              onSelectConversation={handleSelectConversation}
              onLoadMore={handleLoadMore}
              hasMore={nextCursor !== null}
              loading={loading}
            />
          </aside>

          {/* Thread area */}
          <section
            className={`${
              selectedGroupId ? 'flex' : 'hidden md:flex'
            } min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm`}
          >
            {/* Back button for mobile when in a thread */}
            {selectedGroupId && (
              <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3 md:hidden">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>
              </div>
            )}
            {children}
          </section>
        </div>
      </div>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}
