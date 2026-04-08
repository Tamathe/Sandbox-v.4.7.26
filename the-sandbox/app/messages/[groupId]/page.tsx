'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, BookOpen, Check, Copy, Download, FileText, GraduationCap, Loader2, MonitorPlay, MoreHorizontal, MoreVertical, Pencil, Pin, PinOff, RefreshCw, Reply, Search, Settings, SmilePlus, Swords, Trash2, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import MessageInput from '../../components/messages/MessageInput'
import GroupSettingsModal from '../../components/messages/GroupSettingsModal'
import CommonsCard from '../../components/commons/CommonsCard'
import CommonsOverlayRouter from '../../components/commons/CommonsOverlayRouter'
import type {
  OptimisticSendPayload,
  MessageConfirmPayload,
  MessageFailPayload,
} from '../../components/messages/MessageInput'

interface Author {
  id: string
  name: string
  avatarUrl: string | null
}

interface ReplyInfo {
  id: string
  content: string
  author: { id: string; name: string }
}

interface ReactionSummary {
  emoji: string
  count: number
  reacted: boolean
}

interface LiveRoomData {
  id: string
  type: string
  title: string
  phase: string
  hostId: string
  currentRound: number
  config: Record<string, unknown>
  participants: Array<{ userId: string; name: string; score: number; streak: number }>
}

interface Message {
  id: string
  channelId: string
  authorId: string
  content: string
  messageType?: string
  isSandy: boolean
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentType: string | null
  liveRoomId?: string | null
  liveRoom?: LiveRoomData | null
  replyToId: string | null
  replyTo: ReplyInfo | null
  author: Author
  reactions: ReactionSummary[]
  pinnedAt: string | null
  pinnedById: string | null
}

/** Extended message type that includes optimistic state */
interface DisplayMessage extends Message {
  _optimistic?: boolean
  _clientId?: string
  _failed?: boolean
}

interface ThreadInfo {
  groupId: string
  groupName: string
  channelId: string
  members: Author[]
}

interface ReplyTo {
  id: string
  authorName: string
  content: string
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SB'
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function Avatar({ author, size = 'md' }: { author: Author; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'size-6' : 'size-8'
  const text = size === 'sm' ? 'text-[9px]' : 'text-xs'
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-uk-blue ${text} font-semibold text-white`}
      title={author.name}
    >
      {author.avatarUrl ? (
        <Image src={author.avatarUrl} alt={author.name} width={32} height={32} className="size-full rounded-full object-cover" />
      ) : (
        getInitials(author.name)
      )}
    </div>
  )
}

export default function MessageThreadPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { currentUser } = useAuth()

  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [notifLevel, setNotifLevel] = useState<'ALL' | 'MENTIONS' | 'NONE'>('ALL')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false)
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<{ id: string; content: string; createdAt: string; pinnedAt: string; pinnedBy: { id: string; name: string } | null; author: { id: string; name: string; avatarUrl: string | null } }[]>([])
  const [pinnedLoading, setPinnedLoading] = useState(false)

  // Thread search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; content: string; createdAt: string; author: { id: string; name: string; avatarUrl: string | null } }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([])

  // Reaction emoji picker state
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null)

  // Commons state
  const [activeLiveRoomId, setActiveLiveRoomId] = useState<string | null>(null)
  const [activeLiveRoomType, setActiveLiveRoomType] = useState<string>('CHALLENGE')
  const [showChallengeCreator, setShowChallengeCreator] = useState(false)
  const [challengeTitle, setChallengeTitle] = useState('')
  const [challengeTopic, setChallengeTopic] = useState('')
  const [challengeRounds, setChallengeRounds] = useState(5)
  const [creatingChallenge, setCreatingChallenge] = useState(false)
  const [sandySuggestion, setSandySuggestion] = useState<{ message: string; topic: string; channelId: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  // Track server message IDs for deduplication during polling
  const serverIdsRef = useRef<Set<string>>(new Set())
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headers = { 'x-demo-user-email': currentUser.email }

  // Track whether user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Mark thread as read (fire-and-forget)
  const markAsRead = useCallback(() => {
    void fetch(`/api/messages/groups/${groupId}/read`, {
      method: 'POST',
      headers,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  // Fetch thread info
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/messages/groups/${groupId}/info`, { headers })
        if (!res.ok) return
        const data: ThreadInfo = await res.json()
        if (!cancelled) setThreadInfo(data)
      } catch { /* silent */ }
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  // Fetch notification preference
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/messages/groups/${groupId}/notifications`, { headers })
        if (!res.ok) return
        const data: { level: 'ALL' | 'MENTIONS' | 'NONE' } = await res.json()
        if (!cancelled) setNotifLevel(data.level)
      } catch { /* silent */ }
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  const handleSetNotifLevel = useCallback(async (level: 'ALL' | 'MENTIONS' | 'NONE') => {
    const prev = notifLevel
    setNotifLevel(level) // optimistic
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ level }),
      })
      if (res.ok) {
        const data: { level: 'ALL' | 'MENTIONS' | 'NONE' } = await res.json()
        setNotifLevel(data.level)
        window.dispatchEvent(new CustomEvent('messages:sent'))
      } else {
        setNotifLevel(prev) // revert
      }
    } catch {
      setNotifLevel(prev) // revert
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email, notifLevel])

  // Fetch pinned messages
  const fetchPinned = useCallback(async () => {
    setPinnedLoading(true)
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/pinned`, { headers })
      if (res.ok) {
        const data = await res.json()
        setPinnedMessages(data.pinned)
      }
    } catch { /* silent */ }
    setPinnedLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  const handleTogglePin = useCallback(async (messageId: string) => {
    setMenuOpenId(null)
    try {
      const res = await fetch(`/api/messages/groups/${groupId}/messages/${messageId}/pin`, {
        method: 'POST',
        headers,
      })
      if (res.ok) {
        const data: { pinned: boolean } = await res.json()
        // Update local message state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, pinnedAt: data.pinned ? new Date().toISOString() : null, pinnedById: data.pinned ? currentUser.id : null }
              : m,
          ),
        )
        // Refresh pinned panel if open
        if (pinnedPanelOpen) void fetchPinned()
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email, currentUser.id, pinnedPanelOpen, fetchPinned])

  const handleOpenPinnedPanel = useCallback(() => {
    setPinnedPanelOpen(true)
    void fetchPinned()
  }, [fetchPinned])

  // Debounced thread search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/messages/groups/${groupId}/search?q=${encodeURIComponent(trimmed)}&limit=20`,
          { headers },
        )
        if (!res.ok) return
        const data: { results: typeof searchResults } = await res.json()
        setSearchResults(data.results)
      } catch { /* silent */ }
      setSearchLoading(false)
    }, 300)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, groupId])

  const handleScrollToMessage = useCallback((messageId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])

    // Find the message element and scroll to it
    const el = document.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(messageId)
      setTimeout(() => setHighlightedMsgId(null), 1500)
    }
  }, [])

  const handleGroupUpdated = useCallback(() => {
    // Re-fetch thread info after group changes
    void fetch(`/api/messages/groups/${groupId}/info`, { headers })
      .then((res) => res.ok ? res.json() : null)
      .then((data: ThreadInfo | null) => { if (data) setThreadInfo(data) })
    // Refresh conversation list
    window.dispatchEvent(new CustomEvent('messages:sent'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  // Poll typing indicators every 3s
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/groups/${groupId}/typing`, { headers })
        if (!res.ok) return
        const data: { typing: { id: string; name: string }[] } = await res.json()
        setTypingUsers(data.typing)
      } catch { /* silent */ }
    }, 3000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email])

  // Handle reaction toggle (optimistic)
  const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const existing = m.reactions?.find((r) => r.emoji === emoji)
        let newReactions: ReactionSummary[]
        if (existing?.reacted) {
          // Remove reaction
          newReactions = m.reactions
            .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
            .filter((r) => r.count > 0)
        } else if (existing) {
          // Add to existing emoji
          newReactions = m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r,
          )
        } else {
          // New emoji
          newReactions = [...(m.reactions ?? []), { emoji, count: 1, reacted: true }]
        }
        return { ...m, reactions: newReactions }
      }),
    )
    setEmojiPickerMsgId(null)
    setMenuOpenId(null)

    try {
      await fetch(`/api/messages/groups/${groupId}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ emoji }),
      })
    } catch { /* silent — optimistic update already applied */ }
  }, [groupId, currentUser.email])

  // Fetch initial messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      serverIdsRef.current.clear()
      try {
        const res = await fetch(`/api/messages/groups/${groupId}/messages?limit=50`, { headers })
        if (!res.ok) return
        const data: { messages: Message[]; channelId: string } = await res.json()
        if (!cancelled) {
          const ids = new Set<string>()
          data.messages.forEach((m) => ids.add(m.id))
          serverIdsRef.current = ids
          setMessages(data.messages)
          setChannelId(data.channelId)
          if (data.messages.length > 0) markAsRead()
        }
      } catch { /* silent */ }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email, markAsRead])

  // Auto-scroll on initial load and when messages change
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Poll for new messages every 10s — deduplicates against optimistic + existing messages
  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (messages.length === 0) return
      // Find the latest server message (skip optimistic) for cursor
      const serverMessages = messages.filter((m) => !m._optimistic)
      if (serverMessages.length === 0) return
      const lastMsg = serverMessages[serverMessages.length - 1]
      try {
        const res = await fetch(
          `/api/messages/groups/${groupId}/messages?after=${encodeURIComponent(lastMsg.createdAt)}&limit=50`,
          { headers },
        )
        if (!res.ok) return
        const data: { messages: Message[] } = await res.json()
        if (data.messages.length > 0) {
          setMessages((prev) => {
            // Filter out messages we already have (by server ID)
            const newMsgs = data.messages.filter((m) => !serverIdsRef.current.has(m.id))
            if (newMsgs.length === 0) return prev

            // Add new IDs to tracking set
            newMsgs.forEach((m) => serverIdsRef.current.add(m.id))

            // Remove any confirmed optimistic messages that now appear from polling
            const confirmedServerIds = new Set(data.messages.map((m) => m.id))
            const withoutDuplicateOptimistics = prev.filter(
              (m) => !(m._optimistic && !m._failed && m.id && confirmedServerIds.has(m.id)),
            )

            return [...withoutDuplicateOptimistics, ...newMsgs]
          })
          // Mark as read after receiving new messages
          markAsRead()
        }
      } catch { /* silent */ }
    }, 10_000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser.email, messages])

  // --- Optimistic message handlers ---
  const handleOptimisticSend = useCallback(
    (payload: OptimisticSendPayload) => {
      const optimisticMsg: DisplayMessage = {
        id: payload.clientId,
        channelId: channelId ?? '',
        authorId: currentUser.id,
        content: payload.content,
        isSandy: false,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        attachmentUrl: payload.attachmentUrl ?? null,
        attachmentName: payload.attachmentName ?? null,
        attachmentType: payload.attachmentType ?? null,
        replyToId: payload.replyTo?.id ?? null,
        replyTo: payload.replyTo
          ? {
              id: payload.replyTo.id,
              content: payload.replyTo.content,
              author: { id: '', name: payload.replyTo.authorName },
            }
          : null,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          avatarUrl: null,
        },
        reactions: [],
        pinnedAt: null,
        pinnedById: null,
        _optimistic: true,
        _clientId: payload.clientId,
      }
      setMessages((prev) => [...prev, optimisticMsg])
      isAtBottomRef.current = true
      scrollToBottom()

      // Dispatch event so layout.tsx can refresh conversation list immediately
      window.dispatchEvent(new CustomEvent('messages:sent'))
    },
    [channelId, currentUser, scrollToBottom],
  )

  const handleMessageConfirmed = useCallback((payload: MessageConfirmPayload) => {
    serverIdsRef.current.add(payload.serverId)
    setMessages((prev) =>
      prev.map((m) =>
        m._clientId === payload.clientId
          ? { ...m, id: payload.serverId, createdAt: payload.createdAt, _optimistic: false, _failed: false }
          : m,
      ),
    )
  }, [])

  const handleMessageFailed = useCallback((payload: MessageFailPayload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m._clientId === payload.clientId ? { ...m, _failed: true } : m,
      ),
    )
  }, [])

  const handleRetry = useCallback(
    async (msg: DisplayMessage) => {
      if (!msg._clientId) return
      // Reset failed state to sending
      setMessages((prev) =>
        prev.map((m) =>
          m._clientId === msg._clientId ? { ...m, _failed: false } : m,
        ),
      )

      try {
        const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            content: msg.content,
            ...(msg.replyToId ? { replyToId: msg.replyToId } : {}),
          }),
        })

        if (res.ok) {
          const data = await res.json()
          serverIdsRef.current.add(data.id)
          setMessages((prev) =>
            prev.map((m) =>
              m._clientId === msg._clientId
                ? { ...m, id: data.id, createdAt: data.createdAt, _optimistic: false, _failed: false }
                : m,
            ),
          )
          window.dispatchEvent(new CustomEvent('messages:sent'))
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m._clientId === msg._clientId ? { ...m, _failed: true } : m,
            ),
          )
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m._clientId === msg._clientId ? { ...m, _failed: true } : m,
          ),
        )
      }
    },
    [groupId, currentUser.email],
  )

  const handleReply = useCallback((msg: DisplayMessage) => {
    if (msg._optimistic) return // Can't reply to unsent messages
    setReplyTo({
      id: msg.id,
      authorName: msg.author.name,
      content: msg.content,
    })
  }, [])

  const handleClearReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  // --- Message action handlers ---
  const handleCopy = useCallback((content: string) => {
    void navigator.clipboard.writeText(content)
    setMenuOpenId(null)
  }, [])

  const handleStartEdit = useCallback((msg: DisplayMessage) => {
    setEditingMessageId(msg.id)
    setEditContent(msg.content)
    setMenuOpenId(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditContent('')
  }, [])

  const handleSaveEdit = useCallback(async (messageId: string) => {
    const trimmed = editContent.trim()
    if (!trimmed) return

    try {
      const res = await fetch(`/api/message/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ content: trimmed }),
      })
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: trimmed, editedAt: new Date().toISOString() }
              : m,
          ),
        )
      }
    } catch { /* silent */ }
    setEditingMessageId(null)
    setEditContent('')
  }, [editContent, currentUser.email])

  const handleDelete = useCallback(async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return
    setMenuOpenId(null)
    try {
      const res = await fetch(`/api/message/${messageId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: '[deleted]', deletedAt: new Date().toISOString() }
              : m,
          ),
        )
      }
    } catch { /* silent */ }
  }, [currentUser.email])

  // Close menu, emoji picker, or overflow menu on click outside or Escape
  useEffect(() => {
    if (!menuOpenId && !emojiPickerMsgId && !overflowMenuOpen) return
    const handleClickOutside = () => {
      setMenuOpenId(null)
      setEmojiPickerMsgId(null)
      setOverflowMenuOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null)
        setEmojiPickerMsgId(null)
        setOverflowMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpenId, emojiPickerMsgId, overflowMenuOpen])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Commons suggestion fetch ────────────────────────────────────────────
  useEffect(() => {
    if (!channelId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/commons/suggestions', { headers })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        // Find a suggestion that matches this channel
        const match = data.suggestions?.find((s: { channelId: string }) => s.channelId === channelId)
        if (match) {
          setSandySuggestion({ message: match.message, topic: match.topic ?? match.chipLabel, channelId: match.channelId })
        }
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  // ── Commons handlers ────────────────────────────────────────────────────
  const handleJoinLiveRoom = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/commons/${roomId}/join`, {
        method: 'POST',
        headers,
      })
      if (res.ok) {
        const data = await res.json()
        setActiveLiveRoomId(roomId)
        setActiveLiveRoomType(data.type ?? 'CHALLENGE')
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email])

  const handleOpenLiveRoom = useCallback((roomId: string) => {
    // Determine type from the messages (find the live room card)
    const liveRoomMsg = messages.find((m) => m.liveRoom?.id === roomId)
    setActiveLiveRoomId(roomId)
    setActiveLiveRoomType(liveRoomMsg?.liveRoom?.type ?? 'CHALLENGE')
  }, [messages])

  const handleCreateChallenge = useCallback(async () => {
    if (!channelId || !challengeTitle.trim()) return
    setCreatingChallenge(true)
    try {
      const res = await fetch('/api/commons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          channelId,
          type: 'CHALLENGE',
          title: challengeTitle.trim(),
          config: {
            rounds: challengeRounds,
            topic: challengeTopic.trim() || undefined,
          },
        }),
      })
      if (res.ok) {
        const room = await res.json()
        setActiveLiveRoomId(room.id)
        setShowChallengeCreator(false)
        setChallengeTitle('')
        setChallengeTopic('')
        setChallengeRounds(5)
        // Trigger message refresh to show the activity card
        window.dispatchEvent(new CustomEvent('messages:sent'))
      }
    } catch { /* silent */ }
    setCreatingChallenge(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email, challengeTitle, challengeTopic, challengeRounds])

  const handleSlashChallenge = useCallback((topic: string) => {
    if (!channelId) return
    if (topic) {
      // Quick create — topic provided, skip modal
      setChallengeTitle(topic)
      setChallengeTopic(topic)
      setChallengeRounds(5)
      // Auto-create
      void (async () => {
        try {
          const res = await fetch('/api/commons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
            body: JSON.stringify({
              channelId,
              type: 'CHALLENGE',
              title: topic,
              config: { rounds: 5, topic },
            }),
          })
          if (res.ok) {
            const room = await res.json()
            setActiveLiveRoomId(room.id)
            window.dispatchEvent(new CustomEvent('messages:sent'))
          }
        } catch { /* silent */ }
      })()
    } else {
      // No topic — open the creator modal
      setShowChallengeCreator(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  const handleSlashStudy = useCallback((topic: string) => {
    if (!channelId) return
    const title = topic || 'Study Session'
    void (async () => {
      try {
        const res = await fetch('/api/commons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({
            channelId,
            type: 'STUDY',
            title,
            config: { focusMinutes: 25, breakMinutes: 5, totalCycles: 4, topic: topic || undefined },
          }),
        })
        if (res.ok) {
          const room = await res.json()
          setActiveLiveRoomId(room.id)
          setActiveLiveRoomType('STUDY')
          window.dispatchEvent(new CustomEvent('messages:sent'))
        }
      } catch { /* silent */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  const handleSlashWatch = useCallback((topic: string) => {
    if (!channelId) return
    const title = topic || 'Watch Party'
    void (async () => {
      try {
        const res = await fetch('/api/commons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({
            channelId,
            type: 'WATCH',
            title,
            config: { eventTitle: title, eventType: 'other', topic: topic || undefined },
          }),
        })
        if (res.ok) {
          const room = await res.json()
          setActiveLiveRoomId(room.id)
          setActiveLiveRoomType('WATCH')
          window.dispatchEvent(new CustomEvent('messages:sent'))
        }
      } catch { /* silent */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  const handleSlashTeachback = useCallback((topic: string) => {
    if (!channelId) return
    const title = topic || 'Teach-Back'
    void (async () => {
      try {
        const res = await fetch('/api/commons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({
            channelId,
            type: 'TEACHBACK',
            title,
            config: { topic: topic || 'General Review', teachTimeMs: 120000, rateTimeMs: 30000 },
          }),
        })
        if (res.ok) {
          const room = await res.json()
          setActiveLiveRoomId(room.id)
          setActiveLiveRoomType('TEACHBACK')
          window.dispatchEvent(new CustomEvent('messages:sent'))
        }
      } catch { /* silent */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  const handleSlashSimulation = useCallback((topic: string) => {
    if (!channelId) return
    const title = topic || 'Simulation'
    void (async () => {
      try {
        const res = await fetch('/api/commons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({
            channelId,
            type: 'SIMULATION',
            title,
            config: { topic: topic || undefined },
          }),
        })
        if (res.ok) {
          const room = await res.json()
          setActiveLiveRoomId(room.id)
          setActiveLiveRoomType('SIMULATION')
          window.dispatchEvent(new CustomEvent('messages:sent'))
        }
      } catch { /* silent */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUser.email])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header — 3 visible icons + overflow */}
      {threadInfo && (
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-extrabold text-gray-900 truncate">{threadInfo.groupName}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Search messages"
              title="Search messages"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Group settings"
              title="Group settings"
            >
              <Settings className="size-4" />
            </button>
            {/* Overflow menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="More actions"
                title="More actions"
              >
                <MoreVertical className="size-4" />
              </button>
              {overflowMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setOverflowMenuOpen(false); setShowChallengeCreator(true) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Swords className="size-4 shrink-0 text-uk-blue" />
                    Start Challenge
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverflowMenuOpen(false); handleSlashStudy('') }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <BookOpen className="size-4 shrink-0 text-slate-600" />
                    Start Study Session
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverflowMenuOpen(false); handleSlashWatch('') }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <MonitorPlay className="size-4 shrink-0 text-gray-600" />
                    Start Watch Party
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverflowMenuOpen(false); handleSlashTeachback('') }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <GraduationCap className="size-4 shrink-0 text-indigo-600" />
                    Start Teach-Back
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => { setOverflowMenuOpen(false); handleOpenPinnedPanel() }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Pin className="size-4 shrink-0 text-gray-500" />
                    Pinned Messages
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thread search bar */}
      {searchOpen && (
        <div className="relative border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-uk-blue focus-within:ring-1 focus-within:ring-uk-blue">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="min-w-0 flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              autoFocus
            />
            {searchLoading && <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />}
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }}
              className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close search"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              <ul className="py-1">
                {searchResults.map((r) => {
                  // Highlight matching text
                  const idx = r.content.toLowerCase().indexOf(searchQuery.trim().toLowerCase())
                  const before = idx >= 0 ? r.content.slice(0, idx) : r.content
                  const match = idx >= 0 ? r.content.slice(idx, idx + searchQuery.trim().length) : ''
                  const after = idx >= 0 ? r.content.slice(idx + searchQuery.trim().length) : ''

                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => handleScrollToMessage(r.id)}
                        className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-uk-blue">{r.author.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-gray-700">
                          {idx >= 0 ? (
                            <>
                              {before.length > 40 ? '…' + before.slice(-40) : before}
                              <mark className="rounded bg-yellow-200 px-0.5">{match}</mark>
                              {after.length > 60 ? after.slice(0, 60) + '…' : after}
                            </>
                          ) : (
                            r.content.length > 100 ? r.content.slice(0, 100) + '…' : r.content
                          )}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
            <div className="absolute left-4 right-4 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400 shadow-lg">
              No messages found
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.authorId === currentUser.id
              const isOptimistic = msg._optimistic && !msg._failed
              const isFailed = msg._failed
              const isDeleted = !!msg.deletedAt
              const isEditing = editingMessageId === msg.id

              // Commons activity card
              if (msg.messageType === 'live_room' && msg.liveRoom) {
                return (
                  <div key={msg._clientId ?? msg.id} className="flex justify-center py-2">
                    <CommonsCard
                      room={{
                        ...msg.liveRoom,
                        hostName: msg.author.name,
                        totalRounds: (msg.liveRoom.config as Record<string, unknown>)?.rounds as number ?? 5,
                      }}
                      onJoin={handleJoinLiveRoom}
                      onOpen={handleOpenLiveRoom}
                      onPlayAgain={handleSlashChallenge}
                    />
                  </div>
                )
              }

              // System message (game results, etc.)
              if (msg.messageType === 'system') {
                return (
                  <div key={msg._clientId ?? msg.id} className="flex justify-center py-1">
                    <div className="max-w-md rounded-xl bg-gray-50 px-4 py-2 text-center text-xs whitespace-pre-wrap text-gray-600">
                      {msg.content}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg._clientId ?? msg.id}
                  data-message-id={msg.id}
                  className={`group/msg flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                    highlightedMsgId === msg.id ? 'animate-highlight-fade rounded-xl' : ''
                  }`}
                  style={highlightedMsgId === msg.id ? { backgroundColor: 'rgba(253, 224, 71, 0.4)' } : undefined}
                >
                  <div className={`flex max-w-[75%] gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {!isOwn && <Avatar author={msg.author} />}

                    <div>
                      {/* Reply quote */}
                      {msg.replyTo && (
                        <div className="mb-1 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs">
                          <span className="font-semibold text-uk-blue">
                            {msg.replyTo.author.name}
                          </span>
                          <p className="truncate text-gray-500">
                            {truncate(msg.replyTo.content, 80)}
                          </p>
                        </div>
                      )}

                      {/* Bubble + overflow menu wrapper */}
                      <div className="relative">
                        {isEditing ? (
                          /* Inline edit mode */
                          <div className="rounded-2xl border-2 border-uk-blue bg-white px-3.5 py-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full resize-none border-none bg-transparent text-sm text-gray-900 outline-none"
                              rows={2}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  void handleSaveEdit(msg.id)
                                }
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                            />
                            <div className="mt-1 flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
                              >
                                <X className="size-3" />
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(msg.id)}
                                disabled={!editContent.trim()}
                                className="inline-flex items-center gap-1 rounded bg-uk-blue px-2 py-0.5 text-xs text-white transition-opacity disabled:opacity-40"
                              >
                                <Check className="size-3" />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal bubble */
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm ${
                              isFailed
                                ? 'border-2 border-red-300 bg-red-50 text-gray-900'
                                : isDeleted
                                  ? 'bg-gray-50 text-gray-400 italic'
                                  : isOwn
                                    ? 'bg-uk-blue text-white'
                                    : 'bg-gray-100 text-gray-900'
                            } ${isOptimistic ? 'opacity-60' : ''}`}
                          >
                            {!isOwn && !isDeleted && (
                              <div className="mb-0.5 text-xs font-semibold text-uk-blue">
                                {msg.author.name}
                              </div>
                            )}
                            {msg.pinnedAt && !isDeleted && (
                              <div className={`mb-1 flex items-center gap-1 text-[10px] ${isOwn ? 'text-white/70' : 'text-amber-600'}`}>
                                <Pin className="size-3" />
                                <span>Pinned</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            {/* Attachment display */}
                            {msg.attachmentUrl && msg.attachmentType && !isDeleted && (
                              msg.attachmentType.startsWith('image/') ? (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt={msg.attachmentName ?? 'Image'}
                                    className="max-w-[300px] rounded-lg"
                                    loading="lazy"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                    isOwn
                                      ? 'border-white/30 text-white/90 hover:bg-white/10'
                                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <FileText className="size-4 shrink-0" />
                                  <span className="min-w-0 truncate font-medium">{msg.attachmentName ?? 'File'}</span>
                                  <Download className="size-3 shrink-0" />
                                </a>
                              )
                            )}
                          </div>
                        )}

                        {/* Emoji picker popup */}
                        {emojiPickerMsgId === msg.id && (
                          <div
                            className={`absolute z-20 ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 flex gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => void handleToggleReaction(msg.id, emoji)}
                                className="rounded-lg p-1 text-lg transition-colors hover:bg-gray-100"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reaction pills */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : ''}`}>
                            {msg.reactions.map((r) => (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={() => void handleToggleReaction(msg.id, r.emoji)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                                  r.reacted
                                    ? 'border-uk-blue bg-blue-50 text-uk-blue'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span className="font-medium">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Overflow menu trigger — hidden on optimistic/failed/deleted/editing */}
                        {!isOptimistic && !isFailed && !isDeleted && !isEditing && (
                          <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} hidden px-1 group-hover/msg:block`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(menuOpenId === msg.id ? null : msg.id)
                              }}
                              className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              aria-label="Message actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>

                            {/* Dropdown menu */}
                            {menuOpenId === msg.id && (
                              <div
                                className={`absolute top-6 z-10 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
                                  isOwn ? 'left-0' : 'right-0'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuOpenId(null)
                                    setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  <SmilePlus className="size-3" />
                                  React
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(msg.content)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  <Copy className="size-3" />
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleTogglePin(msg.id)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  {msg.pinnedAt ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                                  {msg.pinnedAt ? 'Unpin' : 'Pin'}
                                </button>
                                {isOwn && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(msg)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    <Pencil className="size-3" />
                                    Edit
                                  </button>
                                )}
                                {isOwn && (
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(msg.id)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    <Trash2 className="size-3" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meta row */}
                      <div
                        className={`mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 ${
                          isOwn ? 'justify-end' : ''
                        }`}
                      >
                        {isFailed ? (
                          <>
                            <span className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="size-3" />
                              Failed to send
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetry(msg)}
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-red-500 transition-colors hover:bg-red-50"
                            >
                              <RefreshCw className="size-3" />
                              <span>Retry</span>
                            </button>
                          </>
                        ) : isOptimistic ? (
                          <span className="text-gray-300">Sending…</span>
                        ) : isDeleted ? (
                          <span>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <>
                            <span>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                            {msg.editedAt && (
                              <span className="text-gray-300">(edited)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReply(msg)}
                              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              aria-label={`Reply to ${msg.author.name}`}
                            >
                              <Reply className="size-3" />
                              <span>Reply</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sandy suggestion banner */}
      {sandySuggestion && (
        <div className="flex items-center gap-3 border-t border-amber-100 bg-amber-50 px-4 py-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-uk-blue text-xs font-bold text-white">S</div>
          <p className="flex-1 text-xs text-gray-700">
            <span className="font-semibold text-uk-blue">Sandy: </span>
            {sandySuggestion.message}
          </p>
          <button
            type="button"
            onClick={() => {
              handleSlashChallenge(sandySuggestion.topic)
              setSandySuggestion(null)
            }}
            className="shrink-0 rounded-lg bg-uk-blue px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Let&apos;s go!
          </button>
          <button
            type="button"
            onClick={() => setSandySuggestion(null)}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-1.5 text-xs text-gray-500">
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
          </span>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0].name} is typing…`
              : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing…`
                : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing…`}
          </span>
        </div>
      )}

      {/* Input */}
      {channelId && (
        <MessageInput
          groupId={groupId}
          channelId={channelId}
          replyTo={replyTo}
          onClearReply={handleClearReply}
          onOptimisticSend={handleOptimisticSend}
          onMessageConfirmed={handleMessageConfirmed}
          onMessageFailed={handleMessageFailed}
          onSlashChallenge={handleSlashChallenge}
          onSlashStudy={handleSlashStudy}
          onSlashWatch={handleSlashWatch}
          onSlashTeachback={handleSlashTeachback}
          onSlashSimulation={handleSlashSimulation}
        />
      )}

      {/* Group settings modal */}
      {threadInfo && (
        <GroupSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          groupId={groupId}
          groupName={threadInfo.groupName}
          onGroupUpdated={handleGroupUpdated}
          notifLevel={notifLevel}
          onNotifLevelChange={(level) => void handleSetNotifLevel(level)}
        />
      )}

      {/* Challenge Room creator modal */}
      {showChallengeCreator && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowChallengeCreator(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <Swords className="size-5 text-uk-blue" />
              <h3 className="text-lg font-extrabold text-gray-900">Start a Challenge</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
                <input
                  type="text"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="e.g. BIO 152 — Chapter 7 Review"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-uk-blue focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Topic (optional)</label>
                <input
                  type="text"
                  value={challengeTopic}
                  onChange={(e) => setChallengeTopic(e.target.value)}
                  placeholder="e.g. Cellular respiration, mitosis"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-uk-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Rounds: {challengeRounds}</label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={challengeRounds}
                  onChange={(e) => setChallengeRounds(parseInt(e.target.value))}
                  className="w-full accent-uk-blue"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>3</span>
                  <span>10</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowChallengeCreator(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateChallenge()}
                  disabled={!challengeTitle.trim() || creatingChallenge}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-uk-blue px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {creatingChallenge && <Loader2 className="size-4 animate-spin" />}
                  Create & Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commons overlays */}
      {activeLiveRoomId && activeLiveRoomType && (
        <CommonsOverlayRouter
          type={activeLiveRoomType}
          roomId={activeLiveRoomId}
          onClose={() => setActiveLiveRoomId(null)}
        />
      )}

      {/* Pinned messages panel */}
      {pinnedPanelOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-amber-600" />
              <h3 className="text-sm font-extrabold text-gray-900">Pinned Messages</h3>
            </div>
            <button
              type="button"
              onClick={() => setPinnedPanelOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close pinned messages"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {pinnedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No pinned messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {pinnedMessages.map((pm) => (
                  <div
                    key={pm.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-uk-blue text-[9px] font-semibold text-white">
                          {pm.author.avatarUrl ? (
                            <Image src={pm.author.avatarUrl} alt={pm.author.name} width={32} height={32} className="size-full rounded-full object-cover" />
                          ) : (
                            getInitials(pm.author.name)
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{pm.author.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(pm.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleTogglePin(pm.id)}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                        aria-label="Unpin message"
                        title="Unpin"
                      >
                        <PinOff className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedPanelOpen(false)
                        handleScrollToMessage(pm.id)
                      }}
                      className="w-full text-left text-sm text-gray-700 transition-colors hover:text-gray-900"
                    >
                      <p className="line-clamp-3 whitespace-pre-wrap break-words">{pm.content}</p>
                    </button>
                    {pm.pinnedBy && (
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        Pinned by {pm.pinnedBy.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
