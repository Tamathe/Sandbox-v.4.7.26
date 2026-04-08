import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 3600
import { getPersonalSiteBySlug } from '@/app/lib/personal-site/queries'
import PersonalSiteRenderer from './PersonalSiteRenderer'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const site = await getPersonalSiteBySlug(slug)
  if (!site) return { title: 'Site Not Found' }

  return {
    title: site.settings.siteTitle,
    description: site.settings.siteDescription ?? `${site.hero.firstName} ${site.hero.lastName} — Personal Site`,
    openGraph: {
      title: site.settings.siteTitle,
      description: site.settings.siteDescription ?? undefined,
    },
  }
}

export default async function PersonalSitePage({ params }: PageProps) {
  const { slug } = await params
  const site = await getPersonalSiteBySlug(slug)
  if (!site) notFound()

  return <PersonalSiteRenderer site={site} />
}
