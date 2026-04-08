import { client } from './sanity'
import type {
  SiteSettings,
  HeroData,
  BioData,
  StatData,
  MeetResultData,
  GalleryItemData,
  PressEntryData,
} from './types'

// ── GROQ Queries ─────────────────────────────────────────────────────────────

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  siteTitle,
  siteDescription,
  ogImage,
  socialLinks,
  contactEmail
}`

const heroQuery = `*[_type == "hero"][0]{
  firstName,
  lastName,
  tagline,
  subTagline,
  backgroundImage,
  backgroundVideoUrl,
  ctaText,
  ctaLink,
  accentStat
}`

const bioQuery = `*[_type == "bio"][0]{
  photo,
  headline,
  bioText,
  quote,
  quoteAuthor,
  quickFacts,
  "resumeFile": resumeFile.asset->url
}`

const statsQuery = `*[_type == "stat"] | order(displayOrder asc, date desc){
  _id,
  event,
  mark,
  markImperial,
  venue,
  date,
  isIndoor,
  isPrimary,
  displayOrder,
  note
}`

const meetResultsQuery = `*[_type == "meetResult"] | order(date desc){
  _id,
  meetName,
  date,
  location,
  event,
  mark,
  place,
  isIndoor,
  season,
  isHighlight,
  notes
}`

const galleryQuery = `*[_type == "galleryItem"] | order(isFeatured desc, displayOrder asc, date desc){
  _id,
  title,
  type,
  image,
  tiktokUrl,
  youtubeUrl,
  category,
  date,
  isFeatured,
  displayOrder
}`

const pressQuery = `*[_type == "pressEntry"] | order(isFeatured desc, displayOrder asc, date desc){
  _id,
  title,
  type,
  publication,
  logo,
  date,
  description,
  url,
  isFeatured,
  displayOrder
}`

// ── Fetch Functions ───────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return client.fetch(siteSettingsQuery, {}, { next: { revalidate: 60 } })
}

export async function getHero(): Promise<HeroData | null> {
  return client.fetch(heroQuery, {}, { next: { revalidate: 60 } })
}

export async function getBio(): Promise<BioData | null> {
  return client.fetch(bioQuery, {}, { next: { revalidate: 60 } })
}

export async function getStats(): Promise<StatData[]> {
  return client.fetch(statsQuery, {}, { next: { revalidate: 60 } })
}

export async function getMeetResults(): Promise<MeetResultData[]> {
  return client.fetch(meetResultsQuery, {}, { next: { revalidate: 60 } })
}

export async function getGallery(): Promise<GalleryItemData[]> {
  return client.fetch(galleryQuery, {}, { next: { revalidate: 60 } })
}

export async function getPress(): Promise<PressEntryData[]> {
  return client.fetch(pressQuery, {}, { next: { revalidate: 60 } })
}

// ── Fetch all data in one parallel call (used in page.tsx) ────────────────────
export async function getAllPageData() {
  const [settings, hero, bio, stats, meetResults, gallery, press] = await Promise.all([
    getSiteSettings(),
    getHero(),
    getBio(),
    getStats(),
    getMeetResults(),
    getGallery(),
    getPress(),
  ])

  return { settings, hero, bio, stats, meetResults, gallery, press }
}
