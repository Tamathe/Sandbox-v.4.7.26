'use client'

import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react'

export interface AgentWorkflowStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  summary?: string
}

interface WorkflowProgressProps {
  title: string
  steps: AgentWorkflowStep[]
}

/** Timeline view for multi-step workflows — shows sequence of tool calls with status icons. */
export default function WorkflowProgress({ title, steps }: WorkflowProgressProps) {
  if (steps.length === 0) return null

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-800">{title}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2">
            {step.status === 'completed' && <CheckCircle2 className="size-4 text-green-500 flex-shrink-0 mt-0.5" />}
            {step.status === 'running' && <Loader2 className="size-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />}
            {step.status === 'pending' && <Circle className="size-4 text-gray-300 flex-shrink-0 mt-0.5" />}
            {step.status === 'error' && <XCircle className="size-4 text-red-500 flex-shrink-0 mt-0.5" />}

            <div className="min-w-0 flex-1">
              <span className={`text-xs font-medium ${
                step.status === 'completed' ? 'text-gray-700' :
                step.status === 'running' ? 'text-blue-700' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-400'
              }`}>
                {step.label}
              </span>
              {step.summary && (
                <span className="text-[11px] text-gray-400 ml-1.5">— {step.summary}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
