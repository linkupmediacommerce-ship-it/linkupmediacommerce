import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Bindings, User } from '../utils/types'
import { hashPassword, verifyPassword } from '../utils/crypto'
import { createToken, requireAuth } from '../utils/auth'

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
    user: { id: userId, email, name, phone, is_admin: false, role: 'user', brand_id: null }
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
  if (!user) {
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
      brand_id: brandId
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
  const user = await c.env.DB.prepare('SELECT id, email, name, phone, is_admin, role, brand_id FROM users WHERE id = ?')
    .bind(payload.sub)
    .first()
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }
  return c.json({ user: { ...user, is_admin: !!(user as any).is_admin } })
})

export default auth
