/**
 * CampusLabs Engage API Client
 *
 * Fetches organizations and events from UK's BBNvolved instance.
 * The API is public (backed by Azure Cognitive Search) — no auth needed.
 */

const BASE = 'https://uky.campuslabs.com/engage/api/discovery';
const PAGE_SIZE = 50;
export const IMAGE_CDN = 'https://se-images.campuslabs.com/clink/images';
export const ENGAGE_BASE = 'https://uky.campuslabs.com/engage';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RawCampusOrg {
  Id: string;
  Name: string;
  ShortName: string | null;
  WebsiteKey: string;
  Description: string;
  Summary: string;
  ProfilePicture: string | null;
  CategoryNames: string[];
  Status: string;
  Visibility: string;
}

export interface RawCampusEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  startsOn: string;
  endsOn: string;
  imagePath: string | null;
  theme: string;
  categoryNames: string[];
  benefitNames: string[];
  organizationName: string;
  organizationId: number;
  organizationProfilePicture: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string;
  visibility: string;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`CampusLabs API error: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

interface OrgSearchResponse {
  '@odata.count': number;
  value: RawCampusOrg[];
}

interface EventSearchResponse {
  '@odata.count': number;
  value: RawCampusEvent[];
}

/**
 * Fetch ALL organizations (paginated, ~880 total).
 * Yields pages so the caller can upsert in batches.
 */
export async function* fetchAllOrgs(): AsyncGenerator<RawCampusOrg[], void, unknown> {
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const url =
      `${BASE}/search/organizations?` +
      `orderBy[0]=UpperName asc&top=${PAGE_SIZE}&skip=${skip}&filter=&query=`;

    const data = await fetchJson<OrgSearchResponse>(url);
    total = data['@odata.count'];
    if (data.value.length === 0) break;

    yield data.value;
    skip += PAGE_SIZE;
  }
}

/**
 * Fetch upcoming events (paginated).
 * Only fetches events ending after `since` (defaults to now).
 *
 * NOTE: The event search API caps at ~10 results per page regardless
 * of the `top` parameter, so we increment skip by actual batch size.
 */
export async function* fetchUpcomingEvents(
  since?: Date,
): AsyncGenerator<RawCampusEvent[], void, unknown> {
  const endsAfter = (since ?? new Date()).toISOString();
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const url =
      `${BASE}/event/search?` +
      `endsAfter=${encodeURIComponent(endsAfter)}` +
      `&orderByField=endsOn&orderByDirection=ascending` +
      `&status=Approved&top=${PAGE_SIZE}&skip=${skip}`;

    const data = await fetchJson<EventSearchResponse>(url);
    total = data['@odata.count'];
    if (data.value.length === 0) break;

    yield data.value;
    skip += data.value.length; // Use actual batch size (API may cap lower than PAGE_SIZE)
  }
}

/**
 * Build full image URL from a CampusLabs image UUID.
 */
export function imageUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  return `${IMAGE_CDN}/${filename}`;
}

/**
 * Build full Engage URL for an organization.
 */
export function orgUrl(websiteKey: string): string {
  return `${ENGAGE_BASE}/organization/${websiteKey}`;
}
