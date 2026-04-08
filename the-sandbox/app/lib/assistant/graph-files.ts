import {
  buildGraphUserPath,
  getGraphPrincipalForUser,
  getGraphRuntimeDiagnostics,
  graphJsonRequest,
  recordGraphSyncSuccess,
} from './graph-client'
import type { FileProvider, FileSearchResult } from './providers'

type GraphDriveItem = {
  id: string
  name?: string | null
  webUrl?: string | null
  lastModifiedDateTime?: string | null
  file?: { mimeType?: string | null } | null
}

type GraphDriveSearchResponse = {
  value?: GraphDriveItem[]
}

function buildDriveSearchPath(
  driveBasePath: string,
  query: string,
  topK: number,
) {
  const encodedQuery = encodeURIComponent(query.replace(/'/g, "''"))
  const params = new URLSearchParams({
    $top: String(Math.min(Math.max(topK, 1), 10)),
    $select: 'id,name,webUrl,lastModifiedDateTime,file',
  })

  return `${driveBasePath}/root/search(q='${encodedQuery}')?${params.toString()}`
}

function buildResult(
  item: GraphDriveItem,
  index: number,
  locationLabel: string,
  source: string,
): FileSearchResult {
  const modifiedAt = item.lastModifiedDateTime
    ? new Date(item.lastModifiedDateTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown'
  const mimeType = item.file?.mimeType ?? 'unknown type'

  return {
    id: item.id,
    title: item.name?.trim() || 'Untitled file',
    content: `${locationLabel} file (${mimeType}). Last modified ${modifiedAt}. ${item.webUrl ? `Open in Microsoft 365: ${item.webUrl}` : 'No web preview URL was returned.'}`,
    source,
    sourceLabel: `${locationLabel}: ${item.name?.trim() || 'Untitled file'}`,
    relevance: Math.max(0.2, 1 - index * 0.1),
  }
}

async function searchDrive(
  path: string,
  locationLabel: string,
  source: string,
) {
  const response = await graphJsonRequest<GraphDriveSearchResponse>(path)
  return (response.value ?? []).map((item, index) =>
    buildResult(item, index, locationLabel, source),
  )
}

export class GraphFileProvider implements FileProvider {
  async searchDocuments(
    userId: string,
    query: string,
    topK = 5,
  ): Promise<FileSearchResult[]> {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return []

    const userPrincipal = await getGraphPrincipalForUser(userId)
    const diagnostics = getGraphRuntimeDiagnostics()

    const searches: Promise<FileSearchResult[]>[] = [
      searchDrive(
        buildDriveSearchPath(
          `${buildGraphUserPath(userPrincipal)}/drive`,
          trimmedQuery,
          topK,
        ),
        'OneDrive',
        `onedrive:${userPrincipal}`,
      ),
    ]

    if (diagnostics.sharePointSiteId) {
      searches.push(
        searchDrive(
          buildDriveSearchPath(
            `/sites/${encodeURIComponent(diagnostics.sharePointSiteId)}/drive`,
            trimmedQuery,
            topK,
          ),
          'SharePoint',
          `sharepoint:${diagnostics.sharePointSiteId}`,
        ),
      )
    }

    const resultSets = await Promise.allSettled(searches)
    const merged = resultSets.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    )

    await recordGraphSyncSuccess('SHAREPOINT_ONEDRIVE_FILES')

    return merged
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, topK)
  }
}
