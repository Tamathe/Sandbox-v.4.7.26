'use client'

// ── Types ──────────────────────────────────────────────────────────────────

export type { BranchInfo, BranchSnapshot, BranchNodeData, BranchEdgeData, BranchDiffResult } from './types'
import type { BranchInfo, BranchSnapshot, BranchNodeData, BranchEdgeData, BranchDiffResult } from './types'

// ── BranchManager ──────────────────────────────────────────────────────────

export class BranchManager {
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

  /** Create a new branch from current map state */
  async createBranch(name: string, description?: string): Promise<BranchInfo> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name, description: description || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create branch' }))
      throw new Error(err.error || 'Failed to create branch')
    }
    return res.json()
  }

  /** List all branches for this course map */
  async listBranches(): Promise<BranchInfo[]> {
    const res = await fetch(this.baseUrl, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error('Failed to list branches')
    const data = await res.json()
    return data.branches || []
  }

  /** Get current active branch */
  async getCurrentBranch(): Promise<BranchInfo | null> {
    const res = await fetch(`${this.baseUrl}/current`, {
      headers: this.headers,
    })
    if (!res.ok) return null
    return res.json()
  }

  /** Switch to a branch — loads its snapshot into the map */
  async switchBranch(branchId: string): Promise<BranchSnapshot> {
    const res = await fetch(`${this.baseUrl}/${branchId}/switch`, {
      method: 'POST',
      headers: this.headers,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to switch branch' }))
      throw new Error(err.error || 'Failed to switch branch')
    }
    return res.json()
  }

  /** Delete a branch (cannot delete default/main) */
  async deleteBranch(branchId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${branchId}`, {
      method: 'DELETE',
      headers: this.headers,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete branch' }))
      throw new Error(err.error || 'Failed to delete branch')
    }
  }

  /** Compare two branches and return a diff */
  async compareBranches(branchAId: string, branchBId: string): Promise<BranchDiffResult> {
    const res = await fetch(`${this.baseUrl}/compare?a=${branchAId}&b=${branchBId}`, {
      headers: this.headers,
    })
    if (!res.ok) throw new Error('Failed to compare branches')
    return res.json()
  }

  /** Save current map state to the active branch */
  async saveToBranch(branchId: string, nodes: BranchNodeData[], edges: BranchEdgeData[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${branchId}/save`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ nodes, edges }),
    })
    if (!res.ok) throw new Error('Failed to save branch state')
  }
}
