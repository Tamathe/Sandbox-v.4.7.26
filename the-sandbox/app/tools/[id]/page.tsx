'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
  ArrowUp,
  Heart,
  Share2,
  ExternalLink,
  Clock,
  User,
  Calendar,
  ChevronRight,
  X,
  Bot,
  ChevronDown,
  ChevronUp,
  BarChart2,
  MessageSquare,
  BookOpen,
  Loader2,
  Search,
  Building2,
  Database,
  GraduationCap,
  GitFork,
  Trophy,
} from 'lucide-react'
import ChatInterface from '../../components/ChatInterface'
import StudyBuddyInterface from '../../components/StudyBuddyInterface'
import CommentsSection from '../../components/CommentsSection'
import AnalyticsDashboard from '../../components/AnalyticsDashboard'
import { StarRating } from '../../components/StarRating'
import { ToolWithDetails } from '../../lib/types'
import { useAuth } from '../../lib/auth-context'
import { format } from 'date-fns'
import { parseReference } from '../../lib/datasets'

const categoryColors: Record<string, string> = {
  Law: 'bg-indigo-100 text-indigo-700',
  History: 'bg-amber-100 text-amber-700',
  STEM: 'bg-emerald-100 text-emerald-700',
  Medicine: 'bg-red-100 text-red-700',
  Business: 'bg-blue-100 text-blue-700',
  Arts: 'bg-purple-100 text-purple-700',
  University: 'bg-sky-100 text-sky-700',
  General: 'bg-gray-100 text-gray-700',
}

const difficultyColors: Record<string, string> = {
  Introductory: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
}

const roleColors: Record<string, string> = {
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
  ADMIN: 'bg-red-100 text-red-700',
}

type Tab = 'overview' | 'comments' | 'leaderboard' | 'analytics'

export default function ToolDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const { currentUser } = useAuth()

  // Decode inject context from Sandy's deep-launch action
  const injectParam = searchParams.get('inject')
  const injectContext = injectParam ? decodeURIComponent(escape(atob(injectParam))) : null
  const resumeSessionId = searchParams.get('resumeSession')
  const courseId = searchParams.get('courseId')

  const [tool, setTool] = useState<ToolWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [upvoteCount, setUpvoteCount] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [hasUpvoted, setHasUpvoted] = useState(false)
  const [hasFavorited, setHasFavorited] = useState(false)
  const [upvoteLoading, setUpvoteLoading] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showExternalModal, setShowExternalModal] = useState(false)
  const [showChatbot, setShowChatbot] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isForking, setIsForking] = useState(false)
  const [ratingSummary, setRatingSummary] = useState<{
    avg: number
    count: number
    userRating: number | null
  }>({
    avg: 0,
    count: 0,
    userRating: null,
  })
  const [leaderboardScope, setLeaderboardScope] = useState<'course' | 'all'>(courseId ? 'course' : 'all')
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    Array<{
      id: string
      rank: number
      displayName: string
      score: number
      achievedAt: string
      isCurrentUser: boolean
    }>
  >([])
  const [scoreSummary, setScoreSummary] = useState<{ bestScore: number | null; latestScore: number | null }>({
    bestScore: null,
    latestScore: null,
  })
  const [challengeSearch, setChallengeSearch] = useState('')
  const [challengeResults, setChallengeResults] = useState<
    Array<{ id: string; name: string; role: string; department: string | null }>
  >([])
  const [selectedChallengeUser, setSelectedChallengeUser] = useState<{ id: string; name: string } | null>(null)
  const [sendingChallenge, setSendingChallenge] = useState(false)

  const fetchTool = useCallback(async () => {
    try {
      const toolUrl = courseId ? `/api/tools/${id}?courseId=${encodeURIComponent(courseId)}` : `/api/tools/${id}`
      const res = await fetch(toolUrl, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.status === 404) {
        setNotFoundError(true)
        return
      }
      if (!res.ok) return
      const data: ToolWithDetails = await res.json()
      setTool(data)
      setUpvoteCount(data._count.upvotes)
      setFavoriteCount(data._count.favorites)
      setHasUpvoted(data.hasUpvoted ?? false)
      setHasFavorited(data.hasFavorited ?? false)
      setRatingSummary((prev) => ({
        avg: data.avgRating ?? 0,
        count: data._count.ratings ?? 0,
        userRating: prev.userRating,
      }))
    } catch (err) {
      console.error('Failed to fetch tool:', err)
    } finally {
      setLoading(false)
    }
  }, [courseId, id, currentUser.email])

  useEffect(() => {
    fetchTool()
  }, [fetchTool])

  useEffect(() => {
    if (!tool || tool.toolType === 'EXTERNAL') return
    window.setTimeout(() => {
      document
        .getElementById('chatbot-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }, [tool?.id])

  useEffect(() => {
    let cancelled = false

    const fetchRatings = async () => {
      try {
        const response = await fetch(`/api/tools/${id}/rate`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setRatingSummary(data)
        }
      } catch {}
    }

    fetchRatings()

    return () => {
      cancelled = true
    }
  }, [id, currentUser.email])

  useEffect(() => {
    let cancelled = false

    const fetchScoreSummary = async () => {
      try {
        const response = await fetch(`/api/tools/${id}/score`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setScoreSummary({
            bestScore: data.bestScore ?? null,
            latestScore: data.latestScore ?? null,
          })
        }
      } catch {}
    }

    void fetchScoreSummary()

    return () => {
      cancelled = true
    }
  }, [id, currentUser.email])

  useEffect(() => {
    if (
      (searchParams.get('launch') === 'true' || !!resumeSessionId) &&
      tool &&
      tool.toolType !== 'EXTERNAL'
    ) {
      setShowChatbot(true)
      window.setTimeout(() => {
        document
          .getElementById('chatbot-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams, tool, resumeSessionId])

  useEffect(() => {
    if (scoreSummary.bestScore === null || challengeSearch.trim().length < 2) {
      setChallengeResults([])
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users?q=${encodeURIComponent(challengeSearch.trim())}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setChallengeResults(data)
        }
      } catch {}
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [challengeSearch, currentUser.email, scoreSummary.bestScore])

  useEffect(() => {
    setLeaderboardScope(courseId ? 'course' : 'all')
  }, [courseId])

  useEffect(() => {
    if (activeTab !== 'leaderboard') return

    let cancelled = false

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true)
      try {
        const query = new URLSearchParams({
          limit: '10',
        })
        if (leaderboardScope === 'course' && courseId) {
          query.set('courseId', courseId)
        }

        const response = await fetch(`/api/tools/${id}/leaderboard?${query.toString()}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setLeaderboardEntries(data)
        }
      } catch {
        if (!cancelled) setLeaderboardEntries([])
      } finally {
        if (!cancelled) setLeaderboardLoading(false)
      }
    }

    void fetchLeaderboard()

    return () => {
      cancelled = true
    }
  }, [activeTab, courseId, currentUser.email, id, leaderboardScope])

  const handleUpvote = async () => {
    if (upvoteLoading) return
    setUpvoteLoading(true)
    try {
      const res = await fetch(`/api/tools/${id}/upvote`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setHasUpvoted(data.upvoted)
        setUpvoteCount(data.count)
      }
    } finally {
      setUpvoteLoading(false)
    }
  }

  const handleFavorite = async () => {
    if (favoriteLoading) return
    setFavoriteLoading(true)
    try {
      const res = await fetch(`/api/tools/${id}/favorite`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setHasFavorited(data.favorited)
        setFavoriteCount(data.count)
      }
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFork = async () => {
    if (!tool || isForking) return
    setIsForking(true)
    try {
      const response = await fetch(`/api/tools/${tool.id}/fork`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!response.ok) return
      const data = await response.json()
      if (data.sessionId) {
        router.push(`/builder?sessionId=${data.sessionId}`)
      }
    } finally {
      setIsForking(false)
    }
  }

  const handleRate = async (rating: number) => {
    try {
      const response = await fetch(`/api/tools/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ rating }),
      })
      if (!response.ok) return
      const data = await response.json()
      setRatingSummary(data)
    } catch {}
  }

  const handleSendChallenge = async () => {
    if (!tool || !selectedChallengeUser || scoreSummary.bestScore === null || sendingChallenge) return
    setSendingChallenge(true)
    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          toolId: tool.id,
          challengedUserId: selectedChallengeUser.id,
          challengerScore: scoreSummary.bestScore,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send challenge')
      }

      setChallengeSearch('')
      setChallengeResults([])
      setSelectedChallengeUser(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send challenge')
    } finally {
      setSendingChallenge(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (notFoundError || !tool) {
    notFound()
    return null
  }

  const isCreator = tool.creatorId === currentUser.id || currentUser.role === 'ADMIN'
  const canSeeAnalytics = isCreator
  const connectedReferences = tool.referenceDocUrls.map(parseReference)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'comments', label: `Discussion (${tool._count.comments})`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    ...(canSeeAnalytics
      ? [{ id: 'analytics' as Tab, label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#0033A0] transition-colors">
            Browse
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              categoryColors[tool.category] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {tool.category}
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800 font-medium truncate max-w-xs">{tool.name}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tool header */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Category + badges */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      categoryColors[tool.category] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tool.category}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tool.difficultyLevel}
                  </span>
                  {tool.courseContext?.weekLabel && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#0033A0]">
                      {tool.courseContext.weekLabel}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      tool.toolType === 'CHATBOT'
                        ? 'bg-violet-100 text-violet-700'
                        : tool.toolType === 'STUDY_BUDDY'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tool.toolType === 'CHATBOT' ? (
                      <>
                        <Bot className="w-3 h-3" />
                        Chatbot
                      </>
                    ) : tool.toolType === 'STUDY_BUDDY' ? (
                      <>
                        <Bot className="w-3 h-3" />
                        Study Buddy
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3 h-3" />
                        External Tool
                      </>
                    )}
                  </span>
                  {tool.featured && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      ★ Featured
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                  {tool.name}
                </h1>
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  {tool.estimatedMinutes && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[#0033A0]">
                      <Clock className="w-4 h-4" />
                      {tool.estimatedMinutes} min
                    </div>
                  )}
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
                      difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tool.difficultyLevel}
                  </div>
                </div>
                <div className="mb-3">
                  <StarRating
                    avg={ratingSummary.avg}
                    count={ratingSummary.count}
                    userRating={ratingSummary.userRating}
                    onRate={handleRate}
                  />
                </div>
                <p className="text-gray-500 text-base leading-relaxed">{tool.shortDescription}</p>
              </div>

              {/* Action bar */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
                {/* Launch button */}
                {tool.toolType === 'EXTERNAL' ? (
                  <button
                    onClick={() => setShowExternalModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Launch Tool
                  </button>
                ) : (
                  <button
                    onClick={() => setShowChatbot(!showChatbot)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
                      showChatbot
                        ? 'bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/30 hover:bg-[#0033A0]/15'
                        : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    {showChatbot
                      ? (tool.toolType === 'STUDY_BUDDY' ? 'Study Buddy Active' : 'Session Active')
                      : (tool.toolType === 'STUDY_BUDDY' ? 'Launch Study Buddy' : 'Launch Chatbot')}
                    {showChatbot
                      ? <ChevronUp className="w-4 h-4 ml-1" />
                      : <ChevronDown className="w-4 h-4 ml-1" />}
                  </button>
                )}

                {tool.toolType !== 'EXTERNAL' && (
                  <button
                    onClick={handleFork}
                    disabled={isForking}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
                  >
                    <GitFork className="w-4 h-4" />
                    {isForking ? 'Forking...' : 'Fork'}
                  </button>
                )}

                {/* Upvote */}
                <button
                  onClick={handleUpvote}
                  disabled={upvoteLoading}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors ${
                    hasUpvoted
                      ? 'bg-[#0033A0] text-white border-[#0033A0]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#0033A0] hover:text-[#0033A0]'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  {upvoteCount}
                </button>

                {/* Favorite */}
                <button
                  onClick={handleFavorite}
                  disabled={favoriteLoading}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors ${
                    hasFavorited
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-pink-500 hover:text-pink-500'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {favoriteCount}
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border border-gray-300 bg-white text-gray-600 hover:border-gray-400 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Inline chatbot */}
            <div id="chatbot-section">
              {showChatbot && tool.toolType === 'CHATBOT' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <ChatInterface
                    toolId={tool.id}
                    systemPrompt={tool.systemPrompt}
                    personaName={tool.personaName}
                    personaAvatar={tool.personaAvatar}
                    welcomeMessage={tool.welcomeMessage}
                    starterQuestions={tool.starterQuestions}
                    courseId={courseId ?? undefined}
                    totalSteps={tool.totalSteps}
                    stepLabel={tool.stepLabel}
                    injectContext={injectContext ?? undefined}
                    resumeSessionId={resumeSessionId ?? undefined}
                    onRatingChange={setRatingSummary}
                  />
                </div>
              )}

              {showChatbot && tool.toolType === 'STUDY_BUDDY' && (
                <div className="animate-in slide-in-from-top-2 duration-200" style={{ minHeight: '600px' }}>
                  <StudyBuddyInterface
                    toolId={tool.id}
                    toolName={tool.name}
                    welcomeMessage={tool.welcomeMessage}
                    starterQuestions={tool.starterQuestions}
                    userEmail={currentUser.email}
                  />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'border-[#0033A0] text-[#0033A0]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="prose max-w-none">
                      <ReactMarkdown>{tool.fullDescription}</ReactMarkdown>
                    </div>

                    {tool.learningObjectives.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Learning Objectives</h3>
                        <ul className="space-y-2">
                          {tool.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-gray-700 text-sm leading-relaxed">{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tool.intendedAudience && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Intended Audience</h3>
                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                          {tool.intendedAudience}
                        </p>
                      </div>
                    )}

                    {connectedReferences.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Connected Sources</h3>
                        <div className="space-y-2">
                          {connectedReferences.map((reference, index) => (
                            <div key={`${reference.label}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                              {reference.type === 'dataset'
                                ? <Database className="w-4 h-4 text-[#0033A0] flex-shrink-0" />
                                : reference.type === 'course'
                                  ? <GraduationCap className="w-4 h-4 text-[#0033A0] flex-shrink-0" />
                                  : <Building2 className="w-4 h-4 text-[#0033A0] flex-shrink-0" />
                              }
                              <span>{reference.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'comments' && <CommentsSection toolId={tool.id} />}

                {activeTab === 'leaderboard' && (
                  <div className="space-y-4">
                    {courseId && (
                      <div className="inline-flex rounded-xl bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() => setLeaderboardScope('course')}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                            leaderboardScope === 'course'
                              ? 'bg-white text-[#0033A0] shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          This Course
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardScope('all')}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                            leaderboardScope === 'all'
                              ? 'bg-white text-[#0033A0] shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          All Users
                        </button>
                      </div>
                    )}

                    {leaderboardLoading ? (
                      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-10 text-sm text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading leaderboard...
                      </div>
                    ) : leaderboardEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                        No ranked scores yet for this tool.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leaderboardEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                              entry.isCurrentUser
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="w-8 text-center text-sm font-extrabold text-gray-500">
                              #{entry.rank}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {entry.displayName}
                                {entry.isCurrentUser && (
                                  <span className="ml-2 rounded-full bg-[#0033A0] px-2 py-0.5 text-[10px] font-semibold text-white">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {format(new Date(entry.achievedAt), 'MMM d, yyyy')}
                              </div>
                            </div>
                            <div className="text-lg font-extrabold text-[#0033A0]">
                              {Math.round(entry.score)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'analytics' && canSeeAnalytics && (
                  <AnalyticsDashboard toolId={tool.id} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Creator card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Created by</h3>
              <Link
                href={`/profile/${tool.creatorId}`}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
              >
                <div className="w-10 h-10 bg-[#0033A0] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {tool.creator.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{tool.creator.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        roleColors[tool.creator.role]
                      }`}
                    >
                      {tool.creator.role}
                    </span>
                  </div>
                  {tool.creator.department && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {tool.creator.department}
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Tool info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Tool Info</h3>
              {tool.estimatedMinutes && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>~{tool.estimatedMinutes} minutes</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span>{upvoteCount} upvote{upvoteCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Published {format(new Date(tool.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>

            {scoreSummary.bestScore !== null && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm">Challenge a Classmate</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your best score: <span className="font-semibold text-[#0033A0]">{Math.round(scoreSummary.bestScore)}%</span>
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Search className="h-4 w-4" />
                    <input
                      value={challengeSearch}
                      onChange={(event) => setChallengeSearch(event.target.value)}
                      placeholder="Search for a classmate..."
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                </div>
                {challengeResults.length > 0 && (
                  <div className="space-y-2">
                    {challengeResults.slice(0, 5).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedChallengeUser({ id: user.id, name: user.name })
                          setChallengeSearch(user.name)
                          setChallengeResults([])
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-800">{user.name}</span>
                        <span className="text-xs text-gray-400">{user.role}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedChallengeUser && (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Challenging <span className="font-semibold">{selectedChallengeUser.name}</span> to beat your score.
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSendChallenge}
                  disabled={!selectedChallengeUser || sendingChallenge}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {sendingChallenge && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Challenge
                </button>
              </div>
            )}

            {/* Starter questions (for chatbots only) */}
            {tool.toolType === 'CHATBOT' && tool.starterQuestions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Try asking...</h3>
                <div className="space-y-2">
                  {tool.starterQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowChatbot(true)
                        setTimeout(() => {
                          const el = document.querySelector<HTMLTextAreaElement>('.chat-input')
                          if (el) {
                            el.focus()
                            el.setSelectionRange(el.value.length, el.value.length)
                          }
                        }, 100)
                      }}
                      className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-[#0033A0] rounded-lg px-3 py-2 transition-colors border border-gray-100 hover:border-blue-200"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* External tool modal */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">You&apos;re leaving The Sandbox</h2>
              <button
                onClick={() => setShowExternalModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              You&apos;re about to open an external tool. This will open in a new tab. The external
              site is not affiliated with the University of Kentucky.
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-sm text-gray-700 font-mono break-all">
              {tool.externalUrl}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExternalModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <a
                href={tool.externalUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowExternalModal(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Tool
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
