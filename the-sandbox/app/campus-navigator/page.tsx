import PageClient from './PageClient'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Campus Navigator | University of Kentucky',
}

export default function Page() {
  return <PageClient />
}
