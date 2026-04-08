from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Auth ──

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "member"
    hospital_site: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    hospital_site: Optional[str]
    is_active: bool
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Documents ──

class DocumentUploadMeta(BaseModel):
    title: str
    document_type: Optional[str] = None
    department: Optional[str] = None
    hospital_site: Optional[str] = None
    tags: Optional[list[str]] = None


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    title: str
    document_type: Optional[str]
    department: Optional[str]
    hospital_site: Optional[str]
    version: str
    tags: Optional[list[str]]
    uploaded_by: Optional[str]
    file_size: Optional[int]
    page_count: Optional[int]
    chunk_count: Optional[int]
    status: str
    created_at: str
    updated_at: Optional[str]


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    department: Optional[str] = None
    hospital_site: Optional[str] = None
    tags: Optional[list[str]] = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


# ── Search ──

class SearchFilters(BaseModel):
    document_type: Optional[str] = None
    hospital_site: Optional[str] = None
    department: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    filters: Optional[SearchFilters] = None


class SourceReference(BaseModel):
    document_id: str
    title: str
    section: Optional[str]
    page: Optional[int]
    snippet: str
    relevance: float


class SearchResponse(BaseModel):
    answer: str
    confidence: str  # HIGH, MEDIUM, LOW
    sources: list[SourceReference]
    conversation_id: str
    response_time_ms: int


class ConversationMessage(BaseModel):
    id: str
    query: str
    answer: str
    confidence: Optional[str]
    sources: list[SourceReference]
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    title: Optional[str]
    messages: list[ConversationMessage]
    created_at: str


class ConversationListItem(BaseModel):
    id: str
    title: Optional[str]
    message_count: int
    created_at: str
    updated_at: Optional[str]


# ── Analytics ──

class QueryAnalytics(BaseModel):
    total_queries: int
    queries_today: int
    avg_confidence: Optional[float]
    top_queries: list[dict]
    low_confidence_queries: list[dict]


class DocumentAnalytics(BaseModel):
    total_documents: int
    documents_by_type: dict[str, int]
    most_cited: list[dict]
    recent_uploads: list[dict]


class UsageAnalytics(BaseModel):
    total_users: int
    active_users_today: int
    queries_by_site: dict[str, int]
