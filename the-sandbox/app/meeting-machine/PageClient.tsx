'use client'

import CollectionGallery from '../components/CollectionGallery'
import { MEETING_MACHINE_TOOLS } from '../lib/meeting-machine'

export default function MeetingMachinePageClient() {
  return (
    <CollectionGallery
      title="Meeting Machine"
      description="AI tools to make meetings worthwhile — from agenda to action items to follow-up emails."
      tools={MEETING_MACHINE_TOOLS}
      basePath="/meeting-machine"
    />
  )
}
