'use client'

import { useState, useCallback } from 'react'
import {
  X,
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  EyeOff,
  Loader2,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import {
  runFullAnalysis,
  recommendRelatedResources,
  type Suggestion,
  type AnalysisResult,
  type SuggestionCategory,
} from '../../lib/course-map/smart-suggestions-engine'
import { getContextSummary } from '../../lib/course-map/teaching-assistant-service'

// ── Props ────────────────────────────────────────────────────────────────────

interface GraphMap {
  id: string
  nodes: { id: string; label: string; nodeType: string; courseUnitId: string | null }[]
  edges: { fromNodeId: string; toNodeId: string; edgeType: string }[]
  units: {
    id: string
    label: string
    description: string | null
    modules: { label: string; description?: string | null; lessons: { label: string }[] }[]
  }[]
}

interface SmartSuggestionsPanelProps {
  graphMap: GraphMap
  userEmail: string
  onClose: () => void
  onSelectNode?: (nodeId: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<SuggestionCategory, { label: string; icon: typeof AlertTriangle }> = {
  prerequisites: { label: 'Missing Prerequisites', icon: AlertTriangle },
  ordering: { label: 'Ordering Issues', icon: RefreshCw },
  'content-gaps': { label: 'Content Gaps', icon: AlertCircle },
  resources: { label: 'Recommended Resources', icon: BookOpen },
}

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconClass: 'text-red-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, iconClass: 'text-amber-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconClass: 'text-blue-500' },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SmartSuggestionsPanel({
  graphMap,
  userEmail,
  onClose,
  onSelectNode,
}: SmartSuggestionsPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true)
    // Run client-side analysis
    const analysis = runFullAnalysis(graphMap)

    // Optionally fetch AI-enhanced resource suggestions for first few nodes
    setLoadingResources(true)
    const contextSummary = getContextSummary(graphMap)
    const resourceSuggestions: Suggestion[] = []
    const nodesToCheck = graphMap.nodes.slice(0, 3)
    for (const node of nodesToCheck) {
      const resources = await recommendRelatedResources(node.label, contextSummary, userEmail)
      resourceSuggestions.push(...resources)
    }
    setLoadingResources(false)

    const allSuggestions = [...analysis.suggestions, ...resourceSuggestions]
    const stats = {
      total: allSuggestions.length,
      critical: allSuggestions.filter((s) => s.severity === 'critical').length,
      warning: allSuggestions.filter((s) => s.severity === 'warning').length,
      info: allSuggestions.filter((s) => s.severity === 'info').length,
    }

    setResult({ suggestions: allSuggestions, stats })
    setSuggestions(allSuggestions)
    setAnalyzing(false)
  }, [graphMap, userEmail])

  const handleApply = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, applied: true, dismissed: false } : s))
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, dismissed: true } : s))
  }, [])

  const visibleSuggestions = suggestions.filter((s) => !s.dismissed)
  const appliedCount = suggestions.filter((s) => s.applied).length

  // Group by category
  const grouped = visibleSuggestions.reduce<Record<string, Suggestion[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div className="fixed right-0 top-0 z-[70] flex h-full w-96 flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900">Smart Suggestions</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      {/* Stats bar */}
      {result && (
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2">
          <span className="text-xs font-semibold text-gray-600">{result.stats.total} issues found</span>
          <div className="flex items-center gap-2 text-xs">
            {result.stats.critical > 0 && (
              <span className="flex items-center gap-0.5 text-red-600">
                <AlertTriangle className="size-3" /> {result.stats.critical}
              </span>
            )}
            {result.stats.warning > 0 && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <AlertCircle className="size-3" /> {result.stats.warning}
              </span>
            )}
            {result.stats.info > 0 && (
              <span className="flex items-center gap-0.5 text-blue-600">
                <Info className="size-3" /> {result.stats.info}
              </span>
            )}
          </div>
          {appliedCount > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-xs text-green-600">
              <CheckCircle2 className="size-3" /> {appliedCount} applied
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!result && !analyzing && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-50">
              <Zap className="size-8 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Analyze Your Course Map</p>
              <p className="mt-1 text-xs text-gray-500">
                Run a full scan to detect missing prerequisites, content gaps, ordering issues, and get resource recommendations.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              <Zap className="size-4" />
              Run Analysis
            </button>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <p className="text-sm font-semibold text-gray-700">
              {loadingResources ? 'Fetching AI recommendations...' : 'Analyzing course structure...'}
            </p>
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => {
              const meta = CATEGORY_META[category as SuggestionCategory]
              if (!meta) return null
              const Icon = meta.icon
              return (
                <div key={category}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="size-4 text-gray-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">{meta.label}</h4>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((s) => {
                      const style = SEVERITY_STYLES[s.severity]
                      const SevIcon = style.icon
                      return (
                        <div key={s.id} className={`rounded-xl border ${style.border} ${s.applied ? 'bg-green-50 border-green-200' : style.bg} p-3`}>
                          <div className="flex items-start gap-2">
                            {s.applied
                              ? <CheckCircle2 className="size-4 shrink-0 text-green-500 mt-0.5" />
                              : <SevIcon className={`size-4 shrink-0 mt-0.5 ${style.iconClass}`} />
                            }
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${s.applied ? 'text-green-700' : 'text-gray-800'}`}>{s.title}</p>
                              <p className="mt-0.5 text-xs text-gray-600">{s.description}</p>
                              {!s.applied && (
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => handleApply(s.id)}
                                    className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={() => handleDismiss(s.id)}
                                    className="flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    <EyeOff className="size-3" /> Dismiss
                                  </button>
                                  {s.nodeId && onSelectNode && (
                                    <button
                                      onClick={() => onSelectNode(s.nodeId!)}
                                      className="ml-auto text-xs text-[#0033A0] hover:underline"
                                    >
                                      Go to node
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {visibleSuggestions.length === 0 && (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto size-10 text-green-400" />
                <p className="mt-2 text-sm font-semibold text-gray-700">All clear!</p>
                <p className="text-xs text-gray-500">No remaining suggestions.</p>
              </div>
            )}

            {/* Re-run button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={runAnalysis}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw className="size-3.5" />
                Re-run Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
