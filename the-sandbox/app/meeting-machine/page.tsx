import { Metadata } from 'next'
import MeetingMachinePageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Meeting Machine | University of Kentucky',
  description: 'AI tools to make meetings worthwhile — from agenda to action items to follow-up emails.',
}

export default function MeetingMachinePage() {
  return <MeetingMachinePageClient />
}
