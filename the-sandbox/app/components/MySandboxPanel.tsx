'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Sun, Moon, Monitor, Pin, PinOff, GripVertical, ChevronUp, ChevronDown, Palette, LayoutGrid, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import { useApiFetch } from '../hooks/useApiFetch'
import { useTheme } from './ThemeProvider'

interface CourseInfo {
  courseId: string
  courseCode: string
  title: string
}

interface Preferences {
  theme: string
  courseColors: Record<string, string>
  courseOrder: string[]
  pinnedCourseIds: string[]
  widgetOrder: string[]
  collapsedWidgets: string[]
  dashboardDensity: string
}

const WIDGET_SECTIONS = [
  { id: 'greeting', label: 'Greeting' },
  { id: 'beacon', label: 'Beacon & Due Dates' },
  { id: 'right-now-card', label: 'Right Now' },
  { id: 'quick-actions', label: 'Quick Actions' },
  { id: 'learning-profile', label: 'Learning Profile' },
  { id: 'top-strip', label: 'Email, Calendar & Tasks' },
  { id: 'sandy-briefing', label: 'Sandy Briefing' },
  { id: 'course-posts', label: 'Course Posts' },
  { id: 'courses', label: 'My Courses' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'campus-news', label: 'Campus News' },
  { id: 'continue-tools', label: 'Continue Tools' },
  { id: 'learning-recap', label: 'Learning Recap' },
  { id: 'tomorrow-preview', label: 'Tomorrow Preview' },
  { id: 'wind-down', label: 'Wind Down' },
] as const

const DENSITY_OPTIONS = [
  { value: 'compact' as const, label: 'Compact' },
  { value: 'comfortable' as const, label: 'Comfortable' },
  { value: 'spacious' as const, label: 'Spacious' },
] as const

const COLOR_PRESETS = [
  '#0033A0', '#1D4ED8', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2',
  '#6B7280', '#374151',
]

const COLOR_PRESET_NAMES = [
  'UK Blue', 'Blue', 'Purple', 'Pink', 'Red',
  'Orange', 'Amber', 'Green', 'Emerald', 'Cyan',
  'Gray', 'Dark Gray',
]

export default function MySandboxPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useAuth()
  const { theme, setTheme } = useTheme()

  // Fetch preferences + courses via SWR (conditional on panel being open)
  const { data: prefsData, isLoading: prefsLoading } = useApiFetch<{ preferences: Preferences }>(
    open ? '/api/sandy/preferences' : null,
  )
  const { data: coursesData, isLoading: coursesLoading } = useApiFetch<Array<{ id: string; courseCode: string; title: string }>>(
    open ? '/api/courses' : null,
  )
  const loading = prefsLoading || coursesLoading

  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [prefs, setPrefs] = useState<Preferences>({
    theme: 'system',
    courseColors: {},
    courseOrder: [],
    pinnedCourseIds: [],
    widgetOrder: [],
    collapsedWidgets: [],
    dashboardDensity: 'comfortable',
  })
  const [saving, setSaving] = useState(false)
  const [colorPickerCourse, setColorPickerCourse] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Sync SWR data into local state (local state needed for optimistic updates)
  useEffect(() => {
    if (prefsData?.preferences) {
      const p = prefsData.preferences
      setPrefs({
        theme: p.theme ?? 'system',
        courseColors: (p.courseColors ?? {}) as Record<string, string>,
        courseOrder: (p.courseOrder ?? []) as string[],
        pinnedCourseIds: (p.pinnedCourseIds ?? []) as string[],
        widgetOrder: (p.widgetOrder ?? []) as string[],
        collapsedWidgets: (p.collapsedWidgets ?? []) as string[],
        dashboardDensity: (p.dashboardDensity ?? 'comfortable') as string,
      })
    }
  }, [prefsData])

  useEffect(() => {
    if (coursesData) {
      setCourses(coursesData.map(c => ({ courseId: c.id, courseCode: c.courseCode, title: c.title })))
    }
  }, [coursesData])

  // Persist a partial preference update
  const persistPrefs = useCallback(async (patch: Partial<Preferences>) => {
    setSaving(true)
    try {
      await apiFetch(currentUser.email, '/api/sandy/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
    } catch {
      // Fire-and-forget — next load will show current server state
    } finally {
      setSaving(false)
    }
  }, [currentUser.email])

  // Theme change
  const handleThemeChange = useCallback((t: 'light' | 'dark' | 'system') => {
    setTheme(t)
    setPrefs(prev => ({ ...prev, theme: t }))
    // ThemeProvider already persists theme, no need to double-persist
  }, [setTheme])

  // Course color change
  const handleColorChange = useCallback((courseId: string, color: string) => {
    setPrefs(prev => {
      const next = { ...prev, courseColors: { ...prev.courseColors, [courseId]: color } }
      void persistPrefs({ courseColors: next.courseColors })
      return next
    })
    setColorPickerCourse(null)
  }, [persistPrefs])

  // Remove custom color
  const handleColorRemove = useCallback((courseId: string) => {
    setPrefs(prev => {
      const { [courseId]: _, ...rest } = prev.courseColors
      const next = { ...prev, courseColors: rest }
      void persistPrefs({ courseColors: next.courseColors })
      return next
    })
    setColorPickerCourse(null)
  }, [persistPrefs])

  // Toggle pin
  const handleTogglePin = useCallback((courseId: string) => {
    setPrefs(prev => {
      const pinned = prev.pinnedCourseIds.includes(courseId)
        ? prev.pinnedCourseIds.filter(id => id !== courseId)
        : [...prev.pinnedCourseIds, courseId]
      const next = { ...prev, pinnedCourseIds: pinned }
      void persistPrefs({ pinnedCourseIds: pinned })
      return next
    })
  }, [persistPrefs])

  // Reorder course
  const handleMove = useCallback((courseId: string, direction: 'up' | 'down') => {
    setPrefs(prev => {
      const orderedIds = getOrderedCourseIds(courses, prev.courseOrder, prev.pinnedCourseIds)
      const idx = orderedIds.indexOf(courseId)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= orderedIds.length) return prev
      const newOrder = [...orderedIds]
      ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
      const next = { ...prev, courseOrder: newOrder }
      void persistPrefs({ courseOrder: newOrder })
      return next
    })
  }, [courses, persistPrefs])

  // Widget reorder
  const handleWidgetMove = useCallback((widgetId: string, direction: 'up' | 'down') => {
    setPrefs(prev => {
      const current = prev.widgetOrder.length > 0
        ? prev.widgetOrder
        : WIDGET_SECTIONS.map(w => w.id)
      const idx = current.indexOf(widgetId)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= current.length) return prev
      const newOrder = [...current]
      ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
      const next = { ...prev, widgetOrder: newOrder }
      void persistPrefs({ widgetOrder: newOrder })
      return next
    })
  }, [persistPrefs])

  // Toggle widget collapsed
  const handleToggleCollapsed = useCallback((widgetId: string) => {
    setPrefs(prev => {
      const collapsed = prev.collapsedWidgets.includes(widgetId)
        ? prev.collapsedWidgets.filter(id => id !== widgetId)
        : [...prev.collapsedWidgets, widgetId]
      const next = { ...prev, collapsedWidgets: collapsed }
      void persistPrefs({ collapsedWidgets: collapsed })
      return next
    })
  }, [persistPrefs])

  // Dashboard density change
  const handleDensityChange = useCallback((density: string) => {
    setPrefs(prev => {
      const next = { ...prev, dashboardDensity: density }
      void persistPrefs({ dashboardDensity: density })
      return next
    })
  }, [persistPrefs])

  // Close on Escape + focus trap
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Auto-focus close button when panel opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const orderedCourses = getOrderedCourses(courses, prefs.courseOrder, prefs.pinnedCourseIds)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mysandbox-heading"
        className="relative mt-16 mr-4 w-[420px] max-w-[90vw] max-h-[calc(100vh-5rem)] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 id="mysandbox-heading" className="text-lg font-extrabold text-gray-900 dark:text-gray-100">My Sandbox</h2>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close My Sandbox panel" className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="size-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-8 space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 space-y-6">
            {/* Theme Selection */}
            <section>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3">Theme</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'light' as const, label: 'Light', Icon: Sun },
                  { value: 'dark' as const, label: 'Dark', Icon: Moon },
                  { value: 'system' as const, label: 'System', Icon: Monitor },
                ]).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleThemeChange(value)}
                    aria-pressed={theme === value}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      theme === value
                        ? 'border-[#0033A0] bg-blue-50 dark:bg-blue-950/40 text-[#0033A0]'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Course Customization */}
            {orderedCourses.length > 0 && (
              <section>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3">Course Preferences</h3>
                <div className="space-y-2">
                  {orderedCourses.map((course, idx) => {
                    const isPinned = prefs.pinnedCourseIds.includes(course.courseId)
                    const customColor = prefs.courseColors[course.courseId]
                    const isFirst = idx === 0
                    const isLast = idx === orderedCourses.length - 1

                    return (
                      <div
                        key={course.courseId}
                        className="border rounded-2xl shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 p-3 flex items-center gap-3"
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMove(course.courseId, 'up')}
                            disabled={isFirst}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                            aria-label={`Move ${course.courseCode} up`}
                          >
                            <ChevronUp className="size-3.5 text-gray-500 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleMove(course.courseId, 'down')}
                            disabled={isLast}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                            aria-label={`Move ${course.courseCode} down`}
                          >
                            <ChevronDown className="size-3.5 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>

                        {/* Color indicator */}
                        <div className="relative">
                          <button
                            onClick={() => setColorPickerCourse(colorPickerCourse === course.courseId ? null : course.courseId)}
                            className="size-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center transition-colors hover:border-gray-300 dark:hover:border-gray-500"
                            style={customColor ? { backgroundColor: customColor, borderColor: customColor } : undefined}
                            aria-label={`Set color for ${course.courseCode}`}
                          >
                            {!customColor && <Palette className="size-4 text-gray-400" />}
                          </button>

                          {/* Color picker dropdown */}
                          {colorPickerCourse === course.courseId && (
                            <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3 w-48">
                              <div className="grid grid-cols-6 gap-1.5 mb-2">
                                {COLOR_PRESETS.map((color, ci) => (
                                  <button
                                    key={color}
                                    onClick={() => handleColorChange(course.courseId, color)}
                                    aria-label={COLOR_PRESET_NAMES[ci]}
                                    className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                                    style={{ backgroundColor: color, borderColor: customColor === color ? '#1e293b' : 'transparent' }}
                                  />
                                ))}
                              </div>
                              {customColor && (
                                <button
                                  onClick={() => handleColorRemove(course.courseId)}
                                  className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1"
                                >
                                  Remove custom color
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Course info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{course.courseCode}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{course.title}</p>
                        </div>

                        {/* Pin toggle */}
                        <button
                          onClick={() => handleTogglePin(course.courseId)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPinned ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0033A0]' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                          }`}
                          aria-label={isPinned ? `Unpin ${course.courseCode}` : `Pin ${course.courseCode}`}
                        >
                          {isPinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Dashboard Layout */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="size-4 text-[#0033A0]" />
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Dashboard Layout</h3>
              </div>

              {/* Density picker */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Density</p>
                <div className="grid grid-cols-3 gap-2">
                  {DENSITY_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleDensityChange(value)}
                      className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        prefs.dashboardDensity === value
                          ? 'border-[#0033A0] bg-blue-50 dark:bg-blue-950/40 text-[#0033A0]'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Widget ordering + collapse toggles */}
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Widget Order</p>
              <div className="space-y-1.5">
                {(prefs.widgetOrder.length > 0
                  ? prefs.widgetOrder.map(id => WIDGET_SECTIONS.find(w => w.id === id)).filter(Boolean) as typeof WIDGET_SECTIONS[number][]
                  : [...WIDGET_SECTIONS]
                ).map((widget, idx, arr) => {
                  const isCollapsed = prefs.collapsedWidgets.includes(widget.id)
                  return (
                    <div
                      key={widget.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); handleWidgetMove(widget.id, 'up') }
                        if (e.key === 'ArrowDown') { e.preventDefault(); handleWidgetMove(widget.id, 'down') }
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:ring-offset-1"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleWidgetMove(widget.id, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                          aria-label={`Move ${widget.label} up`}
                        >
                          <ChevronUp className="size-3 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleWidgetMove(widget.id, 'down')}
                          disabled={idx === arr.length - 1}
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                          aria-label={`Move ${widget.label} down`}
                        >
                          <ChevronDown className="size-3 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{widget.label}</span>
                      <button
                        onClick={() => handleToggleCollapsed(widget.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          isCollapsed ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' : 'text-[#0033A0] hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                        aria-label={isCollapsed ? `Expand ${widget.label}` : `Collapse ${widget.label}`}
                      >
                        {isCollapsed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Saving indicator */}
            {saving && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Saving...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Get ordered course IDs: pinned first, then custom order, then rest */
function getOrderedCourseIds(
  courses: CourseInfo[],
  courseOrder: string[],
  pinnedCourseIds: string[],
): string[] {
  const allIds = courses.map(c => c.courseId)
  const pinned = pinnedCourseIds.filter(id => allIds.includes(id))
  const ordered = courseOrder.filter(id => allIds.includes(id) && !pinned.includes(id))
  const rest = allIds.filter(id => !pinned.includes(id) && !ordered.includes(id))
  return [...pinned, ...ordered, ...rest]
}

/** Get ordered courses */
function getOrderedCourses(
  courses: CourseInfo[],
  courseOrder: string[],
  pinnedCourseIds: string[],
): CourseInfo[] {
  const orderedIds = getOrderedCourseIds(courses, courseOrder, pinnedCourseIds)
  return orderedIds.map(id => courses.find(c => c.courseId === id)!).filter(Boolean)
}

/** Export the ordering utility for use in dashboards */
export { getOrderedCourseIds }
