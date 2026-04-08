/**
 * Prisma query logger — lightweight slow-query detection.
 *
 * Uses Prisma v7 `$extends` with the query component to measure
 * query duration. Logs slow queries to console in dev and sends
 * them as Sentry breadcrumbs in production.
 *
 * Thresholds:
 *   - Dev:  200ms → console warning
 *   - Prod: 500ms → Sentry breadcrumb
 *
 * PII safety: only logs model name, operation, and duration.
 * Where clauses are logged as key names only (no values).
 */

import { Prisma, PrismaClient } from '../generated/prisma'

const DEV_THRESHOLD_MS = 200
const PROD_THRESHOLD_MS = 500
const IS_PROD = process.env.NODE_ENV === 'production'

function sanitizeWhereKeys(args: Record<string, unknown> | undefined): string {
  if (!args?.where || typeof args.where !== 'object') return ''
  const keys = Object.keys(args.where as Record<string, unknown>)
  if (keys.length === 0) return ''
  const truncated = keys.slice(0, 5).join(', ')
  return keys.length > 5 ? `${truncated}, ...` : truncated
}

async function reportToSentry(
  model: string,
  operation: string,
  durationMs: number,
  whereKeys: string,
) {
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.addBreadcrumb({
      category: 'db.query',
      message: `Slow query: ${model}.${operation} (${durationMs}ms)`,
      level: 'warning',
      data: {
        model,
        operation,
        durationMs,
        ...(whereKeys ? { whereKeys } : {}),
      },
    })
  } catch {
    // Sentry not available — silently skip
  }
}

export function withQueryLogging<T extends PrismaClient>(client: T): T {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now()
          const result = await query(args)
          const durationMs = Math.round(performance.now() - start)

          const threshold = IS_PROD ? PROD_THRESHOLD_MS : DEV_THRESHOLD_MS

          if (durationMs >= threshold) {
            const whereKeys = sanitizeWhereKeys(
              args as Record<string, unknown> | undefined,
            )
            const whereInfo = whereKeys ? ` where(${whereKeys})` : ''

            if (IS_PROD) {
              reportToSentry(
                model ?? 'unknown',
                operation,
                durationMs,
                whereKeys,
              )
            } else {
              console.warn(
                `⚠️  Slow query: ${model}.${operation}${whereInfo} — ${durationMs}ms`,
              )
            }
          }

          return result
        },
      },
    },
  }) as unknown as T
}
