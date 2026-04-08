// ── Whiteboard Engine ────────────────────────────────────────────────────────
// Manages freeform drawing state on an HTML5 Canvas overlay for the course map.

export type DrawingTool = 'pen' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'eraser'

export interface Point {
  x: number
  y: number
}

export interface DrawingStroke {
  id: string
  tool: DrawingTool
  points: Point[]
  color: string
  strokeWidth: number
  timestamp: number
}

export interface StickyNoteData {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  createdBy: string
  timestamp: number
}

export interface RemoteCursor {
  userId: string
  userName: string
  x: number
  y: number
  color: string
  lastSeen: number
}

interface WhiteboardState {
  strokes: DrawingStroke[]
  stickyNotes: StickyNoteData[]
}

interface UndoAction {
  type: 'add_stroke' | 'remove_stroke' | 'add_note' | 'remove_note' | 'move_note' | 'edit_note'
  data: unknown
}

// ── Color helpers ────────────────────────────────────────────────────────────

const CURSOR_COLORS = [
  '#0033A0', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#6366f1',
]

export function getCursorColor(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length]
}

// ── WhiteboardEngine ─────────────────────────────────────────────────────────

export class WhiteboardEngine {
  private strokes: DrawingStroke[] = []
  private stickyNotes: StickyNoteData[] = []
  private undoStack: UndoAction[] = []
  private redoStack: UndoAction[] = []
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private currentStroke: DrawingStroke | null = null
  private remoteCursors: Map<string, RemoteCursor> = new Map()
  private onChange: (() => void) | null = null

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  attach(canvas: HTMLCanvasElement, onChange?: () => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (onChange) this.onChange = onChange
  }

  detach() {
    this.canvas = null
    this.ctx = null
    this.onChange = null
  }

  private notify() {
    this.onChange?.()
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  beginStroke(tool: DrawingTool, point: Point, color: string, strokeWidth: number) {
    this.currentStroke = {
      id: crypto.randomUUID(),
      tool,
      points: [point],
      color,
      strokeWidth,
      timestamp: Date.now(),
    }
  }

  continueStroke(point: Point) {
    if (!this.currentStroke) return
    this.currentStroke.points.push(point)
    this.renderAll()
  }

  endStroke(): DrawingStroke | null {
    if (!this.currentStroke) return null

    if (this.currentStroke.tool === 'eraser') {
      const erased = this.eraseAt(this.currentStroke.points)
      this.currentStroke = null
      if (erased.length > 0) this.notify()
      return null
    }

    const stroke = { ...this.currentStroke }
    this.strokes.push(stroke)
    this.undoStack.push({ type: 'add_stroke', data: stroke })
    this.redoStack = []
    this.currentStroke = null
    this.notify()
    return stroke
  }

  private eraseAt(points: Point[]): DrawingStroke[] {
    const threshold = 12
    const erased: DrawingStroke[] = []
    this.strokes = this.strokes.filter((s) => {
      for (const ep of points) {
        for (const sp of s.points) {
          const dx = ep.x - sp.x
          const dy = ep.y - sp.y
          if (Math.sqrt(dx * dx + dy * dy) < threshold) {
            erased.push(s)
            this.undoStack.push({ type: 'remove_stroke', data: s })
            this.redoStack = []
            return false
          }
        }
      }
      return true
    })
    if (erased.length > 0) this.renderAll()
    return erased
  }

  // ── Sticky Notes ───────────────────────────────────────────────────────────

  addStickyNote(x: number, y: number, createdBy: string, color = '#fef08a'): StickyNoteData {
    const note: StickyNoteData = {
      id: crypto.randomUUID(),
      x, y,
      width: 160,
      height: 120,
      text: '',
      color,
      createdBy,
      timestamp: Date.now(),
    }
    this.stickyNotes.push(note)
    this.undoStack.push({ type: 'add_note', data: note })
    this.redoStack = []
    this.notify()
    return note
  }

  updateStickyNote(id: string, updates: Partial<Pick<StickyNoteData, 'x' | 'y' | 'text' | 'color'>>) {
    const note = this.stickyNotes.find((n) => n.id === id)
    if (!note) return
    const prev = { ...note }
    Object.assign(note, updates)
    this.undoStack.push({ type: 'edit_note', data: { prev, next: { ...note } } })
    this.redoStack = []
    this.notify()
  }

  removeStickyNote(id: string) {
    const idx = this.stickyNotes.findIndex((n) => n.id === id)
    if (idx === -1) return
    const removed = this.stickyNotes.splice(idx, 1)[0]
    this.undoStack.push({ type: 'remove_note', data: removed })
    this.redoStack = []
    this.notify()
  }

  getStickyNotes(): StickyNoteData[] {
    return [...this.stickyNotes]
  }

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  undo() {
    const action = this.undoStack.pop()
    if (!action) return
    this.redoStack.push(action)

    switch (action.type) {
      case 'add_stroke': {
        const s = action.data as DrawingStroke
        this.strokes = this.strokes.filter((st) => st.id !== s.id)
        break
      }
      case 'remove_stroke': {
        const s = action.data as DrawingStroke
        this.strokes.push(s)
        break
      }
      case 'add_note': {
        const n = action.data as StickyNoteData
        this.stickyNotes = this.stickyNotes.filter((sn) => sn.id !== n.id)
        break
      }
      case 'remove_note': {
        const n = action.data as StickyNoteData
        this.stickyNotes.push(n)
        break
      }
      case 'edit_note': {
        const { prev } = action.data as { prev: StickyNoteData; next: StickyNoteData }
        const idx = this.stickyNotes.findIndex((sn) => sn.id === prev.id)
        if (idx !== -1) this.stickyNotes[idx] = { ...prev }
        break
      }
    }
    this.renderAll()
    this.notify()
  }

  redo() {
    const action = this.redoStack.pop()
    if (!action) return
    this.undoStack.push(action)

    switch (action.type) {
      case 'add_stroke': {
        const s = action.data as DrawingStroke
        this.strokes.push(s)
        break
      }
      case 'remove_stroke': {
        const s = action.data as DrawingStroke
        this.strokes = this.strokes.filter((st) => st.id !== s.id)
        break
      }
      case 'add_note': {
        const n = action.data as StickyNoteData
        this.stickyNotes.push(n)
        break
      }
      case 'remove_note': {
        const n = action.data as StickyNoteData
        this.stickyNotes = this.stickyNotes.filter((sn) => sn.id !== n.id)
        break
      }
      case 'edit_note': {
        const { next } = action.data as { prev: StickyNoteData; next: StickyNoteData }
        const idx = this.stickyNotes.findIndex((sn) => sn.id === next.id)
        if (idx !== -1) this.stickyNotes[idx] = { ...next }
        break
      }
    }
    this.renderAll()
    this.notify()
  }

  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }

  // ── Remote cursors ─────────────────────────────────────────────────────────

  updateRemoteCursor(userId: string, userName: string, x: number, y: number, color: string) {
    this.remoteCursors.set(userId, { userId, userName, x, y, color, lastSeen: Date.now() })
    this.notify()
  }

  removeRemoteCursor(userId: string) {
    this.remoteCursors.delete(userId)
    this.notify()
  }

  getRemoteCursors(): RemoteCursor[] {
    const now = Date.now()
    // Prune stale cursors (>15s)
    for (const [id, c] of this.remoteCursors) {
      if (now - c.lastSeen > 15_000) this.remoteCursors.delete(id)
    }
    return Array.from(this.remoteCursors.values())
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  clearAll() {
    const prevStrokes = [...this.strokes]
    const prevNotes = [...this.stickyNotes]
    this.strokes = []
    this.stickyNotes = []
    // Batch undo: push each as individual actions so undo restores them
    for (const s of prevStrokes) {
      this.undoStack.push({ type: 'remove_stroke', data: s })
    }
    for (const n of prevNotes) {
      this.undoStack.push({ type: 'remove_note', data: n })
    }
    this.redoStack = []
    this.renderAll()
    this.notify()
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  exportWhiteboard(): string {
    const state: WhiteboardState = {
      strokes: [...this.strokes],
      stickyNotes: [...this.stickyNotes],
    }
    return JSON.stringify(state)
  }

  importWhiteboard(data: string) {
    try {
      const state: WhiteboardState = JSON.parse(data)
      this.strokes = state.strokes || []
      this.stickyNotes = state.stickyNotes || []
      this.undoStack = []
      this.redoStack = []
      this.renderAll()
      this.notify()
    } catch {
      console.error('[WhiteboardEngine] Failed to import whiteboard data')
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  renderAll() {
    if (!this.ctx || !this.canvas) return
    const ctx = this.ctx
    const { width, height } = this.canvas
    ctx.clearRect(0, 0, width, height)

    // Draw completed strokes
    for (const stroke of this.strokes) {
      this.drawStroke(ctx, stroke)
    }

    // Draw in-progress stroke
    if (this.currentStroke && this.currentStroke.tool !== 'eraser') {
      this.drawStroke(ctx, this.currentStroke)
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawingStroke) {
    if (stroke.points.length === 0) return
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (stroke.tool) {
      case 'pen':
        this.drawFreeform(ctx, stroke.points)
        break
      case 'line':
        this.drawLine(ctx, stroke.points)
        break
      case 'rect':
        this.drawRect(ctx, stroke.points)
        break
      case 'ellipse':
        this.drawEllipse(ctx, stroke.points)
        break
      case 'arrow':
        this.drawArrow(ctx, stroke.points)
        break
    }
  }

  private drawFreeform(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
  }

  private drawLine(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return
    const start = points[0]
    const end = points[points.length - 1]
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }

  private drawRect(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return
    const start = points[0]
    const end = points[points.length - 1]
    ctx.beginPath()
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y)
    ctx.stroke()
  }

  private drawEllipse(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return
    const start = points[0]
    const end = points[points.length - 1]
    const cx = (start.x + end.x) / 2
    const cy = (start.y + end.y) / 2
    const rx = Math.abs(end.x - start.x) / 2
    const ry = Math.abs(end.y - start.y) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawArrow(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return
    const start = points[0]
    const end = points[points.length - 1]
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    // Arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headLen = 14
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6),
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6),
    )
    ctx.stroke()
  }
}
