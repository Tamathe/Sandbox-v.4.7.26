'use client'

import { useState } from 'react'
import { Loader2, ArrowLeft, Lightbulb, ChevronDown, ChevronUp, Send, BarChart3, ArrowRight } from 'lucide-react'
import type { PromptLabChallenge as ChallengeType } from '../../lib/prompt-lab-constants'

type Stage = 'idle' | 'running' | 'comparing' | 'scoring' | 'scored'

interface Scores {
  clarity: number
  specificity: number
  constraints: number
  effectiveness: number
}

interface Props {
  challenge: ChallengeType
  userEmail: string
  onComplete: () => void
  onBack: () => void
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? 'bg-green-500' : value >= 4 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 capitalize">{label}</span>
        <span className="font-semibold text-gray-900">{value}/10</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}

export default function PromptLabChallenge({ challenge, userEmail, onComplete, onBack }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [userPrompt, setUserPrompt] = useState('')
  const [originalOutput, setOriginalOutput] = useState('')
  const [userOutput, setUserOutput] = useState('')
  const [scores, setScores] = useState<Scores | null>(null)
  const [overallScore, setOverallScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showHints, setShowHints] = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail }

  async function handleRunBoth() {
    if (!userPrompt.trim()) return
    setStage('running')

    try {
      const [origRes, userRes] = await Promise.all([
        fetch('/api/ai-literacy/prompt-lab/execute', {
          method: 'POST', headers, body: JSON.stringify({ prompt: challenge.originalPrompt }),
        }),
        fetch('/api/ai-literacy/prompt-lab/execute', {
          method: 'POST', headers, body: JSON.stringify({ prompt: userPrompt }),
        }),
      ])

      const origData = await origRes.json()
      const userData = await userRes.json()
      setOriginalOutput(origData.output ?? '')
      setUserOutput(userData.output ?? '')
      setStage('comparing')
    } catch {
      setStage('idle')
    }
  }

  async function handleScore() {
    setStage('scoring')

    try {
      const res = await fetch('/api/ai-literacy/prompt-lab/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          original: challenge.originalPrompt,
          rewritten: userPrompt,
          originalOutput,
          rewrittenOutput: userOutput,
          challengeContext: `${challenge.scenario}\nScoring criteria: ${challenge.scoringCriteria}`,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setScores(data.scores)
      setOverallScore(data.overallScore)
      setFeedback(data.feedback)
      setStage('scored')
    } catch {
      setStage('comparing')
    }
  }

  async function handleSaveAndNext() {
    await fetch('/api/ai-literacy/prompt-lab/attempt', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        challengeId: challenge.id,
        level: challenge.level,
        originalPrompt: challenge.originalPrompt,
        userPrompt,
        originalOutput,
        userOutput,
        scores,
        overallScore,
        feedback,
      }),
    })
    onComplete()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <span className="text-xs font-semibold text-[#0033A0] uppercase">Level {challenge.level} Challenge</span>
          <p className="text-gray-700 mt-1">{challenge.scenario}</p>
        </div>
      </div>

      {/* Hints toggle */}
      <button
        onClick={() => setShowHints(!showHints)}
        className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
      >
        <Lightbulb className="size-4" />
        {showHints ? 'Hide hints' : 'Show hints'}
        {showHints ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {showHints && (
        <ul className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          {challenge.hints.map((hint, i) => (
            <li key={i} className="text-sm text-amber-800 flex gap-2">
              <span className="font-semibold text-amber-600">{i + 1}.</span> {hint}
            </li>
          ))}
        </ul>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original side */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Original Prompt</h3>
            <p className="text-gray-800 bg-gray-50 rounded-lg p-3 text-sm italic">{challenge.originalPrompt}</p>
          </div>
          {originalOutput && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Original Output</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{originalOutput}</p>
            </div>
          )}
        </div>

        {/* Rewritten side */}
        <div className="space-y-4">
          <div className="bg-white border border-[#0033A0]/20 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0033A0] uppercase mb-2">Your Rewritten Prompt</h3>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Rewrite the prompt to get a better result..."
              rows={5}
              disabled={stage === 'running' || stage === 'scoring'}
              className="w-full bg-blue-50/50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] resize-y disabled:opacity-50"
            />
          </div>
          {userOutput && (
            <div className="bg-white border border-[#0033A0]/20 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[#0033A0] uppercase mb-2">Rewritten Output</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{userOutput}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {stage === 'idle' && (
          <button
            onClick={handleRunBoth}
            disabled={!userPrompt.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="size-4" /> Run Both Prompts
          </button>
        )}
        {stage === 'running' && (
          <div className="flex items-center gap-2 px-5 py-2.5 text-[#0033A0] font-medium text-sm">
            <Loader2 className="size-4 animate-spin" /> Running both prompts...
          </div>
        )}
        {stage === 'comparing' && (
          <button
            onClick={handleScore}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
          >
            <BarChart3 className="size-4" /> Score My Rewrite
          </button>
        )}
        {stage === 'scoring' && (
          <div className="flex items-center gap-2 px-5 py-2.5 text-[#0033A0] font-medium text-sm">
            <Loader2 className="size-4 animate-spin" /> Evaluating your rewrite...
          </div>
        )}
        {stage === 'scored' && (
          <button
            onClick={handleSaveAndNext}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
          >
            Save &amp; Next Challenge <ArrowRight className="size-4" />
          </button>
        )}

        {(stage === 'comparing' || stage === 'scored') && (
          <button
            onClick={() => { setStage('idle'); setOriginalOutput(''); setUserOutput(''); setScores(null); setFeedback('') }}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Score results */}
      {stage === 'scored' && scores && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900">Your Score</h3>
            <div className={`text-2xl font-extrabold ${
              overallScore >= 7 ? 'text-green-600' : overallScore >= 4 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallScore}/10
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScoreBar label="Clarity" value={scores.clarity} />
            <ScoreBar label="Specificity" value={scores.specificity} />
            <ScoreBar label="Constraints" value={scores.constraints} />
            <ScoreBar label="Effectiveness" value={scores.effectiveness} />
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-700">{feedback}</p>
          </div>
        </div>
      )}
    </div>
  )
}
