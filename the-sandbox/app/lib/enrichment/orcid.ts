// ─── ORCID Public API Client ───────────────────────────────────────────────────
// Uses the public ORCID API (no auth required) to find researcher profiles.
// Docs: https://pub.orcid.org/v3.0/

import type { OrcidProfile } from './types'

const ORCID_BASE = 'https://pub.orcid.org/v3.0'
const TIMEOUT_MS = 5000

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'The-Sandbox-Enrichment/1.0 (educational platform)',
      },
    })
    clearTimeout(id)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ORCID JSON search response types (subset)
type OrcidSearchResponse = {
  'num-found': number
  result?: Array<{
    'orcid-identifier': {
      path: string
      uri:  string
    }
  }>
}

type OrcidRecord = {
  person?: {
    name?: {
      'given-names'?: { value: string }
      'family-name'?: { value: string }
    }
    biography?: { content: string }
    keywords?: {
      keyword?: Array<{ content: string }>
    }
  }
}

/**
 * Searches ORCID for a researcher by name affiliated with University of Kentucky.
 * Returns the first matching profile with keywords, or null.
 */
export async function findOrcidProfile(firstName: string, lastName: string): Promise<OrcidProfile | null> {
  const q = `given-names:${encodeURIComponent(firstName)}+AND+family-name:${encodeURIComponent(lastName)}+AND+affiliation-org-name:Kentucky`
  const searchUrl = `${ORCID_BASE}/search/?q=${q}&rows=3&start=0`

  const search = await fetchJson<OrcidSearchResponse>(searchUrl)
  if (!search || !search['num-found'] || !search.result?.length) return null

  // Try each result in order, return first with keywords
  for (const item of search.result) {
    const orcidId = item['orcid-identifier']?.path
    if (!orcidId) continue

    const record = await fetchJson<OrcidRecord>(`${ORCID_BASE}/${orcidId}/record`)
    if (!record?.person) continue

    const keywords = (record.person.keywords?.keyword ?? [])
      .map((k) => k.content?.trim())
      .filter((k): k is string => Boolean(k) && k.length > 1)

    const profile: OrcidProfile = {
      orcidId,
      firstName: record.person.name?.['given-names']?.value ?? null,
      lastName:  record.person.name?.['family-name']?.value ?? null,
      keywords,
      biography: record.person.biography?.content ?? null,
    }

    return profile
  }

  return null
}
