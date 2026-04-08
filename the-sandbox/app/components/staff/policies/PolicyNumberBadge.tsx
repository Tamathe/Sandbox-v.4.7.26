'use client'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'HR & Employment':            { bg: 'bg-blue-100',    text: 'text-blue-700' },
  'Finance & Procurement':      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Academic & Compliance':      { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'Facilities & Operations':    { bg: 'bg-amber-100',   text: 'text-amber-700' },
  'Student Affairs':            { bg: 'bg-rose-100',    text: 'text-rose-700' },
  'IT & Data':                  { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  'Governance':                 { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  'Administrative Regulation':  { bg: 'bg-slate-100',   text: 'text-slate-700' },
}

interface PolicyNumberBadgeProps {
  policyNumber: string
  category?: string
  className?: string
}

export default function PolicyNumberBadge({ policyNumber, category, className = '' }: PolicyNumberBadgeProps) {
  const colors = (category && CATEGORY_COLORS[category]) || { bg: 'bg-gray-100', text: 'text-gray-700' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${colors.bg} ${colors.text} ${className}`}>
      {policyNumber}
    </span>
  )
}
