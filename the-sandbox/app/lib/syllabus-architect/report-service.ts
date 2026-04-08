/**
 * Course Map Report Service
 *
 * Compiles course map data from existing services into structured reports
 * for JSON consumption or self-contained HTML documents for printing.
 */

import { prisma } from '../prisma'
import { computeCourseMapHealth, type CourseMapHealth } from './health-service'
import { getCourseMapAnalytics, type CourseMapAnalytics } from './analytics-service'
import { getMilestones, type MilestoneSummary } from './milestone-service'
import { getCourseMapAnnotations } from './annotation-service'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReportOptions {
  includeAnnotations?: boolean
  includeMilestones?: boolean
  includeHealth?: boolean
  includeAnalytics?: boolean
}

interface ReportCourseInfo {
  courseCode: string
  title: string
  nodeCount: number
  edgeCount: number
  unitCount: number
}

interface ReportNodeSummary {
  id: string
  label: string
  nodeType: string
  unitType: string | null
}

interface ReportEdgeSummary {
  fromLabel: string
  toLabel: string
  edgeType: string
}

interface ReportAnnotationSummary {
  layerName: string
  layerColor: string
  count: number
  types: Record<string, number>
}

export interface CourseMapReport {
  generatedAt: string
  course: ReportCourseInfo
  nodes: ReportNodeSummary[]
  edges: ReportEdgeSummary[]
  unitTypeDistribution: Record<string, number>
  edgeTypeDistribution: Record<string, number>
  health: CourseMapHealth | null
  milestones: MilestoneSummary | null
  annotations: ReportAnnotationSummary[] | null
  analytics: CourseMapAnalytics | null
}

// ── Service ──────────────────────────────────────────────────────────────────

export async function generateCourseMapReport(
  courseId: string,
  options: ReportOptions = {},
): Promise<CourseMapReport> {
  const {
    includeAnnotations = true,
    includeMilestones = true,
    includeHealth = true,
    includeAnalytics = true,
  } = options

  // Fetch course map core data
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      course: { select: { courseCode: true, title: true } },
      nodes: {
        where: { archived: false },
        include: { courseUnit: { select: { unitType: true } } },
      },
      edges: true,
      units: { orderBy: { position: 'asc' } },
    },
  })

  if (!courseMap) {
    throw new Error('Course map not found')
  }

  // Build node label lookup
  const nodeLabels = new Map<string, string>()
  for (const n of courseMap.nodes) nodeLabels.set(n.id, n.label)

  // Fetch enrichment data in parallel
  const [health, milestones, annotations, analytics] = await Promise.all([
    includeHealth ? computeCourseMapHealth(courseId) : null,
    includeMilestones ? getMilestones(courseId) : null,
    includeAnnotations
      ? getCourseMapAnnotations(courseMap.id)
      : null,
    includeAnalytics ? getCourseMapAnalytics(courseId) : null,
  ])

  // Compute unit type distribution
  const unitTypeDistribution: Record<string, number> = {}
  for (const n of courseMap.nodes) {
    const ut = n.courseUnit?.unitType || 'OTHER'
    unitTypeDistribution[ut] = (unitTypeDistribution[ut] || 0) + 1
  }

  // Compute edge type distribution
  const edgeTypeDistribution: Record<string, number> = {}
  for (const e of courseMap.edges) {
    edgeTypeDistribution[e.edgeType] = (edgeTypeDistribution[e.edgeType] || 0) + 1
  }

  // Summarize annotations by layer
  let annotationSummaries: ReportAnnotationSummary[] | null = null
  if (annotations) {
    const layerMap = new Map<string, { name: string; color: string; types: Record<string, number> }>()
    for (const a of annotations) {
      const layerId = a.layer.id
      const existing = layerMap.get(layerId)
      if (existing) {
        existing.types[a.type] = (existing.types[a.type] || 0) + 1
      } else {
        layerMap.set(layerId, {
          name: a.layer.name,
          color: a.layer.color,
          types: { [a.type]: 1 },
        })
      }
    }
    annotationSummaries = [...layerMap.values()].map((l) => ({
      layerName: l.name,
      layerColor: l.color,
      count: Object.values(l.types).reduce((a, b) => a + b, 0),
      types: l.types,
    }))
  }

  return {
    generatedAt: new Date().toISOString(),
    course: {
      courseCode: courseMap.course.courseCode,
      title: courseMap.course.title,
      nodeCount: courseMap.nodes.length,
      edgeCount: courseMap.edges.length,
      unitCount: courseMap.units.length,
    },
    nodes: courseMap.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      unitType: n.courseUnit?.unitType ?? null,
    })),
    edges: courseMap.edges.map((e) => ({
      fromLabel: nodeLabels.get(e.fromNodeId) || e.fromNodeId,
      toLabel: nodeLabels.get(e.toNodeId) || e.toNodeId,
      edgeType: e.edgeType,
    })),
    unitTypeDistribution,
    edgeTypeDistribution,
    health,
    milestones,
    annotations: annotationSummaries,
    analytics,
  }
}

// ── HTML Report Generation ───────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function generateReportHtml(report: CourseMapReport): string {
  const { course, health, milestones, annotations, analytics } = report

  // Health section
  let healthHtml = ''
  if (health) {
    const gradeRows = health.grades
      .map(
        (g) =>
          `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${esc(g.dimension)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">
          <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-weight:700;font-size:13px;color:white;background:${g.score >= 80 ? '#16a34a' : g.score >= 60 ? '#ca8a04' : '#dc2626'}">${g.score}</span>
        </td>
        <td style="padding:8px;border:1px solid #e5e7eb">${esc(g.label)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280">${esc(g.detail)}</td>
      </tr>`,
      )
      .join('')

    const recsHtml = health.recommendations
      .map((r) => `<li style="margin-bottom:4px">${esc(r)}</li>`)
      .join('')

    healthHtml = `
    <h2 style="font-size:18px;margin-top:32px;margin-bottom:12px;color:#0033A0;page-break-before:auto">Health Score</h2>
    <div style="display:flex;gap:24px;margin-bottom:16px">
      <div style="background:${health.overallScore >= 80 ? '#f0fdf4' : health.overallScore >= 60 ? '#fefce8' : '#fef2f2'};padding:16px 24px;border-radius:12px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:${health.overallScore >= 80 ? '#16a34a' : health.overallScore >= 60 ? '#ca8a04' : '#dc2626'}">${health.overallScore}</div>
        <div style="font-size:12px;color:#6b7280">Overall Score</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Dimension</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Score</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Grade</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Detail</th>
      </tr></thead>
      <tbody>${gradeRows}</tbody>
    </table>
    ${recsHtml ? `<div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin-bottom:24px"><h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#0033A0">Recommendations</h3><ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${recsHtml}</ul></div>` : ''}`
  }

  // Milestones section
  let milestonesHtml = ''
  if (milestones && milestones.milestones.length > 0) {
    const milestoneRows = milestones.milestones
      .map(
        (m) =>
          `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${esc(m.label)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px">${esc(m.nodeLabel || '—')}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280">${esc(m.description || '—')}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">${m.achieved ? '<span style="color:#16a34a;font-weight:700">&#10003;</span>' : '<span style="color:#9ca3af">—</span>'}</td>
      </tr>`,
      )
      .join('')

    milestonesHtml = `
    <h2 style="font-size:18px;margin-top:32px;margin-bottom:12px;color:#0033A0">Milestones</h2>
    <div style="display:flex;gap:24px;margin-bottom:16px">
      <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${milestones.total}</div><div style="font-size:12px;color:#6b7280">Total</div></div>
      <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#16a34a">${milestones.achieved}</div><div style="font-size:12px;color:#6b7280">Achieved</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Milestone</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Node</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Description</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Achieved</th>
      </tr></thead>
      <tbody>${milestoneRows}</tbody>
    </table>`
  }

  // Annotations section
  let annotationsHtml = ''
  if (annotations && annotations.length > 0) {
    const layerRows = annotations
      .map(
        (a) =>
          `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${a.layerColor};margin-right:6px;vertical-align:middle"></span>${esc(a.layerName)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">${a.count}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280">${Object.entries(a.types).map(([t, c]) => `${c} ${t}${Number(c) !== 1 ? 's' : ''}`).join(', ')}</td>
      </tr>`,
      )
      .join('')

    annotationsHtml = `
    <h2 style="font-size:18px;margin-top:32px;margin-bottom:12px;color:#0033A0">Annotations</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Layer</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Count</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Breakdown</th>
      </tr></thead>
      <tbody>${layerRows}</tbody>
    </table>`
  }

  // Analytics section
  let analyticsHtml = ''
  if (analytics) {
    const topEditors = analytics.editCountByUser
      .slice(0, 5)
      .map(
        (u) =>
          `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb">${esc(u.name)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:600">${u.count}</td>
      </tr>`,
      )
      .join('')

    analyticsHtml = `
    <h2 style="font-size:18px;margin-top:32px;margin-bottom:12px;color:#0033A0;page-break-before:auto">Edit Activity</h2>
    <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${analytics.totalEdits}</div><div style="font-size:12px;color:#6b7280">Total Edits</div></div>
      <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${analytics.collaboratorCount}</div><div style="font-size:12px;color:#6b7280">Collaborators</div></div>
      <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${analytics.averageEditsPerDay}</div><div style="font-size:12px;color:#6b7280">Avg Edits/Day</div></div>
      <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${esc(analytics.mostActiveDay)}</div><div style="font-size:12px;color:#6b7280">Most Active Day</div></div>
    </div>
    ${topEditors ? `<h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#374151">Top Editors</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Name</th><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Edits</th></tr></thead><tbody>${topEditors}</tbody></table>` : ''}`
  }

  // Node & edge summary tables
  const nodeTypeGroups: Record<string, string[]> = {}
  for (const n of report.nodes) {
    const key = n.unitType || n.nodeType
    if (!nodeTypeGroups[key]) nodeTypeGroups[key] = []
    nodeTypeGroups[key].push(n.label)
  }

  const nodeDistRows = Object.entries(report.unitTypeDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([type, count]) =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb">${esc(type)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:600">${count}</td></tr>`,
    )
    .join('')

  const edgeDistRows = Object.entries(report.edgeTypeDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([type, count]) =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb">${esc(type)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:600">${count}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Course Map Report — ${esc(course.courseCode)}: ${esc(course.title)}</title>
  <style>
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #111827; }
  </style>
</head>
<body>
  <h1 style="font-size:24px;margin-bottom:4px">${esc(course.courseCode)}: ${esc(course.title)}</h1>
  <p style="color:#6b7280;font-size:14px;margin-bottom:24px">Course Map Report — ${new Date(report.generatedAt).toLocaleDateString()}</p>

  <div style="display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap">
    <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${course.nodeCount}</div><div style="font-size:12px;color:#6b7280">Nodes</div></div>
    <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${course.edgeCount}</div><div style="font-size:12px;color:#6b7280">Connections</div></div>
    <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px"><div style="font-size:20px;font-weight:700;color:#0033A0">${course.unitCount}</div><div style="font-size:12px;color:#6b7280">Units</div></div>
  </div>

  <h2 style="font-size:18px;margin-top:32px;margin-bottom:12px;color:#0033A0">Structure</h2>
  <div style="display:flex;gap:24px;margin-bottom:24px">
    <div style="flex:1">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#374151">Node Types</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Type</th><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Count</th></tr></thead>
        <tbody>${nodeDistRows || '<tr><td colspan="2" style="padding:8px;text-align:center;color:#9ca3af">No nodes</td></tr>'}</tbody>
      </table>
    </div>
    <div style="flex:1">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#374151">Edge Types</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;font-size:13px">Type</th><th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:13px">Count</th></tr></thead>
        <tbody>${edgeDistRows || '<tr><td colspan="2" style="padding:8px;text-align:center;color:#9ca3af">No edges</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  ${healthHtml}
  ${milestonesHtml}
  ${annotationsHtml}
  ${analyticsHtml}

  <p style="color:#9ca3af;font-size:11px;margin-top:40px;text-align:center">Generated by CATS-AI &middot; University of Kentucky</p>
</body>
</html>`
}
