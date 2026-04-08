import { Metadata } from 'next'
import InnovationLabPageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Innovation Lab | University of Kentucky',
  description: 'Turn your ideas into protected, fundable ventures with AI-powered tools.',
}

export default function InnovationLabPage() {
  return <InnovationLabPageClient />
}
