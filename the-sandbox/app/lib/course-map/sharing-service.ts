/**
 * Course Map Sharing Service
 *
 * Handles share link generation, validation, JSON import/export,
 * image export, and permission management.
 * All share data is localStorage-backed for demo mode.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type SharePermission = 'view' | 'edit'

export interface ShareLink {
  id: string
  mapId: string
  token: string
  permission: SharePermission
  createdBy: string
  createdAt: string
  expiresAt: string
  label: string
  accessCount: number
}

export interface SharedUser {
  email: string
  name: string
  permission: SharePermission
  addedAt: string
}

export interface MapExportData {
  version: '1.0'
  exportedAt: string
  exportedBy: string
  course: {
    id: string
    courseCode?: string
    title?: string
  }
  nodes: Array<{
    id: string
    label: string
    nodeType: string
    xPos: number
    yPos: number
    courseUnitId: string | null
    archived: boolean
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
  }>
}

export interface ImportPreview {
  nodeCount: number
  edgeCount: number
  unitCount: number
  courseCode?: string
  courseTitle?: string
  exportedAt: string
  exportedBy: string
  valid: boolean
  errors: string[]
}

interface MapNode {
  id: string
  courseMapId: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface MapEdge {
  id: string
  courseMapId: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface CourseUnit {
  id: string
  label: string
  unitType: string
  position: number
  startDate: string | null
  endDate: string | null
  modules: Array<{ id: string; label: string; lessons: Array<{ id: string; label: string }> }>
}

interface GraphMap {
  id: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
}

// ── Storage Keys ─────────────────────────────────────────────────────────────

const SHARE_LINKS_KEY = 'uky-course-map-share-links'
const SHARED_USERS_KEY = 'uky-course-map-shared-users'

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function generateId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getStoredLinks(): ShareLink[] {
  try {
    const raw = localStorage.getItem(SHARE_LINKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLinks(links: ShareLink[]): void {
  localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links))
}

function getStoredUsers(mapId: string): SharedUser[] {
  try {
    const raw = localStorage.getItem(`${SHARED_USERS_KEY}-${mapId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUsers(mapId: string, users: SharedUser[]): void {
  localStorage.setItem(`${SHARED_USERS_KEY}-${mapId}`, JSON.stringify(users))
}

// ── CourseMapSharingService ──────────────────────────────────────────────────

export class CourseMapSharingService {
  /**
   * Generate a shareable link with specified permission level.
   */
  static generateShareLink(
    mapId: string,
    permission: SharePermission,
    createdBy: string,
    label?: string,
  ): ShareLink {
    const token = generateToken()
    const now = new Date()
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const link: ShareLink = {
      id: generateId(),
      mapId,
      token,
      permission,
      createdBy,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      label: label || `${permission === 'edit' ? 'Edit' : 'View'} link`,
      accessCount: 0,
    }

    const links = getStoredLinks()
    links.push(link)
    saveLinks(links)

    return link
  }

  /**
   * Validate a share token and return permission level if valid.
   */
  static validateShareToken(token: string): {
    valid: boolean
    permission: SharePermission | null
    mapId: string | null
    expired: boolean
  } {
    const links = getStoredLinks()
    const link = links.find((l) => l.token === token)

    if (!link) {
      return { valid: false, permission: null, mapId: null, expired: false }
    }

    const now = new Date()
    const expires = new Date(link.expiresAt)

    if (now > expires) {
      return { valid: false, permission: null, mapId: link.mapId, expired: true }
    }

    // Increment access count
    link.accessCount++
    saveLinks(links)

    return { valid: true, permission: link.permission, mapId: link.mapId, expired: false }
  }

  /**
   * List active share links for a map.
   */
  static listSharedLinks(mapId: string): ShareLink[] {
    const links = getStoredLinks()
    return links
      .filter((l) => l.mapId === mapId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Revoke a share link by ID.
   */
  static revokeShareLink(linkId: string): boolean {
    const links = getStoredLinks()
    const idx = links.findIndex((l) => l.id === linkId)
    if (idx === -1) return false
    links.splice(idx, 1)
    saveLinks(links)
    return true
  }

  /**
   * Export full map data as a downloadable JSON file.
   */
  static exportAsJSON(graphMap: GraphMap, exportedBy: string): void {
    const data: MapExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy,
      course: {
        id: graphMap.courseId || graphMap.id,
        courseCode: graphMap.courseCode,
        title: graphMap.courseTitle,
      },
      nodes: graphMap.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        nodeType: n.nodeType,
        xPos: n.xPos,
        yPos: n.yPos,
        courseUnitId: n.courseUnitId,
        archived: n.archived,
      })),
      edges: graphMap.edges.map((e) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        edgeType: e.edgeType,
      })),
      units: graphMap.units.map((u) => ({
        id: u.id,
        label: u.label,
        unitType: u.unitType,
        position: u.position,
        startDate: u.startDate,
        endDate: u.endDate,
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${graphMap.courseCode || 'course-map'}-export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Validate and preview JSON import data before applying.
   */
  static previewImport(jsonString: string): ImportPreview {
    const errors: string[] = []

    let data: MapExportData
    try {
      data = JSON.parse(jsonString)
    } catch {
      return {
        nodeCount: 0,
        edgeCount: 0,
        unitCount: 0,
        exportedAt: '',
        exportedBy: '',
        valid: false,
        errors: ['Invalid JSON format'],
      }
    }

    if (data.version !== '1.0') {
      errors.push(`Unsupported version: ${data.version || 'unknown'}`)
    }
    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid nodes array')
    }
    if (!Array.isArray(data.edges)) {
      errors.push('Missing or invalid edges array')
    }
    if (!data.course) {
      errors.push('Missing course information')
    }

    // Validate node structure
    if (Array.isArray(data.nodes)) {
      for (const node of data.nodes) {
        if (!node.id || !node.label || typeof node.xPos !== 'number' || typeof node.yPos !== 'number') {
          errors.push(`Invalid node structure: ${node.id || 'unknown'}`)
          break
        }
      }
    }

    // Validate edge references
    if (Array.isArray(data.edges) && Array.isArray(data.nodes)) {
      const nodeIds = new Set(data.nodes.map((n) => n.id))
      for (const edge of data.edges) {
        if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
          errors.push(`Edge references missing node: ${edge.id}`)
          break
        }
      }
    }

    return {
      nodeCount: data.nodes?.length || 0,
      edgeCount: data.edges?.length || 0,
      unitCount: data.units?.length || 0,
      courseCode: data.course?.courseCode,
      courseTitle: data.course?.title,
      exportedAt: data.exportedAt || '',
      exportedBy: data.exportedBy || '',
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Import map data from JSON, remapping IDs to avoid conflicts.
   * Returns the remapped data ready to be applied.
   */
  static importFromJSON(
    jsonData: string,
    _courseId: string,
  ): {
    nodes: Array<{ id: string; label: string; nodeType: string; xPos: number; yPos: number; courseUnitId: string | null; archived: boolean }>
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string; edgeType: string }>
    units: Array<{ id: string; label: string; unitType: string; position: number; startDate: string | null; endDate: string | null }>
  } {
    const data: MapExportData = JSON.parse(jsonData)
    const nodeIdMap = new Map<string, string>()
    const unitIdMap = new Map<string, string>()

    // Remap unit IDs
    const remappedUnits = (data.units || []).map((u) => {
      const newId = `imp_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      unitIdMap.set(u.id, newId)
      return { ...u, id: newId }
    })

    // Remap node IDs
    const remappedNodes = data.nodes.map((n) => {
      const newId = `imp_n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      nodeIdMap.set(n.id, newId)
      return {
        ...n,
        id: newId,
        courseUnitId: n.courseUnitId ? (unitIdMap.get(n.courseUnitId) || n.courseUnitId) : null,
      }
    })

    // Remap edge IDs and references
    const remappedEdges = data.edges.map((e) => ({
      id: `imp_e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromNodeId: nodeIdMap.get(e.fromNodeId) || e.fromNodeId,
      toNodeId: nodeIdMap.get(e.toNodeId) || e.toNodeId,
      edgeType: e.edgeType,
    }))

    return { nodes: remappedNodes, edges: remappedEdges, units: remappedUnits }
  }

  /**
   * Export map canvas as PNG image.
   * Captures the SVG-based canvas and converts to downloadable PNG.
   */
  static async exportAsImage(
    canvasElement: HTMLElement,
    filename?: string,
  ): Promise<void> {
    // Find the SVG element within the canvas container
    const svgElement = canvasElement.querySelector('svg')
    if (!svgElement) {
      // Fallback: use canvas-based capture via DOM serialization
      await CourseMapSharingService.exportViaCanvas(canvasElement, filename)
      return
    }

    // Clone SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement
    const bbox = svgElement.getBoundingClientRect()

    // Set explicit dimensions
    clonedSvg.setAttribute('width', String(Math.ceil(bbox.width)))
    clonedSvg.setAttribute('height', String(Math.ceil(bbox.height)))
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    // Inline computed styles
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      text { font-family: system-ui, -apple-system, sans-serif; }
      * { box-sizing: border-box; }
    `
    clonedSvg.insertBefore(styleEl, clonedSvg.firstChild)

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clonedSvg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    const canvas = document.createElement('canvas')
    const scale = 2 // 2x for retina
    canvas.width = Math.ceil(bbox.width) * scale
    canvas.height = Math.ceil(bbox.height) * scale

    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(svgUrl)
          reject(new Error('Canvas context unavailable'))
          return
        }

        ctx.scale(scale, scale)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to create image blob'))
            return
          }

          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename || 'course-map.png'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          URL.revokeObjectURL(svgUrl)
          resolve()
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        reject(new Error('Failed to load SVG for image export'))
      }
      img.src = svgUrl
    })
  }

  /**
   * Fallback: export via html-to-canvas style DOM capture.
   */
  private static async exportViaCanvas(
    element: HTMLElement,
    filename?: string,
  ): Promise<void> {
    const canvas = document.createElement('canvas')
    const rect = element.getBoundingClientRect()
    const scale = 2
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')

    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Use foreignObject approach for DOM elements
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${element.innerHTML}</div>
        </foreignObject>
      </svg>
    `
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    return new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob)
            const a = document.createElement('a')
            a.href = pngUrl
            a.download = filename || 'course-map.png'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(pngUrl)
          }
          URL.revokeObjectURL(url)
          resolve()
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      img.src = url
    })
  }

  /**
   * Print the map using the browser's print dialog.
   */
  static printMap(canvasElement: HTMLElement): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const svgElement = canvasElement.querySelector('svg')
    const content = svgElement
      ? new XMLSerializer().serializeToString(svgElement)
      : canvasElement.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Course Map</title>
          <style>
            body { margin: 0; padding: 20px; }
            svg { max-width: 100%; height: auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  /**
   * List shared users for a map (localStorage-backed).
   */
  static listSharedUsers(mapId: string): SharedUser[] {
    return getStoredUsers(mapId)
  }

  /**
   * Add a shared user with permission level.
   */
  static addSharedUser(
    mapId: string,
    email: string,
    name: string,
    permission: SharePermission,
  ): SharedUser {
    const users = getStoredUsers(mapId)
    const existing = users.find((u) => u.email === email)
    if (existing) {
      existing.permission = permission
      saveUsers(mapId, users)
      return existing
    }

    const user: SharedUser = {
      email,
      name,
      permission,
      addedAt: new Date().toISOString(),
    }
    users.push(user)
    saveUsers(mapId, users)
    return user
  }

  /**
   * Remove a shared user.
   */
  static removeSharedUser(mapId: string, email: string): boolean {
    const users = getStoredUsers(mapId)
    const idx = users.findIndex((u) => u.email === email)
    if (idx === -1) return false
    users.splice(idx, 1)
    saveUsers(mapId, users)
    return true
  }
}
