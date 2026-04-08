'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, Loader2, Scale, CheckCircle,
  MessageSquare, AlertCircle, ArrowRight, RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../../../../lib/auth-context'
import PageHeader from '../../../../../components/PageHeader'

// ---------- Types ----------

interface ScenarioChoice {
  id: string
  label: string
  description?: string
  nextNodeId: string
}

interface ScenarioNode {
  id: string
  type: 'situation' | 'choice' | 'consequence' | 'reflection'
  content: string
  choices?: ScenarioChoice[]
  nextNodeId?: string
  isTerminal?: boolean
  scores?: { ethical: number; judgment: number }
  reflectionPrompt?: string
}

interface ScenarioTree {
  startNodeId: string
  nodes: ScenarioNode[]
}

interface Scenario {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  scenarioTree: ScenarioTree
}

interface ChoiceMade {
  nodeId: string
  choiceId: string
  timestamp: string
}

interface Reflection {
  nodeId: string
  text: string
}

interface AttemptResult {
  attempt: { id: string; ethicalScore: number; judgmentScore: number }
  scores: { ethicalScore: number; judgmentScore: number }
  feedback: string
}

// ---------- Component ----------

export default function JudgmentCallPlayerPage() {
  const { currentUser } = useAuth()
  const params = useParams()
  const router = useRouter()
  const scenarioId = params.scenarioId as string

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Player state
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([])
  const [choicesMade, setChoicesMade] = useState<ChoiceMade[]>([])
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [reflectionText, setReflectionText] = useState('')
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [phase, setPhase] = useState<'playing' | 'submitting' | 'result'>('playing')

  const fetched = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch scenario
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetch(`/api/ai-literacy/student/judgment-calls/${scenarioId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.scenario) {
          setScenario(data.scenario)
          const tree = data.scenario.scenarioTree as ScenarioTree
          setCurrentNodeId(tree.startNodeId)
          setVisitedNodeIds([tree.startNodeId])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scenarioId, currentUser.email])

  // Scroll to bottom when new nodes appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visitedNodeIds, phase])

  const nodeMap = new Map<string, ScenarioNode>()
  if (scenario) {
    for (const n of scenario.scenarioTree.nodes) {
      nodeMap.set(n.id, n)
    }
  }

  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null

  // Advance to a node
  const advanceTo = useCallback((nodeId: string) => {
    setCurrentNodeId(nodeId)
    setVisitedNodeIds((prev) => [...prev, nodeId])
  }, [])

  // Handle choice selection
  const handleChoice = useCallback((choiceNodeId: string, choiceId: string, nextNodeId: string) => {
    setChoicesMade((prev) => [
      ...prev,
      { nodeId: choiceNodeId, choiceId, timestamp: new Date().toISOString() },
    ])
    advanceTo(nextNodeId)
  }, [advanceTo])

  // Handle continue (for situation/consequence nodes with nextNodeId)
  const handleContinue = useCallback((nextNodeId: string) => {
    advanceTo(nextNodeId)
  }, [advanceTo])

  // Handle reflection submit
  const handleReflectionSubmit = useCallback(() => {
    if (!currentNodeId || !reflectionText.trim()) return
    setReflections((prev) => [...prev, { nodeId: currentNodeId, text: reflectionText.trim() }])
    setReflectionText('')

    // After reflection, the scenario is done — submit
    setPhase('submitting')
  }, [currentNodeId, reflectionText])

  // Skip reflection
  const handleSkipReflection = useCallback(() => {
    setPhase('submitting')
  }, [])

  // Submit attempt
  useEffect(() => {
    if (phase !== 'submitting' || submitting) return
    setSubmitting(true)

    fetch(`/api/ai-literacy/student/judgment-calls/${scenarioId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ choicesMade, reflections }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setResult(data)
          setPhase('result')
        }
      })
      .catch(() => {
        setPhase('playing') // Allow retry
      })
      .finally(() => setSubmitting(false))
  }, [phase, submitting, scenarioId, currentUser.email, choicesMade, reflections])

  // Detect terminal nodes to trigger submission
  useEffect(() => {
    if (!currentNode) return
    // If we hit a terminal consequence and next is a reflection, let reflection play
    // If terminal consequence has no next, auto-submit
    if (currentNode.isTerminal && currentNode.type === 'consequence' && !currentNode.nextNodeId) {
      setPhase('submitting')
    }
  }, [currentNode])

  // ---------- Render helpers ----------

  const renderNode = (nodeId: string, isLatest: boolean) => {
    const node = nodeMap.get(nodeId)
    if (!node) return null

    const isCurrent = nodeId === currentNodeId

    if (node.type === 'situation') {
      return (
        <div key={nodeId} className="mb-6">
          <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5 bg-white">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{node.content}</p>
          </div>
          {isLatest && node.nextNodeId && !visitedNodeIds.includes(node.nextNodeId) && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => handleContinue(node.nextNodeId!)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002880] transition-colors"
              >
                Continue <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )
    }

    if (node.type === 'choice') {
      const madeChoice = choicesMade.find((c) => c.nodeId === nodeId)
      return (
        <div key={nodeId} className="mb-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">{node.content}</p>
          <div className="space-y-2">
            {node.choices?.map((choice) => {
              const isSelected = madeChoice?.choiceId === choice.id
              const isDisabled = !!madeChoice

              return (
                <button
                  key={choice.id}
                  onClick={() => !isDisabled && handleChoice(nodeId, choice.id, choice.nextNodeId)}
                  disabled={isDisabled}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#0033A0] bg-blue-50'
                      : isDisabled
                        ? 'border-gray-100 bg-gray-50 opacity-50'
                        : 'border-gray-200 hover:border-[#0033A0] hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'border-[#0033A0] bg-[#0033A0]' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className="size-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{choice.label}</p>
                      {choice.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{choice.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (node.type === 'consequence') {
      return (
        <div key={nodeId} className="mb-6">
          <div className={`border-2 rounded-2xl shadow-sm p-5 ${
            node.isTerminal ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className={`size-4 shrink-0 mt-0.5 ${node.isTerminal ? 'text-amber-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{node.content}</p>
            </div>
          </div>
          {isLatest && node.nextNodeId && !visitedNodeIds.includes(node.nextNodeId) && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => handleContinue(node.nextNodeId!)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002880] transition-colors"
              >
                Continue <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )
    }

    if (node.type === 'reflection' && isCurrent && phase === 'playing') {
      return (
        <div key={nodeId} className="mb-6">
          <div className="border-2 border-purple-200 rounded-2xl shadow-sm p-5 bg-purple-50">
            <div className="flex items-start gap-2 mb-3">
              <MessageSquare className="size-4 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-purple-800">Time to Reflect</p>
            </div>
            <p className="text-sm text-purple-700 mb-4">{node.reflectionPrompt ?? node.content}</p>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full p-3 border border-purple-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              rows={4}
            />
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleSkipReflection}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Skip reflection
              </button>
              <button
                onClick={handleReflectionSubmit}
                disabled={!reflectionText.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Reflection
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Reflection already submitted
    if (node.type === 'reflection' && reflections.find((r) => r.nodeId === nodeId)) {
      const ref = reflections.find((r) => r.nodeId === nodeId)
      return (
        <div key={nodeId} className="mb-6">
          <div className="border-2 border-purple-200 rounded-2xl shadow-sm p-5 bg-purple-50">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare className="size-4 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-purple-800">Your Reflection</p>
            </div>
            <p className="text-sm text-purple-700 italic">&ldquo;{ref!.text}&rdquo;</p>
          </div>
        </div>
      )
    }

    return null
  }

  // ---------- Score display ----------

  const ScoreBar = ({ label, score }: { label: string; score: number }) => {
    const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <span className="text-xs font-bold text-gray-900">{score}/100</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    )
  }

  // ---------- Main render ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!scenario) {
    return (
      <div className="text-center py-24">
        <Scale className="size-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Scenario not found.</p>
        <Link href="/ai-literacy/student/judgment-calls" className="text-sm text-[#0033A0] hover:underline mt-2 inline-block">
          Back to scenarios
        </Link>
      </div>
    )
  }

  const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <Link href="/ai-literacy/student/judgment-calls" className="hover:text-gray-900">Judgment Calls</Link>
          <ChevronRight className="size-3" />
          <span className="truncate max-w-48">{scenario.title}</span>
        </nav>
      </div>
      <PageHeader
        title={scenario.title}
        subtitle={`${DIFFICULTY_LABELS[scenario.difficulty] ?? scenario.difficulty} scenario`}
        action={
          <Link
            href="/ai-literacy/student/judgment-calls"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" /> All Scenarios
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress indicator */}
        {phase === 'playing' && (
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0033A0] rounded-full transition-all"
                style={{ width: `${Math.min(100, (visitedNodeIds.length / scenario.scenarioTree.nodes.length) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{visitedNodeIds.length}/{scenario.scenarioTree.nodes.length} steps</span>
          </div>
        )}

        {/* Narrative flow */}
        {visitedNodeIds.map((nodeId, idx) =>
          renderNode(nodeId, idx === visitedNodeIds.length - 1),
        )}

        {/* Submitting state */}
        {phase === 'submitting' && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="size-6 animate-spin text-[#0033A0] mx-auto mb-2" />
              <p className="text-sm text-gray-500">Analyzing your choices...</p>
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-6 bg-white">
            <h2 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              Scenario Complete
            </h2>

            <div className="mb-6">
              <ScoreBar label="Ethical Reasoning" score={result.scores.ethicalScore} />
              <ScoreBar label="Judgment Quality" score={result.scores.judgmentScore} />
            </div>

            <div className="p-4 bg-blue-50 rounded-xl mb-6">
              <p className="text-xs font-semibold text-[#0033A0] mb-1">Feedback</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/ai-literacy/student/judgment-calls"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002880] transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                More Scenarios
              </Link>
              <button
                onClick={() => {
                  // Reset state for replay
                  const tree = scenario.scenarioTree
                  setCurrentNodeId(tree.startNodeId)
                  setVisitedNodeIds([tree.startNodeId])
                  setChoicesMade([])
                  setReflections([])
                  setReflectionText('')
                  setResult(null)
                  setPhase('playing')
                }}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Try Again
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </>
  )
}
