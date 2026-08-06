import { Hono } from 'hono'
import type { Bindings } from '../utils/types'
import { requireAdmin } from '../utils/auth'

const admin = new Hono<{ Bindings: Bindings }>()

// All admin routes require admin privileges
admin.use('*', requireAdmin)

/* ---------------------- Reservations Management ---------------------- */

// GET /api/admin/reservations - list all reservations (with filters)
admin.get('/reservations', async (c) => {
  const showroomId = c.req.query('showroom_id')
  const status = c.req.query('status')
  const date = c.req.query('date')

  let query = `
    SELECT r.id, r.status, r.memo, r.created_at,
      u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
      s.id AS showroom_id, s.name AS showroom_name,
      ts.id AS time_slot_id, ts.slot_date, ts.start_time, ts.end_time
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    JOIN showrooms s ON s.id = r.showroom_id
    JOIN time_slots ts ON ts.id = r.time_slot_id
    WHERE 1=1
  `
  const params: (string | number)[] = []

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
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string; memo?: string; time_slot_id?: number }>()

  const reservation = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first()
  if (!reservation) {
    return c.json({ error: '예약을 찾을 수 없습니다.' }, 404)
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
  const id = c.req.param('id')
  const reservation = await c.env.DB.prepare('SELECT id FROM reservations WHERE id = ?').bind(id).first()
  if (!reservation) {
    return c.json({ error: '예약을 찾을 수 없습니다.' }, 404)
  }
  await c.env.DB.prepare('DELETE FROM reservations WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

/* ------------------------- Users Management ------------------------- */

// GET /api/admin/users - list all members
admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.is_admin, u.created_at,
      (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'confirmed') AS reservation_count
     FROM users u ORDER BY u.created_at DESC`
  ).all()
  const users = (results as any[]).map((u) => ({ ...u, is_admin: !!u.is_admin }))
  return c.json({ users })
})

// GET /api/admin/users/:id - member detail with their reservations
admin.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await c.env.DB.prepare('SELECT id, email, name, phone, is_admin, created_at FROM users WHERE id = ?')
    .bind(id)
    .first()
  if (!user) {
    return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
  }
  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.status, r.created_at, s.name AS showroom_name, ts.slot_date, ts.start_time, ts.end_time
     FROM reservations r
     JOIN showrooms s ON s.id = r.showroom_id
     JOIN time_slots ts ON ts.id = r.time_slot_id
     WHERE r.user_id = ? ORDER BY ts.slot_date DESC`
  )
    .bind(id)
    .all()
  return c.json({ user: { ...user, is_admin: !!(user as any).is_admin }, reservations: results })
})

/* ----------------------- Showrooms Management ------------------------ */

// GET /api/admin/showrooms - list all showrooms (including inactive)
admin.get('/showrooms', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM showrooms ORDER BY id ASC').all()
  return c.json({ showrooms: results })
})

// POST /api/admin/showrooms - create showroom
admin.post('/showrooms', async (c) => {
  const body = await c.req.json<{ name?: string; address?: string; description?: string; image_url?: string }>()
  if (!body.name || !body.address) {
    return c.json({ error: '지점명과 주소는 필수입니다.' }, 400)
  }
  const result = await c.env.DB.prepare(
    'INSERT INTO showrooms (name, address, description, image_url) VALUES (?, ?, ?, ?)'
  )
    .bind(body.name, body.address, body.description || null, body.image_url || null)
    .run()
  return c.json({ id: result.meta.last_row_id })
})

// PATCH /api/admin/showrooms/:id - update showroom
admin.patch('/showrooms/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    address?: string
    description?: string
    image_url?: string
    is_active?: boolean
  }>()

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

// DELETE /api/admin/showrooms/:id - deactivate showroom (soft delete)
admin.delete('/showrooms/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE showrooms SET is_active = 0 WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

/* ---------------------- Time Slots Management ------------------------ */

// GET /api/admin/showrooms/:id/slots - list time slots for a showroom (admin view, incl. reservation status)
admin.get('/showrooms/:id/slots', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    `SELECT ts.id, ts.slot_date, ts.start_time, ts.end_time, ts.is_active,
      r.id AS reservation_id, r.status AS reservation_status
     FROM time_slots ts
     LEFT JOIN reservations r ON r.time_slot_id = ts.id AND r.status = 'confirmed'
     WHERE ts.showroom_id = ?
     ORDER BY ts.slot_date ASC, ts.start_time ASC`
  )
    .bind(id)
    .all()
  return c.json({ slots: results })
})

// POST /api/admin/showrooms/:id/slots - create a new time slot
admin.post('/showrooms/:id/slots', async (c) => {
  const showroomId = c.req.param('id')
  const body = await c.req.json<{ slot_date?: string; start_time?: string; end_time?: string }>()

  if (!body.slot_date || !body.start_time || !body.end_time) {
    return c.json({ error: '날짜, 시작 시간, 종료 시간을 모두 입력해주세요.' }, 400)
  }

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO time_slots (showroom_id, slot_date, start_time, end_time) VALUES (?, ?, ?, ?)'
    )
      .bind(showroomId, body.slot_date, body.start_time, body.end_time)
      .run()
    return c.json({ id: result.meta.last_row_id })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ error: '동일한 시간대가 이미 존재합니다.' }, 409)
    }
    return c.json({ error: '시간대 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// DELETE /api/admin/slots/:id - delete a time slot (only if not reserved)
admin.delete('/slots/:id', async (c) => {
  const id = c.req.param('id')
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
