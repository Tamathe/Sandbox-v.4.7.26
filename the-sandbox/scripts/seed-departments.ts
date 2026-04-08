/**
 * Seed script for Department Storefronts.
 *
 * Creates ~10 departments, assigns demo users as owners/editors,
 * creates collections, and maps existing tools by looking up IDs from the DB.
 *
 * Usage: npx tsx scripts/seed-departments.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

// ─── Department definitions ──────────────────────────────────────────────────

const DEPARTMENTS = [
  {
    name: 'Center for the Enhancement of Learning & Teaching',
    shortName: 'CELT',
    slug: 'celt',
    description: 'Supporting teaching excellence at the University of Kentucky. Resources, workshops, and AI-powered tools for faculty development.',
    themeColor: '#0033A0',
    websiteUrl: 'https://celt.uky.edu',
    contactEmail: 'celt@uky.edu',
    categoryTags: ['Academic', 'Administrative'],
    featured: true,
    displayOrder: 1,
    ownerEmail: 'heath.price@uky.edu',
    editorEmail: 'katie.thompson@uky.edu',
    collections: [
      { name: 'Faculty Intelligence', slug: 'faculty-intelligence', icon: 'Brain', emoji: '🧠', tools: ['lecture-debrief', 'research-hub', 'syllabus-architect'] },
      { name: 'Course Design', slug: 'course-design', icon: 'BookOpen', emoji: '📐', tools: ['exam-forge', 'prereq-unpacker'] },
      { name: 'Assessment & Feedback', slug: 'assessment', icon: 'ClipboardCheck', emoji: '📊', tools: ['survey-analyzer'] },
      { name: 'AI Policy & Academic Integrity', slug: 'ai-policy', icon: 'Shield', emoji: '📐', tools: ['ai-use-scale'] },
    ],
  },
  {
    name: 'College of Medicine',
    shortName: 'Medicine',
    slug: 'medicine',
    description: 'AI-powered clinical simulations and medical education tools for the UK College of Medicine.',
    themeColor: '#C8102E',
    websiteUrl: 'https://medicine.uky.edu',
    contactEmail: 'medicine@uky.edu',
    categoryTags: ['Academic', 'Research'],
    featured: true,
    displayOrder: 2,
    ownerEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'Clinical Simulations', slug: 'clinical-sims', icon: 'HeartPulse', emoji: '🫀', tools: ['cardiac-arrest-sim', 'pediatric-sepsis', 'vitals-dashboard'] },
      { name: 'Pharmacology', slug: 'pharmacology', icon: 'Pill', emoji: '💊', tools: ['drug-interaction-sim'] },
    ],
  },
  {
    name: 'College of Law',
    shortName: 'Law',
    slug: 'law',
    description: 'Legal education tools including moot court simulations, case brief builders, and statutory analysis.',
    themeColor: '#1B365D',
    websiteUrl: 'https://law.uky.edu',
    contactEmail: 'law@uky.edu',
    categoryTags: ['Academic'],
    featured: true,
    displayOrder: 3,
    ownerEmail: 'katie.thompson@uky.edu',
    collections: [
      { name: 'Courtroom Practice', slug: 'courtroom', icon: 'Scale', emoji: '⚖️', tools: ['moot-court'] },
      { name: 'Legal Research', slug: 'legal-research', icon: 'Search', emoji: '🔍', tools: ['case-brief-builder', 'statute-annotator'] },
    ],
  },
  {
    name: 'College of Engineering',
    shortName: 'Engineering',
    slug: 'engineering',
    description: 'STEM simulation tools and engineering education resources from the UK College of Engineering.',
    themeColor: '#005DAA',
    websiteUrl: 'https://engineering.uky.edu',
    contactEmail: 'engineering@uky.edu',
    categoryTags: ['Academic', 'Research'],
    featured: true,
    displayOrder: 4,
    ownerEmail: 'katie.thompson@uky.edu',
    editorEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'STEM Simulations', slug: 'stem-sims', icon: 'Atom', emoji: '⚛️', tools: ['circuit-simulator', 'physics-sandbox', 'molecular-viewer'] },
      { name: 'Lab Safety', slug: 'lab-safety', icon: 'ShieldAlert', emoji: '🧪', tools: ['lab-safety-sim'] },
    ],
  },
  {
    name: 'Student Affairs',
    shortName: 'Student Affairs',
    slug: 'student-affairs',
    description: 'Tools and resources supporting student life, wellness, and campus engagement at the University of Kentucky.',
    themeColor: '#0033A0',
    websiteUrl: 'https://www.uky.edu/studentaffairs',
    contactEmail: 'studentaffairs@uky.edu',
    categoryTags: ['Student Services'],
    featured: true,
    displayOrder: 5,
    ownerEmail: 'morgan.rivera@uky.edu',
    collections: [
      { name: 'Campus Life', slug: 'campus-life', icon: 'MapPin', emoji: '🏫', tools: ['campus-navigator', 'ask-sandy', 'uknow'] },
      { name: 'Wellness', slug: 'wellness', icon: 'Heart', emoji: '💚', tools: ['mindfulness-coach', 'habit-tracker', 'sleep-log', 'symptom-journal'] },
    ],
  },
  {
    name: 'Graduate School',
    shortName: 'Graduate School',
    slug: 'graduate-school',
    description: 'Research tools and academic resources for graduate students at the University of Kentucky.',
    themeColor: '#4B2E83',
    websiteUrl: 'https://gradschool.uky.edu',
    contactEmail: 'gradschool@uky.edu',
    categoryTags: ['Academic', 'Research'],
    featured: false,
    displayOrder: 6,
    ownerEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'Research Tools', slug: 'research', icon: 'FlaskConical', emoji: '🔬', tools: ['research-hub'] },
      { name: 'Academic Writing', slug: 'academic-writing', icon: 'PenLine', emoji: '✍️', tools: ['cover-letter', 'resume-builder'] },
    ],
  },
  {
    name: 'Office of the Registrar',
    shortName: 'Registrar',
    slug: 'registrar',
    description: 'Academic planning and degree audit tools from the Office of the Registrar.',
    themeColor: '#0033A0',
    websiteUrl: 'https://www.uky.edu/registrar',
    contactEmail: 'registrar@uky.edu',
    categoryTags: ['Administrative'],
    featured: false,
    displayOrder: 7,
    ownerEmail: 'morgan.rivera@uky.edu',
    collections: [
      { name: 'Academic Planning', slug: 'academic-planning', icon: 'GraduationCap', emoji: '🎓', tools: ['degree-planner', 'ask-sandy'] },
    ],
  },
  {
    name: 'University Communications',
    shortName: 'Communications',
    slug: 'communications',
    description: 'Crisis communications and media relations tools for the university communications team.',
    themeColor: '#0033A0',
    websiteUrl: 'https://www.uky.edu/prmarketing',
    contactEmail: 'ucomm@uky.edu',
    categoryTags: ['Administrative'],
    featured: false,
    displayOrder: 8,
    ownerEmail: 'morgan.rivera@uky.edu',
    editorEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'Crisis Response', slug: 'crisis-response', icon: 'AlertTriangle', emoji: '🚨', tools: ['crisis-spokesperson-trainer', 'reputation-pulse', 'crisis-command-center'] },
    ],
  },
  {
    name: 'Innovation & Commercialization',
    shortName: 'Innovation',
    slug: 'innovation',
    description: 'Tools for intellectual property assessment, market analysis, and innovation support.',
    themeColor: '#FF6B00',
    websiteUrl: 'https://www.uky.edu/innovation',
    contactEmail: 'innovation@uky.edu',
    categoryTags: ['Research', 'Administrative'],
    featured: false,
    displayOrder: 9,
    ownerEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'Innovation & IP', slug: 'innovation-ip', icon: 'Lightbulb', emoji: '💡', tools: ['idea-to-launch', 'innovation-lab'] },
    ],
  },
  {
    name: 'Athletics',
    shortName: 'Athletics',
    slug: 'athletics',
    description: 'Sports and recreation tools, including The Bracket for March Madness predictions.',
    themeColor: '#0033A0',
    websiteUrl: 'https://ukathletics.com',
    contactEmail: 'athletics@uky.edu',
    featured: false,
    displayOrder: 10,
    ownerEmail: 'heath.price@uky.edu',
    collections: [
      { name: 'Fan Engagement', slug: 'fan-engagement', icon: 'Trophy', emoji: '🏆', tools: ['the-bracket'] },
    ],
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏛️  Seeding Department Storefronts...\n')

  // Look up demo users
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'heath.price@uky.edu',
          'katie.thompson@uky.edu',
          'tiana.the.student@uky.edu',
          'morgan.rivera@uky.edu',
        ],
      },
    },
    select: { id: true, email: true, name: true },
  })

  const userMap = new Map(users.map(u => [u.email, u]))

  if (users.length < 4) {
    console.error('❌ Not all demo users found. Run npm run db:seed first.')
    process.exit(1)
  }

  // Build a tool name → ID lookup from existing tools in the DB
  // Tools use slugified names as IDs sometimes, but more reliably we find by name patterns
  const allTools = await prisma.tool.findMany({
    select: { id: true, name: true },
  })

  // Build slug-like lookup: lowercase, remove special chars, replace spaces with hyphens
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const toolsBySlug = new Map<string, string>()
  for (const t of allTools) {
    toolsBySlug.set(slugify(t.name), t.id)
    // Also store by ID directly in case the tool ID matches
    toolsBySlug.set(t.id, t.id)
  }

  // Known tool slug → possible DB name mappings
  const SLUG_ALIASES: Record<string, string[]> = {
    'cardiac-arrest-sim': ['cardiac-arrest', 'acls-cardiac-arrest', 'acls'],
    'pediatric-sepsis': ['pediatric-sepsis', 'sepsis'],
    'moot-court': ['moot-court', 'constitutional-law-moot-court'],
    'drug-interaction-sim': ['drug-interaction', 'drug-interaction-checker'],
    'lab-safety-sim': ['lab-safety', 'chemistry-lab-safety'],
    'vitals-dashboard': ['vitals-dashboard', 'patient-vitals'],
    'circuit-simulator': ['circuit-simulator', 'interactive-circuit-simulator'],
    'molecular-viewer': ['molecular-viewer', '3d-molecular-viewer'],
    'physics-sandbox': ['physics-sandbox'],
    'supply-chain': ['supply-chain', 'supply-chain-disruption'],
    'exam-forge': ['exam-forge', 'personalized-practice-exams'],
    'teach-it-back': ['teach-it-back', 'teaching-as-learning'],
    'prereq-unpacker': ['prereq-unpacker', 'prerequisite-unpacker'],
    'ai-office-hours': ['ai-office-hours', 'office-hours'],
    'ear-training': ['ear-training', 'music-theory-ear-training'],
    'poetry-meter': ['poetry-meter', 'poetry-meter-rhyme-analyzer'],
    'statute-annotator': ['statute-annotator'],
    'debate-arena': ['debate-arena'],
    'quiz-bowl-blitz': ['quiz-bowl-blitz', 'quiz-bowl'],
    'case-pitch': ['case-pitch'],
    'the-bracket': ['the-bracket', 'bracket'],
    'lecture-debrief': ['lecture-debrief'],
    'research-hub': ['research-hub'],
    'syllabus-architect': ['syllabus-architect'],
    'ask-sandy': ['ask-sandy', 'academic-advisor'],
    'degree-planner': ['degree-planner'],
    'uknow': ['uknow', 'campus-news'],
    'campus-navigator': ['campus-navigator'],
    'resume-builder': ['resume-builder'],
    'survey-analyzer': ['survey-analyzer'],
    'agenda-builder': ['agenda-builder'],
    'cover-letter': ['cover-letter'],
    'case-brief-builder': ['case-brief-builder'],
    'budget-allocation': ['budget-allocation', 'university-budget-allocation'],
    'startup-financial-model': ['startup-financial-model'],
    'timeline-builder': ['timeline-builder', 'interactive-timeline-builder'],
    'event-budget-planner': ['event-budget-planner'],
    'institutional-resume': ['institutional-resume'],
    'contract-drafter': ['contract-drafter'],
    'team-analyzer': ['team-analyzer'],
    'sentiment-analyzer': ['sentiment-analyzer'],
    'file-cleaner': ['file-cleaner'],
    'room-reservation': ['room-reservation'],
    'idea-to-launch': ['idea-to-launch'],
    'innovation-lab': ['innovation-lab'],
    'mindfulness-coach': ['mindfulness-coach'],
    'habit-tracker': ['habit-tracker'],
    'sleep-log': ['sleep-log'],
    'symptom-journal': ['symptom-journal'],
    'crisis-spokesperson-trainer': ['crisis-spokesperson-trainer'],
    'reputation-pulse': ['reputation-pulse'],
    'ai-use-scale': ['ai-use-scale', 'tool-ai-use-scale', 'ai-use-scale-advisor'],
  }

  function findToolId(slug: string): string | null {
    // Direct match
    if (toolsBySlug.has(slug)) return toolsBySlug.get(slug)!
    // Try aliases
    const aliases = SLUG_ALIASES[slug] ?? []
    for (const alias of aliases) {
      if (toolsBySlug.has(alias)) return toolsBySlug.get(alias)!
    }
    // Fuzzy: check if any tool slug contains our slug
    for (const [key, id] of toolsBySlug) {
      if (key.includes(slug) || slug.includes(key)) return id
    }
    return null
  }

  // Clean up existing department data first
  console.log('  Cleaning existing department data...')
  await prisma.collectionTool.deleteMany({})
  await prisma.toolCollection.deleteMany({})
  await prisma.departmentFollower.deleteMany({})
  await prisma.departmentMember.deleteMany({})
  await prisma.department.deleteMany({})

  let deptCount = 0
  let collCount = 0
  let toolMappings = 0
  let toolMisses = 0

  for (const dept of DEPARTMENTS) {
    const owner = userMap.get(dept.ownerEmail)
    if (!owner) {
      console.warn(`  ⚠ Skipping ${dept.shortName}: owner ${dept.ownerEmail} not found`)
      continue
    }

    // Create department
    const department = await prisma.department.create({
      data: {
        name: dept.name,
        shortName: dept.shortName,
        slug: dept.slug,
        description: dept.description,
        themeColor: dept.themeColor,
        websiteUrl: dept.websiteUrl,
        contactEmail: dept.contactEmail,
        categoryTags: dept.categoryTags ?? [],
        featured: dept.featured,
        displayOrder: dept.displayOrder,
        visibility: 'PUBLIC',
      },
    })
    deptCount++

    // Add owner
    await prisma.departmentMember.create({
      data: { departmentId: department.id, userId: owner.id, role: 'OWNER' },
    })

    // Add editor if specified
    if (dept.editorEmail) {
      const editor = userMap.get(dept.editorEmail)
      if (editor) {
        await prisma.departmentMember.create({
          data: { departmentId: department.id, userId: editor.id, role: 'EDITOR' },
        })
      }
    }

    // Add tiana as follower of featured departments
    if (dept.featured) {
      const tiana = userMap.get('tiana.the.student@uky.edu')
      if (tiana) {
        await prisma.departmentFollower.create({
          data: { departmentId: department.id, userId: tiana.id },
        })
      }
    }

    // Create collections and map tools
    for (let i = 0; i < dept.collections.length; i++) {
      const coll = dept.collections[i]

      const collection = await prisma.toolCollection.create({
        data: {
          name: coll.name,
          slug: coll.slug,
          departmentId: department.id,
          icon: coll.icon,
          emoji: coll.emoji,
          displayOrder: i,
          pinned: i === 0,
        },
      })
      collCount++

      // Map tools to collection
      for (let j = 0; j < coll.tools.length; j++) {
        const toolSlug = coll.tools[j]
        const toolId = findToolId(toolSlug)
        if (toolId) {
          try {
            await prisma.collectionTool.create({
              data: {
                collectionId: collection.id,
                toolId,
                displayOrder: j,
              },
            })
            toolMappings++
          } catch {
            // Duplicate or tool already in collection — skip
          }
        } else {
          console.warn(`  ⚠ Tool not found: "${toolSlug}" (for ${dept.shortName} / ${coll.name})`)
          toolMisses++
        }
      }
    }

    console.log(`  ✓ ${dept.shortName} — ${dept.collections.length} collections`)
  }

  console.log(`\n🏛️  Done! ${deptCount} departments, ${collCount} collections, ${toolMappings} tool mappings`)
  if (toolMisses > 0) {
    console.log(`  ⚠ ${toolMisses} tools not found in DB (run seed first or tools may use different names)`)
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
