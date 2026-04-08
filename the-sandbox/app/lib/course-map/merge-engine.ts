'use client'

import type { BranchNodeData, BranchEdgeData, BranchDiffResult } from './types'

// ── Types ──────────────────────────────────────────────────────────────────

export type { MergeConflictItem, MergePreview, MergeHistoryEntry, MergeExecutionResult, CherryPickItem } from './types'
import type { MergeConflictItem, MergePreview, MergeHistoryEntry, MergeExecutionResult, CherryPickItem } from './types'

// ── MergeEngine ────────────────────────────────────────────────────────────

export class MergeEngine {
  private courseId: string
  private userEmail: string

  constructor(courseId: string, userEmail: string) {
    this.courseId = courseId
    this.userEmail = userEmail
  }

  private get baseUrl() {
    return `/api/courses/${this.courseId}/course-map/branches`
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-demo-user-email': this.userEmail,
    }
  }

  /** Preview merge result without applying */
  async getMergePreview(sourceBranchId: string, targetBranchId: string): Promise<MergePreview> {
    const res = await fetch(`${this.baseUrl}/merge/preview?source=${sourceBranchId}&target=${targetBranchId}`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error('Failed to get merge preview')
    return res.json()
  }

  /** Execute merge: source into target with conflict resolutions */
  async mergeBranch(
    sourceBranchId: string,
    targetBranchId: string,
    resolutions: Record<string, { resolution: 'source' | 'target' | 'manual'; manualValue?: string | number }>
  ): Promise<MergeExecutionResult> {
    const res = await fetch(`${this.baseUrl}/merge`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sourceBranchId, targetBranchId, resolutions }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Merge failed' }))
      throw new Error(err.error || 'Merge failed')
    }
    return res.json()
  }

  /** Cherry-pick selected changes from one branch to another */
  async cherryPick(
    sourceBranchId: string,
    targetBranchId: string,
    changes: CherryPickItem[]
  ): Promise<MergeExecutionResult> {
    const selected = changes.filter((c) => c.selected)
    const res = await fetch(`${this.baseUrl}/cherry-pick`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sourceBranchId, targetBranchId, changes: selected }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Cherry-pick failed' }))
      throw new Error(err.error || 'Cherry-pick failed')
    }
    return res.json()
  }

  /** Get merge history for a branch */
  async getMergeHistory(branchId: string): Promise<MergeHistoryEntry[]> {
    const res = await fetch(`${this.baseUrl}/${branchId}/merge-history`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error('Failed to get merge history')
    const data = await res.json()
    return data.history || []
  }

  /** Rollback a merge operation */
  async rollbackMerge(mergeId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/merge/${mergeId}/rollback`, {
      method: 'POST',
      headers: this.headers,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Rollback failed' }))
      throw new Error(err.error || 'Rollback failed')
    }
  }

  /** Build cherry-pick items from a branch diff */
  buildCherryPickItems(diff: BranchDiffResult): CherryPickItem[] {
    const items: CherryPickItem[] = []
    for (const node of diff.addedNodes) {
      items.push({ type: 'node-add', id: node.id, label: `Add: ${node.label}`, selected: false })
    }
    for (const node of diff.removedNodes) {
      items.push({ type: 'node-remove', id: node.id, label: `Remove: ${node.label}`, selected: false })
    }
    for (const mod of diff.modifiedNodes) {
      items.push({ type: 'node-modify', id: mod.node.id, label: `Modify: ${mod.node.label}`, selected: false })
    }
    for (const edge of diff.addedEdges) {
      items.push({ type: 'edge-add', id: edge.id, label: `Add edge: ${edge.fromNodeId} → ${edge.toNodeId}`, selected: false })
    }
    for (const edge of diff.removedEdges) {
      items.push({ type: 'edge-remove', id: edge.id, label: `Remove edge: ${edge.fromNodeId} → ${edge.toNodeId}`, selected: false })
    }
    return items
  }
}
