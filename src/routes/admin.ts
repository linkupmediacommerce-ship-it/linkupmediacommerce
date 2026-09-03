import { Hono } from 'hono'
import type { Bindings, JwtPayload } from '../utils/types'
import { requireAdmin, requireSuperAdmin } from '../utils/auth'

const admin = new Hono<{ Bindings: Bindings }>()

// All admin routes require admin privileges (super_admin OR brand_admin).
// Brand-scoping for brand_admin is enforced per-route below.
admin.use('*', requireAdmin)

function getAdminUser(c: any): JwtPayload {
  return c.get('user' as never) as JwtPayload
}

// Resolves the brand_id a showroom belongs to (or null if not found).
async function getShowroomBrandId(c: any, showroomId: string | number): Promise<number | null> {
  const row = await c.env.DB.prepare('SELECT brand_id FROM showrooms WHERE id = ?')
    .bind(showroomId)
    .first<{ brand_id: number }>()
  return row ? row.brand_id : null
}

// Resolves the brand_id a time slot's showroom belongs to (or null if not found).
async function getSlotBrandId(c: any, slotId: string | number): Promise<number | null> {
  const row = await c.env.DB.prepare(
    'SELECT s.brand_id AS brand_id FROM time_slots ts JOIN showrooms s ON s.id = ts.showroom_id WHERE ts.id = ?'
  )
    .bind(slotId)
    .first<{ brand_id: number }>()
  return row ? row.brand_id : null
}

/* ---------------------- Reservations Management ---------------------- */

// GET /api/admin/reservations - list reservations (with filters).
// brand_admin is automatically scoped to their own brand's showrooms.
admin.get('/reservations', async (c) => {
  const user = getAdminUser(c)
  const showroomId = c.req.query('showroom_id')
  const status = c.req.query('status')
  const date = c.req.query('date')

  let query = `
    SELECT r.id, r.status, r.memo, r.created_at,
      u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
      s.id AS showroom_id, s.name AS showroom_name, s.brand_id AS brand_id,
      ts.id AS time_slot_id, ts.slot_date, ts.start_time
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    JOIN showrooms s ON s.id = r.showroom_id
    JOIN time_slots ts ON ts.id = r.time_slot_id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (user.role === 'brand_admin') {
    query += ' AND s.brand_id = ?'
    params.push(user.brand_id as number)
  }
  if (showroomId) {
    query += ' AND r.showroom_id = ?'
    params.push(showroomId)
  }
  if (status) {
    query += ' AND r.status = ?'
    params.push(status)
  }
  if (date) {
    query += ' AND ts.slot_date = ?'
    params.push(date)
  }
  query += ' ORDER BY ts.slot_date DESC, ts.start_time DESC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ reservations: results })
})

// PATCH /api/admin/reservations/:id - update reservation (status, memo, or reassign time slot)
admin.patch('/reservations/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string; memo?: string; time_slot_id?: number }>()

  const reservation = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first<{
    id: number
    showroom_id: number
  }>()
  if (!reservation) {
    return c.json({ error: '예약을 찾을 수 없습니다.' }, 404)
  }

  if (user.role === 'brand_admin') {
    const brandId = await getShowroomBrandId(c, reservation.showroom_id)
    if (brandId !== user.brand_id) {
      return c.json({ error: '해당 예약을 관리할 권한이 없습니다.' }, 403)
    }
  }

  const updates: string[] = []
  const params: (string | number)[] = []

  if (body.status !== undefined) {
    if (!['confirmed', 'cancelled'].includes(body.status)) {
      return c.json({ error: '유효하지 않은 상태값입니다.' }, 400)
    }
    updates.push('status = ?')
    params.push(body.status)
  }
  if (body.memo !== undefined) {
    updates.push('memo = ?')
    params.push(body.memo)
  }
  if (body.time_slot_id !== undefined) {
    const slot = await c.env.DB.prepare('SELECT id, showroom_id FROM time_slots WHERE id = ?')
      .bind(body.time_slot_id)
      .first<{ id: number; showroom_id: number }>()
    if (!slot) {
      return c.json({ error: '유효하지 않은 시간대입니다.' }, 400)
    }
    if (user.role === 'brand_admin') {
      const brandId = await getShowroomBrandId(c, slot.showroom_id)
      if (brandId !== user.brand_id) {
        return c.json({ error: '해당 시간대를 사용할 권한이 없습니다.' }, 403)
      }
    }
    const conflict = await c.env.DB.prepare(
      "SELECT id FROM reservations WHERE time_slot_id = ? AND status = 'confirmed' AND id != ?"
    )
      .bind(body.time_slot_id, id)
      .first()
    if (conflict) {
      return c.json({ error: '해당 시간대는 이미 예약되어 있습니다.' }, 409)
    }
    updates.push('time_slot_id = ?', 'showroom_id = ?')
    params.push(body.time_slot_id, slot.showroom_id)
  }

  if (updates.length === 0) {
    return c.json({ error: '변경할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await c.env.DB.prepare(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  return c.json({ success: true })
})

// DELETE /api/admin/reservations/:id - permanently delete reservation
admin.delete('/reservations/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')
  const reservation = await c.env.DB.prepare('SELECT id, showroom_id FROM reservations WHERE id = ?')
    .bind(id)
    .first<{ id: number; showroom_id: number }>()
  if (!reservation) {
    return c.json({ error: '예약을 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin') {
    const brandId = await getShowroomBrandId(c, reservation.showroom_id)
    if (brandId !== user.brand_id) {
      return c.json({ error: '해당 예약을 관리할 권한이 없습니다.' }, 403)
    }
  }
  await c.env.DB.prepare('DELETE FROM reservations WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

/* ------------------------- Users Management (super_admin only) ------------------------- */
// Platform-wide member management is restricted to super_admin — brand_admin should only
// see applicants via the reservations list (already scoped to their brand above).

// GET /api/admin/users - list all members
admin.get('/users', requireSuperAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.is_admin, u.role, u.brand_id, u.created_at,
      (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'confirmed') AS reservation_count
     FROM users u ORDER BY u.created_at DESC`
  ).all()
  const users = (results as any[]).map((u) => ({ ...u, is_admin: !!u.is_admin }))
  return c.json({ users })
})

// GET /api/admin/users/:id - member detail with their reservations
admin.get('/users/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, phone, is_admin, role, brand_id, created_at FROM users WHERE id = ?'
  )
    .bind(id)
    .first()
  if (!user) {
    return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
  }
  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.status, r.created_at, s.name AS showroom_name, ts.slot_date, ts.start_time
     FROM reservations r
     JOIN showrooms s ON s.id = r.showroom_id
     JOIN time_slots ts ON ts.id = r.time_slot_id
     WHERE r.user_id = ? ORDER BY ts.slot_date DESC`
  )
    .bind(id)
    .all()
  return c.json({ user: { ...user, is_admin: !!(user as any).is_admin }, reservations: results })
})

/* ----------------------- Brand Management (super_admin only) ----------------------- */

// GET /api/admin/brands - list all brands
admin.get('/brands', requireSuperAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT b.*, (SELECT COUNT(*) FROM showrooms s WHERE s.brand_id = b.id) AS showroom_count
     FROM brands b ORDER BY b.id ASC`
  ).all()
  return c.json({ brands: results })
})

// POST /api/admin/brands - create a new brand (and optionally its brand-admin account)
admin.post('/brands', requireSuperAdmin, async (c) => {
  const body = await c.req.json<{
    slug?: string
    name?: string
    description?: string
    logo_url?: string
    admin_email?: string
    admin_password?: string
    admin_name?: string
  }>()

  const slug = body.slug?.trim().toLowerCase()
  const name = body.name?.trim()
  if (!slug || !name) {
    return c.json({ error: '브랜드 슬러그와 이름은 필수입니다.' }, 400)
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return c.json({ error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM brands WHERE slug = ?').bind(slug).first()
  if (existing) {
    return c.json({ error: '이미 존재하는 슬러그입니다.' }, 409)
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO brands (slug, name, description, logo_url) VALUES (?, ?, ?, ?)'
  )
    .bind(slug, name, body.description || null, body.logo_url || null)
    .run()
  const brandId = result.meta.last_row_id as number

  // Optionally provision the brand-admin account in the same call.
  let adminUser: { id: number; email: string } | null = null
  if (body.admin_email && body.admin_password) {
    const email = body.admin_email.trim().toLowerCase()
    const adminExisting = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (adminExisting) {
      return c.json(
        { error: '브랜드는 생성되었지만, 해당 이메일의 계정이 이미 존재하여 브랜드관리자로 지정하지 못했습니다.', id: brandId },
        409
      )
    }
    const { hashPassword } = await import('../utils/crypto')
    const passwordHash = await hashPassword(body.admin_password)
    const adminName = body.admin_name?.trim() || `${name} 브랜드관리자`
    const adminResult = await c.env.DB.prepare(
      "INSERT INTO users (email, password_hash, name, role, brand_id, is_admin) VALUES (?, ?, ?, 'brand_admin', ?, 0)"
    )
      .bind(email, passwordHash, adminName, brandId)
      .run()
    adminUser = { id: adminResult.meta.last_row_id as number, email }
  }

  return c.json({ id: brandId, admin_user: adminUser })
})

// PATCH /api/admin/brands/:id - update a brand
admin.patch('/brands/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    description?: string
    logo_url?: string
    is_active?: boolean
  }>()

  const updates: string[] = []
  const params: (string | number)[] = []
  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.logo_url !== undefined) { updates.push('logo_url = ?'); params.push(body.logo_url) }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active ? 1 : 0) }

  if (updates.length === 0) {
    return c.json({ error: '변경할 내용이 없습니다.' }, 400)
  }
  params.push(id)
  await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ success: true })
})

/* ----------------------- Showrooms Management ------------------------ */

// GET /api/admin/showrooms - list showrooms (including inactive).
// brand_admin is automatically scoped to their own brand.
admin.get('/showrooms', async (c) => {
  const user = getAdminUser(c)
  const base = `SELECT s.*, b.name AS brand_name, b.slug AS brand_slug FROM showrooms s JOIN brands b ON b.id = s.brand_id`

  if (user.role === 'brand_admin') {
    const { results } = await c.env.DB.prepare(`${base} WHERE s.brand_id = ? ORDER BY s.id ASC`)
      .bind(user.brand_id)
      .all()
    return c.json({ showrooms: results })
  }
  const brandFilter = c.req.query('brand_id')
  if (brandFilter) {
    const { results } = await c.env.DB.prepare(`${base} WHERE s.brand_id = ? ORDER BY s.id ASC`)
      .bind(brandFilter)
      .all()
    return c.json({ showrooms: results })
  }
  const { results } = await c.env.DB.prepare(`${base} ORDER BY s.id ASC`).all()
  return c.json({ showrooms: results })
})

// POST /api/admin/showrooms - create showroom.
// brand_admin's showroom is always created under their own brand.
// super_admin must specify brand_id explicitly.
admin.post('/showrooms', async (c) => {
  const user = getAdminUser(c)
  const body = await c.req.json<{
    name?: string
    address?: string
    description?: string
    image_url?: string
    brand_id?: number
  }>()
  if (!body.name || !body.address) {
    return c.json({ error: '지점명과 주소는 필수입니다.' }, 400)
  }

  let brandId: number
  if (user.role === 'brand_admin') {
    brandId = user.brand_id as number
  } else {
    if (!body.brand_id) {
      return c.json({ error: '브랜드를 선택해주세요.' }, 400)
    }
    const brand = await c.env.DB.prepare('SELECT id FROM brands WHERE id = ?').bind(body.brand_id).first()
    if (!brand) {
      return c.json({ error: '유효하지 않은 브랜드입니다.' }, 400)
    }
    brandId = body.brand_id
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO showrooms (brand_id, name, address, description, image_url) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(brandId, body.name, body.address, body.description || null, body.image_url || null)
    .run()
  return c.json({ id: result.meta.last_row_id })
})

// PATCH /api/admin/showrooms/:id - update showroom
admin.patch('/showrooms/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    address?: string
    description?: string
    image_url?: string
    is_active?: boolean
  }>()

  const brandId = await getShowroomBrandId(c, id)
  if (brandId === null) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 쇼룸을 관리할 권한이 없습니다.' }, 403)
  }

  const updates: string[] = []
  const params: (string | number)[] = []
  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
  if (body.address !== undefined) { updates.push('address = ?'); params.push(body.address) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.image_url !== undefined) { updates.push('image_url = ?'); params.push(body.image_url) }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active ? 1 : 0) }

  if (updates.length === 0) {
    return c.json({ error: '변경할 내용이 없습니다.' }, 400)
  }
  params.push(id)
  await c.env.DB.prepare(`UPDATE showrooms SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ success: true })
})

// DELETE /api/admin/showrooms/:id - permanently delete showroom
// Blocked if the showroom has any confirmed reservations (cancel or move them first).
admin.delete('/showrooms/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')

  const brandId = await getShowroomBrandId(c, id)
  if (brandId === null) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 쇼룸을 관리할 권한이 없습니다.' }, 403)
  }

  const activeReservation = await c.env.DB.prepare(
    "SELECT id FROM reservations WHERE showroom_id = ? AND status = 'confirmed'"
  )
    .bind(id)
    .first()
  if (activeReservation) {
    return c.json(
      { error: '예약이 존재하는 쇼룸은 삭제할 수 없습니다. 먼저 예약을 취소하거나 비활성화해주세요.' },
      409
    )
  }

  // Clean up dependent rows (cancelled reservations, time slots) then the showroom itself.
  await c.env.DB.prepare('DELETE FROM reservations WHERE showroom_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM time_slots WHERE showroom_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM showrooms WHERE id = ?').bind(id).run()

  return c.json({ success: true })
})

/* ---------------------- Time Slots Management ------------------------ */

// GET /api/admin/showrooms/:id/slots - list time slots for a showroom (admin view, incl. reservation count)
admin.get('/showrooms/:id/slots', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')

  const brandId = await getShowroomBrandId(c, id)
  if (brandId === null) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 쇼룸을 관리할 권한이 없습니다.' }, 403)
  }

  const { results } = await c.env.DB.prepare(
    `SELECT ts.id, ts.slot_date, ts.start_time, ts.is_active, ts.capacity,
      (SELECT COUNT(*) FROM reservations r WHERE r.time_slot_id = ts.id AND r.status = 'confirmed') AS reserved_count
     FROM time_slots ts
     WHERE ts.showroom_id = ?
     ORDER BY ts.slot_date ASC, ts.start_time ASC`
  )
    .bind(id)
    .all()
  return c.json({ slots: results })
})

// POST /api/admin/showrooms/:id/slots - create a new time slot
admin.post('/showrooms/:id/slots', async (c) => {
  const user = getAdminUser(c)
  const showroomId = c.req.param('id')
  const body = await c.req.json<{ slot_date?: string; start_time?: string; capacity?: number }>()

  const brandId = await getShowroomBrandId(c, showroomId)
  if (brandId === null) {
    return c.json({ error: '쇼룸을 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 쇼룸을 관리할 권한이 없습니다.' }, 403)
  }

  if (!body.slot_date || !body.start_time) {
    return c.json({ error: '날짜와 시작 시간을 입력해주세요.' }, 400)
  }
  const capacity = Number(body.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) {
    return c.json({ error: '인원수는 1명 이상의 정수로 입력해주세요.' }, 400)
  }

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO time_slots (showroom_id, slot_date, start_time, capacity) VALUES (?, ?, ?, ?)'
    )
      .bind(showroomId, body.slot_date, body.start_time, capacity)
      .run()
    return c.json({ id: result.meta.last_row_id })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: '동일한 시간대가 이미 존재합니다.' }, 409)
    }
    return c.json({ error: '시간대 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// PATCH /api/admin/slots/:id - update a time slot's capacity
admin.patch('/slots/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')
  const body = await c.req.json<{ capacity?: number }>()

  const brandId = await getSlotBrandId(c, id)
  if (brandId === null) {
    return c.json({ error: '시간대를 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 시간대를 관리할 권한이 없습니다.' }, 403)
  }

  if (body.capacity === undefined) {
    return c.json({ error: '변경할 내용이 없습니다.' }, 400)
  }
  const capacity = Number(body.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) {
    return c.json({ error: '인원수는 1명 이상의 정수로 입력해주세요.' }, 400)
  }

  const reservedCount = await c.env.DB.prepare(
    "SELECT COUNT(*) AS cnt FROM reservations WHERE time_slot_id = ? AND status = 'confirmed'"
  )
    .bind(id)
    .first<{ cnt: number }>()
  if (reservedCount && capacity < reservedCount.cnt) {
    return c.json(
      { error: `이미 ${reservedCount.cnt}명이 예약되어 있어 인원수를 그보다 적게 설정할 수 없습니다.` },
      409
    )
  }

  await c.env.DB.prepare('UPDATE time_slots SET capacity = ? WHERE id = ?').bind(capacity, id).run()
  return c.json({ success: true })
})

// DELETE /api/admin/slots/:id - delete a time slot (only if not reserved)
admin.delete('/slots/:id', async (c) => {
  const user = getAdminUser(c)
  const id = c.req.param('id')

  const brandId = await getSlotBrandId(c, id)
  if (brandId === null) {
    return c.json({ error: '시간대를 찾을 수 없습니다.' }, 404)
  }
  if (user.role === 'brand_admin' && brandId !== user.brand_id) {
    return c.json({ error: '해당 시간대를 관리할 권한이 없습니다.' }, 403)
  }

  const reserved = await c.env.DB.prepare(
    "SELECT id FROM reservations WHERE time_slot_id = ? AND status = 'confirmed'"
  )
    .bind(id)
    .first()
  if (reserved) {
    return c.json({ error: '예약이 존재하는 시간대는 삭제할 수 없습니다. 먼저 예약을 취소해주세요.' }, 409)
  }
  await c.env.DB.prepare('DELETE FROM time_slots WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default admin
