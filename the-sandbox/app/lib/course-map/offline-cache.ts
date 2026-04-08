// ── Course Map Offline Cache — IndexedDB + Stale-While-Revalidate ───────────
// Caches course map data in IndexedDB with timestamps for freshness checks.
// Queues pending edits for background sync when connectivity is restored.

export interface CachedCourseMap {
  courseId: string
  data: unknown
  cachedAt: number
}

export interface PendingEdit {
  id: string
  courseId: string
  timestamp: number
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  body: Record<string, unknown> | null
  userEmail: string
  status: 'pending' | 'failed'
  failReason?: string
}

const DB_NAME = 'course-map-offline'
const DB_VERSION = 1
const STORE_MAP_DATA = 'courseMapData'
const STORE_PENDING_EDITS = 'pendingEdits'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_MAP_DATA)) {
        db.createObjectStore(STORE_MAP_DATA, { keyPath: 'courseId' })
      }
      if (!db.objectStoreNames.contains(STORE_PENDING_EDITS)) {
        const store = db.createObjectStore(STORE_PENDING_EDITS, { keyPath: 'id' })
        store.createIndex('byCourseId', 'courseId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txPromise<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export class CourseMapCache {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB()
    }
    return this.dbPromise
  }

  /** Get cached course map data, or null if not cached */
  async get(courseId: string): Promise<CachedCourseMap | null> {
    try {
      const db = await this.getDB()
      const result = await txPromise<CachedCourseMap | undefined>(
        db, STORE_MAP_DATA, 'readonly',
        (store) => store.get(courseId)
      )
      return result ?? null
    } catch {
      return null
    }
  }

  /** Store course map data with current timestamp */
  async set(courseId: string, data: unknown): Promise<void> {
    try {
      const db = await this.getDB()
      const entry: CachedCourseMap = { courseId, data, cachedAt: Date.now() }
      await txPromise(db, STORE_MAP_DATA, 'readwrite', (store) => store.put(entry))
    } catch {
      // Safari private browsing or quota exceeded — silently fail
    }
  }

  /** Check if cache entry is older than maxAgeMs */
  async isStale(courseId: string, maxAgeMs: number): Promise<boolean> {
    const entry = await this.get(courseId)
    if (!entry) return true
    return Date.now() - entry.cachedAt > maxAgeMs
  }

  /** Queue a pending edit for later sync */
  async queueEdit(courseId: string, edit: Omit<PendingEdit, 'id' | 'courseId' | 'timestamp' | 'status'>): Promise<PendingEdit> {
    const entry: PendingEdit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      courseId,
      timestamp: Date.now(),
      status: 'pending',
      ...edit,
    }
    try {
      const db = await this.getDB()
      await txPromise(db, STORE_PENDING_EDITS, 'readwrite', (store) => store.put(entry))
    } catch {
      // Fall through — edit won't be persisted
    }
    return entry
  }

  /** Get all pending edits for a course, ordered by timestamp */
  async getPendingEdits(courseId: string): Promise<PendingEdit[]> {
    try {
      const db = await this.getDB()
      const all = await new Promise<PendingEdit[]>((resolve, reject) => {
        const tx = db.transaction(STORE_PENDING_EDITS, 'readonly')
        const store = tx.objectStore(STORE_PENDING_EDITS)
        const index = store.index('byCourseId')
        const req = index.getAll(courseId)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      return all.sort((a, b) => a.timestamp - b.timestamp)
    } catch {
      return []
    }
  }

  /** Clear all pending edits for a course */
  async clearPendingEdits(courseId: string): Promise<void> {
    try {
      const db = await this.getDB()
      const edits = await this.getPendingEdits(courseId)
      const tx = db.transaction(STORE_PENDING_EDITS, 'readwrite')
      const store = tx.objectStore(STORE_PENDING_EDITS)
      for (const edit of edits) {
        store.delete(edit.id)
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // Silently fail
    }
  }

  /** Mark a specific edit as failed with a reason */
  async markEditFailed(editId: string, reason: string): Promise<void> {
    try {
      const db = await this.getDB()
      const existing = await txPromise<PendingEdit | undefined>(
        db, STORE_PENDING_EDITS, 'readonly',
        (store) => store.get(editId)
      )
      if (existing) {
        existing.status = 'failed'
        existing.failReason = reason
        await txPromise(db, STORE_PENDING_EDITS, 'readwrite', (store) => store.put(existing))
      }
    } catch {
      // Silently fail
    }
  }

  /** Remove a specific pending edit */
  async removeEdit(editId: string): Promise<void> {
    try {
      const db = await this.getDB()
      await txPromise(db, STORE_PENDING_EDITS, 'readwrite', (store) => store.delete(editId))
    } catch {
      // Silently fail
    }
  }
}

/** Singleton instance */
export const courseMapCache = new CourseMapCache()
