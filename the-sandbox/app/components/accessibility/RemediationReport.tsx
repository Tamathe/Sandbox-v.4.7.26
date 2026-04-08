'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Shield,
  Wrench,
  XCircle,
} from 'lucide-react'
import type { DocumentIssue, DocumentScanResult } from '../../lib/accessibility/types'
import AccessibilityScore from './AccessibilityScore'

// ── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { icon: typeof XCircle; bg: string; text: string; border: string }> = {
  critical: { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  major: { icon: AlertTriangle, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  minor: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
}

// ── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: DocumentIssue }) {
  const [expanded, setExpanded] = useState(false)
  const style = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.minor
  const Icon = style.icon

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <Icon className={`mt-0.5 size-4 flex-shrink-0 ${style.text}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${style.text}`}>
              {issue.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.text} ${style.bg}`}>
              {issue.severity}
            </span>
            {issue.autoFixable && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                Auto-fixable
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-600">{issue.description}</p>
        </div>
        {expanded ? (
          <ChevronDown className="mt-1 size-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="mt-1 size-4 flex-shrink-0 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200/50 px-4 py-3 space-y-2">
          <div className="text-xs">
            <span className="font-semibold text-gray-700">Location:</span>{' '}
            <span className="text-gray-600">{issue.location}</span>
          </div>
          <div className="text-xs">
            <span className="font-semibold text-gray-700">WCAG:</span>{' '}
            <span className="text-gray-600">{issue.wcagCriteria}</span>
          </div>
          <div className="rounded-lg bg-white/60 p-3 text-xs text-gray-700">
            <span className="font-semibold">Suggestion:</span> {issue.suggestion}
          </div>
          {issue.autoFix && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700">
              <Wrench className="size-3.5" />
              <span className="font-semibold">Auto-fix:</span> {issue.autoFix}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Structure summary ────────────────────────────────────────────────────────

function StructureSummary({ structure }: { structure: DocumentScanResult['structure'] }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <div className="text-lg font-bold text-gray-900">{structure.headings.length}</div>
        <div className="text-gray-500">Headings</div>
        {structure.headingHierarchyValid ? (
          <CheckCircle2 className="mx-auto mt-1 size-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="mx-auto mt-1 size-3.5 text-amber-500" />
        )}
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <div className="text-lg font-bold text-gray-900">{structure.tables.length}</div>
        <div className="text-gray-500">Tables</div>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <div className="text-lg font-bold text-gray-900">{structure.images.length}</div>
        <div className="text-gray-500">Images</div>
        {structure.images.length > 0 && (
          <span className={`text-[10px] ${structure.images.every((i) => i.hasAltText) ? 'text-green-600' : 'text-red-600'}`}>
            {structure.images.filter((i) => i.hasAltText).length}/{structure.images.length} with alt
          </span>
        )}
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <div className="text-lg font-bold text-gray-900">{structure.links.length}</div>
        <div className="text-gray-500">Links</div>
        {structure.links.length > 0 && (
          <span className={`text-[10px] ${structure.links.every((l) => l.isDescriptive) ? 'text-green-600' : 'text-amber-600'}`}>
            {structure.links.filter((l) => l.isDescriptive).length}/{structure.links.length} descriptive
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface RemediationReportProps {
  result: DocumentScanResult
  materialTitle?: string
}

/**
 * Full accessibility scan report with issue list, structure summary,
 * and remediation guidance. Used on course material detail views.
 */
export default function RemediationReport({ result, materialTitle }: RemediationReportProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'major' | 'minor' | 'auto-fixable'>('all')

  const filteredIssues = result.issues.filter((issue) => {
    if (filter === 'all') return true
    if (filter === 'auto-fixable') return issue.autoFixable
    return issue.severity === filter
  })

  const criticalCount = result.issues.filter((i) => i.severity === 'critical').length
  const majorCount = result.issues.filter((i) => i.severity === 'major').length
  const minorCount = result.issues.filter((i) => i.severity === 'minor').length

  return (
    <div className="space-y-5">
      {/* Header with score */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">
            <Shield className="mr-2 inline size-5 text-[#0033A0]" />
            Accessibility Report
          </h3>
          {materialTitle && (
            <p className="mt-0.5 text-sm text-gray-500">{materialTitle}</p>
          )}
        </div>
        <AccessibilityScore
          grade={result.overallGrade}
          score={result.overallScore}
          issueCount={result.issues.length}
          size="lg"
        />
      </div>

      {/* Structure summary */}
      <StructureSummary structure={result.structure} />

      {/* Issue counts strip */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({result.issues.length})
        </button>
        {criticalCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter('critical')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            Critical ({criticalCount})
          </button>
        )}
        {majorCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter('major')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'major' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
          >
            Major ({majorCount})
          </button>
        )}
        {minorCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter('minor')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'minor' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            Minor ({minorCount})
          </button>
        )}
        {result.autoFixable > 0 && (
          <button
            type="button"
            onClick={() => setFilter('auto-fixable')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'auto-fixable' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            Auto-fixable ({result.autoFixable})
          </button>
        )}
      </div>

      {/* Issue list */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 py-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-green-500" />
          <p className="text-sm font-semibold text-green-700">
            {result.issues.length === 0 ? 'No accessibility issues detected' : 'No issues match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {/* Readability summary footer */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Readability</span>
          <span className="text-xs text-gray-500">{result.readability.summary}</span>
        </div>
      </div>
    </div>
  )
}
