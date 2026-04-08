/**
 * Seed script: Money, Machines, and Markets course
 *
 * Walks Material/courses/money-machines-markets/ and upserts the entire
 * course into the platform via Prisma. Idempotent — safe to re-run.
 *
 * Usage:
 *   INSTRUCTOR_ID=<userId> npx tsx scripts/seed-money-machines-markets.ts [--dry-run]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCHEMA ADAPTER NOTES
 *
 * The source files were authored against a richer mental model than the
 * platform actually has. The live Prisma schema only knows about:
 *   - Course        (id, courseCode UNIQUE, title, description, instructorId, isPublic)
 *   - CourseMaterial (courseId, title, content, materialType, moduleNumber, isVisible)
 *
 * There is NO Module / Lesson / MasteryGate / Assignment / Rubric / Policy /
 * DiscussionThread (as authored content) model. Therefore every authored
 * artifact has to be flattened into a CourseMaterial row, distinguished by
 * `materialType` and grouped by `moduleNumber`.
 *
 * Source shape                          → Platform shape
 * ─────────────────────────────────────────────────────────────────────────────
 * course.json                           → Course (courseCode = id, description
 *                                         built from subtitle+summary; tags,
 *                                         learningOutcomes, etc. stored as a
 *                                         "course-overview" CourseMaterial
 *                                         JSON blob since Course has no field
 *                                         for them)
 * syllabus.md                           → CourseMaterial(type="syllabus", moduleNumber=null)
 * reading-list.md                       → CourseMaterial(type="reading-list", moduleNumber=null)
 * policies/*.md                         → CourseMaterial(type="policy",      moduleNumber=null)
 * policies/policies.json                → CourseMaterial(type="policy-index", moduleNumber=null)
 * rubrics/*.json                        → CourseMaterial(type="rubric",      moduleNumber=null)
 * final-project/brief.md                → CourseMaterial(type="final-project-brief",  moduleNumber=99)
 * final-project/rubric.json             → CourseMaterial(type="final-project-rubric", moduleNumber=99)
 * modules/NN-slug/module.json           → CourseMaterial(type="module-overview", moduleNumber=N)
 * modules/NN-slug/lessons/MM-*.md       → CourseMaterial(type="lesson",         moduleNumber=N)
 *                                         (frontmatter parsed if present; title
 *                                          taken from frontmatter or H1 or filename)
 * modules/NN-slug/assignment.md         → CourseMaterial(type="assignment",     moduleNumber=N)
 * modules/NN-slug/mastery-gate.json     → CourseMaterial(type="mastery-gate",   moduleNumber=N)
 * modules/NN-slug/discussion-prompts.md → CourseMaterial(type="discussion-prompts", moduleNumber=N)
 * modules/NN-slug/study-group-brief.md  → CourseMaterial(type="study-group",    moduleNumber=N)
 * modules/NN-slug/voice-session.json    → CourseMaterial(type="voice-session",  moduleNumber=N)
 * modules/NN-slug/concepts.json         → CourseMaterial(type="concepts",       moduleNumber=N)
 *
 * IDEMPOTENCY
 *   Course is upserted by courseCode = "money-machines-markets" (the stable id
 *   from course.json). CourseMaterial has no natural unique key, so on each
 *   run we deleteMany({ courseId }) then re-create. This is safe because the
 *   source-of-truth is the file tree, not the database.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs'
import * as path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')
const COURSE_CODE = 'money-machines-markets'
const COURSE_ROOT = path.join(__dirname, '..', 'Material', 'courses', COURSE_CODE)

// Lazy-load runtime deps so --dry-run works without node_modules installed.
let prisma: any = null
async function getPrisma() {
  if (prisma) return prisma
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
  dotenv.config()
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { PrismaClient } = await import('../app/generated/prisma')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required for non-dry-run')
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  return prisma
}

type MaterialRow = {
  title: string
  content: string
  materialType: string
  moduleNumber: number | null
  isVisible?: boolean
}

const created: string[] = []
const updated: string[] = []
const skipped: string[] = []

function readJSON<T = unknown>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}
function readText(p: string): string {
  return fs.readFileSync(p, 'utf8')
}
function exists(p: string): boolean {
  return fs.existsSync(p)
}

// Minimal YAML frontmatter parser — just `key: value` lines between --- markers.
function parseFrontmatter(md: string): { data: Record<string, string>; body: string } {
  if (!md.startsWith('---')) return { data: {}, body: md }
  const end = md.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: md }
  const block = md.slice(3, end).trim()
  const body = md.slice(end + 4).replace(/^\n/, '')
  const data: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (m) data[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return { data, body }
}

function titleFromMarkdown(md: string, fallback: string): string {
  const fm = parseFrontmatter(md)
  if (fm.data.title) return fm.data.title
  const h1 = fm.body.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return fallback
}

function collectMaterials(): MaterialRow[] {
  const rows: MaterialRow[] = []

  // Course-level overview blob (preserves fields Course has nowhere to store)
  const courseJson = readJSON<Record<string, unknown>>(path.join(COURSE_ROOT, 'course.json'))
  rows.push({
    title: 'Course Overview',
    content: JSON.stringify(courseJson, null, 2),
    materialType: 'course-overview',
    moduleNumber: null,
  })

  // Syllabus
  const syllabusPath = path.join(COURSE_ROOT, 'syllabus.md')
  if (exists(syllabusPath)) {
    const md = readText(syllabusPath)
    rows.push({
      title: 'Syllabus',
      content: md,
      materialType: 'syllabus',
      moduleNumber: null,
    })
  }

  // Reading list
  const readingPath = path.join(COURSE_ROOT, 'reading-list.md')
  if (exists(readingPath)) {
    rows.push({
      title: 'Reading List',
      content: readText(readingPath),
      materialType: 'reading-list',
      moduleNumber: null,
    })
  }

  // Policies
  const policiesDir = path.join(COURSE_ROOT, 'policies')
  if (exists(policiesDir)) {
    for (const f of fs.readdirSync(policiesDir)) {
      const full = path.join(policiesDir, f)
      if (f.endsWith('.md')) {
        const md = readText(full)
        rows.push({
          title: titleFromMarkdown(md, f.replace(/\.md$/, '')),
          content: md,
          materialType: 'policy',
          moduleNumber: null,
        })
      } else if (f.endsWith('.json')) {
        rows.push({
          title: f.replace(/\.json$/, ''),
          content: readText(full),
          materialType: 'policy-index',
          moduleNumber: null,
        })
      }
    }
  }

  // Rubrics
  const rubricsDir = path.join(COURSE_ROOT, 'rubrics')
  if (exists(rubricsDir)) {
    for (const f of fs.readdirSync(rubricsDir)) {
      if (!f.endsWith('.json')) continue
      rows.push({
        title: f.replace(/\.json$/, ''),
        content: readText(path.join(rubricsDir, f)),
        materialType: 'rubric',
        moduleNumber: null,
      })
    }
  }

  // Final project (use moduleNumber=99 to sort it last)
  const fpDir = path.join(COURSE_ROOT, 'final-project')
  if (exists(fpDir)) {
    const brief = path.join(fpDir, 'brief.md')
    if (exists(brief)) {
      rows.push({
        title: 'Final Project Brief',
        content: readText(brief),
        materialType: 'final-project-brief',
        moduleNumber: 99,
      })
    }
    const rubric = path.join(fpDir, 'rubric.json')
    if (exists(rubric)) {
      rows.push({
        title: 'Final Project Rubric',
        content: readText(rubric),
        materialType: 'final-project-rubric',
        moduleNumber: 99,
      })
    }
  }

  // Modules
  const modulesDir = path.join(COURSE_ROOT, 'modules')
  if (exists(modulesDir)) {
    const moduleDirs = fs
      .readdirSync(modulesDir)
      .filter((d) => fs.statSync(path.join(modulesDir, d)).isDirectory())
      .sort()

    for (const modDir of moduleDirs) {
      const modPath = path.join(modulesDir, modDir)
      const moduleJsonPath = path.join(modPath, 'module.json')
      let moduleNumber = parseInt(modDir.split('-')[0], 10) || 0
      let moduleTitle = modDir

      if (exists(moduleJsonPath)) {
        const mj = readJSON<{ order?: number; title?: string }>(moduleJsonPath)
        if (typeof mj.order === 'number') moduleNumber = mj.order
        if (mj.title) moduleTitle = mj.title
        rows.push({
          title: `Module ${moduleNumber}: ${moduleTitle}`,
          content: readText(moduleJsonPath),
          materialType: 'module-overview',
          moduleNumber,
        })
      }

      // Lessons
      const lessonsDir = path.join(modPath, 'lessons')
      if (exists(lessonsDir)) {
        const lessons = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.md')).sort()
        for (const lf of lessons) {
          const md = readText(path.join(lessonsDir, lf))
          rows.push({
            title: titleFromMarkdown(md, lf.replace(/\.md$/, '')),
            content: md,
            materialType: 'lesson',
            moduleNumber,
          })
        }
      }

      // Per-module artifacts
      const perModule: Array<[string, string, string]> = [
        ['assignment.md', 'assignment', 'Assignment'],
        ['mastery-gate.json', 'mastery-gate', 'Mastery Gate'],
        ['discussion-prompts.md', 'discussion-prompts', 'Discussion Prompts'],
        ['study-group-brief.md', 'study-group', 'Study Group Brief'],
        ['voice-session.json', 'voice-session', 'Voice Session'],
        ['concepts.json', 'concepts', 'Concepts'],
      ]
      for (const [fname, type, label] of perModule) {
        const fp = path.join(modPath, fname)
        if (!exists(fp)) continue
        const content = readText(fp)
        const title = fname.endsWith('.md')
          ? titleFromMarkdown(content, `${label} — ${moduleTitle}`)
          : `${label} — ${moduleTitle}`
        rows.push({
          title,
          content,
          materialType: type,
          moduleNumber,
        })
      }
    }
  }

  return rows
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Seeding course: ${COURSE_CODE}`)
  console.log(`Source: ${COURSE_ROOT}\n`)

  if (!exists(COURSE_ROOT)) {
    console.error(`Course directory not found: ${COURSE_ROOT}`)
    process.exit(1)
  }

  const instructorId = process.env.INSTRUCTOR_ID
  if (!instructorId) {
    console.error('INSTRUCTOR_ID env var is required (id of the User who will own the course)')
    process.exit(1)
  }

  const courseJson = readJSON<{
    title: string
    subtitle?: string
    summary?: string
    isPublic?: boolean
  }>(path.join(COURSE_ROOT, 'course.json'))

  const description = [courseJson.subtitle, courseJson.summary].filter(Boolean).join('\n\n')

  const materials = collectMaterials()

  if (DRY_RUN) {
    console.log(`Would upsert Course "${courseJson.title}" (courseCode=${COURSE_CODE})`)
    console.log(`  instructorId: ${instructorId}`)
    console.log(`  isPublic:     ${courseJson.isPublic ?? false}`)
    console.log(`  description:  ${description.slice(0, 80)}${description.length > 80 ? '…' : ''}`)
    console.log(`\nWould delete all existing CourseMaterial rows for this course, then create:`)
    const byType = new Map<string, number>()
    for (const m of materials) byType.set(m.materialType, (byType.get(m.materialType) ?? 0) + 1)
    for (const [t, n] of [...byType.entries()].sort()) console.log(`  ${n.toString().padStart(3)} × ${t}`)
    console.log(`\nTotal materials: ${materials.length}`)
    console.log('\n[DRY RUN] No database changes made.')
    return
  }

  // Real run
  const db = await getPrisma()
  const existing = await db.course.findUnique({ where: { courseCode: COURSE_CODE } })
  const course = await db.course.upsert({
    where: { courseCode: COURSE_CODE },
    update: {
      title: courseJson.title,
      description,
      instructorId,
      isPublic: courseJson.isPublic ?? false,
    },
    create: {
      courseCode: COURSE_CODE,
      title: courseJson.title,
      description,
      instructorId,
      isPublic: courseJson.isPublic ?? false,
    },
  })
  if (existing) updated.push(`Course ${course.courseCode}`)
  else created.push(`Course ${course.courseCode}`)

  // Wipe + recreate materials (only safe path to idempotency given no unique key)
  const deleted = await db.courseMaterial.deleteMany({ where: { courseId: course.id } })
  console.log(`Deleted ${deleted.count} existing CourseMaterial rows`)

  for (const m of materials) {
    await db.courseMaterial.create({
      data: {
        courseId: course.id,
        title: m.title,
        content: m.content,
        materialType: m.materialType,
        moduleNumber: m.moduleNumber ?? undefined,
        isVisible: m.isVisible ?? true,
      },
    })
    created.push(`CourseMaterial[${m.materialType}] ${m.title}`)
  }

  console.log(`\nCreated: ${created.length}`)
  console.log(`Updated: ${updated.length}`)
  console.log(`Skipped: ${skipped.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect()
  })
