/**
 * UK Policy Ingestion Script
 *
 * Scrapes real University of Kentucky Administrative Regulations and
 * Governing Regulations from https://regs.uky.edu/, downloads the
 * official PDFs, extracts text, and saves everything to a local JSON
 * file at prisma/data/uk-policies.json.
 *
 * The JSON file is committed to the repo so that db:seed always has
 * real policy data available — no scraping required at seed time.
 *
 * Usage:
 *   npx tsx scripts/ingest-uk-policies.ts
 *
 * Re-run whenever you want to refresh from the live site.
 */

import * as fs from 'fs'
import * as path from 'path'

// ─── Types ────────────────────────────────────────────────────

interface ScrapedPolicy {
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  appliesTo: string
  effectiveDate: string
  lastRevised: string
  fullText: string
  sourceUrl: string
  pdfUrl: string | null
}

interface IndexEntry {
  href: string
  rawTitle: string
}

// ─── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://regs.uky.edu'
const OUTPUT_PATH = path.resolve(__dirname, '../prisma/data/uk-policies.json')

const INDEX_PAGES = [
  { url: `${BASE_URL}/administrative-regulation`, category: 'Administrative Regulation' },
  { url: `${BASE_URL}/governing-regulation`, category: 'Governing Regulation' },
]

// Polite delay between requests (ms)
const REQUEST_DELAY = 500

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'UK-Sandbox-Policy-Ingestion/1.0 (internal research tool)',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'UK-Sandbox-Policy-Ingestion/1.0 (internal research tool)',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

// ─── Step 1: Scrape index pages for links ─────────────────────

function extractLinksFromIndex(html: string): IndexEntry[] {
  const entries: IndexEntry[] = []
  // Match all <a class="link--fancy" href="...">...</a> patterns
  const linkRegex = /<a\s+href="([^"]+)"\s+class="link--fancy"[^>]*>([\s\S]*?)<\/a>/gi
  // Also match the reverse attribute order
  const linkRegex2 = /<a\s+class="link--fancy"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi

  for (const regex of [linkRegex, linkRegex2]) {
    let match
    while ((match = regex.exec(html)) !== null) {
      const href = match[1].trim()
      const rawTitle = match[2].replace(/<[^>]+>/g, '').trim()
      if (rawTitle && href.startsWith('/')) {
        // Deduplicate
        if (!entries.some((e) => e.href === href)) {
          entries.push({ href, rawTitle })
        }
      }
    }
  }

  return entries
}

// ─── Step 2: Scrape individual policy pages ───────────────────

function extractMetaFromPage(html: string): {
  title: string
  responsibleOffice: string
  effectiveDate: string
  pdfUrl: string | null
  summary: string
} {
  // Title from <span class="headline-group__head">
  let title = ''
  const titleMatch = html.match(
    /class="headline-group__head"[^>]*>([\s\S]*?)<\/span>/i
  )
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // PDF link from <a href="/sites/default/files/..." class="button">
  let pdfUrl: string | null = null
  const pdfMatch = html.match(
    /href="(\/sites\/default\/files\/[^"]+\.pdf)"/i
  )
  if (pdfMatch) {
    pdfUrl = `${BASE_URL}${pdfMatch[1]}`
  }

  // Responsible Official from <strong>Responsible Official
  let responsibleOffice = 'Unknown'
  const officeMatch = html.match(
    /Responsible\s+Official[^<]*<\/strong>\s*([\s\S]*?)(?:<\/p>|<br)/i
  )
  if (officeMatch) {
    responsibleOffice = officeMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/[:\s]+$/, '')
      .trim()
  }

  // Effective Date
  let effectiveDate = ''
  const dateMatch = html.match(
    /Effective\s+Date[^<]*<\/strong>\s*([\s\S]*?)(?:<\/p>|<br)/i
  )
  if (dateMatch) {
    const raw = dateMatch[1].replace(/<[^>]+>/g, '').trim()
    // Try to parse into ISO date
    const parsed = new Date(raw)
    effectiveDate = isNaN(parsed.getTime()) ? raw : parsed.toISOString().split('T')[0]
  }

  // Summary from <div class="editorial"> first paragraph
  let summary = ''
  const editorialMatch = html.match(
    /class="editorial"[^>]*>([\s\S]*?)<\/div>/i
  )
  if (editorialMatch) {
    const editorialHtml = editorialMatch[1]
    // Get text before the Responsible Official line
    const paragraphs = editorialHtml
      .split(/<\/p>/i)
      .map((p) => p.replace(/<[^>]+>/g, '').trim())
      .filter((p) => p && !p.includes('Responsible Official') && !p.includes('Effective Date'))
    summary = paragraphs.slice(0, 3).join('\n\n')
  }

  return { title, responsibleOffice, effectiveDate, pdfUrl, summary }
}

// ─── Step 3: Parse PDF text ───────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse') as (
    buf: Buffer
  ) => Promise<{ text: string; numpages: number }>
  const result = await pdfParse(buffer)
  return result.text || ''
}

// ─── Step 4: Classify policy into a category ──────────────────

function classifyPolicy(policyNumber: string, title: string, indexCategory: string): string {
  const lower = (policyNumber + ' ' + title).toLowerCase()

  if (indexCategory === 'Governing Regulation') return 'Governance'

  // Classify ARs based on content/number patterns
  if (/\b(employ|hr|personnel|staff|hire|compensation|leave|work|retirement|benefit)/i.test(lower))
    return 'HR & Employment'
  if (/\b(financ|budget|procurement|purchas|fiscal|travel|expense|fund|account)/i.test(lower))
    return 'Finance & Procurement'
  if (/\b(academ|faculty|tenure|curriculum|grade|student|enroll|degree|research|compliance|ferpa)/i.test(lower))
    return 'Academic & Compliance'
  if (/\b(facilit|building|space|park|campus|environment|safety|security|operat)/i.test(lower))
    return 'Facilities & Operations'
  if (/\b(student affair|conduct|discipline|hous|greek|organization|club)/i.test(lower))
    return 'Student Affairs'
  if (/\b(it |data|technology|information|cyber|network|computer|privacy)/i.test(lower))
    return 'IT & Data'

  return 'Administrative Regulation'
}

// ─── Step 5: Parse policy number from title ───────────────────

function parsePolicyNumber(rawTitle: string, href: string): string {
  // Try to extract "AR X:Y-Z" or "AR X:Y" (with optional suffix like -1, -2)
  const arMatch = rawTitle.match(/^(AR\s+\d+:\d+(?:-\d+)?)/i)
  if (arMatch) return arMatch[1].toUpperCase().replace(/\s+/g, ' ')

  // Try legacy format "AR II-1.1-10"
  const arLegacy = rawTitle.match(/^(AR\s+[IVX]+-[\d.-]+)/i)
  if (arLegacy) return arLegacy[1].toUpperCase().replace(/\s+/g, ' ')

  const grMatch = rawTitle.match(/^(GR\s+[IVX]+)/i)
  if (grMatch) return grMatch[1].toUpperCase()

  // For new-style ARs without numbers, derive from the title
  const arPrefixMatch = rawTitle.match(/^AR:\s*(.+)$/i)
  if (arPrefixMatch) return `AR: ${arPrefixMatch[1].trim()}`

  // For implementing policies ("Policy – ...")
  const policyMatch = rawTitle.match(/^Policy\s*[–—-]\s*(.+)$/i)
  if (policyMatch) return `Policy: ${policyMatch[1].trim()}`

  // For implementing policies from href
  if (href.includes('ar-policy-')) {
    const slug = href.split('/').pop() || ''
    return slug
      .replace('ar-policy-', 'Policy: ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Fallback: use the title itself
  return rawTitle.slice(0, 80)
}

function parseTitleAfterNumber(rawTitle: string): string {
  // Strip "AR X:Y - " or "GR I: " prefix to get just the title
  const stripped = rawTitle
    .replace(/^AR\s+\d+:\d+\s*[-–—]\s*/i, '')
    .replace(/^GR\s+[IVX]+\s*[:]\s*/i, '')
    .replace(/^AR:\s*/i, '')
    .trim()
  return stripped || rawTitle
}

// ─── Main Pipeline ────────────────────────────────────────────

async function main() {
  console.log('🏛️  UK Policy Ingestion — https://regs.uky.edu/')
  console.log('=' .repeat(60))

  const allPolicies: ScrapedPolicy[] = []
  let totalPdfs = 0
  let failedPdfs = 0

  for (const { url, category } of INDEX_PAGES) {
    console.log(`\n📄 Fetching index: ${url}`)
    const html = await fetchText(url)
    const entries = extractLinksFromIndex(html)
    console.log(`   Found ${entries.length} regulation links`)

    for (const entry of entries) {
      const pageUrl = `${BASE_URL}${entry.href}`
      console.log(`\n   → ${entry.rawTitle}`)
      console.log(`     ${pageUrl}`)

      await sleep(REQUEST_DELAY)

      try {
        const pageHtml = await fetchText(pageUrl)
        const meta = extractMetaFromPage(pageHtml)
        const policyNumber = parsePolicyNumber(entry.rawTitle, entry.href)
        const title = meta.title || parseTitleAfterNumber(entry.rawTitle)

        let fullText = ''

        // Try to download and parse PDF
        if (meta.pdfUrl) {
          totalPdfs++
          console.log(`     📥 Downloading PDF...`)
          try {
            await sleep(REQUEST_DELAY)
            const pdfBuffer = await fetchBuffer(meta.pdfUrl)
            fullText = await extractPdfText(pdfBuffer)
            console.log(`     ✅ Extracted ${fullText.length} chars from PDF`)
          } catch (err) {
            failedPdfs++
            console.log(`     ⚠️  PDF extraction failed: ${err}`)
            // Fall back to page summary
            fullText = meta.summary || ''
          }
        } else {
          console.log(`     ⚠️  No PDF link found — using page summary`)
          fullText = meta.summary || ''
        }

        // Skip if we got nothing
        if (!fullText.trim()) {
          console.log(`     ⚠️  No content extracted — skipping`)
          continue
        }

        const effectiveDate = meta.effectiveDate || '2024-01-01'

        allPolicies.push({
          policyNumber,
          title,
          category: classifyPolicy(policyNumber, title, category),
          responsibleOffice: meta.responsibleOffice,
          appliesTo: 'University Community',
          effectiveDate,
          lastRevised: effectiveDate,
          fullText,
          sourceUrl: pageUrl,
          pdfUrl: meta.pdfUrl,
        })
      } catch (err) {
        console.log(`     ❌ Failed to process: ${err}`)
      }
    }
  }

  // Write to JSON
  console.log('\n' + '='.repeat(60))
  console.log(`📝 Writing ${allPolicies.length} policies to ${OUTPUT_PATH}`)
  console.log(`   PDFs: ${totalPdfs} attempted, ${failedPdfs} failed`)

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allPolicies, null, 2), 'utf-8')

  console.log('✅ Done! Run `npx tsx scripts/seed-policies.ts` to load into the database.')
}

main().catch((err) => {
  console.error('❌ Ingestion failed:', err)
  process.exit(1)
})
