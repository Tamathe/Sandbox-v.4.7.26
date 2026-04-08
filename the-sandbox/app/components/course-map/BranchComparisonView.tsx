'use client'

import { useState } from 'react'
import {
  GitCompare,
  X,
  Plus,
  Minus,
  Pencil,
  Layers,
  SplitSquareHorizontal,
  ArrowLeftRight,
} from 'lucide-react'
import type { BranchInfo } from '../../lib/course-map/branch-service'
import type { BranchDiffResult, BranchNodeData } from '../../lib/course-map/branch-service'

interface BranchComparisonViewProps {
  branchA: BranchInfo
  branchB: BranchInfo
  diff: BranchDiffResult
  loading: boolean
  onClose: () => void
  onMerge: (sourceBranchId: string, targetBranchId: string) => void
}

type ViewMode = 'overlay' | 'split'

export default function BranchComparisonView({
  branchA,
  branchB,
  diff,
  loading,
  onClose,
  onMerge,
}: BranchComparisonViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overlay')

  const totalChanges = diff.stats.added + diff.stats.removed + diff.stats.modified + diff.stats.addedEdges + diff.stats.removedEdges

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-800">Branch Comparison</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('overlay')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'overlay' ? 'bg-white text-[#0033A0] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Layers className="size-3.5" />
                Overlay
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'split' ? 'bg-white text-[#0033A0] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <SplitSquareHorizontal className="size-3.5" />
                Split
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="size-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Branch labels */}
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-bold text-blue-700 uppercase">A</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{branchA.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{branchA.nodeCount} nodes</span>
          </div>
          <ArrowLeftRight className="size-4 text-gray-400 shrink-0" />
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-xs font-bold text-purple-700 uppercase">B</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{branchB.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{branchB.nodeCount} nodes</span>
          </div>
        </div>

        {/* Stats summary */}
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-700">{totalChanges} change{totalChanges !== 1 ? 's' : ''}</span>
          {diff.stats.added > 0 && (
            <span className="flex items-center gap-1 text-green-700">
              <Plus className="size-3.5" /> {diff.stats.added} added
            </span>
          )}
          {diff.stats.removed > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <Minus className="size-3.5" /> {diff.stats.removed} removed
            </span>
          )}
          {diff.stats.modified > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Pencil className="size-3.5" /> {diff.stats.modified} modified
            </span>
          )}
          {diff.stats.addedEdges > 0 && (
            <span className="text-green-600 text-xs">+{diff.stats.addedEdges} edges</span>
          )}
          {diff.stats.removedEdges > 0 && (
            <span className="text-red-500 text-xs">-{diff.stats.removedEdges} edges</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-3 border-gray-200 border-t-[#0033A0] rounded-full animate-spin" />
            </div>
          ) : totalChanges === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <GitCompare className="size-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No differences found</p>
              <p className="text-xs mt-1">These branches are identical</p>
            </div>
          ) : viewMode === 'overlay' ? (
            <OverlayView diff={diff} />
          ) : (
            <SplitView diff={diff} branchAName={branchA.name} branchBName={branchB.name} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          {totalChanges > 0 && (
            <button
              onClick={() => onMerge(branchA.id, branchB.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0033A0] text-white hover:bg-[#0033A0]/90 transition-colors"
            >
              <GitCompare className="size-4" />
              Merge Branches
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Overlay View ───────────────────────────────────────────────────────────

function OverlayView({ diff }: { diff: BranchDiffResult }) {
  return (
    <div className="space-y-4">
      {/* Added nodes */}
      {diff.addedNodes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-1">
            <Plus className="size-3.5" /> Added Nodes ({diff.addedNodes.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {diff.addedNodes.map((node) => (
              <NodeCard key={node.id} node={node} color="green" />
            ))}
          </div>
        </div>
      )}

      {/* Removed nodes */}
      {diff.removedNodes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1">
            <Minus className="size-3.5" /> Removed Nodes ({diff.removedNodes.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {diff.removedNodes.map((node) => (
              <NodeCard key={node.id} node={node} color="red" />
            ))}
          </div>
        </div>
      )}

      {/* Modified nodes */}
      {diff.modifiedNodes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1">
            <Pencil className="size-3.5" /> Modified Nodes ({diff.modifiedNodes.length})
          </h3>
          <div className="space-y-2">
            {diff.modifiedNodes.map((mod) => (
              <div key={mod.node.id} className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{mod.node.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    {mod.oldLabel !== mod.newLabel && (
                      <span className="text-blue-600">
                        Label: <span className="line-through text-red-400">{mod.oldLabel}</span> → <span className="text-green-600">{mod.newLabel}</span>
                      </span>
                    )}
                    {(mod.oldX !== mod.newX || mod.oldY !== mod.newY) && (
                      <span className="text-blue-500">Position changed</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-blue-500 font-medium">{mod.node.nodeType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge changes */}
      {(diff.addedEdges.length > 0 || diff.removedEdges.length > 0) && (
        <div>
          <h3 className="text-xs font-bold text-gray-600 uppercase mb-2">Edge Changes</h3>
          <div className="space-y-1">
            {diff.addedEdges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
                <Plus className="size-3 text-green-600" />
                <span className="text-green-700 font-medium">{edge.fromNodeId} → {edge.toNodeId}</span>
                <span className="text-green-500 ml-auto">{edge.edgeType}</span>
              </div>
            ))}
            {diff.removedEdges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs">
                <Minus className="size-3 text-red-500" />
                <span className="text-red-600 font-medium">{edge.fromNodeId} → {edge.toNodeId}</span>
                <span className="text-red-400 ml-auto">{edge.edgeType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Split View ─────────────────────────────────────────────────────────────

function SplitView({ diff, branchAName, branchBName }: { diff: BranchDiffResult; branchAName: string; branchBName: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Branch A side */}
      <div>
        <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 px-2">
          {branchAName} (Source)
        </h3>
        <div className="space-y-2">
          {diff.removedNodes.map((node) => (
            <NodeCard key={node.id} node={node} color="red" label="Only in A" />
          ))}
          {diff.modifiedNodes.map((mod) => (
            <div key={mod.node.id} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 truncate">{mod.oldLabel}</p>
              <p className="text-xs text-gray-400">({mod.oldX}, {mod.oldY})</p>
            </div>
          ))}
        </div>
      </div>

      {/* Branch B side */}
      <div>
        <h3 className="text-xs font-bold text-purple-700 uppercase mb-3 px-2">
          {branchBName} (Target)
        </h3>
        <div className="space-y-2">
          {diff.addedNodes.map((node) => (
            <NodeCard key={node.id} node={node} color="green" label="Only in B" />
          ))}
          {diff.modifiedNodes.map((mod) => (
            <div key={mod.node.id} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 truncate">{mod.newLabel}</p>
              <p className="text-xs text-gray-400">({mod.newX}, {mod.newY})</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Node Card ──────────────────────────────────────────────────────────────

function NodeCard({ node, color, label }: { node: BranchNodeData; color: 'green' | 'red' | 'blue'; label?: string }) {
  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={`px-3 py-2 border rounded-lg ${colorMap[color]}`}>
      <p className="text-sm font-semibold truncate">{node.label}</p>
      <div className="flex items-center gap-2 mt-0.5 text-xs opacity-70">
        <span>{node.nodeType}</span>
        {label && <span className="ml-auto font-medium">{label}</span>}
      </div>
    </div>
  )
}
