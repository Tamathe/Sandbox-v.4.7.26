# KCH Network Document Search (RAG System)

A Retrieval-Augmented Generation system for the Kentucky Children's Hospital network. Enables healthcare providers to search across policies, procedures, guidelines, and documentation using natural language queries.

## Architecture

- **Backend**: Python FastAPI with RAG pipeline
- **Frontend**: Next.js 14 with Tailwind CSS
- **Vector DB**: ChromaDB (local, persistent)
- **Metadata DB**: SQLite
- **Embeddings**: OpenAI text-embedding-3-large
- **LLM**: Claude (claude-sonnet-4-5-20250929 via Anthropic API)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- API keys: Anthropic and OpenAI

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys:
#   ANTHROPIC_API_KEY=sk-ant-...
#   OPENAI_API_KEY=sk-...
#   JWT_SECRET_KEY=<random-string>
```

### 2. Start Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. First-Time Setup

1. Open http://localhost:3000
2. Click "Create Account" — the first user automatically becomes an admin
3. Navigate to Upload to add documents
4. Start searching

### Docker Deployment

```bash
# Copy and configure .env first
cp .env.example .env

# Build and run
docker-compose up --build
```

The app will be available at http://localhost:3000 with the API at http://localhost:8000.

## Features

### Search
- Natural language question answering across all indexed documents
- Source citations with document name, section, and page number
- Confidence scoring (HIGH / MEDIUM / LOW)
- Follow-up questions within conversations
- Filters by document type, hospital site, and department

### Document Management (Admin)
- Upload PDF, DOCX, TXT, MD documents
- Medical-aware chunking that preserves section context
- Background processing with status tracking
- Metadata tagging (type, department, hospital site, tags)

### Analytics
- Query volume and trends
- Documentation gap detection (low-confidence queries)
- Most cited documents
- Usage by hospital site

### Security
- JWT-based authentication
- Role-based access (admin / member)
- Complete audit logging of queries and document access
- First user auto-promoted to admin

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Create account |
| POST | `/api/auth/login` | - | Sign in |
| GET | `/api/auth/me` | User | Get profile |
| POST | `/api/search` | User | RAG search query |
| GET | `/api/search/history` | User | Conversation list |
| GET | `/api/search/conversations/:id` | User | Conversation messages |
| POST | `/api/documents/upload` | Admin | Upload document |
| GET | `/api/documents` | User | List documents |
| GET | `/api/documents/:id` | User | Document details |
| PUT | `/api/documents/:id` | Admin | Update metadata |
| DELETE | `/api/documents/:id` | Admin | Delete document |
| GET | `/api/documents/:id/download` | User | Download file |
| GET | `/api/analytics/queries` | User | Query analytics |
| GET | `/api/analytics/documents` | User | Document analytics |
| GET | `/api/analytics/users` | User | Usage analytics |
| GET | `/api/health` | - | Health check |

## Cost Estimates

- **OpenAI Embeddings**: ~$0.13 per 1M tokens (~$0.01-0.05 per document upload)
- **Claude API**: ~$3-15 per 1M tokens depending on model (~$0.01-0.05 per query)
- **Infrastructure**: Self-hosted with SQLite + ChromaDB = $0/month for storage
- **Estimated monthly**: $20-100 for moderate usage (1000 queries/month)

## Project Structure

```
backend/
  app/
    main.py              # FastAPI application
    config.py            # Environment configuration
    database.py          # SQLite connection + schema
    schemas.py           # Pydantic models
    dependencies.py      # Auth middleware
    routers/             # API endpoints
    services/            # Business logic (RAG, auth, ingestion)
    utils/               # Parsers, chunking
  data/                  # Runtime data (DB, uploads, vectors)

frontend/
  src/
    app/                 # Next.js pages
    components/          # React components
    lib/                 # API client, auth, types
```
