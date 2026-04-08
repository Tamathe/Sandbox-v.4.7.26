import PageClient from './PageClient'
import type { Metadata } from 'next'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Audio Hub | University of Kentucky',
}

export default function Page() {
  return <PageClient />
}
