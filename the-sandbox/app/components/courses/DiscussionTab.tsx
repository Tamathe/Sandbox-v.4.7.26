'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DynamicMarkdown from '../DynamicMarkdown'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  Loader2,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Reply,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { courseHeaders, readJson, ROLE_BADGE_COLORS } from './course-utils'
import type { DiscussionSuggestion, DiscussionThreadDetail, DiscussionThreadSummary } from './course-types'

interface DiscussionTabProps {
  courseId: string
  courseCode: string
  canManage: boolean
  userEmail: string
  userId: string
}

export default function DiscussionTab({
  courseId,
  courseCode,
  canManage,
  userEmail,
  userId,
}: DiscussionTabProps) {
  const [threads, setThreads] = useState<DiscussionThreadSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<DiscussionThreadDetail | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)
  const [newThreadForm, setNewThreadForm] = useState({ title: '', content: '' })
  const [creatingThread, setCreatingThread] = useState(false)
  const [replyTarget, setReplyTarget] = useState<'thread' | string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [postingReplyTarget, setPostingReplyTarget] = useState<string | null>(null)
  const [moderatingThreadId, setModeratingThreadId] = useState<string | null>(null)

  // Discussion prompt suggestions
  const [suggestions, setSuggestions] = useState<DiscussionSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Unread tracking
  const [hasUnread, setHasUnread] = useState(false)
  const unreadKey = `sandbox-discussion-read-${courseId}`

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await readJson<DiscussionThreadSummary[]>(`/api/courses/${courseId}/discussions`, {
        headers: courseHeaders(userEmail),
      })
      setThreads(data)

      // Check for unread
      try {
        const lastRead = Number(localStorage.getItem(unreadKey) ?? 0)
        const hasNew = data.some((t) => new Date(t.updatedAt).getTime() > lastRead)
        setHasUnread(hasNew)
      } catch { /* ignore */ }

      if (selectedThreadId && !data.some((t) => t.id === selectedThreadId)) {
        setSelectedThread(null)
        setSelectedThreadId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discussions')
    } finally {
      setLoading(false)
    }
  }, [courseId, userEmail, selectedThreadId, unreadKey])

  useEffect(() => {
    void fetchThreads()
    // Mark as read when this tab is opened
    try { localStorage.setItem(unreadKey, String(Date.now())) } catch { /* ignore */ }
    setHasUnread(false)
  }, [fetchThreads, unreadKey])

  async function fetchThreadDetail(threadId: string, showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const payload = await readJson<{ thread: DiscussionThreadDetail }>(
        `/api/courses/${courseId}/discussions/${threadId}`,
        { headers: courseHeaders(userEmail) }
      )
      setSelectedThreadId(threadId)
      setSelectedThread(payload.thread)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!newThreadForm.title.trim() || !newThreadForm.content.trim()) {
      setError('Thread title and content are required.')
      return
    }
    setCreatingThread(true)
    try {
      const thread = await readJson<DiscussionThreadSummary>(`/api/courses/${courseId}/discussions`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ title: newThreadForm.title.trim(), content: newThreadForm.content.trim() }),
      })
      setNewThreadForm({ title: '', content: '' })
      setShowNewThreadForm(false)
      await fetchThreads()
      await fetchThreadDetail(thread.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread')
    } finally {
      setCreatingThread(false)
    }
  }

  async function handleReplySubmit(postId?: string) {
    if (!selectedThreadId) return
    const key = postId ?? 'thread'
    const content = replyDrafts[key]?.trim()
    if (!content) return

    setPostingReplyTarget(key)
    try {
      if (postId) {
        await readJson(`/api/courses/${courseId}/discussions/${selectedThreadId}/posts/${postId}`, {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ content }),
        })
      } else {
        await readJson(`/api/courses/${courseId}/discussions/${selectedThreadId}/posts`, {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ content }),
        })
      }
      setReplyDrafts((prev) => ({ ...prev, [key]: '' }))
      setReplyTarget(null)
      await fetchThreads()
      await fetchThreadDetail(selectedThreadId, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply')
    } finally {
      setPostingReplyTarget(null)
    }
  }

  async function handleToggleThreadState(
    threadId: string,
    updates: { isPinned?: boolean; isLocked?: boolean }
  ) {
    setModeratingThreadId(threadId)
    try {
      const updatedThread = await readJson<DiscussionThreadSummary>(
        `/api/courses/${courseId}/discussions/${threadId}`,
        {
          method: 'PATCH',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify(updates),
        }
      )
      setThreads((prev) =>
        [...prev.map((t) =>
          t.id === updatedThread.id
            ? { ...t, isPinned: updatedThread.isPinned, isLocked: updatedThread.isLocked }
            : t
        )].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
      )
      setSelectedThread((prev) =>
        prev && prev.id === updatedThread.id
          ? { ...prev, isPinned: updatedThread.isPinned, isLocked: updatedThread.isLocked }
          : prev
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thread')
    } finally {
      setModeratingThreadId(null)
    }
  }

  async function handleGetSuggestions() {
    setLoadingSuggestions(true)
    try {
      const data = await readJson<{ suggestions: DiscussionSuggestion[] }>(
        `/api/courses/${courseId}/discussions/suggest`,
        { method: 'POST', headers: courseHeaders(userEmail) }
      )
      setSuggestions(data.suggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function useSuggestion(suggestion: DiscussionSuggestion) {
    setNewThreadForm({ title: suggestion.title, content: suggestion.content })
    setShowNewThreadForm(true)
    setSuggestions([])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Discussion for {courseCode}</h3>
          <p className="text-sm text-gray-500">
            Ask questions, share insights, and keep course conversations in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleGetSuggestions()}
            disabled={loadingSuggestions}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-100 disabled:opacity-60"
          >
            {loadingSuggestions ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Get prompt ideas
          </button>
          <button
            type="button"
            onClick={() => setShowNewThreadForm((p) => !p)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
          >
            <Plus className="size-4" />
            New Thread
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)}><X className="size-4" /></button>
        </div>
      )}

      {/* AI prompt suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0033A0]">
              <Sparkles className="size-4" />
              Prompt ideas for {courseCode}
            </div>
            <button type="button" onClick={() => setSuggestions([])} className="text-gray-400 hover:text-gray-600">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, idx) => (
              <div key={idx} className="rounded-2xl border border-blue-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-1 text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-600">{s.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => useSuggestion(s)}
                    className="whitespace-nowrap rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                  >
                    Use this prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New thread form */}
      {showNewThreadForm && (
        <form onSubmit={handleCreateThread} className="rounded-3xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Thread Title
            </label>
            <input
              value={newThreadForm.title}
              onChange={(e) => setNewThreadForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="What should we discuss?"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Content
            </label>
            <textarea
              value={newThreadForm.content}
              onChange={(e) => setNewThreadForm((p) => ({ ...p, content: e.target.value }))}
              rows={5}
              placeholder="Share a question, prompt, or observation for the course."
              className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowNewThreadForm(false); setNewThreadForm({ title: '', content: '' }) }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingThread}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
            >
              {creatingThread && <Loader2 className="size-4 animate-spin" />}
              Post Thread
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading discussions
        </div>
      ) : selectedThread ? (
        // Thread detail view
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => { setSelectedThread(null); setSelectedThreadId(null); setReplyTarget(null) }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#002580]"
          >
            <ArrowLeft className="size-4" />
            Back to thread list
          </button>

          <div className={`rounded-3xl border p-5 ${selectedThread.isPinned ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-semibold text-gray-900">{selectedThread.title}</h4>
                  {selectedThread.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                      <Pin className="size-3" /> Pinned
                    </span>
                  )}
                  {selectedThread.isLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      <Lock className="size-3" /> Locked
                    </span>
                  )}
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{selectedThread.author.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[selectedThread.author.role] || 'bg-gray-100 text-gray-600'}`}>
                    {selectedThread.author.role}
                  </span>
                  <span title={new Date(selectedThread.updatedAt).toLocaleString()}>{formatDistanceToNow(new Date(selectedThread.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleThreadState(selectedThread.id, { isPinned: !selectedThread.isPinned })}
                    disabled={moderatingThreadId === selectedThread.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Pin className="size-3.5" />
                    {selectedThread.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleThreadState(selectedThread.id, { isLocked: !selectedThread.isLocked })}
                    disabled={moderatingThreadId === selectedThread.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Lock className="size-3.5" />
                    {selectedThread.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="prose prose-sm max-w-none text-gray-700">
                <DynamicMarkdown>{selectedThread.content}</DynamicMarkdown>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={selectedThread.isLocked && !canManage}
                onClick={() => setReplyTarget((p) => p === 'thread' ? null : 'thread')}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Reply className="size-3.5" />
                Reply
              </button>

              {replyTarget === 'thread' && (
                <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <textarea
                    value={replyDrafts.thread ?? ''}
                    onChange={(e) => setReplyDrafts((p) => ({ ...p, thread: e.target.value }))}
                    rows={3}
                    placeholder="Add a reply to this thread…"
                    className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setReplyTarget(null)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={postingReplyTarget === 'thread' || !replyDrafts.thread?.trim()}
                      onClick={() => handleReplySubmit()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                    >
                      {postingReplyTarget === 'thread' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Post reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {selectedThread.posts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                <MessageSquare className="mx-auto mb-3 size-10 text-gray-200" />
                <p className="text-sm font-semibold text-gray-600">No replies yet.</p>
                <p className="mt-1 text-sm text-gray-400">Start the conversation by adding the first reply.</p>
              </div>
            ) : (
              selectedThread.posts.map((post) => (
                <div key={post.id} className="rounded-3xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-sm font-semibold text-white">
                      {post.author.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{post.author.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[post.author.role] || 'bg-gray-100 text-gray-600'}`}>
                          {post.author.role}
                        </span>
                        <span className="text-xs text-gray-400" title={new Date(post.createdAt).toLocaleString()}>
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <DynamicMarkdown>{post.content}</DynamicMarkdown>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={selectedThread.isLocked && !canManage}
                          onClick={() => setReplyTarget((p) => p === post.id ? null : post.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-[#0033A0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Reply className="size-3.5" />
                          Reply
                        </button>
                      </div>

                      {replyTarget === post.id && (
                        <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <textarea
                            value={replyDrafts[post.id] ?? ''}
                            onChange={(e) => setReplyDrafts((p) => ({ ...p, [post.id]: e.target.value }))}
                            rows={3}
                            placeholder={`Reply to ${post.author.name}…`}
                            className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setReplyTarget(null)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={postingReplyTarget === post.id || !replyDrafts[post.id]?.trim()}
                              onClick={() => handleReplySubmit(post.id)}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                            >
                              {postingReplyTarget === post.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                              Post reply
                            </button>
                          </div>
                        </div>
                      )}

                      {post.replies.length > 0 && (
                        <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                          {post.replies.map((reply) => (
                            <div key={reply.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{reply.author.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[reply.author.role] || 'bg-gray-100 text-gray-600'}`}>
                                  {reply.author.role}
                                </span>
                                <span className="text-xs text-gray-400" title={new Date(reply.createdAt).toLocaleString()}>
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="prose prose-sm max-w-none text-sm text-gray-700">
                                <DynamicMarkdown>{reply.content}</DynamicMarkdown>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : threads.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="mx-auto mb-3 size-10 text-gray-200" />
          <h3 className="mb-1 text-sm font-semibold text-gray-600">No discussions yet</h3>
          <p className="text-xs text-gray-400">Be the first to start a conversation.</p>
        </div>
      ) : (
        // Thread list
        <div className="space-y-4">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`rounded-3xl border p-5 transition-colors ${
                thread.isPinned
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => fetchThreadDetail(thread.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900">{thread.title}</h4>
                    {thread.isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                        <Pin className="size-3" /> Pinned
                      </span>
                    )}
                    {thread.isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        <Lock className="size-3" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{thread.author.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[thread.author.role] || 'bg-gray-100 text-gray-600'}`}>
                      {thread.author.role}
                    </span>
                    <span title={new Date(thread.updatedAt).toLocaleString()}>{formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}</span>
                    <span>{thread._count.posts} post{thread._count.posts !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{thread.content}</p>
                </button>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleThreadState(thread.id, { isPinned: !thread.isPinned })}
                      disabled={moderatingThreadId === thread.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Pin className="size-3.5" />
                      {thread.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleThreadState(thread.id, { isLocked: !thread.isLocked })}
                      disabled={moderatingThreadId === thread.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Lock className="size-3.5" />
                      {thread.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Export the unread key helper so page.tsx can check it for the tab badge
export function getDiscussionUnreadKey(courseId: string) {
  return `sandbox-discussion-read-${courseId}`
}
