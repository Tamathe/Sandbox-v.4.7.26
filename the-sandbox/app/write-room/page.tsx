import { Metadata } from 'next'
import WriteRoomPageClient from './PageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Write Room | University of Kentucky',
  description: 'AI-powered writing tools for resumes, cover letters, emails, and professional profiles.',
}

export default function WriteRoomPage() {
  return <WriteRoomPageClient />
}
