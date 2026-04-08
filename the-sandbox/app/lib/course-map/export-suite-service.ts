// ── Export Suite Service ─────────────────────────────────────────────────────
// Multi-format course map export: PDF data, slide deck data, CSV, shareable links.
// All functions produce client-side data structures; actual file generation
// uses browser APIs (jsPDF, FileSaver, etc.) or placeholder stubs.

// ── Types ────────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  label: string
  nodeType: string
  courseUnitId: string | null
  xPos?: number
  yPos?: number
  description?: string | null
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface CourseModule {
  label: string
  description?: string | null
  lessons: { label: string; description?: string | null }[]
}

interface CourseUnit {
  id: string
  label: string
  description: string | null
  modules: CourseModule[]
}

export interface GraphMap {
  id: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
}

export interface PdfExportOptions {
  includeDescriptions: boolean
  includePrerequisites: boolean
  pageSize: 'letter' | 'a4'
  orientation: 'portrait' | 'landscape'
}

export interface SlideExportOptions {
  includeDescriptions: boolean
  includeModuleDetails: boolean
}

export interface CsvRow {
  unit: string
  module: string
  lesson: string
  prerequisites: string
  nodeType: string
  dueDate: string
}

export interface PdfPage {
  type: 'cover' | 'toc' | 'content'
  title: string
  content: string[]
  nodes?: MapNode[]
  edges?: MapEdge[]
}

export interface SlideData {
  type: 'title' | 'unit' | 'summary'
  title: string
  subtitle?: string
  bullets: string[]
  noteCount?: number
}

export interface ShareableLinkData {
  url: string
  token: string
  expiresAt: string
  courseMapId: string
}

// ── PDF Export ───────────────────────────────────────────────────────────────

export function exportToPDF(
  graphMap: GraphMap,
  options: PdfExportOptions = { includeDescriptions: true, includePrerequisites: true, pageSize: 'letter', orientation: 'landscape' },
): PdfPage[] {
  const pages: PdfPage[] = []

  // Cover page
  pages.push({
    type: 'cover',
    title: graphMap.courseTitle || 'Course Map',
    content: [
      `Course: ${graphMap.courseCode || 'N/A'}`,
      `Nodes: ${graphMap.nodes.length}`,
      `Units: ${graphMap.units.length}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Page size: ${options.pageSize.toUpperCase()}, ${options.orientation}`,
    ],
  })

  // Table of contents
  const tocEntries = graphMap.units.map((u, i) => `${i + 1}. ${u.label} (${u.modules.length} modules)`)
  pages.push({
    type: 'toc',
    title: 'Table of Contents',
    content: tocEntries,
  })

  // Build prerequisite lookup
  const prereqMap = new Map<string, string[]>()
  if (options.includePrerequisites) {
    const nodeLabels = new Map(graphMap.nodes.map((n) => [n.id, n.label]))
    for (const edge of graphMap.edges) {
      if (edge.edgeType === 'PREREQUISITE') {
        const existing = prereqMap.get(edge.toNodeId) || []
        existing.push(nodeLabels.get(edge.fromNodeId) || edge.fromNodeId)
        prereqMap.set(edge.toNodeId, existing)
      }
    }
  }

  // One page per unit
  for (const unit of graphMap.units) {
    const unitNodes = graphMap.nodes.filter((n) => n.courseUnitId === unit.id)
    const content: string[] = []

    if (options.includeDescriptions && unit.description) {
      content.push(unit.description)
    }

    for (const mod of unit.modules) {
      content.push(`Module: ${mod.label}`)
      if (options.includeDescriptions && mod.description) {
        content.push(`  ${mod.description}`)
      }
      for (const lesson of mod.lessons) {
        content.push(`  - ${lesson.label}`)
      }
    }

    if (options.includePrerequisites) {
      for (const node of unitNodes) {
        const prereqs = prereqMap.get(node.id)
        if (prereqs && prereqs.length > 0) {
          content.push(`Prerequisites for "${node.label}": ${prereqs.join(', ')}`)
        }
      }
    }

    pages.push({
      type: 'content',
      title: unit.label,
      content,
      nodes: unitNodes,
      edges: graphMap.edges.filter(
        (e) => unitNodes.some((n) => n.id === e.fromNodeId || n.id === e.toNodeId),
      ),
    })
  }

  return pages
}

// ── Slides Export ────────────────────────────────────────────────────────────

export function exportToSlides(
  graphMap: GraphMap,
  options: SlideExportOptions = { includeDescriptions: true, includeModuleDetails: true },
): SlideData[] {
  const slides: SlideData[] = []

  // Title slide
  slides.push({
    type: 'title',
    title: graphMap.courseTitle || 'Course Map',
    subtitle: graphMap.courseCode || undefined,
    bullets: [
      `${graphMap.units.length} units`,
      `${graphMap.nodes.length} nodes`,
      `${graphMap.edges.length} connections`,
    ],
  })

  // One slide per unit
  for (const unit of graphMap.units) {
    const bullets: string[] = []

    if (options.includeDescriptions && unit.description) {
      bullets.push(unit.description)
    }

    for (const mod of unit.modules) {
      if (options.includeModuleDetails) {
        bullets.push(`${mod.label} (${mod.lessons.length} lessons)`)
        for (const lesson of mod.lessons) {
          bullets.push(`  - ${lesson.label}`)
        }
      } else {
        bullets.push(mod.label)
      }
    }

    slides.push({
      type: 'unit',
      title: unit.label,
      bullets,
      noteCount: unit.modules.reduce((sum, m) => sum + m.lessons.length, 0),
    })
  }

  // Summary slide
  const totalModules = graphMap.units.reduce((sum, u) => sum + u.modules.length, 0)
  const totalLessons = graphMap.units.reduce(
    (sum, u) => sum + u.modules.reduce((s, m) => s + m.lessons.length, 0),
    0,
  )
  const prereqCount = graphMap.edges.filter((e) => e.edgeType === 'PREREQUISITE').length

  slides.push({
    type: 'summary',
    title: 'Summary',
    bullets: [
      `Total Units: ${graphMap.units.length}`,
      `Total Modules: ${totalModules}`,
      `Total Lessons: ${totalLessons}`,
      `Prerequisite Links: ${prereqCount}`,
      `Total Connections: ${graphMap.edges.length}`,
    ],
  })

  return slides
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(graphMap: GraphMap): string {
  const rows: CsvRow[] = []

  // Build prerequisite lookup
  const nodeLabels = new Map(graphMap.nodes.map((n) => [n.id, n.label]))
  const prereqMap = new Map<string, string[]>()
  for (const edge of graphMap.edges) {
    if (edge.edgeType === 'PREREQUISITE') {
      const existing = prereqMap.get(edge.toNodeId) || []
      existing.push(nodeLabels.get(edge.fromNodeId) || edge.fromNodeId)
      prereqMap.set(edge.toNodeId, existing)
    }
  }

  for (const unit of graphMap.units) {
    const unitNode = graphMap.nodes.find((n) => n.courseUnitId === unit.id)
    const unitPrereqs = unitNode ? (prereqMap.get(unitNode.id) || []).join('; ') : ''

    if (unit.modules.length === 0) {
      rows.push({
        unit: unit.label,
        module: '',
        lesson: '',
        prerequisites: unitPrereqs,
        nodeType: 'UNIT',
        dueDate: '',
      })
      continue
    }

    for (const mod of unit.modules) {
      if (mod.lessons.length === 0) {
        rows.push({
          unit: unit.label,
          module: mod.label,
          lesson: '',
          prerequisites: unitPrereqs,
          nodeType: 'MODULE',
          dueDate: '',
        })
        continue
      }

      for (const lesson of mod.lessons) {
        rows.push({
          unit: unit.label,
          module: mod.label,
          lesson: lesson.label,
          prerequisites: unitPrereqs,
          nodeType: 'LESSON',
          dueDate: '',
        })
      }
    }
  }

  // Build CSV string
  const headers = ['Unit', 'Module', 'Lesson', 'Prerequisites', 'Node Type', 'Due Date']
  const csvLines = [headers.join(',')]

  for (const row of rows) {
    csvLines.push(
      [row.unit, row.module, row.lesson, row.prerequisites, row.nodeType, row.dueDate]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    )
  }

  return csvLines.join('\n')
}

// ── Shareable Link ──────────────────────────────────────────────────────────

export async function generateShareableLink(
  courseMapId: string,
  userEmail: string,
): Promise<ShareableLinkData> {
  const res = await fetch('/api/course-map/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': userEmail,
    },
    body: JSON.stringify({ courseMapId }),
  })

  if (!res.ok) {
    // Fallback: generate a client-side token for demo purposes
    const token = `share_${courseMapId}_${Date.now().toString(36)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    return {
      url: `${window.location.origin}/shared/course-map/${token}`,
      token,
      expiresAt,
      courseMapId,
    }
  }

  return res.json()
}

// ── Download Helpers ────────────────────────────────────────────────────────

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
