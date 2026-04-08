/**
 * LTI 1.3 JWKS (JSON Web Key Set) endpoint
 *
 * Canvas fetches this URL to obtain our platform's public key(s) when it needs
 * to verify JWTs we sign (used for LTI Advantage services: AGS, NRPS, etc.).
 *
 * This endpoint is intentionally public — JWKS endpoints must be unauthenticated
 * so Canvas can fetch them server-to-server without any user session.
 *
 * Key management:
 *   If LTI_PUBLIC_KEY_JWK env var is set, it is parsed and returned as the
 *   active key.  Otherwise an empty keyset is returned (launch verification
 *   still works, but AGS/NRPS service calls won't be possible until a key
 *   is configured).
 *
 * To generate an RSA key pair for this env var:
 *   openssl genrsa -out lti-private.pem 2048
 *   openssl rsa -in lti-private.pem -pubout -out lti-public.pem
 *   Then convert to JWK via https://russelldavies.github.io/jwk-creator/
 *   and set LTI_PUBLIC_KEY_JWK to the JSON string.
 */

import { NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'

export const dynamic = 'force-dynamic'

interface JwkEntry {
  kid?: string
  kty: string
  use?: string
  alg?: string
  [key: string]: unknown
}

export const GET = withErrorHandling(async () => {
  const keys: JwkEntry[] = []

  const rawJwk = process.env.LTI_PUBLIC_KEY_JWK
  if (rawJwk) {
    try {
      const jwk = JSON.parse(rawJwk) as JwkEntry
      // Ensure only public key fields are exposed (never leak private key material)
      // For RSA, public fields are: kty, n, e, kid, use, alg
      // Private fields (d, p, q, dp, dq, qi) are stripped if present
      const { d: _d, p: _p, q: _q, dp: _dp, dq: _dq, qi: _qi, ...publicJwk } = jwk as JwkEntry & {
        d?: string; p?: string; q?: string; dp?: string; dq?: string; qi?: string
      }
      keys.push({ ...publicJwk, use: 'sig' })
    } catch {
      console.error('[lti/jwks] Failed to parse LTI_PUBLIC_KEY_JWK — serving empty keyset')
    }
  }

  return NextResponse.json(
    { keys },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour — keys rarely rotate
        'Content-Type': 'application/json',
      },
    }
  )
})
