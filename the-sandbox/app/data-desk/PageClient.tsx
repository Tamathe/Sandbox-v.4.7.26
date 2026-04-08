'use client'

import CollectionGallery from '../components/CollectionGallery'
import { DATA_DESK_TOOLS } from '../lib/data-desk'

export default function DataDeskPageClient() {
  return (
    <CollectionGallery
      title="Data Desk"
      description="Make sense of data without being a data scientist. Upload charts, surveys, or reports and get AI-powered analysis."
      tools={DATA_DESK_TOOLS}
      basePath="/data-desk"
    />
  )
}
