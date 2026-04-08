'use client'

import CollectionGallery from '../components/CollectionGallery'
import { WELLNESS_HUB_TOOLS } from '../lib/wellness-hub'

export default function WellnessHubPageClient() {
  return (
    <CollectionGallery
      title="Wellness Hub"
      description="Track your daily habits, mood, sleep, and symptoms. AI identifies patterns and offers personalized insights over time."
      tools={WELLNESS_HUB_TOOLS}
      basePath="/wellness-hub"
      accentColor="#059669"
    />
  )
}
