'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Circle, Clock, MessageSquare, Star,
  ChevronDown, ChevronUp, Loader2, Sparkles, ToggleLeft, ToggleRight, Download,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PackExport from './PackExport'

interface Template {
  id: string
  title: string
  description: string
  aiTier: string
  aiLevel: string
}

interface Implementation {
  id: string
  itemId: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REFLECTED'
  startedAt: string | null
  completedAt: string | null
  rating: number | null
  reflection: string | null
  wouldRepeat: boolean | null
}

interface PackItem {
  id: string
  templateId: string | null
  template: Template | null
  customTitle: string | null
  customDescription: string | null
  customAiLevel: string | null
  sortOrder: number
  implementation?: Implementation | null
}

interface Pack {
  id: string
  name: string
  status: string
  timelinePlan: { week: number; action: string }[] | null
  items: PackItem[]
  implementations: Implementation[]
}

interface Progress {
  total: number
  started: number
  completed: number
  reflected: number
}

interface ImplementationTrackerProps {
  pack: Pack
  onRefresh: () => Promise<void>
}

const STATUS_CONFIG = {
  NOT_STARTED: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-100 text-blue-700' },
  REFLECTED: { label: 'Reflected', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-100 text-green-700' },
} as const

export default function ImplementationTracker({ pack, onRefresh }: ImplementationTrackerProps) {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<PackItem[]>([])
  const [progress, setProgress] = useState<Progress>({ total: 0, started: 0, completed: 0, reflected: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedReflection, setExpandedReflection] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    'x-demo-user-email': currentUser.email,
  }

  const fetchImplementation = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-literacy/starter-packs/${pack.id}/implementation`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
        setProgress(data.progress)
      }
    } finally {
      setLoading(false)
    }
  }, [pack.id, currentUser.email])

  useEffect(() => {
    fetchImplementation()
  }, [fetchImplementation])

  const updateStatus = async (itemId: string, status: 'IN_PROGRESS' | 'COMPLETED') => {
    setUpdatingStatus(itemId)
    // Optimistic update
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, implementation: { ...item.implementation!, itemId, status, id: item.implementation?.id ?? '', startedAt: item.implementation?.startedAt ?? null, completedAt: status === 'COMPLETED' ? new Date().toISOString() : null, rating: null, reflection: null, wouldRepeat: null } }
        : item
    ))

    const res = await fetch(`/api/ai-literacy/starter-packs/${pack.id}/implementation/${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    })

    if (!res.ok) {
      await fetchImplementation() // Revert on error
    } else {
      await fetchImplementation()
      await onRefresh()
    }
    setUpdatingStatus(null)
  }

  const getItemStatus = (item: PackItem): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REFLECTED' => {
    return item.implementation?.status ?? 'NOT_STARTED'
  }

  const progressPercent = progress.total > 0
    ? Math.round(((progress.completed + progress.reflected) / progress.total) * 100)
    : 0

  const notStartedCount = progress.total - progress.started
  const inProgressCount = progress.started - progress.completed
  const timeline = (pack.timelinePlan ?? []) as { week: number; action: string }[]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="border rounded-2xl shadow-sm bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-gray-900">Implementation Progress</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="size-3.5" />
              Export
            </button>
            <span className="text-sm font-semibold text-[#0033A0]">{progressPercent}%</span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#0033A0] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{notStartedCount} not started</span>
          <span className="text-gray-300">·</span>
          <span>{inProgressCount} in progress</span>
          <span className="text-gray-300">·</span>
          <span>{progress.completed - progress.reflected} completed</span>
          <span className="text-gray-300">·</span>
          <span>{progress.reflected} reflected</span>
        </div>
      </div>

      {/* Implementation Items */}
      <div>
        <h2 className="font-extrabold text-gray-900 mb-4">Assignments</h2>
        <div className="space-y-3">
          {items.map(item => {
            const title = item.customTitle ?? item.template?.title ?? 'Untitled'
            const description = item.customDescription ?? item.template?.description ?? ''
            const status = getItemStatus(item)
            const config = STATUS_CONFIG[status]
            const StatusIcon = config.icon
            const isReflecting = expandedReflection === item.id

            return (
              <div key={item.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  <StatusIcon className={`size-5 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.bg}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{description}</p>

                    {/* Completed reflection display */}
                    {status === 'REFLECTED' && item.implementation && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={`size-3.5 ${n <= (item.implementation?.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                            />
                          ))}
                          {item.implementation.wouldRepeat !== null && (
                            <span className="ml-2 text-[10px] text-gray-500">
                              {item.implementation.wouldRepeat ? 'Would repeat' : 'Would not repeat'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{item.implementation.reflection}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      {status === 'NOT_STARTED' && (
                        <button
                          onClick={() => updateStatus(item.id, 'IN_PROGRESS')}
                          disabled={updatingStatus === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors"
                        >
                          {updatingStatus === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                          Start
                        </button>
                      )}
                      {status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateStatus(item.id, 'COMPLETED')}
                          disabled={updatingStatus === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors"
                        >
                          {updatingStatus === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                          Complete
                        </button>
                      )}
                      {status === 'COMPLETED' && (
                        <button
                          onClick={() => setExpandedReflection(isReflecting ? null : item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <MessageSquare className="size-3.5" />
                          Reflect
                          {isReflecting ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reflection Form */}
                {isReflecting && (
                  <ReflectionForm
                    packId={pack.id}
                    itemId={item.id}
                    onSubmitted={() => {
                      setExpandedReflection(null)
                      fetchImplementation()
                      onRefresh()
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="size-5 text-[#0033A0]" />
            Implementation Timeline
          </h2>
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
              {timeline.map((step, i) => {
                // Highlight approximate current position based on progress
                const isActive = i === Math.min(
                  Math.floor((progressPercent / 100) * timeline.length),
                  timeline.length - 1
                )
                return (
                  <div key={i} className="relative pb-4 last:pb-0">
                    <div className={`absolute -left-4 top-1 size-3 rounded-full border-2 ${
                      isActive ? 'border-[#0033A0] bg-[#0033A0]' : 'border-gray-300 bg-white'
                    }`} />
                    <p className={`text-sm ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                      <span className="font-semibold">Week {step.week}:</span> {step.action}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Next Suggestion */}
      <NextSuggestionCard packId={pack.id} />

      {/* Pack Export Modal */}
      {showExport && (() => {
        // The ImplementationTracker's Pack type may not include all fields
        // that PackExport needs. We safely extract what's available and
        // provide defaults for anything missing.
        const anyPack = pack as unknown as Record<string, unknown>
        const exportPack = {
          name: pack.name,
          disciplineFamily: (anyPack.disciplineFamily as string) ?? 'General',
          policyLanguage: (anyPack.policyLanguage as string | null) ?? null,
          timelinePlan: pack.timelinePlan,
          course: anyPack.course as { courseCode: string; title: string } | undefined,
          items: items.map(item => {
            const anyTemplate = item.template as unknown as Record<string, unknown> | null
            const anyItem = item as unknown as Record<string, unknown>
            return {
              id: item.id,
              template: item.template
                ? {
                    title: item.template.title,
                    description: item.template.description,
                    aiTier: item.template.aiTier,
                    aiLevel: item.template.aiLevel,
                    assignmentType: (anyTemplate?.assignmentType as string) ?? 'N/A',
                    syllabusLanguage: (anyTemplate?.syllabusLanguage as string) ?? '',
                    rubricRows: (anyTemplate?.rubricRows as Array<{ criterion: string; excellent: string; proficient: string; developing: string; insufficient: string }>) ?? [],
                    implementationNotes: (anyTemplate?.implementationNotes as string) ?? '',
                  }
                : null,
              customTitle: item.customTitle,
              customDescription: item.customDescription,
              customAiLevel: item.customAiLevel,
              customSyllabusLanguage: (anyItem.customSyllabusLanguage as string | null) ?? null,
              customRubricRows: (anyItem.customRubricRows as Array<{ criterion: string; excellent: string; proficient: string; developing: string; insufficient: string }> | null) ?? null,
            }
          }),
          checkpoints: (anyPack.checkpoints as Array<{
            checkpoint: { name: string; description: string; gradingWeight: string } | null
            customName: string | null
            customDescription: string | null
            customWeight: string | null
          }>) ?? [],
        }
        return <PackExport pack={exportPack} onClose={() => setShowExport(false)} />
      })()}
    </div>
  )
}

// --- Reflection Form Sub-component ---

function ReflectionForm({
  packId,
  itemId,
  onSubmitted,
}: {
  packId: string
  itemId: string
  onSubmitted: () => void
}) {
  const { currentUser } = useAuth()
  const [rating, setRating] = useState(0)
  const [reflection, setReflection] = useState('')
  const [wouldRepeat, setWouldRepeat] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  const handleSubmit = async () => {
    if (rating < 1 || !reflection.trim()) return
    setSubmitting(true)

    const res = await fetch(`/api/ai-literacy/starter-packs/${packId}/implementation/${itemId}/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ rating, reflection: reflection.trim(), wouldRepeat }),
    })

    setSubmitting(false)
    if (res.ok) {
      onSubmitted()
    }
  }

  return (
    <div className="border-t px-4 py-4 bg-gray-50/50 space-y-4">
      {/* Star Rating */}
      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-1.5">Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <Star
                className={`size-6 transition-colors ${
                  n <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 hover:text-amber-200'
                }`}
              />
            </button>
          ))}
          {rating > 0 && <span className="text-xs text-gray-500 ml-2">{rating}/5</span>}
        </div>
      </div>

      {/* Reflection Text */}
      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
          How did it go? What would you change?
        </label>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          rows={3}
          placeholder="Share your experience..."
          className="w-full px-3 py-2 border rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#0033A0] outline-none resize-y"
        />
      </div>

      {/* Would Repeat Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">Would you use this assignment again?</label>
        <button
          onClick={() => setWouldRepeat(!wouldRepeat)}
          className="flex items-center gap-1.5 text-sm"
        >
          {wouldRepeat ? (
            <ToggleRight className="size-6 text-green-500" />
          ) : (
            <ToggleLeft className="size-6 text-gray-400" />
          )}
          <span className={`text-xs font-medium ${wouldRepeat ? 'text-green-600' : 'text-gray-500'}`}>
            {wouldRepeat ? 'Yes' : 'No'}
          </span>
        </button>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || rating < 1 || !reflection.trim()}
          className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Submit Reflection
        </button>
      </div>
    </div>
  )
}

// --- Next Suggestion Sub-component ---

function NextSuggestionCard({ packId }: { packId: string }) {
  const { currentUser } = useAuth()
  const [suggestion, setSuggestion] = useState<{ title: string; description: string; tier: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSuggestion = async () => {
      try {
        const res = await fetch(`/api/ai-literacy/starter-packs/${packId}/implementation?next=true`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          // Find first NOT_STARTED item as next suggestion
          const nextItem = data.items?.find(
            (i: PackItem) => !i.implementation || i.implementation.status === 'NOT_STARTED'
          )
          if (nextItem) {
            setSuggestion({
              title: nextItem.customTitle ?? nextItem.template?.title ?? 'Next Assignment',
              description: nextItem.customDescription ?? nextItem.template?.description ?? '',
              tier: nextItem.template?.aiTier ?? 'FOUNDATION',
            })
          }
        }
      } catch {
        // Silently fail - suggestion is optional
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestion()
  }, [packId, currentUser.email])

  if (loading || !suggestion) return null

  return (
    <div className="border rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-white p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="size-6 text-[#0033A0] shrink-0 mt-0.5" />
        <div>
          <h3 className="font-extrabold text-gray-900">Ready for the next level?</h3>
          <p className="text-sm text-gray-700 mt-1 font-medium">{suggestion.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{suggestion.description}</p>
        </div>
      </div>
    </div>
  )
}
