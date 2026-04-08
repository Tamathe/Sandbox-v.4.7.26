import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'

function getEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`[azure-blob-storage] Missing required env var: ${name}`)
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

export async function uploadScript(
  contentHash: string,
  variant: 'base' | '5min' | '15min' | '30min',
  data: unknown,
): Promise<void> {
  const containerClient = getContainerClient()
  const blobPath = `scripts/${contentHash}/${variant}.json`
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)
  const content = JSON.stringify(data)
  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })
}

export async function getScript(
  contentHash: string,
  variant: 'base' | '5min' | '15min' | '30min',
): Promise<unknown | null> {
  const containerClient = getContainerClient()
  const blobPath = `scripts/${contentHash}/${variant}.json`
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)
  try {
    const response = await blockBlobClient.download(0)
    const stream = response.readableStreamBody
    if (!stream) return null
    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<unknown>) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk as Buffer)
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk))
      } else {
        chunks.push(Buffer.from(chunk as ArrayBuffer))
      }
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  } catch (err: unknown) {
    const code =
      (err as { code?: string; statusCode?: number })?.code ??
      (err as { statusCode?: number })?.statusCode
    if (code === 'BlobNotFound' || code === 404) return null
    throw err
  }
}

export async function uploadAudio(
  scriptHash: string,
  voiceAId: string,
  voiceBId: string,
  buffer: Buffer,
): Promise<string> {
  const containerClient = getContainerClient()
  const blobPath = `audio/${scriptHash}/${voiceAId}-${voiceBId}.mp3`
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: 'audio/mpeg',
      blobCacheControl: 'public, max-age=2592000',
    },
  })
  return getAudioCdnUrl(scriptHash, voiceAId, voiceBId)
}

export function getAudioCdnUrl(
  scriptHash: string,
  voiceAId: string,
  voiceBId: string,
): string {
  const cdnHostname = getEnv('AZURE_CDN_HOSTNAME')
  return `https://${cdnHostname}/audio/${scriptHash}/${voiceAId}-${voiceBId}.mp3`
}

export async function invalidateRender(
  scriptHash: string,
  voiceAId: string,
  voiceBId: string,
): Promise<void> {
  const containerClient = getContainerClient()
  const blobPath = `audio/${scriptHash}/${voiceAId}-${voiceBId}.mp3`
  const blobClient = containerClient.getBlobClient(blobPath)
  await blobClient.setHTTPHeaders({ blobCacheControl: 'no-cache' })
}
