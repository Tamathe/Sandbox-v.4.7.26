import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import crypto from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
}

function getEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`[attachment-service] Missing required env var: ${name}`)
  return val
}

function getContainerClient() {
  const accountName = getEnv('AZURE_STORAGE_ACCOUNT_NAME')
  const accountKey = getEnv('AZURE_STORAGE_ACCOUNT_KEY')
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? 'sandbox-audio'

  const credential = new StorageSharedKeyCredential(accountName, accountKey)
  const serviceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential,
  )
  return serviceClient.getContainerClient(containerName)
}

export interface UploadResult {
  url: string
  name: string
  type: string
}

/**
 * Upload a file to Azure Blob Storage for message attachments.
 * Returns the public URL, original filename, and MIME type.
 */
export async function uploadAttachment(
  file: File,
): Promise<UploadResult | { error: string; status: number }> {
  // Validate file type
  if (!ALLOWED_TYPES[file.type]) {
    return {
      error: `File type "${file.type}" is not allowed. Allowed: images (jpg, png, gif, webp), documents (pdf, doc, docx, txt).`,
      status: 400,
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File size exceeds 10MB limit.', status: 400 }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Generate unique blob path
  const hash = crypto.randomBytes(8).toString('hex')
  const ext = ALLOWED_TYPES[file.type]
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blobPath = `attachments/${hash}-${safeName}${safeName.endsWith(ext) ? '' : ext}`

  const containerClient = getContainerClient()
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: file.type,
      blobCacheControl: 'public, max-age=31536000',
    },
  })

  // Build URL — use CDN hostname if available, else direct blob URL
  const cdnHostname = process.env.AZURE_CDN_HOSTNAME
  const accountName = getEnv('AZURE_STORAGE_ACCOUNT_NAME')
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? 'sandbox-audio'

  const url = cdnHostname
    ? `https://${cdnHostname}/${blobPath}`
    : `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}`

  return {
    url,
    name: file.name,
    type: file.type,
  }
}

/**
 * Check if a MIME type is an image type.
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}
