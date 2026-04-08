'use client'

import { Bebas_Neue } from 'next/font/google'
import type { PersonalSiteData } from '@/app/lib/personal-site/types'
import SiteNav from '@/app/components/personal-site/SiteNav'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })
import SiteHero from '@/app/components/personal-site/SiteHero'
import SiteBio from '@/app/components/personal-site/SiteBio'
import SiteStats from '@/app/components/personal-site/SiteStats'
import SiteGallery from '@/app/components/personal-site/SiteGallery'
import SitePress from '@/app/components/personal-site/SitePress'
import SiteContact from '@/app/components/personal-site/SiteContact'
import SiteFooter from '@/app/components/personal-site/SiteFooter'
import '@/app/components/personal-site/personal-site.css'

interface Props {
  site: PersonalSiteData
}

export default function PersonalSiteRenderer({ site }: Props) {
  const monogram = `${site.hero.firstName?.[0] ?? ''}${site.hero.lastName?.[0] ?? ''}`

  return (
    <div
      className={`ps-site ${bebasNeue.className}`}
      style={{
        '--ps-accent': site.accentColor,
        '--ps-secondary': site.secondaryColor,
        '--ps-display-font': `${bebasNeue.style.fontFamily}, Impact, sans-serif`,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        minHeight: '100vh',
      } as React.CSSProperties}
    >
      <SiteNav
        monogram={monogram}
        socialLinks={site.settings.socialLinks}
      />
      <SiteHero data={site.hero} />
      <SiteBio data={site.bio} />
      {(site.stats.length > 0 || site.meetResults.length > 0) && (
        <SiteStats stats={site.stats} meetResults={site.meetResults} />
      )}
      {site.gallery.length > 0 && (
        <SiteGallery items={site.gallery} />
      )}
      {site.press.length > 0 && (
        <SitePress entries={site.press} />
      )}
      <SiteContact slug={site.slug} contactEmail={site.settings.contactEmail} />
      <SiteFooter
        firstName={site.hero.firstName}
        lastName={site.hero.lastName}
        tagline={site.hero.tagline}
        socialLinks={site.settings.socialLinks}
      />
    </div>
  )
}
