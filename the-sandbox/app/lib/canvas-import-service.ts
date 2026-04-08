/**
 * Canvas Course Import Service
 *
 * Parses IMS Common Cartridge (.imscc) exports from Canvas LMS and creates
 * a fully-mapped course with weeks, materials, assignments, objectives,
 * and a CourseMap graph with prerequisite edges.
 *
 * The .imscc format is a ZIP containing:
 * - imsmanifest.xml — course structure (modules, items, hierarchy)
 * - course_settings/module_meta.xml — module metadata (positions, prerequisites, content types)
 * - course_settings/course_settings.xml — course title, code, etc.
 * - course_settings/assignment_groups.xml — grading categories
 * - course_settings/syllabus.html — syllabus page content
 * - course_settings/grading_standards.xml — grading scales
 * - course_settings/late_policy.xml — late submission policies
 * - g<hash>/assignment_settings.xml — per-assignment settings (due dates, points, etc.)
 * - g<hash>/<slug>.html — assignment description HTML
 * - wiki_content/<slug>.html — wiki page content
 * - web_resources/ — uploaded files (images, PDFs, videos)
 */

import JSZip from 'jszip'
import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { join, resolve, sep } from 'path'
import { tmpdir } from 'os'
import { prisma } from './prisma'
import type { User } from '../generated/prisma'
import { buildCourseMaterialGovernanceDefaults } from './content-permissions'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parsed module item from Canvas */
interface CanvasModuleItem {
  identifier: string
  title: string
  contentType: 'WikiPage' | 'Assignment' | 'DiscussionTopic' | 'ExternalUrl' | 'ContextModuleSubHeader' | 'Attachment' | 'Quizzes::Quiz' | string
  identifierref?: string
  url?: string
  position: number
  indent: number
  htmlContent?: string // resolved content from wiki or assignment HTML
}

/** Parsed module from Canvas */
interface CanvasModule {
  identifier: string
  title: string
  position: number
  workflowState: string
  unlockAt?: string
  requireSequentialProgress: boolean
  prerequisiteIdentifiers: string[]
  items: CanvasModuleItem[]
}

/** Parsed assignment settings */
interface CanvasAssignment {
  identifier: string
  title: string
  dueAt?: string
  pointsPossible: number
  gradingType: string
  submissionTypes: string
  description?: string
  assignmentGroupRef?: string
}

/** Parsed course metadata */
interface CanvasCourseSettings {
  title: string
  courseCode: string
  isPublic: boolean
}

/** Result of a Canvas import */
export interface CanvasImportResult {
  courseId: string
  courseCode: string
  title: string
  modulesImported: number
  materialsCreated: number
  assignmentsCreated: number
  objectivesExtracted: number
  courseMapCreated: boolean
}

// ── XML Helpers ────────────────────────────────────────────────────────────────

/** Extract text content of a tag. Handles namespaced and non-namespaced tags. */
function xmlText(xml: string, tag: string): string {
  // Try with and without namespace prefixes
  const patterns = [
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
    new RegExp(`<[^:]+:${tag}[^>]*>([\\s\\S]*?)</[^:]+:${tag}>`, 'i'),
  ]
  for (const re of patterns) {
    const m = xml.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

/** Extract an attribute value from an XML element string. */
function xmlAttr(elementXml: string, attr: string): string {
  const m = elementXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

/** Extract all occurrences of a top-level tag, returning their full XML. */
function xmlAll(xml: string, tag: string): string[] {
  const results: string[] = []
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi')
  let m
  while ((m = re.exec(xml)) !== null) {
    results.push(m[0])
  }
  return results
}

/** Strip HTML tags and decode basic entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract learning objectives from HTML content (looks for ordered lists after objective keywords). */
function extractObjectives(html: string): string[] {
  const objectives: string[] = []

  // Strategy: find "Learning Objectives" or "you will be able to" marker,
  // then grab the nearest <ol> that follows within ~2000 chars.
  const markers = [
    /learning\s+objectives?\s*:?/gi,
    /you\s+will\s+be\s+able\s+to\s*:?/gi,
    /by\s+the\s+end\s+of\s+this\s+(?:module|week|unit)/gi,
  ]

  const markerPositions = new Set<number>()
  for (const re of markers) {
    let m
    while ((m = re.exec(html)) !== null) {
      markerPositions.add(m.index)
    }
  }

  for (const pos of markerPositions) {
    // Look for the next <ol> after the marker within 2000 chars
    const searchWindow = html.slice(pos, pos + 2000)
    const olMatch = searchWindow.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i)
    if (!olMatch) continue

    const listHtml = olMatch[1]
    const items = listHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
    for (const item of items) {
      const text = stripHtml(item).trim()
      if (text.length > 5 && text.length < 500) {
        // Avoid duplicates
        if (!objectives.includes(text)) {
          objectives.push(text)
        }
      }
    }
  }

  return objectives
}

// ── Parser ─────────────────────────────────────────────────────────────────────

/** Parse course settings from course_settings.xml */
function parseCourseSettings(xml: string): CanvasCourseSettings {
  return {
    title: xmlText(xml, 'title'),
    courseCode: xmlText(xml, 'course_code'),
    isPublic: xmlText(xml, 'is_public') === 'true',
  }
}

/** Parse modules from module_meta.xml */
function parseModules(xml: string): CanvasModule[] {
  const modules: CanvasModule[] = []
  const moduleBlocks = xmlAll(xml, 'module')

  for (const block of moduleBlocks) {
    const identifier = xmlAttr(block, 'identifier')
    const title = xmlText(block, 'title')
    const position = parseInt(xmlText(block, 'position') || '0', 10)
    const workflowState = xmlText(block, 'workflow_state')
    const unlockAt = xmlText(block, 'unlock_at') || undefined
    const requireSequentialProgress = xmlText(block, 'require_sequential_progress') === 'true'

    // Parse prerequisites
    const prereqIdentifiers: string[] = []
    const prereqBlocks = xmlAll(block, 'prerequisite')
    for (const pblock of prereqBlocks) {
      const ref = xmlText(pblock, 'identifierref')
      if (ref) prereqIdentifiers.push(ref)
    }

    // Parse items
    const items: CanvasModuleItem[] = []
    const itemBlocks = xmlAll(block, 'item')
    for (const iblock of itemBlocks) {
      const itemId = xmlAttr(iblock, 'identifier')
      const itemTitle = xmlText(iblock, 'title')
      const contentType = xmlText(iblock, 'content_type')
      const identifierref = xmlText(iblock, 'identifierref') || undefined
      const url = xmlText(iblock, 'url') || undefined
      const itemPosition = parseInt(xmlText(iblock, 'position') || '0', 10)
      const indent = parseInt(xmlText(iblock, 'indent') || '0', 10)

      items.push({
        identifier: itemId,
        title: itemTitle,
        contentType,
        identifierref,
        url,
        position: itemPosition,
        indent,
      })
    }

    // Sort items by position
    items.sort((a, b) => a.position - b.position)

    modules.push({
      identifier,
      title,
      position,
      workflowState,
      unlockAt,
      requireSequentialProgress,
      prerequisiteIdentifiers: prereqIdentifiers,
      items,
    })
  }

  // Sort modules by position
  modules.sort((a, b) => a.position - b.position)
  return modules
}

/** Parse assignment settings from individual assignment_settings.xml files */
function parseAssignmentSettings(xml: string): CanvasAssignment {
  return {
    identifier: xmlAttr(xml, 'identifier'),
    title: xmlText(xml, 'title'),
    dueAt: xmlText(xml, 'due_at') || undefined,
    pointsPossible: parseFloat(xmlText(xml, 'points_possible') || '0'),
    gradingType: xmlText(xml, 'grading_type') || 'points',
    submissionTypes: xmlText(xml, 'submission_types') || '',
    assignmentGroupRef: xmlText(xml, 'assignment_group_identifierref') || undefined,
  }
}

/** Map Canvas content type to our materialType */
function mapMaterialType(contentType: string): string {
  switch (contentType) {
    case 'WikiPage': return 'lecture'
    case 'DiscussionTopic': return 'discussion'
    case 'Assignment': return 'assignment'
    case 'ExternalUrl': return 'resource'
    case 'Attachment': return 'resource'
    case 'Quizzes::Quiz': return 'quiz'
    default: return 'lecture'
  }
}

/** Map Canvas content type to our assignment category */
function mapAssignmentCategory(contentType: string, title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('lab')) return 'lab'
  if (lower.includes('discussion')) return 'discussion'
  if (lower.includes('quiz')) return 'quiz'
  if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final exam')) return 'exam'
  if (lower.includes('project') || lower.includes('proposal')) return 'project'
  if (lower.includes('presentation')) return 'presentation'
  if (lower.includes('paper') || lower.includes('essay')) return 'paper'
  if (contentType === 'DiscussionTopic') return 'discussion'
  return 'homework'
}

/** Map Canvas unit type based on module title */
function inferUnitType(title: string): 'LECTURE' | 'LAB' | 'EXAM' | 'QUIZ' | 'ASSIGNMENT' | 'DISCUSSION' | 'OTHER' {
  const lower = title.toLowerCase()
  if (lower.includes('final project') || lower.includes('final exam')) return 'EXAM'
  if (lower.includes('lab')) return 'LAB'
  if (lower.includes('quiz')) return 'QUIZ'
  if (lower.includes('getting started') || lower.includes('orientation')) return 'OTHER'
  return 'LECTURE'
}

// ── Zip Reader Abstraction ──────────────────────────────────────────────────────

/**
 * Unified interface for reading files from a ZIP archive.
 * Uses JSZip for small files (<2 GB) and Python subprocess for large files.
 */
interface ZipReader {
  /** Read a single file by exact path, or null if it doesn't exist. */
  readFile(path: string): Promise<string | null>
  /** Find all files matching a regex pattern. Returns their paths. */
  findFiles(pattern: RegExp): string[]
  /** Read multiple files by their paths. */
  readFiles(paths: string[]): Promise<Map<string, string>>
  /** Clean up any temp files. */
  cleanup(): void
}

/** JSZip-based reader for files <2 GB */
async function createJSZipReader(fileBuffer: Buffer | ArrayBuffer): Promise<ZipReader> {
  const zip = await JSZip.loadAsync(fileBuffer)
  const allPaths: string[] = []
  zip.forEach((path) => allPaths.push(path))

  return {
    async readFile(path: string): Promise<string | null> {
      const entry = zip.file(path)
      if (!entry) return null
      return entry.async('string')
    },
    findFiles(pattern: RegExp): string[] {
      return allPaths.filter((p) => pattern.test(p))
    },
    async readFiles(paths: string[]): Promise<Map<string, string>> {
      const result = new Map<string, string>()
      for (const p of paths) {
        const entry = zip.file(p)
        if (entry) {
          result.set(p, await entry.async('string'))
        }
      }
      return result
    },
    cleanup() { /* no-op */ },
  }
}

/**
 * Python-based reader for files >2 GB.
 * Writes the file to disk, then uses Python's zipfile to extract only metadata
 * (XML, HTML, JSON, TXT files — skips all media/binary content).
 */
async function createLargeFileReader(fileBuffer: Buffer | ArrayBuffer): Promise<ZipReader> {
  const tempDir = mkdtempSync(join(tmpdir(), 'canvas-import-'))
  const zipPath = join(tempDir, 'export.imscc')
  const extractDir = join(tempDir, 'extracted')

  // Write the buffer to disk
  const buf = fileBuffer instanceof ArrayBuffer ? Buffer.from(fileBuffer) : fileBuffer
  writeFileSync(zipPath, buf)

  // Use Python to extract only metadata files (XML, HTML, JSON, TXT)
  const pythonScript = `
import zipfile, os, sys, json

zip_path = sys.argv[1]
out_dir = sys.argv[2]

z = zipfile.ZipFile(zip_path)
extracted = []
for info in z.infolist():
    if info.is_dir():
        continue
    ext = info.filename.rsplit('.', 1)[-1].lower() if '.' in info.filename else ''
    if ext in ('xml', 'html', 'json', 'txt'):
        # Extract to output directory preserving structure
        target = os.path.join(out_dir, info.filename)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as f:
            f.write(z.read(info.filename))
        extracted.append(info.filename)

print(json.dumps(extracted))
`

  const scriptPath = join(tempDir, 'extract.py')
  writeFileSync(scriptPath, pythonScript)

  let extractedPaths: string[]
  try {
    const result = execFileSync('python3', [scriptPath, zipPath, extractDir], {
      encoding: 'utf-8',
      timeout: 120_000, // 2 minutes max
      maxBuffer: 10 * 1024 * 1024,
    })
    extractedPaths = JSON.parse(result.trim())
  } catch {
    // Fallback: try 'python' instead of 'python3' (Windows)
    try {
      const result = execFileSync('python', [scriptPath, zipPath, extractDir], {
        encoding: 'utf-8',
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      })
      extractedPaths = JSON.parse(result.trim())
    } catch {
      rmSync(tempDir, { recursive: true, force: true })
      throw new Error(
        'Cannot process large Canvas exports: Python is required but was not found. ' +
        'Please install Python 3 or re-export from Canvas without "Course Files".'
      )
    }
  }

  // Delete the large zip immediately — we only need the extracted metadata
  try { rmSync(zipPath, { force: true }) } catch { /* ignore */ }

  return {
    async readFile(path: string): Promise<string | null> {
      const filePath = resolve(extractDir, path)
      if (!filePath.startsWith(resolve(extractDir) + sep)) {
        throw new Error('Path traversal detected')
      }
      if (!existsSync(filePath)) return null
      return readFileSync(filePath, 'utf-8')
    },
    findFiles(pattern: RegExp): string[] {
      return extractedPaths.filter((p) => pattern.test(p))
    },
    async readFiles(paths: string[]): Promise<Map<string, string>> {
      const result = new Map<string, string>()
      for (const p of paths) {
        const filePath = resolve(extractDir, p)
        if (!filePath.startsWith(resolve(extractDir) + sep)) {
          throw new Error('Path traversal detected')
        }
        if (existsSync(filePath)) {
          result.set(p, readFileSync(filePath, 'utf-8'))
        }
      }
      return result
    },
    cleanup() {
      try { rmSync(tempDir, { recursive: true, force: true }) } catch { /* ignore */ }
    },
  }
}

// ── Main Import Function ───────────────────────────────────────────────────────

/**
 * Import a Canvas .imscc export and create a fully-mapped course.
 *
 * @param fileBuffer - Raw bytes of the .imscc file
 * @param instructor - The educator creating the course
 * @param overrides - Optional overrides for course code/title
 */
export async function importCanvasCourse(
  fileBuffer: Buffer | ArrayBuffer,
  instructor: User,
  overrides?: { courseCode?: string; title?: string; semester?: string },
): Promise<CanvasImportResult> {
  // ── 1. Open the ZIP ────────────────────────────────────────────────────────
  const sizeBytes = fileBuffer instanceof ArrayBuffer ? fileBuffer.byteLength : fileBuffer.length
  const isLargeFile = sizeBytes > 2 * 1024 * 1024 * 1024 // >2 GB

  let reader: ZipReader
  if (isLargeFile) {
    // Large file: extract only metadata via Python subprocess
    reader = await createLargeFileReader(fileBuffer)
  } else {
    reader = await createJSZipReader(fileBuffer)
  }

  try {

  // ── 2. Parse course settings ─────────────────────────────────────────────────
  const courseSettingsXml = await reader.readFile('course_settings/course_settings.xml')
  let settings: CanvasCourseSettings

  if (courseSettingsXml) {
    settings = parseCourseSettings(courseSettingsXml)
  } else {
    // Fallback: extract title from imsmanifest.xml or context.xml
    const manifestXmlFallback = await reader.readFile('imsmanifest.xml') || ''
    const contextXml = await reader.readFile('course_settings/context.xml') || ''

    const manifestTitle = xmlText(manifestXmlFallback, 'string') || xmlText(manifestXmlFallback, 'lomimscc:string')
    const contextTitle = xmlText(contextXml, 'course_name')
    const contextId = xmlText(contextXml, 'course_id')

    // Extract course code from title (e.g. "MD839-001: Entrustment..." → "MD839-001")
    const titleStr = contextTitle || manifestTitle || 'Imported Course'
    const codeMatch = titleStr.match(/^([A-Z]{2,6}\d{2,4}(?:-\d{1,3})?)/i)

    settings = {
      title: titleStr,
      courseCode: codeMatch ? codeMatch[1].toUpperCase() : `IMPORT-${contextId || Date.now()}`,
      isPublic: true,
    }
  }

  // ── 3. Parse modules ─────────────────────────────────────────────────────────
  const moduleMetaXml = await reader.readFile('course_settings/module_meta.xml') || ''
  const modules = parseModules(moduleMetaXml)

  // ── 4. Load all assignment settings ──────────────────────────────────────────
  const assignmentMap = new Map<string, CanvasAssignment>()
  const assignmentFilePaths = reader.findFiles(/\/assignment_settings\.xml$/)
  const assignmentFileContents = await reader.readFiles(assignmentFilePaths)

  for (const [filePath, xml] of assignmentFileContents) {
    const assignment = parseAssignmentSettings(xml)
    if (assignment.identifier) {
      assignmentMap.set(assignment.identifier, assignment)
    }
    // Also index by parent directory identifier
    const dirMatch = filePath.match(/^(g[a-f0-9]+)\//)
    if (dirMatch) {
      assignmentMap.set(dirMatch[1], assignment)
    }
  }

  // ── 5. Load HTML content (wiki pages + assignment descriptions) ──────────────
  const htmlContentMap = new Map<string, string>()

  // Wiki pages
  const wikiFilePaths = reader.findFiles(/^wiki_content\/.*\.html$/)
  const wikiFileContents = await reader.readFiles(wikiFilePaths)
  for (const [filePath, html] of wikiFileContents) {
    // Extract identifier from meta tag
    const idMatch = html.match(/<meta\s+name="identifier"\s+content="([^"]+)"/)
    if (idMatch) {
      htmlContentMap.set(idMatch[1], html)
    }
    // Also store by filename slug for fallback matching
    const slug = filePath.replace('wiki_content/', '').replace('.html', '')
    htmlContentMap.set(`wiki:${slug}`, html)
  }

  // Assignment HTML: g<hash>/<slug>.html
  const assignmentHtmlPaths = reader.findFiles(/^g[a-f0-9]+\/[^/]+\.html$/)
  const assignmentHtmlContents = await reader.readFiles(assignmentHtmlPaths)
  for (const [filePath, html] of assignmentHtmlContents) {
    const dirMatch = filePath.match(/^(g[a-f0-9]+)\//)
    if (dirMatch) {
      htmlContentMap.set(dirMatch[1], html)
    }
  }

  // Also parse the imsmanifest to build identifierref → resource file mappings
  const manifestXml = await reader.readFile('imsmanifest.xml') || ''
  // Build a map of identifierref → resource identifier for wiki pages
  const resourceMap = new Map<string, string>()
  const resourceBlocks = manifestXml.match(/<resource[^>]*>/gi) || []
  for (const rblock of resourceBlocks) {
    const resId = xmlAttr(rblock, 'identifier')
    if (resId) {
      resourceMap.set(resId, resId)
    }
  }

  // ── 5b. Parse QTI assessments (quizzes) ────────────────────────────────────
  interface QtiAssessment {
    identifier: string
    title: string
    description: string
    pointsPossible: number
    questionCount: number
  }
  const qtiAssessments: QtiAssessment[] = []

  const assessmentMetaPaths = reader.findFiles(/assessment_meta\.xml$/)
  const assessmentMetaContents = await reader.readFiles(assessmentMetaPaths)
  for (const [filePath, xml] of assessmentMetaContents) {
    const identifier = xmlAttr(xml, 'identifier')
    const title = xmlText(xml, 'title')
    const descHtml = xmlText(xml, 'description')
    const pointsStr = xmlText(xml, 'points_possible')

    // Count questions from the QTI file
    const dirMatch = filePath.match(/^(g[a-f0-9]+)\//)
    let questionCount = 0
    if (dirMatch) {
      const qtiXml = await reader.readFile(`${dirMatch[1]}/assessment_qti.xml`)
      if (qtiXml) {
        questionCount = (qtiXml.match(/<item\s/gi) || []).length
      }
    }

    qtiAssessments.push({
      identifier,
      title,
      description: descHtml ? stripHtml(descHtml).slice(0, 3000) : title,
      pointsPossible: parseFloat(pointsStr || '0'),
      questionCount,
    })
  }

  // ── 6. Resolve content for each module item ──────────────────────────────────
  for (const mod of modules) {
    for (const item of mod.items) {
      if (!item.identifierref) continue

      const ref = item.identifierref
      if (item.contentType === 'Assignment' && htmlContentMap.has(ref)) {
        item.htmlContent = htmlContentMap.get(ref)
      }
      if (item.contentType === 'WikiPage') {
        if (htmlContentMap.has(ref)) {
          item.htmlContent = htmlContentMap.get(ref)
        }
      }
    }
  }

  // ── 7. Resolve course code (ensure uniqueness) ──────────────────────────────
  let courseCode = overrides?.courseCode || settings.courseCode || 'IMPORT-001'
  courseCode = courseCode.toUpperCase().replace(/[^A-Z0-9-]/g, '')

  // Check for existing course with this code and append suffix if needed
  let suffix = 0
  let finalCode = courseCode
  while (await prisma.course.findUnique({ where: { courseCode: finalCode } })) {
    suffix++
    finalCode = `${courseCode}-${suffix}`
  }
  courseCode = finalCode

  const courseTitle = overrides?.title || settings.title || 'Imported Course'
  const semester = overrides?.semester || extractSemester(settings.title)

  // ── 8. Create everything in a transaction ────────────────────────────────────
  let materialsCreated = 0
  let assignmentsCreated = 0
  let objectivesExtracted = 0
  const importedMaterialGovernance = buildCourseMaterialGovernanceDefaults({
    courseIsPublic: true,
    facultyAiRetrievalApproved: true,
    studentUploadsAllowed: false,
    uploaderId: instructor.id,
    uploaderRole: instructor.role,
    sourceSystem: 'canvas',
    provenanceType: 'official',
    approvalBasis: 'canvas_sync',
  })

  const course = await prisma.$transaction(async (tx) => {
    // Create the course
    const newCourse = await tx.course.create({
      data: {
        courseCode,
        title: courseTitle,
        description: `Imported from Canvas: ${settings.title}`,
        semester,
        importSource: 'canvas-export',
        instructorId: instructor.id,
        isPublic: true,
      },
    })

    // Create ChatGroup for the course (matches existing course creation pattern)
    const chatGroup = await tx.chatGroup.create({
      data: {
        name: courseTitle,
        type: 'COURSE',
        courseId: newCourse.id,
        createdById: instructor.id,
      },
    })
    await tx.chatChannel.createMany({
      data: [
        { groupId: chatGroup.id, name: 'general', type: 'GENERAL', createdById: instructor.id },
        { groupId: chatGroup.id, name: 'announcements', type: 'ANNOUNCEMENTS', createdById: instructor.id },
      ],
    })

    // Create CourseMap for the graph view
    const courseMap = await tx.courseMap.create({
      data: { courseId: newCourse.id },
    })

    // Track module identifier → week/unit IDs for prerequisite edges
    const moduleIdToWeekId = new Map<string, string>()
    const moduleIdToUnitId = new Map<string, string>()
    const unitNodeIds = new Map<string, string>() // unitId → nodeId

    // ── Create weeks, materials, assignments, objectives per module ─────────
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i]
      // Import both active and unpublished modules (faculty importing full course)
      if (mod.workflowState !== 'active' && mod.workflowState !== 'unpublished') continue

      // Create CourseWeek
      const week = await tx.courseWeek.create({
        data: {
          courseId: newCourse.id,
          weekNumber: i + 1,
          title: mod.title,
          topic: mod.title,
          orderIndex: i,
          startDate: mod.unlockAt ? new Date(mod.unlockAt) : undefined,
        },
      })
      moduleIdToWeekId.set(mod.identifier, week.id)

      // Create CourseUnit (for graph view)
      const unit = await tx.courseUnit.create({
        data: {
          courseMapId: courseMap.id,
          label: mod.title,
          unitType: inferUnitType(mod.title),
          position: i,
          startDate: mod.unlockAt ? new Date(mod.unlockAt) : undefined,
        },
      })
      moduleIdToUnitId.set(mod.identifier, unit.id)

      // Create MapNode for this unit
      const node = await tx.mapNode.create({
        data: {
          courseMapId: courseMap.id,
          courseUnitId: unit.id,
          label: mod.title,
          nodeType: 'UNIT',
          xPos: 200,
          yPos: 100 + i * 150,
        },
      })
      unitNodeIds.set(unit.id, node.id)

      // Process items within this module
      for (const item of mod.items) {
        // Skip sub-headers
        if (item.contentType === 'ContextModuleSubHeader') continue

        // Build content from HTML or fallback to title
        let content = item.title
        if (item.htmlContent) {
          content = stripHtml(item.htmlContent).slice(0, 5000)
        }

        // Create CourseMaterial for every content item
        if (item.contentType === 'WikiPage' || item.contentType === 'ExternalUrl' || item.contentType === 'Attachment') {
          await tx.courseMaterial.create({
            data: {
              courseId: newCourse.id,
              weekId: week.id,
              title: item.title,
              content: content || item.title,
              materialType: mapMaterialType(item.contentType),
              moduleNumber: i + 1,
              isVisible: true,
              ...importedMaterialGovernance,
            },
          })
          materialsCreated++
        }

        // Create Assignment for assignment-type items
        if (item.contentType === 'Assignment') {
          const assignmentSettings = assignmentMap.get(item.identifierref || '')
          const dueAt = assignmentSettings?.dueAt ? new Date(assignmentSettings.dueAt) : undefined
          const points = assignmentSettings?.pointsPossible ?? 1

          await tx.assignment.create({
            data: {
              courseId: newCourse.id,
              weekId: week.id,
              title: item.title,
              description: item.htmlContent ? stripHtml(item.htmlContent).slice(0, 3000) : item.title,
              type: 'LEGACY_SUBMISSION',
              dueAt: dueAt && !isNaN(dueAt.getTime()) ? dueAt : undefined,
              pointsPossible: points,
              category: mapAssignmentCategory(item.contentType, item.title),
              isPublished: true,
            },
          })
          assignmentsCreated++
        }

        // Create Discussion-type assignments
        if (item.contentType === 'DiscussionTopic') {
          await tx.courseMaterial.create({
            data: {
              courseId: newCourse.id,
              weekId: week.id,
              title: item.title,
              content: content || item.title,
              materialType: 'discussion',
              moduleNumber: i + 1,
              isVisible: true,
              ...importedMaterialGovernance,
            },
          })
          materialsCreated++
        }

        // Extract learning objectives from wiki page content
        if (item.htmlContent) {
          const objectives = extractObjectives(item.htmlContent)
          for (const obj of objectives) {
            await tx.learningObjective.create({
              data: {
                courseId: newCourse.id,
                weekId: week.id,
                title: obj.length > 200 ? obj.slice(0, 200) + '…' : obj,
                description: obj,
                source: 'explicit',
                moduleNumber: i + 1,
                orderIndex: objectivesExtracted,
              },
            })
            objectivesExtracted++
          }
        }
      }

      // Create CourseModule sub-items within the CourseUnit
      const contentItems = mod.items.filter(
        (it) => it.contentType !== 'ContextModuleSubHeader',
      )
      if (contentItems.length > 0) {
        const courseModule = await tx.courseModule.create({
          data: {
            courseUnitId: unit.id,
            label: 'Content',
            description: `${contentItems.length} items imported from Canvas`,
          },
        })

        // Create lesson items for each content piece
        for (const item of contentItems) {
          const assignmentSettings = item.contentType === 'Assignment'
            ? assignmentMap.get(item.identifierref || '')
            : undefined
          const dueDate = assignmentSettings?.dueAt
            ? new Date(assignmentSettings.dueAt)
            : undefined

          await tx.courseLessonItem.create({
            data: {
              courseModuleId: courseModule.id,
              label: item.title,
              rawSourceText: item.htmlContent ? stripHtml(item.htmlContent).slice(0, 2000) : undefined,
              dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : undefined,
            },
          })
        }
      }
    }

    // ── Create QTI assessments (quizzes not inside modules) ────────────────────
    if (qtiAssessments.length > 0) {
      // If no modules exist, create a single "Assessments" week/unit
      const needsContainer = modules.filter(
        (m) => m.workflowState === 'active' || m.workflowState === 'unpublished',
      ).length === 0

      let assessWeekId: string | undefined
      if (needsContainer) {
        const assessWeek = await tx.courseWeek.create({
          data: {
            courseId: newCourse.id,
            weekNumber: 1,
            title: 'Assessments',
            topic: 'Course Assessments',
            orderIndex: 0,
          },
        })
        assessWeekId = assessWeek.id

        const assessUnit = await tx.courseUnit.create({
          data: {
            courseMapId: courseMap.id,
            label: 'Assessments',
            unitType: 'QUIZ',
            position: 0,
          },
        })

        await tx.mapNode.create({
          data: {
            courseMapId: courseMap.id,
            courseUnitId: assessUnit.id,
            label: 'Assessments',
            nodeType: 'UNIT',
            xPos: 200,
            yPos: 100,
          },
        })
      }

      for (const qti of qtiAssessments) {
        await tx.assignment.create({
          data: {
            courseId: newCourse.id,
            weekId: assessWeekId,
            title: qti.title,
            description: qti.description,
            type: 'LEGACY_SUBMISSION',
            pointsPossible: qti.pointsPossible || 1,
            category: 'quiz',
            isPublished: true,
          },
        })
        assignmentsCreated++

        // Also create a material for the assessment description
        if (qti.description && qti.description !== qti.title) {
          await tx.courseMaterial.create({
            data: {
              courseId: newCourse.id,
              weekId: assessWeekId,
              title: qti.title,
              content: qti.description,
              materialType: 'quiz',
              moduleNumber: 1,
              isVisible: true,
              ...importedMaterialGovernance,
            },
          })
          materialsCreated++
        }
      }
    }

    // ── Create prerequisite edges ──────────────────────────────────────────────
    for (const mod of modules) {
      if (mod.workflowState !== 'active' && mod.workflowState !== 'unpublished') continue
      const toUnitId = moduleIdToUnitId.get(mod.identifier)
      if (!toUnitId) continue
      const toNodeId = unitNodeIds.get(toUnitId)
      if (!toNodeId) continue

      for (const prereqId of mod.prerequisiteIdentifiers) {
        const fromUnitId = moduleIdToUnitId.get(prereqId)
        if (!fromUnitId) continue
        const fromNodeId = unitNodeIds.get(fromUnitId)
        if (!fromNodeId) continue

        await tx.mapEdge.create({
          data: {
            courseMapId: courseMap.id,
            fromNodeId,
            toNodeId,
            edgeType: 'PREREQUISITE',
          },
        })
      }

      // Also create sequence edges between consecutive modules
      const prevModIndex = modules.findIndex((m) => m.identifier === mod.identifier) - 1
      if (prevModIndex >= 0) {
        const prevMod = modules[prevModIndex]
        if (prevMod.workflowState === 'active') {
          const prevUnitId = moduleIdToUnitId.get(prevMod.identifier)
          if (prevUnitId) {
            const prevNodeId = unitNodeIds.get(prevUnitId)
            if (prevNodeId && prevNodeId !== toNodeId) {
              // Only create sequence edge if there isn't already a prerequisite edge
              const hasPrereq = mod.prerequisiteIdentifiers.includes(prevMod.identifier)
              if (!hasPrereq) {
                await tx.mapEdge.create({
                  data: {
                    courseMapId: courseMap.id,
                    fromNodeId: prevNodeId,
                    toNodeId,
                    edgeType: 'SEQUENCE',
                  },
                })
              }
            }
          }
        }
      }
    }

    // ── Create CourseWeekPrerequisites ──────────────────────────────────────────
    for (const mod of modules) {
      if (mod.workflowState !== 'active' && mod.workflowState !== 'unpublished') continue
      const weekId = moduleIdToWeekId.get(mod.identifier)
      if (!weekId) continue

      for (const prereqId of mod.prerequisiteIdentifiers) {
        const prereqWeekId = moduleIdToWeekId.get(prereqId)
        if (!prereqWeekId) continue

        await tx.courseWeekPrerequisite.create({
          data: {
            weekId,
            prerequisiteWeekId: prereqWeekId,
          },
        })
      }
    }

    return newCourse
  })

  return {
    courseId: course.id,
    courseCode,
    title: courseTitle,
    modulesImported: modules.filter((m) => m.workflowState === 'active' || m.workflowState === 'unpublished').length,
    materialsCreated,
    assignmentsCreated,
    objectivesExtracted,
    courseMapCreated: true,
  }

  } finally {
    reader.cleanup()
  }
}

/** Extract semester from course title (e.g. "TEK100-202: ... (Spring 2026)") */
function extractSemester(title: string): string | undefined {
  const match = title.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i)
  return match ? `${match[1]} ${match[2]}` : undefined
}
