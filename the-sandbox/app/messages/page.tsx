'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type ConversationSummary = {
  id: string
  title: string
  isGroup: boolean
  lastMessageAt: string
  participants: Array<{ id: string; name: string; role: string }>
  lastMessage: { content: string; senderName: string } | null
  isUnread: boolean
}

type ThreadMessage = {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
  }
}

type UserSearchResult = {
  id: string
  name: string
  email: string
  role: string
  department: string | null
}

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

function initialsForLabel(label: string) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'SB'
}

function conversationHeaders(email: string, includeJson = false) {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-demo-user-email': email,
  }
}

export default function MessagesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const conversationParam = searchParams.get('conversation')
  const newWithParam = searchParams.get('newWith')
  const newWithNameParam = searchParams.get('name')

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationParam)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeQuery, setComposeQuery] = useState('')
  const [composeResults, setComposeResults] = useState<UserSearchResult[]>([])
  const [composeLoading, setComposeLoading] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [threadDraft, setThreadDraft] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [pageError, setPageError] = useState('')
  const [threadError, setThreadError] = useState('')

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  )

  const currentParticipant = useMemo(
    () => activeConversation?.participants.find((participant) => (
      participant.name === currentUser.name && participant.role === currentUser.role
    )) ?? null,
    [activeConversation, currentUser.name, currentUser.role]
  )

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages', {
        headers: conversationHeaders(currentUser.email),
      })

      if (!response.ok) {
        throw new Error('Failed to load conversations')
      }

      const data: ConversationSummary[] = await response.json()
      setConversations(data)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load conversations')
    } finally {
      setConversationsLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string, showSpinner = true) => {
    if (showSpinner) setThreadLoading(true)

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        headers: conversationHeaders(currentUser.email),
      })

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data: { messages: ThreadMessage[] } = await response.json()
      setMessages(data.messages)
      setThreadError('')
      setConversations((previous) => previous.map((conversation) => (
        conversation.id === conversationId
          ? { ...conversation, isUnread: false }
          : conversation
      )))
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : 'Failed to load messages')
    } finally {
      if (showSpinner) setThreadLoading(false)
    }
  }

  const openConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId)
    router.replace(`/messages?conversation=${conversationId}`)
    await fetchMessages(conversationId)
  }

  const resetComposeState = () => {
    setComposeOpen(false)
    setComposeQuery('')
    setComposeResults([])
    setSelectedUser(null)
    setFirstMessage('')
  }

  useEffect(() => {
    void fetchConversations()
  }, [currentUser.email])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchConversations()
    }, 15000)

    return () => window.clearInterval(interval)
  }, [currentUser.email])

  useEffect(() => {
    if (conversationParam) {
      setActiveConversationId(conversationParam)
      return
    }

    setActiveConversationId((previous) => previous)
  }, [conversationParam])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    void fetchMessages(activeConversationId)
  }, [activeConversationId, currentUser.email])

  useEffect(() => {
    if (!activeConversationId) return

    const interval = window.setInterval(() => {
      void fetchMessages(activeConversationId, false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [activeConversationId, currentUser.email])

  useEffect(() => {
    if (!conversationParam || conversations.length === 0) return

    const conversationExists = conversations.some((conversation) => conversation.id === conversationParam)
    if (conversationExists) {
      setActiveConversationId(conversationParam)
    }
  }, [conversationParam, conversations])

  useEffect(() => {
    if (!newWithParam) return

    setComposeOpen(true)
    setSelectedUser((previous) => {
      if (previous?.id === newWithParam) return previous
      return {
        id: newWithParam,
        name: newWithNameParam || 'New conversation',
        email: '',
        role: '',
        department: null,
      }
    })
    setComposeQuery(newWithNameParam || '')
  }, [newWithNameParam, newWithParam])

  useEffect(() => {
    if (!composeOpen) return
    if (selectedUser && composeQuery.trim() === selectedUser.name && composeResults.length === 0) return

    const query = composeQuery.trim()
    if (!query) {
      setComposeResults([])
      setComposeLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setComposeLoading(true)
      try {
        const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`, {
          headers: conversationHeaders(currentUser.email),
        })

        if (!response.ok) {
          throw new Error('Failed to search users')
        }

        const data: UserSearchResult[] = await response.json()
        setComposeResults(data)
      } catch {
        setComposeResults([])
      } finally {
        setComposeLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [composeOpen, composeQuery, composeResults.length, currentUser.email, selectedUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!activeConversationId || !threadDraft.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/messages/${activeConversationId}/send`, {
        method: 'POST',
        headers: conversationHeaders(currentUser.email, true),
        body: JSON.stringify({ content: threadDraft.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const createdMessage: ThreadMessage = await response.json()
      setMessages((previous) => [...previous, createdMessage])
      setThreadDraft('')
      setThreadError('')
      await fetchConversations()
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCreateConversation = async () => {
    if (!selectedUser || !firstMessage.trim() || composeSending) return

    setComposeSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: conversationHeaders(currentUser.email, true),
        body: JSON.stringify({
          participantIds: [selectedUser.id],
          initialMessage: firstMessage.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const conversation: ConversationSummary = await response.json()
      await fetchConversations()
      resetComposeState()
      setActiveConversationId(conversation.id)
      router.replace(`/messages?conversation=${conversation.id}`)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create conversation')
    } finally {
      setComposeSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Direct conversations with educators, students, and admins across The Sandbox.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setComposeOpen(true)
            setPageError('')
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
        >
          <Plus className="h-4 w-4" />
          New Message
        </button>
      </div>

      {pageError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="grid min-h-[70vh] grid-cols-1 gap-6 md:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${activeConversationId ? 'hidden md:block' : 'block'} overflow-hidden rounded-3xl border border-gray-200 bg-white`}>
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="text-lg font-semibold text-gray-900">Messages</div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm font-semibold text-gray-600">No messages yet.</p>
                <p className="mt-1 text-sm text-gray-400">Visit someone&apos;s profile to start a conversation.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  className={`relative w-full border-b border-gray-100 px-5 py-4 text-left transition-colors last:border-b-0 ${
                    activeConversationId === conversation.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-sm font-semibold text-white">
                      {initialsForLabel(conversation.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-gray-900">{conversation.title}</div>
                        <div className="text-[11px] text-gray-400">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="truncate text-sm text-gray-500">
                        {conversation.lastMessage
                          ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.content}`
                          : 'No messages yet'}
                      </div>
                    </div>
                  </div>

                  {conversation.isUnread && (
                    <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[#0033A0]" />
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`${activeConversationId ? 'flex' : 'hidden md:flex'} min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white`}>
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversationId(null)
                    setMessages([])
                    router.replace('/messages')
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0033A0] text-sm font-semibold text-white">
                  {initialsForLabel(activeConversation.title)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{activeConversation.title}</div>
                  <div className="truncate text-xs text-gray-500">
                    {activeConversation.participants
                      .filter((participant) => participant.id !== currentParticipant?.id)
                      .map((participant) => participant.name)
                      .join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading thread...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isCurrentUser = currentParticipant
                        ? message.sender.id === currentParticipant.id
                        : message.sender.name === currentUser.name && message.sender.role === currentUser.role

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            isCurrentUser
                              ? 'bg-[#0033A0] text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <div className={`mb-1 text-[11px] font-semibold ${
                              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {message.sender.name}
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                            <div className={`mt-2 text-[11px] ${
                              isCurrentUser ? 'text-blue-100' : 'text-gray-400'
                            }`}>
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-5 py-4">
                {threadError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {threadError}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <input
                    value={threadDraft}
                    onChange={(event) => setThreadDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder="Write a message..."
                    className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0033A0]"
                  />
                  <button
                    type="button"
                    disabled={sending || !threadDraft.trim()}
                    onClick={() => void handleSendMessage()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-gray-200" />
              <h2 className="text-lg font-semibold text-gray-700">Select a conversation</h2>
              <p className="mt-1 max-w-md text-sm text-gray-400">Choose a thread from the left, or start a new message to connect with someone in The Sandbox.</p>
            </div>
          )}
        </section>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
                <p className="text-sm text-gray-500">Search for a user and send the first message.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetComposeState()
                  router.replace('/messages')
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Search users
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={composeQuery}
                    onChange={(event) => {
                      setComposeQuery(event.target.value)
                      if (!event.target.value.trim()) setSelectedUser(null)
                    }}
                    placeholder="Search by name or email"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
              </div>

              {selectedUser && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Selected user</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{selectedUser.name}</div>
                  <div className="text-sm text-gray-500">{selectedUser.email || newWithNameParam || 'Ready to message'}</div>
                </div>
              )}

              {composeLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching users...
                </div>
              ) : composeQuery.trim() && !selectedUser ? (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {composeResults.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                      No matching users found.
                    </div>
                  ) : (
                    composeResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#0033A0] hover:bg-blue-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-sm font-semibold text-white">
                          {initialsForLabel(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="truncate text-sm text-gray-500">{user.email}</div>
                          {user.department && (
                            <div className="truncate text-xs text-gray-400">{user.department}</div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  First message
                </label>
                <textarea
                  value={firstMessage}
                  onChange={(event) => setFirstMessage(event.target.value)}
                  rows={4}
                  placeholder="Write your message..."
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0033A0]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  resetComposeState()
                  router.replace('/messages')
                }}
                className="rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={composeSending || !selectedUser || !firstMessage.trim()}
                onClick={() => void handleCreateConversation()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
              >
                {composeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
