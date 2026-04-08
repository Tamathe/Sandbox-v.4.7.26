import type { UknowArticleSummary } from '../../lib/uknow-service'

export function formatDate(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function slugFromUrl(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? ''
}

export function similarityBadge(similarity: number) {
  if (similarity >= 0.85) return { label: 'Strong match', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (similarity >= 0.70) return { label: 'Good match', className: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { label: 'Weak', className: 'bg-gray-50 text-gray-500 border-gray-200' }
}

export const SECTIONS = [
  { slug: '', label: 'All' },
  { slug: 'campus-news', label: 'Campus News' },
  { slug: 'research', label: 'Research' },
  { slug: 'arts-culture', label: 'Arts & Culture' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'community', label: 'Community' },
  { slug: 'uk-healthcare', label: 'UK HealthCare' },
  { slug: 'students', label: 'Students' },
  { slug: 'faculty-staff', label: 'Faculty & Staff' },
]

export const SENTIMENT_CONFIG: Record<string, { dot: string; label: string }> = {
  positive: { dot: 'bg-emerald-400', label: 'Positive' },
  neutral: { dot: 'bg-gray-400', label: 'Neutral' },
  negative: { dot: 'bg-red-400', label: 'Negative' },
}

export const PAGE_SIZE = 20

export type TopMatch = {
  title: string
  slug: string
  publishedAt: string | null
  similarity: number
}

export type AlertItem = {
  id: string
  label: string
  query: string
  active: boolean
  createdAt: string
  _count: { matches: number }
  topMatches?: TopMatch[]
}

export type AlertSuggestion = { label: string; query: string }

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
  sources?: UknowArticleSummary[]
  followUps?: string[]
  timeline?: {
    milestones: Array<{ date: string; title: string; slug: string; excerpt: string }>
  }
}
