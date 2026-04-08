// ─── In-Process LRU Caches for Hot Reference Data ──────────────────────────
// Complements unstable_cache (disk/CDN) with per-process in-memory lookups.
// Zero serialization overhead — objects stay on the V8 heap.
//
// Pattern: service checks LRU → if miss, queries DB → sets LRU → returns.
// Invalidation: call the invalidate* export after any mutation.

import { LRUCache } from 'lru-cache'
import type { CampusBuilding } from '../generated/prisma'

// ── Types (matching the shapes returned by service queries) ─────────────────

/** Lightweight department card (matches listDepartments / getFeaturedDepartments shape) */
interface DepartmentListEntry {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  themeColor: string | null
  websiteUrl: string | null
  contactEmail: string | null
  visibility: string
  featured: boolean
  displayOrder: number
  categoryTags: string[]
  createdAt: Date
  updatedAt: Date
  _count: { collections: number; followers: number; members: number }
}

interface DepartmentListResult {
  departments: DepartmentListEntry[]
  total: number
  page: number
  pageSize: number
}

/** Active announcement (matches getActiveAnnouncements select) */
interface AnnouncementEntry {
  id: string
  title: string
  message: string
  tone: string | null
  dismissible: boolean
  startsAt: Date
  endsAt: Date | null
  createdAt: Date
}

/** Published tool summary (matches getCachedPublishedTools select) */
interface PublishedToolEntry {
  id: string
  name: string
  shortDescription: string | null
  category: string | null
  toolType: string
  isOfficialService: boolean
}

// ── Caches ──────────────────────────────────────────────────────────────────

const departmentListCache = new LRUCache<string, DepartmentListResult>({
  max: 50,
  ttl: 300_000, // 5 min
})

const featuredDepartmentCache = new LRUCache<string, DepartmentListEntry[]>({
  max: 10,
  ttl: 300_000,
})

const announcementCache = new LRUCache<string, AnnouncementEntry[]>({
  max: 10,
  ttl: 120_000, // 2 min
})

const campusBuildingCache = new LRUCache<string, CampusBuilding[]>({
  max: 10,
  ttl: 300_000,
})

const publishedToolCache = new LRUCache<string, PublishedToolEntry[]>({
  max: 50,
  ttl: 300_000,
})

// ── Department List ─────────────────────────────────────────────────────────

export function getCachedDepartmentListLRU(key: string): DepartmentListResult | undefined {
  return departmentListCache.get(key)
}

export function setCachedDepartmentListLRU(key: string, data: DepartmentListResult): void {
  departmentListCache.set(key, data)
}

export function invalidateDepartmentListCache(): void {
  departmentListCache.clear()
  featuredDepartmentCache.clear()
}

// ── Featured Departments ────────────────────────────────────────────────────

export function getCachedFeaturedDepartmentsLRU(): DepartmentListEntry[] | undefined {
  return featuredDepartmentCache.get('featured')
}

export function setCachedFeaturedDepartmentsLRU(departments: DepartmentListEntry[]): void {
  featuredDepartmentCache.set('featured', departments)
}

// ── Active Announcements ────────────────────────────────────────────────────

export function getCachedAnnouncementsLRU(): AnnouncementEntry[] | undefined {
  return announcementCache.get('active')
}

export function setCachedAnnouncementsLRU(announcements: AnnouncementEntry[]): void {
  announcementCache.set('active', announcements)
}

export function invalidateAnnouncementCache(): void {
  announcementCache.clear()
}

// ── Campus Buildings ────────────────────────────────────────────────────────

export function getCachedCampusBuildingsLRU(): CampusBuilding[] | undefined {
  return campusBuildingCache.get('all')
}

export function setCachedCampusBuildingsLRU(buildings: CampusBuilding[]): void {
  campusBuildingCache.set('all', buildings)
}

export function invalidateCampusBuildingCache(): void {
  campusBuildingCache.clear()
}

// ── Published Tools Catalog ─────────────────────────────────────────────────

export function getCachedPublishedToolsLRU(): PublishedToolEntry[] | undefined {
  return publishedToolCache.get('catalog')
}

export function setCachedPublishedToolsLRU(tools: PublishedToolEntry[]): void {
  publishedToolCache.set('catalog', tools)
}

export function invalidatePublishedToolCache(): void {
  publishedToolCache.clear()
}
