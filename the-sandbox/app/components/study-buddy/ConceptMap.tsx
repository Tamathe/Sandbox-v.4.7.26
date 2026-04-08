'use client'

import { useState, useEffect } from 'react'
import { Loader2, Circle } from 'lucide-react'

interface ConceptNode {
  id: string
  label: string
  type: string
  description: string | null
  mastery: number | null
  isStale: boolean
  isDue: boolean
  bloomHighWater: number | null
}

interface ConceptEdge {
  fromId: string
  toId: string
  relation: string
  weight: number
}

interface ConceptMapProps {
  toolId: string
  courseId: string
  userEmail: string
}

const RELATION_LABELS: Record<string, string> = {
  depends_on: 'depends on',
  is_type_of: 'is a type of',
  contradicts: 'contradicts',
  precedes: 'comes before',
  exemplifies: 'is an example of',
}

function masteryColor(m: number | null): string {
  if (m == null) return 'bg-gray-200 border-gray-300'
  if (m >= 0.7) return 'bg-emerald-100 border-emerald-400'
  if (m >= 0.4) return 'bg-amber-100 border-amber-400'
  return 'bg-red-100 border-red-400'
}

function masteryTextColor(m: number | null): string {
  if (m == null) return 'text-gray-500'
  if (m >= 0.7) return 'text-emerald-700'
  if (m >= 0.4) return 'text-amber-700'
  return 'text-red-700'
}

export default function ConceptMap({ toolId, courseId, userEmail }: ConceptMapProps) {
  const [nodes, setNodes] = useState<ConceptNode[]>([])
  const [edges, setEdges] = useState<ConceptEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/study/${toolId}/concept-map?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.ok ? r.json() : { nodes: [], edges: [] })
      .then(data => {
        setNodes(data.nodes ?? [])
        setEdges(data.edges ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [toolId, courseId, userEmail])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No concept graph data yet. Study more to build your knowledge map.
      </div>
    )
  }

  // Find connections for the selected node
  const selectedEdges = selectedNode
    ? edges.filter(e => e.fromId === selectedNode || e.toId === selectedNode)
    : []
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.fromId, e.toId]))

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Circle className="size-2.5 fill-emerald-400 text-emerald-400" /> Mastered
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Circle className="size-2.5 fill-amber-400 text-amber-400" /> Partial
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Circle className="size-2.5 fill-red-400 text-red-400" /> Weak
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Circle className="size-2.5 fill-gray-300 text-gray-300" /> Not seen
        </div>
      </div>

      {/* Node grid */}
      <div className="flex flex-wrap gap-2">
        {nodes.map(node => {
          const isSelected = selectedNode === node.id
          const isConnected = connectedIds.has(node.id)
          const dimmed = selectedNode && !isSelected && !isConnected

          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(isSelected ? null : node.id)}
              className={`relative px-3 py-2 rounded-xl border-2 text-left transition-all ${masteryColor(node.mastery)} ${
                isSelected ? 'ring-2 ring-[#0033A0] ring-offset-1 scale-105' :
                dimmed ? 'opacity-30' : 'hover:scale-[1.02]'
              }`}
              style={{ minWidth: 90 }}
            >
              {node.isDue && (
                <span className="absolute -top-1 -right-1 size-2.5 bg-red-500 rounded-full animate-pulse" title="Due for review" />
              )}
              <p className={`text-[11px] font-semibold leading-tight ${masteryTextColor(node.mastery)}`}>
                {node.label}
                {node.isStale && ' ⏳'}
              </p>
              {node.mastery != null && (
                <p className={`text-[9px] mt-0.5 ${masteryTextColor(node.mastery)}`}>
                  {Math.round(node.mastery * 100)}%
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Connection details for selected node */}
      {selectedNode && selectedEdges.length > 0 && (() => {
        const node = nodes.find(n => n.id === selectedNode)
        if (!node) return null
        return (
          <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-[11px] font-semibold text-gray-800 mb-1">{node.label}</p>
            {node.description && (
              <p className="text-[10px] text-gray-500 mb-2 leading-snug">{node.description}</p>
            )}
            <div className="space-y-1">
              {selectedEdges.map((e, i) => {
                const other = nodes.find(n => n.id === (e.fromId === selectedNode ? e.toId : e.fromId))
                if (!other) return null
                const isOutgoing = e.fromId === selectedNode
                return (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    <span className={`font-medium ${masteryTextColor(node.mastery)}`}>{node.label}</span>
                    <span className="text-gray-400">{isOutgoing ? '→' : '←'}</span>
                    <span className="text-gray-400 italic">{RELATION_LABELS[e.relation] || e.relation}</span>
                    <span className="text-gray-400">{isOutgoing ? '→' : '←'}</span>
                    <span className={`font-medium ${masteryTextColor(other.mastery)}`}>{other.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
