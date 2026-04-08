import { Metadata } from 'next'
import WellnessHubPageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Wellness Hub | University of Kentucky',
  description: 'Track your daily habits, mood, sleep, and symptoms with AI-powered insights.',
}

export default function WellnessHubPage() {
  return <WellnessHubPageClient />
}
