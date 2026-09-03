import { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { Bindings, JwtPayload } from './types'

const DEFAULT_SECRET = 'brooks-showroom-dev-secret-change-in-production'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export function getJwtSecret(c: Context<{ Bindings: Bindings }>): string {
  return c.env.JWT_SECRET || DEFAULT_SECRET
}

export async function createToken(
  c: Context<{ Bindings: Bindings }>,
  payload: Omit<JwtPayload, 'exp'>
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  return sign({ ...payload, exp }, getJwtSecret(c))
}

function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length)
  }
  const cookieToken = getCookie(c, 'brooks_token')
  if (cookieToken) return cookieToken
  return null
}

// Attaches c.set('user', payload) if a valid token is present; does not block request.
export async function optionalAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const token = extractToken(c)
  if (token) {
    try {
      const payload = (await verify(token, getJwtSecret(c), 'HS256')) as unknown as JwtPayload
      c.set('user', payload)
    } catch {
      // ignore invalid token
    }
  }
  await next()
}

// Requires a valid token; returns 401 otherwise.
export async function requireAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: '로그인이 필요합니다.' }, 401)
  }
  try {
    const payload = (await verify(token, getJwtSecret(c), 'HS256')) as unknown as JwtPayload
    c.set('user', payload)
  } catch {
    return c.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, 401)
  }
  await next()
}

// Requires a valid token AND admin privileges (super_admin OR brand_admin).
// Use this for admin routes that should be reachable by either role;
// apply brand-scoping to the underlying query using c.get('user').
export async function requireAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: '로그인이 필요합니다.' }, 401)
  }
  try {
    const payload = (await verify(token, getJwtSecret(c), 'HS256')) as unknown as JwtPayload
    if (payload.role !== 'super_admin' && payload.role !== 'brand_admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
    }
    c.set('user', payload)
  } catch {
    return c.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, 401)
  }
  await next()
}

// Requires a valid token AND super_admin privileges only (platform-wide operations
// such as brand management). Brand admins are rejected.
export async function requireSuperAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: '로그인이 필요합니다.' }, 401)
  }
  try {
    const payload = (await verify(token, getJwtSecret(c), 'HS256')) as unknown as JwtPayload
    if (payload.role !== 'super_admin') {
      return c.json({ error: '최고관리자 권한이 필요합니다.' }, 403)
    }
    c.set('user', payload)
  } catch {
    return c.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, 401)
  }
  await next()
}
