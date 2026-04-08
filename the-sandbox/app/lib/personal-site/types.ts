// ── Personal Site data types (replaces Sanity types) ──────────────────────

export interface SiteSettings {
  siteTitle: string
  siteDescription?: string
  socialLinks?: {
    instagram?: string
    tiktok?: string
    twitter?: string
    youtube?: string
  }
  contactEmail?: string
}

export interface HeroData {
  firstName: string
  lastName: string
  tagline?: string
  subTagline?: string
  backgroundImageUrl?: string
  ctaText?: string
  ctaLink?: string
  accentStat?: string
}

export interface BioData {
  headline?: string
  bioText?: string
  photoUrl?: string
  quote?: string
  quoteAuthor?: string
  quickFacts?: {
    hometown?: string
    year?: string
    major?: string
    height?: string
    yearsAtUK?: string
  }
  resumeUrl?: string
}

export interface StatData {
  id: string
  event: string
  mark: string
  markImperial?: string
  venue?: string
  date?: string
  isIndoor: boolean
  isPrimary: boolean
  displayOrder: number
  note?: string
}

export interface MeetResultData {
  id: string
  meetName: string
  date: string
  location?: string
  event: string
  mark: string
  place?: number
  isIndoor: boolean
  season?: string
  isHighlight: boolean
  notes?: string
}

export interface GalleryItemData {
  id: string
  title: string
  type: 'photo' | 'tiktok' | 'youtube'
  imageUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
  category?: 'competition' | 'training' | 'lifestyle' | 'nil'
  date?: string
  isFeatured: boolean
  displayOrder: number
}

export interface PressEntryData {
  id: string
  title: string
  type: 'press' | 'partnership' | 'interview' | 'award'
  publication?: string
  logoUrl?: string
  date?: string
  description?: string
  url?: string
  isFeatured: boolean
  displayOrder: number
}

export interface PersonalSiteData {
  slug: string
  settings: SiteSettings
  hero: HeroData
  bio: BioData
  stats: StatData[]
  meetResults: MeetResultData[]
  gallery: GalleryItemData[]
  press: PressEntryData[]
  accentColor: string
  secondaryColor: string
}
