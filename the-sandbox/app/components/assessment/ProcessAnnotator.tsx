'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageSquarePlus,
  Save,
  Send,
  User,
} from 'lucide-react'
import type {
  ProcessAnnotation,
  ProcessTranscriptMessage,
} from '../../lib/assessment/types'

interface ProcessAnnotatorProps {
  assignmentId: string
  assignmentTitle: string
  courseHeaders: Record<string, string>
  alreadySubmitted: boolean
  initialSessionId?: string | null
  onSubmitted?: () => void
}

interface LoadedProcessTranscript {
  sessionId: string
  messages: ProcessTranscriptMessage[]
  annotations: ProcessAnnotation[]
  reflection: string | null
  sessionMeta: {
    mode: string
    duration: number
    messageCount: number
    startedAt: string
    endedAt: string | null
  }
  permissions: {
    canAnnotate: boolean
  }
}

const STORAGE_KEY = (assignmentId: string) => `process-annotator-${assignmentId}`

function formatMinutes(durationSeconds: number) {
  if (!durationSeconds) return '0 min'
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`
}

function upsertAnnotation(
  annotations: ProcessAnnotation[],
  messageIndex: number,
  text: string
) {
  const cleaned = text.trim()
  const next = annotations.filter((annotation) => annotation.messageIndex !== messageIndex)

  if (!cleaned) {
    return next.sort((a, b) => a.messageIndex - b.messageIndex)
  }

  return [...next, { messageIndex, text: cleaned }].sort(
    (a, b) => a.messageIndex - b.messageIndex
  )
}

export default function ProcessAnnotator({
  assignmentId,
  assignmentTitle,
  courseHeaders,
  alreadySubmitted,
  initialSessionId = null,
  onSubmitted,
}: ProcessAnnotatorProps) {
  const [sessionId, setSessionId] = useState(initialSessionId ?? '')
  const [loadedTranscript, setLoadedTranscript] = useState<LoadedProcessTranscript | null>(null)
  const [annotations, setAnnotations] = useState<ProcessAnnotation[]>([])
  const [reflection, setReflection] = useState('')
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedLocally, setSavedLocally] = useState(false)
  const [submitted, setSubmitted] = useState(alreadySubmitted)

  useEffect(() => {
    setSubmitted(alreadySubmitted)
  }, [alreadySubmitted])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(STORAGE_KEY(assignmentId))
      if (!saved) return

      const parsed = JSON.parse(saved) as {
        sessionId?: string
        annotations?: ProcessAnnotation[]
        reflection?: string
      }

      if (!initialSessionId && parsed.sessionId) {
        setSessionId(parsed.sessionId)
      }

      if (Array.isArray(parsed.annotations)) {
        setAnnotations(parsed.annotations)
      }

      if (typeof parsed.reflection === 'string') {
        setReflection(parsed.reflection)
      }
    } catch {
      // Ignore corrupt local drafts.
    }
  }, [assignmentId, initialSessionId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY(assignmentId),
          JSON.stringify({
            sessionId,
            annotations,
            reflection,
          })
        )
        if (!submitted && (annotations.length > 0 || reflection.trim())) {
          setSavedLocally(true)
          setTimeout(() => setSavedLocally(false), 1500)
        }
      } catch {
        // Ignore localStorage failures.
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [annotations, assignmentId, reflection, sessionId, submitted])

  async function loadTranscript(targetSessionId = sessionId) {
    const trimmedSessionId = targetSessionId.trim()
    if (!trimmedSessionId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessment/process/${trimmedSessionId}`, {
        headers: courseHeaders,
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to load transcript')
      }

      const transcript = payload as LoadedProcessTranscript
      setLoadedTranscript(transcript)
      setSessionId(transcript.sessionId)
      setAnnotations((prev) =>
        submitted || prev.length === 0 ? transcript.annotations ?? [] : prev
      )
      setReflection((prev) =>
        submitted || !prev.trim() ? transcript.reflection ?? '' : prev
      )
    } catch (err) {
      setLoadedTranscript(null)
      setError(err instanceof Error ? err.message : 'Failed to load transcript')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialSessionId) {
      void loadTranscript(initialSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId])

  const annotationMap = useMemo(
    () => new Map(annotations.map((annotation) => [annotation.messageIndex, annotation.text])),
    [annotations]
  )

  const hasReflection = reflection.trim().length > 0
  const hasInlineAnnotations = annotations.length > 0
  const canSubmit = Boolean(loadedTranscript) && (hasInlineAnnotations || hasReflection)

  async function handleSubmitOrSave() {
    if (!loadedTranscript || !canSubmit) return

    setSaving(true)
    setError(null)

    try {
      if (submitted || loadedTranscript.permissions.canAnnotate) {
        const res = await fetch(
          `/api/assessment/process/${loadedTranscript.sessionId}/annotate`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...courseHeaders,
            },
            body: JSON.stringify({
              annotations,
              reflection,
            }),
          }
        )

        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to save annotations')
        }

        setSubmitted(true)
        onSubmitted?.()
        await loadTranscript(loadedTranscript.sessionId)
      } else {
        const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...courseHeaders,
          },
          body: JSON.stringify({
            sessionId: loadedTranscript.sessionId,
            studentAnnotation: {
              annotations,
              reflection,
            },
          }),
        })

        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to submit process assessment')
        }

        setSubmitted(true)
        onSubmitted?.()
        await loadTranscript(loadedTranscript.sessionId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save process assessment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0033A0]">Process Assessment</h3>
              <p className="mt-1 text-sm text-blue-900">
                Load your Sandy transcript, annotate the moments that mattered,
                and explain what you learned about your own thinking.
              </p>
            </div>
            {savedLocally && !submitted && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                Local draft saved
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="Paste your Sandy session ID"
              className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
            />
            <button
              type="button"
              onClick={() => void loadTranscript()}
              disabled={loading || !sessionId.trim()}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#0033A0] bg-white px-4 py-2 text-sm font-semibold text-[#0033A0] hover:bg-[#0033A0]/5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
              Load Transcript
            </button>
          </div>

          <p className="mt-2 text-xs text-blue-800">
            {submitted
              ? 'Your annotations are linked to the submitted transcript evidence. Edits here save back to the assignment record.'
              : 'Annotations auto-save locally in this browser until you submit. Submission creates the linked transcript evidence record.'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loadedTranscript ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <Bot className="mx-auto mb-3 size-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">
              Your transcript will appear here after you load a session.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              You&apos;ll be able to annotate any message and add a final reflection before submitting {assignmentTitle}.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {loadedTranscript.sessionMeta.mode}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {loadedTranscript.sessionMeta.messageCount} messages
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {formatMinutes(loadedTranscript.sessionMeta.duration)}
              </span>
            </div>

            <div className="space-y-4">
              {loadedTranscript.messages.map((message, index) => {
                const note = annotationMap.get(index) ?? ''
                const isExpanded = activeMessageIndex === index || Boolean(note)
                const isStudent = message.role === 'user'

                return (
                  <article key={`${message.timestamp}-${index}`} className="space-y-2">
                    <div className={`flex gap-3 ${isStudent ? '' : 'flex-row-reverse'}`}>
                      <div
                        className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ${
                          isStudent
                            ? 'bg-[#0033A0] text-white'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {isStudent ? <User className="size-4" /> : <Bot className="size-4" />}
                      </div>
                      <div className={`w-full max-w-[90%] ${isStudent ? '' : 'items-end'}`}>
                        <div
                          className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                            isStudent
                              ? 'border-blue-100 bg-blue-50 text-blue-950'
                              : 'border-purple-100 bg-purple-50 text-purple-950'
                          }`}
                        >
                          {message.content}
                        </div>
                        <div className={`mt-2 flex ${isStudent ? 'justify-start' : 'justify-end'}`}>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMessageIndex((current) =>
                                current === index ? null : index
                              )
                            }
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            {note ? 'Edit annotation' : 'Add annotation'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                            <textarea
                              value={note}
                              onChange={(event) =>
                                setAnnotations((prev) =>
                                  upsertAnnotation(prev, index, event.target.value)
                                )
                              }
                              rows={3}
                              placeholder="What changed here? Where did you get stuck? What mattered about this moment?"
                              className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <div className="mt-2 flex justify-between gap-2">
                              <p className="text-xs text-amber-800">
                                Inline annotations are stored on the transcript evidence.
                              </p>
                              {note && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAnnotations((prev) => upsertAnnotation(prev, index, ''))
                                  }
                                  className="text-xs font-semibold text-amber-900 hover:text-amber-700"
                                >
                                  Clear note
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <label className="block text-sm font-semibold text-amber-900">
                What did you learn about your own thinking process?
              </label>
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                rows={5}
                placeholder="Reflect on where your thinking shifted, what Sandy challenged, and what you would do differently next time."
                className="mt-2 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
        <button
          type="button"
          onClick={() => void handleSubmitOrSave()}
          disabled={!canSubmit || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002680] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : submitted ? (
            <Save className="size-4" />
          ) : (
            <Send className="size-4" />
          )}
          {submitted ? 'Save Annotations' : 'Submit Process Assessment'}
        </button>
      </div>
    </div>
  )
}
