'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'

interface WarmStartBannerProps {
  bannerText: string
  onDismiss: () => void
  onShowChat: () => void
}

export default function WarmStartBanner({
  bannerText,
  onDismiss,
  onShowChat,
}: WarmStartBannerProps) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  const dismiss = useCallback(() => {
    setFading(true)
  }, [])

  // Unmount after fade-out completes
  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 300)
    return () => clearTimeout(timer)
  }, [fading, onDismiss])

  if (!visible) return null

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <Sparkles className="size-5 shrink-0 text-[#0033A0]" />
      <span className="flex-1 font-medium">{bannerText}</span>

      <button
        type="button"
        onClick={() => {
          onShowChat()
          dismiss()
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#002580]"
      >
        <MessageCircle className="size-3.5" />
        Show Chat
      </button>

      <button
        type="button"
        onClick={dismiss}
        className="rounded-xl border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
      >
        Dismiss
      </button>
    </div>
  )
}
