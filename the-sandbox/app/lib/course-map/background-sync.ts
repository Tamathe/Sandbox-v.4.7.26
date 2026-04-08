// ── Background Sync Manager — Replays queued edits on reconnect ─────────────
// Listens for the 'online' event and processes pending IndexedDB edits in order.

import { courseMapCache, type PendingEdit } from './offline-cache'

export type SyncEvent =
  | { type: 'sync-start'; total: number }
  | { type: 'sync-progress'; completed: number; total: number }
  | { type: 'sync-complete'; succeeded: number; failed: number }
  | { type: 'edit-failed'; edit: PendingEdit; reason: string }

type SyncListener = (event: SyncEvent) => void

export class BackgroundSyncManager {
  private listeners: Set<SyncListener> = new Set()
  private syncing = false
  private onlineHandler: (() => void) | null = null
  private courseId: string

  constructor(courseId: string) {
    this.courseId = courseId
  }

  /** Start listening for online events */
  start(): void {
    if (typeof window === 'undefined') return
    if (this.onlineHandler) return

    this.onlineHandler = () => {
      this.processQueue()
    }
    window.addEventListener('online', this.onlineHandler)

    // If already online and there might be pending edits, try syncing
    if (navigator.onLine) {
      this.processQueue()
    }
  }

  /** Stop listening */
  stop(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler)
      this.onlineHandler = null
    }
  }

  /** Subscribe to sync events */
  on(listener: SyncListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  /** Process all pending edits for the course */
  async processQueue(): Promise<void> {
    if (this.syncing) return
    const edits = await courseMapCache.getPendingEdits(this.courseId)
    const pending = edits.filter((e) => e.status === 'pending')
    if (pending.length === 0) return

    this.syncing = true
    let succeeded = 0
    let failed = 0

    this.emit({ type: 'sync-start', total: pending.length })

    for (let i = 0; i < pending.length; i++) {
      const edit = pending[i]
      try {
        const init: RequestInit = {
          method: edit.method,
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': edit.userEmail,
          },
        }
        if (edit.body && edit.method !== 'DELETE') {
          init.body = JSON.stringify(edit.body)
        }

        const res = await fetch(edit.url, init)

        if (res.ok) {
          await courseMapCache.removeEdit(edit.id)
          succeeded++
        } else if (res.status === 409) {
          // Conflict — mark as failed so user can resolve
          const reason = 'Conflict: this item was modified by another user'
          await courseMapCache.markEditFailed(edit.id, reason)
          failed++
          this.emit({ type: 'edit-failed', edit, reason })
        } else {
          const reason = `Server error: ${res.status}`
          await courseMapCache.markEditFailed(edit.id, reason)
          failed++
          this.emit({ type: 'edit-failed', edit, reason })
        }
      } catch {
        // Network error — leave as pending for next attempt
        failed++
      }

      this.emit({ type: 'sync-progress', completed: i + 1, total: pending.length })
    }

    this.syncing = false
    this.emit({ type: 'sync-complete', succeeded, failed })

    // Invalidate SW cache after successful sync
    if (succeeded > 0 && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_COURSE_MAP',
        courseId: this.courseId,
      })
    }
  }

  /** Check if currently syncing */
  isSyncing(): boolean {
    return this.syncing
  }
}
