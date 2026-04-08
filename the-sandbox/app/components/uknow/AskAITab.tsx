'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Sparkles, Bell, ChevronDown, ChevronUp, MessageSquare, Bot, RotateCcw, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDate, slugFromUrl } from './uknow-helpers'
import type { ChatTurn } from './uknow-helpers'
import type { AskAIResult } from '../../lib/uknow-service'
import { AlertConversionCard } from './AlertConversionCard'
import { TimelineStory } from './TimelineStory'
import type { TimelineMilestone } from '../../lib/uknow-insights-service'

const TIMELINE_KEYWORDS = [
  'story of', 'history of', 'over the years', 'timeline',
  'evolution of', 'how has', 'journey of', 'progression of',
  'through the years', 'over time',
]

function looksLikeTemporal(q: string): boolean {
  const lower = q.toLowerCase()
  return TIMELINE_KEYWORDS.some((kw) => lower.includes(kw))
}

interface AskAITabProps {
  userEmail: string
}

export function AskAITab({ userEmail }: AskAITabProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [promptsLoading, setPromptsLoading] = useState(true)
  const [prompts, setPrompts] = useState<string[]>([])
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timelineMode, setTimelineMode] = useState(false)
  const [timelineSuggested, setTimelineSuggested] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Prompts with 5-min cache
    const promptsCache = sessionStorage.getItem('uknow-prompts')
    const promptsTs = sessionStorage.getItem('uknow-prompts-ts')
    if (promptsCache && promptsTs && Date.now() - Number(promptsTs) < 5 * 60 * 1000) {
      try { setPrompts(JSON.parse(promptsCache)); setPromptsLoading(false) } catch { /* ignore */ }
    } else {
      fetch('/api/uknow/prompts', { headers: { 'x-demo-user-email': userEmail } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.prompts) {
            setPrompts(data.prompts)
            sessionStorage.setItem('uknow-prompts', JSON.stringify(data.prompts))
            sessionStorage.setItem('uknow-prompts-ts', String(Date.now()))
          }
        })
        .catch(() => {})
        .finally(() => setPromptsLoading(false))
    }
  }, [userEmail])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  const submit = async (q: string, forceTimeline?: boolean) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setTimelineSuggested(false)

    const isTimeline = forceTimeline ?? timelineMode ?? looksLikeTemporal(q)

    // Add user turn
    const userTurn: ChatTurn = { role: 'user', content: q.trim() }
    const newTurns = [...turns, userTurn]
    setTurns(newTurns)
    setQuery('')

    try {
      if (isTimeline) {
        // Timeline mode — POST to /api/uknow/timeline
        const res = await fetch('/api/uknow/timeline', {
          method: 'POST',
          headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.trim() }),
        })
        if (!res.ok) throw new Error('Request failed')
        const data: { narrative: string; milestones: TimelineMilestone[]; followUps: string[] } = await res.json()

        const assistantTurn: ChatTurn = {
          role: 'assistant',
          content: data.narrative,
          followUps: data.followUps,
          timeline: { milestones: data.milestones },
        }
        setTurns([...newTurns, assistantTurn])
      } else {
        // Standard Ask AI
        const history = newTurns.slice(-6).map((t) => ({
          role: t.role,
          content: t.content,
        }))

        const res = await fetch('/api/uknow/ask', {
          method: 'POST',
          headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.trim(), history }),
        })
        if (!res.ok) throw new Error('Request failed')
        const data: AskAIResult & { followUps?: string[] } = await res.json()

        const assistantTurn: ChatTurn = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources?.map((s) => ({
            id: s.articleId,
            slug: slugFromUrl(s.url),
            title: s.title,
            section: s.section,
            sectionLabel: s.sectionLabel,
            url: s.url,
            author: null,
            publishedAt: s.publishedAt,
            wordCount: 0,
            excerpt: '',
            sentiment: null,
          })),
          followUps: data.followUps,
        }
        setTurns([...newTurns, assistantTurn])

        // Suggest timeline mode if query looks temporal but user didn't use timeline mode
        if (!timelineMode && looksLikeTemporal(q)) {
          setTimelineSuggested(true)
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setTurns(newTurns)
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setTurns([])
    setQuery('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Suggested prompts — only when no conversation yet */}
      {turns.length === 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="size-6 rounded-full bg-[#0033A0] flex items-center justify-center">
              <Bot className="size-3 text-white" />
            </div>
            <span className="font-semibold text-gray-700">Sandy</span>
            <span className="text-gray-400">&middot;</span>
            <span>News Analyst</span>
          </div>
          {promptsLoading ? (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-48 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => { setQuery(p); void submit(p) }}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-[#0033A0] border border-blue-100 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Conversation history */}
      {turns.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* New chat button */}
          <div className="flex justify-end">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#0033A0] font-medium transition-colors"
            >
              <RotateCcw className="size-3" /> New Chat
            </button>
          </div>

          {turns.map((turn, i) => (
            <div key={i}>
              {turn.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-[#0033A0] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm">{turn.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <div className="size-7 rounded-full bg-[#0033A0] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-white" />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Timeline response */}
                    {turn.timeline ? (
                      <TimelineStory
                        narrative={turn.content}
                        milestones={turn.timeline.milestones}
                        followUps={i === turns.length - 1 ? (turn.followUps ?? []) : []}
                        onFollowUp={(fu) => { setQuery(fu); void submit(fu) }}
                      />
                    ) : (
                      <>
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex flex-col gap-4">
                          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>

                          {/* Expandable source cards */}
                          {turn.sources && turn.sources.length > 0 && (
                            <SourceCards sources={turn.sources} />
                          )}
                        </div>

                        {/* Alert conversion card — prominent CTA after assistant response */}
                        {i === turns.length - 1 && i > 0 && (
                          <AlertConversionCard
                            query={turns[i - 1].content}
                            userEmail={userEmail}
                          />
                        )}

                        {/* Follow-up suggestions */}
                        {turn.followUps && turn.followUps.length > 0 && i === turns.length - 1 && (
                          <div className="flex gap-2 flex-wrap">
                            {turn.followUps.map((fu) => (
                              <button
                                key={fu}
                                onClick={() => { setQuery(fu); void submit(fu) }}
                                disabled={loading}
                                className="px-3 py-1.5 text-sm bg-white text-[#0033A0] border border-blue-100 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50"
                              >
                                <MessageSquare className="size-3 inline mr-1.5" />
                                {fu}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timeline mode suggestion */}
                        {timelineSuggested && i === turns.length - 1 && (
                          <button
                            onClick={() => {
                              setTimelineMode(true)
                              setTimelineSuggested(false)
                              void submit(turns[i - 1].content, true)
                            }}
                            className="self-start flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-[#0033A0] border border-blue-100 rounded-full hover:bg-blue-100 transition-colors"
                          >
                            <Clock className="size-3.5" />
                            See this as a timeline story
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex flex-col gap-3">
        <textarea
          rows={turns.length > 0 ? 2 : 3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={timelineMode
            ? 'Tell me the story of… (timeline mode)'
            : turns.length > 0 ? 'Ask a follow-up…' : 'Ask anything about UK…'
          }
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit(query)
            }
          }}
        />
        <div className="flex items-center justify-between">
          {/* Timeline mode toggle */}
          <button
            onClick={() => setTimelineMode(!timelineMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
              timelineMode
                ? 'bg-[#0033A0] text-white border-[#0033A0]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Clock className="size-3.5" />
            Timeline Mode
          </button>

          <button
            onClick={() => void submit(query)}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-800 transition-colors"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? 'Thinking…' : timelineMode ? 'Build Timeline' : turns.length > 0 ? 'Follow up' : 'Ask AI'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-2 border-amber-200 rounded-2xl p-4 bg-amber-50 text-amber-800 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Source Cards (expandable) ─────────────────────────────────────

function SourceCards({ sources }: { sources: NonNullable<ChatTurn['sources']> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-t border-blue-200 pt-3 flex flex-col gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="self-start flex items-center gap-1 text-xs font-bold text-gray-700 uppercase tracking-wide hover:text-[#0033A0]"
      >
        Sources ({sources.length})
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {expanded && sources.slice(0, 5).map((s) => (
        <Link
          key={s.id}
          href={`/uknow/${s.slug}`}
          className="border-2 border-blue-100 rounded-xl px-4 py-3 hover:bg-blue-100 transition-colors flex flex-col gap-1"
        >
          <span className="font-medium text-sm text-[#0033A0] line-clamp-1">{s.title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{s.sectionLabel}</span>
            {s.publishedAt && <span className="text-xs text-gray-400">{formatDate(s.publishedAt)}</span>}
          </div>
          {s.excerpt && <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{s.excerpt}</p>}
        </Link>
      ))}
      {!expanded && sources.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {sources.slice(0, 5).map((s) => (
            <Link
              key={s.id}
              href={`/uknow/${s.slug}`}
              className="text-xs font-medium text-[#0033A0] hover:underline"
            >
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
