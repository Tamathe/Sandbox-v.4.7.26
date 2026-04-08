import { useState, useEffect } from 'react'

/**
 * Advances through a list of loading messages, stopping at the last one.
 * Does not cycle — intentionally lands on the final message and holds.
 *
 * @param messages  Ordered list of loading copy strings
 * @param intervalMs  How long to show each message before advancing (default 2000ms)
 * @param active  Whether the loading state is currently active
 * @returns The current message string, or '' when not active
 */
export function useRotatingMessage(
  messages: string[],
  intervalMs = 2000,
  active = false
): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }

    if (index >= messages.length - 1) return

    const timer = setTimeout(() => {
      setIndex(i => Math.min(i + 1, messages.length - 1))
    }, intervalMs)

    return () => clearTimeout(timer)
  }, [active, index, messages.length, intervalMs])

  if (!active) return ''
  return messages[index] ?? ''
}
