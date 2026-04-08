'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PenTool,
  Minus,
  Square,
  Circle,
  ArrowRight,
  StickyNote,
  Eraser,
  Palette,
  Undo2,
  Redo2,
  Trash2,
  X,
  Download,
  Upload,
} from 'lucide-react'
import {
  WhiteboardEngine,
  type DrawingTool,
  type StickyNoteData,
  type RemoteCursor,
  getCursorColor,
} from '../../lib/course-map/whiteboard-engine'

// ── Props ────────────────────────────────────────────────────────────────────

interface WhiteboardOverlayProps {
  active: boolean
  onClose: () => void
  userEmail: string
  userName: string
  courseMapId: string
}

// ── Preset colors ────────────────────────────────────────────────────────────

const STROKE_COLORS = [
  '#0033A0', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#000000', '#6b7280', '#ffffff',
]

const NOTE_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa',
]

const STROKE_WIDTHS = [2, 4, 6, 10]

// ── Tool config ──────────────────────────────────────────────────────────────

const TOOLS: { tool: DrawingTool; icon: typeof PenTool; label: string }[] = [
  { tool: 'pen', icon: PenTool, label: 'Pen' },
  { tool: 'line', icon: Minus, label: 'Line' },
  { tool: 'rect', icon: Square, label: 'Rectangle' },
  { tool: 'ellipse', icon: Circle, label: 'Ellipse' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function WhiteboardOverlay({
  active,
  onClose,
  userEmail,
  userName,
  courseMapId,
}: WhiteboardOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<WhiteboardEngine>(new WhiteboardEngine())
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen')
  const [strokeColor, setStrokeColor] = useState('#0033A0')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [noteColor, setNoteColor] = useState('#fef08a')
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([])
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const drawingRef = useRef(false)

  // Sync engine with canvas
  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const engine = engineRef.current

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      engine.renderAll()
    }

    engine.attach(canvas, () => {
      setStickyNotes(engine.getStickyNotes())
      setCanUndo(engine.canUndo)
      setCanRedo(engine.canRedo)
      setRemoteCursors(engine.getRemoteCursors())
    })

    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      engine.detach()
    }
  }, [active])

  // Cursor broadcast polling
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setRemoteCursors(engineRef.current.getRemoteCursors())
    }, 3000)
    return () => clearInterval(interval)
  }, [active])

  // ── Canvas event helpers ───────────────────────────────────────────────────

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (addingNote) {
      const pt = getCanvasPoint(e)
      engineRef.current.addStickyNote(pt.x, pt.y, userEmail, noteColor)
      setAddingNote(false)
      return
    }
    const pt = getCanvasPoint(e)
    engineRef.current.beginStroke(activeTool, pt, strokeColor, strokeWidth)
    drawingRef.current = true
    setIsDrawing(true)
  }, [activeTool, strokeColor, strokeWidth, addingNote, noteColor, userEmail, getCanvasPoint])

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    if (!drawingRef.current) return
    const pt = getCanvasPoint(e)
    engineRef.current.continueStroke(pt)
  }, [getCanvasPoint])

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return
    engineRef.current.endStroke()
    drawingRef.current = false
    setIsDrawing(false)
  }, [])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        engineRef.current.undo()
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        engineRef.current.redo()
      } else if (e.key === 'Escape') {
        setAddingNote(false)
        setClearConfirm(false)
        setShowColorPicker(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active])

  // ── Export / Import ────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const json = engineRef.current.exportWhiteboard()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whiteboard-${courseMapId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [courseMapId])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        engineRef.current.importWhiteboard(reader.result as string)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  if (!active) return null

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* Canvas — captures pointer events */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-auto"
        style={{ cursor: addingNote ? 'crosshair' : isDrawing ? 'crosshair' : 'crosshair' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      />

      {/* Sticky notes rendered as positioned divs */}
      {stickyNotes.map((note) => (
        <div
          key={note.id}
          className="absolute pointer-events-auto rounded-lg shadow-lg border border-gray-300 flex flex-col"
          style={{
            left: note.x,
            top: note.y,
            width: note.width,
            height: note.height,
            backgroundColor: note.color,
            zIndex: 31,
          }}
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
            <span className="text-[10px] font-semibold text-gray-600 truncate">{note.createdBy}</span>
            <button
              onClick={() => engineRef.current.removeStickyNote(note.id)}
              className="p-0.5 rounded hover:bg-black/10 transition-colors"
            >
              <X className="size-3 text-gray-500" />
            </button>
          </div>
          <div
            contentEditable
            suppressContentEditableWarning
            className="flex-1 p-2 text-xs text-gray-800 outline-none overflow-auto"
            onBlur={(e) =>
              engineRef.current.updateStickyNote(note.id, { text: e.currentTarget.textContent || '' })
            }
          >
            {note.text}
          </div>
        </div>
      ))}

      {/* Remote cursors */}
      {remoteCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none"
          style={{ left: cursor.x, top: cursor.y, zIndex: 32 }}
        >
          <div
            className="size-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: cursor.color }}
          />
          <span
            className="absolute left-4 top-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </span>
        </div>
      ))}

      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur border-2 border-gray-200 rounded-xl p-1.5 shadow-lg z-40">
        {/* Drawing tools */}
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => { setActiveTool(tool); setAddingNote(false) }}
            title={label}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === tool && !addingNote
                ? 'bg-[#0033A0] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="size-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Sticky note */}
        <button
          onClick={() => { setAddingNote(true); setActiveTool('pen') }}
          title="Add Sticky Note — click on canvas to place"
          className={`p-2 rounded-lg transition-colors ${
            addingNote ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <StickyNote className="size-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            title="Color & Width"
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <div className="size-4 rounded-full border-2 border-gray-300" style={{ backgroundColor: strokeColor }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-2 left-0 bg-white border-2 border-gray-200 rounded-xl p-3 shadow-lg z-50 min-w-[180px]">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Stroke Color</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {STROKE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`size-6 rounded-full border-2 transition-transform ${
                      strokeColor === c ? 'border-[#0033A0] scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Stroke Width</p>
              <div className="flex items-center gap-2 mb-3">
                {STROKE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`flex items-center justify-center size-8 rounded-lg border-2 transition-colors ${
                      strokeWidth === w ? 'border-[#0033A0] bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="rounded-full bg-gray-800" style={{ width: w * 2, height: w * 2 }} />
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Note Color</p>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNoteColor(c)}
                    className={`size-6 rounded-full border-2 transition-transform ${
                      noteColor === c ? 'border-[#0033A0] scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => engineRef.current.undo()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          onClick={() => engineRef.current.redo()}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <Redo2 className="size-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Export / Import */}
        <button onClick={handleExport} title="Export whiteboard" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          <Download className="size-4" />
        </button>
        <button onClick={handleImport} title="Import whiteboard" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          <Upload className="size-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Clear All */}
        {clearConfirm ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600 font-semibold">Clear all?</span>
            <button
              onClick={() => { engineRef.current.clearAll(); setClearConfirm(false) }}
              className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setClearConfirm(false)}
              className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setClearConfirm(true)}
            title="Clear All"
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Close whiteboard */}
        <button
          onClick={onClose}
          title="Exit Whiteboard"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Mode indicator */}
      {addingNote && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-lg">
          Click anywhere to place a sticky note
          <button onClick={() => setAddingNote(false)} className="ml-3 underline font-bold">Cancel</button>
        </div>
      )}
    </div>
  )
}
