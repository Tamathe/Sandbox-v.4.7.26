/**
 * crawl-uknow.ts — Two-phase crawler for the full UKNow article archive.
 *
 * Phase 1: Scrape listing pages to collect all article URLs + basic metadata.
 * Phase 2: Fetch each article detail page for body text.
 *
 * Progress is saved to disk after every page/article, so the script can be
 * interrupted and resumed safely.
 *
 * Output: prisma/data/uknow-corpus.json
 *
 * Usage:
 *   npx tsx scripts/crawl-uknow.ts              # Run both phases
 *   npx tsx scripts/crawl-uknow.ts --phase1     # Listing pages only
 *   npx tsx scripts/crawl-uknow.ts --phase2     # Detail pages only (requires phase 1 done)
 *   npx tsx scripts/crawl-uknow.ts --stats       # Show progress stats
 */

import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://uknow.uky.edu'
const DELAY_MS = 1000 // 1 second between requests
const PROGRESS_FILE = path.join(__dirname, '..', 'prisma', 'data', 'uknow-crawl-progress.json')
const OUTPUT_FILE = path.join(__dirname, '..', 'prisma', 'data', 'uknow-corpus.json')

// ─── Correct section slugs (verified against live site) ─────────────────────

const SECTIONS = [
  { slug: 'campus-news', label: 'Campus News', lastPage: 898 },
  { slug: 'research', label: 'Research', lastPage: 298 },
  { slug: 'arts-culture', label: 'Arts & Culture', lastPage: 172 },
  { slug: 'uk-healthcare', label: 'UK HealthCare', lastPage: 379 },
  { slug: 'student-news', label: 'Student News', lastPage: 346 },
  { slug: 'uk-happenings', label: 'UK Happenings', lastPage: 219 },
  { slug: 'professional-news', label: 'Professional News', lastPage: 271 },
]

interface ArticleEntry {
  slug: string
  url: string
  title: string
  section: string
  sectionLabel: string
  author: string | null
  publishedAt: string | null
  excerpt: string
  body: string | null // null = not yet fetched (phase 2)
  wordCount: number
}

interface CrawlProgress {
  phase1: {
    completedSections: Record<string, number> // section slug → last completed page
    articles: ArticleEntry[]
  }
  phase2: {
    completedSlugs: Set<string> // article slugs with body fetched
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadProgress(): CrawlProgress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))
      return {
        phase1: {
          completedSections: raw.phase1?.completedSections ?? {},
          articles: raw.phase1?.articles ?? [],
        },
        phase2: {
          completedSlugs: new Set(raw.phase2?.completedSlugs ?? []),
        },
      }
    }
  } catch (e) {
    console.error('Warning: Could not load progress file, starting fresh')
  }
  return {
    phase1: { completedSections: {}, articles: [] },
    phase2: { completedSlugs: new Set() },
  }
}

function saveProgress(progress: CrawlProgress) {
  const serializable = {
    phase1: progress.phase1,
    phase2: { completedSlugs: [...progress.phase2.completedSlugs] },
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(serializable, null, 2))
}

function saveCorpus(articles: ArticleEntry[]) {
  // Only save articles that have body text (phase 2 complete)
  const complete = articles.filter((a) => a.body !== null)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(complete, null, 2))
  console.log(`  💾 Corpus saved: ${complete.length} articles → ${OUTPUT_FILE}`)
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UKNow-Archiver/1.0 (University of Kentucky Sandbox Project)' },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ─── Phase 1: Scrape listing pages ──────────────────────────────────────────

function extractArticlesFromListing(html: string, section: string, sectionLabel: string): ArticleEntry[] {
  const articles: ArticleEntry[] = []

  // UKNow Drupal structure:
  //   Featured: <h2 class="uknow-section-feature__title"><span class="field-content"><a href="...">Title</a></span></h2>
  //   List:     <h3 itemprop="headline" class="uknow-section-list__title"><span class="field-content"><a href="...">Title</a></span></h3>
  const linkPattern = /<h[23][^>]*class="[^"]*uknow-section-(?:feature|list)__title[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1]
    const title = match[2].replace(/<[^>]+>/g, '').trim()
    if (!title || !href.startsWith('/')) continue

    const slug = href.split('/').filter(Boolean).pop() ?? ''
    if (!slug) continue

    // Try to find date near this link (look ahead in the HTML after the match)
    const afterMatch = html.slice(match.index, match.index + 2000)
    const dateMatch = afterMatch.match(/datetime="([^"]+)"/)
      ?? afterMatch.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i)
    let publishedAt: string | null = null
    if (dateMatch) {
      const d = new Date(dateMatch[1])
      if (!isNaN(d.getTime())) publishedAt = d.toISOString()
    }

    // Try to find author
    const authorMatch = afterMatch.match(/class="[^"]*(?:author|byline)[^"]*"[^>]*>([\s\S]*?)<\//)
    const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : null

    // Try to find excerpt/teaser
    const excerptMatch = afterMatch.match(/class="[^"]*(?:teaser|summary|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    const excerpt = excerptMatch
      ? excerptMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 300)
      : ''

    articles.push({
      slug,
      url: `${BASE_URL}${href}`,
      title,
      section,
      sectionLabel,
      author,
      publishedAt,
      excerpt,
      body: null,
      wordCount: 0,
    })
  }

  return articles
}

async function runPhase1(progress: CrawlProgress) {
  console.log('\n📋 Phase 1: Scraping listing pages for article URLs...\n')
  const existingSlugs = new Set(progress.phase1.articles.map((a) => a.slug))
  let newArticles = 0

  for (const section of SECTIONS) {
    const startPage = (progress.phase1.completedSections[section.slug] ?? -1) + 1
    if (startPage > section.lastPage) {
      console.log(`  ✓ ${section.label}: already complete`)
      continue
    }

    console.log(`  📄 ${section.label}: pages ${startPage}–${section.lastPage}`)

    for (let page = startPage; page <= section.lastPage; page++) {
      const url = page === 0
        ? `${BASE_URL}/${section.slug}`
        : `${BASE_URL}/${section.slug}?page=${page}`

      const html = await fetchPage(url)
      if (html) {
        const articles = extractArticlesFromListing(html, section.slug, section.label)
        for (const a of articles) {
          if (!existingSlugs.has(a.slug)) {
            existingSlugs.add(a.slug)
            progress.phase1.articles.push(a)
            newArticles++
          }
        }
      }

      progress.phase1.completedSections[section.slug] = page

      // Save progress every 10 pages
      if (page % 10 === 0) {
        saveProgress(progress)
        const pct = ((page - startPage) / (section.lastPage - startPage + 1) * 100).toFixed(1)
        process.stdout.write(`    page ${page}/${section.lastPage} (${pct}%) — ${progress.phase1.articles.length} total URLs\r`)
      }

      await sleep(DELAY_MS)
    }

    saveProgress(progress)
    console.log(`    ✓ ${section.label} complete — ${progress.phase1.articles.length} total URLs`)
  }

  console.log(`\n  Phase 1 complete: ${progress.phase1.articles.length} article URLs found (${newArticles} new)`)
}

// ─── Phase 2: Fetch article detail pages ────────────────────────────────────

function parseArticleBody(html: string): { body: string; author: string | null; publishedAt: string | null } {
  // Extract body text
  const bodyMatch = html.match(/class="[^"]*field--name-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    ?? html.match(/class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    ?? html.match(/class="[^"]*node__content[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i)
    ?? html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)

  const bodyRaw = bodyMatch ? bodyMatch[1] : ''
  const body = bodyRaw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Extract author (more reliable from detail page)
  const authorMatch = html.match(/class="[^"]*(?:author|byline)[^"]*"[^>]*>([\s\S]*?)<\//)
  const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : null

  // Extract date (more reliable from detail page)
  const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/)
    ?? html.match(/class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\//)
  let publishedAt: string | null = null
  if (dateMatch) {
    const d = new Date(dateMatch[1].trim())
    if (!isNaN(d.getTime())) publishedAt = d.toISOString()
  }

  return { body, author, publishedAt }
}

async function runPhase2(progress: CrawlProgress) {
  const pending = progress.phase1.articles.filter((a) => !progress.phase2.completedSlugs.has(a.slug))
  console.log(`\n📰 Phase 2: Fetching ${pending.length} article detail pages (${progress.phase2.completedSlugs.size} already done)...\n`)

  let fetched = 0
  let errors = 0

  for (const article of pending) {
    const html = await fetchPage(article.url)
    if (html) {
      const { body, author, publishedAt } = parseArticleBody(html)
      article.body = body || article.excerpt || ''
      article.wordCount = article.body.split(/\s+/).length
      // Upgrade metadata if detail page has better data
      if (author && !article.author) article.author = author
      if (publishedAt && !article.publishedAt) article.publishedAt = publishedAt
      fetched++
    } else {
      // Mark as fetched but with excerpt as fallback body
      article.body = article.excerpt || ''
      article.wordCount = article.body.split(/\s+/).length
      errors++
    }

    progress.phase2.completedSlugs.add(article.slug)

    // Save progress every 50 articles + export corpus every 500
    if ((fetched + errors) % 50 === 0) {
      saveProgress(progress)
      process.stdout.write(`    ${fetched + errors}/${pending.length} (${errors} errors) — ${((fetched + errors) / pending.length * 100).toFixed(1)}%\r`)
    }
    if ((fetched + errors) % 500 === 0) {
      saveCorpus(progress.phase1.articles)
    }

    await sleep(DELAY_MS)
  }

  saveProgress(progress)
  saveCorpus(progress.phase1.articles)
  console.log(`\n  Phase 2 complete: ${fetched} fetched, ${errors} errors`)
}

// ─── Stats ──────────────────────────────────────────────────────────────────

function showStats(progress: CrawlProgress) {
  const total = progress.phase1.articles.length
  const withBody = progress.phase1.articles.filter((a) => a.body !== null).length
  const phase2Done = progress.phase2.completedSlugs.size

  console.log('\n📊 Crawl Progress:')
  console.log(`  Phase 1 (listing pages):`)
  for (const section of SECTIONS) {
    const done = progress.phase1.completedSections[section.slug] ?? -1
    const pct = ((done + 1) / (section.lastPage + 1) * 100).toFixed(0)
    console.log(`    ${section.label}: ${done + 1}/${section.lastPage + 1} pages (${pct}%)`)
  }
  console.log(`  Total URLs found: ${total}`)
  console.log(`\n  Phase 2 (detail pages):`)
  console.log(`    Fetched: ${phase2Done}/${total} (${total > 0 ? (phase2Done / total * 100).toFixed(1) : 0}%)`)
  console.log(`    With body text: ${withBody}`)

  if (fs.existsSync(OUTPUT_FILE)) {
    const stat = fs.statSync(OUTPUT_FILE)
    console.log(`\n  Corpus file: ${(stat.size / 1024 / 1024).toFixed(1)} MB`)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const progress = loadProgress()

  if (args.includes('--stats')) {
    showStats(progress)
    return
  }

  const phase1Only = args.includes('--phase1')
  const phase2Only = args.includes('--phase2')

  console.log('🕷️  UKNow Corpus Crawler')
  console.log(`  Delay: ${DELAY_MS}ms between requests`)
  console.log(`  Progress file: ${PROGRESS_FILE}`)
  console.log(`  Output file: ${OUTPUT_FILE}`)
  console.log(`  Sections: ${SECTIONS.length}`)

  if (!phase2Only) {
    await runPhase1(progress)
  }

  if (!phase1Only) {
    if (progress.phase1.articles.length === 0) {
      console.log('\n❌ No article URLs found. Run phase 1 first.')
      return
    }
    await runPhase2(progress)
  }

  console.log('\n✅ Done! Corpus saved to:', OUTPUT_FILE)
}

main().catch((e) => {
  console.error('❌ Crawler failed:', e)
  process.exit(1)
})
