'use client'

import { format } from 'date-fns'
import { FileSignature, FileText, Pen, Plus } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'
import StudentSnapshot from './StudentSnapshot'

interface RecommendationTableProps {
  recommendations: FacultyHomepageV2Data['recommendations']
}

function getDueBadge(daysUntilDue: number) {
  if (daysUntilDue < 7) {
    return {
      className: 'bg-red-100 text-red-700',
      label: daysUntilDue < 0 ? 'Overdue' : daysUntilDue === 0 ? 'Today' : `${daysUntilDue} days`,
    }
  }

  if (daysUntilDue <= 14) {
    return {
      className: 'bg-amber-100 text-amber-700',
      label: `${daysUntilDue} days`,
    }
  }

  return {
    className: 'bg-emerald-100 text-emerald-700',
    label: `${daysUntilDue} days`,
  }
}

function openSandyWithContext(action: { tool: string; message: string }) {
  window.dispatchEvent(
    new CustomEvent('uky-sandy-tool', {
      detail: { tool: action.tool, message: action.message },
    }),
  )
  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: { message: action.message, autoSend: true },
    }),
  )
}

function openRecommendationDraft() {
  openSandyWithContext({
    tool: 'draft_recommendation',
    message: 'Start a recommendation letter request and ask me for the student, purpose, target organization, and any faculty notes.',
  })
}

function resumeDraft(rec: FacultyHomepageV2Data['recommendations'][number]) {
  openSandyWithContext({
    tool: 'draft_recommendation',
    message: `Resume my recommendation draft for ${rec.studentName} (${rec.purpose}, ${rec.targetOrg}). The request ID is ${rec.id}. Load the existing draft and help me continue refining it.`,
  })
}

export default function RecommendationTable({ recommendations }: RecommendationTableProps) {
  return (
    <section id="faculty-recommendations" className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <FileSignature className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-gray-900">Recommendation Letters</h3>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                {recommendations.length} active
              </span>
            </div>
            <p className="text-sm text-gray-500">Deadlines, targets, and the next drafts waiting on you.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openRecommendationDraft}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:bg-[#0033A0] hover:text-white"
        >
          <Plus className="size-4" />
          New request
        </button>
      </div>

      {recommendations.length === 0 ? (
        <p className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No active recommendation requests.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                <th className="pb-3 pr-6">Student</th>
                <th className="pb-3 pr-6">Purpose</th>
                <th className="pb-3 pr-6">Target</th>
                <th className="pb-3 pr-6">Due</th>
                <th className="pb-3 pr-0">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => {
                const dueBadge = getDueBadge(recommendation.daysUntilDue)
                const draft = recommendation.draft
                const isInProgress = recommendation.status === 'IN_PROGRESS'

                return (
                  <tr key={recommendation.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-4 pr-6">
                      <div className="min-w-[180px]">
                        <p className="text-sm font-semibold text-gray-900">{recommendation.studentName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-400">
                          {recommendation.status.replace('_', ' ')}
                        </p>
                        <StudentSnapshot
                          studentName={recommendation.studentName}
                          studentId={recommendation.id}
                          purpose={recommendation.purpose}
                          targetOrg={recommendation.targetOrg}
                        />
                      </div>
                    </td>
                    <td className="py-4 pr-6">
                      <p className="min-w-[150px] text-sm italic text-gray-700">{recommendation.purpose}</p>
                    </td>
                    <td className="py-4 pr-6">
                      <p className="min-w-[160px] text-sm font-medium text-gray-700">{recommendation.targetOrg}</p>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="min-w-[170px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {format(new Date(recommendation.dueDate), 'MMM d')}
                        </p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dueBadge.className}`}>
                          {dueBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-0">
                      <div className="flex min-w-[180px] flex-col gap-2">
                        {/* Resume draft — visible when IN_PROGRESS with a draft */}
                        {isInProgress && (
                          <button
                            type="button"
                            onClick={() => resumeDraft(recommendation)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0]/10"
                          >
                            <Pen className="size-3" />
                            Resume draft
                          </button>
                        )}

                        {/* Draft metadata */}
                        {draft && (
                          <div className="text-xs text-gray-400">
                            <span>v{draft.version}</span>
                            <span className="mx-1">&middot;</span>
                            <span>{draft.wordCount} words</span>
                            <span className="mx-1">&middot;</span>
                            <span>{format(new Date(draft.lastEditedAt), 'MMM d')}</span>
                          </div>
                        )}

                        {/* OneDrive link — grayed out stub */}
                        {draft?.oneDriveUrl ? (
                          <a
                            href={draft.oneDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                          >
                            <FileText className="size-3" />
                            Open in OneDrive
                          </a>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                            <FileText className="size-3" />
                            OneDrive (coming soon)
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
