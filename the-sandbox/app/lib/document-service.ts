/**
 * Internal Document Library — Service Layer
 *
 * Handles CRUD, visibility-scoped listing, text search, versioning,
 * and download with permission checks.
 *
 * Storage: DB-backed (fileContent Bytes column) as Azure Blob isn't configured yet.
 */

import { prisma } from './prisma'
import { extractPdfText } from './pdf-extract'
import { getDocumentProvider } from './integrations/document-provider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadMetadata {
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  description?: string
  tags?: string[]
  visibility?: string
  department?: string
}

interface ListFilters {
  visibility?: string
  tags?: string[]
  search?: string
}

interface UpdateFields {
  title?: string
  description?: string
  tags?: string[]
  visibility?: string
  department?: string
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadDocument(
  uploaderId: string,
  file: Buffer,
  metadata: UploadMetadata,
) {
  const textContent = await extractTextContent(file, metadata.mimeType)

  const doc = await prisma.document.create({
    data: {
      uploaderId,
      title: metadata.title,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      mimeType: metadata.mimeType,
      description: metadata.description ?? null,
      tags: metadata.tags ?? [],
      visibility: metadata.visibility ?? 'private',
      department: metadata.department ?? null,
      storageKey: 'db',
      fileContent: new Uint8Array(file),
      textContent,
    },
    select: documentMetaSelect,
  })

  // Fire-and-forget: sync to OneDrive if Graph credentials are configured
  const provider = getDocumentProvider()
  if (provider.isAvailable()) {
    provider.uploadToOneDrive({
      documentId: doc.id,
      uploaderId,
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      fileContent: file,
    }).catch((err) => console.error('[DocumentService] OneDrive sync failed:', err))
  }

  return doc
}

// ---------------------------------------------------------------------------
// Download (with permission + counter)
// ---------------------------------------------------------------------------

export async function downloadDocument(
  documentId: string,
  requesterId: string,
  requesterDepartment?: string,
) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  assertCanView(doc, requesterId, requesterDepartment)

  // Increment download count
  await prisma.document.update({
    where: { id: documentId },
    data: { downloadCount: { increment: 1 } },
  })

  return {
    buffer: doc.fileContent,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
  }
}

/** Like downloadDocument but for inline preview — no download count increment */
export async function previewDocument(
  documentId: string,
  requesterId: string,
  requesterDepartment?: string,
) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  assertCanView(doc, requesterId, requesterDepartment)

  return {
    buffer: doc.fileContent,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
  }
}

// ---------------------------------------------------------------------------
// List (visibility-scoped)
// ---------------------------------------------------------------------------

export async function listDocuments(
  requesterId: string,
  requesterDepartment?: string,
  filters: ListFilters = {},
) {
  // Build visibility conditions the requester is allowed to see
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orConditions: any[] = [
    { uploaderId: requesterId }, // always see own docs
    { visibility: 'all_staff' },
  ]
  if (requesterDepartment) {
    orConditions.push({ visibility: 'department', department: requesterDepartment })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { OR: orConditions }

  // Apply optional filters
  if (filters.visibility === 'private') {
    where.uploaderId = requesterId
    where.visibility = 'private'
    delete where.OR
  } else if (filters.visibility === 'department') {
    where.visibility = 'department'
    if (requesterDepartment) where.department = requesterDepartment
    delete where.OR
  } else if (filters.visibility === 'all_staff') {
    where.visibility = 'all_staff'
    delete where.OR
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags }
  }

  if (filters.search) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { textContent: { contains: filters.search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  return prisma.document.findMany({
    where,
    select: documentMetaSelect,
    orderBy: { createdAt: 'desc' },
  })
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchDocuments(
  query: string,
  requesterId: string,
  requesterDepartment?: string,
) {
  return listDocuments(requesterId, requesterDepartment, { search: query })
}

// ---------------------------------------------------------------------------
// Get single document metadata
// ---------------------------------------------------------------------------

export async function getDocument(
  documentId: string,
  requesterId: string,
  requesterDepartment?: string,
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ...documentMetaSelect,
      uploader: { select: { id: true, name: true, email: true, department: true } },
    },
  })
  if (!doc) throw new Error('Document not found')

  assertCanView(doc as VisibilityCheck, requesterId, requesterDepartment)
  return doc
}

// ---------------------------------------------------------------------------
// Update (uploader only)
// ---------------------------------------------------------------------------

export async function updateDocument(
  documentId: string,
  requesterId: string,
  updates: UpdateFields,
) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')
  if (doc.uploaderId !== requesterId) throw new Error('Only the uploader can update this document')

  return prisma.document.update({
    where: { id: documentId },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      ...(updates.department !== undefined && { department: updates.department }),
    },
    select: documentMetaSelect,
  })
}

// ---------------------------------------------------------------------------
// Delete (uploader only)
// ---------------------------------------------------------------------------

export async function deleteDocument(documentId: string, requesterId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')
  if (doc.uploaderId !== requesterId) throw new Error('Only the uploader can delete this document')

  await prisma.document.delete({ where: { id: documentId } })
  return { success: true }
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

export async function createNewVersion(
  documentId: string,
  file: Buffer,
  uploaderId: string,
) {
  const original = await prisma.document.findUnique({ where: { id: documentId } })
  if (!original) throw new Error('Original document not found')

  // Find root document (follow parentId chain)
  const rootId = original.parentId ?? original.id

  // Find highest version in the chain
  const latest = await prisma.document.findFirst({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (latest?.version ?? original.version) + 1
  const textContent = await extractTextContent(file, original.mimeType)

  const versionDoc = await prisma.document.create({
    data: {
      uploaderId,
      title: original.title,
      fileName: original.fileName,
      fileSize: file.length,
      mimeType: original.mimeType,
      description: original.description,
      tags: original.tags,
      visibility: original.visibility,
      department: original.department,
      storageKey: 'db',
      fileContent: new Uint8Array(file),
      textContent,
      version: nextVersion,
      parentId: rootId,
    },
    select: documentMetaSelect,
  })

  // Fire-and-forget: sync new version to OneDrive
  const provider = getDocumentProvider()
  if (provider.isAvailable()) {
    const versionedName = original.fileName.replace(/(\.[^.]+)$/, ` v${nextVersion}$1`)
    provider.uploadToOneDrive({
      documentId: versionDoc.id,
      uploaderId,
      fileName: versionedName,
      mimeType: original.mimeType,
      fileContent: file,
    }).catch((err) => console.error('[DocumentService] OneDrive version sync failed:', err))
  }

  return versionDoc
}

export async function getVersionHistory(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  const rootId = doc.parentId ?? doc.id

  return prisma.document.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    select: documentMetaSelect,
    orderBy: { version: 'desc' },
  })
}

// ---------------------------------------------------------------------------
// Text extraction (for full-text search)
// ---------------------------------------------------------------------------

/** Best-effort text extraction from uploaded files. Returns null for unsupported types. */
async function extractTextContent(file: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === 'application/pdf') {
      const result = await extractPdfText(file)
      // Limit to ~50K chars to avoid bloating the DB
      return result.text ? result.text.slice(0, 50_000) : null
    }
    if (mimeType.startsWith('text/')) {
      return file.toString('utf-8').slice(0, 50_000)
    }
  } catch (err) {
    console.error('[DocumentService] Text extraction failed:', err)
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VisibilityCheck {
  uploaderId: string
  visibility: string
  department: string | null
}

function assertCanView(
  doc: VisibilityCheck,
  requesterId: string,
  requesterDepartment?: string,
) {
  if (doc.uploaderId === requesterId) return
  if (doc.visibility === 'all_staff') return
  if (doc.visibility === 'department' && doc.department && doc.department === requesterDepartment) return
  if (doc.visibility === 'private') throw new Error('Access denied')
  throw new Error('Access denied')
}

const documentMetaSelect = {
  id: true,
  uploaderId: true,
  title: true,
  description: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  storageKey: true,
  tags: true,
  visibility: true,
  department: true,
  version: true,
  parentId: true,
  downloadCount: true,
  oneDriveUrl: true,
  createdAt: true,
  updatedAt: true,
}
