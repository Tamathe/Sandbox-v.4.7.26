import { Metadata } from 'next'
import ResearchHubPageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Research Hub | University of Kentucky',
  description: 'AI-powered tools for literature search, grant writing, methodology critique, and citation guidance.',
}

export default function ResearchHubPage() {
  return <ResearchHubPageClient />
}
