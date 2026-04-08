'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import type {
  DivergenceParticipantPath,
  DivergenceTreeNode,
} from '../../lib/assessment/types'

interface DivergenceTreeProps {
  tree: DivergenceTreeNode
  participants: Array<Pick<DivergenceParticipantPath, 'userId' | 'name' | 'coherenceScore'>>
  keyDecisionPoints: Array<{ turn: number; divergenceScore: number }>
  selectedUserId?: string | null
  onSelectUser?: (userId: string) => void
}

function divergenceTone(score: number) {
  if (score >= 0.75) return 'border-red-200 bg-red-50 text-red-700'
  if (score >= 0.5) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (score >= 0.25) return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-gray-200 bg-gray-50 text-gray-600'
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`
}

function TreeNodeView({
  node,
  selectedUserId,
  divergenceByTurn,
  depth = 0,
}: {
  node: DivergenceTreeNode
  selectedUserId?: string | null
  divergenceByTurn: Map<number, number>
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const turnDivergence = divergenceByTurn.get(node.turn) ?? 0

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left"
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <span className="mt-0.5 text-gray-400">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Turn {node.turn}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${divergenceTone(turnDivergence)}`}
            >
              Divergence {percentLabel(turnDivergence)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-700">{node.prompt || 'Prompt unavailable'}</p>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {node.branches.map((branch, index) => {
            const isSelected = selectedUserId
              ? branch.participantIds.includes(selectedUserId)
              : false

            return (
              <div
                key={`${node.turn}-${index}-${branch.choice}`}
                className={`rounded-xl border px-4 py-3 ${
                  isSelected
                    ? 'border-[#0033A0] bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                style={{ marginLeft: `${depth * 18 + 22}px` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <GitBranch className={`size-4 ${isSelected ? 'text-[#0033A0]' : 'text-gray-400'}`} />
                  <span className="text-sm font-semibold text-gray-800">{branch.choice}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {branch.participantIds.length} participant
                    {branch.participantIds.length === 1 ? '' : 's'}
                  </span>
                </div>
                {branch.childNode ? (
                  <div className="mt-3">
                    <TreeNodeView
                      node={branch.childNode}
                      selectedUserId={selectedUserId}
                      divergenceByTurn={divergenceByTurn}
                      depth={depth + 1}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DivergenceTree({
  tree,
  participants,
  keyDecisionPoints,
  selectedUserId,
  onSelectUser,
}: DivergenceTreeProps) {
  const divergenceByTurn = new Map(
    keyDecisionPoints.map((point) => [point.turn, point.divergenceScore])
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => {
          const isSelected = participant.userId === selectedUserId
          return (
            <button
              key={participant.userId}
              type="button"
              onClick={() => onSelectUser?.(participant.userId)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isSelected
                  ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]/30 hover:text-[#0033A0]'
              }`}
            >
              {participant.name} · {percentLabel(participant.coherenceScore)}
            </button>
          )
        })}
      </div>

      <TreeNodeView
        node={tree}
        selectedUserId={selectedUserId}
        divergenceByTurn={divergenceByTurn}
      />
    </div>
  )
}
