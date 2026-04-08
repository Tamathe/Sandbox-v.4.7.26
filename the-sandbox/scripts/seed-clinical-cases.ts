/**
 * Bulk import 18 COM clinical reasoning .docx files into Virtual Clinic.
 * Run: npx tsx scripts/seed-clinical-cases.ts
 *
 * dotenv must load before any app/lib imports (they read DATABASE_URL at module init),
 * so we use dynamic imports inside main().
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as mammoth from 'mammoth'
import * as fs from 'fs'
import * as path from 'path'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SOURCE_DIR =
  'C:/AA Code/Educator marketplace/Test documents/COM Simulator/Draft Clinical Reasoning Cases'
const CREATOR_EMAIL = 'katie.thompson@uky.edu'

interface ImportResult {
  file: string
  title?: string
  success: boolean
  error?: string
}

async function main() {
  // Dynamic imports so dotenv.config() has run before app/lib modules load
  const { parseRawTextToCase } = await import('../app/lib/virtual-clinic/import-service')
  const { createCase, publishCase } = await import('../app/lib/virtual-clinic/case-service')

  // Look up creator
  const creator = await prisma.user.findUnique({ where: { email: CREATOR_EMAIL } })
  if (!creator) {
    console.error(`Creator ${CREATOR_EMAIL} not found. Run main seed first.`)
    process.exit(1)
  }
  console.log(`Creator: ${creator.name} (${creator.id})\n`)

  // Clean up any existing cases from prior runs (delete unpublished + published by this creator)
  const existing = await prisma.clinicalCase.findMany({
    where: { creatorId: creator.id },
    select: { id: true, title: true, published: true },
  })
  if (existing.length > 0) {
    // Only delete cases with no encounters
    for (const c of existing) {
      const encounters = await prisma.clinicalEncounter.count({ where: { caseId: c.id } })
      if (encounters === 0) {
        await prisma.clinicalCase.delete({ where: { id: c.id } })
        console.log(`  Deleted prior import: "${c.title}" (published=${c.published})`)
      } else {
        console.log(`  Kept: "${c.title}" (has ${encounters} encounters)`)
      }
    }
    console.log()
  }

  // Scan directory for .docx files
  const allFiles = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.docx'))
  console.log(`Found ${allFiles.length} .docx files\n`)

  // Build pair map: base name -> { caseFile, keyFile }
  const pairMap = new Map<string, { caseFile?: string; keyFile?: string }>()

  for (const file of allFiles) {
    const name = file.replace('.docx', '')

    const keyMatch = name.match(/^(.+?)\s+Key$/i)
    const facilitatorMatch = name.match(/^(.+?)\s*-\s*Facilitator$/i)

    if (keyMatch) {
      const base = keyMatch[1]
      const entry = pairMap.get(base) ?? {}
      entry.keyFile = file
      pairMap.set(base, entry)
    } else if (facilitatorMatch) {
      const base = facilitatorMatch[1]
      const entry = pairMap.get(base) ?? {}
      entry.keyFile = file
      pairMap.set(base, entry)
    } else {
      const entry = pairMap.get(name) ?? {}
      entry.caseFile = file
      pairMap.set(name, entry)
    }
  }

  // Build import list
  const imports: { label: string; files: string[] }[] = []

  for (const [base, pair] of pairMap) {
    if (pair.caseFile && pair.keyFile) {
      imports.push({ label: `${base} (paired)`, files: [pair.caseFile, pair.keyFile] })
    } else if (pair.caseFile) {
      imports.push({ label: base, files: [pair.caseFile] })
    } else if (pair.keyFile) {
      imports.push({ label: `${base} (key/facilitator)`, files: [pair.keyFile] })
    }
  }

  console.log(`Import plan: ${imports.length} cases`)
  for (const imp of imports) {
    console.log(`  - ${imp.label}: ${imp.files.join(' + ')}`)
  }
  console.log()

  // Process each case sequentially
  const results: ImportResult[] = []

  for (let i = 0; i < imports.length; i++) {
    const imp = imports[i]
    console.log(`[${i + 1}/${imports.length}] Processing: ${imp.label}`)

    try {
      // Extract text from each file
      const texts: string[] = []
      for (const file of imp.files) {
        const filePath = path.join(SOURCE_DIR, file)
        const buffer = fs.readFileSync(filePath)
        const result = await mammoth.extractRawText({ buffer })
        texts.push(result.value)
      }

      // Merge with separator if paired
      const mergedText =
        texts.length > 1
          ? texts.join('\n\n--- ANSWER KEY ---\n\n')
          : texts[0]

      // Parse via Sonnet
      console.log('  Parsing with Sonnet...')
      const caseInput = await parseRawTextToCase(mergedText)
      console.log(`  Parsed: "${caseInput.title}" (${caseInput.difficulty})`)

      // Create case
      const created = await createCase(caseInput, creator.id)
      console.log(`  Created: ${created.id}`)

      // Publish case
      await publishCase(created.id, creator.id)
      console.log(`  Published successfully`)

      results.push({ file: imp.label, title: caseInput.title, success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  FAILED: ${message}`)
      results.push({ file: imp.label, success: false, error: message })
    }

    console.log()

    // Brief pause between cases to avoid rate limits
    if (i < imports.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  // Print summary
  const successes = results.filter((r) => r.success)
  const failures = results.filter((r) => !r.success)

  console.log('═══════════════════════════════════════')
  console.log(`IMPORT COMPLETE: ${successes.length}/${results.length} cases imported`)
  console.log('═══════════════════════════════════════')

  if (successes.length > 0) {
    console.log('\nSuccessful:')
    for (const r of successes) {
      console.log(`  ✓ ${r.title} (${r.file})`)
    }
  }

  if (failures.length > 0) {
    console.log('\nFailed:')
    for (const r of failures) {
      console.log(`  ✗ ${r.file}: ${r.error}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
