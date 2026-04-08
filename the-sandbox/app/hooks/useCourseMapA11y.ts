import { useState, useEffect, useCallback, useRef } from 'react'
import {
  announceStateChange,
  manageFocusTrap,
} from '../lib/course-map/accessibility-manager'

const HIGH_CONTRAST_KEY = 'course-map-high-contrast'

interface UseCourseMapA11yReturn {
  highContrast: boolean
  toggleHighContrast: () => void
  announce: (message: string) => void
  trapFocus: (panelEl: HTMLElement | null, active: boolean) => void
  releaseFocusTrap: () => void
  containerClassName: string
}

/**
 * Custom hook combining accessibility-manager functions for the course map.
 * Manages high-contrast mode state (persisted to localStorage),
 * provides announce() for screen reader messages,
 * and handles focus management when panels open/close.
 */
export function useCourseMapA11y(): UseCourseMapA11yReturn {
  const [highContrast, setHighContrast] = useState(false)
  const focusTrapCleanupRef = useRef<{ release: () => void } | null>(null)

  // Load high-contrast preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(HIGH_CONTRAST_KEY)
    if (stored === 'true') {
      setHighContrast(true)
    }
  }, [])

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev
      localStorage.setItem(HIGH_CONTRAST_KEY, String(next))
      announceStateChange(
        next ? 'High contrast mode enabled' : 'High contrast mode disabled',
      )
      return next
    })
  }, [])

  const announce = useCallback((message: string) => {
    announceStateChange(message)
  }, [])

  const trapFocus = useCallback((panelEl: HTMLElement | null, active: boolean) => {
    // Release any existing trap first
    if (focusTrapCleanupRef.current) {
      focusTrapCleanupRef.current.release()
      focusTrapCleanupRef.current = null
    }

    if (panelEl && active) {
      focusTrapCleanupRef.current = manageFocusTrap(panelEl, true)
    }
  }, [])

  const releaseFocusTrap = useCallback(() => {
    if (focusTrapCleanupRef.current) {
      focusTrapCleanupRef.current.release()
      focusTrapCleanupRef.current = null
    }
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (focusTrapCleanupRef.current) {
        focusTrapCleanupRef.current.release()
      }
    }
  }, [])

  const containerClassName = highContrast ? 'high-contrast' : ''

  return {
    highContrast,
    toggleHighContrast,
    announce,
    trapFocus,
    releaseFocusTrap,
    containerClassName,
  }
}
