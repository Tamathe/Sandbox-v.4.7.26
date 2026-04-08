'use client'

import { MessageCircle } from 'lucide-react'

interface Props {
  episodeTitle: string
  currentTopic?: string
}

export default function SandyLauncher({ episodeTitle, currentTopic }: Props) {
  const handleLaunch = () => {
    const message = currentTopic
      ? `I'm listening to "${episodeTitle}" — specifically about ${currentTopic}. Can you help me understand this better?`
      : `I'm listening to "${episodeTitle}". What should I focus on?`
    window.dispatchEvent(new CustomEvent('sandy-prefill', { detail: { message, autoSend: false } }))
  }

  return (
    <button
      type="button"
      onClick={handleLaunch}
      className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#0033A0]/5 text-[#0033A0] rounded-xl hover:bg-[#0033A0]/10 transition-colors text-sm font-medium"
    >
      <MessageCircle className="size-4" />
      Ask Sandy About This
    </button>
  )
}
