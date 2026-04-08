'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Send, MessageCircle, ChevronDown, ChevronUp, Bell } from 'lucide-react'

interface GameChatMessage {
  id: string
  content: string
  createdAt: string
  isAiHost: boolean
  user: { id: string; name: string } | null
  replies: GameChatMessage[]
}

export interface GameChatProps {
  contestId: string
  userEmail: string
  currentUserId: string
  contestStatus?: 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'
}

const QUICK_REACTIONS = [
  'What an upset! 🔥',
  'Called it! ✅',
  'My bracket is busted 💀',
  "Let's go! 🎉",
  'Tough loss 😬',
]

// ─── Module-level sub-components ──────────────────────────────────────────────

interface AiHostBubbleProps {
  content: string
  createdAt: string
}

function AiHostBubble({ content, createdAt }: AiHostBubbleProps) {
  return (
    <div className="border-l-4 border-blue-400 pl-3 py-1.5 bg-blue-50 rounded-r-lg">
      <p className="text-xs text-blue-500 font-semibold mb-0.5">🏀 March Madness Host</p>
      <p className="text-sm text-gray-800 italic leading-snug">{content}</p>
      <p className="text-xs text-gray-400 mt-1">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </p>
    </div>
  )
}

interface ReplyFormProps {
  msgId: string
  contestId: string
  userEmail: string
  onReplySent: () => void
}

function ReplyForm({ msgId, contestId, userEmail, onReplySent }: ReplyFormProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(
        `/api/bracket/contests/${contestId}/messages/${msgId}/reply`,
        {
          method: 'POST',
          headers: {
            'x-demo-user-email': userEmail,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: text.trim() }),
        }
      )
      if (res.ok) {
        setText('')
        onReplySent()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1.5 mt-1.5">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply..."
        maxLength={280}
        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#0033A0] transition-colors"
      />
      <button
        type="submit"
        disabled={sending || !text.trim()}
        className="p-1.5 bg-[#0033A0] text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        <Send className="size-3" />
      </button>
    </form>
  )
}

interface ReplyThreadProps {
  replies: GameChatMessage[]
  msgId: string
  contestId: string
  userEmail: string
  currentUserId: string
  onReplySent: () => void
}

function ReplyThread({
  replies,
  msgId,
  contestId,
  userEmail,
  currentUserId,
  onReplySent,
}: ReplyThreadProps) {
  const [expanded, setExpanded] = useState(false)

  if (replies.length === 0 && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-gray-400 hover:text-[#0033A0] mt-0.5 transition-colors"
      >
        Reply
      </button>
    )
  }

  return (
    <div className="mt-1">
      {replies.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-[#0033A0] font-semibold hover:underline"
        >
          {expanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </button>
      )}
      {expanded && (
        <div className="mt-1.5 pl-2 border-l-2 border-gray-100 space-y-2">
          {replies.map((reply) => {
            const isReplyYou = reply.user?.id === currentUserId
            return (
              <div
                key={reply.id}
                className={`text-xs flex flex-col ${isReplyYou ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex items-baseline gap-1.5 ${isReplyYou ? 'flex-row-reverse' : ''}`}
                >
                  <span className="font-semibold text-gray-700">
                    {reply.user?.name ?? 'Anonymous'}
                  </span>
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-gray-700 mt-0.5 leading-snug ${isReplyYou ? 'text-right' : ''}`}>
                  {reply.content}
                </p>
              </div>
            )
          })}
          <ReplyForm
            msgId={msgId}
            contestId={contestId}
            userEmail={userEmail}
            onReplySent={onReplySent}
          />
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  msg: GameChatMessage
  isYou: boolean
  contestId: string
  userEmail: string
  currentUserId: string
  onReplySent: () => void
}

function MessageBubble({
  msg,
  isYou,
  contestId,
  userEmail,
  currentUserId,
  onReplySent,
}: MessageBubbleProps) {
  return (
    <div className={`text-sm flex flex-col ${isYou ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-baseline gap-1.5 ${isYou ? 'flex-row-reverse' : ''}`}>
        <span className="font-semibold text-gray-800 text-xs">
          {msg.user?.name ?? 'Anonymous'}
        </span>
        <span className="text-gray-400 text-xs">
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className={`text-gray-700 mt-0.5 leading-snug ${isYou ? 'text-right' : ''}`}>
        {msg.content}
      </p>
      <ReplyThread
        replies={msg.replies}
        msgId={msg.id}
        contestId={contestId}
        userEmail={userEmail}
        currentUserId={currentUserId}
        onReplySent={onReplySent}
      />
    </div>
  )
}

// ─── Main GameChat component ───────────────────────────────────────────────────

export default function GameChat({ contestId, userEmail, currentUserId, contestStatus }: GameChatProps) {
  const [messages, setMessages] = useState<GameChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const seenCount = useRef<number>(0)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/messages`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const d = await res.json()
        const newMessages: GameChatMessage[] = d.messages ?? []
        setMessages(newMessages)
        if (newMessages.length > seenCount.current) {
          const bottomEl = chatBottomRef.current
          const isAtBottom = bottomEl
            ? bottomEl.getBoundingClientRect().top < window.innerHeight
            : false
          if (isAtBottom) {
            seenCount.current = newMessages.length
            setUnread(0)
          } else {
            setUnread(newMessages.length - seenCount.current)
          }
        }
      }
    } catch {
      // ignore poll failures silently
    }
  }, [contestId, userEmail])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 10_000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/messages`, {
        method: 'POST',
        headers: {
          'x-demo-user-email': userEmail,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        await fetchMessages()
        setUnread(0)
      }
    } finally {
      setSending(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return
    await sendMessage(newMessage)
    setNewMessage('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white flex flex-col" style={{ height: '480px' }}>
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
        {unread > 0 ? (
          <Bell className="size-4 text-gray-400" />
        ) : (
          <MessageCircle className="size-4 text-gray-400" />
        )}
        <h2 className="font-extrabold text-gray-900 text-sm">Contest Chat</h2>
        {unread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
            {unread}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No messages yet. Say something!</p>
        ) : (
          messages.map((msg) =>
            msg.isAiHost ? (
              <AiHostBubble key={msg.id} content={msg.content} createdAt={msg.createdAt} />
            ) : (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isYou={msg.user?.id === currentUserId}
                contestId={contestId}
                userEmail={userEmail}
                currentUserId={currentUserId}
                onReplySent={fetchMessages}
              />
            )
          )
        )}
        <div ref={chatBottomRef} />
      </div>

      {(contestStatus === 'IN_PROGRESS' || contestStatus === 'LOCKED') && (
        <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-t border-gray-100">
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction}
              type="button"
              onClick={() => sendMessage(reaction)}
              disabled={sending}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
            >
              {reaction}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="px-3 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0"
      >
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          rows={1}
          maxLength={280}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="p-2 bg-[#0033A0] text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors self-end"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
