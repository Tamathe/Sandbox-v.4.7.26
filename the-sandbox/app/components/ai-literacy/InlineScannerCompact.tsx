'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import ErrorBanner from '../ErrorBanner'

interface InlineScannerCompactProps {
  userEmail: string
  onComplete: () => void
  onSkip: () => void
}

type Phase = 'idle' | 'scanning' | 'result'

interface ScanResult {
  completabilityScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  redesignSuggestions: { title: string; description: string }[]
  detectedTypes?: string[]
}

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-green-100', text: 'text-green-700' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
  HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
  CRITICAL: { bg: 'bg-red-200', text: 'text-red-900' },
}

export default function InlineScannerCompact({ userEmail, onComplete, onSkip }: InlineScannerCompactProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [text, setText] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback(async () => {
    setPhase('scanning')
    setError(null)

    try {
      const res = await fetch('/api/ai-literacy/assignments/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ assignmentText: text }),
      })
      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setResult(data)
      setPhase('result')
    } catch {
      setError('Something went wrong scanning your assignment. Try again or skip for now.')
      setPhase('idle')
    }
  }, [text, userEmail])

  const handleScanAnother = () => {
    setText('')
    setResult(null)
    setError(null)
    setPhase('idle')
  }

  const riskColor = result ? RISK_COLORS[result.riskLevel] ?? RISK_COLORS.MEDIUM : null

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 max-w-2xl">
      {/* Idle — paste + scan */}
      {phase === 'idle' && (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste an assignment prompt here — e.g., 'Write a 5-page essay analyzing the causes of the French Revolution...'"
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={text.trim().length <= 20}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] text-sm font-medium transition-colors disabled:opacity-30"
            >
              Scan for AI Completability
            </button>
            <button
              onClick={onSkip}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Skip for now
            </button>
          </div>

          {error && <ErrorBanner message={error} retry={handleScan} />}
        </div>
      )}

      {/* Scanning */}
      {phase === 'scanning' && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="size-5 text-[#0033A0] animate-spin" />
          <span className="text-sm text-gray-600">Analyzing assignment…</span>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && result && (
        <div className="space-y-4">
          {/* Risk scale legend */}
          <p className="text-xs text-muted-foreground">
            Risk scale: <span className="text-green-600">Low (&lt;30%)</span> · <span className="text-yellow-600">Medium (30-50%)</span> · <span className="text-orange-600">High (50-75%)</span> · <span className="text-red-600">Critical (&gt;75%)</span>
          </p>

          {/* Score badge */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskColor?.bg} ${riskColor?.text}`}>
              {result.riskLevel}
            </span>
            <span className="text-sm text-gray-700">
              AI could complete approximately {result.completabilityScore}% of this assignment as written.
            </span>
          </div>

          {/* Detected type tags */}
          {result.detectedTypes && result.detectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.detectedTypes.map((type) => (
                <span key={type} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {type}
                </span>
              ))}
            </div>
          )}

          {/* Top 2 suggestions */}
          {result.redesignSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Top suggestions
              </p>
              <ul className="space-y-2.5">
                {result.redesignSuggestions.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <div>
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">{s.title}:</span> {s.description}
                      </span>
                      <Link
                        href="/ai-literacy/assignments"
                        className="block mt-1 text-xs text-[#0033A0] hover:text-[#002880] font-medium"
                      >
                        See how to fix this in full scanner &rarr;
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] text-sm font-medium transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleScanAnother}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Scan another
            </button>
            <Link
              href="/ai-literacy/assignments"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              See full analysis →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
