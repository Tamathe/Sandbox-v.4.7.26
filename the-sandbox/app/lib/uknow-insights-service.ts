/**
 * UKNow Showcase — Insights Dashboard + Knowledge Graph services.
 *
 * Aggregates entity data, coverage trends, and co-occurrence networks
 * from the 14,097-article UKNow corpus. No schema changes — queries
 * existing UKNowArticle.entities JSON + UKNowCitationLog.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { pool } from './pg-pool'

// ─── College → Department Map ────────────────────────────────────────────────

export const COLLEGE_DEPARTMENT_MAP: Record<string, string[]> = {
  'College of Engineering': [
    'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
    'Civil Engineering', 'Chemical Engineering', 'Mining Engineering',
    'Materials Engineering', 'Biomedical Engineering', 'Engineering',
  ],
  'College of Arts & Sciences': [
    'English', 'History', 'Biology', 'Chemistry', 'Physics', 'Mathematics',
    'Psychology', 'Political Science', 'Sociology', 'Philosophy',
    'Economics', 'Geography', 'Anthropology', 'Statistics',
    'Arts & Sciences', 'Arts and Sciences',
  ],
  'College of Medicine': [
    'Medicine', 'Internal Medicine', 'Surgery', 'Pediatrics', 'Psychiatry',
    'Neurology', 'Pathology', 'Radiology', 'Anesthesiology', 'Family Medicine',
    'Emergency Medicine', 'Markey Cancer Center', 'UK HealthCare',
  ],
  'College of Education': [
    'Education', 'Educational Leadership', 'Curriculum', 'Special Education',
    'STEM Education', 'Educational Policy',
  ],
  'College of Agriculture': [
    'Agriculture', 'Animal Science', 'Plant Science', 'Food Science',
    'Biosystems Engineering', 'Horticulture', 'Forestry',
  ],
  'College of Business': [
    'Business', 'Finance', 'Marketing', 'Management', 'Accounting',
    'Gatton College', 'Economics',
  ],
  'College of Law': [
    'Law', 'Legal Studies', 'Rosenberg College of Law',
  ],
  'College of Pharmacy': [
    'Pharmacy', 'Pharmaceutical Sciences',
  ],
  'College of Nursing': [
    'Nursing',
  ],
  'College of Communication': [
    'Communication', 'Journalism', 'Media Arts',
  ],
  'College of Fine Arts': [
    'Fine Arts', 'Music', 'Theatre', 'Art', 'Dance', 'Arts',
  ],
  'College of Public Health': [
    'Public Health', 'Epidemiology', 'Health Management',
  ],
  'College of Social Work': [
    'Social Work',
  ],
  'College of Dentistry': [
    'Dentistry', 'Oral Health',
  ],
  'College of Health Sciences': [
    'Health Sciences', 'Physical Therapy', 'Physician Assistant',
    'Clinical Sciences', 'Rehabilitation Sciences',
  ],
}

/** Returns the college name for a given department string, or null. */
export function departmentToCollege(dept: string): string | null {
  const lower = dept.toLowerCase()
  for (const [college, departments] of Object.entries(COLLEGE_DEPARTMENT_MAP)) {
    if (departments.some((d) => lower.includes(d.toLowerCase()))) return college
  }
  return null
}

/** Returns all known college names (for the dropdown). */
export function getCollegeList(): string[] {
  return Object.keys(COLLEGE_DEPARTMENT_MAP).sort()
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InsightsKPI {
  totalArticles: number
  articlesInPeriod: number
  uniquePeopleMentioned: number
  uniqueTopics: number
}

export interface CoverageMonth {
  month: string // "2025-01"
  count: number
  section: string
}

export interface SectionCount {
  section: string
  sectionLabel: string
  count: number
}

export interface EntityMention {
  name: string
  type: 'person' | 'department' | 'topic'
  count: number
}

export interface InsightsDashboard {
  kpi: InsightsKPI
  coverageByMonth: CoverageMonth[]
  sectionBreakdown: SectionCount[]
  topMentions: EntityMention[]
  topicCloud: Array<{ topic: string; count: number }>
  brief: string | null
  colleges: string[]
}

export interface GraphNode {
  id: string
  label: string
  type: 'person' | 'department' | 'topic'
  weight: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface TimelineMilestone {
  date: string
  title: string
  slug: string
  excerpt: string
}

export interface TimelineResult {
  narrative: string
  milestones: TimelineMilestone[]
  followUps: string[]
}

// ─── Insights Dashboard ──────────────────────────────────────────────────────

export async function getInsightsDashboard(opts: {
  college?: string
  days?: number
}): Promise<InsightsDashboard> {
  const { college, days = 90 } = opts
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Build college filter keywords
  const collegeDepts = college ? COLLEGE_DEPARTMENT_MAP[college] ?? [] : []
  const collegeFilter = collegeDepts.length > 0
    ? collegeDepts.map((d) => d.toLowerCase())
    : null

  // 1. Fetch articles with entities in the period
  const articlesRaw = await pool().query<{
    id: string
    section: string
    sectionLabel: string
    publishedAt: Date | null
    entities: string | null
  }>(
    `SELECT id, section, "sectionLabel", "publishedAt", entities::text
     FROM "UKNowArticle"
     WHERE "publishedAt" >= $1
     ORDER BY "publishedAt" DESC`,
    [since]
  )

  // Parse entities and optionally filter by college
  const articles = articlesRaw.rows
    .map((r) => ({
      ...r,
      parsedEntities: parseEntities(r.entities),
    }))
    .filter((a) => {
      if (!collegeFilter) return true
      // Article matches college if any entity department overlaps
      const depts = a.parsedEntities.departments.map((d) => d.toLowerCase())
      const topics = a.parsedEntities.topics.map((t) => t.toLowerCase())
      const allTerms = [...depts, ...topics]
      return allTerms.some((term) =>
        collegeFilter.some((cf) => term.includes(cf) || cf.includes(term))
      )
    })

  // 2. KPI
  const totalResult = await pool().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM "UKNowArticle"`
  )
  const totalArticles = parseInt(totalResult.rows[0]?.count ?? '0', 10)

  const allPeople = new Set<string>()
  const allTopics = new Set<string>()
  for (const a of articles) {
    for (const p of a.parsedEntities.people) allPeople.add(p)
    for (const t of a.parsedEntities.topics) allTopics.add(t)
  }

  const kpi: InsightsKPI = {
    totalArticles,
    articlesInPeriod: articles.length,
    uniquePeopleMentioned: allPeople.size,
    uniqueTopics: allTopics.size,
  }

  // 3. Coverage by month
  const monthMap = new Map<string, number>()
  const monthSectionMap = new Map<string, Map<string, number>>()
  for (const a of articles) {
    if (!a.publishedAt) continue
    const d = new Date(a.publishedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
    if (!monthSectionMap.has(key)) monthSectionMap.set(key, new Map())
    const secMap = monthSectionMap.get(key)!
    secMap.set(a.section, (secMap.get(a.section) ?? 0) + 1)
  }

  const coverageByMonth: CoverageMonth[] = []
  for (const [month, secMap] of [...monthSectionMap.entries()].sort()) {
    for (const [section, count] of secMap.entries()) {
      coverageByMonth.push({ month, section, count })
    }
  }

  // 4. Section breakdown
  const sectionCounts = new Map<string, { label: string; count: number }>()
  for (const a of articles) {
    const entry = sectionCounts.get(a.section) ?? { label: a.sectionLabel, count: 0 }
    entry.count++
    sectionCounts.set(a.section, entry)
  }
  const sectionBreakdown: SectionCount[] = [...sectionCounts.entries()]
    .map(([section, { label, count }]) => ({ section, sectionLabel: label, count }))
    .sort((a, b) => b.count - a.count)

  // 5. Top mentions (people + departments)
  const mentionCounts = new Map<string, { type: 'person' | 'department'; count: number }>()
  for (const a of articles) {
    for (const p of a.parsedEntities.people) {
      const entry = mentionCounts.get(p) ?? { type: 'person' as const, count: 0 }
      entry.count++
      mentionCounts.set(p, entry)
    }
    for (const d of a.parsedEntities.departments) {
      const entry = mentionCounts.get(d) ?? { type: 'department' as const, count: 0 }
      entry.count++
      mentionCounts.set(d, entry)
    }
  }
  const topMentions: EntityMention[] = [...mentionCounts.entries()]
    .map(([name, { type, count }]) => ({ name, type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // 6. Topic cloud
  const topicCounts = new Map<string, number>()
  for (const a of articles) {
    for (const t of a.parsedEntities.topics) {
      topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)
    }
  }
  const topicCloud = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // 7. AI Intelligence Brief
  let brief: string | null = null
  if (topMentions.length > 0 || topicCloud.length > 0) {
    brief = await generateIntelligenceBrief(
      topMentions.slice(0, 10),
      topicCloud.slice(0, 15),
      college ?? null,
      days
    )
  }

  return {
    kpi,
    coverageByMonth,
    sectionBreakdown,
    topMentions,
    topicCloud,
    brief,
    colleges: getCollegeList(),
  }
}

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

export async function getKnowledgeGraph(opts: {
  college?: string
  days?: number
  limit?: number
}): Promise<KnowledgeGraphData> {
  const { college, days = 90, limit = 40 } = opts
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const collegeDepts = college ? COLLEGE_DEPARTMENT_MAP[college] ?? [] : []
  const collegeFilter = collegeDepts.length > 0
    ? collegeDepts.map((d) => d.toLowerCase())
    : null

  // Fetch articles with entities
  const articlesRaw = await pool().query<{
    id: string
    entities: string | null
  }>(
    `SELECT id, entities::text
     FROM "UKNowArticle"
     WHERE "publishedAt" >= $1 AND entities IS NOT NULL`,
    [since]
  )

  // Parse and optionally filter
  const articles = articlesRaw.rows
    .map((r) => ({ id: r.id, entities: parseEntities(r.entities) }))
    .filter((a) => {
      if (!collegeFilter) return true
      const depts = a.entities.departments.map((d) => d.toLowerCase())
      const topics = a.entities.topics.map((t) => t.toLowerCase())
      return [...depts, ...topics].some((term) =>
        collegeFilter.some((cf) => term.includes(cf) || cf.includes(term))
      )
    })

  // Build co-occurrence graph
  const nodeCounts = new Map<string, { type: 'person' | 'department' | 'topic'; count: number }>()
  const edgeCounts = new Map<string, number>()

  for (const a of articles) {
    const allEntities: Array<{ name: string; type: 'person' | 'department' | 'topic' }> = [
      ...a.entities.people.map((p) => ({ name: p, type: 'person' as const })),
      ...a.entities.departments.map((d) => ({ name: d, type: 'department' as const })),
      ...a.entities.topics.slice(0, 3).map((t) => ({ name: t, type: 'topic' as const })),
    ]

    // Count individual entity mentions
    for (const e of allEntities) {
      const existing = nodeCounts.get(e.name) ?? { type: e.type, count: 0 }
      existing.count++
      nodeCounts.set(e.name, existing)
    }

    // Count co-occurrences (pairs within same article)
    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const pair = [allEntities[i].name, allEntities[j].name].sort()
        const key = `${pair[0]}|||${pair[1]}`
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      }
    }
  }

  // Get top N nodes by count
  const sortedNodes = [...nodeCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)

  const nodeSet = new Set(sortedNodes.map(([name]) => name))

  const nodes: GraphNode[] = sortedNodes.map(([name, { type, count }]) => ({
    id: name,
    label: name,
    type,
    weight: count,
  }))

  // Only include edges between nodes that made the cut
  const edges: GraphEdge[] = [...edgeCounts.entries()]
    .filter(([key]) => {
      const [a, b] = key.split('|||')
      return nodeSet.has(a) && nodeSet.has(b)
    })
    .map(([key, weight]) => {
      const [source, target] = key.split('|||')
      return { source, target, weight }
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 80) // cap edges to keep viz readable

  return { nodes, edges }
}

// ─── Timeline Story ──────────────────────────────────────────────────────────

export async function generateTimeline(
  query: string,
  userId?: string
): Promise<TimelineResult> {
  const { getEmbeddingProvider } = await import('./embedding-service')
  const { getVectorStore } = await import('./vector-store')

  const embedder = getEmbeddingProvider()
  const vec = await embedder.embed(query)
  const chunks = await getVectorStore().newsSearch(vec, 20, 0.55)

  // Deduplicate by articleId — keep highest similarity per article
  const byArticle = new Map<string, typeof chunks[0]>()
  for (const chunk of chunks) {
    const existing = byArticle.get(chunk.articleId)
    if (!existing || chunk.similarity > existing.similarity) {
      byArticle.set(chunk.articleId, chunk)
    }
  }
  const deduped = [...byArticle.values()]
    .sort((a, b) => {
      // Sort chronologically for timeline
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateA - dateB
    })
    .slice(0, 12)

  if (deduped.length === 0) {
    return {
      narrative: "I couldn't find enough articles to build a timeline for that topic.",
      milestones: [],
      followUps: [],
    }
  }

  // Build article context for Haiku
  const articleContext = deduped
    .map((r, i) => {
      const date = r.publishedAt
        ? new Date(r.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown date'
      return `[${i + 1}] "${r.title}" (${date})\n${r.content.slice(0, 300)}`
    })
    .join('\n\n---\n\n')

  const systemPrompt = `You are a university historian synthesizing the University of Kentucky's story on a topic. Given a set of articles sorted chronologically, write:

1. A compelling 2-3 paragraph narrative arc that tells the story of how this topic evolved at UK. Reference specific events and people from the articles. Write in present tense for recent events.

2. After the narrative, list key milestones in this format (one per line):
MILESTONE: YYYY-MM-DD | Article Title | One-sentence summary of why this moment mattered

3. After milestones, suggest 2 follow-up questions:
FOLLOWUP: question text

Articles:
${articleContext}`

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
  })

  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  // Parse the response
  const narrativeLines: string[] = []
  const milestones: TimelineMilestone[] = []
  const followUps: string[] = []

  for (const line of rawText.split('\n')) {
    const milestoneMatch = line.match(/^MILESTONE:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+)$/)
    const followUpMatch = line.match(/^FOLLOWUP:\s*(.+)$/)

    if (milestoneMatch) {
      // Find the matching article for the slug
      const matchedArticle = deduped.find((a) =>
        a.title.toLowerCase().includes(milestoneMatch[2].toLowerCase().slice(0, 30))
      )
      milestones.push({
        date: milestoneMatch[1],
        title: milestoneMatch[2].trim(),
        slug: matchedArticle
          ? matchedArticle.url.split('/').filter(Boolean).pop() ?? ''
          : '',
        excerpt: milestoneMatch[3].trim(),
      })
    } else if (followUpMatch) {
      followUps.push(followUpMatch[1].trim())
    } else {
      narrativeLines.push(line)
    }
  }

  // If no milestones were parsed, create them from articles directly
  if (milestones.length === 0) {
    for (const a of deduped.slice(0, 6)) {
      const date = a.publishedAt
        ? new Date(a.publishedAt).toISOString().slice(0, 10)
        : '2024-01-01'
      milestones.push({
        date,
        title: a.title,
        slug: a.url.split('/').filter(Boolean).pop() ?? '',
        excerpt: a.content.slice(0, 120).trim() + '…',
      })
    }
  }

  // Log query for trending
  if (userId) {
    const { logQueryFireAndForget } = await import('./uknow-alert-service')
    logQueryFireAndForget(query, null, ['timeline'], userId)
  }

  return {
    narrative: narrativeLines.join('\n').trim(),
    milestones,
    followUps: followUps.slice(0, 2),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEntities(raw: string | null): {
  people: string[]
  departments: string[]
  programs: string[]
  topics: string[]
} {
  if (!raw) return { people: [], departments: [], programs: [], topics: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      departments: Array.isArray(parsed.departments) ? parsed.departments : [],
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    }
  } catch {
    return { people: [], departments: [], programs: [], topics: [] }
  }
}

async function generateIntelligenceBrief(
  topMentions: EntityMention[],
  topicCloud: Array<{ topic: string; count: number }>,
  college: string | null,
  days: number
): Promise<string> {
  try {
    const client = new Anthropic()

    const mentionsSummary = topMentions
      .slice(0, 8)
      .map((m) => `${m.name} (${m.type}, ${m.count} mentions)`)
      .join(', ')

    const topicsSummary = topicCloud
      .slice(0, 10)
      .map((t) => `${t.topic} (${t.count})`)
      .join(', ')

    const scopeLabel = college ?? 'the University of Kentucky'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [
        {
          role: 'user',
          content: `Based on the last ${days} days of campus news coverage for ${scopeLabel}, write a 2-3 sentence intelligence brief summarizing what's happening. Be specific — name people and topics. Write in the style of a morning briefing for a dean or provost.

Top mentions: ${mentionsSummary}
Trending topics: ${topicsSummary}

Return ONLY the brief paragraph, no headers or labels.`,
        },
      ],
    })

    return message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
  } catch {
    return 'Unable to generate intelligence brief at this time.'
  }
}
