'use client'

import { useState } from 'react'
import { AlertTriangle, Check, ArrowLeftRight } from 'lucide-react'
import type { ConflictData, ConflictStrategy } from '../../lib/course-map/collab-engine'
import { ModalShell } from '../ui/ModalShell'

// ── Types ───────────────────────────────────────────────────────────────────

interface ConflictResolutionDialogProps {
  conflict: ConflictData
  onResolve: (strategy: ConflictStrategy, mergedValues: Record<string, unknown>) => void
  onDismiss: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Modal shown when a conflict is detected between local and remote edits.
 * - Side-by-side comparison of local vs remote changes
 * - Three resolution options: Keep Mine, Keep Theirs, Merge Both
 * - Preview of merged result before confirming
 */
export default function ConflictResolutionDialog({
  conflict,
  onResolve,
  onDismiss,
}: ConflictResolutionDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictStrategy | null>(null)
  const [previewValues, setPreviewValues] = useState<Record<string, unknown> | null>(null)

  const strategies: { key: ConflictStrategy; label: string; description: string }[] = [
    { key: 'keep_mine', label: 'Keep Mine', description: 'Discard remote changes, keep your version' },
    { key: 'keep_theirs', label: 'Keep Theirs', description: 'Discard your changes, use the remote version' },
    { key: 'merge_both', label: 'Merge Both', description: 'Combine both sets of changes (your changes take priority on conflicts)' },
  ]

  const handleSelect = (strategy: ConflictStrategy) => {
    setSelectedStrategy(strategy)
    switch (strategy) {
      case 'keep_mine':
        setPreviewValues(conflict.localValues)
        break
      case 'keep_theirs':
        setPreviewValues(conflict.remoteValues)
        break
      case 'merge_both':
        setPreviewValues({ ...conflict.remoteValues, ...conflict.localValues })
        break
    }
  }

  const handleConfirm = () => {
    if (!selectedStrategy || !previewValues) return
    onResolve(selectedStrategy, previewValues)
  }

  // Get displayable key-value pairs from change objects
  const localEntries = Object.entries(conflict.localValues).filter(
    ([k]) => k !== 'userId' && k !== 'userName' && k !== 'nodeId',
  )
  const remoteEntries = Object.entries(conflict.remoteValues).filter(
    ([k]) => k !== 'userId' && k !== 'userName' && k !== 'nodeId',
  )

  return (
    <ModalShell title="Edit Conflict Detected" icon={AlertTriangle} onClose={onDismiss} zIndex={50}>
        <div className="px-5 py-2 text-xs text-gray-500 bg-amber-50 border-b border-gray-100">
          Another user modified &ldquo;{conflict.nodeLabel || 'this node'}&rdquo; while you were editing.
        </div>

        {/* Side-by-side comparison */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Local changes */}
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/50">
              <h4 className="text-xs font-bold text-blue-700 mb-2">Your Changes</h4>
              {localEntries.length > 0 ? (
                <div className="space-y-1">
                  {localEntries.map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="font-medium text-gray-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No local changes</p>
              )}
            </div>

            {/* Remote changes */}
            <div className="border border-orange-200 rounded-xl p-3 bg-orange-50/50">
              <h4 className="text-xs font-bold text-orange-700 mb-2">Remote Changes</h4>
              {remoteEntries.length > 0 ? (
                <div className="space-y-1">
                  {remoteEntries.map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="font-medium text-gray-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No remote changes</p>
              )}
            </div>
          </div>
        </div>

        {/* Resolution options */}
        <div className="px-5 pb-3 space-y-2">
          {strategies.map((s) => (
            <button
              key={s.key}
              onClick={() => handleSelect(s.key)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-colors text-sm ${
                selectedStrategy === s.key
                  ? 'border-[#0033A0] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-semibold text-gray-900">{s.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{s.description}</span>
            </button>
          ))}
        </div>

        {/* Preview of merged result */}
        {previewValues && (
          <div className="mx-5 mb-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
            <h4 className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
              <ArrowLeftRight className="size-3" />
              Preview Result
            </h4>
            <div className="space-y-1">
              {Object.entries(previewValues)
                .filter(([k]) => k !== 'userId' && k !== 'userName' && k !== 'nodeId')
                .map(([key, val]) => (
                  <div key={key} className="text-xs">
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="font-medium text-gray-800">{String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStrategy}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002878] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="size-4" />
            Apply Resolution
          </button>
        </div>
    </ModalShell>
  )
}
