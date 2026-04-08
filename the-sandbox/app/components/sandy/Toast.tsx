'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'

interface ToastData {
  id: string
  message: string
  action?: { label: string; href: string }
}

const TOAST_EVENT = 'sandy-toast'
const TOAST_DURATION = 2000

/** Fire-and-forget toast from anywhere — no provider needed */
export function showToast(message: string, action?: { label: string; href: string }) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { id: crypto.randomUUID(), message, action },
    })
  )
}

/** Mount once in layout — listens for toast events and renders them */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const handleToast = useCallback((e: Event) => {
    const toast = (e as CustomEvent<ToastData>).detail
    setToasts(prev => [...prev, toast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, TOAST_DURATION)
  }, [])

  useEffect(() => {
    window.addEventListener(TOAST_EVENT, handleToast)
    return () => window.removeEventListener(TOAST_EVENT, handleToast)
  }, [handleToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <Check className="size-3.5 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
          {toast.action && (
            <a
              href={toast.action.href}
              className="ml-1 text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2"
            >
              {toast.action.label}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
