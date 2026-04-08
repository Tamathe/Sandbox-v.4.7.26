'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

type LiveRoomType = 'CHALLENGE' | 'STUDY' | 'WATCH' | 'TEACHBACK' | 'SIMULATION' | 'DEBATE' | 'PROBLEM_LAB' | 'SPEED_MENTORING' | 'PEER_REVIEW' | 'OFFICE_HOURS' | 'CASE_STUDY' | 'IMPROV' | 'FISHBOWL'

interface ShareRoomButtonProps {
  roomId: string
  roomType: LiveRoomType
  title: string
  /** Visual variant — 'overlay' uses white text on dark bg, 'card' uses standard colors */
  variant?: 'overlay' | 'card'
}

const SHARE_TEMPLATES: Record<LiveRoomType, (args: { title: string; shareUrl: string }) => string> = {
  CHALLENGE: ({ title, shareUrl }) => `Join my quiz battle on "${title}" at UK!\n${shareUrl}`,
  STUDY: ({ title, shareUrl }) => `Study session happening now — ${title}. Join us!\n${shareUrl}`,
  WATCH: ({ title, shareUrl }) => `Watching ${title} together. Come hang!\n${shareUrl}`,
  TEACHBACK: ({ title, shareUrl }) => `Teach-back circle on ${title}. Explain it to learn it!\n${shareUrl}`,
  SIMULATION: ({ title, shareUrl }) => `Live simulation on "${title}" — step into the scenario!\n${shareUrl}`,
  DEBATE: ({ title, shareUrl }) => `Debate room open: "${title}". Pick a side and argue!\n${shareUrl}`,
  PROBLEM_LAB: ({ title, shareUrl }) => `Problem lab on "${title}" — let's solve it together!\n${shareUrl}`,
  SPEED_MENTORING: ({ title, shareUrl }) => `Speed mentoring session: "${title}". Quick rounds, real advice!\n${shareUrl}`,
  PEER_REVIEW: ({ title, shareUrl }) => `Peer review session on "${title}". Give and get feedback!\n${shareUrl}`,
  OFFICE_HOURS: ({ title, shareUrl }) => `Office hours open: "${title}". Drop in with your questions!\n${shareUrl}`,
  CASE_STUDY: ({ title, shareUrl }) => `Case study session on "${title}". Analyze and discuss!\n${shareUrl}`,
  IMPROV: ({ title, shareUrl }) => `Improv session: "${title}". Think on your feet!\n${shareUrl}`,
  FISHBOWL: ({ title, shareUrl }) => `Fishbowl discussion on "${title}". Listen, then jump in!\n${shareUrl}`,
}

export default function ShareRoomButton({ roomId, roomType, title, variant = 'overlay' }: ShareRoomButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/join-room/${roomId}`
    const shareText = SHARE_TEMPLATES[roomType]({ title, shareUrl })

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} — University of Kentucky`,
          text: shareText,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share or clipboard failed — try fallback
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Silently fail
      }
    }
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
        {copied ? 'Copied!' : 'Invite'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
