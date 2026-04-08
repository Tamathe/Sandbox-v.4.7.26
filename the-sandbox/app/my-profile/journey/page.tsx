'use client'

import PageHeader from '../../components/PageHeader'
import JourneyTimeline from '../../components/journey/JourneyTimeline'

export default function JourneyPage() {
  return (
    <div>
      <PageHeader
        title="My Learning Journey"
        subtitle="Your holistic timeline — study patterns, milestones, and growth over time"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JourneyTimeline />
      </div>
    </div>
  )
}
