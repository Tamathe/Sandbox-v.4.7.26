'use client'

import { useState, useEffect } from 'react'
import { Brain, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import ChainVisualization from './ChainVisualization'

interface PrerequisiteNode {
  concept: string
  effectiveMastery: number
  isStale: boolean
  isGap: boolean
  depth: number
  courseId?: string
  courseCode?: string
}

interface PrerequisiteChain {
  targetConcept: string
  targetMastery: number
  chain: PrerequisiteNode[]
  rootGap: {
    concept: string
    effectiveMastery: number
    recommendedAction: string
    recommendedToolId?: string
  } | null
  explanation: string
}

interface PrerequisiteUnpackerPanelProps {
  concept: string
  courseId: string
  onClose?: () => void
}

function formatConcept(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function PrerequisiteUnpackerPanel({
  concept,
  courseId,
  onClose,
}: PrerequisiteUnpackerPanelProps) {
  const { currentUser } = useAuth()
  const [state, setState] = useState<'loading' | 'loaded' | 'empty' | 'error'>('loading')
  const [data, setData] = useState<PrerequisiteChain | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setState('loading')
    setData(null)
    setErrorMsg('')

    fetch('/api/prerequisite-unpack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ concept, courseId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load prerequisite chain')
        return res.json() as Promise<PrerequisiteChain>
      })
      .then((chain) => {
        if (chain.chain.length === 0) {
          setState('empty')
        } else {
          setData(chain)
          setState('loaded')
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
        setState('error')
      })
  }, [concept, courseId, currentUser.email])

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Brain className="size-5 text-[#0033A0] shrink-0" />
        <h3 className="font-extrabold text-gray-900 text-sm flex-1 min-w-0 truncate">
          Prerequisite Trace — {formatConcept(concept)}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Close prerequisite panel"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Loading */}
        {state === 'loading' && (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-xl bg-gray-100" />
            <div className="h-6 w-0.5 mx-auto bg-gray-100" />
            <div className="h-16 rounded-xl bg-gray-100" />
            <div className="h-6 w-0.5 mx-auto bg-gray-100" />
            <div className="h-16 rounded-xl bg-gray-100" />
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        {/* Empty */}
        {state === 'empty' && (
          <p className="text-sm text-gray-500 italic">
            No prerequisite chain found for &ldquo;{formatConcept(concept)}&rdquo; yet. Keep practicing and your mastery data will help us trace connections.
          </p>
        )}

        {/* Loaded */}
        {state === 'loaded' && data && (
          <>
            {/* Chain visualization */}
            <ChainVisualization
              chain={data.chain}
              targetConcept={data.targetConcept}
              targetMastery={data.targetMastery}
              rootGapConcept={data.rootGap?.concept}
            />

            {/* AI explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 italic">{data.explanation}</p>
            </div>

            {/* Recommended path */}
            {data.rootGap && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-sm text-amber-900">Recommended Path</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                  <li>Review &ldquo;{formatConcept(data.rootGap.concept)}&rdquo;</li>
                  <li>Practice until mastery improves</li>
                  <li>Return to &ldquo;{formatConcept(data.targetConcept)}&rdquo;</li>
                </ol>
                {data.rootGap.recommendedToolId && (
                  <Link
                    href={`/tools/${data.rootGap.recommendedToolId}`}
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Start Review
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
