'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MapPin,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Send,
  X,
  Filter,
  Plus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  createAnnotation,
  getAnnotations,
  addReply,
  getReplies,
  resolveAnnotation,
  reopenAnnotation,
  deleteAnnotation,
  type Annotation,
  type AnnotationReply,
  type AnnotationFilter,
} from '../../lib/course-map/annotation-service'

// ── Props ────────────────────────────────────────────────────────────────────

interface AnnotationLayerProps {
  active: boolean
  courseMapId: string
  userEmail: string
  userName: string
  onAnnotationCountChange?: (counts: Map<string, number>) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AnnotationLayer({
  active,
  courseMapId,
  userEmail,
  userName,
  onAnnotationCountChange,
}: AnnotationLayerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [filter, setFilter] = useState<AnnotationFilter>('all')
  const [addMode, setAddMode] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replies, setReplies] = useState<AnnotationReply[]>([])
  const [replyText, setReplyText] = useState('')
  const [newAnnotationText, setNewAnnotationText] = useState('')
  const replyInputRef = useRef<HTMLInputElement>(null)

  // ── Load annotations ───────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    const list = getAnnotations(courseMapId, filter)
    setAnnotations(list)

    // Compute node counts for badge display
    const counts = new Map<string, number>()
    const all = getAnnotations(courseMapId, 'all')
    for (const a of all) {
      if (a.targetType === 'node' && a.targetId) {
        counts.set(a.targetId, (counts.get(a.targetId) || 0) + 1)
      }
    }
    onAnnotationCountChange?.(counts)
  }, [courseMapId, filter, onAnnotationCountChange])

  useEffect(() => {
    if (!active) return
    refresh()
  }, [active, refresh])

  // ── Load replies when expanding ────────────────────────────────────────────

  useEffect(() => {
    if (!expandedId) {
      setReplies([])
      return
    }
    setReplies(getReplies(courseMapId, expandedId))
  }, [expandedId, courseMapId])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!addMode || !newAnnotationText.trim()) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    createAnnotation(courseMapId, {
      targetType: 'canvas',
      targetId: null,
      x, y,
      text: newAnnotationText.trim(),
      authorEmail: userEmail,
      authorName: userName,
    })
    setAddMode(false)
    setNewAnnotationText('')
    refresh()
  }, [addMode, newAnnotationText, courseMapId, userEmail, userName, refresh])

  const handleReply = useCallback(() => {
    if (!expandedId || !replyText.trim()) return
    addReply(courseMapId, expandedId, {
      text: replyText.trim(),
      authorEmail: userEmail,
      authorName: userName,
    })
    setReplyText('')
    setReplies(getReplies(courseMapId, expandedId))
    refresh()
  }, [expandedId, replyText, courseMapId, userEmail, userName, refresh])

  const handleResolve = useCallback((id: string) => {
    resolveAnnotation(courseMapId, id)
    setExpandedId(null)
    refresh()
  }, [courseMapId, refresh])

  const handleReopen = useCallback((id: string) => {
    reopenAnnotation(courseMapId, id)
    refresh()
  }, [courseMapId, refresh])

  const handleDelete = useCallback((id: string) => {
    deleteAnnotation(courseMapId, id)
    setExpandedId(null)
    refresh()
  }, [courseMapId, refresh])

  if (!active) return null

  const unresolvedCount = annotations.filter((a) => !a.resolved).length

  return (
    <>
      {/* Click-capture overlay for placing annotations */}
      {addMode && (
        <div
          className="absolute inset-0 z-29 cursor-crosshair"
          onClick={handleCanvasClick}
        />
      )}

      {/* Annotation pins on canvas */}
      {annotations.map((ann) => (
        <div
          key={ann.id}
          className="absolute z-30 pointer-events-auto"
          style={{ left: ann.x - 12, top: ann.y - 24 }}
        >
          <button
            onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
            className={`flex items-center justify-center size-6 rounded-full shadow-md border-2 transition-all hover:scale-110 ${
              ann.resolved
                ? 'bg-green-100 border-green-400 text-green-600'
                : 'bg-red-100 border-red-400 text-red-600'
            }`}
            title={ann.text}
          >
            {ann.resolved ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <MapPin className="size-3.5" />
            )}
          </button>
          {ann.replyCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#0033A0] text-[8px] font-bold text-white">
              {ann.replyCount}
            </span>
          )}

          {/* Expanded thread popover */}
          {expandedId === ann.id && (
            <div className="absolute top-8 left-0 w-72 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-gray-500" />
                  <span className="text-xs font-bold text-gray-700">Thread</span>
                  {ann.resolved && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-100 text-green-700 rounded-full">Resolved</span>
                  )}
                </div>
                <button onClick={() => setExpandedId(null)} className="p-0.5 rounded hover:bg-gray-200 transition-colors">
                  <X className="size-3.5 text-gray-400" />
                </button>
              </div>

              {/* Original annotation */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="size-5 rounded-full bg-[#0033A0] flex items-center justify-center text-[9px] font-bold text-white">
                    {ann.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{ann.authorName}</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{ann.text}</p>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                  {replies.map((reply) => (
                    <div key={reply.id} className="px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="size-4 rounded-full bg-gray-400 flex items-center justify-center text-[8px] font-bold text-white">
                          {reply.authorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">{reply.authorName}</span>
                        <span className="text-[9px] text-gray-400">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 ml-5">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleReply() }}
                  placeholder="Reply..."
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="p-1.5 rounded-lg bg-[#0033A0] text-white hover:bg-[#002878] transition-colors disabled:opacity-40"
                >
                  <Send className="size-3" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100 bg-gray-50">
                {ann.resolved ? (
                  <button
                    onClick={() => handleReopen(ann.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Reopen
                  </button>
                ) : (
                  <button
                    onClick={() => handleResolve(ann.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 className="size-3" />
                    Resolve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Sidebar panel */}
      <div className="absolute top-16 right-3 z-40 w-72 bg-white/95 backdrop-blur border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-4 text-[#0033A0]" />
            <h3 className="text-sm font-extrabold text-gray-900">Annotations</h3>
            {unresolvedCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                {unresolvedCount}
              </span>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
          <Filter className="size-3.5 text-gray-400" />
          {(['all', 'unresolved', 'resolved'] as AnnotationFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                filter === f
                  ? 'bg-[#0033A0] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Add annotation controls */}
        <div className="px-3 py-2 border-b border-gray-100">
          {addMode ? (
            <div className="space-y-1.5">
              <input
                type="text"
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                placeholder="Annotation text..."
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-gray-500 flex-1">Click on the map to place pin</p>
                <button
                  onClick={() => { setAddMode(false); setNewAnnotationText('') }}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddMode(true)}
              className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002878] transition-colors justify-center"
            >
              <Plus className="size-3.5" />
              Add Annotation
            </button>
          )}
        </div>

        {/* Annotation list */}
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {annotations.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-400">
              No annotations yet
            </div>
          ) : (
            annotations.map((ann) => (
              <button
                key={ann.id}
                onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                  expandedId === ann.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {ann.resolved ? (
                    <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                  ) : (
                    <MapPin className="size-3 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-gray-800 truncate">{ann.text}</span>
                </div>
                <div className="flex items-center gap-2 ml-4.5">
                  <span className="text-[10px] text-gray-400">{ann.authorName}</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                  </span>
                  {ann.replyCount > 0 && (
                    <span className="text-[10px] text-[#0033A0] font-semibold">
                      {ann.replyCount} {ann.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
