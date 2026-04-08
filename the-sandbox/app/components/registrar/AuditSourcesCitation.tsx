'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AuditSource } from '../../lib/registrar/types'

interface AuditSourcesCitationProps {
  sources: AuditSource[]
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  CATALOG: 'Degree Catalog',
  TRANSCRIPT: 'Academic Transcript',
  TRANSFER: 'Transfer Credit File',
  ENROLLMENT: 'Current Enrollment',
  STAFF_OVERRIDE: 'Staff Override',
}

export function AuditSourcesCitation({ sources }: AuditSourcesCitationProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        How was this determined? ({sources.length} source{sources.length !== 1 ? 's' : ''})
      </button>
      {open && (
        <ul className="mt-2 space-y-1 pl-4 border-l-2 border-blue-100">
          {sources.map((source, i) => (
            <li key={i} className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">{SOURCE_TYPE_LABELS[source.type] ?? source.type}:</span>{' '}
              {source.description}
              {source.courseCode && <span className="ml-1 text-gray-400">({source.courseCode})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
