/**
 * Embedding provider abstraction.
 *
 * Current: OpenAI text-embedding-3-small (1536 dimensions)
 * Azure migration: set EMBEDDING_PROVIDER=azure and supply:
 *   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_EMBEDDING_DEPLOYMENT
 */

import OpenAI from 'openai'

export interface EmbeddingProvider {
  readonly dimensions: number
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

class OpenAIEmbedder implements EmbeddingProvider {
  readonly dimensions = 1536
  private client: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for RAG embeddings')
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return res.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    // OpenAI allows up to 2048 inputs per request; use batches of 100 to stay safe
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100)
      const res = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })
      // Response order matches input order
      results.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding))
    }
    return results
  }
}

// ─── Azure OpenAI (future) ───────────────────────────────────────────────────
// When EMBEDDING_PROVIDER=azure, supply:
//   AZURE_OPENAI_ENDPOINT  — e.g. https://<resource>.openai.azure.com
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_EMBEDDING_DEPLOYMENT — e.g. text-embedding-3-small
//
// Azure OpenAI uses the same REST API as OpenAI; the openai SDK supports it
// via baseURL + defaultQuery + defaultHeaders.

class AzureOpenAIEmbedder implements EmbeddingProvider {
  readonly dimensions = 1536
  private client: OpenAI

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    if (!endpoint || !apiKey || !deployment) {
      throw new Error(
        'AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_EMBEDDING_DEPLOYMENT are required'
      )
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': apiKey },
    })
  }

  async embed(text: string): Promise<number[]> {
    // Azure deployment URL already encodes the model; pass any non-empty string
    const res = await this.client.embeddings.create({ model: 'unused', input: text })
    return res.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100)
      const res = await this.client.embeddings.create({ model: 'unused', input: batch })
      results.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding))
    }
    return results
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _provider: EmbeddingProvider | null = null

export function getEmbeddingProvider(): EmbeddingProvider {
  if (_provider) return _provider
  if (process.env.EMBEDDING_PROVIDER === 'azure') {
    _provider = new AzureOpenAIEmbedder()
  } else {
    _provider = new OpenAIEmbedder()
  }
  return _provider
}

/** True when an embedding provider can be instantiated (key is present). */
export function embeddingAvailable(): boolean {
  if (process.env.EMBEDDING_PROVIDER === 'azure') {
    return !!(
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )
  }
  return !!process.env.OPENAI_API_KEY
}
