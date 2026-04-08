'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Hammer } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface ToolRequestItem {
  id: string
  title: string
  description: string
  category: string | null
  courseId: string | null
  course: { id: string; courseCode: string } | null
  requester: { id: string; name: string }
  status: string
  upvoteCount: number
  hasUpvoted: boolean
  createdAt: string
}

interface ToolRequestCardProps {
  request: ToolRequestItem
  showBuildLink?: boolean
}

export default function ToolRequestCard({ request, showBuildLink }: ToolRequestCardProps) {
  const { currentUser } = useAuth()
  const [upvoted, setUpvoted] = useState(request.hasUpvoted)
  const [count, setCount] = useState(request.upvoteCount)
  const [busy, setBusy] = useState(false)

  async function toggleUpvote() {
    setBusy(true)
    // Optimistic update
    const wasUpvoted = upvoted
    setUpvoted(!wasUpvoted)
    setCount((c) => (wasUpvoted ? c - 1 : c + 1))

    try {
      const res = await fetch(`/api/tool-requests/${request.id}/upvote`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setUpvoted(data.upvoted)
        setCount(data.count)
      } else {
        // Revert
        setUpvoted(wasUpvoted)
        setCount((c) => (wasUpvoted ? c + 1 : c - 1))
      }
    } catch {
      setUpvoted(wasUpvoted)
      setCount((c) => (wasUpvoted ? c + 1 : c - 1))
    } finally {
      setBusy(false)
    }
  }

  const buildPrompt = encodeURIComponent(`${request.title}: ${request.description}`)

  return (
    <div className="rounded-2xl border-2 border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex gap-3">
        {/* Upvote button */}
        <button
          onClick={toggleUpvote}
          disabled={busy}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border text-sm font-medium transition-colors flex-shrink-0 ${
            upvoted
              ? 'border-[#0033A0] bg-[#0033A0]/5 text-[#0033A0]'
              : 'border-gray-200 text-gray-500 hover:border-[#0033A0] hover:text-[#0033A0]'
          }`}
        >
          <ArrowUp className="size-4" />
          <span className="text-xs">{count}</span>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{request.title}</h4>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{request.description}</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-gray-400">by {request.requester.name}</span>
            {request.course && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0033A0]">
                {request.course.courseCode}
              </span>
            )}
            {request.category && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {request.category}
              </span>
            )}
          </div>
        </div>

        {/* Build This link (EDUCATOR/ADMIN only) */}
        {showBuildLink && (
          <Link
            href={`/build?prompt=${buildPrompt}`}
            className="flex items-center gap-1 self-start rounded-xl border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1.5 text-xs font-semibold text-[#0033A0] hover:bg-[#0033A0]/10 transition-colors flex-shrink-0"
          >
            <Hammer className="size-3" />
            Build This
          </Link>
        )}
      </div>
    </div>
  )
}
