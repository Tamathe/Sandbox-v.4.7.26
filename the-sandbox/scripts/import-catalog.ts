/**
 * Import UK course catalog into CatalogCourse table.
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/import-catalog.ts
 *
 * Data quality note: The catalog JSON contains 4844 entries total, but only ~585 have
 * usable course data. The rest are empty scraper artifacts (no courseCode, no title).
 * - 452 entries have a proper courseCode from the scraper
 * - 133 entries have an embedded courseCode in the title field ("A-E 120 - Pathways...")
 * - 4259 entries are completely empty and are skipped
 */

import fs from 'fs'
import path from 'path'

// Load .env before anything that reads env vars
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

// ── Prisma client (matches app/lib/prisma.ts pattern) ──────────────────────

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

// ── Types ──────────────────────────────────────────────────────────────────

interface RawCourse {
  coid: string
  prefix: string
  number: string
  courseCode: string
  title: string
  creditHours: string
  description?: string
  prerequisites?: string
  attributes?: string[]
  repeatability?: string
  catoid?: number
}

interface CatalogJson {
  catoid: number
  totalCourses: number
  courses: RawCourse[]
}

interface ParsedPrereq {
  type: 'AND' | 'OR'
  courses: string[]
}

// Normalized course ready to upsert
interface NormalizedCourse {
  coid: string
  courseCode: string
  prefix: string
  number: string
  title: string
  creditHours: string
  description?: string
  prerequisites?: string
  attributes: string[]
  repeatability?: string
  catoid: number
}

// ── Course normalization ───────────────────────────────────────────────────

// Matches "A-E 120 - Pathways to Creativity..." → groups: prefix, number, title
const EMBEDDED_RE = /^([A-Z][A-Z&\-]*)\s+(\d+[A-Z]?)\s+-\s+(.+)$/

function normalizeCourse(c: RawCourse, defaultCatoid: number): NormalizedCourse | null {
  if (c.courseCode && c.courseCode.trim()) {
    // Happy path: proper data from scraper
    return {
      coid: c.coid,
      courseCode: c.courseCode.trim(),
      prefix: c.prefix,
      number: c.number,
      title: c.title,
      creditHours: c.creditHours,
      description: c.description,
      prerequisites: c.prerequisites,
      attributes: c.attributes ?? [],
      repeatability: c.repeatability,
      catoid: c.catoid ?? defaultCatoid,
    }
  }

  // Try to parse courseCode + title from the embedded title field
  const m = c.title?.match(EMBEDDED_RE)
  if (m) {
    return {
      coid: c.coid,
      courseCode: `${m[1]} ${m[2]}`,
      prefix: m[1],
      number: m[2],
      title: m[3],
      creditHours: c.creditHours,
      description: c.description,
      prerequisites: c.prerequisites,
      attributes: c.attributes ?? [],
      repeatability: c.repeatability,
      catoid: c.catoid ?? defaultCatoid,
    }
  }

  // Empty / unusable scraper artifact — skip
  return null
}

// ── Credit hours parsing ───────────────────────────────────────────────────

function parseCreditHours(raw: string): { min: number; max: number } {
  const trimmed = raw.trim()
  const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) }
  }
  const singleMatch = trimmed.match(/^(\d+)$/)
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10)
    return { min: n, max: n }
  }
  return { min: 1, max: 6 }
}

// ── Prerequisite parsing via Sonnet ───────────────────────────────────────

const SKIP_PREREQS = new Set(['-', 'Will be set by instructor', ''])

function needsParsing(prereq: string | undefined): boolean {
  if (!prereq) return false
  const trimmed = prereq.trim()
  if (SKIP_PREREQS.has(trimmed)) return false
  if (trimmed.length <= 5) return false
  return true
}

async function parsePrerequisitesBatch(
  prereqs: string[],
  anthropic: Anthropic
): Promise<(ParsedPrereq | null)[]> {
  const prompt = `Parse each prerequisite string and extract referenced course codes.
Return a JSON array (one object per input) with this shape:
{ "type": "AND" | "OR", "courses": ["CHEM 105", "BIO 148"] }
Return null if no specific course codes are mentioned.
Input array:
${JSON.stringify(prereqs)}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return prereqs.map(() => null)
  try {
    return JSON.parse(jsonMatch[0]) as (ParsedPrereq | null)[]
  } catch {
    return prereqs.map(() => null)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const catalogPath = path.resolve(
    __dirname,
    '../../course-catalog-scraper/output/course-catalog.json'
  )

  console.log(`Reading catalog from ${catalogPath}`)
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as CatalogJson
  console.log(`Loaded ${raw.courses.length} raw entries from JSON`)

  // Normalize and deduplicate by courseCode (keep last seen)
  const normalized = new Map<string, NormalizedCourse>()
  for (const c of raw.courses) {
    const n = normalizeCourse(c, raw.catoid ?? 18)
    if (n) normalized.set(n.courseCode, n)
  }

  const courses = Array.from(normalized.values())
  console.log(`${courses.length} usable courses after normalization and deduplication`)
  console.log(`Skipped ${raw.courses.length - courses.length} empty/unusable scraper artifacts`)

  // ── Parse prerequisites via Sonnet ────────────────────────────────────

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prereqResults = new Map<string, ParsedPrereq | null>()
  const needAI = courses.filter((c) => needsParsing(c.prerequisites))
  console.log(`${needAI.length} courses need AI prerequisite parsing`)

  const PREREQ_BATCH = 50
  const totalPrereqBatches = Math.ceil(needAI.length / PREREQ_BATCH)

  for (let i = 0; i < needAI.length; i += PREREQ_BATCH) {
    const batchNum = Math.floor(i / PREREQ_BATCH) + 1
    const batch = needAI.slice(i, i + PREREQ_BATCH)
    console.log(`Parsing prerequisites batch ${batchNum}/${totalPrereqBatches}...`)
    const strings = batch.map((c) => c.prerequisites!)
    const results = await parsePrerequisitesBatch(strings, anthropic)
    batch.forEach((c, idx) => prereqResults.set(c.courseCode, results[idx]))
  }

  // ── Upsert courses in batches of 100 ─────────────────────────────────

  const DB_BATCH = 100
  const totalBatches = Math.ceil(courses.length / DB_BATCH)
  let upsertedCount = 0

  for (let i = 0; i < courses.length; i += DB_BATCH) {
    const batchNum = Math.floor(i / DB_BATCH) + 1
    const batch = courses.slice(i, i + DB_BATCH)
    console.log(`Importing batch ${batchNum}/${totalBatches}...`)

    await Promise.all(
      batch.map((c) => {
        const { min, max } = parseCreditHours(c.creditHours)
        const prereqRaw = c.prerequisites?.trim() || null
        const prereqParsed = prereqResults.get(c.courseCode) ?? null

        return prisma.catalogCourse.upsert({
          where: { courseCode: c.courseCode },
          create: {
            coid: c.coid,
            courseCode: c.courseCode,
            prefix: c.prefix,
            number: c.number,
            title: c.title,
            description: c.description && c.description.trim() !== '-' ? c.description.trim() : null,
            creditHoursRaw: c.creditHours,
            creditHoursMin: min,
            creditHoursMax: max,
            prerequisitesRaw: prereqRaw,
            prerequisitesParsed: prereqParsed ? (prereqParsed as object) : undefined,
            attributes: c.attributes ?? [],
            repeatability: c.repeatability?.trim() || null,
            catoid: c.catoid ?? 18,
            catalogYear: '2025-2026',
          },
          update: {
            prefix: c.prefix,
            number: c.number,
            title: c.title,
            description: c.description && c.description.trim() !== '-' ? c.description.trim() : null,
            creditHoursRaw: c.creditHours,
            creditHoursMin: min,
            creditHoursMax: max,
            prerequisitesRaw: prereqRaw,
            prerequisitesParsed: prereqParsed ? (prereqParsed as object) : undefined,
            attributes: c.attributes ?? [],
            repeatability: c.repeatability?.trim() || null,
          },
        })
      })
    )

    upsertedCount += batch.length
  }

  const finalCount = await prisma.catalogCourse.count()
  console.log(
    `\nDone. ${upsertedCount} courses upserted, ${needAI.length} prereqs parsed via AI.`
  )
  console.log(`Total rows in CatalogCourse: ${finalCount}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
