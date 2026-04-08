import { Metadata } from 'next'

export const revalidate = 3600

import CampusMapPageClient from './CampusMapPageClient'

export const metadata: Metadata = {
  title: 'Campus Map | University of Kentucky',
  description: 'Interactive map of the University of Kentucky campus',
}

export default function CampusMapPage() {
  return <CampusMapPageClient />
}
