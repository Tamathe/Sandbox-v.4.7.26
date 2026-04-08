'use client'

import { Printer, X } from 'lucide-react'
import type { CourseMapWeek, CourseMapResult, CourseMapRubricResult } from './types'
import { BLOOM_LEVELS, BLOOM_LABELS, BLOOM_COLORS, MATERIAL_TYPE_LABELS, ASSIGNMENT_TYPE_LABELS, generatePrintLayout } from './types'

interface PrintPreviewProps {
  weeks: CourseMapWeek[]
  courseCode?: string
  metadata: CourseMapResult['metadata'] | null
  assignmentRubrics: Map<string, CourseMapRubricResult>
  onClose: () => void
}

export function PrintPreview({ weeks, courseCode, metadata, assignmentRubrics, onClose }: PrintPreviewProps) {
  return (
    <div className="print-preview space-y-4">
      <div className="flex items-center justify-between rounded-xl border-2 border-[#0033A0] bg-blue-50 px-4 py-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0033A0]">
            {courseCode ? `${courseCode} — ` : ''}Course Map
          </h3>
          <p className="text-xs text-gray-500">
            {weeks.length} weeks &middot; {weeks.reduce((s, w) => s + w.objectives.length, 0)} objectives &middot; {weeks.reduce((s, w) => s + w.assignments.length, 0)} assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { generatePrintLayout(weeks, courseCode, metadata, assignmentRubrics); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880]"
          >
            <Printer className="size-3.5" />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white"
          >
            <X className="size-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Bloom distribution summary */}
      {(() => {
        const counts: Record<string, number> = {}
        let tagged = 0
        let total = 0
        for (const w of weeks) {
          for (const o of w.objectives) {
            total++
            if (o.bloomLevel) {
              tagged++
              counts[o.bloomLevel] = (counts[o.bloomLevel] ?? 0) + 1
            }
          }
        }
        if (tagged === 0) return null
        return (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              Bloom&apos;s Taxonomy Distribution ({tagged}/{total} tagged)
            </p>
            <div className="flex flex-wrap gap-2">
              {BLOOM_LEVELS.map((bl) => {
                const c = counts[bl] ?? 0
                if (c === 0) return null
                return (
                  <span key={bl} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BLOOM_COLORS[bl]}`}>
                    {BLOOM_LABELS[bl]}: {c}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Print-friendly weeks */}
      {weeks.map((week) => (
        <div key={week.weekNumber} className="rounded-2xl border-2 border-gray-200 bg-white px-5 py-4" style={{ pageBreakInside: 'avoid' }}>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-xs font-bold text-white">
              Week {week.weekNumber}
            </span>
            <h4 className="text-sm font-extrabold text-gray-900">{week.title}</h4>
          </div>
          {week.topic && (
            <p className="mb-2 text-xs italic text-gray-500">{week.topic}</p>
          )}
          {(week.startDate || week.endDate) && (
            <p className="mb-2 text-xs text-gray-400">
              {week.startDate}{week.endDate ? ` — ${week.endDate}` : ''}
            </p>
          )}

          {week.objectives.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Objectives</p>
              <ol className="list-inside list-decimal space-y-0.5 pl-1">
                {week.objectives.map((obj, oIdx) => (
                  <li key={oIdx} className="text-sm text-gray-700">
                    {obj.title}
                    {obj.bloomLevel && (
                      <span className={`ml-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BLOOM_COLORS[obj.bloomLevel]}`}>
                        {BLOOM_LABELS[obj.bloomLevel]}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {week.materials.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Materials</p>
              <ul className="list-inside list-disc space-y-0.5 pl-1">
                {week.materials.map((m, mIdx) => (
                  <li key={mIdx} className="text-sm text-gray-700">
                    <span className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-500">{MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType}</span>{' '}
                    {m.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {week.assignments.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Assignments</p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                {week.assignments.map((a, aIdx) => {
                  const rubric = assignmentRubrics.get(`${week.weekNumber}-${aIdx}`)
                  return (
                    <li key={aIdx} className="text-sm text-gray-700">
                      <strong>{a.title}</strong>
                      <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-500">
                        {ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}
                      </span>
                      {a.pointsPossible != null && (
                        <span className="ml-1 text-xs text-gray-400">{a.pointsPossible} pts</span>
                      )}
                      {a.dueDate && (
                        <span className="ml-1 text-xs text-gray-400">Due: {a.dueDate}</span>
                      )}
                      {rubric && (
                        <div className="mt-1 ml-4 rounded border border-gray-200 bg-gray-50 p-1.5 text-[10px]">
                          <span className="font-bold text-gray-500">Rubric:</span>
                          {rubric.criteria.map((c, cIdx) => (
                            <span key={cIdx} className="ml-1 text-gray-600">{c.criterion} ({c.weight}%){cIdx < rubric.criteria.length - 1 ? ',' : ''}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {week.toolSuggestions.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Suggested Tools</p>
              <ul className="list-inside list-disc space-y-0.5 pl-1">
                {week.toolSuggestions.map((t, tIdx) => (
                  <li key={tIdx} className="text-sm text-gray-700">
                    <strong>{t.title}</strong> ({t.toolType})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
        University of Kentucky
      </div>
    </div>
  )
}
