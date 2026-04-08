// ── Course Map Offline Edit Queue ────────────────────────────────────────────
// Queues mutations when offline and replays them in order when back online.
// Uses localStorage as IndexedDB would require a heavier wrapper.

export interface OfflineEdit {
  id: string
  courseId: string
  timestamp: number
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  body: Record<string, unknown> | null
  userEmail: string
}

const STORAGE_KEY = 'course-map-offline-queue'

function getQueue(): OfflineEdit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: OfflineEdit[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

/** Queue an edit for later replay */
export function queueOfflineEdit(
  courseId: string,
  edit: {
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    url: string
    body: Record<string, unknown> | null
    userEmail: string
  }
): OfflineEdit {
  const entry: OfflineEdit = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    courseId,
    timestamp: Date.now(),
    ...edit,
  }
  const queue = getQueue()
  queue.push(entry)
  saveQueue(queue)
  return entry
}

/** Get all queued edits for a specific course */
export function getQueuedEdits(courseId: string): OfflineEdit[] {
  return getQueue().filter((e) => e.courseId === courseId)
}

/** Get total queue length across all courses */
export function getQueueLength(): number {
  return getQueue().length
}

/**
 * Replay queued edits in order for a course.
 * Returns { succeeded: number; failed: OfflineEdit[] }
 */
export async function flushQueue(
  courseId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ succeeded: number; failed: OfflineEdit[] }> {
  const edits = getQueuedEdits(courseId)
  if (edits.length === 0) return { succeeded: 0, failed: [] }

  let succeeded = 0
  const failed: OfflineEdit[] = []

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]
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
      if (res.ok || res.status === 409) {
        // 409 = conflict, treat as "already applied"
        succeeded++
      } else {
        failed.push(edit)
      }
    } catch {
      failed.push(edit)
    }
    onProgress?.(i + 1, edits.length)
  }

  // Remove succeeded edits from queue, keep failed ones
  const remaining = getQueue().filter(
    (e) => e.courseId !== courseId || failed.some((f) => f.id === e.id)
  )
  saveQueue(remaining)

  return { succeeded, failed }
}

/** Clear all queued edits for a course */
export function clearQueue(courseId: string): void {
  const remaining = getQueue().filter((e) => e.courseId !== courseId)
  saveQueue(remaining)
}
