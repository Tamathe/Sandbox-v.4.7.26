// ── Annotation Service ────────────────────────────────────────────────────────
// Pin comments to specific nodes/edges/canvas positions with threaded discussions.

export interface Annotation {
  id: string
  courseMapId: string
  targetType: 'node' | 'edge' | 'canvas'
  targetId: string | null
  x: number
  y: number
  text: string
  authorEmail: string
  authorName: string
  resolved: boolean
  deleted: boolean
  createdAt: string
  replyCount: number
}

export interface AnnotationReply {
  id: string
  annotationId: string
  text: string
  authorEmail: string
  authorName: string
  createdAt: string
}

export type AnnotationFilter = 'all' | 'unresolved' | 'resolved'

// ── In-memory store (client-side) ────────────────────────────────────────────
// Uses localStorage persistence keyed by courseMapId for demo mode.

function storageKey(courseMapId: string): string {
  return `sandbox-annotations-${courseMapId}`
}

function replyStorageKey(courseMapId: string): string {
  return `sandbox-annotation-replies-${courseMapId}`
}

function loadAnnotations(courseMapId: string): Annotation[] {
  try {
    const raw = localStorage.getItem(storageKey(courseMapId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAnnotations(courseMapId: string, annotations: Annotation[]) {
  localStorage.setItem(storageKey(courseMapId), JSON.stringify(annotations))
}

function loadReplies(courseMapId: string): AnnotationReply[] {
  try {
    const raw = localStorage.getItem(replyStorageKey(courseMapId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReplies(courseMapId: string, replies: AnnotationReply[]) {
  localStorage.setItem(replyStorageKey(courseMapId), JSON.stringify(replies))
}

// ── Service functions ────────────────────────────────────────────────────────

export function createAnnotation(
  courseMapId: string,
  params: {
    targetType: 'node' | 'edge' | 'canvas'
    targetId: string | null
    x: number
    y: number
    text: string
    authorEmail: string
    authorName: string
  },
): Annotation {
  const annotations = loadAnnotations(courseMapId)
  const annotation: Annotation = {
    id: crypto.randomUUID(),
    courseMapId,
    targetType: params.targetType,
    targetId: params.targetId,
    x: params.x,
    y: params.y,
    text: params.text,
    authorEmail: params.authorEmail,
    authorName: params.authorName,
    resolved: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    replyCount: 0,
  }
  annotations.push(annotation)
  saveAnnotations(courseMapId, annotations)
  return annotation
}

export function getAnnotations(courseMapId: string, filter: AnnotationFilter = 'all'): Annotation[] {
  const annotations = loadAnnotations(courseMapId).filter((a) => !a.deleted)
  switch (filter) {
    case 'unresolved': return annotations.filter((a) => !a.resolved)
    case 'resolved': return annotations.filter((a) => a.resolved)
    default: return annotations
  }
}

export function getAnnotationsByNode(courseMapId: string): Map<string, number> {
  const annotations = loadAnnotations(courseMapId).filter((a) => !a.deleted && a.targetType === 'node' && a.targetId)
  const counts = new Map<string, number>()
  for (const a of annotations) {
    counts.set(a.targetId!, (counts.get(a.targetId!) || 0) + 1)
  }
  return counts
}

export function addReply(
  courseMapId: string,
  annotationId: string,
  params: { text: string; authorEmail: string; authorName: string },
): AnnotationReply {
  const replies = loadReplies(courseMapId)
  const reply: AnnotationReply = {
    id: crypto.randomUUID(),
    annotationId,
    text: params.text,
    authorEmail: params.authorEmail,
    authorName: params.authorName,
    createdAt: new Date().toISOString(),
  }
  replies.push(reply)
  saveReplies(courseMapId, replies)

  // Update reply count on annotation
  const annotations = loadAnnotations(courseMapId)
  const annotation = annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.replyCount = replies.filter((r) => r.annotationId === annotationId).length
    saveAnnotations(courseMapId, annotations)
  }

  return reply
}

export function getReplies(courseMapId: string, annotationId: string): AnnotationReply[] {
  return loadReplies(courseMapId).filter((r) => r.annotationId === annotationId)
}

export function resolveAnnotation(courseMapId: string, annotationId: string) {
  const annotations = loadAnnotations(courseMapId)
  const annotation = annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.resolved = true
    saveAnnotations(courseMapId, annotations)
  }
}

export function reopenAnnotation(courseMapId: string, annotationId: string) {
  const annotations = loadAnnotations(courseMapId)
  const annotation = annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.resolved = false
    saveAnnotations(courseMapId, annotations)
  }
}

export function deleteAnnotation(courseMapId: string, annotationId: string) {
  const annotations = loadAnnotations(courseMapId)
  const annotation = annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.deleted = true
    saveAnnotations(courseMapId, annotations)
  }
}
