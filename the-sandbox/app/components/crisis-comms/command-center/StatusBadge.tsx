'use client'

const INCIDENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INITIATED: { label: 'Initiated', className: 'bg-gray-100 text-gray-700' },
  ASSESSING: { label: 'Assessing', className: 'bg-blue-100 text-blue-800' },
  DRAFTING: { label: 'Drafting', className: 'bg-amber-100 text-amber-800' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
  CONTAINED: { label: 'Contained', className: 'bg-teal-100 text-teal-800' },
  CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
}

const DOCUMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  REVIEW: { label: 'Review', className: 'bg-amber-100 text-amber-800' },
  READY: { label: 'Ready', className: 'bg-green-100 text-green-800' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800' },
}

export function IncidentStatusBadge({ status }: { status: string }) {
  const config = INCIDENT_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const config = DOCUMENT_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}
