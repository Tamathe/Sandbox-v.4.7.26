import type {
  TokenResponse,
  User,
  Document,
  DocumentListResponse,
  SearchResponse,
  SearchFilters,
  ConversationListItem,
  Conversation,
  QueryAnalytics,
  DocumentAnalytics,
  UsageAnalytics,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth
  async register(email: string, password: string, fullName: string, hospitalSite?: string): Promise<TokenResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        hospital_site: hospitalSite || null,
      }),
    })
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me')
  }

  // Search
  async search(query: string, conversationId?: string, filters?: SearchFilters): Promise<SearchResponse> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        conversation_id: conversationId || null,
        filters: filters || null,
      }),
    })
  }

  async getSearchHistory(limit = 20): Promise<ConversationListItem[]> {
    return this.request(`/search/history?limit=${limit}`)
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request(`/search/conversations/${id}`)
  }

  // Documents
  async uploadDocument(file: File, metadata: {
    title: string
    document_type?: string
    department?: string
    hospital_site?: string
    tags?: string[]
  }): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', metadata.title)
    if (metadata.document_type) formData.append('document_type', metadata.document_type)
    if (metadata.department) formData.append('department', metadata.department)
    if (metadata.hospital_site) formData.append('hospital_site', metadata.hospital_site)
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags))

    return this.request('/documents/upload', {
      method: 'POST',
      body: formData,
    })
  }

  async listDocuments(params?: {
    status?: string
    document_type?: string
    hospital_site?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const qs = searchParams.toString()
    return this.request(`/documents${qs ? '?' + qs : ''}`)
  }

  async getDocument(id: string): Promise<Document> {
    return this.request(`/documents/${id}`)
  }

  async updateDocument(id: string, data: {
    title?: string
    document_type?: string
    department?: string
    hospital_site?: string
    tags?: string[]
  }): Promise<Document> {
    return this.request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request(`/documents/${id}`, { method: 'DELETE' })
  }

  getDocumentDownloadUrl(id: string): string {
    return `${API_URL}/documents/${id}/download`
  }

  getToken(): string | null {
    return this.token
  }

  // Analytics
  async getQueryAnalytics(): Promise<QueryAnalytics> {
    return this.request('/analytics/queries')
  }

  async getDocumentAnalytics(): Promise<DocumentAnalytics> {
    return this.request('/analytics/documents')
  }

  async getUsageAnalytics(): Promise<UsageAnalytics> {
    return this.request('/analytics/users')
  }
}

export const api = new ApiClient()
