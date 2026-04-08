# Azure Migration Plan
### The Sandbox — University of Kentucky
### Status: Pending Azure access. Design now, deploy when ready.

---

## Overview

UK has an Azure Enterprise Agreement. Once access is provisioned, the following components migrate from their current implementation to managed Azure services. Each component is designed with an **abstraction layer** so the swap is a configuration/environment variable change, not a rewrite.

---

## Component Registry

### 1. Embeddings Provider
| | Now | Azure |
|---|---|---|
| Service | OpenAI API (`text-embedding-3-small`) | Azure OpenAI Service (same model, UK-hosted) |
| Config | `OPENAI_API_KEY` | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` |
| Code location | `app/lib/embedding-service.ts` (abstraction layer) | Same file, swap provider via env var `EMBEDDING_PROVIDER=azure` |
| Why Azure | Data residency — UK data stays in Azure tenant, not OpenAI |

### 2. Vector Store
| | Now | Azure |
|---|---|---|
| Service | pgvector extension on Neon PostgreSQL | Azure AI Search (vector + hybrid keyword/semantic search) |
| Config | `DATABASE_URL` (existing) | `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX_NAME` |
| Code location | `app/lib/vector-store.ts` (abstraction layer) | Same file, swap store via env var `VECTOR_STORE=azure-ai-search` |
| Why Azure | Azure AI Search supports hybrid retrieval (BM25 + vector) in one query, no pgvector extension management |

### 3. Document Intelligence (PDF/File Parsing)
| | Now | Azure |
|---|---|---|
| Service | `pdf-parse` npm package (local, in-process) | Azure Document Intelligence (Form Recognizer) |
| Config | None | `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY` |
| Code location | `app/lib/document-parser.ts` (abstraction layer) | Same file, swap via `DOCUMENT_PARSER=azure` |
| Why Azure | Handles scanned PDFs, tables, handwriting; much more accurate for real course documents |

### 4. File Storage (Student Submissions)
| | Now | Local filesystem / DB blob (not yet built) | Azure |
|---|---|---|
| Service | TBD (Gradebook feature) | Azure Blob Storage |
| Config | `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME` |
| Code location | `app/lib/file-storage.ts` (abstraction layer) |
| Why Azure | Scalable, secure, integrates with UK's existing Azure tenant for compliance |

### 5. Application Hosting
| | Now | Azure |
|---|---|---|
| Service | Vercel (or local dev) | Azure Container Apps or Azure App Service |
| Config | Standard Next.js deployment config | `Dockerfile` + Azure deployment pipeline |
| Notes | Next.js App Router is fully compatible with Azure Container Apps. Add `Dockerfile` when ready. |
| Why Azure | UK IT governance, data residency, SSO via Azure AD |

### 6. Database
| | Now | Azure |
|---|---|---|
| Service | Neon PostgreSQL (cloud) | Azure Database for PostgreSQL — Flexible Server |
| Config | `DATABASE_URL` swap only | Same Prisma schema, same migrations |
| Notes | Prisma adapter pattern (`@prisma/adapter-pg`) is compatible — just update connection string |
| Why Azure | Consolidate all UK data within Azure tenant; compliance, backups, FERPA |

### 7. Authentication / SSO
| | Now | Azure |
|---|---|---|
| Service | Demo header `x-demo-user-email` | Azure Active Directory (UK NetID via Entra ID) |
| Config | `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` |
| Code location | `app/lib/auth.ts` — replace demo user lookup with Azure AD token validation |
| Notes | Use `next-auth` with AzureAD provider, or MSAL directly. UK students/faculty already have NetIDs in AAD. |
| Why Azure | Single sign-on with UK credentials; eliminates demo user system entirely |

---

## Abstraction Layer Design Principle

Every Azure-bound service is wrapped behind a provider interface:

```typescript
// Example: app/lib/embedding-service.ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

// Instantiated by env var:
export function getEmbeddingProvider(): EmbeddingProvider {
  if (process.env.EMBEDDING_PROVIDER === 'azure') return new AzureOpenAIEmbedder()
  return new OpenAIEmbedder() // default
}
```

Same pattern for `VectorStore`, `DocumentParser`, `FileStorage`.

---

## Migration Checklist (When Azure Access Is Ready)

- [ ] Azure OpenAI Service: provision `text-embedding-3-small` deployment
- [ ] Azure AI Search: create index with vector field schema
- [ ] Azure Document Intelligence: provision resource
- [ ] Azure Blob Storage: create container for submissions
- [ ] Azure Database for PostgreSQL: provision Flexible Server, run `prisma migrate deploy`
- [ ] Azure Container Apps: add `Dockerfile`, configure CI/CD
- [ ] Azure AD / Entra ID: register app, configure `next-auth` AzureAD provider
- [ ] Rotate all secrets to Azure Key Vault

---

## Notes

- FERPA compliance is a driver for moving off third-party APIs (OpenAI direct) to Azure-hosted models
- UK's Azure EA likely includes Azure OpenAI, Azure AI Search, and Entra ID at no additional cost
- Prioritize embeddings + auth first — highest compliance risk currently
