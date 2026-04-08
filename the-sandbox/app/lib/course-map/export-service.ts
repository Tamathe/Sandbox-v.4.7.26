/**
 * Course Map Export Service
 *
 * Wraps the core syllabus-architect export functions and adds
 * image export preparation (PNG canvas data) for client-side rendering,
 * SCORM 1.2 package generation, markdown export, high-res image
 * rasterization, and time-limited shareable link generation.
 */

// Client-safe exports only. Server-only functions (CSV, SVG, JSON, PDF exports
// that need prisma) live in export-service.server.ts.

// ── SCORM 1.2 Types ──────────────────────────────────────────────────────────

export interface ScormPackageData {
  manifest: string
  htmlPlayer: string
  files: { name: string; content: string }[]
}

export interface ImageExportOptions {
  format: 'png' | 'jpeg'
  scale: number
  quality?: number
}

export interface ShareableLinkResult {
  token: string
  url: string
  expiresAt: string
}

// ── SCORM Types (internal) ───────────────────────────────────────────────────

interface ScormItem {
  identifier: string
  title: string
  resourceRef: string
}

// ── XML/HTML helpers ─────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── GraphMap-like interface for client-side exports ──────────────────────────

interface ClientGraphMap {
  id?: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  nodes: Array<{
    id: string
    label: string
    nodeType: string
    courseUnitId: string | null
    xPos?: number
    yPos?: number
    description?: string | null
  }>
  edges: Array<{
    fromNodeId: string
    toNodeId: string
    edgeType: string
  }>
  units: Array<{
    id: string
    label: string
    description?: string | null
    modules: Array<{
      label: string
      description?: string | null
      lessons: Array<{ label: string; description?: string | null }>
    }>
  }>
}

// ── SCORM 1.2 Export ─────────────────────────────────────────────────────────

export function exportToSCORM(graphMap: ClientGraphMap, courseTitle: string): ScormPackageData {
  const identifier = `SANDBOX-CM-${(graphMap.courseCode || graphMap.id || 'MAP').replace(/[^A-Za-z0-9]/g, '_')}`

  const items: ScormItem[] = graphMap.units.map((unit, i) => ({
    identifier: `ITEM_${i + 1}`,
    title: unit.label,
    resourceRef: `RES_${i + 1}`,
  }))

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

  // imsmanifest.xml
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeXml(identifier)}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_1">
    <organization identifier="ORG_1">
      <title>${escapeXml(courseTitle)}</title>
${items.map((item) => `      <item identifier="${escapeXml(item.identifier)}" identifierref="${escapeXml(item.resourceRef)}">
        <title>${escapeXml(item.title)}</title>
      </item>`).join('\n')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_PLAYER" type="webcontent" adlcp:scormtype="sco" href="player.html">
      <file href="player.html"/>
    </resource>
${items.map((item, i) => `    <resource identifier="${escapeXml(item.resourceRef)}" type="webcontent" adlcp:scormtype="sco" href="unit_${i + 1}.html">
      <file href="unit_${i + 1}.html"/>
    </resource>`).join('\n')}
  </resources>
</manifest>`

  // HTML player (main page)
  const htmlPlayer = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseTitle)} - Course Map</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
    .header { background: #0033A0; color: white; padding: 24px 32px; }
    .header h1 { font-size: 24px; font-weight: 800; }
    .header p { font-size: 14px; opacity: 0.8; margin-top: 4px; }
    .content { max-width: 960px; margin: 32px auto; padding: 0 24px; }
    .unit-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
    .unit-card h2 { font-size: 18px; font-weight: 700; color: #0033A0; margin-bottom: 8px; }
    .unit-card p { font-size: 14px; color: #64748b; margin-bottom: 12px; }
    .module { padding: 8px 0; border-top: 1px solid #f1f5f9; }
    .module h3 { font-size: 15px; font-weight: 600; color: #334155; }
    .lesson { font-size: 13px; color: #64748b; padding: 2px 0 2px 16px; }
    .prereqs { font-size: 12px; color: #9333ea; margin-top: 8px; font-weight: 500; }
  </style>
  <script>
    var API = null;
    function findAPI(win) { try { if (win.API) return win.API; if (win.parent && win.parent !== win) return findAPI(win.parent); } catch(e) {} return null; }
    function initSCORM() { API = findAPI(window); if (API) { API.LMSInitialize(''); API.LMSSetValue('cmi.core.lesson_status', 'incomplete'); } }
    function completeSCORM() { if (API) { API.LMSSetValue('cmi.core.lesson_status', 'completed'); API.LMSCommit(''); API.LMSFinish(''); } }
    window.onload = initSCORM; window.onunload = completeSCORM;
  </script>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(courseTitle)}</h1>
    <p>Course Map - ${graphMap.units.length} units, ${graphMap.nodes.length} nodes, ${graphMap.edges.length} connections</p>
  </div>
  <div class="content">
${graphMap.units.map((unit) => {
    const unitNodes = graphMap.nodes.filter((n) => n.courseUnitId === unit.id)
    const unitPrereqs: string[] = []
    for (const node of unitNodes) {
      const p = prereqMap.get(node.id)
      if (p) unitPrereqs.push(...p)
    }
    return `    <div class="unit-card">
      <h2>${escapeHtml(unit.label)}</h2>
      ${unit.description ? `<p>${escapeHtml(unit.description)}</p>` : ''}
${unit.modules.map((mod) => `      <div class="module">
        <h3>${escapeHtml(mod.label)}</h3>
${mod.lessons.map((l) => `        <div class="lesson">- ${escapeHtml(l.label)}</div>`).join('\n')}
      </div>`).join('\n')}
      ${unitPrereqs.length > 0 ? `<div class="prereqs">Prerequisites: ${escapeHtml(unitPrereqs.join(', '))}</div>` : ''}
    </div>`
  }).join('\n')}
  </div>
</body>
</html>`

  // Per-unit HTML pages
  const files: { name: string; content: string }[] = [
    { name: 'imsmanifest.xml', content: manifest },
    { name: 'player.html', content: htmlPlayer },
  ]

  graphMap.units.forEach((unit, i) => {
    const unitHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(unit.label)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:32px auto;padding:0 24px;color:#1e293b}h1{color:#0033A0;font-size:22px;margin-bottom:8px}h2{font-size:16px;color:#334155;margin:16px 0 6px}p{font-size:14px;color:#64748b}ul{padding-left:20px;margin:4px 0}li{font-size:13px;color:#475569;padding:2px 0}</style>
</head><body>
  <h1>${escapeHtml(unit.label)}</h1>
  ${unit.description ? `<p>${escapeHtml(unit.description)}</p>` : ''}
${unit.modules.map((mod) => `  <h2>${escapeHtml(mod.label)}</h2>
  <ul>${mod.lessons.map((l) => `<li>${escapeHtml(l.label)}</li>`).join('')}</ul>`).join('\n')}
</body></html>`
    files.push({ name: `unit_${i + 1}.html`, content: unitHtml })
  })

  return { manifest, htmlPlayer, files }
}

// ── Markdown Export ──────────────────────────────────────────────────────────

export function exportToMarkdown(graphMap: ClientGraphMap): string {
  const lines: string[] = []

  lines.push(`# ${graphMap.courseTitle || 'Course Map'}`)
  if (graphMap.courseCode) lines.push(`**Course:** ${graphMap.courseCode}`)
  lines.push('')
  lines.push(`> ${graphMap.units.length} units | ${graphMap.nodes.length} nodes | ${graphMap.edges.length} connections`)
  lines.push(`> Generated: ${new Date().toLocaleDateString()}`)
  lines.push('')

  // TOC
  lines.push('## Table of Contents')
  lines.push('')
  graphMap.units.forEach((unit, i) => {
    lines.push(`${i + 1}. [${unit.label}](#${unit.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`)
  })
  lines.push('')

  // Prerequisite lookup
  const nodeLabels = new Map(graphMap.nodes.map((n) => [n.id, n.label]))
  const prereqMap = new Map<string, string[]>()
  for (const edge of graphMap.edges) {
    if (edge.edgeType === 'PREREQUISITE') {
      const existing = prereqMap.get(edge.toNodeId) || []
      existing.push(nodeLabels.get(edge.fromNodeId) || edge.fromNodeId)
      prereqMap.set(edge.toNodeId, existing)
    }
  }

  // Units
  for (const unit of graphMap.units) {
    lines.push(`## ${unit.label}`)
    lines.push('')
    if (unit.description) { lines.push(unit.description); lines.push('') }

    const unitNodes = graphMap.nodes.filter((n) => n.courseUnitId === unit.id)
    const unitPrereqs: string[] = []
    for (const node of unitNodes) {
      const p = prereqMap.get(node.id)
      if (p) unitPrereqs.push(...p)
    }
    if (unitPrereqs.length > 0) { lines.push(`**Prerequisites:** ${unitPrereqs.join(', ')}`); lines.push('') }

    for (const mod of unit.modules) {
      lines.push(`### ${mod.label}`)
      lines.push('')
      if (mod.description) { lines.push(mod.description); lines.push('') }
      for (const lesson of mod.lessons) lines.push(`- ${lesson.label}`)
      lines.push('')
    }
  }

  // Relationships
  const edgeGroups = new Map<string, { from: string; to: string }[]>()
  for (const edge of graphMap.edges) {
    const group = edgeGroups.get(edge.edgeType) || []
    group.push({ from: nodeLabels.get(edge.fromNodeId) || edge.fromNodeId, to: nodeLabels.get(edge.toNodeId) || edge.toNodeId })
    edgeGroups.set(edge.edgeType, group)
  }
  if (edgeGroups.size > 0) {
    lines.push('## Relationships')
    lines.push('')
    for (const [type, edges] of edgeGroups) {
      lines.push(`### ${type}`)
      lines.push('')
      for (const edge of edges) lines.push(`- ${edge.from} → ${edge.to}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ── High-Res Image Export (client-side SVG→Canvas) ───────────────────────────

export async function exportToImage(
  svgElement: SVGSVGElement | null,
  options: ImageExportOptions = { format: 'png', scale: 2 },
): Promise<Blob | null> {
  if (!svgElement) return null

  const svgData = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const bbox = svgElement.getBBox()
  const width = (bbox.width + bbox.x * 2) * options.scale
  const height = (bbox.height + bbox.y * 2) * options.scale

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return }
      if (options.format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height) }
      ctx.scale(options.scale, options.scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob), options.format === 'jpeg' ? 'image/jpeg' : 'image/png', options.quality ?? 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ── Shareable Link (client-side, calls API) ──────────────────────────────────

export async function generateTimeLimitedShareLink(
  courseId: string,
  userEmail: string,
  expiresInHours: number = 168,
): Promise<ShareableLinkResult> {
  const res = await fetch(`/api/courses/${courseId}/course-map/share-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ expiresInHours }),
  })

  if (!res.ok) {
    // Fallback to existing share endpoint
    const fallback = await fetch(`/api/courses/${courseId}/course-map/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    })
    if (fallback.ok) {
      const data = await fallback.json()
      return { token: data.shareToken, url: data.shareUrl, expiresAt: new Date(Date.now() + expiresInHours * 3600000).toISOString() }
    }
    // Client-side fallback for demo
    const token = `share_${courseId}_${Date.now().toString(36)}`
    return { token, url: `${window.location.origin}/courses/share/${token}`, expiresAt: new Date(Date.now() + expiresInHours * 3600000).toISOString() }
  }

  return res.json()
}

// ── Download Helpers ─────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
  downloadBlob(blob, filename)
}

/**
 * Download SCORM package as ZIP (uses jszip, already a project dependency).
 */
export async function downloadScormPackage(
  scormData: ScormPackageData,
  filename: string = 'course-map-scorm.zip',
): Promise<void> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    for (const file of scormData.files) zip.file(file.name, file.content)
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    downloadBlob(blob, filename)
  } catch {
    // Fallback: download manifest and player individually
    downloadText(scormData.manifest, 'imsmanifest.xml', 'application/xml')
    downloadText(scormData.htmlPlayer, 'player.html', 'text/html')
  }
}
