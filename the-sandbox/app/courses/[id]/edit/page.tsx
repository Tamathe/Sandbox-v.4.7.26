'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type LessonType = 'READING' | 'TOOL' | 'CHATBOT' | 'VIDEO' | 'ASSESSMENT'

type Lesson = {
  id: string
  title: string
  type: LessonType
  contentRef: Record<string, unknown>
  order: number
}

type Module = {
  id: string
  title: string
  summary?: string | null
  order: number
  lessons: Lesson[]
}

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'READING', label: 'Reading' },
  { value: 'TOOL', label: 'Marketplace tool' },
  { value: 'CHATBOT', label: 'Chatbot' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'ASSESSMENT', label: 'Assessment' },
]

export default function CourseBuilderPage() {
  const params = useParams<{ id: string }>()
  const courseId = params.id
  const [modules, setModules] = useState<Module[]>([])
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch(`/api/courses/${courseId}/modules`)
    if (!res.ok) return
    const data: Module[] = await res.json()
    setModules(data)
    if (!activeModuleId && data[0]) setActiveModuleId(data[0].id)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  async function addModule() {
    const title = window.prompt('Module title?')
    if (!title) return
    setBusy(true)
    await fetch(`/api/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setBusy(false)
    refresh()
  }

  async function addLesson(moduleId: string) {
    const title = window.prompt('Lesson title?')
    if (!title) return
    const type = (window.prompt('Type (READING/TOOL/CHATBOT/VIDEO/ASSESSMENT)?', 'READING') ??
      'READING') as LessonType
    setBusy(true)
    const res = await fetch(`/api/modules/${moduleId}/lessons`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, type, contentRef: {} }),
    })
    setBusy(false)
    if (res.ok) refresh()
  }

  async function publish() {
    setBusy(true)
    setPublishMessage(null)
    const res = await fetch(`/api/courses/${courseId}/publish`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    setPublishMessage(res.ok ? 'Published ✓' : json.error ?? 'Publish failed')
  }

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null
  const activeLesson = activeModule?.lessons.find((l) => l.id === activeLessonId) ?? null

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]">
      {/* Left rail — outline */}
      <aside className="border-r border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Course outline</h2>
          <button
            type="button"
            onClick={addModule}
            disabled={busy}
            className="rounded-full bg-[#0033A0] px-3 py-1 text-xs font-semibold text-white hover:bg-[#002577] disabled:opacity-50"
          >
            + Module
          </button>
        </div>
        <nav className="mt-4 space-y-4">
          {modules.length === 0 && <p className="text-sm text-slate-500">No modules yet.</p>}
          {modules.map((m) => (
            <div key={m.id}>
              <button
                type="button"
                onClick={() => setActiveModuleId(m.id)}
                className={`block w-full text-left text-sm font-semibold ${
                  m.id === activeModuleId ? 'text-[#0033A0]' : 'text-slate-800'
                }`}
              >
                {m.title}
              </button>
              <ul className="mt-1 space-y-0.5 pl-3">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModuleId(m.id)
                        setActiveLessonId(l.id)
                      }}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs ${
                        l.id === activeLessonId ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{l.title}</span>
                      <span className="ml-2 text-[10px] uppercase text-slate-400">{l.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addLesson(m.id)}
                disabled={busy}
                className="mt-1 ml-3 text-xs text-slate-500 hover:text-[#0033A0]"
              >
                + Add lesson
              </button>
            </div>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Publish course
          </button>
          {publishMessage && <p className="mt-2 text-xs text-slate-600">{publishMessage}</p>}
        </div>
      </aside>

      {/* Right pane — editor */}
      <main className="px-8 py-10">
        {!activeLesson && (
          <div className="text-sm text-slate-500">
            Select a lesson from the outline, or add modules and lessons to begin authoring.
          </div>
        )}
        {activeLesson && (
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-wide text-slate-500">Editing lesson</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{activeLesson.title}</h1>
            <p className="mt-1 text-sm text-slate-600">Type: {activeLesson.type}</p>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              The right-pane editor for <strong>{activeLesson.type}</strong> lessons is the next
              step. It will swap to the appropriate form based on lesson type — markdown editor for
              READING, marketplace picker for TOOL, prompt builder for CHATBOT, URL input for
              VIDEO, and rubric builder for ASSESSMENT.
            </div>
          </div>
        )}

        <div className="mt-12 max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Lesson types available</p>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {LESSON_TYPES.map((t) => (
              <li key={t.value}>• {t.label}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
