'use client'

import CollectionGallery from '../components/CollectionGallery'
import { WRITE_ROOM_TOOLS } from '../lib/write-room'

export default function WriteRoomPageClient() {
  return (
    <CollectionGallery
      title="Write Room"
      description="AI-powered writing tools for resumes, cover letters, emails, and professional profiles."
      tools={WRITE_ROOM_TOOLS}
      basePath="/write-room"
    />
  )
}
