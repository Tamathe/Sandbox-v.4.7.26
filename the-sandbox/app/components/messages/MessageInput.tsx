'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, Send, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ReplyTo {
  id: string
  authorName: string
  content: string
}

export interface OptimisticSendPayload {
  clientId: string
  content: string
  replyTo: ReplyTo | null
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: string
}

export interface MessageConfirmPayload {
  clientId: string
  serverId: string
  createdAt: string
}

export interface MessageFailPayload {
  clientId: string
}

interface MessageInputProps {
  groupId: string
  channelId: string
  replyTo: ReplyTo | null
  onClearReply: () => void
  onOptimisticSend: (payload: OptimisticSendPayload) => void
  onMessageConfirmed: (payload: MessageConfirmPayload) => void
  onMessageFailed: (payload: MessageFailPayload) => void
  onSlashChallenge?: (topic: string) => void
  onSlashStudy?: (topic: string) => void
  onSlashWatch?: (topic: string) => void
  onSlashTeachback?: (topic: string) => void
  onSlashSimulation?: (topic: string) => void
}

/**
 * Typing indicator hook — throttles POST calls to the typing API (once per 3s).
 * Stops reporting when input is empty or on send.
 */
export function useTypingIndicator(groupId: string, email: string) {
  const lastReportRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const signalTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastReportRef.current < 3000) return
    lastReportRef.current = now

    void fetch(`/api/messages/groups/${groupId}/typing`, {
      method: 'POST',
      headers: { 'x-demo-user-email': email },
    })

    // Auto-expire after 3s if no new signals
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      lastReportRef.current = 0
    }, 3000)
  }, [groupId, email])

  const stopTyping = useCallback(() => {
    lastReportRef.current = 0
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return { signalTyping, stopTyping }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt'

let clientIdCounter = 0

export default function MessageInput({
  groupId,
  channelId,
  replyTo,
  onClearReply,
  onOptimisticSend,
  onMessageConfirmed,
  onMessageFailed,
  onSlashChallenge,
  onSlashStudy,
  onSlashWatch,
  onSlashTeachback,
  onSlashSimulation,
}: MessageInputProps) {
  const { currentUser } = useAuth()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { signalTyping, stopTyping } = useTypingIndicator(groupId, currentUser.email)

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate size client-side
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.')
      return
    }
    setUploadError(null)
    setAttachment(file)
    // Reset file input so same file can be re-selected
    e.target.value = ''
  }, [])

  const handleRemoveAttachment = useCallback(() => {
    setAttachment(null)
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if ((!trimmed && !attachment) || sending) return

    // ── Slash commands ────────────────────────────────────────────
    const challengeMatch = trimmed.match(/^\/challenge\s*(.*)/i)
    if (challengeMatch && onSlashChallenge) {
      const topic = challengeMatch[1]?.trim() ?? ''
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSlashChallenge(topic)
      return
    }

    const studyMatch = trimmed.match(/^\/study\s*(.*)/i)
    if (studyMatch && onSlashStudy) {
      const topic = studyMatch[1]?.trim() ?? ''
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSlashStudy(topic)
      return
    }

    const watchMatch = trimmed.match(/^\/watch\s*(.*)/i)
    if (watchMatch && onSlashWatch) {
      const topic = watchMatch[1]?.trim() ?? ''
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSlashWatch(topic)
      return
    }

    const teachMatch = trimmed.match(/^\/teach(?:back)?\s*(.*)/i)
    if (teachMatch && onSlashTeachback) {
      const topic = teachMatch[1]?.trim() ?? ''
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSlashTeachback(topic)
      return
    }

    const simMatch = trimmed.match(/^\/simulation\s*(.*)/i)
    if (simMatch && onSlashSimulation) {
      const topic = simMatch[1]?.trim() ?? ''
      setContent('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSlashSimulation(topic)
      return
    }

    const messageContent = trimmed || (attachment ? `[${attachment.name}]` : '')
    const clientId = `optimistic-${++clientIdCounter}-${Date.now()}`

    setUploadError(null)
    setSending(true)
    stopTyping()

    let uploadedAttachment: { url: string; name: string; type: string } | null = null

    // Upload attachment first if present
    if (attachment) {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', attachment)
        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          headers: { 'x-demo-user-email': currentUser.email },
          body: formData,
        })
        if (uploadRes.ok) {
          uploadedAttachment = await uploadRes.json()
        } else {
          const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }))
          setUploadError(err.error || 'Upload failed')
          setSending(false)
          setUploading(false)
          return
        }
      } catch {
        setUploadError('File upload failed. Please try again.')
        setSending(false)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    // Optimistic: immediately show the message
    onOptimisticSend({
      clientId,
      content: messageContent,
      replyTo,
      attachmentUrl: uploadedAttachment?.url,
      attachmentName: uploadedAttachment?.name,
      attachmentType: uploadedAttachment?.type,
    })

    setContent('')
    setAttachment(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClearReply()

    try {
      const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          content: messageContent,
          ...(replyTo ? { replyToId: replyTo.id } : {}),
          ...(uploadedAttachment
            ? {
                attachmentUrl: uploadedAttachment.url,
                attachmentName: uploadedAttachment.name,
                attachmentType: uploadedAttachment.type,
              }
            : {}),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onMessageConfirmed({
          clientId,
          serverId: data.id,
          createdAt: data.createdAt,
        })
      } else {
        onMessageFailed({ clientId })
      }
    } catch {
      onMessageFailed({ clientId })
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [content, attachment, sending, groupId, currentUser.email, replyTo, onClearReply, onOptimisticSend, onMessageConfirmed, onMessageFailed, stopTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
      signalTyping()
      autoResize()
    },
    [signalTyping, autoResize],
  )

  const canSend = (content.trim().length > 0 || attachment !== null) && !sending
  const showSlashHint = content.startsWith('/') && content.length < 15

  const isImage = attachment?.type.startsWith('image/')

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Reply preview bar */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-[#0033A0]">
              Replying to {replyTo.authorName}
            </span>
            <p className="truncate text-xs text-gray-500">
              {truncate(replyTo.content, 100)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            aria-label="Cancel reply"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Attachment preview chip */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
          {isImage ? (
            <img
              src={URL.createObjectURL(attachment)}
              alt={attachment.name}
              className="size-8 rounded object-cover"
            />
          ) : (
            <FileText className="size-4 shrink-0 text-[#0033A0]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-700">
              {attachment.name}
            </p>
            <p className="text-[10px] text-gray-400">
              {(attachment.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            disabled={sending}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-40"
            aria-label="Remove attachment"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="shrink-0 rounded-lg p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Slash command hint */}
      {showSlashHint && (
        <div className="mb-1.5 space-y-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
          <div>
            <span className="font-semibold text-[#0033A0]">/challenge</span>
            <span className="ml-1 text-gray-400">Quiz battle</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">/study</span>
            <span className="ml-1 text-gray-400">Focus session (Pomodoro)</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">/watch</span>
            <span className="ml-1 text-gray-400">Watch party</span>
          </div>
          <div>
            <span className="font-semibold text-indigo-600">/teachback</span>
            <span className="ml-1 text-gray-400">Peer teaching circle</span>
          </div>
          <div>
            <span className="font-semibold text-emerald-600">/simulation</span>
            <span className="ml-1 text-gray-400">Simulation</span>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* Paperclip button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          aria-label="Attach file"
        >
          <Paperclip className="size-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
          disabled={sending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0033A0] text-white transition-opacity disabled:opacity-40"
          aria-label={uploading ? 'Uploading...' : 'Send message'}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  )
}
