/**
 * Quick validation script for Canvas .imscc parsing.
 * Run: node scripts/test-canvas-import.mjs
 */
import JSZip from 'jszip'
import { readFileSync } from 'fs'

function xmlText(xml, tag) {
  const re1 = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(re1)
  return m ? m[1].trim() : ''
}

function xmlAttr(el, attr) {
  const m = el.match(new RegExp(`${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function xmlAll(xml, tag) {
  const results = []
  const re = new RegExp(`<${tag}[\\s][^>]*>[\\s\\S]*?</${tag}>`, 'gi')
  let m
  while ((m = re.exec(xml)) !== null) results.push(m[0])
  return results
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const IMSCC_PATH = process.argv[2] || 'c:/AA Code/Educator marketplace/Test documents/Canvas Course Exports/tek100-202-collab-intelligence-using-modern-ai-spring-2026-export.imscc'

const buf = readFileSync(IMSCC_PATH)
const zip = await JSZip.loadAsync(buf)

// 1. Course settings
const settingsFile = zip.file('course_settings/course_settings.xml')
if (settingsFile) {
  const settingsXml = await settingsFile.async('string')
  console.log('Course title:', xmlText(settingsXml, 'title'))
  console.log('Course code:', xmlText(settingsXml, 'course_code'))
} else {
  console.log('⚠ No course_settings.xml — falling back to manifest/context')
  const contextFile = zip.file('course_settings/context.xml')
  if (contextFile) {
    const contextXml = await contextFile.async('string')
    console.log('Course name (context.xml):', xmlText(contextXml, 'course_name'))
    console.log('Course ID:', xmlText(contextXml, 'course_id'))
  }
  const manifestXml2 = await zip.file('imsmanifest.xml').async('string')
  const mTitle = manifestXml2.match(/<lomimscc:string>([^<]+)/i)
  if (mTitle) console.log('Manifest title:', mTitle[1])
}

// 2. Modules
const moduleXml = await zip.file('course_settings/module_meta.xml').async('string')
const modules = xmlAll(moduleXml, 'module')
console.log(`\nModules found: ${modules.length}`)

let totalItems = 0
let totalPrereqs = 0
for (const mod of modules) {
  const title = xmlText(mod, 'title')
  const position = xmlText(mod, 'position')
  const state = xmlText(mod, 'workflow_state')
  const items = xmlAll(mod, 'item')
  const prereqs = xmlAll(mod, 'prerequisite')
  totalItems += items.length
  totalPrereqs += prereqs.length

  const contentTypes = {}
  for (const item of items) {
    const ct = xmlText(item, 'content_type')
    contentTypes[ct] = (contentTypes[ct] || 0) + 1
  }

  console.log(`  [${position}] ${title} (${state}) — ${items.length} items, ${prereqs.length} prereqs`)
  console.log(`      Types: ${JSON.stringify(contentTypes)}`)
}
console.log(`\nTotal items: ${totalItems}, total prerequisite edges: ${totalPrereqs}`)

// 3. Assignments
const assignmentFiles = zip.file(/\/assignment_settings\.xml$/)
console.log(`\nAssignment files: ${assignmentFiles.length}`)

let sampleAssignment = null
if (assignmentFiles.length > 0) {
  const xml = await assignmentFiles[0].async('string')
  sampleAssignment = {
    title: xmlText(xml, 'title'),
    dueAt: xmlText(xml, 'due_at'),
    points: xmlText(xml, 'points_possible'),
    gradingType: xmlText(xml, 'grading_type'),
  }
  console.log(`  Sample: ${JSON.stringify(sampleAssignment)}`)
}

// 4. Wiki pages
const wikiFiles = zip.file(/^wiki_content\/.*\.html$/)
console.log(`\nWiki pages: ${wikiFiles.length}`)

// 4b. QTI Assessments
const assessmentFiles = zip.file(/assessment_meta\.xml$/)
console.log(`QTI Assessments: ${assessmentFiles.length}`)
for (const af of assessmentFiles) {
  const axml = await af.async('string')
  console.log(`  Assessment: ${xmlText(axml, 'title')} (${xmlText(axml, 'points_possible') || '?'} pts)`)
}

// 5. Objective extraction test (improved algorithm)
const sampleWiki = zip.file('wiki_content/start-here-module-1-task-list.html')
if (!sampleWiki) {
  console.log('\n⚠ No wiki pages to test objective extraction')
  console.log('\n✅ Parser validation complete')
  process.exit(0)
}
const sampleHtml = await sampleWiki.async('string')
const markers = [
  /learning\s+objectives?\s*:?/gi,
  /you\s+will\s+be\s+able\s+to\s*:?/gi,
  /by\s+the\s+end\s+of\s+this\s+(?:module|week|unit)/gi,
]
const positions = new Set()
for (const re of markers) {
  let m
  while ((m = re.exec(sampleHtml)) !== null) positions.add(m.index)
}
let objCount = 0
for (const pos of positions) {
  const window = sampleHtml.slice(pos, pos + 2000)
  const olMatch = window.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i)
  if (!olMatch) continue
  const items = olMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
  for (const item of items) {
    const text = stripHtml(item).trim()
    if (text.length > 5 && text.length < 500) {
      objCount++
      if (objCount <= 3) console.log(`  Objective ${objCount}: ${text.slice(0, 100)}...`)
    }
  }
}
console.log(`\nObjectives from Module 1 task list: ${objCount}`)

console.log('\n✅ Parser validation complete')
