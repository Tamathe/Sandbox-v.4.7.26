'use client'

import { Clock3, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import type { SandyTrustPanelData } from '../lib/provenance-types'

function formatTimestamp(value: string | null) {
  if (!value) return 'Unknown'

  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function statusClasses(status: SandyTrustPanelData['status']) {
  switch (status) {
    case 'allowed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'blocked':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

function StatusIcon({ status }: { status: SandyTrustPanelData['status'] }) {
  if (status === 'allowed') return <ShieldCheck className="size-3.5" />
  if (status === 'blocked') return <ShieldAlert className="size-3.5" />
  return <ShieldQuestion className="size-3.5" />
}

export default function TrustPanel({ data }: { data: SandyTrustPanelData }) {
  return (
    <details className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs text-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold ${statusClasses(data.status)}`}>
            <StatusIcon status={data.status} />
            Trust
          </span>
          <span className="truncate">{data.summary}</span>
        </div>
        <span className="text-[11px] text-slate-500">
          {data.sources.length} source{data.sources.length === 1 ? '' : 's'}
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-200 px-3 py-3">
        {data.sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            No approved sources were attached to this reply.
          </div>
        ) : (
          data.sources.map((source) => (
            <div key={`${source.kind}-${source.id}`} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{source.title}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {source.provenanceType}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  source.allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {source.allowed ? 'Allowed' : 'Restricted'}
                </span>
              </div>

              <div className="mt-2 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-slate-500">Source</div>
                  <div>{source.sourceSystemLabel}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Permission basis</div>
                  <div>{source.approvalBasisLabel}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Access scope</div>
                  <div>{source.accessScopeLabel}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Opt-in</div>
                  <div>{source.optInStatusLabel}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Course</div>
                  <div>{source.courseCode ? `${source.courseCode} · ${source.courseTitle ?? 'Course'}` : 'Not course-bound'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Uploader</div>
                  <div>{source.uploaderName ? `${source.uploaderName}${source.uploaderRole ? ` (${source.uploaderRole})` : ''}` : 'System or instructor-managed'}</div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {source.permissionBasis.map((entry) => (
                  <div
                    key={entry.code}
                    className={`rounded-xl px-2.5 py-2 text-[11px] ${
                      entry.status === 'allowed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : entry.status === 'blocked'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{entry.label}</div>
                    <div>{entry.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
                <Clock3 className="size-3.5" />
                Last updated {formatTimestamp(source.lastUpdatedAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  )
}
