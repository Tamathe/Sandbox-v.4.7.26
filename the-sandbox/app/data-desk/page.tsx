import { Metadata } from 'next'
import DataDeskPageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Data Desk | University of Kentucky',
  description: 'Make sense of data without being a data scientist. AI-powered analysis for charts, surveys, and reports.',
}

export default function DataDeskPage() {
  return <DataDeskPageClient />
}
