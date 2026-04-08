'use client'

import { useState, useEffect } from 'react'

export type ModuleStatus = 'completed' | 'in-progress' | 'not-started'

export interface ModuleProgressMap {
  [key: string]: ModuleStatus
}

export function useModuleProgress(userEmail: string) {
  const [progress, setProgress] = useState<ModuleProgressMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/quick-start?view=progress', {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (res.ok) {
          const data = await res.json()
          setProgress(data.moduleProgress ?? {})
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [userEmail])

  return { progress, loading }
}
