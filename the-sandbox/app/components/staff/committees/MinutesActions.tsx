'use client'

import { Mail, CheckCircle2, ListChecks, Download, Loader2 } from 'lucide-react'

interface MinutesActionsProps {
  meetingId: string
  status: string
  onDistribute: (meetingId: string) => void
  onFinalize: (meetingId: string) => void
  onCreateActionItems: (meetingId: string) => void
  onDownload: (meetingId: string) => void
  distributing?: boolean
  finalizing?: boolean
  creatingActions?: boolean
}

export default function MinutesActions({
  meetingId,
  status,
  onDistribute,
  onFinalize,
  onCreateActionItems,
  onDownload,
  distributing,
  finalizing,
  creatingActions,
}: MinutesActionsProps) {
  const isFinalized = status === 'finalized'

  const actions = [
    {
      label: 'Distribute',
      icon: distributing ? Loader2 : Mail,
      onClick: () => onDistribute(meetingId),
      disabled: distributing,
      spinning: distributing,
      variant: 'primary' as const,
    },
    {
      label: isFinalized ? 'Finalized' : 'Finalize',
      icon: finalizing ? Loader2 : CheckCircle2,
      onClick: () => onFinalize(meetingId),
      disabled: isFinalized || finalizing,
      spinning: finalizing,
      variant: isFinalized ? ('success' as const) : ('default' as const),
    },
    {
      label: 'Review Action Items',
      icon: creatingActions ? Loader2 : ListChecks,
      onClick: () => onCreateActionItems(meetingId),
      disabled: creatingActions,
      spinning: creatingActions,
      variant: 'default' as const,
    },
    {
      label: 'Download',
      icon: Download,
      onClick: () => onDownload(meetingId),
      disabled: false,
      spinning: false,
      variant: 'default' as const,
    },
  ]

  const variantClasses = {
    primary: 'bg-[#0033A0] text-white hover:bg-[#002580]',
    success: 'bg-green-600 text-white cursor-default',
    default: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              variantClasses[action.variant]
            } ${action.disabled && action.variant !== 'success' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className={`size-3.5 ${action.spinning ? 'animate-spin' : ''}`} />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
