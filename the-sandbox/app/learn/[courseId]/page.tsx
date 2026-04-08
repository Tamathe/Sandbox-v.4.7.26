'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import LessonRenderer from '../../components/learn/LessonRenderer'

type Lesson = {
  id: string
  title: string
  type: 'READING' | 'TOOL' | 'CHATBOT' | 'VIDEO' | 'ASSESSMENT'
  contentRef: unknown
  order: number
}

type Module = {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

type ProgressMap = Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>

export default function LearnerShellPage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId
  const [modules, setModules] = useState<Module[]>([])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Flat lesson list for navigation.
  const lessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules])
  const activeLesson = lessons.find((l) => l.id === activeId) ?? lessons[0] ?? null

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/courses/${courseId}/modules`)
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data: Module[] = await res.json()
      if (cancelled) return
      setModules(data)
      setActiveId((prev) => prev ?? data[0]?.lessons?.[0]?.id ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [courseId])

  // Mark IN_PROGRESS on view.
  useEffect(() => {
    if (!activeLesson) return
    fetch(`/api/lessons/${activeLesson.id}/progress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) setProgress((prev) => ({ ...prev, [activeLesson.id]: p.status }))
      })
      .catch(() => {})
  }, [activeLesson?.id])

  async function markComplete() {
    if (!activeLesson) return
    const res = await fetch(`/api/lessons/${activeLesson.id}/progress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    if (res.ok) {
      const p = await res.json()
      setProgress((prev) => ({ ...prev, [activeLesson.id]: p.status }))
    }
  }

  const currentIndex = lessons.findIndex((l) => l.id === activeLesson?.id)
  const next = currentIndex >= 0 ? lessons[currentIndex + 1] : null
  const prev = currentIndex > 0 ? lessons[currentIndex - 1] : null

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading course…</div>
  if (modules.length === 0) {
    return <div className="p-8 text-sm text-slate-500">This course has no modules yet.</div>
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      {/* Sidebar — module/lesson tree */}
      <aside className="border-r border-slate-200 bg-slate-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course outline</h2>
        <nav className="mt-3 space-y-4">
          {modules.map((m) => (
            <div key={m.id}>
              <p className="text-sm font-semibold text-slate-900">{m.title}</p>
              <ul className="mt-1 space-y-0.5">
                {m.lessons.map((l) => {
                  const status = progress[l.id]
                  const isActive = l.id === activeLesson?.id
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(l.id)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm ${
                          isActive ? 'bg-[#0033A0] text-white' : 'text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className="truncate">{l.title}</span>
                        <span className="ml-2 text-xs">{status === 'COMPLETED' ? '✓' : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main pane — lesson content */}
      <main className="px-6 py-8 lg:px-12">
        {activeLesson && (
          <>
            <header className="mb-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Lesson · {activeLesson.type.toLowerCase()}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{activeLesson.title}</h1>
            </header>

            <LessonRenderer type={activeLesson.type} contentRef={activeLesson.contentRef} />

            <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => prev && setActiveId(prev.id)}
                disabled={!prev}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={markComplete}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Mark complete
              </button>
              <button
                type="button"
                onClick={() => next && setActiveId(next.id)}
                disabled={!next}
                className="rounded-full bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#002577]"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
