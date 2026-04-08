export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'member'
  hospital_site: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Document {
  id: string
  filename: string
  original_filename: string
  title: string
  document_type: string | null
  department: string | null
  hospital_site: string | null
  version: string
  tags: string[] | null
  uploaded_by: string | null
  file_size: number | null
  page_count: number | null
  chunk_count: number | null
  status: string
  created_at: string
  updated_at: string | null
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
}

export interface SourceReference {
  document_id: string
  title: string
  section: string | null
  page: number | null
  snippet: string
  relevance: number
}

export interface SearchResponse {
  answer: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  sources: SourceReference[]
  conversation_id: string
  response_time_ms: number
}

export interface SearchFilters {
  document_type?: string
  hospital_site?: string
  department?: string
}

export interface ConversationListItem {
  id: string
  title: string | null
  message_count: number
  created_at: string
  updated_at: string | null
}

export interface ConversationMessage {
  id: string
  query: string
  answer: string
  confidence: string | null
  sources: SourceReference[]
  created_at: string
}

export interface Conversation {
  id: string
  title: string | null
  messages: ConversationMessage[]
  created_at: string
}

export interface QueryAnalytics {
  total_queries: number
  queries_today: number
  avg_confidence: number | null
  top_queries: { query: string; count: number }[]
  low_confidence_queries: { query: string; confidence: number; date: string }[]
}

export interface DocumentAnalytics {
  total_documents: number
  documents_by_type: Record<string, number>
  most_cited: { document_id: string; title: string; citation_count: number }[]
  recent_uploads: { id: string; title: string; type: string; date: string; status: string }[]
}

export interface UsageAnalytics {
  total_users: number
  active_users_today: number
  queries_by_site: Record<string, number>
}
