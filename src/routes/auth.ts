import { Hono, type Context } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Bindings, User } from '../utils/types'
import { hashPassword, verifyPassword } from '../utils/crypto'
import { createToken, requireAuth } from '../utils/auth'
import { buildKakaoAuthorizeUrl, exchangeKakaoCode, fetchKakaoProfile, randomState } from '../utils/kakao'

const auth = new Hono<{ Bindings: Bindings }>()

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7
}

// POST /api/auth/signup
auth.post('/signup', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string; phone?: string }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const name = body.name?.trim()
  const phone = body.phone?.trim() || null

  if (!email || !password || !name) {
    return c.json({ error: '이메일, 비밀번호, 이름은 필수입니다.' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, 400)
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return c.json({ error: '올바른 이메일 형식이 아닙니다.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: '이미 가입된 이메일입니다.' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const result = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, name, phone, is_admin) VALUES (?, ?, ?, ?, 0)'
  )
    .bind(email, passwordHash, name, phone)
    .run()

  const userId = result.meta.last_row_id as number
  const token = await createToken(c, {
    sub: userId,
    email,
    name,
    is_admin: false,
    role: 'user',
    brand_id: null
  })
  setCookie(c, 'brooks_token', token, COOKIE_OPTS)

  return c.json({
    token,
    user: {
      id: userId,
      email,
      name,
      phone,
      is_admin: false,
      role: 'user',
      brand_id: null,
      auth_provider: 'local'
    }
  })
})

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>()
  if (!user || !user.password_hash) {
    // No matching row, or the account was created via SNS login and has no password set.
    return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401)
  }

  const isAdmin = !!user.is_admin
  const role = user.role || 'user'
  const brandId = user.brand_id ?? null
  const token = await createToken(c, {
    sub: user.id,
    email: user.email,
    name: user.name,
    is_admin: isAdmin,
    role,
    brand_id: brandId
  })
  setCookie(c, 'brooks_token', token, COOKIE_OPTS)

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      is_admin: isAdmin,
      role,
      brand_id: brandId,
      auth_provider: user.auth_provider
    }
  })
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  deleteCookie(c, 'brooks_token', { path: '/' })
  return c.json({ success: true })
})

// GET /api/auth/me
auth.get('/me', requireAuth, async (c) => {
  const payload = c.get('user' as never) as { sub: number; email: string; name: string; is_admin: boolean }
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, phone, is_admin, role, brand_id, auth_provider FROM users WHERE id = ?'
  )
    .bind(payload.sub)
    .first()
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }
  return c.json({ user: { ...user, is_admin: !!(user as any).is_admin } })
})

// PATCH /api/auth/profile - lets the current user fill in missing info
// (mainly: phone number for SNS accounts that don't provide one).
auth.patch('/profile', requireAuth, async (c) => {
  const payload = c.get('user' as never) as { sub: number }
  const body = await c.req.json<{ phone?: string }>()
  const phone = body.phone?.trim()
  if (!phone) {
    return c.json({ error: '연락처를 입력해주세요.' }, 400)
  }
  await c.env.DB.prepare('UPDATE users SET phone = ? WHERE id = ?').bind(phone, payload.sub).run()
  return c.json({ success: true })
})

const KAKAO_STATE_COOKIE = 'kakao_oauth_state'

function resolveKakaoRedirectUri(c: Context<{ Bindings: Bindings }>): string {
  // Prefer an explicit env var (must exactly match what's registered in the Kakao console).
  // Falls back to deriving from the current request's own origin, which is convenient for
  // per-session sandbox preview URLs during development.
  if (c.env.KAKAO_REDIRECT_URI) return c.env.KAKAO_REDIRECT_URI
  const url = new URL(c.req.url)
  return `${url.origin}/api/auth/kakao/callback`
}

// GET /api/auth/kakao/login - redirects the browser to Kakao's consent screen.
auth.get('/kakao/login', async (c) => {
  if (!c.env.KAKAO_CLIENT_ID) {
    return c.json({ error: '카카오 로그인이 아직 설정되지 않았습니다.' }, 503)
  }
  const state = randomState()
  setCookie(c, KAKAO_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 10 // 10 minutes is plenty for the redirect round-trip
  })
  const redirectUri = resolveKakaoRedirectUri(c)
  const authorizeUrl = buildKakaoAuthorizeUrl(c.env.KAKAO_CLIENT_ID, redirectUri, state)
  return c.redirect(authorizeUrl)
})

// GET /api/auth/kakao/callback - Kakao redirects here with ?code=&state=.
// We exchange the code server-side, upsert the user, then redirect back into the
// SPA with our own JWT in the URL fragment so the frontend can store it (a plain
// fetch can't be used here since the browser navigated away to Kakao and back).
auth.get('/kakao/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookieValue(c, KAKAO_STATE_COOKIE)
  deleteCookie(c, KAKAO_STATE_COOKIE, { path: '/' })

  const url = new URL(c.req.url)
  const failRedirect = (message: string) => c.redirect(`${url.origin}/#/login?error=${encodeURIComponent(message)}`)

  if (c.req.query('error')) {
    return failRedirect('카카오 로그인이 취소되었습니다.')
  }
  if (!code || !state || !savedState || state !== savedState) {
    return failRedirect('유효하지 않은 로그인 요청입니다. 다시 시도해주세요.')
  }
  if (!c.env.KAKAO_CLIENT_ID) {
    return failRedirect('카카오 로그인이 아직 설정되지 않았습니다.')
  }

  try {
    const redirectUri = resolveKakaoRedirectUri(c)
    const accessToken = await exchangeKakaoCode(c.env.KAKAO_CLIENT_ID, c.env.KAKAO_CLIENT_SECRET, redirectUri, code)
    const profile = await fetchKakaoProfile(accessToken)
    const providerUserId = String(profile.id)

    // 1) Existing Kakao account -> log in.
    let user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE auth_provider = 'kakao' AND provider_user_id = ?"
    )
      .bind(providerUserId)
      .first<User>()

    if (!user) {
      // 2) First-time Kakao login. If Kakao gave us an email that's already used by
      // ANY existing account (local or another provider), don't attach it to this new
      // row — silently merging accounts by email is a security risk (email consent can
      // be spoofed-ish across providers), so we just leave email blank for this account
      // instead. The user still ends up with a working, distinct account either way.
      let emailToStore: string | null = null
      if (profile.email) {
        const emailOwner = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(profile.email).first()
        emailToStore = emailOwner ? null : profile.email
      }
      const name = profile.nickname?.trim() || '카카오 사용자'

      const result = await c.env.DB.prepare(
        `INSERT INTO users (email, password_hash, name, phone, is_admin, role, auth_provider, provider_user_id)
         VALUES (?, NULL, ?, NULL, 0, 'user', 'kakao', ?)`
      )
        .bind(emailToStore, name, providerUserId)
        .run()

      user = {
        id: result.meta.last_row_id as number,
        email: emailToStore,
        password_hash: null,
        name,
        phone: null,
        is_admin: 0,
        role: 'user',
        brand_id: null,
        auth_provider: 'kakao',
        provider_user_id: providerUserId,
        created_at: new Date().toISOString()
      }
    }

    const isAdmin = !!user.is_admin
    const role = user.role || 'user'
    const brandId = user.brand_id ?? null
    const token = await createToken(c, {
      sub: user.id,
      email: user.email,
      name: user.name,
      is_admin: isAdmin,
      role,
      brand_id: brandId
    })
    setCookie(c, 'brooks_token', token, COOKIE_OPTS)

    // Fragment (not query string) so the token never gets sent to any server in a
    // Referer header or logged in server access logs.
    return c.redirect(`${url.origin}/#/auth/callback?token=${encodeURIComponent(token)}`)
  } catch (err) {
    console.error('Kakao login failed', err)
    return failRedirect('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
})

function getCookieValue(c: Context<{ Bindings: Bindings }>, name: string): string | null {
  return getCookie(c, name) ?? null
}

export default auth
