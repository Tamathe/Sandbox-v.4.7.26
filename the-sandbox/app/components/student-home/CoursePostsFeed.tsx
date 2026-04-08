'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  MessageCircle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface CoursePost {
  id: string
  courseId: string
  courseCode: string
  courseTitle: string
  authorName: string
  title: string | null
  body: string
  type: string
  publishedAt: string
  isRead: boolean
}

const TYPE_ICONS: Record<string, typeof Megaphone> = {
  ANNOUNCEMENT: Megaphone,
  NUDGE: MessageCircle,
  REMINDER: Clock,
  RESOURCE: BookOpen,
}

const TYPE_COLORS: Record<string, string> = {
  ANNOUNCEMENT: 'bg-blue-100 text-blue-700',
  NUDGE: 'bg-amber-100 text-amber-700',
  REMINDER: 'bg-purple-100 text-purple-700',
  RESOURCE: 'bg-emerald-100 text-emerald-700',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CoursePostsFeed() {
  const { currentUser } = useAuth()
  const [posts, setPosts] = useState<CoursePost[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (!currentUser?.email) return
    fetch('/api/course-posts/feed?limit=10', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : { posts: [] })
      .then(data => setPosts(data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser?.email])

  const markRead = useCallback((postId: string, courseId: string) => {
    if (!currentUser?.email) return
    // Fire and forget
    fetch(`/api/courses/${courseId}/posts/${postId}/read`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    }).catch(() => {})

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isRead: true } : p))
  }, [currentUser?.email])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) return null

  const unreadCount = posts.filter(p => !p.isRead).length

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="mb-3 flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#0033A0]" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course Posts</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#0033A0] px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount} new</span>
          )}
        </div>
        {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {posts.map(post => {
            const Icon = TYPE_ICONS[post.type] || Megaphone
            const colorClass = TYPE_COLORS[post.type] || TYPE_COLORS.ANNOUNCEMENT
            const isUnread = !post.isRead

            return (
              <div
                key={post.id}
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  isUnread
                    ? 'border-[#0033A0]/20 bg-blue-50/40'
                    : 'border-gray-100 bg-white'
                }`}
                onMouseEnter={() => {
                  if (isUnread) {
                    markRead(post.id, post.courseId)
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0033A0]">{post.courseCode}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{post.authorName}</span>
                      <span className="ml-auto text-xs text-gray-400">{timeAgo(post.publishedAt)}</span>
                    </div>
                    {post.title && (
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                    )}
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{post.body}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
