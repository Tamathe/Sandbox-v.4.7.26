'use client'

import { useState } from 'react'

/**
 * CappedList — Show a max of `cap` items with a "Show all N" expand toggle.
 *
 * Works for any list pattern: cards, divs, list items, etc.
 * For table rows, use the `useExpandableList` hook instead.
 *
 * Usage:
 *   <CappedList items={students} cap={4} renderItem={(s) => <StudentCard key={s.id} student={s} />} />
 */
export function CappedList<T>({
  items,
  cap = 4,
  className = 'space-y-2',
  renderItem,
  noun,
}: {
  items: T[]
  cap?: number
  className?: string
  renderItem: (item: T, index: number) => React.ReactNode
  noun?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const display = expanded ? items : items.slice(0, cap)
  const label = noun || 'items'

  return (
    <div className={className}>
      {display.map((item, i) => renderItem(item, i))}
      {items.length > cap && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length} ${label}`}
        </button>
      )}
    </div>
  )
}

/**
 * useExpandableList — Hook for table-based lists where you need to
 * control the slice and render the expand button as a <tr>.
 *
 * Usage:
 *   const { displayItems, expandButton } = useExpandableList(students, 4, 'students')
 *   <tbody>
 *     {displayItems.map(s => <tr>...</tr>)}
 *   </tbody>
 *   {expandButton}
 */
export function useExpandableList<T>(items: T[], cap = 4, noun = 'items') {
  const [expanded, setExpanded] = useState(false)
  const displayItems = expanded ? items : items.slice(0, cap)
  const hasMore = items.length > cap

  const expandButton = hasMore ? (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full py-2.5 text-sm font-medium text-[#0033A0] hover:bg-blue-50 transition-colors border-t border-gray-100"
    >
      {expanded ? 'Show fewer' : `Show all ${items.length} ${noun}`}
    </button>
  ) : null

  const expandRow = hasMore ? (
    <tr>
      <td colSpan={99}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-sm font-medium text-[#0033A0] hover:bg-blue-50 transition-colors"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length} ${noun}`}
        </button>
      </td>
    </tr>
  ) : null

  return { displayItems, expandButton, expandRow, expanded, setExpanded, hasMore }
}
