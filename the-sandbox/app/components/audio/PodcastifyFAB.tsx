'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import PodcastifyModal from './PodcastifyModal'

export default function PodcastifyFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-[#0033A0] text-white shadow-lg hover:bg-[#002880] transition-colors"
        title="Create Podcast"
        aria-label="Create Podcast"
      >
        <Plus className="size-6" />
      </button>

      {open && <PodcastifyModal onClose={() => setOpen(false)} />}
    </>
  )
}
