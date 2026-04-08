import { prisma } from '../prisma'
import type { PersonalSiteStat, PersonalSiteMeetResult, PersonalSiteGalleryItem, PersonalSitePressEntry } from '../../generated/prisma'
import type { PersonalSiteData } from './types'

export async function getPersonalSiteBySlug(slug: string): Promise<PersonalSiteData | null> {
  const site = await prisma.personalSite.findUnique({
    where: { slug },
    include: {
      stats: { orderBy: { displayOrder: 'asc' } },
      meetResults: { orderBy: { date: 'desc' } },
      gallery: { orderBy: { displayOrder: 'asc' } },
      press: { orderBy: { displayOrder: 'asc' } },
    },
  })

  if (!site || !site.published) return null

  const socialLinks = (site.socialLinks as Record<string, string> | null) ?? {}
  const quickFacts = (site.bioQuickFacts as Record<string, string> | null) ?? {}

  return {
    slug: site.slug,
    settings: {
      siteTitle: site.siteTitle,
      siteDescription: site.siteDescription ?? undefined,
      socialLinks: {
        instagram: socialLinks.instagram,
        tiktok: socialLinks.tiktok,
        twitter: socialLinks.twitter,
        youtube: socialLinks.youtube,
      },
      contactEmail: site.contactEmail ?? undefined,
    },
    hero: {
      firstName: site.firstName,
      lastName: site.lastName,
      tagline: site.heroTagline ?? undefined,
      subTagline: site.heroSubTagline ?? undefined,
      backgroundImageUrl: site.heroImageUrl ?? undefined,
      ctaText: site.heroCtaText ?? undefined,
      ctaLink: site.heroCtaLink ?? undefined,
      accentStat: site.heroAccentStat ?? undefined,
    },
    bio: {
      headline: site.bioHeadline ?? undefined,
      bioText: site.bioText ?? undefined,
      photoUrl: site.bioPhotoUrl ?? undefined,
      quote: site.bioQuote ?? undefined,
      quoteAuthor: site.bioQuoteAuthor ?? undefined,
      quickFacts: {
        hometown: quickFacts.hometown,
        year: quickFacts.year,
        major: quickFacts.major,
        height: quickFacts.height,
        yearsAtUK: quickFacts.yearsAtUK,
      },
      resumeUrl: site.bioResumeUrl ?? undefined,
    },
    stats: site.stats.map((s: PersonalSiteStat) => ({
      id: s.id,
      event: s.event,
      mark: s.mark,
      markImperial: s.markImperial ?? undefined,
      venue: s.venue ?? undefined,
      date: s.date?.toISOString().split('T')[0],
      isIndoor: s.isIndoor,
      isPrimary: s.isPrimary,
      displayOrder: s.displayOrder,
      note: s.note ?? undefined,
    })),
    meetResults: site.meetResults.map((m: PersonalSiteMeetResult) => ({
      id: m.id,
      meetName: m.meetName,
      date: m.date.toISOString().split('T')[0],
      location: m.location ?? undefined,
      event: m.event,
      mark: m.mark,
      place: m.place ?? undefined,
      isIndoor: m.isIndoor,
      season: m.season ?? undefined,
      isHighlight: m.isHighlight,
      notes: m.notes ?? undefined,
    })),
    gallery: site.gallery.map((g: PersonalSiteGalleryItem) => ({
      id: g.id,
      title: g.title,
      type: g.type as 'photo' | 'tiktok' | 'youtube',
      imageUrl: g.imageUrl ?? undefined,
      tiktokUrl: g.tiktokUrl ?? undefined,
      youtubeUrl: g.youtubeUrl ?? undefined,
      category: g.category as 'competition' | 'training' | 'lifestyle' | 'nil' | undefined,
      date: g.date?.toISOString().split('T')[0],
      isFeatured: g.isFeatured,
      displayOrder: g.displayOrder,
    })),
    press: site.press.map((p: PersonalSitePressEntry) => ({
      id: p.id,
      title: p.title,
      type: p.type as 'press' | 'partnership' | 'interview' | 'award',
      publication: p.publication ?? undefined,
      logoUrl: p.logoUrl ?? undefined,
      date: p.date?.toISOString().split('T')[0],
      description: p.description ?? undefined,
      url: p.url ?? undefined,
      isFeatured: p.isFeatured,
      displayOrder: p.displayOrder,
    })),
    accentColor: site.accentColor,
    secondaryColor: site.secondaryColor,
  }
}
