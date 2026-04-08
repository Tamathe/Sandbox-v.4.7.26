import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE_NAME = 'uky-session'
export const LEGACY_SESSION_COOKIE_NAME = 'sandbox-session'
export const DEMO_COOKIE_NAME = 'uky-demo-user-email'
export const LEGACY_DEMO_COOKIE_NAME = 'sandbox-demo-user-email'

const getSecret = () => {
  const secret = process.env.AUTH_JWT_SECRET
  if (!secret) throw new Error('AUTH_JWT_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(email: string, userId: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySessionToken(
  token: string,
): Promise<{ email: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const email = payload.email as string | undefined
    const userId = payload.sub
    if (!email || !userId) return null
    return { email, userId }
  } catch {
    return null
  }
}

export function setSessionCookie(headers: Headers, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookie = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ].join('; ')
  headers.append('Set-Cookie', cookie)
}

export function clearSessionCookie(headers: Headers): void {
  for (const name of [SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME]) {
    headers.append('Set-Cookie', [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'].join('; '))
  }
}
