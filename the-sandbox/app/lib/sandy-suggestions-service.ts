import Anthropic from '@anthropic-ai/sdk'
import { describeCurrentPage } from './concierge-service'
import type {
  StudentIntelligence,
  SRContext,
  StudyPlanSummary,
  ConversationMemoryItem,
  ToolDetailContext,
} from './concierge-service'

// ─── Types ──────────────────────────────────────────────────────

export interface SuggestionContext {
  currentPage: string
  user: {
    name: string
    role: string
    department?: string | null
    college?: string | null
  }
  courseContext?: { courseCode: string; title: string } | null
  studentIntelligence?: StudentIntelligence | null
  srContext?: SRContext | null
  studyPlanSummary?: StudyPlanSummary | null
  conversationMemory?: ConversationMemoryItem[] | null
  toolDetailContext?: ToolDetailContext | null
  fingerprintSummary?: string | null
  emailIntelligenceSummary?: string | null
}

// ─── In-memory TTL cache ────────────────────────────────────────
// Key: userId + pathname + role → suggestions, 5 min TTL

interface CacheEntry {
  suggestions: string[]
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 200

function getCacheKey(userId: string, pathname: string, role: string): string {
  return `${userId}:${pathname}:${role}`
}

function getCached(key: string): string[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.suggestions
}

function setCache(key: string, suggestions: string[]): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, { suggestions, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Prompt builder ─────────────────────────────────────────────

function buildSuggestionsPrompt(ctx: SuggestionContext): string {
  const pageDescription = describeCurrentPage(ctx.currentPage)
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' })

  const lines: string[] = []

  lines.push(`Page: ${ctx.currentPage} — ${pageDescription}`)
  lines.push(`User: ${ctx.user.name} (${ctx.user.role})${ctx.user.department ? ` | ${ctx.user.department}` : ''}${ctx.user.college ? ` | ${ctx.user.college}` : ''}`)
  lines.push(`Time: ${timeStr} (${dayStr})`)

  if (ctx.courseContext) {
    lines.push(`Active course: ${ctx.courseContext.courseCode} — ${ctx.courseContext.title}`)
  }

  if (ctx.studentIntelligence) {
    const si = ctx.studentIntelligence
    const parts: string[] = []
    if (si.lastSessionScore != null) parts.push(`last session score ${si.lastSessionScore}`)
    if (si.lowestObjectiveTitle) parts.push(`struggling with "${si.lowestObjectiveTitle}"`)
    if (si.daysSinceLastSession != null) parts.push(`${si.daysSinceLastSession} days since last session`)
    if (si.upcomingDueDates.length > 0) {
      const deadlines = si.upcomingDueDates.map(d => {
        const daysUntil = Math.ceil((new Date(d.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return `"${d.title}" (${d.courseCode}, ${daysUntil <= 1 ? 'due tomorrow' : `${daysUntil} days`})`
      }).join(', ')
      parts.push(`deadlines: ${deadlines}`)
    }
    if (parts.length > 0) lines.push(`Learning state: ${parts.join(', ')}`)
  }

  if (ctx.studyPlanSummary) {
    const sp = ctx.studyPlanSummary
    lines.push(`Study plan: ${sp.criticalCount} critical items for ${sp.courseCode}, most urgent: "${sp.topConcept}"`)
  }

  if (ctx.srContext) {
    const sr = ctx.srContext
    lines.push(`Spaced repetition: ${sr.dueCount} cards due${sr.topDueConcept ? `, top concept: "${sr.topDueConcept}"` : ''}`)
  }

  if (ctx.emailIntelligenceSummary) {
    lines.push(`Inbox: ${ctx.emailIntelligenceSummary}`)
  }

  if (ctx.conversationMemory && ctx.conversationMemory.length > 0) {
    const memPreview = ctx.conversationMemory
      .slice(0, 3)
      .map(m => `"${m.title}"${m.courseCode ? ` [${m.courseCode}]` : ''}`)
      .join(', ')
    lines.push(`Sandy remembers: ${memPreview}`)
  }

  if (ctx.fingerprintSummary) {
    lines.push(`Learner profile: ${ctx.fingerprintSummary}`)
  }

  if (ctx.toolDetailContext) {
    const td = ctx.toolDetailContext
    lines.push(`Viewing tool: ${td.name} — ${td.shortDescription} (${td.category})`)
  }

  const contextBlock = lines.join('\n')

  return `You are Sandy, the AI concierge for the University of Kentucky's AI-powered operating system. You are generating exactly 4 clickable suggestion chips that will appear under "Suggestions for this page" when a user opens their Sandy panel.

## Your Goal
Write 4 suggestions so good the user thinks: "How did she know that's exactly what I needed?"

## Context
${contextBlock}

## The 4-Suggestion Framework

Each suggestion must fill exactly ONE of these 4 slots:

1. **THE OBVIOUS WIN** — The single most valuable action on THIS page given what you know about this user RIGHT NOW. If they have an exam in 48 hours, it's exam prep. If flashcards are overdue, it's review. If their inbox has decisions pending, it's triage. This should feel like reading their mind.

2. **THE HIDDEN LEVER** — Something powerful this page can do that the user probably doesn't know about or hasn't tried yet. Connect a capability to their actual situation. Not a feature tour — a specific, personalized unlock. "Turn my survey results into a presentation outline" beats "Try the Presentation Outliner."

3. **THE CROSS-PAGE BRIDGE** — One thing Sandy can do from here that normally requires navigating somewhere else. Sandy is the universal interface — she can draft emails from the analytics page, start a study session from the course page, or build a quiz from the campus map. This chip should feel like a shortcut that saves 3 clicks.

4. **THE MOMENTUM PLAY** — Build on something already in motion. Continue a conversation Sandy remembers, revisit a recent session, check progress on a goal, or nudge a habit. If nothing is in motion, offer a low-friction starting point that creates momentum ("Log today's mood in 30 seconds").

## Writing Rules

- First person, present tense, action voice. "Quiz me on Chapter 7" not "Get quizzed on Chapter 7"
- Be specific when you can. Use real names, course codes, topics, and deadlines from the context. "Draft a reply to Dr. Chen's email" >>> "Reply to an email."
- Be general only when you must. If no context exists for a slot, write something genuinely useful for this role + page combination.
- Maximum 50 characters each. These are chip buttons — they must scan instantly.
- No question marks on action suggestions. "Show me what's due" not "What's due?" — unless the chip is genuinely asking Sandy a question ("Am I ready for Friday's exam?").
- Vary the verb. Don't start all 4 with the same word. Mix: "Quiz me…", "Draft a…", "Show me…", "Continue my…", "Turn this into…", "Walk me through…", "Find…", "Compare…", "Prep me for…"
- Never suggest something the page can't deliver. The cross-page bridge is the exception — Sandy can do it, so make that clear.
- Sound like a sharp friend, not a help menu. "Surprise me — something I haven't tried" > "Explore additional features"

## Output Format

Return ONLY a JSON array of exactly 4 strings. No explanation, no markdown, no wrapping.`
}

// ─── Generate suggestions via Haiku ─────────────────────────────

export async function generatePageSuggestions(
  userId: string,
  ctx: SuggestionContext,
): Promise<string[]> {
  // Check cache first
  const cacheKey = getCacheKey(userId, ctx.currentPage, ctx.user.role)
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!process.env.ANTHROPIC_API_KEY) {
    return []
  }

  const client = new Anthropic()
  const systemPrompt = buildSuggestionsPrompt(ctx)

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate 4 suggestions for this page.' }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as string[]
    if (!Array.isArray(parsed) || parsed.length !== 4 || !parsed.every(s => typeof s === 'string')) {
      return []
    }

    // Enforce 50-char limit — truncate if Haiku gets verbose
    const suggestions = parsed.map(s => s.length > 55 ? s.slice(0, 52) + '…' : s)

    setCache(cacheKey, suggestions)
    return suggestions
  } catch (err) {
    console.error('[sandy-suggestions] Generation failed:', err)
    return []
  }
}
