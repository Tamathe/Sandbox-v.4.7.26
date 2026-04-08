'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Database, Gauge, Settings2, AlertTriangle } from 'lucide-react'
import type { SandyTraceClient } from './SandyAmbientContext'

/** Human-friendly labels for data sources */
const SOURCE_LABELS: Record<string, string> = {
  'user-profile': 'Your profile',
  'tools-catalog': 'Published tools',
  'course-materials': 'Course materials',
  'recent-sessions': 'Recent sessions',
  'sandy-preferences': 'Your Sandy preferences',
  'conversation-memory': 'Conversation memory',
  'tool-detail': 'Current tool info',
  'student-intelligence': 'Academic status',
  'spaced-repetition': 'Flashcard schedule',
  'frustration-detection': 'Session difficulty',
  'study-plan': 'Study plan',
  'weekly-recap': 'Weekly progress',
  'exam-forge': 'Upcoming exams',
  'email-intelligence': 'Email insights',
  'department-storefront': 'Department info',
  'university-systems': 'University systems',
  'engagement-fingerprint': 'Learning profile',
  'messages-context': 'Message threads',
  'proactive-suggestions': 'Suggestions engine',
  'on-demand-briefing': 'Schedule & tasks',
  'morning-briefing': 'Morning briefing',
  'bloom-alert': 'Learning depth alert',
  'this-week-courses': 'This week\'s coursework',
}

export default function SandyTracePanel({ trace }: { trace: SandyTraceClient }) {
  const [expanded, setExpanded] = useState(false)

  const tokenPct = Math.min(100, Math.round((trace.totalTokens / 12000) * 100))
  const tokenColor = tokenPct > 80 ? 'bg-amber-500' : tokenPct > 50 ? 'bg-blue-500' : 'bg-emerald-500'

  return (
    <div className="mx-3 mb-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Database className="size-3" />
        <span>What Sandy knows</span>
        <span className="ml-auto text-gray-400">{trace.dataSources.length} sources</span>
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      {expanded && (
        <div className="mt-1 rounded-xl border border-gray-200 bg-white p-3 space-y-3 text-xs">
          {/* Token budget meter */}
          <div>
            <div className="flex items-center gap-1.5 text-gray-600 mb-1">
              <Gauge className="size-3" />
              <span className="font-medium">Context budget</span>
              <span className="ml-auto">{trace.totalTokens.toLocaleString()} / 12,000 tokens</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${tokenColor} transition-all`} style={{ width: `${tokenPct}%` }} />
            </div>
          </div>

          {/* Trimming warning */}
          {trace.wasTrimmed && trace.droppedSections.length > 0 && (
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800">
              <AlertTriangle className="size-3 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Budget trimmed</span>
                <span className="text-amber-600"> — dropped: {trace.droppedSections.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Preferences */}
          {Object.keys(trace.preferences).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                <Settings2 className="size-3" />
                <span className="font-medium">Your preferences</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {trace.preferences.tone && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                    Tone: {trace.preferences.tone}
                  </span>
                )}
                {trace.preferences.proactivity && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                    Proactivity: {trace.preferences.proactivity}
                  </span>
                )}
                {trace.preferences.responseLength && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                    Length: {trace.preferences.responseLength}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Data sources */}
          <div>
            <div className="flex items-center gap-1.5 text-gray-600 mb-1">
              <Database className="size-3" />
              <span className="font-medium">Data sources ({trace.dataSources.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {trace.dataSources.map((src) => (
                <span
                  key={src}
                  className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-200"
                >
                  {SOURCE_LABELS[src] ?? src}
                </span>
              ))}
            </div>
          </div>

          {/* Prompt sections */}
          <div>
            <div className="text-gray-600 font-medium mb-1">Prompt sections ({trace.sections.length})</div>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {trace.sections.map((name) => (
                <div key={name} className="text-gray-500 truncate">• {name}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
