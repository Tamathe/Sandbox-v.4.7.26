/**
 * Sandy Universal Agent — Document Library Tools
 *
 * 2 tools:
 * - search_documents: search documents by query + tags
 * - get_document_info: get metadata for a specific document
 */

import type { ToolModule } from '../agent-types'
import { searchDocuments, getDocument } from '../../document-service'
import { prisma } from '../../prisma'

export const documentTools: ToolModule = {
  tools: [
    {
      name: 'search_documents',
      description:
        'Search the internal document library by query and/or tags. Returns document titles, IDs, tags, and metadata. Useful for finding shared files, policies, department resources, or uploaded documents.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for document title or description',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tag filters (e.g. ["policy", "HR"])',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_document_info',
      description:
        'Get metadata for a specific document by its ID. Returns title, description, tags, file info, visibility, version, and download count.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          document_id: {
            type: 'string',
            description: 'The document ID to look up',
          },
        },
        required: ['document_id'],
      },
    },
  ],

  handlers: {
    async search_documents(args, user) {
      const query = (args.query as string) || ''
      const tags = args.tags as string[] | undefined

      // Get user's department from the database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { department: true },
      })

      const documents = await searchDocuments(query, user.id, dbUser?.department ?? undefined)

      // Optionally filter by tags
      let filtered = documents
      if (tags && tags.length > 0) {
        filtered = documents.filter((d) =>
          tags.some((t) => d.tags.includes(t)),
        )
      }

      return {
        count: filtered.length,
        documents: filtered.slice(0, 10).map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          tags: d.tags,
          fileName: d.fileName,
          fileSize: d.fileSize,
          visibility: d.visibility,
          version: d.version,
          downloadCount: d.downloadCount,
          createdAt: d.createdAt,
        })),
      }
    },

    async get_document_info(args, user) {
      const documentId = args.document_id as string

      // Get user's department from the database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { department: true },
      })

      try {
        const doc = await getDocument(documentId, user.id, dbUser?.department ?? undefined)
        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          tags: doc.tags,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          visibility: doc.visibility,
          department: doc.department,
          version: doc.version,
          downloadCount: doc.downloadCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          uploader: doc.uploader,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Document not found' }
      }
    },
  },
}
