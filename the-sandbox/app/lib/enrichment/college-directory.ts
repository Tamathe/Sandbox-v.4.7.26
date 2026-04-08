// ─── UK College Directory Scraper ─────────────────────────────────────────────
// Attempts to find a faculty profile on UK college public-facing directories.
// All colleges use a consistent /people/[first-last] URL pattern.

import type { DirectoryProfile } from './types'
import { nameToSlug } from './name-parser'

// Known UK colleges with public /people/ directories
const COLLEGE_BASES: { college: string; base: string }[] = [
  { college: 'College of Engineering',                    base: 'https://engr.uky.edu' },
  { college: 'J. David Rosenberg College of Law',        base: 'https://law.uky.edu' },
  { college: 'Gatton College of Business and Economics', base: 'https://gatton.uky.edu' },
  { college: 'College of Medicine',                      base: 'https://med.uky.edu' },
  { college: 'College of Public Health',                 base: 'https://publichealth.uky.edu' },
  { college: 'College of Pharmacy',                      base: 'https://pharmacy.uky.edu' },
  { college: 'College of Nursing',                       base: 'https://nursing.uky.edu' },
  { college: 'College of Dentistry',                     base: 'https://dentistry.uky.edu' },
  { college: 'College of Education',                     base: 'https://education.uky.edu' },
  { college: 'College of Social Work',                   base: 'https://socialwork.uky.edu' },
  { college: 'College of Fine Arts',                     base: 'https://finearts.uky.edu' },
  { college: 'College of Communication and Information', base: 'https://ci.uky.edu' },
]

const FETCH_TIMEOUT_MS = 4000

async function fetchWithTimeout(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'The-Sandbox-Enrichment/1.0 (educational platform)' },
    })
    clearTimeout(id)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ─── HTML parsing helpers (regex-based, no external deps) ────────────────────

function extractText(html: string, pattern: RegExp): string | null {
  const m = pattern.exec(html)
  return m ? decodeHtmlEntities(m[1].trim()) : null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')    // strip remaining tags
    .replace(/\s+/g, ' ')
    .trim()
}

function extractEmailFromHtml(html: string): string | null {
  const m = /href="mailto:([^"@]+@uky\.edu)"/i.exec(html)
  return m ? m[1].toLowerCase() : null
}

function extractTitle(html: string): string | null {
  // Engineering pattern: <div>Associate Professor</div> near a department div
  // Try several patterns in order of confidence

  // Pattern: field-label "Position" or "Title" followed by value
  let m = /<div[^>]*>\s*(?:Position|Title)\s*<\/div>\s*<div[^>]*>([^<]+)<\/div>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1])

  // Pattern: <div class="...title...">...</div>
  m = /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{3,60})<\/div>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1])

  // Pattern: standalone div with a known academic title
  const titlePattern = /(?:Professor|Associate Professor|Assistant Professor|Instructor|Lecturer|Dean|Director|Adjunct)\b[^<]{0,50}/i
  const bodyM = titlePattern.exec(html.replace(/<script[\s\S]*?<\/script>/gi, ''))
  if (bodyM) return decodeHtmlEntities(bodyM[0]).trim()

  return null
}

function extractDepartment(html: string): string | null {
  // Pattern: <div>Department</div> <div>value</div>
  let m = /<div[^>]*>\s*Department\s*<\/div>\s*<div[^>]*>([^<]{3,80})<\/div>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1])

  // Pattern: <a href="/department/...">...</a>
  m = /href="\/department\/[^"]+">([^<]{3,80})<\/a>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1])

  return null
}

function extractBio(html: string): string | null {
  // Try <section> or <div> with class containing "bio" or "about"
  let m = /<(?:section|div)[^>]*class="[^"]*(?:bio|about|summary)[^"]*"[^>]*>([\s\S]{20,800}?)<\/(?:section|div)>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1]).slice(0, 600)

  // Field labelled "Bio" or "About"
  m = /<div[^>]*>\s*(?:Bio|About)\s*<\/div>\s*<div[^>]*>([\s\S]{20,600}?)<\/div>/i.exec(html)
  if (m) return decodeHtmlEntities(m[1]).slice(0, 600)

  return null
}

function extractResearchInterests(html: string): string[] {
  // Pattern: <h3>Research Interests:</h3> or similar heading + list items
  const sectionMatch = /<h[2-4][^>]*>[^<]*Research\s+Interests[^<]*<\/h[2-4]>([\s\S]{0,800}?)(?=<h[2-4]|$)/i.exec(html)
  if (!sectionMatch) return []

  const section = sectionMatch[1]
  const items: string[] = []

  // Extract <li> items
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let m: RegExpExecArray | null
  while ((m = liPattern.exec(section)) !== null) {
    const text = decodeHtmlEntities(m[1])
    if (text.length > 2 && text.length < 80) {
      items.push(text)
    }
  }

  // If no list items, try plain text lines
  if (items.length === 0) {
    const plain = decodeHtmlEntities(section)
    plain.split(/[,;\n]/).forEach((part) => {
      const t = part.trim()
      if (t.length > 3 && t.length < 80) items.push(t)
    })
  }

  return items.slice(0, 8)
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Tries to find a faculty profile for `name` across all UK college directories.
 * Fires requests to all colleges in parallel and returns the first hit.
 * Returns null if no college profile is found within the timeout.
 */
export async function findCollegeProfile(name: string): Promise<DirectoryProfile | null> {
  const slug = nameToSlug(name)
  if (!slug) return null

  const attempts = COLLEGE_BASES.map(async ({ college, base }) => {
    const url = `${base}/people/${slug}`
    const html = await fetchWithTimeout(url)
    if (!html) return null

    // Quick sanity check: page should mention the name
    const nameWords = name.toLowerCase().split(' ')
    const htmlLower = html.toLowerCase()
    const nameFound = nameWords.every((w) => htmlLower.includes(w))
    if (!nameFound) return null

    const profile: DirectoryProfile = {
      name,
      title:             extractTitle(html),
      department:        extractDepartment(html),
      college,
      email:             extractEmailFromHtml(html),
      bioText:           extractBio(html),
      researchInterests: extractResearchInterests(html),
      profileUrl:        url,
      source:            'college-faculty-page',
    }

    return profile
  })

  // Return first non-null result
  const results = await Promise.allSettled(attempts)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) {
      return r.value
    }
  }
  return null
}
