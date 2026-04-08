/**
 * Course map export service — CSV and SVG generation.
 */

import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

interface ExportNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
}

interface ExportEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface ExportUnit {
  label: string
  unitType: string
  startDate: Date | null
  endDate: Date | null
  position: number
  modules: Array<{
    label: string
    description: string | null
    lessons: Array<{
      label: string
      dueDate: Date | null
    }>
  }>
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export the course map as CSV — one row per lesson/unit.
 */
export async function exportMapAsCSV(courseId: string): Promise<string> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      course: { select: { courseCode: true, title: true } },
      units: {
        orderBy: { position: 'asc' },
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
      edges: {
        select: {
          fromNodeId: true,
          toNodeId: true,
          edgeType: true,
        },
      },
      nodes: {
        select: { id: true, label: true, courseUnitId: true },
      },
    },
  })

  if (!courseMap) throw new Error('Course map not found')

  // Build node label lookup for edge descriptions
  const nodeLabels = new Map<string, string>()
  for (const n of courseMap.nodes) {
    nodeLabels.set(n.id, n.label)
  }

  // Build edge map: unitId → edges involving that unit's node
  const unitNodeMap = new Map<string, string>()
  for (const n of courseMap.nodes) {
    if (n.courseUnitId) unitNodeMap.set(n.courseUnitId, n.id)
  }

  const rows: string[] = []
  rows.push('Unit,Unit Type,Start Date,End Date,Module,Lesson,Due Date,Edges')

  for (const unit of courseMap.units) {
    const unitNodeId = unitNodeMap.get(unit.id)
    const unitEdges = unitNodeId
      ? courseMap.edges
          .filter((e) => e.fromNodeId === unitNodeId || e.toNodeId === unitNodeId)
          .map((e) => {
            const other = e.fromNodeId === unitNodeId ? e.toNodeId : e.fromNodeId
            const direction = e.fromNodeId === unitNodeId ? '→' : '←'
            return `${e.edgeType} ${direction} ${nodeLabels.get(other) || other}`
          })
          .join('; ')
      : ''

    if (unit.modules.length === 0) {
      rows.push(
        [
          escapeCSV(unit.label),
          escapeCSV(unit.unitType),
          unit.startDate ? unit.startDate.toISOString().slice(0, 10) : '',
          unit.endDate ? unit.endDate.toISOString().slice(0, 10) : '',
          '',
          '',
          '',
          escapeCSV(unitEdges),
        ].join(','),
      )
    } else {
      for (const mod of unit.modules) {
        if (mod.lessons.length === 0) {
          rows.push(
            [
              escapeCSV(unit.label),
              escapeCSV(unit.unitType),
              unit.startDate ? unit.startDate.toISOString().slice(0, 10) : '',
              unit.endDate ? unit.endDate.toISOString().slice(0, 10) : '',
              escapeCSV(mod.label),
              '',
              '',
              escapeCSV(unitEdges),
            ].join(','),
          )
        } else {
          for (const lesson of mod.lessons) {
            rows.push(
              [
                escapeCSV(unit.label),
                escapeCSV(unit.unitType),
                unit.startDate ? unit.startDate.toISOString().slice(0, 10) : '',
                unit.endDate ? unit.endDate.toISOString().slice(0, 10) : '',
                escapeCSV(mod.label),
                escapeCSV(lesson.label),
                lesson.dueDate ? lesson.dueDate.toISOString().slice(0, 10) : '',
                escapeCSV(unitEdges),
              ].join(','),
            )
          }
        }
      }
    }
  }

  return rows.join('\n')
}

// ── SVG Export ────────────────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_HEIGHT = 80

const EDGE_COLORS: Record<string, string> = {
  PREREQUISITE: '#dc2626',
  SEQUENCE: '#2563eb',
  CONCURRENT: '#9333ea',
}

const UNIT_TYPE_FILL: Record<string, string> = {
  LECTURE: '#dbeafe',
  LAB: '#dcfce7',
  EXAM: '#fee2e2',
  QUIZ: '#fef3c7',
  ASSIGNMENT: '#e0e7ff',
  DISCUSSION: '#f3e8ff',
  OTHER: '#f3f4f6',
}

/**
 * Generate an SVG string of the graph visualization.
 */
export async function exportMapAsSVG(courseId: string): Promise<string> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      course: { select: { courseCode: true, title: true } },
      nodes: { where: { archived: false } },
      edges: true,
      units: { select: { id: true, unitType: true } },
    },
  })

  if (!courseMap) throw new Error('Course map not found')

  const nodes = courseMap.nodes as ExportNode[]
  const edges = courseMap.edges as ExportEdge[]

  // Unit type lookup
  const unitTypeMap = new Map<string, string>()
  for (const u of courseMap.units) unitTypeMap.set(u.id, u.unitType)

  // Compute canvas dimensions
  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.xPos)) : 0
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.yPos)) : 0
  const width = Math.max(800, maxX + NODE_WIDTH + 40)
  const height = Math.max(600, maxY + NODE_HEIGHT + 40)

  // Build node map
  const nodeMap = new Map<string, ExportNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  // SVG parts
  const svgParts: string[] = []

  // Defs (arrow markers)
  svgParts.push('<defs>')
  for (const [type, color] of Object.entries(EDGE_COLORS)) {
    svgParts.push(
      `<marker id="arrow-${type}" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">` +
        `<path d="M 0 0 L 10 3.5 L 0 7 z" fill="${color}" />` +
        `</marker>`,
    )
  }
  svgParts.push('</defs>')

  // Title
  svgParts.push(
    `<text x="20" y="30" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#111827">` +
      `${escapeXML(courseMap.course.courseCode)}: ${escapeXML(courseMap.course.title)}` +
      `</text>`,
  )

  // Edges
  for (const edge of edges) {
    const from = nodeMap.get(edge.fromNodeId)
    const to = nodeMap.get(edge.toNodeId)
    if (!from || !to) continue

    const x1 = from.xPos + NODE_WIDTH / 2
    const y1 = from.yPos + NODE_HEIGHT
    const x2 = to.xPos + NODE_WIDTH / 2
    const y2 = to.yPos
    const midY = (y1 + y2) / 2
    const color = EDGE_COLORS[edge.edgeType] || '#6b7280'

    svgParts.push(
      `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" ` +
        `fill="none" stroke="${color}" stroke-width="2" opacity="0.7" ` +
        `marker-end="url(#arrow-${edge.edgeType})" />`,
    )
  }

  // Nodes
  for (const node of nodes) {
    const unitType = node.courseUnitId ? unitTypeMap.get(node.courseUnitId) || 'OTHER' : 'OTHER'
    const fill = UNIT_TYPE_FILL[unitType] || UNIT_TYPE_FILL.OTHER

    svgParts.push(
      `<g transform="translate(${node.xPos}, ${node.yPos})">` +
        `<rect width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="12" ry="12" fill="${fill}" stroke="#d1d5db" stroke-width="2" />` +
        `<text x="16" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#111827">` +
        `${escapeXML(truncate(node.label, 30))}` +
        `</text>` +
        `<text x="16" y="50" font-family="system-ui, sans-serif" font-size="10" fill="#6b7280">${escapeXML(unitType)}</text>` +
        `</g>`,
    )
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 50}" viewBox="0 0 ${width} ${height + 50}">`,
    `<rect width="100%" height="100%" fill="#f9fafb" />`,
    ...svgParts,
    `</svg>`,
  ].join('\n')
}

// ── JSON Export ──────────────────────────────────────────────────────────────

export interface JsonExportData {
  version: string
  exportedAt: string
  course: { courseCode: string; title: string }
  nodes: Array<{
    id: string
    label: string
    nodeType: string
    unitType: string | null
    xPos: number
    yPos: number
  }>
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    edgeType: string
  }>
  units: Array<{
    id: string
    label: string
    unitType: string
    position: number
    startDate: string | null
    endDate: string | null
    modules: Array<{
      label: string
      lessons: Array<{ label: string; dueDate: string | null }>
    }>
  }>
}

/**
 * Export the course map as structured JSON.
 */
export async function exportMapAsJson(courseId: string): Promise<JsonExportData> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      course: { select: { courseCode: true, title: true } },
      nodes: { where: { archived: false }, include: { courseUnit: { select: { unitType: true } } } },
      edges: true,
      units: {
        orderBy: { position: 'asc' },
        include: {
          modules: { include: { lessons: true } },
        },
      },
    },
  })

  if (!courseMap) throw new Error('Course map not found')

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    course: { courseCode: courseMap.course.courseCode, title: courseMap.course.title },
    nodes: courseMap.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      unitType: n.courseUnit?.unitType ?? null,
      xPos: n.xPos,
      yPos: n.yPos,
    })),
    edges: courseMap.edges.map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      edgeType: e.edgeType,
    })),
    units: courseMap.units.map((u) => ({
      id: u.id,
      label: u.label,
      unitType: u.unitType,
      position: u.position,
      startDate: u.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: u.endDate?.toISOString().slice(0, 10) ?? null,
      modules: u.modules.map((m) => ({
        label: m.label,
        lessons: m.lessons.map((l) => ({
          label: l.label,
          dueDate: l.dueDate?.toISOString().slice(0, 10) ?? null,
        })),
      })),
    })),
  }
}

// ── PDF HTML Export ──────────────────────────────────────────────────────────

export interface PdfExportOptions {
  /** When set, include the student's personal study plan in the export. */
  studentId?: string
}

/**
 * Generate a styled HTML page suitable for Print-to-PDF.
 * Includes unit details, assignments with rubric summaries, and
 * optionally a student's personal study plan.
 */
export async function generatePdfHtml(courseId: string, options?: PdfExportOptions): Promise<string> {
  const data = await exportMapAsJson(courseId)
  const nodeLabels = new Map<string, string>()
  for (const n of data.nodes) nodeLabels.set(n.id, n.label)

  // Fetch assignments with optional rubric criteria for this course
  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    orderBy: { dueAt: 'asc' },
    include: {
      rubric: {
        include: {
          criteria: { orderBy: { order: 'asc' }, select: { title: true, maxPoints: true } },
        },
      },
    },
  })

  // Fetch student study plan if studentId provided
  let studyPlanEntries: Array<{ nodeId: string; targetDate: Date; completedAt: Date | null }> = []
  if (options?.studentId) {
    studyPlanEntries = await prisma.studentStudyPlan.findMany({
      where: { studentId: options.studentId, courseId },
      orderBy: { targetDate: 'asc' },
      select: { nodeId: true, targetDate: true, completedAt: true },
    })
  }
  const studyPlanMap = new Map(studyPlanEntries.map((e) => [e.nodeId, e]))

  // Build unit rows
  const unitRows = data.units.map((u) => {
    const lessons = u.modules.flatMap((m) => m.lessons.map((l) => ({
      label: `${m.label}: ${l.label}`,
      dueDate: l.dueDate,
    })))
    const lessonHtml = lessons.length > 0
      ? lessons.map((l) => `${esc(l.label)}${l.dueDate ? ` <span style="color:#6b7280">(due ${l.dueDate})</span>` : ''}`).join('<br/>')
      : '—'
    return `<tr>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${esc(u.label)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(u.unitType)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${u.startDate || '—'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${u.endDate || '—'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px">${lessonHtml}</td>
    </tr>`
  }).join('')

  // Build edge rows
  const edgeRows = data.edges.map((e) => {
    return `<tr>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(nodeLabels.get(e.fromNodeId) || e.fromNodeId)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">→</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(nodeLabels.get(e.toNodeId) || e.toNodeId)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(e.edgeType)}</td>
    </tr>`
  }).join('')

  // Build assignment rows
  const assignmentRows = assignments.map((a) => {
    const rubricSummary = a.rubric
      ? a.rubric.criteria.map((c) => `${esc(c.title)} (${c.maxPoints}pts)`).join(', ')
      : '—'
    return `<tr>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${esc(a.title)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(a.type)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${a.pointsPossible}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;font-size:11px">${rubricSummary}</td>
    </tr>`
  }).join('')

  // Build study plan section (students only)
  const now = new Date()
  let studyPlanHtml = ''
  if (options?.studentId && studyPlanEntries.length > 0) {
    const planCompleted = studyPlanEntries.filter((e) => e.completedAt).length
    const planOverdue = studyPlanEntries.filter((e) => !e.completedAt && e.targetDate < now).length
    const planPending = studyPlanEntries.length - planCompleted - planOverdue

    const planRows = studyPlanEntries.map((e) => {
      const label = nodeLabels.get(e.nodeId) || e.nodeId
      const status = e.completedAt ? 'Completed' : e.targetDate < now ? 'Overdue' : 'Planned'
      const statusColor = e.completedAt ? '#15803d' : e.targetDate < now ? '#dc2626' : '#2563eb'
      return `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb">${esc(label)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${e.targetDate.toLocaleDateString()}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;color:${statusColor};font-weight:600">${status}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}</td>
      </tr>`
    }).join('')

    studyPlanHtml = `
  <h2>My Study Plan</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${planPending}</div><div class="stat-label">Planned</div></div>
    <div class="stat" style="background:#fef2f2"><div class="stat-value" style="color:#dc2626">${planOverdue}</div><div class="stat-label">Overdue</div></div>
    <div class="stat" style="background:#f0fdf4"><div class="stat-value" style="color:#15803d">${planCompleted}</div><div class="stat-label">Completed</div></div>
  </div>
  <table>
    <thead><tr><th>Topic</th><th>Target Date</th><th>Status</th><th>Completed</th></tr></thead>
    <tbody>${planRows}</tbody>
  </table>`
  }

  // Assignments section
  const assignmentsHtml = assignments.length > 0 ? `
  <h2>Assignments</h2>
  <table>
    <thead><tr><th>Title</th><th>Type</th><th>Due</th><th>Points</th><th>Rubric Criteria</th></tr></thead>
    <tbody>${assignmentRows}</tbody>
  </table>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Course Map — ${esc(data.course.courseCode)}: ${esc(data.course.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #111827; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; color: #0033A0; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; text-align: left; font-size: 13px; font-weight: 600; }
    td { font-size: 13px; vertical-align: top; }
    .stats { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat { background: #f0f4ff; padding: 12px 16px; border-radius: 8px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #0033A0; }
    .stat-label { font-size: 12px; color: #6b7280; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${esc(data.course.courseCode)}: ${esc(data.course.title)}</h1>
  <p class="subtitle">Course Map Export — ${new Date().toLocaleDateString()}</p>

  <div class="stats">
    <div class="stat"><div class="stat-value">${data.nodes.length}</div><div class="stat-label">Nodes</div></div>
    <div class="stat"><div class="stat-value">${data.edges.length}</div><div class="stat-label">Connections</div></div>
    <div class="stat"><div class="stat-value">${data.units.length}</div><div class="stat-label">Units</div></div>
    <div class="stat"><div class="stat-value">${assignments.length}</div><div class="stat-label">Assignments</div></div>
  </div>

  <h2>Units &amp; Lessons</h2>
  <table>
    <thead><tr><th>Unit</th><th>Type</th><th>Start</th><th>End</th><th>Lessons</th></tr></thead>
    <tbody>${unitRows || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#9ca3af">No units</td></tr>'}</tbody>
  </table>

  ${assignmentsHtml}

  <h2>Connections</h2>
  <table>
    <thead><tr><th>From</th><th></th><th>To</th><th>Type</th></tr></thead>
    <tbody>${edgeRows || '<tr><td colspan="4" style="padding:8px;text-align:center;color:#9ca3af">No connections</td></tr>'}</tbody>
  </table>

  ${studyPlanHtml}

  <p style="color:#9ca3af;font-size:11px;margin-top:40px;text-align:center">Generated by CATS-AI &middot; University of Kentucky</p>
</body>
</html>`
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeXML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
