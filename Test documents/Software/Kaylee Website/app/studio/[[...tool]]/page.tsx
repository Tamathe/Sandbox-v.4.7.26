'use client'

/**
 * Embedded Sanity Studio
 *
 * The athlete can access her CMS dashboard at /studio
 * She logs in with her Sanity.io account credentials.
 *
 * Security: this route is powered by Sanity's own auth — only users with
 * access to the project will see any content. No extra auth needed.
 */
import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'

// Studio must render client-side only
export const dynamic = 'force-dynamic'

export default function StudioPage() {
  return <NextStudio config={config} />
}
