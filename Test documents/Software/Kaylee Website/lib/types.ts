// ─────────────────────────────────────────────────────────────────────────────
// Sanity data types — mirrors the schema fields defined in /schemas/
// ─────────────────────────────────────────────────────────────────────────────

export interface SanityImageAsset {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface SanityFileAsset {
  _type: 'file'
  asset: {
    _ref: string
    _type: 'reference'
    url?: string
  }
}

// ── Site Settings ─────────────────────────────────────────────────────────────
export interface SiteSettings {
  siteTitle: string
  siteDescription: string
  ogImage?: SanityImageAsset
  socialLinks?: {
    instagram?: string
    tiktok?: string
    twitter?: string
    youtube?: string
  }
  contactEmail?: string
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export interface HeroData {
  firstName: string
  lastName: string
  tagline: string
  subTagline?: string
  backgroundImage?: SanityImageAsset
  backgroundVideoUrl?: string
  ctaText?: string
  ctaLink?: string
  accentStat?: string
}

// ── Bio ───────────────────────────────────────────────────────────────────────
export interface BioData {
  photo?: SanityImageAsset
  headline: string
  bioText?: Array<{
    _type: 'block'
    children: Array<{ _type: 'span'; text: string; marks?: string[] }>
    style?: string
  }>
  quote?: string
  quoteAuthor?: string
  quickFacts?: {
    hometown?: string
    year?: string
    major?: string
    height?: string
    yearsAtUK?: string
  }
  resumeFile?: string  // GROQ expands to URL string via resumeFile.asset->url
}

// ── Personal Records ──────────────────────────────────────────────────────────
export interface StatData {
  _id: string
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

// ── Meet Results ──────────────────────────────────────────────────────────────
export interface MeetResultData {
  _id: string
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

// ── Gallery ───────────────────────────────────────────────────────────────────
export interface GalleryItemData {
  _id: string
  title: string
  type: 'photo' | 'tiktok' | 'youtube'
  image?: SanityImageAsset
  tiktokUrl?: string
  youtubeUrl?: string
  category?: 'competition' | 'training' | 'lifestyle' | 'nil'
  date?: string
  isFeatured: boolean
  displayOrder: number
}

// ── Press & NIL ───────────────────────────────────────────────────────────────
export interface PressEntryData {
  _id: string
  title: string
  type: 'press' | 'partnership' | 'interview' | 'award'
  publication?: string
  logo?: SanityImageAsset
  date?: string
  description?: string
  url?: string
  isFeatured: boolean
  displayOrder: number
}
