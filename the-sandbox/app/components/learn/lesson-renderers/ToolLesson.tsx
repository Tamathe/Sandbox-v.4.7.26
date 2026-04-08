'use client'

import Link from 'next/link'

type Props = { contentRef: { toolId?: string } }

export default function ToolLesson({ contentRef }: Props) {
  if (!contentRef?.toolId) {
    return <p className="text-sm text-slate-500">No tool linked to this lesson.</p>
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Linked Tool</h3>
      <p className="mt-2 text-sm text-slate-600">
        Open this tool from the marketplace to complete the activity. Your session will be tracked
        against this lesson.
      </p>
      <Link
        href={`/tools/${contentRef.toolId}`}
        className="mt-4 inline-flex items-center rounded-full bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#002577]"
      >
        Launch tool →
      </Link>
    </div>
  )
}
