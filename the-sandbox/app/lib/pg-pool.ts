/**
 * Shared PostgreSQL connection pool.
 *
 * All services that need raw SQL (pgvector, policy search, UKNow, etc.)
 * AND the Prisma adapter share this single pool to avoid connection exhaustion
 * on Neon serverless. Uses globalThis caching to survive HMR in development.
 */

import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { _sharedPgPool?: Pool }

function createPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const p = new Pool({
    connectionString: url,
    max: 50,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  })
  // Prevent unhandled errors from crashing the process when Neon drops connections
  p.on('error', () => {})
  return p
}

export function pool(): Pool {
  if (!globalForPg._sharedPgPool) {
    globalForPg._sharedPgPool = createPool()
  }
  return globalForPg._sharedPgPool
}
