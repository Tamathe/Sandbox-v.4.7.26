'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { GraduationCap, Loader2, ChevronDown } from 'lucide-react'

interface ConceptOption {
  slug: string
  label: string
  mastery: number
}

interface TeachBackLauncherProps {
  courseId: string
  concepts: ConceptOption[]
}

export default function TeachBackLauncher({ courseId, concepts }: TeachBackLauncherProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [selectedSlug, setSelectedSlug] = useState<string>(concepts[0]?.slug ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleStart() {
    if (!selectedSlug) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/teach-back/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ courseId, conceptSlug: selectedSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start session')
      router.push(`/teach-back/${data.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (concepts.length === 0) return null

  return (
    <div className="border-2 rounded-2xl p-5 bg-white space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
          <GraduationCap className="size-5 text-amber-700" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">Teach It Back</h3>
          <p className="text-xs text-gray-500">Deepen mastery by teaching a concept to an AI student</p>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 border-2 rounded-xl text-sm text-gray-700 hover:border-gray-400 transition-colors"
        >
          <span>{selectedSlug ? selectedSlug.replace(/-/g, ' ') : 'Select a concept'}</span>
          <ChevronDown className={`size-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border-2 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {concepts.map((c) => (
              <button
                key={c.slug}
                onClick={() => { setSelectedSlug(c.slug); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
              >
                <span className="text-gray-800 capitalize">{c.label}</span>
                <span className="text-xs text-gray-400">{Math.round(c.mastery * 100)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleStart}
        disabled={loading || !selectedSlug}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GraduationCap className="size-4" />
        )}
        {loading ? 'Starting...' : 'Start Teaching'}
      </button>
    </div>
  )
}
