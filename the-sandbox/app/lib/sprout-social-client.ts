/**
 * sprout-social-client.ts
 *
 * Server-side Sprout Social API client.
 * Base URL: https://api.sproutsocial.com
 * Auth: Bearer token via SPROUT_API_TOKEN env var.
 *
 * Endpoints used:
 *   GET  /v1/metadata/client              → customer ID discovery
 *   GET  /v1/<cid>/metadata/customer/topics → listening topics
 *   POST /v1/<cid>/listening/topics/<tid>/messages → topic messages
 *   POST /v1/<cid>/messages               → inbox messages
 */

import type { SocialPost, Platform } from './crisis-comms/reputation-pulse/types'

const BASE = 'https://api.sproutsocial.com'

// ── Types ────────────────────────────────────────────────────────────────

export interface SproutCustomer {
  customer_id: number
  company_name: string
}

export interface SproutTopic {
  topic_id: number
  name: string
  description?: string
}

/** Raw message shape from Sprout listening endpoint */
export interface SproutListeningMessage {
  guid: string
  text: string
  created_time: string
  network: string
  content_category?: string
  hashtags?: string[]
  visual_media?: { media_url: string; media_type: string }[]
  listening_metadata?: {
    sentiment?: string
    language?: string
  }
  metrics?: {
    likes?: number
    shares_count?: number
    replies?: number
    engagements?: number
  }
  from?: {
    name?: string
    guid?: string
  }
  perma_link?: string
}

/** Raw message shape from Sprout inbox endpoint */
export interface SproutInboxMessage {
  guid: string
  text: string
  created_time: string
  network: string
  post_category?: string
  post_type?: string
  perma_link?: string
  from?: {
    name?: string
    guid?: string
  }
  language_code?: string
}

export interface SproutPaging {
  current_page?: number
  total_pages?: number
  next_cursor?: string
}

export interface SproutListeningResponse {
  data: SproutListeningMessage[]
  paging: SproutPaging
}

export interface SproutInboxResponse {
  data: SproutInboxMessage[]
  paging: SproutPaging
}

export interface SproutFetchOptions {
  /** ISO date string — start of window */
  startDate: string
  /** ISO date string — end of window */
  endDate: string
  /** Max posts to fetch (default 50, max 100 per page) */
  limit?: number
  /** Page number for pagination (listening endpoints) */
  page?: number
  /** Networks to filter by */
  networks?: string[]
  /** Keyword text match filter (listening only) */
  keyword?: string
  /** Sentiment filter (listening only) */
  sentiment?: ('positive' | 'negative' | 'neutral')[]
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.SPROUT_API_TOKEN
  if (!token) throw new Error('SPROUT_API_TOKEN environment variable is not set')
  return token
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function sproutFetch<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const method = opts?.method ?? 'GET'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown')
    throw new Error(`Sprout API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Cached customer ID ──────────────────────────────────────────────────

let cachedCustomerId: number | null = null

export async function getCustomerId(): Promise<number> {
  if (cachedCustomerId) return cachedCustomerId

  const res = await sproutFetch<{ data: SproutCustomer[] }>('/v1/metadata/client')
  if (!res.data?.length) throw new Error('No Sprout Social customer found for this token')
  cachedCustomerId = res.data[0].customer_id
  return cachedCustomerId
}

// ── Topics ──────────────────────────────────────────────────────────────

export async function getListeningTopics(): Promise<SproutTopic[]> {
  const cid = await getCustomerId()
  const res = await sproutFetch<{ data: SproutTopic[] }>(
    `/v1/${cid}/metadata/customer/topics`
  )
  return res.data ?? []
}

// ── Listening Messages ──────────────────────────────────────────────────

export async function getListeningMessages(
  topicId: number,
  opts: SproutFetchOptions,
): Promise<SproutListeningResponse> {
  const cid = await getCustomerId()

  const filters: string[] = [
    `created_time.in(${opts.startDate}..${opts.endDate})`,
  ]
  if (opts.networks?.length) {
    filters.push(`network.eq(${opts.networks.join(',')})`)
  }
  if (opts.keyword) {
    filters.push(`text.match(${opts.keyword})`)
  }
  if (opts.sentiment?.length) {
    filters.push(`sentiment.eq(${opts.sentiment.join(',')})`)
  }

  return sproutFetch<SproutListeningResponse>(
    `/v1/${cid}/listening/topics/${topicId}/messages`,
    {
      method: 'POST',
      body: {
        filters,
        fields: [
          'text', 'created_time', 'network', 'hashtags',
          'content_category', 'visual_media', 'listening_metadata',
        ],
        metrics: ['likes', 'shares_count', 'replies', 'engagements'],
        sort: ['created_time:desc'],
        limit: Math.min(opts.limit ?? 50, 100),
        page: opts.page ?? 1,
        timezone: 'America/New_York',
      },
    },
  )
}

// ── Inbox Messages ──────────────────────────────────────────────────────

export async function getInboxMessages(
  profileIds: number[],
  opts: SproutFetchOptions,
): Promise<SproutInboxResponse> {
  const cid = await getCustomerId()

  const filters: string[] = [
    `created_time.in(${opts.startDate}..${opts.endDate})`,
  ]
  if (profileIds.length) {
    filters.push(`customer_profile_id.eq(${profileIds.join(',')})`)
  }

  return sproutFetch<SproutInboxResponse>(
    `/v1/${cid}/messages`,
    {
      method: 'POST',
      body: {
        filters,
        fields: [
          'text', 'created_time', 'perma_link', 'post_type',
          'post_category', 'network', 'from.name', 'from.guid',
          'language_code', 'guid',
        ],
        limit: Math.min(opts.limit ?? 50, 100),
        sort: ['created_time:desc'],
        timezone: 'America/New_York',
      },
    },
  )
}

// ── Transform to Platform Types ─────────────────────────────────────────

const NETWORK_MAP: Record<string, Platform> = {
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  REDDIT: 'reddit',
  TIKTOK: 'tiktok',
  YOUTUBE: 'twitter',       // closest fallback
  LINKEDIN: 'twitter',      // closest fallback
  BLUESKY: 'twitter',       // closest fallback
  WWW: 'news-comment',
}

function mapPlatform(network: string): Platform {
  return NETWORK_MAP[network.toUpperCase()] ?? 'twitter'
}

function mapMediaType(msg: SproutListeningMessage): 'none' | 'image' | 'video' | 'link' {
  if (!msg.visual_media?.length) return 'none'
  const type = msg.visual_media[0].media_type?.toUpperCase()
  if (type === 'VIDEO') return 'video'
  if (type === 'PHOTO' || type === 'IMAGE') return 'image'
  return 'link'
}

let sproutSeq = 800000

/**
 * Convert Sprout listening messages to our SocialPost shape.
 * Fields not available from Sprout API get sensible defaults.
 */
export function listeningToSocialPosts(messages: SproutListeningMessage[]): SocialPost[] {
  return messages.map((msg) => {
    sproutSeq++
    return {
      id: msg.guid,
      sproutId: `spr_${sproutSeq}`,
      authorHandle: msg.from?.name ? `@${msg.from.name.replace(/\s+/g, '')}` : '@unknown',
      authorDisplayName: msg.from?.name ?? 'Unknown',
      accountAgeDays: 0,
      followerCount: 0,
      followingCount: 0,
      totalPostCount: 0,
      hasProfilePhoto: true,
      bioKeywords: [],
      platformVerified: false,
      locationHint: null,
      platform: mapPlatform(msg.network),
      text: msg.text ?? '',
      mediaType: mapMediaType(msg),
      mediaDescription: msg.visual_media?.[0]?.media_url ?? null,
      timestamp: msg.created_time,
      isReply: false,
      replyToId: null,
      hashtags: msg.hashtags ?? [],
      likes: msg.metrics?.likes ?? 0,
      shares: msg.metrics?.shares_count ?? 0,
      replies: msg.metrics?.replies ?? 0,
      quoteShares: 0,
    }
  })
}

/**
 * Convert Sprout listening messages to plain text for the Sentiment Analyzer.
 * Includes platform, author, timestamp, and engagement stats.
 */
export function listeningToText(messages: SproutListeningMessage[]): string {
  return messages.map((msg) => {
    const author = msg.from?.name ?? 'Unknown'
    const platform = msg.network ?? 'Unknown'
    const date = msg.created_time ? new Date(msg.created_time).toLocaleDateString() : ''
    const engagement = [
      msg.metrics?.likes && `${msg.metrics.likes} likes`,
      msg.metrics?.shares_count && `${msg.metrics.shares_count} shares`,
      msg.metrics?.replies && `${msg.metrics.replies} replies`,
    ].filter(Boolean).join(', ')
    const sentiment = msg.listening_metadata?.sentiment
      ? ` [Sprout sentiment: ${msg.listening_metadata.sentiment}]`
      : ''

    return `[@${author} on ${platform}, ${date}]${sentiment}\n${msg.text}${engagement ? `\n(${engagement})` : ''}`
  }).join('\n\n---\n\n')
}

/**
 * Fetch 7-day listening data for a topic, paginating as needed.
 * Returns up to `maxPosts` messages.
 */
export async function fetchFullListeningWindow(
  topicId: number,
  opts: { maxPosts?: number; keyword?: string; networks?: string[] } = {},
): Promise<SproutListeningMessage[]> {
  const maxPosts = opts.maxPosts ?? 250
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000)

  const fetchOpts: SproutFetchOptions = {
    startDate: sevenDaysAgo.toISOString().split('T')[0],
    endDate: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    limit: 100,
    keyword: opts.keyword,
    networks: opts.networks,
  }

  const all: SproutListeningMessage[] = []
  let page = 1

  while (all.length < maxPosts) {
    const res = await getListeningMessages(topicId, { ...fetchOpts, page })
    if (!res.data?.length) break
    all.push(...res.data)
    if (!res.paging?.total_pages || page >= res.paging.total_pages) break
    page++
  }

  return all.slice(0, maxPosts)
}

// ── Health Check ────────────────────────────────────────────────────────

export async function checkSproutHealth(): Promise<{ ok: boolean; customerId?: number; error?: string }> {
  try {
    const cid = await getCustomerId()
    return { ok: true, customerId: cid }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Returns true if the SPROUT_API_TOKEN env var is set.
 */
export function isSproutConfigured(): boolean {
  return !!process.env.SPROUT_API_TOKEN
}
