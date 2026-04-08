'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'

/**
 * Detects when a new service worker version is available and shows an update toast.
 * On click, sends SKIP_WAITING to the waiting SW and reloads the page.
 */
export default function ServiceWorkerUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let mounted = true

    // Check for updates on existing registrations
    navigator.serviceWorker.getRegistration('/').then((reg) => {
      if (!reg || !mounted) return

      // If there's already a waiting worker, show prompt
      if (reg.waiting) {
        setRegistration(reg)
        setShowPrompt(true)
        return
      }

      // Listen for new installations
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return

        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller && mounted) {
            setRegistration(reg)
            setShowPrompt(true)
          }
        })
      })
    })

    // Detect controller changes (another tab triggered the update)
    const onControllerChange = () => {
      if (mounted) {
        window.location.reload()
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      mounted = false
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    // controllerchange listener will trigger reload
  }, [registration])

  if (!showPrompt) return null

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-white border-2 border-[#0033A0] rounded-xl px-4 py-3 shadow-lg max-w-sm"
    >
      <RefreshCw className="size-5 text-[#0033A0] shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">New version available</p>
        <button
          onClick={handleUpdate}
          className="text-sm font-medium text-[#0033A0] hover:underline"
        >
          Click to update
        </button>
      </div>
      <button
        onClick={() => setShowPrompt(false)}
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Dismiss update notification"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
