/**
 * Accessibility manager for the Course Map.
 * Provides ARIA attributes, screen reader announcements,
 * focus trapping, and keyboard navigation helpers.
 */

// ── ARIA attribute helpers ──────────────────────────────────────────────────

type InteractiveElementType = 'button' | 'panel' | 'tab' | 'node' | 'edge'

interface ElementState {
  selected?: boolean
  expanded?: boolean
  disabled?: boolean
  pressed?: boolean
  label: string
  description?: string
  controls?: string
  owns?: string
  level?: number
  setSize?: number
  posInSet?: number
}

export function getAriaAttributes(
  elementType: InteractiveElementType,
  state: ElementState,
): Record<string, string | boolean | number | undefined> {
  const base: Record<string, string | boolean | number | undefined> = {
    'aria-label': state.label,
    'aria-disabled': state.disabled || undefined,
  }

  if (state.description) {
    base['aria-description'] = state.description
  }

  switch (elementType) {
    case 'button':
      return {
        ...base,
        role: 'button',
        'aria-pressed': state.pressed,
        tabIndex: state.disabled ? -1 : 0,
      }

    case 'panel':
      return {
        ...base,
        role: 'region',
        'aria-expanded': state.expanded,
        'aria-controls': state.controls,
      }

    case 'tab':
      return {
        ...base,
        role: 'tab',
        'aria-selected': state.selected,
        'aria-controls': state.controls,
        tabIndex: state.selected ? 0 : -1,
      }

    case 'node':
      return {
        ...base,
        role: 'treeitem',
        'aria-selected': state.selected,
        'aria-level': state.level,
        'aria-setsize': state.setSize,
        'aria-posinset': state.posInSet,
        'aria-owns': state.owns,
        tabIndex: state.selected ? 0 : -1,
      }

    case 'edge':
      return {
        ...base,
        role: 'img',
      }

    default:
      return base
  }
}

// ── Screen reader announcements ─────────────────────────────────────────────

let liveRegionEl: HTMLElement | null = null

/**
 * Push a screen reader announcement via an aria-live region.
 * If the live region element doesn't exist in the DOM, this is a no-op.
 */
export function announceStateChange(message: string): void {
  if (!liveRegionEl) {
    liveRegionEl = document.getElementById('course-map-live-region')
  }
  if (liveRegionEl) {
    // Clear then set to ensure repeated identical messages are announced
    liveRegionEl.textContent = ''
    requestAnimationFrame(() => {
      if (liveRegionEl) {
        liveRegionEl.textContent = message
      }
    })
  }
}

// ── Focus trap ──────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface FocusTrapCleanup {
  release: () => void
}

/**
 * Trap or release focus within a panel element.
 * Returns a cleanup object with a release() method.
 */
export function manageFocusTrap(
  panelEl: HTMLElement,
  active: boolean,
): FocusTrapCleanup | null {
  if (!active) return null

  const focusableEls = panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  if (focusableEls.length === 0) return null

  const firstEl = focusableEls[0]
  const lastEl = focusableEls[focusableEls.length - 1]

  // Store previously focused element for restore
  const previouslyFocused = document.activeElement as HTMLElement | null

  // Focus first element
  firstEl.focus()

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    // Re-query in case DOM changed
    const currentFocusable = panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (currentFocusable.length === 0) return

    const first = currentFocusable[0]
    const last = currentFocusable[currentFocusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  panelEl.addEventListener('keydown', handleKeyDown)

  return {
    release() {
      panelEl.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    },
  }
}

// ── Graph traversal keymap ──────────────────────────────────────────────────

export interface KeyBinding {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  description: string
  action: string
}

/**
 * Return the keyboard shortcuts for graph navigation.
 */
export function getGraphTraversalKeymap(): KeyBinding[] {
  return [
    { key: 'ArrowUp', description: 'Move to node above', action: 'navigate-up' },
    { key: 'ArrowDown', description: 'Move to node below', action: 'navigate-down' },
    { key: 'ArrowLeft', description: 'Move to node left', action: 'navigate-left' },
    { key: 'ArrowRight', description: 'Move to node right', action: 'navigate-right' },
    { key: 'Tab', description: 'Cycle to next node', action: 'cycle-next' },
    { key: 'Tab', modifiers: ['shift'], description: 'Cycle to previous node', action: 'cycle-prev' },
    { key: 'Enter', description: 'Open node details', action: 'select' },
    { key: 'Escape', description: 'Close panel / cancel action', action: 'deselect' },
    { key: 'Home', description: 'Jump to first node', action: 'jump-first' },
    { key: 'End', description: 'Jump to last node', action: 'jump-last' },
    { key: 'e', description: 'Start connect mode (editors)', action: 'start-connect' },
    { key: '?', description: 'Open keyboard shortcuts help', action: 'help' },
  ]
}
