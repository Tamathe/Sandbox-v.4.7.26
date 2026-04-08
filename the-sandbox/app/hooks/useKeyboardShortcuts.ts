import { useEffect, useRef, useState } from 'react'
import type { TabId } from '../components/courses/course-types'

const TAB_CHORDS: Record<string, TabId> = {
  o: 'overview',
  a: 'assignments',
  g: 'grades',
  c: 'content',
  m: 'course-map',
  d: 'discussion',
  s: 'settings',
}

const SUPPRESSED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

interface UseKeyboardShortcutsOptions {
  onTabChange: (tabId: string) => void
  onCourseChange: (direction: -1 | 1) => void
}

export function useKeyboardShortcuts({ onTabChange, onCourseChange }: UseKeyboardShortcutsOptions) {
  const [helpOpen, setHelpOpen] = useState(false)
  const chordArmed = useRef(false)
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Suppress inside form elements
      const target = e.target as HTMLElement
      if (SUPPRESSED_TAGS.has(target.tagName) || target.isContentEditable) return

      const key = e.key

      // Direct keys
      if (key === '?') {
        e.preventDefault()
        setHelpOpen((v) => !v)
        return
      }

      if (key === '[') {
        e.preventDefault()
        onCourseChange(-1)
        return
      }

      if (key === ']') {
        e.preventDefault()
        onCourseChange(1)
        return
      }

      // Chord system: 'g' arms, second key triggers
      if (key === 'g' && !chordArmed.current) {
        chordArmed.current = true
        if (chordTimer.current) clearTimeout(chordTimer.current)
        chordTimer.current = setTimeout(() => {
          chordArmed.current = false
        }, 1500)
        return
      }

      if (chordArmed.current) {
        chordArmed.current = false
        if (chordTimer.current) clearTimeout(chordTimer.current)
        const tabId = TAB_CHORDS[key]
        if (tabId) {
          e.preventDefault()
          onTabChange(tabId)
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      if (chordTimer.current) clearTimeout(chordTimer.current)
    }
  }, [onTabChange, onCourseChange])

  return { helpOpen, setHelpOpen }
}
