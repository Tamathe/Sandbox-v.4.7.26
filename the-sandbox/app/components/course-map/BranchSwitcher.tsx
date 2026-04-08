'use client'

import { useState, useRef, useEffect } from 'react'
import {
  GitBranch,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  X,
  GitMerge,
  GitCompare,
  Check,
  AlertTriangle,
  User,
  Calendar,
  Circle,
} from 'lucide-react'
import type { BranchInfo } from '../../lib/course-map/branch-service'

interface BranchSwitcherProps {
  branches: BranchInfo[]
  currentBranch: BranchInfo | null
  loading: boolean
  onCreateBranch: (name: string, description: string) => Promise<void>
  onSwitchBranch: (branchId: string) => Promise<void>
  onDeleteBranch: (branchId: string) => Promise<void>
  onCompareBranches: (branchAId: string, branchBId: string) => void
  onMergeBranch: (sourceBranchId: string, targetBranchId: string) => void
}

export default function BranchSwitcher({
  branches,
  currentBranch,
  loading,
  onCreateBranch,
  onSwitchBranch,
  onDeleteBranch,
  onCompareBranches,
  onMergeBranch,
}: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchDescription, setNewBranchDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setDeleteConfirmId(null)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleCreate = async () => {
    if (!newBranchName.trim()) return
    setCreating(true)
    try {
      await onCreateBranch(newBranchName.trim(), newBranchDescription.trim())
      setNewBranchName('')
      setNewBranchDescription('')
      setShowCreateDialog(false)
    } finally {
      setCreating(false)
    }
  }

  const handleSwitch = async (branchId: string) => {
    if (currentBranch?.id === branchId) return
    setSwitching(branchId)
    try {
      await onSwitchBranch(branchId)
      setIsOpen(false)
    } finally {
      setSwitching(null)
    }
  }

  const handleDelete = async (branchId: string) => {
    await onDeleteBranch(branchId)
    setDeleteConfirmId(null)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#0033A0]/5 text-[#0033A0] border border-[#0033A0]/20 hover:bg-[#0033A0]/10 transition-colors"
      >
        <GitBranch className="size-4" />
        <span className="max-w-[120px] truncate">{currentBranch?.name || 'main'}</span>
        <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {branches.length > 1 && (
          <span className="ml-0.5 px-1.5 py-0.5 bg-[#0033A0]/10 text-[#0033A0] rounded-full text-[10px] font-bold">
            {branches.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-96 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              Branches
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#0033A0]/90 transition-colors"
              >
                <Plus className="size-3" />
                New Branch
              </button>
              <button onClick={() => setIsOpen(false)} className="p-0.5 rounded hover:bg-gray-100">
                <X className="size-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Create dialog */}
          {showCreateDialog && (
            <div className="px-3 py-3 border-b border-gray-100 bg-blue-50/50">
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreateDialog(false) }}
                  placeholder="Branch name..."
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  autoFocus
                />
                <input
                  type="text"
                  value={newBranchDescription}
                  onChange={(e) => setNewBranchDescription(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreateDialog(false) }}
                  placeholder="Description (optional)..."
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newBranchName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#0033A0] text-white hover:bg-[#0033A0]/90 transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Create
                  </button>
                  <button
                    onClick={() => { setShowCreateDialog(false); setNewBranchName(''); setNewBranchDescription('') }}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">
                    Branches from: {currentBranch?.name || 'main'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Branch list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            ) : branches.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No branches yet. Create one to start versioning.
              </div>
            ) : (
              branches.map((branch) => {
                const isCurrent = currentBranch?.id === branch.id
                const isSwitching = switching === branch.id
                const isDeleting = deleteConfirmId === branch.id

                return (
                  <div
                    key={branch.id}
                    className={`px-3 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${
                      isCurrent ? 'bg-[#0033A0]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Branch indicator */}
                      <div className="mt-0.5">
                        {isCurrent ? (
                          <Circle className="size-3.5 text-[#0033A0] fill-[#0033A0]" />
                        ) : (
                          <Circle className="size-3.5 text-gray-300" />
                        )}
                      </div>

                      {/* Branch info */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleSwitch(branch.id)}
                          disabled={isCurrent || !!isSwitching}
                          className="text-sm font-semibold text-gray-800 hover:text-[#0033A0] transition-colors disabled:cursor-default truncate block w-full text-left"
                        >
                          {isSwitching ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" />
                              Switching...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              {branch.name}
                              {branch.isDefault && (
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold">
                                  DEFAULT
                                </span>
                              )}
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-[#0033A0]/10 text-[#0033A0] rounded text-[10px] font-bold">
                                  CURRENT
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                        {branch.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{branch.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-0.5">
                            <User className="size-3" />
                            {branch.creatorName}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="size-3" />
                            {new Date(branch.createdAt).toLocaleDateString()}
                          </span>
                          <span>{branch.nodeCount} nodes</span>
                          <span>{branch.edgeCount} edges</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isCurrent && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => onCompareBranches(currentBranch?.id || '', branch.id)}
                            title="Compare with current branch"
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <GitCompare className="size-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => onMergeBranch(branch.id, currentBranch?.id || '')}
                            title="Merge into current branch"
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <GitMerge className="size-3.5 text-gray-500" />
                          </button>
                          {!branch.isDefault && (
                            <>
                              {isDeleting ? (
                                <div className="flex items-center gap-0.5 ml-1">
                                  <button
                                    onClick={() => handleDelete(branch.id)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-0.5 rounded hover:bg-gray-200"
                                  >
                                    <X className="size-3 text-gray-400" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(branch.id)}
                                  title="Delete branch"
                                  className="p-1 rounded hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="size-3.5 text-gray-400 hover:text-red-500" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer with compare all */}
          {branches.length >= 2 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 text-center">
                {branches.length} branch{branches.length !== 1 ? 'es' : ''} &middot; Click branch name to switch
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
