'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

const listeners = new Map<Element, () => void>()
let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = listeners.get(entry.target)
          if (cb) {
            cb()
            listeners.delete(entry.target)
            observer!.unobserve(entry.target)
          }
        }
      }
    })
  }
  return observer
}

export function useSharedInView<T extends HTMLElement = HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    const obs = getObserver()
    listeners.set(el, () => setInView(true))
    obs.observe(el)

    return () => {
      listeners.delete(el)
      obs.unobserve(el)
    }
  }, [inView])

  return [ref, inView]
}
