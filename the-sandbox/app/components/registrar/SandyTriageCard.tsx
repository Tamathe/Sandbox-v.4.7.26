'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import type { TriageInsight } from '../../lib/registrar/triage-intelligence'

interface SandyTriageCardProps {
  insights: TriageInsight[] | null
  loading: boolean
  onRefresh: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

const SEVERITY_ICON_COLORS: Record<string, string> = {
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}

function SeverityIcon({ severity }: { severity: string }) {
  const className = `size-5 ${SEVERITY_ICON_COLORS[severity] || 'text-gray-500'}`
  switch (severity) {
    case 'success':
      return <CheckCircle className={className} />
    case 'warning':
      return <AlertTriangle className={className} />
    case 'danger':
      return <AlertCircle className={className} />
    case 'info':
      return <TrendingUp className={className} />
    default:
      return <TrendingUp className={className} />
  }
}

function SkeletonCard() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex gap-3 animate-pulse">
      <div className="w-1 rounded-full bg-gray-200 shrink-0" />
      <div className="size-5 rounded-full bg-gray-200 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function SandyTriageCard({ insights, loading, onRefresh }: SandyTriageCardProps) {
  const [showAll, setShowAll] = useState(false)
  const displayInsights = !showAll && insights ? insights.slice(0, 4) : insights

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center">
            <Bot className="size-4 text-white" />
          </div>
          <h2 className="font-extrabold text-gray-900">Sandy&apos;s Registrar Briefing</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Refresh insights"
        >
          <RefreshCw className={`size-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && insights && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="size-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-gray-700">All clear — no urgent items</p>
          </div>
        )}

        {!loading &&
          displayInsights &&
          displayInsights.length > 0 &&
          displayInsights.map((insight) => (
            <div key={insight.id} className="bg-gray-50 rounded-xl p-4 flex gap-3">
              {/* Left color bar */}
              <div
                className={`w-1 rounded-full shrink-0 ${SEVERITY_COLORS[insight.severity] || 'bg-gray-300'}`}
              />

              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                <SeverityIcon severity={insight.severity} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{insight.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
                {insight.actionLabel && insight.actionHref && (
                  <Link
                    href={insight.actionHref}
                    className="text-xs font-medium text-[#0033A0] hover:underline flex items-center gap-1 mt-2"
                  >
                    {insight.actionLabel}
                    <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}

        {!loading && insights && insights.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAll ? 'Show fewer' : `Show all ${insights.length} insights`}
          </button>
        )}
      </div>
    </div>
  )
}
