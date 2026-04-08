/**
 * Server-only course map export helpers.
 * These functions require prisma and must NOT be imported from client components.
 */

import {
  exportMapAsSVG,
  exportMapAsJson,
  type JsonExportData,
  type PdfExportOptions,
} from '../syllabus-architect/export-service'

export { exportMapAsCSV, exportMapAsSVG, exportMapAsJson, generatePdfHtml } from '../syllabus-architect/export-service'
export type { JsonExportData, PdfExportOptions }

// ── PNG Export Preparation ──────────────────────────────────────────────────

export async function exportMapAsPngData(courseId: string): Promise<{
  svg: string
  width: number
  height: number
}> {
  const svg = await exportMapAsSVG(courseId)

  const widthMatch = svg.match(/width="(\d+)"/)
  const heightMatch = svg.match(/height="(\d+)"/)
  const width = widthMatch ? parseInt(widthMatch[1], 10) : 1200
  const height = heightMatch ? parseInt(heightMatch[1], 10) : 800

  return { svg, width, height }
}

// ── Print Layout Data ───────────────────────────────────────────────────────

export interface PrintLayoutData {
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
    moduleCount: number
    lessonCount: number
  }>
  generatedAt: string
}

export async function getPrintLayoutData(courseId: string): Promise<PrintLayoutData> {
  const data = await exportMapAsJson(courseId)

  return {
    course: data.course,
    nodes: data.nodes,
    edges: data.edges,
    units: data.units.map((u) => ({
      id: u.id,
      label: u.label,
      unitType: u.unitType,
      position: u.position,
      startDate: u.startDate,
      endDate: u.endDate,
      moduleCount: u.modules.length,
      lessonCount: u.modules.reduce((sum, m) => sum + m.lessons.length, 0),
    })),
    generatedAt: new Date().toISOString(),
  }
}
