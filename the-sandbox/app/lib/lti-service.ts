/**
 * LTI 1.3 OIDC Launch Service
 *
 * Handles verification of Canvas-signed id_token JWTs and extraction of
 * LTI launch claims (user email, course context, tool reference).
 *
 * Required env vars:
 *   CANVAS_BASE_URL     — e.g. https://uk.instructure.com
 *   LTI_CLIENT_ID       — Canvas Developer Key client_id
 *   LTI_DEPLOYMENT_ID   — Canvas deployment ID
 */

import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// ── LTI claim URIs ────────────────────────────────────────────────────────────
const CLAIM_CONTEXT = 'https://purl.imsglobal.org/spec/lti/claim/context'
const CLAIM_CUSTOM = 'https://purl.imsglobal.org/spec/lti/claim/custom'
const CLAIM_DEPLOYMENT_ID = 'https://purl.imsglobal.org/spec/lti/claim/deployment_id'
const CLAIM_MESSAGE_TYPE = 'https://purl.imsglobal.org/spec/lti/claim/message_type'
const CLAIM_VERSION = 'https://purl.imsglobal.org/spec/lti/claim/version'

export interface LtiClaims {
  /** Student/instructor email from Canvas */
  email: string
  /** User's display name from Canvas */
  name?: string
  /** Canvas course ID (matches Course.canvasCourseId in our DB) */
  canvasCourseId?: string
  /** Tool ID passed via custom claim (matches Tool.id in our DB) */
  toolId?: string
  /** Raw sub claim — Canvas's opaque user identifier */
  sub: string
}

interface JwkKey {
  kid?: string
  kty: string
  n?: string
  e?: string
  use?: string
  alg?: string
  [key: string]: unknown
}

interface JwkSet {
  keys: JwkKey[]
}

// Simple in-memory JWKS cache (avoid re-fetching on every request)
let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function fetchCanvasJwks(): Promise<JwkKey[]> {
  const now = Date.now()
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys
  }

  const baseUrl = process.env.CANVAS_BASE_URL
  if (!baseUrl) {
    throw new Error('CANVAS_BASE_URL is not configured')
  }

  const res = await fetch(`${baseUrl}/api/lti/security/jwks`, {
    next: { revalidate: 0 }, // opt out of Next.js fetch cache
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Canvas JWKS: ${res.status} ${res.statusText}`)
  }

  const body = (await res.json()) as JwkSet
  jwksCache = { keys: body.keys ?? [], fetchedAt: now }
  return jwksCache.keys
}

/**
 * Convert a JWK public key to a PEM string using Node.js built-in crypto.
 * Supports RSA keys (RS256) which Canvas LTI 1.3 uses.
 */
function jwkToPem(jwk: JwkKey): string {
  const keyObject = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' })
  return keyObject.export({ type: 'spki', format: 'pem' }) as string
}

/**
 * Verify a Canvas LTI 1.3 id_token JWT and extract structured claims.
 *
 * Validates:
 * - Signature against Canvas's JWKS
 * - `iss` matches CANVAS_BASE_URL
 * - `aud` contains LTI_CLIENT_ID
 * - Deployment ID matches LTI_DEPLOYMENT_ID (if configured)
 * - Message type is LtiResourceLinkRequest
 *
 * @throws Error with descriptive message if validation fails
 */
export async function verifyLtiLaunch(idToken: string): Promise<LtiClaims> {
  const baseUrl = process.env.CANVAS_BASE_URL
  const clientId = process.env.LTI_CLIENT_ID
  const deploymentId = process.env.LTI_DEPLOYMENT_ID

  if (!baseUrl) throw new Error('CANVAS_BASE_URL is not configured')
  if (!clientId) throw new Error('LTI_CLIENT_ID is not configured')

  // Decode header to get kid (without verifying — we need kid to pick the right key)
  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid id_token: cannot decode JWT')
  }

  const kid = (decoded.header as { kid?: string }).kid
  const alg = (decoded.header as { alg?: string }).alg ?? 'RS256'

  if (alg !== 'RS256') {
    throw new Error(`Unsupported JWT algorithm: ${alg} (expected RS256)`)
  }

  // Fetch and find the matching JWK
  const keys = await fetchCanvasJwks()
  const jwk = kid
    ? keys.find((k) => k.kid === kid)
    : keys.find((k) => k.kty === 'RSA')

  if (!jwk) {
    throw new Error(`No matching JWK found for kid="${kid ?? 'unspecified'}"`)
  }

  // Convert JWK → PEM and verify signature + standard claims
  const pem = jwkToPem(jwk)
  const payload = jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    issuer: baseUrl,
    audience: clientId,
  }) as Record<string, unknown>

  // Validate deployment ID if configured
  if (deploymentId) {
    const claimedDeployment = payload[CLAIM_DEPLOYMENT_ID]
    if (claimedDeployment !== deploymentId) {
      throw new Error(
        `LTI deployment ID mismatch: expected "${deploymentId}", got "${claimedDeployment}"`
      )
    }
  }

  // Validate message type
  const messageType = payload[CLAIM_MESSAGE_TYPE]
  if (messageType !== 'LtiResourceLinkRequest') {
    throw new Error(`Unexpected LTI message type: ${messageType}`)
  }

  // Validate LTI version
  const version = payload[CLAIM_VERSION]
  if (version !== '1.3.0') {
    throw new Error(`Unsupported LTI version: ${version}`)
  }

  // Extract user identity
  const email = (payload.email as string | undefined) ?? ''
  if (!email) {
    throw new Error('LTI id_token is missing email claim')
  }

  const name = payload.name as string | undefined
  const sub = payload.sub as string

  // Extract course context
  const context = payload[CLAIM_CONTEXT] as Record<string, unknown> | undefined
  // Canvas puts the Canvas course ID in context.id in format "course_<id>"
  // or sometimes as a bare numeric/string ID depending on Canvas version
  let canvasCourseId: string | undefined
  if (context?.id) {
    const rawId = String(context.id)
    // Strip "course_" prefix if present (some Canvas versions include it)
    canvasCourseId = rawId.startsWith('course_') ? rawId.slice(7) : rawId
  }

  // Extract custom claims (tool ID set by educator when configuring the LTI placement)
  const custom = payload[CLAIM_CUSTOM] as Record<string, unknown> | undefined
  const toolId = custom?.tool_id ? String(custom.tool_id) : undefined

  return { email, name, canvasCourseId, toolId, sub }
}
