'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles, Wand2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../lib/auth-context'

interface DraftTool {
  id: string
  name: string
  shortDescription: string
  toolType: string
  updatedAt: string
  category: string
}

const toolTypeStyles: Record<string, string> = {
  CHATBOT: 'bg-violet-100 text-violet-700',
  STUDY_BUDDY: 'bg-teal-100 text-teal-700',
  EXTERNAL: 'bg-gray-100 text-gray-700',
  SIMULATION: 'bg-blue-100 text-blue-700',
  QUIZ: 'bg-green-100 text-green-700',
  AI_INTERVIEW: 'bg-pink-100 text-pink-700',
  DEBATE: 'bg-orange-100 text-orange-700',
}

export default function RefinerPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftTool[]>([])
  const [loading, setLoading] = useState(currentUser.role !== 'STUDENT')

  useEffect(() => {
    if (currentUser.role === 'STUDENT') return

    fetch(`/api/tools?published=false&creatorEmail=${encodeURIComponent(currentUser.email)}&sort=updated`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((response) => response.json())
      .then((data) => setDrafts(data.tools ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser.email, currentUser.role])

  if (currentUser.role === 'STUDENT') {
    router.replace('/build')
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Refiner</h1>
        <p className="mt-1 text-sm text-gray-500">Revisit your drafts before publishing — or hand them back to the AI for another pass.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
              <div className="mb-4 h-4 w-24 rounded bg-gray-200" />
              <div className="mb-2 h-6 w-2/3 rounded bg-gray-200" />
              <div className="mb-6 h-4 w-full rounded bg-gray-200" />
              <div className="h-10 rounded-xl bg-gray-200" />
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h2 className="mb-2 text-lg font-bold text-gray-900">No drafts yet</h2>
          <p className="mb-5 text-sm text-gray-500">Go to Builder to start one.</p>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
          >
            Open Builder
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => (
            <div key={draft.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${toolTypeStyles[draft.toolType] || 'bg-gray-100 text-gray-700'}`}>
                  {draft.toolType.replaceAll('_', ' ')}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                  {draft.category}
                </span>
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">{draft.name}</h2>
              <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-500">
                {draft.shortDescription}
              </p>
              <div className="mb-5 text-xs text-gray-400">
                Last modified {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/publish?edit=${draft.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  Continue Editing
                </Link>
                <Link
                  href={`/builder?prompt=${encodeURIComponent(`Refine my draft tool "${draft.name}": ${draft.shortDescription}. Improve the system prompt, welcome message, and learning objectives.`)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0033A0] px-4 py-2.5 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
                >
                  <Wand2 className="h-4 w-4" />
                  Refine with AI
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
