/**
 * Document Provider — abstraction layer for document storage.
 *
 * Phase 1: LocalDocumentProvider stores in Prisma (DB).
 * Phase 2: GraphDocumentProvider syncs to OneDrive via Microsoft Graph API.
 *
 * Usage:
 *   const provider = getDocumentProvider()
 *   if (provider.isAvailable()) await provider.uploadToOneDrive(...)
 */

import {
  graphJsonRequest,
  getGraphAccessToken,
  getGraphRuntimeDiagnostics,
  getGraphPrincipalForUser,
  buildGraphUserPath,
} from '../assistant/graph-client'
import { prisma } from '../prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OneDriveSyncInput {
  documentId: string
  uploaderId: string
  fileName: string
  mimeType: string
  fileContent: Buffer | Uint8Array
  folder?: string
}

export interface OneDriveSyncResult {
  fileId: string
  webUrl: string
}

export interface DocumentProvider {
  uploadToOneDrive(input: OneDriveSyncInput): Promise<OneDriveSyncResult>
  getOneDriveUrl(fileId: string, userId: string): Promise<string | null>
  isAvailable(): boolean
}

// ---------------------------------------------------------------------------
// Local provider (no-op — DB-only storage)
// ---------------------------------------------------------------------------

class LocalDocumentProvider implements DocumentProvider {
  async uploadToOneDrive(): Promise<OneDriveSyncResult> {
    throw new Error('OneDrive not available — Azure Graph credentials not configured')
  }

  async getOneDriveUrl(): Promise<string | null> {
    return null
  }

  isAvailable(): boolean {
    return false
  }
}

// ---------------------------------------------------------------------------
// Graph provider (OneDrive via Microsoft Graph API)
// ---------------------------------------------------------------------------

class GraphDocumentProvider implements DocumentProvider {
  async uploadToOneDrive(input: OneDriveSyncInput): Promise<OneDriveSyncResult> {
    const userPrincipal = await getGraphPrincipalForUser(input.uploaderId)
    const folder = input.folder || 'Sandbox/Documents'

    // Upload via PUT to /drive/root:/{path}/{filename}:/content
    // This creates the file (or overwrites if it exists)
    const uploadPath = `${buildGraphUserPath(userPrincipal)}/drive/root:/${folder}/${input.fileName}:/content`

    const accessToken = await getGraphAccessToken()
    const config = getGraphRuntimeDiagnostics()
    const url = `${config.baseUrl}${uploadPath}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': input.mimeType,
      },
      body: new Uint8Array(input.fileContent),
    })

    if (!response.ok) {
      const payload = await response.text()
      throw new Error(`OneDrive upload failed (${response.status}): ${payload}`)
    }

    const result = await response.json() as { id: string; webUrl?: string }

    // Update document record with OneDrive info
    await prisma.document.update({
      where: { id: input.documentId },
      data: {
        oneDriveFileId: result.id,
        oneDriveUrl: result.webUrl ?? null,
        oneDriveSyncedAt: new Date(),
        storageKey: 'onedrive',
      },
    })

    return {
      fileId: result.id,
      webUrl: result.webUrl ?? '',
    }
  }

  async getOneDriveUrl(fileId: string, userId: string): Promise<string | null> {
    try {
      const userPrincipal = await getGraphPrincipalForUser(userId)
      const path = `${buildGraphUserPath(userPrincipal)}/drive/items/${fileId}`
      const item = await graphJsonRequest<{ webUrl?: string }>(path)
      return item.webUrl ?? null
    } catch {
      return null
    }
  }

  isAvailable(): boolean {
    return true
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function graphCredentialsPresent(): boolean {
  return !!(
    process.env.AZURE_GRAPH_CLIENT_ID &&
    process.env.AZURE_GRAPH_CLIENT_SECRET &&
    process.env.AZURE_GRAPH_TENANT_ID
  )
}

export function getDocumentProvider(): DocumentProvider {
  if (graphCredentialsPresent()) return new GraphDocumentProvider()
  return new LocalDocumentProvider()
}
