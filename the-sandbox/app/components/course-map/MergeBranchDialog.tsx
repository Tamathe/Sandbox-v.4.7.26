'use client'

import { useState, useEffect } from 'react'
import {
  GitMerge,
  X,
  Loader2,
  AlertTriangle,
  Check,
  ChevronRight,
  RotateCcw,
  CopyPlus,
  History,
  ArrowRight,
  Circle,
  CheckCircle2,
} from 'lucide-react'
import type { BranchInfo } from '../../lib/course-map/branch-service'
import type {
  MergePreview,
  MergeConflictItem,
  MergeHistoryEntry,
  CherryPickItem,
  MergeExecutionResult,
} from '../../lib/course-map/merge-engine'

interface MergeBranchDialogProps {
  branches: BranchInfo[]
  initialSourceId: string
  initialTargetId: string
  onClose: () => void
  onGetPreview: (sourceId: string, targetId: string) => Promise<MergePreview>
  onMerge: (
    sourceId: string,
    targetId: string,
    resolutions: Record<string, { resolution: 'source' | 'target' | 'manual'; manualValue?: string | number }>
  ) => Promise<MergeExecutionResult>
  onCherryPick: (sourceId: string, targetId: string, changes: CherryPickItem[]) => Promise<MergeExecutionResult>
  onGetHistory: (branchId: string) => Promise<MergeHistoryEntry[]>
  onRollback: (mergeId: string) => Promise<void>
}

type TabId = 'merge' | 'cherry-pick' | 'history'

export default function MergeBranchDialog({
  branches,
  initialSourceId,
  initialTargetId,
  onClose,
  onGetPreview,
  onMerge,
  onCherryPick,
  onGetHistory,
  onRollback,
}: MergeBranchDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('merge')
  const [sourceId, setSourceId] = useState(initialSourceId)
  const [targetId, setTargetId] = useState(initialTargetId)

  // Merge state
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [resolutions, setResolutions] = useState<Record<string, { resolution: 'source' | 'target' | 'manual'; manualValue?: string | number }>>({})
  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<MergeExecutionResult | null>(null)

  // Cherry-pick state
  const [cherryItems, setCherryItems] = useState<CherryPickItem[]>([])
  const [cherryPicking, setCherryPicking] = useState(false)

  // History state
  const [history, setHistory] = useState<MergeHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  // Load preview when source/target change
  useEffect(() => {
    if (!sourceId || !targetId || sourceId === targetId) {
      setPreview(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    onGetPreview(sourceId, targetId)
      .then((p) => {
        if (!cancelled) {
          setPreview(p)
          // Initialize resolutions from conflicts
          const r: typeof resolutions = {}
          for (const c of p.conflicts) {
            r[c.nodeId + ':' + c.field] = { resolution: 'source' }
          }
          setResolutions(r)
          // Build cherry-pick items from diff
          const items: CherryPickItem[] = []
          for (const node of p.diff.addedNodes) {
            items.push({ type: 'node-add', id: node.id, label: `Add: ${node.label}`, selected: false })
          }
          for (const node of p.diff.removedNodes) {
            items.push({ type: 'node-remove', id: node.id, label: `Remove: ${node.label}`, selected: false })
          }
          for (const mod of p.diff.modifiedNodes) {
            items.push({ type: 'node-modify', id: mod.node.id, label: `Modify: ${mod.node.label}`, selected: false })
          }
          for (const edge of p.diff.addedEdges) {
            items.push({ type: 'edge-add', id: edge.id, label: `Add edge: ${edge.fromNodeId} → ${edge.toNodeId}`, selected: false })
          }
          for (const edge of p.diff.removedEdges) {
            items.push({ type: 'edge-remove', id: edge.id, label: `Remove edge: ${edge.fromNodeId} → ${edge.toNodeId}`, selected: false })
          }
          setCherryItems(items)
        }
      })
      .catch(() => { if (!cancelled) setPreview(null) })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [sourceId, targetId, onGetPreview])

  // Load history when tab changes
  useEffect(() => {
    if (activeTab !== 'history' || !targetId) return
    setHistoryLoading(true)
    onGetHistory(targetId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [activeTab, targetId, onGetHistory])

  const handleMerge = async () => {
    if (!sourceId || !targetId) return
    setMerging(true)
    try {
      const result = await onMerge(sourceId, targetId, resolutions)
      setMergeResult(result)
    } finally {
      setMerging(false)
    }
  }

  const handleCherryPick = async () => {
    if (!sourceId || !targetId) return
    const selected = cherryItems.filter((c) => c.selected)
    if (selected.length === 0) return
    setCherryPicking(true)
    try {
      const result = await onCherryPick(sourceId, targetId, cherryItems)
      setMergeResult(result)
    } finally {
      setCherryPicking(false)
    }
  }

  const handleRollback = async (mergeId: string) => {
    setRollingBack(mergeId)
    try {
      await onRollback(mergeId)
      // Refresh history
      const updated = await onGetHistory(targetId)
      setHistory(updated)
    } finally {
      setRollingBack(null)
    }
  }

  const toggleCherryItem = (index: number) => {
    setCherryItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))
  }

  const selectAllCherry = () => {
    setCherryItems((prev) => prev.map((item) => ({ ...item, selected: true })))
  }

  const deselectAllCherry = () => {
    setCherryItems((prev) => prev.map((item) => ({ ...item, selected: false })))
  }

  const allConflictsResolved = preview
    ? preview.conflicts.every((c) => resolutions[c.nodeId + ':' + c.field]?.resolution)
    : true

  const sourceBranch = branches.find((b) => b.id === sourceId)
  const targetBranch = branches.find((b) => b.id === targetId)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitMerge className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-800">Merge Branches</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* Success result */}
        {mergeResult && (
          <div className="px-5 py-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-sm font-bold text-green-800">Merge Complete</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-green-700">
              <span>+{mergeResult.nodesAdded} added</span>
              <span>-{mergeResult.nodesRemoved} removed</span>
              <span>~{mergeResult.nodesModified} modified</span>
              {mergeResult.conflictsResolved > 0 && (
                <span>{mergeResult.conflictsResolved} conflicts resolved</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Branch selectors */}
        {!mergeResult && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Source</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === targetId}>
                    {b.name} ({b.nodeCount} nodes)
                  </option>
                ))}
              </select>
            </div>
            <ArrowRight className="size-5 text-gray-400 mt-5 shrink-0" />
            <div className="flex-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Target</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === sourceId}>
                    {b.name} ({b.nodeCount} nodes)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tabs */}
        {!mergeResult && (
          <div className="px-5 border-b border-gray-200 flex items-center gap-0.5">
            {([
              { id: 'merge' as TabId, label: 'Merge', icon: GitMerge },
              { id: 'cherry-pick' as TabId, label: 'Cherry Pick', icon: CopyPlus },
              { id: 'history' as TabId, label: 'History', icon: History },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-[#0033A0] text-[#0033A0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* Merge tab */}
          {activeTab === 'merge' && !mergeResult && (
            <div className="p-5">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading merge preview...</span>
                </div>
              ) : !preview ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  Select source and target branches to preview merge
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview summary */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {preview.sourceBranchName} <ChevronRight className="size-3.5 inline" /> {preview.targetBranchName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {preview.diff.stats.added} added, {preview.diff.stats.removed} removed, {preview.diff.stats.modified} modified
                      </p>
                    </div>
                    {preview.canAutoMerge ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                        <Check className="size-3.5" /> Auto-merge OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                        <AlertTriangle className="size-3.5" /> {preview.conflicts.length} conflict{preview.conflicts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Conflicts */}
                  {preview.conflicts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">
                        <AlertTriangle className="size-3.5" /> Conflicts to Resolve
                      </h3>
                      <div className="space-y-2">
                        {preview.conflicts.map((conflict) => {
                          const key = conflict.nodeId + ':' + conflict.field
                          const current = resolutions[key]
                          return (
                            <div key={key} className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-800">
                                  {conflict.nodeLabel} — <span className="text-amber-700">{conflict.field}</span>
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-[10px] font-bold text-blue-600 uppercase">Source</p>
                                  <p className="text-sm text-gray-800 truncate">{String(conflict.sourceValue)}</p>
                                </div>
                                <div className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                                  <p className="text-[10px] font-bold text-purple-600 uppercase">Target</p>
                                  <p className="text-sm text-gray-800 truncate">{String(conflict.targetValue)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setResolutions((r) => ({ ...r, [key]: { resolution: 'source' } }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    current?.resolution === 'source'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  Keep Source
                                </button>
                                <button
                                  onClick={() => setResolutions((r) => ({ ...r, [key]: { resolution: 'target' } }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    current?.resolution === 'target'
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  Keep Target
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Change list */}
                  {preview.diff.stats.added + preview.diff.stats.removed + preview.diff.stats.modified > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-600 uppercase mb-2">Changes to Apply</h3>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {preview.diff.addedNodes.map((n) => (
                          <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-xs">
                            <span className="text-green-600 font-bold">+</span>
                            <span className="text-green-800">{n.label}</span>
                          </div>
                        ))}
                        {preview.diff.removedNodes.map((n) => (
                          <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                            <span className="text-red-600 font-bold">−</span>
                            <span className="text-red-700">{n.label}</span>
                          </div>
                        ))}
                        {preview.diff.modifiedNodes.map((m) => (
                          <div key={m.node.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                            <span className="text-blue-600 font-bold">~</span>
                            <span className="text-blue-800">{m.node.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cherry-pick tab */}
          {activeTab === 'cherry-pick' && !mergeResult && (
            <div className="p-5">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                </div>
              ) : cherryItems.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No changes available. Select branches with differences.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      Select changes to apply ({cherryItems.filter((c) => c.selected).length}/{cherryItems.length})
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={selectAllCherry} className="text-xs text-[#0033A0] font-semibold hover:underline">
                        Select all
                      </button>
                      <button onClick={deselectAllCherry} className="text-xs text-gray-500 font-semibold hover:underline">
                        Deselect all
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {cherryItems.map((item, i) => (
                      <label
                        key={item.id + item.type}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          item.selected
                            ? 'bg-[#0033A0]/5 border-[#0033A0]/20'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleCherryItem(i)}
                          className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                        />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          item.type.includes('add') ? 'bg-green-100 text-green-700'
                            : item.type.includes('remove') ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type.includes('add') ? '+' : item.type.includes('remove') ? '−' : '~'}
                        </span>
                        <span className="text-sm text-gray-800 truncate">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && !mergeResult && (
            <div className="p-5">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No merge history for this branch.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {entry.sourceBranchName} → {entry.targetBranchName}
                        </p>
                        <span className="text-[11px] text-gray-400">
                          {new Date(entry.mergedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>By {entry.mergedByName}</span>
                        <span>+{entry.nodesAdded} −{entry.nodesRemoved} ~{entry.nodesModified}</span>
                        {entry.conflictsResolved > 0 && (
                          <span className="text-amber-600">{entry.conflictsResolved} conflicts</span>
                        )}
                        {entry.canRollback && (
                          <button
                            onClick={() => handleRollback(entry.id)}
                            disabled={!!rollingBack}
                            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {rollingBack === entry.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3" />
                            )}
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!mergeResult && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'merge' && preview && (
              <button
                onClick={handleMerge}
                disabled={merging || !allConflictsResolved || !sourceId || !targetId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0033A0] text-white hover:bg-[#0033A0]/90 transition-colors disabled:opacity-50"
              >
                {merging ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
                {merging ? 'Merging...' : 'Merge'}
              </button>
            )}
            {activeTab === 'cherry-pick' && cherryItems.some((c) => c.selected) && (
              <button
                onClick={handleCherryPick}
                disabled={cherryPicking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0033A0] text-white hover:bg-[#0033A0]/90 transition-colors disabled:opacity-50"
              >
                {cherryPicking ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus className="size-4" />}
                {cherryPicking ? 'Applying...' : `Apply ${cherryItems.filter((c) => c.selected).length} Changes`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
