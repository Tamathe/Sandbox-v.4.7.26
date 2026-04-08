'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageSquare, Reply, Pin, Send, Loader2, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { CommentWithUser } from '../lib/types'
import { useAuth } from '../lib/auth-context'

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

interface CommentItemProps {
  comment: CommentWithUser
  toolId: string
  depth?: number
  onReply: (parentId: string, content: string) => Promise<void>
}

function CommentItem({ comment, depth = 0, onReply }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setReplyOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={depth > 0 ? 'border-l-2 border-gray-100 pl-4 mt-3' : ''}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
          {comment.user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            {comment.pinned && (
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1.5">
                <Pin className="w-3 h-3" />
                Pinned by creator
              </div>
            )}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{comment.user.name}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  roleBadgeColors[comment.user.role]
                }`}
              >
                {comment.user.role}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 ml-1">
            {depth < 2 && (
              <button
                onClick={() => setReplyOpen(!replyOpen)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0033A0] transition-colors"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showReplies ? 'rotate-180' : ''}`}
                />
                {comment.replies.length} repl{comment.replies.length !== 1 ? 'ies' : 'y'}
              </button>
            )}
          </div>

          {/* Reply form */}
          {replyOpen && (
            <form onSubmit={handleReplySubmit} className="mt-2 flex gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1.5 bg-[#0033A0] text-white rounded-lg text-xs font-medium hover:bg-[#002580] transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Nested replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  toolId={comment.toolId}
                  depth={depth + 1}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface CommentsSectionProps {
  toolId: string
}

export default function CommentsSection({ toolId }: CommentsSectionProps) {
  const { currentUser } = useAuth()
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sort, setSort] = useState<'newest' | 'oldest' | 'pinned'>('newest')

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/${toolId}/comments`, {
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, toolId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const sortedComments = useMemo(() => {
    return [...comments].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1

      const leftTime = new Date(left.createdAt).getTime()
      const rightTime = new Date(right.createdAt).getTime()

      if (sort === 'oldest') return leftTime - rightTime
      return rightTime - leftTime
    })
  }, [comments, sort])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (res.ok) {
        setNewComment('')
        await fetchComments()
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    const res = await fetch(`/api/tools/${toolId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ content, parentId }),
    })
    if (res.ok) {
      await fetchComments()
    }
  }

  return (
    <div>
      {/* New comment form */}
      <div className="mb-6">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this tool..."
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-5 py-2 bg-[#0033A0] text-white rounded-xl text-sm font-medium hover:bg-[#002580] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Sort controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: 'newest' as const, label: 'Newest' },
          { id: 'oldest' as const, label: 'Oldest' },
          { id: 'pinned' as const, label: 'Pinned First' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSort(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              sort === option.id
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No comments yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              toolId={toolId}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
