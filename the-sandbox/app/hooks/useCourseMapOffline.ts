import { useState, useEffect, useCallback, useRef } from 'react'
import {
  queueOfflineEdit,
  getQueuedEdits,
  flushQueue,
  clearQueue,
  type OfflineEdit,
} from '../lib/course-map/offline-queue'
import { courseMapCache } from '../lib/course-map/offline-cache'
import { BackgroundSyncManager } from '../lib/course-map/background-sync'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface UseCourseMapOfflineReturn {
  isOffline: boolean
  queueLength: number
  syncStatus: SyncStatus
  syncProgress: { completed: number; total: number } | null
  queueEdit: (edit: {
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    url: string
    body: Record<string, unknown> | null
    userEmail: string
  }) => OfflineEdit | null
  flushEdits: () => Promise<void>
  clearEdits: () => void
  pendingEdits: OfflineEdit[]
  /** Cached course map data (stale-while-revalidate) */
  cachedData: unknown | null
  /** When the cached data was stored */
  cachedAt: Date | null
  /** Whether a background revalidation is in progress */
  isRevalidating: boolean
  /** Cache course map data in IndexedDB */
  cacheData: (data: unknown) => Promise<void>
  /** Load cached data (stale-while-revalidate pattern) */
  loadCachedData: () => Promise<unknown | null>
  /** Number of failed edits requiring conflict resolution */
  failedEditCount: number
}

/** Default max age for stale cache: 5 minutes */
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000

export function useCourseMapOffline(courseId: string | undefined): UseCourseMapOfflineReturn {
  const [isOffline, setIsOffline] = useState(false)
  const [queueLength, setQueueLength] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncProgress, setSyncProgress] = useState<{ completed: number; total: number } | null>(null)
  const [pendingEdits, setPendingEdits] = useState<OfflineEdit[]>([])
  const [cachedData, setCachedData] = useState<unknown | null>(null)
  const [cachedAt, setCachedAt] = useState<Date | null>(null)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [failedEditCount, setFailedEditCount] = useState(0)
  const swRegistered = useRef(false)
  const flushingRef = useRef(false)
  const syncManagerRef = useRef<BackgroundSyncManager | null>(null)

  // Register service worker on mount (production only or when explicitly enabled)
  useEffect(() => {
    if (swRegistered.current) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isProd = window.location.hostname !== 'localhost'
    const forceEnable = localStorage.getItem('course-map-sw-enabled') === 'true'

    if (!isProd && !forceEnable) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {
        swRegistered.current = true
      })
      .catch(() => {
        // Service worker registration failed — offline caching won't work
      })
  }, [])

  // Initialize BackgroundSyncManager
  useEffect(() => {
    if (!courseId) return

    const manager = new BackgroundSyncManager(courseId)
    syncManagerRef.current = manager

    const unsub = manager.on((event) => {
      switch (event.type) {
        case 'sync-start':
          setSyncStatus('syncing')
          setSyncProgress({ completed: 0, total: event.total })
          break
        case 'sync-progress':
          setSyncProgress({ completed: event.completed, total: event.total })
          break
        case 'sync-complete':
          setSyncStatus(event.failed > 0 ? 'error' : 'synced')
          setSyncProgress(null)
          if (event.failed === 0) {
            setTimeout(() => setSyncStatus('idle'), 3000)
          }
          refreshFailedEdits()
          break
        case 'edit-failed':
          refreshFailedEdits()
          break
      }
    })

    manager.start()

    return () => {
      unsub()
      manager.stop()
      syncManagerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const setOnline = () => setIsOffline(false)
    const setOfflineTrue = () => setIsOffline(true)

    setIsOffline(!navigator.onLine)

    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOfflineTrue)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOfflineTrue)
    }
  }, [])

  // Refresh queue length and pending edits
  const refreshQueue = useCallback(() => {
    if (!courseId) return
    const edits = getQueuedEdits(courseId)
    setQueueLength(edits.length)
    setPendingEdits(edits)
  }, [courseId])

  // Refresh failed edit count from IndexedDB
  const refreshFailedEdits = useCallback(async () => {
    if (!courseId) return
    try {
      const edits = await courseMapCache.getPendingEdits(courseId)
      setFailedEditCount(edits.filter((e) => e.status === 'failed').length)
    } catch {
      // Ignore
    }
  }, [courseId])

  useEffect(() => {
    refreshQueue()
    refreshFailedEdits()
  }, [refreshQueue, refreshFailedEdits, isOffline])

  // Queue an edit when offline
  const queueEdit = useCallback(
    (edit: {
      method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
      url: string
      body: Record<string, unknown> | null
      userEmail: string
    }): OfflineEdit | null => {
      if (!courseId) return null
      const entry = queueOfflineEdit(courseId, edit)
      // Also queue in IndexedDB for BackgroundSyncManager
      courseMapCache.queueEdit(courseId, edit)
      refreshQueue()
      return entry
    },
    [courseId, refreshQueue]
  )

  // Flush queued edits (legacy localStorage path)
  const flushEdits = useCallback(async () => {
    if (!courseId || flushingRef.current) return
    const edits = getQueuedEdits(courseId)
    if (edits.length === 0) return

    flushingRef.current = true
    setSyncStatus('syncing')
    setSyncProgress({ completed: 0, total: edits.length })

    try {
      const result = await flushQueue(courseId, (completed, total) => {
        setSyncProgress({ completed, total })
      })

      if (result.failed.length > 0) {
        setSyncStatus('error')
      } else {
        setSyncStatus('synced')
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'INVALIDATE_COURSE_MAP',
            courseId,
          })
        }
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    } catch {
      setSyncStatus('error')
    } finally {
      setSyncProgress(null)
      flushingRef.current = false
      refreshQueue()
    }
  }, [courseId, refreshQueue])

  // Auto-flush when coming back online
  useEffect(() => {
    if (!isOffline && queueLength > 0) {
      flushEdits()
    }
  }, [isOffline, queueLength, flushEdits])

  // Clear edits for this course
  const clearEdits = useCallback(() => {
    if (!courseId) return
    clearQueue(courseId)
    courseMapCache.clearPendingEdits(courseId)
    refreshQueue()
    setSyncStatus('idle')
  }, [courseId, refreshQueue])

  // ── Stale-While-Revalidate: IndexedDB cache ──────────────────────────────

  /** Cache data in IndexedDB */
  const cacheData = useCallback(async (data: unknown) => {
    if (!courseId) return
    await courseMapCache.set(courseId, data)
    setCachedData(data)
    setCachedAt(new Date())
  }, [courseId])

  /** Load cached data — returns stale immediately, revalidates in background */
  const loadCachedData = useCallback(async (): Promise<unknown | null> => {
    if (!courseId) return null

    const entry = await courseMapCache.get(courseId)
    if (entry) {
      setCachedData(entry.data)
      setCachedAt(new Date(entry.cachedAt))

      // If stale, mark revalidating (caller should fetch fresh data)
      const stale = await courseMapCache.isStale(courseId, DEFAULT_MAX_AGE_MS)
      if (stale) {
        setIsRevalidating(true)
      }

      return entry.data
    }
    return null
  }, [courseId])

  return {
    isOffline,
    queueLength,
    syncStatus,
    syncProgress,
    queueEdit,
    flushEdits,
    clearEdits,
    pendingEdits,
    cachedData,
    cachedAt,
    isRevalidating,
    cacheData,
    loadCachedData,
    failedEditCount,
  }
}
